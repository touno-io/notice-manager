const express = require('express')
const request = require('request-promise')
const bodyParser = require('body-parser')
const cron = require('node-cron')
const mongo = require('./mongodb')

const port = process.env.PORT || 4000
const app = express()
 
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))
 
// parse application/json
app.use(bodyParser.json())

app.post('/:bot', require('./route-bot/webhook'))
app.put('/:bot/:to?', require('./route-bot/push-message'))

app.get('/db/:bot/cmd', require('./route-db/bot-cmd'))
app.post('/db/:bot/cmd/:id', require('./route-db/bot-cmd'))
app.get('/db/:bot/inbound', require('./route-db/inbound'))
app.get('/db/:bot/outbound', require('./route-db/outbound'))

app.get('/stats', require('./route-db/stats'))

app.get('/', (req, res) => res.end('LINE Messenger Bot Endpoint.'))

const lineInitilize = async () => {
  const { LineBot } = mongo.get()
  let date = new Date(new Date() - 86400000).toISOString().replace(/-/ig,'').substr(0, 8)
      
  let data = await LineBot.find({ type: 'line' })
  for (const line of data) {
    const opts = { headers: { 'Authorization': `Bearer ${line.accesstoken}` }, json: true }

    let quota = await request('https://api.line.me/v2/bot/message/quota', opts)
    let consumption = await request('https://api.line.me/v2/bot/message/quota/consumption', opts)
    let reply = await request(`https://api.line.me/v2/bot/message/delivery/reply?date=${date}`, opts)
    let push = await request(`https://api.line.me/v2/bot/message/delivery/push?date=${date}`, opts)

    let stats = {
      usage : consumption.totalUsage,
      limited : quota.type === 'limited' ? quota.value : 0,
      reply: reply.status === 'ready' ? reply.success : reply.status,
      push: push.status === 'ready' ? push.success : push.status
    }
    await LineBot.updateOne({ _id: line._id }, { $set: { options: { stats } } })
  }
}

process.env.MONGODB_URI = 'mongodb+srv://dbLINE:CZBwk6XtyIGHleJS@line-bot-obya7.gcp.mongodb.net/LINE-BOT'
if (!process.env.MONGODB_URI) throw new Error('Mongo connection uri is undefined.')
const scheduleTask = () => {
  lineInitilize().then(() => {
    console.log(`LINE-BOT Initilized.`)
  }).catch(ex => {
    console.log(`LINE-BOT Initilize FAIL::${ex.message}`)
  })
}
const scheduleDenyCMD = async () => {
  const { LineCMD } = mongo.get()
  let updated = await LineCMD.updateMany({ created : { $lte: new Date(+new Date() - 300000) }, executing: false }, {
    $set: { executed: true }
  })
  if (updated.n > 0) console.log(`LINE-BOT ${updated.n} cmd is timeout.`)
}
mongo.open().then(async () => {
  console.log(`LINE-BOT MongoDB Connected.`)
  await app.listen(port)
  console.log(`LINE-BOT Messenger Endpoint listening on port ${port}!`)
 
  let task = '0 */6 * * *'
  let deny = '* * * * *'
  console.log(`LINE-BOT Schedule line stats (${task}).`)
  console.log(`LINE-BOT Schedule deny cmd (${deny}).`)
  scheduleTask()
  cron.schedule(task, scheduleTask)
  cron.schedule(deny, scheduleDenyCMD)
})
