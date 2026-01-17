import * as React from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createWorkspace, updateWorkspace } from '@/lib/tauri'
import { cn } from '@/lib/utils'
import { useWorkspaceStore } from '@/stores/workspace'
import type { WorkspaceConfig } from '@/types'
import { DEFAULT_WORKSPACE_ICON, WORKSPACE_ICONS, type WorkspaceDialogProps } from './definitions'

export function WorkspaceDialog({ open, onOpenChange, editWorkspace }: WorkspaceDialogProps) {
  const [name, setName] = React.useState('')
  const [icon, setIcon] = React.useState(DEFAULT_WORKSPACE_ICON)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const { addWorkspace, updateWorkspace: updateWorkspaceInStore } = useWorkspaceStore()

  React.useEffect(() => {
    if (editWorkspace) {
      setName(editWorkspace.name)
      setIcon(editWorkspace.icon)
    } else {
      setName('')
      setIcon(DEFAULT_WORKSPACE_ICON)
    }
    setError(null)
  }, [editWorkspace])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      setError('Workspace name is required')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const config: WorkspaceConfig = {
        name: name.trim(),
        icon,
      }

      if (editWorkspace) {
        const updated = await updateWorkspace(editWorkspace.id, config)
        updateWorkspaceInStore(editWorkspace.id, updated)
      } else {
        const created = await createWorkspace(config)
        addWorkspace(created)
      }

      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save workspace')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{editWorkspace ? 'Edit Workspace' : 'Create Workspace'}</DialogTitle>
            <DialogDescription>
              {editWorkspace
                ? 'Update the workspace name and icon.'
                : 'Create a new workspace to organize your database connections.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Workspace"
                autoFocus
              />
            </div>

            <div className="grid gap-2">
              <Label>Icon</Label>
              <div className="grid grid-cols-8 gap-1.5">
                {Object.entries(WORKSPACE_ICONS).map(([iconName, IconComponent]) => (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => setIcon(iconName)}
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-md border transition-colors hover:bg-accent',
                      icon === iconName
                        ? 'border-primary bg-accent text-accent-foreground'
                        : 'border-transparent text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <IconComponent className="size-4" />
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : editWorkspace ? 'Save Changes' : 'Create Workspace'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
