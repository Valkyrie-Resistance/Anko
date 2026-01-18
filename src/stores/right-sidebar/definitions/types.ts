import type { ColumnDetail } from '@/types'

// Table info that persists across row/cell selections
export interface TableInfo {
  tableName: string
  columns: ColumnDetail[]
  database: string
  schema?: string
}

export type RightSidebarContext =
  | { type: 'none' }
  | { type: 'row'; row: Record<string, unknown>; columns: ColumnDetail[]; tableInfo: TableInfo }
  | {
      type: 'cell'
      value: unknown
      columnName: string
      columnType: string
      tableInfo: TableInfo
    }
  | {
      type: 'table'
      tableName: string
      columns: ColumnDetail[]
      database: string
      schema?: string
    }

export interface RightSidebarStore {
  open: boolean
  width: number
  context: RightSidebarContext
  // Current table info - persists when selecting rows/cells
  currentTableInfo: TableInfo | null
  setOpen: (open: boolean) => void
  setWidth: (width: number) => void
  toggle: () => void
  setContext: (context: RightSidebarContext) => void
  clearContext: () => void
  showRowDetails: (row: Record<string, unknown>, columns: ColumnDetail[]) => void
  showCellDetails: (value: unknown, columnName: string, columnType: string) => void
  showTableDetails: (
    tableName: string,
    columns: ColumnDetail[],
    database: string,
    schema?: string,
  ) => void
}
