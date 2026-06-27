# SAP Migrator

A multi-tenant SaaS platform for managing **SAP S/4HANA data migrations** end to end —
object selection, value mapping, XML template generation, simulation & migration runs,
error correction, audit trails, and **data extraction out of SAP** into external
databases. No SAP login required to use the platform itself.

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
spreadsheets — and adds team management, audit trails, run comparison, and a reverse
**Data Extract** mode for moving SAP data into PostgreSQL, Snowflake, BigQuery, or CSV.

---

## Features

### Accounts & teams
- Multi-tenant workspaces — Organization → User → Project, fully isolated per tenant
- Roles: **Admin** / **Migrator** / **Viewer**
- Email invites via Resend with auto-generated temp passwords
- Forced password change on first login; forgot/reset password via email token
- Profile editing and email notification preferences
- No billing — open for corporate use

### Migration projects
- Two SAP approaches: **Staging Tables** (XML upload) and **Direct Transfer** (RFC)
- Project settings: status, go-live date, source/target systems
- **Clone** a project (copies objects + mappings); **export** a full CSV report

### Objects, mapping & templates
- Catalog of 20+ real SAP objects with field definitions, tables, required flags, examples
- Per-object value mapping (source code → SAP code), with **CSV import/export**
- One-click **MS Excel XML Spreadsheet 2003** template generation per object
- Template upload tracking (row count, file size); mark objects Done

### Runs (simulate & execute)
- **Simulation** runs validate every record without committing (SAP `TESTRUN` equivalent)
- **Migration** runs with record-level result tracking (success / error / warning)
- Downloadable **correction file** (CSV of failed records) to fix and re-upload
- **Run comparison** — diff two runs side by side
- Email notification to admins on run completion

### Data Extract (reverse migration)
- Extract data **from** SAP **into** PostgreSQL, Snowflake, BigQuery, or CSV download
- Per-target connection config, object selection, async job runner, job history with row counts

### Visibility & governance
- **Dashboard** — projects, readiness %, records migrated, error rates, recent activity
- **Audit log** — every action (project, run, member, connection, password) with user + timestamp
- **Global search** (⌘K) across projects and objects
- Per-project SAP connection settings

> **Note:** migration runs and data extracts are currently **simulated** — the platform
> manages the full workflow, validation, mapping, templates, and tracking. Wiring the
> run/extract engines to live SAP connectivity (RFC / Migration Cockpit staging API /
> JDBC targets) is the next milestone.

---

## Tech stack

- **Framework:** Next.js 14 (App Router, TypeScript, standalone output)
- **Auth:** NextAuth.js v4 — JWT strategy, credentials provider, bcrypt
- **Database:** PostgreSQL 16 via Prisma ORM
- **UI:** shadcn/ui (Radix UI + Tailwind CSS)
- **Email:** Resend (lazy-init — no key = silent no-op)
- **Tests:** Vitest (60 tests) + GitHub Actions CI (typecheck + tests + build)
- **Deployment:** DigitalOcean App Platform (Dockerfile build) + Managed PostgreSQL

---

## Local development

### Prerequisites
- Node.js 20+
- PostgreSQL running locally

### Setup
```bash
git clone https://github.com/ZubeidHendricks/sap-migrator.git
cd sap-migrator
npm install
cp .env.example .env   # then fill in the values below
```

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/sap_migrator"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="any-random-string-for-local-dev"
# optional — without it, emails are a silent no-op
RESEND_API_KEY=""
```

```bash
npx prisma db push     # apply schema
npm run dev            # http://localhost:3000
```

Register an organization and you're in.

### Tests
```bash
npm test          # run the Vitest suite (60 tests)
npm run test:watch
```

---

## Database schema

```
Organization ─┬─ User (ADMIN | MIGRATOR | VIEWER)
              ├─ AuditLog (action, entity, user, timestamp)
              └─ Project (STAGING_TABLES | DIRECT_TRANSFER)
                   ├─ SapConnection (host, client, credentials)
                   ├─ ProjectObject (objectKey, status)
                   │     ├─ ValueMapping (fieldName, sourceValue, targetValue)
                   │     └─ MigrationTemplate (filename, rowCount)
                   ├─ MigrationRun (SIMULATION | MIGRATION, counts)
                   │     └─ RunRecord (recordKey, SUCCESS | ERROR | WARNING)
                   └─ DataExtractJob (POSTGRESQL | SNOWFLAKE | BIGQUERY | CSV_DOWNLOAD)

PasswordResetToken (email, token, expires)
```

---

## Deployment

Every push to `main` triggers an automatic build and deploy on DigitalOcean App
Platform (`deploy_on_push`). See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for the
startup/migration model, health-check behavior, and how to verify a deploy actually
went live.

Schema is applied at container startup by `start.sh` (`prisma db push`), which is
written to never block the server from starting. Secrets (`DATABASE_URL`,
`NEXTAUTH_SECRET`, `RESEND_API_KEY`) live only in DO's encrypted env store.

---

## Migration workflow

```
1. Create project   → Staging Tables or Direct Transfer
2. Select objects   → pick from the SAP object catalog
3. Map values       → translate source codes to SAP codes (or import a CSV)
4. Get templates    → download pre-formatted XML files
5. Fill & upload    → paste legacy data, upload filled templates
6. Simulate         → validate all records, zero commits to SAP
7. Fix errors       → download correction CSV, fix, re-upload, re-simulate
8. Migrate          → production run with full result tracking
9. (Optional) Extract → pull SAP data out to PostgreSQL / Snowflake / BigQuery / CSV
```

---

## Not affiliated with SAP SE

This platform prepares data for use with the SAP S/4HANA Migration Cockpit. SAP,
S/4HANA, and SAP Migration Cockpit are trademarks of SAP SE.
