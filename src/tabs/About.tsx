export default function About() {
  return (
    <section className="fade-in space-y-4">
      <h2 className="text-2xl font-extrabold tracking-tight">About &amp; Methods</h2>
      <div className="space-y-5 rounded-xl border border-border bg-surface p-5 text-sm leading-relaxed text-muted">

        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-[0.09em] text-muted">What this is</p>
          <p>A simple way to see how the climate is changing where you live, through the long temperature record of Uccle (Ukkel), near Brussels.</p>
        </div>

        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-[0.09em] text-muted">Why Uccle</p>
          <p>Uccle has Belgium's <strong className="text-fg">longest continuous temperature record</strong> — daily readings since <strong className="text-fg">1833</strong>, kept by the national weather service (RMI). Nearly two centuries of data lets us show real climate change, not just this week's weather. It's also Belgium's official reference station, so its numbers are widely trusted.</p>
        </div>

        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.09em] text-muted">Where the numbers come from</p>
          <p>Historical temperatures come from NOAA's global climate archive (<strong className="text-fg">GHCN-Daily</strong>), for the official Uccle station; today's value is fetched live from <strong className="text-fg">Open-Meteo</strong>.</p>
          <p>Each day is compared to the 1991–2020 average (the standard climate "normal" — you can switch to 1961–1990). Incomplete years are left out of trends, rankings and records.</p>
          <p>A few gaps in the station's recent record (~2000–2024) are filled with <strong className="text-fg">Copernicus ERA5</strong>, a high-quality weather reconstruction, so no decade is missing. The last few days are estimates marked <em>provisional</em> until finalized (about five days).</p>
          <p>Two honest caveats: mixing station and reconstructed data adds minor inconsistency, and cities run warmer than the countryside (the <strong className="text-fg">urban heat island</strong> effect), so Uccle's local warming reads a little above rural Belgium.</p>
        </div>

        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.09em] text-muted">Privacy — we collect nothing</p>
          <p>This is a static website with no server of ours behind it: no accounts, no login, no cookies, no analytics, no tracking. We have nowhere to send your data — and we don't.</p>
          <p>The one thing the app remembers — the birth year you can enter on the "Me" tab — stays in your browser and never leaves your device.</p>
          <p>To show today's temperature, your browser asks Open-Meteo directly for Uccle's reading; that request tells them nothing about you beyond a normal web visit.</p>
        </div>

      </div>
    </section>
  )
}
