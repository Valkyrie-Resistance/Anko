use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{OnceCell, RwLock};
use uuid::Uuid;

use crate::db::connector::DatabaseConnector;
use crate::db::mysql::MySqlConnector;
use crate::db::postgres::PostgresConnector;
use crate::db::ConnectionConfig;
use crate::error::AppError;
use crate::storage::{ConnectionStorage, QueryHistoryStorage, WorkspaceStorage};

pub struct Storage {
    pub connections: ConnectionStorage,
    pub workspaces: WorkspaceStorage,
    pub query_history: QueryHistoryStorage,
}

pub struct AppState {
    pub connections: RwLock<HashMap<String, Arc<dyn DatabaseConnector>>>,
    pub storage: OnceCell<Storage>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            connections: RwLock::new(HashMap::new()),
            storage: OnceCell::new(),
        }
    }

    pub async fn initialize_storage(&self, app_data_dir: &std::path::Path) -> Result<(), AppError> {
        let conn_storage = ConnectionStorage::new(app_data_dir).await?;
        let pool = conn_storage.get_pool();
        let workspace_storage = WorkspaceStorage::new(pool.clone());
        workspace_storage.initialize_schema().await?;
        let query_history_storage = QueryHistoryStorage::new(pool);
        query_history_storage.initialize_schema().await?;
        let storage = Storage {
            connections: conn_storage,
            workspaces: workspace_storage,
            query_history: query_history_storage,
        };
        self.storage.set(storage).map_err(|_| AppError::Storage("Storage already initialized".to_string()))?;
        Ok(())
    }

    pub async fn connect(&self, config: &ConnectionConfig) -> Result<String, AppError> {
        let connector: Arc<dyn DatabaseConnector> = match config.driver {
            crate::db::DatabaseDriver::MySQL => Arc::new(MySqlConnector::connect(config).await?),
            crate::db::DatabaseDriver::PostgreSQL => Arc::new(PostgresConnector::connect(config).await?),
        };
        let connection_id = Uuid::new_v4().to_string();
        let mut connections = self.connections.write().await;
        connections.insert(connection_id.clone(), connector);
        Ok(connection_id)
    }

    pub async fn disconnect(&self, connection_id: &str) -> Result<(), AppError> {
        let mut connections = self.connections.write().await;
        if let Some(connector) = connections.remove(connection_id) {
            connector.close().await?;
        }
        Ok(())
    }

    pub async fn get_connection(&self, connection_id: &str) -> Result<Arc<dyn DatabaseConnector>, AppError> {
        let connections = self.connections.read().await;
        connections.get(connection_id).cloned().ok_or_else(|| AppError::ConnectionNotFound(connection_id.to_string()))
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}
