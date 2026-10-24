import { ArrowDown, ArrowUp, ChevronRight, Download, Plus, Upload, X } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'
import { Field, Header, KindDot, NumInput, Segmented, Stepper } from '../components/ui'
import { useData } from '../data'
import { eraseAll, exportBackup, parseBackup, restoreBackup } from '../db/backup'
import { saveProgram, saveSettings } from '../db/db'
import { DOW_SHORT, fmtDay, mondayOf } from '../lib/dates'
import { planEndDate } from '../plan/generator'
import type { DaySlot, Flow, HangConfig, LiftDay, LiftExercise, LiftMode, Program, RunPhase, SessionKind, Settings } from '../plan/types'
import { back, go } from '../router'
import { flowSeconds } from '../seed/flows'
import { LIBRARY } from '../seed/lifts'
import { cloneDefaultProgram } from '../seed/program'
import { hangReps } from '../timer/intervals'
import { stepSize } from '../plan/units'

export function SettingsScreen({ sub }: { sub: string[] }) {
  const { program } = useData()
  const [section, id] = sub
  if (section === 'hang') return <HangEditor key="hang" initial={program.hang} />
  if (section === 'lift' && program.liftDays[id]) return <LiftDayEditor key={id} initial={program.liftDays[id]} />
  if (section === 'flow' && program.flows[id]) return <FlowEditor key={id} initial={program.flows[id]} />
  if (section === 'runs') return <RunPlanEditor key="runs" initial={program} />
  if (section === 'layout') return <LayoutEditor key="layout" initial={program.weekLayout} />
  return <SettingsHome />
}

function LinkRow({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button className="menu-btn" onClick={onClick}>
      {children}
      <span className="grow" />
      <ChevronRight size={18} className="muted" />
    </button>
  )
}

