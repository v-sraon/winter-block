import { useEffect } from 'react'

// iOS only lets audio and speech start from a user gesture, so unlock() must run inside the Start tap.

let ctx: AudioContext | null = null

export function unlockAudio(): void {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    ctx ??= new AC()
    if (ctx.state === 'suspended') void ctx.resume()
    beep(1, 0.001, 0)
  } catch {
    ctx = null
  }
}

export function beep(freq = 880, seconds = 0.12, gain = 0.3): void {
  if (!ctx) return
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.value = freq
  const t = ctx.currentTime
  g.gain.setValueAtTime(gain, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + seconds)
  osc.connect(g).connect(ctx.destination)
  osc.start(t)
  osc.stop(t + seconds + 0.02)
}

export function speak(text: string): void {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.rate = 1.05
  window.speechSynthesis.speak(u)
}

/** Keeps the screen on while `active`, re-acquiring after the page becomes visible again. */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    let cancelled = false
    const acquire = async () => {
      try {
        lock = await navigator.wakeLock.request('screen')
        if (cancelled) void lock.release()
      } catch {
        // Not allowed right now (e.g. low battery mode); the timer still works.
      }
    }
    const onVis = () => {
      if (document.visibilityState === 'visible') void acquire()
    }
    void acquire()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVis)
      void lock?.release()
    }
  }, [active])
}
