const debuger = require('@touno-io/debuger')
const { notice } = require('@touno-io/db/schema')
const { setRevoke } = require('../sdk-notify')
const { loggingLINE } = require('../logging')

const logger = debuger('Notify')

module.exports = async (req, res) => {
  // Authorization oauth2 URI
  const { room, service } = req.params
  const { revoke } = req.body
  try {
    await notice.open()
    const { ServiceOauth } = notice.get()

    const token = await ServiceOauth.findOne({ service, room, accessToken: { $ne: null } })
    if (!token) { throw new Error('Service and room not register.') }
    if (revoke !== 'agree') { throw new Error('Please confirm revoke parameter') }
    const data = await setRevoke(token.accessToken)
    if (data.status !== 200) { throw new Error('Revoke Service fail.') }
    await ServiceOauth.updateOne({ service, room }, { $set: { accessToken: null } })
    await loggingLINE(`Rovoke room *${room}* from *${service}*`)
    res.json({})
  } catch (ex) {
    logger.error(ex)
    res.json({ error: (ex.error ? ex.error.message : ex.message || ex) })
  } finally {
    res.end()
  }
}