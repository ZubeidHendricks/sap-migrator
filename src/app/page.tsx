import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  ArrowRight, Database, FileSpreadsheet, GitMerge, LayoutDashboard,
  ShieldCheck, Zap, CheckCircle, Building2, AlertTriangle, Clock,
  Users, TrendingUp, XCircle, ArrowDown, Package, MapPin,
  Play, Download, Upload, RefreshCw,
} from 'lucide-react'

// ─── Real SAP objects shown on the landing page ─────────────────────────────
const SAP_OBJECTS = [
  { name: 'GL Account Master', table: 'SKA1/SKB1', cat: 'Finance' },
  { name: 'Open Items AR', table: 'BSID', cat: 'Finance' },
  { name: 'Open Items AP', table: 'BSIK', cat: 'Finance' },
  { name: 'Asset Master', table: 'ANLA/ANLB', cat: 'Finance' },
  { name: 'Exchange Rates', table: 'TCURR', cat: 'Finance' },
  { name: 'Cost Center', table: 'CSKS', cat: 'Controlling' },
  { name: 'Profit Center', table: 'CEPC', cat: 'Controlling' },
  { name: 'Internal Order', table: 'AUFK', cat: 'Controlling' },
  { name: 'Business Partner', table: 'BUT000', cat: 'Master Data' },
  { name: 'Customer Master', table: 'KNA1/KNB1', cat: 'Master Data' },
  { name: 'Vendor Master', table: 'LFA1/LFB1', cat: 'Master Data' },
  { name: 'Material Master', table: 'MARA/MARC', cat: 'Master Data' },
  { name: 'Bank Master Data', table: 'BNKA', cat: 'Master Data' },
  { name: 'Purchasing Info Record', table: 'EINA/EINE', cat: 'Logistics' },
  { name: 'Pricing Conditions', table: 'KONV', cat: 'Logistics' },
  { name: 'Initial Stock Upload', table: 'MARD', cat: 'Inventory' },
  { name: 'Batch Master', table: 'MCH1', cat: 'Inventory' },
  { name: 'Employee Basic Pay', table: 'PA0008', cat: 'HR' },
  { name: 'Payment Terms', table: 'T052', cat: 'Basis' },
  { name: 'House Bank', table: 'T012', cat: 'Basis' },
]

const CATEGORY_COLORS: Record<string, string> = {
  Finance: 'bg-blue-100 text-blue-700',
  Controlling: 'bg-purple-100 text-purple-700',
  'Master Data': 'bg-green-100 text-green-700',
  Logistics: 'bg-orange-100 text-orange-700',
  Inventory: 'bg-yellow-100 text-yellow-700',
  HR: 'bg-pink-100 text-pink-700',
  Basis: 'bg-gray-100 text-gray-700',
}

// ─── The migration workflow steps ────────────────────────────────────────────
const WORKFLOW = [
  {
    n: '01',
    icon: Package,
    title: 'Select Your SAP Objects',
    subtitle: 'Tell us what to migrate',
    body: `Browse a catalog of 20+ real SAP migration objects organised by module — Finance, Controlling, Master Data, Logistics, Inventory, HR, and Basis. Tick the ones your project needs. The platform filters automatically based on whether you chose Staging Tables or Direct Transfer.`,
    detail: 'Objects include their SAP table names, all required and optional fields, technical field names, and example values — no need to look these up.',
  },
  {
    n: '02',
    icon: MapPin,
    title: 'Map Source Values to SAP Values',
    subtitle: 'Translate your legacy data',
    body: `Every legacy system uses different codes. A currency called "US Dollar" in your old system must become "USD" in SAP. Company code "Company A" must become "1000". The mapping studio lets you define these translations field-by-field per object.`,
    detail: 'Mappings persist across runs. Add, edit, and delete them at any time. The correction file download uses your mappings to pre-fill fixes after failed records.',
  },
  {
    n: '03',
    icon: Download,
    title: 'Download XML Templates',
    subtitle: 'Pre-formatted for SAP Migration Cockpit',
    body: `Click once to download an MS Excel XML Spreadsheet 2003 file for each object. This is the exact format required by the SAP S/4HANA Migration Cockpit staging table approach. Row 1 is field labels, Row 2 is technical names, Rows 3+ are your data.`,
    detail: 'Each template includes a second "Field Guide" worksheet with field descriptions, required flags, max lengths, and examples. Open in Excel — do NOT save as .xlsx.',
  },
  {
    n: '04',
    icon: Upload,
    title: 'Upload Filled Templates',
    subtitle: 'Paste values only — no formatting',
    body: `Populate the template with your legacy data, then upload it back. The platform records the file, row count, and validation status. Common pitfalls are caught early: NUMC fields need leading zeros, dates must be YYYY-MM-DD, paste as Values Only not Ctrl+V.`,
    detail: 'Files up to 100 MB are supported. Compress to ZIP for larger extracts (up to 160 MB). Each object has its own template — you can upload them in any order.',
  },
  {
    n: '05',
    icon: Play,
    title: 'Simulate, Fix, Migrate',
    subtitle: 'Validate before committing',
    body: `Run a Simulation first — this validates every record against SAP's rules without writing a single byte to the database. The result shows you exactly which records succeed, which have errors, and which have warnings. Fix errors, re-run until clean. Then execute the real Migration run.`,
    detail: "Simulation is equivalent to SAP's TESTRUN API parameter. Error records can be exported as a CSV correction file, fixed, and re-uploaded. The run history is preserved for audit.",
  },
]

