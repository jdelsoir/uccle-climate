# LinkedIn post — Uccle climate PWA (draft v1, EN)

Status: draft v1, awaiting feedback. FR translation after EN is locked.
Decisions: story-first angle, ~1500 chars, EN first then FR.

## Post

**"A new temperature record at Uccle."**

That one line on the news during June's heatwave sent me down a rabbit hole: 193 years of daily temperature data from Brussels' reference weather station, sitting there, publicly available. So I built an app around it.

👉 https://jdelsoir.github.io/uccle-climate/ — every day since 1833, records, warming trends, installable on your phone.

But here's the real point. I built it end-to-end with AI (Claude Code) — and the biggest lesson wasn't speed. It was that the SDLC didn't disappear. It got faster.

Every classic step still happened:
🔹 Requirements → structured brainstorming, one question at a time
🔹 Design → written spec, committed to git
🔹 Planning → implementation plan split into reviewable tasks
🔹 Build → test-driven development (Vitest + pytest), each task executed by a dedicated agent
🔹 Review → a reviewer agent per task, plus a full-branch review before merge
🔹 CI/CD → GitHub Actions building, deploying and refreshing the data daily
🔹 Verify → checking the live site actually shipped what was built

AI didn't replace the discipline — it enforced it. Skipping steps is still where AI-generated code goes wrong.

Most of that structure comes from one tool: the **superpowers** plugin for Claude Code, by Jesse Vincent. It turns "vibe coding" into an actual engineering workflow. Highly recommended.

Data: NOAA GHCN + Open-Meteo ERA5. No backend, no tracking.

Was June's heatwave really exceptional? Open the app and check. 🌡️

#AI #SDLC #ClaudeCode #SoftwareEngineering #ClimateData

## Publishing notes

- **Image**: attach a screenshot of the Day view on a record-hot day, or the app's own share-card PNG ("Share this day" button). Posts with an image get more reach.
- **Superpowers attribution**: Jesse Vincent is the author. Tag him on LinkedIn if connected, otherwise the name is fine.
- No PII, public data only — org policy clean.
- Next: user feedback → lock EN → FR translation → publish.
