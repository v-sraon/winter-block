import { describe, expect, it } from 'vitest'
import { parseBackup } from './backup'

describe('parseBackup', () => {
  const ok = { app: 'winter-block', version: 1, exportedAt: '', settings: {}, program: null, moves: {}, logs: [] }
  it('accepts a valid backup', () => {
    expect(parseBackup(JSON.stringify(ok)).app).toBe('winter-block')
  })
  it('rejects other JSON', () => {
    expect(() => parseBackup('{"foo":1}')).toThrow(/not a Winter Block backup/)
  })
  it('rejects broken JSON', () => {
    expect(() => parseBackup('{')).toThrow(/not valid JSON/)
  })
  it('rejects damaged logs', () => {
    expect(() => parseBackup(JSON.stringify({ ...ok, logs: [{ date: 1 }] }))).toThrow(/damaged/)
  })
})
