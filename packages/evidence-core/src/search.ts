import type { ParsedSearch } from '@impactmesh/shared-types'
import { ACTIVITIES } from './taxonomy'

const MONTHS: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
}

export interface SearchDocument {
  id: string
  text: string
  activityCategory: string | null
  locationName: string | null
  capturedAt: string | null
  evidenceRole: string | null
  reviewStatus: string
}

export function parseEvidenceQuery(
  raw: string,
  locations: { name: string; city: string }[],
): ParsedSearch {
  const text = raw.trim()
  const lower = text.toLowerCase()
  let activity: string | null = null
  for (const term of ACTIVITIES) {
    if (term.hints.some((hint) => lower.includes(hint)) || lower.includes(term.label.toLowerCase())) {
      activity = term.id
      break
    }
  }

  let location: string | null = null
  for (const place of locations) {
    if (lower.includes(place.name.toLowerCase()) || (place.city && lower.includes(place.city.toLowerCase()))) {
      location = place.name
      break
    }
  }

  let evidenceType: ParsedSearch['evidenceType'] = null
  const before = /\bbefore\b/.test(lower)
  const after = /\bafter\b/.test(lower)
  if (before && after) evidenceType = 'before_after'
  else if (before) evidenceType = 'before'
  else if (after) evidenceType = 'after'

  let from: string | null = null
  let to: string | null = null
  const yearMatch = lower.match(/\b(20\d{2})\b/)
  const monthName = Object.keys(MONTHS).find((month) => lower.includes(month))
  if (yearMatch && monthName) {
    const year = Number(yearMatch[1])
    const month = MONTHS[monthName] ?? 1
    const start = new Date(Date.UTC(year, month - 1, 1))
    const end = new Date(Date.UTC(year, month, 0, 23, 59, 59))
    from = start.toISOString()
    to = end.toISOString()
  } else if (yearMatch) {
    const year = Number(yearMatch[1])
    from = new Date(Date.UTC(year, 0, 1)).toISOString()
    to = new Date(Date.UTC(year, 11, 31, 23, 59, 59)).toISOString()
  }

  return { text, activity, location, evidenceType, from, to }
}

function tokenSet(value: string) {
  return new Set(
    value
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 2),
  )
}

export function rankEvidence(documents: SearchDocument[], parsed: ParsedSearch) {
  const queryTokens = tokenSet(parsed.text)
  return documents
    .filter((document) => document.reviewStatus !== 'rejected')
    .map((document) => {
      let score = 0
      const reasons: string[] = []
      const docTokens = tokenSet(document.text)
      let overlap = 0
      for (const token of queryTokens) if (docTokens.has(token)) overlap += 1
      if (overlap) {
        score += overlap
        reasons.push(`${overlap} matching word${overlap === 1 ? '' : 's'} in the caption, tags, or place.`)
      }
      if (parsed.activity && document.activityCategory === parsed.activity) {
        score += 4
        reasons.push('Activity matches the query.')
      }
      if (parsed.location && document.locationName && document.locationName.toLowerCase().includes(parsed.location.toLowerCase())) {
        score += 3
        reasons.push('Location matches the query.')
      }
      if (parsed.evidenceType && document.evidenceRole && parsed.evidenceType.includes(document.evidenceRole)) {
        score += 2
        reasons.push('Evidence role matches before/after wording.')
      }
      if (parsed.from || parsed.to) {
        if (!document.capturedAt) score -= 2
        else {
          const time = new Date(document.capturedAt).getTime()
          const afterStart = !parsed.from || time >= new Date(parsed.from).getTime()
          const beforeEnd = !parsed.to || time <= new Date(parsed.to).getTime()
          if (afterStart && beforeEnd) {
            score += 2
            reasons.push('Capture date sits in the requested window.')
          } else score -= 3
        }
      }
      return { id: document.id, score, reasons }
    })
    .filter((hit) => hit.score > 0)
    .sort((a, b) => b.score - a.score)
}
