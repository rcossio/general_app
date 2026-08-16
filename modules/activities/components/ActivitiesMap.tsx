'use client'

import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { getInitialProvider, OSM_PROVIDER } from '@/lib/mapTiles'
import { getActivityCategory } from '../lib/categories'
import type { ActivityView } from '../lib/types'

// A filled dot coloured by the activity's category (the classification), with a
// white ring; larger + raised when selected.
function dotIcon(color: string, selected: boolean): L.DivIcon {
  const size = selected ? 28 : 18
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:${selected ? 3 : 2}px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);"></div>`,
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

// Smoothly pan (and gently zoom in) to the active activity when it changes.
function PanTo({ target }: { target: [number, number] | null }) {
  const map = useMap()
  useEffect(() => {
    if (!target) return
    map.panTo(target, { animate: true, duration: 0.4 })
    if (map.getZoom() < 15) map.setZoom(15)
  }, [target, map])
  return null
}

// Fit all visible markers into view once per mount. Remounted (via key=fitKey)
// when the active category filter changes, so it re-fits then — but not on every
// search keystroke.
function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap()
  const done = useRef(false)
  useEffect(() => {
    if (done.current || points.length === 0) return
    map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 15 })
    done.current = true
  }, [points, map])
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
  // When set, pan to this activity (the active/centred card).
  panToId?: string | null
  // Re-fit to all markers when this key changes (e.g. the active filter).
  fitKey?: string
}

export default function ActivitiesMap({ activities, selectedId, onSelect, center, panToId, fitKey }: ActivitiesMapProps) {
  const withCoords = activities.filter((a) => a.lat != null && a.lng != null)
  const points = withCoords.map((a) => [a.lat as number, a.lng as number] as [number, number])
  const panActivity = panToId ? withCoords.find((a) => a.id === panToId) : null
  const panTarget: [number, number] | null = panActivity ? [panActivity.lat as number, panActivity.lng as number] : null

  return (
    <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={true}>
      <BaseTiles />
      <MapInit center={center} zoom={13} />
      <FitBounds points={points} key={fitKey ?? 'all'} />
      <PanTo target={panTarget} />
      {withCoords.map((a) => (
        <Marker
          key={a.id}
          position={[a.lat as number, a.lng as number]}
          icon={dotIcon(getActivityCategory(a.category).color, a.id === selectedId)}
          zIndexOffset={a.id === selectedId ? 1000 : 0}
          eventHandlers={{ click: () => onSelect(a) }}
        />
      ))}
    </MapContainer>
  )
}
