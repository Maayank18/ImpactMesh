import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(here, '../../../../.env'), override: true })
dotenv.config({ path: path.resolve(here, '../../.env'), override: true })
dotenv.config({ override: true })

function flag(value: string | undefined) {
  return Boolean(value && value.trim())
}

const sessionSecret = process.env.SESSION_SECRET || 'dev-only-impactmesh-secret'
if (process.env.NODE_ENV === 'production' && sessionSecret.startsWith('dev-only')) {
  throw new Error('Set SESSION_SECRET before running ImpactMesh in production.')
}

let cloudName = process.env.CLOUDINARY_CLOUD_NAME || ''
let cloudKey = process.env.CLOUDINARY_API_KEY || ''
let cloudSecret = process.env.CLOUDINARY_API_SECRET || ''

const rawCldUrl = process.env.CLOUDINARY_URL || ''
if (rawCldUrl && (!cloudName || !cloudKey || !cloudSecret)) {
  try {
    const parsed = new URL(rawCldUrl)
    if (parsed.protocol === 'cloudinary:') {
      cloudKey = parsed.username || cloudKey
      cloudSecret = parsed.password || cloudSecret
      cloudName = parsed.hostname || cloudName
    }
  } catch {
    const match = rawCldUrl.match(/cloudinary:\/\/([^:]+):([^@]+)@(.+)/)
    if (match) {
      cloudKey = match[1]
      cloudSecret = match[2]
      cloudName = match[3]
    }
  }
}

export const env = {
  port: Number(process.env.PORT || 8787),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  apiUrl: process.env.API_URL || 'http://localhost:8787',
  sessionSecret,
  workerSecret: process.env.WORKER_SECRET || 'dev-only-worker-secret',
  mongoUri: process.env.MONGODB_URI || '',
  cloudName,
  cloudKey,
  cloudSecret,
  typesafeKey: process.env.TYPESAFE_API_KEY || '',
  openRouterKey: process.env.OPENROUTER_API_KEY || process.env.TYPESAFE_API_KEY || '',
  jevModel: process.env.JEV_MODEL || 'typesafe/jev-router',
  groqKey: process.env.GROQ_API_KEY || '',
  redisUrl: process.env.REDIS_URL || '',
}

export const services = {
  cloudinary: flag(env.cloudName) && flag(env.cloudKey) && flag(env.cloudSecret),
  jev: flag(env.openRouterKey),
  redis: flag(env.redisUrl),
  mongodb: true,
}

export const integrationMode = services.cloudinary ? 'connected' : 'demo'
