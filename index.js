const fastify = require('fastify')({ console: false })
const logger = require('pino')()
const { db, init } = require('./api/db')

// const Sentry = require('@sentry/node')
// // const { notice } = require('@touno-io/db/schema')
// const notice = {}
// const console = require('@touno-io/debuger')('API')
// const { monitorLINE } = require('./api/monitor')

// const pkg = require('./package.json')

// const production = process.env.NODE_ENV === 'production'
// const infoInit = {
//   serverName: os.hostname(),
//   environment: process.env.NODE_ENV || 'development',
//   release: pkg.name || 'notice',
//   debug: !production,
//   // dsn: production ? process.env.SENTRY_DSN : null,
//   // tracesSampleRate: 1.0,
// }
// console.info('Sentry:', JSON.stringify(infoInit))
// Sentry.init(infoInit)

fastify.setErrorHandler(function (ex, req, reply) {
  logger.error({ msg: ex.stack || ex.message || ex })
  reply.status(500).send(ex)
})

fastify.register(require('@fastify/cors'), {})
fastify.register((fastify, _, done) => {
  // fastify.addHook('onRequest', (req, reply, done) => {
  //   req.userId = req.headers['x-userId']
  //   // eslint-disable-next-line no-logger
  //   logger.log('userId:', req.userId)
  //   reply.header('x-developer', '@dvgamerr')
  //   done()
  // })
  fastify.get('/health', (req, reply) => {
    // if (notice.connected()) {
    reply.code(200).send('☕')
    // } else {
    //   reply.code(500).send('')
    // }
  })
  done()
})

const apiRoute = require('./api/route')
for (const api of apiRoute) {
  fastify.route(api)
}


const exitHandler = (err, exitCode) => {
  db.close()
  logger.error(`${exitCode}:Exiting... (${err})`)
  process.exit(0)
}

process.on('SIGINT', exitHandler)
// process.on('SIGTERM', exitHandler)
// process.on('SIGUSR1', exitHandler)
// process.on('SIGUSR2', exitHandler)
// process.on('uncaughtException', exitHandler)

const initialize = () => Promise.all([
  init()
])

initialize().then(async () => {
  logger.info('fastify listen:3000')
  return fastify.listen({ port: 3000, host: '0.0.0.0' })
}).catch((ex) => {
  fastify.log.error(ex)
})
