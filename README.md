# SAP Migrator

A multi-tenant SaaS platform for managing **SAP S/4HANA data migrations** end to end —
object selection, value mapping, XML template generation, validation, simulation &
migration runs, approval workflow, audit trails, AI-assisted data quality, and reverse
**data extraction out of SAP** into external databases. No SAP login required to use the
platform itself.

**Live:** https://sap-migrator-5vybv.ondigitalocean.app
**GitHub:** https://github.com/ZubeidHendricks/sap-migrator
**Roadmap board:** https://github.com/users/ZubeidHendricks/projects/3

---

## What it does

Companies migrating to S/4HANA use the SAP Migration Cockpit ("Migrate Your Data"
Fiori app) to load legacy data. The cockpit requires:

- Data in **MS Excel XML Spreadsheet 2003** format (not `.xlsx`, not `.csv`)
- Exact SAP field names and technical codes (e.g. currency `USD`, not `US Dollar`)
- Records validated against SAP rules before the production run

SAP Migrator handles all of that preparation — work teams currently do in disconnected
spreadsheets — and layers on team collaboration, governance, AI-assisted data quality,
a public API, and a reverse **Data Extract** mode for moving SAP data into PostgreSQL,
Snowflake, BigQuery, or CSV.

---

## Features

### Accounts, teams & access
- Multi-tenant workspaces — Organization → User → Project, fully isolated per tenant
- Roles: **Admin** / **Migrator** / **Viewer**, plus **field-level access** (mark sensitive fields Admin-only)
- Email invites via Resend; forced first-login password change; forgot/reset password
- **OIDC Single Sign-On** (Azure AD, Okta, Google Workspace) — optional, tenant-safe
- No billing — open for corporate use

### Migration projects & objects
- Two SAP approaches: **Staging Tables** (XML upload) and **Direct Transfer** (RFC)
- Catalog of 22 built-in SAP objects **plus custom object definitions** your org adds
- Project settings, **clone**, and status export to **CSV and PDF**
- One-click **MS Excel XML Spreadsheet 2003** template generation per object

### Value mapping & AI
- Per-object value mapping (source → SAP code), with **CSV import/export**
- **AI field mapping** — paste legacy column headers → ranked SAP field suggestions
- **AI value mapping** — paste source values → suggested SAP target codes
- Powered by **Claude** when configured, with deterministic fallbacks that never fail

### Data quality
- **Pre-upload validation** against each field's SAP rules (required, length, type, date/number)
- **Data profiling** — fill rate, distinct count, top values, numeric ranges per field
- **Duplicate & anomaly detection** — duplicate keys, numeric outliers (median/MAD), format outliers
- **AI auto-fix** — propose corrected values for failing cells, respecting SAP conventions

### Runs (simulate, approve & execute)
- **Simulation** runs validate every record without committing (SAP `TESTRUN` equivalent)
- **Migration** runs with record-level results (success / error / warning)
- **Approval workflow** — a Migrator's migration run needs Admin sign-off before it executes
- Downloadable **correction file**; **run comparison**; completion notifications (in-app + email)

### Data Extract (reverse migration)
- Extract data **from** SAP **into** PostgreSQL (real writes), Snowflake, BigQuery, or **CSV download**
- Connector architecture: per-target config, object selection, async job runner, job history

### Collaboration
- **Object ownership** — assign objects to team members
- **Comment threads** on objects; **notification center** (bell, unread badge, mark-read)

### Intelligence & visibility
- **Dashboard** — projects, readiness %, records migrated, error rates, recent activity
- **Insights** — data-quality scores (A–F), timeline estimates, cross-project analytics
- **Ask AI** — natural-language questions about a project, answered from its real data
- **Audit log** + **global ⌘K search** across projects and objects

### Platform
- **White-label branding** — per-org accent color, logo, and workspace name
- **Multi-language** — English, German, French, Afrikaans, Arabic (with RTL)
- **Public REST API (v1)** with org-scoped API keys

> **Note:** migration runs and the SAP side of Data Extract are currently **simulated** —
> the platform manages the full workflow (mapping, validation, templates, quality, tracking)
> and CSV/PostgreSQL extract targets are real. Wiring the run engine and SAP source to live
> connectivity (RFC / Migration Cockpit staging API) is the remaining milestone.

---

## Tech stack

