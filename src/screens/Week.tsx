import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Header, KindIcon } from '../components/ui'
import { useData } from '../data'
import { useLogsBetween } from '../db/db'
import { addDays, fmtDay, fmtShort, mondayOf, today } from '../lib/dates'
import { planForWeek, unplannedItems, weekInfo } from '../plan/generator'
import type { PlannedItem } from '../plan/types'
import { go } from '../router'

export function WeekScreen({ weekStart: ws }: { weekStart?: string }) {
  const { program, moves } = useData()
  const weekStart = mondayOf(ws ?? today())
  const weekEnd = addDays(weekStart, 6)
  const plan = planForWeek(weekStart, program, moves)
  const logs = useLogsBetween(weekStart, weekEnd)
  const info = weekInfo(weekStart, program)
  if (!logs) return null

  const byItem = new Map(logs.map((l) => [l.planItemId, l]))
  const all = Object.values(plan).flat()
  const required = all.filter((i) => !i.optional)
  const done = required.filter((i) => byItem.get(i.id)?.status === 'done').length
  const kmPlanned = all.reduce((s, i) => s + (i.targetKm ?? 0), 0)
  const kmRun = logs.reduce((s, l) => s + (l.run?.km ?? 0), 0)
  const hangDays = new Set(logs.filter((l) => l.kind === 'hang' && l.status === 'done').map((l) => l.date)).size

  const title = info.phase === 'plan' ? `Week ${info.week}` : info.phase === 'pre' ? 'Pre-season' : 'After the plan'

  return (
    <div className="stack-lg">
      <Header
        title={title}
        sub={
          <>
            {fmtShort(weekStart)} – {fmtShort(weekEnd)}
            {info.phase === 'plan' && ` · Block ${info.block}`} {info.deload && <span className="badge deload">Deload</span>}
          </>
        }
        right={
          <div className="row">
            <button className="icon-btn bordered" aria-label="Previous week" onClick={() => go('week', addDays(weekStart, -7))}>
              <ChevronLeft size={20} />
            </button>
            <button className="icon-btn bordered" aria-label="Next week" onClick={() => go('week', addDays(weekStart, 7))}>
              <ChevronRight size={20} />
            </button>
          </div>
        }
      />

      <div className="tiles" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
        <div className="tile">
          <div className="v">
            {done}/{required.length}
          </div>
          <div className="l">sessions</div>
        </div>
        <div className="tile">
          <div className="v">{Math.round(kmRun * 10) / 10}</div>
          <div className="l">of {kmPlanned} km run</div>
        </div>
        <div className="tile">
          <div className="v">{hangDays}/7</div>
          <div className="l">hang days</div>
        </div>
      </div>

      <div className="card" style={{ paddingTop: 4, paddingBottom: 4 }}>
        {Object.entries(plan).map(([date, items]) => {
          const extras = unplannedItems(
            logs.filter((l) => l.date === date),
            all,
            program,
            moves,
          )
          return (
            <button key={date} className={`day-row${date === today() ? ' today' : ''}`} onClick={() => go('day', date)}>
              <div className="date">
                <div className="tiny muted">{fmtDay(date, { weekday: 'short' })}</div>
                <div className="d">{fmtDay(date, { day: 'numeric' })}</div>
              </div>
              <div className="chips">
                {[...items, ...extras].map((it) => {
                  const l = byItem.get(it.id)
                  const cls = l?.status === 'done' ? ' done' : l?.status === 'skipped' ? ' skipped' : ''
                  return (
                    <span key={it.id} className={`chip kind-${it.kind}${cls}${it.optional ? ' optional' : ''}`}>
                      <KindIcon kind={it.kind} size={14} />
                      {chipLabel(it)}
                      {l?.status === 'done' && ' ✓'}
                    </span>
                  )
                })}
              </div>
            </button>
          )
        })}
      </div>
      <p className="muted small" style={{ textAlign: 'center' }}>
        Tap a day to log it. Use ⋯ on a session to move it to another day.
      </p>
    </div>
  )
}

function chipLabel(it: PlannedItem): string {
  switch (it.kind) {
    case 'hang':
      return 'Hangs'
    case 'stretch':
      return 'Stretch'
    case 'run':
      return it.targetKm ? `${it.targetKm} km` : 'Run'
    case 'lift':
      return it.title.replace('Lift ', 'Lift ')
    case 'yoga':
      return it.title.replace('Yoga Flow', 'Yoga')
    default:
      return it.title
  }
}
