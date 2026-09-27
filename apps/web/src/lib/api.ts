export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem('impactmesh.token')
  const headers = new Headers(init?.headers)
  const isForm = typeof FormData !== 'undefined' && init?.body instanceof FormData
  if (!isForm && init?.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const response = await fetch(`/api/v1${path}`, { ...init, headers })
  if (response.status === 401 && !path.startsWith('/auth/login') && !path.startsWith('/public')) {
    localStorage.removeItem('impactmesh.token')
    if (!window.location.pathname.startsWith('/login')) window.location.assign('/login')
  }
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: string }
    throw new ApiError(response.status, data.error || response.statusText)
  }
  if (response.status === 204) return undefined as T
  const type = response.headers.get('content-type') || ''
  if (type.includes('text/html')) return (await response.text()) as T
  return response.json() as Promise<T>
}
