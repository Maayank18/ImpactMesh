import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from 'react-leaflet'
import { Eyebrow, Pill } from '@/components/ui'
import { useLocations } from '@/hooks/queries'
import { api } from '@/lib/api'
import { useWorkspace } from '@/stores/workspace'
import 'leaflet/dist/leaflet.css'

function Fly({ id, places }: { id: string | null; places: { id: string; latitude: number; longitude: number }[] }) {
  const map = useMap()
  useEffect(() => {
    const place = places.find((item) => item.id === id)
    if (place) map.flyTo([place.latitude, place.longitude], 13, { duration: 0.8 })
  }, [id, map, places])
  return null
}

export function MapPage() {
  const locations = useLocations()
  const [params] = useSearchParams()
  const focus = useWorkspace((state) => state.focusLocationId)
  const patch = useWorkspace((state) => state.patch)
  const requested = params.get('focus') || focus
  const places = locations.data ?? []
  const validPlaces = places.filter(
    (p) =>
      typeof p.latitude === 'number' &&
      typeof p.longitude === 'number' &&
      Number.isFinite(p.latitude) &&
      Number.isFinite(p.longitude),
  )
  const selected = validPlaces.find((place) => place.id === requested) ?? validPlaces[0]

  async function nearby() {
    if (!selected || typeof selected.latitude !== 'number' || typeof selected.longitude !== 'number') return
    try {
      const found = await api<Array<{ location: { name: string }; distanceKm: number; mediaCount: number }>>(
        `/locations/nearby?lat=${selected.latitude}&lng=${selected.longitude}&km=15`,
      )
      useWorkspace.getState().toast(found.map((item) => `${item.location.name} · ${item.distanceKm} km`).join('  ·  ') || 'Nothing nearby')
    } catch {
      useWorkspace.getState().toast('No nearby locations found.')
    }
  }

  const defaultCenter: [number, number] = validPlaces.length > 0 && typeof validPlaces[0].latitude === 'number' && typeof validPlaces[0].longitude === 'number'
    ? [validPlaces[0].latitude, validPlaces[0].longitude]
    : [28.62, 77.2]

  return (
    <div className="grid h-full lg:grid-cols-[1fr_320px]">
      <div className="relative min-h-[70vh]">
        <MapContainer center={defaultCenter} zoom={10} className="h-full w-full" zoomControl={false}>
          <TileLayer attribution='&copy; OpenStreetMap &copy; CARTO' url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
          {validPlaces.map((place) => (
            <CircleMarker
              key={place.id}
              center={[place.latitude, place.longitude]}
              radius={selected?.id === place.id ? 13 : 8}
              pathOptions={{ color: '#5ee0b5', weight: 2, fillColor: '#e4b15a', fillOpacity: 0.9 }}
              eventHandlers={{ click: () => patch({ focusLocationId: place.id }) }}
            >
              <Tooltip>{place.name}</Tooltip>
            </CircleMarker>
          ))}
          <Fly id={requested} places={validPlaces} />
        </MapContainer>
      </div>
      <aside className="overflow-auto border-l border-line bg-elev/40 p-4">
        <Eyebrow>Places in the record</Eyebrow>
        <ul className="mt-3 space-y-2">
          {places.map((place) => (
            <li key={place.id}>
              <button className="w-full rounded-2xl border border-line px-3 py-3 text-left hover:border-mint/40 transition" onClick={() => patch({ focusLocationId: place.id })}>
                <span className="flex items-center justify-between gap-2">
                  <span>{place.name}</span>
                  <Pill>{place.mediaCount ?? 0}</Pill>
                </span>
                <span className="mt-1 block text-xs text-dim">
                  {place.city || 'Coordinates'} · {place.source || 'verified'} · {Math.round((place.confidence || 0.9) * 100)}%
                </span>
              </button>
            </li>
          ))}
        </ul>
        {selected && typeof selected.latitude === 'number' && typeof selected.longitude === 'number' ? (
          <div className="mt-4 space-y-3">
            <h2 className="font-serif text-3xl">{selected.name}</h2>
            <p className="font-mono text-xs text-dim">
              {selected.latitude.toFixed(4)}, {selected.longitude.toFixed(4)}
            </p>
            <p className="text-sm text-dim">
              {Array.isArray(selected.projects) ? selected.projects.map((project) => project.name).join(' · ') : 'No project pinned here yet.'}
            </p>
            <div className="flex flex-wrap gap-3 text-sm">
              <Link className="text-mint" to={`/app/graph?focus=${selected.id}`}>
                Show in graph
              </Link>
              <button className="text-dim hover:text-ink transition" onClick={() => void nearby()}>
                Within 15 km
              </button>
            </div>
          </div>
        ) : null}
      </aside>
    </div>
  )
}
