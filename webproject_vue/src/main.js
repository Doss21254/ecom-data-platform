import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import axios from 'axios'
import '../public/assets/css/global.css'
import SocketService from './utils/socket_service.js'
SocketService.getInstance().connect()
Vue.prototype.$socket = SocketService.getInstance()

Vue.config.productionTip = false
Vue.prototype.$echarts = window.echarts
// 简单封装axios：开发环境直连本地后端，生产环境走同源相对路径（由 Nginx 反向代理到 Koa）
axios.defaults.baseURL = process.env.NODE_ENV === 'development' ? 'http://localhost:5555/api' : '/api'
Vue.prototype.$http = axios

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')
