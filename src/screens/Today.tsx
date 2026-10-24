import { CalendarArrowUp, Check, Ellipsis, Plus, SkipForward, Undo2 } from 'lucide-react'
import { useState } from 'react'
import { Header, KindDot, Sheet } from '../components/ui'
import { useData } from '../data'
import { exportBackup } from '../db/backup'
import { deleteLogForItem, setMove, upsertLog, useAllLogs, useLogsBetween } from '../db/db'
import { addDays, dow, DOW_SHORT, fmtDay, fmtShort, today } from '../lib/dates'
import { extraId, planEndDate, planForDate, unplannedItems, weekInfo } from '../plan/generator'
import { summarize } from '../plan/summary'
import type { PlannedItem, SessionKind, SessionLog } from '../plan/types'
import { go } from '../router'

const DAILY: SessionKind[] = ['hang', 'stretch']

export function TodayScreen({ date }: { date: string }) {
  const { program, moves, settings } = useData()
  const isToday = date === today()
  const info = weekInfo(date, program)
  const planned = planForDate(date, program, moves)
  const logs = useLogsBetween(date, date)
  const allLogs = useAllLogs()
  const [menu, setMenu] = useState<PlannedItem | null>(null)
  const [adding, setAdding] = useState(false)

  if (!logs) return null
  const byItem = new Map(logs.map((l) => [l.planItemId, l]))
  const extras = unplannedItems(logs, planned, program, moves)
  const items = [...planned, ...extras]
  const required = planned.filter((i) => !i.optional)
  const doneCount = required.filter((i) => byItem.get(i.id)?.status === 'done').length

  const backupDue = (allLogs?.length ?? 0) >= 3 && Date.now() - (settings.lastBackupAt ?? 0) > 7 * 86_400_000

  const phaseLine =
    info.phase === 'pre' ? (
      <>Pre-season · plan starts {fmtDay(program.startDate, { weekday: 'short', month: 'short', day: 'numeric' })}</>
    ) : info.phase === 'post' ? (
      <>Plan finished {fmtShort(planEndDate(program))} · set a new start date in Settings</>
    ) : (
      <>
        Week {info.week} of {program.weeks} · Block {info.block} {info.deload && <span className="badge deload">Deload</span>}
      </>
    )

  return (
    <div className="stack-lg">
      <Header
        title={isToday ? 'Today' : fmtDay(date, { weekday: 'long' })}
        sub={
          <>
            {fmtDay(date, isToday ? undefined : { month: 'long', day: 'numeric' })}
            <div style={{ marginTop: 4 }}>{phaseLine}</div>
          </>
        }
        onBack={!isToday}
        right={
          <div className="row">
            <button className="icon-btn bordered" aria-label="Previous day" onClick={() => go('day', addDays(date, -1))}>
              ‹
            </button>
            <button className="icon-btn bordered" aria-label="Next day" onClick={() => go('day', addDays(date, 1))}>
              ›
            </button>
          </div>
        }
      />

      {backupDue && (
        <div className="banner warn spread">
          <div className="small">
            <strong>Back up your log.</strong> Your data lives only on this phone.
          </div>
          <button className="btn sm" onClick={() => void exportBackup()}>
            Back up
          </button>
        </div>
      )}

      <div className="stack">
        <div className="spread">
          <div className="section-title" style={{ margin: 0 }}>
            {doneCount}/{required.length} done
          </div>
          {!isToday && (
            <button className="btn ghost sm" onClick={() => go('')}>
              Back to today
            </button>
          )}
        </div>
        {items.map((it) => (
          <ItemCard key={it.id} item={it} log={byItem.get(it.id)} onMenu={() => setMenu(it)} />
        ))}
        <button className="btn block" onClick={() => setAdding(true)}>
          <Plus size={18} /> Add activity
        </button>
      </div>

      <ItemMenu item={menu} log={menu ? byItem.get(menu.id) : undefined} weekStart={info.weekStart} onClose={() => setMenu(null)} />
      <AddSheet open={adding} date={date} onClose={() => setAdding(false)} />
    </div>
  )
}

