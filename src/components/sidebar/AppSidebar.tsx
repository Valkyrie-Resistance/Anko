import { IconDatabase, IconDeviceFloppy, IconHistory } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ConnectionDialog } from '@/components/connection/ConnectionDialog'
import { useTheme } from '@/components/theme/ThemeProvider'
import { WorkspaceDialog } from '@/components/workspace/WorkspaceDialog'
import { deleteWorkspace, listWorkspaces } from '@/lib/tauri'
import { cn } from '@/lib/utils'
import { useLeftSidebarStore } from '@/stores/left-sidebar'
import { useWorkspaceStore } from '@/stores/workspace'
import type { ConnectionInfo, Workspace } from '@/types'
import type { AppSidebarProps, NavItem, NavItemId } from './definitions'
import { SettingsMenu, WorkspaceSwitcher } from './menus'
import { DatabasesPanel, HistoryPanel, SavedQueriesPanel } from './panels'
import { SidebarIconButton } from './SidebarIconButton'

const SIDEBAR_WIDTH = '18rem'
const SIDEBAR_WIDTH_ICON = '3rem'

const navItems: NavItem[] = [
  { id: 'connections', title: 'Connections', icon: IconDatabase },
  { id: 'saved-queries', title: 'Saved Queries', icon: IconDeviceFloppy },
  { id: 'history', title: 'History', icon: IconHistory },
]

export function AppSidebar({ onConnectionSelect }: AppSidebarProps) {
  const { theme, setTheme } = useTheme()
  const open = useLeftSidebarStore((s) => s.open)
  const setOpen = useLeftSidebarStore((s) => s.setOpen)
  const [activeNav, setActiveNav] = useState<NavItemId>('connections')

  // Workspace store
  const workspaces = useWorkspaceStore((s) => s.workspaces)
  const setWorkspaces = useWorkspaceStore((s) => s.setWorkspaces)
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId)
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace)
  const removeWorkspace = useWorkspaceStore((s) => s.removeWorkspace)

  // Local state
  const [connectionDialogOpen, setConnectionDialogOpen] = useState(false)
  const [workspaceDialogOpen, setWorkspaceDialogOpen] = useState(false)
  const [editConnection, setEditConnection] = useState<ConnectionInfo | undefined>()
  const [editWorkspace, setEditWorkspace] = useState<Workspace | undefined>()

  // Load workspaces on mount
  useEffect(() => {
    const loadWorkspaces = async () => {
      try {
        const ws = await listWorkspaces()
        setWorkspaces(ws)
      } catch (e) {
        console.error('Failed to load workspaces:', e)
      }
    }
    loadWorkspaces()
  }, [setWorkspaces])

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId)

  const handleEditConnection = (connection: ConnectionInfo) => {
    setEditConnection(connection)
    setConnectionDialogOpen(true)
  }

  const handleNewConnection = () => {
    setEditConnection(undefined)
    setConnectionDialogOpen(true)
  }

  const handleNewWorkspace = () => {
    setEditWorkspace(undefined)
    setWorkspaceDialogOpen(true)
  }

  const handleEditWorkspace = (workspace: Workspace) => {
    setEditWorkspace(workspace)
    setWorkspaceDialogOpen(true)
  }

  const handleDeleteWorkspace = async (workspace: Workspace) => {
    try {
      await deleteWorkspace(workspace.id)
      removeWorkspace(workspace.id)
      toast.success(`Workspace "${workspace.name}" deleted`)
    } catch (e) {
      console.error('Failed to delete workspace:', e)
      toast.error('Failed to delete workspace')
    }
  }

  const renderSidebarContent = () => {
    switch (activeNav) {
      case 'connections':
        return (
          <DatabasesPanel
            workspaces={workspaces}
            activeWorkspace={activeWorkspace}
            onNewConnection={handleNewConnection}
            onEditConnection={handleEditConnection}
            onConnectionSelect={onConnectionSelect}
          />
        )
      case 'saved-queries':
        return <SavedQueriesPanel />
      case 'history':
        return <HistoryPanel />
      default:
        return null
    }
  }

  return (
    <>
      <div
        data-state={open ? 'expanded' : 'collapsed'}
        className="group text-sidebar-foreground"
        style={
          {
            '--sidebar-width': SIDEBAR_WIDTH,
            '--sidebar-width-icon': SIDEBAR_WIDTH_ICON,
          } as React.CSSProperties
        }
      >
        {/* Gap element for layout */}
        <div
          className={cn(
            'relative bg-transparent transition-[width] duration-200 ease-linear',
            open
              ? 'w-[calc(var(--sidebar-width-icon)+var(--sidebar-width)+1px)]'
              : 'w-[calc(var(--sidebar-width-icon)+1px)]',
          )}
        />

        {/* Fixed sidebar container */}
        <div className="fixed top-9 bottom-0 left-0 z-10 flex">
          {/* Icon sidebar */}
          <div className="flex h-full w-[calc(var(--sidebar-width-icon)+1px)] flex-col border-r bg-sidebar">
            <WorkspaceSwitcher
              workspaces={workspaces}
              activeWorkspace={activeWorkspace}
              activeWorkspaceId={activeWorkspaceId}
              onWorkspaceSelect={setActiveWorkspace}
              onNewWorkspace={handleNewWorkspace}
              onEditWorkspace={handleEditWorkspace}
              onDeleteWorkspace={handleDeleteWorkspace}
            />

            {/* Nav items */}
            <div className="flex-1 flex flex-col gap-1 p-2">
              {navItems.map((item) => (
                <SidebarIconButton
                  key={item.id}
                  icon={item.icon}
                  tooltip={item.title}
                  isActive={activeNav === item.id && open}
                  onClick={() => {
                    if (activeNav === item.id && open) {
                      // Toggle closed if clicking already-selected item
                      setOpen(false)
                    } else {
                      // Switch to new item and open
                      setActiveNav(item.id)
                      setOpen(true)
                    }
                  }}
                />
              ))}
            </div>

            <SettingsMenu theme={theme} onThemeChange={setTheme} />
          </div>

          {/* Content sidebar */}
          <div
            className={cn(
              'h-full w-(--sidebar-width) flex-col border-r bg-sidebar transition-[width,opacity] duration-200 ease-linear min-h-0',
              open ? 'flex opacity-100' : 'w-0 opacity-0 overflow-hidden',
            )}
          >
            {renderSidebarContent()}
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <ConnectionDialog
        open={connectionDialogOpen}
        onOpenChange={setConnectionDialogOpen}
        editConnection={editConnection}
        workspaceId={activeWorkspaceId}
        onConnectionAdded={async () => {
          const ws = await listWorkspaces()
          setWorkspaces(ws)
        }}
      />
      <WorkspaceDialog
        open={workspaceDialogOpen}
        onOpenChange={setWorkspaceDialogOpen}
        editWorkspace={editWorkspace}
      />
    </>
  )
}
