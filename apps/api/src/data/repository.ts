import { nanoid } from 'nanoid'
import type { Db } from 'mongodb'
import { thumbnailUrl } from '@impactmesh/cloudinary-client'
import {
  assembleNarrative,
  buildLineage,
  confidenceLedger,
  hashSimilarity,
  parseEvidenceQuery,
  rankEvidence,
  renderReportHtml,
  withinRadius,
} from '@impactmesh/evidence-core'
import { buildEvidenceGraph, neighborsOf, type GraphBuildInput } from '@impactmesh/graph-engine'
import type {
  Activity,
  AuditEvent,
  Comparison,
  EvidenceDecision,
  GraphPayload,
  Location,
  MediaAsset,
  MediaSignal,
  Organization,
  Project,
  Report,
  Role,
  ServiceStatus,
  UserProfile,
} from '@impactmesh/shared-types'
import { connectDatabase, type MongoLabel } from './mongo'
import { createSeed, type Database } from './seed'

const SCHEMA_VERSION = 1
const COLLECTIONS = [
  'users',
  'organizations',
  'members',
  'projects',
  'locations',
  'activities',
  'partners',
  'projectPartners',
  'evidenceSets',
  'media',
  'edges',
  'reports',
  'comparisons',
  'audit',
  'jobs',
  'embeddings',
] as const

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return slug || 'project'
}

export class EvidenceRepository {
  private db: Database
  private mongo: Db | null = null
  private timer: NodeJS.Timeout | null = null
  private writing: Promise<void> = Promise.resolve()

  constructor() {
    this.db = createSeed()
  }

  async hydrate(database: Db) {
    this.mongo = database
    const meta = await database.collection<{ _id: string; schemaVersion: number }>('meta').findOne({ _id: 'impactmesh' })
    if (!meta || meta.schemaVersion !== SCHEMA_VERSION) {
      this.db = createSeed()
      await this.persistNow()
      return
    }
    this.db = await this.readAll()
    if (!this.db.organizations.length) {
      this.db = createSeed()
      await this.persistNow()
    }
  }

  private async readAll(): Promise<Database> {
    const database = this.mongo
    if (!database) return createSeed()
    const read = async (name: string) => {
      const docs = await database.collection(name).find({}).toArray()
      return docs.map((doc) => {
        const copy = { ...doc } as Record<string, unknown>
        delete copy._id
        delete copy.geo
        return copy
      })
    }
    const webhooks = await database.collection('webhooks').find({}).toArray()
    const loaded = {
      schemaVersion: SCHEMA_VERSION,
      webhooks: webhooks.map((doc) => String(doc.value)),
    } as Database
    for (const name of COLLECTIONS) {
      loaded[name] = (await read(name)) as never
    }
    return loaded
  }

  private async persistNow() {
    const database = this.mongo
    if (!database) return
    const snapshot = structuredClone(this.db)
    for (const name of COLLECTIONS) {
      await database.collection(name).deleteMany({})
      const rows = snapshot[name].map((row) => {
        const copy = { ...(row as object) } as Record<string, unknown>
        if (name === 'locations') {
          const latitude = copy.latitude
          const longitude = copy.longitude
          if (typeof latitude === 'number' && typeof longitude === 'number') {
            copy.geo = { type: 'Point', coordinates: [longitude, latitude] }
          }
        }
        return copy
      })
      if (rows.length) await database.collection(name).insertMany(rows)
    }
    await database.collection('webhooks').deleteMany({})
    if (snapshot.webhooks.length) {
      await database.collection('webhooks').insertMany(snapshot.webhooks.map((value) => ({ value })))
    }
    await database.collection<{ _id: string; schemaVersion: number; engine: string; updatedAt: string }>('meta').updateOne(
      { _id: 'impactmesh' },
      { $set: { schemaVersion: SCHEMA_VERSION, engine: 'mongodb', updatedAt: new Date().toISOString() } },
      { upsert: true },
    )
  }

  private touch() {
    if (this.timer) clearTimeout(this.timer)
    this.timer = setTimeout(() => {
      this.writing = this.writing
        .then(() => this.persistNow())
        .catch((error) => {
          console.error('MongoDB write failed', error)
        })
    }, 150)
  }

  reset() {
    this.db = createSeed()
    this.writing = this.persistNow().catch((error) => {
      console.error('MongoDB write failed', error)
    })
  }

  private org(orgId?: string) {
    if (orgId) {
      const found = this.db.organizations.find((item) => item.id === orgId)
      if (found) return found
    }
    const organization = this.db.organizations[0]
    if (!organization) throw new Error('Organization missing')
    return organization
  }

  private actor(actorId: string | null) {
    if (!actorId) return 'ImpactMesh'
    return this.db.users.find((user) => user.id === actorId)?.name ?? 'ImpactMesh'
  }

  private audit(
    actorId: string | null,
    action: string,
    entityType: string,
    entityId: string,
    payload: Record<string, unknown> = {},
    orgId?: string,
  ) {
    const actorUser = actorId ? this.userById(actorId) : null
    const effectiveOrgId = orgId || actorUser?.organizationId || this.org().id
    const event: AuditEvent = {
      id: `aud_${nanoid(8)}`,
      organizationId: effectiveOrgId,
      actorId,
      actorName: this.actor(actorId),
      action,
      entityType,
      entityId,
      payload,
      createdAt: new Date().toISOString(),
    }
    this.db.audit.unshift(event)
    this.touch()
    return event
  }

