import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { routeEvidence } from './jev'
import type { PolicyInput } from './policy'

const INPUT: PolicyInput = {
  filename: 'IMG_20240315_tree_planting.jpg',
  caption: 'Community tree planting event near river bank',
  tags: ['tree', 'sapling', 'community', 'river'],
  locationKnown: true,
  duplicateRisk: 0.1,
  projects: [
    {
      id: 'proj-1',
      name: 'Yamuna Restoration',
      description: 'River bank restoration and tree planting along the Yamuna',
      categories: ['tree_planting', 'water_restoration'],
    },
    {
      id: 'proj-2',
      name: 'Solar Schools',
      description: 'Installing solar panels on rural schools',
      categories: ['solar_installation'],
    },
  ],
}

function mockFetch(body: unknown, status = 200) {
  return function fakeFetch(): Promise<Response> {
    return Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body),
      text: () => Promise.resolve(JSON.stringify(body)),
    } as Response)
  }
}

function successBody(overrides: Record<string, unknown> = {}) {
  return {
    model: 'typesafe/jev-router',
    choices: [
      {
        message: {
          content: JSON.stringify({
            project: 'proj-1',
            activity: 'tree_planting',
            evidenceRole: 'activity_evidence',
            relation: 'SHOWS_ACTIVITY',
            confidence: 0.89,
            reviewProbability: 0.12,
            reasoning: ['Tree planting activity clearly visible', 'Matches Yamuna Restoration project'],
            ...overrides,
          }),
        },
      },
    ],
    usage: { prompt_tokens: 220, completion_tokens: 45 },
  }
}

describe('routeEvidence', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('returns policy result when no API key is provided', async () => {
    const result = await routeEvidence(INPUT)
    expect(result.source).toBe('policy')
    expect(result.model).toBe('impactmesh-policy-v1')
  })

  it('returns policy result when API key is empty string', async () => {
    const result = await routeEvidence(INPUT, '')
    expect(result.source).toBe('policy')
  })

  it('returns jev result on successful API response', async () => {
    globalThis.fetch = mockFetch(successBody()) as typeof fetch
    const result = await routeEvidence(INPUT, 'sk-test-key')
    expect(result.source).toBe('jev')
    expect(result.projectChoice).toBe('proj-1')
    expect(result.confidence).toBe(0.89)
    expect(result.activityCategory).toBe('tree_planting')
    expect(result.evidenceRole).toBe('activity_evidence')
    expect(result.relation).toBe('SHOWS_ACTIVITY')
    expect(result.debug).toBeDefined()
    expect(result.debug?.respondingModel).toBe('typesafe/jev-router')
    expect(result.debug?.agreedWithPolicy).toBe(true)
  })

  it('falls back to policy on non-2xx response', async () => {
    globalThis.fetch = mockFetch({ error: 'Invalid key' }, 401) as typeof fetch
    const result = await routeEvidence(INPUT, 'sk-bad-key')
    expect(result.source).toBe('policy')
    expect(result.reasons.some((r) => r.includes('Jev was unavailable'))).toBe(true)
  })

  it('falls back to policy on malformed JSON response', async () => {
    globalThis.fetch = mockFetch({
      model: 'test',
      choices: [{ message: { content: 'this is not json {{{' } }],
    }) as typeof fetch
    const result = await routeEvidence(INPUT, 'sk-test-key')
    expect(result.source).toBe('policy')
    expect(result.reasons.some((r) => r.includes('Jev was unavailable'))).toBe(true)
  })

  it('falls back to policy when response fails schema validation', async () => {
    globalThis.fetch = mockFetch({
      model: 'test',
      choices: [{ message: { content: JSON.stringify({ wrong: 'schema' }) } }],
    }) as typeof fetch
    const result = await routeEvidence(INPUT, 'sk-test-key')
    expect(result.source).toBe('policy')
    expect(result.reasons.some((r) => r.includes('schema validation'))).toBe(true)
  })

  it('falls back to policy on fetch timeout (abort)', async () => {
    globalThis.fetch = (() => {
      return new Promise((_resolve, reject) => {
        setTimeout(() => reject(new DOMException('Aborted', 'AbortError')), 50)
      })
    }) as typeof fetch
    const result = await routeEvidence(INPUT, 'sk-test-key')
    expect(result.source).toBe('policy')
    expect(result.reasons.some((r) => r.includes('Jev was unavailable'))).toBe(true)
  })

  it('marks requiresReview when confidence is low', async () => {
    globalThis.fetch = mockFetch(successBody({ confidence: 0.5 })) as typeof fetch
    const result = await routeEvidence(INPUT, 'sk-test-key')
    expect(result.source).toBe('jev')
    expect(result.requiresReview).toBe(true)
  })

  it('marks requiresReview when jev disagrees with policy', async () => {
    globalThis.fetch = mockFetch(successBody({ project: 'proj-2' })) as typeof fetch
    const result = await routeEvidence(INPUT, 'sk-test-key')
    expect(result.source).toBe('jev')
    expect(result.requiresReview).toBe(true)
    expect(result.debug?.agreedWithPolicy).toBe(false)
    expect(result.reasons.some((r) => r.includes('different projects'))).toBe(true)
  })

  it('marks requiresReview when reviewProbability is high', async () => {
    globalThis.fetch = mockFetch(successBody({ reviewProbability: 0.8, confidence: 0.95 })) as typeof fetch
    const result = await routeEvidence(INPUT, 'sk-test-key')
    expect(result.source).toBe('jev')
    expect(result.requiresReview).toBe(true)
  })

  it('marks requiresReview on high duplicate risk', async () => {
    const highDupeInput = { ...INPUT, duplicateRisk: 0.95 }
    globalThis.fetch = mockFetch(successBody({ confidence: 0.95, reviewProbability: 0.1 })) as typeof fetch
    const result = await routeEvidence(highDupeInput, 'sk-test-key')
    expect(result.requiresReview).toBe(true)
  })

  it('passes the model slug through to the API call', async () => {
    let capturedBody: string | undefined
    globalThis.fetch = (((_url: string, init: RequestInit) => {
      capturedBody = init.body as string
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(successBody()),
      })
    }) as unknown) as typeof fetch
    await routeEvidence(INPUT, 'sk-test-key', 'custom/model-slug')
    expect(capturedBody).toBeDefined()
    const parsed = JSON.parse(capturedBody!)
    expect(parsed.model).toBe('custom/model-slug')
  })

  it('does not include debug on policy fallback', async () => {
    const result = await routeEvidence(INPUT)
    expect(result.debug).toBeUndefined()
  })

  it('never throws — always resolves', async () => {
    globalThis.fetch = (() => {
      throw new Error('Network completely down')
    }) as typeof fetch
    const result = await routeEvidence(INPUT, 'sk-test-key')
    expect(result.source).toBe('policy')
    // Did not throw
  })
})
