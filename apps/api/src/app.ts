import cors from 'cors'
import express from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import { nanoid } from 'nanoid'
import pino from 'pino'
import pinoHttp from 'pino-http'
import { env } from './config/env'
import { HttpError } from './http'
import { api } from './routes/index'

export function createApp() {
  const app = express()
  const logger = pino({
    level: env.nodeEnv === 'test' ? 'silent' : 'info',
    redact: ['req.headers.authorization', 'req.headers["x-worker-secret"]'],
  })

  app.disable('x-powered-by')
  app.use((req, _res, next) => {
    req.requestId = nanoid(8)
    next()
  })
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
  app.use(
    cors({
      origin: [env.frontendUrl, 'http://localhost:5173'],
      credentials: true,
    }),
  )
  app.use(
    rateLimit({
      windowMs: 60_000,
      max: 400,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  )
  app.use(
    express.json({
      limit: '2mb',
      verify: (req, _res, buffer) => {
        ;(req as express.Request).rawBody = buffer.toString('utf8')
      },
    }),
  )
  app.use(
    pinoHttp({
      logger,
      autoLogging: { ignore: (req) => req.url === '/api/v1/health' },
      customProps: (req) => ({ requestId: (req as express.Request).requestId }),
    }),
  )
  app.use('/api/v1', api)
  app.use((error: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    let status = 500
    let message = 'Something went wrong while handling that request.'
    if (error instanceof HttpError) {
      status = error.status
      message = error.message
    } else if (error instanceof Error) {
      const clientError = /file|unsupported|limit|too large|unexpected/i.test(error.message)
      status = clientError ? 400 : 500
      message = status === 500 && env.nodeEnv === 'production' ? message : error.message
    }
    if (status >= 500) logger.error({ err: error, requestId: req.requestId }, 'request failed')
    res.status(status).json({ error: message, requestId: req.requestId })
  })
  return app
}
