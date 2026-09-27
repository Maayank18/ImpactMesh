import { useState } from 'react'
import {
  Plus,
  Upload,
  Map,
  Columns2,
  FileText,
  Images,
  Layers,
  Search,
  X,
} from 'lucide-react'
import { cn } from './ui'

interface RadialTool {
  id: string
  label: string
  tooltip: string
  icon: typeof Plus
  color: string
  onClick: () => void
}

interface RadialMenuProps {
  onUpload: () => void
  onMap: () => void
  onCompare: () => void
  onReport: () => void
  onEvidence: () => void
  onSearch: () => void
  onLayers: () => void
  className?: string
}

export function RadialMenu({
  onUpload,
  onMap,
  onCompare,
  onReport,
  onEvidence,
  onSearch,
  onLayers,
  className,
}: RadialMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [hoveredTool, setHoveredTool] = useState<RadialTool | null>(null)

  const tools: RadialTool[] = [
    {
      id: 'upload',
      label: 'Upload',
      tooltip: 'Upload field media into evidence record',
      icon: Upload,
      color: '#5ee0b5',
      onClick: onUpload,
    },
    {
      id: 'map',
      label: 'Map',
      tooltip: 'Explore spatial GPS evidence on map',
      icon: Map,
      color: '#e4b15a',
      onClick: onMap,
    },
    {
      id: 'compare',
      label: 'Compare',
      tooltip: 'Compare before / after visual evidence',
      icon: Columns2,
      color: '#8eb7ff',
      onClick: onCompare,
    },
    {
      id: 'report',
      label: 'Report',
      tooltip: 'Generate traceable impact brief',
      icon: FileText,
      color: '#f0d7b0',
      onClick: onReport,
    },
    {
      id: 'evidence',
      label: 'Evidence',
      tooltip: 'Browse verified media & forensic sets',
      icon: Images,
      color: '#7ddec8',
      onClick: onEvidence,
    },
    {
      id: 'search',
      label: 'Search',
      tooltip: 'Search evidence, places, activities',
      icon: Search,
      color: '#f4f0e6',
      onClick: onSearch,
    },
    {
      id: 'layers',
      label: 'Layers',
      tooltip: 'Toggle graph visibility filters',
      icon: Layers,
      color: '#c4b5fd',
      onClick: onLayers,
    },
  ]

  // Compute radial layout angles
  // When expanded, fan tools upward and to the right into open canvas
  const radius = 100
  const startAngle = Math.PI * 0.52 // ~94 degrees (upward)
  const endAngle = 0.05 // ~3 degrees (rightward)
  const angleStep = (startAngle - endAngle) / (tools.length - 1)

  return (
    <div className={cn('relative flex items-center justify-center select-none', className)}>
      {/* Active tool tooltip */}
      {hoveredTool && isOpen && (
        <div className="pointer-events-none absolute bottom-16 left-12 z-50 mb-2 whitespace-nowrap rounded-xl border border-white/15 bg-elev/95 px-3 py-1.5 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95">
          <p className="font-mono text-xs font-semibold" style={{ color: hoveredTool.color }}>
            {hoveredTool.label}
          </p>
          <p className="text-[11px] text-dim">{hoveredTool.tooltip}</p>
        </div>
      )}

      {/* Radial action buttons */}
      {isOpen && (
        <div className="absolute inset-0 pointer-events-none">
          {tools.map((tool, idx) => {
            const angle = startAngle - idx * angleStep
            const x = Math.cos(angle) * radius
            const y = -Math.sin(angle) * radius

            return (
              <button
                key={tool.id}
                onClick={() => {
                  tool.onClick()
                  setIsOpen(false)
                }}
                onMouseEnter={() => setHoveredTool(tool)}
                onMouseLeave={() => setHoveredTool(null)}
                style={{
                  transform: `translate(${x}px, ${y}px)`,
                  transitionDelay: `${idx * 25}ms`,
                }}
                title={tool.tooltip}
                aria-label={tool.label}
                className="pointer-events-auto absolute left-1/2 top-1/2 -ml-5 -mt-5 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-elev/90 text-ink shadow-2xl backdrop-blur-xl transition-all duration-300 hover:scale-125 hover:border-mint hover:bg-elev2"
              >
                <tool.icon size={17} style={{ color: tool.color }} />
              </button>
            )
          })}
        </div>
      )}

      {/* Central Command Trigger */}
      <button
        onClick={() => {
          setIsOpen((prev) => !prev)
          setHoveredTool(null)
        }}
        title={isOpen ? 'Close Radial Command' : 'Open Evidence Workspace Tools'}
        aria-label="Workspace Tools Radial Menu"
        className={cn(
          'group relative flex h-12 w-12 items-center justify-center rounded-full border transition-all duration-300 shadow-2xl backdrop-blur-xl',
          isOpen
            ? 'border-mint/60 bg-mint/20 text-mint rotate-45 scale-110 shadow-[0_0_24px_rgba(94,224,181,0.4)]'
            : 'border-white/20 bg-elev/90 text-ink hover:scale-110 hover:border-mint/60 hover:shadow-[0_0_18px_rgba(94,224,181,0.25)]',
        )}
      >
        <span className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-mint/20 via-sky/20 to-amber/20 opacity-0 blur group-hover:opacity-100 transition duration-500" />
        <Plus size={20} className="relative z-10 transition-transform duration-300" />
      </button>
    </div>
  )
}