function SettingsHome() {
  const { settings, program } = useData()
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState<string>()
  const set = (patch: Partial<Settings>) => void saveSettings(patch)

  const onImport = async (file: File) => {
    try {
      const b = parseBackup(await file.text())
      const when = b.exportedAt ? new Date(b.exportedAt).toLocaleString() : 'unknown date'
      if (!window.confirm(`Replace everything on this phone with the backup from ${when} (${b.logs.length} logs)?`)) return
      await restoreBackup(b)
      setMsg(`Restored ${b.logs.length} logs.`)
    } catch (e) {
      setMsg((e as Error).message)
    }
  }

  return (
    <div className="stack-lg">
      <Header title="Settings" />

      <div className="section-title">Display</div>
      <div className="card stack">
        <Field label="Weights">
          <Segmented value={settings.units} onChange={(units) => set({ units })} options={[{ value: 'kg', label: 'kg' }, { value: 'lb', label: 'lb' }]} />
        </Field>
        <Field label="Boulder grades">
          <Segmented value={settings.gradeScale} onChange={(gradeScale) => set({ gradeScale })} options={[{ value: 'V', label: 'V-scale' }, { value: 'Font', label: 'Font' }]} />
        </Field>
        <Field label="Theme">
          <Segmented
            value={settings.theme}
            onChange={(theme) => set({ theme })}
            options={[
              { value: 'dark', label: 'Dark' },
              { value: 'light', label: 'Light' },
              { value: 'system', label: 'System' },
            ]}
          />
        </Field>
        <label className="toggle">
          <span>Voice cues in timers</span>
          <input type="checkbox" checked={settings.voice} onChange={(e) => set({ voice: e.target.checked })} />
        </label>
        <label className="toggle">
          <span>Beeps</span>
          <input type="checkbox" checked={settings.beeps} onChange={(e) => set({ beeps: e.target.checked })} />
        </label>
      </div>

      <div className="section-title">Plan</div>
      <div className="card stack">
        <Field label="Start date (a Monday)">
          <input
            className="input"
            type="date"
            value={program.startDate}
            onChange={(e) => e.target.value && void saveProgram({ ...program, startDate: mondayOf(e.target.value) })}
          />
        </Field>
        <div className="spread">
          <span>Length (weeks)</span>
          <Stepper value={program.weeks} min={4} max={52} step={4} onChange={(weeks) => void saveProgram({ ...program, weeks })} />
        </div>
        <p className="note">
          Ends {fmtDay(planEndDate(program), { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}. Every {program.deloadEvery}th week is a deload.
        </p>
      </div>

      <div className="section-title">Program</div>
      <div className="card" style={{ paddingTop: 2, paddingBottom: 2 }}>
        <LinkRow onClick={() => go('settings', 'layout')}>Weekly layout</LinkRow>
        {Object.values(program.liftDays).map((d) => (
          <LinkRow key={d.id} onClick={() => go('settings', 'lift', d.id)}>
            <KindDot kind="lift" small />
            {d.name} <span className="muted small">{d.exercises.length} exercises</span>
          </LinkRow>
        ))}
        {Object.values(program.flows).map((f) => (
          <LinkRow key={f.id} onClick={() => go('settings', 'flow', f.id)}>
            <KindDot kind={f.id === 'stretch' ? 'stretch' : 'yoga'} small />
            {f.name} <span className="muted small">{Math.round(flowSeconds(f) / 60)} min</span>
          </LinkRow>
        ))}
        <LinkRow onClick={() => go('settings', 'hang')}>
          <KindDot kind="hang" small />
          Abrahangs
        </LinkRow>
        <LinkRow onClick={() => go('settings', 'runs')}>
          <KindDot kind="run" small />
          Running plan
        </LinkRow>
      </div>

      <div className="section-title">Backup</div>
      <div className="card stack">
        <p className="note">
          Everything is stored only on this device. Export a backup regularly and keep it in Files or iCloud Drive.
          {settings.lastBackupAt ? ` Last backup: ${new Date(settings.lastBackupAt).toLocaleDateString()}.` : ' No backup yet.'}
        </p>
        <div className="grid2">
          <button className="btn" onClick={() => void exportBackup()}>
            <Download size={18} /> Export
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            <Upload size={18} /> Import
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (f) void onImport(f)
          }}
        />
        {msg && <div className="banner small">{msg}</div>}
      </div>

      <div className="section-title">Reset</div>
      <div className="card" style={{ paddingTop: 2, paddingBottom: 2 }}>
        <button
          className="menu-btn"
          onClick={() => {
            if (window.confirm('Reset all lift days, flows, Abrahangs, running plan and layout to the defaults? Your logs are kept.')) {
              void saveProgram({ ...cloneDefaultProgram(), startDate: program.startDate, weeks: program.weeks })
            }
          }}
        >
          Reset program to defaults
        </button>
        <button
          className="menu-btn danger"
          onClick={() => {
            if (window.confirm('Erase ALL logs and settings on this device? This cannot be undone unless you have a backup.')) void eraseAll()
          }}
        >
          Erase all data
        </button>
      </div>

      <p className="muted tiny" style={{ textAlign: 'center', lineHeight: 1.5 }}>
        Winter Block · Abrahangs timing (10 s on / 20 s off for 10 min, rotating grips) is taken from public write-ups of Emil Abrahamsson’s protocol. Adjust it under Abrahangs to match the version you follow.
      </p>
    </div>
  )
}

/** Shared shell for editors: local copy, explicit save. */
function EditorShell({ title, sub, dirty, onSave, children }: { title: string; sub?: ReactNode; dirty: boolean; onSave: () => Promise<void>; children: ReactNode }) {
  return (
    <div className="stack-lg">
      <Header
        title={title}
        sub={sub}
        onBack={() => {
          if (!dirty || window.confirm('Discard unsaved changes?')) back()
        }}
        right={
          <button
            className="btn primary sm"
            disabled={!dirty}
            onClick={async () => {
              await onSave()
              back()
            }}
          >
            Save
          </button>
        }
      />
      {children}
    </div>
  )
}

function move<T>(list: T[], i: number, d: -1 | 1): T[] {
  const j = i + d
  if (j < 0 || j >= list.length) return list
  const out = [...list]
  ;[out[i], out[j]] = [out[j], out[i]]
  return out
}

function RowTools({ onUp, onDown, onRemove }: { onUp: () => void; onDown: () => void; onRemove: () => void }) {
  return (
    <div className="row" style={{ gap: 2 }}>
      <button className="icon-btn" aria-label="Move up" onClick={onUp}>
        <ArrowUp size={18} />
      </button>
      <button className="icon-btn" aria-label="Move down" onClick={onDown}>
        <ArrowDown size={18} />
      </button>
      <button className="icon-btn" aria-label="Remove" onClick={onRemove}>
        <X size={18} />
      </button>
    </div>
  )
}

