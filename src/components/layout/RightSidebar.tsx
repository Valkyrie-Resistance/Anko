import { useCallback, useEffect, useRef, useState } from 'react'
import type * as React from 'react'
import { cn } from '@/lib/utils'
import { useRightSidebarStore } from '@/stores/right-sidebar'

const MIN_WIDTH = 200
const MAX_WIDTH = 500

interface RightSidebarProps {
  children?: React.ReactNode
  className?: string
}

export function RightSidebar({ children, className }: RightSidebarProps) {
  const open = useRightSidebarStore((s) => s.open)
  const width = useRightSidebarStore((s) => s.width)
  const setWidth = useRightSidebarStore((s) => s.setWidth)

  const [isResizing, setIsResizing] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }, [])

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!sidebarRef.current) return
      const newWidth = window.innerWidth - e.clientX
      setWidth(Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, newWidth)))
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, setWidth])

  return (
    <div
      data-state={open ? 'expanded' : 'collapsed'}
      data-side="right"
      className="group peer text-sidebar-foreground hidden md:block"
    >
      {/* Gap element for layout */}
      <div
        className={cn(
          'relative bg-transparent transition-[width] duration-200 ease-linear',
          !open && 'w-0',
        )}
        style={{ width: open ? width : 0 }}
      />
      {/* Sidebar container */}
      <div
        ref={sidebarRef}
        className={cn(
          'fixed top-9 bottom-0 right-0 z-10 hidden border-l bg-sidebar transition-[right] duration-200 ease-linear md:flex flex-col',
          !open && 'right-[-500px]',
          isResizing && 'select-none',
          className,
        )}
        style={{ width: open ? width : 0 }}
      >
        {/* Resize handle */}
        <div
          role="separator"
          aria-orientation="vertical"
          onMouseDown={handleMouseDown}
          className={cn(
            'absolute left-0 top-0 bottom-0 w-1 cursor-col-resize z-20 hover:bg-primary/50 transition-colors',
            isResizing && 'bg-primary/50',
          )}
        />
        {/* Content wrapper to ensure proper flex sizing */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {children}
        </div>
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
