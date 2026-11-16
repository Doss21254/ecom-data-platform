<template>
  <div class="com-container">
    <div class="com-chart" ref="chart"></div>
  </div>
</template>

<script>
import chartThemeMixin from '../mixins/chartTheme'

export default {
  mixins: [chartThemeMixin],
  data() {
    return {
      echartInstance: null,
      sellerData: [],
      currentPage: 1, //当前页数
      totalPages: 0,  //总页数
      timeId: null,  //定时器ID
      titleFontsize: 0,
      barWidth: 10,
    }
  },
  created() {
    this.$socket.registerCallback('seller', this.getData)
  },
  mounted() {
    this.initChart()
    window.addEventListener('resize', this.handleResize)
    this.handleResize()
    // this.getData()
    this.$socket.send({
      action: 'getData',
      socketType: 'seller',
      chartName: 'seller',
      value: ''
    })
  },
  destroyed() {
    clearInterval(this.timeId)  // 销毁定时器
    window.removeEventListener('resize', this.handleResize) // 销毁窗口大小监听器
    if (this.echartInstance) {
      this.echartInstance.dispose()
      this.echartInstance = null
    }
    this.$socket.unRegisterCallback('seller')
  },
  methods: {
    initChart() {
      this.echartInstance = this.$echarts.init(this.$refs.chart, this.chartTheme)
      this.echartInstance.setOption(this.cartesianChartBaseOption)
      // 鼠标移入移出事件监听，移入时清除定时器，移出时重新启动定时器
      this.echartInstance.on('mouseover', (params) => {
        clearInterval(this.timeId)
      })
      this.echartInstance.on('mouseout', (params) => {
        this.startInterval()
      })
    },
    recreateChartForTheme() {
      if (!this.$refs.chart) {
        return
      }
      if (this.echartInstance) {
        this.echartInstance.dispose()
      }
      this.initChart()
      if (this.sellerData.length) {
        this.updateChart()
      }
      this.handleResize()
    },
    handleResize() {
      if (this.echartInstance) {
        this.titleFontsize = this.$refs.chart.offsetWidth / 100 * 3.5
        this.barWidth = Math.max(10, Math.min(14, this.$refs.chart.offsetWidth / 45))
        this.echartInstance.setOption({
          title: {
            textStyle: {
              fontSize: this.titleFontsize
            }
          },
          series: [{
            barWidth: this.barWidth,
            itemStyle: {
              borderRadius: [0, this.barWidth / 2, this.barWidth / 2, 0]
            },
            label: {
              fontSize: Math.max(5, Math.min(14, this.titleFontsize * 2))
            }
          }]
        })
        this.echartInstance.resize()
      }
    },
    getData(ret) {
      // const { data: res } = await this.$http.get('seller')
      // console.log(res)
      this.sellerData = ret
      // 排序数组，按从小到大排序
      this.sellerData.sort((a, b) => b.value - a.value)
      //算一下总页数
      this.totalPages = this.sellerData.length % 5 === 0 ? this.sellerData.length / 5 : this.sellerData.length / 5 + 1
      this.updateChart()
      this.startInterval()  // 启动定时器
    },
    updateChart() {
      const startIndex = (this.currentPage - 1) * 5
      const endIndex = startIndex + 5
      const showData = this.sellerData.slice(startIndex, endIndex)  // 配合定时器，不断截取5个图表数据去展示
      const sellerNames = showData.map(item => item.name)
      const sellerValues = showData.map(item => item.value)
      const option = {
        title: {
          text: '|| 商家销售数据统计',
          left: 20
        },
        grid: {
          left: '2%',
          right: '10%',
          bottom: '10%',
          top: '19%',
          containLabel: true
        },
        xAxis: {
          type: 'value',
        },
        yAxis: {
          type: 'category',
          data: sellerNames
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'line',
            z: 0,
            lineStyle: {
              color: this.chartColors.gridLine,
              width: 33,
              type: 'solid'
            }
          }
        },
        series: [
          {
            data: sellerValues,
            type: 'bar',
            barWidth: this.barWidth,
            label: {
              show: true,
              color: this.chartColors.text,
              position: 'right',
              fontSize: this.titleFontsize
            },
            itemStyle: {
              borderRadius: [0, this.barWidth / 2, this.barWidth / 2, 0],
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 1,
                y2: 0,
                colorStops: [{
                  offset: 0, color: '#5052EE' // 0% 处的颜色
                }, {
                  offset: 1, color: '#AB6EE5' // 100% 处的颜色
                }],
                global: false // 缺省为 false
              }
            }
          }
        ]
      };
      this.echartInstance.setOption(option)
    },
    startInterval() {
      this.timeId = setInterval(() => {
        this.currentPage++
        // 边界值处理： 如果当前页数超出总页数，则回到第一页轮播
        if (this.currentPage > this.totalPages) {
          this.currentPage = 1
        }
        this.updateChart()
      }, 3000)
    }
  }
}
</script>

<style lang="css" scoped></style>