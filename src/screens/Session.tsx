import { Header } from '../components/ui'
import { useData } from '../data'
import { useLogForItem } from '../db/db'
import { itemFromLog, resolveItem } from '../plan/generator'
import { ClimbSession } from './sessions/ClimbSession'
import { FlowSession } from './sessions/FlowSession'
import { HangSession } from './sessions/HangSession'
import { LiftSession } from './sessions/LiftSession'
import { OtherSession } from './sessions/OtherSession'
import { RunSession } from './sessions/RunSession'

export function SessionScreen({ itemId }: { itemId: string }) {
  const { program, moves } = useData()
  const log = useLogForItem(itemId)
  if (log === undefined) return null
  const item = resolveItem(itemId, program, moves) ?? (log ? itemFromLog(log) : undefined)
  if (!item) return <Header title="Not found" sub="This session is no longer in the plan." onBack />

  const props = { item, log }
  switch (item.kind) {
    case 'lift':
      return <LiftSession key={itemId} {...props} />
    case 'hang':
      return <HangSession key={itemId} {...props} />
    case 'yoga':
    case 'stretch':
      return <FlowSession key={itemId} {...props} />
    case 'run':
      return <RunSession key={itemId} {...props} />
    case 'climb':
      return <ClimbSession key={itemId} {...props} />
    case 'other':
      return <OtherSession key={itemId} {...props} />
  }
}
