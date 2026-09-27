import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Router } from 'express'
import multer from 'multer'
import exifr from 'exifr'
import { nanoid } from 'nanoid'
import { assetFolder } from '@impactmesh/cloudinary-client'
import {
  createComparisonSchema,
  createProjectSchema,
  loginSchema,
  registerSchema as registerUserSchema,
  updateMediaSchema,
  updateOrgSchema,
  updateProjectSchema,
} from '@impactmesh/shared-types'
import { z } from 'zod'
import { env, integrationMode, services } from '../config/env'
import { repo } from '../data/repository'
import { asyncRoute, HttpError, readBody, requireAuth, requireRole, signUser } from '../http'
import { averageHash, checksumOf } from '../services/hash'
import { signUpload, verifyNotificationSignature } from '../services/cloudinary'
import { analyzeMedia } from '../services/pipeline'
import { enqueueAnalysis } from '../services/queue'

const here = path.dirname(fileURLToPath(import.meta.url))
const uploadDir = path.resolve(here, '../../data/uploads')

const uploader = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^(image\/(jpeg|png|webp|heic|heif)|video\/(mp4|webm))$/.test(file.mimetype)) cb(null, true)
    else cb(new Error('Use a JPEG, PNG, WebP, HEIC, MP4, or WebM file.'))
  },
})

const extensions: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/heic': '.heic',
  'image/heif': '.heif',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
}

function status() {
  return {
    mode: integrationMode,
    cloudinary: services.cloudinary,
    jev: services.jev,
    redis: services.redis,
    mongodb: services.mongodb,
  }
}

function sessionFor(email: string) {
  const user = repo.userByEmail(email)
  if (!user) return null
  return {
    token: signUser(user),
    user,
    organization: repo.organization(user.organizationId),
    services: status(),
  }
}

const registerMediaSchema = z.object({
  publicId: z.string().min(1),
  secureUrl: z.string().url(),
  projectId: z.string().nullable().optional(),
  filename: z.string().min(1),
  width: z.number().optional(),
  height: z.number().optional(),
  format: z.string().optional(),
  resourceType: z.enum(['image', 'video']).optional(),
  capturedAt: z.string().nullable().optional(),
})

export const api = Router()

api.get('/health', (_req, res) => {
  res.json({ ok: true, services: status() })
})

api.get('/uploads/files/:name', (req, res) => {
  const name = path.basename(req.params.name)
  const file = path.resolve(uploadDir, name)
  if (!file.startsWith(uploadDir) || !fs.existsSync(file)) {
    res.status(404).json({ error: 'File not found' })
    return
  }
  res.sendFile(file)
})

api.post(
  '/auth/login',
  asyncRoute(async (req, res) => {
    const body = readBody(loginSchema, req.body)
    const existing = repo.userByEmail(body.email)
    if (existing) {
      res.json(sessionFor(existing.email))
      return
    }
    // Auto-provision fresh workspace for new sign-in
    const { user, organization } = repo.registerUser(body)
    res.json({
      token: signUser(user),
      user,
      organization,
      services: status(),
    })
  }),
)

api.post(
  '/auth/register',
  asyncRoute(async (req, res) => {
    const body = readBody(registerUserSchema, req.body)
    const { user, organization } = repo.registerUser(body)
    res.status(201).json({
      token: signUser(user),
      user,
      organization,
      services: status(),
    })
  }),
)

api.get('/public/projects', (_req, res) => {
  res.json(repo.publicProjects())
})

api.get('/public/projects/:slug', (req, res) => {
  const project = repo.publicProject(req.params.slug)
  if (!project) throw new HttpError(404, 'That public project is not available.')
  res.json(project)
})

api.get('/public/projects/:slug/graph', (req, res) => {
  const project = repo.publicProject(req.params.slug)
  if (!project) throw new HttpError(404, 'That public project is not available.')
  res.json(repo.graph({ projectId: project.project.id, includeMedia: true, publicOnly: true, mode: 'explore' }))
})

