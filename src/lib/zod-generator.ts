import type { ColumnDetail } from '@/types'

/** Maps SQL data types to Zod schema types */
function sqlTypeToZod(dataType: string, nullable: boolean): string {
  const type = dataType.toLowerCase()
  let zodType: string

  // Integer types
  if (
    type.includes('int') ||
    type.includes('serial') ||
    type.includes('smallint') ||
    type.includes('bigint') ||
    type.includes('tinyint') ||
    type.includes('mediumint')
  ) {
    zodType = 'z.number().int()'
  }
  // Decimal/float types
  else if (
    type.includes('decimal') ||
    type.includes('numeric') ||
    type.includes('float') ||
    type.includes('double') ||
    type.includes('real') ||
    type.includes('money')
  ) {
    zodType = 'z.number()'
  }
  // Boolean types
  else if (type.includes('bool') || type === 'bit') {
    zodType = 'z.boolean()'
  }
  // Date/time types
  else if (
    type.includes('date') ||
    type.includes('time') ||
    type.includes('timestamp') ||
    type.includes('year')
  ) {
    zodType = 'z.string().datetime()'
  }
  // JSON types
  else if (type === 'json' || type === 'jsonb') {
    zodType = 'z.unknown()'
  }
  // UUID types
  else if (type === 'uuid') {
    zodType = 'z.string().uuid()'
  }
  // Binary types
  else if (
    type.includes('blob') ||
    type.includes('binary') ||
    type.includes('bytea') ||
    type.includes('varbinary')
  ) {
    zodType = 'z.instanceof(Uint8Array)'
  }
  // Array types (PostgreSQL)
  else if (type.includes('[]') || type.includes('array')) {
    zodType = 'z.array(z.unknown())'
  }
  // Default to string for text types and unknown types
  else {
    zodType = 'z.string()'
  }

  // Handle nullable
  if (nullable) {
    zodType = `${zodType}.nullable()`
  }

  return zodType
}

/** Generates a Zod schema from column definitions */
export function generateZodSchema(tableName: string, columns: ColumnDetail[]): string {
  const schemaName = toPascalCase(tableName)
  const lines: string[] = []

  lines.push('import { z } from "zod"')
  lines.push('')
  lines.push(`export const ${schemaName}Schema = z.object({`)

  for (const col of columns) {
    const zodType = sqlTypeToZod(col.data_type, col.nullable)
    const comment = col.key ? ` // ${col.key}` : ''
    lines.push(`  ${col.name}: ${zodType},${comment}`)
  }

  lines.push('})')
  lines.push('')
  lines.push(`export type ${schemaName} = z.infer<typeof ${schemaName}Schema>`)

  return lines.join('\n')
}

/** Convert string to PascalCase */
function toPascalCase(str: string): string {
  return str
    .split(/[-_\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('')
}

/** Format JSON value for display */
export function formatValue(value: unknown): string {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (value instanceof Date) return value.toISOString()

  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

/** Check if value looks like JSON */
export function isJsonLike(value: unknown): boolean {
  if (typeof value !== 'string') return false
  const trimmed = value.trim()
  return (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  )
}

/** Try to parse and pretty-print JSON */
export function prettyPrintJson(value: string): string {
  try {
    const parsed = JSON.parse(value)
    return JSON.stringify(parsed, null, 2)
  } catch {
    return value
  }
}
