import { useEffect, useMemo, useState } from 'react'
import {
  Columns2,
  Compass,
  FileText,
  Folder,
  Images,
  Layers,
  PanelLeft,
  PanelLeftClose,
  Plus,
  Search,
  Share2,
  ShieldCheck,
  Upload,
  Zap,
} from 'lucide-react'
import { cn } from './ui'

export interface RadialMenuProps {
  onCanvas?: () => void
  onProjects?: () => void
  onEvidence?: () => void
  onMap?: () => void
  onCompare?: () => void
  onReport?: () => void
  onReview?: () => void
  onUpload?: () => void
  onCloudinaryLab?: () => void
  onSearch?: () => void
  onLayers?: () => void
  onToggleSidebar?: () => void
  activeOverlay?: 'none' | 'map' | 'compare' | 'report' | 'upload' | 'cld-lab'
  pendingReviews?: number
  railCollapsed?: boolean
  className?: string
}

interface DialItem {
  id: string
  label: string
  subtitle: string
  icon: any
  color: string
  bgGlow: string
  angle: number // degrees (0 = East/Right, 90 = North/Up)
  radius: number // distance in px from center
  isActive: boolean
  badge: string
  badgeTone?: 'mint' | 'amber' | 'sky' | 'warm' | 'amberPulse' | 'neutral'
  tier: 'outer' | 'inner'
  onClick?: () => void
}