  userByEmail(email: string) {
    return this.db.users.find((user) => user.email.toLowerCase() === email.toLowerCase()) ?? null
  }

  userById(id: string) {
    return this.db.users.find((user) => user.id === id) ?? null
  }

  organization(orgId?: string) {
    return this.org(orgId)
  }

  registerUser(input: { email: string; name?: string; organizationName?: string; role?: Role }) {
    const email = input.email.toLowerCase().trim()
    const existing = this.userByEmail(email)
    if (existing) {
      return {
        user: existing,
        organization: this.org(existing.organizationId),
      }
    }

    const orgName = input.organizationName?.trim() || `${input.name?.trim() || email.split('@')[0]}'s Workspace`
    const org: Organization = {
      id: `org_${nanoid(8)}`,
      name: orgName,
      slug: slugify(orgName),
      logoUrl: null,
      description: 'Private field evidence workspace. Capture field media, extract perceptual hashes, and verify claims with AI vision.',
      focusArea: 'Field Verification & Evidence',
      createdAt: new Date().toISOString(),
    }
    this.db.organizations.push(org)

    const role: Role = input.role || 'owner'
    const user: UserProfile = {
      id: `user_${nanoid(8)}`,
      email,
      name: input.name?.trim() || email.split('@')[0],
      role,
      title: role === 'owner' ? 'Workspace Owner' : role === 'editor' ? 'Field Editor' : 'Observer',
      organizationId: org.id,
    }
    this.db.users.push(user)

    this.db.members.push({
      id: `mem_${nanoid(8)}`,
      organizationId: org.id,
      userId: user.id,
      role,
      createdAt: new Date().toISOString(),
    })

    this.audit(user.id, 'user.registered', 'user', user.id, { email, role }, org.id)
    this.touch()

    return { user, organization: org }
  }

  populateSamplePack(actorId: string, orgId: string) {
    const currentOrg = this.org(orgId)
    let project = this.db.projects.find((p) => p.organizationId === currentOrg.id)
    if (!project) {
      project = {
        id: `proj_${nanoid(8)}`,
        organizationId: currentOrg.id,
        name: 'Aravalli Ridge Restoration Pilot',
        slug: slugify('aravalli-ridge-restoration-pilot'),
        description: 'Native planting, stone bunding, and biodiversity tracking along the southern ridge corridor.',
        status: 'active',
        public: true,
        startDate: new Date().toISOString().slice(0, 10),
        endDate: null,
        primaryLocationId: null,
        orgMetrics: [{ label: 'Native Saplings', value: '450', note: 'Dhau and Kair planted' }],
        createdAt: new Date().toISOString(),
      }
      this.db.projects.unshift(project)
    }

    const loc: Location = {
      id: `loc_${nanoid(8)}`,
      name: 'Southern Ridge Sanctuary Zone',
      address: 'Mehrauli-Gurgaon Eco-Buffer',
      country: 'India',
      region: 'Delhi-NCR',
      city: 'Delhi',
      latitude: 28.5244,
      longitude: 77.1855,
      source: 'exif',
      confidence: 0.96,
    }
    this.db.locations.push(loc)
    project.primaryLocationId = loc.id

    const act: Activity = {
      id: `act_${nanoid(6)}`,
      projectId: project.id,
      name: 'Ridge Sapling Planting',
      category: 'planting',
      confidence: 0.94,
      evidenceCount: 2,
    }
    this.db.activities.push(act)

    const now = new Date().toISOString()
    const media1: MediaAsset = {
      id: `med_${nanoid(8)}`,
      organizationId: currentOrg.id,
      projectId: project.id,
      evidenceSetId: null,
      cloudinaryPublicId: `sample_${nanoid(6)}`,
      secureUrl: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1600&q=80',
      resourceType: 'image',
      format: 'jpg',
      width: 1600,
      height: 1067,
      duration: null,
      capturedAt: now,
      uploadedAt: now,
      checksum: 'chk_sample_1_ridge',
      perceptualHash: '1100110011001100110011001100110011001100110011001100110011001100',
      caption: 'Native saplings established on dry stone terrace along Southern Ridge.',
      altText: 'Native saplings in stone terracing',
      aiStatus: 'ready',
      reviewStatus: 'approved',
      public: true,
      locationId: loc.id,
      activityId: act.id,
      latitude: 28.5244,
      longitude: 77.1855,
      locationSource: 'exif',
      locationConfidence: 0.95,
      filename: 'ridge_saplings_baseline.jpg',
      sourceMetadata: { source: 'sample-pack' },
      decision: {
        source: 'jev',
        model: 'jev-1.13.0',
        projectChoice: project.id,
        requiresReview: false,
        confidence: 0.95,
        evidenceRole: 'activity_evidence',
        relation: 'SHOWS_ACTIVITY',
        activityCategory: 'planting',
        reasons: ['GPS coordinates match Southern Ridge corridor', 'Vision confirms sapling nursery planting'],
      },
      signals: [
        { tag: 'sapling_planting', normalizedTag: 'planting', confidence: 0.96, source: 'taxonomy-v1', modelVersion: 'jev-1.13.0' },
        { tag: 'stone_bunding', normalizedTag: 'bunding', confidence: 0.91, source: 'taxonomy-v1', modelVersion: 'jev-1.13.0' },
      ],
      similarTo: null,
      createdAt: now,
    }

    const media2: MediaAsset = {
      id: `med_${nanoid(8)}`,
      organizationId: currentOrg.id,
      projectId: project.id,
      evidenceSetId: null,
      cloudinaryPublicId: `sample_${nanoid(6)}`,
      secureUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1600&q=80',
      resourceType: 'image',
      format: 'jpg',
      width: 1600,
      height: 1067,
      duration: null,
      capturedAt: now,
      uploadedAt: now,
      checksum: 'chk_sample_2_canopy',
      perceptualHash: '1100110011001100110011001100110011001100110011001100110011001111',
      caption: 'Secondary woodland canopy recovering with diverse native understory.',
      altText: 'Understory regeneration',
      aiStatus: 'ready',
      reviewStatus: 'approved',
      public: true,
      locationId: loc.id,
      activityId: act.id,
      latitude: 28.525,
      longitude: 77.186,
      locationSource: 'exif',
      locationConfidence: 0.94,
      filename: 'ridge_understory_growth.jpg',
      sourceMetadata: { source: 'sample-pack' },
      decision: {
        source: 'jev',
        model: 'jev-1.13.0',
        projectChoice: project.id,
        requiresReview: false,
        confidence: 0.94,
        evidenceRole: 'activity_evidence',
        relation: 'SHOWS_ACTIVITY',
        activityCategory: 'planting',
        reasons: ['Corridor match verified', 'Vegetation density matches eco-zone'],
      },
      signals: [
        { tag: 'native_canopy', normalizedTag: 'canopy', confidence: 0.95, source: 'taxonomy-v1', modelVersion: 'jev-1.13.0' },
        { tag: 'ecological_restoration', normalizedTag: 'restoration', confidence: 0.92, source: 'taxonomy-v1', modelVersion: 'jev-1.13.0' },
      ],
      similarTo: null,
      createdAt: now,
    }

    this.db.media.unshift(media1, media2)

    this.db.comparisons.push({
      id: `cmp_${nanoid(6)}`,
      projectId: project.id,
      title: 'Terrace Preparation vs Canopy Growth',
      beforeId: media1.id,
      afterId: media2.id,
      note: 'Initial terraced sapling layout compared against dense understory development 6 months post-monsoon.',
      createdAt: now,
    })

    this.audit(
      actorId,
      'sample.populated',
      'organization',
      currentOrg.id,
      { projectId: project.id, assets: 2 },
      currentOrg.id,
    )
    this.touch()

    return { project, media: [media1, media2] }
  }

