# CI hygiene — action version bumps + scheduled-workflow keepalive

**Date:** 2026-06-29
**Status:** approved (brainstorm)

## Problem / goal

Two CI maintenance items from the project's known fast-follows:

1. **Node 20 deprecation.** Every Actions run logs: "Node.js 20 is deprecated. The following
   actions target Node.js 20 but are being forced to run on Node.js 24: actions/checkout@v4,
   actions/setup-node@v4, actions/setup-python@v5, actions/upload-artifact@v4 (via
   upload-pages-artifact), actions/deploy-pages@v4." GitHub will eventually drop the Node 20
   fallback. Bump the actions to current majors (which run on Node 24) to clear the warning and
   future-proof CI.
2. **60-day scheduled-workflow auto-disable.** GitHub disables *scheduled* workflows after 60 days
   with no repository **commit** activity. The daily `refresh.yml` runs do not commit (data is
   git-ignored and shipped via the Pages artifact, not via git), so the daily runs do not reset
   the 60-day timer. A dev-quiet stretch of 60 days would silently stop the daily refresh. Add a
   periodic heartbeat commit to keep the schedule alive unattended.

## Part A — Action version bumps (`.github/workflows/deploy.yml`)

Pin to the latest majors (all run on Node 24). Verified latest tags at design time:

| action | current | → new |
|--------|---------|-------|
| `actions/checkout` | `@v4` | `@v7` |
| `actions/setup-python` | `@v5` | `@v6` |
| `actions/setup-node` | `@v4` | `@v6` |
| `actions/upload-pages-artifact` | `@v3` | `@v5` |
| `actions/deploy-pages` | `@v4` | `@v5` |

Also bump the build's `setup-node` input `node-version: '20'` → `'22'` (current LTS; Vite 6
supports Node 18+). `refresh.yml` is **unchanged** — it only `workflow_call`s `deploy.yml` and uses
no actions itself.

`upload-pages-artifact` and `deploy-pages` are bumped together (v5/v5) since they are a matched
pair in the Pages pipeline.

**Verification:** the `deploy.yml` run that fires on push is the test. A breaking change in a major
bump (e.g. a renamed input) surfaces as a failed run; fix before it ships. Success criteria: deploy
run green **and** the Actions log no longer shows the Node 20 deprecation annotation.

## Part B — Keepalive workflow (`.github/workflows/keepalive.yml`, new)

A small scheduled workflow that makes a heartbeat commit so the repository has commit activity
inside every 60-day window, keeping all scheduled workflows (including `refresh.yml`) enabled.

```yaml
name: Keepalive
on:
  schedule: [{ cron: '0 6 1 * *' }]   # 1st of each month 06:00 UTC (~30d << 60d auto-disable window)
  workflow_dispatch:
permissions: { contents: write }
jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - run: |
          date -u +"%Y-%m-%dT%H:%M:%SZ" > .github/keepalive
          git config user.name  "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add .github/keepalive
          git commit -m "chore: keepalive [skip ci]" || echo "nothing to commit"
          git push
```

Design notes:
- **Cadence:** monthly (~30 days) gives comfortable margin under the 60-day window.
- **Does not trigger a deploy:** pushes made with `GITHUB_TOKEN` do not spawn new workflow runs
  (GitHub's loop-prevention), so the heartbeat commit will not start `deploy.yml`. The
  `[skip ci]` marker is belt-and-suspenders.
- **Heartbeat file:** `.github/keepalive` holds a single UTC timestamp line. Committed to `main`.
- **Self-sustaining:** the workflow itself is scheduled, but because it commits every ~30 days the
  60-day timer never elapses, so it (and `refresh.yml`) stay enabled.
- **Rationale for a commit (not just a run):** the auto-disable is keyed on commit activity, not on
  workflow runs — otherwise scheduled workflows would never disable. Daily refresh runs therefore
  do not keep the schedule alive; a commit does.

### Risk / fallback

There is some ambiguity about whether a commit authored/pushed by `GITHUB_TOKEN` counts as
repository activity for the 60-day timer. The default uses `GITHUB_TOKEN` (zero setup). **Fallback
if GitHub still auto-disables:** add a fine-grained PAT repo secret (`KEEPALIVE_PAT`, contents:write)
and `git push https://x-access-token:${KEEPALIVE_PAT}@github.com/<owner>/<repo>` so the commit is
attributed to a user account. Documented here; not implemented unless the default proves
insufficient.

## Scope / YAGNI

- No third-party keepalive action (self-contained commit step — no supply-chain trust added).
- No change to `refresh.yml` or any app code.
- No PAT created up front (only if the `GITHUB_TOKEN` default fails).

## Testing / verification

- **Part A:** push → watch the `deploy.yml` run to success; grep the run log to confirm the Node 20
  deprecation annotation is gone; live site unchanged (no behavior change).
- **Part B:** trigger `keepalive.yml` via `workflow_dispatch`; confirm the run succeeds, a
  `chore: keepalive [skip ci]` commit lands on `main` with `.github/keepalive` updated, and that it
  did **not** trigger a `deploy.yml` run.
