import type { Moves, Program, SessionLog, Settings } from '../plan/types'
import { today } from '../lib/dates'
import { db, getKV, saveSettings, setKV } from './db'

export interface Backup {
  app: 'winter-block'
  version: 1
  exportedAt: string
  settings: Partial<Settings>
  program: Program | null
  moves: Moves
  logs: SessionLog[]
}

export async function buildBackup(): Promise<Backup> {
  return {
    app: 'winter-block',
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: (await getKV<Partial<Settings>>('settings')) ?? {},
    program: (await getKV<Program>('program')) ?? null,
    moves: (await getKV<Moves>('moves')) ?? {},
    logs: await db.logs.toArray(),
  }
}

export function parseBackup(text: string): Backup {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('That file is not valid JSON.')
  }
  const b = data as Partial<Backup>
  if (!b || b.app !== 'winter-block' || b.version !== 1 || !Array.isArray(b.logs)) {
    throw new Error('That file is not a Winter Block backup.')
  }
  for (const l of b.logs) {
    if (typeof l.planItemId !== 'string' || typeof l.date !== 'string' || typeof l.kind !== 'string') {
      throw new Error('The backup contains a damaged log entry.')
    }
  }
  return b as Backup
}

/** Replaces everything on this device with the backup's contents. */
export async function restoreBackup(b: Backup): Promise<void> {
  await db.transaction('rw', db.logs, db.kv, async () => {
    await db.logs.clear()
    await db.kv.clear()
    await db.logs.bulkAdd(b.logs.map(({ id: _id, ...rest }) => rest))
    await setKV('settings', b.settings ?? {})
    if (b.program) await setKV('program', b.program)
    await setKV('moves', b.moves ?? {})
  })
}

/** Uses the iOS share sheet (Save to Files) when available, otherwise a normal download. */
export async function exportBackup(): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const backup = await buildBackup()
  const name = `winter-block-backup-${today()}.json`
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const file = new File([blob], name, { type: 'application/json' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Winter Block backup' })
      await saveSettings({ lastBackupAt: Date.now() })
      return 'shared'
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelled'
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
  await saveSettings({ lastBackupAt: Date.now() })
  return 'downloaded'
}

export async function eraseAll(): Promise<void> {
  await db.transaction('rw', db.logs, db.kv, async () => {
    await db.logs.clear()
    await db.kv.clear()
  })
}
