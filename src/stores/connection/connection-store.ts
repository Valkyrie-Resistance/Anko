import { enableMapSet } from 'immer'
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { DEFAULT_TABLE_EDIT_STATE } from '@/entities/table-edit'
import { storeLogger } from '@/lib/debug'
import { createPrimaryKeyHash } from '@/lib/table-utils'
import type { QueryTab } from '@/types'
import { type ConnectionStore, DEFAULT_SCHEMA_CACHE } from './definitions/types'

// Enable Immer support for Map and Set
enableMapSet()

const IS_DEV = import.meta.env.DEV

// Helper function to rebuild the tabs index map from array
function rebuildTabsMap(tabs: QueryTab[]): Map<string, QueryTab> {
  return new Map(tabs.map((tab) => [tab.id, tab]))
}

export const useConnectionStore = create<ConnectionStore>()(
  devtools(
    immer((set, get) => ({
      // Saved connections
      savedConnections: [],
      setSavedConnections: (connections) => set({ savedConnections: connections }),
      addSavedConnection: (connection) =>
        set((draft) => {
          draft.savedConnections.push(connection)
        }),
      removeSavedConnection: (id) =>
        set((draft) => {
          draft.savedConnections = draft.savedConnections.filter((c) => c.id !== id)
        }),

      // Active connections
      activeConnections: [],
      addActiveConnection: (connection) =>
        set((draft) => {
          storeLogger.debug('addActiveConnection', { connectionId: connection.connectionId, name: connection.info.name })
          draft.activeConnections.push(connection)
          // Initialize empty schema cache for the connection
          draft.schemaCache[connection.connectionId] = {
            databases: [],
            schemas: {},
            tables: {},
            columns: {},
          }
        }),
      removeActiveConnection: (id) =>
        set((draft) => {
          // Find the connectionId to remove from cache
          const conn = draft.activeConnections.find((c) => c.id === id)
          if (conn) {
            storeLogger.debug('removeActiveConnection', { id, connectionId: conn.connectionId })
            delete draft.schemaCache[conn.connectionId]
          }
          draft.activeConnections = draft.activeConnections.filter((c) => c.id !== id)
          draft.queryTabs = draft.queryTabs.filter((t) => t.connectionId !== id)
          draft.queryTabsById = rebuildTabsMap(draft.queryTabs)
        }),
      setSelectedDatabase: (connectionId, database) =>
        set((draft) => {
          const connection = draft.activeConnections.find((c) => c.id === connectionId)
          if (connection) {
            connection.selectedDatabase = database
          }
        }),

      // Schema cache
      schemaCache: {},
      setDatabases: (connectionId, databases) => {
        storeLogger.debug('setDatabases', {
          connectionId,
          count: databases.length,
          names: databases.map((d) => d.name),
        })
        set((draft) => {
          if (!draft.schemaCache[connectionId]) {
            draft.schemaCache[connectionId] = { ...DEFAULT_SCHEMA_CACHE }
          }
          draft.schemaCache[connectionId].databases = databases
        })
      },
      setSchemas: (connectionId, database, schemas) => {
        storeLogger.debug('setSchemas', {
          connectionId,
          database,
          count: schemas.length,
          names: schemas.map((s) => s.name),
        })
        set((draft) => {
          if (!draft.schemaCache[connectionId]) {
            draft.schemaCache[connectionId] = { ...DEFAULT_SCHEMA_CACHE }
          }
          draft.schemaCache[connectionId].schemas[database] = schemas
        })
      },
      getSchemas: (connectionId, database) => {
        return get().schemaCache[connectionId]?.schemas[database] || []
      },
      setTables: (connectionId, key, tables) => {
        storeLogger.debug('setTables', {
          connectionId,
          key,
          count: tables.length,
          names: tables.map((t) => t.name),
        })
        set((draft) => {
          if (!draft.schemaCache[connectionId]) {
            draft.schemaCache[connectionId] = { ...DEFAULT_SCHEMA_CACHE }
          }
          draft.schemaCache[connectionId].tables[key] = tables
        })
      },
      getTables: (connectionId, key) => {
        return get().schemaCache[connectionId]?.tables[key] || []
      },
      setColumns: (connectionId, key, columns) => {
        storeLogger.debug('setColumns', {
          connectionId,
          key,
          count: columns.length,
          names: columns.map((c) => c.name),
        })
        set((draft) => {
          if (!draft.schemaCache[connectionId]) {
            draft.schemaCache[connectionId] = { ...DEFAULT_SCHEMA_CACHE }
          }
          draft.schemaCache[connectionId].columns[key] = columns
        })
      },
      getColumns: (connectionId, key) => {
        return get().schemaCache[connectionId]?.columns[key] || []
      },
      clearSchemaCache: (connectionId) =>
        set((draft) => {
          delete draft.schemaCache[connectionId]
        }),
      clearAllSchemaCache: () => set({ schemaCache: {} }),
      getSchemaContext: (connectionId) => {
        return get().schemaCache[connectionId]
      },

      // Active tab
      activeTabId: null,
      setActiveTabId: (id) => set({ activeTabId: id }),

      // Query tabs
      queryTabs: [],
      queryTabsById: new Map(),
      getQueryTab: (tabId) => get().queryTabsById.get(tabId),
      addQueryTab: (tab) =>
        set((draft) => {
          storeLogger.debug('addQueryTab', { tabId: tab.id, connectionId: tab.connectionId })
          draft.queryTabs.push(tab)
          draft.queryTabsById = new Map(draft.queryTabsById)
          draft.queryTabsById.set(tab.id, tab)
          draft.activeTabId = tab.id
        }),
      addTableTab: (connectionId, _runtimeConnectionId, database, schema, table) =>
        set((draft) => {
          const tabId = crypto.randomUUID()
          const pageSize = 100
          storeLogger.debug('addTableTab', { tabId, connectionId, database, schema, table })
          const newTab = {
            id: tabId,
            connectionId,
            query: '', // Will be generated dynamically
            isExecuting: false,
            tableName: table,
            databaseName: database,
            schemaName: schema,
            page: 0,
            pageSize,
          }
          draft.queryTabs.push(newTab)
          draft.queryTabsById = new Map(draft.queryTabsById)
          draft.queryTabsById.set(tabId, newTab)
          draft.activeTabId = tabId
        }),
      removeQueryTab: (id) =>
        set((draft) => {
          storeLogger.debug('removeQueryTab', { tabId: id })
          draft.queryTabs = draft.queryTabs.filter((t) => t.id !== id)
          draft.queryTabsById = new Map(draft.queryTabsById)
          draft.queryTabsById.delete(id)
          if (draft.activeTabId === id) {
            draft.activeTabId =
              draft.queryTabs.length > 0 ? draft.queryTabs[draft.queryTabs.length - 1].id : null
          }
        }),
      updateQueryTab: (id, updates) =>
        set((draft) => {
          const tab = draft.queryTabs.find((t) => t.id === id)
          if (tab) {
            Object.assign(tab, updates)
            draft.queryTabsById = rebuildTabsMap(draft.queryTabs)
          }
        }),
      setQueryResult: (tabId, result) =>
        set((draft) => {
          const tab = draft.queryTabs.find((t) => t.id === tabId)
          if (tab) {
            storeLogger.debug('setQueryResult', { tabId, rowCount: result.rows.length, columnCount: result.columns.length })
            tab.result = result
            tab.error = undefined
            tab.isExecuting = false
            draft.queryTabsById = rebuildTabsMap(draft.queryTabs)
          }
        }),
      setQueryError: (tabId, error) =>
        set((draft) => {
          const tab = draft.queryTabs.find((t) => t.id === tabId)
          if (tab) {
            storeLogger.debug('setQueryError', { tabId, error })
            tab.error = error
            tab.result = undefined
            tab.isExecuting = false
            draft.queryTabsById = rebuildTabsMap(draft.queryTabs)
          }
        }),
      setQueryExecuting: (tabId, executing) =>
        set((draft) => {
          const tab = draft.queryTabs.find((t) => t.id === tabId)
          if (tab) {
            tab.isExecuting = executing
            draft.queryTabsById = rebuildTabsMap(draft.queryTabs)
          }
        }),
      setTablePage: (tabId, page) =>
        set((draft) => {
          const tab = draft.queryTabs.find((t) => t.id === tabId)
          if (tab) {
            tab.page = page
            draft.queryTabsById = rebuildTabsMap(draft.queryTabs)
          }
        }),
      setTableTotalRows: (tabId, totalRows) =>
        set((draft) => {
          const tab = draft.queryTabs.find((t) => t.id === tabId)
          if (tab) {
            tab.totalRows = totalRows
            draft.queryTabsById = rebuildTabsMap(draft.queryTabs)
          }
        }),

      // Table editing actions
      initTableEditState: (tabId, primaryKeyColumns) =>
        set((draft) => {
          const tab = draft.queryTabs.find((t) => t.id === tabId)
          if (tab) {
            tab.editState = {
              ...DEFAULT_TABLE_EDIT_STATE,
              primaryKeyColumns,
            }
            draft.queryTabsById = rebuildTabsMap(draft.queryTabs)
          }
        }),

      setEditMode: (tabId, enabled) =>
        set((draft) => {
          const tab = draft.queryTabs.find((t) => t.id === tabId)
          if (tab?.editState) {
            tab.editState.isEditMode = enabled
            draft.queryTabsById = rebuildTabsMap(draft.queryTabs)
          }
        }),

      addCellEdit: (
        tabId,
        rowIndex,
        primaryKeyValues,
        columnName,
        originalValue,
        newValue,
        originalRow,
      ) =>
        set((draft) => {
          const tab = draft.queryTabs.find((t) => t.id === tabId)
          if (!tab || !tab.editState) return

          storeLogger.debug('addCellEdit', { tabId, rowIndex, columnName, originalValue, newValue })

          // Check if there's already an update for this row
          const primaryKeyHash = createPrimaryKeyHash(primaryKeyValues)
          const existingUpdateIndex = tab.editState.pendingChanges.findIndex(
            (c) =>
              c.type === 'update' && createPrimaryKeyHash(c.primaryKeyValues) === primaryKeyHash,
          )

          if (existingUpdateIndex >= 0) {
            // Update existing change
            const existingChange = tab.editState.pendingChanges[existingUpdateIndex]
            const existingEditIndex = existingChange.edits.findIndex(
              (e) => e.columnName === columnName,
            )

            if (existingEditIndex >= 0) {
              // Check if reverting to original value
              if (newValue === existingChange.edits[existingEditIndex].originalValue) {
                // Remove this edit
                existingChange.edits.splice(existingEditIndex, 1)
              } else {
                // Update the edit value
                existingChange.edits[existingEditIndex].newValue = newValue
              }
            } else {
              // Add new edit to existing change
              existingChange.edits.push({ columnName, originalValue, newValue })
            }

            // If no more edits, remove the change entirely
            if (existingChange.edits.length === 0) {
              tab.editState.pendingChanges.splice(existingUpdateIndex, 1)
            }
          } else {
            // Create new update change
            tab.editState.pendingChanges.push({
              id: crypto.randomUUID(),
              type: 'update',
              rowIndex,
              primaryKeyValues,
              edits: [{ columnName, originalValue, newValue }],
              originalRow,
            })
          }
          draft.queryTabsById = rebuildTabsMap(draft.queryTabs)
        }),

      addNewRow: (tabId, newRow) =>
        set((draft) => {
          const tab = draft.queryTabs.find((t) => t.id === tabId)
          if (!tab || !tab.editState) return

          tab.editState.pendingChanges.push({
            id: crypto.randomUUID(),
            type: 'insert',
            rowIndex: -1, // New rows don't have a row index in existing data
            primaryKeyValues: {},
            edits: [],
            newRow,
          })
          draft.queryTabsById = rebuildTabsMap(draft.queryTabs)
        }),

      markRowForDeletion: (tabId, rowIndex, primaryKeyValues, originalRow) =>
        set((draft) => {
          const tab = draft.queryTabs.find((t) => t.id === tabId)
          if (!tab || !tab.editState) return

          storeLogger.debug('markRowForDeletion', { tabId, rowIndex, primaryKeyValues })

          // Check if already marked for deletion
          const primaryKeyHash = createPrimaryKeyHash(primaryKeyValues)
          const existingDelete = tab.editState.pendingChanges.find(
            (c) =>
              c.type === 'delete' && createPrimaryKeyHash(c.primaryKeyValues) === primaryKeyHash,
          )

          if (existingDelete) return

          // Check if there's a pending update for this row - convert it to delete
          const existingUpdateIndex = tab.editState.pendingChanges.findIndex(
            (c) =>
              c.type === 'update' && createPrimaryKeyHash(c.primaryKeyValues) === primaryKeyHash,
          )

          const newChange = {
            id: crypto.randomUUID(),
            type: 'delete' as const,
            rowIndex,
            primaryKeyValues,
            edits: [],
            originalRow,
          }

          if (existingUpdateIndex >= 0) {
            // Replace update with delete
            tab.editState.pendingChanges[existingUpdateIndex] = newChange
          } else {
            tab.editState.pendingChanges.push(newChange)
          }
          draft.queryTabsById = rebuildTabsMap(draft.queryTabs)
        }),

      removeChange: (tabId, changeId) =>
        set((draft) => {
          const tab = draft.queryTabs.find((t) => t.id === tabId)
          if (tab?.editState) {
            tab.editState.pendingChanges = tab.editState.pendingChanges.filter(
              (c) => c.id !== changeId,
            )
            draft.queryTabsById = rebuildTabsMap(draft.queryTabs)
          }
        }),

      discardAllChanges: (tabId) =>
        set((draft) => {
          const tab = draft.queryTabs.find((t) => t.id === tabId)
          if (tab?.editState) {
            tab.editState.pendingChanges = []
            tab.editState.commitError = undefined
            draft.queryTabsById = rebuildTabsMap(draft.queryTabs)
          }
        }),

      setCommitting: (tabId, committing) =>
        set((draft) => {
          const tab = draft.queryTabs.find((t) => t.id === tabId)
          if (tab?.editState) {
            tab.editState.isCommitting = committing
            draft.queryTabsById = rebuildTabsMap(draft.queryTabs)
          }
        }),

      setCommitError: (tabId, error) =>
        set((draft) => {
          const tab = draft.queryTabs.find((t) => t.id === tabId)
          if (tab?.editState) {
            tab.editState.commitError = error
            draft.queryTabsById = rebuildTabsMap(draft.queryTabs)
          }
        }),

      clearPendingChanges: (tabId) =>
        set((draft) => {
          const tab = draft.queryTabs.find((t) => t.id === tabId)
          if (tab?.editState) {
            const changesCount = tab.editState.pendingChanges.length
            storeLogger.debug('clearPendingChanges', { tabId, changesCount })
            tab.editState.pendingChanges = []
            tab.editState.commitError = undefined
            draft.queryTabsById = rebuildTabsMap(draft.queryTabs)
          }
        }),

      hasPendingChanges: (tabId) => {
        const tab = get().queryTabsById.get(tabId)
        return (tab?.editState?.pendingChanges.length ?? 0) > 0
      },

      getPendingChanges: (tabId) => {
        const tab = get().queryTabsById.get(tabId)
        return tab?.editState?.pendingChanges ?? []
      },

      updateNewRowCell: (tabId, changeId, columnName, newValue) =>
        set((draft) => {
          const tab = draft.queryTabs.find((t) => t.id === tabId)
          if (!tab || !tab.editState) return

          const change = tab.editState.pendingChanges.find(
            (c) => c.id === changeId && c.type === 'insert' && c.newRow,
          )
          if (change?.newRow) {
            change.newRow[columnName] = newValue
            draft.queryTabsById = rebuildTabsMap(draft.queryTabs)
          }
        }),
    })),
    { name: 'ConnectionStore', enabled: IS_DEV },
  ),
)