// ─── Problems we solve ───────────────────────────────────────────────────────
const PROBLEMS = [
  {
    icon: AlertTriangle,
    title: 'Migrations fail at go-live',
    body: 'Teams discover data errors on cut-over night because they never validated records against SAP rules. Our simulation run catches every error days before.',
  },
  {
    icon: XCircle,
    title: 'Wrong file formats rejected by SAP',
    body: 'SAP Migration Cockpit only accepts MS Excel XML Spreadsheet 2003. Not .xlsx, not .csv. Teams waste hours reformatting. We generate it correctly in one click.',
  },
  {
    icon: Clock,
    title: 'Value mapping done in spreadsheets',
    body: 'Teams maintain separate mapping spreadsheets that get out of sync. We give every object its own mapping store, visible to the whole team, version-controlled with each run.',
  },
  {
    icon: Users,
    title: 'No visibility for project managers',
    body: 'Consultants work in SAP transactions that PMs can\'t access. Our dashboard shows readiness %, object status, run history, and error counts — no SAP login needed.',
  },
]

// ─── Pricing ─────────────────────────────────────────────────────────────────
const PLANS = [
  {
    name: 'Starter',
    price: '$0',
    period: 'forever',
    desc: 'For small migrations or exploring the platform',
    features: ['1 project', '5 migration objects', 'XML template download', 'Simulation runs', 'Email support'],
    cta: 'Start free',
    href: '/register',
    highlighted: false,
  },
  {
    name: 'Professional',
    price: '$149',
    period: '/month',
    desc: 'For a full S/4HANA migration project',
    features: ['Unlimited projects', 'All 20+ migration objects', 'XML templates + Direct Transfer', 'Unlimited simulation & migration runs', 'Value mapping studio', 'Correction file export', 'Priority support'],
    cta: 'Start 14-day trial',
    href: '/register',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    desc: 'For SAP system integrators and large programmes',
    features: ['Everything in Professional', 'Multiple company workspaces', 'Custom migration objects', 'SSO / SAML', 'Dedicated onboarding', 'SLA + 24/7 support'],
    cta: 'Contact us',
    href: '/register',
    highlighted: false,
  },
]

// ─── FAQ ─────────────────────────────────────────────────────────────────────
const FAQ = [
  {
    q: 'Do we still need the SAP Migration Cockpit?',
    a: 'Yes. SAP Migrator prepares your data — it generates the correctly-formatted XML templates, manages your value mappings, tracks runs, and handles error correction. You still upload the final XML into the SAP Migration Cockpit or fill staging tables directly. We make the preparation phase dramatically faster and less error-prone.',
  },
  {
    q: 'What is the difference between Staging Tables and Direct Transfer?',
    a: 'Staging Tables means you prepare data in XML files (or fill /1LT/DS* tables directly) and the cockpit posts them to SAP. It works for 184+ objects and supports S/4HANA Cloud. Direct Transfer uses an RFC connection between a source SAP system and the target S/4HANA — no file export needed — and supports 255+ objects but only on-premise. You choose your approach when creating a project.',
  },
  {
    q: 'Which SAP releases are supported?',
    a: 'All content is based on SAP S/4HANA 2021 / 2022. The migration objects, field names, and staging table structures match the SAP S/4HANA Migration Cockpit 2nd edition documentation. Custom object support is available on Enterprise plans.',
  },
  {
    q: 'What happens during a Simulation run?',
    a: 'Simulation validates every record — checking required fields, value mapping completeness, field lengths, date formats, and SAP master data references — without committing anything to the database. It is equivalent to running the SAP BAPI with TESTRUN = "X". Fix all errors shown in the simulation before executing the real Migration run.',
  },
  {
    q: 'Can multiple consultants work on the same project?',
    a: 'Yes. Every user you invite shares the same project workspace. They can see migration objects, add value mappings, upload templates, and view run results. Role-based access (Admin, Migrator, Viewer) controls what each person can do.',
  },
  {
    q: 'Is our data safe?',
    a: 'Your data lives in an isolated PostgreSQL database per organisation. We never share data between customers. Secrets (database credentials, auth tokens) are encrypted at rest. The platform runs on DigitalOcean\'s SOC 2 certified infrastructure.',
  },
]

