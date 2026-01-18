use serde::{Deserialize, Serialize};
use tauri::State;

use crate::db::connector::DatabaseDriver;
use crate::db::ConnectionConfig;
use crate::error::AppError;
use crate::state::AppState;
use crate::storage::{
    AddQueryHistoryInput, CreateSavedQueryInput, QueryHistoryEntry, SavedQuery,
    UpdateSavedQueryInput, Workspace, WorkspaceConfig,
};

/// A connection without the password for frontend display
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionInfo {
    pub id: String,
    pub name: String,
    pub host: String,
    pub port: u16,
    pub username: String,
    pub database: Option<String>,
    pub driver: DatabaseDriver,
}

// ==================== Connection Commands ====================

#[tauri::command]
pub async fn save_connection(
    state: State<'_, AppState>,
    config: ConnectionConfig,
) -> Result<ConnectionInfo, AppError> {
    let storage = state
        .storage
        .get()
        .ok_or_else(|| AppError::Storage("Storage not initialized".to_string()))?;

    let saved = storage.connections.save(&config).await?;

    Ok(ConnectionInfo {
        id: saved.id,
        name: saved.name,
        host: saved.host,
        port: saved.port,
        username: saved.username,
        database: saved.database,
        driver: saved.driver,
    })
}

#[tauri::command]
pub async fn update_connection(
    state: State<'_, AppState>,
    id: String,
    config: ConnectionConfig,
) -> Result<(), AppError> {
    let storage = state
        .storage
        .get()
        .ok_or_else(|| AppError::Storage("Storage not initialized".to_string()))?;

    storage.connections.update(&id, &config).await
}

#[tauri::command]
pub async fn list_connections(
    state: State<'_, AppState>,
) -> Result<Vec<ConnectionInfo>, AppError> {
    let storage = state
        .storage
        .get()
        .ok_or_else(|| AppError::Storage("Storage not initialized".to_string()))?;

    let connections = storage.connections.list().await?;

    Ok(connections
        .into_iter()
        .map(|c| ConnectionInfo {
            id: c.id,
            name: c.name,
            host: c.host,
            port: c.port,
            username: c.username,
            database: c.database,
            driver: c.driver,
        })
        .collect())
}

#[tauri::command]
pub async fn delete_connection(
    state: State<'_, AppState>,
    id: String,
) -> Result<(), AppError> {
    let storage = state
        .storage
        .get()
        .ok_or_else(|| AppError::Storage("Storage not initialized".to_string()))?;

    // Remove from all workspaces first
    storage.workspaces.remove_connection_from_all(&id).await?;
    // Then delete the connection
    storage.connections.delete(&id).await
}

#[tauri::command]
pub async fn get_connection_config(
    state: State<'_, AppState>,
    id: String,
) -> Result<ConnectionConfig, AppError> {
    let storage = state
        .storage
        .get()
        .ok_or_else(|| AppError::Storage("Storage not initialized".to_string()))?;

    let saved = storage
        .connections
        .get(&id)
        .await?
        .ok_or_else(|| AppError::ConnectionNotFound(id))?;

    let password = storage.connections.decrypt_password(&saved.encrypted_password)?;

    Ok(saved.to_config(password))
}

// ==================== Workspace Commands ====================

#[tauri::command]
pub async fn list_workspaces(
    state: State<'_, AppState>,
) -> Result<Vec<Workspace>, AppError> {
    let storage = state
        .storage
        .get()
        .ok_or_else(|| AppError::Storage("Storage not initialized".to_string()))?;

    storage.workspaces.list().await
}

#[tauri::command]
pub async fn create_workspace(
    state: State<'_, AppState>,
    config: WorkspaceConfig,
) -> Result<Workspace, AppError> {
    let storage = state
        .storage
        .get()
        .ok_or_else(|| AppError::Storage("Storage not initialized".to_string()))?;

    storage.workspaces.create(&config).await
}

#[tauri::command]
pub async fn update_workspace(
    state: State<'_, AppState>,
    id: String,
    config: WorkspaceConfig,
) -> Result<Workspace, AppError> {
    let storage = state
        .storage
        .get()
        .ok_or_else(|| AppError::Storage("Storage not initialized".to_string()))?;

    storage.workspaces.update(&id, &config).await
}

#[tauri::command]
pub async fn delete_workspace(
    state: State<'_, AppState>,
    id: String,
) -> Result<(), AppError> {
    let storage = state
        .storage
        .get()
        .ok_or_else(|| AppError::Storage("Storage not initialized".to_string()))?;

    storage.workspaces.delete(&id).await
}

