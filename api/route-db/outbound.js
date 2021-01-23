const { notice } = require('@touno-io/db/schema')
const logger = require('@touno-io/debuger')('API')

module.exports = async (req, res) => {
  const { bot } = req.params
  try {
    await notice.open()
    res.json((await notice.get('LineOutbound').find({ botname: bot }, null, { sort: { created: -1 }, skip: 0, limit: 1000 })) || [])
  } catch (ex) {
    logger.error(ex)
    res.status(500).json({ error: ex.stack || ex.message || ex })
  } finally {
    res.end()
  }
}