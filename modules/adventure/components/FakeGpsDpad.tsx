'use client'

import { useRef, useCallback } from 'react'
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react'

const STEP = 0.00005
const HOLD_INTERVAL = 120

interface FakeGpsDpadProps {
  move: (dlat: number, dlng: number) => void
}

export function FakeGpsDpad({ move }: FakeGpsDpadProps) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startMove = useCallback((dlat: number, dlng: number) => {
    move(dlat, dlng)
    intervalRef.current = setInterval(() => move(dlat, dlng), HOLD_INTERVAL)
  }, [move])

  const stopMove = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const btn = (dlat: number, dlng: number, icon: React.ReactNode, extra = '') => (
    <button
      onPointerDown={(e) => { e.preventDefault(); startMove(dlat, dlng) }}
      onPointerUp={stopMove}
      onPointerLeave={stopMove}
      className={`flex items-center justify-center h-12 rounded-xl bg-black/40 active:bg-black/60 text-white touch-none select-none ${extra}`}
    >
      {icon}
    </button>
  )

  return (
    <div className="flex flex-col gap-1 w-24">
      {btn( STEP,  0,    <ArrowUp    className="h-5 w-5" />, 'w-full')}
      <div className="flex gap-1">
        {btn( 0,  -STEP, <ArrowLeft  className="h-5 w-5" />, 'flex-1')}
        {btn( 0,   STEP, <ArrowRight className="h-5 w-5" />, 'flex-1')}
      </div>
      {btn(-STEP,  0,    <ArrowDown  className="h-5 w-5" />, 'w-full')}
    </div>
  )
}