  services(status: ServiceStatus) {
    return status
  }

  updateOrganization(actorId: string, orgId: string, patch: { name?: string; description?: string; focusArea?: string }) {
    const organization = this.org(orgId)
    if (patch.name) organization.name = patch.name
    if (patch.description !== undefined) organization.description = patch.description
    if (patch.focusArea !== undefined) organization.focusArea = patch.focusArea
    this.audit(actorId, 'organization.updated', 'organization', organization.id, patch, organization.id)
    return organization
  }

  members(orgId?: string) {
    const members = orgId ? this.db.members.filter((m) => m.organizationId === orgId) : this.db.members
    return members.map((member) => {
      const user = this.userById(member.userId)
      return {
        id: member.id,
        role: member.role,
        name: user?.name ?? 'Unknown',
        email: user?.email ?? '',
        title: user?.title ?? '',
      }
    })
  }

  private coverFor(projectId: string) {
    const media = this.db.media.find(
      (item) => item.projectId === projectId && item.reviewStatus === 'approved' && item.secureUrl,
    )
    return media?.secureUrl ?? null
  }

  dashboard(orgId?: string) {
    const currentOrg = this.org(orgId)
    const projects = this.db.projects
      .filter((project) => !orgId || project.organizationId === currentOrg.id)
      .map((project) => ({
        ...project,
        mediaCount: this.db.media.filter((item) => item.projectId === project.id && item.reviewStatus !== 'rejected').length,
        locationName: this.db.locations.find((location) => location.id === project.primaryLocationId)?.name ?? null,
        coverUrl: this.coverFor(project.id),
      }))
    const media = this.db.media.filter((item) => !orgId || item.organizationId === currentOrg.id)
    const projectIds = new Set(projects.map((p) => p.id))
    const evidenceSets = this.db.evidenceSets.filter((set) => projectIds.has(set.projectId))
    return {
      organization: currentOrg,
      stats: {
        projects: projects.length,
        media: media.filter((item) => item.reviewStatus !== 'rejected').length,
        evidenceSets: evidenceSets.length,
        locations: new Set(media.map((item) => item.locationId).filter(Boolean)).size,
        pendingReviews: media.filter((item) => item.reviewStatus === 'pending').length,
      },
      activity: this.db.audit.filter((ev) => !orgId || ev.organizationId === currentOrg.id).slice(0, 8),
      projects,
    }
  }

  listProjects(orgId?: string) {
    return this.dashboard(orgId).projects
  }

