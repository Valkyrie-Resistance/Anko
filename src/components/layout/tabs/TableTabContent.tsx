import {
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { DataTable } from '@/components/results/DataTable'
import { FilterBar } from '@/components/results/FilterBar'
import { ResultsTable } from '@/components/results/ResultsTable'
import { Button } from '@/components/ui/button'
import { createTimer, tableLogger } from '@/lib/debug'
import { formatErrorMessage } from '@/lib/error-utils'
import { generateCommitSQL, quoteIdentifier } from '@/lib/sql-generator'
import { executeQuery, getColumns } from '@/lib/tauri'
import { ensureMinimumToastDuration } from '@/lib/toast-utils'
import { cn } from '@/lib/utils'
import { useConnectionStore } from '@/stores/connection'
import { useRightSidebarStore } from '@/stores/right-sidebar'
import type { DatabaseDriver, FilterCondition } from '@/types'
import { UnsavedChangesDialog } from './UnsavedChangesDialog'

interface TableTabContentProps {
  tabId: string
}

const PAGE_SIZE = 100

/**
 * Validates and sanitizes a column name to prevent SQL injection.
 * Only allows alphanumeric characters, underscores, and dollar signs.
 * Rejects backticks, quotes, or other special SQL characters.
 */
function sanitizeColumnName(column: string): string | null {
  // Column names should only contain alphanumeric, underscore, or $ (for some DBs)
  // This prevents SQL injection via malicious column names
  const validPattern = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/
  if (!validPattern.test(column)) {
    console.warn(`[SQL] Invalid column name rejected: ${column}`)
    return null
  }
  return column
}

function buildWhereClause(filters: FilterCondition[], driver?: DatabaseDriver): string {
  if (filters.length === 0) return ''

  const conditions = filters
    .map((f): string | null => {
      const sanitizedColumn = sanitizeColumnName(f.column)
      if (!sanitizedColumn) {
        return null // Skip invalid column names
      }
      const quotedColumn = quoteIdentifier(sanitizedColumn, driver)
      const escapedValue = f.value.replace(/'/g, "''")
      switch (f.operator) {
        case 'equals':
          return `${quotedColumn} = '${escapedValue}'`
        case 'not_equals':
          return `${quotedColumn} != '${escapedValue}'`
        case 'like':
          return `${quotedColumn} LIKE '%${escapedValue}%'`
        case 'not_like':
          return `${quotedColumn} NOT LIKE '%${escapedValue}%'`
        case 'gt':
          return `${quotedColumn} > '${escapedValue}'`
        case 'gte':
          return `${quotedColumn} >= '${escapedValue}'`
        case 'lt':
          return `${quotedColumn} < '${escapedValue}'`
        case 'lte':
          return `${quotedColumn} <= '${escapedValue}'`
        case 'is_null':
          return `${quotedColumn} IS NULL`
        case 'is_not_null':
          return `${quotedColumn} IS NOT NULL`
        default:
          return null
      }
    })
    .filter((c): c is string => c !== null)

  if (conditions.length === 0) return ''
  return `WHERE ${conditions.join(' AND ')}`
}

export function TableTabContent({ tabId }: TableTabContentProps) {
  // Select tab directly from array - more stable than function call
  const tab = useConnectionStore((s) => s.queryTabs.find((t) => t.id === tabId))
  const activeConnections = useConnectionStore((s) => s.activeConnections)

  // Store actions - use refs to stabilize dependencies
  const setQueryResultRef = useRef(useConnectionStore.getState().setQueryResult)
  const setQueryErrorRef = useRef(useConnectionStore.getState().setQueryError)
  const setQueryExecutingRef = useRef(useConnectionStore.getState().setQueryExecuting)
  const setTablePageRef = useRef(useConnectionStore.getState().setTablePage)
  const setTableTotalRowsRef = useRef(useConnectionStore.getState().setTableTotalRows)
  const initTableEditStateRef = useRef(useConnectionStore.getState().initTableEditState)
  const setEditModeRef = useRef(useConnectionStore.getState().setEditMode)
  const addCellEditRef = useRef(useConnectionStore.getState().addCellEdit)
  const addNewRowRef = useRef(useConnectionStore.getState().addNewRow)
  const markRowForDeletionRef = useRef(useConnectionStore.getState().markRowForDeletion)
  const removeChangeRef = useRef(useConnectionStore.getState().removeChange)
  const updateNewRowCellRef = useRef(useConnectionStore.getState().updateNewRowCell)
  const discardAllChangesRef = useRef(useConnectionStore.getState().discardAllChanges)
  const setCommittingRef = useRef(useConnectionStore.getState().setCommitting)
  const setCommitErrorRef = useRef(useConnectionStore.getState().setCommitError)
  const clearPendingChangesRef = useRef(useConnectionStore.getState().clearPendingChanges)
  const showTableDetailsRef = useRef(useRightSidebarStore.getState().showTableDetails)

  // Note: Refs are initialized with getState() above and don't need updating
  // since Zustand store actions are stable references

  const connectionId = tab?.connectionId
  const connection = useMemo(
    () => (connectionId ? activeConnections.find((c) => c.id === connectionId) : null),
    [connectionId, activeConnections],
  )

  const [filters, setFilters] = useState<FilterCondition[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null)
  const [hasLoaded, setHasLoaded] = useState(false)

  // Use ref for filters to stabilize callbacks
  const filtersRef = useRef(filters)
  useEffect(() => {
    filtersRef.current = filters
  }, [filters])

  // Derived state from tab - memoized to prevent unnecessary recalculations
  const pendingChanges = useMemo(
    () => tab?.editState?.pendingChanges ?? [],
    [tab?.editState?.pendingChanges],
  )
  const editState = tab?.editState
  const hasChanges = pendingChanges.length > 0
  const primaryKeyColumns = useMemo(
    () => editState?.primaryKeyColumns ?? [],
    [editState?.primaryKeyColumns],
  )
  const canEdit = primaryKeyColumns.length > 0
  const isEditMode = editState?.isEditMode ?? false

  // Extract stable primitive values for useEffect dependencies
  const tableName = tab?.tableName
  const databaseName = tab?.databaseName
  const schemaName = tab?.schemaName
  const runtimeConnectionId = connection?.connectionId
  const driver = connection?.info.driver

  // Track if this tab is active
  const activeTabId = useConnectionStore((s) => s.activeTabId)
  const isActiveTab = activeTabId === tabId

  // Store column details in a ref for reuse when switching tabs
  const columnsRef = useRef<Awaited<ReturnType<typeof getColumns>> | null>(null)

  // Fetch column details to get primary key information
  // Only re-run when the table identity changes, not on every tab object update
  useEffect(() => {
    async function fetchColumnDetails() {
      if (!runtimeConnectionId || !tableName || !databaseName) return

      try {
        const schema = schemaName || databaseName
        const cols = await getColumns(runtimeConnectionId, databaseName, schema, tableName)
        columnsRef.current = cols

        // Extract primary key columns
        const pkCols = cols.filter((c) => c.key === 'PRI').map((c) => c.name)
        initTableEditStateRef.current(tabId, pkCols)

        // Set table context in right sidebar for Table/Utils tabs
        showTableDetailsRef.current(tableName, cols, databaseName, schemaName)
      } catch (e) {
        console.error('Failed to fetch column details:', e)
      }
    }

    fetchColumnDetails()
  }, [runtimeConnectionId, tableName, databaseName, schemaName, tabId])

  // Update sidebar context when this tab becomes active
  useEffect(() => {
    if (isActiveTab && columnsRef.current && tableName && databaseName) {
      showTableDetailsRef.current(tableName, columnsRef.current, databaseName, schemaName)
    }
  }, [isActiveTab, tableName, databaseName, schemaName])

  // Load data for the current page
  const loadPage = useCallback(
    async (pageNumber: number, currentFilters?: FilterCondition[]) => {
      if (!runtimeConnectionId || !tableName || !databaseName) return

      const activeFilters = currentFilters ?? filtersRef.current
      const offset = pageNumber * PAGE_SIZE
      const tableRef = schemaName
        ? `${quoteIdentifier(schemaName, driver)}.${quoteIdentifier(tableName, driver)}`
        : `${quoteIdentifier(databaseName, driver)}.${quoteIdentifier(tableName, driver)}`
      const whereClause = buildWhereClause(activeFilters, driver)
      const query = `SELECT * FROM ${tableRef} ${whereClause} LIMIT ${PAGE_SIZE} OFFSET ${offset}`

      const database = schemaName ? databaseName : undefined
      const context = schemaName || databaseName

      tableLogger.debug('loading page', { tableName, page: pageNumber, filterCount: activeFilters.length })
      const timer = createTimer(tableLogger, `load page ${pageNumber}`)
      setQueryExecutingRef.current(tabId, true)

      try {
        const result = await executeQuery(runtimeConnectionId, query, database, context)
        timer.end({ rowCount: result.rows.length })
        setQueryResultRef.current(tabId, result)
        setTablePageRef.current(tabId, pageNumber)
      } catch (e) {
        timer.fail(e)
        setQueryErrorRef.current(tabId, formatErrorMessage(e))
      }
    },
    [runtimeConnectionId, tableName, databaseName, schemaName, tabId, driver],
  )

  // Load total row count
  const loadTotalRows = useCallback(
    async (currentFilters?: FilterCondition[]) => {
      if (!runtimeConnectionId || !tableName || !databaseName) return

      const activeFilters = currentFilters ?? filtersRef.current
      const tableRef = schemaName
        ? `${quoteIdentifier(schemaName, driver)}.${quoteIdentifier(tableName, driver)}`
        : `${quoteIdentifier(databaseName, driver)}.${quoteIdentifier(tableName, driver)}`

      const database = schemaName ? databaseName : undefined
      const context = schemaName || databaseName

      const whereClause = buildWhereClause(activeFilters, driver)
      const timer = createTimer(tableLogger, 'load total rows')
      try {
        const countQuery = `SELECT COUNT(*) as count FROM ${tableRef} ${whereClause}`
        const result = await executeQuery(runtimeConnectionId, countQuery, database, context)
        if (result.rows.length > 0) {
          const count = Number(result.rows[0][0])
          timer.end({ totalRows: count })
          setTableTotalRowsRef.current(tabId, count)
        }
      } catch (e) {
        timer.fail(e)
      }
    },
    [runtimeConnectionId, tableName, databaseName, schemaName, tabId, driver],
  )

  // Extract more stable values for initial load effect
  const tabResult = tab?.result
  const tabIsExecuting = tab?.isExecuting
  const tabPage = tab?.page

  // Load initial data and count - use hasLoaded guard to prevent duplicate loads
  useEffect(() => {
    if (tableName && !tabResult && !tabIsExecuting && !hasLoaded) {
      setHasLoaded(true)
      loadPage(tabPage ?? 0)
      loadTotalRows()
    }
  }, [tableName, tabResult, tabIsExecuting, tabPage, hasLoaded, loadPage, loadTotalRows])

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    tableLogger.debug('refreshing table', { tableName, page: tabPage ?? 0 })
    const timer = createTimer(tableLogger, 'table refresh')
    setIsRefreshing(true)
    const startTime = Date.now()
    const toastId = toast.loading('Refreshing table data...')

    try {
      await Promise.all([loadPage(tabPage ?? 0), loadTotalRows()])

      // Ensure minimum toast display time before showing success
      await ensureMinimumToastDuration(startTime)
      timer.end()
      toast.success('Table refreshed', { id: toastId })
    } catch (e) {
      timer.fail(e)
      // Show error immediately (no delay needed for errors)
      toast.error('Failed to refresh table', {
        id: toastId,
        description: formatErrorMessage(e),
      })
    } finally {
      setIsRefreshing(false)
    }
  }, [loadPage, loadTotalRows, tabPage, tableName])

  // Handle toggle edit mode
  const handleToggleEditMode = useCallback(() => {
    tableLogger.debug('edit mode toggled', { tabId, newMode: !isEditMode })
    setEditModeRef.current(tabId, !isEditMode)
  }, [tabId, isEditMode])

  // Extract columns for add row handler - memoize to prevent re-renders
  const tabColumns = useMemo(() => tabResult?.columns ?? [], [tabResult?.columns])

  // Handle add new row
  const handleAddRow = useCallback(() => {
    if (tabColumns.length === 0) {
      toast.error('Cannot add row: no column information available')
      return
    }
    // Create a new row with null values for all columns
    const newRow: Record<string, unknown> = {}
    for (const col of tabColumns) {
      newRow[col.name] = null
    }
    tableLogger.debug('new row added', { tabId, columnCount: tabColumns.length })
    addNewRowRef.current(tabId, newRow)
    toast.success('Row added')
  }, [tabColumns, tabId])

  // Handle cell edit
  const handleCellEdit = useCallback(
    (
      rowIndex: number,
      primaryKeyValues: Record<string, unknown>,
      columnName: string,
      originalValue: unknown,
      newValue: unknown,
      originalRow: Record<string, unknown>,
    ) => {
      addCellEditRef.current(
        tabId,
        rowIndex,
        primaryKeyValues,
        columnName,
        originalValue,
        newValue,
        originalRow,
      )
    },
    [tabId],
  )

  // Handle row deletion
  const handleRowDelete = useCallback(
    (
      rowIndex: number,
      primaryKeyValues: Record<string, unknown>,
      originalRow: Record<string, unknown>,
    ) => {
      markRowForDeletionRef.current(tabId, rowIndex, primaryKeyValues, originalRow)
    },
    [tabId],
  )

  // Handle undo row deletion
  const handleUndoRowDelete = useCallback(
    (changeId: string) => {
      removeChangeRef.current(tabId, changeId)
    },
    [tabId],
  )

  // Handle remove new row (before it's committed)
  const handleRemoveNewRow = useCallback(
    (changeId: string) => {
      removeChangeRef.current(tabId, changeId)
    },
    [tabId],
  )

  // Handle update cell in a new row
  const handleUpdateNewRowCell = useCallback(
    (changeId: string, columnName: string, newValue: unknown) => {
      updateNewRowCellRef.current(tabId, changeId, columnName, newValue)
    },
    [tabId],
  )

  // Handle commit changes
  const handleCommit = useCallback(async () => {
    if (!runtimeConnectionId || !tableName || !databaseName) return

    setCommittingRef.current(tabId, true)
    setCommitErrorRef.current(tabId, undefined)

    try {
      const sqlStatements = generateCommitSQL(
        {
          tableName,
          databaseName,
          schemaName,
          driver,
        },
        pendingChanges,
      )

      tableLogger.debug('committing changes', { tableName, statementCount: sqlStatements.length, statements: sqlStatements })
      const timer = createTimer(tableLogger, 'commit changes')

      const database = schemaName ? databaseName : undefined
      const context = schemaName || databaseName

      // Execute each statement
      for (const sql of sqlStatements) {
        await executeQuery(runtimeConnectionId, sql, database, context)
      }

      // Clear changes and reload
      timer.end({ statementCount: sqlStatements.length })
      clearPendingChangesRef.current(tabId)
      toast.success(
        `Committed ${sqlStatements.length} change${sqlStatements.length !== 1 ? 's' : ''}`,
      )
      await handleRefresh()
    } catch (e) {
      const errorMsg = formatErrorMessage(e)
      tableLogger.error('commit failed', { tableName, error: errorMsg })
      setCommitErrorRef.current(tabId, errorMsg)
      toast.error('Failed to commit changes', { description: errorMsg })
    } finally {
      setCommittingRef.current(tabId, false)
    }
  }, [
    runtimeConnectionId,
    tableName,
    databaseName,
    schemaName,
    driver,
    tabId,
    pendingChanges,
    handleRefresh,
  ])

  // Handle discard changes
  const handleDiscard = useCallback(() => {
    discardAllChangesRef.current(tabId)
  }, [tabId])

  // Navigation guard for pagination
  const guardedNavigate = useCallback(
    (navigateFn: () => void) => {
      if (hasChanges) {
        setPendingNavigation(() => navigateFn)
        setShowUnsavedDialog(true)
      } else {
        navigateFn()
      }
    },
    [hasChanges],
  )

  // Handle dialog discard
  const handleDialogDiscard = useCallback(() => {
    discardAllChangesRef.current(tabId)
    setShowUnsavedDialog(false)
    if (pendingNavigation) {
      pendingNavigation()
      setPendingNavigation(null)
    }
  }, [tabId, pendingNavigation])

  // Handle dialog cancel
  const handleDialogCancel = useCallback(() => {
    setShowUnsavedDialog(false)
    setPendingNavigation(null)
  }, [])

  // Memoize filter change handler to prevent FilterBar re-renders
  const handleFiltersChange = useCallback(
    (newFilters: FilterCondition[]) => {
      if (hasChanges) {
        setPendingNavigation(() => () => {
          setFilters(newFilters)
          loadPage(0, newFilters)
          loadTotalRows(newFilters)
        })
        setShowUnsavedDialog(true)
      } else {
        setFilters(newFilters)
        loadPage(0, newFilters)
        loadTotalRows(newFilters)
      }
    },
    [hasChanges, loadPage, loadTotalRows]
  )

  // Pagination state - compute before early return so hooks above can reference
  const currentPage = tabPage ?? 0
  const totalRows = tab?.totalRows ?? 0
  const totalPages = Math.ceil(totalRows / PAGE_SIZE)

  // Memoize pagination handlers to prevent re-renders
  const handleFirstPage = useCallback(
    () => guardedNavigate(() => loadPage(0)),
    [guardedNavigate, loadPage]
  )
  const handlePrevPage = useCallback(
    () => guardedNavigate(() => loadPage(Math.max(0, currentPage - 1))),
    [guardedNavigate, loadPage, currentPage]
  )
  const handleNextPage = useCallback(
    () => guardedNavigate(() => loadPage(currentPage + 1)),
    [guardedNavigate, loadPage, currentPage]
  )
  const handleLastPage = useCallback(
    () => guardedNavigate(() => loadPage(Math.max(0, totalPages - 1))),
    [guardedNavigate, loadPage, totalPages]
  )

  // Early return if no tab or connection data
  if (!tableName || !runtimeConnectionId) {
    return null
  }

  const hasNextPage = (currentPage + 1) * PAGE_SIZE < totalRows
  const hasPrevPage = currentPage > 0

  // Commit error for display
  const commitError = editState?.commitError
  const isCommitting = editState?.isCommitting ?? false

  return (
    <div className="flex flex-col h-full bg-black">
      {/* Filter Bar */}
      <FilterBar
        columns={tabColumns}
        filters={filters}
        onFiltersChange={handleFiltersChange}
      />

      {/* Table Content */}
      <div className="flex-1 min-h-0">
        {tabResult && isEditMode ? (
          <DataTable
            result={tabResult}
            isEditMode={isEditMode}
            pendingChanges={pendingChanges}
            primaryKeyColumns={primaryKeyColumns}
            onCellEdit={handleCellEdit}
            onRowDelete={handleRowDelete}
            onUndoRowDelete={handleUndoRowDelete}
            onRemoveNewRow={handleRemoveNewRow}
            onUpdateNewRowCell={handleUpdateNewRowCell}
          />
        ) : (
          <ResultsTable result={tabResult} error={tab?.error} isExecuting={!!tabIsExecuting} />
        )}
      </div>

      {/* Unified Footer - Row Info (left), Pagination (center), Actions (right) */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-zinc-900 bg-zinc-950 text-xs">
        {/* Left: Row Range Info */}
        <div className="flex items-center gap-2 min-w-32">
          {tabIsExecuting ? (
            <span className="text-zinc-500">Loading...</span>
          ) : tabResult ? (
            <>
              <span className="text-zinc-500">
                {totalRows > 0 ? currentPage * PAGE_SIZE + 1 : 0}-
                {Math.min((currentPage + 1) * PAGE_SIZE, totalRows)} of {totalRows.toLocaleString()}
              </span>
              {tabResult.execution_time_ms && (
                <span className="text-zinc-600">{tabResult.execution_time_ms}ms</span>
              )}
            </>
          ) : (
            <span className="text-zinc-500">No data</span>
          )}
        </div>

        {/* Center: Pagination Controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleFirstPage}
            disabled={!hasPrevPage || !!tabIsExecuting}
            className="h-6 w-6 p-0 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 disabled:opacity-30"
          >
            <ChevronsLeft className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrevPage}
            disabled={!hasPrevPage || !!tabIsExecuting}
            className="h-6 w-6 p-0 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 disabled:opacity-30"
          >
            <ChevronLeft className="size-3.5" />
          </Button>

          <span className="px-2 text-zinc-400 min-w-24 text-center">
            Page {currentPage + 1} of {totalPages || 1}
          </span>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleNextPage}
            disabled={!hasNextPage || !!tabIsExecuting}
            className="h-6 w-6 p-0 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 disabled:opacity-30"
          >
            <ChevronRight className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLastPage}
            disabled={!hasNextPage || !!tabIsExecuting}
            className="h-6 w-6 p-0 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 disabled:opacity-30"
          >
            <ChevronsRight className="size-3.5" />
          </Button>
        </div>

        {/* Right: Commit/Discard + Refresh, Edit, Add Row */}
        <div className="flex items-center gap-1.5 justify-end">
          {hasChanges && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDiscard}
                disabled={isCommitting}
                className="h-6 px-2 text-xs text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
                title="Discard all changes"
              >
                <X className="size-3.5 mr-1" />
                Discard
              </Button>

              <Button
                variant="default"
                size="sm"
                onClick={handleCommit}
                disabled={isCommitting}
                className="h-6 px-2.5 text-xs bg-green-600 hover:bg-green-500 text-white"
                title={
                  commitError
                    ? `Error: ${commitError}`
                    : `Commit ${pendingChanges.length} change${pendingChanges.length !== 1 ? 's' : ''}`
                }
              >
                {isCommitting ? (
                  <Loader2 className="size-3.5 mr-1 animate-spin" />
                ) : (
                  <Check className="size-3.5 mr-1" />
                )}
                Commit ({pendingChanges.length})
              </Button>

              <div className="w-px h-4 bg-zinc-800 mx-0.5" />
            </>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing || hasChanges}
            className="h-6 w-6 p-0 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 disabled:opacity-30"
            title={hasChanges ? 'Commit or discard changes first' : 'Refresh'}
          >
            <RefreshCw className={cn('size-3.5', isRefreshing && 'animate-spin')} />
          </Button>

          {canEdit && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleEditMode}
                disabled={hasChanges && isEditMode}
                className={cn(
                  'h-6 w-6 p-0',
                  isEditMode
                    ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/10'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900',
                  hasChanges && isEditMode && 'opacity-30',
                )}
                title={
                  hasChanges && isEditMode
                    ? 'Commit or discard changes first'
                    : isEditMode
                      ? 'Exit edit mode'
                      : 'Edit mode'
                }
              >
                <Pencil className="size-3.5" />
              </Button>

              {isEditMode && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAddRow}
                  className="h-6 w-6 p-0 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                  title="Add new row"
                >
                  <Plus className="size-3.5" />
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Unsaved Changes Dialog */}
      <UnsavedChangesDialog
        open={showUnsavedDialog}
        changesCount={pendingChanges.length}
        onDiscard={handleDialogDiscard}
        onCancel={handleDialogCancel}
      />
    </div>
  )
}
