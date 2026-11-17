export default class SocketService {
  static instance = null;
  static getInstance() {
    if (!this.instance) {
      this.instance = new SocketService();
    }
    return this.instance;
  }

  ws = null
  callbackManning = {}  // 接收消息的回调函数管理
  lastFullScreenMessage = null

  connected = false // 是否连接成功的标识
  sendCount = 0 // 发送消息的次数
  closeCount = 0 // 连接关闭的次数

  connect() {
    if (!window.WebSocket) {
      return console.error('当前浏览器不支持 WebSocket。');
    }
    // 开发环境直连本地 ws 服务；生产环境走同源 /ws 路径（由 Nginx 反向代理到 8888）
    const wsUrl = process.env.NODE_ENV === 'development'
      ? 'ws://localhost:8888'
      : ('ws://' + window.location.host + '/ws');
    this.ws = new WebSocket(wsUrl);
    this.ws.onopen = () => {
      console.log('WebSocket 连接成功');
      this.connected = true
      this.closeCount = 0 // 重置'连接关闭的次数'
    };
    this.ws.onmessage = (event) => {
      console.log('收到消息:');
      // 真正的数据在event.data中
      // console.log(event.data);
      let recvData
      try {
        recvData = JSON.parse(event.data)
      } catch (error) {
        console.error('WebSocket 收到无效 JSON 消息：', error)
        return
      }
      const socketType = recvData.socketType
      const action = recvData.action
      if (action === 'getData') {
        const callback = this.callbackManning[socketType]
        if (callback) {
          callback.call(this, recvData.data)
        }
      } else if (action === 'fullScreen') {
        this.lastFullScreenMessage = recvData
        const callback = this.callbackManning.fullScreen
        if (callback) {
          callback.call(this, recvData)
        }
      }
    };
    this.ws.onclose = () => {
      console.log('WebSocket 连接关闭');
      this.connected = false
      setTimeout(() => {
        this.closeCount++
        this.connect()
      }, this.closeCount * 500);
    };
  }
  // 注册回调函数的方法 ,参数分别是（函数的唯一标识和具体是哪个回调函数）
  registerCallback(socketType, callback) {
    this.callbackManning[socketType] = callback;
    if (socketType === 'fullScreen' && this.lastFullScreenMessage) {
      callback.call(this, this.lastFullScreenMessage)
    }
  }
  // 取消注册回调函数的方法
  unRegisterCallback(socketType) {
    this.callbackManning[socketType] = null;
  }

  // 发送消息的方法
  send(data) {
    if (this.connected) { // 如果连接成功，则发送消息
      this.ws.send(JSON.stringify(data))
      this.sendCount = 0
    } else {
      setTimeout(() => {
        this.sendCount++
        this.send(data)
      }, this.sendCount * 500);
    }
  }
}