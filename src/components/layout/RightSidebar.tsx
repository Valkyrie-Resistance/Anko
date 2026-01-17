import type * as React from 'react'
import { cn } from '@/lib/utils'
import { useRightSidebarStore } from '@/stores/right-sidebar'

const SIDEBAR_WIDTH = '16rem'

interface RightSidebarProps {
  children?: React.ReactNode
  className?: string
}

export function RightSidebar({ children, className }: RightSidebarProps) {
  const open = useRightSidebarStore((s) => s.open)

  return (
    <div
      data-state={open ? 'expanded' : 'collapsed'}
      data-side="right"
      className="group peer text-sidebar-foreground hidden md:block"
    >
      {/* Gap element for layout */}
      <div
        className={cn(
          'relative w-(--sidebar-width) bg-transparent transition-[width] duration-200 ease-linear',
          !open && 'w-0',
        )}
        style={{ '--sidebar-width': SIDEBAR_WIDTH } as React.CSSProperties}
      />
      {/* Sidebar container */}
      <div
        className={cn(
          'fixed top-9 bottom-0 right-0 z-10 hidden w-(--sidebar-width) border-l bg-sidebar transition-[right] duration-200 ease-linear md:flex flex-col',
          !open && 'right-[calc(var(--sidebar-width)*-1)]',
          className,
        )}
        style={{ '--sidebar-width': SIDEBAR_WIDTH } as React.CSSProperties}
      >
        {children}
      </div>
    </div>
  )
}

function RightSidebarHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-2 p-2', className)} {...props} />
}

function RightSidebarContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div className={cn('flex min-h-0 flex-1 flex-col gap-0 overflow-auto', className)} {...props} />
  )
}

function RightSidebarFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-2 p-2', className)} {...props} />
}

function RightSidebarGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div className={cn('relative flex w-full min-w-0 flex-col px-2 py-1', className)} {...props} />
  )
}

function RightSidebarGroupContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('w-full text-xs', className)} {...props} />
}

function RightSidebarGroupLabel({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex h-8 shrink-0 items-center rounded-md px-2 text-xs text-sidebar-foreground/70',
        className,
      )}
      {...props}
    />
  )
}

export {
  RightSidebarHeader,
  RightSidebarContent,
  RightSidebarFooter,
  RightSidebarGroup,
  RightSidebarGroupContent,
  RightSidebarGroupLabel,
}
