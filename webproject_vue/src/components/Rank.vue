<template>
  <div class="com-container">
    <div class="com-chart" ref="Rank_ref"></div>
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
      titleFontsize: 0,     // screenAdapter 的 变化尺度
      startValue: 0,
      endValue: 9,
      timerId: null
    }
  },
  created() {
    this.$socket.registerCallback('rank', this.getData)
  },
  mounted() {
    this.initChart()
    // this.getData()
    this.$socket.send({
      action: 'getData',
      socketType: 'rank',
      chartName: 'rank',
      value: ''
    })
    window.addEventListener('resize', this.screenAdapter) //监听窗口大小变化
    this.screenAdapter()  // 初始化时调用一次，防止第一次窗口大小变化时，图表不适应
  },
  destroyed() {
    window.removeEventListener('resize', this.screenAdapter)  // 销毁窗口大小监听器
    clearInterval(this.timerId)
    if (this.chartInstance) {
      this.chartInstance.dispose()
      this.chartInstance = null
    }
    this.$socket.unRegisterCallback('rank')
  },
  computed: {},
  methods: {
    initChart() {
      this.chartInstance = this.$echarts.init(this.$refs.Rank_ref, this.chartTheme)
      this.chartInstance.setOption(this.cartesianChartBaseOption)
      const createGradient = colors => new this.$echarts.graphic.LinearGradient(0, 0, 0, 1, [
        { offset: 0, color: colors[0] },
        { offset: 0.5, color: colors[1] },
        { offset: 1, color: colors[2] }
      ])
      const initOption = {
        title: {
          text: '|| 热门省份销售额 （万元）',
          top: '2%',
          left: '2%',
          textStyle: {
            color: this.chartColors.text
          }
        },
        tooltip: {
          // trigger: 'axis',
          show: true
        },
        dataZoom: [{
          show: false,
          // type: 'inside'
          start: this.startValue,
          end: this.endValue
        }],
        grid: {
          top: '18%',
          bottom: '4%',
          left: '4%',
          right: '6%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
        },
        yAxis: {
          type: 'value',
        },
        series: [{
          type: 'bar',
          itemStyle: {
            color: arg => {
              if (arg.value > 200) {
                return createGradient(['#ff8a80', '#f44336', '#b71c1c'])
              } else if (arg.value > 150) {
                return createGradient(['#fff59d', '#ffc107', '#f57f17'])
              } else {
                return createGradient(['#83bff6', '#188df0', '#1565c0'])
              }
            }
          },
        }]
      }   // 图表的初始化配置
      this.chartInstance.setOption(initOption)
      this.chartInstance.on('mouseover', () => {
        clearInterval(this.timerId)
      })
      this.chartInstance.on('mouseout', () => {
        this.startInterval()
      })
    },
    recreateChartForTheme() {
      if (!this.$refs.Rank_ref) {
        return
      }
      if (this.chartInstance) {
        this.chartInstance.dispose()
      }
      this.initChart()
      if (this.allData.length) {
        this.updateChart()
      }
      this.screenAdapter()
    },
    getData(ret) {
      // const { data: res } = await this.$http.get('rank')
      // console.log(res)
      this.allData = ret
      this.allData.sort((a, b) => b.value - a.value)
      this.updateChart()
      this.startInterval()
    },
    updateChart() {
      const provinceNameArr = this.allData.map(item => {
        return item.name
      })
      const provinceValueArr = this.allData.map(item => {
        return item.value
      })
      const dataOption = {
        xAxis: {
          data: provinceNameArr
        },
        dataZoom: [{
          startValue: this.startValue,
          endValue: this.endValue
        }],
        series: [{
          data: provinceValueArr,
        }]
      }
      this.chartInstance.setOption(dataOption)
    },
    screenAdapter() {     // 屏幕适应性大小变化
      this.titleFontsize = this.$refs.Rank_ref.offsetWidth / 100 * 3.9 // 根据图表容器的宽度来计算字体大小
      const adapterOption = { // 图表的适应性配置
        title: {
          textStyle: {
            fontSize: this.titleFontsize / 1.3
          }
        },
        series: {
          barWidth: this.titleFontsize,
          itemStyle: {
            borderRadius: [this.titleFontsize / 2, this.titleFontsize / 2, 0, 0]
          }
        }
      }
      this.chartInstance.setOption(adapterOption)
      this.chartInstance.resize() // 图表大小变化后，重新渲染图表
    },
    startInterval() {
      clearInterval(this.timerId)
      this.timerId = setInterval(() => {
        if (this.endValue >= this.allData.length - 1) {
          this.startValue = 0
          this.endValue = 9
        } else {
          this.startValue += 1
          this.endValue += 1
        }
        this.updateChart()
      }, 2000)
    }

  }
}
</script>

<style lang="css" scoped>

</style>