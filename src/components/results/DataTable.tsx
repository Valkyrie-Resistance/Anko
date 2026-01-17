import {
  type ColumnSizingState,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from '@tanstack/react-table'
import { memo, useCallback, useMemo, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { tableLogger } from '@/lib/debug'
import { createPrimaryKeyHash } from '@/lib/table-utils'
import { cn } from '@/lib/utils'
import { createDynamicColumns } from './data-table/columns'
import { DataTableCell } from './data-table/data-table-cell'
import { DataTableHeader } from './data-table/data-table-header'
import { DataTableToolbar } from './data-table/data-table-toolbar'
import { EditableCell } from './data-table/editable-cell'
import { RowActions } from './data-table/row-actions'
import { convertRowsToObjects } from './data-table/utils'
import type { ColumnMeta, DataTableProps } from './definitions'

// Special markers for new rows
const NEW_ROW_MARKER = '__isNewRow'
const CHANGE_ID_MARKER = '__changeId'

// Stable empty arrays to prevent re-renders from default parameter evaluation
const EMPTY_CHANGES: never[] = []
const EMPTY_PK_COLUMNS: string[] = []

export const DataTable = memo(function DataTable({
  result,
  enableSorting = true,
  enableColumnVisibility = true,
  isEditMode = false,
  pendingChanges = EMPTY_CHANGES,
  primaryKeyColumns = EMPTY_PK_COLUMNS,
  onCellEdit,
  onRowDelete,
  onUndoRowDelete,
  onRemoveNewRow,
  onUpdateNewRowCell,
}: DataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({})

  // Memoize data conversion for existing rows
  const existingData = useMemo(
    () => convertRowsToObjects(result.rows, result.columns),
    [result.rows, result.columns],
  )

  // Extract insert changes and create new row data
  const insertChanges = useMemo(
    () => pendingChanges.filter((c) => c.type === 'insert'),
    [pendingChanges],
  )

  const newRowsData = useMemo(
    () =>
      insertChanges.map((c) => ({
        ...(c.newRow ?? {}),
        [NEW_ROW_MARKER]: true,
        [CHANGE_ID_MARKER]: c.id,
      })),
    [insertChanges],
  )

  // Combine new rows (at top) with existing data
  const data = useMemo(() => [...newRowsData, ...existingData], [newRowsData, existingData])

  // Memoize column definitions - only recreate when column structure changes
  const columns = useMemo(() => createDynamicColumns(result.columns), [result.columns])

  // Memoize row model getters to prevent recreation on every render
  const coreRowModel = useMemo(() => getCoreRowModel(), [])
  const sortedRowModel = useMemo(
    () => (enableSorting ? getSortedRowModel() : undefined),
    [enableSorting],
  )

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: coreRowModel,
    getSortedRowModel: sortedRowModel,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnSizingChange: setColumnSizing,
    columnResizeMode: 'onChange',
    state: {
      sorting,
      columnVisibility,
      columnSizing,
    },
  })

  // Helper to get primary key values for a row
  const getPrimaryKeyValues = useCallback(
    (row: Record<string, unknown>): Record<string, unknown> => {
      const pkValues: Record<string, unknown> = {}
      for (const pkCol of primaryKeyColumns) {
        pkValues[pkCol] = row[pkCol]
      }
      return pkValues
    },
    [primaryKeyColumns],
  )

  // Pre-compute deletion map: pkHash -> changeId (O(N) instead of O(N*M) per render)
  const deletionMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const change of pendingChanges) {
      if (change.type === 'delete') {
        const pkHash = createPrimaryKeyHash(change.primaryKeyValues)
        map.set(pkHash, change.id)
      }
    }
    return map
  }, [pendingChanges])

  // Pre-compute modification map: pkHash -> Set of modified column names
  const modificationMap = useMemo(() => {
    const map = new Map<string, Set<string>>()
    for (const change of pendingChanges) {
      if (change.type === 'update') {
        const pkHash = createPrimaryKeyHash(change.primaryKeyValues)
        const columns = new Set(change.edits.map((e) => e.columnName))
        map.set(pkHash, columns)
      }
    }
    return map
  }, [pendingChanges])

  // O(1) lookup instead of O(N) iteration per row
  const getRowDeletionChangeId = useCallback(
    (row: Record<string, unknown>): string | undefined => {
      const pkValues = getPrimaryKeyValues(row)
      const pkHash = createPrimaryKeyHash(pkValues)
      return deletionMap.get(pkHash)
    },
    [deletionMap, getPrimaryKeyValues],
  )

  // O(1) lookup instead of O(N) iteration per cell
  const isCellModified = useCallback(
    (row: Record<string, unknown>, columnName: string): boolean => {
      const pkValues = getPrimaryKeyValues(row)
      const pkHash = createPrimaryKeyHash(pkValues)
      return modificationMap.get(pkHash)?.has(columnName) ?? false
    },
    [modificationMap, getPrimaryKeyValues],
  )

  // Handle cell value change
  const handleCellValueChange = useCallback(
    (
      rowIndex: number,
      row: Record<string, unknown>,
      columnName: string,
      originalValue: unknown,
      newValue: unknown,
    ) => {
      if (!onCellEdit) return
      const pkValues = getPrimaryKeyValues(row)
      tableLogger.debug('cell value changed', { rowIndex, columnName, oldValue: originalValue, newValue })
      onCellEdit(rowIndex, pkValues, columnName, originalValue, newValue, row)
    },
    [onCellEdit, getPrimaryKeyValues],
  )

  // Handle row deletion
  const handleRowDelete = useCallback(
    (rowIndex: number, row: Record<string, unknown>) => {
      if (!onRowDelete) return
      const pkValues = getPrimaryKeyValues(row)
      tableLogger.debug('row marked for deletion', { rowIndex, primaryKeyValues: pkValues })
      onRowDelete(rowIndex, pkValues, row)
    },
    [onRowDelete, getPrimaryKeyValues],
  )

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {enableColumnVisibility && <DataTableToolbar table={table} />}
      <div className="flex-1 overflow-auto">
        <Table className="w-full text-xs border-collapse">
          <TableHeader className="sticky top-0 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-zinc-950 border-b border-zinc-800">
                {isEditMode && (
                  <TableHead className="w-10 px-2 py-1.5 text-center text-zinc-500 border-r border-zinc-800" />
                )}
                {headerGroup.headers.map((header) => {
                  const meta = header.column.columnDef.meta as ColumnMeta | undefined
                  return (
                    <TableHead
                      key={header.id}
                      style={{ width: header.getSize() }}
                      className={cn(
                        'text-left font-medium px-3 py-1.5 border-r border-zinc-800 last:border-r-0 whitespace-nowrap relative',
                        meta?.sticky && 'sticky left-0 bg-zinc-950 z-20',
                        meta?.isRowNumber ? 'text-zinc-500 w-12' : 'text-zinc-300',
                      )}
                    >
                      <DataTableHeader header={header} />
                      {/* Resize handle */}
                      {header.column.getCanResize() && (
                        <div
                          role="slider"
                          aria-label={`Resize ${header.column.id} column`}
                          aria-valuenow={header.getSize()}
                          aria-valuemin={header.column.columnDef.minSize ?? 50}
                          aria-valuemax={500}
                          tabIndex={0}
                          onMouseDown={header.getResizeHandler()}
                          onTouchStart={header.getResizeHandler()}
                          className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-zinc-700 opacity-0 hover:opacity-100 focus:opacity-100"
                        />
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (isEditMode ? 1 : 0)}
                  className="px-3 py-8 text-center text-zinc-500 text-xs"
                >
                  No rows returned
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row, rowIndex) => {
                const rowData = row.original
                const isNewRow = rowData[NEW_ROW_MARKER] === true
                const changeId = rowData[CHANGE_ID_MARKER] as string | undefined
                const deleteChangeId = isNewRow ? undefined : getRowDeletionChangeId(rowData)
                const isDeleted = !!deleteChangeId

                return (
                  <TableRow
                    key={row.id}
                    className={cn(
                      'border-b border-zinc-900/50 hover:bg-zinc-900/50 transition-colors',
                      rowIndex % 2 === 1 ? 'bg-zinc-950/30' : 'bg-black',
                      isDeleted && 'bg-red-500/10 line-through opacity-60',
                      isNewRow && 'bg-emerald-500/10 border-l-2 border-l-emerald-500',
                    )}
                  >
                    {isEditMode && (
                      <TableCell className="w-10 px-2 py-1 text-center border-r border-zinc-900/30">
                        <RowActions
                          isNewRow={isNewRow}
                          isMarkedForDeletion={isDeleted}
                          onDelete={() => handleRowDelete(rowIndex, rowData)}
                          onUndoDelete={() => deleteChangeId && onUndoRowDelete?.(deleteChangeId)}
                          onRemoveNewRow={() => changeId && onRemoveNewRow?.(changeId)}
                        />
                      </TableCell>
                    )}
                    {row.getVisibleCells().map((cell) => {
                      const meta = cell.column.columnDef.meta as ColumnMeta | undefined
                      const value = cell.getValue()
                      const columnName = cell.column.id
                      // For new rows, allow editing all columns including primary keys
                      const isPrimaryKey = !isNewRow && primaryKeyColumns.includes(columnName)
                      const isModified = isNewRow ? false : isCellModified(rowData, columnName)

                      return (
                        <TableCell
                          key={cell.id}
                          style={{ width: cell.column.getSize() }}
                          className={cn(
                            'px-3 py-1 font-mono border-r border-zinc-900/30 last:border-r-0',
                            meta?.sticky && 'sticky left-0 z-10',
                            meta?.isRowNumber
                              ? cn(
                                  'text-zinc-500 w-12',
                                  rowIndex % 2 === 1 ? 'bg-zinc-950' : 'bg-black',
                                )
                              : 'text-zinc-300 max-w-xs truncate',
                            isModified && 'bg-amber-500/10 border-l-2 border-l-amber-500',
                          )}
                          title={value !== null ? String(value) : 'NULL'}
                        >
                          {meta?.isRowNumber ? (
                            isNewRow ? (
                              'NEW'
                            ) : (
                              row.index + 1 - newRowsData.length
                            )
                          ) : isEditMode && !meta?.isRowNumber ? (
                            <EditableCell
                              cell={cell}
                              isModified={isModified}
                              isPrimaryKey={isPrimaryKey}
                              isNewRow={isNewRow}
                              onValueChange={(newValue) => {
                                if (isNewRow && changeId) {
                                  // For new rows, update the newRow in pending changes
                                  onUpdateNewRowCell?.(changeId, columnName, newValue)
                                } else {
                                  // For existing rows, create an edit
                                  handleCellValueChange(
                                    rowIndex,
                                    rowData,
                                    columnName,
                                    value,
                                    newValue,
                                  )
                                }
                              }}
                            />
                          ) : (
                            <DataTableCell cell={cell} />
                          )}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
})
