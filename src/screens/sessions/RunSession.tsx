import { useState } from 'react'
import { Field, Header, NumInput } from '../../components/ui'
import { upsertLog } from '../../db/db'
import { fmtDay } from '../../lib/dates'
import { fmtPace } from '../../plan/summary'
import { baseLog, SaveFooter, type SessionProps } from './common'

export function RunSession({ item, log }: SessionProps) {

  const secs = log?.run?.seconds ?? 0
  const [km, setKm] = useState<number | undefined>(log?.run?.km ?? item.targetKm)
  const [h, setH] = useState<number | undefined>(secs ? Math.floor(secs / 3600) : undefined)
  const [m, setM] = useState<number | undefined>(secs ? Math.floor((secs % 3600) / 60) : undefined)
  const [s, setS] = useState<number | undefined>(secs ? secs % 60 : undefined)
  const [hr, setHr] = useState<number | undefined>(log?.run?.avgHr)
  const [effort, setEffort] = useState<number | undefined>(log?.effort)
  const [notes, setNotes] = useState(log?.notes ?? '')

  const seconds = (h ?? 0) * 3600 + (m ?? 0) * 60 + (s ?? 0)

  const save = async () => {
    await upsertLog({
      ...baseLog(item),
      status: 'done',
      durationMin: seconds ? Math.round(seconds / 60) : undefined,
      effort,
      notes: notes || undefined,
      run: { km: km ?? 0, seconds, avgHr: hr },
    })
  }

  return (
    <div className="stack-lg">
      <Header
        title="Run"
        sub={
          <>
            {item.targetKm ? `${item.targetKm} km easy · ` : ''}
            {fmtDay(item.date, { weekday: 'short', month: 'short', day: 'numeric' })} {item.deload && <span className="badge deload">Deload</span>}
          </>
        }
        onBack
      />
      <div className="card stack">
        <Field label="Distance (km)">
          <NumInput value={km} onChange={setKm} placeholder="10" />
        </Field>
        <div className="field">
          <span>Time</span>
          <div className="grid3">
            <NumInput value={h} onChange={setH} placeholder="h" decimal={false} ariaLabel="Hours" />
            <NumInput value={m} onChange={setM} placeholder="min" decimal={false} ariaLabel="Minutes" />
            <NumInput value={s} onChange={setS} placeholder="sec" decimal={false} ariaLabel="Seconds" />
          </div>
        </div>
        <div className="spread">
          <span className="muted">Pace</span>
          <strong className="num">{km && seconds ? fmtPace(seconds, km) : '—'}</strong>
        </div>
        <Field label="Average heart rate (optional)">
          <NumInput value={hr} onChange={setHr} placeholder="bpm" decimal={false} />
        </Field>
      </div>
      <SaveFooter
        effort={effort}
        setEffort={setEffort}
        notes={notes}
        setNotes={setNotes}
        onSave={save}
        disabled={!km}
        label={log ? 'Save changes' : 'Save run'}
        effortHint={<div className="note">Easy runs should feel like 3–4: you could hold a conversation.</div>}
      />
    </div>
  )
}
