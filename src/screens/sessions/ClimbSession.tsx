import { Plus, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Field, Header, NumInput, Segmented, Stepper } from '../../components/ui'
import { useData } from '../../data'
import { upsertLog } from '../../db/db'
import { clearDraft, loadDraft, saveDraft } from '../../lib/draft'
import { fmtDay } from '../../lib/dates'
import { gradeLabel, gradeOptions } from '../../plan/grades'
import type { ClimbResult, Problem } from '../../plan/types'
import { baseLog, SaveFooter, type SessionProps } from './common'

const BOARDS = ['Tension Board 1', 'Tension Board 2', 'Spray wall', 'Other']

interface Draft {
  board: string
  angle?: number
  minutes?: number
  problems: Problem[]
  effort?: number
  notes: string
}

export function ClimbSession({ item, log }: SessionProps) {
  const { settings } = useData()
  const scale = settings.gradeScale
  const options = gradeOptions(scale)

  const [d, setD] = useState<Draft>(
    () =>
      loadDraft<Draft>(item.id) ??
      (log?.climb
        ? { board: log.climb.board, angle: log.climb.angle, minutes: log.durationMin, problems: log.climb.problems, effort: log.effort, notes: log.notes ?? '' }
        : { board: BOARDS[1], angle: 40, problems: [], notes: '' }),
  )
  useEffect(() => saveDraft(item.id, d), [item.id, d])

  const set = (patch: Partial<Draft>) => setD((cur) => ({ ...cur, ...patch }))
  const setProblem = (i: number, patch: Partial<Problem>) => set({ problems: d.problems.map((p, j) => (j === i ? { ...p, ...patch } : p)) })
  const addProblem = () => {
    const last = d.problems.at(-1)
    const g = last ? options.find((o) => o.label === last.label) ?? options[4] : options[Math.min(4, options.length - 1)]
    set({ problems: [...d.problems, { name: '', grade: g.v, label: g.label, attempts: 1, result: 'send' }] })
  }

  const sends = d.problems.filter((p) => p.result !== 'project')

  const save = async () => {
    await upsertLog({
      ...baseLog(item),
      status: 'done',
      durationMin: d.minutes,
      effort: d.effort,
      notes: d.notes || undefined,
      climb: { board: d.board, angle: d.angle, problems: d.problems },
    })
    clearDraft(item.id)
  }

  return (
    <div className="stack-lg">
      <Header
        title="Climb"
        sub={
          <>
            {fmtDay(item.date, { weekday: 'short', month: 'short', day: 'numeric' })} {item.deload && <span className="badge deload">Deload</span>}
          </>
        }
        onBack
      />
      {item.deload && <div className="banner warn small">Deload week: keep it shorter and skip limit attempts.</div>}

      <div className="card stack">
        <div className="field">
          <span>Where</span>
          <select className="input" aria-label="Where" value={d.board} onChange={(e) => set({ board: e.target.value })}>
            {BOARDS.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        </div>
        <div className="grid2">
          <Field label="Angle (°)">
            <NumInput value={d.angle} onChange={(angle) => set({ angle })} placeholder="40" decimal={false} />
          </Field>
          <Field label="Session (min)">
            <NumInput value={d.minutes} onChange={(minutes) => set({ minutes })} placeholder="90" decimal={false} />
          </Field>
        </div>
      </div>

      <div className="stack">
        <div className="spread">
          <div className="section-title" style={{ margin: 0 }}>
            Problems · {sends.length} sent{sends.length ? ` · best ${gradeLabel(Math.max(...sends.map((p) => p.grade)), scale)}` : ''}
          </div>
        </div>
        {d.problems.map((p, i) => (
          <div key={i} className="card stack">
            <div className="row">
              <select
                className="input"
                style={{ width: 96, flex: 'none' }}
                aria-label="Grade"
                value={p.label}
                onChange={(e) => {
                  const g = options.find((o) => o.label === e.target.value)!
                  setProblem(i, { grade: g.v, label: g.label })
                }}
              >
                {!options.some((o) => o.label === p.label) && <option value={p.label}>{p.label}</option>}
                {options.map((o) => (
                  <option key={o.label} value={o.label}>
                    {o.label}
                  </option>
                ))}
              </select>
              <input className="input grow" placeholder="Name (optional)" value={p.name} onChange={(e) => setProblem(i, { name: e.target.value })} />
              <button className="icon-btn" aria-label="Remove problem" onClick={() => set({ problems: d.problems.filter((_, j) => j !== i) })}>
                <X size={18} />
              </button>
            </div>
            <div className="row">
              <div className="grow">
                <Segmented<ClimbResult>
                  value={p.result}
                  onChange={(result) => setProblem(i, { result, attempts: result === 'flash' ? 1 : p.attempts })}
                  options={[
                    { value: 'flash', label: 'Flash' },
                    { value: 'send', label: 'Send' },
                    { value: 'project', label: 'Project' },
                  ]}
                />
              </div>
            </div>
            <div className="spread">
              <span className="muted small">Attempts</span>
              <Stepper value={p.attempts} onChange={(attempts) => setProblem(i, { attempts, result: attempts > 1 && p.result === 'flash' ? 'send' : p.result })} min={1} />
            </div>
          </div>
        ))}
        <button className="btn block" onClick={addProblem}>
          <Plus size={18} /> Add problem
        </button>
      </div>

      <SaveFooter
        effort={d.effort}
        setEffort={(effort) => set({ effort })}
        notes={d.notes}
        setNotes={(notes) => set({ notes })}
        onSave={save}
        label={log ? 'Save changes' : 'Save session'}
      />
    </div>
  )
}
