// Real PostgreSQL extract target — creates a table per object and bulk-inserts
// the extracted rows. Used when a DataExtractJob targets POSTGRESQL.
import { Client } from 'pg'
import type { MigrationObjectField } from '../migration-objects'
import { buildCreateTable, buildInsert, sanitizeIdentifier } from './sql'

export interface PostgresTargetConfig {
  host?: string
  port?: string | number
  database?: string
  username?: string
  password?: string
  schema?: string
  ssl?: boolean
}

export interface ObjectWrite {
  objectKey: string
  fields: MigrationObjectField[]
  rows: Record<string, string>[]
}

const INSERT_BATCH = 500

/** Write extracted objects to a PostgreSQL database. Returns total rows written.
 *  Throws on connection/SQL errors so the caller can mark the job FAILED. */
export async function writeToPostgres(config: PostgresTargetConfig, objects: ObjectWrite[]): Promise<number> {
  if (!config.host || !config.database || !config.username) {
    throw new Error('PostgreSQL target requires host, database and username')
  }

  const client = new Client({
    host: config.host,
    port: config.port ? Number(config.port) : 5432,
    database: config.database,
    user: config.username,
    password: config.password,
    ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
    connectionTimeoutMillis: 10000,
    statement_timeout: 60000,
  })

  await client.connect()
  let total = 0
  try {
    if (config.schema) {
      await client.query(`CREATE SCHEMA IF NOT EXISTS "${sanitizeIdentifier(config.schema)}";`)
      await client.query(`SET search_path TO "${sanitizeIdentifier(config.schema)}";`)
    }
    for (const obj of objects) {
      const table = `sap_${obj.objectKey}`
      await client.query(buildCreateTable(table, obj.fields))
      for (let i = 0; i < obj.rows.length; i += INSERT_BATCH) {
        const batch = obj.rows.slice(i, i + INSERT_BATCH)
        if (batch.length === 0) continue
        const { text, values } = buildInsert(table, obj.fields, batch)
        await client.query(text, values)
        total += batch.length
      }
    }
  } finally {
    await client.end().catch(() => {})
  }
  return total
}
