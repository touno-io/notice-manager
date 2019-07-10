import { WebClient } from '@slack/web-api'
import debuger from '@touno-io/debuger'
import pkg from '../../package.json'

const dev = !(process.env.NODE_ENV === 'production')
const logger = debuger(pkg.title)

export const pkgChannel = 'api-line-bot'
export const pkgName = `LINE-BOT v${pkg.version}`

export const getChannal = async (room, web = null) => {
  if (!web) return
  let obj = null

  let list = (await web.channels.list()).channels
  for (const channel of list) {
    if (channel.name === room) {
      obj = channel
      break
    }
  }
  if (!obj && room) throw new Error('channels is undefined.')
  return obj || list
}

export const slackMessage = async (room, name, sender = { text: 'hello world.' }) => {
  if (!room || !process.env.SLACK_TOKEN) return

  const token = process.env.SLACK_TOKEN
  const web = new WebClient(token)

  let channel = await getChannal(room, web)
  if (typeof sender === 'string') sender = { text: sender }
  
  await web.chat.postMessage(Object.assign({
    channel: channel.id,
    username: name
  }, sender))
}

export const slackError = async ex => {
  if (dev) {
    logger.error(ex)
  } else {
    const icon = 'https://api.slack.com/img/blocks/bkb_template_images/notificationsWarningIcon.png'
    await slackMessage(pkgChannel, pkgName, {
      text: ex.message,
      blocks: [
        {
          type: 'context',
          elements: [ { type: 'image', image_url: icon, alt_text: 'ERROR' }, { type: 'mrkdwn', text: `*${ex.message}*` } ]
        },
        { type: 'section', text: { type: 'mrkdwn', text: ex.stack ? ex.stack : '' } }
      ]
    })
  }
}
