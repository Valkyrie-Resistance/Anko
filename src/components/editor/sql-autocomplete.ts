import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete'
import {
  type SchemaContext,
  SQL_FUNCTIONS_WITH_INFO,
  SQL_KEYWORDS_WITH_INFO,
  SQL_SNIPPETS,
} from './definitions'

// Re-export SchemaContext for backwards compatibility
export type { SchemaContext } from './definitions'

// SQL context types for smart completions
type SqlContextType =
  | 'select' // After SELECT - prioritize columns, functions
  | 'from' // After FROM/JOIN - prioritize tables
  | 'where' // After WHERE/ON/AND/OR - prioritize columns, operators
  | 'order' // After ORDER BY - prioritize columns
  | 'group' // After GROUP BY - prioritize columns
  | 'insert-columns' // Inside INSERT INTO table (...) - prioritize columns
  | 'insert-values' // Inside VALUES (...) - prioritize values
  | 'update-set' // After SET - prioritize columns
  | 'column-ref' // After table.alias - show specific table columns
  | 'general' // Default - show everything

interface SqlContext {
  type: SqlContextType
  tableName?: string // For column-ref context
}

interface TableAlias {
  alias: string
  tableName: string
}

// Memoized static completions (computed once)
let memoizedKeywordCompletions: Completion[] | null = null
let memoizedFunctionCompletions: Completion[] | null = null
let memoizedSnippetCompletions: Completion[] | null = null

// Create completions from keywords with category info
function keywordCompletions(): Completion[] {
  if (memoizedKeywordCompletions) return memoizedKeywordCompletions

  memoizedKeywordCompletions = SQL_KEYWORDS_WITH_INFO.map((keyword) => ({
    label: keyword.name,
    type: 'keyword',
    detail: keyword.category,
    boost: -1, // Lower priority than schema items
  }))

  return memoizedKeywordCompletions
}

// Create completions from functions with documentation
function functionCompletions(): Completion[] {
  if (memoizedFunctionCompletions) return memoizedFunctionCompletions

  memoizedFunctionCompletions = SQL_FUNCTIONS_WITH_INFO.map((fn) => ({
    label: fn.name,
    type: 'method',
    detail: fn.category,
    info: `${fn.signature}\n\n${fn.description}`,
    apply: `${fn.name}()`,
    boost: -1,
  }))

  return memoizedFunctionCompletions
}

// Create completions from snippets
function snippetCompletions(): Completion[] {
  if (memoizedSnippetCompletions) return memoizedSnippetCompletions

  memoizedSnippetCompletions = SQL_SNIPPETS.map((snippet) => ({
    label: snippet.label,
    type: 'text',
    detail: 'snippet',
    info: snippet.description,
    apply: snippet.template,
    boost: 2, // Higher priority for quick access
  }))

  return memoizedSnippetCompletions
}

// Create completions from tables
function tableCompletions(schema: SchemaContext, selectedDatabase?: string): Completion[] {
  const completions: Completion[] = []

  if (selectedDatabase && schema.tables[selectedDatabase]) {
    for (const table of schema.tables[selectedDatabase]) {
      completions.push({
        label: table.name,
        type: table.table_type === 'VIEW' ? 'interface' : 'class',
        detail: table.table_type === 'VIEW' ? 'view' : 'table',
        info: table.row_count != null ? `${table.row_count.toLocaleString()} rows` : undefined,
        boost: 1,
      })
    }
  }

  return completions
}

// Create completions from columns with enhanced info
function columnCompletions(
  schema: SchemaContext,
  selectedDatabase?: string,
  tableHint?: string,
): Completion[] {
  const completions: Completion[] = []

  if (!selectedDatabase) return completions

  // If we have a table hint, only show columns from that table
  if (tableHint) {
    const key = `${selectedDatabase}.${tableHint}`
    const columns = schema.columns[key]
    if (columns) {
      for (const col of columns) {
        // Build info string with all available metadata
        const infoParts: string[] = [`Type: ${col.data_type}`]
        if (!col.nullable) infoParts.push('NOT NULL')
        if (col.key === 'PRI') infoParts.push('PRIMARY KEY')
        if (col.default_value !== undefined && col.default_value !== null) {
          infoParts.push(`Default: ${col.default_value}`)
        }
        if (col.extra) infoParts.push(col.extra)

        completions.push({
          label: col.name,
          type: 'property',
          detail: col.data_type + (col.nullable ? '' : ' NOT NULL'),
          info: infoParts.join('\n'),
          boost: col.key === 'PRI' ? 3 : 2,
        })
      }
    }
  } else {
    // Show all columns from all tables in the selected database
    for (const [key, columns] of Object.entries(schema.columns)) {
      if (key.startsWith(`${selectedDatabase}.`)) {
        const tableName = key.split('.')[1]
        for (const col of columns) {
          completions.push({
            label: col.name,
            type: 'property',
            detail: `${tableName}.${col.data_type}`,
            boost: col.key === 'PRI' ? 1 : 0,
          })
        }
      }
    }
  }

  return completions
}

