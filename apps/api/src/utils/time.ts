export const MS_HOUR = 3600 * 1000
export const JST_OFFSET_MS = 9 * MS_HOUR

export function nowUtc(): Date {
  return new Date()
}

export function nowJst(): Date {
  return new Date(Date.now() + JST_OFFSET_MS)
}

export function jstYmd(d: Date = nowJst()): string {
  return d.toISOString().slice(0, 10)
}

export function isJstMidnight(d: Date = nowJst()): boolean {
  const hh = d.getUTCHours() // using shifted Date with UTC getters
  const mm = d.getUTCMinutes()
  return hh === 0 && mm === 0
}

export function jstDayStart(d: Date = nowJst()): Date {
  const y = d.getUTCFullYear()
  const m = d.getUTCMonth()
  const day = d.getUTCDate()
  return new Date(Date.UTC(y, m, day))
}

export function jstWeekStart(d: Date = nowJst()): Date {
  const dayStart = jstDayStart(d)
  // getUTCDay(): 0=Sun..6=Sat → 週の開始をMon(1)とする
  const dow = dayStart.getUTCDay()
  const diff = (dow + 6) % 7 // Mon=0, Sun=6
  return new Date(dayStart.getTime() - diff * 24 * MS_HOUR)
}

export function jstMonthStart(d: Date = nowJst()): Date {
  const y = d.getUTCFullYear()
  const m = d.getUTCMonth()
  return new Date(Date.UTC(y, m, 1))
}

export function jstAddDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 24 * MS_HOUR)
}
