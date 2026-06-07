'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, CircleMarker, useMap, useMapEvents } from 'react-leaflet'
import { renderToStaticMarkup } from 'react-dom/server'
import * as Icons from 'lucide-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { getInitialProvider, OSM_PROVIDER } from '@/lib/mapTiles'
import { getCategory } from '../lib/categories'
import { getIconComponent } from '../lib/icon'
import { colorForAge, FIXED_WINDOW_DAYS } from '../lib/noticeColor'

export interface NoticeView {
  id: string
  category: string
  lat: number
  lng: number
  note: string | null
  photoUrl: string | null
  status: string // open | fixed
  createdAt: string
  fixedAt: string | null
  beforePhotoUrl: string | null
  afterPhotoUrl: string | null
  isOwn: boolean
}

// A circular badge coloured by age, with the white category icon inside.
function noticeDivIcon(notice: NoticeView, now: number): L.DivIcon {
  const cat = getCategory(notice.category)
  const Icon = getIconComponent(cat.icon)
  const color = colorForAge(notice.createdAt, now)
  const svg = renderToStaticMarkup(<Icon color="#ffffff" size={17} strokeWidth={2.5} />)
  return L.divIcon({
    className: '',
    html: `<div style="width:30px;height:30px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);">${svg}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  })
}

const PIN_HTML = renderToStaticMarkup(
  <Icons.MapPin color="#48b35c" size={40} strokeWidth={2.5} fill="#fff" />
)
const placementIcon = L.divIcon({
  className: '',
  html: `<div style="filter:drop-shadow(0 2px 3px rgba(0,0,0,.4));">${PIN_HTML}</div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 38],
})

// Celebratory marker for a fixed notice — a twinkling sparkle.
const fixedIcon = L.divIcon({
  className: '',
  html: `<div class="animate-sparkle" style="font-size:26px;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,.35));">✨</div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
})

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

// Pan to the player once, when the player position first becomes available.
function CenterOnPlayer({ position }: { position: { lat: number; lng: number } | null }) {
  const map = useMap()
  const [centered, setCentered] = useState(false)
  useEffect(() => {
    if (position && !centered) {
      map.setView([position.lat, position.lng], 17)
      setCentered(true)
    }
  }, [position, centered, map])
  return null
}

// Reports the map's current view center (initial + on every move) so the report
// flow can drop the pin where the user is looking, not at their GPS fix.
function CenterTracker({ onChange }: { onChange?: (lat: number, lng: number) => void }) {
  const map = useMapEvents({
    moveend: () => {
      const c = map.getCenter()
      onChange?.(c.lat, c.lng)
    },
  })
  useEffect(() => {
    const c = map.getCenter()
    onChange?.(c.lat, c.lng)
  }, [map]) // eslint-disable-line react-hooks/exhaustive-deps -- report the initial center once the map is ready; onChange is intentionally excluded
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

interface CommunityMapProps {
  notices: NoticeView[]
  onSelect: (n: NoticeView) => void
  playerPosition: { lat: number; lng: number } | null
  placement: { lat: number; lng: number } | null
  onPlacementMove: (lat: number, lng: number) => void
  placementDraggable?: boolean
  onCenterChange?: (lat: number, lng: number) => void
  now?: number // injectable "now" for the tester time-simulation slider
  center: [number, number]
}

export default function CommunityMap({
  notices,
  onSelect,
  playerPosition,
  placement,
  onPlacementMove,
  placementDraggable = true,
  onCenterChange,
  now = Date.now(),
  center,
}: CommunityMapProps) {
  return (
    <MapContainer center={center} zoom={16} style={{ height: '100%', width: '100%' }} zoomControl={true}>
      <BaseTiles />
      <MapInit center={center} zoom={16} />
      <CenterOnPlayer position={playerPosition} />
      <CenterTracker onChange={onCenterChange} />

      {playerPosition && (
        <CircleMarker
          center={[playerPosition.lat, playerPosition.lng]}
          radius={7}
          pathOptions={{ color: '#3b82f6', fillColor: '#93c5fd', fillOpacity: 1, weight: 2 }}
        />
      )}

      {/* Hide notice markers while placing a new pin to keep the view clean */}
      {!placement &&
        notices.map((n) => {
          // Hide fixed (✨) markers past the linger window (using simulated now).
          if (
            n.status === 'fixed' &&
            n.fixedAt &&
            now - new Date(n.fixedAt).getTime() > FIXED_WINDOW_DAYS * 86_400_000
          ) {
            return null
          }
          return (
            <Marker
              key={n.id}
              position={[n.lat, n.lng]}
              icon={n.status === 'fixed' ? fixedIcon : noticeDivIcon(n, now)}
              eventHandlers={{ click: () => onSelect(n) }}
            />
          )
        })}

      {placement && (
        <Marker
          position={[placement.lat, placement.lng]}
          icon={placementIcon}
          draggable={placementDraggable}
          eventHandlers={{
            dragend: (e) => {
              const { lat, lng } = e.target.getLatLng()
              onPlacementMove(lat, lng)
            },
          }}
        />
      )}
    </MapContainer>
  )
}
