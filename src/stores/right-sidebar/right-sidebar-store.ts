import { create } from 'zustand'
import { storeLogger } from '@/lib/debug'
import type { RightSidebarStore, TableInfo } from './definitions/types'

const DEFAULT_WIDTH = 280
const MIN_WIDTH = 200
const MAX_WIDTH = 500

export const useRightSidebarStore = create<RightSidebarStore>((set, get) => ({
  open: false,
  width: DEFAULT_WIDTH,
  context: { type: 'none' },
  currentTableInfo: null,

  setOpen: (open) => set({ open }),

  setWidth: (width) => set({ width: Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, width)) }),

  toggle: () => set((state) => ({ open: !state.open })),

  setContext: (context) => {
    storeLogger.debug('setRightSidebarContext', { type: context.type })
    set({ context, open: true })
  },

  clearContext: () => {
    storeLogger.debug('clearRightSidebarContext')
    set({ context: { type: 'none' }, currentTableInfo: null })
  },

  showRowDetails: (row, columns) => {
    const tableInfo = get().currentTableInfo
    storeLogger.debug('showRowDetails', { columnsCount: columns.length, hasTableInfo: !!tableInfo })
    if (tableInfo) {
      set({
        context: { type: 'row', row, columns, tableInfo },
        open: true,
      })
    } else {
      // Fallback if no table info - shouldn't happen in normal flow
      set({
        context: { type: 'row', row, columns, tableInfo: { tableName: '', columns, database: '' } },
        open: true,
      })
    }
  },

  showCellDetails: (value, columnName, columnType) => {
    const tableInfo = get().currentTableInfo
    storeLogger.debug('showCellDetails', { columnName, columnType, hasTableInfo: !!tableInfo })
    if (tableInfo) {
      set({
        context: { type: 'cell', value, columnName, columnType, tableInfo },
        open: true,
      })
    } else {
      // Fallback if no table info
      set({
        context: {
          type: 'cell',
          value,
          columnName,
          columnType,
          tableInfo: { tableName: '', columns: [], database: '' },
        },
        open: true,
      })
    }
  },

  showTableDetails: (tableName, columns, database, schema) => {
    storeLogger.debug('showTableDetails', { tableName, database, schema })
    const tableInfo: TableInfo = { tableName, columns, database, schema }
    set({
      context: { type: 'table', tableName, columns, database, schema },
      currentTableInfo: tableInfo,
      open: true,
    })
  },
}))