function ItemCard({ item, log, onMenu }: { item: PlannedItem; log?: SessionLog; onMenu: () => void }) {
  const { moves, settings } = useData()
  const done = log?.status === 'done'
  const moved = moves[item.id] && moves[item.id] !== item.id.slice(0, 10)
  return (
    <div className={`card item kind-${item.kind}${log ? ' done' : ''}`}>
      <button className="row grow" style={{ border: 0, background: 'none', padding: 0, textAlign: 'left' }} onClick={() => go('do', item.id)}>
        <KindDot kind={item.kind} />
        <div className="body">
          <div className="title">
            {item.title} {item.optional && <span className="badge opt">optional</span>} {item.extra && <span className="badge opt">extra</span>}
          </div>
          <div className="detail">
            {item.detail}
            {moved && ` · moved from ${DOW_SHORT[dow(item.id.slice(0, 10))]}`}
          </div>
          {log && <div className={`status${log.status === 'skipped' ? ' skipped' : ''}`}>{summarize(log, settings)}</div>}
        </div>
      </button>
      {done ? (
        <span className="check" aria-label="Done">
          <Check size={18} strokeWidth={3} />
        </span>
      ) : null}
      <button className="icon-btn" aria-label="More" onClick={onMenu}>
        <Ellipsis size={20} />
      </button>
    </div>
  )
}

function ItemMenu({ item, log, weekStart, onClose }: { item: PlannedItem | null; log?: SessionLog; weekStart: string; onClose: () => void }) {
  const { moves } = useData()
  const [moving, setMoving] = useState(false)
  if (!item) return null
  const canMove = !item.extra && !DAILY.includes(item.kind)
  const close = () => {
    setMoving(false)
    onClose()
  }
  const quickDone = async () => {
    await upsertLog({ planItemId: item.id, date: item.date, kind: item.kind, templateId: item.templateId, title: item.title, status: 'done', deload: item.deload })
    close()
  }
  const skip = async () => {
    await upsertLog({ planItemId: item.id, date: item.date, kind: item.kind, templateId: item.templateId, title: item.title, status: 'skipped', deload: item.deload })
    close()
  }
  const clear = async () => {
    await deleteLogForItem(item.id)
    close()
  }
  return (
    <Sheet open onClose={close} title={item.title}>
      {moving ? (
        <div className="stack">
          <p className="muted small">Move to another day this week:</p>
          {Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)).map((d) => (
            <button
              key={d}
              className="menu-btn"
              disabled={d === item.date}
              style={d === item.date ? { opacity: 0.4 } : undefined}
              onClick={async () => {
                await setMove(item.id, d)
                close()
              }}
            >
              {fmtDay(d, { weekday: 'long', month: 'short', day: 'numeric' })}
            </button>
          ))}
        </div>
      ) : (
        <div>
          {!log && (
            <button className="menu-btn" onClick={quickDone}>
              <Check size={20} /> Mark done (no details)
            </button>
          )}
          {!log && (
            <button className="menu-btn" onClick={skip}>
              <SkipForward size={20} /> Skip
            </button>
          )}
          {canMove && (
            <button className="menu-btn" onClick={() => setMoving(true)}>
              <CalendarArrowUp size={20} /> Move to another day…
            </button>
          )}
          {canMove && moves[item.id] && (
            <button
              className="menu-btn"
              onClick={async () => {
                await setMove(item.id, null)
                close()
              }}
            >
              <Undo2 size={20} /> Put back on its original day
            </button>
          )}
          {log && (
            <button className="menu-btn danger" onClick={clear}>
              <Undo2 size={20} /> {log.status === 'skipped' ? 'Undo skip' : 'Delete this log'}
            </button>
          )}
        </div>
      )}
    </Sheet>
  )
}

function AddSheet({ open, date, onClose }: { open: boolean; date: string; onClose: () => void }) {
  const { program } = useData()
  const options: { kind: SessionKind; templateId?: string; label: string }[] = [
    { kind: 'run', label: 'Run' },
    { kind: 'climb', label: 'Climb' },
    ...Object.values(program.liftDays).map((d) => ({ kind: 'lift' as const, templateId: d.id, label: `${d.name}: ${d.focus}` })),
    ...Object.values(program.flows).map((f) => ({ kind: (f.id === 'stretch' ? 'stretch' : 'yoga') as SessionKind, templateId: f.id, label: f.name })),
    { kind: 'hang', label: 'Abrahangs' },
    { kind: 'other', label: 'Other (MTB, ski, hike…)' },
  ]
  return (
    <Sheet open={open} onClose={onClose} title="Add activity">
      {options.map((o) => (
        <button
          key={o.kind + (o.templateId ?? '')}
          className="menu-btn"
          onClick={() => {
            onClose()
            go('do', extraId(date, o.kind, o.templateId))
          }}
        >
          <KindDot kind={o.kind} small /> {o.label}
        </button>
      ))}
    </Sheet>
  )
}