// Create completions from databases
function databaseCompletions(schema: SchemaContext): Completion[] {
  return schema.databases.map((db) => ({
    label: db.name,
    type: 'namespace',
    detail: 'database',
    boost: 0,
  }))
}

// Extract table aliases from the query
function extractTableAliases(doc: string): TableAlias[] {
  const aliases: TableAlias[] = []

  // Match patterns like:
  // FROM users u
  // FROM users AS u
  // JOIN orders o ON
  // JOIN orders AS o ON
  // Also handle multiple tables: FROM users u, orders o
  const aliasPattern =
    /(?:FROM|JOIN)\s+(\w+)(?:\s+AS)?\s+(\w+)(?:\s+(?:ON|WHERE|LEFT|RIGHT|INNER|OUTER|CROSS|,|$))/gi

  for (const match of doc.matchAll(aliasPattern)) {
    const tableName = match[1]
    const alias = match[2]

    // Make sure alias is not a SQL keyword
    const keywords = [
      'ON',
      'WHERE',
      'LEFT',
      'RIGHT',
      'INNER',
      'OUTER',
      'CROSS',
      'JOIN',
      'AND',
      'OR',
    ]
    if (!keywords.includes(alias.toUpperCase()) && alias !== tableName) {
      aliases.push({ alias: alias.toLowerCase(), tableName: tableName.toLowerCase() })
    }
  }

  // Also match comma-separated tables: FROM users u, orders o
  const commaPattern = /,\s*(\w+)(?:\s+AS)?\s+(\w+)/gi
  for (const match of doc.matchAll(commaPattern)) {
    const tableName = match[1]
    const alias = match[2]
    if (alias !== tableName) {
      aliases.push({ alias: alias.toLowerCase(), tableName: tableName.toLowerCase() })
    }
  }

  return aliases
}

// Analyze SQL context to determine what completions to prioritize
function analyzeSqlContext(doc: string, pos: number): SqlContext {
  const beforeCursor = doc.slice(0, pos)
  const upperBefore = beforeCursor.toUpperCase()

  // Check for "alias." or "table." pattern (column completion)
  const dotMatch = beforeCursor.match(/(\w+)\.\w*$/)
  if (dotMatch) {
    const prefix = dotMatch[1].toLowerCase()

    // Check if it's an alias
    const aliases = extractTableAliases(doc)
    const aliasMatch = aliases.find((a) => a.alias === prefix)

    if (aliasMatch) {
      return { type: 'column-ref', tableName: aliasMatch.tableName }
    }

    // Otherwise assume it's a table name
    return { type: 'column-ref', tableName: prefix }
  }

  // Check context based on last SQL keyword
  // Look for the most recent keyword before cursor

  // INSERT INTO table (columns)
  const insertColumnsMatch = upperBefore.match(/INSERT\s+INTO\s+(\w+)\s*\([^)]*$/i)
  if (insertColumnsMatch) {
    return { type: 'insert-columns', tableName: insertColumnsMatch[1].toLowerCase() }
  }

  // VALUES (...)
  if (/VALUES\s*\([^)]*$/i.test(upperBefore)) {
    return { type: 'insert-values' }
  }

  // UPDATE table SET
  const updateSetMatch = upperBefore.match(/UPDATE\s+(\w+)\s+SET\s+[^;]*$/i)
  if (updateSetMatch) {
    return { type: 'update-set', tableName: updateSetMatch[1].toLowerCase() }
  }

  // Check for ORDER BY context
  if (/ORDER\s+BY\s+[\w\s,]*$/i.test(upperBefore)) {
    return { type: 'order' }
  }

  // Check for GROUP BY context
  if (/GROUP\s+BY\s+[\w\s,]*$/i.test(upperBefore)) {
    return { type: 'group' }
  }

  // Check for WHERE/ON/AND/OR context
  if (/(?:WHERE|ON|AND|OR)\s+[\w\s]*$/i.test(upperBefore)) {
    return { type: 'where' }
  }

  // Check for FROM/JOIN context (need table names)
  if (/(?:FROM|JOIN)\s+[\w]*$/i.test(upperBefore)) {
    return { type: 'from' }
  }

  // Check for SELECT context
  if (/SELECT\s+(?:DISTINCT\s+)?[\w\s,*]*$/i.test(upperBefore)) {
    // Check if we're right after SELECT
    const afterSelect = upperBefore.match(/SELECT\s+(?:DISTINCT\s+)?(\S*)$/i)
    if (afterSelect) {
      return { type: 'select' }
    }
  }

  return { type: 'general' }
}

