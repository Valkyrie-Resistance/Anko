import type { PendingRowChange, QueryResult } from '@/types'

export interface ResultsTableProps {
  result?: QueryResult
  error?: string
  isExecuting: boolean
}

export interface DataTableProps {
  result: QueryResult
  enableSorting?: boolean
  enableColumnVisibility?: boolean
  // Edit mode props
  isEditMode?: boolean
  pendingChanges?: PendingRowChange[]
  primaryKeyColumns?: string[]
  onCellEdit?: (
    rowIndex: number,
    primaryKeyValues: Record<string, unknown>,
    columnName: string,
    originalValue: unknown,
    newValue: unknown,
    originalRow: Record<string, unknown>,
  ) => void
  onRowDelete?: (
    rowIndex: number,
    primaryKeyValues: Record<string, unknown>,
    originalRow: Record<string, unknown>,
  ) => void
  onUndoRowDelete?: (changeId: string) => void
  onRemoveNewRow?: (changeId: string) => void
  onUpdateNewRowCell?: (changeId: string, columnName: string, newValue: unknown) => void
}

export interface ColumnMeta {
  dataType: string
  nullable: boolean
  isPrimaryKey: boolean
  isRowNumber?: boolean
  sticky?: boolean
}
