import { useState } from 'react'
import { Field, Header, NumInput, Segmented } from '../../components/ui'
import { upsertLog } from '../../db/db'
import { fmtDay } from '../../lib/dates'
import { baseLog, SaveFooter, type SessionProps } from './common'

const PRESETS = ['Mountain bike', 'Ski', 'Hike', 'Other']

export function OtherSession({ item, log }: SessionProps) {
  const initial = log?.other?.activity ?? PRESETS[0]
  const [preset, setPreset] = useState(PRESETS.includes(initial) ? initial : 'Other')
  const [custom, setCustom] = useState(PRESETS.includes(initial) ? '' : initial)
  const [minutes, setMinutes] = useState<number | undefined>(log?.durationMin)
  const [km, setKm] = useState<number | undefined>(log?.other?.km)
  const [effort, setEffort] = useState<number | undefined>(log?.effort)
  const [notes, setNotes] = useState(log?.notes ?? '')

  const activity = preset === 'Other' ? custom.trim() || 'Other' : preset

  const save = async () => {
    await upsertLog({ ...baseLog(item), title: activity, status: 'done', durationMin: minutes, effort, notes: notes || undefined, other: { activity, km } })
  }

  return (
    <div className="stack-lg">
      <Header title="Other activity" sub={fmtDay(item.date, { weekday: 'short', month: 'short', day: 'numeric' })} onBack />
      <div className="card stack">
        <Segmented value={preset} onChange={setPreset} options={PRESETS.map((p) => ({ value: p, label: p === 'Mountain bike' ? 'MTB' : p }))} />
        {preset === 'Other' && <input className="input" placeholder="What did you do?" value={custom} onChange={(e) => setCustom(e.target.value)} />}
        <div className="grid2">
          <Field label="Duration (min)">
            <NumInput value={minutes} onChange={setMinutes} placeholder="60" decimal={false} />
          </Field>
          <Field label="Distance (km)">
            <NumInput value={km} onChange={setKm} placeholder="optional" />
          </Field>
        </div>
      </div>
      <SaveFooter effort={effort} setEffort={setEffort} notes={notes} setNotes={setNotes} onSave={save} label={log ? 'Save changes' : 'Save'} />
    </div>
  )
}
