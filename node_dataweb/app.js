const koa = require('koa');
const app = new koa();

const responseDuration = require('./moddleware/koa_response_duration')
const responseHeader = require('./moddleware/koa_response_header')
const responseData = require('./moddleware/koa_response_data')
app.use(responseDuration)
app.use(responseHeader)
app.use(responseData)

app.listen(5555, () => {
  console.log('server is running at http://localhost:5555');
})

const wss = require('./service/webSocket')
wss.listen()