import { addDays, daysBetween, dow, mondayOf } from '../lib/dates'
import { flowSeconds } from '../seed/flows'
import type { DaySlot, Moves, PlannedItem, Program, SessionKind, SessionLog } from './types'

export interface WeekInfo {
  phase: 'pre' | 'plan' | 'post'
  /** 1-based plan week; 0 before the plan starts */
  week: number
  block: number
  deload: boolean
  weekStart: string
}

export function weekInfo(date: string, p: Program): WeekInfo {
  const weekStart = mondayOf(date)
  const offset = daysBetween(p.startDate, date)
  if (offset < 0) return { phase: 'pre', week: 0, block: 0, deload: false, weekStart }
  const week = Math.floor(offset / 7) + 1
  if (week > p.weeks) return { phase: 'post', week, block: 0, deload: false, weekStart }
  return {
    phase: 'plan',
    week,
    block: Math.ceil(week / p.deloadEvery),
    deload: week % p.deloadEvery === 0,
    weekStart,
  }
}

export function planEndDate(p: Program): string {
  return addDays(p.startDate, p.weeks * 7 - 1)
}

const ORDER: Record<SessionKind, number> = { run: 0, hang: 1, climb: 2, lift: 2, yoga: 2, other: 3, stretch: 4 }

export function runTargetKm(p: Program, week: number, dayOfWeek: number, deload: boolean): number | undefined {
  const phase = p.runPlan.find((ph) => week >= ph.fromWeek && week <= ph.toWeek)
  const run = phase?.runs.find((r) => r.dow === dayOfWeek)
  if (!run || run.km <= 0) return undefined
  const km = deload ? run.km * p.deloadRunFactor : run.km
  return Math.round(km * 2) / 2
}

function describe(p: Program, kind: SessionKind, templateId: string | undefined, deload: boolean, km?: number): { title: string; detail: string } {
  switch (kind) {
    case 'hang': {
      const h = p.hang
      return { title: 'Abrahangs', detail: `${h.totalMin} min · ${h.hangSec}s on / ${h.restSec}s off · ${h.edgeMm} mm` }
    }
    case 'stretch':
    case 'yoga': {
      const f = templateId ? p.flows[templateId] : undefined
      if (!f) return { title: kind === 'yoga' ? 'Yoga' : 'Stretch', detail: '' }
      return { title: f.name, detail: `${Math.round(flowSeconds(f) / 60)} min · ${f.focus}` }
    }
    case 'lift': {
      const d = templateId ? p.liftDays[templateId] : undefined
      if (!d) return { title: 'Lift', detail: '' }
      const base = `${d.focus} · ${d.exercises.length} exercises`
      return { title: d.name, detail: deload ? `${base} · deload: 1 fewer set, ~85% load` : base }
    }
    case 'climb':
      return {
        title: 'Climb',
        detail: deload ? 'Deload: shorter session, no limit attempts' : 'Tension Board or spray wall',
      }
    case 'run':
      return { title: 'Run', detail: `${km ?? '?'} km easy${deload ? ' · deload' : ''}` }
    case 'other':
      return { title: 'Other activity', detail: '' }
  }
}

function makeItem(p: Program, date: string, slot: DaySlot, deload: boolean, km?: number): PlannedItem {
  return {
    id: `${date}:${slot.slot}`,
    date,
    kind: slot.kind,
    templateId: slot.templateId,
    optional: slot.optional,
    targetKm: km,
    deload,
    ...describe(p, slot.kind, slot.templateId, deload, km),
  }
}

const HANG: DaySlot = { slot: 'hang', kind: 'hang' }
const STRETCH: DaySlot = { slot: 'stretch', kind: 'stretch', templateId: 'stretch' }

/** Every planned item for the 7 days starting at weekStart (a Monday), keyed by date after applying moves. */
export function planForWeek(weekStart: string, p: Program, moves: Moves = {}): Record<string, PlannedItem[]> {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const items: PlannedItem[] = []

  for (const date of days) {
    const info = weekInfo(date, p)
    const d = dow(date)
    if (info.phase !== 'plan') {
      items.push(makeItem(p, date, HANG, false), makeItem(p, date, STRETCH, false))
      continue
    }
    const slots = p.weekLayout[d] ?? []
    items.push(makeItem(p, date, HANG, info.deload))
    for (const s of slots) items.push(makeItem(p, date, s, info.deload))
    const km = runTargetKm(p, info.week, d, info.deload)
    if (km) items.push(makeItem(p, date, { slot: `run-${d}`, kind: 'run' }, info.deload, km))
    // The rest-day yoga flow replaces the short daily stretch.
    if (!slots.some((s) => s.kind === 'yoga')) items.push(makeItem(p, date, STRETCH, info.deload))
  }

  const out: Record<string, PlannedItem[]> = Object.fromEntries(days.map((d) => [d, []]))
  for (const it of items) {
    const target = moves[it.id]
    const date = target && target in out ? target : it.date
    out[date].push({ ...it, date })
  }
  for (const d of days) out[d].sort((a, b) => ORDER[a.kind] - ORDER[b.kind])
  return out
}

export function planForDate(date: string, p: Program, moves: Moves = {}): PlannedItem[] {
  return planForWeek(mondayOf(date), p, moves)[date] ?? []
}

/** Planned item ids look like `2026-10-28:lift`; extras look like `x:2026-10-28:run::1730000000000`. */
export function extraId(date: string, kind: SessionKind, templateId = ''): string {
  return `x:${date}:${kind}:${templateId}:${Date.now()}`
}

export function resolveItem(id: string, p: Program, moves: Moves = {}): PlannedItem | undefined {
  if (id.startsWith('x:')) {
    const [, date, kind, templateId] = id.split(':')
    const info = weekInfo(date, p)
    const deload = info.deload
    const k = kind as SessionKind
    return {
      id,
      date,
      kind: k,
      templateId: templateId || undefined,
      deload,
      extra: true,
      ...describe(p, k, templateId || undefined, deload, k === 'run' ? 10 : undefined),
      ...(k === 'run' ? { targetKm: undefined, detail: 'Extra run' } : {}),
    }
  }
  const origDate = id.slice(0, 10)
  const week = planForWeek(mondayOf(origDate), p, moves)
  for (const list of Object.values(week)) {
    const hit = list.find((it) => it.id === id)
    if (hit) return hit
  }
  return undefined
}

/** Rebuilds enough of an item from its log when the plan no longer contains it. */
export function itemFromLog(log: SessionLog): PlannedItem {
  return { id: log.planItemId, date: log.date, kind: log.kind, templateId: log.templateId, title: log.title, detail: '', deload: !!log.deload, extra: log.planItemId.startsWith('x:') }
}

/** Logged sessions on these days that are not part of the plan: extras, or sessions the plan has since dropped. */
export function unplannedItems(logs: SessionLog[], planned: PlannedItem[], p: Program, moves: Moves = {}): PlannedItem[] {
  const ids = new Set(planned.map((i) => i.id))
  return logs
    .filter((l) => !ids.has(l.planItemId))
    .map((l) => {
      const it = l.planItemId.startsWith('x:') ? resolveItem(l.planItemId, p, moves) : undefined
      return it ?? { ...itemFromLog(l), detail: 'Logged session' }
    })
}
