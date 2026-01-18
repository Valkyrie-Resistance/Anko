//! Saved queries storage for persisting frequently used queries.
//!
//! Allows users to save, organize, and quickly access their favorite queries.
//! Queries can optionally be associated with workspaces for organization.

use serde::{Deserialize, Serialize};
use sqlx::{Pool, Row, Sqlite};
use uuid::Uuid;

use crate::error::AppError;

/// A saved query entry
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SavedQuery {
    pub id: String,
    pub name: String,
    pub query: String,
    pub description: Option<String>,
    pub workspace_id: Option<String>,
    pub connection_id: Option<String>,
    pub database_name: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

/// Input for creating a new saved query
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateSavedQueryInput {
    pub name: String,
    pub query: String,
    pub description: Option<String>,
    pub workspace_id: Option<String>,
    pub connection_id: Option<String>,
    pub database_name: Option<String>,
}

/// Input for updating a saved query
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSavedQueryInput {
    pub name: Option<String>,
    pub query: Option<String>,
    pub description: Option<String>,
    pub workspace_id: Option<String>,
    pub connection_id: Option<String>,
    pub database_name: Option<String>,
}

/// SQLite storage for saved queries
pub struct SavedQueriesStorage {
    pool: Pool<Sqlite>,
}

impl SavedQueriesStorage {
    pub fn new(pool: Pool<Sqlite>) -> Self {
        Self { pool }
    }

    /// Initialize the saved_queries table schema
    pub async fn initialize_schema(&self) -> Result<(), AppError> {
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS saved_queries (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                query TEXT NOT NULL,
                description TEXT,
                workspace_id TEXT,
                connection_id TEXT,
                database_name TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        // Create index on workspace_id for faster filtering
        sqlx::query(
            r#"
            CREATE INDEX IF NOT EXISTS idx_saved_queries_workspace
            ON saved_queries(workspace_id)
            "#,
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Create a new saved query
    pub async fn create(&self, input: &CreateSavedQueryInput) -> Result<SavedQuery, AppError> {
        let id = Uuid::new_v4().to_string();

        sqlx::query(
            r#"
            INSERT INTO saved_queries (
                id, name, query, description, workspace_id, connection_id, database_name
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&id)
        .bind(&input.name)
        .bind(&input.query)
        .bind(&input.description)
        .bind(&input.workspace_id)
        .bind(&input.connection_id)
        .bind(&input.database_name)
        .execute(&self.pool)
        .await?;

        self.get(&id)
            .await?
            .ok_or_else(|| AppError::Storage("Failed to retrieve created saved query".to_string()))
    }

    /// Get a single saved query by ID
    pub async fn get(&self, id: &str) -> Result<Option<SavedQuery>, AppError> {
        let row = sqlx::query(
            r#"
            SELECT id, name, query, description, workspace_id, connection_id, database_name,
                   datetime(created_at) as created_at, datetime(updated_at) as updated_at
            FROM saved_queries
            WHERE id = ?
            "#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.map(|r| SavedQuery {
            id: r.get(0),
            name: r.get(1),
            query: r.get(2),
            description: r.get(3),
            workspace_id: r.get(4),
            connection_id: r.get(5),
            database_name: r.get(6),
            created_at: r.get(7),
            updated_at: r.get(8),
        }))
    }

    /// List all saved queries, optionally filtered by workspace
    pub async fn list(&self, workspace_id: Option<&str>) -> Result<Vec<SavedQuery>, AppError> {
        let queries = if let Some(ws_id) = workspace_id {
            sqlx::query(
                r#"
                SELECT id, name, query, description, workspace_id, connection_id, database_name,
                       datetime(created_at) as created_at, datetime(updated_at) as updated_at
                FROM saved_queries
                WHERE workspace_id = ? OR workspace_id IS NULL
                ORDER BY name ASC
                "#,
            )
            .bind(ws_id)
            .fetch_all(&self.pool)
            .await?
        } else {
            sqlx::query(
                r#"
                SELECT id, name, query, description, workspace_id, connection_id, database_name,
                       datetime(created_at) as created_at, datetime(updated_at) as updated_at
                FROM saved_queries
                ORDER BY name ASC
                "#,
            )
            .fetch_all(&self.pool)
            .await?
        };

        Ok(queries
            .iter()
            .map(|r| SavedQuery {
                id: r.get(0),
                name: r.get(1),
                query: r.get(2),
                description: r.get(3),
                workspace_id: r.get(4),
                connection_id: r.get(5),
                database_name: r.get(6),
                created_at: r.get(7),
                updated_at: r.get(8),
            })
            .collect())
    }

    /// Update a saved query
    pub async fn update(&self, id: &str, input: &UpdateSavedQueryInput) -> Result<SavedQuery, AppError> {
        // Fetch existing query first
        let existing = self
            .get(id)
            .await?
            .ok_or_else(|| AppError::Storage(format!("Saved query not found: {}", id)))?;

        let name = input.name.as_ref().unwrap_or(&existing.name);
        let query = input.query.as_ref().unwrap_or(&existing.query);
        let description = input.description.as_ref().or(existing.description.as_ref());
        let workspace_id = input.workspace_id.as_ref().or(existing.workspace_id.as_ref());
        let connection_id = input.connection_id.as_ref().or(existing.connection_id.as_ref());
        let database_name = input.database_name.as_ref().or(existing.database_name.as_ref());

        sqlx::query(
            r#"
            UPDATE saved_queries
            SET name = ?, query = ?, description = ?, workspace_id = ?,
                connection_id = ?, database_name = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            "#,
        )
        .bind(name)
        .bind(query)
        .bind(description)
        .bind(workspace_id)
        .bind(connection_id)
        .bind(database_name)
        .bind(id)
        .execute(&self.pool)
        .await?;

        self.get(id)
            .await?
            .ok_or_else(|| AppError::Storage("Failed to retrieve updated saved query".to_string()))
    }

    /// Delete a saved query
    pub async fn delete(&self, id: &str) -> Result<(), AppError> {
        sqlx::query("DELETE FROM saved_queries WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    /// Clear all saved queries
    pub async fn clear_all(&self) -> Result<(), AppError> {
        sqlx::query("DELETE FROM saved_queries")
            .execute(&self.pool)
            .await?;

        Ok(())
    }
}
