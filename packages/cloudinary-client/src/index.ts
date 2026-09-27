export function assetFolder(orgSlug: string, projectSlug: string, when = new Date()) {
  const year = when.getUTCFullYear()
  const month = String(when.getUTCMonth() + 1).padStart(2, '0')
  const safeOrg = orgSlug.replace(/[^a-z0-9-]/gi, '').toLowerCase() || 'org'
  const safeProject = projectSlug.replace(/[^a-z0-9-]/gi, '').toLowerCase() || 'project'
  return `impactmesh/${safeOrg}/${safeProject}/${year}/${month}`
}

export function deliveryUrl(url: string, transform: string) {
  const marker = '/upload/'
  const index = url.indexOf(marker)
  if (index === -1 || !url.includes('res.cloudinary.com')) return url
  return `${url.slice(0, index + marker.length)}${transform}/${url.slice(index + marker.length)}`
}

export function thumbnailUrl(url: string, size = 160) {
  return deliveryUrl(url, `c_fill,g_auto,w_${size},h_${size},q_auto,f_auto`)
}

export function reportImageUrl(url: string, width = 1600) {
  return deliveryUrl(url, `c_limit,w_${width},q_auto,f_auto`)
}
