import { ChevronRight, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TreeNodeProps {
  label: string
  secondaryLabel?: string
  icon?: React.ReactNode
  rightIcon?: React.ReactNode
  isExpanded?: boolean
  isExpandable?: boolean
  isLoading?: boolean
  isActive?: boolean
  level?: number
  onClick?: () => void
  onDoubleClick?: () => void
  onContextMenu?: (e: React.MouseEvent) => void
  children?: React.ReactNode
  className?: string
}

export function TreeNode({
  label,
  secondaryLabel,
  icon,
  rightIcon,
  isExpanded = false,
  isExpandable = false,
  isLoading = false,
  isActive = false,
  level = 0,
  onClick,
  onDoubleClick,
  onContextMenu,
  children,
  className,
}: TreeNodeProps) {
  const paddingLeft = level * 12 + 8

  return (
    <div className={className}>
      <button
        type="button"
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        onContextMenu={onContextMenu}
        className={cn(
          'w-full flex items-center gap-1.5 py-0.5 pr-2 text-left text-xs rounded-sm transition-colors group',
          'hover:bg-muted/50',
          isActive && 'bg-accent text-accent-foreground',
        )}
        style={{ paddingLeft }}
      >
        {/* Expand/Collapse chevron */}
        {isExpandable ? (
          <span className="flex-shrink-0 w-3.5 h-3.5 flex items-center justify-center">
            {isLoading ? (
              <Loader2 className="size-2.5 animate-spin text-muted-foreground" />
            ) : (
              <ChevronRight
                className={cn(
                  'size-3 text-muted-foreground transition-transform',
                  isExpanded && 'rotate-90',
                )}
              />
            )}
          </span>
        ) : (
          <span className="w-3.5" />
        )}

        {/* Icon */}
        {icon && <span className="flex-shrink-0">{icon}</span>}

        {/* Label */}
        <span className="flex-1 truncate">{label}</span>

        {/* Secondary label */}
        {secondaryLabel && (
          <span className="text-[10px] text-muted-foreground/70 tabular-nums">
            {secondaryLabel}
          </span>
        )}

        {/* Right icon (e.g., status indicator) */}
        {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
      </button>

      {/* Children (expanded content) */}
      {isExpanded && children && (
        <div className="relative">
          {/* Vertical line indicator */}
          <div
            className="absolute top-0 bottom-0 border-l border-border"
            style={{ left: paddingLeft + 7 }}
          />
          {children}
        </div>
      )}
    </div>
  )
}
