import {
  IconBug,
  IconDatabase,
  IconDatabaseOff,
  IconDownload,
  IconFolderOff,
  IconLayoutGrid,
  IconPlugConnected,
  IconRefresh,
  IconServer,
  IconSparkles,
  IconTerminal,
  IconTrash,
  IconUpload,
} from '@tabler/icons-react'
import { getVersion } from '@tauri-apps/api/app'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { formatErrorMessage } from '@/lib/error-utils'
import {
  addConnectionToWorkspace as addConnectionToWorkspaceBackend,
  clearAllData,
  deleteWorkspace,
  listConnections,
  listWorkspaces,
  saveConnection,
} from '@/lib/tauri'
import { fetchLatestChangelog } from '@/lib/updater'
import { useConnectionStore } from '@/stores/connection'
import { useUpdateStore } from '@/stores/update'
import { createDefaultWorkspace, DEFAULT_WORKSPACE_ID, useWorkspaceStore } from '@/stores/workspace'
import type { ConnectionConfig, DatabaseDriver } from '@/types'
import { ConfirmDialog } from './ConfirmDialog'

// Test database configurations matching docker-compose.yml
const TEST_DATABASES: ConnectionConfig[] = [
  {
    name: 'MySQL 8',
    host: 'localhost',
    port: 3306,
    username: 'anko',
    password: 'anko123',
    database: 'testdb',
    driver: 'mysql' as DatabaseDriver,
  },
  {
    name: 'PostgreSQL 16',
    host: 'localhost',
    port: 5432,
    username: 'anko',
    password: 'anko123',
    database: 'testdb',
    driver: 'postgresql' as DatabaseDriver,
  },
  {
    name: 'MariaDB 11',
    host: 'localhost',
    port: 3307,
    username: 'anko',
    password: 'anko123',
    database: 'testdb',
    driver: 'mysql' as DatabaseDriver,
  },
  {
    name: 'PostgreSQL 15',
    host: 'localhost',
    port: 5433,
    username: 'anko',
    password: 'anko123',
    database: 'appdb',
    driver: 'postgresql' as DatabaseDriver,
  },
  {
    name: 'MySQL 8.4 LTS',
    host: 'localhost',
    port: 3308,
    username: 'anko',
    password: 'anko123',
    database: 'legacydb',
    driver: 'mysql' as DatabaseDriver,
  },
]

