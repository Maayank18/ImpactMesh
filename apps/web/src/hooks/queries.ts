import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  Comparison,
  DashboardPayload,
  GraphPayload,
  Location,
  MediaAsset,
  MediaDetail,
  Organization,
  Project,
  ProjectDetail,
  PublicProjectCard,
  PublicProjectPage,
  Report,
  SearchResponse,
  ServiceStatus,
  UserProfile,
} from '@impactmesh/shared-types'
import { api } from '@/lib/api'

export interface SessionPayload {
  token: string
  user: UserProfile
  organization: Organization
  services: ServiceStatus
}

export interface LocatedPlace extends Location {
  mediaCount: number
  projects: { id: string; name: string; slug: string }[]
}

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => api<Omit<SessionPayload, 'token'>>('/auth/me'),
    retry: false,
  })
}

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api<DashboardPayload>('/dashboard'),
  })
}

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: () => api<DashboardPayload['projects']>('/projects'),
  })
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ['project', id],
    queryFn: () => api<ProjectDetail>(`/projects/${id}`),
    enabled: Boolean(id),
  })
}

export function useMedia(params?: { projectId?: string; reviewStatus?: string }) {
  const search = new URLSearchParams()
  if (params?.projectId) search.set('projectId', params.projectId)
  if (params?.reviewStatus) search.set('reviewStatus', params.reviewStatus)
  const query = search.toString()
  return useQuery({
    queryKey: ['media', query],
    queryFn: () => api<MediaAsset[]>(`/media${query ? `?${query}` : ''}`),
  })
}

export function useMediaDetail(id: string | null) {
  return useQuery({
    queryKey: ['media', id],
    queryFn: () => api<MediaDetail>(`/media/${id}`),
    enabled: Boolean(id),
  })
}

export function useReviews() {
  return useQuery({
    queryKey: ['reviews'],
    queryFn: () => api<MediaDetail[]>('/reviews'),
  })
}

export function useGraph(params: {
  projectId?: string
  includeMedia?: boolean
  mode?: 'explore' | 'evidence'
  minConfidence?: number
  from?: string
  to?: string
  reportId?: string
}) {
  const search = new URLSearchParams()
  if (params.projectId) search.set('projectId', params.projectId)
  if (params.includeMedia) search.set('includeMedia', 'true')
  if (params.mode) search.set('mode', params.mode)
  if (params.minConfidence) search.set('minConfidence', String(params.minConfidence))
  if (params.from) search.set('from', params.from)
  if (params.to) search.set('to', params.to)
  if (params.reportId) search.set('reportId', params.reportId)
  const query = search.toString()
  return useQuery({
    queryKey: ['graph', query],
    queryFn: () => api<GraphPayload>(`/graph?${query}`),
  })
}

export function useLocations() {
  return useQuery({
    queryKey: ['locations'],
    queryFn: () => api<LocatedPlace[]>('/locations'),
  })
}

export function useSearch(q: string) {
  return useQuery({
    queryKey: ['search', q],
    queryFn: () => api<SearchResponse>(`/search?q=${encodeURIComponent(q)}`),
    enabled: q.trim().length > 1,
  })
}

export function useReports() {
  return useQuery({
    queryKey: ['reports'],
    queryFn: () => api<Array<Report & { projectName: string }>>('/reports'),
  })
}

export function useReport(id: string) {
  return useQuery({
    queryKey: ['report', id],
    queryFn: () => api<{ report: Report; project: Project | null; evidence: MediaAsset[] }>(`/reports/${id}`),
    enabled: Boolean(id),
  })
}

export function useComparisons() {
  return useQuery({
    queryKey: ['comparisons'],
    queryFn: () => api<Comparison[]>('/comparisons'),
  })
}

export function usePublicProjects() {
  return useQuery({
    queryKey: ['public-projects'],
    queryFn: () => api<PublicProjectCard[]>('/public/projects'),
  })
}

export function usePublicProject(slug: string) {
  return useQuery({
    queryKey: ['public-project', slug],
    queryFn: () => api<PublicProjectPage>(`/public/projects/${slug}`),
    enabled: Boolean(slug),
  })
}

export function usePublicGraph(slug: string) {
  return useQuery({
    queryKey: ['public-graph', slug],
    queryFn: () => api<GraphPayload>(`/public/projects/${slug}/graph`),
    enabled: Boolean(slug),
  })
}

export function useAudit() {
  return useQuery({
    queryKey: ['audit'],
    queryFn: () => api<import('@impactmesh/shared-types').AuditEvent[]>('/audit'),
  })
}

export function useJobs() {
  return useQuery({
    queryKey: ['jobs'],
    queryFn: () => api<import('@impactmesh/shared-types').JobRecord[]>('/jobs'),
  })
}

function refresh(client: ReturnType<typeof useQueryClient>) {
  void client.invalidateQueries()
}

export function useInvalidate() {
  const client = useQueryClient()
  return () => refresh(client)
}

export function useLogin() {
  return useMutation({
    mutationFn: (data: string | { email: string; name?: string; organizationName?: string; role?: import('@impactmesh/shared-types').Role }) => {
      const payload = typeof data === 'string' ? { email: data } : data
      return api<SessionPayload>('/auth/login', { method: 'POST', body: JSON.stringify(payload) })
    },
  })
}

export function useRegister() {
  return useMutation({
    mutationFn: (data: { email: string; name?: string; organizationName?: string; role?: import('@impactmesh/shared-types').Role }) =>
      api<SessionPayload>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  })
}

export function usePopulateSample() {
  return useMutation({
    mutationFn: () => api<{ project: Project; media: MediaAsset[] }>('/demo/populate-sample', { method: 'POST' }),
  })
}