// ─── Page ────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="border-b sticky top-0 bg-white/95 backdrop-blur z-40">
        <div className="max-w-7xl mx-auto px-6 flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#1e3a5f] flex items-center justify-center">
              <Database className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg text-[#1e3a5f]">SAP Migrator</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-500">
            <a href="#how-it-works" className="hover:text-gray-900">How it works</a>
            <a href="#objects" className="hover:text-gray-900">Objects</a>
            <a href="#pricing" className="hover:text-gray-900">Pricing</a>
            <a href="#faq" className="hover:text-gray-900">FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login"><Button variant="ghost" size="sm">Sign in</Button></Link>
            <Link href="/register"><Button size="sm" className="bg-[#1e3a5f] hover:bg-[#2a4f7c]">Get started free</Button></Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 pt-20 pb-16 text-center">
        <Badge variant="secondary" className="mb-6 text-[#1e3a5f] bg-blue-50 border-blue-200 text-xs px-3 py-1">
          Built for SAP S/4HANA Migration Cockpit · Staging Tables & Direct Transfer
        </Badge>
        <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6 tracking-tight">
          The SaaS platform that makes<br />
          <span className="text-[#1e3a5f]">SAP data migration not terrible.</span>
        </h1>
        <p className="text-xl text-gray-500 max-w-3xl mx-auto mb-4 leading-relaxed">
          Companies migrating from SAP ECC to S/4HANA spend weeks building spreadsheets, chasing the wrong file format,
          and discovering data errors on go-live night. SAP Migrator gives your team a structured workspace to prepare,
          validate, and execute every migration object — from GL Accounts to Material Masters.
        </p>
        <p className="text-base text-gray-400 max-w-2xl mx-auto mb-10">
          It generates the exact MS Excel XML Spreadsheet 2003 files the SAP Migration Cockpit requires.
          It runs simulations that catch every error before cut-over. It stores your value mappings so nothing gets lost.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
          <Link href="/register">
            <Button size="lg" className="bg-[#1e3a5f] hover:bg-[#2a4f7c] gap-2 text-base px-8 h-12">
              Start your migration project <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline" className="text-base px-8 h-12">Sign in to workspace</Button>
          </Link>
        </div>
        <p className="text-sm text-gray-400">Free to start · No credit card · No SAP login required to use the platform</p>
      </section>

      {/* ── Problem ─────────────────────────────────────────────────────── */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-4">Why SAP migrations go wrong</h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              These are the four things that kill migration projects. We built SAP Migrator to eliminate each one.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            {PROBLEMS.map((p) => (
              <div key={p.title} className="flex gap-4 p-6 bg-white rounded-xl border border-gray-100">
                <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center shrink-0 mt-0.5">
                  <p.icon className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">{p.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{p.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────── */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">Exactly how it works</h2>
          <p className="text-gray-500 max-w-2xl mx-auto">
            Five steps from your first legacy data extract to a clean production load in SAP S/4HANA.
            Each step maps directly to the SAP Activate methodology phases.
          </p>
        </div>

        <div className="space-y-6">
          {WORKFLOW.map((step, i) => (
            <div key={step.n}>
              <div className="flex gap-6 p-8 rounded-2xl border border-gray-100 bg-white hover:shadow-sm transition-shadow">
                <div className="shrink-0">
                  <div className="w-12 h-12 rounded-xl bg-[#1e3a5f] flex items-center justify-center">
                    <step.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs font-bold text-gray-300 tracking-widest">{step.n}</span>
                    <h3 className="text-xl font-bold text-gray-900">{step.title}</h3>
                    <Badge variant="secondary" className="text-xs">{step.subtitle}</Badge>
                  </div>
                  <p className="text-gray-600 mb-3 leading-relaxed">{step.body}</p>
                  <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                    <CheckCircle className="w-4 h-4 text-[#1e3a5f] shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-800">{step.detail}</p>
                  </div>
                </div>
              </div>
              {i < WORKFLOW.length - 1 && (
                <div className="flex justify-center my-2">
                  <ArrowDown className="w-5 h-5 text-gray-200" />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Stats bar ───────────────────────────────────────────────────── */}
      <section className="bg-[#1e3a5f] py-12">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
          {[
            { v: '20+', l: 'SAP Migration Objects' },
            { v: '2', l: 'Migration Approaches' },
            { v: '100%', l: 'Cockpit-Compatible XML' },
            { v: '0', l: 'SAP Licences Required' },
          ].map((s) => (
            <div key={s.l}>
              <p className="text-4xl font-bold mb-1">{s.v}</p>
              <p className="text-blue-200 text-sm">{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Migration objects catalog ───────────────────────────────────── */}
      <section id="objects" className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">What you can migrate</h2>
          <p className="text-gray-500 max-w-2xl mx-auto">
            Every object is defined with its SAP table name, all field definitions, required vs optional flags,
            technical names, and example values. Select exactly the objects your project needs.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {SAP_OBJECTS.map((obj) => (
            <div key={obj.name} className="flex items-start gap-3 p-3.5 bg-white rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
              <div className="w-2 h-2 rounded-full bg-[#1e3a5f] shrink-0 mt-1.5" />
              <div>
                <p className="text-sm font-medium text-gray-900 leading-tight">{obj.name}</p>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{obj.table}</p>
                <span className={`inline-block text-xs px-1.5 py-0.5 rounded mt-1 font-medium ${CATEGORY_COLORS[obj.cat] ?? 'bg-gray-100 text-gray-600'}`}>
                  {obj.cat}
                </span>
              </div>
            </div>
          ))}
        </div>
        <p className="text-center text-sm text-gray-400 mt-6">
          Enterprise plan includes custom migration objects for client-specific requirements
        </p>
      </section>

      {/* ── Two approaches ──────────────────────────────────────────────── */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Two ways to get data into S/4HANA</h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              SAP supports two migration approaches. You choose when creating a project and the platform adjusts the available objects, templates, and run options accordingly.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                icon: FileSpreadsheet,
                approach: 'Staging Tables',
                tag: 'Most common',
                desc: 'Data is loaded via MS Excel XML Spreadsheet 2003 files or by filling SAP HANA staging tables (/1LT/DS*) directly using ABAP, ETL tools, or SAP HANA Studio.',
                objects: '184+ migration objects',
                works: 'SAP S/4HANA · S/4HANA Cloud (Public & Private)',
                source: 'Any source system — ERP, Oracle, legacy flat files',
                howFile: 'Download template → fill data → upload to cockpit',
              },
              {
                icon: GitMerge,
                approach: 'Direct Transfer',
                tag: 'SAP-to-SAP',
                desc: 'Data is transferred live from a source SAP system to the target S/4HANA via RFC connection. No file export or ETL tool needed — the cockpit reads directly from the source.',
                objects: '255+ migration objects',
                works: 'SAP S/4HANA On-Premise only',
                source: 'SAP ERP · SAP AFS · SAP EWM · SAP CRM · SAP APO SPP',
                howFile: 'RFC connection → cockpit extracts → maps → posts',
              },
            ].map((a) => (
              <div key={a.approach} className="p-8 bg-white rounded-2xl border border-gray-100">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                    <a.icon className="w-5 h-5 text-[#1e3a5f]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-900">{a.approach}</h3>
                      <Badge variant="secondary" className="text-xs">{a.tag}</Badge>
                    </div>
                  </div>
                </div>
                <p className="text-gray-600 text-sm mb-5 leading-relaxed">{a.desc}</p>
                <div className="space-y-3 text-sm">
                  {[
                    { label: 'Objects', value: a.objects },
                    { label: 'Target', value: a.works },
                    { label: 'Source', value: a.source },
                    { label: 'How', value: a.howFile },
                  ].map((row) => (
                    <div key={row.label} className="flex gap-3">
                      <span className="text-gray-400 w-14 shrink-0">{row.label}</span>
                      <span className="text-gray-700">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Who it's for ────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Who uses SAP Migrator</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              title: 'SAP System Integrators',
              desc: 'Run multiple concurrent migration projects across client landscapes. Each client gets their own isolated workspace. Reuse your value mapping templates across similar clients.',
              badge: 'Enterprise plan',
            },
            {
              title: 'In-house SAP Teams',
              desc: 'Your IT team is running the S/4HANA migration themselves. You need a structured tool that tracks what\'s done, what\'s mapped, and what errored — without building it in Excel.',
              badge: 'Professional plan',
            },
            {
              title: 'SAP Consultants',
              desc: 'You\'re embedded at a client, working on the migration workstream. You need the right file format, the right field names, and a way to show the PM progress without giving them SAP access.',
              badge: 'Professional plan',
            },
          ].map((who) => (
            <Card key={who.title} className="border-gray-100">
              <CardContent className="pt-6">
                <Badge variant="secondary" className="mb-4 text-xs">{who.badge}</Badge>
                <h3 className="font-bold text-gray-900 mb-3">{who.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{who.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────────────────── */}
      <section id="pricing" className="bg-gray-50 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-4">Simple pricing</h2>
            <p className="text-gray-500">Start free. Upgrade when you need more objects or projects.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 items-stretch">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`p-8 rounded-2xl border flex flex-col ${
                  plan.highlighted
                    ? 'border-[#1e3a5f] bg-[#1e3a5f] text-white shadow-xl'
                    : 'border-gray-100 bg-white'
                }`}
              >
                {plan.highlighted && (
                  <Badge className="mb-4 w-fit bg-white text-[#1e3a5f] text-xs">Most popular</Badge>
                )}
                <h3 className={`font-bold text-lg mb-1 ${plan.highlighted ? 'text-white' : 'text-gray-900'}`}>
                  {plan.name}
                </h3>
                <div className="flex items-end gap-1 mb-2">
                  <span className={`text-4xl font-bold ${plan.highlighted ? 'text-white' : 'text-gray-900'}`}>
                    {plan.price}
                  </span>
                  <span className={`text-sm mb-1 ${plan.highlighted ? 'text-blue-200' : 'text-gray-400'}`}>
                    {plan.period}
                  </span>
                </div>
                <p className={`text-sm mb-6 ${plan.highlighted ? 'text-blue-200' : 'text-gray-500'}`}>{plan.desc}</p>
                <ul className="space-y-2.5 flex-1 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm">
                      <CheckCircle className={`w-4 h-4 shrink-0 ${plan.highlighted ? 'text-blue-200' : 'text-green-500'}`} />
                      <span className={plan.highlighted ? 'text-blue-100' : 'text-gray-600'}>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link href={plan.href}>
                  <Button
                    className={`w-full ${
                      plan.highlighted
                        ? 'bg-white text-[#1e3a5f] hover:bg-blue-50'
                        : 'bg-[#1e3a5f] hover:bg-[#2a4f7c] text-white'
                    }`}
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────── */}
      <section id="faq" className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold mb-4">Common questions</h2>
        </div>
        <div className="max-w-3xl mx-auto space-y-4">
          {FAQ.map((item) => (
            <div key={item.q} className="p-6 bg-white border border-gray-100 rounded-xl">
              <h3 className="font-semibold text-gray-900 mb-3">{item.q}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section className="bg-[#1e3a5f] py-20">
        <div className="max-w-7xl mx-auto px-6 text-center text-white">
          <Building2 className="w-12 h-12 mx-auto mb-6 opacity-60" />
          <h2 className="text-3xl font-bold mb-4">Stop building migration spreadsheets.</h2>
          <p className="text-blue-200 mb-8 max-w-lg mx-auto text-lg">
            Create your workspace in two minutes, select your migration objects, and generate your first XML template today.
          </p>
          <Link href="/register">
            <Button size="lg" className="bg-white text-[#1e3a5f] hover:bg-blue-50 gap-2 px-10 h-12 text-base">
              Create free workspace <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <p className="text-blue-300 text-sm mt-4">No credit card · No SAP installation · No consultants needed to start</p>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t py-8 bg-white">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[#1e3a5f] flex items-center justify-center">
              <Database className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-semibold text-[#1e3a5f]">SAP Migrator</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-gray-400">
            <a href="#how-it-works" className="hover:text-gray-600">How it works</a>
            <a href="#objects" className="hover:text-gray-600">Objects</a>
            <a href="#pricing" className="hover:text-gray-600">Pricing</a>
            <a href="#faq" className="hover:text-gray-600">FAQ</a>
          </div>
          <p className="text-xs text-gray-300">Not affiliated with SAP SE. Built for SAP S/4HANA Migration Cockpit workflows.</p>
        </div>
      </footer>
    </div>
  )
}
