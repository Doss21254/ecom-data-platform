import {
  getCartesianChartBaseOption,
  getChartBaseOption,
  getThemeConfig
} from '../utils/theme_utils'

export default {
  computed: {
    chartTheme() {
      return this.$store.state.chartTheme
    },
    chartColors() {
      return getThemeConfig(this.chartTheme).chart
    },
    chartBaseOption() {
      return getChartBaseOption(this.chartColors)
    },
    cartesianChartBaseOption() {
      return getCartesianChartBaseOption(this.chartColors)
    }
  },
  watch: {
    chartTheme() {
      this.recreateChartForTheme()
    }
  }
}
