import { IconBraces, IconDatabase, IconTable } from '@tabler/icons-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useRightSidebarStore } from '@/stores/right-sidebar'
import { CellDetails } from './CellDetails'
import { RowDetails } from './RowDetails'
import { TableSchemaView } from './TableSchemaView'
import { ZodGeneratorView } from './ZodGeneratorView'

type TabId = 'data' | 'table' | 'utilities'

export function RightSidebarContextContent() {
  const context = useRightSidebarStore((s) => s.context)
  const [activeTab, setActiveTab] = useState<TabId>('data')

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
      {/* Custom Tab List */}
      <div className="border-b px-2 pt-2 pb-2">
        <div className="flex items-center bg-muted rounded-lg p-[3px]">
          <TabButton
            active={activeTab === 'data'}
            onClick={() => setActiveTab('data')}
          >
            <IconDatabase className="size-3.5" />
            Data
          </TabButton>
          <TabButton
            active={activeTab === 'table'}
            onClick={() => setActiveTab('table')}
            disabled={!hasTableContent}
          >
            <IconTable className="size-3.5" />
            Table
          </TabButton>
          <TabButton
            active={activeTab === 'utilities'}
            onClick={() => setActiveTab('utilities')}
            disabled={!hasTableContent}
          >
            <IconBraces className="size-3.5" />
            Utils
          </TabButton>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'data' && <DataTabContent />}
        {activeTab === 'table' && hasTableContent && (
          <TableSchemaView
            tableName={context.tableName}
            columns={context.columns}
            database={context.database}
            schema={context.schema}
          />
        )}
        {activeTab === 'utilities' && hasTableContent && (
          <ZodGeneratorView tableName={context.tableName} columns={context.columns} />
        )}
      </div>
    </div>
  )
}

interface TabButtonProps {
  active: boolean
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}

function TabButton({ active, onClick, disabled, children }: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-colors',
        active
          ? 'bg-background text-foreground'
          : 'text-muted-foreground hover:text-foreground',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
    >
      {children}
    </button>
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
