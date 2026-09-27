import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Compass,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Filter,
  Folder,
  FolderOpen,
  Images,
  Info,
  Layers,
  MapPin,
  Maximize2,
  Minimize2,
  Plus,
  Minus,
  RotateCcw,
  Share2,
  ShieldCheck,
  Sparkles,
  Tag,
  Users,
  X,
  Zap,
} from 'lucide-react'
import type { GraphLink, GraphNode } from '@impactmesh/shared-types'
import { EvidenceGraph, type GraphHandle } from '@/components/graph'
import { EvidenceDrawer } from '@/components/evidence'
import { Button, Eyebrow, Pill, cn } from '@/components/ui'
import { useGraph, useLocations, useMedia, useMediaDetail, useProjects, useReports, useSearch } from '@/hooks/queries'
import { titleCase, formatWhen } from '@/lib/format'
import { useWorkspace } from '@/stores/workspace'

const LEGEND = [
  { name: 'Organization', shape: 'Celestial nexus', color: '#f4f0e6' },
  { name: 'Project', shape: 'Planetary orbit', color: '#5ee0b5' },
  { name: 'Location', shape: 'Golden diamond', color: '#e4b15a' },
  { name: 'Activity', shape: 'Sapphire cone', color: '#8eb7ff' },
  { name: 'Media Asset', shape: 'Photo card', color: '#5ee0b5' },
  { name: 'Evidence Set', shape: 'Emerald dodecahedron', color: '#7ddec8' },
  { name: 'Report', shape: 'Brief slab', color: '#f0d7b0' },
  { name: 'Partner', shape: 'Gemstone', color: '#c4b5fd' },
]

