import { Loader2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatErrorMessage } from '@/lib/error-utils'
import {
  addConnectionToWorkspace,
  saveConnection,
  testConnection,
  updateConnection,
} from '@/lib/tauri'
import { ensureMinimumToastDuration } from '@/lib/toast-utils'
import { useConnectionStore } from '@/stores/connection'
import type { ConnectionConfig, DatabaseDriver } from '@/types'
import {
  type ConnectionDialogProps,
  DEFAULT_PORTS,
  DEFAULT_USERS,
  type InputMode,
} from './definitions'

type OperationState =
  | { type: 'idle' }
  | { type: 'testing' }
  | { type: 'saving' }
  | { type: 'test_success' }
  | { type: 'test_error'; message: string }
  | { type: 'save_error'; message: string }

// Parse connection URL like mysql://user:password@host:port/database or postgresql://...
function parseConnectionUrl(url: string): Partial<ConnectionConfig> | null {
  try {
    // Handle common URL formats
    const urlMatch = url.match(
      /^(mysql|postgresql|postgres):\/\/(?:([^:@]+)(?::([^@]*))?@)?([^:/]+)(?::(\d+))?(?:\/(.*))?$/i,
    )
    if (!urlMatch) return null

    const [, protocol, user, password, host, port, database] = urlMatch
    const driver: DatabaseDriver = protocol.toLowerCase() === 'mysql' ? 'mysql' : 'postgresql'
    const defaultPort = driver === 'mysql' ? 3306 : 5432

    return {
      driver,
      host: host || 'localhost',
      port: port ? Number.parseInt(port, 10) : defaultPort,
      username: user || (driver === 'mysql' ? 'root' : 'postgres'),
      password: password || '',
      database: database || '',
    }
  } catch {
    return null
  }
}

