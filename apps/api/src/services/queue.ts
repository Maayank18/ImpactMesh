import { Queue } from 'bullmq'
import IORedis from 'ioredis'
import { env } from '../config/env'
import { analyzeMedia } from './pipeline'

let queue: Queue | null = null

function analysisQueue() {
  if (!env.redisUrl) return null
  if (!queue) {
    const connection = new IORedis(env.redisUrl, { maxRetriesPerRequest: null })
    queue = new Queue('media-analysis', { connection })
  }
  return queue
}

export async function enqueueAnalysis(mediaId: string) {
  const jobs = analysisQueue()
  if (!jobs) {
    void analyzeMedia(mediaId)
    return { mode: 'inline' as const }
  }
  await jobs.add(
    'analyze',
    { mediaId },
    {
      jobId: `analyze:${mediaId}:${Date.now()}`,
      attempts: 3,
      backoff: { type: 'exponential', delay: 1500 },
      removeOnComplete: 100,
    },
  )
  return { mode: 'queued' as const }
}
