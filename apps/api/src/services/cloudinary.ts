import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'
import { v2 as cloudinary } from 'cloudinary'
import { tagDefinitionBatches } from '@impactmesh/evidence-core'
import { env, services } from '../config/env'

const here = path.dirname(fileURLToPath(import.meta.url))
const uploadDir = path.resolve(here, '../../data/uploads')

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

export interface VisionTag {
  name: string
  confidence: number
  source: string
  modelVersion: string
}

export interface VisionResult {
  caption: string
  tags: VisionTag[]
  category?: 'travel_landscape' | 'events_gatherings' | 'personal_meeting' | 'work_documentation' | 'field_operations' | 'community_social' | 'general_evidence'
}

export async function analyzeWithVision(uri: string): Promise<VisionResult> {
  const tags: VisionTag[] = []
  let caption = ''
  let category: VisionResult['category'] = undefined

  // 1. PRIMARY: High-accuracy Multi-modal Vision via OpenRouter Gemini 2.5 Flash
  if (env.openRouterKey) {
    try {
      let base64Data: string | null = null

      if (uri.startsWith('/api/v1/uploads/files/')) {
        const localFileName = uri.replace('/api/v1/uploads/files/', '')
        const localPath = path.resolve(uploadDir, localFileName)
        if (fs.existsSync(localPath)) {
          const buf = fs.readFileSync(localPath)
          const ext = path.extname(localFileName).toLowerCase()
          const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg'
          base64Data = `data:${mime};base64,${buf.toString('base64')}`
        }
      } else if (uri.startsWith('http')) {
        try {
          const controller = new AbortController()
          const timeout = setTimeout(() => controller.abort(), 4000)
          const imgRes = await fetch(uri, { signal: controller.signal })
          clearTimeout(timeout)
          if (imgRes.ok) {
            const arrayBuf = await imgRes.arrayBuffer()
            const mime = imgRes.headers.get('content-type') || 'image/jpeg'
            base64Data = `data:${mime};base64,${Buffer.from(arrayBuf).toString('base64')}`
          }
        } catch {
          // Fallback to passing uri directly
        }
      }

      const imageUrl = base64Data || (uri.startsWith('http') ? uri : null)

      if (imageUrl) {
        const prompt = [
          'Analyze this image for an evidence catalog. Return ONLY a valid JSON object with keys:',
          '- "caption": concise 1-sentence factual description of what is actually visible.',
          '- "tags": array of 4-8 visual keywords.',
          '- "category": one of: "travel_landscape", "personal_meeting", "work_documentation", "events_gatherings", "field_operations", "community_social", "general_evidence".',
          '',
          'CRITICAL CATEGORY RULES:',
          '- "travel_landscape": scenic outdoors, Switzerland, Alps, mountains, lakes, beaches, valleys, tourism, vacation, travel photography.',
          '- "personal_meeting": selfies, faces, video calls (Zoom/Teams), webcam, personal portraits.',
          '- "work_documentation": code editor, terminal, software UI, slides, invoices, documents, diagrams.',
          '- "events_gatherings": conferences, hackathons, festivals, stage presentations, public ceremonies.',
          '- "field_operations": environmental on-site work, tree planting, river bank cleanup, solar panels, drone survey.',
          '- "community_social": volunteer aid, charity distribution, NGO outreach.',
        ].join('\n')

        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 8000)

        const openRouterRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${env.openRouterKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://impact-mesh.vercel.app',
            'X-Title': 'ImpactMesh Vision AI',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            max_tokens: 300,
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: prompt },
                  { type: 'image_url', image_url: { url: imageUrl } },
                ],
              },
            ],
          }),
          signal: controller.signal,
        })
        clearTimeout(timeout)

        if (openRouterRes.ok) {
          const data = (await openRouterRes.json()) as { choices?: Array<{ message?: { content?: string } }> }
          const raw = data.choices?.[0]?.message?.content?.trim() || ''
          const jsonText = raw.replace(/^```(json)?\s*/i, '').replace(/```\s*$/, '').trim()
          const parsed = JSON.parse(jsonText) as {
            caption?: string
            tags?: string[]
            category?: VisionResult['category']
          }

          if (parsed.caption) caption = parsed.caption
          if (Array.isArray(parsed.tags)) {
            for (const t of parsed.tags) {
              tags.push({
                name: String(t).toLowerCase().replace(/[^a-z0-9_ -]/g, '').trim(),
                confidence: 0.95,
                source: 'gemini-vision-v2.5',
                modelVersion: 'gemini-2.5-flash',
              })
            }
          }
          if (parsed.category) {
            category = parsed.category
          }

          if (caption && tags.length > 0) {
            return { caption, tags, category }
          }
        }
      }
    } catch (err) {
      console.warn('OpenRouter Gemini vision pipeline error:', err instanceof Error ? err.message : err)
    }
  }

  // 2. SECONDARY FALLBACK: Cloudinary AI Vision Tagging & General Captioning (if subscription active)
  if (cloudinaryReady() && uri.startsWith('http')) {
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
    } catch {
      // Cloudinary paid add-on may be inactive
    }
    try {
      const json = await postAnalysis('ai_vision_general', {
        source: { uri },
        prompts: [
          'Write one factual caption for a field-evidence archive. Describe only what is visible. Do not estimate counts or environmental impact.',
        ],
      })
      const c = json.data?.analysis?.responses?.[0]?.value?.trim()
      if (c) caption = c
    } catch {
      // Cloudinary caption may be inactive
    }
  }

  return { caption, tags, category }
}