export function RadialMenu({
  onCanvas,
  onProjects,
  onEvidence,
  onMap,
  onCompare,
  onReport,
  onReview,
  onUpload,
  onCloudinaryLab,
  onSearch,
  onLayers,
  onToggleSidebar,
  activeOverlay = 'none',
  pendingReviews = 0,
  railCollapsed = true,
  className,
}: RadialMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  function handleAction(action?: () => void) {
    if (action) {
      action()
      setIsOpen(false)
    }
  }

  // Radii for quadrant arcs
  const R_OUTER = 180
  const R_INNER = 108

  // The Primary Radial Options (Distributed across the 0° -> 90° first quadrant)
  const items: DialItem[] = useMemo(() => [
    // Outer Arc: Primary Navigation (0° to 90°)
    {
      id: 'canvas',
      label: 'Evidence Canvas',
      subtitle: '3D topological graph & cluster mesh',
      icon: Share2,
      color: '#5ee0b5',
      bgGlow: 'text-mint border-mint/40 bg-mint/15 shadow-[0_0_15px_rgba(94,224,181,0.3)]',
      angle: 0,
      radius: R_OUTER,
      isActive: activeOverlay === 'none',
      badge: activeOverlay === 'none' ? 'Active' : '3D Mesh',
      badgeTone: activeOverlay === 'none' ? 'mint' : 'neutral',
      tier: 'outer',
      onClick: onCanvas,
    },
    {
      id: 'projects',
      label: 'Projects',
      subtitle: 'Field portfolios, initiatives & sites',
      icon: Folder,
      color: '#8eb7ff',
      bgGlow: 'text-sky border-sky/40 bg-sky/15 shadow-[0_0_15px_rgba(142,183,255,0.3)]',
      angle: 15,
      radius: R_OUTER,
      isActive: false,
      badge: 'Portfolio',
      badgeTone: 'neutral',
      tier: 'outer',
      onClick: onProjects,
    },
    {
      id: 'evidence',
      label: 'Evidence',
      subtitle: 'Verified field media & forensic pHash sets',
      icon: Images,
      color: '#5ee0b5',
      bgGlow: 'text-mint border-mint/40 bg-mint/15 shadow-[0_0_15px_rgba(94,224,181,0.3)]',
      angle: 30,
      radius: R_OUTER,
      isActive: false,
      badge: 'Forensics',
      badgeTone: 'neutral',
      tier: 'outer',
      onClick: onEvidence,
    },
    {
      id: 'map',
      label: 'Map Layer',
      subtitle: 'Spatial GPS clusters & terrain telemetry',
      icon: Compass,
      color: '#e4b15a',
      bgGlow: 'text-amber border-amber/40 bg-amber/15 shadow-[0_0_15px_rgba(228,177,90,0.3)]',
      angle: 45,
      radius: R_OUTER,
      isActive: activeOverlay === 'map',
      badge: activeOverlay === 'map' ? 'Active Layer' : 'GIS Overlay',
      badgeTone: activeOverlay === 'map' ? 'amber' : 'neutral',
      tier: 'outer',
      onClick: onMap,
    },
    {
      id: 'compare',
      label: 'Compare Lab',
      subtitle: 'Before / after visual diff inspection',
      icon: Columns2,
      color: '#8eb7ff',
      bgGlow: 'text-sky border-sky/40 bg-sky/15 shadow-[0_0_15px_rgba(142,183,255,0.3)]',
      angle: 60,
      radius: R_OUTER,
      isActive: activeOverlay === 'compare',
      badge: activeOverlay === 'compare' ? 'Active Lab' : 'Diff Slider',
      badgeTone: activeOverlay === 'compare' ? 'sky' : 'neutral',
      tier: 'outer',
      onClick: onCompare,
    },
    {
      id: 'report',
      label: 'Reports',
      subtitle: 'Traceable impact briefs & verifiable exports',
      icon: FileText,
      color: '#f0d7b0',
      bgGlow: 'text-[#f0d7b0] border-[#f0d7b0]/40 bg-[#f0d7b0]/15 shadow-[0_0_15px_rgba(240,215,176,0.3)]',
      angle: 75,
      radius: R_OUTER,
      isActive: activeOverlay === 'report',
      badge: activeOverlay === 'report' ? 'Active Report' : 'Synthesis',
      badgeTone: activeOverlay === 'report' ? 'warm' : 'neutral',
      tier: 'outer',
      onClick: onReport,
    },
    {
      id: 'review',
      label: 'Review Queue',
      subtitle: 'AI policy classifications awaiting verification',
      icon: ShieldCheck,
      color: '#f59e0b',
      bgGlow: 'text-amber border-amber/50 bg-amber/20 shadow-[0_0_20px_rgba(245,158,11,0.4)]',
      angle: 90,
      radius: R_OUTER,
      isActive: false,
      badge: pendingReviews > 0 ? `${pendingReviews} Pending` : 'Verified',
      badgeTone: pendingReviews > 0 ? 'amberPulse' : 'neutral',
      tier: 'outer',
      onClick: onReview,
    },

    // Inner Arc: Quick Tools & Satellite Actions (12°, 38°, 64°, 88°)
    {
      id: 'upload',
      label: 'Upload Media',
      subtitle: 'Drag & drop field assets directly into AI pipeline',
      icon: Upload,
      color: '#5ee0b5',
      bgGlow: 'text-mint border-mint/30 bg-mint/10 shadow-[0_0_12px_rgba(94,224,181,0.25)]',
      angle: 12,
      radius: R_INNER,
      isActive: false,
      badge: 'Dropzone',
      badgeTone: 'mint',
      tier: 'inner',
      onClick: onUpload,
    },
    {
      id: 'cld-lab',
      label: 'Cloudinary AI Lab',
      subtitle: 'Dynamic edge restoration & watermark transforms',
      icon: Zap,
      color: '#5ee0b5',
      bgGlow: 'text-mint border-mint/50 bg-mint/20 shadow-[0_0_18px_rgba(94,224,181,0.4)]',
      angle: 38,
      radius: R_INNER,
      isActive: activeOverlay === 'cld-lab',
      badge: 'Edge AI v2',
      badgeTone: 'mint',
      tier: 'inner',
      onClick: onCloudinaryLab,
    },
    {
      id: 'search',
      label: 'Semantic Search',
      subtitle: 'Query evidence records by filename, tag, or context',
      icon: Search,
      color: '#8eb7ff',
      bgGlow: 'text-sky border-sky/30 bg-sky/10 shadow-[0_0_12px_rgba(142,183,255,0.25)]',
      angle: 64,
      radius: R_INNER,
      isActive: false,
      badge: 'Ctrl+K',
      badgeTone: 'sky',
      tier: 'inner',
      onClick: onSearch,
    },
    {
      id: 'layers',
      label: 'Canvas Layers',
      subtitle: 'Toggle visibility of media, projects, & claims',
      icon: Layers,
      color: '#f0d7b0',
      bgGlow: 'text-[#f0d7b0] border-[#f0d7b0]/30 bg-[#f0d7b0]/10 shadow-[0_0_12px_rgba(240,215,176,0.25)]',
      angle: 88,
      radius: R_INNER,
      isActive: false,
      badge: 'Filter',
      badgeTone: 'warm',
      tier: 'inner',
      onClick: onLayers,
    },
  ], [activeOverlay, onCanvas, onProjects, onEvidence, onMap, onCompare, onReport, onReview, onUpload, onCloudinaryLab, onSearch, onLayers, pendingReviews])

  // Active or hovered item for the central HUD readout
  const activeHovered = items.find((i) => i.id === hoveredId) || items.find((i) => i.isActive) || items[0]

  return (
    <div className={cn('relative select-none', className)}>
      {/* Dimmed backdrop to click outside */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-black/45 backdrop-blur-xs transition-opacity duration-200"
          aria-hidden="true"
        />
      )}

      {/* ========================================================= */}
      {/* RADIAL DIAL QUADRANT SYSTEM (0° to 90° Upper-Right Arc)  */}
      {/* ========================================================= */}
      {isOpen && (
        <div className="absolute bottom-6 left-6 z-50 pointer-events-auto">
          {/* 1. Holographic SVG Background Radar / Quadrant Arc Guides */}
          <svg
            className="absolute -bottom-6 -left-6 pointer-events-none overflow-visible animate-in fade-in duration-300"
            width={R_OUTER + 80}
            height={R_OUTER + 80}
            style={{ width: `${R_OUTER + 80}px`, height: `${R_OUTER + 80}px` }}
          >
            <defs>
              <linearGradient id="quadrantGlow" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#5ee0b5" stopOpacity="0.18" />
                <stop offset="60%" stopColor="#8eb7ff" stopOpacity="0.08" />
                <stop offset="100%" stopColor="transparent" stopOpacity="0" />
              </linearGradient>
              <radialGradient id="centerCoreGlow" cx="0%" cy="100%" r="100%">
                <stop offset="0%" stopColor="#5ee0b5" stopOpacity="0.35" />
                <stop offset="50%" stopColor="#5ee0b5" stopOpacity="0.08" />
                <stop offset="100%" stopColor="transparent" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Quadrant Fan Arc Fill */}
            <path
              d={`M 24 24 L ${24 + R_OUTER + 35} 24 A ${R_OUTER + 35} ${R_OUTER + 35} 0 0 0 24 ${24 - R_OUTER - 35} Z`}
              fill="url(#quadrantGlow)"
              transform={`translate(0, ${R_OUTER + 40})`}
            />

            {/* Inverted Coordinate System for SVG: Origin at (24, R_OUTER + 40) */}
            <g transform={`translate(24, ${R_OUTER + 40})`}>
              {/* Outer Arc Guide */}
              <path
                d={`M ${R_OUTER} 0 A ${R_OUTER} ${R_OUTER} 0 0 0 0 ${-R_OUTER}`}
                fill="none"
                stroke="rgba(255, 255, 255, 0.16)"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />

              {/* Inner Arc Guide */}
              <path
                d={`M ${R_INNER} 0 A ${R_INNER} ${R_INNER} 0 0 0 0 ${-R_INNER}`}
                fill="none"
                stroke="rgba(94, 224, 181, 0.28)"
                strokeWidth="1.5"
                strokeDasharray="2 3"
              />

              {/* Outer Perimeter Highlight Rim */}
              <path
                d={`M ${R_OUTER + 25} 0 A ${R_OUTER + 25} ${R_OUTER + 25} 0 0 0 0 ${-(R_OUTER + 25)}`}
                fill="none"
                stroke="rgba(94, 224, 181, 0.15)"
                strokeWidth="1"
              />

              {/* Radial Spokes connecting Origin to Nodes */}
              {[0, 15, 30, 45, 60, 75, 90].map((deg) => {
                const rad = (deg * Math.PI) / 180
                const x2 = (R_OUTER + 20) * Math.cos(rad)
                const y2 = -(R_OUTER + 20) * Math.sin(rad)
                return (
                  <line
                    key={deg}
                    x1="0"
                    y1="0"
                    x2={x2}
                    y2={y2}
                    stroke="rgba(255, 255, 255, 0.08)"
                    strokeWidth="1"
                  />
                )
              })}

              {/* Degree Micro Labels */}
              <text x={R_OUTER + 10} y="12" fill="rgba(94,224,181,0.5)" fontSize="9" fontFamily="monospace">0°</text>
              <text x={Math.cos(Math.PI / 4) * (R_OUTER + 10)} y={-Math.sin(Math.PI / 4) * (R_OUTER + 10) - 2} fill="rgba(94,224,181,0.5)" fontSize="9" fontFamily="monospace">45°</text>
              <text x="-15" y={-(R_OUTER + 10)} fill="rgba(94,224,181,0.5)" fontSize="9" fontFamily="monospace">90°</text>
            </g>
          </svg>

          {/* 2. Central HUD Readout Card (Floats beside the quadrant for crystal-clear readability) */}
          <div
            className={cn(
              'pointer-events-none absolute z-50 w-56 rounded-2xl border border-white/20 bg-zinc-950/95 p-3 shadow-2xl backdrop-blur-2xl',
              'transition-all duration-200 animate-in fade-in zoom-in-95',
            )}
            style={{
              left: `${R_OUTER + 35}px`,
              bottom: '10px',
            }}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full animate-ping"
                  style={{ backgroundColor: activeHovered.color }}
                />
                <span className="font-mono text-[9px] uppercase tracking-wider text-slate-400">
                  {activeHovered.tier === 'outer' ? 'Workspace Core' : 'Tool Satellite'}
                </span>
              </div>
              <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 font-mono text-[9px] font-semibold text-white">
                {activeHovered.badge}
              </span>
            </div>

            <div className="mt-2 flex items-center gap-2">
              <div
                className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border"
                style={{
                  color: activeHovered.color,
                  borderColor: `${activeHovered.color}40`,
                  backgroundColor: `${activeHovered.color}15`,
                }}
              >
                <activeHovered.icon size={15} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-white">{activeHovered.label}</p>
                <p className="text-[10px] text-dim line-clamp-1">{activeHovered.subtitle}</p>
              </div>
            </div>

            <div className="mt-2.5 flex items-center justify-between pt-1.5 border-t border-white/5 font-mono text-[9px] text-faint">
              <span>Quadrant Angle</span>
              <span className="text-mint">{activeHovered.angle}°</span>
            </div>
          </div>

          {/* 3. Orbiting Action Dial Buttons */}
          {items.map((item, idx) => {
            const rad = (item.angle * Math.PI) / 180
            const x = Math.round(item.radius * Math.cos(rad))
            const y = Math.round(-item.radius * Math.sin(rad))
            const isHovered = hoveredId === item.id
            const isOuter = item.tier === 'outer'

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleAction(item.onClick)}
                onMouseEnter={() => setHoveredId(item.id)}
                onMouseLeave={() => setHoveredId(null)}
                title={`${item.label} (${item.badge})`}
                style={{
                  transform: `translate(${x}px, ${y}px)`,
                  transitionDelay: `${idx * 22}ms`,
                }}
                className={cn(
                  'group absolute -bottom-5 -left-5 flex items-center justify-center rounded-full border transition-all duration-300 ease-out',
                  'shadow-2xl backdrop-blur-2xl animate-in zoom-in-50',
                  isOuter ? 'h-11 w-11' : 'h-8.5 w-8.5',
                  item.isActive
                    ? 'border-mint bg-mint/25 text-mint shadow-[0_0_20px_rgba(94,224,181,0.55)] scale-110 z-30'
                    : 'border-white/20 bg-zinc-950/90 text-slate-300 hover:border-white/50 hover:bg-zinc-900 hover:text-white hover:scale-115 hover:z-30',
                  isHovered && 'scale-120 z-40 border-mint shadow-[0_0_22px_rgba(94,224,181,0.5)]',
                )}
              >
                {/* Ambient glow backing */}
                <span
                  className="pointer-events-none absolute inset-0 rounded-full opacity-0 group-hover:opacity-40 transition-opacity duration-300 blur-sm"
                  style={{ backgroundColor: item.color }}
                />

                {/* Node Icon */}
                <item.icon
                  size={isOuter ? 17 : 13}
                  className="relative z-10 transition-transform duration-200 group-hover:scale-110"
                  style={{ color: item.isActive || isHovered ? item.color : undefined }}
                />

                {/* Notification Badge Pip on Review Queue */}
                {item.id === 'review' && pendingReviews > 0 && (
                  <span className="absolute -top-1 -right-1 z-20 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber px-1 font-mono text-[9px] font-black text-slate-950 shadow-[0_0_8px_rgba(245,158,11,0.8)] animate-pulse">
                    {pendingReviews}
                  </span>
                )}

                {/* Active Indicator dot */}
                {item.isActive && (
                  <span className="absolute -bottom-0.5 h-1.5 w-1.5 rounded-full bg-mint shadow-[0_0_6px_#5ee0b5]" />
                )}
              </button>
            )
          })}

          {/* Quick Sidebar Dock toggle satellite button at 105° position */}
          {onToggleSidebar && (
            <button
              type="button"
              onClick={() => handleAction(onToggleSidebar)}
              onMouseEnter={() => setHoveredId('dock')}
              onMouseLeave={() => setHoveredId(null)}
              title={railCollapsed ? 'Dock Full Sidebar' : 'Collapse Sidebar'}
              style={{
                transform: `translate(${Math.round(R_INNER * Math.cos((100 * Math.PI) / 180))}px, ${Math.round(-R_INNER * Math.sin((100 * Math.PI) / 180))}px)`,
              }}
              className="group absolute -bottom-5 -left-5 flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-zinc-950/90 text-slate-400 hover:text-mint hover:border-mint/50 hover:scale-115 transition-all shadow-xl backdrop-blur-xl"
            >
              {railCollapsed ? <PanelLeft size={12} /> : <PanelLeftClose size={12} />}
            </button>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* Central Floating Action Trigger Button (+)                */}
      {/* ========================================================= */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        title={isOpen ? 'Close Radial Dial (Esc)' : 'Open Radial Dial Quadrant (+)'}
        aria-label="Workspace Radial Menu"
        className={cn(
          'group relative flex h-12 w-12 items-center justify-center rounded-full border transition-all duration-300 shadow-2xl backdrop-blur-xl',
          isOpen
            ? 'border-mint bg-mint/25 text-mint rotate-45 scale-105 shadow-[0_0_30px_rgba(94,224,181,0.6)]'
            : 'border-white/25 bg-zinc-950/95 text-ink hover:scale-110 hover:border-mint/60 hover:shadow-[0_0_24px_rgba(94,224,181,0.35)]',
        )}
      >
        {/* Radiant Ambient Glow Shimmer */}
        <span className="pointer-events-none absolute -inset-1 rounded-full bg-gradient-to-r from-mint/40 via-sky/40 to-amber/40 opacity-40 blur-md group-hover:opacity-100 transition duration-500" />

        {/* Live Pending Reviews Notification Pip */}
        {!isOpen && pendingReviews > 0 && (
          <span
            className="absolute -top-1 -right-1 z-20 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber px-1 font-mono text-[10px] font-black text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.8)] animate-pulse"
            title={`${pendingReviews} pending reviews`}
          >
            {pendingReviews}
          </span>
        )}

        <Plus size={20} className="relative z-10 transition-transform duration-300" />
      </button>
    </div>
  )
}
