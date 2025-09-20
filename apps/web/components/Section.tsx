export default function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 card">
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  )
}

