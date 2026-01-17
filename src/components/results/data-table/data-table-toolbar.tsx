import type { Table } from '@tanstack/react-table'
import { Columns } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { RowData } from './utils'

interface DataTableToolbarProps {
  table: Table<RowData>
}

export function DataTableToolbar({ table }: DataTableToolbarProps) {
  const hidableColumns = table.getAllColumns().filter((col) => col.getCanHide())

  if (hidableColumns.length === 0) return null

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 border-b border-zinc-900 bg-zinc-950">
      <DropdownMenu>
        <DropdownMenuTrigger
          className="inline-flex items-center justify-center gap-1.5 h-7 px-2 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors"
          render={<button type="button" />}
        >
          <Columns className="size-3" />
          Columns
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48 bg-zinc-950 border-zinc-800">
          {hidableColumns.map((column) => (
            <DropdownMenuCheckboxItem
              key={column.id}
              checked={column.getIsVisible()}
              onCheckedChange={(value) => column.toggleVisibility(!!value)}
              className="text-xs"
            >
              {column.id}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
