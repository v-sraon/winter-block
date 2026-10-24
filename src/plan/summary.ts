import { gradeLabel } from './grades'
import type { SessionLog, Settings } from './types'
import { fmtWeight } from './units'

export function fmtDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.round(seconds % 60)
  const mm = String(m).padStart(h ? 2 : 1, '0')
  return `${h ? h + ':' : ''}${mm}:${String(s).padStart(2, '0')}`
}

export function fmtPace(seconds: number, km: number): string {
  if (!km || !seconds) return '—'
  const per = seconds / km
  return `${Math.floor(per / 60)}:${String(Math.round(per % 60)).padStart(2, '0')}/km`
}

export function summarize(log: SessionLog, settings: Settings): string {
  if (log.status === 'skipped') return 'Skipped'
  const parts: string[] = []
  if (log.run) {
    parts.push(`${log.run.km} km`)
    if (log.run.seconds) parts.push(fmtDuration(log.run.seconds), fmtPace(log.run.seconds, log.run.km))
  } else if (log.lift) {
    const sets = log.lift.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0)
    parts.push(`${sets} sets`)
    const top = log.lift.exercises.find((e) => e.mode === 'weight' && e.sets.some((s) => s.done && s.weight))
    if (top) {
      const w = Math.max(...top.sets.filter((s) => s.done).map((s) => s.weight ?? 0))
      parts.push(`${top.name} ${fmtWeight(w, settings.units)}`)
    }
  } else if (log.hang) {
    parts.push(`${log.hang.reps}/${log.hang.plannedReps} hangs`, `${log.hang.edgeMm} mm`)
    if (log.hang.loadKg) parts.push(fmtWeight(log.hang.loadKg, settings.units))
  } else if (log.climb) {
    const sends = log.climb.problems.filter((p) => p.result !== 'project')
    parts.push(log.climb.board)
    parts.push(`${log.climb.problems.length} problems`, `${sends.length} sent`)
    if (sends.length) parts.push(`best ${gradeLabel(Math.max(...sends.map((p) => p.grade)), settings.gradeScale)}`)
  } else if (log.other) {
    parts.push(log.other.activity)
    if (log.other.km) parts.push(`${log.other.km} km`)
  }
  if (log.durationMin && !log.run) parts.push(`${log.durationMin} min`)
  if (log.effort) parts.push(`effort ${log.effort}`)
  return parts.join(' · ') || 'Done'
}
