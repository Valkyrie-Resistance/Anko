import { ChevronDown, Settings } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { QueryResult } from '@/types'

interface ResultsFooterProps {
  result?: QueryResult
  isExecuting?: boolean
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

export function ResultsFooter({ result, isExecuting }: ResultsFooterProps) {
  const getStatusText = () => {
    if (isExecuting) return 'Executing...'
    if (!result) return 'No Data'
    if (result.columns.length === 0) {
      return result.affected_rows > 0 ? `${result.affected_rows} row(s) affected` : 'Query executed'
    }
    return `${result.rows.length} row(s)`
  }

  const executionTime = result?.execution_time_ms

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
            className="flex items-center gap-1 px-2 py-1 text-zinc-400 hover:text-zinc-300 hover:bg-zinc-900 rounded transition-colors"
            render={<button type="button" />}
          >
            Download
            <ChevronDown className="size-3" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-zinc-950 border-zinc-800">
            <DropdownMenuItem className="text-xs text-zinc-300 focus:bg-zinc-800 focus:text-zinc-200">
              Export as CSV
            </DropdownMenuItem>
            <DropdownMenuItem className="text-xs text-zinc-300 focus:bg-zinc-800 focus:text-zinc-200">
              Export as JSON
            </DropdownMenuItem>
            <DropdownMenuItem className="text-xs text-zinc-300 focus:bg-zinc-800 focus:text-zinc-200">
              Export as SQL
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <button
          type="button"
          className="p-1.5 text-zinc-400 hover:text-zinc-300 hover:bg-zinc-900 rounded transition-colors"
        >
          <Settings className="size-4" />
        </button>
      </div>
    </div>
  )
}