interface DevToolsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DevToolsDialog({ open, onOpenChange }: DevToolsDialogProps) {
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    title: string
    description: string
    onConfirm: () => Promise<void>
    variant: 'default' | 'destructive'
  } | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Store access
  const schemaCache = useConnectionStore((s) => s.schemaCache)
  const activeConnections = useConnectionStore((s) => s.activeConnections)
  const savedConnections = useConnectionStore((s) => s.savedConnections)
  const clearAllSchemaCache = useConnectionStore((s) => s.clearAllSchemaCache)
  const setSavedConnections = useConnectionStore((s) => s.setSavedConnections)

  // Workspace store access
  const workspaces = useWorkspaceStore((s) => s.workspaces)
  const setWorkspaces = useWorkspaceStore((s) => s.setWorkspaces)
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace)
  const addConnectionToWorkspace = useWorkspaceStore((s) => s.addConnectionToWorkspace)

  // Debug mode state - parse enabled namespaces
  const [enabledNamespaces, setEnabledNamespaces] = useState<Set<string>>(() => {
    const value = localStorage.getItem('anko-debug')
    if (!value || value === 'false') return new Set()
    if (value === '*' || value === 'true') return new Set(['tauri', 'store', 'app'])
    return new Set(
      value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    )
  })

  const debugMode = enabledNamespaces.size > 0

  const toggleNamespace = (namespace: string) => {
    setEnabledNamespaces((prev) => {
      const next = new Set(prev)
      if (next.has(namespace)) {
        next.delete(namespace)
      } else {
        next.add(namespace)
      }
      // Save to localStorage
      if (next.size === 0) {
        localStorage.removeItem('anko-debug')
      } else {
        localStorage.setItem('anko-debug', Array.from(next).join(','))
      }
      return next
    })
  }

  // Reset handlers
  const handleClearSchemaCache = async () => {
    clearAllSchemaCache()
    toast.success('Schema cache cleared')
  }

  const handleResetWorkspaces = async () => {
    setIsLoading(true)
    try {
      // Get all workspaces and delete non-default ones from backend
      const allWorkspaces = await listWorkspaces()
      for (const ws of allWorkspaces) {
        if (ws.id !== DEFAULT_WORKSPACE_ID) {
          try {
            await deleteWorkspace(ws.id)
          } catch (e) {
            console.warn(`Failed to delete workspace ${ws.id}:`, e)
          }
        }
      }

      // Reset to just the default workspace with original name/icon and no connections
      const defaultWorkspace = createDefaultWorkspace()
      setWorkspaces([defaultWorkspace])
      setActiveWorkspace(defaultWorkspace.id)
      toast.success('Workspaces reset', {
        description: 'All workspaces deleted, default workspace recreated',
      })
    } catch (e) {
      toast.error('Failed to reset workspaces', {
        description: formatErrorMessage(e),
      })
    } finally {
      setIsLoading(false)
      setConfirmDialog(null)
    }
  }

  const handleClearAllData = async () => {
    setIsLoading(true)
    try {
      await clearAllData()
      const connections = await listConnections()
      setSavedConnections(connections)
      toast.success('All data cleared', {
        description: 'Connections and workspaces have been deleted',
      })
      setConfirmDialog(null)
    } catch (e) {
      toast.error('Failed to clear data', {
        description: formatErrorMessage(e),
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Debug utilities
  const handleViewSchemaCache = () => {
    console.log('[DevTools] Schema Cache:', schemaCache)
    toast.info('Schema cache logged to console', {
      description: `${Object.keys(schemaCache).length} connection(s) cached`,
    })
  }

  const handleViewActiveConnections = () => {
    console.log('[DevTools] Active Connections:', activeConnections)
    toast.info('Active connections logged to console', {
      description: `${activeConnections.length} active connection(s)`,
    })
  }

  const handleViewStoreState = () => {
    const state = useConnectionStore.getState()
    console.log('[DevTools] Full Store State:', state)
    toast.info('Store state logged to console')
  }

  const handleToggleDebug = () => {
    if (debugMode) {
      // Disable all
      setEnabledNamespaces(new Set())
      localStorage.removeItem('anko-debug')
      toast.success('Debug mode disabled')
    } else {
      // Enable all
      const allNamespaces = new Set(['tauri', 'store', 'app'])
      setEnabledNamespaces(allNamespaces)
      localStorage.setItem('anko-debug', '*')
      toast.success('Debug mode enabled (all namespaces)')
    }
  }

  const handleClearLocalStorage = () => {
    localStorage.clear()
    toast.success('Local storage cleared')
  }

  // Load test databases from docker-compose (save only, no auto-connect)
  const handleLoadTestDatabases = async () => {
    setIsLoading(true)
    let savedCount = 0
    let skippedCount = 0
    const errors: string[] = []

    for (const config of TEST_DATABASES) {
      try {
        // Check if connection already exists
        const existing = savedConnections.find(
          (c) => c.host === config.host && c.port === config.port && c.name === config.name,
        )

        if (existing) {
          skippedCount++
          continue
        }

        // Save the connection
        const connectionInfo = await saveConnection(config)
        savedCount++

        // Add to default workspace (persist to backend and update local state)
        await addConnectionToWorkspaceBackend(DEFAULT_WORKSPACE_ID, connectionInfo.id)
        addConnectionToWorkspace(DEFAULT_WORKSPACE_ID, connectionInfo.id)
      } catch (e) {
        errors.push(`${config.name}: ${formatErrorMessage(e)}`)
      }
    }

    // Refresh saved connections list
    const connections = await listConnections()
    setSavedConnections(connections)

    setIsLoading(false)

    if (errors.length > 0) {
      console.error('[DevTools] Test database errors:', errors)
      toast.warning('Test databases partially saved', {
        description: `Saved: ${savedCount}, Skipped: ${skippedCount}, Errors: ${errors.length}`,
      })
    } else {
      toast.success('Test databases saved', {
        description: `Saved: ${savedCount} new, Skipped: ${skippedCount} existing`,
      })
    }
  }

  // Export/Import
  const handleExportConnections = () => {
    const exportData = savedConnections.map((conn) => ({
      name: conn.name,
      host: conn.host,
      port: conn.port,
      username: conn.username,
      database: conn.database,
      driver: conn.driver,
      // Passwords are excluded for security
    }))

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'anko-connections.json'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Connections exported', {
      description: `${exportData.length} connection(s) exported (passwords excluded)`,
    })
  }

  const handleImportConnections = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      try {
        const text = await file.text()
        const data = JSON.parse(text)
        console.log('[DevTools] Import data:', data)
        toast.info('Import data logged to console', {
          description: 'Manual import via Tauri commands required for security',
        })
      } catch {
        toast.error('Failed to parse import file')
      }
    }
    input.click()
  }

  // Update store actions
  const setUpdateAvailable = useUpdateStore((s) => s.setUpdateAvailable)
  const setModalOpen = useUpdateStore((s) => s.setModalOpen)

  // Test update modal with latest changelog
  const handleTestUpdateModal = async () => {
    setIsLoading(true)
    try {
      const parsed = await fetchLatestChangelog()
      if (!parsed) throw new Error('Failed to fetch changelog')

      const currentVersion = await getVersion()

      // Set mock update info and open modal
      setUpdateAvailable(
        true,
        {
          version: parsed.version,
          currentVersion: currentVersion,
          body: parsed.body,
          date: parsed.date,
        },
        null, // No actual Update object for testing
      )
      setModalOpen(true)
      onOpenChange(false) // Close DevTools dialog

      toast.success('Update modal opened', {
        description: `Testing with changelog v${parsed.version}`,
      })
    } catch (e) {
      toast.error('Failed to test update modal', {
        description: formatErrorMessage(e),
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Developer Tools</DialogTitle>
            <DialogDescription>
              Debug utilities and data management tools for development.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Reset Options */}
            <div>
              <h3 className="text-sm font-medium mb-3">Reset Options</h3>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleClearSchemaCache}
                >
                  <IconRefresh className="size-4 mr-2" />
                  Clear Schema Cache
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() =>
                    setConfirmDialog({
                      open: true,
                      title: 'Reset Workspaces',
                      description:
                        'This will delete all custom workspaces and reset to the default workspace only. Your connections will remain.',
                      onConfirm: handleResetWorkspaces,
                      variant: 'default',
                    })
                  }
                >
                  <IconLayoutGrid className="size-4 mr-2" />
                  Reset Workspaces
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start text-destructive hover:text-destructive"
                  onClick={() =>
                    setConfirmDialog({
                      open: true,
                      title: 'Clear All Data',
                      description:
                        'This will delete all saved connections and workspaces. This action cannot be undone.',
                      onConfirm: handleClearAllData,
                      variant: 'destructive',
                    })
                  }
                >
                  <IconTrash className="size-4 mr-2" />
                  Clear All Data
                </Button>
              </div>
            </div>

            <Separator />

            {/* Test Databases */}
            <div>
              <h3 className="text-sm font-medium mb-3">Test Databases</h3>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleLoadTestDatabases}
                  disabled={isLoading}
                >
                  <IconServer className="size-4 mr-2" />
                  {isLoading ? 'Loading...' : 'Load Docker Test DBs'}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Loads 5 test databases from docker-compose.yml (MySQL 8, PostgreSQL 16, MariaDB
                  11, PostgreSQL 15, MySQL 8.4 LTS)
                </p>
              </div>
            </div>

            <Separator />

            {/* Debug Utilities */}
            <div>
              <h3 className="text-sm font-medium mb-3">Debug Utilities</h3>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start"
                  onClick={handleViewSchemaCache}
                >
                  <IconDatabase className="size-4 mr-2" />
                  View Schema Cache
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start"
                  onClick={handleViewActiveConnections}
                >
                  <IconPlugConnected className="size-4 mr-2" />
                  View Connections
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start"
                  onClick={handleViewStoreState}
                >
                  <IconTerminal className="size-4 mr-2" />
                  View Store State
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start"
                  onClick={handleToggleDebug}
                >
                  <IconBug className="size-4 mr-2" />
                  Debug: {debugMode ? 'On' : 'Off'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start col-span-2"
                  onClick={handleTestUpdateModal}
                  disabled={isLoading}
                >
                  <IconSparkles className="size-4 mr-2" />
                  Test Update Modal
                </Button>
              </div>

              {/* Log Namespace Controls */}
              <div className="mt-3">
                <p className="text-xs text-muted-foreground mb-2">Log Namespaces:</p>
                <div className="flex gap-2">
                  {['tauri', 'store', 'app'].map((ns) => (
                    <Button
                      key={ns}
                      variant={enabledNamespaces.has(ns) ? 'default' : 'outline'}
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => toggleNamespace(ns)}
                    >
                      {ns}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <Separator />

            {/* Data Management */}
            <div>
              <h3 className="text-sm font-medium mb-3">Data Management</h3>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start"
                  onClick={handleExportConnections}
                >
                  <IconDownload className="size-4 mr-2" />
                  Export Connections
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start"
                  onClick={handleImportConnections}
                >
                  <IconUpload className="size-4 mr-2" />
                  Import Connections
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start"
                  onClick={() =>
                    setConfirmDialog({
                      open: true,
                      title: 'Clear Local Storage',
                      description:
                        'This will clear all browser local storage for this app. Theme and other preferences will be reset.',
                      onConfirm: async () => {
                        handleClearLocalStorage()
                        setConfirmDialog(null)
                      },
                      variant: 'default',
                    })
                  }
                >
                  <IconFolderOff className="size-4 mr-2" />
                  Clear Local Storage
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start"
                  onClick={() => {
                    console.log('[DevTools] Saved Connections:', savedConnections)
                    toast.info(`${savedConnections.length} saved connection(s) logged`)
                  }}
                >
                  <IconDatabaseOff className="size-4 mr-2" />
                  View Saved Conns
                </Button>
              </div>
            </div>

            {/* Stats */}
            <div className="pt-2 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Active Connections:</span>
                <span>{activeConnections.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Saved Connections:</span>
                <span>{savedConnections.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Workspaces:</span>
                <span>{workspaces.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Cached Schemas:</span>
                <span>{Object.keys(schemaCache).length}</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <ConfirmDialog
          open={confirmDialog.open}
          onOpenChange={(open) => {
            if (!open) setConfirmDialog(null)
          }}
          title={confirmDialog.title}
          description={confirmDialog.description}
          onConfirm={confirmDialog.onConfirm}
          isLoading={isLoading}
          variant={confirmDialog.variant}
          confirmText={confirmDialog.variant === 'destructive' ? 'Delete' : 'Confirm'}
        />
      )}
    </>
  )
}
