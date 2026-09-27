export function hamming(a: string, b: string) {
  const length = Math.max(a.length, b.length)
  if (!length) return 0
  let distance = 0
  for (let index = 0; index < length; index += 1) {
    if ((a[index] ?? '') !== (b[index] ?? '')) distance += 1
  }
  return distance
}

export function hashSimilarity(a: string | null, b: string | null) {
  if (!a || !b) return 0
  const length = Math.max(a.length, b.length)
  return 1 - hamming(a, b) / length
}
