//! Tauri commands for managing database connections! 🚀✨
//!
//! These commands are exposed to the frontend via Tauri's IPC system.
//! They handle creating, testing, and closing database connections~
//! All errors are automatically converted to JSON for the frontend! 💪

use tauri::State;

use crate::db::connector::DatabaseConnector;
use crate::db::ConnectionConfig;
use crate::error::AppError;
use crate::state::AppState;

/// Connect to a database and return a connection ID! 🌟
///
/// Creates a new database connection and stores it in AppState.
/// Frontend can use the returned ID to execute queries~
#[tauri::command]
pub async fn connect(
    state: State<'_, AppState>,
    config: ConnectionConfig,
) -> Result<String, AppError> {
    state.connect(&config).await
}

/// Close a database connection gracefully! 🌸
///
/// Removes the connection from AppState and closes all resources.
/// Always disconnect when you're done to prevent resource leaks!
#[tauri::command]
pub async fn disconnect(
    state: State<'_, AppState>,
    connection_id: String,
) -> Result<(), AppError> {
    state.disconnect(&connection_id).await
}

/// Test if a connection configuration is valid! ✨💫
///
/// Creates a temporary connection to verify credentials work, then
/// closes it immediately. Perfect for the "Test Connection" button! 🎯
#[tauri::command]
pub async fn test_connection(config: ConnectionConfig) -> Result<bool, AppError> {
    use crate::db::mysql::MySqlConnector;
    use crate::db::postgres::PostgresConnector;
    use crate::db::DatabaseDriver;

    match config.driver {
        DatabaseDriver::MySQL => {
            let connector = MySqlConnector::connect(&config).await?;
            connector.close().await?;
            Ok(true)
        }
        DatabaseDriver::PostgreSQL => {
            let connector = PostgresConnector::connect(&config).await?;
            connector.close().await?;
            Ok(true)
        }
    }
}
