import { z } from 'zod'

export const ROLES = ['owner', 'admin', 'editor', 'viewer'] as const
export type Role = (typeof ROLES)[number]

export const PROJECT_STATUSES = ['draft', 'active', 'completed'] as const
export type ProjectStatus = (typeof PROJECT_STATUSES)[number]

export const AI_STATUSES = ['uploaded', 'analyzing', 'connecting', 'ready', 'failed'] as const
export type AiStatus = (typeof AI_STATUSES)[number]

export const REVIEW_STATUSES = ['pending', 'approved', 'rejected'] as const
export type ReviewStatus = (typeof REVIEW_STATUSES)[number]

export const LOCATION_SOURCES = ['exif', 'project', 'session', 'geocode', 'inference', 'unknown'] as const
export type LocationSource = (typeof LOCATION_SOURCES)[number]

export const RELATIONS = [
  'BELONGS_TO',
  'CAPTURED_AT',
  'SHOWS_ACTIVITY',
  'SIMILAR_TO',
  'BEFORE_OF',
  'AFTER_OF',
  'SUPPORTS',
  'MENTIONS',
  'OVERLAPS_LOCATION',
  'DERIVED_FROM',
  'PARTNERED_WITH',
  'FILED_IN',
  'PUBLISHED_AS',
] as const
export type RelationType = (typeof RELATIONS)[number]

export const EVIDENCE_ROLES = [
  'cover',
  'before',
  'after',
  'activity_evidence',
  'location_evidence',
  'partner_evidence',
  'supporting',
  'exclude',
  'review',
] as const
export type EvidenceRole = (typeof EVIDENCE_ROLES)[number]

export const GRAPH_NODE_TYPES = [
  'organization',
  'project',
  'location',
  'activity',
  'media',
  'report',
  'partner',
  'evidence_set',
  'tag',
] as const
export type GraphNodeType = (typeof GRAPH_NODE_TYPES)[number]

export const DECISION_SOURCES = ['jev', 'policy'] as const
export type DecisionSource = (typeof DECISION_SOURCES)[number]

export interface UserProfile {
  id: string
  email: string
  name: string
  role: Role
  title: string
  organizationId: string
}

export interface Organization {
  id: string
  name: string
  slug: string
  logoUrl: string | null
  description: string
  focusArea: string
  createdAt: string
}

export interface OrgMetric {
  label: string
  value: string
  note: string
}

export interface Project {
  id: string
  organizationId: string
  name: string
  slug: string
  description: string
  status: ProjectStatus
  public: boolean
  startDate: string | null
  endDate: string | null
  primaryLocationId: string | null
  orgMetrics: OrgMetric[]
  createdAt: string
}

export interface Location {
  id: string
  name: string
  address: string
  country: string
  region: string
  city: string
  latitude: number
  longitude: number
  source: LocationSource
  confidence: number
}

export interface Activity {
  id: string
  projectId: string
  name: string
  category: string
  confidence: number
  evidenceCount: number
}

export interface Partner {
  id: string
  name: string
  website: string | null
  metadata: Record<string, string>
}

export interface EvidenceSet {
  id: string
  projectId: string
  name: string
  kind: 'before' | 'after' | 'session' | 'cluster'
  capturedFrom: string | null
  capturedTo: string | null
}

export interface MediaSignal {
  tag: string
  normalizedTag: string
  confidence: number
  source: string
  modelVersion: string
}

export interface EvidenceDecision {
  source: DecisionSource
  model: string
  projectChoice: string
  confidence: number
  requiresReview: boolean
  evidenceRole: EvidenceRole
  relation: RelationType
  activityCategory: string | null
  reasons: string[]
}

export interface SimilarMatch {
  mediaId: string
  score: number
  label: string
}

export interface MediaAsset {
  id: string
  organizationId: string
  projectId: string | null
  evidenceSetId: string | null
  cloudinaryPublicId: string | null
  secureUrl: string
  resourceType: 'image' | 'video'
  format: string
  width: number
  height: number
  duration: number | null
  capturedAt: string | null
  uploadedAt: string
  checksum: string | null
  perceptualHash: string | null
  caption: string
  altText: string
  aiStatus: AiStatus
  reviewStatus: ReviewStatus
  public: boolean
  locationId: string | null
  activityId: string | null
  latitude: number | null
  longitude: number | null
  locationSource: LocationSource
  locationConfidence: number
  filename: string
  sourceMetadata: Record<string, unknown>
  decision: EvidenceDecision | null
  signals: MediaSignal[]
  similarTo: SimilarMatch | null
  createdAt: string
}

export interface EvidenceEdge {
  id: string
  sourceType: string
  sourceId: string
  targetType: string
  targetId: string
  relation: RelationType
  confidence: number
  why: string[]
  createdBy: string
  createdAt: string
}

export interface ReportObservation {
  text: string
  evidenceIds: string[]
  kind: 'visual' | 'documented' | 'reported'
}

export interface ReportNarrative {
  summary: string
  observations: ReportObservation[]
  limitations: string
  orgReportedMetrics: OrgMetric[]
  documented: { label: string; value: string }[]
  visualObservations: string[]
}

export interface Report {
  id: string
  projectId: string
  title: string
  status: 'draft' | 'ready'
  version: number
  generatedAt: string
  pdfUrl: string | null
  narrative: ReportNarrative
  evidenceIds: string[]
}

