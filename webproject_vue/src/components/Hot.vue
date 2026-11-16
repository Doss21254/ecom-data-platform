<template>
  <div class="com-container">
    <div class="com-chart" ref="Hot_ref"></div>
    <span class="rank-arrow rank-arrow-left" aria-label="向左箭头" @click="toLeft" :style="arrowStyle"></span>
    <span class="rank-arrow rank-arrow-right" aria-label="向右箭头" @click="toRight" :style="arrowStyle"></span>
    <span class="titlename" :style="comStyle">{{ titlename }}</span>
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
      arrowFontsize: 16,
      currentPage: 0,
    }
  },
  computed: {
    titlename() {
      return this.allData[this.currentPage]
        ? this.allData[this.currentPage].name
        : ''
    },
    comStyle() {
      return {
        fontSize: this.titleFontsize + 'px'
      }
    },
    arrowStyle() {
      return {
        fontSize: `${this.arrowFontsize}px`
      }
    }
  },
  created() {
    this.$socket.registerCallback('hot', this.getData)
  },
  mounted() {
    this.initChart()
    // this.getData()
    this.$socket.send({
      action: 'getData',
      socketType: 'hot',
      chartName: 'hot',
      value: ''
    })
    window.addEventListener('resize', this.screenAdapter) //监听窗口大小变化
    this.screenAdapter()  // 初始化时调用一次，防止第一次窗口大小变化时，图表不适应
  },
  destroyed() {
    window.removeEventListener('resize', this.screenAdapter)  // 销毁窗口大小监听器
    if (this.chartInstance) {
      this.chartInstance.dispose()
      this.chartInstance = null
    }
    this.$socket.unRegisterCallback('hot')
  },
  methods: {
    initChart() {
      this.chartInstance = this.$echarts.init(this.$refs.Hot_ref, this.chartTheme)
      this.chartInstance.setOption(this.chartBaseOption)
      const initOption = {
        title: {
          text: '|| 热销商品销售金额占比统计',
          // textStyle: {
          //   fontSize: 35
          // },
          left: '3%'
        },
        tooltip: {
          trigger: 'item',
          // fotmatter 自定义提示框内容，下面是回调函数的写法
          formatter: arg => {
            const thirdCategory = arg.data.children // 获取三级分类数据
            let total = 0
            thirdCategory.forEach(item => {   // 循环计算出三级分类的总销售金额
              total += item.value
            })
            let retStr = ''
            thirdCategory.forEach(item => { // 循环回显三级分类的销售金额占比
              retStr += `${item.name}: ${(item.value / total * 100).toFixed(2)}%<br>`
            })
            return retStr
          }
        },
        legend: {
          top: '15%',
          icon: 'circle'
        },
        series: [
          {
            name: 'Access From',
            type: 'pie',
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
              }
            }
          }
        ]
      }   // 图表的初始化配置
      this.chartInstance.setOption(initOption)
    },
    recreateChartForTheme() {
      if (!this.$refs.Hot_ref) {
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
      // const { data: res } = await this.$http.get('hotproduct')
      console.log(ret)
      this.allData = ret
      this.updateChart()
    },
    updateChart() {
      if (!this.allData.length || !this.allData[this.currentPage]) {
        return
      }
      const seriesDataArr = this.allData[this.currentPage].children.map(item => {
        return {
          name: item.name,
          value: item.value,
          children: item.children
        }
      })
      const dataOption = {
        legend: {
          data: seriesDataArr.map(item => { return item.name })
        },
        series: [{
          data: seriesDataArr,
        }]
      }
      this.chartInstance.setOption(dataOption)
    },
    screenAdapter() {     // 屏幕适应性大小变化
      const containerWidth = this.$refs.Hot_ref.offsetWidth
      this.titleFontsize = containerWidth / 100 * 3.9 // 根据图表容器的宽度来计算字体大小
      this.arrowFontsize = Math.max(12, Math.min(24, containerWidth / 100 * 1.6))
      const adapterOption = { // 图表的适应性配置
        title: {
          textStyle: {
            fontSize: this.titleFontsize
          }
        },
        legend: {
          itemWidth: this.titleFontsize / 1.4,
          itemHeight: this.titleFontsize /1.4,
          itemGap: this.titleFontsize / 1.8,
          textStyle: {
            fontSize: this.titleFontsize / 1.2
          }
          
        },
        series: {
          radius: this.titleFontsize * 4,
          center: ['50%', '50%']
        }
      }
      this.chartInstance.setOption(adapterOption)
      this.chartInstance.resize() // 图表大小变化后，重新渲染图表
    },
    toLeft() {
      if (!this.allData.length) {
        return
      }
      this.currentPage = (this.currentPage - 1 + this.allData.length) % this.allData.length
      this.updateChart()
    },
    toRight() {
      if (!this.allData.length) {
        return
      }
      this.currentPage = (this.currentPage + 1) % this.allData.length
      this.updateChart()
    }
  }
}
</script>

<style lang="css" scoped>
.com-container {
  position: relative;
}

.titlename {
  position: absolute;
  bottom: 18%;
  right: 20%;
  /* transform: translate(-50%, -50%); */
  color: var(--primary-text);
  z-index: 1;
}

.rank-arrow {
  position: absolute;
  top: 50%;
  z-index: 1;
  display: flex;
  width: 2.8em;
  height: 2.8em;
  align-items: center;
  justify-content: center;
  color: var(--control-text);
  background: var(--control-background);
  border: 1px solid var(--control-border);
  border-radius: 50%;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.25);
  transform: translateY(-50%);
  cursor: pointer;
}

.rank-arrow::before {
  width: 0.55em;
  height: 0.55em;
  border-top: 0.12em solid currentColor;
  border-right: 0.12em solid currentColor;
  content: '';
}

.rank-arrow-left {
  left: 1.5em;
}

.rank-arrow-left::before {
  transform: translateX(2px) rotate(-135deg);
}

.rank-arrow-right {
  right: 1.5em;
}

.rank-arrow-right::before {
  transform: translateX(-2px) rotate(45deg);
}
</style>