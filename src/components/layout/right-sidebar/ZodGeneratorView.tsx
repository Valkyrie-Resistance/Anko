import { IconClipboard } from '@tabler/icons-react'
import { useMemo } from 'react'
import ShikiHighlighter from 'react-shiki'
import { toast } from 'sonner'
import { ScrollArea } from '@/components/ui/scroll-area'
import { generateZodSchema } from '@/lib/zod-generator'
import type { ColumnDetail } from '@/types'

interface ZodGeneratorViewProps {
  tableName: string
  columns: ColumnDetail[]
}

export function ZodGeneratorView({ tableName, columns }: ZodGeneratorViewProps) {
  const zodSchema = useMemo(() => generateZodSchema(tableName, columns), [tableName, columns])

  const handleCopySchema = () => {
    navigator.clipboard.writeText(zodSchema)
    toast.success('Zod schema copied to clipboard')
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <div>
          <span className="text-xs font-medium text-foreground">Zod Schema</span>
          <p className="text-[10px] text-muted-foreground">
            Auto-generated from table structure
          </p>
        </div>
        <button
          type="button"
          onClick={handleCopySchema}
          className="p-1.5 rounded hover:bg-accent transition-colors"
          title="Copy schema to clipboard"
        >
          <IconClipboard className="size-4 text-muted-foreground" />
        </button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 text-[11px] [&_pre]:!bg-transparent [&_pre]:!p-0 [&_pre]:!m-0 [&_code]:!text-[11px]">
          <ShikiHighlighter language="typescript" theme="github-dark">
            {zodSchema}
          </ShikiHighlighter>
        </div>
      </ScrollArea>
    </div>
  )
}
