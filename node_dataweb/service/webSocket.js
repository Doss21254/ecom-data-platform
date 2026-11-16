const path = require('path')
const fileutils = require('../utils/file_utils')
const WebSocket = require('ws')
const panelIds = new Set(['trend', 'map', 'hot', 'seller', 'rank', 'stock'])
let fullscreenState = {
  action: 'fullScreen',
  socketType: 'fullScreen',
  panelId: null,
  isFullScreen: false
}
let fullscreenOwner = null
const wss = new WebSocket.Server({
  port: 8888
})
module.exports.listen = () => {
  wss.on('connection', client => {
    console.log('有前端连接成功');
    client.send(JSON.stringify(fullscreenState))
    client.on('close', () => {
      if (fullscreenOwner === client) {
        fullscreenOwner = null
        fullscreenState = {
          action: 'fullScreen',
          socketType: 'fullScreen',
          panelId: null,
          isFullScreen: false
        }
        wss.clients.forEach(connectedClient => {
          if (connectedClient.readyState === WebSocket.OPEN) {
            connectedClient.send(JSON.stringify(fullscreenState))
          }
        })
      }
    })
    // client 代表是客户端连接的Socket对象
    client.on('message', async message => {
      console.log('前端发送的消息：' + message);
      let payload
      try {
        payload = JSON.parse(message.toString())
      } catch (error) {
        client.send(JSON.stringify({
          action: 'error',
          message: '消息必须是有效的 JSON 格式。'
        }))
        return
      }

      if (!payload || typeof payload.action !== 'string') {
        client.send(JSON.stringify({
          action: 'error',
          message: '消息缺少有效的 action。'
        }))
        return
      }

      if (payload.action === 'getData') {
        try {
          let filePath = '../data/' + payload.chartName + '.json'
          filePath = path.join(__dirname, filePath)
          payload.data = await fileutils.getFileJsondata(filePath)
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(payload))
          }
        } catch (error) {
          console.error('读取图表数据失败：', error)
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              action: 'error',
              message: '图表数据读取失败。',
              chartName: payload.chartName
            }))
          }
        }
      } else if (payload.action === 'themeChange') {
        // 将主题变更广播给所有连接，包括发起者，以便发起者也能同步并确认消息。
        wss.clients.forEach(connectedClient => {
          if (connectedClient.readyState === WebSocket.OPEN) {
            connectedClient.send(JSON.stringify(payload))
          }
        })
      } else if (payload.action === 'fullScreen') {
        if (
          typeof payload.isFullScreen !== 'boolean' ||
          (payload.isFullScreen && !panelIds.has(payload.panelId))
        ) {
          client.send(JSON.stringify({
            action: 'error',
            message: '全屏同步消息格式错误。'
          }))
          return
        }

        fullscreenState = {
          action: 'fullScreen',
          socketType: 'fullScreen',
          panelId: payload.isFullScreen ? payload.panelId : null,
          isFullScreen: payload.isFullScreen
        }
        fullscreenOwner = payload.isFullScreen ? client : null
        wss.clients.forEach(connectedClient => {
          if (connectedClient.readyState === WebSocket.OPEN) {
            connectedClient.send(JSON.stringify(fullscreenState))
          }
        })
      } else {
        client.send(JSON.stringify({
          action: 'error',
          message: `不支持的 action：${payload.action}`
        }))
      }
      // client.send('服务端回复 : Socket from server' + message);
    })
  })
}
