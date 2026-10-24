import { useState, type ReactNode } from 'react'
import { EffortPicker } from '../../components/ui'
import type { PlannedItem, SessionLog } from '../../plan/types'
import { back } from '../../router'

export interface SessionProps {
  item: PlannedItem
  log: SessionLog | null
}

export function baseLog(item: PlannedItem) {
  return {
    planItemId: item.id,
    date: item.date,
    kind: item.kind,
    templateId: item.templateId,
    title: item.title,
    deload: item.deload,
  }
}

export function SaveFooter({
  effort,
  setEffort,
  notes,
  setNotes,
  onSave,
  label = 'Save',
  effortHint,
  disabled,
}: {
  effort?: number
  setEffort: (v: number | undefined) => void
  notes: string
  setNotes: (v: string) => void
  onSave: () => Promise<void> | void
  label?: string
  effortHint?: ReactNode
  disabled?: boolean
}) {
  const [saving, setSaving] = useState(false)
  return (
    <div className="stack">
      <EffortPicker value={effort} onChange={setEffort} hint={effortHint} />
      <label className="field">
        <span>Notes</span>
        <textarea className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="How did it feel?" />
      </label>
      <button
        className="btn primary lg block"
        disabled={saving || disabled}
        onClick={async () => {
          setSaving(true)
          try {
            await onSave()
            back()
          } finally {
            setSaving(false)
          }
        }}
      >
        {label}
      </button>
    </div>
  )
}