export function GraphPage() {
  const [params] = useSearchParams()
  const graphRef = useRef<GraphHandle>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const workspace = useWorkspace()
  const projects = useProjects()
  const media = useMedia()
  const locations = useLocations()
  const reports = useReports()

  const [snapshotName, setSnapshotName] = useState('')
  const [nodeFilter, setNodeFilter] = useState('')
  const [showIndex, setShowIndex] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const focus = params.get('focus')
  const q = params.get('q') || ''
  const search = useSearch(q)
  const year = workspace.year
  const range =
    year === 'all'
      ? {}
      : year === '2026-09'
        ? { from: '2026-09-01T00:00:00.000Z', to: '2026-09-30T23:59:59.000Z' }
        : { from: `${year}-01-01T00:00:00.000Z`, to: `${year}-12-31T23:59:59.000Z` }

  const graph = useGraph({
    projectId: workspace.projectId || undefined,
    includeMedia: workspace.showMedia || workspace.mode === 'evidence',
    mode: workspace.mode,
    minConfidence: workspace.minConfidence,
    reportId: workspace.mode === 'evidence' ? workspace.reportId || undefined : undefined,
    ...range,
  })

  const selected = graph.data?.nodes.find((node) => node.id === workspace.selectedNodeId) ?? null
  const mediaDetail = useMediaDetail(selected?.type === 'media' ? selected.id : null)
  const link = graph.data?.links.find((item) => item.id === workspace.selectedLinkId) ?? null

  const highlight = useMemo(() => {
    if (!search.data) return null
    return new Set(search.data.results.map((hit) => hit.media.id))
  }, [search.data])

  // Focus node from query param
  useEffect(() => {
    if (!focus || !graph.data) return
    workspace.setSelectedNode(focus)
    const timer = window.setTimeout(() => graphRef.current?.flyTo(focus), 700)
    return () => window.clearTimeout(timer)
  }, [focus, graph.data])

  // Fullscreen event listener
  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {
        setIsFullscreen(true)
      })
    } else {
      document.exitFullscreen().catch(() => {
        setIsFullscreen(false)
      })
    }
  }

  function choose(node: GraphNode) {
    workspace.setSelectedNode(node.id)
    if (node.type === 'location') workspace.patch({ focusLocationId: node.id })
    graphRef.current?.flyTo(node.id)
  }

  // Filtered nodes for Node Index
  const filteredNodes = useMemo(() => {
    const list = graph.data?.nodes || []
    if (!nodeFilter.trim()) return list
    const lower = nodeFilter.toLowerCase()
    return list.filter((n) => n.label.toLowerCase().includes(lower) || n.type.toLowerCase().includes(lower))
  }, [graph.data?.nodes, nodeFilter])

  // Grouped nodes by category
  const groupedNodes = useMemo(() => {
    const groups: Record<string, GraphNode[]> = {
      project: [],
      location: [],
      activity: [],
      media: [],
      other: [],
    }
    for (const node of filteredNodes) {
      if (groups[node.type]) groups[node.type].push(node)
      else groups.other.push(node)
    }
    return groups
  }, [filteredNodes])

  // Selected project metadata and photos
  const selectedProject = useMemo(() => {
    if (!selected || selected.type !== 'project') return null
    return projects.data?.find((p) => p.id === selected.id) || null
  }, [selected, projects.data])

  const selectedProjectMedia = useMemo(() => {
    if (!selected || selected.type !== 'project') return []
    return (media.data || []).filter((m) => m.projectId === selected.id)
  }, [selected, media.data])

  // Selected location photos
  const selectedLocationMedia = useMemo(() => {
    if (!selected || selected.type !== 'location') return []
    return (media.data || []).filter((m) => m.locationId === selected.id)
  }, [selected, media.data])

  // Selected activity photos
  const selectedActivityMedia = useMemo(() => {
    if (!selected || selected.type !== 'activity') return []
    return (media.data || []).filter((m) => m.activityId === selected.id)
  }, [selected, media.data])

  const totalMediaInGraph = useMemo(() => {
    return graph.data?.nodes.filter((n) => n.type === 'media').length || 0
  }, [graph.data?.nodes])

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative h-full w-full select-none bg-bg text-ink overflow-hidden',
        isFullscreen ? 'fixed inset-0 z-50' : 'grid lg:grid-cols-[260px_1fr_360px]',
      )}
    >
      {/* 1. LEFT PANEL: ORGANIZED NODE & FOLDER INDEX */}
      {(!isFullscreen || showIndex) && (
        <div
          className={cn(
            'flex flex-col border-r border-line bg-bg/95 backdrop-blur z-20 overflow-hidden',
            isFullscreen && 'absolute left-0 inset-y-0 w-72 shadow-2xl',
          )}
        >
          {/* Index Header & Search */}
          <div className="p-3 border-b border-line space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers size={14} className="text-mint" />
                <Eyebrow>Node Index</Eyebrow>
              </div>
              <span className="font-mono text-[10px] text-faint">{graph.data?.nodes.length || 0} nodes</span>
            </div>

            <div className="relative">
              <input
                value={nodeFilter}
                onChange={(e) => setNodeFilter(e.target.value)}
                placeholder="Search collection..."
                className="w-full rounded-xl border border-line bg-elev/70 px-3 py-1.5 text-xs outline-none placeholder:text-faint focus:border-mint transition"
              />
              {nodeFilter && (
                <button
                  onClick={() => setNodeFilter('')}
                  className="absolute right-2 top-2 text-faint hover:text-ink"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Grouped Node List */}
          <div className="flex-1 overflow-auto p-2 space-y-4">
            {/* Project Folders */}
            {groupedNodes.project.length > 0 && (
              <div>
                <p className="px-2 font-mono text-[10px] uppercase tracking-wider text-faint flex items-center gap-1.5 pb-1">
                  <Folder size={11} className="text-mint" />
                  <span>Projects ({groupedNodes.project.length})</span>
                </p>
                <div className="space-y-0.5">
                  {groupedNodes.project.map((node) => {
                    const isSelected = selected?.id === node.id
                    const count = (media.data || []).filter((m) => m.projectId === node.id).length
                    return (
                      <button
                        key={node.id}
                        onClick={() => choose(node)}
                        className={cn(
                          'w-full flex items-center justify-between rounded-xl px-2.5 py-1.5 text-left text-xs transition',
                          isSelected
                            ? 'bg-mint/15 text-mint border border-mint/30 font-medium'
                            : 'text-dim hover:bg-white/5 hover:text-ink',
                        )}
                      >
                        <span className="truncate pr-2">{node.label}</span>
                        <span className="font-mono text-[10px] text-faint shrink-0 bg-white/5 px-1.5 py-0.5 rounded">
                          {count} pics
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Locations */}
            {groupedNodes.location.length > 0 && (
              <div>
                <p className="px-2 font-mono text-[10px] uppercase tracking-wider text-faint flex items-center gap-1.5 pb-1">
                  <MapPin size={11} className="text-amber" />
                  <span>Locations ({groupedNodes.location.length})</span>
                </p>
                <div className="space-y-0.5">
                  {groupedNodes.location.map((node) => (
                    <button
                      key={node.id}
                      onClick={() => choose(node)}
                      className={cn(
                        'w-full flex items-center justify-between rounded-xl px-2.5 py-1.5 text-left text-xs transition',
                        selected?.id === node.id
                          ? 'bg-amber/15 text-amber border border-amber/30 font-medium'
                          : 'text-dim hover:bg-white/5 hover:text-ink',
                      )}
                    >
                      <span className="truncate">{node.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Activities */}
            {groupedNodes.activity.length > 0 && (
              <div>
                <p className="px-2 font-mono text-[10px] uppercase tracking-wider text-faint flex items-center gap-1.5 pb-1">
                  <Zap size={11} className="text-sky" />
                  <span>Activities ({groupedNodes.activity.length})</span>
                </p>
                <div className="space-y-0.5">
                  {groupedNodes.activity.map((node) => (
                    <button
                      key={node.id}
                      onClick={() => choose(node)}
                      className={cn(
                        'w-full flex items-center justify-between rounded-xl px-2.5 py-1.5 text-left text-xs transition',
                        selected?.id === node.id
                          ? 'bg-sky/15 text-sky border border-sky/30 font-medium'
                          : 'text-dim hover:bg-white/5 hover:text-ink',
                      )}
                    >
                      <span className="truncate">{node.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Media Assets / Photos */}
            {groupedNodes.media.length > 0 && (
              <div>
                <p className="px-2 font-mono text-[10px] uppercase tracking-wider text-faint flex items-center gap-1.5 pb-1">
                  <Images size={11} className="text-mint" />
                  <span>Photos in Graph ({groupedNodes.media.length})</span>
                </p>
                <div className="space-y-0.5">
                  {groupedNodes.media.map((node) => (
                    <button
                      key={node.id}
                      onClick={() => choose(node)}
                      className={cn(
                        'w-full flex items-center gap-2 rounded-xl px-2 py-1 text-left text-xs transition',
                        selected?.id === node.id
                          ? 'bg-mint/15 text-mint border border-mint/30 font-medium'
                          : 'text-dim hover:bg-white/5 hover:text-ink',
                      )}
                    >
                      {node.imageUrl ? (
                        <img
                          src={node.imageUrl}
                          alt=""
                          className="h-6 w-8 rounded object-cover border border-white/10 shrink-0"
                        />
                      ) : (
                        <div className="h-6 w-8 rounded bg-elev border border-white/10 shrink-0" />
                      )}
                      <span className="truncate font-mono text-[11px]">{node.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. CENTER: 3D GRAPH CANVAS + FLOATING CONTROLS */}
      <div className="relative h-full w-full overflow-hidden bg-bg">
        {/* Floating Top Controls Bar */}
        <div className="absolute top-4 inset-x-4 z-20 pointer-events-none flex flex-wrap items-center justify-between gap-3">
          {/* Left quick actions */}
          <div className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-white/10 bg-bg/85 p-1.5 backdrop-blur-xl shadow-xl">
            {isFullscreen && (
              <button
                onClick={() => setShowIndex((prev) => !prev)}
                className={cn(
                  'flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs transition',
                  showIndex ? 'bg-mint text-bg font-medium' : 'text-dim hover:text-ink',
                )}
                title="Toggle Index Drawer"
              >
                <Layers size={13} />
                <span>Index</span>
              </button>
            )}

            <button
              onClick={() => graphRef.current?.zoom(1)}
              title="Zoom In"
              className="grid h-8 w-8 place-items-center rounded-xl text-dim hover:bg-white/10 hover:text-ink transition"
            >
              <Plus size={15} />
            </button>
            <button
              onClick={() => graphRef.current?.zoom(-1)}
              title="Zoom Out"
              className="grid h-8 w-8 place-items-center rounded-xl text-dim hover:bg-white/10 hover:text-ink transition"
            >
              <Minus size={15} />
            </button>
            <button
              onClick={() => graphRef.current?.zoomToFit()}
              title="Reset View"
              className="flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs text-dim hover:bg-white/10 hover:text-ink transition"
            >
              <RotateCcw size={12} />
              <span>Reset</span>
            </button>
          </div>

          {/* Center / Right controls */}
          <div className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-white/10 bg-bg/85 p-1.5 backdrop-blur-xl shadow-xl">
            {/* Photos in 3D Graph Toggle */}
            <button
              onClick={() => workspace.patch({ showMedia: !workspace.showMedia })}
              className={cn(
                'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition',
                workspace.showMedia
                  ? 'bg-mint text-bg shadow-md shadow-mint/20'
                  : 'border border-line text-dim hover:text-ink hover:border-mint/40',
              )}
              title="Toggle Photos in 3D Scene"
            >
              <Camera size={13} />
              <span>Photos ({totalMediaInGraph})</span>
            </button>

            {/* Labels toggle */}
            <button
              onClick={() => workspace.patch({ showLabels: !workspace.showLabels })}
              className={cn(
                'flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs transition',
                workspace.showLabels ? 'text-mint' : 'text-dim hover:text-ink',
              )}
              title="Toggle Text Labels"
            >
              <Tag size={13} />
              <span>Labels</span>
            </button>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className={cn(
                'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition',
                isFullscreen ? 'bg-amber text-bg' : 'border border-line text-dim hover:text-ink hover:border-dim',
              )}
              title={isFullscreen ? 'Exit Full Screen' : 'Enter Full Screen'}
            >
              {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              <span>{isFullscreen ? 'Exit' : 'Full Screen'}</span>
            </button>
          </div>
        </div>

        {/* Floating Legend Badge at Bottom Left */}
        <div className="pointer-events-none absolute bottom-4 left-4 z-10 max-w-sm rounded-2xl border border-white/10 bg-bg/80 p-3 text-xs text-dim backdrop-blur-md shadow-xl">
          <div className="flex items-center justify-between pb-1.5 border-b border-line/60">
            <span className="font-mono text-[10px] uppercase tracking-wider text-faint">3D Graph Topology</span>
            <span className="font-mono text-[10px] text-mint">Interactive Three.js</span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
            {LEGEND.slice(0, 6).map((item) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-ink">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 3D Force Graph Render Canvas */}
        {graph.data ? (
          <EvidenceGraph
            ref={graphRef}
            data={graph.data}
            showLabels={workspace.showLabels}
            selectedId={workspace.selectedNodeId}
            highlight={highlight}
            onNode={choose}
            onLink={(item: GraphLink) => workspace.setSelectedLink(item.id)}
            onDouble={(node) => {
              if (node.type === 'project') {
                workspace.patch({ projectId: node.id, showMedia: true })
                workspace.toast(`Expanded ${node.label} media cluster`)
              }
            }}
          />
        ) : (
          <div className="grid h-full place-items-center text-dim font-mono text-xs uppercase tracking-wider">
            Building 3D Evidence Mesh…
          </div>
        )}
      </div>

      {/* 3. RIGHT PANEL: RICH NODE & COLLECTION INSPECTOR */}
      <aside
        className={cn(
          'flex flex-col border-l border-line bg-elev/60 backdrop-blur z-20 overflow-hidden',
          isFullscreen && selected && 'absolute right-0 inset-y-0 w-96 shadow-2xl bg-elev/95 border-l border-white/15',
          isFullscreen && !selected && 'hidden',
        )}
      >
        {/* Inspector Header */}
        <div className="flex items-center justify-between p-4 border-b border-line">
          <div>
            <Eyebrow>Node Inspector</Eyebrow>
            <p className="font-mono text-[10px] text-faint mt-0.5">
              {selected ? `${titleCase(selected.type)} Record` : 'Select node or edge'}
            </p>
          </div>

          {selected && (
            <button
              onClick={() => workspace.setSelectedNode(null)}
              className="grid h-7 w-7 place-items-center rounded-lg text-dim hover:bg-white/5 hover:text-ink transition"
              title="Close Inspector"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-auto p-4 space-y-5">
          {/* A. If a Link/Edge is selected */}
          {link && (
            <div className="rounded-2xl border border-mint/30 bg-mint/5 p-4 space-y-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-mint">Edge Relation</span>
              <h3 className="font-serif text-2xl text-ink">{titleCase(link.relation)}</h3>
              <p className="font-mono text-xs text-faint">Confidence: {Math.round((link.confidence || 0.8) * 100)}%</p>
              <div className="mt-2 space-y-1">
                <span className="font-mono text-[10px] text-dim uppercase">Why Connected:</span>
                <ul className="list-disc pl-4 text-xs text-dim space-y-1">
                  {link.why.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* B. If a PROJECT Node is selected (FOLDER OF PHOTOS) */}
          {selected && selected.type === 'project' && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2">
                  <Pill tone="mint">Project Folder</Pill>
                  <span className="font-mono text-[10px] text-faint">{selected.id}</span>
                </div>
                <h2 className="mt-2 font-serif text-3xl text-ink leading-tight">{selected.label}</h2>
                {selectedProject && (
                  <p className="mt-2 text-xs leading-relaxed text-dim">{selectedProject.description}</p>
                )}
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  variant="solid"
                  onClick={() => {
                    workspace.patch({ projectId: selected.id, showMedia: true })
                    workspace.toast(`Filtered graph to ${selected.label}`)
                  }}
                  className="text-xs py-1.5"
                >
                  <Camera size={12} />
                  <span>Show All Photos in 3D</span>
                </Button>
                <Link
                  to={`/app/projects/${selected.id}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line bg-elev/60 px-3 py-1.5 text-xs text-dim hover:text-ink hover:border-dim transition"
                >
                  <span>Project Page</span>
                  <ExternalLink size={11} />
                </Link>
              </div>

              {/* Collection Photos Gallery */}
              <div className="pt-3 border-t border-line">
                <div className="flex items-center justify-between pb-2">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-faint">
                    Photos in this Collection ({selectedProjectMedia.length})
                  </span>
                  <span className="font-mono text-[10px] text-mint">Verified</span>
                </div>

                {selectedProjectMedia.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2.5">
                    {selectedProjectMedia.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          workspace.setSelectedNode(item.id)
                          graphRef.current?.flyTo(item.id)
                        }}
                        className="group overflow-hidden rounded-xl border border-line bg-elev/40 p-1.5 text-left transition hover:border-mint/50"
                      >
                        <img
                          src={item.secureUrl}
                          alt={item.altText || ''}
                          className="aspect-[4/3] w-full rounded-lg object-cover transition-transform group-hover:scale-105"
                        />
                        <p className="mt-1.5 truncate font-mono text-[10px] text-dim">{item.filename}</p>
                        <p className="truncate text-[10px] text-faint">{item.caption || 'Field frame'}</p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-dim italic">No photos directly tagged to this project yet.</p>
                )}
              </div>
            </div>
          )}

          {/* C. If a MEDIA ASSET Node is selected */}
          {selected && selected.type === 'media' && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2">
                  <Pill tone="mint">Verified Field Asset</Pill>
                  <span className="font-mono text-[10px] text-faint">{selected.id}</span>
                </div>
                <h2 className="mt-2 font-mono text-sm font-semibold text-ink truncate">{selected.label}</h2>
              </div>

              {/* High-res Image Preview */}
              {selected.imageUrl && (
                <div className="overflow-hidden rounded-2xl border border-line bg-black">
                  <img src={selected.imageUrl} alt="" className="aspect-[16/10] w-full object-cover" />
                </div>
              )}

              {/* Caption */}
              {selected.metadata?.caption && (
                <p className="text-xs text-dim italic border-l-2 border-mint/40 pl-3 leading-relaxed">
                  "{selected.metadata.caption}"
                </p>
              )}

              {/* Location HUD */}
              {selected.metadata?.latitude && selected.metadata?.longitude && (
                <div className="rounded-xl border border-line/60 bg-elev2/50 p-2.5 space-y-1">
                  <span className="font-mono text-[10px] uppercase text-faint flex items-center gap-1">
                    <MapPin size={11} className="text-amber" />
                    <span>EXIF GPS Coordinates</span>
                  </span>
                  <p className="font-mono text-xs text-amber">
                    {selected.metadata.latitude.toFixed(4)}° N, {selected.metadata.longitude.toFixed(4)}° E
                  </p>
                  {selected.metadata.city && (
                    <p className="text-xs text-dim">{selected.metadata.city}</p>
                  )}
                </div>
              )}

              {/* Full Evidence Drawer Integration */}
              {mediaDetail.data && (
                <div className="pt-2">
                  <Link
                    to={`/app/evidence/${selected.id}`}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-mint px-3 py-2 text-xs font-semibold text-bg hover:bg-[#7ff3cd] transition"
                  >
                    <span>Inspect Complete Forensic Lineage</span>
                    <ExternalLink size={12} />
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* D. If a LOCATION Node is selected */}
          {selected && selected.type === 'location' && (
            <div className="space-y-4">
              <div>
                <Pill tone="amber">Location Diamond</Pill>
                <h2 className="mt-2 font-serif text-3xl text-ink">{selected.label}</h2>
              </div>

              {selected.metadata?.latitude && selected.metadata?.longitude && (
                <div className="rounded-xl border border-line bg-elev/60 p-3">
                  <span className="font-mono text-[10px] text-faint">Centroid</span>
                  <p className="font-mono text-sm text-amber mt-1">
                    {selected.metadata.latitude.toFixed(4)}° N, {selected.metadata.longitude.toFixed(4)}° E
                  </p>
                </div>
              )}

              <Link
                to={`/app/map?focus=${selected.id}`}
                className="inline-flex items-center gap-1.5 text-xs text-mint hover:underline font-medium"
              >
                <span>Fly to this pin on Interactive Map</span>
                <ExternalLink size={12} />
              </Link>

              {/* Photos at this location */}
              <div className="pt-3 border-t border-line">
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
                      className="group overflow-hidden rounded-xl border border-line bg-elev/40 p-1 text-left hover:border-mint/50"
                    >
                      <img
                        src={item.secureUrl}
                        alt=""
                        className="aspect-[4/3] w-full rounded-lg object-cover group-hover:scale-105 transition"
                      />
                      <p className="mt-1 truncate font-mono text-[10px] text-dim">{item.filename}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* E. If an ACTIVITY Node is selected */}
          {selected && selected.type === 'activity' && (
            <div className="space-y-4">
              <div>
                <Pill tone="sky">Sustainability Activity</Pill>
                <h2 className="mt-2 font-serif text-3xl text-ink">{selected.label}</h2>
              </div>

              {/* Photos showing this activity */}
              <div className="pt-3 border-t border-line">
                <span className="font-mono text-[10px] uppercase tracking-wider text-faint block pb-2">
                  Photos Showing This Activity ({selectedActivityMedia.length})
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {selectedActivityMedia.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        workspace.setSelectedNode(item.id)
                        graphRef.current?.flyTo(item.id)
                      }}
                      className="group overflow-hidden rounded-xl border border-line bg-elev/40 p-1 text-left hover:border-mint/50"
                    >
                      <img
                        src={item.secureUrl}
                        alt=""
                        className="aspect-[4/3] w-full rounded-lg object-cover group-hover:scale-105 transition"
                      />
                      <p className="mt-1 truncate font-mono text-[10px] text-dim">{item.filename}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* F. Unselect / Empty State */}
          {!selected && !link && (
            <div className="py-10 text-center space-y-3">
              <Share2 size={28} className="mx-auto text-faint" />
              <h3 className="font-serif text-xl text-ink">Explore the Mesh</h3>
              <p className="text-xs text-dim leading-relaxed max-w-xs mx-auto">
                Click any node in the 3D scene or Node Index to inspect its photos, forensic provenance, and relational
                connections.
              </p>
            </div>
          )}
        </div>

        {/* Global Topology Stats at Footer */}
        <div className="p-3 border-t border-line flex items-center justify-between text-[11px] font-mono text-faint">
          <span>{graph.data?.stats.nodes || 0} nodes</span>
          <span>{graph.data?.stats.links || 0} edges</span>
          <span>{totalMediaInGraph} photos</span>
        </div>
      </aside>
    </div>
  )
}
