import { getCurrentWindow } from '@tauri-apps/api/window'
import { useCallback, useEffect, useState } from 'react'
import { ErrorBoundary } from '@/components/errors/ErrorBoundary'
import { CloseAppDialog, getCloseAppPreference } from '@/components/layout/CloseAppDialog'
import { RightSidebar } from '@/components/layout/RightSidebar'
import { RightSidebarContextContent } from '@/components/layout/right-sidebar'
import { TitleBar } from '@/components/layout/TitleBar'
import { TabContainer } from '@/components/layout/tabs'
import { AppSidebar } from '@/components/sidebar/AppSidebar'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { Toaster } from '@/components/ui/sonner'
import { UpdateModal } from '@/components/update/UpdateModal'
import { useUpdateChecker } from '@/hooks/useUpdateChecker'
import { listConnections } from '@/lib/tauri'
import { useConnectionStore } from '@/stores/connection'
import { useLeftSidebarStore } from '@/stores/left-sidebar'
import { useRightSidebarStore } from '@/stores/right-sidebar'
import type { ActiveConnection } from '@/types'

function App() {
  const setSavedConnections = useConnectionStore((s) => s.setSavedConnections)
  const addQueryTab = useConnectionStore((s) => s.addQueryTab)
  const queryTabs = useConnectionStore((s) => s.queryTabs)
  const activeTabId = useConnectionStore((s) => s.activeTabId)
  const removeQueryTab = useConnectionStore((s) => s.removeQueryTab)

  // Sidebar stores
  const toggleLeftSidebar = useLeftSidebarStore((s) => s.toggle)
  const toggleRightSidebar = useRightSidebarStore((s) => s.toggle)

  // Close app dialog state
  const [showCloseDialog, setShowCloseDialog] = useState(false)

  // Check for updates on startup
  useUpdateChecker()

  // Load saved connections on mount
  useEffect(() => {
    const loadConnections = async () => {
      try {
        const connections = await listConnections()
        setSavedConnections(connections)
      } catch (e) {
        console.error('Failed to load connections:', e)
      }
    }
    loadConnections()
  }, [setSavedConnections])

  // Handle Cmd/Ctrl+W keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd+W (Mac) or Ctrl+W (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'w') {
        e.preventDefault()

        // If there are open tabs, close the active tab
        if (queryTabs.length > 0 && activeTabId) {
          removeQueryTab(activeTabId)
          return
        }

        // No tabs open - check preference for closing app
        const preference = getCloseAppPreference()

        if (preference === 'always-close') {
          getCurrentWindow().close()
        } else if (preference === 'never-close') {
          // Do nothing
        } else {
          // Show confirmation dialog
          setShowCloseDialog(true)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [queryTabs.length, activeTabId, removeQueryTab])

  // Disable right-click and browser reload shortcuts in production
  useEffect(() => {
    if (import.meta.env.DEV) return

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Block F5, Cmd+R, Ctrl+R (reload)
      if (e.key === 'F5' || ((e.metaKey || e.ctrlKey) && e.key === 'r')) {
        e.preventDefault()
      }
    }

    window.addEventListener('contextmenu', handleContextMenu)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('contextmenu', handleContextMenu)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  // Handle connection selection - create a new query tab
  const handleConnectionSelect = useCallback(
    (connection: ActiveConnection) => {
      const tabId = `${connection.id}-${Date.now()}`
      addQueryTab({
        id: tabId,
        connectionId: connection.id,
        query: '',
        isExecuting: false,
      })
    },
    [addQueryTab],
  )

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" storageKey="anko-theme">
        {/* Toast notifications - rendered at root level for maximum z-index */}
        <Toaster />

        {/* Title bar fixed at top */}
        <TitleBar
          onToggleLeftSidebar={toggleLeftSidebar}
          onToggleRightSidebar={toggleRightSidebar}
        />

        {/* Main content area below title bar */}
        <div className="h-screen pt-9 flex overflow-hidden">
          <AppSidebar onConnectionSelect={handleConnectionSelect} />

          {/* Main content */}
          <main className="flex-1 overflow-hidden bg-background">
            <TabContainer />
          </main>

          <RightSidebar>
            <RightSidebarContextContent />
          </RightSidebar>
        </div>

        {/* Dialogs */}
        <CloseAppDialog
          open={showCloseDialog}
          onOpenChange={setShowCloseDialog}
          onConfirm={() => {
            setShowCloseDialog(false)
            getCurrentWindow().close()
          }}
          onCancel={() => setShowCloseDialog(false)}
        />
        <UpdateModal />
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App
