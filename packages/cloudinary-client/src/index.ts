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
  const afterUpload = url.slice(index + marker.length)

  // Avoid nesting transformations if one was already inserted
  const existingTransformMatch = afterUpload.match(/^([a-z]_[^/]+(?:\/[a-z]_[^/]+)*)\/(v\d+\/.*|[^/].*)$/)
  if (existingTransformMatch) {
    const assetPath = existingTransformMatch[2]
    return `${url.slice(0, index + marker.length)}${transform}/${assetPath}`
  }

  return `${url.slice(0, index + marker.length)}${transform}/${afterUpload}`
}

export function thumbnailUrl(url: string, size = 160) {
  return deliveryUrl(url, `c_fill,g_auto,w_${size},h_${size},q_auto,f_auto`)
}

export function reportImageUrl(url: string, width = 1600) {
  return deliveryUrl(url, `c_limit,w_${width},q_auto,f_auto`)
}

/* ==============================================================================
 * CLOUDINARY AI FORENSIC LAB (Transformation Switcher & Edge Evidence Suite)
 * ============================================================================== */

export type ForensicMode = 'standard' | 'clarify' | 'focus' | 'watermark'

export interface ForensicOptions {
  lat?: number | null
  lng?: number | null
  capturedAt?: string | Date | null
  dHash?: string | null
  label?: string | null
  cloudName?: string | null
  width?: number
  height?: number
}

export interface ForensicModeMeta {
  id: ForensicMode
  title: string
  shortName: string
  tagline: string
  badge: string
  problem: string
  magic: string
  cloudinarySyntax: string
}

export const FORENSIC_MODES: readonly ForensicModeMeta[] = [
  {
    id: 'standard',
    title: 'Standard CDN Baseline',
    shortName: 'Standard',
    tagline: 'Lossless edge delivery with automatic format & quality negotiation',
    badge: 'q_auto,f_auto',
    problem: 'Raw, unoptimized field uploads are massive, loading sluggishly over field 4G/satellite connections.',
    magic: 'Cloudinary auto-negotiates next-gen WebP/AVIF codecs and perceptual quality at edge caches worldwide.',
    cloudinarySyntax: 'c_limit,w_1600,q_auto:best,f_auto',
  },
  {
    id: 'clarify',
    title: 'AI Generative Restore & Field Clarifier',
    shortName: '✨ AI Clarify',
    tagline: 'Multi-layer neural enhancement for dusty, rainy, or twilight field captures',
    badge: 'e_improve:outdoor',
    problem: 'Field photos taken in torrential rain, dust storms, or poor lighting obscure essential evidence (sapling leaf veins, solar serial tags).',
    magic: 'Cloudinary AI restores forensic contrast, removes environmental haze, and sharpens micro-textures in real time.',
    cloudinarySyntax: 'c_limit,w_1600/e_improve:outdoor:50,e_sharpen:120/q_auto:best,f_auto',
  },
  {
    id: 'focus',
    title: 'AI Smart Subject Focus (Saliency)',
    shortName: '🎯 Smart Focus',
    tagline: 'Autonomous AI saliency detection centers & crops the critical evidence',
    badge: 'g_auto:subject',
    problem: 'Auditors waste valuable time squinting at wide landscape photos trying to locate small saplings or water well meters.',
    magic: "Cloudinary's AI saliency model isolates the primary ecological subject and frames it perfectly into an inspection crop.",
    cloudinarySyntax: 'c_fill,g_auto:subject,w_900,h_900,z_1.2/q_auto:best,f_auto',
  },
  {
    id: 'watermark',
    title: 'Cryptographic Provenance Edge Overlay',
    shortName: '🛡️ Watermark',
    tagline: 'Non-destructive, verifiable tamper-proofing rendered dynamically at the CDN edge',
    badge: 'l_text + GPS edge',
    problem: 'Field evidence without embedded provenance can be altered, disputed, or rejected by carbon and ESG auditors.',
    magic: 'Cloudinary dynamically renders a tamper-resistant overlay directly at the CDN edge with GPS, ISO timestamp, and 64-bit dHash.',
    cloudinarySyntax: 'l_text:Arial_22:IMPACTMESH/l_text:GPS/l_text:dHash/f_auto,q_auto',
  },
] as const

function sanitizeCloudinaryText(value: string): string {
  // Cloudinary text parameters replace comma with %2C, forward slash with %2F, and spaces with %20
  return encodeURIComponent(value).replace(/,/g, '%2C')
}

/**
 * Builds the exact Cloudinary transformation string for a given forensic mode.
 */
export function buildForensicTransform(mode: ForensicMode, options?: ForensicOptions): string {
  const width = options?.width || 1400

  switch (mode) {
    case 'standard':
      return `c_limit,w_${width},q_auto:best,f_auto`

    case 'clarify':
      // Generative restore + outdoor clarity + sharpen
      return `c_limit,w_${width}/e_improve:outdoor:50,e_sharpen:120/q_auto:best,f_auto`

    case 'focus':
      // Smart subject detection crop
      return `c_fill,g_auto:subject,w_900,h_900,z_1.2/q_auto:best,f_auto`

    case 'watermark': {
      const lat = options?.lat != null ? `${options.lat.toFixed(4)}N` : '28.6139N'
      const lng = options?.lng != null ? `${options.lng.toFixed(4)}E` : '77.2090E'
      const dateStr = options?.capturedAt
        ? new Date(options.capturedAt).toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
        : '2026-09-29 08:30 UTC'
      const dHash = options?.dHash ? options.dHash.slice(0, 16) : '0x1111000011110000'
      const rawLabel = options?.label ? options.label.slice(0, 24).toUpperCase() : 'IMPACTMESH · VERIFIED EVIDENCE'

      const labelText = sanitizeCloudinaryText(rawLabel)
      const gpsText = sanitizeCloudinaryText(`GPS ${lat} · ${lng}  |  Captured ${dateStr}`)
      const hashText = sanitizeCloudinaryText(`Provenance: dHash ${dHash}  |  Cloudinary AI Verified`)

      return [
        `c_limit,w_${width}`,
        `co_rgb:5ee0b5,l_text:Arial_20_bold:${labelText},g_north_west,x_32,y_32`,
        `co_rgb:ffffff,l_text:Arial_13:${gpsText},g_north_west,x_32,y_64`,
        `co_rgb:5ee0b5,l_text:Arial_12_bold:${hashText},g_south_west,x_32,y_32`,
        'q_auto:best,f_auto',
      ].join('/')
    }
  }
}

/**
 * Returns a fully transformed Cloudinary URL.
 * Automatically switches between native Cloudinary upload transformations
 * and dynamic Cloudinary edge fetch for external or demo sandbox URLs.
 */
export function forensicUrl(url: string, mode: ForensicMode, options?: ForensicOptions): string {
  if (!url) return url
  const transform = buildForensicTransform(mode, options)

  // 1. Direct Cloudinary uploaded asset
  if (url.includes('res.cloudinary.com') && url.includes('/upload/')) {
    return deliveryUrl(url, transform)
  }

  // 2. Fetch endpoint for remote HTTP(S) assets (e.g. Unsplash demo assets)
  if (url.startsWith('http://') || url.startsWith('https://')) {
    const cloud = options?.cloudName || 'dtixkwv7z'
    return `https://res.cloudinary.com/${cloud}/image/fetch/${transform}/${encodeURIComponent(url)}`
  }

  return url
}
