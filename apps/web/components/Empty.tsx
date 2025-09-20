export default function Empty({ title, desc }: { title: string; desc?: string }) {
  return (
    <div className="rounded border border-dashed border-white/20 p-6 text-center text-white/70">
      <div className="text-sm font-medium">{title}</div>
      {desc && <div className="mt-1 text-xs">{desc}</div>}
    </div>
  )
}

