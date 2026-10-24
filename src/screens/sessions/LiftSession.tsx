import { Check, Info, Plus, Timer, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Header, NumInput } from '../../components/ui'
import { useData } from '../../data'
import { logsOfKind, upsertLog } from '../../db/db'
import { clearDraft, loadDraft, saveDraft } from '../../lib/draft'
import { fmtDay } from '../../lib/dates'
import { suggest, type PastEntry, type Suggestion } from '../../plan/progression'
import type { ExerciseLog, LiftExercise, SetLog } from '../../plan/types'
import { fromDisplay, fmtWeight, toDisplay } from '../../plan/units'
import { beep, unlockAudio } from '../../timer/cues'
import { fmtMinSec } from '../../timer/intervals'
import { baseLog, SaveFooter, type SessionProps } from './common'

interface Draft {
  exercises: ExerciseLog[]
  startedAt: number
  effort?: number
  notes: string
}

export function LiftSession({ item, log }: SessionProps) {
  const [history, setHistory] = useState<Record<string, PastEntry[]>>()

  useEffect(() => {
    void logsOfKind('lift').then((logs) => {
      const past = logs.filter((l) => l.planItemId !== item.id && l.status === 'done' && l.lift).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.updatedAt - a.updatedAt))
      const byEx: Record<string, PastEntry[]> = {}
      for (const l of past) {
        for (const ex of l.lift!.exercises) (byEx[ex.exerciseId] ??= []).push({ log: ex, deload: !!l.deload })
      }
      setHistory(byEx)
    })
  }, [item.id])

  if (!history) return null
  return <LiftForm item={item} log={log} history={history} />
}

