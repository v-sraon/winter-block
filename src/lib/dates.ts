// Dates are local calendar days as 'YYYY-MM-DD' strings, so they never shift with time zones.

export function toISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function fromISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function today(): string {
  return toISO(new Date())
}

export function addDays(s: string, n: number): string {
  const d = fromISO(s)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

export function daysBetween(a: string, b: string): number {
  return Math.round((fromISO(b).getTime() - fromISO(a).getTime()) / 86_400_000)
}

/** 0 = Monday … 6 = Sunday */
export function dow(s: string): number {
  return (fromISO(s).getDay() + 6) % 7
}

export function mondayOf(s: string): string {
  return addDays(s, -dow(s))
}

export const DOW_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function fmtDay(s: string, opts: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'short', day: 'numeric' }): string {
  return fromISO(s).toLocaleDateString(undefined, opts)
}

export function fmtShort(s: string): string {
  return fmtDay(s, { month: 'short', day: 'numeric' })
}
