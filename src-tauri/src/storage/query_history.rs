//! Query history storage for tracking executed queries.
//!
//! Stores query execution history with automatic cleanup for entries older
//! than 30 days and a maximum of 1000 entries to prevent unbounded growth.

use serde::{Deserialize, Serialize};
use sqlx::{Pool, Row, Sqlite};
use uuid::Uuid;

use crate::error::AppError;

/// Maximum number of history entries to keep
const MAX_HISTORY_ENTRIES: i64 = 1000;

/// Number of days to keep history entries
const HISTORY_RETENTION_DAYS: i32 = 30;

/// A query history entry
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QueryHistoryEntry {
    pub id: String,
    pub query: String,
    pub connection_id: String,
    pub connection_name: String,
    pub database_name: Option<String>,
    pub executed_at: String,
    pub execution_time_ms: Option<i64>,
    pub row_count: Option<i64>,
    pub success: bool,
    pub error_message: Option<String>,
}

/// Input for adding a new history entry
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddQueryHistoryInput {
    pub query: String,
    pub connection_id: String,
    pub connection_name: String,
    pub database_name: Option<String>,
    pub execution_time_ms: Option<i64>,
    pub row_count: Option<i64>,
    pub success: bool,
    pub error_message: Option<String>,
}

/// SQLite storage for query history
pub struct QueryHistoryStorage {
    pool: Pool<Sqlite>,
}

impl QueryHistoryStorage {
    pub fn new(pool: Pool<Sqlite>) -> Self {
        Self { pool }
    }

    /// Initialize the query_history table schema
    pub async fn initialize_schema(&self) -> Result<(), AppError> {
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS query_history (
                id TEXT PRIMARY KEY,
                query TEXT NOT NULL,
                connection_id TEXT NOT NULL,
                connection_name TEXT NOT NULL,
                database_name TEXT,
                executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                execution_time_ms INTEGER,
                row_count INTEGER,
                success INTEGER NOT NULL DEFAULT 1,
                error_message TEXT
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        // Create index on executed_at for faster cleanup queries
        sqlx::query(
            r#"
            CREATE INDEX IF NOT EXISTS idx_query_history_executed_at
            ON query_history(executed_at)
            "#,
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Add a new query to history with automatic cleanup
    pub async fn add(&self, input: &AddQueryHistoryInput) -> Result<QueryHistoryEntry, AppError> {
        // Clean up old entries first
        self.cleanup().await?;

        let id = Uuid::new_v4().to_string();

        sqlx::query(
            r#"
            INSERT INTO query_history (
                id, query, connection_id, connection_name, database_name,
                execution_time_ms, row_count, success, error_message
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&id)
        .bind(&input.query)
        .bind(&input.connection_id)
        .bind(&input.connection_name)
        .bind(&input.database_name)
        .bind(input.execution_time_ms)
        .bind(input.row_count)
        .bind(input.success)
        .bind(&input.error_message)
        .execute(&self.pool)
        .await?;

        // Fetch the created entry to get the timestamp
        self.get(&id)
            .await?
            .ok_or_else(|| AppError::Storage("Failed to retrieve created history entry".to_string()))
    }

    /// Get a single history entry by ID
    pub async fn get(&self, id: &str) -> Result<Option<QueryHistoryEntry>, AppError> {
        let row = sqlx::query(
            r#"
            SELECT id, query, connection_id, connection_name, database_name,
                   datetime(executed_at) as executed_at, execution_time_ms,
                   row_count, success, error_message
            FROM query_history
            WHERE id = ?
            "#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.map(|r| QueryHistoryEntry {
            id: r.get(0),
            query: r.get(1),
            connection_id: r.get(2),
            connection_name: r.get(3),
            database_name: r.get(4),
            executed_at: r.get(5),
            execution_time_ms: r.get(6),
            row_count: r.get(7),
            success: r.get::<i32, _>(8) != 0,
            error_message: r.get(9),
        }))
    }

    /// List all history entries, optionally filtered by connection
    pub async fn list(
        &self,
        connection_id: Option<&str>,
        limit: Option<i64>,
    ) -> Result<Vec<QueryHistoryEntry>, AppError> {
        let limit = limit.unwrap_or(100);

        let entries = if let Some(conn_id) = connection_id {
            sqlx::query(
                r#"
                SELECT id, query, connection_id, connection_name, database_name,
                       datetime(executed_at) as executed_at, execution_time_ms,
                       row_count, success, error_message
                FROM query_history
                WHERE connection_id = ?
                ORDER BY executed_at DESC
                LIMIT ?
                "#,
            )
            .bind(conn_id)
            .bind(limit)
            .fetch_all(&self.pool)
            .await?
        } else {
            sqlx::query(
                r#"
                SELECT id, query, connection_id, connection_name, database_name,
                       datetime(executed_at) as executed_at, execution_time_ms,
                       row_count, success, error_message
                FROM query_history
                ORDER BY executed_at DESC
                LIMIT ?
                "#,
            )
            .bind(limit)
            .fetch_all(&self.pool)
            .await?
        };

        Ok(entries
            .iter()
            .map(|r| QueryHistoryEntry {
                id: r.get(0),
                query: r.get(1),
                connection_id: r.get(2),
                connection_name: r.get(3),
                database_name: r.get(4),
                executed_at: r.get(5),
                execution_time_ms: r.get(6),
                row_count: r.get(7),
                success: r.get::<i32, _>(8) != 0,
                error_message: r.get(9),
            })
            .collect())
    }

    /// Delete a single history entry
    pub async fn delete(&self, id: &str) -> Result<(), AppError> {
        sqlx::query("DELETE FROM query_history WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    /// Clear all history entries
    pub async fn clear_all(&self) -> Result<(), AppError> {
        sqlx::query("DELETE FROM query_history")
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    /// Cleanup old entries (30 days) and enforce max count (1000)
    async fn cleanup(&self) -> Result<(), AppError> {
        // Delete entries older than 30 days
        sqlx::query(&format!(
            "DELETE FROM query_history WHERE executed_at < datetime('now', '-{} days')",
            HISTORY_RETENTION_DAYS
        ))
        .execute(&self.pool)
        .await?;

        // If still over limit, delete oldest entries
        let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM query_history")
            .fetch_one(&self.pool)
            .await?;

        if count >= MAX_HISTORY_ENTRIES {
            let to_delete = count - MAX_HISTORY_ENTRIES + 1; // +1 to make room for new entry
            sqlx::query(
                r#"
                DELETE FROM query_history
                WHERE id IN (
                    SELECT id FROM query_history
                    ORDER BY executed_at ASC
                    LIMIT ?
                )
                "#,
            )
            .bind(to_delete)
            .execute(&self.pool)
            .await?;
        }

        Ok(())
    }
}
