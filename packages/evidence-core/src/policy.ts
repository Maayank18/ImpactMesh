import type { EvidenceDecision, EvidenceRole, RelationType } from '@impactmesh/shared-types'
import { classifyText } from './taxonomy'

export interface PolicyProject {
  id: string
  name: string
  description: string
  categories: string[]
}

export interface PolicyInput {
  filename: string
  caption: string
  tags: string[]
  locationKnown: boolean
  duplicateRisk: number
  projects: PolicyProject[]
}

const REVIEW_THRESHOLD = 0.75

function tokens(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2)
}

function clamp(value: number) {
  return Math.max(0, Math.min(0.96, value))
}

export function policyRoute(input: PolicyInput): EvidenceDecision {
  const text = `${input.filename} ${input.caption} ${input.tags.join(' ')}`
  const classified = classifyText(text)
  const hay = new Set(tokens(text))

  let best: { project: PolicyProject; score: number } | null = null
  for (const project of input.projects) {
    let score = 0
    for (const token of tokens(`${project.name} ${project.description}`)) {
      if (hay.has(token)) score += 1
    }
    if (classified.activity && project.categories.includes(classified.activity.id)) score += 3
    if (!best || score > best.score) best = { project, score }
  }

  const activityBoost = classified.activityScore > 0 ? 0.18 : 0
  let confidence = clamp(0.42 + (best?.score ?? 0) * 0.1 + activityBoost)
  if (!input.locationKnown) confidence = clamp(confidence - 0.12)
  if (input.duplicateRisk >= 0.92) confidence = clamp(confidence - 0.08)

  let projectChoice = 'needs_review'
  if ((best?.score ?? 0) >= 2) projectChoice = best!.project.id
  else if ((best?.score ?? 0) === 0 && !classified.activity) projectChoice = 'unrelated'

  const lower = text.toLowerCase()
  let evidenceRole: EvidenceRole = 'activity_evidence'
  if (/\bbefore\b/.test(lower)) evidenceRole = 'before'
  else if (/\bafter\b/.test(lower)) evidenceRole = 'after'
  else if (!classified.activity) evidenceRole = 'supporting'

  let relation: RelationType = classified.activity ? 'SHOWS_ACTIVITY' : 'BELONGS_TO'
  if (evidenceRole === 'before') relation = 'BEFORE_OF'
  if (evidenceRole === 'after') relation = 'AFTER_OF'

  const reasons = [
    classified.activity
      ? `Vocabulary points to ${classified.activity.label}.`
      : 'No activity vocabulary was strong enough to classify the file.',
    projectChoice === 'needs_review' || projectChoice === 'unrelated'
      ? 'No project matched strongly enough to file this automatically.'
      : `Closest project match is “${best?.project.name}”.`,
  ]
  if (!input.locationKnown) reasons.push('Location is missing, so confidence stays below the auto-file line.')
  if (input.duplicateRisk >= 0.92) reasons.push('Perceptual hash is close to an asset already in the record.')

  const requiresReview =
    projectChoice === 'needs_review' ||
    projectChoice === 'unrelated' ||
    confidence < REVIEW_THRESHOLD ||
    input.duplicateRisk >= 0.92

  if (requiresReview) evidenceRole = evidenceRole === 'before' || evidenceRole === 'after' ? evidenceRole : 'review'

  return {
    source: 'policy',
    model: 'impactmesh-policy-v1',
    projectChoice,
    confidence: Number(confidence.toFixed(2)),
    requiresReview,
    evidenceRole,
    relation,
    activityCategory: classified.activity?.id ?? null,
    reasons,
  }
}

export const REVIEW_CONFIDENCE = REVIEW_THRESHOLD
