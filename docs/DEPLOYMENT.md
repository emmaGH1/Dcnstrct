# Deploy Dcnstrct: Render API + Vercel UI

The backend performs the real synthetic operations and stores runs in SQLite. Vercel serves the landing page and workspace. The browser calls the Render API over HTTPS; its existing CORS support allows the Vercel origin. Bob remains local, and the hosted demo uses the reviewed recorded explanations.

## 1. Deploy the backend on Render first

Create a Blueprint from https://github.com/emmaGH1/Dcnstrct, branch main, using render.yaml. Review the service and disk charges yourself before creating it: Render persistent disks require a paid service. The prepared Blueprint selects Starter and a 1 GB disk; it does not purchase or create anything by itself.

The settings are:

- Repository root: leave blank (use the whole repository).
- Runtime: Docker, Dockerfile at ./Dockerfile.
- Persistent disk: mount at /data, size 1 GB.
- NODE_ENV: production.
- DB_PATH: /data/dcnstrct.db.
- Health check: /api/scenarios.
- One instance. Auto-deploy is off; manually deploy matching commits on both hosts.

Do not use the free service without a disk or replace DB_PATH with :memory:. The disk must be attached before judging. Render supplies PORT. The container includes the allowlisted source and corrected Bob records; these are required for source references and matched explanations. It excludes local databases, credentials and private notes.

Once Render is live, open its actual HTTPS origin followed by /api/scenarios. It must return the two scenarios as JSON. Keep that origin, for example https://YOUR-SERVICE.onrender.com. Do not append /api to the origin setting below. The service is API-only; its root page is not the landing page.

## 2. Deploy the UI on Vercel

Import the same repository and branch main. Set Root Directory to the repository root (leave blank), not packages/client. vercel.json supplies:

- Framework: Vite.
- Install command: npm ci.
- Build command: npm run build:vercel.
- Output directory: packages/client/dist.
- Rewrite /demo to index.html so direct links and reloads work.

Add VITE_API_ORIGIN with the actual Render HTTPS origin to the Vercel Production environment (and Preview if using preview deployments). This is a public service URL, not a secret. The build refuses a missing, non-HTTPS or malformed origin rather than publishing a disconnected demo. Deploy after setting it. Changing this variable requires rebuilding/redeploying the client.

Normal local builds still use /api and the existing local server/proxy when VITE_API_ORIGIN is unset. No hosted Bob credentials or API key are required.

## 3. Verify the actual deployed visitor path

These checks remain pending until both real URLs exist; local checks do not prove Render disk mounting or Vercel routing.

1. Open the Vercel URL in a fresh browser tab. Explore demo must load the two scenarios without network errors. Reload /demo directly.
2. Cancel a preparing order: accepted, nine events, one notification, shipment skipped. Select an event and inspect Explanation, Source and Observed data. Explanation must say Recorded IBM Bob and source must show real numbered lines.
3. Try a shipped order: refused, three events, shipped state preserved, no cancellation notification. Compare both paths.
4. Keep the run IDs. Restart the Render service without removing its disk. GET /api/runs/RUN_ID on Render must still return each run. Re-open /analysis for a run: the recorded explanation should remain available.
5. Reset through the visitor UI. Only that tab's created runs should disappear. Repeat in a fresh tab.

Record any failure before filming. Do not mark deployment/persistence complete until these checks pass on the deployed URLs. There is no automatic TTL for runs; monitor the small synthetic database's disk usage during judging.

## Local deployment check

Run npm run build, then npm run check:deployment. This creates an isolated production API with a temporary on-disk database, runs both cancellation paths, verifies recorded/source matches, restarts the process and verifies persisted rows, refuses global reset and checks scoped reset isolation. It never uses the existing local demo database. Docker execution must be verified on Render if Docker is unavailable locally.

References: [Render persistent disks](https://render.com/docs/disks), [Render Blueprint fields](https://render.com/docs/blueprint-spec), [Vercel configuration](https://vercel.com/docs/project-configuration/vercel-json).