  private projectBundle(project: Project) {
    const media = this.db.media.filter((item) => item.projectId === project.id)
    const locations = this.db.locations.filter(
      (location) =>
        location.id === project.primaryLocationId || media.some((item) => item.locationId === location.id),
    )
    const activities = this.db.activities
      .filter((activity) => activity.projectId === project.id)
      .map((activity) => ({
        ...activity,
        evidenceCount: media.filter((item) => item.activityId === activity.id && item.reviewStatus === 'approved').length,
      }))
    const partnerIds = new Set(
      this.db.projectPartners.filter((join) => join.projectId === project.id).map((join) => join.partnerId),
    )
    const comparisons = this.db.comparisons.filter((item) => item.projectId === project.id)
    const approved = media.filter((item) => item.reviewStatus === 'approved')
    return {
      project,
      locations,
      activities,
      partners: this.db.partners.filter((partner) => partnerIds.has(partner.id)),
      evidenceSets: this.db.evidenceSets.filter((set) => set.projectId === project.id),
      media,
      reports: this.db.reports.filter((report) => report.projectId === project.id),
      comparisons,
      documented: [
        { label: 'Approved assets', value: String(approved.length) },
        { label: 'Locations in the record', value: String(new Set(approved.map((item) => item.locationId).filter(Boolean)).size) },
        { label: 'Evidence clusters', value: String(this.db.evidenceSets.filter((set) => set.projectId === project.id).length) },
        { label: 'Before / after pairs', value: String(comparisons.length) },
      ],
      visualObservations: comparisons.map((item) => item.note),
    }
  }

  getProject(id: string) {
    const project = this.db.projects.find((item) => item.id === id)
    if (!project) return null
    return this.projectBundle(project)
  }

  createProject(
    actorId: string,
    orgId: string,
    input: { name: string; description?: string; status?: Project['status']; public?: boolean; city?: string; region?: string; startDate?: string },
  ) {
    let slug = slugify(input.name)
    if (this.db.projects.some((project) => project.slug === slug)) slug = `${slug}-${nanoid(4).toLowerCase()}`
    let primaryLocationId: string | null = null
    if (input.city) {
      const location: Location = {
        id: `loc_${nanoid(8)}`,
        name: input.city,
        address: '',
        country: 'India',
        region: input.region || input.city,
        city: input.city,
        latitude: 28.6,
        longitude: 77.2,
        source: 'session',
        confidence: 0.4,
      }
      this.db.locations.push(location)
      primaryLocationId = location.id
    }
    const project: Project = {
      id: `proj_${nanoid(8)}`,
      organizationId: orgId,
      name: input.name,
      slug,
      description: input.description?.trim() || 'New field project. Evidence will appear here as assets are approved.',
      status: input.status ?? 'active',
      public: input.public ?? false,
      startDate: input.startDate ?? new Date().toISOString().slice(0, 10),
      endDate: null,
      primaryLocationId,
      orgMetrics: [],
      createdAt: new Date().toISOString(),
    }
    this.db.projects.unshift(project)
    this.audit(actorId, 'project.created', 'project', project.id, { name: project.name }, orgId)
    return project
  }

  updateProject(actorId: string, id: string, patch: Partial<Pick<Project, 'name' | 'description' | 'status' | 'public' | 'startDate' | 'endDate'>>) {
    const project = this.db.projects.find((item) => item.id === id)
    if (!project) return null
    Object.assign(project, patch)
    if (patch.name) project.slug = slugify(patch.name)
    this.audit(actorId, 'project.updated', 'project', id, patch as Record<string, unknown>, project.organizationId)
    return project
  }

  deleteProject(actorId: string, id: string) {
    const project = this.db.projects.find((item) => item.id === id)
    if (!project) return false
    this.db.projects = this.db.projects.filter((item) => item.id !== id)
    this.db.media = this.db.media.filter((item) => item.projectId !== id)
    this.db.activities = this.db.activities.filter((item) => item.projectId !== id)
    this.db.evidenceSets = this.db.evidenceSets.filter((item) => item.projectId !== id)
    this.db.reports = this.db.reports.filter((item) => item.projectId !== id)
    this.db.comparisons = this.db.comparisons.filter((item) => item.projectId !== id)
    this.db.projectPartners = this.db.projectPartners.filter((item) => item.projectId !== id)
    this.audit(actorId, 'project.deleted', 'project', id, { name: project.name }, project.organizationId)
    return true
  }

  publishProject(actorId: string, id: string) {
    const project = this.db.projects.find((item) => item.id === id)
    if (!project) return null
    project.public = true
    for (const media of this.db.media) {
      if (media.projectId === id && media.reviewStatus === 'approved') media.public = true
    }
    this.audit(actorId, 'project.published', 'project', id, { public: true }, project.organizationId)
    return project
  }

  listMedia(filters: { orgId?: string; projectId?: string; reviewStatus?: string; q?: string }) {
    return this.db.media.filter((item) => {
      if (filters.orgId && item.organizationId !== filters.orgId) return false
      if (filters.projectId && item.projectId !== filters.projectId) return false
      if (filters.reviewStatus && item.reviewStatus !== filters.reviewStatus) return false
      if (filters.q) {
        const hay = `${item.filename} ${item.caption} ${item.signals.map((signal) => signal.tag).join(' ')}`.toLowerCase()
        if (!hay.includes(filters.q.toLowerCase())) return false
      }
      return true
    })
  }

  getMedia(id: string) {
    const media = this.db.media.find((item) => item.id === id)
    if (!media) return null
    const connections = this.graph({ orgId: media.organizationId, includeMedia: true }).links.filter(
      (link) => link.source === id || link.target === id,
    )
    return {
      media,
      project: this.db.projects.find((project) => project.id === media.projectId) ?? null,
      location: this.db.locations.find((location) => location.id === media.locationId) ?? null,
      activity: this.db.activities.find((activity) => activity.id === media.activityId) ?? null,
      evidenceSet: this.db.evidenceSets.find((set) => set.id === media.evidenceSetId) ?? null,
      lineage: buildLineage(media, this.db.audit, this.db.reports),
      connections,
      ledger: confidenceLedger(media),
    }
  }

