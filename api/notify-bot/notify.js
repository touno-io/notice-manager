/* eslint-disable no-loss-of-precision */
const sdkNotify = require('../sdk-notify')
const { uuid, dbRun } = require('../db')

const packageSticker = {
  1: [
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 21, 100, 101,
    102, 103, 104, 105, 106, 107, 108, 109, 110, 111
  ],
  11537: [
    52.002734e+6, 52.002735e+6, 52.002736e+6, 52.002737e+6, 52.002738e+6, 52.002739e+6, 52.002740e+6,
    52.002741e+6, 52.002742e+6, 52.002743e+6, 52.002744e+6, 52.002745e+6, 52.002746e+6, 52.002747e+6,
    52.002748e+6, 52.002749e+6, 52.002750e+6, 52.002751e+6, 52.002752e+6, 52.002753e+6, 52.002754e+6,
    52.002755e+6, 52.002756e+6, 52.002757e+6, 52.002758e+6, 52.002759e+6, 52.002760e+6, 52.002761e+6,
    52.002762e+6, 52.002763e+6, 52.002764e+6, 52.002765e+6, 52.002766e+6, 52.002767e+6, 52.002768e+6,
    52.002769e+6, 52.002770e+6, 52.002771e+6, 52.002772e+6, 52.002773e+6
  ]
}

module.exports = async (req, reply) => {
  if (!req.body) {
    return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: `Need payload 'message'.`})
  }

  const startTime = new Date().getTime()
  const isWebhook = req.method === 'post'
  const {
    sticker,
    imageThumbnail,
    imageFullsize,
    notificationDisabled,
    imageFile
  } = req.body

  const { serviceName, roomName } = req.params

  let { message, stickerPackageId, stickerId } = req.body
  // const { LineOutbound, ServiceWebhook } = notice.get()

  const xId = uuid(32, true)
  reply.header('x-line-uuid', xId)

  await dbRun(`INSERT INTO history_notify (uuid, category, service, room, sender) VALUES (?, 'notify', ?, ?, ?);`, [ xId, serviceName, roomName, JSON.stringify(req.body) ])

  // const outbound = await new LineOutbound({
  //   service,
  //   userTo: room,
  //   type: isWebhook ? 'webhook' : 'notify',
  //   sender: req.body || {},
  //   sended: true
  // }).save()

  if (!isWebhook) {
    if (typeof message === 'string') {
      message = message.replace(/\\n|newline/gi, '\n')
    }
    if (sticker) {
      stickerPackageId = 1
      stickerId = packageSticker[stickerPackageId][parseInt(Math.random() * 30)]
    }
  } else {
    // const payload = await ServiceWebhook.findOne({ service, room })
    // if (payload) {
    //   try {
    //     // eslint-disable-next-line no-unused-vars
    //     const { payload: body } = req
    //     // eslint-disable-next-line no-eval
    //     message = eval('`' + payload.body + '`')
    //   } catch (ex) {
    //     message = `eval \`fail\`\n${process.env.HOST_API}/webhook/${outbound._id}`
    //   }
    // } else {
    //   message = `*Webhook Payload*\n${process.env.HOST_API}/webhook/${outbound._id}`
    // }
  }

  try {
    const { pushNotify } = await sdkNotify(serviceName, roomName || '')

    let delayTime = new Date().getTime()

    const { headers, data } = await pushNotify({
      message,
      imageThumbnail,
      imageFullsize,
      stickerPackageId,
      stickerId,
      imageFile,
      notificationDisabled
    })

    delayTime = new Date().getTime() - delayTime
    const ratelimit = {
      remaining: parseInt(headers['x-ratelimit-remaining']),
      image: parseInt(headers['x-ratelimit-imageremaining']),
      reset: parseInt(headers['x-ratelimit-reset']) * 1000
    }

    if (data.status !== 200) {
      dbRun(`UPDATE history_notify SET error = ? WHERE uuid = ?;`, [ JSON.stringify(data), xId ])

      // await LineOutbound.updateOne(
      //   { _id: outbound._id },
      //   { $set: { sended: false, error: data.message } }
      // )
      return reply.status(400).send({ statusCode: data.status || 400, error: 'Bad pushNotify request', message: data.message || 'Bad Request' })
    }

    return reply.send({ statusCode: 200, delay: delayTime, used: new Date().getTime() - startTime, ratelimit })
  } catch (ex) {
    return reply.status(400).send({ statusCode: 400, error: ex, message: ex.message })
  }
}
