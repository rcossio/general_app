import type { ComponentType } from 'react'
import {
  // nav
  Home,
  User,
  Shield,
  Map,
  TriangleAlert,
  HeartHandshake,
  Flower2,
  CalendarDays,
  MapPinned,
  // event types
  Palette,
  Music,
  Trophy,
  ShoppingBasket,
  Users,
  Church,
  // community categories
  Sprout,
  Trash2,
  CircleAlert,
} from 'lucide-react'

export interface IconProps {
  className?: string
  color?: string
  // string | number to line up with lucide's LucideProps (avoids a propTypes
  // variance error when the map holds both lucide icons and the custom Bench).
  size?: number | string
  strokeWidth?: number | string
}

// Custom bench glyph — lucide has no park bench. Drawn in lucide's stroke style.
export function Bench({ className, color = 'currentColor', size = 24, strokeWidth = 2 }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="7" y1="7" x2="7" y2="12" />
      <line x1="12" y1="7" x2="12" y2="12" />
      <line x1="17" y1="7" x2="17" y2="12" />
      <line x1="6" y1="12" x2="6" y2="18" />
      <line x1="18" y1="12" x2="18" y2="18" />
    </svg>
  )
}

// The icons that are chosen by a data-driven string somewhere (module nav items,
// event types, community categories). Importing them by name here means the
// bundler includes ONLY these — unlike `import * as Icons from 'lucide-react'`,
// which pulls the whole ~1,600-icon set and can't be tree-shaken.
const ICONS: Record<string, ComponentType<IconProps>> = {
  Home,
  User,
  Shield,
  Map,
  TriangleAlert,
  HeartHandshake,
  Flower2,
  CalendarDays,
  MapPinned,
  Palette,
  Music,
  Trophy,
  ShoppingBasket,
  Users,
  Church,
  Sprout,
  Trash2,
  CircleAlert,
  bench: Bench,
}

// Resolve a data-driven icon name to a component (falls back to CircleAlert).
// If you reference a new icon name from data, add it to ICONS above.
export function getIcon(name: string): ComponentType<IconProps> {
  return ICONS[name] ?? CircleAlert
}
