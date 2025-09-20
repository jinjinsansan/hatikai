export function msUntilNextJstMidnight(now = new Date()): number {
  const jstOffsetMs = 9 * 3600 * 1000
  const jstNow = new Date(now.getTime() + jstOffsetMs)
  const next = new Date(Date.UTC(jstNow.getUTCFullYear(), jstNow.getUTCMonth(), jstNow.getUTCDate() + 1, 0, 0, 0))
  const nextUtcMs = next.getTime() - jstOffsetMs
  return Math.max(0, nextUtcMs - now.getTime())
}

export function formatHMS(ms: number): string {
  const sec = Math.floor(ms / 1000)
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

