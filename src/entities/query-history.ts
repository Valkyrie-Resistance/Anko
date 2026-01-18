/** A query history entry from the backend */
export interface QueryHistoryEntry {
  id: string
  query: string
  connectionId: string
  connectionName: string
  databaseName: string | null
  executedAt: string
  executionTimeMs: number | null
  rowCount: number | null
  success: boolean
  errorMessage: string | null
}

/** Input for adding a new history entry */
export interface AddQueryHistoryInput {
  query: string
  connectionId: string
  connectionName: string
  databaseName: string | null
  executionTimeMs: number | null
  rowCount: number | null
  success: boolean
  errorMessage: string | null
}
