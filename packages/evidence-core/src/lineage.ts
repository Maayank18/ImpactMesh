import type { AuditEvent, LineageStep, MediaAsset, Report } from '@impactmesh/shared-types'

export function buildLineage(media: MediaAsset, audit: AuditEvent[], reports: Report[]): LineageStep[] {
  const events = audit.filter((event) => event.entityId === media.id)
  const approved = events.find((event) => event.action === 'media.approved')
  const analyzed = events.find((event) => event.action === 'media.analyzed')
  const usedIn = reports.filter((report) => report.evidenceIds.includes(media.id))

  const steps: LineageStep[] = [
    {
      id: 'asset',
      label: 'Original asset',
      detail: media.cloudinaryPublicId
        ? `Cloudinary public id ${media.cloudinaryPublicId}.`
        : 'Stored as a demo field asset. Connect Cloudinary to keep the original on the CDN.',
      state: 'done',
      at: media.uploadedAt,
    },
    {
      id: 'transform',
      label: 'Delivery transform',
      detail: media.cloudinaryPublicId
        ? 'Graph thumbnails use Cloudinary fill, auto quality, and auto format.'
        : 'No CDN transform yet. The browser is showing the source URL directly.',
      state: media.cloudinaryPublicId ? 'done' : 'waiting',
      at: media.cloudinaryPublicId ? media.uploadedAt : null,
    },
    {
      id: 'analysis',
      label: 'Visual analysis',
      detail:
        media.signals.length > 0
          ? media.signals
              .slice(0, 4)
              .map((signal) => `${signal.normalizedTag} (${signal.source})`)
              .join(', ')
          : 'No signals stored yet.',
      state: media.aiStatus === 'ready' ? 'done' : 'current',
      at: analyzed?.createdAt ?? (media.aiStatus === 'ready' ? media.uploadedAt : null),
    },
    {
      id: 'decision',
      label: media.decision?.source === 'jev' ? 'Jev decision' : 'Policy decision',
      detail: media.decision
        ? `${media.decision.model} · ${media.decision.projectChoice} · ${Math.round(media.decision.confidence * 100)}%`
        : 'No decision recorded.',
      state: media.decision ? 'done' : 'waiting',
      at: analyzed?.createdAt ?? null,
    },
    {
      id: 'review',
      label: 'Human review',
      detail:
        media.reviewStatus === 'approved'
          ? `Approved${approved ? ` by ${approved.actorName}` : ''}.`
          : media.reviewStatus === 'rejected'
            ? 'Rejected. Hidden from the evidence graph.'
            : 'Still in the review queue.',
      state: media.reviewStatus === 'pending' ? 'current' : 'done',
      at: approved?.createdAt ?? null,
    },
    {
      id: 'graph',
      label: 'Graph relation',
      detail: media.reviewStatus === 'approved' ? 'Connected to its project, place, and activity.' : 'Held until review finishes.',
      state: media.reviewStatus === 'approved' ? 'done' : 'waiting',
      at: approved?.createdAt ?? null,
    },
    {
      id: 'report',
      label: 'Report usage',
      detail: usedIn.length ? usedIn.map((report) => report.title).join(', ') : 'Not cited in a report yet.',
      state: usedIn.length ? 'done' : 'waiting',
      at: usedIn[0]?.generatedAt ?? null,
    },
  ]
  return steps
}

export function confidenceLedger(media: MediaAsset) {
  const rows = media.signals.slice(0, 4).map((signal) => ({
    label: signal.normalizedTag.replaceAll('_', ' '),
    value: signal.confidence.toFixed(2),
    source: signal.source,
  }))
  if (media.decision) {
    rows.push({
      label: media.decision.source === 'jev' ? 'Project assignment via Jev' : 'Project assignment via policy',
      value: media.decision.confidence.toFixed(2),
      source: media.decision.model,
    })
  }
  rows.push({
    label: 'Location evidence',
    value: media.locationConfidence.toFixed(2),
    source: media.locationSource,
  })
  rows.push({
    label: 'Human verified',
    value: media.reviewStatus === 'approved' ? 'Yes' : media.reviewStatus === 'rejected' ? 'Rejected' : 'No',
    source: 'review',
  })
  return rows
}
