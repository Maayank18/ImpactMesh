import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { MongoClient, type Db } from 'mongodb'

export type MongoLabel = 'configured' | 'local' | 'embedded'

let client: MongoClient | null = null
let memoryStop: (() => Promise<unknown>) | null = null

async function open(uri: string, timeoutMs: number) {
  const next = new MongoClient(uri, { serverSelectionTimeoutMS: timeoutMs })
  await next.connect()
  client = next
  const name = process.env.MONGODB_DB || 'impactmesh'
  return next.db(name)
}

export async function connectDatabase(): Promise<{ db: Db; label: MongoLabel }> {
  const configured = process.env.MONGODB_URI?.trim()
  if (configured) {
    const db = await open(configured, 8000)
    await ensureIndexes(db)
    return { db, label: 'configured' }
  }

  try {
    const db = await open('mongodb://127.0.0.1:27017', 900)
    await ensureIndexes(db)
    return { db, label: 'local' }
  } catch {
    console.log('Local MongoDB is not running. Starting an embedded MongoDB so the app can boot without an account or API key.')
    const { MongoMemoryServer } = await import('mongodb-memory-server')
    const dbPath = path.join(os.tmpdir(), 'impactmesh-mongodb')
    await fs.mkdir(dbPath, { recursive: true })
    const memory = await MongoMemoryServer.create({
      instance: {
        dbName: process.env.MONGODB_DB || 'impactmesh',
        dbPath,
        storageEngine: 'wiredTiger',
      },
    })
    memoryStop = () => memory.stop()
    const db = await open(memory.getUri(), 8000)
    await ensureIndexes(db)
    console.log(`Embedded MongoDB data directory: ${dbPath}`)
    return { db, label: 'embedded' }
  }
}

async function ensureIndexes(db: Db) {
  await db.collection('users').createIndex({ email: 1 }, { unique: true })
  await db.collection('projects').createIndex({ organizationId: 1, slug: 1 })
  await db.collection('media').createIndex({ projectId: 1, reviewStatus: 1 })
  await db.collection('media').createIndex({ cloudinaryPublicId: 1 }, { sparse: true })
  await db.collection('locations').createIndex({ geo: '2dsphere' }, { sparse: true })
  await db.collection('edges').createIndex({ sourceId: 1, targetId: 1, relation: 1 })
  await db.collection('audit').createIndex({ createdAt: -1 })
}

export async function closeDatabase() {
  await client?.close()
  client = null
  if (memoryStop) await memoryStop()
  memoryStop = null
}
