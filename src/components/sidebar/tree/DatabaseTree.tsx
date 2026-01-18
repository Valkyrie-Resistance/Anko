import {
  IconDatabase as DatabaseIcon,
  IconColumns,
  IconCopy,
  IconEye,
  IconKey,
  IconPencil,
  IconPlayerPlay,
  IconPlugConnected,
  IconRefresh,
  IconSchema,
  IconTable,
  IconTrash,
} from '@tabler/icons-react'
import { memo, useCallback, useReducer, useRef } from 'react'
import { toast } from 'sonner'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { createTimer, treeLogger } from '@/lib/debug'
import { formatErrorMessage } from '@/lib/error-utils'
import {
  disconnect,
  getColumns as fetchColumns,
  getSchemas as fetchSchemas,
  getTables as fetchTables,
  getDatabases,
} from '@/lib/tauri'
import { setsEqual } from '@/lib/utils'
import { initialTreeState, treeReducer } from '@/reducers/tree-reducer'
import { useConnectionStore } from '@/stores/connection'
import type {
  ColumnNodeProps,
  DatabaseNodeProps,
  DatabaseTreeProps,
  SchemaNodeProps,
  TableNodeProps,
} from '../definitions'
import { DatabaseTypeIcon } from './DatabaseIcons'
import { TreeNode } from './TreeNode'