  findByPublicId(publicId: string) {
    return this.db.media.find((item) => item.cloudinaryPublicId === publicId) ?? null
  }

  createMedia(actorId: string | null, orgId: string, input: Partial<MediaAsset> & { filename: string; secureUrl: string }) {
    const now = new Date().toISOString()
    const media: MediaAsset = {
      id: `med_${nanoid(8)}`,
      organizationId: orgId,
      projectId: input.projectId ?? null,
      evidenceSetId: input.evidenceSetId ?? null,
      cloudinaryPublicId: input.cloudinaryPublicId ?? null,
      secureUrl: input.secureUrl,
      resourceType: input.resourceType ?? 'image',
      format: input.format ?? 'jpg',
      width: input.width ?? 0,
      height: input.height ?? 0,
      duration: input.duration ?? null,
      capturedAt: input.capturedAt ?? null,
      uploadedAt: now,
      checksum: input.checksum ?? null,
      perceptualHash: input.perceptualHash ?? null,
      caption: input.caption ?? '',
      altText: input.altText ?? input.filename,
      aiStatus: 'uploaded',
      reviewStatus: 'pending',
      public: false,
      locationId: input.locationId ?? null,
      activityId: input.activityId ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      locationSource: input.locationSource ?? 'unknown',
      locationConfidence: input.locationConfidence ?? 0,
      filename: input.filename,
      sourceMetadata: input.sourceMetadata ?? {},
      decision: null,
      signals: [],
      similarTo: null,
      createdAt: now,
    }
    this.db.media.unshift(media)
    this.audit(actorId, 'media.uploaded', 'media', media.id, { filename: media.filename }, orgId)
    return media
  }

  updateMedia(actorId: string, id: string, patch: Partial<MediaAsset>) {
    const media = this.db.media.find((item) => item.id === id)
    if (!media) return null
    const allowed: (keyof MediaAsset)[] = [
      'caption',
      'altText',
      'projectId',
      'activityId',
      'locationId',
      'evidenceSetId',
      'public',
      'reviewStatus',
    ]
    for (const key of allowed) {
      if (patch[key] !== undefined) {
        // Assign through a narrow record so partial updates stay typed.
        Object.assign(media, { [key]: patch[key] })
      }
    }
    this.audit(actorId, 'media.updated', 'media', id, patch as Record<string, unknown>)
    return media
  }

  deleteMedia(actorId: string, id: string) {
    const media = this.db.media.find((item) => item.id === id)
    if (!media) return false
    this.db.media = this.db.media.filter((item) => item.id !== id)
    this.db.edges = this.db.edges.filter((edge) => edge.sourceId !== id && edge.targetId !== id)
    this.audit(actorId, 'media.deleted', 'media', id, { filename: media.filename })
    return true
  }

  applyAnalysis(
    mediaId: string,
    result: {
      caption?: string
      signals: MediaSignal[]
      decision: EvidenceDecision
      locationId: string | null
      latitude: number | null
      longitude: number | null
      locationSource: MediaAsset['locationSource']
      locationConfidence: number
      activityCategory: string | null
      similarTo: MediaAsset['similarTo']
      perceptualHash?: string | null
      checksum?: string | null
    },
  ) {
    const media = this.db.media.find((item) => item.id === mediaId)
    if (!media) return null
    if (result.caption && !media.caption) media.caption = result.caption
    if (result.caption && media.caption.startsWith('Uploaded')) media.caption = result.caption
    media.signals = result.signals
    media.decision = result.decision
    media.locationSource = result.locationSource
    media.locationConfidence = result.locationConfidence
    if (result.latitude !== null) media.latitude = result.latitude
    if (result.longitude !== null) media.longitude = result.longitude
    if (result.perceptualHash) media.perceptualHash = result.perceptualHash
    if (result.checksum) media.checksum = result.checksum
    media.similarTo = result.similarTo

    if (!media.projectId && result.decision.projectChoice.startsWith('proj_')) {
      media.projectId = result.decision.projectChoice
    }
    if (result.locationId) media.locationId = result.locationId
    if (result.activityCategory && media.projectId) {
      const activity = this.db.activities.find(
        (item) => item.projectId === media.projectId && item.category === result.activityCategory,
      )
      if (activity) media.activityId = activity.id
      else if (result.decision.requiresReview === false) {
        const created: Activity = {
          id: `act_${nanoid(6)}`,
          projectId: media.projectId,
          name: result.activityCategory.replaceAll('_', ' '),
          category: result.activityCategory,
          confidence: result.decision.confidence,
          evidenceCount: 0,
        }
        this.db.activities.push(created)
        media.activityId = created.id
      }
    }

    media.reviewStatus = result.decision.requiresReview ? 'pending' : 'approved'
    media.aiStatus = 'ready'
    if (result.similarTo && result.similarTo.score >= 0.92) {
      const exists = this.db.edges.some(
        (edge) => edge.relation === 'SIMILAR_TO' && edge.sourceId === media.id && edge.targetId === result.similarTo?.mediaId,
      )
      if (!exists && result.similarTo) {
        this.db.edges.push({
          id: `edge_${nanoid(6)}`,
          sourceType: 'media',
          sourceId: media.id,
          targetType: 'media',
          targetId: result.similarTo.mediaId,
          relation: 'SIMILAR_TO',
          confidence: result.similarTo.score,
          why: [`Perceptual hash similarity is ${Math.round(result.similarTo.score * 100)}% with ${result.similarTo.label}.`],
          createdBy: 'system',
          createdAt: new Date().toISOString(),
        })
      }
    }
    this.audit(null, 'media.analyzed', 'media', media.id, {
      model: result.decision.model,
      source: result.decision.source,
      requiresReview: result.decision.requiresReview,
    })
    return media
  }

