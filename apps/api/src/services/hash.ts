import crypto from 'node:crypto'
import sharp from 'sharp'

export function checksumOf(buffer: Buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

export async function averageHash(buffer: Buffer) {
  try {
    const { data } = await sharp(buffer)
      .rotate()
      .resize(8, 8, { fit: 'fill' })
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true })
    let sum = 0
    for (const value of data) sum += value
    const average = sum / Math.max(1, data.length)
    return [...data].map((value) => (value >= average ? '1' : '0')).join('')
  } catch {
    return null
  }
}
