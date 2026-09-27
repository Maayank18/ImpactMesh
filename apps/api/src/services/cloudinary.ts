import crypto from 'node:crypto'
import { v2 as cloudinary } from 'cloudinary'
import { tagDefinitionBatches } from '@impactmesh/evidence-core'
import { env, services } from '../config/env'

export function cloudinaryReady() {
  if (!services.cloudinary) return false
  cloudinary.config({
    cloud_name: env.cloudName,
    api_key: env.cloudKey,
    api_secret: env.cloudSecret,
    secure: true,
  })
  return true
}

export function signUpload(folder: string, context: string) {
  if (!cloudinaryReady()) return null
  const timestamp = Math.round(Date.now() / 1000)
  const paramsToSign = { timestamp, folder, context }
  const signature = cloudinary.utils.api_sign_request(paramsToSign, env.cloudSecret)
  return {
    mode: 'cloudinary' as const,
    timestamp,
    signature,
    folder,
    context,
    apiKey: env.cloudKey,
    cloudName: env.cloudName,
    uploadUrl: `https://api.cloudinary.com/v1_1/${env.cloudName}/auto/upload`,
  }
}

export function verifyNotificationSignature(body: string, timestamp: string, signature: string) {
  if (!env.cloudSecret || !signature || !timestamp) return false
  const age = Math.abs(Date.now() / 1000 - Number(timestamp))
  if (!Number.isFinite(age) || age > 60 * 60 * 2) return false
  const expected = crypto.createHash('sha1').update(body + timestamp + env.cloudSecret).digest('hex')
  const actual = Buffer.from(signature)
  const wanted = Buffer.from(expected)
  if (actual.length !== wanted.length) return false
  return crypto.timingSafeEqual(actual, wanted)
}

async function postAnalysis(method: 'ai_vision_tagging' | 'ai_vision_general', body: unknown) {
  const auth = Buffer.from(`${env.cloudKey}:${env.cloudSecret}`).toString('base64')
  const response = await fetch(`https://api.cloudinary.com/v2/analysis/${env.cloudName}/analyze/${method}`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    throw new Error(`Cloudinary ${method} returned ${response.status}`)
  }
  return response.json() as Promise<{
    data?: {
      analysis?: {
        tags?: { name: string }[]
        responses?: { value?: string }[]
        model_version?: number
      }
    }
  }>
}

export async function analyzeWithVision(uri: string) {
  if (!cloudinaryReady() || !uri.startsWith('http')) {
    return { caption: '', tags: [] as { name: string; confidence: number; source: string; modelVersion: string }[] }
  }
  const tags: { name: string; confidence: number; source: string; modelVersion: string }[] = []
  let caption = ''
  try {
    for (const batch of tagDefinitionBatches(10)) {
      const json = await postAnalysis('ai_vision_tagging', {
        source: { uri },
        tag_definitions: batch,
      })
      const version = String(json.data?.analysis?.model_version ?? 1)
      for (const tag of json.data?.analysis?.tags ?? []) {
        tags.push({
          name: tag.name,
          confidence: 0.8,
          source: 'cloudinary-ai-vision',
          modelVersion: `ai-vision-${version}`,
        })
      }
    }
  } catch (error) {
    console.warn('Cloudinary vision tagging skipped:', error instanceof Error ? error.message : error)
  }
  try {
    const json = await postAnalysis('ai_vision_general', {
      source: { uri },
      prompts: [
        'Write one factual caption for a field-evidence archive. Describe only what is visible. Do not estimate counts or environmental impact.',
      ],
    })
    caption = json.data?.analysis?.responses?.[0]?.value?.trim() ?? ''
  } catch (error) {
    console.warn('Cloudinary vision caption skipped:', error instanceof Error ? error.message : error)
  }
  return { caption, tags }
}
