export default function About() {
  return (
    <section className="fade-in space-y-4">
      <h2 className="text-2xl font-extrabold tracking-tight">About &amp; Methods</h2>
      <div className="space-y-3 rounded-xl border border-border bg-surface p-5 text-sm leading-relaxed text-muted">
        <p>Historical data: <strong className="text-fg">NOAA GHCN-Daily</strong>, station Uccle (BE000006447), 1833–present. Today's value: <strong className="text-fg">Open-Meteo</strong>. Reference station operated by RMI/KMI/IRM Belgium.</p>
        <p>Anomalies use WMO normals (1991–2020 default; 1961–1990 alternative). Years with fewer than 330 valid days are excluded from trends.</p>
        <p><em>Caveat:</em> the Uccle record carries a documented <strong className="text-fg">urban heat island</strong> warm bias and is not homogenized; local trends slightly exceed rural Belgium.</p>
      </div>
    </section>
  )
}