- **Framework:** Next.js 14 (App Router, TypeScript, standalone output)
- **Auth:** NextAuth.js v4 — JWT, credentials + optional OIDC, bcrypt
- **Database:** PostgreSQL 16 via Prisma ORM
- **UI:** shadcn/ui (Radix UI + Tailwind CSS), client-side i18n with RTL
- **AI:** Anthropic Claude (`claude-haiku-4-5`) with deterministic fallbacks
- **Email:** Resend (lazy-init — no key = silent no-op)
- **Tests:** Vitest (**213 tests**) + GitHub Actions CI (typecheck + tests + build)
- **Deployment:** DigitalOcean App Platform (Dockerfile) + Managed PostgreSQL

---

## Local development

```bash
git clone https://github.com/ZubeidHendricks/sap-migrator.git
cd sap-migrator
npm install
cp .env.example .env   # then fill in the values
npx prisma db push     # apply schema
npm run dev            # http://localhost:3000
npm test               # 213 Vitest tests
```

### Environment
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/sap_migrator"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="any-random-string-for-local-dev"
# all optional:
RESEND_API_KEY=""        # email (silent no-op without it)
ANTHROPIC_API_KEY=""     # enables Claude AI features (falls back to deterministic)
OIDC_ISSUER=""           # enables SSO (with OIDC_CLIENT_ID / OIDC_CLIENT_SECRET)
OIDC_CLIENT_ID=""
OIDC_CLIENT_SECRET=""
```

---

## Database schema

```
Organization ─┬─ User (ADMIN | MIGRATOR | VIEWER)
              ├─ AuditLog · ApiKey · Notification · CustomObject
              ├─ brandColor / logoUrl (white-label)
              └─ Project (STAGING_TABLES | DIRECT_TRANSFER)
                   ├─ SapConnection
                   ├─ ProjectObject (status, assignedTo, restrictedFields)
                   │     ├─ ValueMapping · Comment
                   │     └─ MigrationTemplate (validationErrors, profile, qualityFlags)
                   ├─ MigrationRun (type, status incl. AWAITING_APPROVAL, approval fields)
                   │     └─ RunRecord (SUCCESS | ERROR | WARNING)
                   └─ DataExtractJob (POSTGRESQL | SNOWFLAKE | BIGQUERY | CSV_DOWNLOAD)

PasswordResetToken
```

---

## Deployment

Every push to `main` triggers an automatic build + deploy on DigitalOcean App Platform
(`deploy_on_push`). See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for the startup/migration
model, health-check behavior, and how to verify a deploy actually went live. Schema is
applied at container startup by `start.sh` (resilient — never blocks the server from
booting). Secrets live only in DO's encrypted env store, never committed.

---

## Public API (v1)

Create an API key in **Settings → API Keys** (shown once), then use a Bearer token:

```bash
curl https://sap-migrator-5vybv.ondigitalocean.app/api/v1/projects \
  -H "Authorization: Bearer smk_live_xxx"

curl -X POST https://sap-migrator-5vybv.ondigitalocean.app/api/v1/projects \
  -H "Authorization: Bearer smk_live_xxx" -H "Content-Type: application/json" \
  -d '{"name":"Q3 Migration","approach":"STAGING_TABLES"}'

curl https://sap-migrator-5vybv.ondigitalocean.app/api/v1/catalog \
  -H "Authorization: Bearer smk_live_xxx"
```

Keys are org-scoped, stored only as a SHA-256 hash, and revocable.

---

## Migration workflow

```
1. Create project   → Staging Tables or Direct Transfer
2. Select objects   → built-in catalog or your custom objects
3. Map values       → manual, CSV import, or AI suggestions
4. Get templates    → download pre-formatted XML
5. Fill & upload    → validated on upload; profiled; duplicates/anomalies flagged
6. Fix errors       → AI auto-fix suggestions, or correction CSV, then re-upload
7. Simulate         → validate all records, zero commits to SAP
8. Approve          → Admin signs off a Migrator's migration run
9. Migrate          → production run with full result tracking
10. (Optional) Extract → pull SAP data out to PostgreSQL / Snowflake / BigQuery / CSV
```

---

## Not affiliated with SAP SE

This platform prepares data for use with the SAP S/4HANA Migration Cockpit. SAP,
S/4HANA, and SAP Migration Cockpit are trademarks of SAP SE.
