import type { Settings, Step } from './types'

const LB_PER_KG = 2.20462

export type Units = Settings['units']

export function toDisplay(kg: number, units: Units): number {
  return units === 'kg' ? kg : kg * LB_PER_KG
}

export function fromDisplay(v: number, units: Units): number {
  return units === 'kg' ? v : v / LB_PER_KG
}

/** Smallest plate jump per side pair: 2.5 kg / 5 lb (large) or 1.25 kg / 2.5 lb (small). */
export function stepSize(step: Step, units: Units): number {
  if (units === 'kg') return step === 'large' ? 2.5 : 1.25
  return step === 'large' ? 5 : 2.5
}

export function roundToPlate(v: number, units: Units): number {
  const g = stepSize('small', units)
  return Math.round(v / g) * g
}

export function fmtWeight(kg: number | undefined, units: Units): string {
  if (kg === undefined) return '—'
  const v = toDisplay(kg, units)
  return `${Math.round(v * 10) / 10} ${units}`
}