export function ConnectionDialog({
  open,
  onOpenChange,
  editConnection,
  workspaceId,
  onConnectionAdded,
}: ConnectionDialogProps) {
  const addSavedConnection = useConnectionStore((s) => s.addSavedConnection)
  const [operationState, setOperationState] = useState<OperationState>({ type: 'idle' })
  const [connectionUrl, setConnectionUrl] = useState('')
  const [urlError, setUrlError] = useState<string | null>(null)
  const [inputMode, setInputMode] = useState<InputMode>('form')

  const getDefaultFormData = useCallback(
    (driver: DatabaseDriver = 'mysql'): ConnectionConfig => ({
      name: '',
      host: 'localhost',
      port: DEFAULT_PORTS[driver],
      username: DEFAULT_USERS[driver],
      password: '',
      database: '',
      driver,
    }),
    [],
  )

  const [formData, setFormData] = useState<ConnectionConfig>(() => {
    if (editConnection) {
      return {
        name: editConnection.name,
        host: editConnection.host,
        port: editConnection.port,
        username: editConnection.username,
        password: '',
        database: editConnection.database ?? '',
        driver: editConnection.driver,
      }
    }
    return getDefaultFormData()
  })

  // Reset form when dialog opens/closes or edit connection changes
  useEffect(() => {
    if (open) {
      if (editConnection) {
        setFormData({
          name: editConnection.name,
          host: editConnection.host,
          port: editConnection.port,
          username: editConnection.username,
          password: '',
          database: editConnection.database ?? '',
          driver: editConnection.driver,
        })
      } else {
        setFormData(getDefaultFormData())
      }
      setConnectionUrl('')
      setUrlError(null)
      setOperationState({ type: 'idle' })
      setInputMode('form')
    }
  }, [open, editConnection, getDefaultFormData])

  const handleChange = (field: keyof ConnectionConfig, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setOperationState({ type: 'idle' })
  }

  const handleDriverChange = (driver: DatabaseDriver) => {
    setFormData((prev) => ({
      ...prev,
      driver,
      port: DEFAULT_PORTS[driver],
      username:
        prev.username === DEFAULT_USERS[prev.driver] ? DEFAULT_USERS[driver] : prev.username,
    }))
    setOperationState({ type: 'idle' })
  }

  const handleUrlImport = () => {
    setUrlError(null)
    const parsed = parseConnectionUrl(connectionUrl.trim())
    if (parsed) {
      setFormData((prev) => ({
        ...prev,
        ...parsed,
      }))
      setInputMode('form')
      setConnectionUrl('')
    } else {
      setUrlError(
        'Invalid connection URL. Expected format: mysql://user:password@host:port/database',
      )
    }
  }

  const handleTest = async () => {
    setOperationState({ type: 'testing' })

    const startTime = Date.now()
    const toastId = toast.loading('Testing connection...', {
      description: `Attempting to connect to ${formData.host}:${formData.port}`,
    })

    try {
      await testConnection(formData)
      setOperationState({ type: 'test_success' })

      // Ensure minimum toast display time before showing success
      await ensureMinimumToastDuration(startTime)
      toast.success('Connected', {
        id: toastId,
        description: `${formData.host}:${formData.port}`,
      })
    } catch (e) {
      const message = formatErrorMessage(e)
      setOperationState({ type: 'test_error', message })

      // Show error immediately (no delay needed for errors)
      toast.error('Connection failed', {
        id: toastId,
        description: message,
      })
    }
  }

  const handleSave = async () => {
    setOperationState({ type: 'saving' })

    try {
      if (editConnection) {
        await updateConnection(editConnection.id, formData)
        toast.success('Connection updated', {
          description: `"${formData.name}" has been updated`,
        })
      } else {
        const saved = await saveConnection(formData)
        addSavedConnection(saved)

        // Add to current workspace if one is selected
        if (workspaceId) {
          await addConnectionToWorkspace(workspaceId, saved.id)
          onConnectionAdded?.()
        }
        toast.success('Connection saved', {
          description: `"${formData.name}" has been added`,
        })
      }
      onOpenChange(false)
    } catch (e) {
      const message = formatErrorMessage(e)
      setOperationState({ type: 'save_error', message })
      toast.error('Failed to save connection', {
        description: message,
      })
    }
  }

  const driverLabel = formData.driver === 'mysql' ? 'MySQL' : 'PostgreSQL'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{editConnection ? 'Edit Connection' : 'New Connection'}</DialogTitle>
          <DialogDescription>Configure your {driverLabel} database connection.</DialogDescription>
        </DialogHeader>

        <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as 'form' | 'url')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="form">Manual</TabsTrigger>
            <TabsTrigger value="url">Connection URL</TabsTrigger>
          </TabsList>

          <TabsContent value="url" className="space-y-4 pt-4">
            <div className="grid gap-2">
              <label htmlFor="connection-url" className="text-sm font-medium">
                Connection URL
              </label>
              <Input
                id="connection-url"
                value={connectionUrl}
                onChange={(e) => {
                  setConnectionUrl(e.target.value)
                  setUrlError(null)
                }}
                placeholder="mysql://user:password@localhost:3306/database"
              />
              <p className="text-xs text-muted-foreground">
                Supported formats: mysql://, postgresql://, postgres://
              </p>
              {urlError && (
                <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                  {urlError}
                </div>
              )}
            </div>
            <Button onClick={handleUrlImport} className="w-full">
              Import URL
            </Button>
          </TabsContent>

          <TabsContent value="form" className="space-y-4 pt-4">
            <div className="grid gap-2">
              <label htmlFor="driver" className="text-sm font-medium">
                Database Type
              </label>
              <Select
                value={formData.driver}
                onValueChange={(v) => handleDriverChange(v as DatabaseDriver)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mysql">MySQL</SelectItem>
                  <SelectItem value="postgresql">PostgreSQL</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <label htmlFor="name" className="text-sm font-medium">
                Connection Name
              </label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="My Database"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 grid gap-2">
                <label htmlFor="host" className="text-sm font-medium">
                  Host
                </label>
                <Input
                  id="host"
                  value={formData.host}
                  onChange={(e) => handleChange('host', e.target.value)}
                  placeholder="localhost"
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="port" className="text-sm font-medium">
                  Port
                </label>
                <Input
                  id="port"
                  type="number"
                  value={formData.port}
                  onChange={(e) =>
                    handleChange(
                      'port',
                      Number.parseInt(e.target.value, 10) || DEFAULT_PORTS[formData.driver],
                    )
                  }
                />
              </div>
            </div>

            <div className="grid gap-2">
              <label htmlFor="username" className="text-sm font-medium">
                Username
              </label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => handleChange('username', e.target.value)}
                placeholder={DEFAULT_USERS[formData.driver]}
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor="database" className="text-sm font-medium">
                Database (optional)
              </label>
              <Input
                id="database"
                value={formData.database ?? ''}
                onChange={(e) => handleChange('database', e.target.value)}
                placeholder="mydb"
              />
            </div>

            {(operationState.type === 'test_error' || operationState.type === 'save_error') && (
              <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                {operationState.message}
              </div>
            )}

            {operationState.type === 'test_success' && (
              <div className="text-sm text-green-600 bg-green-50 dark:bg-green-950 p-2 rounded">
                Connection successful!
              </div>
            )}
          </TabsContent>
        </Tabs>

        {inputMode === 'form' && (
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleTest}
              disabled={operationState.type === 'testing' || operationState.type === 'saving'}
            >
              {operationState.type === 'testing' && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {operationState.type === 'testing' ? 'Testing...' : 'Test Connection'}
            </Button>
            <Button
              onClick={handleSave}
              disabled={operationState.type === 'saving' || !formData.name}
            >
              {operationState.type === 'saving' && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {operationState.type === 'saving' ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