  setAiStatus(id: string, status: MediaAsset['aiStatus']) {
    const media = this.db.media.find((item) => item.id === id)
    if (media) media.aiStatus = status
    this.touch()
    return media
  }

  approve(actorId: string, id: string) {
    const media = this.db.media.find((item) => item.id === id)
    if (!media) return null
    media.reviewStatus = 'approved'
    if (media.decision) media.decision.requiresReview = false
    this.audit(actorId, 'media.approved', 'media', id, { projectId: media.projectId })
    return media
  }

  reject(actorId: string, id: string) {
    const media = this.db.media.find((item) => item.id === id)
    if (!media) return null
    media.reviewStatus = 'rejected'
    this.audit(actorId, 'media.rejected', 'media', id, {})
    return media
  }

  reviews(orgId?: string) {
    return this.db.media
      .filter((item) => (!orgId || item.organizationId === orgId) && item.reviewStatus === 'pending')
      .map((item) => ({
        ...this.getMedia(item.id)!,
      }))
  }

  similarCandidates(hash: string | null, exceptId?: string) {
    if (!hash) return null
    let best: { media: MediaAsset; score: number } | null = null
    for (const media of this.db.media) {
      if (media.id === exceptId) continue
      const score = hashSimilarity(hash, media.perceptualHash)
      if (!best || score > best.score) best = { media, score }
    }
    if (!best || best.score < 0.92) return null
    return { mediaId: best.media.id, score: Number(best.score.toFixed(2)), label: best.media.filename }
  }

  private graphInput(orgId?: string, publicOnly = false): GraphBuildInput {
    const currentOrg = this.org(orgId)
    const projects = this.db.projects
      .filter((project) => (!orgId || project.organizationId === currentOrg.id) && (publicOnly ? project.public : true))
      .map((project) => ({
        id: project.id,
        name: project.name,
        primaryLocationId: project.primaryLocationId,
        status: project.status,
      }))
    const projectIds = new Set(projects.map((p) => p.id))
    const media = this.db.media
      .filter((item) => (!orgId || item.organizationId === currentOrg.id) && (!publicOnly || item.public))
      .map((item) => ({
        id: item.id,
        projectId: item.projectId,
        label: item.filename,
        imageUrl: thumbnailUrl(item.secureUrl, 192),
        reviewStatus: item.reviewStatus,
        aiStatus: item.aiStatus,
        locationId: item.locationId,
        activityId: item.activityId,
        evidenceSetId: item.evidenceSetId,
        capturedAt: item.capturedAt,
        confidence: item.decision?.confidence ?? item.locationConfidence,
        caption: item.caption,
        isPublic: item.public,
      }))
    const mediaIds = new Set(media.map((m) => m.id))
    const locationIds = new Set([
      ...projects.map((p) => p.primaryLocationId).filter(Boolean),
      ...media.map((m) => m.locationId).filter(Boolean),
    ])
    const locations = this.db.locations
      .filter((l) => !orgId || locationIds.has(l.id))
      .map((location) => ({
        id: location.id,
        name: location.name,
        city: location.city,
        latitude: location.latitude,
        longitude: location.longitude,
      }))
    const activities = this.db.activities
      .filter((a) => projectIds.has(a.projectId))
      .map((activity) => ({
        id: activity.id,
        projectId: activity.projectId,
        name: activity.name,
        category: activity.category,
      }))
    const partners = this.db.partners.map((partner) => ({ id: partner.id, name: partner.name }))
    const projectPartners = this.db.projectPartners.filter((join) => projectIds.has(join.projectId))
    const evidenceSets = this.db.evidenceSets
      .filter((set) => projectIds.has(set.projectId))
      .map((set) => ({ id: set.id, projectId: set.projectId, name: set.name }))
    const reports = this.db.reports
      .filter((report) => projectIds.has(report.projectId))
      .map((report) => ({
        id: report.id,
        projectId: report.projectId,
        title: report.title,
        evidenceIds: report.evidenceIds,
      }))
    const edges = this.db.edges
      .filter((edge) => projectIds.has(edge.sourceId) || projectIds.has(edge.targetId) || mediaIds.has(edge.sourceId) || mediaIds.has(edge.targetId))
      .map((edge) => ({
        id: edge.id,
        sourceId: edge.sourceId,
        targetId: edge.targetId,
        relation: edge.relation,
        confidence: edge.confidence,
        why: edge.why,
      }))

    return {
      organization: { id: currentOrg.id, name: currentOrg.name },
      projects,
      locations,
      activities,
      partners,
      projectPartners,
      evidenceSets,
      media,
      reports,
      edges,
    }
  }

