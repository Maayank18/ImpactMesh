import type { EvidenceDecision, EvidenceRole, RelationType } from '@impactmesh/shared-types'
import { ACTIVITIES } from './taxonomy'
import { policyRoute, type PolicyInput } from './policy'

// Zod-like runtime validation (no extra dependency — uses plain checks)
interface JevResponse {
  project: string
  activity: string
  evidenceRole: string
  relation: string
  confidence: number
  reviewProbability: number
  reasoning: string[]
}

const VALID_ROLES = new Set([
  'cover', 'before', 'after', 'activity_evidence',
  'location_evidence', 'partner_evidence', 'supporting', 'exclude', 'review',
])

const VALID_RELATIONS = new Set([
  'BELONGS_TO', 'SHOWS_ACTIVITY', 'CAPTURED_AT',
  'BEFORE_OF', 'AFTER_OF', 'SUPPORTS',
])

function parseJevResponse(raw: unknown): JevResponse | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>
  if (typeof obj.project !== 'string') return null
  if (typeof obj.activity !== 'string') return null
  if (typeof obj.confidence !== 'number' || obj.confidence < 0 || obj.confidence > 1) return null
  if (typeof obj.reviewProbability !== 'number') return null
  const evidenceRole = typeof obj.evidenceRole === 'string' && VALID_ROLES.has(obj.evidenceRole)
    ? obj.evidenceRole
    : 'activity_evidence'
  const relation = typeof obj.relation === 'string' && VALID_RELATIONS.has(obj.relation)
    ? obj.relation
    : 'BELONGS_TO'
  const reasoning = Array.isArray(obj.reasoning)
    ? obj.reasoning.filter((r): r is string => typeof r === 'string').slice(0, 5)
    : []
  return {
    project: obj.project,
    activity: obj.activity,
    evidenceRole,
    relation,
    confidence: Math.max(0, Math.min(1, obj.confidence)),
    reviewProbability: Math.max(0, Math.min(1, obj.reviewProbability)),
    reasoning,
  }
}

export async function routeEvidence(
  input: PolicyInput,
  apiKey?: string,
  model?: string,
): Promise<EvidenceDecision> {
  const policy = policyRoute(input)
  if (!apiKey) return policy

  const modelSlug = model || 'typesafe/jev-router'
  const start = Date.now()

  try {
    // Build the project choices for the schema enum
    const projectIds = input.projects.map((p) => p.id)
    const projectEnum = [...projectIds, 'needs_review', 'unrelated']
    const activityIds = ACTIVITIES.map((a) => a.id)
    const activityEnum = [...activityIds, 'unknown']

    const systemMessage = [
      'You are an evidence routing classifier for a sustainability impact platform.',
      'You receive metadata about a field-captured image and must decide:',
      '1. Which project this image belongs to (pick ONLY from the given project IDs)',
      '2. Which sustainability activity it shows',
      '3. Its evidence role and graph relation',
      '4. Your confidence (0-1) and whether a human should review it (0-1)',
      '',
      'RULES:',
      '- Only choose from the IDs given. Never invent a project or activity ID.',
      '- If nothing fits well, use "needs_review" or "unrelated" for project, "unknown" for activity.',
      '- This is a field-evidence intake decision, not free chat.',
      '- Keep reasoning strings short (under 140 chars each) and limited to 1-3 items.',
      '',
      'Respond with valid JSON matching the exact schema provided.',
    ].join('\n')

    const userMessage = JSON.stringify({
      filename: input.filename,
      caption: input.caption,
      tags: input.tags,
      locationKnown: input.locationKnown,
      duplicateRisk: input.duplicateRisk,
      projects: input.projects.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
      })),
    })

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://impact-mesh.vercel.app',
        'X-Title': 'ImpactMesh Evidence Router',
      },
      body: JSON.stringify({
        model: modelSlug,
        temperature: 0,
        max_tokens: 500,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'evidence_decision',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                project: { type: 'string', enum: projectEnum },
                activity: { type: 'string', enum: activityEnum },
                evidenceRole: {
                  type: 'string',
                  enum: ['cover', 'before', 'after', 'activity_evidence',
                    'location_evidence', 'partner_evidence', 'supporting', 'exclude', 'review'],
                },
                relation: {
                  type: 'string',
                  enum: ['BELONGS_TO', 'SHOWS_ACTIVITY', 'CAPTURED_AT',
                    'BEFORE_OF', 'AFTER_OF', 'SUPPORTS'],
                },
                confidence: { type: 'number' },
                reviewProbability: { type: 'number' },
                reasoning: { type: 'array', items: { type: 'string' }, maxItems: 3 },
              },
              required: ['project', 'activity', 'evidenceRole', 'relation',
                'confidence', 'reviewProbability', 'reasoning'],
              additionalProperties: false,
            },
          },
        },
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userMessage },
        ],
      }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      throw new Error(`OpenRouter returned ${response.status}: ${errorText.slice(0, 200)}`)
    }

    const body = await response.json() as {
      model?: string
      choices?: Array<{ message?: { content?: string } }>
      usage?: { prompt_tokens?: number; completion_tokens?: number }
    }
    const latencyMs = Date.now() - start
    const rawContent = body.choices?.[0]?.message?.content
    if (!rawContent) throw new Error('No content in OpenRouter response')

    let parsed: unknown
    try {
      parsed = JSON.parse(rawContent)
    } catch {
      throw new Error('Malformed JSON in model response')
    }

    const jev = parseJevResponse(parsed)
    if (!jev) throw new Error('Model response failed schema validation')

    // Validate project choice is in our allowed set
    const projectChoice = projectEnum.includes(jev.project) ? jev.project : policy.projectChoice
    const confidence = Number(jev.confidence.toFixed(2))
    const reviewProbability = jev.reviewProbability

    // Compute disagreement with policy
    const disagrees = projectChoice !== policy.projectChoice

    // App-level requiresReview (the app decides, not the model)
    const requiresReview =
      reviewProbability >= 0.55 ||
      confidence < 0.75 ||
      input.duplicateRisk >= 0.92 ||
      projectChoice === 'needs_review' ||
      projectChoice === 'unrelated' ||
      disagrees

    // Build reasons array
    const reasons = [
      ...jev.reasoning,
      `Jev selected "${projectChoice}" with confidence ${confidence.toFixed(2)}.`,
      `Review probability is ${reviewProbability.toFixed(2)}. The application, not the model, applies the review rule.`,
    ]
    if (disagrees) {
      reasons.push('Jev and the local policy chose different projects, so a person should confirm.')
    }
    if (input.duplicateRisk >= 0.92) {
      reasons.push('Perceptual hash is close to an existing asset.')
    }

    const respondingModel = body.model || modelSlug

    return {
      source: 'jev',
      model: respondingModel,
      projectChoice,
      confidence,
      requiresReview,
      evidenceRole: (jev.evidenceRole as EvidenceDecision['evidenceRole']) || policy.evidenceRole,
      relation: (jev.relation as EvidenceDecision['relation']) || policy.relation,
      activityCategory: jev.activity !== 'unknown' ? jev.activity : policy.activityCategory,
      reasons,
      debug: {
        respondingModel,
        latencyMs,
        promptTokens: body.usage?.prompt_tokens,
        completionTokens: body.usage?.completion_tokens,
        reviewProbability,
        policyProjectChoice: policy.projectChoice,
        agreedWithPolicy: !disagrees,
      },
    }
  } catch (error) {
    return {
      ...policy,
      reasons: [
        ...policy.reasons,
        `Jev was unavailable (${error instanceof Error ? error.message : 'request failed'}). The local policy made the decision.`,
      ],
    }
  }
}
