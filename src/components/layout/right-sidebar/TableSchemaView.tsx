import { IconKey, IconTable } from '@tabler/icons-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { ColumnDetail } from '@/types'

interface TableSchemaViewProps {
  tableName: string
  columns: ColumnDetail[]
  database: string
  schema?: string
}

export function TableSchemaView({ tableName, columns, database, schema }: TableSchemaViewProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b">
        <IconTable className="size-4 text-primary" />
        <div className="min-w-0">
          <div className="text-xs font-medium text-foreground truncate">{tableName}</div>
          <div className="text-[10px] text-muted-foreground truncate">
            {database}
            {schema && `.${schema}`}
          </div>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-0.5">
          {columns.map((col) => (
            <ColumnRow key={col.name} column={col} />
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

interface ColumnRowProps {
  column: ColumnDetail
}

function ColumnRow({ column }: ColumnRowProps) {
  const isPrimaryKey = column.key === 'PRI' || column.key === 'PRIMARY KEY'
  const isForeignKey = column.key === 'MUL' || column.key === 'FOREIGN KEY'
  const isUniqueKey = column.key === 'UNI' || column.key === 'UNIQUE'

  return (
    <div className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-accent/30 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {isPrimaryKey && <IconKey className="size-3 text-amber-500" />}
          <span
            className={cn(
              'text-xs font-medium truncate',
              isPrimaryKey && 'text-amber-500',
              isForeignKey && 'text-blue-500',
              isUniqueKey && 'text-purple-500',
            )}
          >
            {column.name}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span>{column.data_type}</span>
          {column.nullable && <span className="text-muted-foreground/60">nullable</span>}
          {column.default_value && (
            <span className="text-muted-foreground/60">= {column.default_value}</span>
          )}
          {column.extra && <span className="text-muted-foreground/60">{column.extra}</span>}
        </div>
      </div>
      {column.key && !isPrimaryKey && (
        <span className="text-[9px] px-1 py-0.5 rounded bg-muted text-muted-foreground">
          {column.key}
        </span>
      )}
    </div>
  )
}
