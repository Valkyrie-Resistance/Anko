// Workspace types (snake_case to match Rust/serde)
export interface Workspace {
  id: string
  name: string
  icon: string // Emoji or icon identifier
  is_default: boolean
  connection_ids: string[] // IDs of connections in this workspace
  created_at: string
  updated_at: string
}

export interface WorkspaceConfig {
  name: string
  icon: string
}
