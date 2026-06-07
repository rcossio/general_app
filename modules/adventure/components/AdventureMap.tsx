'use client'

import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { getInitialProvider, OSM_PROVIDER } from '@/lib/mapTiles'

// Base map tiles. Uses the provider chosen via NEXT_PUBLIC_MAP_PROVIDER, but
// auto-falls back to OSM if that provider starts erroring (e.g. MapTiler quota
// or auth failure) so the map never goes blank during a session.
function BaseTiles() {
  const [provider, setProvider] = useState(getInitialProvider)
  const errorCount = useRef(0)

  return (
    <TileLayer
      key={provider.id}
      url={provider.url}
      attribution={provider.attribution}
      maxZoom={provider.maxZoom}
      eventHandlers={{
        tileerror: () => {
          if (provider.id === 'osm') return
          errorCount.current += 1
          // A few errors can be transient single tiles; a burst means the
          // provider is down — switch to the OSM fallback.
          if (errorCount.current >= 3) setProvider(OSM_PROVIDER)
        },
      }}
    />
  )
}

function exclamationIcon(color: string) {
  return L.divIcon({
    html: `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:15px;color:${color};line-height:1;pointer-events:none;">!</div>`,
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

// Initial map zoom — higher = closer, so nearby points are easier to tell apart.
const INITIAL_ZOOM = 18

// [id, dark, light]
const GRADIENTS: [string, string, string][] = [
  ['loc-grad-orange',       '#f97316', '#fed7aa'],  // unvisited location — bright orange
  ['loc-grad-orange-light', '#fdba74', '#fff7ed'],  // visited — light orange
  ['loc-grad-red',          '#b91c1c', '#fecaca'],  // unvisited event — dark red-orange
  ['loc-grad-gray',         '#9ca3af', '#f3f4f6'],
  ['loc-grad-green',        '#22c55e', '#dcfce7'],
  ['loc-grad-blue',         '#3b82f6', '#dbeafe'],
]

const STROKE: Record<string, string> = Object.fromEntries(
  GRADIENTS.map(([id, dark]) => [id, dark])
)

function GradientDefs() {
  const map = useMap()
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const svgEl = map.getPanes().overlayPane?.querySelector('svg')
      if (!svgEl || svgEl.querySelector('#loc-grad-orange-light')) return
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
  // True when a closed location's resolved state changed due to new flags —
  // re-brightens the marker to the unvisited color to signal something new.
  hasUpdate: boolean
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
  follow: boolean
  recenterSignal: number
  onUserPan: () => void
}

function PlayerTracker({
  position,
  follow,
  recenterSignal,
  onUserPan,
}: {
  position: PlayerPosition | null
  follow: boolean
  recenterSignal: number
  onUserPan: () => void
}) {
  const map = useMap()
  const centered = useRef(false)

  // Center once on the first GPS fix.
  useEffect(() => {
    if (position && !centered.current) {
      map.setView([position.lat, position.lng], INITIAL_ZOOM)
      centered.current = true
    }
  }, [position, map])

  // Explicit recenter (center button / fake-GPS teleport): hard center, keep zoom.
  useEffect(() => {
    if (recenterSignal && position) {
      map.setView([position.lat, position.lng], map.getZoom())
    }
  }, [recenterSignal]) // eslint-disable-line react-hooks/exhaustive-deps -- recenter only when the signal fires; position & map are intentionally excluded so panning isn't overridden on every GPS update

  // Dead-zone follow: pan only when the marker leaves the centered 60% box, so
  // small GPS jitter is absorbed and the player is kept on-screen as they walk.
  useEffect(() => {
    if (!follow || !position || !centered.current) return
    const p = map.latLngToContainerPoint([position.lat, position.lng])
    const { x: w, y: h } = map.getSize()
    const mx = w * 0.25 // 25% margin each side → 50% box
    const my = h * 0.25
    let dx = 0
    let dy = 0
    if (p.x < mx) dx = p.x - mx
    else if (p.x > w - mx) dx = p.x - (w - mx)
    if (p.y < my) dy = p.y - my
    else if (p.y > h - my) dy = p.y - (h - my)
    if (dx !== 0 || dy !== 0) map.panBy([dx, dy], { animate: false })
  }, [position, follow, map])

  // A real user drag pauses follow (our programmatic panBy/setView don't fire 'dragstart').
  useEffect(() => {
    map.on('dragstart', onUserPan)
    return () => {
      map.off('dragstart', onUserPan)
    }
  }, [map, onUserPan])

  return null
}

interface ArrowDesc {
  id: string
  x: number
  y: number
  angle: number
  color: string
}

// Edge arrows pointing toward visible locations that are currently off-screen.
// Rendered as an absolute overlay INSIDE the map container (iOS-safe: absolute,
// not fixed; pointer-events-none so it never blocks map gestures).
function ViewportArrows({ locations }: { locations: MapLocation[] }) {
  const map = useMap()
  const [arrows, setArrows] = useState<ArrowDesc[]>([])

  useEffect(() => {
    const recompute = () => {
      const { x: w, y: h } = map.getSize()
      const cx = w / 2
      const cy = h / 2
      const pad = 26
      const halfW = cx - pad
      const halfH = cy - pad
      const next: ArrowDesc[] = []
      for (const loc of locations) {
        // Only guide to "bright orange" points (unvisited, or re-brightened via
        // hasUpdate). Skip already-visited locations (light orange).
        if (loc.visited && !loc.hasUpdate) continue
        const p = map.latLngToContainerPoint([loc.lat, loc.lng])
        if (p.x >= 0 && p.x <= w && p.y >= 0 && p.y <= h) continue // on-screen
        const dx = p.x - cx
        const dy = p.y - cy
        if (dx === 0 && dy === 0) continue
        // Clamp to the padded viewport border along the centre→point ray.
        const scale = Math.min(halfW / Math.abs(dx || 1e-6), halfH / Math.abs(dy || 1e-6))
        next.push({
          id: loc.id,
          x: cx + dx * scale,
          y: cy + dy * scale,
          angle: (Math.atan2(dy, dx) * 180) / Math.PI,
          color: STROKE['loc-grad-orange'],
        })
      }
      setArrows(next)
    }
    recompute()
    map.on('move zoom resize', recompute)
    return () => {
      map.off('move zoom resize', recompute)
    }
  }, [map, locations])

  return (
    <div className="pointer-events-none absolute inset-0 z-[1000]">
      {arrows.map((a) => (
        <div
          key={a.id}
          className="absolute"
          style={{ left: a.x, top: a.y, transform: `translate(-50%, -50%) rotate(${a.angle}deg)` }}
        >
          <svg width="22" height="22" viewBox="0 0 22 22" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.35))' }}>
            <path d="M4 4 L18 11 L4 18 Z" fill={a.color} />
          </svg>
        </div>
      ))}
    </div>
  )
}

export default function AdventureMap({
  locations,
  playerPosition,
  onLocationClick,
  nearbyLocationIds,
  follow,
  recenterSignal,
  onUserPan,
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
      zoom={INITIAL_ZOOM}
      style={{ height: '100%', width: '100%' }}
      zoomControl={true}
      keyboard={false}
    >
      <BaseTiles />

      <GradientDefs />
      <PlayerTracker
        position={playerPosition}
        follow={follow}
        recenterSignal={recenterSignal}
        onUserPan={onUserPan}
      />

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
          : loc.visited && !loc.hasUpdate
          ? 'loc-grad-orange-light'
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

      <ViewportArrows locations={visibleLocations} />
    </MapContainer>
  )
}
