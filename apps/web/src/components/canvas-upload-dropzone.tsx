import { useState } from 'react'
import {
  Upload,
  CheckCircle2,
  Clock,
  Sparkles,
  MapPin,
  Folder,
  ShieldCheck,
  X,
  ArrowRight,
  Loader2,
} from 'lucide-react'
import { Button, Eyebrow, Pill, cn } from './ui'
import type { MediaAsset } from '@impactmesh/shared-types'

export interface UploadBatchItem {
  id: string
  file: File
  filename: string
  previewUrl: string
  progress: number
  stage: 'uploading' | 'cloudinary' | 'ai' | 'location' | 'ready' | 'review' | 'failed'
  statusText: string
  suggestedProject?: string
  suggestedLocation?: string
  confidence?: number
  reviewed?: boolean
}

interface CanvasUploadDropzoneProps {
  batch: UploadBatchItem[]
  onApproveAll: () => void
  onReviewIndividual: (item: UploadBatchItem) => void
  onDismiss: () => void
  onClearItem: (id: string) => void
}

export function CanvasUploadDropzone({
  batch,
  onApproveAll,
  onReviewIndividual,
  onDismiss,
  onClearItem,
}: CanvasUploadDropzoneProps) {
  if (batch.length === 0) return null

  const readyCount = batch.filter((item) => item.stage === 'ready' || item.stage === 'review').length
  const processingCount = batch.filter((item) => item.stage !== 'ready' && item.stage !== 'review' && item.stage !== 'failed').length

  return (
    <div className="w-[420px] max-w-[calc(100vw-32px)] overflow-hidden rounded-3xl border border-white/20 bg-elev/95 shadow-2xl backdrop-blur-2xl animate-in fade-in slide-in-from-bottom-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-line p-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-mint animate-pulse" />
            <Eyebrow>Evidence Ingestion Stream</Eyebrow>
          </div>
          <h3 className="mt-1 font-serif text-xl text-ink">
            {batch.length} {batch.length === 1 ? 'Asset' : 'Assets'} Ingested
          </h3>
        </div>
        <button
          onClick={onDismiss}
          className="rounded-xl p-1.5 text-dim hover:bg-white/5 hover:text-ink transition"
          title="Minimize drawer"
        >
          <X size={15} />
        </button>
      </div>

      {/* Batch asset list */}
      <div className="max-h-72 overflow-y-auto p-3 space-y-2.5">
        {batch.map((item) => {
          const isDone = item.stage === 'ready' || item.stage === 'review'
          const isFailed = item.stage === 'failed'

          return (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-2.5 transition hover:bg-white/[0.04]"
            >
              <img
                src={item.previewUrl}
                alt={item.filename}
                className="h-14 w-14 rounded-xl object-cover border border-white/10 shrink-0"
              />

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <p className="truncate font-mono text-xs font-semibold text-ink">{item.filename}</p>
                  <span className="font-mono text-[10px] text-faint shrink-0">
                    {Math.round(item.progress)}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="my-1.5 h-1 w-full overflow-hidden rounded-full bg-line">
                  <div
                    className={cn(
                      'h-full transition-all duration-300',
                      isFailed ? 'bg-rose' : isDone ? 'bg-mint' : 'bg-gradient-to-r from-mint to-sky animate-pulse',
                    )}
                    style={{ width: `${Math.max(5, item.progress)}%` }}
                  />
                </div>

                {/* Lineage Stage Badges */}
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                  {item.stage === 'uploading' && (
                    <span className="flex items-center gap-1 text-dim">
                      <Loader2 size={10} className="animate-spin text-mint" />
                      <span>Cloudinary buffer</span>
                    </span>
                  )}
                  {item.stage === 'cloudinary' && (
                    <span className="flex items-center gap-1 text-mint">
                      <Sparkles size={10} />
                      <span>Vision analysis</span>
                    </span>
                  )}
                  {item.stage === 'ai' && (
                    <span className="flex items-center gap-1 text-sky">
                      <Sparkles size={10} />
                      <span>Extracting GPS & tags</span>
                    </span>
                  )}
                  {item.stage === 'location' && (
                    <span className="flex items-center gap-1 text-amber">
                      <MapPin size={10} />
                      <span>{item.suggestedLocation ? `Resolving ${item.suggestedLocation}` : 'Resolving spatial geofence'}</span>
                    </span>
                  )}
                  {item.stage === 'review' && (
                    <span className="flex items-center gap-1 text-amber">
                      <Clock size={10} />
                      <span>Pending Gatekeeper</span>
                    </span>
                  )}
                  {item.stage === 'ready' && (
                    <span className="flex items-center gap-1 text-mint font-semibold">
                      <CheckCircle2 size={10} />
                      <span>Mesh Verified ({Math.round((item.confidence || 0.94) * 100)}%)</span>
                    </span>
                  )}
                  {item.stage === 'failed' && (
                    <span className="text-rose">Processing failed</span>
                  )}
                </div>

                {/* Suggested bindings */}
                {item.suggestedProject && (
                  <p className="mt-1 truncate font-mono text-[10px] text-faint">
                    → {item.suggestedProject} {item.suggestedLocation ? `· ${item.suggestedLocation}` : ''}
                  </p>
                )}
              </div>

              <button
                onClick={() => onClearItem(item.id)}
                className="text-faint hover:text-ink p-1"
                title="Remove item"
              >
                <X size={12} />
              </button>
            </div>
          )
        })}
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between border-t border-line/60 bg-elev/60 p-3">
        <span className="font-mono text-[10px] text-dim">
          {processingCount > 0 ? `${processingCount} processing…` : `${readyCount} ready to mesh`}
        </span>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={onDismiss}
            className="text-xs px-3 py-1.5"
          >
            Minimize
          </Button>

          <Button
            variant="solid"
            onClick={onApproveAll}
            disabled={readyCount === 0}
            className="text-xs px-3.5 py-1.5 gap-1.5"
          >
            <span>Approve & Join Mesh</span>
            <ArrowRight size={12} />
          </Button>
        </div>
      </div>
    </div>
  )
}
