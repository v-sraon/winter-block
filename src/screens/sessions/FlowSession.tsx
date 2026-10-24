import { Pause, Play, SkipForward, Square } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Header } from '../../components/ui'
import { useData } from '../../data'
import { upsertLog } from '../../db/db'
import { fmtDay } from '../../lib/dates'
import { flowSeconds } from '../../seed/flows'
import { flowIntervals, fmtMinSec } from '../../timer/intervals'
import { useIntervalTimer } from '../../timer/useIntervalTimer'
import { baseLog, SaveFooter, type SessionProps } from './common'

export function FlowSession({ item, log }: SessionProps) {
  const { program, settings } = useData()
  const flow = item.templateId ? program.flows[item.templateId] : undefined
  const intervals = useMemo(() => (flow ? flowIntervals(flow) : []), [flow])
  const t = useIntervalTimer(intervals, settings)
  const [logging, setLogging] = useState(!!log)
  const [effort, setEffort] = useState<number | undefined>(log?.effort)
  const [notes, setNotes] = useState(log?.notes ?? '')

  if (!flow) return <Header title={item.title} sub="This flow no longer exists in the program." onBack />

  const plannedMin = Math.round(flowSeconds(flow) / 60)
  const iv = intervals[t.pos.index]
  const next = intervals[t.pos.index + 1]
  const pose = flow.poses.find((p) => p.name === iv?.label)
  const showForm = logging || t.status === 'done'

  const save = async () => {
    const minutes = t.status === 'done' && t.elapsed > 0 ? Math.max(1, Math.round(t.elapsed / 60000)) : (log?.durationMin ?? plannedMin)
    await upsertLog({ ...baseLog(item), status: 'done', durationMin: minutes, effort, notes: notes || undefined })
  }

  // Index of each pose's first interval, for highlighting the list.
  let cursor = 0
  const poseStarts = flow.poses.map((p) => {
    const s = cursor
    cursor += p.sides ? 2 : 1
    return s
  })

  return (
    <div className="stack-lg">
      <Header title={flow.name} sub={`${flow.focus} · ${plannedMin} min · ${fmtDay(item.date, { weekday: 'short', month: 'short', day: 'numeric' })}`} onBack />

      {!showForm && (
        <>
          {t.status !== 'idle' && (
            <>
              <div className="timer pose">
                <div className="phase">{iv?.sub ?? `Pose ${flow.poses.indexOf(pose!) + 1} of ${flow.poses.length}`}</div>
                <div className="big mid">{fmtMinSec(t.pos.remainingMs)}</div>
                <div className="label">{iv?.label}</div>
                {pose?.cue && <div className="cue">{pose.cue}</div>}
                {next && <div className="sub">Next: {next.label}{next.sub ? ` (${next.sub.toLowerCase()})` : ''}</div>}
              </div>
              <div className="progress">
                <div style={{ width: `${(t.elapsed / t.total) * 100}%` }} />
              </div>
            </>
          )}

          <div className="controls">
            {t.status === 'idle' && (
              <button className="btn primary lg" onClick={t.start}>
                <Play size={20} /> Start flow
              </button>
            )}
            {t.status === 'running' && (
              <>
                <button className="btn lg" onClick={t.pause}>
                  <Pause size={20} /> Pause
                </button>
                <button className="btn lg" onClick={t.skip} aria-label="Next pose">
                  <SkipForward size={20} />
                </button>
              </>
            )}
            {t.status === 'paused' && (
              <>
                <button className="btn primary lg" onClick={t.resume}>
                  <Play size={20} /> Resume
                </button>
                <button className="btn lg danger" onClick={t.stop}>
                  <Square size={18} /> End
                </button>
              </>
            )}
          </div>

          <div className="card">
            <div className="pose-list">
              {flow.poses.map((p, i) => {
                const start = poseStarts[i]
                const end = start + (p.sides ? 2 : 1)
                const cls = t.status === 'idle' ? '' : t.pos.index >= end ? 'past' : t.pos.index >= start ? 'cur' : ''
                return (
                  <div key={i} className={`p ${cls}`}>
                    <span>{p.name}</span>
                    <span className="num muted">
                      {p.sides ? `${p.sec}s × 2` : p.sec >= 60 ? `${Math.floor(p.sec / 60)}:${String(p.sec % 60).padStart(2, '0')}` : `${p.sec}s`}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {t.status === 'idle' && (
            <button className="btn ghost" onClick={() => setLogging(true)}>
              Mark done without the timer
            </button>
          )}
        </>
      )}

      {showForm && <SaveFooter effort={effort} setEffort={setEffort} notes={notes} setNotes={setNotes} onSave={save} label={log ? 'Save changes' : 'Save'} />}
    </div>
  )
}
