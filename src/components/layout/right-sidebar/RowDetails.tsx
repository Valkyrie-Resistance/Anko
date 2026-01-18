import { IconChevronDown, IconChevronRight, IconClipboard } from '@tabler/icons-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { formatValue, isJsonLike, prettyPrintJson } from '@/lib/zod-generator'
import type { ColumnDetail } from '@/types'

interface RowDetailsProps {
  row: Record<string, unknown>
  columns: ColumnDetail[]
}

export function RowDetails({ row, columns }: RowDetailsProps) {
  const handleCopyValue = (value: unknown) => {
    navigator.clipboard.writeText(formatValue(value))
    toast.success('Copied to clipboard')
  }

  const handleCopyRow = () => {
    navigator.clipboard.writeText(JSON.stringify(row, null, 2))
    toast.success('Row copied to clipboard')
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b shrink-0">
        <span className="text-xs font-medium text-foreground">Row Details</span>
        <button
          type="button"
          onClick={handleCopyRow}
          className="p-1 rounded hover:bg-accent transition-colors"
          title="Copy entire row as JSON"
        >
          <IconClipboard className="size-3.5 text-muted-foreground" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-2 space-y-0.5">
          {columns.map((col) => (
            <FieldRow
              key={col.name}
              column={col}
              value={row[col.name]}
              onCopy={() => handleCopyValue(row[col.name])}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

interface FieldRowProps {
  column: ColumnDetail
  value: unknown
  onCopy: () => void
}

function FieldRow({ column, value, onCopy }: FieldRowProps) {
  const [isOpen, setIsOpen] = useState(true)

  const formattedValue = useMemo(() => {
    if (value === null) return 'null'
    if (value === undefined) return 'undefined'

    const strValue = formatValue(value)

    // Pretty print JSON if it looks like JSON
    if (isJsonLike(strValue)) {
      return prettyPrintJson(strValue)
    }

    return strValue
  }, [value])

  const isNull = value === null || value === undefined
  const isJson = isJsonLike(formattedValue)
  const isLongValue = formattedValue.length > 50 || formattedValue.includes('\n')

  // For short values, don't use collapsible
  if (!isLongValue) {
    return (
      <div className="group/field rounded-md hover:bg-accent/30 transition-colors">
        <div className="flex items-center justify-between w-full px-2 py-1">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <div className="size-3 shrink-0" />
            <span className="text-xs font-medium text-foreground truncate">{column.name}</span>
            <span className="text-[10px] text-muted-foreground/60 shrink-0">{column.data_type}</span>
            {column.key && (
              <span className="text-[9px] px-1 py-0.5 rounded bg-primary/10 text-primary shrink-0">
                {column.key}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onCopy}
            className="invisible group-hover/field:visible p-1 rounded hover:bg-accent transition-all shrink-0"
            title="Copy value"
          >
            <IconClipboard className="size-3 text-muted-foreground" />
          </button>
        </div>
        <div
          className={`px-2 pb-1.5 pl-6 text-xs ${isNull ? 'text-muted-foreground italic' : 'text-foreground/80'}`}
        >
          {formattedValue}
        </div>
      </div>
    )
  }

  // For long values, use collapsible
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="group/field rounded-md hover:bg-accent/30 transition-colors">
        <div className="flex items-center justify-between w-full px-2 py-1">
          <CollapsibleTrigger className="flex items-center gap-1.5 min-w-0 flex-1 text-left">
            {isOpen ? (
              <IconChevronDown className="size-3 text-muted-foreground shrink-0" />
            ) : (
              <IconChevronRight className="size-3 text-muted-foreground shrink-0" />
            )}
            <span className="text-xs font-medium text-foreground truncate">{column.name}</span>
            <span className="text-[10px] text-muted-foreground/60 shrink-0">{column.data_type}</span>
            {column.key && (
              <span className="text-[9px] px-1 py-0.5 rounded bg-primary/10 text-primary shrink-0">
                {column.key}
              </span>
            )}
          </CollapsibleTrigger>
          <button
            type="button"
            onClick={onCopy}
            className="invisible group-hover/field:visible p-1 rounded hover:bg-accent transition-all shrink-0"
            title="Copy value"
          >
            <IconClipboard className="size-3 text-muted-foreground" />
          </button>
        </div>

        {/* Collapsed preview */}
        {!isOpen && (
          <div className="px-2 pb-1.5 pl-6 text-[10px] text-muted-foreground truncate">
            {formattedValue.split('\n')[0].slice(0, 40)}
            {formattedValue.length > 40 && '...'}
          </div>
        )}

        {/* Full content when expanded */}
        <CollapsibleContent>
          <div
            className={`px-2 pb-1.5 pl-6 text-xs ${isNull ? 'text-muted-foreground italic' : 'text-foreground/80'} ${
              isJson ? 'font-mono text-[10px] whitespace-pre-wrap break-all' : ''
            }`}
          >
            {formattedValue}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}
