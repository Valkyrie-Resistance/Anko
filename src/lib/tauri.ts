import { invoke } from '@tauri-apps/api/core'
import type {
  AddQueryHistoryInput,
  ColumnDetail,
  ConnectionConfig,
  ConnectionInfo,
  CreateSavedQueryInput,
  QueryHistoryEntry,
  QueryResult,
  SavedQuery,
  SchemaInfo,
  TableInfo,
  UpdateSavedQueryInput,
  Workspace,
  WorkspaceConfig,
} from '@/types'
import { tauriLogger } from './debug'

/**
 * Tracked invoke wrapper that logs command name, params, and duration.
 */
async function trackedInvoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  const startTime = performance.now()
  tauriLogger.debug(`Invoking: ${command}`, args)

  try {
    const result = await invoke<T>(command, args)
    const duration = Math.round(performance.now() - startTime)
    tauriLogger.info(`${command} completed in ${duration}ms`)
    return result
  } catch (error) {
    const duration = Math.round(performance.now() - startTime)
    tauriLogger.error(`${command} failed after ${duration}ms:`, error)
    throw error
  }
}

// Connection commands
export async function connect(config: ConnectionConfig): Promise<string> {
  return trackedInvoke<string>('connect', { config })
}

export async function disconnect(connectionId: string): Promise<void> {
  return trackedInvoke<void>('disconnect', { connectionId })
}

export async function testConnection(config: ConnectionConfig): Promise<boolean> {
  return trackedInvoke<boolean>('test_connection', { config })
}

// Query commands
export async function executeQuery(
  connectionId: string,
  query: string,
  database?: string,
  context?: string,
): Promise<QueryResult> {
  // database: For PostgreSQL, the database name to connect to
  // context: For PostgreSQL, the schema (search_path); For MySQL, the database to USE
  return trackedInvoke<QueryResult>('execute_query', {
    connectionId,
    query,
    database,
    context,
  })
}

// Schema commands
export async function getDatabases(connectionId: string): Promise<SchemaInfo[]> {
  const result = await trackedInvoke<SchemaInfo[]>('get_databases', { connectionId })
  tauriLogger.debug(
    `getDatabases returned ${result.length} databases:`,
    result.map((d) => d.name),
  )
  return result
}

export async function getSchemas(connectionId: string, database: string): Promise<SchemaInfo[]> {
  const result = await trackedInvoke<SchemaInfo[]>('get_schemas', { connectionId, database })
  tauriLogger.debug(
    `getSchemas returned ${result.length} schemas for ${database}:`,
    result.map((s) => s.name),
  )
  return result
}

export async function getTables(
  connectionId: string,
  database: string,
  schema: string,
): Promise<TableInfo[]> {
  const result = await trackedInvoke<TableInfo[]>('get_tables', { connectionId, database, schema })
  tauriLogger.debug(
    `getTables returned ${result.length} tables for ${database}.${schema}:`,
    result.map((t) => t.name),
  )
  return result
}

export async function getColumns(
  connectionId: string,
  database: string,
  schema: string,
  table: string,
): Promise<ColumnDetail[]> {
  const result = await trackedInvoke<ColumnDetail[]>('get_columns', {
    connectionId,
    database,
    schema,
    table,
  })
  tauriLogger.debug(
    `getColumns returned ${result.length} columns for ${database}.${schema}.${table}:`,
    result.map((c) => c.name),
  )
  return result
}

// Storage commands
export async function saveConnection(config: ConnectionConfig): Promise<ConnectionInfo> {
  return trackedInvoke<ConnectionInfo>('save_connection', { config })
}

export async function updateConnection(id: string, config: ConnectionConfig): Promise<void> {
  return trackedInvoke<void>('update_connection', { id, config })
}

export async function listConnections(): Promise<ConnectionInfo[]> {
  return trackedInvoke<ConnectionInfo[]>('list_connections')
}

export async function deleteConnection(id: string): Promise<void> {
  return trackedInvoke<void>('delete_connection', { id })
}

export async function getConnectionConfig(id: string): Promise<ConnectionConfig> {
  return trackedInvoke<ConnectionConfig>('get_connection_config', { id })
}

// Workspace commands
export async function listWorkspaces(): Promise<Workspace[]> {
  return trackedInvoke<Workspace[]>('list_workspaces')
}

export async function createWorkspace(config: WorkspaceConfig): Promise<Workspace> {
  return trackedInvoke<Workspace>('create_workspace', { config })
}

export async function updateWorkspace(id: string, config: WorkspaceConfig): Promise<Workspace> {
  return trackedInvoke<Workspace>('update_workspace', { id, config })
}

export async function deleteWorkspace(id: string): Promise<void> {
  return trackedInvoke<void>('delete_workspace', { id })
}

export async function addConnectionToWorkspace(
  workspaceId: string,
  connectionId: string,
): Promise<void> {
  return trackedInvoke<void>('add_connection_to_workspace', { workspaceId, connectionId })
}

export async function removeConnectionFromWorkspace(
  workspaceId: string,
  connectionId: string,
): Promise<void> {
  return trackedInvoke<void>('remove_connection_from_workspace', { workspaceId, connectionId })
}

export async function moveConnectionBetweenWorkspaces(
  connectionId: string,
  fromWorkspaceId: string,
  toWorkspaceId: string,
): Promise<void> {
  return trackedInvoke<void>('move_connection_between_workspaces', {
    connectionId,
    fromWorkspaceId,
    toWorkspaceId,
  })
}

// Query History commands
export async function addQueryHistory(input: AddQueryHistoryInput): Promise<QueryHistoryEntry> {
  return trackedInvoke<QueryHistoryEntry>('add_query_history', { input })
}

export async function listQueryHistory(
  connectionId?: string,
  limit?: number,
): Promise<QueryHistoryEntry[]> {
  return trackedInvoke<QueryHistoryEntry[]>('list_query_history', { connectionId, limit })
}

export async function deleteQueryHistory(id: string): Promise<void> {
  return trackedInvoke<void>('delete_query_history', { id })
}

export async function clearQueryHistory(): Promise<void> {
  return trackedInvoke<void>('clear_query_history')
}

// Saved Queries commands
export async function createSavedQuery(input: CreateSavedQueryInput): Promise<SavedQuery> {
  return trackedInvoke<SavedQuery>('create_saved_query', { input })
}

export async function listSavedQueries(workspaceId?: string): Promise<SavedQuery[]> {
  return trackedInvoke<SavedQuery[]>('list_saved_queries', { workspaceId })
}

export async function updateSavedQuery(id: string, input: UpdateSavedQueryInput): Promise<SavedQuery> {
  return trackedInvoke<SavedQuery>('update_saved_query', { id, input })
}

export async function deleteSavedQuery(id: string): Promise<void> {
  return trackedInvoke<void>('delete_saved_query', { id })
}

// Dev tools commands
export async function clearAllData(): Promise<void> {
  return trackedInvoke<void>('clear_all_data')
}
