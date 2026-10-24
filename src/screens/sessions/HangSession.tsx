import { Pause, Play, SkipForward, Square } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Header, NumInput, Stepper } from '../../components/ui'
import { useData } from '../../data'
import { upsertLog } from '../../db/db'
import { fmtDay } from '../../lib/dates'
import { fromDisplay, toDisplay } from '../../plan/units'
import { completedWork, fmtClock, fmtMinSec, gripFor, hangIntervals, hangReps } from '../../timer/intervals'
import { useIntervalTimer } from '../../timer/useIntervalTimer'
import { go } from '../../router'
import { baseLog, SaveFooter, type SessionProps } from './common'

export function HangSession({ item, log }: SessionProps) {
  const { program, settings } = useData()
  const cfg = program.hang
  const intervals = useMemo(() => hangIntervals(cfg), [cfg])
  const planned = hangReps(cfg)
  const t = useIntervalTimer(intervals, settings)
  const [logging, setLogging] = useState(!!log)

  const [reps, setReps] = useState<number>(log?.hang?.reps ?? planned)
  const [edge, setEdge] = useState<number>(log?.hang?.edgeMm ?? cfg.edgeMm)
  const [load, setLoad] = useState<number | undefined>(log?.hang?.loadKg)
  const [effort, setEffort] = useState<number | undefined>(log?.effort)
  const [notes, setNotes] = useState(log?.notes ?? '')

  const finishTimer = () => {
    t.stop()
  }
  const showForm = logging || t.status === 'done'
  // Pre-fill the finished-hangs count once the timer stops.
  const [syncedDone, setSyncedDone] = useState(false)
  if (t.status === 'done' && !syncedDone && !log) {
    setSyncedDone(true)
    setReps(completedWork(intervals, t.elapsed))
  }

  const iv = intervals[t.pos.index]
  const phase = t.status === 'idle' ? 'prep' : iv?.kind ?? 'prep'
  const workIdx = intervals.slice(0, t.pos.index + 1).filter((i) => i.kind === 'work').length

  const save = async () => {
    await upsertLog({
      ...baseLog(item),
      status: 'done',
      durationMin: t.status === 'done' && t.elapsed > 0 ? Math.max(1, Math.round(t.elapsed / 60000)) : (log?.durationMin ?? cfg.totalMin),
      effort,
      notes: notes || undefined,
      hang: { reps, plannedReps: planned, edgeMm: edge, grips: cfg.grips, loadKg: load },
    })
  }

  return (
    <div className="stack-lg">
      <Header title="Abrahangs" sub={fmtDay(item.date, { weekday: 'short', month: 'short', day: 'numeric' })} onBack />

      {!showForm && (
        <>
          <div className={`timer ${t.status === 'idle' ? '' : phase}`}>
            <div className="phase">{t.status === 'idle' ? `${planned} hangs · ${cfg.hangSec}s on / ${cfg.restSec}s off` : iv?.label}</div>
            <div className={`big${t.status === 'idle' ? ' mid' : ''}`}>{t.status === 'idle' ? fmtMinSec(t.total) : fmtClock(t.pos.remainingMs)}</div>
            <div className="label">{t.status === 'idle' ? gripFor(cfg, 0) : iv?.kind === 'work' ? iv.sub?.split(' · ')[0] : iv?.sub}</div>
            <div className="sub">
              {t.status === 'idle' ? `${cfg.edgeMm} mm edge · feet on the floor` : `Hang ${Math.max(1, workIdx)} of ${planned} · ${fmtClock(t.total - t.elapsed)} left`}
            </div>
          </div>
          <div className="progress">
            <div style={{ width: `${(t.elapsed / t.total) * 100}%` }} />
          </div>

          <div className="controls">
            {t.status === 'idle' && (
              <button className="btn primary lg" onClick={t.start}>
                <Play size={20} /> Start
              </button>
            )}
            {t.status === 'running' && (
              <>
                <button className="btn lg" onClick={t.pause}>
                  <Pause size={20} /> Pause
                </button>
                <button className="btn lg" onClick={t.skip} aria-label="Skip">
                  <SkipForward size={20} />
                </button>
              </>
            )}
            {t.status === 'paused' && (
              <>
                <button className="btn primary lg" onClick={t.resume}>
                  <Play size={20} /> Resume
                </button>
                <button className="btn lg danger" onClick={finishTimer}>
                  <Square size={18} /> End
                </button>
              </>
            )}
          </div>

          {t.status === 'idle' && (
            <>
              <div className="card stack">
                <h3>Grip rotation</h3>
                <div className="pose-list">
                  {cfg.grips.map((g, i) => {
                    const count = Array.from({ length: planned }, (_, r) => Math.min(cfg.grips.length - 1, Math.floor((r * cfg.grips.length) / planned))).filter((x) => x === i).length
                    return (
                      <div key={i} className="p">
                        <span>{g}</span>
                        <span className="muted num">× {count}</span>
                      </div>
                    )
                  })}
                </div>
                <p className="note">
                  Light strain only: you should feel it a little in the forearms, nothing more. Keep your feet on the floor and take weight off as needed.
                </p>
                <button className="btn sm ghost" style={{ alignSelf: 'flex-start' }} onClick={() => go('settings', 'hang')}>
                  Change timing, edge or grips
                </button>
              </div>
              <p className="muted small" style={{ textAlign: 'center' }}>
                Turn the ringer switch on to hear beeps and voice cues. The screen stays awake while the timer runs.
              </p>
              <button className="btn ghost" onClick={() => setLogging(true)}>
                Log without the timer
              </button>
            </>
          )}
        </>
      )}

      {showForm && (
        <div className="stack">
          <div className="card stack">
            <div className="spread">
              <span>Hangs completed</span>
              <Stepper value={reps} onChange={setReps} max={planned * 2} />
            </div>
            <div className="spread">
              <span>Edge (mm)</span>
              <Stepper value={edge} onChange={setEdge} max={60} />
            </div>
            <div className="spread">
              <span>
                Load on the board <span className="muted small">(optional, {settings.units})</span>
              </span>
              <div style={{ width: 96 }}>
                <NumInput
                  value={load === undefined ? undefined : Math.round(toDisplay(load, settings.units) * 10) / 10}
                  onChange={(v) => setLoad(v === undefined ? undefined : fromDisplay(v, settings.units))}
                  placeholder="—"
                />
              </div>
            </div>
          </div>
          <SaveFooter
            effort={effort}
            setEffort={setEffort}
            notes={notes}
            setNotes={setNotes}
            onSave={save}
            label={log ? 'Save changes' : 'Save'}
            effortHint={
              effort !== undefined && effort > 6 ? (
                <div className="banner warn small">That is harder than Abrahangs are meant to be. Take more weight through your feet next time.</div>
              ) : (
                <div className="note">Aim for 3–5: light strain.</div>
              )
            }
          />
        </div>
      )}
    </div>
  )
}
