import { ConnectionList } from '@/components/connection/ConnectionList'
import type { SidebarProps } from './definitions'

export function Sidebar({ onConnectionSelect }: SidebarProps) {
  return (
    <div className="h-full border-r bg-muted/30">
      <div className="p-4 border-b">
        <h1 className="font-semibold text-lg">Anko</h1>
        <p className="text-xs text-muted-foreground">SQL Client</p>
      </div>
      <ConnectionList onConnectionSelect={onConnectionSelect} />
    </div>
  )
}
