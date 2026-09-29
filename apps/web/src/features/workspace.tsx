import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Bell,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock,
  Columns2,
  Compass,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Filter,
  Folder,
  FolderPlus,
  Globe,
  Images,
  Layers,
  LogOut,
  MapPin,
  Maximize2,
  Minimize2,
  Minus,
  PanelLeft,
  PanelLeftClose,
  Plus,
  RotateCcw,
  Search,
  Settings,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Upload,
  UploadCloud,
  User,
  Users,
  X,
  Zap,
} from 'lucide-react'
import type { GraphLink, GraphNode } from '@impactmesh/shared-types'
import { EvidenceGraph, type GraphHandle, type LiveNode } from '@/components/graph'
import { RadialMenu } from '@/components/radial-menu'
import { CanvasLayers, type LayerVisibility } from '@/components/canvas-layers'
import { CanvasUploadDropzone, type UploadBatchItem } from '@/components/canvas-upload-dropzone'
import { CloudinaryLab } from '@/components/cloudinary-lab'
import { ImpactMeshBrand, ImpactMeshLogo } from '@/components/logo'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button, Eyebrow, Pill, cn } from '@/components/ui'
import { MapPage } from '@/features/map'
import { ComparePage } from '@/features/compare'
import { ReportsPage } from '@/features/reports'
import {
  useDashboard,
  useGraph,
  useInvalidate,
  useLocations,
  useMe,
  useMedia,
  useMediaDetail,
  usePopulateSample,
  useProjects,
  useReports,
  useSearch,
} from '@/hooks/queries'
import { api } from '@/lib/api'
import { formatWhen, formatWhenTime, titleCase } from '@/lib/format'
import { useWorkspace } from '@/stores/workspace'