export function DatabaseTree({ connection, onEdit, onDelete, onInsertText }: DatabaseTreeProps) {
  const { connectionId, info } = connection

  // Store actions - use refs to stabilize dependencies
  const setSelectedDatabaseRef = useRef(useConnectionStore.getState().setSelectedDatabase)
  const setDatabasesRef = useRef(useConnectionStore.getState().setDatabases)
  const setSchemasRef = useRef(useConnectionStore.getState().setSchemas)
  const setTablesRef = useRef(useConnectionStore.getState().setTables)
  const setColumnsRef = useRef(useConnectionStore.getState().setColumns)
  const removeActiveConnectionRef = useRef(useConnectionStore.getState().removeActiveConnection)
  const addTableTabRef = useRef(useConnectionStore.getState().addTableTab)

  // Note: Refs are initialized with getState() above and don't need updating
  // since Zustand store actions are stable references

  const schemaCache = useConnectionStore((s) => s.schemaCache[connectionId])

  // Check if PostgreSQL (has schemas)
  const isPostgreSQL = info.driver === 'postgresql'

  // Local state managed by reducer
  const [state, dispatch] = useReducer(treeReducer, initialTreeState)
  const {
    isExpanded,
    expandedDatabases,
    expandedSchemas,
    expandedTables,
    loadingDatabases,
    loadingSchemas,
    loadingTables,
    loadingColumns,
    loadedDatabases,
    loadedSchemas,
    loadedTables,
    loadedColumns,
  } = state

  // Get cached data
  const databases = schemaCache?.databases || []
  const schemasCache = schemaCache?.schemas || {}
  const tablesCache = schemaCache?.tables || {}
  const columnsCache = schemaCache?.columns || {}

  // Load databases when connection is expanded
  const loadDatabases = useCallback(async () => {
    if (loadedDatabases) return

    treeLogger.debug('loading databases', { connectionId })
    const timer = createTimer(treeLogger, 'load databases')
    dispatch({ type: 'SET_LOADING_DATABASES', loading: true })
    try {
      const dbs = await getDatabases(connectionId)
      timer.end({ count: dbs.length })
      setDatabasesRef.current(connectionId, dbs)
      dispatch({ type: 'SET_LOADED_DATABASES' })
    } catch (e) {
      timer.fail(e)
      toast.error('Failed to load databases', {
        description: formatErrorMessage(e),
      })
    } finally {
      dispatch({ type: 'SET_LOADING_DATABASES', loading: false })
    }
  }, [connectionId, loadedDatabases])

  // Load schemas for a database (PostgreSQL only)
  const loadSchemas = useCallback(
    async (database: string) => {
      if (loadedSchemas.has(database)) return

      treeLogger.debug('loading schemas', { connectionId, database })
      const timer = createTimer(treeLogger, 'load schemas')
      dispatch({ type: 'SET_LOADING_SCHEMAS', database, loading: true })
      try {
        const schms = await fetchSchemas(connectionId, database)
        timer.end({ database, count: schms.length })
        setSchemasRef.current(connectionId, database, schms)
        dispatch({ type: 'SET_LOADED_SCHEMAS', database })
      } catch (e) {
        timer.fail(e)
        toast.error('Failed to load schemas', {
          description: formatErrorMessage(e),
        })
      } finally {
        dispatch({ type: 'SET_LOADING_SCHEMAS', database, loading: false })
      }
    },
    [connectionId, loadedSchemas],
  )

  // Load tables for a schema (PostgreSQL) or database (MySQL)
  // For PostgreSQL: database is the DB name, schemaOrDb is the schema name
  // For MySQL: database is the DB name, schemaOrDb is ignored (passed as empty string)
  const loadTables = useCallback(
    async (database: string, schema: string) => {
      // For PostgreSQL: key is "database.schema", for MySQL: key is just "database"
      const cacheKey = schema ? `${database}.${schema}` : database
      if (loadedTables.has(cacheKey)) return

      treeLogger.debug('loading tables', { connectionId, database, schema })
      const timer = createTimer(treeLogger, 'load tables')
      dispatch({ type: 'SET_LOADING_TABLES', cacheKey, loading: true })
      try {
        const tbls = await fetchTables(connectionId, database, schema)
        timer.end({ schema: cacheKey, count: tbls.length })
        setTablesRef.current(connectionId, cacheKey, tbls)
        dispatch({ type: 'SET_LOADED_TABLES', cacheKey })
      } catch (e) {
        timer.fail(e)
        toast.error('Failed to load tables', {
          description: formatErrorMessage(e),
        })
      } finally {
        dispatch({ type: 'SET_LOADING_TABLES', cacheKey, loading: false })
      }
    },
    [connectionId, loadedTables],
  )

  // Load columns for a table
  // For PostgreSQL: database is the DB name, schema is the schema name
  // For MySQL: database is the DB name, schema is empty string
  const loadColumns = useCallback(
    async (database: string, schema: string, table: string) => {
      // Key includes database for proper isolation
      const key = schema ? `${database}.${schema}.${table}` : `${database}.${table}`
      if (loadedColumns.has(key)) return

      treeLogger.debug('loading columns', { connectionId, table: key })
      const timer = createTimer(treeLogger, 'load columns')
      dispatch({ type: 'SET_LOADING_COLUMNS', key, loading: true })
      try {
        const cols = await fetchColumns(connectionId, database, schema, table)
        const pkColumns = cols.filter((c) => c.key === 'PRI').map((c) => c.name)
        timer.end({ table: key, count: cols.length, primaryKeys: pkColumns })
        setColumnsRef.current(connectionId, key, cols)
        dispatch({ type: 'SET_LOADED_COLUMNS', key })
      } catch (e) {
        timer.fail(e)
        toast.error('Failed to load columns', {
          description: formatErrorMessage(e),
        })
      } finally {
        dispatch({ type: 'SET_LOADING_COLUMNS', key, loading: false })
      }
    },
    [connectionId, loadedColumns],
  )

  // Handle connection expand
  const handleConnectionClick = useCallback(() => {
    treeLogger.debug('connection node toggled', { connectionId, wasExpanded: isExpanded })
    if (!isExpanded) {
      loadDatabases()
    }
    dispatch({ type: 'TOGGLE_CONNECTION' })
  }, [isExpanded, loadDatabases, connectionId])

  // Handle database expand
  const handleDatabaseClick = useCallback(
    (database: string) => {
      const willExpand = !expandedDatabases.has(database)
      treeLogger.debug('database node toggled', { database, willExpand })
      dispatch({ type: 'TOGGLE_DATABASE', database })

      if (willExpand) {
        // For PostgreSQL, load schemas; for MySQL, load tables directly
        if (isPostgreSQL) {
          loadSchemas(database)
        } else {
          // MySQL: pass database as first param, empty string for schema
          loadTables(database, '')
        }
      }
      setSelectedDatabaseRef.current(connection.id, database)
    },
    [expandedDatabases, isPostgreSQL, loadSchemas, loadTables, connection.id],
  )

  // Handle schema expand (PostgreSQL only)
  const handleSchemaClick = useCallback(
    (database: string, schema: string) => {
      const schemaKey = `${database}.${schema}`
      const willExpand = !expandedSchemas.has(schemaKey)
      treeLogger.debug('schema node toggled', { database, schema, willExpand })
      dispatch({ type: 'TOGGLE_SCHEMA', schemaKey })

      if (willExpand) {
        // PostgreSQL: pass database and schema
        loadTables(database, schema)
      }
    },
    [expandedSchemas, loadTables],
  )

  // Handle table expand
  // For PostgreSQL: database is the DB name, schemaOrDb is the schema name
  // For MySQL: database is undefined, schemaOrDb is the DB name
  const handleTableClick = useCallback(
    (database: string, schema: string, table: string) => {
      const key = schema ? `${database}.${schema}.${table}` : `${database}.${table}`
      const willExpand = !expandedTables.has(key)
      treeLogger.debug('table node toggled', { table: key, willExpand })
      dispatch({ type: 'TOGGLE_TABLE', tableKey: key })

      if (willExpand) {
        loadColumns(database, schema, table)
      }
    },
    [expandedTables, loadColumns],
  )

  // Force refresh tables for a database/schema
  const refreshTables = useCallback(
    async (database: string, schema: string) => {
      const cacheKey = schema ? `${database}.${schema}` : database
      dispatch({ type: 'SET_LOADING_TABLES', cacheKey, loading: true })
      try {
        const tbls = await fetchTables(connectionId, database, schema)
        setTablesRef.current(connectionId, cacheKey, tbls)
      } catch (e) {
        console.error('Failed to refresh tables:', e)
        toast.error('Failed to refresh tables', {
          description: formatErrorMessage(e),
        })
      } finally {
        dispatch({ type: 'SET_LOADING_TABLES', cacheKey, loading: false })
      }
    },
    [connectionId],
  )

  // Force refresh columns for a table
  const refreshColumns = useCallback(
    async (database: string, schema: string, table: string) => {
      const key = schema ? `${database}.${schema}.${table}` : `${database}.${table}`
      dispatch({ type: 'SET_LOADING_COLUMNS', key, loading: true })
      try {
        const cols = await fetchColumns(connectionId, database, schema, table)
        setColumnsRef.current(connectionId, key, cols)
      } catch (e) {
        console.error('Failed to refresh columns:', e)
        toast.error('Failed to refresh columns', {
          description: formatErrorMessage(e),
        })
      } finally {
        dispatch({ type: 'SET_LOADING_COLUMNS', key, loading: false })
      }
    },
    [connectionId],
  )

  // Handle disconnect
  const handleDisconnect = useCallback(async () => {
    try {
      await disconnect(connectionId)
      removeActiveConnectionRef.current(connection.id)
    } catch (e) {
      console.error('Failed to disconnect:', e)
      toast.error('Failed to disconnect', {
        description: formatErrorMessage(e),
      })
    }
  }, [connectionId, connection.id])

  // Open table in new tab
  // For PostgreSQL: database is DB name, schema is schema name
  // For MySQL: database is DB name, schema is empty string
  const handleOpenTable = useCallback(
    (database: string, schema: string, table: string) => {
      // Pass database, schema (or undefined for MySQL), and table name
      addTableTabRef.current(connection.id, connectionId, database, schema || undefined, table)
    },
    [connection.id, connectionId],
  )

  return (
    <div>
      {/* Connection node */}
      <ContextMenu>
        <ContextMenuTrigger>
          <TreeNode
            label={info.name}
            secondaryLabel={`${info.host}:${info.port}`}
            icon={
              <DatabaseTypeIcon driver={info.driver} className="size-4 text-muted-foreground" />
            }
            rightIcon={<span className="size-2 rounded-full bg-green-500" title="Connected" />}
            isExpanded={isExpanded}
            isExpandable
            isLoading={loadingDatabases}
            onClick={handleConnectionClick}
            level={0}
          />
        </ContextMenuTrigger>
        <ContextMenuContent className="bg-zinc-950 border-zinc-800">
          <ContextMenuItem onClick={handleDisconnect}>
            <IconPlugConnected className="size-4 mr-2" />
            Disconnect
          </ContextMenuItem>
          {onEdit && (
            <ContextMenuItem onClick={onEdit}>
              <IconPencil className="size-4 mr-2" />
              Edit Connection
            </ContextMenuItem>
          )}
          <ContextMenuSeparator />
          {onDelete && (
            <ContextMenuItem className="text-destructive focus:text-destructive" onClick={onDelete}>
              <IconTrash className="size-4 mr-2" />
              Delete Connection
            </ContextMenuItem>
          )}
        </ContextMenuContent>
      </ContextMenu>

      {/* Databases */}
      {isExpanded && (
        <div>
          {databases.map((db) => (
            <DatabaseNode
              key={db.name}
              database={db}
              isPostgreSQL={isPostgreSQL}
              schemas={schemasCache[db.name] || []}
              tablesCache={tablesCache}
              columnsCache={columnsCache}
              isExpanded={expandedDatabases.has(db.name)}
              isLoadingSchemas={loadingSchemas.has(db.name)}
              isLoadingTables={loadingTables}
              loadingColumns={loadingColumns}
              expandedSchemas={expandedSchemas}
              expandedTables={expandedTables}
              onDatabaseClick={() => handleDatabaseClick(db.name)}
              onSchemaClick={(schema) => handleSchemaClick(db.name, schema)}
              onTableClick={(schema, table) => handleTableClick(db.name, schema, table)}
              onInsertText={onInsertText}
              onRefreshTables={(schema) => refreshTables(db.name, schema)}
              onRefreshColumns={(schema, table) => refreshColumns(db.name, schema, table)}
              onOpenTable={(schema, table) => handleOpenTable(db.name, schema, table)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

const DatabaseNode = memo(
  function DatabaseNode({
    database,
    isPostgreSQL,
    schemas,
    tablesCache,
    columnsCache,
    isExpanded,
    isLoadingSchemas,
    isLoadingTables,
    loadingColumns,
    expandedSchemas,
    expandedTables,
    onDatabaseClick,
    onSchemaClick,
    onTableClick,
    onInsertText,
    onRefreshTables,
    onRefreshColumns,
    onOpenTable,
  }: DatabaseNodeProps) {
    const handleCopyName = () => {
      navigator.clipboard.writeText(database.name)
      toast.success('Copied to clipboard')
    }

    // For PostgreSQL: show schemas under database
    // For MySQL: show tables directly under database
    // For PostgreSQL: table cache key is "database.schema", for MySQL: just "database"
    const isLoading = isPostgreSQL ? isLoadingSchemas : isLoadingTables.has(database.name)

    return (
      <ContextMenu>
        <ContextMenuTrigger>
          <TreeNode
            label={database.name}
            icon={<DatabaseIcon className="size-3.5 text-primary" />}
            isExpanded={isExpanded}
            isExpandable
            isLoading={isLoading}
            onClick={onDatabaseClick}
            onDoubleClick={() => onInsertText?.(database.name)}
            level={1}
          >
            {isPostgreSQL ? (
              // PostgreSQL: Show schemas under database
              schemas.length === 0 && !isLoadingSchemas ? (
                <div
                  className="py-1 text-[10px] text-muted-foreground"
                  style={{ paddingLeft: 2 * 12 + 8 }}
                >
                  No schemas found
                </div>
              ) : (
                schemas.map((schema) => {
                  // For PostgreSQL, cache keys are "database.schema" for tables
                  const tablesKey = `${database.name}.${schema.name}`
                  const schemaExpandedKey = `${database.name}.${schema.name}`
                  return (
                    <SchemaNode
                      key={schema.name}
                      schema={schema}
                      databaseName={database.name}
                      tables={tablesCache[tablesKey] || []}
                      columnsCache={columnsCache}
                      isExpanded={expandedSchemas.has(schemaExpandedKey)}
                      isLoadingTables={isLoadingTables.has(tablesKey)}
                      loadingColumns={loadingColumns}
                      expandedTables={expandedTables}
                      onSchemaClick={() => onSchemaClick(schema.name)}
                      onTableClick={(table) => onTableClick(schema.name, table)}
                      onInsertText={onInsertText}
                      onRefreshColumns={(table) => onRefreshColumns?.(schema.name, table)}
                      onOpenTable={(table) => onOpenTable?.(schema.name, table)}
                    />
                  )
                })
              )
            ) : // MySQL: Show tables directly under database
            (tablesCache[database.name] || []).length === 0 &&
              !isLoadingTables.has(database.name) ? (
              <div
                className="py-1 text-[10px] text-muted-foreground"
                style={{ paddingLeft: 2 * 12 + 8 }}
              >
                No tables found
              </div>
            ) : (
              (tablesCache[database.name] || []).map((table) => (
                <TableNode
                  key={table.name}
                  table={table}
                  schemaOrDbName={database.name}
                  columns={columnsCache[`${database.name}.${table.name}`] || []}
                  isExpanded={expandedTables.has(`${database.name}.${table.name}`)}
                  isLoading={loadingColumns.has(`${database.name}.${table.name}`)}
                  onClick={() => onTableClick('', table.name)}
                  onInsertText={onInsertText}
                  onRefreshColumns={() => onRefreshColumns?.('', table.name)}
                  onOpenTable={() => onOpenTable?.('', table.name)}
                  level={2}
                />
              ))
            )}
          </TreeNode>
        </ContextMenuTrigger>
        <ContextMenuContent className="bg-zinc-950 border-zinc-800">
          <ContextMenuItem onClick={handleCopyName}>
            <IconCopy className="size-4 mr-2" />
            Copy Name
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={() => onRefreshTables?.('')}>
            <IconRefresh className="size-4 mr-2" />
            Refresh Tables
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    )
  },
  (prev, next) => {
    // Custom comparison to prevent unnecessary re-renders
    return (
      prev.database.name === next.database.name &&
      prev.isPostgreSQL === next.isPostgreSQL &&
      prev.isExpanded === next.isExpanded &&
      prev.isLoadingSchemas === next.isLoadingSchemas &&
      prev.schemas === next.schemas &&
      prev.tablesCache === next.tablesCache &&
      prev.columnsCache === next.columnsCache &&
      setsEqual(prev.isLoadingTables, next.isLoadingTables) &&
      setsEqual(prev.loadingColumns, next.loadingColumns) &&
      setsEqual(prev.expandedSchemas, next.expandedSchemas) &&
      setsEqual(prev.expandedTables, next.expandedTables) &&
      prev.onDatabaseClick === next.onDatabaseClick &&
      prev.onSchemaClick === next.onSchemaClick &&
      prev.onTableClick === next.onTableClick &&
      prev.onInsertText === next.onInsertText &&
      prev.onRefreshTables === next.onRefreshTables &&
      prev.onRefreshColumns === next.onRefreshColumns &&
      prev.onOpenTable === next.onOpenTable
    )
  },
)

// Schema node for PostgreSQL (level 2 - between database and tables)
const SchemaNode = memo(
  function SchemaNode({
    schema,
    databaseName,
    tables,
    columnsCache,
    isExpanded,
    isLoadingTables,
    loadingColumns,
    expandedTables,
    onSchemaClick,
    onTableClick,
    onInsertText,
    onRefreshColumns,
    onOpenTable,
  }: SchemaNodeProps) {
    const handleCopyName = () => {
      navigator.clipboard.writeText(schema.name)
      toast.success('Copied to clipboard')
    }

    return (
      <ContextMenu>
        <ContextMenuTrigger>
          <TreeNode
            label={schema.name}
            icon={<IconSchema className="size-3.5 text-primary/80" />}
            isExpanded={isExpanded}
            isExpandable
            isLoading={isLoadingTables}
            onClick={onSchemaClick}
            onDoubleClick={() => onInsertText?.(schema.name)}
            level={2}
          >
            {tables.length === 0 && !isLoadingTables ? (
              <div
                className="py-1 text-[10px] text-muted-foreground"
                style={{ paddingLeft: 3 * 12 + 8 }}
              >
                No tables found
              </div>
            ) : (
              tables.map((table) => {
                // For PostgreSQL: keys are "database.schema.table" for columns and expandedTables
                const tableKey = `${databaseName}.${schema.name}.${table.name}`
                return (
                  <TableNode
                    key={table.name}
                    table={table}
                    schemaOrDbName={schema.name}
                    columns={columnsCache[`${databaseName}.${schema.name}.${table.name}`] || []}
                    isExpanded={expandedTables.has(tableKey)}
                    isLoading={loadingColumns.has(`${databaseName}.${schema.name}.${table.name}`)}
                    onClick={() => onTableClick(table.name)}
                    onInsertText={onInsertText}
                    onRefreshColumns={() => onRefreshColumns?.(table.name)}
                    onOpenTable={() => onOpenTable?.(table.name)}
                    level={3}
                  />
                )
              })
            )}
          </TreeNode>
        </ContextMenuTrigger>
        <ContextMenuContent className="bg-zinc-950 border-zinc-800">
          <ContextMenuItem onClick={handleCopyName}>
            <IconCopy className="size-4 mr-2" />
            Copy Name
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    )
  },
  (prev, next) => {
    // Custom comparison to prevent unnecessary re-renders
    return (
      prev.schema.name === next.schema.name &&
      prev.databaseName === next.databaseName &&
      prev.isExpanded === next.isExpanded &&
      prev.isLoadingTables === next.isLoadingTables &&
      prev.tables === next.tables &&
      prev.columnsCache === next.columnsCache &&
      setsEqual(prev.loadingColumns, next.loadingColumns) &&
      setsEqual(prev.expandedTables, next.expandedTables) &&
      prev.onSchemaClick === next.onSchemaClick &&
      prev.onTableClick === next.onTableClick &&
      prev.onInsertText === next.onInsertText &&
      prev.onRefreshColumns === next.onRefreshColumns &&
      prev.onOpenTable === next.onOpenTable
    )
  },
)

const TableNode = memo(
  function TableNode({
    table,
    schemaOrDbName,
    columns,
    isExpanded,
    isLoading,
    onClick,
    onInsertText,
    onRefreshColumns,
    onOpenTable,
    level = 2,
  }: TableNodeProps) {
    const isView = table.table_type === 'VIEW'

    const handleCopyName = () => {
      navigator.clipboard.writeText(table.name)
      toast.success('Copied to clipboard')
    }

    const handleCopyFullName = () => {
      navigator.clipboard.writeText(`${schemaOrDbName}.${table.name}`)
      toast.success('Copied to clipboard')
    }

    const handleCopySelectQuery = () => {
      navigator.clipboard.writeText(`SELECT * FROM ${schemaOrDbName}.${table.name} LIMIT 100;`)
      toast.success('Copied SELECT query')
    }

    return (
      <ContextMenu>
        <ContextMenuTrigger>
          <TreeNode
            label={table.name}
            secondaryLabel={table.row_count != null ? table.row_count.toLocaleString() : undefined}
            icon={
              isView ? (
                <IconEye className="size-3.5 text-primary/70" />
              ) : (
                <IconTable className="size-3.5 text-primary/80" />
              )
            }
            isExpanded={isExpanded}
            isExpandable
            isLoading={isLoading}
            onClick={onClick}
            onDoubleClick={onOpenTable}
            level={level}
          >
            {columns.map((col) => (
              <ColumnNode
                key={col.name}
                column={col}
                onClick={() => onInsertText?.(col.name)}
                level={level + 1}
              />
            ))}
          </TreeNode>
        </ContextMenuTrigger>
        <ContextMenuContent className="bg-zinc-950 border-zinc-800">
          <ContextMenuItem onClick={onOpenTable}>
            <IconTable className="size-4 mr-2" />
            Open Table
          </ContextMenuItem>
          <ContextMenuItem onClick={handleCopySelectQuery}>
            <IconPlayerPlay className="size-4 mr-2" />
            Copy SELECT Query
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={handleCopyName}>
            <IconCopy className="size-4 mr-2" />
            Copy Name
          </ContextMenuItem>
          <ContextMenuItem onClick={handleCopyFullName}>
            <IconCopy className="size-4 mr-2" />
            Copy Full Name
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={onRefreshColumns}>
            <IconRefresh className="size-4 mr-2" />
            Refresh Columns
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    )
  },
  (prev, next) => {
    // Custom comparison to prevent unnecessary re-renders
    return (
      prev.table.name === next.table.name &&
      prev.table.table_type === next.table.table_type &&
      prev.table.row_count === next.table.row_count &&
      prev.schemaOrDbName === next.schemaOrDbName &&
      prev.isExpanded === next.isExpanded &&
      prev.isLoading === next.isLoading &&
      prev.level === next.level &&
      prev.columns === next.columns &&
      prev.onClick === next.onClick &&
      prev.onInsertText === next.onInsertText &&
      prev.onRefreshColumns === next.onRefreshColumns &&
      prev.onOpenTable === next.onOpenTable
    )
  },
)

const ColumnNode = memo(
  function ColumnNode({ column, onClick, level = 3 }: ColumnNodeProps) {
    const isPrimaryKey = column.key === 'PRI'

    return (
      <TreeNode
        label={column.name}
        secondaryLabel={`${column.data_type}${column.nullable ? '' : ' *'}`}
        icon={
          isPrimaryKey ? (
            <IconKey className="size-3 text-primary" />
          ) : (
            <IconColumns className="size-3 text-primary/50" />
          )
        }
        onClick={onClick}
        level={level}
      />
    )
  },
  (prev, next) => {
    // Custom comparison to prevent unnecessary re-renders
    return (
      prev.column.name === next.column.name &&
      prev.column.data_type === next.column.data_type &&
      prev.column.nullable === next.column.nullable &&
      prev.column.key === next.column.key &&
      prev.level === next.level &&
      prev.onClick === next.onClick
    )
  },
)
