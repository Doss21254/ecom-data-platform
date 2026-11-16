<template>
  <div class="com-container">
    <div class="title" :style="comStyle">
      <span>{{ '|| ' + showTitle }}</span>
      <span class="dropdown-arrow" :style="comStyle" aria-hidden="true" @click="isShow = !isShow"></span>
      <div class="select-con" v-show="isShow" :style="selectItemStyle">
        <div class="select-item" v-for="item in selectTitle" :key="item.key" @click="handleSelect(item.key)">{{
          item.text }}</div>
      </div>
    </div>
    <div class="com-chart" ref="trend_ref"></div>
  </div>
</template>

<script>
import chartThemeMixin from '../mixins/chartTheme'

export default {
  mixins: [chartThemeMixin],
  data() {
    return {
      chartInstance: null,  // 图表实例
      allData: [],          // 接收axios请求回来的数据
      isShow: false,        // 下拉菜单是否显示
      selectTip: 'map',     // 控制图表显示什么数据 （map、seller、商品）
      titleFontsize: 0,     // screenAdapter 的 变化尺度
    }
  },
  created() {
    // 在组件创建完成后，进行回调函数的注册
    this.$socket.registerCallback('trend', this.getData)
  },
  mounted() {
    this.initChart()
    // this.getData()
    this.$socket.send({ // 发送消息给服务器，请求数据
      action: 'getData',
      socketType: 'trend',
      chartName: 'trend',
      value: ''
    })
    window.addEventListener('resize', this.screenAdapter) //监听窗口大小变化
    this.screenAdapter()  // 初始化时调用一次，防止第一次窗口大小变化时，图表不适应
  },
  destroyed() {
    window.removeEventListener('resize', this.screenAdapter)  // 销毁窗口大小监听器
    this.$socket.unRegisterCallback('trend')
  },
  computed: {
    selectTitle() {   // 数组【下拉菜单的数据】，供v-for循环渲染，因为改数据是依靠别的数据变化而变化的（allData），所以要用computed计算属性来计算
      if (!this.allData || !Array.isArray(this.allData.type)) {
        return []
      }
      return this.allData.type.filter(item => item.key !== this.selectTip)  // 过滤掉当前选中的数据，避免重复选择，更好看
    },
    showTitle() {   // 显示的标题
      if (!this.allData || !this.allData[this.selectTip]) {
        return ''
      }
      return this.allData[this.selectTip].title
    },
    comStyle() {  // 给标题和下拉箭头做动态大小变化
      return {
        fontSize: this.titleFontsize + 'px'
      }
    },
    selectItemStyle() { // 给下拉菜单做动态大小变化
      return {
        marginLeft: this.titleFontsize / 1.5 + 'px'
      }
    }
  },
  methods: {
    initChart() {
      this.chartInstance = this.$echarts.init(this.$refs.trend_ref, this.chartTheme)
      const initOption = {    // 图表的初始化配置
        grid: {               // 图表的边距、整体位置
          top: '38%',
          bottom: '4%',
          left: '3%',
          right: '6%',
          containLabel: true  // 坐标轴的标签是否也要包含在内
        },
        xAxis: {
          type: 'category',
          boundaryGap: false  // 让数据的开始位置挨着边边
        },
        yAxis: {
          type: 'value',
        },
        legend: {             // 图例配置
          top: '18%',
          left: 20,
          icon: 'circle',
        },
        tooltip: {            // 鼠标移到图表上时的提示框
          trigger: 'axis'
        },
      }
      this.chartInstance.setOption(this.cartesianChartBaseOption)
      this.chartInstance.setOption(initOption)
    },
    recreateChartForTheme() {
      if (!this.$refs.trend_ref) {
        return
      }
      if (this.chartInstance) {
        this.chartInstance.dispose()
      }
      this.initChart()
      if (this.allData && this.allData.common) {
        this.updateChart()
      }
      this.screenAdapter()
    },
    getData(ret) {
      // const { data: res } = await this.$http.get('trend')
      // console.log(res)
      this.allData = ret
      this.updateChart()
    },
    updateChart() {
      const colorPalette = [    // 准备做渐变要用的颜色数组
        { line: '#6EA8FE', area: 'rgba(110, 168, 254, 0.88)' },
        { line: '#4DD4AC', area: 'rgba(77, 212, 172, 0.84)' },
        { line: '#B197FC', area: 'rgba(177, 151, 252, 0.84)' },
        { line: '#FFB86B', area: 'rgba(255, 184, 107, 0.82)' },
        { line: '#FF7B9C', area: 'rgba(255, 123, 156, 0.82)' }
      ]
      const timeArr = this.allData.common.month   // 横坐标的月份数组
      // console.log(timeArr)
      const valueArr = this.allData[this.selectTip].data  // 纵坐标的数据数组，根据selectTip来决定是哪个数据数组
      const seriesArr = valueArr.map((item, index) => {   // 遍历
        const colors = colorPalette[index % colorPalette.length]
        return {
          name: item.name,
          type: 'line',            // 折线图
          data: item.data,
          stack: this.selectTip,   // 堆叠图
          lineStyle: {             // 线条样式
            color: colors.line,
            width: 3
          },
          itemStyle: {
            color: colors.line
          },
          areaStyle: {
            color: new this.$echarts.graphic.LinearGradient(0, 0, 0, 1, [
              {
                offset: 0,
                color: colors.area
              },
              {
                offset: 1,
                color: 'rgba(0, 0, 0, 0)'
              }
            ])
          },
        }
      })
      const legendArr = valueArr.map(item => {  // 遍历出图例数组
        return item.name
      })
      const dataOption = {  // 图表的数据配置
        xAxis: {
          data: timeArr
        },
        legend: {
          data: legendArr,
        },
        series: seriesArr
      }
      this.chartInstance.setOption(dataOption)
    },
    handleSelect(key) {   // 下拉菜单的点击事件，key是点击的菜单的key值
      this.selectTip = key
      this.updateChart()  // 更换key数据后，更新一次图表
      this.isShow = false // 点击后关闭下拉菜单
    },
    screenAdapter() {     // 屏幕适应性大小变化
      this.titleFontsize = this.$refs.trend_ref.offsetWidth / 100 * 3.6 // 根据图表容器的宽度来计算字体大小
      const adapterOption = { // 图表的适应性配置
        legend: {
          itemWidth: this.titleFontsize * 1.8,  // 图例的宽度
          itemHeight: this.titleFontsize * 1.8, // 图例的高度
          itemGap: this.titleFontsize,    // 图例的间隔
          textStyle: {
            fontSize: this.titleFontsize / 1.2  // 图例的字体大小
          }
        }
      }
      this.chartInstance.setOption(adapterOption)
      this.chartInstance.resize() // 图表大小变化后，重新渲染图表
    }

  }
}
</script>

<style lang="css" scoped>
.title {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 100;
  color: var(--primary-text);
}

/* 下拉菜单的箭头 */
.dropdown-arrow {
  display: inline-block;
  width: 8px;
  height: 8px;
  margin-left: 13px;
  border-right: 2px solid currentColor;
  border-bottom: 2px solid currentColor;
  transform: translateY(-3px) rotate(45deg);
  cursor: pointer;
}

.select-con {
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: var(--control-background);
  color: var(--primary-text);
}

.select-item {
  padding: 6px 10px;
  cursor: pointer;
}

.select-item:hover {
  background-color: var(--control-hover-background);
}
</style>