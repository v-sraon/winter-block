import { describe, expect, it } from 'vitest'
import { LIBRARY } from '../seed/lifts'
import { suggest, type PastEntry } from './progression'
import type { ExerciseLog } from './types'

const squat = LIBRARY.backSquat // 3 × 5–8, large step
const dips = LIBRARY.ringDip // reps mode, 3 × 6–10

const lifted = (weight: number, reps: number[]): ExerciseLog => ({
  exerciseId: squat.id,
  name: squat.name,
  mode: 'weight',
  sets: reps.map((r) => ({ weight, reps: r, done: true })),
})
const entry = (log: ExerciseLog, deload = false): PastEntry => ({ log, deload })
const kg = { deload: false, units: 'kg' as const }

describe('suggest (weight mode)', () => {
  it('asks for a starting weight with no history', () => {
    const s = suggest(squat, [], kg)
    expect(s.weightKg).toBeUndefined()
    expect(s.sets).toBe(3)
  })
  it('adds a large step when every set hits the top of the range', () => {
    expect(suggest(squat, [entry(lifted(60, [8, 8, 8]))], kg).weightKg).toBe(62.5)
  })
  it('holds the weight when inside the range', () => {
    expect(suggest(squat, [entry(lifted(60, [8, 7, 6]))], kg).weightKg).toBe(60)
  })
  it('resets 10% after two sessions below the range', () => {
    const s = suggest(squat, [entry(lifted(60, [5, 4, 4])), entry(lifted(60, [5, 4, 3]))], kg)
    expect(s.weightKg).toBe(53.75)
  })
  it('ignores deload sessions when progressing', () => {
    const s = suggest(squat, [entry(lifted(50, [5, 5]), true), entry(lifted(60, [8, 8, 8]))], kg)
    expect(s.weightKg).toBe(62.5)
  })
  it('drops a set and ~15% load in deload weeks', () => {
    const s = suggest(squat, [entry(lifted(100, [6, 6, 6]))], { deload: true, units: 'kg' })
    expect(s.sets).toBe(2)
    expect(s.weightKg).toBe(85)
  })
  it('progresses in pounds with 5 lb jumps', () => {
    const lb135 = 135 / 2.20462
    const s = suggest(squat, [entry(lifted(lb135, [8, 8, 8]))], { deload: false, units: 'lb' })
    expect(Math.round((s.weightKg as number) * 2.20462 * 10) / 10).toBe(140)
  })
})

describe('suggest (reps mode)', () => {
  const dipLog = (reps: number[]): ExerciseLog => ({
    exerciseId: dips.id,
    name: dips.name,
    mode: 'reps',
    sets: reps.map((r) => ({ reps: r, done: true })),
  })
  it('suggests beating last time', () => {
    const s = suggest(dips, [entry(dipLog([8, 7, 6]))], kg)
    expect(s.lastValues).toEqual([8, 7, 6])
    expect(s.note).toMatch(/Beat/)
  })
  it('suggests a harder variation at the top of the range', () => {
    expect(suggest(dips, [entry(dipLog([10, 10, 10]))], kg).note).toMatch(/harder variation/)
  })
})

describe('suggest (empty history entries)', () => {
  it('ignores sessions where the exercise had no completed sets', () => {
    const empty: ExerciseLog = { exerciseId: squat.id, name: squat.name, mode: 'weight', sets: [] }
    const s = suggest(squat, [entry(empty), entry(lifted(60, [6, 6, 6]))], kg)
    expect(s.weightKg).toBe(60)
  })
})
