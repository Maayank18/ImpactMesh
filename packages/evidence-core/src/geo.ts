export function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const toRad = (value: number) => (value * Math.PI) / 180
  const dLat = toRad(bLat - aLat)
  const dLng = toRad(bLng - aLng)
  const lat1 = toRad(aLat)
  const lat2 = toRad(bLat)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

export interface KnownLocation {
  id: string
  name: string
  latitude: number
  longitude: number
}

export interface ResolvedLocation {
  locationId: string | null
  latitude: number | null
  longitude: number | null
  source: 'exif' | 'project' | 'unknown'
  confidence: number
  reason: string
}

export function resolveLocation(input: {
  exif: { latitude: number; longitude: number } | null
  projectLocation: KnownLocation | null
  known: KnownLocation[]
  snapKm?: number
}): ResolvedLocation {
  const snapKm = input.snapKm ?? 15
  if (input.exif) {
    let nearest: { location: KnownLocation; distance: number } | null = null
    for (const location of input.known) {
      const distance = haversineKm(input.exif.latitude, input.exif.longitude, location.latitude, location.longitude)
      if (!nearest || distance < nearest.distance) nearest = { location, distance }
    }
    if (nearest && nearest.distance <= snapKm) {
      return {
        locationId: nearest.location.id,
        latitude: input.exif.latitude,
        longitude: input.exif.longitude,
        source: 'exif',
        confidence: nearest.distance < 1 ? 0.98 : 0.9,
        reason: `EXIF GPS is ${nearest.distance.toFixed(1)} km from ${nearest.location.name}.`,
      }
    }
    return {
      locationId: null,
      latitude: input.exif.latitude,
      longitude: input.exif.longitude,
      source: 'exif',
      confidence: 0.86,
      reason: 'EXIF GPS is present and was not snapped to a known site.',
    }
  }
  if (input.projectLocation) {
    return {
      locationId: input.projectLocation.id,
      latitude: input.projectLocation.latitude,
      longitude: input.projectLocation.longitude,
      source: 'project',
      confidence: 0.62,
      reason: 'No GPS on the file. The project location is used, with lower confidence.',
    }
  }
  return {
    locationId: null,
    latitude: null,
    longitude: null,
    source: 'unknown',
    confidence: 0.2,
    reason: 'No GPS and no project location.',
  }
}

export function withinRadius(origin: { latitude: number; longitude: number }, places: KnownLocation[], km: number) {
  return places
    .map((place) => ({
      ...place,
      distanceKm: haversineKm(origin.latitude, origin.longitude, place.latitude, place.longitude),
    }))
    .filter((place) => place.distanceKm <= km)
    .sort((a, b) => a.distanceKm - b.distanceKm)
}
