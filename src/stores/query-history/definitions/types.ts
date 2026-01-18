import type { QueryHistoryEntry } from '@/types'

export interface QueryHistoryStore {
  entries: QueryHistoryEntry[]
  isLoading: boolean
  filterConnectionId: string | null

  // Actions
  setEntries: (entries: QueryHistoryEntry[]) => void
  addEntry: (entry: QueryHistoryEntry) => void
  removeEntry: (id: string) => void
  clearEntries: () => void
  setLoading: (loading: boolean) => void
  setFilterConnectionId: (connectionId: string | null) => void
}