api.post(
  '/webhooks/cloudinary',
  asyncRoute(async (req, res) => {
    const timestamp = req.header('x-cld-timestamp') || String((req.body as { timestamp?: string })?.timestamp || '')
    const signature = req.header('x-cld-signature') || String((req.body as { signature?: string })?.signature || '')
    if (!verifyNotificationSignature(req.rawBody || JSON.stringify(req.body ?? {}), timestamp, signature)) {
      throw new HttpError(401, 'Cloudinary signature could not be verified.')
    }
    const body = req.body as {
      public_id?: string
      version?: number
      secure_url?: string
      width?: number
      height?: number
      format?: string
      resource_type?: 'image' | 'video'
      original_filename?: string
      context?: { custom?: Record<string, string> }
    }
    const key = `${body.public_id}:${body.version}`
    if (body.public_id && repo.seenWebhook(key)) {
      res.json({ ok: true, duplicate: true })
      return
    }
    if (body.public_id) repo.markWebhook(key)
    const projectId = body.context?.custom?.projectId || null
    let media = body.public_id ? repo.findByPublicId(body.public_id) : null
    if (!media && body.secure_url && body.public_id) {
      const orgId = body.context?.custom?.organizationId || repo.organization().id
      media = repo.createMedia(null, orgId, {
        filename: body.original_filename || body.public_id,
        secureUrl: body.secure_url,
        cloudinaryPublicId: body.public_id,
        projectId,
        width: body.width,
        height: body.height,
        format: body.format,
        resourceType: body.resource_type === 'video' ? 'video' : 'image',
      })
    }
    if (media) await enqueueAnalysis(media.id)
    res.json({ ok: true })
  }),
)

api.post(
  '/internal/jobs/analyze',
  asyncRoute(async (req, res) => {
    if (req.header('x-worker-secret') !== env.workerSecret) throw new HttpError(401, 'Worker secret required.')
    const mediaId = String((req.body as { mediaId?: string })?.mediaId || '')
    if (!mediaId) throw new HttpError(400, 'mediaId is required.')
    await analyzeMedia(mediaId)
    res.json({ ok: true })
  }),
)

api.use(requireAuth)

api.post(
  '/demo/populate-sample',
  requireRole('editor'),
  asyncRoute(async (req, res) => {
    const result = repo.populateSamplePack(req.user!.id, req.user!.organizationId)
    res.json(result)
  }),
)

api.get('/auth/me', (req, res) => {
  const user = repo.userById(req.user!.id)
  if (!user) throw new HttpError(401, 'Sign in required')
  res.json({ user, organization: repo.organization(user.organizationId), services: status() })
})

api.get('/dashboard', (req, res) => {
  res.json({ ...repo.dashboard(req.user!.organizationId), services: status() })
})

api.get('/members', (req, res) => {
  res.json(repo.members(req.user!.organizationId))
})

api.patch(
  '/org',
  requireRole('admin'),
  asyncRoute(async (req, res) => {
    const body = readBody(updateOrgSchema, req.body)
    res.json(repo.updateOrganization(req.user!.id, req.user!.organizationId, body))
  }),
)

api.get('/projects', (req, res) => res.json(repo.listProjects(req.user!.organizationId)))

api.post(
  '/projects',
  requireRole('editor'),
  asyncRoute(async (req, res) => {
    const body = readBody(createProjectSchema, req.body)
    res.status(201).json(repo.createProject(req.user!.id, req.user!.organizationId, body))
  }),
)

api.get('/projects/:projectId', (req, res) => {
  const project = repo.getProject(req.params.projectId)
  if (!project) throw new HttpError(404, 'Project not found.')
  res.json(project)
})

api.patch(
  '/projects/:projectId',
  requireRole('editor'),
  asyncRoute(async (req, res) => {
    const body = readBody(updateProjectSchema, req.body)
    const project = repo.updateProject(req.user!.id, req.params.projectId, body)
    if (!project) throw new HttpError(404, 'Project not found.')
    res.json(project)
  }),
)

api.delete(
  '/projects/:projectId',
  requireRole('admin'),
  asyncRoute(async (req, res) => {
    const removed = repo.deleteProject(req.user!.id, req.params.projectId)
    if (!removed) throw new HttpError(404, 'Project not found.')
    res.status(204).end()
  }),
)

api.post(
  '/projects/:projectId/publish',
  requireRole('editor'),
  asyncRoute(async (req, res) => {
    const project = repo.publishProject(req.user!.id, req.params.projectId)
    if (!project) throw new HttpError(404, 'Project not found.')
    res.json(project)
  }),
)

api.post(
  '/projects/:projectId/reports',
  requireRole('editor'),
  asyncRoute(async (req, res) => {
    const report = repo.createReport(req.user!.id, req.params.projectId)
    if (!report) throw new HttpError(404, 'Project not found.')
    res.status(201).json(report)
  }),
)

api.get('/media', (req, res) => {
  res.json(
    repo.listMedia({
      orgId: req.user!.organizationId,
      projectId: typeof req.query.projectId === 'string' ? req.query.projectId : undefined,
      reviewStatus: typeof req.query.reviewStatus === 'string' ? req.query.reviewStatus : undefined,
      q: typeof req.query.q === 'string' ? req.query.q : undefined,
    }),
  )
})

