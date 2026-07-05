'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { getInitialProvider, OSM_PROVIDER } from '@/lib/mapTiles'
import { getActivityCategory } from '../lib/categories'
import type { ActivityView } from '../lib/types'

// A filled dot coloured by the activity's category (the classification), with a
// white ring; a little larger when selected.
function dotIcon(color: string, selected: boolean): L.DivIcon {
  const size = selected ? 26 : 20
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

function MapInit({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap()
  const done = useState(false)
  useEffect(() => {
    if (!done[0]) {
      map.setView(center, zoom)
      done[1](true)
    }
  }, [center, zoom, map, done])
  return null
}

function BaseTiles() {
  const [provider, setProvider] = useState(getInitialProvider)
  const errors = useState(0)
  return (
    <TileLayer
      key={provider.id}
      url={provider.url}
      attribution={provider.attribution}
      maxZoom={provider.maxZoom}
      eventHandlers={{
        tileerror: () => {
          if (provider.id === 'osm') return
          errors[1]((n) => {
            const next = n + 1
            if (next >= 3) setProvider(OSM_PROVIDER)
            return next
          })
        },
      }}
    />
  )
}

interface ActivitiesMapProps {
  activities: ActivityView[]
  selectedId: string | null
  onSelect: (a: ActivityView) => void
  center: [number, number]
}

export default function ActivitiesMap({ activities, selectedId, onSelect, center }: ActivitiesMapProps) {
  return (
    <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={true}>
      <BaseTiles />
      <MapInit center={center} zoom={13} />
      {activities.map((a) =>
        a.lat != null && a.lng != null ? (
          <Marker
            key={a.id}
            position={[a.lat, a.lng]}
            icon={dotIcon(getActivityCategory(a.category).color, a.id === selectedId)}
            eventHandlers={{ click: () => onSelect(a) }}
          />
        ) : null
      )}
    </MapContainer>
  )
}
