import type { EvidenceDecision } from '@impactmesh/shared-types'
import { ACTIVITIES } from './taxonomy'
import { policyRoute, type PolicyInput } from './policy'

type ChoiceAnswer = { choice?: string; confidence?: number; probabilities?: Record<string, number> }
type NoulAnswer = { noul?: number }

function confidenceOf(answer: ChoiceAnswer | undefined, fallback: number) {
  if (!answer?.choice) return fallback
  if (typeof answer.confidence === 'number') return answer.confidence
  const probability = answer.probabilities?.[answer.choice]
  return typeof probability === 'number' ? probability : fallback
}

export async function routeEvidence(input: PolicyInput, apiKey?: string): Promise<EvidenceDecision> {
  const policy = policyRoute(input)
  if (!apiKey) return policy

  try {
    const sdk = (await import('@typesafe-ai/sdk')) as {
      TypeSafeClient: new (options?: { apiKey?: string; defaultModel?: string }) => {
        systemOne: (body: { state: unknown; questions: Record<string, unknown> }) => Promise<{
          model?: string
          answers: Record<string, ChoiceAnswer | NoulAnswer>
        }>
      }
      choice: (instructions: string, criteria: Record<string, string | null>) => unknown
      noul: (instructions: string) => unknown
    }

    const projectCriteria: Record<string, string | null> = {
      needs_review: 'A person should confirm where this asset belongs.',
      unrelated: 'The asset does not belong to any current project.',
    }
    for (const project of input.projects) {
      projectCriteria[project.id] = `${project.name}. ${project.description}`
    }

    const activityCriteria: Record<string, string | null> = { unknown: 'None of the activities fit.' }
    for (const activity of ACTIVITIES) activityCriteria[activity.id] = activity.description

    const client = new sdk.TypeSafeClient({ apiKey, defaultModel: 'jev-1.13.0' })
    const response = await client.systemOne({
      state: {
        filename: input.filename,
        caption: input.caption,
        tags: input.tags,
        locationKnown: input.locationKnown,
        duplicateRisk: input.duplicateRisk,
        projects: input.projects.map((project) => ({
          id: project.id,
          name: project.name,
          description: project.description,
        })),
      },
      questions: {
        project: sdk.choice('Which project should this field asset join?', projectCriteria),
        activity: sdk.choice('Which sustainability activity does this asset show?', activityCriteria),
        review: sdk.noul('Should a human review this asset before it is trusted in the evidence graph?'),
        role: sdk.choice('Which evidence role fits this asset?', {
          cover: 'Strong representative frame for the project.',
          before: 'Earlier state in a visual comparison.',
          after: 'Later state in a visual comparison.',
          activity_evidence: 'Shows the project activity.',
          location_evidence: 'Mainly establishes where the work happened.',
          partner_evidence: 'Shows a partner, institution, or joint crew.',
          supporting: 'Useful context, not a primary claim.',
          exclude: 'Do not use this in a report.',
          review: 'Hold it for a person.',
        }),
        relation: sdk.choice('Which graph relation should connect this asset to the project?', {
          BELONGS_TO: 'It is simply part of the project record.',
          SHOWS_ACTIVITY: 'It shows a project activity.',
          CAPTURED_AT: 'Its main value is the place it was captured.',
          BEFORE_OF: 'It is the earlier frame of a comparison.',
          AFTER_OF: 'It is the later frame of a comparison.',
          SUPPORTS: 'It supports a claim but is not the activity itself.',
        }),
      },
    })

    const answers = response.answers
    const projectAnswer = answers.project as ChoiceAnswer
    const activityAnswer = answers.activity as ChoiceAnswer
    const roleAnswer = answers.role as ChoiceAnswer
    const relationAnswer = answers.relation as ChoiceAnswer
    const reviewAnswer = answers.review as NoulAnswer
    const projectChoice = projectAnswer?.choice || policy.projectChoice
    const confidence = Number(confidenceOf(projectAnswer, policy.confidence).toFixed(2))
    const reviewProbability = typeof reviewAnswer?.noul === 'number' ? reviewAnswer.noul : 0
    const disagrees = projectChoice !== policy.projectChoice
    const requiresReview =
      reviewProbability >= 0.55 ||
      confidence < 0.75 ||
      input.duplicateRisk >= 0.92 ||
      projectChoice === 'needs_review' ||
      projectChoice === 'unrelated' ||
      disagrees

    const reasons = [
      `Jev selected “${projectChoice}” with confidence ${confidence.toFixed(2)}.`,
      `Review probability is ${reviewProbability.toFixed(2)}. The application, not the model, applies the review rule.`,
    ]
    if (disagrees) {
      reasons.push('Jev and the local policy chose different projects, so a person should confirm.')
    }
    if (input.duplicateRisk >= 0.92) reasons.push('Perceptual hash is close to an existing asset.')

    return {
      source: 'jev',
      model: response.model || 'jev-1.13.0',
      projectChoice,
      confidence,
      requiresReview,
      evidenceRole: (roleAnswer?.choice as EvidenceDecision['evidenceRole']) || policy.evidenceRole,
      relation: (relationAnswer?.choice as EvidenceDecision['relation']) || policy.relation,
      activityCategory: activityAnswer?.choice && activityAnswer.choice !== 'unknown' ? activityAnswer.choice : policy.activityCategory,
      reasons,
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
