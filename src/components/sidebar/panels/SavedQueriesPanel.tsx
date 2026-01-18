import {
  IconClipboard,
  IconCode,
  IconFileCode,
  IconPencil,
  IconPlus,
  IconTrash,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
  createSavedQuery,
  deleteSavedQuery,
  listSavedQueries,
  updateSavedQuery,
} from '@/lib/tauri'
import { useConnectionStore } from '@/stores/connection'
import { useSavedQueriesStore } from '@/stores/saved-queries'
import { useWorkspaceStore } from '@/stores/workspace'
import type { SavedQuery } from '@/types'

export function SavedQueriesPanel() {
  const [searchQuery, setSearchQuery] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingQuery, setEditingQuery] = useState<SavedQuery | null>(null)

  // Stores
  const queries = useSavedQueriesStore((s) => s.queries)
  const setQueries = useSavedQueriesStore((s) => s.setQueries)
  const addQuery = useSavedQueriesStore((s) => s.addQuery)
  const updateQueryInStore = useSavedQueriesStore((s) => s.updateQuery)
  const removeQuery = useSavedQueriesStore((s) => s.removeQuery)
  const isLoading = useSavedQueriesStore((s) => s.isLoading)
  const setLoading = useSavedQueriesStore((s) => s.setLoading)

  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId)
  const activeConnections = useConnectionStore((s) => s.activeConnections)
  const addQueryTab = useConnectionStore((s) => s.addQueryTab)

  // Load saved queries on mount
  useEffect(() => {
    const loadQueries = async () => {
      setLoading(true)
      try {
        const savedQueries = await listSavedQueries()
        setQueries(savedQueries)
      } catch (e) {
        console.error('Failed to load saved queries:', e)
        toast.error('Failed to load saved queries')
      } finally {
        setLoading(false)
      }
    }
    loadQueries()
  }, [setQueries, setLoading])

  // Filter by search and workspace
  const filteredQueries = useMemo(() => {
    let filtered = queries

    // Filter by workspace (show queries in active workspace or without workspace)
    if (activeWorkspaceId && activeWorkspaceId !== 'default') {
      filtered = filtered.filter(
        (q) => q.workspaceId === activeWorkspaceId || q.workspaceId === null,
      )
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (q) =>
          q.name.toLowerCase().includes(query) ||
          q.query.toLowerCase().includes(query) ||
          q.description?.toLowerCase().includes(query),
      )
    }

    return filtered
  }, [queries, searchQuery, activeWorkspaceId])

  // Handle delete
  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteSavedQuery(id)
        removeQuery(id)
        toast.success('Query deleted')
      } catch (e) {
        console.error('Failed to delete saved query:', e)
        toast.error('Failed to delete query')
      }
    },
    [removeQuery],
  )

  // Handle copy to clipboard
  const handleCopy = useCallback((query: string) => {
    navigator.clipboard.writeText(query)
    toast.success('Copied to clipboard')
  }, [])

  // Handle open in editor
  const handleOpenInEditor = useCallback(
    (savedQuery: SavedQuery) => {
      // Find first active connection (or the associated connection if available)
      let activeConn = savedQuery.connectionId
        ? activeConnections.find((c) => c.id === savedQuery.connectionId)
        : activeConnections[0]

      if (!activeConn && activeConnections.length > 0) {
        activeConn = activeConnections[0]
      }

      if (activeConn) {
        // Open in a new query tab
        const tabId = `saved-${savedQuery.id}-${Date.now()}`
        addQueryTab({
          id: tabId,
          connectionId: activeConn.connectionId,
          query: savedQuery.query,
          isExecuting: false,
        })
        toast.success('Opened in editor')
      } else {
        // No active connection, just copy to clipboard
        navigator.clipboard.writeText(savedQuery.query)
        toast.info('No active connection', {
          description: 'Query copied to clipboard. Connect to a database first.',
        })
      }
    },
    [activeConnections, addQueryTab],
  )

  // Handle new query
  const handleNewQuery = () => {
    setEditingQuery(null)
    setDialogOpen(true)
  }

  // Handle edit query
  const handleEditQuery = (query: SavedQuery) => {
    setEditingQuery(query)
    setDialogOpen(true)
  }

  // Handle save query
  const handleSaveQuery = async (
    name: string,
    query: string,
    description: string,
  ) => {
    try {
      if (editingQuery) {
        // Update existing
        const updated = await updateSavedQuery(editingQuery.id, {
          name,
          query,
          description: description || null,
        })
        updateQueryInStore(editingQuery.id, updated)
        toast.success('Query updated')
      } else {
        // Create new
        const created = await createSavedQuery({
          name,
          query,
          description: description || null,
          workspaceId: activeWorkspaceId !== 'default' ? activeWorkspaceId : null,
          connectionId: null,
          databaseName: null,
        })
        addQuery(created)
        toast.success('Query saved')
      }
      setDialogOpen(false)
    } catch (e) {
      console.error('Failed to save query:', e)
      toast.error('Failed to save query')
    }
  }

  return (
    <>
      <div className="flex flex-col h-full min-h-0">
        {/* Header */}
        <div className="flex flex-col gap-2 border-b px-3 py-2.5">
          <div className="flex w-full items-center justify-between">
            <div className="text-foreground text-sm font-medium">Saved Queries</div>
            <button
              type="button"
              onClick={handleNewQuery}
              className="size-6 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center transition-colors"
              title="New Saved Query"
            >
              <IconPlus className="size-3.5" />
            </button>
          </div>
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-7 text-xs"
          />
        </div>

        {/* Queries list */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-2 space-y-0.5">
            {isLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
            ) : filteredQueries.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {searchQuery ? 'No matching queries' : 'No saved queries yet'}
              </div>
            ) : (
              filteredQueries.map((query) => (
                <SavedQueryItem
                  key={query.id}
                  query={query}
                  onDelete={() => handleDelete(query.id)}
                  onCopy={() => handleCopy(query.query)}
                  onOpenInEditor={() => handleOpenInEditor(query)}
                  onEdit={() => handleEditQuery(query)}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      <SaveQueryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editQuery={editingQuery}
        onSave={handleSaveQuery}
      />
    </>
  )
}

interface SavedQueryItemProps {
  query: SavedQuery
  onDelete: () => void
  onCopy: () => void
  onOpenInEditor: () => void
  onEdit: () => void
}

function SavedQueryItem({ query, onDelete, onCopy, onOpenInEditor, onEdit }: SavedQueryItemProps) {
  // Truncate query for display
  const queryPreview = useMemo(() => {
    const trimmed = query.query.trim().replace(/\s+/g, ' ')
    return trimmed.length > 80 ? `${trimmed.slice(0, 80)}...` : trimmed
  }, [query.query])

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          className="group px-2 py-1.5 rounded-md hover:bg-accent/50 cursor-pointer select-none"
          onDoubleClick={onOpenInEditor}
        >
          {/* Name */}
          <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
            <IconCode className="size-3.5 text-primary/70" />
            {query.name}
          </div>

          {/* Query preview */}
          <div className="text-[10px] font-mono truncate text-muted-foreground mt-0.5">
            {queryPreview}
          </div>

          {/* Description if exists */}
          {query.description && (
            <div className="text-[10px] text-muted-foreground/60 truncate mt-0.5">
              {query.description}
            </div>
          )}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={onOpenInEditor}>
          <IconFileCode className="size-4 mr-2" />
          Open in Editor
        </ContextMenuItem>
        <ContextMenuItem onClick={onCopy}>
          <IconClipboard className="size-4 mr-2" />
          Copy Query
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={onEdit}>
          <IconPencil className="size-4 mr-2" />
          Edit
        </ContextMenuItem>
        <ContextMenuItem onClick={onDelete} variant="destructive">
          <IconTrash className="size-4 mr-2" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

interface SaveQueryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editQuery: SavedQuery | null
  onSave: (name: string, query: string, description: string) => void
}

function SaveQueryDialog({ open, onOpenChange, editQuery, onSave }: SaveQueryDialogProps) {
  const [name, setName] = useState('')
  const [query, setQuery] = useState('')
  const [description, setDescription] = useState('')

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      if (editQuery) {
        setName(editQuery.name)
        setQuery(editQuery.query)
        setDescription(editQuery.description ?? '')
      } else {
        setName('')
        setQuery('')
        setDescription('')
      }
    }
  }, [open, editQuery])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !query.trim()) return
    onSave(name.trim(), query.trim(), description.trim())
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{editQuery ? 'Edit Query' : 'Save Query'}</DialogTitle>
            <DialogDescription>
              {editQuery
                ? 'Update the saved query details.'
                : 'Save this query for quick access later.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Get all users"
                autoFocus
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="query">Query</Label>
              <Textarea
                id="query"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="SELECT * FROM users WHERE active = 1"
                className="font-mono text-sm min-h-[120px]"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of what this query does"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || !query.trim()}>
              {editQuery ? 'Save Changes' : 'Save Query'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