export interface Comparison {
  id: string
  projectId: string
  title: string
  beforeId: string
  afterId: string
  note: string
  createdAt: string
}

export interface AuditEvent {
  id: string
  organizationId: string
  actorId: string | null
  actorName: string
  action: string
  entityType: string
  entityId: string
  payload: Record<string, unknown>
  createdAt: string
}

export interface JobRecord {
  id: string
  type: string
  status: 'queued' | 'running' | 'succeeded' | 'failed'
  attempts: number
  idempotencyKey: string
  error: string | null
  startedAt: string | null
  finishedAt: string | null
  createdAt: string
}

export interface LineageStep {
  id: string
  label: string
  detail: string
  state: 'done' | 'current' | 'waiting'
  at: string | null
}

export interface GraphNode {
  id: string
  type: GraphNodeType
  label: string
  size: number
  confidence?: number
  imageUrl?: string
  groupId?: string
  metadata?: {
    caption?: string
    reviewStatus?: string
    pending?: boolean
    projectId?: string
    location?: string
    latitude?: number
    longitude?: number
    capturedAt?: string
    city?: string
  }
}

export interface GraphLink {
  id: string
  source: string
  target: string
  relation: RelationType
  confidence: number
  why: string[]
  evidenceIds?: string[]
}

export interface GraphPayload {
  nodes: GraphNode[]
  links: GraphLink[]
  stats: { nodes: number; links: number; media: number }
}

export interface ServiceStatus {
  mode: 'demo' | 'connected'
  cloudinary: boolean
  jev: boolean
  redis: boolean
  mongodb: boolean
}

export interface DashboardPayload {
  stats: {
    projects: number
    media: number
    evidenceSets: number
    locations: number
    pendingReviews: number
  }
  activity: AuditEvent[]
  projects: Array<
    Project & {
      mediaCount: number
      locationName: string | null
      coverUrl: string | null
    }
  >
  services: ServiceStatus
}

export interface ProjectDetail {
  project: Project
  locations: Location[]
  activities: Activity[]
  partners: Partner[]
  evidenceSets: EvidenceSet[]
  media: MediaAsset[]
  reports: Report[]
  comparisons: Comparison[]
  documented: { label: string; value: string }[]
  visualObservations: string[]
}

export interface MediaDetail {
  media: MediaAsset
  project: Project | null
  location: Location | null
  activity: Activity | null
  evidenceSet: EvidenceSet | null
  lineage: LineageStep[]
  connections: GraphLink[]
  ledger: { label: string; value: string; source: string }[]
}

export interface ParsedSearch {
  text: string
  activity: string | null
  location: string | null
  evidenceType: 'before' | 'after' | 'before_after' | null
  from: string | null
  to: string | null
}

export interface SearchHit {
  media: MediaAsset
  projectName: string | null
  locationName: string | null
  activityName: string | null
  score: number
  reasons: string[]
}

export interface SearchResponse {
  query: ParsedSearch
  results: SearchHit[]
  routing: { source: DecisionSource; model: string; note: string }
}

export interface PublicProjectCard {
  id: string
  name: string
  slug: string
  description: string
  city: string | null
  coverUrl: string | null
  mediaCount: number
  locationCount: number
  period: string | null
}

export interface PublicProjectPage {
  project: Project
  locations: Location[]
  activities: Activity[]
  media: MediaAsset[]
  comparisons: Comparison[]
  report: Report | null
  documented: { label: string; value: string }[]
  visualObservations: string[]
}

export const loginSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(80).optional(),
  organizationName: z.string().max(120).optional(),
  role: z.enum(ROLES).optional(),
})

export const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(80).optional(),
  organizationName: z.string().max(120).optional(),
  role: z.enum(ROLES).optional(),
})

export const updateOrgSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  description: z.string().max(2000).optional(),
  focusArea: z.string().max(160).optional(),
})

export const createProjectSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(2000).optional(),
  status: z.enum(PROJECT_STATUSES).optional(),
  public: z.boolean().optional(),
  city: z.string().max(80).optional(),
  region: z.string().max(80).optional(),
  startDate: z.string().optional(),
})

export const updateProjectSchema = createProjectSchema.partial().extend({
  status: z.enum(PROJECT_STATUSES).optional(),
  endDate: z.string().nullable().optional(),
})

export const updateMediaSchema = z.object({
  caption: z.string().max(2000).optional(),
  altText: z.string().max(400).optional(),
  projectId: z.string().nullable().optional(),
  activityId: z.string().nullable().optional(),
  locationId: z.string().nullable().optional(),
  evidenceSetId: z.string().nullable().optional(),
  public: z.boolean().optional(),
  reviewStatus: z.enum(REVIEW_STATUSES).optional(),
})

export const createComparisonSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().min(2).max(160),
  beforeId: z.string().min(1),
  afterId: z.string().min(1),
  note: z.string().max(1000).optional(),
})

export const graphQuerySchema = z.object({
  projectId: z.string().optional(),
  includeMedia: z.coerce.boolean().optional(),
  minConfidence: z.coerce.number().min(0).max(1).optional(),
  mode: z.enum(['explore', 'evidence']).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  reportId: z.string().optional(),
})
