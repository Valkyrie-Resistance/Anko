import { useEffect, useMemo, useRef, useState } from 'react'
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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatErrorMessage } from '@/lib/error-utils'
import { getDatabases, getSchemas, getTables } from '@/lib/tauri'
import { useConnectionStore } from '@/stores/connection'
import type { ActiveConnection } from '@/types'

interface TabActionDialogProps {
  open: boolean
  mode: 'query' | 'table'
  onOpenChange: (open: boolean) => void
}

const TABLE_MODE_LABELS = {
  query: {
    title: 'New Query',
    description: 'Choose a connection and database for the new query tab.',
    action: 'Create Query',
  },
  table: {
    title: 'Open Table',
    description: 'Choose a connection, database, and table to browse.',
    action: 'Open Table',
  },
} as const

export function TabActionDialog({ open, mode, onOpenChange }: TabActionDialogProps) {
  const activeConnections = useConnectionStore((s) => s.activeConnections)
  const schemaCache = useConnectionStore((s) => s.schemaCache)

  // Create refs for store actions to avoid infinite re-render loops
  const setDatabasesRef = useRef(useConnectionStore.getState().setDatabases)
  const setSchemasRef = useRef(useConnectionStore.getState().setSchemas)
  const setTablesRef = useRef(useConnectionStore.getState().setTables)

  // Note: Refs are initialized with getState() above and don't need updating
  // since Zustand store actions are stable references

  const [selectedConnectionId, setSelectedConnectionId] = useState('')
  const [selectedDatabase, setSelectedDatabaseState] = useState('')
  const [selectedSchema, setSelectedSchema] = useState('')
  const [selectedTable, setSelectedTable] = useState('')
  const [isLoadingDatabases, setIsLoadingDatabases] = useState(false)
  const [isLoadingSchemas, setIsLoadingSchemas] = useState(false)
  const [isLoadingTables, setIsLoadingTables] = useState(false)

  useEffect(() => {
    if (!open) {
      setSelectedConnectionId('')
      setSelectedDatabaseState('')
      setSelectedSchema('')
      setSelectedTable('')
      return
    }

    if (activeConnections.length === 0) {
      setSelectedConnectionId('')
      return
    }

    const hasSelected = activeConnections.some(
      (connection) => connection.id === selectedConnectionId,
    )
    if (!selectedConnectionId || !hasSelected) {
      setSelectedConnectionId(activeConnections[0].id)
    }
  }, [open, selectedConnectionId, activeConnections])

  useEffect(() => {
    if (!open) return
    setSelectedDatabaseState('')
    setSelectedSchema('')
    setSelectedTable('')
  }, [open, selectedConnectionId])

  const selectedConnection = useMemo<ActiveConnection | undefined>(() => {
    return activeConnections.find((connection) => connection.id === selectedConnectionId)
  }, [activeConnections, selectedConnectionId])

  const runtimeConnectionId = selectedConnection?.connectionId
  const driver = selectedConnection?.info.driver
  const connectionCache = runtimeConnectionId ? schemaCache[runtimeConnectionId] : undefined
  const databases = connectionCache?.databases || []

  const schemas = useMemo(() => {
    if (!runtimeConnectionId || !selectedDatabase) return []
    return schemaCache[runtimeConnectionId]?.schemas[selectedDatabase] || []
  }, [runtimeConnectionId, schemaCache, selectedDatabase])

  const tablesKey = useMemo(() => {
    if (!selectedDatabase) return ''
    if (driver === 'postgresql') {
      return selectedSchema ? `${selectedDatabase}.${selectedSchema}` : ''
    }
    return selectedDatabase
  }, [driver, selectedDatabase, selectedSchema])

  const tables = useMemo(() => {
    if (!runtimeConnectionId || !tablesKey) return []
    return schemaCache[runtimeConnectionId]?.tables[tablesKey] || []
  }, [runtimeConnectionId, schemaCache, tablesKey])

  useEffect(() => {
    if (!open || !runtimeConnectionId) return

    if (databases.length > 0) {
      if (!selectedDatabase) {
        const fallback = selectedConnection?.selectedDatabase || databases[0]?.name || ''
        setSelectedDatabaseState(fallback)
      }
      return
    }

    setIsLoadingDatabases(true)
    getDatabases(runtimeConnectionId)
      .then((dbs) => {
        setDatabasesRef.current(runtimeConnectionId, dbs)
        if (!selectedDatabase) {
          const fallback = selectedConnection?.selectedDatabase || dbs[0]?.name || ''
          setSelectedDatabaseState(fallback)
        }
      })
      .catch((e) => {
        console.error('Failed to load databases:', e)
        toast.error('Failed to load databases', { description: formatErrorMessage(e) })
      })
      .finally(() => setIsLoadingDatabases(false))
  }, [
    open,
    runtimeConnectionId,
    databases.length,
    selectedDatabase,
    selectedConnection?.selectedDatabase,
  ])

  useEffect(() => {
    if (!open || mode !== 'table') return
    if (driver !== 'postgresql') return
    if (!runtimeConnectionId || !selectedDatabase) return

    if (schemas.length > 0) {
      if (!selectedSchema) {
        const fallback =
          schemas.find((schema) => schema.name === 'public')?.name || schemas[0]?.name
        setSelectedSchema(fallback || '')
      }
      return
    }

    setIsLoadingSchemas(true)
    getSchemas(runtimeConnectionId, selectedDatabase)
      .then((loadedSchemas) => {
        setSchemasRef.current(runtimeConnectionId, selectedDatabase, loadedSchemas)
        if (!selectedSchema) {
          const fallback =
            loadedSchemas.find((schema) => schema.name === 'public')?.name ||
            loadedSchemas[0]?.name ||
            ''
          setSelectedSchema(fallback)
        }
      })
      .catch((e) => {
        console.error('Failed to load schemas:', e)
        toast.error('Failed to load schemas', { description: formatErrorMessage(e) })
      })
      .finally(() => setIsLoadingSchemas(false))
  }, [open, mode, driver, runtimeConnectionId, selectedDatabase, schemas.length, selectedSchema])

  useEffect(() => {
    if (!open || mode !== 'table') return
    if (!runtimeConnectionId || !selectedDatabase) return
    if (driver === 'postgresql' && !selectedSchema) return
    if (!tablesKey) return

    if (tables.length > 0) {
      if (!selectedTable) {
        setSelectedTable(tables[0]?.name || '')
      }
      return
    }

    const schema = driver === 'postgresql' ? selectedSchema : ''
    setIsLoadingTables(true)
    getTables(runtimeConnectionId, selectedDatabase, schema)
      .then((loadedTables) => {
        setTablesRef.current(runtimeConnectionId, tablesKey, loadedTables)
        if (!selectedTable) {
          setSelectedTable(loadedTables[0]?.name || '')
        }
      })
      .catch((e) => {
        console.error('Failed to load tables:', e)
        toast.error('Failed to load tables', { description: formatErrorMessage(e) })
      })
      .finally(() => setIsLoadingTables(false))
  }, [
    open,
    mode,
    runtimeConnectionId,
    selectedDatabase,
    selectedSchema,
    driver,
    tablesKey,
    tables.length,
    selectedTable,
  ])

  useEffect(() => {
    if (!open) return
    setSelectedTable('')
    if (driver === 'postgresql') {
      setSelectedSchema('')
    }
  }, [open, selectedDatabase, driver])

  useEffect(() => {
    if (!open || mode !== 'table') return
    setSelectedTable('')
  }, [open, mode, selectedSchema])

  const canCreateQuery = Boolean(selectedConnection && selectedDatabase)
  const canOpenTable =
    Boolean(selectedConnection && selectedDatabase && selectedTable) &&
    (driver !== 'postgresql' || Boolean(selectedSchema))

  const handleConfirm = () => {
    if (!selectedConnection) return

    const store = useConnectionStore.getState()

    if (mode === 'query') {
      if (!selectedDatabase) return
      store.setSelectedDatabase(selectedConnection.id, selectedDatabase)
      store.addQueryTab({
        id: crypto.randomUUID(),
        connectionId: selectedConnection.id,
        query: '',
        isExecuting: false,
      })
      onOpenChange(false)
      return
    }

    if (!selectedDatabase || !selectedTable) return
    const schema = driver === 'postgresql' ? selectedSchema || undefined : undefined
    store.addTableTab(
      selectedConnection.id,
      selectedConnection.connectionId,
      selectedDatabase,
      schema,
      selectedTable,
    )
    onOpenChange(false)
  }

  const labels = TABLE_MODE_LABELS[mode]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{labels.title}</DialogTitle>
          <DialogDescription>{labels.description}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="tab-action-connection">Connection</Label>
            <Select
              value={selectedConnectionId}
              onValueChange={(v) => setSelectedConnectionId(v ?? '')}
            >
              <SelectTrigger id="tab-action-connection" className="h-8">
                <SelectValue>{selectedConnection?.info.name}</SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-zinc-950 border-zinc-800">
                {activeConnections.length === 0 ? (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">
                    No active connections
                  </div>
                ) : (
                  activeConnections.map((connection) => (
                    <SelectItem key={connection.id} value={connection.id} className="text-xs">
                      {connection.info.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="tab-action-database">Database</Label>
            <Select
              value={selectedDatabase}
              onValueChange={(v) => setSelectedDatabaseState(v ?? '')}
              disabled={!selectedConnectionId || isLoadingDatabases}
            >
              <SelectTrigger id="tab-action-database" className="h-8">
                <SelectValue>
                  {selectedDatabase || (
                    <span className="text-muted-foreground">
                      {isLoadingDatabases ? 'Loading...' : 'Select database'}
                    </span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-zinc-950 border-zinc-800">
                {databases.length === 0 ? (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">
                    No databases available
                  </div>
                ) : (
                  databases.map((database) => (
                    <SelectItem key={database.name} value={database.name} className="text-xs">
                      {database.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {mode === 'table' && driver === 'postgresql' && (
            <div className="grid gap-2">
              <Label htmlFor="tab-action-schema">Schema</Label>
              <Select
                value={selectedSchema}
                onValueChange={(v) => setSelectedSchema(v ?? '')}
                disabled={!selectedDatabase || isLoadingSchemas}
              >
                <SelectTrigger id="tab-action-schema" className="h-8">
                  <SelectValue>
                    {selectedSchema || (
                      <span className="text-muted-foreground">
                        {isLoadingSchemas ? 'Loading...' : 'Select schema'}
                      </span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 border-zinc-800">
                  {schemas.length === 0 ? (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">
                      No schemas available
                    </div>
                  ) : (
                    schemas.map((schema) => (
                      <SelectItem key={schema.name} value={schema.name} className="text-xs">
                        {schema.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {mode === 'table' && (
            <div className="grid gap-2">
              <Label htmlFor="tab-action-table">Table</Label>
              <Select
                value={selectedTable}
                onValueChange={(v) => setSelectedTable(v ?? '')}
                disabled={
                  !selectedDatabase ||
                  isLoadingTables ||
                  (driver === 'postgresql' && !selectedSchema)
                }
              >
                <SelectTrigger id="tab-action-table" className="h-8">
                  <SelectValue>
                    {selectedTable || (
                      <span className="text-muted-foreground">
                        {isLoadingTables ? 'Loading...' : 'Select table'}
                      </span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 border-zinc-800">
                  {tables.length === 0 ? (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">
                      No tables available
                    </div>
                  ) : (
                    tables.map((table) => (
                      <SelectItem key={table.name} value={table.name} className="text-xs">
                        {table.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={mode === 'query' ? !canCreateQuery : !canOpenTable}
          >
            {labels.action}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
