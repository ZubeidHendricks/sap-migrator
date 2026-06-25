export type MigrationObjectCategory =
  | 'Finance'
  | 'Controlling'
  | 'Master Data'
  | 'Logistics'
  | 'Inventory'
  | 'Human Resources'
  | 'Basis'

export interface MigrationObjectField {
  name: string
  label: string
  required: boolean
  type: 'string' | 'number' | 'date' | 'boolean'
  maxLength?: number
  example?: string
}

export interface MigrationObject {
  key: string
  name: string
  category: MigrationObjectCategory
  description: string
  sapTable?: string
  approach: ('STAGING_TABLES' | 'DIRECT_TRANSFER')[]
  fields: MigrationObjectField[]
  estimatedVolume?: string
}

export const MIGRATION_OBJECTS: MigrationObject[] = [
  // ── Finance ──────────────────────────────────────────────────────────────
  {
    key: 'CHART_OF_ACCOUNTS',
    name: 'Chart of Accounts',
    category: 'Finance',
    description: 'GL account structure definition including account groups and number ranges',
    sapTable: 'T004',
    approach: ['STAGING_TABLES', 'DIRECT_TRANSFER'],
    fields: [
      { name: 'KTOPL', label: 'Chart of Accounts', required: true, type: 'string', maxLength: 4, example: 'INT' },
      { name: 'TXT50', label: 'Description', required: true, type: 'string', maxLength: 50, example: 'International Chart of Accounts' },
      { name: 'CURT', label: 'Currency', required: true, type: 'string', maxLength: 5, example: 'USD' },
      { name: 'LKLS', label: 'Length of GL Account Number', required: true, type: 'number', example: '10' },
    ],
  },
  {
    key: 'GL_ACCOUNT',
    name: 'General Ledger Account',
    category: 'Finance',
    description: 'GL master data including company code assignments, account types, and reconciliation settings',
    sapTable: 'SKA1/SKB1',
    approach: ['STAGING_TABLES', 'DIRECT_TRANSFER'],
    fields: [
      { name: 'SAKNR', label: 'GL Account Number', required: true, type: 'string', maxLength: 10, example: '0001000000' },
      { name: 'BUKRS', label: 'Company Code', required: true, type: 'string', maxLength: 4, example: '1000' },
      { name: 'KTOKS', label: 'Account Group', required: true, type: 'string', maxLength: 4, example: 'GRAL' },
      { name: 'TXT50', label: 'Short Text', required: true, type: 'string', maxLength: 50, example: 'Cash Account' },
      { name: 'XBILK', label: 'Balance Sheet Account', required: false, type: 'boolean', example: 'X' },
      { name: 'WAERS', label: 'Account Currency', required: false, type: 'string', maxLength: 5, example: 'USD' },
      { name: 'MWSKZ', label: 'Tax Category', required: false, type: 'string', maxLength: 2, example: '' },
      { name: 'MITKZ', label: 'Reconciliation Account Type', required: false, type: 'string', maxLength: 1, example: 'D' },
    ],
  },
  {
    key: 'OPEN_ITEMS_AR',
    name: 'Open Items: Accounts Receivable',
    category: 'Finance',
    description: 'Customer open items — outstanding invoices and credit memos to be transferred',
    sapTable: 'BSID',
    approach: ['STAGING_TABLES', 'DIRECT_TRANSFER'],
    fields: [
      { name: 'BUKRS', label: 'Company Code', required: true, type: 'string', maxLength: 4, example: '1000' },
      { name: 'KUNNR', label: 'Customer Number', required: true, type: 'string', maxLength: 10, example: '0000010000' },
      { name: 'BLART', label: 'Document Type', required: true, type: 'string', maxLength: 2, example: 'DR' },
      { name: 'BLDAT', label: 'Document Date', required: true, type: 'date', example: '2024-01-15' },
      { name: 'BUDAT', label: 'Posting Date', required: true, type: 'date', example: '2024-01-15' },
      { name: 'WRBTR', label: 'Amount in Document Currency', required: true, type: 'number', example: '1500.00' },
      { name: 'WAERS', label: 'Currency Key', required: true, type: 'string', maxLength: 5, example: 'USD' },
      { name: 'ZFBDT', label: 'Baseline Date for Payment', required: false, type: 'date', example: '2024-01-15' },
      { name: 'ZTERM', label: 'Payment Terms', required: false, type: 'string', maxLength: 4, example: 'NT30' },
      { name: 'BKTXT', label: 'Document Header Text', required: false, type: 'string', maxLength: 25, example: 'Invoice #12345' },
    ],
  },
  {
    key: 'OPEN_ITEMS_AP',
    name: 'Open Items: Accounts Payable',
    category: 'Finance',
    description: 'Vendor open items — outstanding invoices and credit memos to be transferred',
    sapTable: 'BSIK',
    approach: ['STAGING_TABLES', 'DIRECT_TRANSFER'],
    fields: [
      { name: 'BUKRS', label: 'Company Code', required: true, type: 'string', maxLength: 4, example: '1000' },
      { name: 'LIFNR', label: 'Vendor Number', required: true, type: 'string', maxLength: 10, example: '0000100000' },
      { name: 'BLART', label: 'Document Type', required: true, type: 'string', maxLength: 2, example: 'KR' },
      { name: 'BLDAT', label: 'Document Date', required: true, type: 'date', example: '2024-01-15' },
      { name: 'BUDAT', label: 'Posting Date', required: true, type: 'date', example: '2024-01-15' },
      { name: 'WRBTR', label: 'Amount in Document Currency', required: true, type: 'number', example: '2300.00' },
      { name: 'WAERS', label: 'Currency Key', required: true, type: 'string', maxLength: 5, example: 'USD' },
      { name: 'ZFBDT', label: 'Baseline Date for Payment', required: false, type: 'date', example: '2024-01-15' },
      { name: 'ZTERM', label: 'Payment Terms', required: false, type: 'string', maxLength: 4, example: 'NT30' },
    ],
  },
  {
    key: 'OPEN_ITEMS_GL',
    name: 'Open Items: GL Account',
    category: 'Finance',
    description: 'GL open items for balance sheet accounts managed on an open-item basis',
    sapTable: 'BSIS',
    approach: ['STAGING_TABLES'],
    fields: [
      { name: 'BUKRS', label: 'Company Code', required: true, type: 'string', maxLength: 4, example: '1000' },
      { name: 'SAKNR', label: 'GL Account Number', required: true, type: 'string', maxLength: 10, example: '0001190000' },
      { name: 'BLART', label: 'Document Type', required: true, type: 'string', maxLength: 2, example: 'SA' },
      { name: 'BLDAT', label: 'Document Date', required: true, type: 'date', example: '2024-01-15' },
      { name: 'BUDAT', label: 'Posting Date', required: true, type: 'date', example: '2024-01-15' },
      { name: 'WRBTR', label: 'Amount', required: true, type: 'number', example: '500.00' },
      { name: 'WAERS', label: 'Currency', required: true, type: 'string', maxLength: 5, example: 'USD' },
    ],
  },
  {
    key: 'ASSET_MASTER',
    name: 'Asset Master',
    category: 'Finance',
    description: 'Fixed asset master records including depreciation areas, useful life, and book values',
    sapTable: 'ANLA/ANLB',
    approach: ['STAGING_TABLES', 'DIRECT_TRANSFER'],
    fields: [
      { name: 'BUKRS', label: 'Company Code', required: true, type: 'string', maxLength: 4, example: '1000' },
      { name: 'ANLN1', label: 'Asset Number', required: true, type: 'string', maxLength: 12, example: '000000100000' },
      { name: 'ANLN2', label: 'Asset Sub-number', required: false, type: 'string', maxLength: 4, example: '0000' },
      { name: 'ANLKL', label: 'Asset Class', required: true, type: 'string', maxLength: 8, example: '3100' },
      { name: 'TXT50', label: 'Asset Description', required: true, type: 'string', maxLength: 50, example: 'Office Equipment' },
      { name: 'KOSTL', label: 'Cost Center', required: false, type: 'string', maxLength: 10, example: '0000010000' },
      { name: 'DEAKT', label: 'Capitalization Date', required: true, type: 'date', example: '2020-01-01' },
      { name: 'AFABE', label: 'Depreciation Area', required: true, type: 'number', example: '1' },
      { name: 'NDJAR', label: 'Useful Life (Years)', required: true, type: 'number', example: '5' },
      { name: 'NAFAB', label: 'Depreciation Method', required: true, type: 'string', maxLength: 4, example: 'LINR' },
    ],
  },
  {
    key: 'EXCHANGE_RATES',
    name: 'Exchange Rates',
    category: 'Finance',
    description: 'Currency exchange rates and translation ratios',
    sapTable: 'TCURR',
    approach: ['STAGING_TABLES', 'DIRECT_TRANSFER'],
    fields: [
      { name: 'KURST', label: 'Exchange Rate Type', required: true, type: 'string', maxLength: 4, example: 'M' },
      { name: 'FCURR', label: 'From Currency', required: true, type: 'string', maxLength: 5, example: 'EUR' },
      { name: 'TCURR', label: 'To Currency', required: true, type: 'string', maxLength: 5, example: 'USD' },
      { name: 'GDATU', label: 'Valid From Date', required: true, type: 'date', example: '2024-01-01' },
      { name: 'UKURS', label: 'Exchange Rate', required: true, type: 'number', example: '1.0850' },
    ],
  },

  // ── Controlling ───────────────────────────────────────────────────────────
  {
    key: 'COST_CENTER',
    name: 'Cost Center',
    category: 'Controlling',
    description: 'Controlling area cost centers with hierarchy assignments and responsible persons',
    sapTable: 'CSKS',
    approach: ['STAGING_TABLES', 'DIRECT_TRANSFER'],
    fields: [
      { name: 'KOKRS', label: 'Controlling Area', required: true, type: 'string', maxLength: 4, example: '1000' },
      { name: 'KOSTL', label: 'Cost Center', required: true, type: 'string', maxLength: 10, example: '0000010000' },
      { name: 'DATAB', label: 'Valid From', required: true, type: 'date', example: '2024-01-01' },
      { name: 'DATBI', label: 'Valid To', required: true, type: 'date', example: '9999-12-31' },
      { name: 'KTEXT', label: 'Name', required: true, type: 'string', maxLength: 20, example: 'IT Department' },
      { name: 'LTEXT', label: 'Description', required: false, type: 'string', maxLength: 40, example: 'Information Technology' },
      { name: 'KOSAR', label: 'Cost Center Category', required: true, type: 'string', maxLength: 1, example: 'F' },
      { name: 'BUKRS', label: 'Company Code', required: true, type: 'string', maxLength: 4, example: '1000' },
      { name: 'VERAK', label: 'Person Responsible', required: false, type: 'string', maxLength: 20, example: 'JOHNDOE' },
    ],
  },
  {
    key: 'PROFIT_CENTER',
    name: 'Profit Center',
    category: 'Controlling',
    description: 'Profit center master data for profitability analysis',
    sapTable: 'CEPC',
    approach: ['STAGING_TABLES', 'DIRECT_TRANSFER'],
    fields: [
      { name: 'KOKRS', label: 'Controlling Area', required: true, type: 'string', maxLength: 4, example: '1000' },
      { name: 'PRCTR', label: 'Profit Center', required: true, type: 'string', maxLength: 10, example: 'PC_SALES' },
      { name: 'DATAB', label: 'Valid From', required: true, type: 'date', example: '2024-01-01' },
      { name: 'DATBI', label: 'Valid To', required: true, type: 'date', example: '9999-12-31' },
      { name: 'KTEXT', label: 'Name', required: true, type: 'string', maxLength: 20, example: 'Sales EMEA' },
      { name: 'LTEXT', label: 'Long Text', required: false, type: 'string', maxLength: 40, example: 'Sales Europe Middle East Africa' },
      { name: 'VERAK', label: 'Person Responsible', required: false, type: 'string', maxLength: 20, example: 'MSMITH' },
    ],
  },
  {
    key: 'INTERNAL_ORDER',
    name: 'Internal Order',
    category: 'Controlling',
    description: 'CO internal orders for cost collection and settlement',
    sapTable: 'AUFK',
    approach: ['STAGING_TABLES', 'DIRECT_TRANSFER'],
    fields: [
      { name: 'KOKRS', label: 'Controlling Area', required: true, type: 'string', maxLength: 4, example: '1000' },
      { name: 'AUFNR', label: 'Order Number', required: true, type: 'string', maxLength: 12, example: '000010000001' },
      { name: 'AUART', label: 'Order Type', required: true, type: 'string', maxLength: 4, example: '0100' },
      { name: 'KTEXT', label: 'Order Description', required: true, type: 'string', maxLength: 40, example: 'Marketing Campaign Q1' },
      { name: 'BUKRS', label: 'Company Code', required: true, type: 'string', maxLength: 4, example: '1000' },
      { name: 'KOSTL', label: 'Responsible Cost Center', required: false, type: 'string', maxLength: 10, example: '0000020000' },
    ],
  },

  // ── Master Data ───────────────────────────────────────────────────────────
  {
    key: 'BUSINESS_PARTNER',
    name: 'Business Partner',
    category: 'Master Data',
    description: 'Business partner master — required in S/4HANA; replaces separate customer/vendor creation',
    sapTable: 'BUT000',
    approach: ['STAGING_TABLES', 'DIRECT_TRANSFER'],
    fields: [
      { name: 'PARTNER', label: 'Business Partner Number', required: false, type: 'string', maxLength: 10, example: '0000100001' },
      { name: 'BU_SORT1', label: 'Search Term 1', required: false, type: 'string', maxLength: 20, example: 'ACME' },
      { name: 'BU_GROUP', label: 'BP Group', required: true, type: 'string', maxLength: 4, example: 'CRED' },
      { name: 'NAME_ORG1', label: 'Company Name', required: true, type: 'string', maxLength: 40, example: 'ACME Corporation' },
      { name: 'STREET', label: 'Street', required: false, type: 'string', maxLength: 60, example: '123 Main Street' },
      { name: 'CITY1', label: 'City', required: false, type: 'string', maxLength: 40, example: 'New York' },
      { name: 'POST_CODE1', label: 'Postal Code', required: false, type: 'string', maxLength: 10, example: '10001' },
      { name: 'COUNTRY', label: 'Country', required: true, type: 'string', maxLength: 3, example: 'US' },
      { name: 'LANGU', label: 'Language', required: false, type: 'string', maxLength: 2, example: 'EN' },
    ],
  },
  {
    key: 'CUSTOMER_MASTER',
    name: 'Customer Master',
    category: 'Master Data',
    description: 'Customer general data, company code data, and sales area data',
    sapTable: 'KNA1/KNB1/KNVV',
    approach: ['STAGING_TABLES', 'DIRECT_TRANSFER'],
    fields: [
      { name: 'KUNNR', label: 'Customer Number', required: false, type: 'string', maxLength: 10, example: '0000010000' },
      { name: 'KTOKD', label: 'Account Group', required: true, type: 'string', maxLength: 4, example: 'KUNA' },
      { name: 'NAME1', label: 'Company Name', required: true, type: 'string', maxLength: 35, example: 'Global Tech Ltd' },
      { name: 'LAND1', label: 'Country', required: true, type: 'string', maxLength: 3, example: 'US' },
      { name: 'STRAS', label: 'Street', required: false, type: 'string', maxLength: 35, example: '500 Tech Park' },
      { name: 'ORT01', label: 'City', required: false, type: 'string', maxLength: 35, example: 'San Francisco' },
      { name: 'PSTLZ', label: 'Postal Code', required: false, type: 'string', maxLength: 10, example: '94105' },
      { name: 'BUKRS', label: 'Company Code', required: true, type: 'string', maxLength: 4, example: '1000' },
      { name: 'AKONT', label: 'Reconciliation Account', required: true, type: 'string', maxLength: 10, example: '0001400000' },
      { name: 'ZTERM', label: 'Payment Terms', required: false, type: 'string', maxLength: 4, example: 'NT30' },
      { name: 'VKORG', label: 'Sales Organization', required: false, type: 'string', maxLength: 4, example: '1000' },
      { name: 'VTWEG', label: 'Distribution Channel', required: false, type: 'string', maxLength: 2, example: '10' },
      { name: 'SPART', label: 'Division', required: false, type: 'string', maxLength: 2, example: '00' },
    ],
  },
  {
    key: 'VENDOR_MASTER',
    name: 'Vendor Master',
    category: 'Master Data',
    description: 'Vendor general data, company code data, and purchasing organization data',
    sapTable: 'LFA1/LFB1/LFM1',
    approach: ['STAGING_TABLES', 'DIRECT_TRANSFER'],
    fields: [
      { name: 'LIFNR', label: 'Vendor Number', required: false, type: 'string', maxLength: 10, example: '0000100000' },
      { name: 'KTOKK', label: 'Account Group', required: true, type: 'string', maxLength: 4, example: 'LIEF' },
      { name: 'NAME1', label: 'Company Name', required: true, type: 'string', maxLength: 35, example: 'Supply Co Inc' },
      { name: 'LAND1', label: 'Country', required: true, type: 'string', maxLength: 3, example: 'DE' },
      { name: 'STRAS', label: 'Street', required: false, type: 'string', maxLength: 35, example: 'Hauptstrasse 100' },
      { name: 'ORT01', label: 'City', required: false, type: 'string', maxLength: 35, example: 'Berlin' },
      { name: 'PSTLZ', label: 'Postal Code', required: false, type: 'string', maxLength: 10, example: '10115' },
      { name: 'BUKRS', label: 'Company Code', required: true, type: 'string', maxLength: 4, example: '1000' },
      { name: 'AKONT', label: 'Reconciliation Account', required: true, type: 'string', maxLength: 10, example: '0001600000' },
      { name: 'ZTERM', label: 'Payment Terms', required: false, type: 'string', maxLength: 4, example: 'NT30' },
      { name: 'EKORG', label: 'Purchasing Organization', required: false, type: 'string', maxLength: 4, example: '1000' },
      { name: 'WAERS', label: 'Order Currency', required: false, type: 'string', maxLength: 5, example: 'EUR' },
    ],
  },
  {
    key: 'MATERIAL_MASTER',
    name: 'Material Master',
    category: 'Master Data',
    description: 'Material master including basic data, MRP, sales, and purchasing views',
    sapTable: 'MARA/MARC/MARD',
    approach: ['STAGING_TABLES', 'DIRECT_TRANSFER'],
    fields: [
      { name: 'MATNR', label: 'Material Number', required: true, type: 'string', maxLength: 18, example: 'MAT-000001' },
      { name: 'MBRSH', label: 'Industry Sector', required: true, type: 'string', maxLength: 1, example: 'M' },
      { name: 'MTART', label: 'Material Type', required: true, type: 'string', maxLength: 4, example: 'FERT' },
      { name: 'MAKTX', label: 'Material Description', required: true, type: 'string', maxLength: 40, example: 'Finished Product Alpha' },
      { name: 'MEINS', label: 'Base Unit of Measure', required: true, type: 'string', maxLength: 3, example: 'EA' },
      { name: 'MATKL', label: 'Material Group', required: false, type: 'string', maxLength: 9, example: '001' },
      { name: 'WERKS', label: 'Plant', required: true, type: 'string', maxLength: 4, example: '1000' },
      { name: 'EKGRP', label: 'Purchasing Group', required: false, type: 'string', maxLength: 3, example: '001' },
      { name: 'DISMM', label: 'MRP Type', required: false, type: 'string', maxLength: 2, example: 'PD' },
      { name: 'MINBE', label: 'Reorder Point', required: false, type: 'number', example: '10' },
      { name: 'LGORT', label: 'Storage Location', required: false, type: 'string', maxLength: 4, example: '0001' },
    ],
  },
  {
    key: 'BANK_MASTER',
    name: 'Bank Master Data',
    category: 'Master Data',
    description: 'Bank master data (BNKA) for all financial institutions used in payment processing',
    sapTable: 'BNKA',
    approach: ['STAGING_TABLES', 'DIRECT_TRANSFER'],
    fields: [
      { name: 'BANKS', label: 'Bank Country', required: true, type: 'string', maxLength: 3, example: 'US' },
      { name: 'BANKL', label: 'Bank Key / Routing Number', required: true, type: 'string', maxLength: 15, example: '021000021' },
      { name: 'BANKA', label: 'Bank Name', required: true, type: 'string', maxLength: 60, example: 'JP Morgan Chase' },
      { name: 'STRAS', label: 'Street Address', required: false, type: 'string', maxLength: 35, example: '383 Madison Ave' },
      { name: 'ORT01', label: 'City', required: false, type: 'string', maxLength: 35, example: 'New York' },
      { name: 'SWIFT', label: 'SWIFT Code', required: false, type: 'string', maxLength: 11, example: 'CHASUS33' },
    ],
  },

  // ── Logistics ─────────────────────────────────────────────────────────────
  {
    key: 'PURCHASE_INFO_RECORD',
    name: 'Purchasing Info Record',
    category: 'Logistics',
    description: 'Vendor-material info records with pricing conditions and delivery terms',
    sapTable: 'EINA/EINE',
    approach: ['STAGING_TABLES', 'DIRECT_TRANSFER'],
    fields: [
      { name: 'LIFNR', label: 'Vendor Number', required: true, type: 'string', maxLength: 10, example: '0000100000' },
      { name: 'MATNR', label: 'Material Number', required: true, type: 'string', maxLength: 18, example: 'MAT-000001' },
      { name: 'EKORG', label: 'Purchasing Organization', required: true, type: 'string', maxLength: 4, example: '1000' },
      { name: 'WERKS', label: 'Plant', required: false, type: 'string', maxLength: 4, example: '1000' },
      { name: 'INFNR', label: 'Info Record Number', required: false, type: 'string', maxLength: 10, example: '' },
      { name: 'NETPR', label: 'Net Price', required: true, type: 'number', example: '25.50' },
      { name: 'WAERS', label: 'Currency', required: true, type: 'string', maxLength: 5, example: 'USD' },
      { name: 'PEINH', label: 'Price Unit', required: true, type: 'number', example: '1' },
      { name: 'MEINS', label: 'Order Unit', required: true, type: 'string', maxLength: 3, example: 'EA' },
    ],
  },
  {
    key: 'PRICING_CONDITIONS',
    name: 'Pricing Conditions',
    category: 'Logistics',
    description: 'Sales and purchasing condition records for price determination',
    sapTable: 'KONV',
    approach: ['STAGING_TABLES'],
    fields: [
      { name: 'KSCHL', label: 'Condition Type', required: true, type: 'string', maxLength: 4, example: 'PR00' },
      { name: 'KAPPL', label: 'Application', required: true, type: 'string', maxLength: 2, example: 'V' },
      { name: 'VKORG', label: 'Sales Organization', required: false, type: 'string', maxLength: 4, example: '1000' },
      { name: 'VTWEG', label: 'Distribution Channel', required: false, type: 'string', maxLength: 2, example: '10' },
      { name: 'MATNR', label: 'Material', required: false, type: 'string', maxLength: 18, example: 'MAT-000001' },
      { name: 'DATAB', label: 'Valid From', required: true, type: 'date', example: '2024-01-01' },
      { name: 'DATBI', label: 'Valid To', required: true, type: 'date', example: '2024-12-31' },
      { name: 'KBETR', label: 'Rate', required: true, type: 'number', example: '99.99' },
      { name: 'WAERS', label: 'Currency', required: true, type: 'string', maxLength: 5, example: 'USD' },
    ],
  },

  // ── Inventory ─────────────────────────────────────────────────────────────
  {
    key: 'INITIAL_STOCK',
    name: 'Initial Stock Upload',
    category: 'Inventory',
    description: 'Opening stock balances per material, plant, and storage location',
    sapTable: 'MARD',
    approach: ['STAGING_TABLES'],
    fields: [
      { name: 'MATNR', label: 'Material Number', required: true, type: 'string', maxLength: 18, example: 'MAT-000001' },
      { name: 'WERKS', label: 'Plant', required: true, type: 'string', maxLength: 4, example: '1000' },
      { name: 'LGORT', label: 'Storage Location', required: true, type: 'string', maxLength: 4, example: '0001' },
      { name: 'LABST', label: 'Unrestricted Stock Qty', required: true, type: 'number', example: '250' },
      { name: 'MEINS', label: 'Unit of Measure', required: true, type: 'string', maxLength: 3, example: 'EA' },
      { name: 'BUDAT', label: 'Posting Date', required: true, type: 'date', example: '2024-01-01' },
      { name: 'BWTAR', label: 'Valuation Type', required: false, type: 'string', maxLength: 10, example: '' },
    ],
  },
  {
    key: 'BATCH_MASTER',
    name: 'Batch Master',
    category: 'Inventory',
    description: 'Batch classification and characteristic values for batch-managed materials',
    sapTable: 'MCH1',
    approach: ['STAGING_TABLES', 'DIRECT_TRANSFER'],
    fields: [
      { name: 'MATNR', label: 'Material Number', required: true, type: 'string', maxLength: 18, example: 'MAT-000001' },
      { name: 'WERKS', label: 'Plant', required: true, type: 'string', maxLength: 4, example: '1000' },
      { name: 'CHARG', label: 'Batch Number', required: true, type: 'string', maxLength: 10, example: 'BATCH2024A' },
      { name: 'VFDAT', label: 'Shelf Life Expiration Date', required: false, type: 'date', example: '2025-12-31' },
      { name: 'MHDRZ', label: 'Minimum Remaining Shelf Life', required: false, type: 'number', example: '30' },
    ],
  },

  // ── Human Resources ───────────────────────────────────────────────────────
  {
    key: 'EMPLOYEE_BASIC_PAY',
    name: 'Employee Basic Pay',
    category: 'Human Resources',
    description: 'Infotype 0008 — Basic Pay for HCM employee master data migration',
    sapTable: 'PA0008',
    approach: ['STAGING_TABLES'],
    fields: [
      { name: 'PERNR', label: 'Personnel Number', required: true, type: 'string', maxLength: 8, example: '00001001' },
      { name: 'BEGDA', label: 'Start Date', required: true, type: 'date', example: '2024-01-01' },
      { name: 'ENDDA', label: 'End Date', required: true, type: 'date', example: '9999-12-31' },
      { name: 'TRFGR', label: 'Pay Scale Group', required: false, type: 'string', maxLength: 8, example: 'GR-05' },
      { name: 'TRFST', label: 'Pay Scale Level', required: false, type: 'string', maxLength: 2, example: '01' },
      { name: 'LGA01', label: 'Wage Type 1', required: false, type: 'string', maxLength: 4, example: 'M010' },
      { name: 'BET01', label: 'Amount 1', required: false, type: 'number', example: '5000.00' },
      { name: 'WAERS', label: 'Currency', required: true, type: 'string', maxLength: 5, example: 'USD' },
    ],
  },

  // ── Basis ─────────────────────────────────────────────────────────────────
  {
    key: 'PAYMENT_TERMS',
    name: 'Payment Terms',
    category: 'Basis',
    description: 'Payment terms configuration including discount percentages and due date rules',
    sapTable: 'T052',
    approach: ['STAGING_TABLES', 'DIRECT_TRANSFER'],
    fields: [
      { name: 'ZTERM', label: 'Payment Terms Key', required: true, type: 'string', maxLength: 4, example: 'NT30' },
      { name: 'VTEXT', label: 'Description', required: true, type: 'string', maxLength: 30, example: 'Net Due in 30 Days' },
      { name: 'ZTAG1', label: 'Days 1', required: false, type: 'number', example: '14' },
      { name: 'ZPRZ1', label: 'Discount 1 %', required: false, type: 'number', example: '2.000' },
      { name: 'ZTAG2', label: 'Days 2', required: false, type: 'number', example: '30' },
      { name: 'ZPRZ2', label: 'Discount 2 %', required: false, type: 'number', example: '0.000' },
    ],
  },
  {
    key: 'HOUSE_BANK',
    name: 'House Bank',
    category: 'Basis',
    description: 'House bank configuration with bank accounts for payment processing',
    sapTable: 'T012',
    approach: ['STAGING_TABLES'],
    fields: [
      { name: 'BUKRS', label: 'Company Code', required: true, type: 'string', maxLength: 4, example: '1000' },
      { name: 'HBKID', label: 'House Bank ID', required: true, type: 'string', maxLength: 5, example: 'CHASE' },
      { name: 'BANKS', label: 'Bank Country', required: true, type: 'string', maxLength: 3, example: 'US' },
      { name: 'BANKL', label: 'Bank Key', required: true, type: 'string', maxLength: 15, example: '021000021' },
      { name: 'HKONT', label: 'GL Account', required: true, type: 'string', maxLength: 10, example: '0001130000' },
      { name: 'BANKN', label: 'Bank Account Number', required: true, type: 'string', maxLength: 18, example: '123456789' },
    ],
  },
]

export function getObjectsByCategory(approach?: 'STAGING_TABLES' | 'DIRECT_TRANSFER') {
  const objects = approach
    ? MIGRATION_OBJECTS.filter((o) => o.approach.includes(approach))
    : MIGRATION_OBJECTS

  return objects.reduce<Record<string, MigrationObject[]>>((acc, obj) => {
    if (!acc[obj.category]) acc[obj.category] = []
    acc[obj.category].push(obj)
    return acc
  }, {})
}

export function getObjectByKey(key: string) {
  return MIGRATION_OBJECTS.find((o) => o.key === key)
}
