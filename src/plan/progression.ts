import type { ExerciseLog, LiftExercise, SetLog } from './types'
import { fromDisplay, roundToPlate, stepSize, toDisplay, type Units } from './units'

export interface PastEntry {
  log: ExerciseLog
  deload: boolean
}

export interface Suggestion {
  sets: number
  /** working weight in kg (weight and carry modes); undefined means "choose a starting weight" */
  weightKg?: number
  /** per-set reps/seconds/metres from the last regular session, used as placeholders */
  lastValues: (number | undefined)[]
  note: string
}

export const DELOAD_LOAD = 0.85
const RESET_LOAD = 0.9

function value(s: SetLog, ex: LiftExercise): number | undefined {
  if (ex.mode === 'time') return s.seconds
  if (ex.mode === 'carry') return s.meters
  return s.reps
}

function workingWeight(log: ExerciseLog): number | undefined {
  const ws = log.sets.filter((s) => s.done && s.weight !== undefined).map((s) => s.weight as number)
  return ws.length ? Math.max(...ws) : undefined
}

function hitTop(log: ExerciseLog, ex: LiftExercise): boolean {
  const done = log.sets.filter((s) => s.done)
  return done.length >= ex.sets && done.every((s) => (value(s, ex) ?? 0) >= ex.repMax)
}

function missed(log: ExerciseLog, ex: LiftExercise): boolean {
  const done = log.sets.filter((s) => s.done)
  return done.length < ex.sets || done.some((s) => (value(s, ex) ?? 0) < ex.repMin)
}

const unitWord = (ex: LiftExercise) => (ex.mode === 'time' ? 's' : ex.mode === 'carry' ? ' m' : '')

/**
 * Double progression. History is newest-first; deload sessions are ignored when deciding the next load.
 */
export function suggest(ex: LiftExercise, history: PastEntry[], opts: { deload: boolean; units: Units }): Suggestion {
  const regular = history.filter((h) => !h.deload && h.log.sets.some((s) => s.done)).map((h) => h.log)
  const [last, prev] = regular
  const sets = opts.deload ? Math.max(1, ex.sets - 1) : ex.sets
  const lastValues = last ? last.sets.filter((s) => s.done).map((s) => value(s, ex)) : []
  const loaded = ex.mode === 'weight' || ex.mode === 'carry'

  if (!last) {
    return {
      sets,
      lastValues,
      note: loaded
        ? `First session: pick a weight you could do for ${ex.repMax}${unitWord(ex)} with 2 reps to spare.`
        : `First session: aim for ${ex.repMin}–${ex.repMax}${unitWord(ex)} per set with good form.`,
    }
  }

  if (!loaded) {
    if (opts.deload) return { sets, lastValues, note: 'Deload: easy reps, stop well short of failure.' }
    if (hitTop(last, ex)) return { sets, lastValues, note: 'Top of the range last time. Add load or use a harder variation.' }
    const shown = lastValues.filter((v) => v !== undefined).join(', ')
    return { sets, lastValues, note: `Last time ${shown}${unitWord(ex)}. Beat one set by a rep.` }
  }

  const lastKg = workingWeight(last) ?? 0
  const lastDisp = roundToPlate(toDisplay(lastKg, opts.units), opts.units)
  const fmt = (v: number) => `${Math.round(v * 10) / 10} ${opts.units}`

  if (opts.deload) {
    const disp = roundToPlate(lastDisp * DELOAD_LOAD, opts.units)
    return { sets, weightKg: fromDisplay(disp, opts.units), lastValues, note: `Deload: ${sets} sets at ~85% (${fmt(disp)}).` }
  }

  if (hitTop(last, ex)) {
    const disp = lastDisp + stepSize(ex.step, opts.units)
    return { sets, weightKg: fromDisplay(disp, opts.units), lastValues, note: `Up from ${fmt(lastDisp)}: you hit the top of the range.` }
  }

  if (prev && missed(last, ex) && missed(prev, ex)) {
    const disp = roundToPlate(lastDisp * RESET_LOAD, opts.units)
    return { sets, weightKg: fromDisplay(disp, opts.units), lastValues, note: `Reset 10% after two tough sessions (was ${fmt(lastDisp)}).` }
  }

  return { sets, weightKg: fromDisplay(lastDisp, opts.units), lastValues, note: `Same weight. Add a rep where you can.` }
}

/** Epley estimate, only meaningful for weight × reps sets. */
export function estimate1RM(weightKg: number, reps: number): number {
  if (reps <= 1) return weightKg
  return weightKg * (1 + reps / 30)
}
