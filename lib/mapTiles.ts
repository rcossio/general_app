// Map tile providers for the adventure map.
//
// OSM is the default and the permanent fallback — it is never removed. MapTiler
// is opt-in via NEXT_PUBLIC_MAP_PROVIDER=maptiler. The runtime fallback in
// AdventureMap swaps back to OSM if the selected provider starts failing, so the
// map never goes blank mid-game (e.g. on a MapTiler quota/auth error).

export interface TileProvider {
  id: string
  url: string
  attribution: string
  maxZoom: number
}

const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY
const MAPTILER_STYLE = process.env.NEXT_PUBLIC_MAPTILER_STYLE ?? 'streets-v4'

export const OSM_PROVIDER: TileProvider = {
  id: 'osm',
  url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  maxZoom: 19,
}

export const TILE_PROVIDERS: Record<string, TileProvider> = {
  osm: OSM_PROVIDER,
  maptiler: {
    id: 'maptiler',
    url: `https://api.maptiler.com/maps/${MAPTILER_STYLE}/{z}/{x}/{y}.png?key=${MAPTILER_KEY ?? ''}`,
    attribution:
      '&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 20,
  },
}

// Resolve the configured provider. Falls back to OSM when the choice is unknown,
// or when MapTiler is selected without a key (misconfiguration safety).
export function getInitialProvider(): TileProvider {
  const choice = process.env.NEXT_PUBLIC_MAP_PROVIDER ?? 'osm'
  const provider = TILE_PROVIDERS[choice]
  if (!provider) return OSM_PROVIDER
  if (provider.id === 'maptiler' && !MAPTILER_KEY) return OSM_PROVIDER
  return provider
}
