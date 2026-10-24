import { createContext, useContext, useEffect, type ReactNode } from 'react'
import { useMovesQuery, useProgramQuery, useSettingsQuery } from './db/db'
import type { Moves, Program, Settings } from './plan/types'

interface Data {
  settings: Settings
  program: Program
  moves: Moves
}

const DataCtx = createContext<Data | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const settings = useSettingsQuery()
  const program = useProgramQuery()
  const moves = useMovesQuery()

  useEffect(() => {
    if (settings) document.documentElement.dataset.theme = settings.theme
  }, [settings])

  if (!settings || !program || !moves) return <div className="splash">Loading…</div>
  return <DataCtx.Provider value={{ settings, program, moves }}>{children}</DataCtx.Provider>
}

export function useData(): Data {
  const d = useContext(DataCtx)
  if (!d) throw new Error('useData outside DataProvider')
  return d
}
