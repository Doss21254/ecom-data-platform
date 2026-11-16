import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    chartTheme: 'hjh'
  },
  getters: {
    nextChartThemeLabel: state => state.chartTheme === 'hjh' ? 'Vintage' : 'HJH'
  },
  mutations: {
    toggleChartTheme(state) {
      state.chartTheme = state.chartTheme === 'hjh' ? 'vintage' : 'hjh'
    }
  },
  actions: {
  },
  modules: {
  }
})
