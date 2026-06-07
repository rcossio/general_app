'use client'

import type { Dispatch, SetStateAction } from 'react'

interface TimeSimSheetProps {
  simEnabled: boolean
  setSimEnabled: Dispatch<SetStateAction<boolean>>
  simDays: number
  setSimDays: (days: number) => void
  onClose: () => void
}

// Tester-only time-simulation sheet (opt-in via the gear). Shifts the displayed
// "now" so notices age (yellow→red) and fixed markers expire — purely visual,
// no data is changed.
export function TimeSimSheet({ simEnabled, setSimEnabled, simDays, setSimDays, onClose }: TimeSimSheetProps) {
  return (
    <div className="absolute inset-0 z-[2000] flex items-end" onClick={onClose}>
      <div className="w-full bg-surface rounded-t-2xl shadow-2xl border-t border-brand-border p-5 pb-8" onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 bg-brand-border rounded-full mx-auto mb-4" />
        <h2 className="font-rubik font-bold text-base mb-4">Ajustes</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-rubik font-bold">Simulación de tiempo</p>
            <p className="text-[11px] text-brand-gray">Tester · ver cómo envejecen los puntos</p>
          </div>
          <button
            onClick={() => setSimEnabled((v) => !v)}
            aria-label="Toggle simulación"
            className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${simEnabled ? 'bg-brand-green' : 'bg-brand-border'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${simEnabled ? 'translate-x-5' : ''}`} />
          </button>
        </div>
        {simEnabled && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-rubik font-bold">+{simDays} días</span>
              <button onClick={() => setSimDays(0)} className="text-xs text-brand-green font-rubik font-bold">Reset</button>
            </div>
            <input
              type="range"
              min={0}
              max={60}
              value={simDays}
              onChange={(e) => setSimDays(Number(e.target.value))}
              className="w-full accent-brand-green"
            />
            <p className="text-[10px] text-brand-gray mt-1">
              Los puntos envejecen (amarillo→rojo) y los ✨ desaparecen a los 14 días simulados. Solo visual.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
