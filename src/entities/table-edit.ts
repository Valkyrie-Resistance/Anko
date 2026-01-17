// Row change types for table editing
export type RowChangeType = 'insert' | 'update' | 'delete'

// Represents a single cell edit
export interface CellEdit {
  columnName: string
  originalValue: unknown
  newValue: unknown
}

// Represents a pending row change
export interface PendingRowChange {
  id: string
  type: RowChangeType
  rowIndex: number
  primaryKeyValues: Record<string, unknown>
  edits: CellEdit[]
  originalRow?: Record<string, unknown>
  newRow?: Record<string, unknown>
}

// State for table editing per tab
export interface TableEditState {
  isEditMode: boolean
  pendingChanges: PendingRowChange[]
  primaryKeyColumns: string[]
  isCommitting: boolean
  commitError?: string
}

// Default edit state for new tabs
export const DEFAULT_TABLE_EDIT_STATE: TableEditState = {
  isEditMode: false,
  pendingChanges: [],
  primaryKeyColumns: [],
  isCommitting: false,
}
