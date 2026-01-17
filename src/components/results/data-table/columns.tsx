import type { ColumnDef } from '@tanstack/react-table'
import type { ColumnInfo } from '@/types'
import type { ColumnMeta } from '../definitions'
import { isPrimaryKey, type RowData } from './utils'

export function createDynamicColumns(queryColumns: ColumnInfo[]): ColumnDef<RowData, unknown>[] {
  // Row number column (always first, sticky, not sortable/hideable)
  const rowNumberColumn: ColumnDef<RowData, unknown> = {
    id: '__row_number',
    header: '#',
    cell: ({ row }) => row.index + 1,
    size: 50,
    minSize: 50,
    maxSize: 50,
    enableResizing: false,
    enableSorting: false,
    enableHiding: false,
    meta: {
      dataType: '',
      nullable: false,
      isPrimaryKey: false,
      isRowNumber: true,
      sticky: true,
    } satisfies ColumnMeta,
  }

  // Dynamic columns from query result
  const dataColumns = queryColumns.map(
    (col): ColumnDef<RowData, unknown> => ({
      id: col.name,
      accessorKey: col.name,
      header: col.name,
      size: 150,
      minSize: 50,
      meta: {
        dataType: col.data_type,
        nullable: col.nullable,
        isPrimaryKey: isPrimaryKey(col),
        isRowNumber: false,
        sticky: false,
      } satisfies ColumnMeta,
    }),
  )

  return [rowNumberColumn, ...dataColumns]
}
