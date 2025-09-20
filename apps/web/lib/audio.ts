let ctx: AudioContext | null = null
let gainNode: GainNode | null = null
let muted = false
let volume = 0.5

function ensureCtx() {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    gainNode = ctx.createGain()
    gainNode.gain.value = muted ? 0 : volume
    gainNode.connect(ctx.destination)
  }
  return ctx
}

export function setMuted(m: boolean) {
  muted = m
  if (gainNode) gainNode.gain.value = muted ? 0 : volume
}
export function setVolume(v: number) {
  volume = Math.max(0, Math.min(1, v))
  if (gainNode && !muted) gainNode.gain.value = volume
}
export function getAudioState() { return { muted, volume } }

function env(ctx: AudioContext, dur: number, startTime: number, start: number, end: number) {
  const g = ctx.createGain()
  g.gain.setValueAtTime(start, startTime)
  g.gain.exponentialRampToValueAtTime(end, startTime + dur)
  return g
}

export async function tick() {
  const ac = ensureCtx(); if (!ac || !gainNode) return
  const t0 = ac.currentTime + 0.001
  const osc = ac.createOscillator()
  osc.type = 'square'
  osc.frequency.setValueAtTime(2000, t0)
  const e = env(ac, 0.03, t0, 0.4, 0.0001)
  osc.connect(e).connect(gainNode)
  osc.start(t0)
  osc.stop(t0 + 0.05)
}

export async function chime() {
  const ac = ensureCtx(); if (!ac || !gainNode) return
  const t0 = ac.currentTime + 0.01
  const osc = ac.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(880, t0)
  osc.frequency.exponentialRampToValueAtTime(440, t0 + 0.4)
  const e = env(ac, 0.5, t0, 0.6, 0.0001)
  osc.connect(e).connect(gainNode)
  osc.start(t0)
  osc.stop(t0 + 0.6)
}

