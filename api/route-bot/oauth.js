const { AuthorizationCode } = require('simple-oauth2')
const debuger = require('@touno-io/debuger')
const { notice } = require('@touno-io/db/schema')
const { getStatus, setRevoke } = require('../sdk-notify')
const { loggingLINE } = require('../logging')

const uuid = (length) => {
  let result = ''
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  return result
}
const hosts = process.env.HOST_API || 'https://notice.touno.io'
const logger = debuger('OAUTH')

module.exports = async (req, res) => {
  // Authorization oauth2 URI
  const { code, state, error } = req.query
  const { room, service } = req.params
  const redirectUri = `${hosts}/register`
  const responseType = 'code'
  const scope = 'notify'

  try {
    await notice.open()
    const { ServiceOauth, ServiceBot } = notice.get()

    if (code) {
      const oauth = await ServiceOauth.findOne({ state })

      const bot = await ServiceBot.findOne({ service: oauth.service })
      const credentials = {
        client: { id: bot.client, secret: bot.secret },
        auth: { tokenHost: 'https://notify-bot.line.me/' },
        options: { bodyFormat: 'form' }
      }
      const client = new AuthorizationCode(credentials)

      const tokenConfig = {
        code,
        redirect_uri: redirectUri,
        client_id: credentials.client.id,
        client_secret: credentials.client.secret
      }

      if (oauth.accessToken) {
        try {
          await setRevoke(oauth.accessToken)
        } catch (ex) {
          logger.error(ex)
        }
      }

      try {
        const accessToken = await client.getToken(tokenConfig)
        if (accessToken.token.status !== 200) { throw new Error('Access Token is not verify.') }
        const res = await getStatus(accessToken.token.access_token)

        const data = await ServiceOauth.findOne({ state })
        await ServiceOauth.updateOne({ state }, { $set: { name: res.target, accessToken: accessToken.token.access_token } })
        await loggingLINE(`Join room *${res.message}* with service *${data.service}*`)
      } catch (ex) {
        await ServiceOauth.updateOne({ state }, { $set: { active: false } })
        throw ex
      }

      return res.redirect(hosts)
    } else if (error) {
      return res.redirect(hosts)
    } else {
      if (!service || !room) { return res.sendStatus(500) }

      const bot = await ServiceBot.findOne({ service })
      if (!bot) { return res.sendStatus(500) }

      const credentials = {
        client: { id: bot.client, secret: bot.secret },
        auth: { tokenHost: 'https://notify-bot.line.me/' },
        options: { bodyFormat: 'form' }
      }
      const client = new AuthorizationCode(credentials)

      const newState = uuid(16)
      logger.log(`${service} in ${room} new state is '${newState}'`)
      const token = await ServiceOauth.findOne({ service, room })
      if (token) {
        await ServiceOauth.updateOne({ service, room }, { $set: { state: newState } })
      } else {
        await new ServiceOauth({ name: room, service, room, response_type: responseType, redirect_uri: redirectUri, state: newState }).save()
      }
      const authorizationUri = client.authorizeURL({ response_type: responseType, redirect_uri: redirectUri, scope, state: newState })
      return res.redirect(authorizationUri)
    }
  } catch (ex) {
    logger.error(ex)
    res.json({ error: ex.message || ex })
  } finally {
    res.end()
  }
}