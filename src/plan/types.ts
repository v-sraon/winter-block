export type SessionKind = 'hang' | 'stretch' | 'yoga' | 'climb' | 'lift' | 'run' | 'other'

/** weight: load × reps · reps: bodyweight reps · time: seconds held · carry: load × metres */
export type LiftMode = 'weight' | 'reps' | 'time' | 'carry'
export type Step = 'large' | 'small'

export interface LiftExercise {
  id: string
  name: string
  mode: LiftMode
  sets: number
  /** reps, seconds (time) or metres (carry) */
  repMin: number
  repMax: number
  step: Step
  perSide?: boolean
  restSec: number
  cue?: string
}

export interface LiftDay {
  id: string
  name: string
  focus: string
  exercises: LiftExercise[]
}

export interface Pose {
  name: string
  sec: number
  /** held once per side */
  sides?: boolean
  cue?: string
}

export interface Flow {
  id: string
  name: string
  focus: string
  poses: Pose[]
}

export interface HangConfig {
  hangSec: number
  restSec: number
  totalMin: number
  prepSec: number
  edgeMm: number
  grips: string[]
}

export interface DaySlot {
  slot: string
  kind: SessionKind
  templateId?: string
  optional?: boolean
}

export interface RunPhase {
  fromWeek: number
  toWeek: number
  /** dow: 0 = Monday … 6 = Sunday */
  runs: { dow: number; km: number }[]
}

export interface Program {
  /** always a Monday */
  startDate: string
  weeks: number
  deloadEvery: number
  /** index 0 = Monday … 6 = Sunday */
  weekLayout: DaySlot[][]
  liftDays: Record<string, LiftDay>
  flows: Record<string, Flow>
  hang: HangConfig
  runPlan: RunPhase[]
  deloadRunFactor: number
}

export interface PlannedItem {
  id: string
  date: string
  kind: SessionKind
  templateId?: string
  title: string
  detail: string
  optional?: boolean
  targetKm?: number
  deload: boolean
  extra?: boolean
}

export type Moves = Record<string, string>

export interface SetLog {
  weight?: number
  reps?: number
  seconds?: number
  meters?: number
  done: boolean
}

export interface ExerciseLog {
  exerciseId: string
  name: string
  mode: LiftMode
  sets: SetLog[]
}

export interface HangLog {
  reps: number
  plannedReps: number
  edgeMm: number
  grips: string[]
  loadKg?: number
}

export interface RunLog {
  km: number
  seconds: number
  avgHr?: number
}

export type ClimbResult = 'flash' | 'send' | 'project'

export interface Problem {
  name: string
  /** V-scale number used for sorting and charts */
  grade: number
  /** grade as entered, in the scale that was active */
  label: string
  attempts: number
  result: ClimbResult
}

export interface ClimbLog {
  board: string
  angle?: number
  problems: Problem[]
}

export interface OtherLog {
  activity: string
  km?: number
}

export interface SessionLog {
  id?: number
  planItemId: string
  date: string
  kind: SessionKind
  templateId?: string
  title: string
  status: 'done' | 'skipped'
  deload?: boolean
  durationMin?: number
  /** 1–10 */
  effort?: number
  notes?: string
  createdAt: number
  updatedAt: number
  lift?: { exercises: ExerciseLog[] }
  hang?: HangLog
  run?: RunLog
  climb?: ClimbLog
  other?: OtherLog
}

export interface Settings {
  units: 'kg' | 'lb'
  gradeScale: 'V' | 'Font'
  voice: boolean
  beeps: boolean
  theme: 'dark' | 'light' | 'system'
  lastBackupAt?: number
}
