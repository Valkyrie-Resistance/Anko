import { IconDatabase, IconServer } from '@tabler/icons-react'
import { ChevronDown, ChevronRight, Loader2Icon, PlayIcon } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createTimer, editorLogger } from '@/lib/debug'
import { formatErrorMessage } from '@/lib/error-utils'
import { addQueryHistory, executeQuery, getDatabases } from '@/lib/tauri'
import { useConnectionStore } from '@/stores/connection'
import { useQueryHistoryStore } from '@/stores/query-history'
import { useWorkspaceStore } from '@/stores/workspace'
import { SQLEditor } from './SQLEditor'
import type { SchemaContext } from './sql-autocomplete'

interface QueryEditorProps {
  tabId: string
}

export function QueryEditor({ tabId }: QueryEditorProps) {
  // Data selectors (these are stable object references from store)
  const queryTabs = useConnectionStore((s) => s.queryTabs)
  const activeConnections = useConnectionStore((s) => s.activeConnections)
  const schemaCache = useConnectionStore((s) => s.schemaCache)
  const workspaces = useWorkspaceStore((s) => s.workspaces)
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId)

  // Refs for store actions (prevents infinite re-renders)
  const updateQueryTabRef = useRef(useConnectionStore.getState().updateQueryTab)
  const setQueryResultRef = useRef(useConnectionStore.getState().setQueryResult)
  const setQueryErrorRef = useRef(useConnectionStore.getState().setQueryError)
  const setQueryExecutingRef = useRef(useConnectionStore.getState().setQueryExecuting)
  const setSelectedDatabaseRef = useRef(useConnectionStore.getState().setSelectedDatabase)
  const setDatabasesRef = useRef(useConnectionStore.getState().setDatabases)
  const addHistoryEntryRef = useRef(useQueryHistoryStore.getState().addEntry)

  // Note: Refs are initialized with getState() above and don't need updating
  // since Zustand store actions are stable references

  // Derive tab and connection from stable selectors
  const tab = useMemo(() => queryTabs.find((t) => t.id === tabId), [queryTabs, tabId])
  const connection = useMemo(
    () => activeConnections.find((c) => c.id === tab?.connectionId),
    [activeConnections, tab?.connectionId]
  )
  const workspace = useMemo(
    () => workspaces.find((w) => w.id === activeWorkspaceId),
    [workspaces, activeWorkspaceId]
  )

  const connectionId = connection?.connectionId
  const connectionInfoId = connection?.id
  const selectedDatabase = connection?.selectedDatabase
  const schemaCacheForConnection = connectionId ? schemaCache[connectionId] : undefined

  // Get databases list
  const databases = useMemo(() => {
    return schemaCacheForConnection?.databases || []
  }, [schemaCacheForConnection])

  // Get schema context for autocomplete
  const schema: SchemaContext | undefined = useMemo(() => {
    if (!schemaCacheForConnection) return undefined
    return {
      databases: schemaCacheForConnection.databases,
      tables: schemaCacheForConnection.tables,
      columns: schemaCacheForConnection.columns,
    }
  }, [schemaCacheForConnection])

  // Load databases if not cached
  useEffect(() => {
    if (!connectionId || !connectionInfoId) return

    const hasDatabases =
      schemaCacheForConnection?.databases && schemaCacheForConnection.databases.length > 0

    if (hasDatabases) {
      editorLogger.debug('databases cache hit', { connectionId, count: schemaCacheForConnection.databases.length })
      return
    }

    editorLogger.debug('databases cache miss, loading', { connectionId })
    const timer = createTimer(editorLogger, 'load databases')

    getDatabases(connectionId)
      .then((dbs) => {
        timer.end({ count: dbs.length })
        setDatabasesRef.current(connectionId, dbs)
        // Auto-select first database if none selected
        if (!selectedDatabase && dbs.length > 0) {
          setSelectedDatabaseRef.current(connectionInfoId, dbs[0].name)
        }
      })
      .catch((e) => {
        timer.fail(e)
        toast.error('Failed to load databases', { description: formatErrorMessage(e) })
      })
  }, [connectionId, connectionInfoId, selectedDatabase, schemaCacheForConnection])

  // Handle database change
  const handleDatabaseChange = useCallback(
    (database: string) => {
      if (connectionInfoId) {
        editorLogger.debug('database changed', { connectionInfoId, database })
        setSelectedDatabaseRef.current(connectionInfoId, database)
      }
    },
    [connectionInfoId],
  )

  // Handle connection change
  const handleConnectionChange = useCallback(
    (newConnectionInfoId: string) => {
      updateQueryTabRef.current(tabId, { connectionId: newConnectionInfoId })
    },
    [tabId],
  )

  // Use ref for query to avoid re-creating handleExecute on every keystroke
  const queryRef = useRef(tab?.query)
  useEffect(() => {
    queryRef.current = tab?.query
  }, [tab?.query])

  // Store connection info for history logging
  const connectionName = connection?.info.name ?? ''

  const handleExecute = useCallback(async () => {
    const query = queryRef.current
    if (!query?.trim() || !connectionId || !connectionInfoId) return

    editorLogger.debug('executing query', { tabId, connectionId, database: selectedDatabase, queryLength: query.length })
    const timer = createTimer(editorLogger, 'query execution')
    const startTime = performance.now()
    setQueryExecutingRef.current(tabId, true)

    try {
      const result = await executeQuery(connectionId, query, selectedDatabase)
      setQueryResultRef.current(tabId, result)
      const rowCount = result.rows?.length ?? 0
      const executionTimeMs = Math.round(performance.now() - startTime)
      timer.end({ rowCount, executionTimeMs: result.execution_time_ms })

      // Log to history
      addQueryHistory({
        query: query.trim(),
        connectionId: connectionInfoId,
        connectionName,
        databaseName: selectedDatabase ?? null,
        executionTimeMs,
        rowCount,
        success: true,
        errorMessage: null,
      }).then((entry) => {
        addHistoryEntryRef.current(entry)
      }).catch((e) => {
        editorLogger.warn('Failed to log query to history', e)
      })

      toast.success('Query executed', {
        description: `${rowCount} row${rowCount !== 1 ? 's' : ''} returned`,
      })
    } catch (e) {
      timer.fail(e)
      const executionTimeMs = Math.round(performance.now() - startTime)
      const errorMessage = formatErrorMessage(e)
      setQueryErrorRef.current(tabId, errorMessage)

      // Log failed query to history
      addQueryHistory({
        query: query.trim(),
        connectionId: connectionInfoId,
        connectionName,
        databaseName: selectedDatabase ?? null,
        executionTimeMs,
        rowCount: null,
        success: false,
        errorMessage,
      }).then((entry) => {
        addHistoryEntryRef.current(entry)
      }).catch((err) => {
        editorLogger.warn('Failed to log query to history', err)
      })

      toast.error('Query failed', {
        description: errorMessage,
      })
    }
  }, [connectionId, connectionInfoId, connectionName, tabId, selectedDatabase])

  const handleChange = useCallback(
    (value: string) => {
      updateQueryTabRef.current(tabId, { query: value })
    },
    [tabId],
  )

  if (!tab || !connection) return null

  return (
    <div className="flex flex-col h-full bg-black">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-900 bg-zinc-950">
        {/* Left: Breadcrumbs */}
        <div className="flex items-center gap-1 text-xs">
          {/* Workspace */}
          <span className={workspace?.name ? 'text-zinc-400' : 'text-zinc-600'}>
            {workspace?.name || '—'}
          </span>

          <ChevronRight className="size-3 text-zinc-600" />

          {/* Connection selector */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className="flex items-center gap-1.5 px-2 py-1 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-900 rounded transition-colors"
              render={<button type="button" />}
            >
              <IconServer className="size-3.5 text-emerald-500" />
              <span className={connection.info.name ? 'text-zinc-300' : 'text-zinc-600'}>
                {connection.info.name || '—'}
              </span>
              {connection.info.host && (
                <span className="text-zinc-600">({connection.info.host})</span>
              )}
              <ChevronDown className="size-3 text-zinc-500" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="bg-zinc-950 border-zinc-800 max-h-64 overflow-y-auto"
            >
              {activeConnections.length === 0 ? (
                <DropdownMenuItem disabled className="text-xs text-zinc-500">
                  No active connections
                </DropdownMenuItem>
              ) : (
                activeConnections.map((conn) => (
                  <DropdownMenuItem
                    key={conn.id}
                    onClick={() => handleConnectionChange(conn.id)}
                    className="text-xs text-zinc-300 focus:bg-zinc-800 focus:text-zinc-200"
                  >
                    <IconServer className="size-3.5 mr-2 text-emerald-500/70" />
                    <span>{conn.info.name}</span>
                    <span className="text-zinc-600 ml-1">({conn.info.host})</span>
                    {conn.id === connectionInfoId && (
                      <span className="ml-auto text-emerald-500">●</span>
                    )}
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <ChevronRight className="size-3 text-zinc-600" />

          {/* Database selector */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className="flex items-center gap-1.5 px-2 py-1 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-900 rounded transition-colors"
              render={<button type="button" />}
            >
              <IconDatabase className="size-3.5 text-primary" />
              <span className={selectedDatabase ? 'text-zinc-300' : 'text-zinc-600'}>
                {selectedDatabase || '—'}
              </span>
              <ChevronDown className="size-3 text-zinc-500" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="bg-zinc-950 border-zinc-800 max-h-64 overflow-y-auto"
            >
              {databases.length === 0 ? (
                <DropdownMenuItem disabled className="text-xs text-zinc-500">
                  No databases available
                </DropdownMenuItem>
              ) : (
                databases.map((db) => (
                  <DropdownMenuItem
                    key={db.name}
                    onClick={() => handleDatabaseChange(db.name)}
                    className="text-xs text-zinc-300 focus:bg-zinc-800 focus:text-zinc-200"
                  >
                    <IconDatabase className="size-3.5 mr-2 text-primary/70" />
                    {db.name}
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  size="sm"
                  onClick={handleExecute}
                  disabled={tab.isExecuting || !tab.query.trim()}
                  className="h-7 px-3 gap-1 bg-primary hover:bg-primary/90 text-primary-foreground text-xs"
                >
                  {tab.isExecuting ? (
                    <Loader2Icon className="size-3.5 animate-spin" />
                  ) : (
                    <>
                      <PlayIcon className="size-3" />
                      Run
                    </>
                  )}
                  <ChevronDown className="size-3 ml-0.5" />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="bg-zinc-950 border-zinc-800">
              <DropdownMenuItem
                onClick={handleExecute}
                className="text-xs text-zinc-300 focus:bg-zinc-800 focus:text-zinc-200"
              >
                <PlayIcon className="size-3.5 mr-2" />
                Run All
              </DropdownMenuItem>
              <DropdownMenuItem className="text-xs text-zinc-300 focus:bg-zinc-800 focus:text-zinc-200">
                <PlayIcon className="size-3.5 mr-2" />
                Run Selected
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 min-h-0">
        <SQLEditor
          value={tab.query}
          onChange={handleChange}
          onExecute={handleExecute}
          driver={connection.info.driver}
          selectedDatabase={selectedDatabase}
          schema={schema}
        />
      </div>
    </div>
  )
}
