import type { EvidenceDecision, EvidenceRole, RelationType } from '@impactmesh/shared-types'
import { ACTIVITIES } from './taxonomy'
import { policyRoute, type PolicyInput } from './policy'

// Zod-like runtime validation (no extra dependency — uses plain checks)
interface JevResponse {
  project: string
  activity: string
  contentCategory?:
    | 'travel_landscape'
    | 'events_gatherings'
    | 'personal_meeting'
    | 'work_documentation'
    | 'field_operations'
    | 'community_social'
    | 'general_evidence'
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
  'BEFORE_OF', 'AFTER_OF', 'SUPPORTS', 'FILED_IN',
])

function parseJevResponse(raw: unknown): JevResponse | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>
  if (typeof obj.project !== 'string') return null
  if (typeof obj.activity !== 'string') return null
  if (typeof obj.confidence !== 'number' || obj.confidence < 0 || obj.confidence > 1) return null
  if (typeof obj.reviewProbability !== 'number') return null
  const contentCategory = typeof obj.contentCategory === 'string' &&
    ['travel_landscape', 'events_gatherings', 'personal_meeting', 'work_documentation', 'field_operations', 'community_social', 'general_evidence'].includes(obj.contentCategory)
    ? (obj.contentCategory as JevResponse['contentCategory'])
    : undefined
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
    contentCategory,
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
  groqKeys?: string[],
): Promise<EvidenceDecision> {
  const policy = policyRoute(input)
  const hasGroq = Array.isArray(groqKeys) && groqKeys.length > 0
  if (!apiKey && !hasGroq) return policy

  const modelSlug = model || 'typesafe/jev-router'
  const start = Date.now()

  try {
    // Build the project choices for the schema enum
    const projectIds = input.projects.map((p) => p.id)
    const projectEnum = [...projectIds, 'needs_review', 'unrelated']
    const activityIds = ACTIVITIES.map((a) => a.id)
    const activityEnum = [...activityIds, 'unknown']

    const categoryEnum = [
      'travel_landscape',
      'events_gatherings',
      'personal_meeting',
      'work_documentation',
      'field_operations',
      'community_social',
      'general_evidence',
    ]

    const systemMessage = [
      'You are an intelligent evidence routing classifier for ImpactMesh multi-domain workspaces.',
      'You receive metadata about an uploaded media file and must decide:',
      '1. Which category does this file belong to:',
      '   - "travel_landscape": scenic outdoors, Switzerland, Alps, mountains, lakes, beaches, valleys, travel, tourism, vacation, nature expeditions.',
      '   - "events_gatherings": conferences, summits, hackathons, festivals, parties, workshops, ceremonies, sports, stage events.',
      '   - "personal_meeting": personal portraits, webcam selfies, family, friends, Zoom/Teams calls, online video meetings.',
      '   - "work_documentation": code, software IDE, terminal, presentations, spreadsheets, charts, diagrams, receipts, invoices, UI design.',
      '   - "field_operations": physical on-site environmental work, tree planting, river restoration, solar panels, waste cleanups, drone surveys.',
      '   - "community_social": volunteer drives, civic outreach, public welfare, food drives, NGO programs.',
      '   - "general_evidence": unclassified or general intake.',
      '2. Which project this image belongs to (pick ONLY from the given project IDs, or "unrelated" / "needs_review"). If the image is travel, personal, event, or work, choose "unrelated".',
      '3. Which sustainability activity it shows (or "unknown")',
      '4. Its evidence role and graph relation (e.g. "FILED_IN" for non-project categories)',
      '5. Your confidence (0-1) and whether a human should review it (0-1)',
      '',
      'CRITICAL RULES:',
      '- If the file shows mountains, lakes, Switzerland, scenic nature, or travel photography, set contentCategory="travel_landscape" and project="unrelated". DO NOT call it work documentation even if the filename contains "Screenshot"!',
      '- If the file shows faces, personal portraits, selfies, or online calls, set contentCategory="personal_meeting" and project="unrelated".',
      '- If the file shows conferences, festivals, workshops, or stage events, set contentCategory="events_gatherings" and project="unrelated".',
      '- Only set contentCategory="work_documentation" if it actually displays code, software, terminal, documents, or data tables.',
      '- Only choose project IDs if the image ACTUALLY matches that project description.',
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

    let rawContent: string | undefined
    let respondingModel: string | undefined
    let usage: { prompt_tokens?: number; completion_tokens?: number } | undefined

    // 1. ATTEMPT HIGH-SPEED GROQ INFERENCE WITH MULTI-KEY AUTO-FAILOVER
    if (hasGroq) {
      for (let i = 0; i < groqKeys.length; i++) {
        const groqKey = groqKeys[i]
        try {
          const controller = new AbortController()
          const timeout = setTimeout(() => controller.abort(), 6_000)
          const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${groqKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'llama-3.3-70b-versatile',
              temperature: 0.1,
              max_tokens: 500,
              response_format: { type: 'json_object' },
              messages: [
                {
                  role: 'system',
                  content: `${systemMessage}\nOutput MUST be valid JSON with keys: contentCategory, project, activity, evidenceRole, relation, confidence, reviewProbability, reasoning. Allowed contentCategory values: ${JSON.stringify(categoryEnum)}. Allowed project values: ${JSON.stringify(projectEnum)}. Allowed activity values: ${JSON.stringify(activityEnum)}.`,
                },
                { role: 'user', content: userMessage },
              ],
            }),
            signal: controller.signal,
          })
          clearTimeout(timeout)

          if (groqRes.ok) {
            const data = (await groqRes.json()) as {
              model?: string
              choices?: Array<{ message?: { content?: string } }>
              usage?: { prompt_tokens?: number; completion_tokens?: number }
            }
            if (data.choices?.[0]?.message?.content) {
              rawContent = data.choices[0].message.content
              respondingModel = data.model || 'groq/llama-3.3-70b-versatile'
              usage = data.usage
              break
            }
          }
        } catch {
          // Attempt next fallback key
        }
      }
    }

    // 2. FALLBACK TO OPENROUTER IF GROQ WAS UNAVAILABLE OR NOT CONFIGURED
    if (!rawContent && apiKey) {
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
                    enum: [
                      'cover',
                      'before',
                      'after',
                      'activity_evidence',
                      'location_evidence',
                      'partner_evidence',
                      'supporting',
                      'exclude',
                      'review',
                    ],
                  },
                  relation: {
                    type: 'string',
                    enum: ['BELONGS_TO', 'SHOWS_ACTIVITY', 'CAPTURED_AT', 'BEFORE_OF', 'AFTER_OF', 'SUPPORTS'],
                  },
                  confidence: { type: 'number' },
                  reviewProbability: { type: 'number' },
                  reasoning: { type: 'array', items: { type: 'string' }, maxItems: 3 },
                },
                required: [
                  'project',
                  'activity',
                  'evidenceRole',
                  'relation',
                  'confidence',
                  'reviewProbability',
                  'reasoning',
                ],
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

      if (response.ok) {
        const body = (await response.json()) as {
          model?: string
          choices?: Array<{ message?: { content?: string } }>
          usage?: { prompt_tokens?: number; completion_tokens?: number }
        }
        rawContent = body.choices?.[0]?.message?.content
        respondingModel = body.model || modelSlug
        usage = body.usage
      }
    }

    if (!rawContent) {
      throw new Error('All AI providers (Groq & OpenRouter) failed or were unconfigured')
    }

    const latencyMs = Date.now() - start

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

    const finalModel = respondingModel || modelSlug

    const category = jev.contentCategory || policy.contentCategory
    const categoryLabel =
      category === 'travel_landscape'
        ? 'Travel & Exploration'
        : category === 'events_gatherings'
          ? 'Events & Gatherings'
          : category === 'personal_meeting'
            ? 'Personal & Meetings'
            : category === 'work_documentation'
              ? 'Work & Documentation'
              : category === 'field_operations'
                ? 'Field Operations'
                : category === 'community_social'
                  ? 'Community & Social Impact'
                  : 'General Evidence'

    return {
      source: 'jev',
      model: finalModel,
      projectChoice,
      confidence,
      requiresReview,
      evidenceRole: (jev.evidenceRole as EvidenceDecision['evidenceRole']) || policy.evidenceRole,
      relation: (jev.relation as EvidenceDecision['relation']) || policy.relation,
      activityCategory: jev.activity !== 'unknown' ? jev.activity : policy.activityCategory,
      contentCategory: category,
      categoryLabel,
      reasons,
      debug: {
        respondingModel: finalModel,
        latencyMs,
        promptTokens: usage?.prompt_tokens,
        completionTokens: usage?.completion_tokens,
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
