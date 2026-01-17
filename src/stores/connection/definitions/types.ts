import type {
  ActiveConnection,
  ColumnDetail,
  ConnectionInfo,
  PendingRowChange,
  QueryResult,
  QueryTab,
  SchemaInfo,
  TableInfo,
} from '@/types'

export interface SchemaCache {
  databases: SchemaInfo[]
  schemas: Record<string, SchemaInfo[]> // For PostgreSQL: database -> schemas
  tables: Record<string, TableInfo[]> // "database.schema" -> tables (or just "database" for MySQL)
  columns: Record<string, ColumnDetail[]> // "database.schema.table" -> columns
}

export const DEFAULT_SCHEMA_CACHE: SchemaCache = {
  databases: [],
  schemas: {},
  tables: {},
  columns: {},
}

export interface ConnectionStore {
  // Saved connections
  savedConnections: ConnectionInfo[]
  setSavedConnections: (connections: ConnectionInfo[]) => void
  addSavedConnection: (connection: ConnectionInfo) => void
  removeSavedConnection: (id: string) => void

  // Active connections (connected)
  activeConnections: ActiveConnection[]
  addActiveConnection: (connection: ActiveConnection) => void
  removeActiveConnection: (id: string) => void
  setSelectedDatabase: (connectionId: string, database: string) => void

  // Schema cache
  schemaCache: Record<string, SchemaCache>
  setDatabases: (connectionId: string, databases: SchemaInfo[]) => void
  setSchemas: (connectionId: string, database: string, schemas: SchemaInfo[]) => void
  getSchemas: (connectionId: string, database: string) => SchemaInfo[]
  setTables: (connectionId: string, key: string, tables: TableInfo[]) => void
  getTables: (connectionId: string, key: string) => TableInfo[]
  setColumns: (connectionId: string, key: string, columns: ColumnDetail[]) => void
  getColumns: (connectionId: string, key: string) => ColumnDetail[]
  clearSchemaCache: (connectionId: string) => void
  clearAllSchemaCache: () => void
  getSchemaContext: (connectionId: string) => SchemaCache | undefined

  // Current active tab
  activeTabId: string | null
  setActiveTabId: (id: string | null) => void

  // Query tabs
  queryTabs: QueryTab[]
  queryTabsById: Map<string, QueryTab> // Indexed structure for O(1) lookups
  getQueryTab: (tabId: string) => QueryTab | undefined // Helper selector for O(1) access
  addQueryTab: (tab: QueryTab) => void
  addTableTab: (
    connectionId: string,
    runtimeConnectionId: string,
    database: string,
    schema: string | undefined,
    table: string,
  ) => void
  removeQueryTab: (id: string) => void
  reorderQueryTabs: (fromIndex: number, toIndex: number) => void
  renameQueryTab: (tabId: string, customName: string | undefined) => void
  updateQueryTab: (id: string, updates: Partial<QueryTab>) => void
  setQueryResult: (tabId: string, result: QueryResult) => void
  setQueryError: (tabId: string, error: string) => void
  setQueryExecuting: (tabId: string, executing: boolean) => void
  setTablePage: (tabId: string, page: number) => void
  setTableTotalRows: (tabId: string, totalRows: number) => void

  // Table editing actions
  initTableEditState: (tabId: string, primaryKeyColumns: string[]) => void
  setEditMode: (tabId: string, enabled: boolean) => void
  addCellEdit: (
    tabId: string,
    rowIndex: number,
    primaryKeyValues: Record<string, unknown>,
    columnName: string,
    originalValue: unknown,
    newValue: unknown,
    originalRow: Record<string, unknown>,
  ) => void
  addNewRow: (tabId: string, newRow: Record<string, unknown>) => void
  markRowForDeletion: (
    tabId: string,
    rowIndex: number,
    primaryKeyValues: Record<string, unknown>,
    originalRow: Record<string, unknown>,
  ) => void
  removeChange: (tabId: string, changeId: string) => void
  discardAllChanges: (tabId: string) => void
  setCommitting: (tabId: string, committing: boolean) => void
  setCommitError: (tabId: string, error?: string) => void
  clearPendingChanges: (tabId: string) => void
  hasPendingChanges: (tabId: string) => boolean
  getPendingChanges: (tabId: string) => PendingRowChange[]
  updateNewRowCell: (tabId: string, changeId: string, columnName: string, newValue: unknown) => void
}
