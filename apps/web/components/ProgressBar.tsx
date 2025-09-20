export default function ProgressBar({ value, className = '' }: { value: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)))
  return (
    <div className={`h-2 w-full rounded bg-white/10 ${className}`}>
      <div className="h-2 rounded bg-indigo-500" style={{ width: `${pct}%` }} />
    </div>
  )
}

