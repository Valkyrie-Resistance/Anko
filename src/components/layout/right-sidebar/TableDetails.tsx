import { IconClipboard, IconCode, IconKey, IconTable } from '@tabler/icons-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { generateZodSchema } from '@/lib/zod-generator'
import type { ColumnDetail } from '@/types'

interface TableDetailsProps {
  tableName: string
  columns: ColumnDetail[]
  database: string
  schema?: string
}

export function TableDetails({ tableName, columns, database, schema }: TableDetailsProps) {
  const [activeTab, setActiveTab] = useState('schema')

  const zodSchema = useMemo(() => generateZodSchema(tableName, columns), [tableName, columns])

  const handleCopySchema = () => {
    navigator.clipboard.writeText(zodSchema)
    toast.success('Zod schema copied to clipboard')
  }

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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="mx-2 mt-2">
          <TabsTrigger value="schema" className="text-xs">
            <IconTable className="size-3.5 mr-1" />
            Schema
          </TabsTrigger>
          <TabsTrigger value="zod" className="text-xs">
            <IconCode className="size-3.5 mr-1" />
            Zod
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schema" className="flex-1 min-h-0 m-0">
          <ScrollArea className="h-full">
            <div className="p-2 space-y-0.5">
              {columns.map((col) => (
                <ColumnRow key={col.name} column={col} />
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="zod" className="flex-1 min-h-0 m-0">
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-3 py-1.5 border-b">
              <span className="text-[10px] text-muted-foreground">Generated Zod Schema</span>
              <button
                type="button"
                onClick={handleCopySchema}
                className="p-1 rounded hover:bg-accent transition-colors"
                title="Copy schema"
              >
                <IconClipboard className="size-3 text-muted-foreground" />
              </button>
            </div>
            <ScrollArea className="flex-1">
              <pre className="p-3 text-[10px] font-mono text-foreground/80 whitespace-pre-wrap">
                {zodSchema}
              </pre>
            </ScrollArea>
          </div>
        </TabsContent>
      </Tabs>
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
