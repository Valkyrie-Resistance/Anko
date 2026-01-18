import { Loader2 } from 'lucide-react'
import { memo } from 'react'
import { DataTable } from './DataTable'
import { DebugPanel } from './DebugPanel'
import type { ResultsTableProps } from './definitions'
import { KeyboardShortcutsHelp } from './KeyboardShortcutsHelp'

export const ResultsTable = memo(function ResultsTable({
  result,
  error,
  isExecuting,
}: ResultsTableProps) {
  if (isExecuting) {
    return (
      <div className="flex items-center justify-center h-full bg-black text-zinc-500">
        <Loader2 className="size-4 animate-spin mr-2" />
        <span className="text-xs">Executing query...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-3 bg-black h-full">
        <div className="text-red-400 bg-red-950/50 border border-red-900/50 p-3 rounded text-xs font-mono whitespace-pre-wrap">
          {error}
        </div>
      </div>
    )
  }

  if (!result) {
    return <KeyboardShortcutsHelp />
  }

  // Non-SELECT query (no columns returned)
  if (result.columns.length === 0) {
    return (
      <div className="bg-black h-full flex flex-col">
        <DebugPanel originalQuery={result.original_query} executedQuery={result.executed_query} />
        <div className="p-3 flex-1">
          <div className="text-green-400 bg-green-950/50 border border-green-900/50 p-3 rounded text-xs">
            Query executed successfully.
            {result.affected_rows > 0 && (
              <span className="block mt-1">{result.affected_rows} row(s) affected.</span>
            )}
            <span className="block mt-1 text-zinc-500">
              Execution time: {result.execution_time_ms}ms
            </span>
          </div>
        </div>
      </div>
    )
  }

  return <DataTable result={result} />
})
