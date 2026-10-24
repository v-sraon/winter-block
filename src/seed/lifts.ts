import type { LiftDay, LiftExercise } from '../plan/types'

// Equipment on hand: barbell, rack, bench, pull-up bar, rings, bands/cable. No dumbbells or kettlebells.
// Core work trains resisting movement (anti-extension, anti-rotation, anti-lateral-flexion) instead of crunches.

export const LIBRARY: Record<string, LiftExercise> = {
  backSquat: {
    id: 'backSquat', name: 'Back squat', mode: 'weight', sets: 3, repMin: 5, repMax: 8, step: 'large', restSec: 150,
    cue: 'Brace before you descend, knees track over toes, hit depth and drive up through mid-foot.',
  },
  bss: {
    id: 'bss', name: 'Bulgarian split squat', mode: 'weight', sets: 3, repMin: 8, repMax: 10, step: 'small', perSide: true, restSec: 90,
    cue: 'Rear foot on the bench. Start with bodyweight (log 0), then hold the bar on your back. Great for MTB stability.',
  },
  bench: {
    id: 'bench', name: 'Bench press', mode: 'weight', sets: 3, repMin: 6, repMax: 10, step: 'small', restSec: 120,
    cue: 'Shoulder blades pinned, feet planted, bar to lower chest. Antagonist work for climbing.',
  },
  facePull: {
    id: 'facePull', name: 'Band face pull', mode: 'reps', sets: 2, repMin: 15, repMax: 20, step: 'small', restSec: 45,
    cue: 'Pull to your forehead, thumbs back, squeeze the rear delts. Shoulder health.',
  },
  rollout: {
    id: 'rollout', name: 'Ab-wheel / barbell rollout', mode: 'reps', sets: 3, repMin: 6, repMax: 10, step: 'small', restSec: 60,
    cue: 'Ribs down, glutes squeezed, roll out only as far as you can without the low back sagging.',
  },
  pallof: {
    id: 'pallof', name: 'Pallof press', mode: 'reps', sets: 3, repMin: 10, repMax: 12, step: 'small', perSide: true, restSec: 45,
    cue: 'Band or cable at chest height, press straight out and resist the twist. 2-second hold at full extension.',
  },
  deadlift: {
    id: 'deadlift', name: 'Deadlift', mode: 'weight', sets: 3, repMin: 3, repMax: 5, step: 'large', restSec: 180,
    cue: 'Bar over mid-foot, lats tight, push the floor away. Reset each rep.',
  },
  hipThrust: {
    id: 'hipThrust', name: 'Barbell hip thrust', mode: 'weight', sets: 3, repMin: 8, repMax: 12, step: 'large', restSec: 90,
    cue: 'Upper back on the bench, chin tucked, full lockout with a 1-second squeeze.',
  },
  ohp: {
    id: 'ohp', name: 'Overhead press', mode: 'weight', sets: 3, repMin: 5, repMax: 8, step: 'small', restSec: 120,
    cue: 'Glutes tight, press the bar in a straight line and finish with biceps by ears.',
  },
  ringDip: {
    id: 'ringDip', name: 'Ring dips', mode: 'reps', sets: 3, repMin: 6, repMax: 10, step: 'small', restSec: 90,
    cue: 'Rings turned out at the top, shoulders down, go to about 90° at the elbow.',
  },
  kneeRaise: {
    id: 'kneeRaise', name: 'Hanging knee raise → ring L-sit', mode: 'reps', sets: 3, repMin: 8, repMax: 12, step: 'small', restSec: 60,
    cue: 'Slow, no swinging, tilt the pelvis up. When 3×12 is easy, switch to L-sit holds on the rings.',
  },
  suitcase: {
    id: 'suitcase', name: 'One-arm barbell suitcase carry', mode: 'carry', sets: 3, repMin: 30, repMax: 30, step: 'large', perSide: true, restSec: 60,
    cue: 'Grip the bar at its centre, walk tall without leaning. Anti-lateral-flexion core and grip.',
  },
  bodySaw: {
    id: 'bodySaw', name: 'Ring fallout / body saw', mode: 'reps', sets: 3, repMin: 6, repMax: 10, step: 'small', restSec: 60,
    cue: 'Plank on the rings and reach forward without letting the hips sag.',
  },
  deadBug: {
    id: 'deadBug', name: 'Dead bug', mode: 'reps', sets: 3, repMin: 8, repMax: 10, step: 'small', perSide: true, restSec: 45,
    cue: 'Low back pressed into the floor, exhale fully as the opposite arm and leg extend.',
  },
  copenhagen: {
    id: 'copenhagen', name: 'Copenhagen plank', mode: 'time', sets: 2, repMin: 20, repMax: 30, step: 'small', perSide: true, restSec: 45,
    cue: 'Top leg on the bench, body in a straight line. Short-lever (knee on bench) to start.',
  },
  bandER: {
    id: 'bandER', name: 'Band external rotation', mode: 'reps', sets: 2, repMin: 15, repMax: 20, step: 'small', perSide: true, restSec: 30,
    cue: 'Elbow pinned to your side, rotate out slowly. Rotator cuff care for climbing.',
  },
  extensors: {
    id: 'extensors', name: 'Band finger extensions', mode: 'reps', sets: 2, repMin: 20, repMax: 30, step: 'small', restSec: 30,
    cue: 'Band around the fingertips, open the hand fully. Balances all the crimping.',
  },
  // Alternatives for the editor
  frontSquat: {
    id: 'frontSquat', name: 'Front squat', mode: 'weight', sets: 3, repMin: 5, repMax: 8, step: 'large', restSec: 150,
    cue: 'Elbows high, upright torso.',
  },
  ringPushup: {
    id: 'ringPushup', name: 'Ring push-ups', mode: 'reps', sets: 3, repMin: 8, repMax: 15, step: 'small', restSec: 90,
    cue: 'Body rigid, turn the rings out at the top.',
  },
  ringRow: {
    id: 'ringRow', name: 'Ring rows', mode: 'reps', sets: 3, repMin: 8, repMax: 12, step: 'small', restSec: 90,
    cue: 'Feet forward to make it harder. Squeeze the shoulder blades.',
  },
  weightedPullup: {
    id: 'weightedPullup', name: 'Weighted pull-up', mode: 'weight', sets: 3, repMin: 3, repMax: 5, step: 'small', restSec: 180,
    cue: 'Log added weight only. Full hang to chin over bar.',
  },
  sideplank: {
    id: 'sideplank', name: 'Side plank', mode: 'time', sets: 2, repMin: 30, repMax: 45, step: 'small', perSide: true, restSec: 30,
    cue: 'Stack the hips and keep a straight line from head to heels.',
  },
  slRdl: {
    id: 'slRdl', name: 'Single-leg RDL (barbell)', mode: 'weight', sets: 3, repMin: 8, repMax: 10, step: 'small', perSide: true, restSec: 75,
    cue: 'Hips square, slight knee bend, reach the free leg back.',
  },
  stepUp: {
    id: 'stepUp', name: 'Barbell step-up', mode: 'weight', sets: 3, repMin: 8, repMax: 10, step: 'small', perSide: true, restSec: 75,
    cue: 'Drive through the top foot, do not push off the back leg.',
  },
  nordic: {
    id: 'nordic', name: 'Nordic hamstring curl', mode: 'reps', sets: 3, repMin: 3, repMax: 6, step: 'small', restSec: 90,
    cue: 'Anchor heels under the loaded bar or a band; lower as slowly as you can.',
  },
}

const pick = (...ids: string[]) => ids.map((id) => ({ ...LIBRARY[id] }))

export const LIFT_DAYS: Record<string, LiftDay> = {
  A: {
    id: 'A',
    name: 'Lift A',
    focus: 'Squat, push & anti-extension',
    exercises: pick('backSquat', 'bss', 'bench', 'facePull', 'rollout', 'pallof'),
  },
  B: {
    id: 'B',
    name: 'Lift B',
    focus: 'Hinge, overhead & anti-rotation',
    exercises: pick('deadlift', 'hipThrust', 'ohp', 'ringDip', 'kneeRaise', 'suitcase'),
  },
  C: {
    id: 'C',
    name: 'Lift C',
    focus: 'Core & prehab (optional, ~20 min)',
    exercises: pick('bodySaw', 'deadBug', 'copenhagen', 'bandER', 'extensors'),
  },
}
