import { describe, expect, it } from 'vitest'
import { buildEvidenceGraph, type GraphBuildInput } from './index'

const fixture: GraphBuildInput = {
  organization: { id: 'org', name: 'Green Yamuna' },
  projects: [
    { id: 'proj_a', name: 'River', primaryLocationId: 'loc_a', status: 'active' },
    { id: 'proj_b', name: 'Solar', primaryLocationId: 'loc_b', status: 'active' },
  ],
  locations: [
    { id: 'loc_a', name: 'Nigambodh', city: 'Delhi', latitude: 28.6, longitude: 77.2 },
    { id: 'loc_b', name: 'Jhajjar', city: 'Jhajjar', latitude: 28.6, longitude: 76.6 },
  ],
  activities: [{ id: 'act_a', projectId: 'proj_a', name: 'Tree planting', category: 'tree_planting' }],
  partners: [{ id: 'par_a', name: 'City' }],
  projectPartners: [{ projectId: 'proj_a', partnerId: 'par_a' }],
  evidenceSets: [{ id: 'set_a', projectId: 'proj_a', name: 'September visit' }],
  media: [
    {
      id: 'med_a',
      projectId: 'proj_a',
      label: '01.jpg',
      imageUrl: 'https://example.com/1.jpg',
      reviewStatus: 'approved',
      aiStatus: 'ready',
      locationId: 'loc_a',
      activityId: 'act_a',
      evidenceSetId: 'set_a',
      capturedAt: '2026-09-12T00:00:00.000Z',
      confidence: 0.9,
      caption: 'Saplings',
      isPublic: true,
    },
    {
      id: 'med_b',
      projectId: 'proj_a',
      label: '02.jpg',
      imageUrl: 'https://example.com/2.jpg',
      reviewStatus: 'rejected',
      aiStatus: 'ready',
      locationId: 'loc_a',
      activityId: null,
      evidenceSetId: null,
      capturedAt: '2026-09-12T00:00:00.000Z',
      confidence: 0.4,
      caption: 'Rejected',
    },
  ],
  reports: [{ id: 'rep_a', projectId: 'proj_a', title: 'Brief', evidenceIds: ['med_a'] }],
  edges: [
    {
      id: 'edge_sim',
      sourceId: 'med_a',
      targetId: 'med_b',
      relation: 'SIMILAR_TO',
      confidence: 0.96,
      why: ['Perceptual hash overlap.'],
    },
  ],
}

describe('buildEvidenceGraph', () => {
  it('starts from the organization and hides media until asked', () => {
    const graph = buildEvidenceGraph(fixture)
    expect(graph.nodes.some((node) => node.id === 'org')).toBe(true)
    expect(graph.nodes.some((node) => node.type === 'project')).toBe(true)
    expect(graph.nodes.some((node) => node.type === 'media')).toBe(false)
  })

  it('drops rejected media and keeps approved assets when expanded', () => {
    const graph = buildEvidenceGraph(fixture, { includeMedia: true, projectId: 'proj_a' })
    expect(graph.nodes.map((node) => node.id)).toContain('med_a')
    expect(graph.nodes.map((node) => node.id)).not.toContain('med_b')
    expect(graph.links.some((link) => link.relation === 'SHOWS_ACTIVITY')).toBe(true)
    expect(graph.links.some((link) => link.relation === 'SUPPORTS')).toBe(true)
  })

  it('evidence mode keeps only the cited cluster', () => {
    const graph = buildEvidenceGraph(fixture, {
      includeMedia: true,
      mode: 'evidence',
      evidenceMediaIds: ['med_a'],
    })
    expect(graph.nodes.some((node) => node.id === 'proj_b')).toBe(false)
    expect(graph.nodes.some((node) => node.id === 'med_a')).toBe(true)
  })
})