api.get('/media/:id', (req, res) => {
  const media = repo.getMedia(req.params.id)
  if (!media) throw new HttpError(404, 'Asset not found.')
  res.json(media)
})

api.patch(
  '/media/:id',
  requireRole('editor'),
  asyncRoute(async (req, res) => {
    const body = readBody(updateMediaSchema, req.body)
    const media = repo.updateMedia(req.user!.id, req.params.id, body)
    if (!media) throw new HttpError(404, 'Asset not found.')
    res.json(media)
  }),
)

api.delete(
  '/media/:id',
  requireRole('editor'),
  asyncRoute(async (req, res) => {
    const removed = repo.deleteMedia(req.user!.id, req.params.id)
    if (!removed) throw new HttpError(404, 'Asset not found.')
    res.status(204).end()
  }),
)

api.post(
  '/media/:id/approve',
  requireRole('editor'),
  asyncRoute(async (req, res) => {
    const media = repo.approve(req.user!.id, req.params.id)
    if (!media) throw new HttpError(404, 'Asset not found.')
    res.json(media)
  }),
)

api.post(
  '/media/:id/reject',
  requireRole('editor'),
  asyncRoute(async (req, res) => {
    const media = repo.reject(req.user!.id, req.params.id)
    if (!media) throw new HttpError(404, 'Asset not found.')
    res.json(media)
  }),
)

api.post(
  '/media/:id/reanalyze',
  requireRole('editor'),
  asyncRoute(async (req, res) => {
    const media = repo.setAiStatus(req.params.id, 'uploaded')
    if (!media) throw new HttpError(404, 'Asset not found.')
    await enqueueAnalysis(media.id)
    res.json({ ok: true })
  }),
)

api.post(
  '/uploads/signature',
  requireRole('editor'),
  asyncRoute(async (req, res) => {
    const org = repo.organization(req.user!.organizationId)
    const projectId = typeof req.body?.projectId === 'string' ? req.body.projectId : ''
    const project = projectId ? repo.getProject(projectId) : null
    const folder = assetFolder(org.slug, project?.project.slug || 'inbox')
    const context = `organizationId=${org.id}|projectId=${projectId}|source=field-upload`
    const signed = signUpload(folder, context)
    if (!signed) {
      res.json({ mode: 'demo', folder, context })
      return
    }
    res.json(signed)
  }),
)

api.post(
  '/uploads/direct',
  requireRole('editor'),
  uploader.single('file'),
  asyncRoute(async (req, res) => {
    if (!req.file) throw new HttpError(400, 'Choose a file to upload.')
    const projectId = typeof req.body?.projectId === 'string' && req.body.projectId ? req.body.projectId : null
    const gps = await exifr.gps(req.file.buffer).catch(() => null)
    const parsed = (await exifr
      .parse(req.file.buffer, { pick: ['DateTimeOriginal', 'CreateDate'] })
      .catch(() => null)) as { DateTimeOriginal?: Date; CreateDate?: Date } | null
    const captured = parsed?.DateTimeOriginal || parsed?.CreateDate
    fs.mkdirSync(uploadDir, { recursive: true })
    const stored = `${nanoid(12)}${extensions[req.file.mimetype] || '.bin'}`
    fs.writeFileSync(path.join(uploadDir, stored), req.file.buffer)
    const hash = req.file.mimetype.startsWith('image/') ? await averageHash(req.file.buffer) : null
    const media = repo.createMedia(req.user!.id, req.user!.organizationId, {
      filename: req.file.originalname || stored,
      secureUrl: `/api/v1/uploads/files/${stored}`,
      projectId,
      resourceType: req.file.mimetype.startsWith('video/') ? 'video' : 'image',
      format: (extensions[req.file.mimetype] || '').replace('.', '') || 'bin',
      width: 0,
      height: 0,
      capturedAt: captured ? new Date(captured).toISOString() : null,
      latitude: gps?.latitude ?? null,
      longitude: gps?.longitude ?? null,
      locationSource: gps ? 'exif' : 'unknown',
      locationConfidence: gps ? 0.9 : 0,
      checksum: checksumOf(req.file.buffer),
      perceptualHash: hash,
      sourceMetadata: { bytes: req.file.size, mime: req.file.mimetype, storage: 'demo-disk' },
      caption: '',
      altText: req.file.originalname || 'Field upload',
    })
    await enqueueAnalysis(media.id)
    res.status(201).json(media)
  }),
)

