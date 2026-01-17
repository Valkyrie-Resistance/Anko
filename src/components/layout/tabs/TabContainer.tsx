import { IconTable } from '@tabler/icons-react'
import { Code2, Plus, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { tabLogger } from '@/lib/debug'
import { cn } from '@/lib/utils'
import { useConnectionStore } from '@/stores/connection'
import { QueryTabContent } from './QueryTabContent'
import { TabActionDialog } from './TabActionDialog'
import { TableTabContent } from './TableTabContent'
import { UnsavedChangesDialog } from './UnsavedChangesDialog'

export function TabContainer() {
  // Data selectors (stable object references)
  const queryTabs = useConnectionStore((s) => s.queryTabs)
  const activeTabId = useConnectionStore((s) => s.activeTabId)
  const activeConnections = useConnectionStore((s) => s.activeConnections)

  // Store actions - use refs to stabilize dependencies and prevent infinite re-renders
  const setActiveTabIdRef = useRef(useConnectionStore.getState().setActiveTabId)
  const removeQueryTabRef = useRef(useConnectionStore.getState().removeQueryTab)
  const discardAllChangesRef = useRef(useConnectionStore.getState().discardAllChanges)

  // Note: Refs are initialized with getState() above and don't need updating
  // since Zustand store actions are stable references

  const [dialogMode, setDialogMode] = useState<'query' | 'table' | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const [pendingAction, setPendingAction] = useState<{
    type: 'close' | 'switch'
    tabId: string
    targetTabId?: string
  } | null>(null)

  const hasTabs = queryTabs.length > 0
  const hasConnections = activeConnections.length > 0

  // Helper to check if a tab has pending changes
  const getTabWithChanges = useCallback(
    (tabId: string) => {
      const tab = queryTabs.find((t) => t.id === tabId)
      if (tab?.tableName && tab.editState?.pendingChanges?.length) {
        return { tab, changesCount: tab.editState.pendingChanges.length }
      }
      return null
    },
    [queryTabs],
  )

  // Memoized tab indices by connection - O(N) instead of O(N²)
  const tabIndicesByConnection = useMemo(() => {
    const map = new Map<string, Map<string, number>>()
    queryTabs.forEach((tab) => {
      if (!map.has(tab.connectionId)) map.set(tab.connectionId, new Map())
      const connMap = map.get(tab.connectionId)!
      connMap.set(tab.id, connMap.size + 1)
    })
    return map
  }, [queryTabs])

  const handleNewQuery = () => {
    if (!hasConnections) {
      toast.error('No active connections', {
        description: 'Connect to a database first',
      })
      setMenuOpen(false)
      return
    }
    tabLogger.debug('new query tab requested')
    setDialogMode('query')
    setMenuOpen(false)
  }

  const handleOpenTable = () => {
    if (!hasConnections) {
      toast.error('No active connections', {
        description: 'Connect to a database first',
      })
      setMenuOpen(false)
      return
    }
    tabLogger.debug('open table tab requested')
    setDialogMode('table')
    setMenuOpen(false)
  }

  const getTabLabel = (tabId: string, connectionId: string) => {
    const tabIndex = tabIndicesByConnection.get(connectionId)?.get(tabId) ?? 1
    return `Query #${tabIndex}`
  }

  const handleCloseTab = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation()

    // Check for unsaved changes
    const tabWithChanges = getTabWithChanges(tabId)
    if (tabWithChanges) {
      tabLogger.debug('tab close blocked - unsaved changes', { tabId, changesCount: tabWithChanges.changesCount })
      setPendingAction({ type: 'close', tabId })
      setShowUnsavedDialog(true)
      return
    }

    tabLogger.debug('tab closed', { tabId })
    removeQueryTabRef.current(tabId)
  }

  const handleTabClick = (tabId: string) => {
    if (tabId === activeTabId) return

    // Check if current tab has unsaved changes
    if (activeTabId) {
      const tabWithChanges = getTabWithChanges(activeTabId)
      if (tabWithChanges) {
        tabLogger.debug('tab switch blocked - unsaved changes', { fromTabId: activeTabId, toTabId: tabId })
        setPendingAction({ type: 'switch', tabId: activeTabId, targetTabId: tabId })
        setShowUnsavedDialog(true)
        return
      }
    }

    tabLogger.debug('tab switched', { fromTabId: activeTabId, toTabId: tabId })
    setActiveTabIdRef.current(tabId)
  }

  const handleDialogDiscard = useCallback(() => {
    if (!pendingAction) return

    tabLogger.debug('changes discarded', { tabId: pendingAction.tabId, action: pendingAction.type })

    // Discard changes for the tab
    discardAllChangesRef.current(pendingAction.tabId)
    setShowUnsavedDialog(false)

    if (pendingAction.type === 'close') {
      removeQueryTabRef.current(pendingAction.tabId)
    } else if (pendingAction.type === 'switch' && pendingAction.targetTabId) {
      setActiveTabIdRef.current(pendingAction.targetTabId)
    }

    setPendingAction(null)
  }, [pendingAction])

  const handleDialogCancel = useCallback(() => {
    setShowUnsavedDialog(false)
    setPendingAction(null)
  }, [])

  // Get changes count for the dialog
  const pendingChangesCount = useMemo(() => {
    if (!pendingAction) return 0
    const tab = queryTabs.find((t) => t.id === pendingAction.tabId)
    return tab?.editState?.pendingChanges?.length ?? 0
  }, [pendingAction, queryTabs])

  return (
    <div className="h-full flex flex-col bg-black">
      {/* Tab Bar */}
      <div className="flex items-center bg-zinc-950 border-b border-zinc-900 min-w-0">
        <div className="flex items-center gap-0.5 px-1 pt-1 overflow-x-auto flex-1 min-w-0 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
          {queryTabs.map((tab) => {
            const isActive = tab.id === activeTabId
            const isTableTab = tab.tableName !== undefined
            const hasChanges = isTableTab && (tab.editState?.pendingChanges?.length ?? 0) > 0

            return (
              <div
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') handleTabClick(tab.id)
                }}
                role="tab"
                tabIndex={0}
                aria-selected={isActive}
                className={cn(
                  'group relative flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-t-md border-t border-l border-r transition-colors shrink-0 cursor-pointer select-none',
                  isActive
                    ? 'bg-black border-zinc-800 text-zinc-200'
                    : 'bg-zinc-900/50 border-transparent text-zinc-400 hover:text-zinc-300 hover:bg-zinc-900',
                )}
              >
                {isTableTab ? <IconTable className="size-3.5" /> : <Code2 className="size-3.5" />}
                <span className="max-w-32 truncate">
                  {isTableTab ? (
                    <>
                      {tab.tableName} <span className="text-zinc-500">/all</span>
                    </>
                  ) : (
                    getTabLabel(tab.id, tab.connectionId)
                  )}
                </span>
                {/* Unsaved changes indicator */}
                {hasChanges && (
                  <span className="size-2 rounded-full bg-amber-500" title="Unsaved changes" />
                )}
                <button
                  type="button"
                  onClick={(e) => handleCloseTab(e, tab.id)}
                  className={cn(
                    'ml-1 p-0.5 rounded-sm transition-opacity',
                    isActive
                      ? 'opacity-50 hover:opacity-100 hover:bg-zinc-800'
                      : 'opacity-0 group-hover:opacity-50 hover:opacity-100! hover:bg-zinc-800',
                  )}
                >
                  <X className="size-3" />
                </button>
              </div>
            )
          })}
        </div>

        {/* New Tab Button */}
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger
            className="flex items-center justify-center size-7 mx-1 rounded-md transition-colors shrink-0 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
            render={<button type="button" />}
          >
            <Plus className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={6} className="min-w-40">
            <DropdownMenuItem onClick={handleNewQuery}>
              <Code2 className="size-4" />
              New Query
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleOpenTable}>
              <IconTable className="size-4" />
              Open Table
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0">
        {hasTabs ? (
          queryTabs.map((tab) => {
            const isTableTab = tab.tableName !== undefined
            return (
              <div
                key={tab.id}
                className={cn('h-full', tab.id === activeTabId ? 'block' : 'hidden')}
              >
                {isTableTab ? (
                  <TableTabContent tabId={tab.id} />
                ) : (
                  <QueryTabContent tabId={tab.id} />
                )}
              </div>
            )
          })
        ) : (
          <div className="flex items-center justify-center h-full bg-black">
            <div className="text-center max-w-md px-4">
              <div className="size-16 rounded-full bg-zinc-900 flex items-center justify-center mx-auto mb-4">
                <Code2 className="size-8 text-zinc-600" />
              </div>
              <h2 className="text-lg font-medium text-zinc-300 mb-2">
                {hasConnections ? 'No tabs open' : 'No active connections'}
              </h2>
              <p className="text-sm text-zinc-500">
                {hasConnections
                  ? 'Create a new query or open a table to get started'
                  : 'Select a connection from the sidebar to start querying your databases'}
              </p>
            </div>
          </div>
        )}
      </div>

      <TabActionDialog
        open={dialogMode !== null}
        mode={dialogMode ?? 'query'}
        onOpenChange={(open) => {
          if (!open) setDialogMode(null)
        }}
      />

      {/* Unsaved Changes Dialog */}
      <UnsavedChangesDialog
        open={showUnsavedDialog}
        changesCount={pendingChangesCount}
        onDiscard={handleDialogDiscard}
        onCancel={handleDialogCancel}
      />
    </div>
  )
}
