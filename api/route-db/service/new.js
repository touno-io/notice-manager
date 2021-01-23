const { notice } = require('@touno-io/db/schema')
const logger = require('@touno-io/debuger')('API')
const { loggingLINE } = require('../../logging')

module.exports = async (req, res) => {
  const data = req.body
  try {
    await notice.open()
    const { ServiceBot } = notice.get() // LineInbound, LineOutbound, LineCMD, ServiceOauth
    if (await ServiceBot.findOne({ service: data.name, active: true })) { throw new Error('name is duplicate.') }
    const found = await ServiceBot.findOne({ service: data.name }) || {}

    let serviceId = found._id
    if (!found._id) {
      const saved = await new ServiceBot({
        name: data.name,
        service: data.name,
        client: data.client_id,
        secret: data.client_secret
      }).save()
      serviceId = saved._id
    } else {
      await ServiceBot.updateOne({ name: data.name, active: false }, {
        $set: {
          client: data.client_id,
          secret: data.client_secret,
          active: true
        }
      })
    }
    await loggingLINE(`Notify service add *${data.name}*`)
    res.json({ _id: serviceId })
  } catch (ex) {
    logger.error(ex)
    res.json({ error: ex.stack || ex.message || ex })
  } finally {
    res.end()
  }
}