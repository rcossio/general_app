'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import { renderToStaticMarkup } from 'react-dom/server'
import { HeartHandshake } from 'lucide-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { getInitialProvider, OSM_PROVIDER } from '@/lib/mapTiles'
import type { AssociationView } from '../lib/contact'

const MARKER_COLOR = '#e0655a' // brand photinia
const SELECTED_COLOR = '#3a9148' // brand green-dark

// A circular badge with the white handshake icon inside — green when selected.
function associationIcon(selected: boolean): L.DivIcon {
  const svg = renderToStaticMarkup(<HeartHandshake color="#ffffff" size={17} strokeWidth={2.5} />)
  const color = selected ? SELECTED_COLOR : MARKER_COLOR
  return L.divIcon({
    className: '',
    html: `<div style="width:30px;height:30px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);">${svg}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
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

interface AssociationsMapProps {
  associations: AssociationView[]
  selectedId: string | null
  onSelect: (a: AssociationView) => void
  center: [number, number]
}

export default function AssociationsMap({ associations, selectedId, onSelect, center }: AssociationsMapProps) {
  return (
    <MapContainer center={center} zoom={14} style={{ height: '100%', width: '100%' }} zoomControl={true}>
      <BaseTiles />
      <MapInit center={center} zoom={14} />

      {associations.map((a) =>
        a.lat != null && a.lng != null ? (
          <Marker
            key={a.id}
            position={[a.lat, a.lng]}
            icon={associationIcon(a.id === selectedId)}
            eventHandlers={{ click: () => onSelect(a) }}
          />
        ) : null
      )}
    </MapContainer>
  )
}
