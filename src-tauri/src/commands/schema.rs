use log::{error, info};
use tauri::State;

use crate::db::connector::{ColumnDetail, SchemaInfo, TableInfo};
use crate::error::AppError;
use crate::state::AppState;

#[tauri::command]
pub async fn get_databases(
    state: State<'_, AppState>,
    connection_id: String,
) -> Result<Vec<SchemaInfo>, AppError> {
    info!("[Command] get_databases called with connection_id: {}", connection_id);

    let connector = state.get_connection(&connection_id).await.map_err(|e| {
        error!("[Command] get_databases - failed to get connection: {:?}", e);
        e
    })?;

    let result = connector.get_databases().await;

    match &result {
        Ok(databases) => {
            info!("[Command] get_databases returning {} databases for connection: {}",
                databases.len(), connection_id);
        }
        Err(e) => {
            error!("[Command] get_databases failed: {:?}", e);
        }
    }

    result
}

#[tauri::command]
pub async fn get_schemas(
    state: State<'_, AppState>,
    connection_id: String,
    database: String,
) -> Result<Vec<SchemaInfo>, AppError> {
    info!("[Command] get_schemas called with connection_id: {}, database: '{}'", connection_id, database);

    let connector = state.get_connection(&connection_id).await.map_err(|e| {
        error!("[Command] get_schemas - failed to get connection: {:?}", e);
        e
    })?;

    let result = connector.get_schemas(&database).await;

    match &result {
        Ok(schemas) => {
            info!("[Command] get_schemas returning {} schemas for database '{}': {:?}",
                schemas.len(),
                database,
                schemas.iter().map(|s| &s.name).collect::<Vec<_>>()
            );
        }
        Err(e) => {
            error!("[Command] get_schemas failed for database '{}': {:?}", database, e);
        }
    }

    result
}

#[tauri::command]
pub async fn get_tables(
    state: State<'_, AppState>,
    connection_id: String,
    database: String,
    schema: String,
) -> Result<Vec<TableInfo>, AppError> {
    info!("[Command] get_tables called with connection_id: {}, database: '{}', schema: '{}'",
        connection_id, database, schema);

    let connector = state.get_connection(&connection_id).await.map_err(|e| {
        error!("[Command] get_tables - failed to get connection: {:?}", e);
        e
    })?;

    let result = connector.get_tables(&database, &schema).await;

    match &result {
        Ok(tables) => {
            info!("[Command] get_tables returning {} tables for {}.{}: {:?}",
                tables.len(), database, schema, tables.iter().map(|t| &t.name).collect::<Vec<_>>());
        }
        Err(e) => {
            error!("[Command] get_tables failed for {}.{}: {:?}", database, schema, e);
        }
    }

    result
}

#[tauri::command]
pub async fn get_columns(
    state: State<'_, AppState>,
    connection_id: String,
    database: String,
    schema: String,
    table: String,
) -> Result<Vec<ColumnDetail>, AppError> {
    info!("[Command] get_columns called with connection_id: {}, database: '{}', schema: '{}', table: '{}'",
        connection_id, database, schema, table);

    let connector = state.get_connection(&connection_id).await.map_err(|e| {
        error!("[Command] get_columns - failed to get connection: {:?}", e);
        e
    })?;

    let result = connector.get_columns(&database, &schema, &table).await;

    match &result {
        Ok(columns) => {
            info!("[Command] get_columns returning {} columns for {}.{}.{}: {:?}",
                columns.len(), database, schema, table, columns.iter().map(|c| &c.name).collect::<Vec<_>>());
        }
        Err(e) => {
            error!("[Command] get_columns failed for {}.{}.{}: {:?}", database, schema, table, e);
        }
    }

    result
}