function LiftForm({ item, log, history }: SessionProps & { history: Record<string, PastEntry[]> }) {
  const { program, settings } = useData()
  const units = settings.units
  const day = item.templateId ? program.liftDays[item.templateId] : undefined
  const plan: LiftExercise[] = useMemo(() => day?.exercises ?? [], [day])

  const suggestions = useMemo(() => {
    const out: Record<string, Suggestion> = {}
    for (const ex of plan) out[ex.id] = suggest(ex, history[ex.id] ?? [], { deload: item.deload, units })
    return out
  }, [plan, history, item.deload, units])

  const [draft, setDraft] = useState<Draft>(() => {
    const saved = loadDraft<Draft>(item.id)
    if (saved) return saved
    if (log?.lift) return { exercises: log.lift.exercises, startedAt: log.createdAt, effort: log.effort, notes: log.notes ?? '' }
    return {
      startedAt: Date.now(),
      notes: '',
      exercises: plan.map((ex) => {
        const s = suggestions[ex.id]
        return {
          exerciseId: ex.id,
          name: ex.name,
          mode: ex.mode,
          sets: Array.from({ length: s.sets }, (): SetLog => ({ weight: s.weightKg, done: false })),
        }
      }),
    }
  })

  useEffect(() => saveDraft(item.id, draft), [item.id, draft])

  const [restEnd, setRestEnd] = useState<number | null>(null)
  const [cueOpen, setCueOpen] = useState<string | null>(null)

  const update = (ei: number, fn: (e: ExerciseLog) => ExerciseLog) =>
    setDraft((d) => ({ ...d, exercises: d.exercises.map((e, i) => (i === ei ? fn(e) : e)) }))
  const updateSet = (ei: number, si: number, patch: Partial<SetLog>) =>
    update(ei, (e) => ({ ...e, sets: e.sets.map((s, i) => (i === si ? { ...s, ...patch } : s)) }))

  const doneSets = draft.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0)
  const totalSets = draft.exercises.reduce((n, e) => n + e.sets.length, 0)

  const save = async () => {
    await upsertLog({
      ...baseLog(item),
      status: 'done',
      durationMin: log?.durationMin ?? Math.max(1, Math.round((Date.now() - draft.startedAt) / 60000)),
      effort: draft.effort,
      notes: draft.notes || undefined,
      lift: { exercises: draft.exercises.map((e) => ({ ...e, sets: e.sets.filter((s) => s.done) })).filter((e) => e.sets.length > 0) },
    })
    clearDraft(item.id)
  }

  return (
    <div className="stack-lg" style={{ paddingBottom: restEnd ? 90 : 0 }}>
      <Header
        title={day ? `${day.name}` : item.title}
        sub={
          <>
            {day?.focus} · {fmtDay(item.date, { weekday: 'short', month: 'short', day: 'numeric' })} {item.deload && <span className="badge deload">Deload</span>}
          </>
        }
        onBack
      />
      <div className="progress">
        <div style={{ width: `${totalSets ? (doneSets / totalSets) * 100 : 0}%` }} />
      </div>

      {draft.exercises.map((e, ei) => {
        const ex = plan.find((p) => p.id === e.exerciseId)
        const s = suggestions[e.exerciseId]
        const loaded = e.mode === 'weight' || e.mode === 'carry'
        const valueKey: keyof SetLog = e.mode === 'time' ? 'seconds' : e.mode === 'carry' ? 'meters' : 'reps'
        const valueLabel = e.mode === 'time' ? 'sec' : e.mode === 'carry' ? 'metres' : 'reps'
        const unitSuffix = e.mode === 'time' ? 's' : e.mode === 'carry' ? ' m' : ''
        return (
          <div key={e.exerciseId + ei} className="card stack">
            <div className="spread" style={{ alignItems: 'flex-start' }}>
              <div className="grow">
                <h3>
                  {e.name} {ex?.perSide && <span className="badge opt">per side</span>}
                </h3>
                {ex && (
                  <div className="target" style={{ marginTop: 4 }}>
                    {s?.sets ?? ex.sets} × {ex.repMin === ex.repMax ? ex.repMax : `${ex.repMin}–${ex.repMax}`}
                    {unitSuffix}
                    {loaded && s?.weightKg !== undefined && (s.weightKg > 0 ? ` @ ${fmtWeight(s.weightKg, units)}` : ' @ bodyweight')}
                  </div>
                )}
                {s && <div className="note" style={{ marginTop: 2 }}>{s.note}</div>}
              </div>
              {ex?.cue && (
                <button className="icon-btn" aria-label="Form cue" onClick={() => setCueOpen(cueOpen === e.exerciseId ? null : e.exerciseId)}>
                  <Info size={20} />
                </button>
              )}
            </div>
            {cueOpen === e.exerciseId && ex?.cue && <div className="banner small">{ex.cue}</div>}

            <div className={`set-row${loaded ? '' : ' one'} set-head`}>
              <span className="n">Set</span>
              {loaded && <span style={{ textAlign: 'center' }}>{units}</span>}
              <span style={{ textAlign: 'center' }}>{valueLabel}</span>
              <span />
            </div>
            {e.sets.map((set, si) => {
              const placeholder = String(s?.lastValues[si] ?? ex?.repMax ?? '')
              return (
                <div key={si} className={`set-row${loaded ? '' : ' one'}`}>
                  <span className="n">{si + 1}</span>
                  {loaded && (
                    <NumInput
                      ariaLabel={`Set ${si + 1} weight`}
                      value={set.weight === undefined ? undefined : Math.round(toDisplay(set.weight, units) * 100) / 100}
                      placeholder="—"
                      onChange={(v) => updateSet(ei, si, { weight: v === undefined ? undefined : fromDisplay(v, units) })}
                    />
                  )}
                  <NumInput
                    ariaLabel={`Set ${si + 1} ${valueLabel}`}
                    decimal={false}
                    value={set[valueKey] as number | undefined}
                    placeholder={placeholder}
                    onChange={(v) => updateSet(ei, si, { [valueKey]: v })}
                  />
                  <button
                    className={`tick${set.done ? ' on' : ''}`}
                    aria-label={set.done ? 'Undo set' : 'Complete set'}
                    onClick={() => {
                      if (set.done) return updateSet(ei, si, { done: false })
                      unlockAudio()
                      const patch: Partial<SetLog> = { done: true }
                      if (set[valueKey] === undefined && placeholder) patch[valueKey] = Number(placeholder) as never
                      // Carry the weight forward to the remaining sets so they only need a tap.
                      update(ei, (cur) => ({
                        ...cur,
                        sets: cur.sets.map((x, i) => (i === si ? { ...x, ...patch } : i > si && !x.done && x.weight === undefined ? { ...x, weight: set.weight } : x)),
                      }))
                      if (ex) setRestEnd(Date.now() + ex.restSec * 1000)
                    }}
                  >
                    <Check size={22} strokeWidth={3} />
                  </button>
                </div>
              )
            })}
            <div className="row">
              <button className="btn sm" onClick={() => update(ei, (cur) => ({ ...cur, sets: [...cur.sets, { weight: cur.sets.at(-1)?.weight, done: false }] }))}>
                <Plus size={16} /> Set
              </button>
              {e.sets.length > 1 && (
                <button className="btn sm ghost" onClick={() => update(ei, (cur) => ({ ...cur, sets: cur.sets.slice(0, -1) }))}>
                  Remove last
                </button>
              )}
            </div>
          </div>
        )
      })}

      <SaveFooter
        effort={draft.effort}
        setEffort={(effort) => setDraft((d) => ({ ...d, effort }))}
        notes={draft.notes}
        setNotes={(notes) => setDraft((d) => ({ ...d, notes }))}
        onSave={save}
        label={log ? 'Save changes' : `Finish (${doneSets}/${totalSets} sets)`}
        disabled={doneSets === 0}
      />
      {log === null && doneSets === 0 && <p className="muted small" style={{ textAlign: 'center', marginTop: -8 }}>Tick at least one set to finish.</p>}

      {restEnd && <RestBar endsAt={restEnd} beeps={settings.beeps} onAdd={(s) => setRestEnd(restEnd + s * 1000)} onClose={() => setRestEnd(null)} />}
    </div>
  )
}

function RestBar({ endsAt, beeps, onAdd, onClose }: { endsAt: number; beeps: boolean; onAdd: (s: number) => void; onClose: () => void }) {
  const [now, setNow] = useState(Date.now())
  const left = endsAt - now
  const finished = left <= 0
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [])
  useEffect(() => {
    if (!finished) return
    if (beeps) {
      beep(990, 0.18)
      window.setTimeout(() => beep(1320, 0.3), 220)
    }
    const id = window.setTimeout(() => closeRef.current(), 1500)
    return () => window.clearTimeout(id)
  }, [finished, beeps])
  return (
    <div className="rest-bar">
      <div className="inner">
        <Timer size={22} className="muted" />
        <div className="grow">
          <div className="tiny muted">Rest</div>
          <div className="clock" style={{ color: finished ? 'var(--ok)' : undefined }}>
            {finished ? 'Go!' : fmtMinSec(left)}
          </div>
        </div>
        <button className="btn sm" onClick={() => onAdd(15)}>
          +15s
        </button>
        <button className="icon-btn" aria-label="Dismiss rest timer" onClick={onClose}>
          <X size={20} />
        </button>
      </div>
    </div>
  )
}

