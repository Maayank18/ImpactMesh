import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Worker } from 'bullmq'
import IORedis from 'ioredis'

const here = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(here, '../../../.env') })

const redisUrl = process.env.REDIS_URL || ''
const apiUrl = process.env.API_URL || 'http://localhost:8787'
const workerSecret = process.env.WORKER_SECRET || 'dev-only-worker-secret'
const queues = ['media-analysis', 'embedding', 'graph-sync', 'report', 'geolocation'] as const

async function postJob(pathName: string, payload: unknown) {
  const response = await fetch(`${apiUrl}/api/v1/internal/jobs/${pathName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-worker-secret': workerSecret,
    },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    throw new Error(await response.text())
  }
}

if (!redisUrl) {
  console.log('ImpactMesh worker idle. No REDIS_URL — the API runs jobs in-process.')
  setInterval(() => undefined, 60_000)
} else {
  const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null })
  for (const name of queues) {
    const worker = new Worker(
      name,
      async (job) => {
        if (name === 'media-analysis') {
          await postJob('analyze', { mediaId: job.data.mediaId })
          return
        }
        console.log(`Queue ${name} received ${job.id}. Handled with the analysis pipeline when it carries a media id.`)
      },
      { connection, concurrency: 2 },
    )
    worker.on('failed', (job, error) => {
      console.error(`Job ${job?.id} on ${name} failed`, error.message)
    })
  }
  console.log(`ImpactMesh worker listening on ${queues.join(', ')}`)
}
