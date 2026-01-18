import { create } from 'zustand'
import { storeLogger } from '@/lib/debug'
import type { RightSidebarStore } from './definitions/types'

const DEFAULT_WIDTH = 280
const MIN_WIDTH = 200
const MAX_WIDTH = 500

export const useRightSidebarStore = create<RightSidebarStore>((set) => ({
  open: false,
  width: DEFAULT_WIDTH,
  context: { type: 'none' },

  setOpen: (open) => set({ open }),

  setWidth: (width) => set({ width: Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, width)) }),

  toggle: () => set((state) => ({ open: !state.open })),

  setContext: (context) => {
    storeLogger.debug('setRightSidebarContext', { type: context.type })
    set({ context, open: true })
  },

  clearContext: () => {
    storeLogger.debug('clearRightSidebarContext')
    set({ context: { type: 'none' } })
  },

  showRowDetails: (row, columns) => {
    storeLogger.debug('showRowDetails', { columnsCount: columns.length })
    set({
      context: { type: 'row', row, columns },
      open: true,
    })
  },

  showCellDetails: (value, columnName, columnType) => {
    storeLogger.debug('showCellDetails', { columnName, columnType })
    set({
      context: { type: 'cell', value, columnName, columnType },
      open: true,
    })
  },

  showTableDetails: (tableName, columns, database, schema) => {
    storeLogger.debug('showTableDetails', { tableName, database, schema })
    set({
      context: { type: 'table', tableName, columns, database, schema },
      open: true,
    })
  },
}))
