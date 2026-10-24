import { useMemo, useState, type ReactNode } from 'react'
import { Bar, CartesianGrid, ComposedChart, LabelList, Line, LineChart, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from 'recharts'
import { Header, KindDot } from '../components/ui'
import { useData } from '../data'
import { useAllLogs } from '../db/db'
import { addDays, daysBetween, DOW_SHORT, fmtShort, today } from '../lib/dates'
import { planForWeek, weekInfo } from '../plan/generator'
import { gradeLabel } from '../plan/grades'
import { estimate1RM } from '../plan/progression'
import { summarize } from '../plan/summary'
import type { SessionLog } from '../plan/types'
import { toDisplay } from '../plan/units'
import { go } from '../router'

const AXIS = { stroke: 'var(--muted)', fontSize: 11, tickLine: false, axisLine: false } as const

export function ProgressScreen() {
  const { program, moves, settings } = useData()
  const logs = useAllLogs()
  const now = today()
  const info = weekInfo(now, program)

  const stats = useMemo(() => {
    if (!logs) return null
    const done = logs.filter((l) => l.status === 'done')
    const doneIds = new Set(done.map((l) => l.planItemId))

    // Adherence: required planned items up to today (today counts only once done).
    let planned = 0
    let hit = 0
    const weeks: { week: number; label: string; target: number; actual: number }[] = []
    for (let w = 0; w < program.weeks; w++) {
      const ws = addDays(program.startDate, w * 7)
      const plan = Object.values(planForWeek(ws, program, moves)).flat()
      for (const it of plan) {
        if (it.optional) continue
        if (it.date < now || (it.date === now && doneIds.has(it.id))) {
          planned++
          if (doneIds.has(it.id)) hit++
        }
      }
      const we = addDays(ws, 6)
      weeks.push({
        week: w + 1,
        label: `W${w + 1}`,
        target: plan.reduce((s, i) => s + (i.targetKm ?? 0), 0),
        actual: Math.round(done.filter((l) => l.run && l.date >= ws && l.date <= we).reduce((s, l) => s + (l.run?.km ?? 0), 0) * 10) / 10,
      })
    }

    const hangDays = new Set(done.filter((l) => l.kind === 'hang').map((l) => l.date))
    let streak = 0
    let d = hangDays.has(now) ? now : addDays(now, -1)
    while (hangDays.has(d)) {
      streak++
      d = addDays(d, -1)
    }

    const totalKm = done.reduce((s, l) => s + (l.run?.km ?? 0), 0)
    return { planned, hit, weeks, hangDays, streak, totalKm, done }
  }, [logs, program, moves, now])

  if (!logs || !stats) return null
  const recent = [...logs].sort((a, b) => (a.date === b.date ? b.updatedAt - a.updatedAt : a.date < b.date ? 1 : -1)).slice(0, 25)

  return (
    <div className="stack-lg">
      <Header title="Progress" sub={info.phase === 'plan' ? `Week ${info.week} of ${program.weeks} · Block ${info.block}` : info.phase === 'pre' ? `Plan starts ${fmtShort(program.startDate)}` : 'Plan complete'} />

      <div className="tiles">
        <div className="tile">
          <div className="v">{stats.planned ? `${Math.round((stats.hit / stats.planned) * 100)}%` : '—'}</div>
          <div className="l">
            sessions done{stats.planned ? ` (${stats.hit}/${stats.planned})` : ''}
          </div>
        </div>
        <div className="tile">
          <div className="v">{stats.streak}</div>
          <div className="l">day Abrahangs streak</div>
        </div>
        <div className="tile">
          <div className="v">{Math.round(stats.totalKm * 10) / 10}</div>
          <div className="l">km run in total</div>
        </div>
        <div className="tile">
          <div className="v">{stats.done.filter((l) => l.kind === 'climb').length}</div>
          <div className="l">climbing sessions</div>
        </div>
      </div>

      <HangGrid hangDays={stats.hangDays} />
      <RunChart weeks={stats.weeks} currentWeek={info.phase === 'plan' ? info.week : 0} />
      <LiftChart logs={stats.done} />
      <ClimbChart logs={stats.done} />

      <div className="stack">
        <div className="section-title">Recent</div>
        <div className="card" style={{ paddingTop: 2, paddingBottom: 2 }}>
          {recent.length === 0 && <p className="muted small" style={{ padding: '12px 0' }}>Nothing logged yet.</p>}
          <div className="hist">
            {recent.map((l) => (
              <button key={l.id} onClick={() => go('do', l.planItemId)}>
                <KindDot kind={l.kind} small />
                <div className="grow">
                  <div style={{ fontWeight: 600 }}>
                    {l.title} <span className="muted small">· {fmtShort(l.date)}</span>
                  </div>
                  <div className="muted small">{summarize(l, settings)}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ChartCard({ title, sub, legend, table, children }: { title: string; sub?: string; legend?: ReactNode; table: ReactNode; children: ReactNode }) {
  const [showTable, setShowTable] = useState(false)
  return (
    <div className="card stack">
      <div className="spread" style={{ alignItems: 'flex-start' }}>
        <div>
          <h3>{title}</h3>
          {sub && <div className="muted small">{sub}</div>}
        </div>
        <button className="btn sm ghost" onClick={() => setShowTable(!showTable)}>
          {showTable ? 'Chart' : 'Table'}
        </button>
      </div>
      {legend && !showTable && <div className="legend">{legend}</div>}
      {showTable ? table : children}
    </div>
  )
}

function Tip({ active, payload, label, rows }: { active?: boolean; payload?: { payload: Record<string, unknown> }[]; label?: string | number; rows: (p: Record<string, unknown>) => { key: ReactNode; name: string; value: string }[] }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="tip">
      <div className="t">{String(p.tipLabel ?? label)}</div>
      {rows(p).map((r) => (
        <div key={r.name} className="r">
          {r.key}
          {r.name} <b>{r.value}</b>
        </div>
      ))}
    </div>
  )
}

function HangGrid({ hangDays }: { hangDays: Set<string> }) {
  const { program } = useData()
  const now = today()
  const cells = Array.from({ length: program.weeks * 7 }, (_, i) => addDays(program.startDate, i))
  const done = cells.filter((d) => hangDays.has(d)).length
  const elapsed = Math.max(0, Math.min(cells.length, daysBetween(program.startDate, now) + 1))
  return (
    <div className="card stack">
      <div className="spread">
        <div>
          <h3>Abrahangs</h3>
          <div className="muted small">{elapsed > 0 ? `${done} of ${elapsed} plan days so far · one column per week` : `Plan starts ${fmtShort(program.startDate)} · one column per week`}</div>
        </div>
        <KindDot kind="hang" small />
      </div>
      <div className="row" style={{ gap: 6, alignItems: 'stretch' }}>
        <div className="heat-days" aria-hidden>
          {DOW_SHORT.map((d, i) => (
            <span key={d}>{i % 2 === 0 ? d[0] : ''}</span>
          ))}
        </div>
        <div className="heat grow" role="img" aria-label={`Abrahangs done on ${done} of ${elapsed} plan days`}>
          {cells.map((d) => (
            <div key={d} title={`${fmtShort(d)}${hangDays.has(d) ? ': done' : ''}`} className={`${hangDays.has(d) ? 'on' : ''}${d > now ? ' future' : ''}${d === now ? ' today' : ''}`} />
          ))}
        </div>
      </div>
    </div>
  )
}

function RunChart({ weeks, currentWeek }: { weeks: { week: number; label: string; target: number; actual: number }[]; currentWeek: number }) {
  const data = weeks.map((w) => ({ ...w, tipLabel: `Week ${w.week}` }))
  return (
    <ChartCard
      title="Weekly running"
      sub="km per plan week against the target"
      legend={
        <>
          <span className="row" style={{ gap: 6 }}>
            <i className="key" style={{ background: 'var(--series-1)' }} />
            Run km
          </span>
          <span className="row" style={{ gap: 6 }}>
            <i className="key tick" />
            Target
          </span>
        </>
      }
      table={
        <table className="data-table">
          <thead>
            <tr>
              <th>Week</th>
              <th>Target km</th>
              <th>Run km</th>
            </tr>
          </thead>
          <tbody>
            {weeks.map((w) => (
              <tr key={w.week}>
                <td>{w.week}</td>
                <td>{w.target}</td>
                <td>{w.actual || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <div className="chart-wrap">
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ top: 16, right: 4, bottom: 0, left: -24 }}>
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            <XAxis dataKey="label" {...AXIS} interval={1} />
            <YAxis {...AXIS} allowDecimals={false} />
            <Tooltip
              cursor={{ fill: 'var(--surface-2)' }}
              content={<Tip rows={(p) => [
                { key: <i className="key" style={{ background: 'var(--series-1)' }} />, name: 'Run', value: `${p.actual} km` },
                { key: <i className="key tick" />, name: 'Target', value: `${p.target} km` },
              ]} />}
            />
            <Bar dataKey="actual" fill="var(--series-1)" radius={[4, 4, 0, 0]} maxBarSize={18} isAnimationActive={false}>
              {currentWeek > 0 && <LabelList dataKey="actual" position="top" fill="var(--text)" fontSize={11} formatter={(v: unknown) => (data[currentWeek - 1]?.actual === v && v ? String(v) : '')} />}
            </Bar>
            <Scatter dataKey="target" isAnimationActive={false} shape={(props: { cx?: number; cy?: number }) => <rect x={(props.cx ?? 0) - 8} y={(props.cy ?? 0) - 1} width={16} height={2} rx={1} fill="var(--muted)" />} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}

function LiftChart({ logs }: { logs: SessionLog[] }) {
  const { program, settings } = useData()
  const units = settings.units
  const series = useMemo(() => {
    const byEx = new Map<string, { name: string; points: { date: string; top: number; e1rm: number }[] }>()
    for (const l of logs) {
      if (!l.lift) continue
      for (const ex of l.lift.exercises) {
        if (ex.mode !== 'weight') continue
        const sets = ex.sets.filter((s) => s.done && s.weight && s.reps)
        if (!sets.length) continue
        const top = Math.max(...sets.map((s) => s.weight!))
        const e1rm = Math.max(...sets.map((s) => estimate1RM(s.weight!, s.reps!)))
        const entry = byEx.get(ex.exerciseId) ?? { name: ex.name, points: [] }
        entry.points.push({ date: l.date, top, e1rm })
        byEx.set(ex.exerciseId, entry)
      }
    }
    for (const e of byEx.values()) e.points.sort((a, b) => (a.date < b.date ? -1 : 1))
    return byEx
  }, [logs])

  // Prefer the program's order so the main lifts come first.
  const order = Object.values(program.liftDays).flatMap((d) => d.exercises.map((e) => e.id))
  const ids = [...series.keys()].sort((a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99))
  const [picked, setPicked] = useState<string>()
  const id = picked && series.has(picked) ? picked : ids[0]
  const s = id ? series.get(id) : undefined

  if (!s) {
    return (
      <div className="card stack">
        <h3>Strength</h3>
        <p className="muted small">Log a lift session with weights to see your top sets and estimated 1-rep max here.</p>
      </div>
    )
  }

  const r = (kg: number) => Math.round(toDisplay(kg, units) * 10) / 10
  const data = s.points.map((p) => ({ label: fmtShort(p.date), tipLabel: fmtShort(p.date), top: r(p.top), e1rm: r(p.e1rm) }))
  const last = data.length - 1

  return (
    <ChartCard
      title="Strength"
      sub={`Top set and estimated 1-rep max (${units})`}
      legend={
        <>
          <span className="row" style={{ gap: 6 }}>
            <i className="key line" style={{ background: 'var(--series-1)' }} />
            Top set
          </span>
          <span className="row" style={{ gap: 6 }}>
            <i className="key line" style={{ background: 'var(--series-2)' }} />
            Est. 1RM
          </span>
        </>
      }
      table={
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Top set</th>
              <th>Est. 1RM</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d, i) => (
              <tr key={i}>
                <td>{d.label}</td>
                <td>{d.top}</td>
                <td>{d.e1rm}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <select className="input" value={id} onChange={(e) => setPicked(e.target.value)} aria-label="Exercise">
        {ids.map((x) => (
          <option key={x} value={x}>
            {series.get(x)!.name}
          </option>
        ))}
      </select>
      <div className="chart-wrap">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 16, right: 36, bottom: 0, left: -16 }}>
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            <XAxis dataKey="label" {...AXIS} minTickGap={24} />
            <YAxis {...AXIS} domain={['auto', 'auto']} />
            <Tooltip
              cursor={{ stroke: 'var(--muted)', strokeWidth: 1 }}
              content={<Tip rows={(p) => [
                { key: <i className="key line" style={{ background: 'var(--series-1)' }} />, name: 'Top set', value: `${p.top} ${units}` },
                { key: <i className="key line" style={{ background: 'var(--series-2)' }} />, name: 'Est. 1RM', value: `${p.e1rm} ${units}` },
              ]} />}
            />
            {(['top', 'e1rm'] as const).map((k, i) => (
              <Line
                key={k}
                dataKey={k}
                stroke={`var(--series-${i + 1})`}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                isAnimationActive={false}
                dot={{ r: 4, fill: `var(--series-${i + 1})`, stroke: 'var(--surface)', strokeWidth: 2 }}
                activeDot={{ r: 5, stroke: 'var(--surface)', strokeWidth: 2 }}
              >
                <LabelList dataKey={k} position="right" fill="var(--text)" fontSize={11} formatter={(v: unknown) => (data[last][k] === v ? String(v) : '')} />
              </Line>
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}

function ClimbChart({ logs }: { logs: SessionLog[] }) {
  const { settings } = useData()
  const sends = logs.flatMap((l) => l.climb?.problems.filter((p) => p.result !== 'project') ?? [])
  if (!sends.length) {
    return (
      <div className="card stack">
        <h3>Climbing</h3>
        <p className="muted small">Log problems in a climbing session to see your sends by grade.</p>
      </div>
    )
  }
  const min = Math.min(...sends.map((p) => p.grade))
  const max = Math.max(...sends.map((p) => p.grade))
  const data = Array.from({ length: max - min + 1 }, (_, i) => {
    const v = min + i
    const label = gradeLabel(v, settings.gradeScale)
    return { label, tipLabel: label, count: sends.filter((p) => p.grade === v).length, flashes: sends.filter((p) => p.grade === v && p.result === 'flash').length }
  })
  return (
    <ChartCard
      title="Sends by grade"
      sub={`${sends.length} problems sent · best ${gradeLabel(max, settings.gradeScale)}`}
      table={
        <table className="data-table">
          <thead>
            <tr>
              <th>Grade</th>
              <th>Sends</th>
              <th>Flashes</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.label}>
                <td>{d.label}</td>
                <td>{d.count}</td>
                <td>{d.flashes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <div className="chart-wrap" style={{ height: 180 }}>
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ top: 18, right: 4, bottom: 0, left: 4 }}>
            <XAxis dataKey="label" {...AXIS} />
            <Tooltip
              cursor={{ fill: 'var(--surface-2)' }}
              content={<Tip rows={(p) => [
                { key: <i className="key" style={{ background: 'var(--series-2)' }} />, name: 'Sends', value: String(p.count) },
                { key: null, name: 'Flashed', value: String(p.flashes) },
              ]} />}
            />
            <Bar dataKey="count" fill="var(--series-2)" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false}>
              <LabelList dataKey="count" position="top" fill="var(--text)" fontSize={11} />
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}
