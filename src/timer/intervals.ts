import type { Flow, HangConfig } from '../plan/types'

export interface Interval {
  kind: 'prep' | 'work' | 'rest' | 'pose'
  label: string
  sub?: string
  ms: number
  /** spoken when the interval starts */
  speak?: string
}

export function hangReps(cfg: HangConfig): number {
  return Math.max(1, Math.floor((cfg.totalMin * 60) / (cfg.hangSec + cfg.restSec)))
}

/** Grip for rep i, rotating through the grip list in even blocks. */
export function gripFor(cfg: HangConfig, i: number): string {
  const grips = cfg.grips.length ? cfg.grips : ['Open hand']
  return grips[Math.min(grips.length - 1, Math.floor((i * grips.length) / hangReps(cfg)))]
}

export function hangIntervals(cfg: HangConfig): Interval[] {
  const reps = hangReps(cfg)
  const out: Interval[] = []
  if (cfg.prepSec > 0) {
    out.push({ kind: 'prep', label: 'Get ready', sub: gripFor(cfg, 0), ms: cfg.prepSec * 1000, speak: `Get ready. ${gripFor(cfg, 0)}` })
  }
  for (let i = 0; i < reps; i++) {
    const grip = gripFor(cfg, i)
    out.push({ kind: 'work', label: 'Hang', sub: `${grip} · ${i + 1} of ${reps}`, ms: cfg.hangSec * 1000, speak: 'Hang' })
    if (i < reps - 1) {
      const next = gripFor(cfg, i + 1)
      out.push({
        kind: 'rest',
        label: 'Rest',
        sub: `Next: ${next}`,
        ms: cfg.restSec * 1000,
        speak: next !== grip ? `Rest. Next, ${next}` : 'Rest',
      })
    }
  }
  return out
}

export function flowIntervals(flow: Flow): Interval[] {
  const out: Interval[] = []
  for (const p of flow.poses) {
    if (p.sides) {
      out.push({ kind: 'pose', label: p.name, sub: 'Left side', ms: p.sec * 1000, speak: `${p.name}. Left side` })
      out.push({ kind: 'pose', label: p.name, sub: 'Right side', ms: p.sec * 1000, speak: 'Right side' })
    } else {
      out.push({ kind: 'pose', label: p.name, ms: p.sec * 1000, speak: p.name })
    }
  }
  return out
}

export function totalMs(intervals: Interval[]): number {
  return intervals.reduce((s, i) => s + i.ms, 0)
}

export interface Position {
  index: number
  remainingMs: number
  done: boolean
}

export function locate(intervals: Interval[], elapsedMs: number): Position {
  let t = Math.max(0, elapsedMs)
  for (let i = 0; i < intervals.length; i++) {
    if (t < intervals[i].ms) return { index: i, remainingMs: intervals[i].ms - t, done: false }
    t -= intervals[i].ms
  }
  return { index: intervals.length - 1, remainingMs: 0, done: true }
}

/** Elapsed time at which interval `index` starts. */
export function startOf(intervals: Interval[], index: number): number {
  return totalMs(intervals.slice(0, index))
}

export function fmtClock(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(s / 60)
  return m > 0 ? `${m}:${String(s % 60).padStart(2, '0')}` : `${s}`
}

/** Work intervals fully finished by `elapsedMs`. */
export function completedWork(intervals: Interval[], elapsedMs: number): number {
  let t = 0
  let n = 0
  for (const iv of intervals) {
    t += iv.ms
    if (t > elapsedMs + 250) break
    if (iv.kind === 'work') n++
  }
  return n
}

/** Always m:ss, for longer countdowns. */
export function fmtMinSec(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
