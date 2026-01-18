import { useRightSidebarStore } from '@/stores/right-sidebar'
import { CellDetails } from './CellDetails'
import { RowDetails } from './RowDetails'
import { TableDetails } from './TableDetails'

export function RightSidebarContextContent() {
  const context = useRightSidebarStore((s) => s.context)

  switch (context.type) {
    case 'row':
      return <RowDetails row={context.row} columns={context.columns} />
    case 'cell':
      return (
        <CellDetails
          value={context.value}
          columnName={context.columnName}
          columnType={context.columnType}
        />
      )
    case 'table':
      return (
        <TableDetails
          tableName={context.tableName}
          columns={context.columns}
          database={context.database}
          schema={context.schema}
        />
      )
    case 'none':
    default:
      return (
        <div className="flex flex-col h-full">
          <div className="flex items-center px-3 py-2 border-b">
            <span className="text-xs font-medium text-foreground">Details</span>
          </div>
          <div className="flex-1 flex items-center justify-center p-4">
            <p className="text-xs text-muted-foreground text-center">
              Select a row, cell, or table to view details
            </p>
          </div>
        </div>
      )
  }
}
