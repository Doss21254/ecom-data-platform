 // 设置相应头的中间件
module.exports = async (ctx,next) => {
  const contentType = 'application/json; charset=utf-8'
  ctx.set('Content-Type', contentType)
  ctx.response.body = {
    code: 0,
    msg: 'success',
  }
  ctx.set('Access-Control-Allow-Origin', '*')
  ctx.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  await next()

}