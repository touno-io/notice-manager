// const { notice } = require('@touno-io/db/schema')
const notice = {}

const { sendMessage } = require('./sdk')

module.exports = async (req) => {
  const startTime = new Date().getTime()

  const { LineOutbound } = notice.get()
  const { bot: botName, room: roomName } = req.params
  const { _id } = await new LineOutbound({
    botName,
    roomName,
    type: 'telegram',
    sender: req.body || {},
    sended: false
  }).save()

  await sendMessage(botName, roomName, req.body || {})

  await LineOutbound.updateOne({ _id }, { $set: { sended: true } })
  return { OK: true, used_ms: new Date().getTime() - startTime }
}
