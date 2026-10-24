import { describe, expect, it } from 'vitest'
import { cloneDefaultProgram } from '../seed/program'
import { completedWork, gripFor, hangIntervals, hangReps, locate, totalMs } from './intervals'

const cfg = cloneDefaultProgram().hang

describe('hang intervals', () => {
  it('fits 20 reps of 10/20 into 10 minutes', () => {
    expect(hangReps(cfg)).toBe(20)
    const iv = hangIntervals(cfg)
    expect(iv.filter((i) => i.kind === 'work')).toHaveLength(20)
    expect(iv.filter((i) => i.kind === 'rest')).toHaveLength(19)
    // prep + 20 hangs + 19 rests
    expect(totalMs(iv)).toBe(10_000 + 20 * 10_000 + 19 * 20_000)
  })
  it('rotates through every grip in order', () => {
    const seen = Array.from({ length: 20 }, (_, i) => gripFor(cfg, i))
    expect(new Set(seen).size).toBe(6)
    expect(seen[0]).toBe(cfg.grips[0])
    expect(seen[19]).toBe(cfg.grips[5])
  })
})

describe('locate', () => {
  const iv = hangIntervals(cfg)
  it('finds the current interval and time left', () => {
    expect(locate(iv, 0)).toEqual({ index: 0, remainingMs: 10_000, done: false })
    expect(locate(iv, 12_000)).toEqual({ index: 1, remainingMs: 8_000, done: false })
    expect(locate(iv, 25_000)).toMatchObject({ index: 2, remainingMs: 15_000 })
  })
  it('reports done past the end', () => {
    expect(locate(iv, totalMs(iv) + 1).done).toBe(true)
  })
  it('counts finished hangs', () => {
    expect(completedWork(iv, 19_000)).toBe(0)
    expect(completedWork(iv, 20_000)).toBe(1)
    expect(completedWork(iv, totalMs(iv))).toBe(20)
  })
})
