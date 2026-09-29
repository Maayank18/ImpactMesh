import { Link } from 'react-router-dom'
import type { MediaDetail } from '@impactmesh/shared-types'
import { coord, formatWhenTime, percent, titleCase } from '@/lib/format'
import { useWorkspace } from '@/stores/workspace'
import { EvidenceImage, Eyebrow, Pill } from './ui'
import { CloudinaryLab } from './cloudinary-lab'

export function EvidenceDrawer({
  detail,
  preview,
  onClose,
}: {
  detail: MediaDetail
  preview?: string
  onClose: () => void
}) {
  const media = detail.media
  const tone = media.reviewStatus === 'approved' ? 'mint' : media.reviewStatus === 'rejected' ? 'rose' : 'amber'
  return (
    <aside className="flex h-full w-full max-w-md lg:max-w-lg flex-col overflow-y-auto border-l border-line bg-elev/95 p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <Eyebrow>Asset</Eyebrow>
          <h2 className="mt-1 font-mono text-sm">{media.filename}</h2>
        </div>
        <button className="text-sm text-dim" onClick={onClose}>
          Close
        </button>
      </div>
      <CloudinaryLab
        imageUrl={preview || media.secureUrl}
        alt={media.altText || media.filename}
        title={media.filename}
        latitude={media.latitude}
        longitude={media.longitude}
        capturedAt={media.capturedAt}
        dHash={media.perceptualHash}
        className="mb-3"
      />
      <div className="mt-4 flex flex-wrap gap-2">
        <Pill tone={tone}>{media.reviewStatus}</Pill>
        <Pill>{media.aiStatus}</Pill>
        {media.decision ? <Pill tone="sky">{media.decision.source}</Pill> : null}
      </div>
      <p className="mt-4 text-sm leading-6 text-dim">{media.caption || 'No caption yet.'}</p>
      <dl className="mt-5 space-y-3 text-sm">
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">Captured</dt>
          <dd>{formatWhenTime(media.capturedAt)}</dd>
        </div>
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">Location</dt>
          <dd>
            {detail.location ? `${detail.location.name} · ${detail.location.city}` : 'Unknown'}
            <span className="mt-1 block font-mono text-xs text-dim">
              {coord(media.latitude)}, {coord(media.longitude)} · {media.locationSource} · {percent(media.locationConfidence)}
            </span>
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">Activity</dt>
          <dd>{detail.activity?.name || 'Unassigned'}</dd>
        </div>
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">Connected to</dt>
          <dd>{detail.project?.name || 'No project yet'}</dd>
          {detail.evidenceSet ? <dd className="text-dim">{detail.evidenceSet.name}</dd> : null}
        </div>
      </dl>
      <div className="mt-5">
        <Eyebrow>Signals</Eyebrow>
        <ul className="mt-2 space-y-1.5">
          {media.signals.length === 0 ? <li className="text-sm text-dim">None yet.</li> : null}
          {media.signals.map((signal) => (
            <li key={signal.normalizedTag} className="flex items-center justify-between text-sm">
              <span>{titleCase(signal.normalizedTag)}</span>
              <span className="font-mono text-xs text-dim">
                {signal.confidence.toFixed(2)} · {signal.source}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-5">
        <Eyebrow>Confidence ledger</Eyebrow>
        <p className="mt-1 text-xs text-dim">A system signal, not proof of real-world impact.</p>
        <ul className="mt-2 space-y-1.5">
          {detail.ledger.map((row) => (
            <li key={row.label} className="flex items-center justify-between gap-3 text-sm">
              <span>{row.label}</span>
              <span className="font-mono text-xs text-dim">{row.value}</span>
            </li>
          ))}
        </ul>
      </div>
      {media.similarTo ? (
        <p className="mt-4 rounded-2xl border border-amber/30 bg-amber/10 p-3 text-sm text-amber">
          This image looks {Math.round(media.similarTo.score * 100)}% similar to {media.similarTo.label}.
        </p>
      ) : null}
      {media.decision ? (
        <div className="mt-4">
          <Eyebrow>Why this route</Eyebrow>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                media.decision.source === 'jev'
                  ? 'bg-sky/20 text-sky'
                  : 'bg-faint/30 text-dim'
              }`}
            >
              {media.decision.source === 'jev' ? '⚡ Routed by Jev' : '📋 Local policy'}
            </span>
            <span className="font-mono text-xs text-dim">
              {(media.decision.confidence * 100).toFixed(0)}% confidence
            </span>
          </div>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-dim">
            {media.decision.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
          {media.decision.debug ? (
            <div className="mt-3 rounded-xl border border-line/50 bg-base/50 p-3 text-xs">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint mb-2">Decision trace</p>
              <div className="space-y-1 text-dim">
                {media.decision.debug.respondingModel ? (
                  <p>Model: <span className="text-body">{media.decision.debug.respondingModel}</span></p>
                ) : null}
                {media.decision.debug.latencyMs != null ? (
                  <p>Latency: <span className="text-body">{media.decision.debug.latencyMs}ms</span></p>
                ) : null}
                {media.decision.debug.reviewProbability != null ? (
                  <p>Review probability: <span className="text-body">{(media.decision.debug.reviewProbability * 100).toFixed(0)}%</span></p>
                ) : null}
                {media.decision.debug.agreedWithPolicy === false ? (
                  <p className="text-amber">⚠ Jev and the local policy disagreed — a person confirmed this filing.</p>
                ) : media.decision.debug.agreedWithPolicy === true ? (
                  <p className="text-mint">✓ Jev and local policy agreed.</p>
                ) : null}
                {media.decision.debug.promptTokens != null || media.decision.debug.completionTokens != null ? (
                  <p>Tokens: <span className="text-body">{media.decision.debug.promptTokens ?? '?'}→{media.decision.debug.completionTokens ?? '?'}</span></p>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="mt-5">
        <Eyebrow>Evidence lineage</Eyebrow>
        <ol className="mt-3 space-y-3">
          {detail.lineage.map((step) => (
            <li key={step.id} className="grid grid-cols-[12px_1fr] gap-3">
              <span
                className={`mt-1 h-2.5 w-2.5 rounded-full ${step.state === 'done' ? 'bg-mint' : step.state === 'current' ? 'bg-amber' : 'bg-line'}`}
              />
              <div>
                <p className="text-sm">{step.label}</p>
                <p className="text-xs leading-5 text-dim">{step.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
      <Link to={`/app/graph?focus=${media.id}`} className="mt-6 text-sm text-mint">
        Find it on the graph
      </Link>
    </aside>
  )
}

export function usePreview(id?: string | null, remote?: string | null) {
  const local = useWorkspace((state) => (id ? state.localPreviews[id] : undefined))
  return local || remote || ''
}
