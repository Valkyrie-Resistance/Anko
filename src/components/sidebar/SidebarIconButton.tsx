import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface SidebarIconButtonProps {
  icon: React.ComponentType<{ className?: string }>
  tooltip: string
  isActive?: boolean
  onClick?: () => void
}

export function SidebarIconButton({
  icon: Icon,
  tooltip,
  isActive,
  onClick,
}: SidebarIconButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        onClick={onClick}
        className={cn(
          'flex size-8 items-center justify-center rounded-md transition-colors',
          isActive
            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        )}
      >
        <Icon className="size-4" />
      </TooltipTrigger>
      <TooltipContent side="right">{tooltip}</TooltipContent>
    </Tooltip>
  )
}
