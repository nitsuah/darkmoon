# Journeys

Nightly "AI user" journeys: the happy paths a player takes, run by `.github/workflows/journeys.yml` through the shared harness in `nitsuah/.github` (contract: `journeys/STANDARD.md`). Failures become deduplicated `bot:journey` issues; `BUGS.md` lives on the `bot/journeys` branch. No AI runs in CI.

- `journey.ts` is the vendored `step()` helper. `darkmoon.ts` is the fixture: first-run tutorial skipped, no network beyond localhost, `trackPageErrors()` for uncaught exceptions.
- Journeys run against `npm run build` + `vite preview`, so the real production bundle is what's tested.
- Journeys are tagged `@feature:<id>` with ids from `promo/spots.json`. `step(..., { docs: '<id>' })` also writes `<dir>/<id>.png` when `DOCS_SCREENSHOTS=<dir>` is set.
- Only DOM-only steps get a visual baseline. The WebGL canvas is never baselined (software rendering is not pixel-stable), so canvas steps use `{ screenshot: false }` and assert behaviour instead. The existing `e2e/` suite keeps the gameplay checks.

## Run and update baselines

Baselines are Linux-only. Always use the Playwright image (same version as `@playwright/test`):

```sh
docker run --rm -v "$PWD:/w" -w /w mcr.microsoft.com/playwright:v1.65.1-jammy \
  sh -c "npm ci && npm run test:journeys -- --update-snapshots"
```

Drop `--update-snapshots` to check. CI sets `CI=true`, where a missing baseline fails. Soak new journeys with `CI=true ... --retries 0 --repeat-each 3`.
