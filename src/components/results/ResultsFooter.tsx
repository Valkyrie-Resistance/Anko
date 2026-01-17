import { ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { exportToCSV, exportToJSON, exportToSQL } from '@/lib/export-utils'
import { cn } from '@/lib/utils'
import type { QueryResult } from '@/types'

interface ResultsFooterProps {
  result?: QueryResult
  isExecuting?: boolean
  tableName?: string
}

/**
 * Returns performance badge color based on execution time.
 * Green: <100ms, Yellow: 100-500ms, Red: >500ms
 */
function getPerformanceBadgeColor(ms: number): string {
  if (ms < 100) return 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
  if (ms < 500) return 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
  return 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
}

export function ResultsFooter({ result, isExecuting, tableName }: ResultsFooterProps) {
  const getStatusText = () => {
    if (isExecuting) return 'Executing...'
    if (!result) return 'No Data'
    if (result.columns.length === 0) {
      return result.affected_rows > 0 ? `${result.affected_rows} row(s) affected` : 'Query executed'
    }
    return `${result.rows.length} row(s)`
  }

  const executionTime = result?.execution_time_ms
  const hasData = result && result.columns.length > 0 && result.rows.length > 0
  const defaultFilename = tableName || 'query_results'

  const handleExportCSV = async () => {
    if (!result) return
    try {
      const exported = await exportToCSV(result, defaultFilename)
      if (exported) {
        toast.success('Exported to CSV')
      }
    } catch (error) {
      toast.error('Export failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  const handleExportJSON = async () => {
    if (!result) return
    try {
      const exported = await exportToJSON(result, defaultFilename)
      if (exported) {
        toast.success('Exported to JSON')
      }
    } catch (error) {
      toast.error('Export failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  const handleExportSQL = async () => {
    if (!result) return
    try {
      const exported = await exportToSQL(result, tableName || 'table_name', defaultFilename)
      if (exported) {
        toast.success('Exported to SQL')
      }
    } catch (error) {
      toast.error('Export failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  return (
    <div className="flex items-center justify-between px-3 py-1.5 border-t border-zinc-900 bg-zinc-950 text-xs">
      {/* Left: Status */}
      <div className="flex items-center gap-3">
        <span className="text-zinc-500">{getStatusText()}</span>
        {executionTime !== undefined && (
          <Badge
            variant="secondary"
            className={cn(
              'text-[10px] px-1.5 py-0 h-4 font-mono',
              getPerformanceBadgeColor(executionTime),
            )}
          >
            {executionTime}ms
          </Badge>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded transition-colors',
              hasData
                ? 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-900'
                : 'text-zinc-600 cursor-not-allowed',
            )}
            disabled={!hasData}
            render={<button type="button" />}
          >
            Download
            <ChevronDown className="size-3" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-zinc-950 border-zinc-800">
            <DropdownMenuItem
              onClick={handleExportCSV}
              className="text-xs text-zinc-300 focus:bg-zinc-800 focus:text-zinc-200"
            >
              Export as CSV
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleExportJSON}
              className="text-xs text-zinc-300 focus:bg-zinc-800 focus:text-zinc-200"
            >
              Export as JSON
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleExportSQL}
              className="text-xs text-zinc-300 focus:bg-zinc-800 focus:text-zinc-200"
            >
              Export as SQL
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
