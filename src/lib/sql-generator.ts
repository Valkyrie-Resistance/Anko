import type { CellEdit, DatabaseDriver, PendingRowChange } from '@/types'

export interface SQLGeneratorOptions {
  tableName: string
  schemaName?: string
  databaseName: string
  driver?: DatabaseDriver
}

/**
 * Get the identifier quote character for the database driver
 * MySQL uses backticks, PostgreSQL uses double quotes
 */
function getQuoteChar(driver?: DatabaseDriver): string {
  return driver === 'postgresql' ? '"' : '`'
}

/**
 * Quote an identifier (table name, column name, etc.)
 */
export function quoteIdentifier(name: string, driver?: DatabaseDriver): string {
  const q = getQuoteChar(driver)
  return `${q}${name}${q}`
}

/**
 * Escape a value for use in SQL statements
 */
export function escapeSQLValue(value: unknown): string {
  if (value === null || value === undefined) {
    return 'NULL'
  }

  if (typeof value === 'number') {
    return String(value)
  }

  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE'
  }

  if (typeof value === 'string') {
    // Escape single quotes by doubling them
    const escaped = value.replace(/'/g, "''")
    return `'${escaped}'`
  }

  if (typeof value === 'object') {
    // JSON objects
    const jsonStr = JSON.stringify(value).replace(/'/g, "''")
    return `'${jsonStr}'`
  }

  return `'${String(value).replace(/'/g, "''")}'`
}

/**
 * Get the fully qualified table name
 */
export function getTableRef(options: SQLGeneratorOptions): string {
  const { driver } = options
  // For PostgreSQL: schema.table; for MySQL: database.table
  if (options.schemaName) {
    return `${quoteIdentifier(options.schemaName, driver)}.${quoteIdentifier(options.tableName, driver)}`
  }
  return `${quoteIdentifier(options.databaseName, driver)}.${quoteIdentifier(options.tableName, driver)}`
}

/**
 * Build WHERE clause from primary key values
 */
export function buildPrimaryKeyWhere(
  primaryKeyValues: Record<string, unknown>,
  driver?: DatabaseDriver,
): string {
  const conditions = Object.entries(primaryKeyValues).map(([column, value]) => {
    if (value === null || value === undefined) {
      return `${quoteIdentifier(column, driver)} IS NULL`
    }
    return `${quoteIdentifier(column, driver)} = ${escapeSQLValue(value)}`
  })

  return conditions.join(' AND ')
}

/**
 * Generate INSERT statement
 */
export function generateInsertSQL(
  options: SQLGeneratorOptions,
  row: Record<string, unknown>,
): string {
  const { driver } = options
  const tableRef = getTableRef(options)
  const columns = Object.keys(row)
  const values = Object.values(row).map(escapeSQLValue)

  const columnList = columns.map((c) => quoteIdentifier(c, driver)).join(', ')
  const valueList = values.join(', ')

  return `INSERT INTO ${tableRef} (${columnList}) VALUES (${valueList})`
}

/**
 * Generate UPDATE statement
 */
export function generateUpdateSQL(
  options: SQLGeneratorOptions,
  primaryKeyValues: Record<string, unknown>,
  edits: CellEdit[],
): string {
  const { driver } = options
  const tableRef = getTableRef(options)
  const whereClause = buildPrimaryKeyWhere(primaryKeyValues, driver)

  const setClauses = edits.map(
    (edit) => `${quoteIdentifier(edit.columnName, driver)} = ${escapeSQLValue(edit.newValue)}`,
  )

  return `UPDATE ${tableRef} SET ${setClauses.join(', ')} WHERE ${whereClause}`
}

/**
 * Generate DELETE statement
 */
export function generateDeleteSQL(
  options: SQLGeneratorOptions,
  primaryKeyValues: Record<string, unknown>,
): string {
  const { driver } = options
  const tableRef = getTableRef(options)
  const whereClause = buildPrimaryKeyWhere(primaryKeyValues, driver)

  return `DELETE FROM ${tableRef} WHERE ${whereClause}`
}

/**
 * Generate all SQL statements for pending changes
 * Order: DELETEs first, then UPDATEs, then INSERTs
 */
export function generateCommitSQL(
  options: SQLGeneratorOptions,
  changes: PendingRowChange[],
): string[] {
  const statements: string[] = []

  // Process deletes first
  const deletes = changes.filter((c) => c.type === 'delete')
  for (const change of deletes) {
    statements.push(generateDeleteSQL(options, change.primaryKeyValues))
  }

  // Process updates
  const updates = changes.filter((c) => c.type === 'update')
  for (const change of updates) {
    if (change.edits.length > 0) {
      statements.push(generateUpdateSQL(options, change.primaryKeyValues, change.edits))
    }
  }

  // Process inserts last
  const inserts = changes.filter((c) => c.type === 'insert')
  for (const change of inserts) {
    if (change.newRow) {
      statements.push(generateInsertSQL(options, change.newRow))
    }
  }

  return statements
}
