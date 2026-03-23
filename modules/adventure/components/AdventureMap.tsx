'use client'

import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, CircleMarker, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

function exclamationIcon(color: string) {
  return L.divIcon({
    html: `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:15px;color:${color};line-height:1;pointer-events:none;">!</div>`,
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

// [id, dark, light]
const GRADIENTS: [string, string, string][] = [
  ['loc-grad-orange', '#f97316', '#ffedd5'],
  ['loc-grad-red',    '#ef4444', '#fee2e2'],
  ['loc-grad-gray',   '#9ca3af', '#f3f4f6'],
  ['loc-grad-green',  '#22c55e', '#dcfce7'],
  ['loc-grad-blue',   '#3b82f6', '#dbeafe'],
]

const STROKE: Record<string, string> = Object.fromEntries(
  GRADIENTS.map(([id, dark]) => [id, dark])
)

function GradientDefs() {
  const map = useMap()
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const svgEl = map.getPanes().overlayPane?.querySelector('svg')
      if (!svgEl || svgEl.querySelector('#loc-grad-orange')) return
      let defs = svgEl.querySelector('defs')
      if (!defs) {
        defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
        svgEl.insertBefore(defs, svgEl.firstChild)
      }
      for (const [id, dark, light] of GRADIENTS) {
        const grad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient')
        grad.id = id
        grad.setAttribute('x1', '0%')
        grad.setAttribute('y1', '0%')
        grad.setAttribute('x2', '100%')
        grad.setAttribute('y2', '100%')
        const s1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop')
        s1.setAttribute('offset', '0%')
        s1.setAttribute('stop-color', light)
        const s2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop')
        s2.setAttribute('offset', '100%')
        s2.setAttribute('stop-color', dark)
        grad.append(s1, s2)
        defs.appendChild(grad)
      }
    })
    return () => cancelAnimationFrame(raf)
  }, [map])
  return null
}

export interface MapLocation {
  id: string
  name: string
  lat: number
  lng: number
  radiusM: number
  type: string
  visible: boolean
  visited: boolean
}

interface PlayerPosition {
  lat: number
  lng: number
  accuracy: number
}

interface AdventureMapProps {
  locations: MapLocation[]
  playerPosition: PlayerPosition | null
  onLocationClick: (loc: MapLocation) => void
  nearbyLocationIds: Set<string>
}

function PlayerTracker({ position }: { position: PlayerPosition | null }) {
  const map = useMap()
  const centered = useRef(false)

  useEffect(() => {
    if (position && !centered.current) {
      map.setView([position.lat, position.lng], 17)
      centered.current = true
    }
  }, [position, map])

  return null
}

export default function AdventureMap({
  locations,
  playerPosition,
  onLocationClick,
  nearbyLocationIds,
}: AdventureMapProps) {
  const visibleLocations = locations.filter((l) => l.visible)

  const defaultCenter: [number, number] =
    visibleLocations.length > 0
      ? [
          visibleLocations.reduce((s, l) => s + l.lat, 0) / visibleLocations.length,
          visibleLocations.reduce((s, l) => s + l.lng, 0) / visibleLocations.length,
        ]
      : [45.0, 8.6]

  return (
    <MapContainer
      center={defaultCenter}
      zoom={17}
      style={{ height: '100%', width: '100%' }}
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <GradientDefs />
      <PlayerTracker position={playerPosition} />

      {playerPosition && (
        <>
          <CircleMarker
            center={[playerPosition.lat, playerPosition.lng]}
            radius={Math.min(playerPosition.accuracy / 2, 40)}
            pathOptions={{ color: '#3b82f6', fillColor: '#93c5fd', fillOpacity: 0.2, weight: 1 }}
          />
          <CircleMarker
            center={[playerPosition.lat, playerPosition.lng]}
            radius={8}
            pathOptions={{ color: STROKE['loc-grad-blue'], fillColor: 'url(#loc-grad-blue)', fillOpacity: 1, weight: 2, opacity: 0.5 }}
          />
        </>
      )}

      {visibleLocations.map((loc) => {
        const isNearby = nearbyLocationIds.has(loc.id)
        const gradId = isNearby
          ? 'loc-grad-green'
          : loc.visited
          ? 'loc-grad-gray'
          : loc.type === 'event'
          ? 'loc-grad-red'
          : 'loc-grad-orange'

        return (
          <span key={loc.id}>
            <CircleMarker
              center={[loc.lat, loc.lng]}
              radius={isNearby ? 20 : 14}
              pathOptions={{ color: STROKE[gradId], fillColor: `url(#${gradId})`, fillOpacity: 1, weight: 2, opacity: 0.5 }}
              eventHandlers={{ click: () => onLocationClick(loc) }}
            />
            {loc.type === 'event' && (
              <Marker
                position={[loc.lat, loc.lng]}
                icon={exclamationIcon(STROKE[gradId])}
                interactive={false}
              />
            )}
          </span>
        )
      })}
    </MapContainer>
  )
}
