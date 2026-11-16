<template>
  <div class="com-container" style="position: relative;">
    <div class="com-chart" ref="map_ref"></div>
    <button v-if="currentProvince" class="map-back-button" @click="showChinaMap">
      返回全国
    </button>
    <div v-if="mapLoadError || dataLoadError" class="map-error">
      {{ mapLoadError || dataLoadError }}
    </div>
  </div>
</template>

<script>
import {
  filterPointGroups,
  getProvinceFeature,
  getProvinceGeoJSON,
  getProvinceMapName,
  loadGeoJSON
} from '../utils/map_utils'
import chartThemeMixin from '../mixins/chartTheme'

export default {
  mixins: [chartThemeMixin],
  data() {
    return {
      echartsInstance: null,
      mapLoadError: '',
      dataLoadError: '',
      provinceGeoJSON: null,
      cityGeoJSON: null,
      pointGroups: [],
      currentProvince: null
    }
  },
  created() {
    this.$socket.registerCallback('map', this.getData)
  },
  mounted() {
    window.addEventListener('resize', this.screenMap)
    this.initMap()
      .then(() => {
        this.screenMap()
        // return this.getData()
        return this.$socket.send({
          action: 'getData',
          socketType: 'map',
          chartName: 'map',
          value: ''
        })
      })
      .catch(error => {
        this.mapLoadError = '中国地图加载失败，请检查 GeoJSON 文件是否可访问。'
        console.error('中国地图初始化失败：', error)
      })
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.screenMap)
    if (this.echartsInstance) {
      // 释放 ECharts 实例，避免路由切换后仍占用画布和事件监听。
      this.echartsInstance.dispose()
      this.echartsInstance = null
    }
  },
  destroyed() {
    this.$socket.unRegisterCallback('map', this.getData)
  },
  methods: {
    async initMap() {
      this.provinceGeoJSON = await loadGeoJSON('中国_省.geojson')
      this.$echarts.registerMap('china', this.provinceGeoJSON)
      this.createMapChart()
      this.renderMap('china', [])
    },
    createMapChart() {
      this.echartsInstance = this.$echarts.init(this.$refs.map_ref, this.chartTheme)
      this.echartsInstance.setOption(this.chartBaseOption)
      this.echartsInstance.on('click', params => {
        if (params.seriesType !== 'map' || this.currentProvince) {
          return
        }
        const province = getProvinceFeature(this.provinceGeoJSON, params.name)
        if (province) {
          this.showProvinceMap(province)
        }
      })
    },
    recreateChartForTheme() {
      if (!this.$refs.map_ref || !this.provinceGeoJSON) {
        return
      }
      if (this.echartsInstance) {
        this.echartsInstance.dispose()
      }
      this.createMapChart()
      if (this.currentProvince) {
        const provinceGeoJSON = getProvinceGeoJSON(this.cityGeoJSON, this.currentProvince)
        const mapName = getProvinceMapName(this.currentProvince)
        this.$echarts.registerMap(mapName, provinceGeoJSON)
        const groups = filterPointGroups(this.pointGroups, provinceGeoJSON.features)
        this.renderMap(mapName, groups)
      } else {
        this.renderMap('china', this.pointGroups)
      }
    },
    getData(ret) {
      try {
        // const { data: res } = await this.$http.get('map')
        if (!Array.isArray(ret)) {
          throw new TypeError('地图散点数据格式错误：预期为数组。')
        }
        this.pointGroups = ret
        this.renderMap('china', ret)
      } catch (error) {
        this.dataLoadError = '散点数据加载失败，请检查 map 接口。'
        console.error('地图散点数据加载失败：', error)
      }
    },
    async showProvinceMap(province) {
      try {
        if (!this.cityGeoJSON) {
          this.cityGeoJSON = await loadGeoJSON('中国_市.geojson')
        }
        const provinceGeoJSON = getProvinceGeoJSON(this.cityGeoJSON, province)
        const mapName = getProvinceMapName(province)
        this.$echarts.registerMap(mapName, provinceGeoJSON)
        this.currentProvince = province
        this.dataLoadError = ''
        this.renderMap(mapName, filterPointGroups(this.pointGroups, provinceGeoJSON.features))
      } catch (error) {
        this.dataLoadError = `${province.properties.name}地图加载失败。`
        console.error('省级地图加载失败：', error)
      }
    },
    showChinaMap() {
      this.currentProvince = null
      this.dataLoadError = ''
      this.renderMap('china', this.pointGroups)
    },
    renderMap(mapName, groups) {  // 渲染地图
      const colors = ['#ffd166', '#4dd4ac', '#ff7b9c', '#6ea8fe']
      const pointSeries = groups.map((group, index) => ({
        name: group.name,
        type: 'effectScatter',  // 散点图
        coordinateSystem: 'geo',
        data: group.children,
        symbolSize: 12,
        itemStyle: {
          color: colors[index % colors.length],
          shadowBlur: 10,
          shadowColor: colors[index % colors.length]
        },
        rippleEffect: {
          scale: 3,
          brushType: 'stroke'
        },
        emphasis: {
          scale: 1.6
        }
      }))
      this.echartsInstance.setOption({
        ...this.chartBaseOption,
        title: {
          text: this.currentProvince
            ? `|| 商家分布 - ${this.currentProvince.properties.name}`
            : '|| 商家分布',
          top: '2%',
          left: '2%',
          textStyle: {
            color: this.chartColors.mapLabel
          }
        },
        legend: {
          data: groups.map(group => group.name),
          textStyle: {
            color: this.chartColors.mapLabel
          },
          left: '5%',
          bottom: '6%',
          orient: 'vertical'
        },
        tooltip: {
          trigger: 'item',
          backgroundColor: this.chartColors.tooltipBackground,
          borderColor: this.chartColors.tooltipBorder,
          textStyle: {
            color: this.chartColors.text
          },
          formatter: params => `${params.seriesName}<br/>${params.name}`
        },
        geo: {
          map: mapName,
          roam: true,
          label: {
            show: false
          },
          itemStyle: {
            areaColor: this.chartColors.mapLand,
            borderColor: this.chartColors.mapBorder,
            borderWidth: 1
          },
          emphasis: {
            label: {
              show: true,
              color: this.chartColors.mapLabel
            },
            itemStyle: {
              areaColor: this.chartColors.mapEmphasis
            }
          }
        },
        series: [
          {
            name: '行政区',
            type: 'map',
            map: mapName,
            roam: true,
            z: 1,
            label: {
              show: false
            },
            itemStyle: {
              areaColor: this.chartColors.mapLand,
              borderColor: this.chartColors.mapBorder,
              borderWidth: 1
            },
            emphasis: {
              label: {
                show: true,
                color: this.chartColors.mapLabel
              },
              itemStyle: {
                areaColor: this.chartColors.mapEmphasis
              }
            }
          },
          ...pointSeries
        ]
      }, true)
      this.screenMap()
    },
    screenMap() {
      if (this.echartsInstance) {
        const titleFontsize = this.$refs.map_ref.offsetWidth / 100 * 3.6 // 根据图表容器的宽度来计算字体大小
        const adapterOption = { // 图表的适应性配置
          title: {
            textStyle: {
              fontSize: titleFontsize
            }
          },
          legend: {
            itemWidth: titleFontsize,  // 图例的宽度
            itemHeight: titleFontsize, // 图例的高度
            itemGap: titleFontsize,    // 图例的间隔
            textStyle: {
              fontSize: titleFontsize / 1.5  // 图例的字体大小
            }
          }
        }
        this.echartsInstance.setOption(adapterOption)
        this.echartsInstance.resize()
      }
    },
  }
}
</script>

<style scoped>
.map-back-button {
  position: absolute;
  z-index: 1;
  top: 5%;
  right: 5%;
  padding: 8px 14px;
  border: 1px solid var(--control-border);
  border-radius: 4px;
  background: var(--control-background);
  color: var(--control-text);
  cursor: pointer;
}

.map-back-button:hover {
  background: var(--control-hover-background);
}

.map-error {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary-text);
  pointer-events: none;
}
</style>