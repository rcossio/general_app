'use client'

import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, CircleMarker, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

export interface MapLocation {
  id: string
  name: string
  lat: number
  lng: number
  radiusM: number
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
            pathOptions={{ color: '#ffffff', fillColor: '#3b82f6', fillOpacity: 1, weight: 2 }}
          />
        </>
      )}

      {visibleLocations.map((loc) => {
        const isNearby = nearbyLocationIds.has(loc.id)
        const color = isNearby ? '#22c55e' : loc.visited ? '#9ca3af' : '#f97316'

        return (
          <CircleMarker
            key={loc.id}
            center={[loc.lat, loc.lng]}
            radius={isNearby ? 20 : 14}
            pathOptions={{ color: '#ffffff', fillColor: color, fillOpacity: 0.9, weight: 2 }}
            eventHandlers={{ click: () => onLocationClick(loc) }}
          />
        )
      })}
    </MapContainer>
  )
}