/** Keeps ranges sane however the fields were left. */
function tidyDay(day: LiftDay): LiftDay {
  return {
    ...day,
    exercises: day.exercises.map((e) => {
      const repMin = Math.max(1, e.repMin || 1)
      return { ...e, sets: Math.max(1, e.sets || 1), repMin, repMax: Math.max(repMin, e.repMax || repMin), restSec: Math.max(0, e.restSec || 0) }
    }),
  }
}

const MODES: { value: LiftMode; label: string }[] = [
  { value: 'weight', label: 'Weight × reps' },
  { value: 'reps', label: 'Reps only' },
  { value: 'time', label: 'Seconds held' },
  { value: 'carry', label: 'Weight × metres' },
]

function LiftDayEditor({ initial }: { initial: LiftDay }) {
  const { program, settings } = useData()
  const [day, setDay] = useState(initial)
  const [dirty, setDirty] = useState(false)
  const edit = (d: LiftDay) => {
    setDay(d)
    setDirty(true)
  }
  const setEx = (i: number, patch: Partial<LiftExercise>) => edit({ ...day, exercises: day.exercises.map((e, j) => (j === i ? { ...e, ...patch } : e)) })
  const available = Object.values(LIBRARY).filter((e) => !day.exercises.some((x) => x.id === e.id))
  const rangeLabel = (m: LiftMode) => (m === 'time' ? 'sec' : m === 'carry' ? 'metres' : 'reps')

  return (
    <EditorShell title={`Edit ${initial.name}`} sub="Changes apply to future sessions" dirty={dirty} onSave={() => saveProgram({ ...program, liftDays: { ...program.liftDays, [day.id]: tidyDay(day) } })}>
      <div className="card stack">
        <Field label="Name">
          <input className="input" value={day.name} onChange={(e) => edit({ ...day, name: e.target.value })} />
        </Field>
        <Field label="Focus">
          <input className="input" value={day.focus} onChange={(e) => edit({ ...day, focus: e.target.value })} />
        </Field>
      </div>
      <div className="card">
        {day.exercises.map((ex, i) => (
          <div key={ex.id} className="edit-row">
            <div className="row">
              <input className="input grow" value={ex.name} onChange={(e) => setEx(i, { name: e.target.value })} aria-label="Exercise name" />
              <RowTools
                onUp={() => edit({ ...day, exercises: move(day.exercises, i, -1) })}
                onDown={() => edit({ ...day, exercises: move(day.exercises, i, 1) })}
                onRemove={() => edit({ ...day, exercises: day.exercises.filter((_, j) => j !== i) })}
              />
            </div>
            <select className="input" value={ex.mode} onChange={(e) => setEx(i, { mode: e.target.value as LiftMode })} aria-label="Logging mode">
              {MODES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <div className="mini">
              <Field label="Sets">
                <NumInput value={ex.sets} decimal={false} onChange={(v) => setEx(i, { sets: Math.max(1, v ?? 1) })} />
              </Field>
              <Field label={`Min ${rangeLabel(ex.mode)}`}>
                <NumInput value={ex.repMin} decimal={false} onChange={(v) => setEx(i, { repMin: v ?? 1 })} />
              </Field>
              <Field label={`Max ${rangeLabel(ex.mode)}`}>
                <NumInput value={ex.repMax} decimal={false} onChange={(v) => setEx(i, { repMax: v ?? 1 })} />
              </Field>
              <Field label="Rest (s)">
                <NumInput value={ex.restSec} decimal={false} onChange={(v) => setEx(i, { restSec: v ?? 60 })} />
              </Field>
            </div>
            <div className="row wrap">
              {(ex.mode === 'weight' || ex.mode === 'carry') && (
                <div style={{ minWidth: 200 }} className="grow">
                  <Segmented
                    value={ex.step}
                    onChange={(step) => setEx(i, { step })}
                    options={[
                      { value: 'large', label: `+${stepSize('large', settings.units)} ${settings.units}` },
                      { value: 'small', label: `+${stepSize('small', settings.units)} ${settings.units}` },
                    ]}
                  />
                </div>
              )}
              <label className="row small">
                <input type="checkbox" checked={!!ex.perSide} onChange={(e) => setEx(i, { perSide: e.target.checked })} /> Per side
              </label>
            </div>
            <textarea className="input" style={{ minHeight: 56 }} placeholder="Form cue" value={ex.cue ?? ''} onChange={(e) => setEx(i, { cue: e.target.value })} />
          </div>
        ))}
      </div>
      <div className="card stack">
        <Field label="Add an exercise">
          <select
            className="input"
            value=""
            onChange={(e) => {
              const v = e.target.value
              if (!v) return
              const ex: LiftExercise =
                v === 'custom'
                  ? { id: `custom-${Date.now()}`, name: 'New exercise', mode: 'weight', sets: 3, repMin: 6, repMax: 10, step: 'small', restSec: 90 }
                  : { ...LIBRARY[v] }
              edit({ ...day, exercises: [...day.exercises, ex] })
            }}
          >
            <option value="">Choose…</option>
            {available.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
            <option value="custom">Custom exercise…</option>
          </select>
        </Field>
        <p className="note">Progress history follows each exercise, so renaming keeps your past sets attached.</p>
      </div>
    </EditorShell>
  )
}

function FlowEditor({ initial }: { initial: Flow }) {
  const { program } = useData()
  const [flow, setFlow] = useState(initial)
  const [dirty, setDirty] = useState(false)
  const edit = (f: Flow) => {
    setFlow(f)
    setDirty(true)
  }
  const setPose = (i: number, patch: Partial<Flow['poses'][number]>) => edit({ ...flow, poses: flow.poses.map((p, j) => (j === i ? { ...p, ...patch } : p)) })
  return (
    <EditorShell title={`Edit ${initial.name}`} sub={`${Math.round(flowSeconds(flow) / 60)} min total`} dirty={dirty} onSave={() => saveProgram({ ...program, flows: { ...program.flows, [flow.id]: flow } })}>
      <div className="card stack">
        <Field label="Name">
          <input className="input" value={flow.name} onChange={(e) => edit({ ...flow, name: e.target.value })} />
        </Field>
        <Field label="Focus">
          <input className="input" value={flow.focus} onChange={(e) => edit({ ...flow, focus: e.target.value })} />
        </Field>
      </div>
      <div className="card">
        {flow.poses.map((p, i) => (
          <div key={i} className="edit-row">
            <div className="row">
              <input className="input grow" value={p.name} onChange={(e) => setPose(i, { name: e.target.value })} aria-label="Pose name" />
              <RowTools
                onUp={() => edit({ ...flow, poses: move(flow.poses, i, -1) })}
                onDown={() => edit({ ...flow, poses: move(flow.poses, i, 1) })}
                onRemove={() => edit({ ...flow, poses: flow.poses.filter((_, j) => j !== i) })}
              />
            </div>
            <div className="row">
              <div style={{ width: 90 }}>
                <NumInput value={p.sec} decimal={false} onChange={(v) => setPose(i, { sec: Math.max(5, v ?? 5) })} ariaLabel="Seconds" />
              </div>
              <span className="muted small">sec</span>
              <label className="row small" style={{ marginLeft: 'auto' }}>
                <input type="checkbox" checked={!!p.sides} onChange={(e) => setPose(i, { sides: e.target.checked })} /> Each side
              </label>
            </div>
            <input className="input" placeholder="Cue" value={p.cue ?? ''} onChange={(e) => setPose(i, { cue: e.target.value })} />
          </div>
        ))}
      </div>
      <button className="btn block" onClick={() => edit({ ...flow, poses: [...flow.poses, { name: 'New pose', sec: 60 }] })}>
        <Plus size={18} /> Add pose
      </button>
    </EditorShell>
  )
}

function HangEditor({ initial }: { initial: HangConfig }) {
  const { program } = useData()
  const [cfg, setCfg] = useState(initial)
  const [dirty, setDirty] = useState(false)
  const edit = (patch: Partial<HangConfig>) => {
    setCfg({ ...cfg, ...patch })
    setDirty(true)
  }
  return (
    <EditorShell title="Abrahangs" sub={`${hangReps(cfg)} hangs per session`} dirty={dirty} onSave={() => saveProgram({ ...program, hang: cfg })}>
      <div className="card stack">
        {(
          [
            ['Hang (s)', 'hangSec', 3, 60],
            ['Rest (s)', 'restSec', 3, 120],
            ['Session (min)', 'totalMin', 1, 40],
            ['Get-ready countdown (s)', 'prepSec', 0, 30],
            ['Edge (mm)', 'edgeMm', 6, 50],
          ] as const
        ).map(([label, key, min, max]) => (
          <div key={key} className="spread">
            <span>{label}</span>
            <Stepper value={cfg[key]} min={min} max={max} onChange={(v) => edit({ [key]: v })} />
          </div>
        ))}
      </div>
      <div className="section-title">Grip rotation</div>
      <div className="card">
        {cfg.grips.map((g, i) => (
          <div key={i} className="row" style={{ padding: '6px 0' }}>
            <input
              className="input grow"
              value={g}
              aria-label={`Grip ${i + 1}`}
              onChange={(e) => edit({ grips: cfg.grips.map((x, j) => (j === i ? e.target.value : x)) })}
            />
            <RowTools
              onUp={() => edit({ grips: move(cfg.grips, i, -1) })}
              onDown={() => edit({ grips: move(cfg.grips, i, 1) })}
              onRemove={() => edit({ grips: cfg.grips.filter((_, j) => j !== i) })}
            />
          </div>
        ))}
      </div>
      <button className="btn block" onClick={() => edit({ grips: [...cfg.grips, 'New grip'] })}>
        <Plus size={18} /> Add grip
      </button>
      <p className="note">Hangs are split evenly across the grips in order. Keep the strain light: feet stay on the floor.</p>
    </EditorShell>
  )
}

function RunPlanEditor({ initial }: { initial: Program }) {
  const { program } = useData()
  const [phases, setPhases] = useState<RunPhase[]>(initial.runPlan)
  const [factor, setFactor] = useState(Math.round(initial.deloadRunFactor * 100))
  const [dirty, setDirty] = useState(false)
  const edit = (p: RunPhase[]) => {
    setPhases(p)
    setDirty(true)
  }
  const setPhase = (i: number, patch: Partial<RunPhase>) => edit(phases.map((p, j) => (j === i ? { ...p, ...patch } : p)))
  return (
    <EditorShell title="Running plan" sub="Runs per week, by phase" dirty={dirty} onSave={() => saveProgram({ ...program, runPlan: phases, deloadRunFactor: factor / 100 })}>
      {phases.map((ph, i) => (
        <div key={i} className="card stack">
          <div className="spread">
            <div className="row">
              <span className="muted small">Weeks</span>
              <div style={{ width: 64 }}>
                <NumInput value={ph.fromWeek} decimal={false} onChange={(v) => setPhase(i, { fromWeek: v ?? 1 })} ariaLabel="From week" />
              </div>
              <span className="muted">–</span>
              <div style={{ width: 64 }}>
                <NumInput value={ph.toWeek} decimal={false} onChange={(v) => setPhase(i, { toWeek: v ?? 1 })} ariaLabel="To week" />
              </div>
            </div>
            <button className="icon-btn" aria-label="Remove phase" onClick={() => edit(phases.filter((_, j) => j !== i))}>
              <X size={18} />
            </button>
          </div>
          {ph.runs.map((r, k) => (
            <div key={k} className="row">
              <select
                className="input"
                style={{ width: 100 }}
                value={r.dow}
                aria-label="Day"
                onChange={(e) => setPhase(i, { runs: ph.runs.map((x, j) => (j === k ? { ...x, dow: Number(e.target.value) } : x)) })}
              >
                {DOW_SHORT.map((d, n) => (
                  <option key={d} value={n}>
                    {d}
                  </option>
                ))}
              </select>
              <div style={{ width: 90 }}>
                <NumInput value={r.km} onChange={(v) => setPhase(i, { runs: ph.runs.map((x, j) => (j === k ? { ...x, km: v ?? 0 } : x)) })} ariaLabel="Kilometres" />
              </div>
              <span className="muted small">km</span>
              <button className="icon-btn" style={{ marginLeft: 'auto' }} aria-label="Remove run" onClick={() => setPhase(i, { runs: ph.runs.filter((_, j) => j !== k) })}>
                <X size={18} />
              </button>
            </div>
          ))}
          <button className="btn sm" style={{ alignSelf: 'flex-start' }} onClick={() => setPhase(i, { runs: [...ph.runs, { dow: 6, km: 8 }] })}>
            <Plus size={16} /> Run
          </button>
        </div>
      ))}
      <button
        className="btn block"
        onClick={() => {
          const last = phases.at(-1)
          const from = (last?.toWeek ?? 0) + 1
          edit([...phases, { fromWeek: from, toWeek: from + 3, runs: last ? last.runs.map((r) => ({ ...r })) : [{ dow: 5, km: 10 }] }])
        }}
      >
        <Plus size={18} /> Add phase
      </button>
      <div className="card spread">
        <span>Deload weeks run</span>
        <div className="row">
          <Stepper value={factor} min={30} max={100} step={5} onChange={(v) => { setFactor(v); setDirty(true) }} />
          <span className="muted small">%</span>
        </div>
      </div>
    </EditorShell>
  )
}

const LAYOUT_KINDS: { value: SessionKind; label: string }[] = [
  { value: 'climb', label: 'Climb' },
  { value: 'lift', label: 'Lift' },
  { value: 'yoga', label: 'Yoga' },
  { value: 'other', label: 'Other' },
]

function slotId(day: DaySlot[], kind: SessionKind, templateId?: string, except?: number): string {
  const base = templateId ? `${kind}-${templateId}` : kind
  let id = base
  let n = 2
  while (day.some((s, i) => i !== except && s.slot === id)) id = `${base}-${n++}`
  return id
}

function LayoutEditor({ initial }: { initial: DaySlot[][] }) {
  const { program } = useData()
  const [layout, setLayout] = useState(initial)
  const [dirty, setDirty] = useState(false)
  const edit = (l: DaySlot[][]) => {
    setLayout(l)
    setDirty(true)
  }
  const templates = (kind: SessionKind) =>
    kind === 'lift'
      ? Object.values(program.liftDays).map((d) => ({ id: d.id, name: d.name }))
      : kind === 'yoga'
        ? Object.values(program.flows).filter((f) => f.id !== 'stretch').map((f) => ({ id: f.id, name: f.name }))
        : []
  const setSlot = (d: number, i: number, patch: Partial<DaySlot>) =>
    edit(
      layout.map((day, j) => {
        if (j !== d) return day
        return day.map((s, k) => {
          if (k !== i) return s
          const next = { ...s, ...patch }
          if (patch.kind) next.templateId = templates(patch.kind)[0]?.id
          if (patch.kind || patch.templateId) next.slot = slotId(day, next.kind, next.templateId, k)
          return next
        })
      }),
    )
  return (
    <EditorShell title="Weekly layout" sub="Abrahangs and stretching are added every day; runs come from the running plan" dirty={dirty} onSave={() => saveProgram({ ...program, weekLayout: layout })}>
      <div className="card">
        {layout.map((day, d) => (
          <div key={d} className="edit-row">
            <div className="spread">
              <strong>{DOW_SHORT[d]}</strong>
              <button
                className="btn sm"
                onClick={() => edit(layout.map((x, j) => (j === d ? [...x, { slot: slotId(x, 'climb'), kind: 'climb' }] : x)))}
              >
                <Plus size={16} /> Session
              </button>
            </div>
            {day.length === 0 && <span className="muted small">Rest (Abrahangs + stretch only)</span>}
            {day.map((s, i) => (
              <div key={s.slot} className="row wrap">
                <select className="input" style={{ width: 100 }} value={s.kind} onChange={(e) => setSlot(d, i, { kind: e.target.value as SessionKind })} aria-label="Session type">
                  {LAYOUT_KINDS.map((k) => (
                    <option key={k.value} value={k.value}>
                      {k.label}
                    </option>
                  ))}
                </select>
                {templates(s.kind).length > 0 && (
                  <select className="input" style={{ width: 130 }} value={s.templateId} onChange={(e) => setSlot(d, i, { templateId: e.target.value })} aria-label="Template">
                    {templates(s.kind).map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                )}
                <label className="row small">
                  <input type="checkbox" checked={!!s.optional} onChange={(e) => setSlot(d, i, { optional: e.target.checked })} /> Optional
                </label>
                <button className="icon-btn" aria-label="Remove session" style={{ marginLeft: 'auto' }} onClick={() => edit(layout.map((x, j) => (j === d ? x.filter((_, k) => k !== i) : x)))}>
                  <X size={18} />
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>
    </EditorShell>
  )
}
