/** A saved query entry from the backend */
export interface SavedQuery {
  id: string
  name: string
  query: string
  description: string | null
  workspaceId: string | null
  connectionId: string | null
  databaseName: string | null
  createdAt: string
  updatedAt: string
}

/** Input for creating a new saved query */
export interface CreateSavedQueryInput {
  name: string
  query: string
  description: string | null
  workspaceId: string | null
  connectionId: string | null
  databaseName: string | null
}

/** Input for updating a saved query */
export interface UpdateSavedQueryInput {
  name?: string
  query?: string
  description?: string | null
  workspaceId?: string | null
  connectionId?: string | null
  databaseName?: string | null
}