  graph(options: {
    orgId?: string
    projectId?: string
    includeMedia?: boolean
    minConfidence?: number
    mode?: 'explore' | 'evidence'
    from?: string
    to?: string
    reportId?: string
    publicOnly?: boolean
  }): GraphPayload {
    const report = options.reportId ? this.db.reports.find((item) => item.id === options.reportId) : undefined
    return buildEvidenceGraph(this.graphInput(options.orgId, options.publicOnly), {
      projectId: options.projectId ?? report?.projectId,
      includeMedia: options.includeMedia,
      minConfidence: options.minConfidence,
      mode: options.mode,
      evidenceMediaIds: report?.evidenceIds,
      from: options.from,
      to: options.to,
      publicOnly: options.publicOnly,
    })
  }

  graphNode(id: string) {
    const full = this.graph({ includeMedia: true, minConfidence: 0 })
    return neighborsOf(full, id)
  }

  search(raw: string, orgId?: string) {
    const parsed = parseEvidenceQuery(
      raw,
      this.db.locations.map((location) => ({ name: location.name, city: location.city })),
    )
    const currentMedia = orgId ? this.db.media.filter((item) => item.organizationId === orgId) : this.db.media
    const documents = currentMedia.map((item) => ({
      id: item.id,
      text: `${item.filename} ${item.caption} ${item.signals.map((signal) => signal.tag).join(' ')} ${item.altText}`,
      activityCategory:
        this.db.activities.find((activity) => activity.id === item.activityId)?.category ??
        item.decision?.activityCategory ??
        null,
      locationName: this.db.locations.find((location) => location.id === item.locationId)?.name ?? null,
      capturedAt: item.capturedAt,
      evidenceRole: item.decision?.evidenceRole ?? null,
      reviewStatus: item.reviewStatus,
    }))
    const ranked = rankEvidence(documents, parsed)
    const results = ranked.map((hit) => {
      const media = this.db.media.find((item) => item.id === hit.id)!
      return {
        media,
        projectName: this.db.projects.find((project) => project.id === media.projectId)?.name ?? null,
        locationName: this.db.locations.find((location) => location.id === media.locationId)?.name ?? null,
        activityName: this.db.activities.find((activity) => activity.id === media.activityId)?.name ?? null,
        score: hit.score,
        reasons: hit.reasons,
      }
    })
    return { query: parsed, results }
  }

  listComparisons(orgId?: string) {
    if (!orgId) return this.db.comparisons
    const projectIds = new Set(this.db.projects.filter((p) => p.organizationId === orgId).map((p) => p.id))
    return this.db.comparisons.filter((c) => projectIds.has(c.projectId))
  }

  getComparison(id: string) {
    const comparison = this.db.comparisons.find((item) => item.id === id)
    if (!comparison) return null
    return {
      comparison,
      before: this.db.media.find((item) => item.id === comparison.beforeId) ?? null,
      after: this.db.media.find((item) => item.id === comparison.afterId) ?? null,
    }
  }

  createComparison(actorId: string, input: { projectId: string; title: string; beforeId: string; afterId: string; note?: string }) {
    const comparison: Comparison = {
      id: `cmp_${nanoid(6)}`,
      projectId: input.projectId,
      title: input.title,
      beforeId: input.beforeId,
      afterId: input.afterId,
      note:
        input.note?.trim() ||
        'These two frames are filed as a visual pair. The difference is descriptive, not a measured environmental outcome.',
      createdAt: new Date().toISOString(),
    }
    this.db.comparisons.unshift(comparison)
    this.db.edges.push({
      id: `edge_${nanoid(6)}`,
      sourceType: 'media',
      sourceId: input.beforeId,
      targetType: 'media',
      targetId: input.afterId,
      relation: 'BEFORE_OF',
      confidence: 0.8,
      why: ['A reviewer created this before/after pair.'],
      createdBy: actorId,
      createdAt: comparison.createdAt,
    })
    this.audit(actorId, 'comparison.created', 'comparison', comparison.id, { title: comparison.title })
    return comparison
  }

  listReports(orgId?: string) {
    const projects = orgId ? this.db.projects.filter((p) => p.organizationId === orgId) : this.db.projects
    const projectIds = new Set(projects.map((p) => p.id))
    return this.db.reports
      .filter((report) => !orgId || projectIds.has(report.projectId))
      .map((report) => ({
        ...report,
        projectName: this.db.projects.find((project) => project.id === report.projectId)?.name ?? '',
      }))
  }

  getReport(id: string) {
    const report = this.db.reports.find((item) => item.id === id)
    if (!report) return null
    const project = this.db.projects.find((item) => item.id === report.projectId) ?? null
    const evidence = this.db.media.filter((item) => report.evidenceIds.includes(item.id))
    return { report, project, evidence }
  }

  reportHtml(id: string) {
    const detail = this.getReport(id)
    if (!detail?.project) return null
    return renderReportHtml({
      orgName: this.org().name,
      projectName: detail.project.name,
      title: detail.report.title,
      generatedAt: new Date(detail.report.generatedAt).toUTCString(),
      narrative: detail.report.narrative,
      evidence: detail.evidence.map((item) => ({ id: item.id, label: item.filename, caption: item.caption })),
    })
  }

