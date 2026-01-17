import {
  IconCode,
  IconDeviceDesktop,
  IconMoon,
  IconRefresh,
  IconSettings,
  IconSun,
} from '@tabler/icons-react'
import { useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { DevToolsDialog } from '../dialogs/DevToolsDialog'

interface SettingsMenuProps {
  theme: 'light' | 'dark' | 'system'
  onThemeChange: (theme: 'light' | 'dark' | 'system') => void
}

export function SettingsMenu({ theme, onThemeChange }: SettingsMenuProps) {
  const [devToolsOpen, setDevToolsOpen] = useState(false)

  return (
    <>
      <div className="p-2">
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              'flex size-8 items-center justify-center rounded-md transition-colors',
              'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            )}
          >
            <IconSettings className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="end" sideOffset={8}>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                {theme === 'dark' ? (
                  <IconMoon className="size-4 mr-2" />
                ) : theme === 'light' ? (
                  <IconSun className="size-4 mr-2" />
                ) : (
                  <IconDeviceDesktop className="size-4 mr-2" />
                )}
                Theme
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => onThemeChange('light')}>
                  <IconSun className="size-4 mr-2" />
                  Light
                  {theme === 'light' && (
                    <span className="ml-auto text-xs text-muted-foreground">Active</span>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onThemeChange('dark')}>
                  <IconMoon className="size-4 mr-2" />
                  Dark
                  {theme === 'dark' && (
                    <span className="ml-auto text-xs text-muted-foreground">Active</span>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onThemeChange('system')}>
                  <IconDeviceDesktop className="size-4 mr-2" />
                  System
                  {theme === 'system' && (
                    <span className="ml-auto text-xs text-muted-foreground">Active</span>
                  )}
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setDevToolsOpen(true)}>
              <IconCode className="size-4 mr-2" />
              Dev Tools
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => console.log('Check for updates')}>
              <IconRefresh className="size-4 mr-2" />
              Check for updates
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <DevToolsDialog open={devToolsOpen} onOpenChange={setDevToolsOpen} />
    </>
  )
}
