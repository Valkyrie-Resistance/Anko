import type { ActiveConnection, DatabaseDriver, SchemaInfo } from '@/types'
import type { SchemaContext } from './autocomplete'

export interface QueryEditorProps {
  tabId: string
  connectionId: string
  connectionInfoId: string
  connectionName: string
  connectionHost: string
  connectionPort: number
  workspaceName?: string
  driver?: DatabaseDriver
  selectedDatabase?: string
  databases?: SchemaInfo[]
  schema?: SchemaContext
  activeConnections?: ActiveConnection[]
  onDatabaseChange?: (database: string) => void
  onConnectionChange?: (connectionInfoId: string) => void
}

export interface SQLEditorProps {
  value: string
  onChange: (value: string) => void
  onExecute?: () => void
  driver?: DatabaseDriver
  selectedDatabase?: string
  schema?: SchemaContext
  placeholder?: string
  readOnly?: boolean
}
