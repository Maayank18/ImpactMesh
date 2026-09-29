import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Preserve runtime environment variables explicitly provided by caller/runtime
// (e.g. scripts/dev.mjs dynamic port fallback, Render/cloud dynamic PORT, CLI)
const runtimePort = process.env.PORT
const runtimeFrontendUrl = process.env.FRONTEND_URL
const runtimeApiUrl = process.env.API_URL

const here = path.dirname(fileURLToPath(import.meta.url))
// 1. Load apps/api/.env (service-specific config)
dotenv.config({ path: path.resolve(here, '../../.env') })
// 2. Load workspace root .env (shared repository config)
dotenv.config({ path: path.resolve(here, '../../../../.env') })
// 3. Fallback to current working directory .env if different
dotenv.config()

// Restore runtime overrides if provided by process environment
if (runtimePort) process.env.PORT = runtimePort
if (runtimeFrontendUrl) process.env.FRONTEND_URL = runtimeFrontendUrl
if (runtimeApiUrl) process.env.API_URL = runtimeApiUrl

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

const groqKeys = [
  process.env.GROQ_API_KEY,
  process.env.GROQ_API_KEY_FALLBACK,
  process.env.GROQ_API_KEY_FALLBACK_2,
  process.env.GROQ_API_KEY_FALLBACK_3,
  process.env.GROQ_API_KEY_FALLBACK_4,
]
  .map((k) => k?.trim())
  .filter((k): k is string => Boolean(k && k.length > 5))

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
  groqKey: groqKeys[0] || '',
  groqKeys,
  redisUrl: process.env.REDIS_URL || '',
}

export const services = {
  cloudinary: flag(env.cloudName) && flag(env.cloudKey) && flag(env.cloudSecret),
  jev: flag(env.openRouterKey) || groqKeys.length > 0,
  groq: groqKeys.length > 0,
  redis: flag(env.redisUrl),
  mongodb: true,
}

export const integrationMode = services.cloudinary ? 'connected' : 'demo'
