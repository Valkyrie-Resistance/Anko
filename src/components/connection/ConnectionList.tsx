import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatErrorMessage } from '@/lib/error-utils'
import { connect, deleteConnection, getConnectionConfig } from '@/lib/tauri'
import { ensureMinimumToastDuration } from '@/lib/toast-utils'
import { useConnectionStore } from '@/stores/connection'
import type { ActiveConnection, ConnectionInfo } from '@/types'
import { ConnectionDialog } from './ConnectionDialog'
import type { ConnectionListProps } from './definitions'

export function ConnectionList({ onConnectionSelect }: ConnectionListProps) {
  const savedConnections = useConnectionStore((s) => s.savedConnections)
  const activeConnections = useConnectionStore((s) => s.activeConnections)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editConnection, setEditConnection] = useState<ConnectionInfo | undefined>()
  const [connectingId, setConnectingId] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)

  const handleConnect = async (info: ConnectionInfo) => {
    setConnectingId(info.id)

    const startTime = Date.now()
    const toastId = toast.loading('Connecting...', {
      description: `Connecting to "${info.name}" at ${info.host}:${info.port}`,
    })

    try {
      const config = await getConnectionConfig(info.id)
      const connectionId = await connect(config)

      const active: ActiveConnection = {
        id: info.id,
        connectionId,
        info,
        selectedDatabase: info.database,
      }

      useConnectionStore.getState().addActiveConnection(active)
      onConnectionSelect(active)

      // Ensure minimum toast display time before showing success
      await ensureMinimumToastDuration(startTime)
      toast.success('Connected', {
        id: toastId,
        description: `Connected to "${info.name}"`,
      })
    } catch (e) {
      console.error('Failed to connect:', e)

      // Show error immediately (no delay needed for errors)
      toast.error('Connection failed', {
        id: toastId,
        description: formatErrorMessage(e),
      })
    } finally {
      setConnectingId(null)
    }
  }

  const handleEdit = (connection: ConnectionInfo) => {
    setEditConnection(connection)
    setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    const conn = savedConnections.find((c) => c.id === id)

    const startTime = Date.now()
    const toastId = toast.loading('Deleting connection...', {
      description: conn ? `Removing "${conn.name}"` : 'Removing connection',
    })

    try {
      await deleteConnection(id)
      useConnectionStore.getState().removeSavedConnection(id)

      // Ensure minimum toast display time before showing success
      await ensureMinimumToastDuration(startTime)
      toast.success('Connection deleted', {
        id: toastId,
        description: conn ? `"${conn.name}" has been removed` : 'Connection removed',
      })
    } catch (e) {
      console.error('Failed to delete:', e)

      // Show error immediately (no delay needed for errors)
      toast.error('Failed to delete connection', {
        id: toastId,
        description: formatErrorMessage(e),
      })
    }
  }

  const handleNewConnection = () => {
    setEditConnection(undefined)
    setDialogOpen(true)
  }

  const isConnected = (id: string) => activeConnections.some((c) => c.id === id)

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <Button onClick={handleNewConnection} className="w-full">
          + New Connection
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {savedConnections.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">
              No saved connections.
              <br />
              Click "New Connection" to add one.
            </div>
          ) : (
            savedConnections.map((conn) => {
              const showMenu = hoveredId === conn.id || menuOpenId === conn.id
              return (
                <div
                  key={conn.id}
                  className="group flex items-center justify-between p-2 rounded-md hover:bg-accent"
                  onPointerEnter={() => setHoveredId(conn.id)}
                  onPointerLeave={() => setHoveredId(null)}
                >
                  <button
                    type="button"
                    onClick={() => handleConnect(conn)}
                    disabled={connectingId === conn.id || isConnected(conn.id)}
                    className="flex-1 text-left"
                  >
                    <div className="flex items-center gap-2">
                      {connectingId === conn.id ? (
                        <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                      ) : (
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isConnected(conn.id) ? 'bg-green-500' : 'bg-muted'
                          }`}
                        />
                      )}
                      <span className="font-medium text-sm">{conn.name}</span>
                    </div>
                    <div className="text-xs text-muted-foreground ml-4">
                      {conn.host}:{conn.port}
                      {conn.database && ` / ${conn.database}`}
                    </div>
                  </button>

                  {showMenu && (
                    <DropdownMenu
                      open={menuOpenId === conn.id}
                      onOpenChange={(open) => setMenuOpenId(open ? conn.id : null)}
                    >
                      <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium h-8 w-8 hover:bg-accent hover:text-accent-foreground">
                        ⋮
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(conn)}>Edit</DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDelete(conn.id)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              )
            })
          )}
        </div>
      </ScrollArea>

      <ConnectionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editConnection={editConnection}
      />
    </div>
  )
}
