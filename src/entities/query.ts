export interface ColumnInfo {
  name: string
  data_type: string
  nullable: boolean
}

export interface QueryResult {
  columns: ColumnInfo[]
  rows: unknown[][]
  affected_rows: number
  execution_time_ms: number
  /** Debug: original query sent from frontend */
  original_query?: string
  /** Debug: actual query executed (after adding context like USE db) */
  executed_query?: string
}

export type FilterOperator =
  | 'equals'
  | 'not_equals'
  | 'like'
  | 'not_like'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'is_null'
  | 'is_not_null'

export interface FilterCondition {
  column: string
  operator: FilterOperator
  value: string
}

// Import TableEditState - using inline import to avoid circular dependencies
import type { TableEditState } from './table-edit'

export interface QueryTab {
  id: string
  connectionId: string
  query: string
  result?: QueryResult
  isExecuting: boolean
  error?: string
  // Table browsing mode
  tableName?: string
  databaseName?: string // For PostgreSQL: the actual database name; For MySQL: the database name
  schemaName?: string // For PostgreSQL: the schema name (e.g., "public"); For MySQL: undefined
  // Pagination for table browsing
  page?: number
  pageSize?: number
  totalRows?: number
  // Table editing state (only for table browse tabs)
  editState?: TableEditState
}
