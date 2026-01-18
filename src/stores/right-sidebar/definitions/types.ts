import type { ColumnDetail } from '@/types'

export type RightSidebarContext =
  | { type: 'none' }
  | { type: 'row'; row: Record<string, unknown>; columns: ColumnDetail[] }
  | { type: 'cell'; value: unknown; columnName: string; columnType: string }
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
