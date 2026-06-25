# SAP Migrator

A multi-tenant SaaS platform for managing SAP S/4HANA data migration projects. Covers the full preparation lifecycle — object selection, value mapping, XML template generation, simulation runs, error correction, and production migration — all without needing a SAP login to use the platform.

**Live:** [https://cloud.digitalocean.com/apps](https://cloud.digitalocean.com/apps) (see App Platform → sap-migrator)  
**GitHub:** https://github.com/ZubeidHendricks/sap-migrator

---

## What it does

Companies migrating from SAP ECC to S/4HANA use the SAP Migration Cockpit ("Migrate Your Data" Fiori app) to load legacy data. The cockpit requires:

- Data in **MS Excel XML Spreadsheet 2003** format (not `.xlsx`, not `.csv`)
- Exact SAP field names and technical codes (e.g. currency `USD`, not `US Dollar`)
- Records validated against SAP rules before the production run

SAP Migrator handles all the preparation work that teams currently do in disconnected spreadsheets.

---

## Features

| Feature | Details |
|---|---|
| **Object catalog** | 20+ real SAP migration objects with field definitions, table names, required flags, and examples |
| **Value mapping** | Field-level source → SAP value translation per object, persisted across runs |
| **XML templates** | One-click MS Excel XML Spreadsheet 2003 download per object, ready to fill |
| **Simulation runs** | Validates every record without writing to SAP — equivalent to `TESTRUN = "X"` |
| **Migration runs** | Production load with full record-level result tracking |
| **Error correction** | Download CSV of failed records, fix, re-upload |
| **Multi-tenancy** | Isolated workspaces per organisation, role-based access (Admin / Migrator / Viewer) |
| **Two approaches** | Staging Tables (184+ objects, any source) and Direct Transfer (255+ objects, SAP-to-SAP) |

---

## SAP Objects Supported

| Object | SAP Tables | Module |
|---|---|---|
| GL Account Master | SKA1 / SKB1 | Finance |
| Open Items AR | BSID | Finance |
| Open Items AP | BSIK | Finance |
| Asset Master | ANLA / ANLB | Finance |
| Exchange Rates | TCURR | Finance |
| Cost Center | CSKS | Controlling |
| Profit Center | CEPC | Controlling |
| Internal Order | AUFK | Controlling |
| Business Partner | BUT000 | Master Data |
| Customer Master | KNA1 / KNB1 | Master Data |
| Vendor Master | LFA1 / LFB1 | Master Data |
| Material Master | MARA / MARC | Master Data |
| Bank Master Data | BNKA | Master Data |
| Purchasing Info Record | EINA / EINE | Logistics |
| Pricing Conditions | KONV | Logistics |
| Initial Stock Upload | MARD | Inventory |
| Batch Master | MCH1 | Inventory |
| Employee Basic Pay | PA0008 | HR |
| Payment Terms | T052 | Basis |
| House Bank | T012 | Basis |

---

## Tech Stack

- **Framework:** Next.js 14 (App Router, TypeScript)
- **Auth:** NextAuth.js v4 — JWT strategy, credentials provider, bcrypt
- **Database:** PostgreSQL 16 via Prisma ORM
- **UI:** shadcn/ui (Radix UI + Tailwind CSS)
- **Deployment:** DigitalOcean App Platform (builds from GitHub) + Managed PostgreSQL

---

## Local Development

### Prerequisites

- Node.js 20+
- PostgreSQL running locally (or use the Docker Compose setup)

### Setup

```bash
git clone https://github.com/ZubeidHendricks/sap-migrator.git
cd sap-migrator
npm install
```

Copy the environment file and fill in your values:

```bash
cp .env.example .env
```

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/sap_migrator"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="any-random-string-for-local-dev"
```

Push the schema and start the dev server:

```bash
npx prisma db push
npm run dev
```

Open http://localhost:3000, register an organisation, and you're in.

### Docker Compose (alternative)

Starts PostgreSQL + the app together:

```bash
docker compose up
```

The app will be at http://localhost:3000. The database schema is applied automatically on startup.

---

## Database Schema

```
Organization  →  User (role: ADMIN | MIGRATOR | VIEWER)
           →  Project (approach: STAGING_TABLES | DIRECT_TRANSFER)
                  →  ProjectObject (objectKey, objectName, category)
                        →  ValueMapping (fieldName, sourceValue, targetValue)
                        →  MigrationTemplate (filename, rowCount, status)
                  →  MigrationRun (type: SIMULATION | MIGRATION, status, counts)
                        →  RunRecord (recordKey, status: SUCCESS | ERROR | WARNING, message)
```

---

## Deployment

Every push to `main` triggers an automatic build and deploy on DigitalOcean App Platform. The `migrate` pre-deploy job runs `prisma db push` before each deployment so the schema stays in sync.

### Manual deploy (first time or if App Platform is not set up)

```bash
# Requires: Docker, doctl authenticated
./deploy.sh
```

This builds the Docker image, pushes it to the `carta-ta` DOCR registry, and creates the App Platform app.

### Environment variables (set in DO App Platform dashboard)

| Variable | Value |
|---|---|
| `DATABASE_URL` | Private PostgreSQL connection string from DO database dashboard |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Your `.ondigitalocean.app` URL (auto-set via `${APP_URL}`) |
| `NODE_ENV` | `production` |

---

## Project Structure

```
src/
  app/
    (auth)/          # login, register pages
    (app)/           # authenticated app shell
      dashboard/
      projects/
        [id]/
          objects/   # object selection
          mapping/   # value mapping studio
          templates/ # XML template download
          runs/      # simulation & migration runs
    api/             # REST API routes
    page.tsx         # public landing page
  lib/
    migration-objects.ts   # SAP object catalog with field definitions
    xml-generator.ts       # MS Excel XML Spreadsheet 2003 generator
    auth-options.ts        # NextAuth configuration
  components/
    layout/sidebar.tsx
    ui/                    # shadcn/ui components
prisma/
  schema.prisma
```

---

## Migration Workflow

```
1. Create project → choose Staging Tables or Direct Transfer
2. Select objects → pick from 20+ SAP migration objects
3. Map values     → translate source codes to SAP codes per field
4. Get templates  → download pre-formatted XML files
5. Fill templates → paste legacy data (Excel, paste as Values Only)
6. Upload files   → attach filled templates to each object
7. Simulate       → validate all records, zero commits to SAP
8. Fix errors     → download CSV correction file, fix, re-upload
9. Migrate        → production run, SAP data loaded
```

---

## Not affiliated with SAP SE

This platform prepares data for use with the SAP S/4HANA Migration Cockpit. SAP, S/4HANA, and SAP Migration Cockpit are trademarks of SAP SE.
