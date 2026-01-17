import type { ColumnInfo } from '@/types'

// Format cell value for display
export function formatCellValue(value: unknown): React.ReactNode {
  if (value === null) {
    return <span className="text-zinc-600 italic">NULL</span>
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false'
  }
  if (typeof value === 'object') {
    return JSON.stringify(value)
  }
  return String(value)
}

// Get display type for column header
export function getDisplayType(dataType: string): string {
  const typeMap: Record<string, string> = {
    'character varying': 'varchar',
    'timestamp without time zone': 'timestamp',
    'timestamp with time zone': 'timestamptz',
    integer: 'int',
    bigint: 'bigint',
    smallint: 'smallint',
    boolean: 'bool',
    'double precision': 'float8',
    real: 'float4',
  }
  const lower = dataType.toLowerCase()
  return typeMap[lower] || lower
}

// Check if column appears to be a primary key
export function isPrimaryKey(column: ColumnInfo): boolean {
  const name = column.name.toLowerCase()
  return name === 'id' || name.endsWith('_id') || name === 'pk'
}

// Row data type for TanStack Table (converted from arrays)
export type RowData = Record<string, unknown>

// Convert row arrays to objects for TanStack Table
export function convertRowsToObjects(rows: unknown[][], columns: ColumnInfo[]): RowData[] {
  return rows.map((row) => {
    const obj: RowData = {}
    columns.forEach((col, index) => {
      obj[col.name] = row[index]
    })
    return obj
  })
}
