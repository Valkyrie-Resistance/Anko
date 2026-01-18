import {
  IconCheck,
  IconClipboard,
  IconClock,
  IconDatabase,
  IconDeviceFloppy,
  IconFileCode,
  IconTrash,
  IconX,
} from '@tabler/icons-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  clearQueryHistory,
  createSavedQuery,
  deleteQueryHistory,
  listQueryHistory,
} from '@/lib/tauri'
import { useConnectionStore } from '@/stores/connection'
import { useQueryHistoryStore } from '@/stores/query-history'
import { useSavedQueriesStore } from '@/stores/saved-queries'
import { useWorkspaceStore } from '@/stores/workspace'
import type { QueryHistoryEntry } from '@/types'

export function HistoryPanel() {
  const [searchQuery, setSearchQuery] = useState('')

  // Stores
  const entries = useQueryHistoryStore((s) => s.entries)
  const setEntries = useQueryHistoryStore((s) => s.setEntries)
  const removeEntry = useQueryHistoryStore((s) => s.removeEntry)
  const clearEntries = useQueryHistoryStore((s) => s.clearEntries)
  const isLoading = useQueryHistoryStore((s) => s.isLoading)
  const setLoading = useQueryHistoryStore((s) => s.setLoading)
  const filterConnectionId = useQueryHistoryStore((s) => s.filterConnectionId)
  const setFilterConnectionId = useQueryHistoryStore((s) => s.setFilterConnectionId)

  const savedConnections = useConnectionStore((s) => s.savedConnections)
  const addQueryTab = useConnectionStore((s) => s.addQueryTab)
  const activeConnections = useConnectionStore((s) => s.activeConnections)

  const addSavedQuery = useSavedQueriesStore((s) => s.addQuery)
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId)

  // Load history on mount
  useEffect(() => {
    const loadHistory = async () => {
      setLoading(true)
      try {
        const history = await listQueryHistory(filterConnectionId ?? undefined, 100)
        setEntries(history)
      } catch (e) {
        console.error('Failed to load query history:', e)
        toast.error('Failed to load query history')
      } finally {
        setLoading(false)
      }
    }
    loadHistory()
  }, [filterConnectionId, setEntries, setLoading])

  // Filter by search
  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return entries
    const query = searchQuery.toLowerCase()
    return entries.filter(
      (entry) =>
        entry.query.toLowerCase().includes(query) ||
        entry.connectionName.toLowerCase().includes(query) ||
        entry.databaseName?.toLowerCase().includes(query),
    )
  }, [entries, searchQuery])

  // Handle delete
  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteQueryHistory(id)
        removeEntry(id)
        toast.success('History entry deleted')
      } catch (e) {
        console.error('Failed to delete history entry:', e)
        toast.error('Failed to delete history entry')
      }
    },
    [removeEntry],
  )

  // Handle clear all
  const handleClearAll = useCallback(async () => {
    try {
      await clearQueryHistory()
      clearEntries()
      toast.success('Query history cleared')
    } catch (e) {
      console.error('Failed to clear query history:', e)
      toast.error('Failed to clear query history')
    }
  }, [clearEntries])

  // Handle copy to clipboard
  const handleCopy = useCallback((query: string) => {
    navigator.clipboard.writeText(query)
    toast.success('Copied to clipboard')
  }, [])

  // Handle open in editor
  const handleOpenInEditor = useCallback(
    (entry: QueryHistoryEntry) => {
      // Find active connection for this entry
      const activeConn = activeConnections.find((c) => c.id === entry.connectionId)

      if (activeConn) {
        // Open in a new query tab
        const tabId = `history-${entry.id}-${Date.now()}`
        addQueryTab({
          id: tabId,
          connectionId: activeConn.id,
          query: entry.query,
          isExecuting: false,
        })
        toast.success('Opened in editor')
      } else {
        // Connection is not active, just copy to clipboard
        navigator.clipboard.writeText(entry.query)
        toast.info('Connection not active', {
          description: 'Query copied to clipboard. Connect first to open in editor.',
        })
      }
    },
    [activeConnections, addQueryTab],
  )

  // Handle save to queries
  const handleSaveToQueries = useCallback(
    async (entry: QueryHistoryEntry) => {
      try {
        // Generate a name from the query (first 30 chars or first line)
        const queryLine = entry.query.trim().split('\n')[0]
        const name = queryLine.length > 30 ? `${queryLine.slice(0, 30)}...` : queryLine

        const saved = await createSavedQuery({
          name,
          query: entry.query,
          description: null,
          workspaceId: activeWorkspaceId !== 'default' ? activeWorkspaceId : null,
          connectionId: entry.connectionId,
          databaseName: entry.databaseName,
        })
        addSavedQuery(saved)
        toast.success('Query saved', {
          description: 'You can find it in the Saved Queries panel',
        })
      } catch (e) {
        console.error('Failed to save query:', e)
        toast.error('Failed to save query')
      }
    },
    [activeWorkspaceId, addSavedQuery],
  )

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex flex-col gap-2 border-b px-3 py-2.5">
        <div className="flex w-full items-center justify-between">
          <div className="text-foreground text-sm font-medium">History</div>
          {entries.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="size-6 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive flex items-center justify-center transition-colors"
              title="Clear All History"
            >
              <IconTrash className="size-3.5" />
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-7 text-xs flex-1"
          />
          <Select
            value={filterConnectionId ?? 'all'}
            onValueChange={(v) => setFilterConnectionId(v === 'all' ? null : v)}
          >
            <SelectTrigger className="h-7 w-24 text-xs">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {savedConnections.map((conn) => (
                <SelectItem key={conn.id} value={conn.id}>
                  {conn.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* History list */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-2 space-y-0.5">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
          ) : filteredEntries.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {searchQuery ? 'No matching history' : 'No query history yet'}
            </div>
          ) : (
            filteredEntries.map((entry) => (
              <HistoryEntry
                key={entry.id}
                entry={entry}
                onDelete={() => handleDelete(entry.id)}
                onCopy={() => handleCopy(entry.query)}
                onOpenInEditor={() => handleOpenInEditor(entry)}
                onSaveToQueries={() => handleSaveToQueries(entry)}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

interface HistoryEntryProps {
  entry: QueryHistoryEntry
  onDelete: () => void
  onCopy: () => void
  onOpenInEditor: () => void
  onSaveToQueries: () => void
}

function HistoryEntry({ entry, onDelete, onCopy, onOpenInEditor, onSaveToQueries }: HistoryEntryProps) {
  // Format timestamp
  const formattedTime = useMemo(() => {
    const date = new Date(entry.executedAt)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }, [entry.executedAt])

  // Truncate query for display
  const queryPreview = useMemo(() => {
    const trimmed = entry.query.trim().replace(/\s+/g, ' ')
    return trimmed.length > 100 ? `${trimmed.slice(0, 100)}...` : trimmed
  }, [entry.query])

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          className="group px-2 py-1.5 rounded-md hover:bg-accent/50 cursor-pointer select-none"
          onDoubleClick={onOpenInEditor}
        >
          {/* Status and time */}
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-0.5">
            {entry.success ? (
              <IconCheck className="size-3 text-green-500" />
            ) : (
              <IconX className="size-3 text-destructive" />
            )}
            <span className="flex items-center gap-1">
              <IconClock className="size-2.5" />
              {formattedTime}
            </span>
            {entry.executionTimeMs !== null && (
              <span className="text-muted-foreground/60">{entry.executionTimeMs}ms</span>
            )}
            {entry.rowCount !== null && entry.success && (
              <span className="text-muted-foreground/60">{entry.rowCount} rows</span>
            )}
          </div>

          {/* Query preview */}
          <div className="text-xs font-mono truncate text-foreground/80">{queryPreview}</div>

          {/* Connection info */}
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60 mt-0.5">
            <IconDatabase className="size-2.5" />
            <span className="truncate">
              {entry.connectionName}
              {entry.databaseName && ` / ${entry.databaseName}`}
            </span>
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={onCopy}>
          <IconClipboard className="size-4 mr-2" />
          Copy Query
        </ContextMenuItem>
        <ContextMenuItem onClick={onOpenInEditor}>
          <IconFileCode className="size-4 mr-2" />
          Open in Editor
        </ContextMenuItem>
        <ContextMenuItem onClick={onSaveToQueries}>
          <IconDeviceFloppy className="size-4 mr-2" />
          Save to Queries
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={onDelete} variant="destructive">
          <IconTrash className="size-4 mr-2" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
