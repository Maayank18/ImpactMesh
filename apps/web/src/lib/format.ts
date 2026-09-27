export function formatWhen(iso: string | null | undefined) {
  if (!iso) return 'Date unknown'
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso))
}

export function formatWhenTime(iso: string | null | undefined) {
  if (!iso) return 'Time unknown'
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

export function coord(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return value.toFixed(4)
}

export function percent(value: number | null | undefined) {
  if (value === null || value === undefined) return '—'
  return `${Math.round(value * 100)}%`
}

export function canEdit(role?: string) {
  return role === 'editor' || role === 'admin' || role === 'owner'
}

export function titleCase(value: string) {
  return value.replaceAll('_', ' ')
}
