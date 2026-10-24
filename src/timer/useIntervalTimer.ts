import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { beep, speak, unlockAudio, useWakeLock } from './cues'
import { locate, startOf, totalMs, type Interval } from './intervals'

export type TimerStatus = 'idle' | 'running' | 'paused' | 'done'

interface Options {
  voice: boolean
  beeps: boolean
}

// Position is derived from wall-clock timestamps, so the timer stays correct even if the
// browser throttles or suspends the page for a while.
export function useIntervalTimer(intervals: Interval[], opts: Options) {
  const [status, setStatus] = useState<TimerStatus>('idle')
  const [now, setNow] = useState(() => Date.now())
  const startRef = useRef(0)
  const pausedAtRef = useRef(0)
  const doneElapsedRef = useRef(0)
  const lastIndexRef = useRef(-1)
  const lastSecondRef = useRef(-1)
  const optsRef = useRef(opts)
  optsRef.current = opts

  const elapsed = status === 'running' ? now - startRef.current : status === 'paused' ? pausedAtRef.current - startRef.current : status === 'done' ? doneElapsedRef.current : 0
  const pos = useMemo(() => locate(intervals, elapsed), [intervals, elapsed])

  useWakeLock(status === 'running')

  const announce = useCallback(
    (index: number) => {
      const iv = intervals[index]
      if (!iv) return
      const o = optsRef.current
      if (o.beeps) beep(iv.kind === 'work' ? 1320 : iv.kind === 'rest' ? 660 : 990, 0.25)
      if (o.voice && iv.speak) speak(iv.speak)
    },
    [intervals],
  )

  useEffect(() => {
    if (status !== 'running') return
    const id = window.setInterval(() => setNow(Date.now()), 100)
    return () => window.clearInterval(id)
  }, [status])

  useEffect(() => {
    if (status !== 'running') return
    if (pos.done) {
      doneElapsedRef.current = totalMs(intervals)
      setStatus('done')
      if (optsRef.current.beeps) {
        beep(880, 0.2)
        window.setTimeout(() => beep(1320, 0.4), 250)
      }
      if (optsRef.current.voice) speak('Done. Nice work.')
      return
    }
    if (pos.index !== lastIndexRef.current) {
      lastIndexRef.current = pos.index
      lastSecondRef.current = -1
      announce(pos.index)
      return
    }
    const sec = Math.ceil(pos.remainingMs / 1000)
    if (sec <= 3 && sec >= 1 && sec !== lastSecondRef.current) {
      lastSecondRef.current = sec
      if (optsRef.current.beeps) beep(880, 0.08, 0.2)
    }
  }, [pos, status, announce, intervals])

  const start = useCallback(() => {
    unlockAudio()
    const t = Date.now()
    startRef.current = t
    lastIndexRef.current = 0
    lastSecondRef.current = -1
    setNow(t)
    setStatus('running')
    announce(0)
  }, [announce])

  const pause = useCallback(() => {
    pausedAtRef.current = Date.now()
    setStatus('paused')
    window.speechSynthesis?.cancel()
  }, [])

  const resume = useCallback(() => {
    unlockAudio()
    startRef.current += Date.now() - pausedAtRef.current
    setNow(Date.now())
    setStatus('running')
  }, [])

  /** Jump to the start of the next interval. */
  const skip = useCallback(() => {
    const ref = status === 'paused' ? pausedAtRef.current : Date.now()
    const cur = locate(intervals, ref - startRef.current)
    const target = startOf(intervals, cur.index + 1)
    startRef.current = ref - target
    if (status === 'paused') pausedAtRef.current = ref
    setNow(Date.now())
  }, [intervals, status])

  const stop = useCallback(() => {
    doneElapsedRef.current = (status === 'paused' ? pausedAtRef.current : Date.now()) - startRef.current
    setStatus('done')
    window.speechSynthesis?.cancel()
  }, [status])

  const reset = useCallback(() => {
    setStatus('idle')
    lastIndexRef.current = -1
  }, [])

  return { status, pos, elapsed, total: totalMs(intervals), start, pause, resume, skip, stop, reset }
}