api.post(
  '/media/register',
  requireRole('editor'),
  asyncRoute(async (req, res) => {
    const body = readBody(registerMediaSchema, req.body)
    const media = repo.createMedia(req.user!.id, req.user!.organizationId, {
      filename: body.filename,
      secureUrl: body.secureUrl,
      cloudinaryPublicId: body.publicId,
      projectId: body.projectId ?? null,
      width: body.width,
      height: body.height,
      format: body.format,
      resourceType: body.resourceType,
      capturedAt: body.capturedAt ?? null,
      sourceMetadata: { storage: 'cloudinary' },
    })
    await enqueueAnalysis(media.id)
    res.status(201).json(media)
  }),
)

api.get('/reviews', (req, res) => {
  res.json(repo.reviews(req.user!.organizationId))
})

api.get('/graph', (req, res) => {
  res.json(
    repo.graph({
      orgId: req.user!.organizationId,
      projectId: typeof req.query.projectId === 'string' ? req.query.projectId : undefined,
      includeMedia: req.query.includeMedia === 'true' || req.query.includeMedia === '1',
      minConfidence: req.query.minConfidence ? Number(req.query.minConfidence) : 0,
      mode: req.query.mode === 'evidence' ? 'evidence' : 'explore',
      from: typeof req.query.from === 'string' ? req.query.from : undefined,
      to: typeof req.query.to === 'string' ? req.query.to : undefined,
      reportId: typeof req.query.reportId === 'string' ? req.query.reportId : undefined,
    }),
  )
})

api.get('/graph/org/:orgId', (req, res) => {
  if (req.params.orgId !== req.user!.organizationId && req.params.orgId !== repo.organization().id) {
    throw new HttpError(404, 'Organization not found.')
  }
  res.json(repo.graph({ orgId: req.params.orgId, includeMedia: req.query.includeMedia === 'true' }))
})

api.get('/graph/project/:projectId', (req, res) => {
  res.json(repo.graph({ orgId: req.user!.organizationId, projectId: req.params.projectId, includeMedia: true }))
})

api.get('/graph/node/:nodeId', (req, res) => {
  res.json(repo.graphNode(req.params.nodeId))
})

api.get('/search', (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q : ''
  const found = repo.search(q, req.user?.organizationId)
  res.json({
    ...found,
    routing: {
      source: services.jev ? 'jev' : 'policy',
      model: services.jev ? 'jev-1.13.0' : 'impactmesh-policy-v1',
      note: services.jev
        ? 'Query structure is read locally. Jev is used when an asset must be routed into a bounded decision.'
        : 'Query structure is read by the local lexicon. Add TYPESAFE_API_KEY to route asset decisions through Jev.',
    },
  })
})

api.get('/comparisons', (req, res) => res.json(repo.listComparisons(req.user!.organizationId)))
api.get('/comparisons/:id', (req, res) => {
  const comparison = repo.getComparison(req.params.id)
  if (!comparison) throw new HttpError(404, 'Comparison not found.')
  res.json(comparison)
})
api.post(
  '/comparisons',
  requireRole('editor'),
  asyncRoute(async (req, res) => {
    const body = readBody(createComparisonSchema, req.body)
    if (body.beforeId === body.afterId) throw new HttpError(400, 'Choose two different assets.')
    res.status(201).json(repo.createComparison(req.user!.id, body))
  }),
)

api.get('/reports', (req, res) => res.json(repo.listReports(req.user!.organizationId)))
api.get('/reports/:id', (req, res) => {
  const report = repo.getReport(req.params.id)
  if (!report) throw new HttpError(404, 'Report not found.')
  res.json(report)
})
api.get('/reports/:id/html', (req, res) => {
  const html = repo.reportHtml(req.params.id)
  if (!html) throw new HttpError(404, 'Report not found.')
  res.type('html').send(html)
})

api.get('/locations', (_req, res) => {
  res.json(repo.listLocations())
})

api.get('/locations/nearby', (req, res) => {
  const latitude = Number(req.query.lat)
  const longitude = Number(req.query.lng)
  const km = Number(req.query.km || 10)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) throw new HttpError(400, 'lat and lng are required.')
  res.json(repo.nearby(latitude, longitude, Number.isFinite(km) ? km : 10))
})

api.get('/audit', (_req, res) => res.json(repo.auditLog()))
api.get('/jobs', (_req, res) => res.json(repo.jobs()))

api.post(
  '/admin/reset',
  requireRole('owner'),
  asyncRoute(async (_req, res) => {
    if (env.nodeEnv === 'production') throw new HttpError(403, 'Demo reset is disabled in production.')
    repo.reset()
    res.json({ ok: true })
  }),
)