// Get completions based on context with appropriate boost values
function getContextualCompletions(
  context: SqlContext,
  schema: SchemaContext,
  selectedDatabase?: string,
): Completion[] {
  const keywords = keywordCompletions()
  const functions = functionCompletions()
  const snippets = snippetCompletions()
  const tables = tableCompletions(schema, selectedDatabase)
  const databases = databaseCompletions(schema)

  switch (context.type) {
    case 'column-ref': {
      // Only show columns from the specific table
      return columnCompletions(schema, selectedDatabase, context.tableName)
    }

    case 'from': {
      // Prioritize tables, then databases
      return [
        ...tables.map((t) => ({ ...t, boost: 3 })),
        ...databases.map((d) => ({ ...d, boost: 2 })),
        ...keywords.map((k) => ({ ...k, boost: -2 })),
      ]
    }

    case 'select': {
      // Prioritize columns and functions
      const columns = columnCompletions(schema, selectedDatabase)
      return [
        ...columns.map((c) => ({ ...c, boost: 3 })),
        ...functions.map((f) => ({ ...f, boost: 2 })),
        ...tables.map((t) => ({ ...t, boost: 1 })),
        ...keywords,
        ...snippets,
      ]
    }

    case 'where':
    case 'order':
    case 'group': {
      // Prioritize columns
      const columns = columnCompletions(schema, selectedDatabase)
      return [
        ...columns.map((c) => ({ ...c, boost: 3 })),
        ...functions.map((f) => ({ ...f, boost: 1 })),
        ...keywords,
      ]
    }

    case 'insert-columns':
    case 'update-set': {
      // Show columns from specific table
      const tableColumns = columnCompletions(schema, selectedDatabase, context.tableName)
      return tableColumns.map((c) => ({ ...c, boost: 3 }))
    }

    case 'insert-values': {
      // Show functions and literals
      return [
        ...functions.map((f) => ({ ...f, boost: 2 })),
        ...keywords.filter((k) => ['NULL', 'TRUE', 'FALSE', 'DEFAULT'].includes(k.label)),
      ]
    }

    default: {
      // Show everything with default priorities
      const columns = columnCompletions(schema, selectedDatabase)
      return [...snippets, ...columns, ...tables, ...databases, ...functions, ...keywords]
    }
  }
}

// Create the autocomplete function
export function createSqlAutocomplete(schema: SchemaContext, selectedDatabase?: string) {
  return function sqlAutocomplete(context: CompletionContext): CompletionResult | null {
    // Get word at cursor (including dots for qualified names)
    const word = context.matchBefore(/[\w.]+/)
    if (!word && !context.explicit) return null

    const from = word?.from ?? context.pos
    const doc = context.state.doc.toString()

    // Analyze the SQL context
    const sqlContext = analyzeSqlContext(doc, context.pos)

    // Get contextual completions
    const completions = getContextualCompletions(sqlContext, schema, selectedDatabase)

    if (completions.length === 0) return null

    return {
      from,
      options: completions,
      validFor: /^[\w.]*$/,
    }
  }
}

// Export a basic autocomplete for when no schema is available
export function createBasicSqlAutocomplete() {
  return function basicSqlAutocomplete(context: CompletionContext): CompletionResult | null {
    const word = context.matchBefore(/\w+/)
    if (!word && !context.explicit) return null

    const from = word?.from ?? context.pos

    const completions = [...snippetCompletions(), ...keywordCompletions(), ...functionCompletions()]

    if (completions.length === 0) return null

    return {
      from,
      options: completions,
      validFor: /^\w*$/,
    }
  }
}
