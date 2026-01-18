import { IconClipboard } from '@tabler/icons-react'
import { useMemo } from 'react'
import { toast } from 'sonner'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatValue, isJsonLike, prettyPrintJson } from '@/lib/zod-generator'

interface CellDetailsProps {
  value: unknown
  columnName: string
  columnType: string
}

export function CellDetails({ value, columnName, columnType }: CellDetailsProps) {
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

  const handleCopy = () => {
    navigator.clipboard.writeText(formattedValue)
    toast.success('Copied to clipboard')
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-medium text-foreground truncate">{columnName}</span>
          <span className="text-[10px] text-muted-foreground/60">{columnType}</span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="p-1 rounded hover:bg-accent transition-colors"
          title="Copy value"
        >
          <IconClipboard className="size-3.5 text-muted-foreground" />
        </button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3">
          <div
            className={`text-sm ${isNull ? 'text-muted-foreground italic' : 'text-foreground'} ${
              isJson
                ? 'font-mono text-xs whitespace-pre-wrap break-all'
                : 'whitespace-pre-wrap break-words'
            }`}
          >
            {formattedValue}
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
