import type { DatabaseDriver } from './database'

export interface ConnectionConfig {
  name: string
  host: string
  port: number
  username: string
  password: string
  database?: string
  driver: DatabaseDriver
}

export interface ConnectionInfo {
  id: string
  name: string
  host: string
  port: number
  username: string
  database?: string
  driver: DatabaseDriver
}

export interface ActiveConnection {
  id: string
  connectionId: string // The runtime connection ID from Tauri
  info: ConnectionInfo
  selectedDatabase?: string
}
