import mongo from '../../mongodb'

export default async (req, res) => {
  // Authorization oauth2 URI
  const { website, name } = req.params
  // const { message } = req.body
  let outbound = null
  
  await mongo.open()
  const { LineOutbound } = mongo.get()

  try {
  //   if (typeof message !== 'string') throw new Error('Message is undefined.')

    outbound = await new LineOutbound({
      botname: website,
      userTo: name,
      type: 'notify',
      sender: req.body || {},
      sended: false,
      error: null,
      created: new Date(),
    }).save()

  //   const token = await ServiceOauth.findOne({ service, room })
  //   if (!token || !token.accessToken) throw new Error('Service and room not register.')

  //   let { headers } = await pushMessage(token.accessToken, message.replace(/\\n|newline/ig, '\n'))
  //   let result = {
  //     remaining: parseInt(headers['x-ratelimit-remaining']),
  //     image: parseInt(headers['x-ratelimit-imageremaining']),
  //     reset: parseInt(headers['x-ratelimit-reset']) * 1000
  //   }
  //   await ServiceOauth.updateOne({ room, service }, { $set: { limit: result } })
  //   await LineOutbound.updateOne({ _id: outbound._id }, { $set: { sended: true } })
    res.json({})
  } catch (ex) {
    if (outbound) await LineOutbound.updateOne({ _id: outbound._id }, { $set: { error: ex.message || ex.toString() } })
    res.status(ex.error ? ex.error.status : 500)
    res.json({ error: (ex.error ? ex.error.message : ex.message || ex) })
  } finally {
    res.end()
  }
}