#[tauri::command]
pub async fn add_connection_to_workspace(
    state: State<'_, AppState>,
    workspace_id: String,
    connection_id: String,
) -> Result<(), AppError> {
    let storage = state
        .storage
        .get()
        .ok_or_else(|| AppError::Storage("Storage not initialized".to_string()))?;

    storage.workspaces.add_connection(&workspace_id, &connection_id).await
}

#[tauri::command]
pub async fn remove_connection_from_workspace(
    state: State<'_, AppState>,
    workspace_id: String,
    connection_id: String,
) -> Result<(), AppError> {
    let storage = state
        .storage
        .get()
        .ok_or_else(|| AppError::Storage("Storage not initialized".to_string()))?;

    storage.workspaces.remove_connection(&workspace_id, &connection_id).await
}

#[tauri::command]
pub async fn move_connection_between_workspaces(
    state: State<'_, AppState>,
    connection_id: String,
    from_workspace_id: String,
    to_workspace_id: String,
) -> Result<(), AppError> {
    let storage = state
        .storage
        .get()
        .ok_or_else(|| AppError::Storage("Storage not initialized".to_string()))?;

    storage.workspaces.move_connection(&connection_id, &from_workspace_id, &to_workspace_id).await
}

// ==================== Query History Commands ====================

#[tauri::command]
pub async fn add_query_history(
    state: State<'_, AppState>,
    input: AddQueryHistoryInput,
) -> Result<QueryHistoryEntry, AppError> {
    let storage = state
        .storage
        .get()
        .ok_or_else(|| AppError::Storage("Storage not initialized".to_string()))?;

    storage.query_history.add(&input).await
}

#[tauri::command]
pub async fn list_query_history(
    state: State<'_, AppState>,
    connection_id: Option<String>,
    limit: Option<i64>,
) -> Result<Vec<QueryHistoryEntry>, AppError> {
    let storage = state
        .storage
        .get()
        .ok_or_else(|| AppError::Storage("Storage not initialized".to_string()))?;

    storage
        .query_history
        .list(connection_id.as_deref(), limit)
        .await
}

#[tauri::command]
pub async fn delete_query_history(
    state: State<'_, AppState>,
    id: String,
) -> Result<(), AppError> {
    let storage = state
        .storage
        .get()
        .ok_or_else(|| AppError::Storage("Storage not initialized".to_string()))?;

    storage.query_history.delete(&id).await
}

#[tauri::command]
pub async fn clear_query_history(state: State<'_, AppState>) -> Result<(), AppError> {
    let storage = state
        .storage
        .get()
        .ok_or_else(|| AppError::Storage("Storage not initialized".to_string()))?;

    storage.query_history.clear_all().await
}

// ==================== Saved Queries Commands ====================

#[tauri::command]
pub async fn create_saved_query(
    state: State<'_, AppState>,
    input: CreateSavedQueryInput,
) -> Result<SavedQuery, AppError> {
    let storage = state
        .storage
        .get()
        .ok_or_else(|| AppError::Storage("Storage not initialized".to_string()))?;

    storage.saved_queries.create(&input).await
}

#[tauri::command]
pub async fn list_saved_queries(
    state: State<'_, AppState>,
    workspace_id: Option<String>,
) -> Result<Vec<SavedQuery>, AppError> {
    let storage = state
        .storage
        .get()
        .ok_or_else(|| AppError::Storage("Storage not initialized".to_string()))?;

    storage.saved_queries.list(workspace_id.as_deref()).await
}

#[tauri::command]
pub async fn update_saved_query(
    state: State<'_, AppState>,
    id: String,
    input: UpdateSavedQueryInput,
) -> Result<SavedQuery, AppError> {
    let storage = state
        .storage
        .get()
        .ok_or_else(|| AppError::Storage("Storage not initialized".to_string()))?;

    storage.saved_queries.update(&id, &input).await
}

#[tauri::command]
pub async fn delete_saved_query(
    state: State<'_, AppState>,
    id: String,
) -> Result<(), AppError> {
    let storage = state
        .storage
        .get()
        .ok_or_else(|| AppError::Storage("Storage not initialized".to_string()))?;

    storage.saved_queries.delete(&id).await
}

// ==================== Dev Tools Commands ====================

#[tauri::command]
pub async fn clear_all_data(state: State<'_, AppState>) -> Result<(), AppError> {
    let storage = state
        .storage
        .get()
        .ok_or_else(|| AppError::Storage("Storage not initialized".to_string()))?;

    // Clear saved queries first (due to foreign key constraints)
    storage.saved_queries.clear_all().await?;
    // Clear all workspaces
    storage.workspaces.clear_all().await?;
    // Clear all connections
    storage.connections.clear_all().await?;
    // Clear query history
    storage.query_history.clear_all().await?;

    Ok(())
}
