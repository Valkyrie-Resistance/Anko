import type { Workspace } from '@/types'

export const DEFAULT_WORKSPACE_ID = 'default'

export interface WorkspaceStore {
  // Workspaces
  workspaces: Workspace[]
  activeWorkspaceId: string

  // Actions
  setWorkspaces: (workspaces: Workspace[]) => void
  setActiveWorkspace: (id: string) => void
  addWorkspace: (workspace: Workspace) => void
  updateWorkspace: (id: string, updates: Partial<Workspace>) => void
  removeWorkspace: (id: string) => void

  // Connection management within workspace
  addConnectionToWorkspace: (workspaceId: string, connectionId: string) => void
  removeConnectionFromWorkspace: (workspaceId: string, connectionId: string) => void
  moveConnectionToWorkspace: (
    connectionId: string,
    fromWorkspaceId: string,
    toWorkspaceId: string,
  ) => void

  // Helpers
  getActiveWorkspace: () => Workspace | undefined
  getWorkspaceConnections: (workspaceId: string) => string[]
}
