import type { Cell } from '@tanstack/react-table'
import { formatCellValue, type RowData } from './utils'

interface DataTableCellProps {
  cell: Cell<RowData, unknown>
}

export function DataTableCell({ cell }: DataTableCellProps) {
  return formatCellValue(cell.getValue())
}
