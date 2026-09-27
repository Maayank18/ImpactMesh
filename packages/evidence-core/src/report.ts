import type { Activity, Location, MediaAsset, OrgMetric, ReportNarrative } from '@impactmesh/shared-types'

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

export function assembleNarrative(input: {
  projectName: string
  orgName: string
  media: MediaAsset[]
  activities: Activity[]
  locations: Location[]
  orgMetrics: OrgMetric[]
  comparisonNotes: string[]
}): ReportNarrative {
  const approved = input.media.filter((item) => item.reviewStatus === 'approved')
  const byActivity = new Map<string, MediaAsset[]>()
  for (const item of approved) {
    const key = item.activityId ?? 'unassigned'
    const list = byActivity.get(key) ?? []
    list.push(item)
    byActivity.set(key, list)
  }

  const observations: ReportNarrative['observations'] = [...byActivity.entries()].map(([activityId, items]) => {
    const activity = input.activities.find((entry) => entry.id === activityId)
    const places = [
      ...new Set(
        items
          .map((item) => input.locations.find((location) => location.id === item.locationId)?.name)
          .filter(Boolean),
      ),
    ]
    const placeText = places.length ? ` at ${places.join(', ')}` : ''
    return {
      kind: 'documented' as const,
      evidenceIds: items.map((item) => item.id),
      text: `Field records include ${items.length} approved ${items.length === 1 ? 'asset' : 'assets'} of ${activity?.name ?? 'unassigned work'}${placeText}.`,
    }
  })

  for (const note of input.comparisonNotes) {
    observations.push({
      kind: 'visual',
      evidenceIds: [],
      text: note,
    })
  }

  const documented = [
    { label: 'Approved assets', value: String(approved.length) },
    { label: 'Locations in the record', value: String(new Set(approved.map((item) => item.locationId).filter(Boolean)).size) },
    { label: 'Activities documented', value: String(input.activities.length) },
  ]

  const visualObservations = input.comparisonNotes.length
    ? input.comparisonNotes
    : ['No before/after pair has been filed, so no visual change is claimed.']

  return {
    summary: `${input.orgName} filed ${approved.length} approved field ${approved.length === 1 ? 'asset' : 'assets'} for ${input.projectName}. This brief describes what those assets document. It does not convert photographs into environmental measurements.`,
    observations,
    limitations:
      'Visual comparison is not a scientific measurement. Organization-reported figures are labeled separately and were not derived from the images. AI suggestions remain suggestions until a person approves them.',
    orgReportedMetrics: input.orgMetrics,
    documented,
    visualObservations,
  }
}

export function renderReportHtml(input: {
  orgName: string
  projectName: string
  title: string
  generatedAt: string
  narrative: ReportNarrative
  evidence: { id: string; label: string; caption: string }[]
}) {
  const observations = input.narrative.observations
    .map(
      (observation) => `<section>
        <p class="kicker">${observation.kind}</p>
        <p>${escapeHtml(observation.text)}</p>
        ${
          observation.evidenceIds.length
            ? `<p class="sources">Sources: ${observation.evidenceIds.map((id) => escapeHtml(id)).join(', ')}</p>`
            : ''
        }
      </section>`,
    )
    .join('')

  const metrics = input.narrative.orgReportedMetrics
    .map(
      (metric) =>
        `<li><strong>${escapeHtml(metric.value)}</strong> ${escapeHtml(metric.label)}<br><span>${escapeHtml(metric.note)}</span></li>`,
    )
    .join('')

  const appendix = input.evidence
    .map((item) => `<li><strong>${escapeHtml(item.label)}</strong> — ${escapeHtml(item.caption)}</li>`)
    .join('')

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(input.title)}</title>
  <style>
    body { font-family: Georgia, serif; color: #1c1915; background: #f3eee4; margin: 0; }
    main { max-width: 720px; margin: 0 auto; padding: 48px 28px 80px; }
    h1 { font-weight: 400; font-size: 42px; line-height: 1.05; margin: 0 0 8px; }
    .meta { font-family: ui-monospace, monospace; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: #6d675e; }
    p { line-height: 1.55; }
    .kicker { font-family: ui-monospace, monospace; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: #6d675e; }
    .sources { font-family: ui-monospace, monospace; font-size: 12px; }
    ul { padding-left: 18px; }
    li { margin: 8px 0; }
    li span { color: #6d675e; font-size: 14px; }
  </style>
</head>
<body>
  <main>
    <p class="meta">${escapeHtml(input.orgName)} · ${escapeHtml(input.generatedAt)}</p>
    <h1>${escapeHtml(input.title)}</h1>
    <p class="meta">${escapeHtml(input.projectName)}</p>
    <p>${escapeHtml(input.narrative.summary)}</p>
    ${observations}
    <h2>Organization-reported figures</h2>
    <ul>${metrics || '<li>None filed.</li>'}</ul>
    <h2>Limits of this brief</h2>
    <p>${escapeHtml(input.narrative.limitations)}</p>
    <h2>Appendix · source assets</h2>
    <ul>${appendix}</ul>
  </main>
</body>
</html>`
}
