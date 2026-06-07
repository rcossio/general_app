import * as Icons from 'lucide-react'

// Resolves a category's icon. Most are lucide icon names; 'bench' is a custom
// SVG (lucide has no park bench), drawn in the same stroke style as lucide.

export interface IconProps {
  className?: string
  color?: string
  size?: number
  strokeWidth?: number
}

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
      {/* seat + backrest rail */}
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="4" y1="7" x2="20" y2="7" />
      {/* backrest slats */}
      <line x1="7" y1="7" x2="7" y2="12" />
      <line x1="12" y1="7" x2="12" y2="12" />
      <line x1="17" y1="7" x2="17" y2="12" />
      {/* legs */}
      <line x1="6" y1="12" x2="6" y2="18" />
      <line x1="18" y1="12" x2="18" y2="18" />
    </svg>
  )
}

export function getIconComponent(name: string): React.ComponentType<IconProps> {
  if (name === 'bench') return Bench
  const map = Icons as unknown as Record<string, React.ComponentType<IconProps>>
  return map[name] ?? map.CircleAlert
}
