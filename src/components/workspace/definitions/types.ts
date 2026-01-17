import type { Workspace } from '@/types'

export interface WorkspaceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editWorkspace?: Workspace | null
}
