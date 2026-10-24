import Dexie, { type Table } from 'dexie'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Moves, Program, SessionKind, SessionLog, Settings } from '../plan/types'
import { cloneDefaultProgram } from '../seed/program'

interface KV {
  key: string
  value: unknown
}

class WinterBlockDB extends Dexie {
  logs!: Table<SessionLog, number>
  kv!: Table<KV, string>

  constructor() {
    super('winter-block')
    this.version(1).stores({
      logs: '++id, planItemId, date, kind',
      kv: 'key',
    })
  }
}

export const db = new WinterBlockDB()

export const DEFAULT_SETTINGS: Settings = {
  units: 'kg',
  gradeScale: 'V',
  voice: true,
  beeps: true,
  theme: 'dark',
}

export async function getKV<T>(key: string): Promise<T | undefined> {
  return (await db.kv.get(key))?.value as T | undefined
}

export async function setKV(key: string, value: unknown): Promise<void> {
  await db.kv.put({ key, value })
}

export function useSettingsQuery(): Settings | undefined {
  return useLiveQuery(async () => ({ ...DEFAULT_SETTINGS, ...((await getKV<Partial<Settings>>('settings')) ?? {}) }), [])
}

export function useProgramQuery(): Program | undefined {
  return useLiveQuery(async () => (await getKV<Program>('program')) ?? cloneDefaultProgram(), [])
}

export function useMovesQuery(): Moves | undefined {
  return useLiveQuery(async () => (await getKV<Moves>('moves')) ?? {}, [])
}

export async function saveSettings(patch: Partial<Settings>): Promise<void> {
  const cur = (await getKV<Partial<Settings>>('settings')) ?? {}
  await setKV('settings', { ...cur, ...patch })
}

export async function saveProgram(p: Program): Promise<void> {
  await setKV('program', p)
}

export async function setMove(itemId: string, date: string | null): Promise<void> {
  const moves = { ...((await getKV<Moves>('moves')) ?? {}) }
  if (date === null || itemId.slice(0, 10) === date) delete moves[itemId]
  else moves[itemId] = date
  await db.transaction('rw', db.kv, db.logs, async () => {
    await setKV('moves', moves)
    // A session that was already logged travels with its log.
    await db.logs.where('planItemId').equals(itemId).modify({ date: date ?? itemId.slice(0, 10) })
  })
}

export function useLogsBetween(from: string, to: string): SessionLog[] | undefined {
  return useLiveQuery(() => db.logs.where('date').between(from, to, true, true).toArray(), [from, to])
}

export function useLogForItem(itemId: string): SessionLog | null | undefined {
  return useLiveQuery(async () => (await db.logs.where('planItemId').equals(itemId).first()) ?? null, [itemId])
}

export function useAllLogs(): SessionLog[] | undefined {
  return useLiveQuery(() => db.logs.orderBy('date').toArray(), [])
}

export async function logsOfKind(kind: SessionKind): Promise<SessionLog[]> {
  return db.logs.where('kind').equals(kind).toArray()
}

type NewLog = Omit<SessionLog, 'id' | 'createdAt' | 'updatedAt'>

/** One log per planned item: saving again updates it. */
export async function upsertLog(log: NewLog): Promise<number> {
  const now = Date.now()
  const existing = await db.logs.where('planItemId').equals(log.planItemId).first()
  void requestPersistence()
  if (existing?.id !== undefined) {
    await db.logs.put({ ...log, id: existing.id, createdAt: existing.createdAt, updatedAt: now })
    return existing.id
  }
  return db.logs.add({ ...log, createdAt: now, updatedAt: now })
}

export async function deleteLogForItem(itemId: string): Promise<void> {
  await db.logs.where('planItemId').equals(itemId).delete()
}

let persistAsked = false
/** Asks the browser not to evict our data under storage pressure. */
export async function requestPersistence(): Promise<void> {
  if (persistAsked) return
  persistAsked = true
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist()
  } catch {
    // Unsupported; backups cover this.
  }
}
