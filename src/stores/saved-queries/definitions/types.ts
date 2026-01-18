import type { SavedQuery } from '@/types'

export interface SavedQueriesStore {
  queries: SavedQuery[]
  isLoading: boolean
  filterWorkspaceId: string | null

  // Actions
  setQueries: (queries: SavedQuery[]) => void
  addQuery: (query: SavedQuery) => void
  updateQuery: (id: string, updates: Partial<SavedQuery>) => void
  removeQuery: (id: string) => void
  setLoading: (loading: boolean) => void
  setFilterWorkspaceId: (workspaceId: string | null) => void
}
