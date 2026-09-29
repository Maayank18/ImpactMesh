import type { GraphLink, GraphNode, GraphPayload, RelationType } from '@impactmesh/shared-types'

export interface GraphMediaInput {
  id: string
  projectId: string | null
  label: string
  imageUrl: string
  reviewStatus: string
  aiStatus: string
  locationId: string | null
  activityId: string | null
  evidenceSetId: string | null
  capturedAt: string | null
  confidence: number
  caption: string
  publicOnly?: boolean
  isPublic?: boolean
  contentCategory?: string | null
  categoryLabel?: string | null
}

export interface GraphBuildInput {
  organization: { id: string; name: string }
  projects: {
    id: string
    name: string
    primaryLocationId: string | null
    status: string
  }[]
  locations: { id: string; name: string; city: string; latitude: number; longitude: number }[]
  activities: { id: string; projectId: string; name: string; category: string }[]
  partners: { id: string; name: string }[]
  projectPartners: { projectId: string; partnerId: string }[]
  evidenceSets: { id: string; projectId: string; name: string }[]
  media: GraphMediaInput[]
  reports: { id: string; projectId: string; title: string; evidenceIds: string[] }[]
  edges: {
    id: string
    sourceId: string
    targetId: string
    relation: RelationType
    confidence: number
    why: string[]
  }[]
  tags?: { id: string; label: string; mediaIds: string[] }[]
}

export interface GraphBuildOptions {
  projectId?: string
  includeMedia?: boolean
  includeTags?: boolean
  minConfidence?: number
  mode?: 'explore' | 'evidence'
  evidenceMediaIds?: string[]
  from?: string | null
  to?: string | null
  publicOnly?: boolean
}

const SIZE: Record<GraphNode['type'], number> = {
  organization: 22,
  project: 16,
  category: 15,
  evidence_set: 11,
  location: 10,
  activity: 9,
  report: 9,
  partner: 8,
  media: 6,
  tag: 3,
}

function link(
  source: string,
  target: string,
  relation: RelationType,
  confidence: number,
  why: string[],
): GraphLink {
  return {
    id: `${relation}:${source}:${target}`,
    source,
    target,
    relation,
    confidence,
    why,
  }
}

function inRange(iso: string | null, from?: string | null, to?: string | null) {
  if (!from && !to) return true
  if (!iso) return false
  const t = new Date(iso).getTime()
  if (from && t < new Date(from).getTime()) return false
  if (to && t > new Date(to).getTime()) return false
  return true
}

