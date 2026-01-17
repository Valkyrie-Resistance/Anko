use serde::{Deserialize, Serialize};
use sqlx::{Pool, Row, Sqlite};
use uuid::Uuid;

use crate::error::AppError;

const DEFAULT_WORKSPACE_ID: &str = "default";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Workspace {
    pub id: String,
    pub name: String,
    pub icon: String,
    pub is_default: bool,
    pub connection_ids: Vec<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkspaceConfig {
    pub name: String,
    pub icon: String,
}

pub struct WorkspaceStorage {
    pool: Pool<Sqlite>,
}

impl WorkspaceStorage {
    pub fn new(pool: Pool<Sqlite>) -> Self {
        Self { pool }
    }

    pub async fn initialize_schema(&self) -> Result<(), AppError> {
        // Create workspaces table
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS workspaces (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                icon TEXT NOT NULL DEFAULT 'database',
                is_default INTEGER NOT NULL DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        // Create workspace_connections junction table
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS workspace_connections (
                workspace_id TEXT NOT NULL,
                connection_id TEXT NOT NULL,
                added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (workspace_id, connection_id),
                FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        // Ensure default workspace exists
        self.ensure_default_workspace().await?;

        Ok(())
    }

    async fn ensure_default_workspace(&self) -> Result<(), AppError> {
        let exists = sqlx::query("SELECT id FROM workspaces WHERE id = ?")
            .bind(DEFAULT_WORKSPACE_ID)
            .fetch_optional(&self.pool)
            .await?;

        if exists.is_none() {
            sqlx::query(
                r#"
                INSERT INTO workspaces (id, name, icon, is_default)
                VALUES (?, 'Default', 'database', 1)
                "#,
            )
            .bind(DEFAULT_WORKSPACE_ID)
            .execute(&self.pool)
            .await?;
        }

        Ok(())
    }

    pub async fn create(&self, config: &WorkspaceConfig) -> Result<Workspace, AppError> {
        let id = Uuid::new_v4().to_string();

        sqlx::query(
            r#"
            INSERT INTO workspaces (id, name, icon, is_default)
            VALUES (?, ?, ?, 0)
            "#,
        )
        .bind(&id)
        .bind(&config.name)
        .bind(&config.icon)
        .execute(&self.pool)
        .await?;

        self.get(&id).await?.ok_or_else(|| AppError::NotFound("Workspace not found".into()))
    }

    pub async fn update(&self, id: &str, config: &WorkspaceConfig) -> Result<Workspace, AppError> {
        sqlx::query(
            r#"
            UPDATE workspaces
            SET name = ?, icon = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            "#,
        )
        .bind(&config.name)
        .bind(&config.icon)
        .bind(id)
        .execute(&self.pool)
        .await?;

        self.get(id).await?.ok_or_else(|| AppError::NotFound("Workspace not found".into()))
    }

    pub async fn delete(&self, id: &str) -> Result<(), AppError> {
        // Check if it's the default workspace
        let workspace = self.get(id).await?;
        if let Some(w) = workspace {
            if w.is_default {
                return Err(AppError::Validation("Cannot delete the default workspace".into()));
            }
        }

        // Delete workspace (workspace_connections will be cascade deleted)
        sqlx::query("DELETE FROM workspaces WHERE id = ? AND is_default = 0")
            .bind(id)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    pub async fn list(&self) -> Result<Vec<Workspace>, AppError> {
        let rows = sqlx::query(
            r#"
            SELECT id, name, icon, is_default, created_at, updated_at
            FROM workspaces
            ORDER BY is_default DESC, name ASC
            "#,
        )
        .fetch_all(&self.pool)
        .await?;

        let mut workspaces = Vec::new();
        for row in rows {
            let id: String = row.get(0);
            let connection_ids = self.get_workspace_connections(&id).await?;

            workspaces.push(Workspace {
                id,
                name: row.get(1),
                icon: row.get(2),
                is_default: row.get::<i32, _>(3) == 1,
                connection_ids,
                created_at: row.get(4),
                updated_at: row.get(5),
            });
        }

        Ok(workspaces)
    }

    pub async fn get(&self, id: &str) -> Result<Option<Workspace>, AppError> {
        let row = sqlx::query(
            r#"
            SELECT id, name, icon, is_default, created_at, updated_at
            FROM workspaces
            WHERE id = ?
            "#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        match row {
            Some(row) => {
                let id: String = row.get(0);
                let connection_ids = self.get_workspace_connections(&id).await?;

                Ok(Some(Workspace {
                    id,
                    name: row.get(1),
                    icon: row.get(2),
                    is_default: row.get::<i32, _>(3) == 1,
                    connection_ids,
                    created_at: row.get(4),
                    updated_at: row.get(5),
                }))
            }
            None => Ok(None),
        }
    }

    async fn get_workspace_connections(&self, workspace_id: &str) -> Result<Vec<String>, AppError> {
        let rows = sqlx::query(
            r#"
            SELECT connection_id FROM workspace_connections
            WHERE workspace_id = ?
            ORDER BY added_at ASC
            "#,
        )
        .bind(workspace_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows.iter().map(|r| r.get(0)).collect())
    }

    pub async fn add_connection(&self, workspace_id: &str, connection_id: &str) -> Result<(), AppError> {
        sqlx::query(
            r#"
            INSERT OR IGNORE INTO workspace_connections (workspace_id, connection_id)
            VALUES (?, ?)
            "#,
        )
        .bind(workspace_id)
        .bind(connection_id)
        .execute(&self.pool)
        .await?;

        // Update workspace updated_at
        sqlx::query("UPDATE workspaces SET updated_at = CURRENT_TIMESTAMP WHERE id = ?")
            .bind(workspace_id)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    pub async fn remove_connection(&self, workspace_id: &str, connection_id: &str) -> Result<(), AppError> {
        sqlx::query(
            r#"
            DELETE FROM workspace_connections
            WHERE workspace_id = ? AND connection_id = ?
            "#,
        )
        .bind(workspace_id)
        .bind(connection_id)
        .execute(&self.pool)
        .await?;

        // Update workspace updated_at
        sqlx::query("UPDATE workspaces SET updated_at = CURRENT_TIMESTAMP WHERE id = ?")
            .bind(workspace_id)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    pub async fn move_connection(
        &self,
        connection_id: &str,
        from_workspace_id: &str,
        to_workspace_id: &str,
    ) -> Result<(), AppError> {
        self.remove_connection(from_workspace_id, connection_id).await?;
        self.add_connection(to_workspace_id, connection_id).await?;
        Ok(())
    }

    // When a connection is deleted, remove it from all workspaces
    pub async fn remove_connection_from_all(&self, connection_id: &str) -> Result<(), AppError> {
        sqlx::query("DELETE FROM workspace_connections WHERE connection_id = ?")
            .bind(connection_id)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    pub async fn clear_all(&self) -> Result<(), AppError> {
        // Clear all workspace connections
        sqlx::query("DELETE FROM workspace_connections")
            .execute(&self.pool)
            .await?;

        // Delete all non-default workspaces
        sqlx::query("DELETE FROM workspaces WHERE is_default = 0")
            .execute(&self.pool)
            .await?;

        Ok(())
    }
}
