import { X, Layers, Check } from 'lucide-react'
import { Eyebrow, cn } from './ui'

export interface LayerVisibility {
  projects: boolean
  media: boolean
  locations: boolean
  activities: boolean
  reports: boolean
  evidence: boolean
  organizations: boolean
}

interface CanvasLayersProps {
  layers: LayerVisibility
  onChange: (layers: LayerVisibility) => void
  onClose: () => void
  className?: string
}

export function CanvasLayers({ layers, onChange, onClose, className }: CanvasLayersProps) {
  const items = [
    { key: 'projects' as const, label: 'Projects', color: '#5ee0b5', count: 'Nucleus' },
    { key: 'media' as const, label: 'Media Assets', color: '#5ee0b5', count: 'Thumbnails' },
    { key: 'locations' as const, label: 'Locations', color: '#e4b15a', count: 'GPS Centroids' },
    { key: 'activities' as const, label: 'Activities', color: '#8eb7ff', count: 'Actions' },
    { key: 'reports' as const, label: 'Reports', color: '#f0d7b0', count: 'Briefs' },
    { key: 'evidence' as const, label: 'Evidence Sets', color: '#7ddec8', count: 'Verified' },
    { key: 'organizations' as const, label: 'Organizations', color: '#f4f0e6', count: 'Entities' },
  ]

  function toggle(key: keyof LayerVisibility) {
    onChange({
      ...layers,
      [key]: !layers[key],
    })
  }

  function setAll(val: boolean) {
    onChange({
      projects: val,
      media: val,
      locations: val,
      activities: val,
      reports: val,
      evidence: val,
      organizations: val,
    })
  }

  return (
    <div
      className={cn(
        'w-64 rounded-2xl border border-white/15 bg-elev/95 p-4 shadow-2xl backdrop-blur-2xl animate-in fade-in zoom-in-95',
        className,
      )}
    >
      <div className="flex items-center justify-between pb-2.5 border-b border-line">
        <div className="flex items-center gap-2">
          <Layers size={14} className="text-mint" />
          <Eyebrow>Canvas Layers</Eyebrow>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1 text-dim hover:bg-white/5 hover:text-ink transition"
          title="Close layers"
        >
          <X size={14} />
        </button>
      </div>

      <div className="mt-3 space-y-1.5">
        {items.map((item) => {
          const active = layers[item.key]
          return (
            <button
              key={item.key}
              onClick={() => toggle(item.key)}
              className={cn(
                'w-full flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs transition',
                active ? 'bg-white/5 text-ink' : 'text-faint hover:text-dim hover:bg-white/5',
              )}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    'flex h-4 w-4 items-center justify-center rounded-md border text-[10px] transition',
                    active ? 'border-mint bg-mint text-bg font-bold' : 'border-line bg-transparent',
                  )}
                >
                  {active && <Check size={11} strokeWidth={3} />}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span>{item.label}</span>
                </span>
              </div>
              <span className="font-mono text-[9px] text-faint">{item.count}</span>
            </button>
          )
        })}
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-line/60 pt-2 text-[10px] font-mono">
        <button
          onClick={() => setAll(true)}
          className="text-dim hover:text-mint transition"
        >
          Show All
        </button>
        <button
          onClick={() => setAll(false)}
          className="text-dim hover:text-rose transition"
        >
          Hide All
        </button>
      </div>
    </div>
  )
}
