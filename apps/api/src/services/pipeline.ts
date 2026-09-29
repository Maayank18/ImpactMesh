import { classifyText, resolveLocation, routeEvidence } from '@impactmesh/evidence-core'
import type { MediaSignal } from '@impactmesh/shared-types'
import { env } from '../config/env'
import { repo } from '../data/repository'
import { analyzeWithVision } from './cloudinary'

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const running = new Set<string>()

export async function analyzeMedia(mediaId: string) {
  if (running.has(mediaId)) return
  const existing = repo.getMedia(mediaId)
  if (!existing) return
  running.add(mediaId)
  const job = repo.startJob(`analyze:${mediaId}:${Date.now()}`, 'media-analysis')
  try {
    repo.setAiStatus(mediaId, 'analyzing')
    const started = Date.now()
    const vision = await analyzeWithVision(existing.media.secureUrl)
    const caption = vision.caption || existing.media.caption
    const classified = classifyText(`${existing.media.filename} ${caption} ${vision.tags.map((tag) => tag.name).join(' ')}`)
    const signals: MediaSignal[] = []
    const push = (signal: MediaSignal) => {
      const prior = signals.find((item) => item.normalizedTag === signal.normalizedTag)
      if (!prior) signals.push(signal)
      else if (signal.confidence > prior.confidence) Object.assign(prior, signal)
    }
    for (const tag of vision.tags) {
      push({
        tag: tag.name,
        normalizedTag: tag.name,
        confidence: tag.confidence,
        source: tag.source,
        modelVersion: tag.modelVersion,
      })
    }
    if (classified.activity) {
      push({
        tag: classified.activity.label,
        normalizedTag: classified.activity.id,
        confidence: Math.min(0.94, 0.58 + classified.activityScore * 0.12),
        source: 'taxonomy-normalizer',
        modelVersion: 'taxonomy-v1',
      })
    }
    for (const signal of classified.signals) {
      push({
        tag: signal.label,
        normalizedTag: signal.id,
        confidence: 0.74,
        source: 'taxonomy-normalizer',
        modelVersion: 'taxonomy-v1',
      })
    }
    if (classified.change) {
      push({
        tag: classified.change.label,
        normalizedTag: classified.change.id,
        confidence: 0.66,
        source: 'taxonomy-normalizer',
        modelVersion: 'taxonomy-v1',
      })
    }

    const elapsed = Date.now() - started
    if (elapsed < 700) await wait(700 - elapsed)
    repo.setAiStatus(mediaId, 'connecting')

    const fresh = repo.getMedia(mediaId)
    if (!fresh) return
    const project = fresh.media.projectId ? repo.getProject(fresh.media.projectId) : null
    const primary = project?.locations.find((location) => location.id === project.project.primaryLocationId) ?? null
    const geo = resolveLocation({
      exif:
        fresh.media.latitude !== null && fresh.media.longitude !== null
          ? { latitude: fresh.media.latitude, longitude: fresh.media.longitude }
          : null,
      projectLocation: primary
        ? { id: primary.id, name: primary.name, latitude: primary.latitude, longitude: primary.longitude }
        : null,
      known: repo.knownLocations().map((location) => ({
        id: location.id,
        name: location.name,
        latitude: location.latitude,
        longitude: location.longitude,
      })),
    })
    const similar = repo.similarCandidates(fresh.media.perceptualHash, fresh.media.id)
    const decision = await routeEvidence(
      {
        filename: fresh.media.filename,
        caption,
        tags: signals.map((signal) => signal.normalizedTag),
        locationKnown: geo.source !== 'unknown',
        duplicateRisk: similar?.score ?? 0,
        projects: repo.projectsForDecisions(),
      },
      env.openRouterKey || undefined,
      env.jevModel,
      env.groqKeys,
    )
    if (geo.reason) decision.reasons = [...decision.reasons, geo.reason]
    if (vision.category && vision.category !== 'general_evidence') {
      decision.contentCategory = vision.category
      const categoryLabels: Record<string, string> = {
        travel_landscape: 'Travel & Exploration',
        events_gatherings: 'Events & Gatherings',
        personal_meeting: 'Personal & Meetings',
        work_documentation: 'Work & Documentation',
        field_operations: 'Field Operations',
        community_social: 'Community & Social Impact',
        general_evidence: 'General Evidence',
      }
      decision.categoryLabel = categoryLabels[vision.category] || 'General Evidence'
      if (vision.category !== 'field_operations') {
        decision.projectChoice = 'unrelated'
        decision.relation = 'FILED_IN'
      }
    }
    if (vision.caption && !decision.reasons.some((r) => r.startsWith('AI Vision:'))) {
      decision.reasons = [`AI Vision: ${vision.caption}`, ...decision.reasons]
    }
    await wait(450)
    repo.applyAnalysis(mediaId, {
      caption,
      signals,
      decision,
      locationId: geo.locationId,
      latitude: geo.latitude,
      longitude: geo.longitude,
      locationSource: geo.source,
      locationConfidence: geo.confidence,
      activityCategory: decision.activityCategory,
      similarTo: similar,
    })
    repo.finishJob(job.id)
  } catch (error) {
    repo.setAiStatus(mediaId, 'failed')
    repo.failJob(job.id, error instanceof Error ? error.message : 'Analysis failed')
  } finally {
    running.delete(mediaId)
  }
}
