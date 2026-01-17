import type { ActiveConnection, ColumnDetail, SchemaInfo, TableInfo } from '@/types'

export type NavItemId = 'connections' | 'saved-queries' | 'history'

export interface NavItem {
  id: NavItemId
  title: string
  icon: React.ComponentType<{ className?: string }>
}

export interface AppSidebarProps {
  onConnectionSelect?: (connection: ActiveConnection) => void
}

export interface DatabaseTreeProps {
  connection: ActiveConnection
  onEdit?: () => void
  onDelete?: () => void
  onInsertText?: (text: string) => void
}

export interface DatabaseNodeProps {
  database: SchemaInfo
  isPostgreSQL: boolean
  schemas: SchemaInfo[]
  tablesCache: Record<string, TableInfo[]>
  columnsCache: Record<string, ColumnDetail[]>
  isExpanded: boolean
  isLoadingSchemas: boolean
  isLoadingTables: Set<string>
  loadingColumns: Set<string>
  expandedSchemas: Set<string>
  expandedTables: Set<string>
  onDatabaseClick: () => void
  onSchemaClick: (schema: string) => void
  onTableClick: (schema: string, table: string) => void
  onInsertText?: (text: string) => void
  onRefreshTables?: (schema: string) => void
  onRefreshColumns?: (schema: string, table: string) => void
  onOpenTable?: (schema: string, table: string) => void
}

export interface SchemaNodeProps {
  schema: SchemaInfo
  databaseName: string
  tables: TableInfo[]
  columnsCache: Record<string, ColumnDetail[]>
  isExpanded: boolean
  isLoadingTables: boolean
  loadingColumns: Set<string>
  expandedTables: Set<string>
  onSchemaClick: () => void
  onTableClick: (table: string) => void
  onInsertText?: (text: string) => void
  onRefreshColumns?: (table: string) => void
  onOpenTable?: (table: string) => void
}

export interface TableNodeProps {
  table: TableInfo
  schemaOrDbName: string
  columns: ColumnDetail[]
  isExpanded: boolean
  isLoading: boolean
  onClick: () => void
  onInsertText?: (text: string) => void
  onRefreshColumns?: () => void
  onOpenTable?: () => void
  level?: number
}

export interface ColumnNodeProps {
  column: ColumnDetail
  onClick: () => void
  level?: number
}
