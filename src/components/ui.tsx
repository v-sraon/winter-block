import { Bike, ChevronLeft, Dumbbell, Flower2, Footprints, Hand, Mountain, PersonStanding, X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { SessionKind } from '../plan/types'
import { back } from '../router'

export function Header({ title, sub, onBack, right }: { title: ReactNode; sub?: ReactNode; onBack?: boolean | (() => void); right?: ReactNode }) {
  return (
    <div className="header">
      {onBack && (
        <button className="icon-btn" aria-label="Back" onClick={typeof onBack === 'function' ? onBack : back}>
          <ChevronLeft size={26} />
        </button>
      )}
      <div className="titles">
        <h1 style={onBack ? { fontSize: 22 } : undefined}>{title}</h1>
        {sub && <div className="sub">{sub}</div>}
      </div>
      {right}
    </div>
  )
}

const ICONS: Record<SessionKind, typeof Hand> = {
  hang: Hand,
  stretch: PersonStanding,
  yoga: Flower2,
  climb: Mountain,
  lift: Dumbbell,
  run: Footprints,
  other: Bike,
}

export function KindIcon({ kind, size = 20 }: { kind: SessionKind; size?: number }) {
  const I = ICONS[kind]
  return <I size={size} strokeWidth={2.2} />
}

export function KindDot({ kind, small }: { kind: SessionKind; small?: boolean }) {
  return (
    <span className={`kind-dot kind-${kind}${small ? ' sm' : ''}`}>
      <KindIcon kind={kind} size={small ? 15 : 21} />
    </span>
  )
}

export function Segmented<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="seg" role="radiogroup">
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={o.value === value} className={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function EffortPicker({ value, onChange, label = 'Effort (1–10)', hint }: { value?: number; onChange: (v: number | undefined) => void; label?: string; hint?: ReactNode }) {
  return (
    <div className="field">
      <span>{label}</span>
      <div className="effort">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button key={n} type="button" className={value === n ? 'on' : ''} onClick={() => onChange(value === n ? undefined : n)}>
            {n}
          </button>
        ))}
      </div>
      {hint}
    </div>
  )
}

/** Free-typing numeric input that reports undefined when empty. Keeps the typed text while focused. */
export function NumInput({ value, onChange, placeholder, decimal = true, className = '', ariaLabel }: { value: number | undefined; onChange: (v: number | undefined) => void; placeholder?: string; decimal?: boolean; className?: string; ariaLabel?: string }) {
  const fmt = (v: number | undefined) => (v === undefined || Number.isNaN(v) ? '' : String(v))
  const [text, setText] = useState(fmt(value))
  const focused = useRef(false)
  useEffect(() => {
    if (!focused.current) setText(fmt(value))
  }, [value])
  return (
    <input
      className={`input num ${className}`}
      inputMode={decimal ? 'decimal' : 'numeric'}
      aria-label={ariaLabel}
      placeholder={placeholder}
      value={text}
      onFocus={() => (focused.current = true)}
      onBlur={() => {
        focused.current = false
        setText(fmt(value))
      }}
      onChange={(e) => {
        const raw = e.target.value.replace(',', '.')
        setText(raw)
        if (raw.trim() === '') return onChange(undefined)
        const n = Number(raw.endsWith('.') ? raw.slice(0, -1) : raw)
        if (!Number.isNaN(n)) onChange(n)
      }}
    />
  )
}

export function Stepper({ value, onChange, min = 0, max = 999, step = 1 }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number }) {
  return (
    <div className="stepper">
      <button type="button" className="btn sm" onClick={() => onChange(Math.max(min, value - step))} aria-label="Decrease">
        −
      </button>
      <NumInput value={value} onChange={(v) => onChange(Math.min(max, Math.max(min, v ?? min)))} />
      <button type="button" className="btn sm" onClick={() => onChange(Math.min(max, value + step))} aria-label="Increase">
        +
      </button>
    </div>
  )
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="grab" />
        {title && (
          <div className="spread" style={{ marginBottom: 8 }}>
            <h2>{title}</h2>
            <button className="icon-btn" aria-label="Close" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  )
}