  createReport(actorId: string, projectId: string) {
    const bundle = this.getProject(projectId)
    if (!bundle) return null
    const version = this.db.reports.filter((report) => report.projectId === projectId).length + 1
    const approved = bundle.media.filter((item) => item.reviewStatus === 'approved')
    const narrative = assembleNarrative({
      projectName: bundle.project.name,
      orgName: this.org().name,
      media: bundle.media,
      activities: bundle.activities,
      locations: bundle.locations,
      orgMetrics: bundle.project.orgMetrics,
      comparisonNotes: bundle.comparisons.map((item) => item.note),
    })
    const report: Report = {
      id: `rep_${nanoid(6)}`,
      projectId,
      title: `${bundle.project.name} evidence brief`,
      status: 'ready',
      version,
      generatedAt: new Date().toISOString(),
      pdfUrl: null,
      narrative,
      evidenceIds: approved.map((item) => item.id),
    }
    this.db.reports.unshift(report)
    this.audit(actorId, 'report.generated', 'report', report.id, { version })
    return report
  }

  nearby(latitude: number, longitude: number, km: number) {
    const places = withinRadius(
      { latitude, longitude },
      this.db.locations.map((location) => ({
        id: location.id,
        name: location.name,
        latitude: location.latitude,
        longitude: location.longitude,
      })),
      km,
    )
    return places.map((place) => {
      const location = this.db.locations.find((item) => item.id === place.id)!
      const projects = this.db.projects.filter((project) => project.primaryLocationId === place.id)
      const media = this.db.media.filter((item) => item.locationId === place.id && item.reviewStatus === 'approved')
      return { location, distanceKm: Number(place.distanceKm.toFixed(2)), projects, mediaCount: media.length }
    })
  }

  auditLog() {
    return this.db.audit.slice(0, 40)
  }

  jobs() {
    return this.db.jobs.slice(0, 20)
  }

  startJob(idempotencyKey: string, type: string) {
    const existing = this.db.jobs.find((job) => job.idempotencyKey === idempotencyKey && job.status === 'running')
    if (existing) return existing
    const job = {
      id: `job_${nanoid(6)}`,
      type,
      status: 'running' as const,
      attempts: 1,
      idempotencyKey,
      error: null,
      startedAt: new Date().toISOString(),
      finishedAt: null,
      createdAt: new Date().toISOString(),
    }
    this.db.jobs.unshift(job)
    this.touch()
    return job
  }

  finishJob(id: string) {
    const job = this.db.jobs.find((item) => item.id === id)
    if (!job) return
    job.status = 'succeeded'
    job.finishedAt = new Date().toISOString()
    this.touch()
  }

  failJob(id: string, error: string) {
    const job = this.db.jobs.find((item) => item.id === id)
    if (!job) return
    job.status = 'failed'
    job.error = error
    job.attempts += 1
    job.finishedAt = new Date().toISOString()
    this.touch()
  }

  seenWebhook(key: string) {
    return this.db.webhooks.includes(key)
  }

  markWebhook(key: string) {
    this.db.webhooks.push(key)
    this.touch()
  }

  publicProjects() {
    return this.db.projects
      .filter((project) => project.public)
      .map((project) => {
        const media = this.db.media.filter((item) => item.projectId === project.id && item.public && item.reviewStatus === 'approved')
        const locations = new Set(media.map((item) => item.locationId).filter(Boolean))
        const city = this.db.locations.find((location) => location.id === project.primaryLocationId)?.city ?? null
        return {
          id: project.id,
          name: project.name,
          slug: project.slug,
          description: project.description,
          city,
          coverUrl: media[0]?.secureUrl ?? null,
          mediaCount: media.length,
          locationCount: locations.size,
          period: project.startDate,
        }
      })
  }

  publicProject(slug: string) {
    const project = this.db.projects.find((item) => item.slug === slug && item.public)
    if (!project) return null
    const bundle = this.projectBundle(project)
    return {
      project,
      locations: bundle.locations,
      activities: bundle.activities,
      media: bundle.media.filter((item) => item.public && item.reviewStatus === 'approved'),
      comparisons: bundle.comparisons,
      report: bundle.reports[0] ?? null,
      documented: bundle.documented,
      visualObservations: bundle.visualObservations,
    }
  }

  knownLocations() {
    return this.db.locations
  }

  listLocations() {
    return this.db.locations.map((location) => {
      const media = this.db.media.filter((item) => item.locationId === location.id && item.reviewStatus !== 'rejected')
      const projectIds = new Set<string>()
      for (const project of this.db.projects) {
        if (project.primaryLocationId === location.id) projectIds.add(project.id)
      }
      for (const item of media) if (item.projectId) projectIds.add(item.projectId)
      return {
        ...location,
        mediaCount: media.length,
        projects: this.db.projects.filter((project) => projectIds.has(project.id)).map((project) => ({
          id: project.id,
          name: project.name,
          slug: project.slug,
        })),
      }
    })
  }

  projectsForDecisions() {
    return this.db.projects.map((project) => ({
      id: project.id,
      name: project.name,
      description: project.description,
      categories: this.db.activities.filter((activity) => activity.projectId === project.id).map((activity) => activity.category),
    }))
  }

  roleOf(userId: string): Role | null {
    return this.db.members.find((member) => member.userId === userId)?.role ?? null
  }
}

export let repo!: EvidenceRepository

export async function initRepository(): Promise<MongoLabel> {
  const { db, label } = await connectDatabase()
  const instance = new EvidenceRepository()
  await instance.hydrate(db)
  repo = instance
  return label
}
