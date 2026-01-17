import type { ActiveConnection } from '@/types'

export interface SidebarProps {
  onConnectionSelect: (connection: ActiveConnection) => void
}
