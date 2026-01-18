import { create } from 'zustand'
import { storeLogger } from '@/lib/debug'
import type { QueryHistoryStore } from './definitions/types'

export const useQueryHistoryStore = create<QueryHistoryStore>((set) => ({
  entries: [],
  isLoading: false,
  filterConnectionId: null,

  setEntries: (entries) => {
    storeLogger.debug('setQueryHistoryEntries', { count: entries.length })
    set({ entries })
  },

  addEntry: (entry) => {
    storeLogger.debug('addQueryHistoryEntry', { id: entry.id, query: entry.query.slice(0, 50) })
    set((state) => ({
      entries: [entry, ...state.entries],
    }))
  },

  removeEntry: (id) => {
    storeLogger.debug('removeQueryHistoryEntry', { id })
    set((state) => ({
      entries: state.entries.filter((e) => e.id !== id),
    }))
  },

  clearEntries: () => {
    storeLogger.debug('clearQueryHistoryEntries')
    set({ entries: [] })
  },

  setLoading: (isLoading) => set({ isLoading }),

  setFilterConnectionId: (connectionId) => {
    storeLogger.debug('setQueryHistoryFilterConnectionId', { connectionId })
    set({ filterConnectionId: connectionId })
  },
}))
