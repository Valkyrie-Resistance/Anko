import type { ActiveConnection, ConnectionInfo } from '@/types'

export interface ConnectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editConnection?: ConnectionInfo
  workspaceId?: string | null
  onConnectionAdded?: () => void
}

export interface ConnectionListProps {
  onConnectionSelect: (connection: ActiveConnection) => void
}

export type TestResult = 'success' | 'error' | null

export type InputMode = 'form' | 'url'
