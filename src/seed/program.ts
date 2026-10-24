import type { Program } from '../plan/types'
import { FLOWS } from './flows'
import { LIFT_DAYS } from './lifts'

export const DEFAULT_PROGRAM: Program = {
  startDate: '2026-10-26',
  weeks: 16,
  deloadEvery: 4,
  weekLayout: [
    /* Mon */ [{ slot: 'yoga', kind: 'yoga', templateId: 'yogaA' }],
    /* Tue */ [{ slot: 'climb', kind: 'climb' }],
    /* Wed */ [{ slot: 'lift', kind: 'lift', templateId: 'A' }],
    /* Thu */ [{ slot: 'climb', kind: 'climb' }],
    /* Fri */ [{ slot: 'yoga', kind: 'yoga', templateId: 'yogaB' }],
    /* Sat */ [{ slot: 'liftC', kind: 'lift', templateId: 'C', optional: true }],
    /* Sun */ [{ slot: 'lift', kind: 'lift', templateId: 'B' }],
  ],
  liftDays: LIFT_DAYS,
  flows: FLOWS,
  // Abrahangs: feet on the floor, light strain only. Timing per forum write-ups of the study; adjust in Settings.
  hang: {
    hangSec: 10,
    restSec: 20,
    totalMin: 10,
    prepSec: 10,
    edgeMm: 20,
    grips: [
      '4-finger open hand',
      '4-finger half crimp',
      'Front-3 open drag',
      'Front-3 half crimp',
      'Back-3 open drag',
      'Back-3 half crimp',
    ],
  },
  runPlan: [
    { fromWeek: 1, toWeek: 4, runs: [{ dow: 5, km: 10 }] },
    { fromWeek: 5, toWeek: 8, runs: [{ dow: 2, km: 6 }, { dow: 5, km: 10 }] },
    { fromWeek: 9, toWeek: 12, runs: [{ dow: 2, km: 8 }, { dow: 5, km: 10 }] },
    { fromWeek: 13, toWeek: 16, runs: [{ dow: 2, km: 10 }, { dow: 5, km: 10 }] },
  ],
  deloadRunFactor: 0.7,
}

export function cloneDefaultProgram(): Program {
  return structuredClone(DEFAULT_PROGRAM)
}
