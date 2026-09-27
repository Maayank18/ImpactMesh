import { describe, expect, it } from 'vitest'
import { policyRoute } from './policy'
import { parseEvidenceQuery, rankEvidence } from './search'
import { haversineKm } from './geo'
import { hashSimilarity } from './similarity'

const projects = [
  {
    id: 'proj_yamuna',
    name: 'Yamuna River Restoration',
    description: 'Bank restoration, waste removal, and native planting along the Yamuna in Delhi.',
    categories: ['tree_planting', 'waste_collection', 'water_testing', 'water_restoration'],
  },
  {
    id: 'proj_solar',
    name: 'Haryana Solar Courtyards',
    description: 'Rooftop solar installation in Jhajjar courtyards.',
    categories: ['solar_installation'],
  },
]

describe('policyRoute', () => {
  it('files a plantation caption with the river project', () => {
    const decision = policyRoute({
      filename: 'saplings-nigambodh.jpg',
      caption: 'Native saplings planted on the Yamuna bank.',
      tags: ['sapling', 'river'],
      locationKnown: true,
      duplicateRisk: 0,
      projects,
    })
    expect(decision.projectChoice).toBe('proj_yamuna')
    expect(decision.activityCategory).toBe('tree_planting')
    expect(decision.requiresReview).toBe(false)
  })

  it('holds a vague file for review', () => {
    const decision = policyRoute({
      filename: 'IMG_1001.jpg',
      caption: 'Field photo',
      tags: [],
      locationKnown: false,
      duplicateRisk: 0,
      projects,
    })
    expect(decision.requiresReview).toBe(true)
    expect(decision.projectChoice).not.toBe('proj_solar')
  })
})

describe('search', () => {
  it('reads activity, place, and month from a sentence', () => {
    const parsed = parseEvidenceQuery('show plantation work near Delhi from September 2026', [
      { name: 'Nigambodh Ghat', city: 'Delhi' },
    ])
    expect(parsed.activity).toBe('tree_planting')
    expect(parsed.location).toBe('Nigambodh Ghat')
    expect(parsed.from?.startsWith('2026-09')).toBe(true)
  })

  it('ranks the matching asset above a solar frame', () => {
    const parsed = parseEvidenceQuery('waste cleanup in Delhi', [{ name: 'ITO Yamuna Bank', city: 'Delhi' }])
    const ranked = rankEvidence(
      [
        {
          id: 'waste',
          text: 'waste bags cleanup ITO Yamuna Bank Delhi',
          activityCategory: 'waste_collection',
          locationName: 'ITO Yamuna Bank',
          capturedAt: '2026-09-18T00:00:00.000Z',
          evidenceRole: 'activity_evidence',
          reviewStatus: 'approved',
        },
        {
          id: 'solar',
          text: 'solar panels Jhajjar',
          activityCategory: 'solar_installation',
          locationName: 'Jhajjar',
          capturedAt: '2026-07-02T00:00:00.000Z',
          evidenceRole: 'activity_evidence',
          reviewStatus: 'approved',
        },
      ],
      parsed,
    )
    expect(ranked[0]?.id).toBe('waste')
  })
})

describe('geo and similarity', () => {
  it('measures a short distance inside Delhi', () => {
    const km = haversineKm(28.6692, 77.2315, 28.6284, 77.2406)
    expect(km).toBeGreaterThan(3)
    expect(km).toBeLessThan(8)
  })

  it('treats near-identical hashes as similar', () => {
    const a = '1'.repeat(32) + '0'.repeat(32)
    const b = '1'.repeat(32) + '0'.repeat(29) + '111'
    expect(hashSimilarity(a, b)).toBeGreaterThan(0.95)
  })
})