export function buildEvidenceGraph(input: GraphBuildInput, options: GraphBuildOptions = {}): GraphPayload {
  const includeMedia = options.includeMedia ?? false
  const minConfidence = options.minConfidence ?? 0
  const mode = options.mode ?? 'explore'
  const evidenceIds = new Set(options.evidenceMediaIds ?? [])

  let projects = input.projects
  if (options.projectId) projects = projects.filter((project) => project.id === options.projectId)
  const projectIds = new Set(projects.map((project) => project.id))

  let media = input.media.filter((item) => {
    if (item.reviewStatus === 'rejected') return false
    if (options.projectId && item.projectId !== options.projectId) return false
    if (options.publicOnly && !item.isPublic) return false
    if (!inRange(item.capturedAt, options.from, options.to)) return false
    if (mode === 'evidence' && evidenceIds.size > 0 && !evidenceIds.has(item.id)) return false
    return true
  })

  if (mode === 'evidence' && evidenceIds.size > 0) {
    const keepProjects = new Set(media.map((item) => item.projectId).filter(Boolean) as string[])
    projects = projects.filter((project) => keepProjects.has(project.id))
  }

  const activeProjectIds = new Set(projects.map((project) => project.id))
  media = media.filter((item) => !item.projectId || activeProjectIds.has(item.projectId))

  const nodes: GraphNode[] = []
  const links: GraphLink[] = []
  const locationIds = new Set<string>()
  const activityIds = new Set<string>()
  const setIds = new Set<string>()
  const partnerIds = new Set<string>()

  nodes.push({
    id: input.organization.id,
    type: 'organization',
    label: input.organization.name,
    size: SIZE.organization,
    confidence: 1,
  })

  for (const project of projects) {
    nodes.push({
      id: project.id,
      type: 'project',
      label: project.name,
      size: SIZE.project,
      confidence: 1,
      groupId: project.id,
      metadata: { projectId: project.id },
    })
    links.push(
      link(project.id, input.organization.id, 'BELONGS_TO', 1, [
        'This project is part of the organization evidence record.',
      ]),
    )
    if (project.primaryLocationId) locationIds.add(project.primaryLocationId)
  }

  for (const activity of input.activities) {
    if (!activeProjectIds.has(activity.projectId)) continue
    activityIds.add(activity.id)
    nodes.push({
      id: activity.id,
      type: 'activity',
      label: activity.name,
      size: SIZE.activity,
      groupId: activity.projectId,
      metadata: { projectId: activity.projectId },
    })
    links.push(
      link(activity.id, activity.projectId, 'BELONGS_TO', 0.95, [
        `Activity vocabulary “${activity.category}” is part of this project.`,
      ]),
    )
  }

  for (const set of input.evidenceSets) {
    if (!activeProjectIds.has(set.projectId)) continue
    if (mode === 'evidence' && evidenceIds.size > 0) {
      const used = media.some((item) => item.evidenceSetId === set.id)
      if (!used) continue
    }
    setIds.add(set.id)
    nodes.push({
      id: set.id,
      type: 'evidence_set',
      label: set.name,
      size: SIZE.evidence_set,
      groupId: set.projectId,
      metadata: { projectId: set.projectId },
    })
    links.push(
      link(set.id, set.projectId, 'BELONGS_TO', 0.9, ['Evidence cluster assembled for this project.']),
    )
  }

  for (const join of input.projectPartners) {
    if (!activeProjectIds.has(join.projectId)) continue
    partnerIds.add(join.partnerId)
  }

  for (const partner of input.partners) {
    if (!partnerIds.has(partner.id)) continue
    nodes.push({
      id: partner.id,
      type: 'partner',
      label: partner.name,
      size: SIZE.partner,
    })
    for (const join of input.projectPartners) {
      if (join.partnerId === partner.id && activeProjectIds.has(join.projectId)) {
        links.push(
          link(partner.id, join.projectId, 'PARTNERED_WITH', 0.88, [
            'Listed as a partner on this project.',
          ]),
        )
      }
    }
  }

  for (const report of input.reports) {
    if (!activeProjectIds.has(report.projectId)) continue
    if (mode === 'evidence' && evidenceIds.size > 0) {
      const overlaps = report.evidenceIds.some((id) => evidenceIds.has(id))
      if (!overlaps) continue
    }
    nodes.push({
      id: report.id,
      type: 'report',
      label: report.title,
      size: SIZE.report,
      groupId: report.projectId,
      metadata: { projectId: report.projectId },
    })
    links.push(
      link(report.id, report.projectId, 'PUBLISHED_AS', 0.92, [
        'Report assembled from this project’s reviewed evidence.',
      ]),
    )
  }

  const visibleMedia = includeMedia || mode === 'evidence' ? media : []
  const activeCategories = new Map<string, { id: string; label: string; color: string; count: number }>()

  function inferCategory(item: GraphMediaInput): { id: string; label: string; color: string } {
    if (item.contentCategory === 'travel_landscape') {
      return { id: 'cat_travel', label: 'Travel & Exploration', color: '#06b6d4' }
    }
    if (item.contentCategory === 'events_gatherings') {
      return { id: 'cat_events', label: 'Events & Gatherings', color: '#f59e0b' }
    }
    if (item.contentCategory === 'personal_meeting') {
      return { id: 'cat_personal', label: 'Personal & Meetings', color: '#a855f7' }
    }
    if (item.contentCategory === 'work_documentation') {
      return { id: 'cat_work', label: 'Work & Documentation', color: '#38bdf8' }
    }
    if (item.contentCategory === 'community_social') {
      return { id: 'cat_community', label: 'Community & Social Impact', color: '#f43f5e' }
    }
    if (item.contentCategory === 'field_operations') {
      return { id: 'cat_field', label: 'Field Operations', color: '#10b981' }
    }
    const text = `${item.label} ${item.caption || ''}`.toLowerCase()
    if (/(switzerland|swiss|alps|mountain|lake|landscape|scenic|travel|vacation|tourism|tourist|hiking|valley|fjord|glacier|beach|resort|nature|outdoor|hill|destination|waterfall|forest|holiday|trip)/.test(text)) {
      return { id: 'cat_travel', label: 'Travel & Exploration', color: '#06b6d4' }
    }
    if (/(event|conference|summit|hackathon|festival|party|gathering|workshop|stage|celebration|ceremony|concert|exhibition|keynote|webinar|sports)/.test(text)) {
      return { id: 'cat_events', label: 'Events & Gatherings', color: '#f59e0b' }
    }
    if (/(person|people|face|selfie|portrait|headshot|meet|meeting|zoom|teams|call|webcam|avatar|family|friends|glasses)/.test(text)) {
      return { id: 'cat_personal', label: 'Personal & Meetings', color: '#a855f7' }
    }
    if (/(code|ide|vscode|terminal|programming|git|github|slide|presentation|dashboard|chart|graph|table|invoice|receipt|document|diagram|wireframe|spreadsheet|excel|pdf)/.test(text)) {
      return { id: 'cat_work', label: 'Work & Documentation', color: '#38bdf8' }
    }
    if (/(community|volunteer|social|charity|aid|relief|ngo|donation|civic|welfare)/.test(text)) {
      return { id: 'cat_community', label: 'Community & Social Impact', color: '#f43f5e' }
    }
    if (item.activityId || /(tree|water|river|plant|solar|waste|soil|sapling|drone|field|restoration|plantation)/.test(text)) {
      return { id: 'cat_field', label: 'Field Operations', color: '#10b981' }
    }
    return { id: 'cat_general', label: 'General Evidence', color: '#94a3b8' }
  }

  // Pre-collect active category parent clusters
  for (const item of visibleMedia) {
    const cat = inferCategory(item)
    const isSpecialCategory = cat.id !== 'cat_field'
    const isUnassigned = !item.projectId || !activeProjectIds.has(item.projectId)
    if (isSpecialCategory || isUnassigned) {
      const existing = activeCategories.get(cat.id)
      if (existing) {
        existing.count += 1
      } else {
        activeCategories.set(cat.id, { ...cat, count: 1 })
      }
    }
  }

  // Add dynamic Category parent nodes to the graph
  for (const [catId, cat] of activeCategories.entries()) {
    nodes.push({
      id: catId,
      type: 'category',
      label: cat.label,
      size: SIZE.category,
      color: cat.color,
      confidence: 0.96,
      groupId: catId,
      clusterCount: cat.count,
      metadata: {
        category: catId,
        count: cat.count,
        description: `Smart parent cluster for ${cat.label}`,
      },
    })
    links.push(
      link(catId, input.organization.id, 'BELONGS_TO', 0.95, [
        `Dynamic parent cluster for ${cat.label}.`,
      ]),
    )
  }

  for (const item of visibleMedia) {
    const location = input.locations.find((entry) => entry.id === item.locationId)
    const cat = inferCategory(item)
    const hasCategoryParent = activeCategories.has(cat.id)
    const isSpecialCategory = cat.id !== 'cat_field'

    nodes.push({
      id: item.id,
      type: 'media',
      label: item.label,
      size: SIZE.media,
      confidence: item.confidence,
      imageUrl: item.imageUrl,
      groupId: hasCategoryParent && isSpecialCategory ? cat.id : (item.projectId ?? cat.id),
      metadata: {
        caption: item.caption,
        reviewStatus: item.reviewStatus,
        pending: item.reviewStatus === 'pending' || item.aiStatus !== 'ready',
        projectId: item.projectId ?? undefined,
        location: location?.name,
        latitude: location?.latitude,
        longitude: location?.longitude,
        capturedAt: item.capturedAt ?? undefined,
        contentCategory: cat.id,
        categoryLabel: cat.label,
      },
    })

    // Connect to dynamic category parent node
    if (hasCategoryParent && (isSpecialCategory || !item.projectId || !activeProjectIds.has(item.projectId))) {
      links.push(
        link(item.id, cat.id, 'FILED_IN', item.confidence || 0.9, [
          `AI clustered this media under "${cat.label}".`,
        ]),
      )
    }

    // Only link to project if it actually belongs to a valid project and is not personal/work
    if (item.projectId && activeProjectIds.has(item.projectId) && !isSpecialCategory) {
      links.push(
        link(item.id, item.projectId, 'BELONGS_TO', item.confidence || 0.8, [
          'Filed under this project during intake.',
          item.reviewStatus === 'approved' ? 'A reviewer approved the filing.' : 'Waiting for human review.',
        ]),
      )
    }
    if (item.locationId && location) {
      locationIds.add(item.locationId)
      links.push(
        link(item.id, item.locationId, 'CAPTURED_AT', item.confidence || 0.7, [
          'Coordinates stored with this location.',
        ]),
      )
    }
    if (item.activityId && activityIds.has(item.activityId)) {
      links.push(
        link(item.id, item.activityId, 'SHOWS_ACTIVITY', item.confidence || 0.75, [
          'Caption and tags match this activity.',
        ]),
      )
    }
    if (item.evidenceSetId && setIds.has(item.evidenceSetId)) {
      links.push(
        link(item.id, item.evidenceSetId, 'FILED_IN', 0.9, ['Grouped into this evidence cluster.']),
      )
    }
    for (const report of input.reports) {
      if (report.evidenceIds.includes(item.id) && nodes.some((node) => node.id === report.id)) {
        links.push(
          link(item.id, report.id, 'SUPPORTS', 0.93, ['Cited as a source in this report.']),
        )
      }
    }
  }

  for (const location of input.locations) {
    const used =
      locationIds.has(location.id) ||
      projects.some((project) => project.primaryLocationId === location.id)
    if (!used) continue
    if (!nodes.some((node) => node.id === location.id)) {
      nodes.push({
        id: location.id,
        type: 'location',
        label: location.name,
        size: SIZE.location,
        metadata: {
          location: location.name,
          city: location.city,
          latitude: location.latitude,
          longitude: location.longitude,
        },
      })
    }
    for (const project of projects) {
      if (project.primaryLocationId === location.id) {
        links.push(
          link(project.id, location.id, 'OVERLAPS_LOCATION', 0.84, ['Primary location for this project.']),
        )
      }
    }
  }

  if (options.includeTags && input.tags) {
    for (const tag of input.tags.slice(0, 12)) {
      const related = tag.mediaIds.filter((id) => nodes.some((node) => node.id === id))
      if (related.length === 0) continue
      nodes.push({ id: tag.id, type: 'tag', label: tag.label, size: SIZE.tag })
      for (const mediaId of related) {
        links.push(link(mediaId, tag.id, 'MENTIONS', 0.7, [`Normalized tag “${tag.label}”.`]))
      }
    }
  }

  const nodeIds = new Set(nodes.map((node) => node.id))
  for (const edge of input.edges) {
    if (!nodeIds.has(edge.sourceId) || !nodeIds.has(edge.targetId)) continue
    if (edge.confidence < minConfidence) continue
    const id = `${edge.relation}:${edge.sourceId}:${edge.targetId}`
    if (links.some((item) => item.id === id)) continue
    links.push({
      id,
      source: edge.sourceId,
      target: edge.targetId,
      relation: edge.relation,
      confidence: edge.confidence,
      why: edge.why,
    })
  }

  const filteredLinks = links.filter((item) => item.confidence >= minConfidence)
  const linked = new Set<string>()
  for (const item of filteredLinks) {
    linked.add(item.source)
    linked.add(item.target)
  }
  const filteredNodes = nodes.filter((node) => node.type === 'organization' || linked.has(node.id) || node.type === 'project')

  return {
    nodes: filteredNodes,
    links: filteredLinks,
    stats: {
      nodes: filteredNodes.length,
      links: filteredLinks.length,
      media: filteredNodes.filter((node) => node.type === 'media').length,
    },
  }
}

export function neighborsOf(graph: GraphPayload, nodeId: string): GraphPayload {
  const links = graph.links.filter((item) => item.source === nodeId || item.target === nodeId)
  const ids = new Set<string>([nodeId])
  for (const item of links) {
    ids.add(item.source)
    ids.add(item.target)
  }
  return {
    nodes: graph.nodes.filter((node) => ids.has(node.id)),
    links,
    stats: {
      nodes: ids.size,
      links: links.length,
      media: graph.nodes.filter((node) => ids.has(node.id) && node.type === 'media').length,
    },
  }
}
