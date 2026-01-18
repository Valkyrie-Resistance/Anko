import { create } from 'zustand'
import { storeLogger } from '@/lib/debug'
import type { SavedQueriesStore } from './definitions/types'

export const useSavedQueriesStore = create<SavedQueriesStore>((set) => ({
  queries: [],
  isLoading: false,
  filterWorkspaceId: null,

  setQueries: (queries) => {
    storeLogger.debug('setSavedQueries', { count: queries.length })
    set({ queries })
  },

  addQuery: (query) => {
    storeLogger.debug('addSavedQuery', { id: query.id, name: query.name })
    set((state) => ({
      queries: [query, ...state.queries].sort((a, b) => a.name.localeCompare(b.name)),
    }))
  },

  updateQuery: (id, updates) => {
    storeLogger.debug('updateSavedQuery', { id, updates })
    set((state) => ({
      queries: state.queries
        .map((q) => (q.id === id ? { ...q, ...updates } : q))
        .sort((a, b) => a.name.localeCompare(b.name)),
    }))
  },

  removeQuery: (id) => {
    storeLogger.debug('removeSavedQuery', { id })
    set((state) => ({
      queries: state.queries.filter((q) => q.id !== id),
    }))
  },

  setLoading: (isLoading) => set({ isLoading }),

  setFilterWorkspaceId: (workspaceId) => {
    storeLogger.debug('setSavedQueriesFilterWorkspaceId', { workspaceId })
    set({ filterWorkspaceId: workspaceId })
  },
}))
