<template>
  <div class="com-container">
    <div class="com-chart" ref="stock_ref"></div>
  </div>
</template>

<script>
import chartThemeMixin from '../mixins/chartTheme'

export default {
  mixins: [chartThemeMixin],
  data() {
    return {
      echartsInstance: null,  // ECharts 实例
      allData: [],  // 所有数据
      currentIndex: 0,  // 轮播索引
      timeId: null,     // 定时器ID
      titleFontsize: 0, // 标题字体大小
      ringRadius: 0,    // 环形图半径
      ringFontsize: 0   // 环形图字体大小
    }
  },
  created() {
    this.$socket.registerCallback('stock', this.getData)
  },
  mounted() {
    this.initChart()
    // this.getData()
    this.$socket.send({ // 发送消息给服务器，请求数据
      action: 'getData',
      socketType: 'stock',
      chartName: 'stock',
      value: ''
    }) 
    window.addEventListener('resize', this.screenAdapter)
    this.screenAdapter()  // 初始化屏幕适配器
    this.startInterval()  // 启动定时器
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.screenAdapter)  // 关闭屏幕适配器
    if (this.echartsInstance) {
      this.echartsInstance.dispose()
      this.echartsInstance = null
    }
    clearInterval(this.timeId)  // 清除定时器
  },
  destroyed() {
    this.$socket.unRegisterCallback('stock')
  },
  methods: {
    initChart() {
      this.echartsInstance = this.$echarts.init(this.$refs.stock_ref, this.chartTheme)
      this.echartsInstance.setOption(this.chartBaseOption)
      this.echartsInstance.setOption({
        // 每个环图中心已展示商品名称与销量，隐藏全局图例以免覆盖环图。
        legend: {
          show: false
        },
        title: {
          text: '|| 库存与销量分析',
          top: '2%',
          left: '2%',
          textStyle: {
            color: this.chartColors.text
          }
        },
        tooltip: {
          trigger: 'item',
          formatter: params => `${params.seriesName}<br/>${params.name}: ${params.value}`
        }
      })
      this.echartsInstance.on('mouseover', params => {
        clearInterval(this.timeId)
      })
      this.echartsInstance.on('mouseout', params => {
        this.startInterval()
      })
    },
    recreateChartForTheme() {
      if (!this.$refs.stock_ref) {
        return
      }
      if (this.echartsInstance) {
        this.echartsInstance.dispose()
      }
      this.initChart()
      this.screenAdapter()
    },
    getData(ret) {
      // const { data: res } = await this.$http.get('stock')
      if (!Array.isArray(ret)) {
        throw new TypeError('库存接口返回的数据格式错误：预期为数组。')
      }
      this.allData = ret
      this.updateChart()
    },
    updateChart() {
      if (!this.allData.length || !this.echartsInstance) {
        return
      }
      const centerArr = [
        ['18%', '32%'],
        ['50%', '32%'],
        ['82%', '32%'],
        ['35%', '72%'],
        ['65%', '72%']
      ]
      const colorArr = this.chartColors.stockLabels
      const startIndex = this.currentIndex * 5
      const endIndex = (this.currentIndex + 1) * 5
      const showData = this.allData.slice(startIndex, endIndex)
      const seriesData = showData.map((item, index) => {
        return {
          name: item.name,
          type: 'pie',
          labelLine: {
            show: false
          },
          label: {
            position: 'center',
            show: true,
            formatter: () => `${item.name}\n${item.sales}`,
            fontSize: this.ringFontsize,
            lineHeight: this.ringFontsize * 1.3,
            color: colorArr[index]
          },
          radius: [this.ringRadius * 0.88, this.ringRadius],
          center: centerArr[index],
          data: [
            {
              name: item.name + '\n' + item.sales,
              value: item.sales,
              itemStyle: {
                color: new this.$echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: colorArr[index] },
                  { offset: 1, color: colorArr[index] }
                ])
              }
            },
            {
              value: item.stock,
              itemStyle: {
                color: this.chartColors.stockEmpty
              }
            }
          ]
        }
      })
      const dataOption = {
        series: seriesData
      }
      this.echartsInstance.setOption(dataOption)
    },
    screenAdapter() {
      if (!this.echartsInstance || !this.$refs.stock_ref) {
        return
      }
      const { offsetWidth: width, offsetHeight: height } = this.$refs.stock_ref
      this.titleFontsize = Math.max(16, Math.min(42, width / 100 * 3.6))
      this.ringRadius = Math.max(30, Math.min(width / 9, height / 5, 110))
      this.ringFontsize = Math.max(10, Math.min(24, this.ringRadius * 0.24))
      this.echartsInstance.resize()
      this.echartsInstance.setOption({
        title: {
          textStyle: {
            fontSize: this.titleFontsize
          }
        }
      })
      this.updateChart()
    },
    startInterval() {
      if (this.timeId) {
        clearInterval(this.timeId)
      }
      this.timeId = setInterval(() => {
        this.currentIndex++
        if (this.currentIndex > 1 ) {
          this.currentIndex = 0
        }
        this.updateChart()
      }, 2000)
    }
  }
}
</script>