import { IconBraces, IconDatabase, IconTable } from '@tabler/icons-react'
import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useRightSidebarStore } from '@/stores/right-sidebar'
import { CellDetails } from './CellDetails'
import { RowDetails } from './RowDetails'
import { TableSchemaView } from './TableSchemaView'
import { ZodGeneratorView } from './ZodGeneratorView'

export function RightSidebarContextContent() {
  const context = useRightSidebarStore((s) => s.context)
  const [activeTab, setActiveTab] = useState('data')

  // Determine what tabs to show based on context
  const hasTableContent = context.type === 'table'

  // If no context, show empty state
  if (context.type === 'none') {
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

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
        <div className="border-b px-2 pt-2 pb-2">
          <TabsList className="w-full">
            <TabsTrigger value="data" className="flex-1 text-xs gap-1">
              <IconDatabase className="size-3.5" />
              Data
            </TabsTrigger>
            <TabsTrigger value="table" className="flex-1 text-xs gap-1" disabled={!hasTableContent}>
              <IconTable className="size-3.5" />
              Table
            </TabsTrigger>
            <TabsTrigger value="utilities" className="flex-1 text-xs gap-1" disabled={!hasTableContent}>
              <IconBraces className="size-3.5" />
              Utils
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-hidden">
          <TabsContent value="data" className="h-full m-0 data-[state=inactive]:hidden">
            <DataTabContent />
          </TabsContent>

          <TabsContent value="table" className="h-full m-0 data-[state=inactive]:hidden">
            {hasTableContent && (
              <TableSchemaView
                tableName={context.tableName}
                columns={context.columns}
                database={context.database}
                schema={context.schema}
              />
            )}
          </TabsContent>

          <TabsContent value="utilities" className="h-full m-0 data-[state=inactive]:hidden">
            {hasTableContent && (
              <ZodGeneratorView tableName={context.tableName} columns={context.columns} />
            )}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}

function DataTabContent() {
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
        <div className="h-full flex items-center justify-center p-4">
          <p className="text-xs text-muted-foreground text-center">
            Click a row to see its data, or double-click a cell to inspect it
          </p>
        </div>
      )
    case 'none':
    default:
      return (
        <div className="h-full flex items-center justify-center p-4">
          <p className="text-xs text-muted-foreground text-center">
            Select a row or cell to view data
          </p>
        </div>
      )
  }
}
