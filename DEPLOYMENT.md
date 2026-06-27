# Deployment

SAP Migrator runs on **DigitalOcean App Platform**, built from the `Dockerfile`
and deployed automatically on every push to `main` (`deploy_on_push`).

## Runtime startup (`start.sh`)

The container's `CMD` is `./start.sh`, which:

1. Applies the Prisma schema to the database with
   `prisma db push --skip-generate --accept-data-loss` (retried up to 3×).
2. Starts the Next.js standalone server (`node server.js`).

**Important:** `start.sh` deliberately does **not** use `set -e`. A migration
hiccup must never prevent the web server from starting — otherwise the container
fails its health check on `/` and DigitalOcean **auto-rolls-back the whole
deployment**, silently leaving the live site on an old commit. The server always
starts; migration problems surface in the run logs instead of as an outage.

`--accept-data-loss` is used because the Prisma schema is the source of truth for
this app and migrations must apply non-interactively at startup.

## Health check

DO pings `GET /` (a static marketing page — no DB dependency), so the service is
healthy as soon as the Next.js server is up.

## Verifying a deploy actually went live

A green build is **not** proof the deploy succeeded. Confirm:

```
# active deployment phase should be ACTIVE and the commit should match HEAD
doctl apps get <APP_ID>            # or the DO dashboard
git rev-parse HEAD
```

If the active `source_commit_hash` is behind `HEAD`, a deploy failed its health
check and rolled back — check run logs. Quick smoke test:

```
curl -o /dev/null -w "%{http_code}\n" https://sap-migrator-5vybv.ondigitalocean.app/forgot-password
# 200 = latest routes are live, 404 = serving an older commit
```

## Secrets

`DATABASE_URL`, `NEXTAUTH_SECRET`, and `RESEND_API_KEY` live only in DigitalOcean's
encrypted env store — never commit them. `RESEND_API_KEY` is optional; without it,
email sending is a silent no-op.

## Tests / CI

`npm test` runs the Vitest suite. `.github/workflows/ci.yml` runs typecheck +
tests + production build on every push and PR.
