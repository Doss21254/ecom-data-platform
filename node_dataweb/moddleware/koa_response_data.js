 // 业务逻辑中间件 读取data文件夹下的json文件
const fileUtils = require('../utils/file_utils')
const path = require('path')

module.exports = async (ctx,next) => {
 const url = ctx.request.url;
 let filePath = url.replace('/api','')
 filePath = '../data' + filePath + '.json'
 filePath = path.join(__dirname, filePath)
 const ret = await fileUtils.getFileJsondata(filePath)
 ctx.response.body = ret
 console.log(filePath)
 await next()
}