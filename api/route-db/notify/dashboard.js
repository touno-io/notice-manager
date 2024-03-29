// const { notice } = require('@touno-io/db/schema')
const notice = {}

module.exports = async (req, reply) => {
  const userId = req.headers['x-user-liff']
  const { LineBot, LineBotRoom, ServiceBot, ServiceBotOauth } = notice.get()

  const lineBot = await LineBot.aggregate([
    { $match: { active: true, userId } },
    {
      $project: {
        _id: 1,
        text: '$name',
        value: '$botname',
        type: '$bot',
        stats: '$options.stats'
      }
    },
    { $sort: { botname: 1, name: 1 } }
  ])

  const room = await LineBotRoom.aggregate([
    { $match: { active: true } },
    { $project: { _id: 0, name: 1, botname: 1 } },
    { $sort: { name: 1 } }
  ])
  for (const b of lineBot) {
    b.type = 'bot'
    b.room = room.filter(e => e.botname === b.botname)
  }

  const lineNotify = await ServiceBot.aggregate([
    { $match: { active: true, userId } },
    {
      $project: {
        _id: 1,
        client: 1,
        secret: 1,
        text: '$name',
        value: '$service',
        type: '$notify'
      }
    },
    { $sort: { service: 1 } }
  ])

  const service = await ServiceBotOauth.aggregate([
    { $match: { accessToken: { $ne: null } } },
    {
      $project: { _id: 0, accessToken: 1, value: '$room', name: 1, service: 1 }
    },
    { $sort: { value: 1, name: 1 } }
  ])

  for (const n of lineNotify) {
    n.type = 'notify'
    n.room = service.filter(e => e.service === n.value)
  }

  return { lineBot, lineNotify }
}
