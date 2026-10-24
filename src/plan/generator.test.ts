import { describe, expect, it } from 'vitest'
import { cloneDefaultProgram } from '../seed/program'
import { planForDate, planForWeek, planEndDate, resolveItem, unplannedItems, weekInfo } from './generator'

const p = cloneDefaultProgram()
const kinds = (date: string) => planForDate(date, p).map((i) => `${i.kind}${i.templateId ? ':' + i.templateId : ''}${i.targetKm ? ':' + i.targetKm : ''}`)

describe('weekInfo', () => {
  it('marks days before the start as pre-season', () => {
    expect(weekInfo('2026-10-24', p).phase).toBe('pre')
  })
  it('numbers weeks and blocks from the start date', () => {
    expect(weekInfo('2026-10-26', p)).toMatchObject({ phase: 'plan', week: 1, block: 1, deload: false })
    expect(weekInfo('2026-11-22', p)).toMatchObject({ week: 4, block: 1, deload: true })
    expect(weekInfo('2026-11-23', p)).toMatchObject({ week: 5, block: 2, deload: false })
    expect(weekInfo('2027-02-14', p)).toMatchObject({ week: 16, block: 4, deload: true })
    expect(weekInfo('2027-02-15', p).phase).toBe('post')
  })
  it('ends on the last Sunday', () => {
    expect(planEndDate(p)).toBe('2027-02-14')
  })
})

describe('planForDate', () => {
  it('pre-season days still get Abrahangs and the daily stretch', () => {
    expect(kinds('2026-10-24')).toEqual(['hang', 'stretch:stretch'])
  })
  it('rest days get yoga instead of the daily stretch', () => {
    expect(kinds('2026-10-26')).toEqual(['hang', 'yoga:yogaA'])
    expect(kinds('2026-10-30')).toEqual(['hang', 'yoga:yogaB'])
  })
  it('lays out climb, lift and run days', () => {
    expect(kinds('2026-10-27')).toEqual(['hang', 'climb', 'stretch:stretch'])
    expect(kinds('2026-10-28')).toEqual(['hang', 'lift:A', 'stretch:stretch'])
    expect(kinds('2026-10-31')).toEqual(['run:10', 'hang', 'lift:C', 'stretch:stretch'])
    expect(kinds('2026-11-01')).toEqual(['hang', 'lift:B', 'stretch:stretch'])
  })
  it('adds the Wednesday run from week 5 and builds it up', () => {
    expect(kinds('2026-11-25')).toContain('run:6')
    expect(kinds('2026-12-23')).toContain('run:8')
    expect(kinds('2027-01-20')).toContain('run:10')
  })
  it('cuts run distance in deload weeks', () => {
    expect(kinds('2026-11-21')).toContain('run:7')
    expect(kinds('2026-12-16')).toContain('run:4')
  })
  it('marks the optional lift', () => {
    expect(planForDate('2026-10-31', p).find((i) => i.kind === 'lift')?.optional).toBe(true)
  })
})

describe('moves', () => {
  it('moves an item to another day in the same week', () => {
    const week = planForWeek('2026-10-26', p, { '2026-10-27:climb': '2026-10-29' })
    expect(week['2026-10-27'].map((i) => i.kind)).not.toContain('climb')
    expect(week['2026-10-29'].filter((i) => i.kind === 'climb')).toHaveLength(2)
  })
  it('ignores moves outside the week', () => {
    const week = planForWeek('2026-10-26', p, { '2026-10-27:climb': '2026-11-10' })
    expect(week['2026-10-27'].map((i) => i.kind)).toContain('climb')
  })
  it('resolves a moved item by id', () => {
    const it = resolveItem('2026-10-27:climb', p, { '2026-10-27:climb': '2026-10-29' })
    expect(it?.date).toBe('2026-10-29')
  })
  it('resolves extra items', () => {
    const it = resolveItem('x:2026-10-28:lift:C:123', p)
    expect(it).toMatchObject({ kind: 'lift', templateId: 'C', date: '2026-10-28', extra: true })
  })
})

describe('unplannedItems', () => {
  const log = (planItemId: string, kind: 'run' | 'climb' = 'run') => ({
    planItemId, date: '2026-10-28', kind, title: 'X', status: 'done' as const, createdAt: 0, updatedAt: 0,
  })
  it('returns extras and logs the plan no longer has, but not planned ones', () => {
    const planned = planForDate('2026-10-28', p)
    const out = unplannedItems([log('2026-10-28:lift'), log('x:2026-10-28:run::1'), log('2026-10-28:climb', 'climb')], planned, p)
    expect(out.map((i) => i.id)).toEqual(['x:2026-10-28:run::1', '2026-10-28:climb'])
    expect(out[1].kind).toBe('climb')
  })
})
