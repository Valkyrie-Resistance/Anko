import { create } from 'zustand'
import { storeLogger } from '@/lib/debug'
import type { Workspace } from '@/types'
import { DEFAULT_WORKSPACE_ID, type WorkspaceStore } from './definitions/types'

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  workspaces: [],
  activeWorkspaceId: DEFAULT_WORKSPACE_ID,

  setWorkspaces: (workspaces) => set({ workspaces }),

  setActiveWorkspace: (id) => {
    storeLogger.debug('setActiveWorkspace', { id })
    set({ activeWorkspaceId: id })
  },

  addWorkspace: (workspace) => {
    storeLogger.debug('addWorkspace', { id: workspace.id, name: workspace.name })
    set((state) => ({
      workspaces: [...state.workspaces, workspace],
    }))
  },

  updateWorkspace: (id, updates) =>
    set((state) => ({
      workspaces: state.workspaces.map((w) =>
        w.id === id ? { ...w, ...updates, updatedAt: new Date().toISOString() } : w,
      ),
    })),

  removeWorkspace: (id) =>
    set((state) => {
      // Cannot delete default workspace
      const workspace = state.workspaces.find((w) => w.id === id)
      if (workspace?.is_default) return state

      storeLogger.debug('removeWorkspace', { id, name: workspace?.name })
      const newWorkspaces = state.workspaces.filter((w) => w.id !== id)
      // If active workspace is deleted, switch to default
      const newActiveId =
        state.activeWorkspaceId === id ? DEFAULT_WORKSPACE_ID : state.activeWorkspaceId

      return { workspaces: newWorkspaces, activeWorkspaceId: newActiveId }
    }),

  addConnectionToWorkspace: (workspaceId, connectionId) => {
    storeLogger.debug('addConnectionToWorkspace', { workspaceId, connectionId })
    set((state) => ({
      workspaces: state.workspaces.map((w) =>
        w.id === workspaceId && !w.connection_ids.includes(connectionId)
          ? {
              ...w,
              connection_ids: [...w.connection_ids, connectionId],
              updated_at: new Date().toISOString(),
            }
          : w,
      ),
    }))
  },

  removeConnectionFromWorkspace: (workspaceId, connectionId) => {
    storeLogger.debug('removeConnectionFromWorkspace', { workspaceId, connectionId })
    set((state) => ({
      workspaces: state.workspaces.map((w) =>
        w.id === workspaceId
          ? {
              ...w,
              connection_ids: w.connection_ids.filter((id) => id !== connectionId),
              updated_at: new Date().toISOString(),
            }
          : w,
      ),
    }))
  },

  moveConnectionToWorkspace: (connectionId, fromWorkspaceId, toWorkspaceId) => {
    storeLogger.debug('moveConnectionToWorkspace', { connectionId, fromWorkspaceId, toWorkspaceId })
    set((state) => ({
      workspaces: state.workspaces.map((w) => {
        if (w.id === fromWorkspaceId) {
          return {
            ...w,
            connection_ids: w.connection_ids.filter((id) => id !== connectionId),
            updated_at: new Date().toISOString(),
          }
        }
        if (w.id === toWorkspaceId && !w.connection_ids.includes(connectionId)) {
          return {
            ...w,
            connection_ids: [...w.connection_ids, connectionId],
            updated_at: new Date().toISOString(),
          }
        }
        return w
      }),
    }))
  },

  getActiveWorkspace: () => {
    const state = get()
    return state.workspaces.find((w) => w.id === state.activeWorkspaceId)
  },

  getWorkspaceConnections: (workspaceId) => {
    const state = get()
    const workspace = state.workspaces.find((w) => w.id === workspaceId)
    return workspace?.connection_ids ?? []
  },
}))

export function createDefaultWorkspace(): Workspace {
  const now = new Date().toISOString()
  return {
    id: DEFAULT_WORKSPACE_ID,
    name: 'Default',
    icon: 'eggs',
    is_default: true,
    connection_ids: [],
    created_at: now,
    updated_at: now,
  }
}