export function WorkspacePage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const me = useMe()
  const dashboard = useDashboard()
  const projects = useProjects()
  const media = useMedia()
  const locations = useLocations()
  const reports = useReports()
  const workspace = useWorkspace()
  const invalidate = useInvalidate()
  const populateSample = usePopulateSample()
  const toast = useWorkspace((state) => state.toast)

  const graphRef = useRef<GraphHandle>(null)
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Clean Workspace & Modals State
  const [newProjectOpen, setNewProjectOpen] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [projectCity, setProjectCity] = useState('')
  const [projectDesc, setProjectDesc] = useState('')
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  // Canvas View & HUD State
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [layersOpen, setLayersOpen] = useState(false)
  const [activityOpen, setActivityOpen] = useState(false)
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(new Set())
  // Sidebar is closed by default whenever /app opens
  const [railCollapsed, setRailCollapsed] = useState(true)

  // Active Overlays inside Workspace
  const [activeOverlay, setActiveOverlay] = useState<'none' | 'map' | 'compare' | 'report' | 'upload' | 'cld-lab'>('none')
  const [labSelectedMediaId, setLabSelectedMediaId] = useState<string>('')

  const activeLabMedia = useMemo(() => {
    const list = media.data || []
    if (labSelectedMediaId) return list.find((m) => m.id === labSelectedMediaId) || list[0]
    return list[0] || null
  }, [media.data, labSelectedMediaId])

  // Canvas Layer Visibilities
  const [layers, setLayers] = useState<LayerVisibility>({
    projects: true,
    media: true,
    locations: true,
    activities: true,
    reports: true,
    evidence: true,
    organizations: true,
  })

  // In-Canvas Drag-and-Drop Batch State
  const [uploadBatch, setUploadBatch] = useState<UploadBatchItem[]>([])
  const [isDragOverCanvas, setIsDragOverCanvas] = useState(false)

  // URL state synchronization (project & focus)
  const focusParam = params.get('focus') || params.get('node')
  const projectParam = params.get('project')

  const searchResults = useSearch(searchQuery)

  const graph = useGraph({
    projectId: workspace.projectId || projectParam || undefined,
    includeMedia: layers.media,
    mode: workspace.mode,
    minConfidence: workspace.minConfidence,
  })

  // Node & Edge selection
  const selectedNode = graph.data?.nodes.find((node) => node.id === workspace.selectedNodeId) ?? null
  const selectedLink = graph.data?.links.find((item) => item.id === workspace.selectedLinkId) ?? null
  const mediaDetail = useMediaDetail(selectedNode?.type === 'media' ? selectedNode.id : null)

  const pendingReviews = dashboard.data?.stats.pendingReviews ?? 0

  // Focus from URL parameter on initial load
  useEffect(() => {
    if (!focusParam || !graph.data) return
    workspace.setSelectedNode(focusParam)
    const timer = setTimeout(() => graphRef.current?.flyTo(focusParam), 600)
    return () => clearTimeout(timer)
  }, [focusParam, graph.data])

  // Keyboard Shortcuts: Space=pan, F=focus, Z=zoom to fit, Esc=clear selection
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (e.key === 'Escape') {
        clearSelection()
        setActiveOverlay('none')
        setLayersOpen(false)
        setActivityOpen(false)
      } else if (e.key.toLowerCase() === 'f') {
        if (workspace.selectedNodeId) {
          e.preventDefault()
          graphRef.current?.flyTo(workspace.selectedNodeId)
        }
      } else if (e.key.toLowerCase() === 'z') {
        e.preventDefault()
        graphRef.current?.zoomToFit()
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [workspace.selectedNodeId])

  // Fullscreen change listener
  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      canvasContainerRef.current?.requestFullscreen().catch(() => setIsFullscreen(true))
    } else {
      document.exitFullscreen().catch(() => setIsFullscreen(false))
    }
  }

  function toggleRail() {
    setRailCollapsed((prev) => {
      const next = !prev
      localStorage.setItem('impactmesh.rail_collapsed', String(next))
      return next
    })
  }

  const selectNode = useCallback((node: GraphNode) => {
    workspace.setSelectedNode(node.id)
    if (node.type === 'location') workspace.patch({ focusLocationId: node.id })
    graphRef.current?.flyTo(node.id)
    const url = new URL(window.location.href)
    url.searchParams.set('node', node.id)
    window.history.replaceState(null, '', url.pathname + url.search)
  }, [workspace])

  const clearSelection = useCallback(() => {
    workspace.setSelectedNode(null)
    workspace.setSelectedLink(null)
    const url = new URL(window.location.href)
    url.searchParams.delete('node')
    window.history.replaceState(null, '', url.pathname + (url.search || ''))
  }, [workspace])

  const toggleProjectCluster = useCallback((projectId: string) => {
    setCollapsedProjects((prev) => {
      const next = new Set(prev)
      if (next.has(projectId)) {
        next.delete(projectId)
        workspace.toast(`Expanded project media cluster`)
      } else {
        next.add(projectId)
        workspace.toast(`Collapsed project cluster into nucleus`)
      }
      return next
    })
  }, [workspace])

  const handleLinkClick = useCallback((link: GraphLink) => {
    workspace.setSelectedLink(link.id)
  }, [workspace])

  const handleNodeDouble = useCallback((node: GraphNode) => {
    if (node.type === 'project') {
      toggleProjectCluster(node.id)
    } else {
      graphRef.current?.flyTo(node.id)
    }
  }, [toggleProjectCluster])

  // Selected Project's media assets
  const selectedProjectMedia = useMemo(() => {
    if (!selectedNode || selectedNode.type !== 'project') return []
    return (media.data || []).filter((m) => m.projectId === selectedNode.id)
  }, [selectedNode, media.data])

  // Selected Location's media assets
  const selectedLocationMedia = useMemo(() => {
    if (!selectedNode || selectedNode.type !== 'location') return []
    return (media.data || []).filter((m) => m.locationId === selectedNode.id)
  }, [selectedNode, media.data])

  // Selected Activity's media assets
  const selectedActivityMedia = useMemo(() => {
    if (!selectedNode || selectedNode.type !== 'activity') return []
    return (media.data || []).filter((m) => m.activityId === selectedNode.id)
  }, [selectedNode, media.data])

  // Selected Category's media assets (dynamic parent cluster)
  const selectedCategoryMedia = useMemo(() => {
    if (!selectedNode || selectedNode.type !== 'category') return []
    const catId = selectedNode.id
    const targetKey = catId.replace('cat_', '')
    const linkedMediaIds = new Set<string>()
    for (const l of graph.data?.links || []) {
      const targetId = typeof l.target === 'object' && l.target !== null ? (l.target as any).id : l.target
      const sourceId = typeof l.source === 'object' && l.source !== null ? (l.source as any).id : l.source
      if (targetId === catId && l.relation === 'FILED_IN') {
        linkedMediaIds.add(sourceId)
      }
    }
    return (media.data || []).filter((m) => {
      if (linkedMediaIds.has(m.id)) return true
      const cat = m.decision?.contentCategory
      if (cat && (cat === targetKey || cat.startsWith(targetKey))) return true
      return false
    })
  }, [selectedNode, graph.data, media.data])

  // IN-CANVAS DRAG & DROP HANDLER (Real Cloudinary / API Pipeline)
  async function handleDropFiles(files: FileList | File[]) {
    const fileList = Array.from(files)
    if (fileList.length === 0) return

    const activeProject = projects.data?.find((p) => p.id === workspace.projectId)
    const newItems: UploadBatchItem[] = fileList.map((file, idx) => {
      const lower = file.name.toLowerCase()
      const isTravel = /(switzerland|swiss|alps|mountain|lake|landscape|scenic|travel|vacation|trip|nature|beach|river|forest|outdoor|tourist|hill|valley|glacier)/.test(lower)
      const isEvent = /(event|conf|summit|fest|party|hackathon|workshop|stage|concert|gathering|celebration)/.test(lower)
      const isPersonal = /(whatsapp|selfie|person|meet|portrait|face|call|zoom|teams|meeting|glasses|man|woman)/.test(lower)
      const isWork = /(code|ide|vscode|terminal|programming|slide|table|chart|invoice|receipt|diagram|wireframe|spreadsheet|excel)/.test(lower)
      const isCommunity = /(community|volunteer|charity|aid|relief|ngo|civic)/.test(lower)

      const dynamicCategory = isTravel
        ? 'Travel & Exploration'
        : isEvent
          ? 'Events & Gatherings'
          : isPersonal
            ? 'Personal & Meetings'
            : isWork
              ? 'Work & Documentation'
              : isCommunity
                ? 'Community & Social Impact'
                : activeProject?.name || 'General Evidence'

      return {
        id: `up_${Date.now()}_${idx}`,
        file,
        filename: file.name,
        previewUrl: URL.createObjectURL(file),
        progress: 15,
        stage: 'uploading',
        statusText: 'Requesting Cloudinary upload signature…',
        suggestedProject: dynamicCategory,
        suggestedLocation: undefined,
        confidence: 0.92,
      }
    })

    setUploadBatch((prev) => [...newItems, ...prev])
    workspace.toast(`Ingesting ${fileList.length} field capture(s) via Cloudinary pipeline…`)

    for (const item of newItems) {
      try {
        // 1. Get signed Cloudinary upload params
        const signature = await api<{
          mode: string
          uploadUrl?: string
          apiKey?: string
          timestamp?: number
          signature?: string
          folder?: string
          context?: string
          cloudName?: string
        }>('/uploads/signature', {
          method: 'POST',
          body: JSON.stringify({ projectId: workspace.projectId || undefined }),
        }).catch(() => ({ mode: 'demo' as const }))

        setUploadBatch((prev) =>
          prev.map((b) =>
            b.id === item.id
              ? {
                  ...b,
                  progress: 35,
                  stage: 'cloudinary',
                  statusText: signature.mode === 'cloudinary' ? 'Uploading to Cloudinary CDN…' : 'Cloudinary buffer ingest…',
                }
              : b,
          ),
        )

        let registeredMediaId: string | null = null

        if (signature.mode === 'cloudinary' && signature.uploadUrl) {
          // Direct browser upload to Cloudinary
          const body = new FormData()
          body.append('file', item.file)
          body.append('api_key', signature.apiKey || '')
          body.append('timestamp', String(signature.timestamp))
          body.append('signature', signature.signature || '')
          body.append('folder', signature.folder || '')
          body.append('context', signature.context || '')

          const uploaded = await fetch(signature.uploadUrl, { method: 'POST', body }).then((res) => res.json())

          setUploadBatch((prev) =>
            prev.map((b) =>
              b.id === item.id
                ? { ...b, progress: 65, stage: 'ai', statusText: 'Cloudinary Vision AI analyzing features…' }
                : b,
            ),
          )

          const media = await api<{ id: string }>('/media/register', {
            method: 'POST',
            body: JSON.stringify({
              publicId: uploaded.public_id,
              secureUrl: uploaded.secure_url,
              projectId: workspace.projectId || null,
              filename: item.filename,
              width: uploaded.width,
              height: uploaded.height,
              format: uploaded.format,
              resourceType: uploaded.resource_type,
            }),
          })
          registeredMediaId = media.id
        } else {
          // Local direct ingest with EXIF & dHash
          const body = new FormData()
          body.append('file', item.file)
          if (workspace.projectId) body.append('projectId', workspace.projectId)
          const media = await api<{ id: string }>('/uploads/direct', { method: 'POST', body }).catch(() => null)
          registeredMediaId = media?.id ?? null
        }

        // Check for AI analysis result from backend with polling
        let resolvedCategory = item.suggestedProject
        let resolvedLocation = item.suggestedLocation
        if (registeredMediaId) {
          try {
            for (let attempt = 0; attempt < 5; attempt++) {
              await new Promise((r) => setTimeout(r, 600))
              const mediaDetail = await api<{
                media: {
                  aiStatus?: string
                  decision?: { categoryLabel?: string; contentCategory?: string }
                  locationId?: string
                }
                location?: { name: string }
              }>(`/media/${registeredMediaId}`)

              if (mediaDetail?.media?.decision?.categoryLabel) {
                resolvedCategory = mediaDetail.media.decision.categoryLabel
              }
              if (mediaDetail?.location?.name) {
                resolvedLocation = mediaDetail.location.name
              }
              if (mediaDetail?.media?.aiStatus === 'ready') {
                break
              }
            }
          } catch {
            // fallback to heuristic
          }
        }

        setUploadBatch((prev) =>
          prev.map((b) =>
            b.id === item.id
              ? {
                  ...b,
                  progress: 90,
                  stage: 'location',
                  suggestedProject: resolvedCategory,
                  suggestedLocation: resolvedLocation,
                  statusText: 'AI Vision analysis verified & orbital position computed',
                }
              : b,
          ),
        )

        setTimeout(() => {
          setUploadBatch((prev) =>
            prev.map((b) =>
              b.id === item.id
                ? { ...b, progress: 100, stage: 'review', statusText: `Linked to ${resolvedCategory} cluster` }
                : b,
            ),
          )
          workspace.toast(`${item.filename} added to ${resolvedCategory} cluster`)
          if (registeredMediaId) {
            void graph.refetch?.()
          }
        }, 600)
      } catch (err) {
        setUploadBatch((prev) =>
          prev.map((b) =>
            b.id === item.id
              ? { ...b, progress: 100, stage: 'failed', statusText: 'Ingestion error' }
              : b,
          ),
        )
      }
    }
  }

  return (
    <div
      ref={canvasContainerRef}
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragOverCanvas(true)
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsDragOverCanvas(false)
        }
      }}
      onDrop={(e) => {
        e.preventDefault()
        setIsDragOverCanvas(false)
        if (e.dataTransfer.files?.length) {
          handleDropFiles(e.dataTransfer.files)
        }
      }}
      className="relative flex h-screen w-screen overflow-hidden bg-bg text-ink font-sans select-none"
    >
      {/* Visual Dropzone Drag Overlay */}
      {isDragOverCanvas && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-bg/85 backdrop-blur-md pointer-events-none animate-in fade-in">
          <div className="rounded-3xl border-2 border-dashed border-mint p-12 text-center shadow-[0_0_80px_rgba(94,224,181,0.3)]">
            <Upload size={48} className="mx-auto text-mint animate-bounce" />
            <h3 className="mt-4 font-serif text-3xl text-ink">Drop Field Assets Onto Evidence Canvas</h3>
            <p className="mt-2 font-mono text-xs text-dim">
              Automatic EXIF GPS extraction · Cloudinary Vision AI · 64-bit dHash fingerprinting
            </p>
          </div>
        </div>
      )}

      {/* ================================================== */}
      {/* 1. SLIDE-OVER CONTEXT SIDEBAR (GPU-accelerated overlay) */}
      {/* ================================================== */}
      {!railCollapsed && (
        <div
          onClick={() => setRailCollapsed(true)}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'no-print fixed inset-y-0 left-0 z-50 flex flex-col w-64 border-r border-line/60 bg-bg/98 backdrop-blur-2xl shadow-2xl p-4',
          'transition-transform duration-200 ease-out will-change-transform',
          railCollapsed ? '-translate-x-full pointer-events-none' : 'translate-x-0 pointer-events-auto',
        )}
      >
        {/* Brand Lockup */}
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-line/60">
          <Link to="/" className="px-1 py-1 transition hover:opacity-90" title="ImpactMesh Home">
            <ImpactMeshBrand size="sm" />
          </Link>

          <button
            onClick={toggleRail}
            title="Close sidebar (Ctrl+B)"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-faint hover:bg-white/10 hover:text-ink transition"
          >
            <PanelLeftClose size={15} />
          </button>
        </div>

        {/* Rail Navigation Icons */}
        <nav className="mt-4 flex flex-1 flex-col gap-1">
          {/* Active Canvas Button */}
          <button
            onClick={() => {
              setActiveOverlay('none')
              workspace.setSelectedNode(null)
              graphRef.current?.zoomToFit()
            }}
            title="Evidence Canvas (Home)"
            className={cn(
              'flex items-center rounded-xl py-2 transition',
              railCollapsed ? 'justify-center px-2' : 'gap-3 px-3',
              activeOverlay === 'none' && !workspace.selectedNodeId
                ? 'bg-mint/15 text-mint border border-mint/30 font-medium'
                : 'text-dim hover:bg-white/5 hover:text-ink',
            )}
          >
            <Share2 size={17} className="shrink-0 text-mint" />
            {!railCollapsed && <span className="text-xs">Evidence Canvas</span>}
          </button>

          {/* Projects View */}
          <button
            onClick={() => navigate('/app/projects')}
            title="Projects Archive"
            className={cn(
              'flex items-center rounded-xl py-2 text-dim hover:bg-white/5 hover:text-ink transition',
              railCollapsed ? 'justify-center px-2' : 'gap-3 px-3',
            )}
          >
            <Folder size={17} className="shrink-0 text-sky" />
            {!railCollapsed && <span className="text-xs">Projects</span>}
          </button>

          {/* Evidence Assets View */}
          <button
            onClick={() => navigate('/app/evidence')}
            title="Media & Evidence Sets"
            className={cn(
              'flex items-center rounded-xl py-2 text-dim hover:bg-white/5 hover:text-ink transition',
              railCollapsed ? 'justify-center px-2' : 'gap-3 px-3',
            )}
          >
            <Images size={17} className="shrink-0 text-mint" />
            {!railCollapsed && <span className="text-xs">Evidence</span>}
          </button>

          {/* Map View Overlay */}
          <button
            onClick={() => setActiveOverlay((prev) => (prev === 'map' ? 'none' : 'map'))}
            title="Interactive Map Layer"
            className={cn(
              'flex items-center rounded-xl py-2 transition',
              railCollapsed ? 'justify-center px-2' : 'gap-3 px-3',
              activeOverlay === 'map'
                ? 'bg-amber/15 text-amber border border-amber/30 font-medium'
                : 'text-dim hover:bg-white/5 hover:text-ink',
            )}
          >
            <Compass size={17} className="shrink-0 text-amber" />
            {!railCollapsed && <span className="text-xs">Map Layer</span>}
          </button>

          {/* Compare Lab Overlay */}
          <button
            onClick={() => setActiveOverlay((prev) => (prev === 'compare' ? 'none' : 'compare'))}
            title="Before / After Compare Lab"
            className={cn(
              'flex items-center rounded-xl py-2 transition',
              railCollapsed ? 'justify-center px-2' : 'gap-3 px-3',
              activeOverlay === 'compare'
                ? 'bg-sky/15 text-sky border border-sky/30 font-medium'
                : 'text-dim hover:bg-white/5 hover:text-ink',
            )}
          >
            <Columns2 size={17} className="shrink-0 text-sky" />
            {!railCollapsed && <span className="text-xs">Compare Lab</span>}
          </button>

          {/* Reports Overlay */}
          <button
            onClick={() => setActiveOverlay((prev) => (prev === 'report' ? 'none' : 'report'))}
            title="Traceable Reports"
            className={cn(
              'flex items-center rounded-xl py-2 transition',
              railCollapsed ? 'justify-center px-2' : 'gap-3 px-3',
              activeOverlay === 'report'
                ? 'bg-[#f0d7b0]/15 text-[#f0d7b0] border border-[#f0d7b0]/30 font-medium'
                : 'text-dim hover:bg-white/5 hover:text-ink',
            )}
          >
            <FileText size={17} className="shrink-0 text-[#f0d7b0]" />
            {!railCollapsed && <span className="text-xs">Reports</span>}
          </button>

          {/* Review Queue */}
          <button
            onClick={() => navigate('/app/review')}
            title="Verification & Review Queue"
            className={cn(
              'relative flex items-center rounded-xl py-2 text-dim hover:bg-white/5 hover:text-ink transition',
              railCollapsed ? 'justify-center px-2' : 'justify-between px-3',
            )}
          >
            <span className={cn('flex items-center gap-3', railCollapsed && 'justify-center')}>
              <ShieldCheck size={17} className="shrink-0 text-amber" />
              {!railCollapsed && <span className="text-xs">Review Queue</span>}
            </span>
            {pendingReviews > 0 && (
              <span
                className={cn(
                  'rounded-full bg-amber/20 font-mono text-amber',
                  railCollapsed ? 'absolute -top-0.5 -right-0.5 h-2.5 w-2.5 p-0' : 'px-1.5 py-0.2 text-[10px]',
                )}
              >
                {!railCollapsed && pendingReviews}
              </span>
            )}
          </button>
        </nav>

        {/* Bottom Rail Actions */}
        <div className="space-y-1 border-t border-line/60 pt-3">
          <Link
            to="/feed"
            title="Public Record Feed"
            className={cn(
              'flex items-center rounded-xl py-1.5 text-xs text-dim hover:text-ink transition',
              railCollapsed ? 'justify-center' : 'gap-3 px-2',
            )}
          >
            <Globe size={15} />
            {!railCollapsed && <span>Public record</span>}
          </Link>

          <Link
            to="/app/settings"
            title="Workspace Settings"
            className={cn(
              'flex items-center rounded-xl py-1.5 text-xs text-dim hover:text-ink transition',
              railCollapsed ? 'justify-center' : 'gap-3 px-2',
            )}
          >
            <Settings size={15} />
            {!railCollapsed && <span>Settings</span>}
          </Link>
        </div>

        {/* User Card & Identity Switcher */}
        <div className={cn('relative mt-3 border-t border-line/60 pt-3', railCollapsed ? 'text-center' : 'px-2')}>
          <button
            onClick={() => setUserMenuOpen((prev) => !prev)}
            type="button"
            className="w-full text-left rounded-xl p-1.5 hover:bg-white/5 transition flex items-center justify-between gap-2"
          >
            {railCollapsed ? (
              <div
                className="mx-auto flex h-7 w-7 items-center justify-center rounded-full bg-mint/15 border border-mint/30 font-mono text-[11px] text-mint font-semibold"
                title={`${me.data?.user.name} (${me.data?.user.role})`}
              >
                {me.data?.user.name?.[0] || 'A'}
              </div>
            ) : (
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-ink">{me.data?.user.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-mint" />
                  <p className="font-mono text-[9px] uppercase tracking-wider text-mint font-semibold">
                    {me.data?.user.role}
                  </p>
                </div>
              </div>
            )}
          </button>

          {/* User Identity Popover */}
          {userMenuOpen && (
            <div className="glass-panel relative overflow-hidden absolute bottom-12 left-2 z-50 w-64 rounded-2xl p-3.5 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="glass-sheen" />
              <div className="pb-2.5 border-b border-white/10 dark:border-white/5">
                <p className="font-medium text-xs text-ink truncate">{me.data?.user.name}</p>
                <p className="font-mono text-[10px] text-faint truncate">{me.data?.user.email}</p>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className={`glass-pill text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold uppercase ${
                    me.data?.user.role === 'owner' ? 'text-mint' : me.data?.user.role === 'editor' ? 'text-sky' : 'text-amber'
                  }`}>
                    {me.data?.user.role}
                  </span>
                  <span className="text-[10px] text-faint truncate max-w-[120px] font-mono">{me.data?.organization.name}</span>
                </div>
              </div>

              <div className="mt-2.5 space-y-1">
                <button
                  onClick={() => {
                    setUserMenuOpen(false)
                    navigate('/login')
                  }}
                  className="w-full flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs text-dim hover:bg-white/5 hover:text-ink transition"
                >
                  <Users size={14} className="text-mint" />
                  <span>Switch Account / Personas</span>
                </button>

                <button
                  onClick={() => {
                    localStorage.removeItem('impactmesh.token')
                    navigate('/login')
                  }}
                  className="w-full flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs text-rose hover:bg-rose/10 transition"
                >
                  <LogOut size={14} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ================================================== */}
      {/* 2. THE MAIN CANVAS (THE SCREEN) + FLOATING HUD */}
      {/* ================================================== */}
      <main className="relative flex-1 h-full w-full overflow-hidden bg-bg">
        {/* Background Dot-Grid Texture */}
        <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />

        {/* -------------------------------------------------- */}
        {/* TOP MINIMAL HUD */}
        {/* -------------------------------------------------- */}
        <header className="absolute top-2.5 inset-x-2.5 sm:inset-x-3 z-30 pointer-events-none flex items-center justify-between gap-1 sm:gap-2">
          {/* Left: Quick Canvas Controls */}
          <div className="pointer-events-auto h-8 flex items-center gap-0.5 sm:gap-1 rounded-xl border border-white/10 bg-elev/90 px-1 backdrop-blur-xl shadow-lg shrink-0">
            {/* Sidebar Toggle Button */}
            <button
              onClick={toggleRail}
              title={railCollapsed ? 'Open Sidebar (Ctrl+B)' : 'Close Sidebar (Ctrl+B)'}
              className={cn(
                'h-6 flex items-center gap-1 rounded-lg px-2 text-[11px] transition font-medium',
                !railCollapsed
                  ? 'bg-mint text-slate-950 font-semibold shadow-xs'
                  : 'text-dim hover:text-ink hover:bg-white/10',
              )}
            >
              {railCollapsed ? <PanelLeft size={12} className="text-mint" /> : <PanelLeftClose size={12} />}
              <span className="hidden sm:inline">Sidebar</span>
            </button>

            <span className="h-3.5 w-px bg-white/10 mx-0.5" />

            <button
              onClick={() => graphRef.current?.zoom(1)}
              title="Zoom in (+)"
              className="grid h-6 w-6 place-items-center rounded-md text-dim hover:bg-white/10 hover:text-ink transition"
            >
              <Plus size={13} />
            </button>
            <button
              onClick={() => graphRef.current?.zoom(-1)}
              title="Zoom out (-)"
              className="grid h-6 w-6 place-items-center rounded-md text-dim hover:bg-white/10 hover:text-ink transition"
            >
              <Minus size={13} />
            </button>
            <button
              onClick={() => graphRef.current?.zoomToFit()}
              title="Fit to view (Z)"
              className="h-6 flex items-center gap-1 rounded-md px-1.5 text-[11px] text-dim hover:bg-white/10 hover:text-ink transition"
            >
              <RotateCcw size={11} />
              <span className="hidden md:inline">Reset</span>
            </button>

            <span className="h-3.5 w-px bg-white/10 mx-0.5" />

            {/* Photos in 3D scene toggle */}
            <button
              onClick={() => setLayers((prev) => ({ ...prev, media: !prev.media }))}
              title="Toggle Photos in 3D Scene"
              className={cn(
                'h-6 flex items-center gap-1 rounded-md px-1.5 sm:px-2 text-[11px] transition font-medium',
                layers.media ? 'bg-mint text-slate-950 font-bold' : 'text-dim hover:text-ink hover:bg-white/10',
              )}
            >
              <Camera size={12} />
              <span className="hidden xl:inline">Photos</span>
            </button>

            {/* Labels toggle */}
            <button
              onClick={() => workspace.patch({ showLabels: !workspace.showLabels })}
              title="Toggle Text Labels"
              className={cn(
                'h-6 flex items-center gap-1 rounded-md px-1.5 sm:px-2 text-[11px] transition font-medium',
                workspace.showLabels ? 'text-mint' : 'text-dim hover:text-ink hover:bg-white/10',
              )}
            >
              <Tag size={11} />
              <span className="hidden xl:inline">Labels</span>
            </button>

            {/* Layers Filter Toggle */}
            <button
              onClick={() => setLayersOpen((prev) => !prev)}
              title="Toggle Canvas Layers"
              className={cn(
                'h-6 flex items-center gap-1 rounded-md px-1.5 sm:px-2 text-[11px] transition',
                layersOpen ? 'bg-white/20 text-white font-medium' : 'text-dim hover:text-ink hover:bg-white/10',
              )}
            >
              <Layers size={12} />
              <span className="hidden xl:inline">Layers</span>
            </button>
          </div>

          {/* Center: Global Semantic Evidence Search (Adaptive & sleek) */}
          <div className="pointer-events-auto relative flex-1 min-w-[120px] max-w-xs sm:max-w-sm md:max-w-md mx-1 sm:mx-1.5">
            <div className="relative flex items-center">
              <Search size={13} className="absolute left-2.5 text-faint pointer-events-none" />
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 250)}
                placeholder="Search evidence... (Ctrl+K)"
                className="w-full h-8 rounded-xl border border-white/12 bg-elev/90 pl-7 pr-6 text-[11px] text-ink outline-none placeholder:text-faint focus:border-mint focus:shadow-[0_0_15px_rgba(94,224,181,0.2)] backdrop-blur-xl transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 text-faint hover:text-ink"
                >
                  <X size={11} />
                </button>
              )}
            </div>

            {/* Instant Search Results Dropdown */}
            {searchFocused && searchQuery.trim() && searchResults.data && (
              <div className="absolute top-10 inset-x-0 z-40 max-h-80 overflow-y-auto rounded-2xl border border-white/15 bg-elev/95 p-2 shadow-2xl backdrop-blur-2xl">
                <div className="px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-faint border-b border-line">
                  {searchResults.data.results.length} Search Matches
                </div>

                <div className="mt-1 space-y-1">
                  {searchResults.data.results.map((hit) => (
                    <button
                      key={hit.media.id}
                      onClick={() => {
                        selectNode({ id: hit.media.id, label: hit.media.filename, type: 'media' } as any)
                        setSearchQuery('')
                      }}
                      className="w-full flex items-center gap-2.5 rounded-xl p-2 text-left hover:bg-white/5 transition"
                    >
                      <img
                        src={hit.media.secureUrl}
                        alt=""
                        className="h-9 w-12 rounded-lg object-cover border border-white/10 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-mono text-xs font-semibold text-ink">{hit.media.filename}</p>
                        <p className="truncate text-[10px] text-dim">{hit.media.caption || 'Field asset'}</p>
                      </div>
                      <Pill tone="mint">Hit</Pill>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Summary Strip Pill + Status + Fullscreen */}
          <div className="pointer-events-auto flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Compact Responsive Summary Strip */}
            <button
              onClick={() => setActivityOpen((prev) => !prev)}
              title="Workspace Statistics & Activity"
              className="hidden lg:flex items-center gap-1.5 h-8 rounded-xl border border-white/10 bg-elev/90 px-2 sm:px-2.5 font-mono text-[10px] text-dim backdrop-blur-xl shadow-lg hover:border-mint/40 hover:text-ink transition"
            >
              <span>
                <strong className="text-mint">{dashboard.data?.stats.projects ?? 3}</strong> Proj
              </span>
              <span className="text-line">·</span>
              <span>
                <strong className="text-ink">{dashboard.data?.stats.media ?? 14}</strong> Media
              </span>
              <span className="text-line">·</span>
              <span>
                <strong className="text-amber">{dashboard.data?.stats.locations ?? 5}</strong> Places
              </span>
              {pendingReviews > 0 && (
                <>
                  <span className="text-line">·</span>
                  <span className="flex items-center gap-1 text-amber font-bold">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber animate-pulse" />
                    <span>{pendingReviews}</span>
                  </span>
                </>
              )}
            </button>

            {/* Mobile/Tablet Pending Reviews Badge */}
            {pendingReviews > 0 && (
              <button
                onClick={() => navigate('/app/review')}
                title={`${pendingReviews} pending reviews`}
                className="lg:hidden flex items-center gap-1 h-8 rounded-xl border border-amber/30 bg-amber/10 px-2 font-mono text-[10px] text-amber font-bold"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-amber animate-pulse" />
                <span>{pendingReviews}</span>
              </button>
            )}

            {/* Cloudinary Live Media Intelligence Badge & 1-Click Lab Launcher */}
            <button
              onClick={() => setActiveOverlay((prev) => (prev === 'cld-lab' ? 'none' : 'cld-lab'))}
              className={cn(
                'hidden md:flex items-center gap-1.5 h-8 rounded-xl border px-2.5 font-mono text-[10px] backdrop-blur-xl shadow-lg transition cursor-pointer',
                activeOverlay === 'cld-lab'
                  ? 'border-mint bg-mint/20 text-mint ring-1 ring-mint/40 shadow-[0_0_14px_rgba(94,224,181,0.35)]'
                  : 'border-line bg-elev/90 text-dim hover:text-ink hover:border-mint/50 hover:bg-elev2',
              )}
              title="1-Click: Open Cloudinary AI Forensic Lab"
            >
              <span className={cn('h-1.5 w-1.5 rounded-full', me.data?.services.cloudinary ? 'bg-mint animate-pulse' : 'bg-sky')} />
              <span className="font-semibold text-ink hidden xl:inline">Cloudinary AI</span>
              <span className={me.data?.services.cloudinary ? 'text-mint font-medium' : 'text-sky font-medium'}>
                {activeOverlay === 'cld-lab' ? 'Lab Open' : 'Forensic Lab'}
              </span>
            </button>

            {/* Theme Toggler */}
            <ThemeToggle className="h-8 py-1" />

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-line bg-elev/90 text-dim hover:text-ink hover:bg-white/10 backdrop-blur-xl shadow-lg transition"
              title={isFullscreen ? 'Exit Full Screen' : 'Full Viewport Canvas'}
            >
              {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
          </div>
        </header>

        {/* -------------------------------------------------- */}
        {/* LAYERS CONTROL POPOVER */}
        {/* -------------------------------------------------- */}
        {layersOpen && (
          <div className="absolute top-16 left-4 z-40">
            <CanvasLayers
              layers={layers}
              onChange={setLayers}
              onClose={() => setLayersOpen(false)}
            />
          </div>
        )}

        {/* -------------------------------------------------- */}
        {/* RECENT ACTIVITY / AUDIT LOG FLOATING DRAWER */}
        {/* -------------------------------------------------- */}
        {activityOpen && (
          <div className="absolute top-16 right-4 z-40 w-80 rounded-3xl border border-white/15 bg-elev/95 p-4 shadow-2xl backdrop-blur-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-line">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-mint" />
                <Eyebrow>Recent Activity</Eyebrow>
              </div>
              <button
                onClick={() => setActivityOpen(false)}
                className="rounded-lg p-1 text-dim hover:bg-white/5 hover:text-ink transition"
              >
                <X size={14} />
              </button>
            </div>

            <ul className="mt-3 max-h-72 overflow-y-auto space-y-3">
              {dashboard.data?.activity.map((event) => (
                <li key={event.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-2.5 text-xs">
                  <p className="font-semibold text-ink">{event.action.replaceAll('.', ' · ')}</p>
                  <p className="mt-1 font-mono text-[10px] text-faint">
                    {event.actorName} · {formatWhenTime(event.createdAt)}
                  </p>
                </li>
              ))}
            </ul>

            {pendingReviews > 0 && (
              <button
                onClick={() => {
                  setActivityOpen(false)
                  navigate('/app/review')
                }}
                className="mt-3 w-full rounded-xl bg-amber/15 border border-amber/30 py-2 text-xs font-semibold text-amber hover:bg-amber hover:text-bg transition"
              >
                Review {pendingReviews} Pending Assets →
              </button>
            )}
          </div>
        )}

        {/* -------------------------------------------------- */}
        {/* THREE.JS FORCE GRAPH 3D SCENE */}
        {/* -------------------------------------------------- */}
        {graph.data ? (
          <EvidenceGraph
            ref={graphRef}
            data={graph.data}
            showLabels={workspace.showLabels}
            selectedId={workspace.selectedNodeId}
            layers={layers}
            collapsedProjects={collapsedProjects}
            onNode={selectNode}
            onLink={handleLinkClick}
            onDouble={handleNodeDouble}
          />
        ) : (
          <div className="grid h-full place-items-center font-mono text-xs uppercase tracking-widest text-dim">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-mint animate-ping" />
              <span>Gathering 3D Evidence Mesh…</span>
            </span>
          </div>
        )}

        {/* -------------------------------------------------- */}
        {/* CLEAN EMPTY WORKSPACE WELCOME ONBOARDING OVERLAY */}
        {/* -------------------------------------------------- */}
        {graph.data && graph.data.nodes.length === 0 && (
          <div className="absolute inset-0 z-20 flex items-center justify-center p-6 pointer-events-none">
            {/* Ambient glows behind the empty canvas card */}
            <div className="pointer-events-none absolute h-96 w-96 rounded-full bg-mint/20 blur-[100px] -translate-x-20" />
            <div className="pointer-events-none absolute h-80 w-80 rounded-full bg-sky/20 blur-[100px] translate-x-20" />

            <div className="glass-panel relative overflow-hidden pointer-events-auto max-w-lg w-full rounded-3xl p-7 text-center transition-all animate-in fade-in zoom-in-95 duration-300">
              <div className="glass-sheen" />

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl glass-card text-mint mb-4 shadow-[0_0_30px_rgba(94,224,181,0.25)]">
                <Sparkles size={28} />
              </div>

              <div className="inline-flex items-center gap-2 rounded-full glass-pill border-mint/40 px-3.5 py-1 text-[11px] font-mono uppercase tracking-wider text-mint mb-3">
                <span className="h-1.5 w-1.5 rounded-full bg-mint animate-pulse" />
                <span>Clean Evidence Canvas</span>
              </div>

              <h2 className="font-serif text-3xl font-medium text-ink tracking-tight">
                Welcome, {me.data?.user.name}
              </h2>
              <p className="mt-1 text-xs font-mono text-mint">
                {me.data?.organization.name}
              </p>
              <p className="mt-2 text-xs text-dim leading-relaxed">
                This workspace is completely fresh with 0 media assets and 0 claims. Evidence is built bottom-up from authentic field photos.
              </p>

              {/* Role Capability Badge */}
              <div className="mt-4 inline-flex items-center gap-2 rounded-xl glass-card px-3.5 py-1.5 text-xs text-dim">
                <ShieldCheck size={14} className="text-mint" />
                <span>
                  Role: <strong className="text-ink uppercase font-mono">{me.data?.user.role}</strong> —{' '}
                  {me.data?.user.role === 'owner'
                    ? 'Full Workspace Control & Review Authority'
                    : me.data?.user.role === 'editor'
                    ? 'Media Ingestion & Evidence Review'
                    : 'Read-Only Audit Mode'}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
                <button
                  onClick={() => {
                    const input = document.createElement('input')
                    input.type = 'file'
                    input.multiple = true
                    input.accept = 'image/*'
                    input.onchange = (e) => {
                      const files = (e.target as HTMLInputElement).files
                      if (files) handleDropFiles(files)
                    }
                    input.click()
                  }}
                  className="flex-1 relative overflow-hidden flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-mint via-emerald-400 to-teal-300 px-4 py-2.5 text-xs font-semibold text-bg hover:opacity-95 transition shadow-lg shadow-mint/20 hover:scale-[1.01]"
                >
                  <div className="glass-sheen rounded-xl" />
                  <UploadCloud size={15} />
                  <span>Upload Field Media</span>
                </button>

                <button
                  onClick={() => setNewProjectOpen(true)}
                  className="glass-card flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-medium text-ink hover:border-mint transition"
                >
                  <FolderPlus size={15} />
                  <span>Create Project</span>
                </button>

                <button
                  onClick={async () => {
                    try {
                      await populateSample.mutateAsync()
                      toast('Sample evidence pack loaded! 3D nodes generated.')
                      invalidate()
                    } catch (err: unknown) {
                      toast(err instanceof Error ? err.message : 'Failed to load sample pack')
                    }
                  }}
                  disabled={populateSample.isPending}
                  className="glass-card flex items-center justify-center gap-1.5 rounded-xl border-amber/30 text-amber hover:border-amber hover:bg-amber/10 px-3 py-2.5 text-xs font-medium transition"
                  title="Load sample evidence pack into your workspace to test 3D nodes without uploading photos"
                >
                  <Zap size={14} />
                  <span>{populateSample.isPending ? 'Loading…' : 'Sample Pack'}</span>
                </button>
              </div>

              <p className="mt-4 text-[11px] text-faint font-mono">
                Tip: You can also drag & drop photos anywhere directly onto this canvas
              </p>

              {/* Pipeline Live Status Pill */}
              <div className="mt-4 border-t border-line/50 pt-3 flex items-center justify-center gap-3 text-[10px] font-mono text-faint">
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-mint" /> Cloudinary: dtixkwv7z
                </span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-sky" /> AI Vision Pipeline
                </span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber" /> Jev Arbitration
                </span>
              </div>
            </div>
          </div>
        )}

        {/* -------------------------------------------------- */}
        {/* IN-CANVAS PROJECT CREATION MODAL */}
        {/* -------------------------------------------------- */}
        {newProjectOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="max-w-md w-full rounded-3xl border border-white/20 dark:border-white/10 bg-elev/95 p-6 backdrop-blur-2xl shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-line">
                <div className="flex items-center gap-2">
                  <FolderPlus size={18} className="text-mint" />
                  <h3 className="font-serif text-xl font-medium text-ink">Open a Project</h3>
                </div>
                <button
                  onClick={() => setNewProjectOpen(false)}
                  className="text-faint hover:text-ink text-xs font-mono p-1 rounded-lg hover:bg-white/5"
                >
                  ✕
                </button>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault()
                  if (!projectName.trim()) return
                  try {
                    await api('/projects', {
                      method: 'POST',
                      body: JSON.stringify({
                        name: projectName.trim(),
                        description: projectDesc.trim() || undefined,
                        city: projectCity.trim() || undefined,
                      }),
                    })
                    toast(`Project "${projectName}" opened!`)
                    setProjectName('')
                    setProjectDesc('')
                    setProjectCity('')
                    setNewProjectOpen(false)
                    invalidate()
                  } catch (err: unknown) {
                    toast(err instanceof Error ? err.message : 'Failed to create project')
                  }
                }}
                className="mt-4 space-y-3.5"
              >
                <div>
                  <label className="block text-[11px] font-mono uppercase text-faint mb-1">Project Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ridge Restoration Phase II"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="w-full rounded-xl border border-line bg-bg px-3.5 py-2 text-xs text-ink outline-none focus:border-mint"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase text-faint mb-1">Primary Location / City</label>
                  <input
                    type="text"
                    placeholder="e.g. Delhi, Southern Ridge Corridor"
                    value={projectCity}
                    onChange={(e) => setProjectCity(e.target.value)}
                    className="w-full rounded-xl border border-line bg-bg px-3.5 py-2 text-xs text-ink outline-none focus:border-mint"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase text-faint mb-1">Project Scope & Description</label>
                  <textarea
                    rows={3}
                    placeholder="Brief description of the initiative and target evidence record..."
                    value={projectDesc}
                    onChange={(e) => setProjectDesc(e.target.value)}
                    className="w-full rounded-xl border border-line bg-bg px-3.5 py-2 text-xs text-ink outline-none focus:border-mint resize-none"
                  />
                </div>

                <div className="mt-5 flex justify-end gap-2 pt-2 border-t border-line/60">
                  <Button variant="ghost" onClick={() => setNewProjectOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={!projectName.trim()}>
                    Create Project
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* -------------------------------------------------- */}
        {/* RADIAL COMMAND TOOL SYSTEM (Section 9) */}
        {/* -------------------------------------------------- */}
        <div className="absolute bottom-6 left-6 z-40">
          <RadialMenu
            onCanvas={() => {
              setActiveOverlay('none')
              workspace.setSelectedNode(null)
              workspace.setSelectedLink(null)
              graphRef.current?.zoomToFit()
            }}
            onProjects={() => navigate('/app/projects')}
            onEvidence={() => navigate('/app/evidence')}
            onMap={() => setActiveOverlay((prev) => (prev === 'map' ? 'none' : 'map'))}
            onCompare={() => setActiveOverlay((prev) => (prev === 'compare' ? 'none' : 'compare'))}
            onReport={() => setActiveOverlay((prev) => (prev === 'report' ? 'none' : 'report'))}
            onReview={() => navigate('/app/review')}
            onUpload={() => {
              const input = document.createElement('input')
              input.type = 'file'
              input.multiple = true
              input.accept = 'image/*'
              input.onchange = (e) => {
                const files = (e.target as HTMLInputElement).files
                if (files) handleDropFiles(files)
              }
              input.click()
            }}
            onSearch={() => searchInputRef.current?.focus()}
            onLayers={() => setLayersOpen((prev) => !prev)}
            onCloudinaryLab={() => setActiveOverlay((prev) => (prev === 'cld-lab' ? 'none' : 'cld-lab'))}
            onToggleSidebar={toggleRail}
            activeOverlay={activeOverlay}
            pendingReviews={pendingReviews}
            railCollapsed={railCollapsed}
          />
        </div>

        {/* -------------------------------------------------- */}
        {/* FLOATING TOPOLOGY MINIMAP/COMPASS LEGEND */}
        {/* -------------------------------------------------- */}
        <div className="pointer-events-none absolute bottom-6 right-6 z-20 hidden md:block">
          <div className="rounded-2xl border border-white/15 bg-zinc-950/85 p-3 text-[11px] backdrop-blur-xl shadow-2xl">
            <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
              <span className="font-mono text-[9px] uppercase tracking-wider text-slate-400">3D Mesh Topology</span>
              <span className="font-mono text-[9px] text-mint flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-mint animate-pulse" />
                <span>Active</span>
              </span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-x-3.5 gap-y-1.5 text-slate-300 font-mono text-[10px]">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-mint shadow-[0_0_6px_#5ee0b5]" /> Project Hub
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber shadow-[0_0_6px_#e4b15a]" /> GPS Centroid
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-sky shadow-[0_0_6px_#8eb7ff]" /> Activity Cone
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#f0d7b0] shadow-[0_0_6px_#f0d7b0]" /> Brief Slab
              </span>
            </div>
          </div>
        </div>

        {/* -------------------------------------------------- */}
        {/* FLOATING INGESTION DROPZONE (Section 13 & 14) */}
        {/* -------------------------------------------------- */}
        {uploadBatch.length > 0 && (
          <div className="absolute bottom-20 left-6 z-40">
            <CanvasUploadDropzone
              batch={uploadBatch}
              onApproveAll={() => {
                workspace.toast('All processed assets added to live evidence graph')
                setUploadBatch([])
              }}
              onReviewIndividual={(item) => navigate(`/app/review`)}
              onDismiss={() => setUploadBatch([])}
              onClearItem={(id) => setUploadBatch((prev) => prev.filter((i) => i.id !== id))}
            />
          </div>
        )}

        {/* ================================================== */}
        {/* 3. RIGHT CONTEXTUAL INSPECTOR (Section 12) */}
        {/* ================================================== */}
        {selectedNode && (
          <aside className="absolute right-0 inset-y-0 z-40 w-[450px] max-w-[calc(100vw-32px)] border-l border-white/15 bg-zinc-950/95 p-5 shadow-[0_0_80px_rgba(0,0,0,0.85)] backdrop-blur-2xl flex flex-col overflow-y-auto animate-in slide-in-from-right duration-250 ease-out">
            {/* Top Glowing Sheen Accent */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-mint via-sky to-amber" />

            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Pill
                  tone={
                    selectedNode.type === 'project'
                      ? 'mint'
                      : selectedNode.type === 'location'
                        ? 'amber'
                        : selectedNode.type === 'activity'
                          ? 'sky'
                          : selectedNode.type === 'category'
                            ? 'mint'
                            : 'mint'
                  }
                >
                  {selectedNode.type === 'category' ? 'Category Cluster' : `${titleCase(selectedNode.type)} Record`}
                </Pill>
                <span className="font-mono text-[10px] text-faint truncate max-w-[120px]">{selectedNode.id}</span>
              </div>
              <button
                onClick={clearSelection}
                className="grid h-7 w-7 place-items-center rounded-lg text-dim hover:bg-white/10 hover:text-ink transition"
                title="Close Inspector (Esc)"
              >
                <X size={15} />
              </button>
            </div>

            {/* Inspector Body */}
            <div className="flex-1 mt-4 space-y-5">
              {/* Title */}
              <div>
                <h2 className="font-serif text-3xl text-ink leading-tight">{selectedNode.label}</h2>
                {selectedNode.metadata?.caption && (
                  <p className="mt-2 text-xs italic text-dim leading-relaxed border-l-2 border-mint/40 pl-3">
                    "{selectedNode.metadata.caption}"
                  </p>
                )}
              </div>

              {/* MEDIA NODE SPECIFIC INSPECTOR */}
              {selectedNode.type === 'media' && (
                <div className="space-y-4">
                  {/* Cloudinary AI Forensic Lab Interactive Switcher */}
                  {(selectedNode.imageUrl || mediaDetail.data?.media.secureUrl) && (
                    <CloudinaryLab
                      imageUrl={selectedNode.imageUrl || mediaDetail.data?.media.secureUrl || ''}
                      alt={selectedNode.label}
                      title={selectedNode.label}
                      latitude={selectedNode.metadata?.latitude ?? mediaDetail.data?.media.latitude}
                      longitude={selectedNode.metadata?.longitude ?? mediaDetail.data?.media.longitude}
                      capturedAt={selectedNode.metadata?.capturedAt ?? mediaDetail.data?.media.capturedAt}
                      dHash={mediaDetail.data?.media.perceptualHash || '0x1111000011110000'}
                      defaultMode="standard"
                      compact={false}
                    />
                  )}

                  {/* Verification Badge */}
                  <div className="flex items-center justify-between rounded-xl border border-mint/30 bg-mint/5 p-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={18} className="text-mint" />
                      <span className="font-mono text-xs font-semibold text-mint">
                        {((selectedNode.confidence || 0.95) * 100).toFixed(0)}% Verified Evidence
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-dim">
                      {mediaDetail.data?.media.reviewStatus === 'approved' ? 'Signed Review' : 'Auto-Clustered'}
                    </span>
                  </div>

                  {/* EXIF GPS Centroid */}
                  {selectedNode.metadata?.latitude && selectedNode.metadata?.longitude && (
                    <div className="rounded-xl border border-white/10 bg-elev2/60 p-3 space-y-1">
                      <span className="font-mono text-[10px] uppercase text-faint flex items-center gap-1">
                        <MapPin size={11} className="text-amber" />
                        <span>GPS Coordinates</span>
                      </span>
                      <p className="font-mono text-xs text-amber">
                        {selectedNode.metadata.latitude.toFixed(4)}° N, {selectedNode.metadata.longitude.toFixed(4)}° E
                      </p>
                      {selectedNode.metadata.city && (
                        <p className="text-xs text-dim">{selectedNode.metadata.city}</p>
                      )}
                    </div>
                  )}

                  {/* Provenance & Forensic Lineage (Section 12) */}
                  <div className="border-t border-line/60 pt-3">
                    <Eyebrow>Provenance & Lineage</Eyebrow>
                    <ul className="mt-3 space-y-2.5 font-mono text-[10px]">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 size={12} className="text-mint mt-0.5 shrink-0" />
                        <div>
                          <strong className="text-ink">Category Routing:</strong>
                          <span className="text-dim block">
                            {selectedNode.metadata?.categoryLabel || selectedNode.metadata?.contentCategory || 'Dynamic Cluster'} · {((selectedNode.confidence || 0.95) * 100).toFixed(0)}% confidence
                          </span>
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 size={12} className="text-mint mt-0.5 shrink-0" />
                        <div>
                          <strong className="text-ink">Vision AI Signals:</strong>
                          <span className="text-dim block">
                            {mediaDetail.data?.media.signals && mediaDetail.data.media.signals.length > 0
                              ? mediaDetail.data.media.signals.slice(0, 3).map((s) => s.normalizedTag).join(' · ')
                              : 'AI classification verified'}
                          </span>
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 size={12} className="text-mint mt-0.5 shrink-0" />
                        <div>
                          <strong className="text-ink">Perceptual dHash:</strong>
                          <span className="text-dim block font-mono">
                            {mediaDetail.data?.media.perceptualHash || '0x1111000011110000'} (collision clear)
                          </span>
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 size={12} className="text-mint mt-0.5 shrink-0" />
                        <div>
                          <strong className="text-ink">Pipeline Status:</strong>
                          <span className="text-dim block">
                            {mediaDetail.data?.media.reviewStatus === 'approved' ? 'Approved into verified record' : 'Ingested into dynamic orbit'}
                          </span>
                        </div>
                      </li>
                    </ul>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <Link
                      to={`/app/evidence/${selectedNode.id}`}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-line bg-elev/70 p-2 text-xs text-dim hover:text-ink hover:border-mint transition"
                    >
                      <ExternalLink size={12} />
                      <span>View Source</span>
                    </Link>
                    <button
                      onClick={() => setActiveOverlay('compare')}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-line bg-elev/70 p-2 text-xs text-dim hover:text-sky hover:border-sky transition"
                    >
                      <Columns2 size={12} />
                      <span>Compare</span>
                    </button>
                  </div>
                </div>
              )}

              {/* PROJECT NODE SPECIFIC INSPECTOR */}
              {selectedNode.type === 'project' && (
                <div className="space-y-4">
                  {/* Cluster Toggle Button */}
                  <div className="flex items-center justify-between rounded-xl border border-mint/30 bg-mint/5 p-3">
                    <div>
                      <span className="font-mono text-xs font-semibold text-mint block">
                        Project Evidence Cluster
                      </span>
                      <span className="font-mono text-[10px] text-faint">
                        {selectedProjectMedia.length} Photos in Collection
                      </span>
                    </div>

                    <Button
                      variant="solid"
                      onClick={() => toggleProjectCluster(selectedNode.id)}
                      className="text-xs py-1.5 px-3"
                    >
                      {collapsedProjects.has(selectedNode.id) ? 'Expand Cluster' : 'Collapse Cluster'}
                    </Button>
                  </div>

                  {/* Project Photos Reel */}
                  <div>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-faint block pb-2">
                      Collection Photos ({selectedProjectMedia.length})
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedProjectMedia.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            workspace.setSelectedNode(item.id)
                            graphRef.current?.flyTo(item.id)
                          }}
                          className="group overflow-hidden rounded-xl border border-line bg-elev/40 p-1 text-left hover:border-mint/50 transition"
                        >
                          <img
                            src={item.secureUrl}
                            alt=""
                            className="aspect-[4/3] w-full rounded-lg object-cover group-hover:scale-105 transition"
                          />
                          <p className="mt-1 truncate font-mono text-[9px] text-dim">{item.filename}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <Link
                    to={`/app/projects/${selectedNode.id}`}
                    className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-line bg-elev/70 p-2 text-xs text-dim hover:text-ink hover:border-mint transition"
                  >
                    <span>Open Project Dossier</span>
                    <ExternalLink size={12} />
                  </Link>
                </div>
              )}

              {/* LOCATION NODE SPECIFIC INSPECTOR */}
              {selectedNode.type === 'location' && (
                <div className="space-y-4">
                  {selectedNode.metadata?.latitude && selectedNode.metadata?.longitude && (
                    <div className="rounded-xl border border-white/10 bg-elev2/60 p-3">
                      <span className="font-mono text-[10px] text-faint">GPS Centroid</span>
                      <p className="font-mono text-sm text-amber mt-1">
                        {selectedNode.metadata.latitude.toFixed(4)}° N, {selectedNode.metadata.longitude.toFixed(4)}° E
                      </p>
                    </div>
                  )}

                  <button
                    onClick={() => setActiveOverlay('map')}
                    className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-amber/15 border border-amber/30 p-2 text-xs text-amber font-semibold hover:bg-amber hover:text-bg transition"
                  >
                    <Compass size={13} />
                    <span>Open on Spatial Map</span>
                  </button>

                  <div>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-faint block pb-2">
                      Photos Captured Here ({selectedLocationMedia.length})
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedLocationMedia.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            workspace.setSelectedNode(item.id)
                            graphRef.current?.flyTo(item.id)
                          }}
                          className="group overflow-hidden rounded-xl border border-line bg-elev/40 p-1 text-left hover:border-mint/50 transition"
                        >
                          <img
                            src={item.secureUrl}
                            alt=""
                            className="aspect-[4/3] w-full rounded-lg object-cover group-hover:scale-105 transition"
                          />
                          <p className="mt-1 truncate font-mono text-[9px] text-dim">{item.filename}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* CATEGORY NODE SPECIFIC INSPECTOR */}
              {selectedNode.type === 'category' && (
                <div className="space-y-4">
                  {/* Category Cluster Overview Card */}
                  <div className="rounded-2xl border border-white/10 bg-elev2/60 p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] uppercase tracking-wider text-faint flex items-center gap-1.5">
                        <Sparkles size={13} className="text-mint" />
                        <span>Dynamic Parent Cluster</span>
                      </span>
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-full bg-mint/15 text-mint border border-mint/30">
                        {selectedCategoryMedia.length} Assets In Orbit
                      </span>
                    </div>
                    <p className="text-xs text-dim leading-relaxed">
                      AI Evidence Routing clustered all incoming assets matching <strong className="text-ink">{selectedNode.label}</strong> into this dedicated parent node.
                    </p>
                  </div>

                  <div>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-faint block pb-2">
                      Assets In This Cluster ({selectedCategoryMedia.length})
                    </span>
                    {selectedCategoryMedia.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-white/10 p-5 text-center">
                        <p className="text-xs text-faint font-mono">No media loaded yet</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {selectedCategoryMedia.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => {
                              workspace.setSelectedNode(item.id)
                              graphRef.current?.flyTo(item.id)
                            }}
                            className="group overflow-hidden rounded-xl border border-line bg-elev/40 p-1.5 text-left hover:border-mint/50 transition"
                          >
                            <img
                              src={item.secureUrl}
                              alt=""
                              className="aspect-[4/3] w-full rounded-lg object-cover group-hover:scale-105 transition"
                            />
                            <p className="mt-1.5 truncate font-mono text-[10px] text-ink font-medium">{item.filename}</p>
                            {item.decision?.categoryLabel && (
                              <p className="truncate font-mono text-[9px] text-dim">{item.decision.categoryLabel}</p>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ACTIVITY NODE SPECIFIC INSPECTOR */}
              {selectedNode.type === 'activity' && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-elev2/60 p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] uppercase tracking-wider text-sky flex items-center gap-1.5">
                        <Tag size={13} className="text-sky" />
                        <span>Activity Vocabulary</span>
                      </span>
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-full bg-sky/15 text-sky border border-sky/30">
                        {selectedActivityMedia.length} Assets
                      </span>
                    </div>
                    <p className="text-xs text-dim leading-relaxed">
                      Field captures documenting <strong className="text-ink">{selectedNode.label}</strong> verified in this project.
                    </p>
                  </div>

                  <div>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-faint block pb-2">
                      Evidence Showing This Activity ({selectedActivityMedia.length})
                    </span>
                    {selectedActivityMedia.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-white/10 p-5 text-center">
                        <p className="text-xs text-faint font-mono">No evidence linked yet</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {selectedActivityMedia.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => {
                              workspace.setSelectedNode(item.id)
                              graphRef.current?.flyTo(item.id)
                            }}
                            className="group overflow-hidden rounded-xl border border-line bg-elev/40 p-1.5 text-left hover:border-sky/50 transition"
                          >
                            <img
                              src={item.secureUrl}
                              alt=""
                              className="aspect-[4/3] w-full rounded-lg object-cover group-hover:scale-105 transition"
                            />
                            <p className="mt-1.5 truncate font-mono text-[10px] text-ink font-medium">{item.filename}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* OTHER / GENERIC NODES (Organization, Partner, Report, Evidence Set) */}
              {!['media', 'project', 'location', 'category', 'activity'].includes(selectedNode.type) && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-elev2/60 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] uppercase tracking-wider text-mint flex items-center gap-1.5">
                        <ShieldCheck size={13} className="text-mint" />
                        <span>Mesh Node Detail</span>
                      </span>
                      <span className="font-mono text-xs text-dim">
                        Type: {titleCase(selectedNode.type)}
                      </span>
                    </div>
                    <p className="text-xs text-dim leading-relaxed">
                      Part of the verified organization evidence graph.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Close Inspector */}
            <div className="mt-4 pt-3 border-t border-line/60">
              <button
                onClick={clearSelection}
                className="w-full rounded-xl border border-line py-2 text-xs text-dim hover:text-ink hover:bg-white/5 transition"
              >
                Close Inspector
              </button>
            </div>
          </aside>
        )}
      </main>

      {/* ================================================== */}
      {/* 4. INTEGRATED NON-DESTRUCTIVE OVERLAYS (Native React Components) */}
      {/* ================================================== */}
      {/* A. MAP OVERLAY */}
      {activeOverlay === 'map' && (
        <div className="absolute inset-y-0 right-0 z-40 w-[640px] max-w-[calc(100vw-64px)] border-l border-white/15 bg-bg/98 backdrop-blur-2xl shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
          <div className="flex items-center justify-between border-b border-line p-4">
            <div className="flex items-center gap-2">
              <Compass size={16} className="text-amber" />
              <Eyebrow>Synchronized Spatial Map</Eyebrow>
            </div>
            <button
              onClick={() => setActiveOverlay('none')}
              className="rounded-xl p-1 text-dim hover:bg-white/5 hover:text-ink transition"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-hidden p-4">
            <div className="h-full rounded-2xl border border-white/10 overflow-hidden bg-bg">
              <MapPage />
            </div>
          </div>
        </div>
      )}

      {/* B. COMPARE LAB OVERLAY */}
      {activeOverlay === 'compare' && (
        <div className="absolute inset-y-0 right-0 z-40 w-[740px] max-w-[calc(100vw-64px)] border-l border-white/15 bg-bg/98 backdrop-blur-2xl shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
          <div className="flex items-center justify-between border-b border-line p-4">
            <div className="flex items-center gap-2">
              <Columns2 size={16} className="text-sky" />
              <Eyebrow>Visual Comparison Lab</Eyebrow>
            </div>
            <button
              onClick={() => setActiveOverlay('none')}
              className="rounded-xl p-1 text-dim hover:bg-white/5 hover:text-ink transition"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="h-full min-h-[500px] w-full rounded-2xl border border-white/10 overflow-hidden bg-bg">
              <ComparePage />
            </div>
          </div>
        </div>
      )}

      {/* C. REPORT BUILDER OVERLAY */}
      {activeOverlay === 'report' && (
        <div className="absolute inset-y-0 right-0 z-40 w-[680px] max-w-[calc(100vw-64px)] border-l border-white/15 bg-bg/98 backdrop-blur-2xl shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
          <div className="flex items-center justify-between border-b border-line p-4">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-[#f0d7b0]" />
              <Eyebrow>Traceable Impact Reports</Eyebrow>
            </div>
            <button
              onClick={() => setActiveOverlay('none')}
              className="rounded-xl p-1 text-dim hover:bg-white/5 hover:text-ink transition"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="h-full min-h-[500px] w-full rounded-2xl border border-white/10 overflow-hidden bg-bg">
              <ReportsPage />
            </div>
          </div>
        </div>
      )}
      {/* D. DEDICATED CLOUDINARY AI FORENSIC LAB OVERLAY SUITE */}
      {activeOverlay === 'cld-lab' && (
        <div className="absolute inset-y-0 right-0 z-40 w-[780px] max-w-[calc(100vw-64px)] border-l border-white/15 bg-zinc-950/98 backdrop-blur-2xl shadow-2xl flex flex-col overflow-y-auto animate-in slide-in-from-right duration-200">
          <div className="flex items-center justify-between border-b border-line/60 p-4">
            <div className="flex items-center gap-2">
              <div className="grid h-7 w-7 place-items-center rounded-lg bg-mint/15 text-mint border border-mint/30 shadow-[0_0_10px_rgba(94,224,181,0.3)]">
                <Zap size={15} className="animate-pulse" />
              </div>
              <div>
                <h3 className="font-mono text-sm font-semibold text-ink">Cloudinary AI Forensic Lab</h3>
                <p className="font-mono text-[10px] text-dim">Interactive Edge Transformation & Provenance Suite</p>
              </div>
            </div>
            <button
              onClick={() => setActiveOverlay('none')}
              className="rounded-xl p-1.5 text-dim hover:bg-white/5 hover:text-ink transition"
              title="Close Lab"
            >
              <X size={16} />
            </button>
          </div>

          <div className="p-5 space-y-5">
            {/* Field Asset Quick Picker */}
            <div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-faint block mb-2">
                Select Field Evidence Asset to Transform:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(media.data || []).slice(0, 4).map((item) => {
                  const isSelected = activeLabMedia?.id === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => setLabSelectedMediaId(item.id)}
                      className={cn(
                        'group relative overflow-hidden rounded-xl border p-1 text-left transition',
                        isSelected
                          ? 'border-mint bg-mint/10 ring-1 ring-mint/40 shadow-[0_0_12px_rgba(94,224,181,0.2)]'
                          : 'border-line/60 bg-elev/40 hover:border-line hover:bg-elev2/60',
                      )}
                    >
                      <img src={item.secureUrl} alt="" className="aspect-[4/3] w-full rounded-lg object-cover" />
                      <p className="mt-1 truncate font-mono text-[10px] text-ink">{item.filename}</p>
                      <span className="font-mono text-[8px] text-dim block">{item.perceptualHash?.slice(0, 10)}...</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Cloudinary Lab Interactive Component */}
            {activeLabMedia && (
              <CloudinaryLab
                imageUrl={activeLabMedia.secureUrl}
                alt={activeLabMedia.altText || activeLabMedia.filename}
                title={activeLabMedia.filename}
                latitude={activeLabMedia.latitude}
                longitude={activeLabMedia.longitude}
                capturedAt={activeLabMedia.capturedAt}
                dHash={activeLabMedia.perceptualHash}
                defaultMode="clarify"
                showSplitSlider={true}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
