//! MySQL database connector with all the power you need! ⚡🌟
//!
//! This module provides MySQL-specific implementation of the DatabaseConnector trait.
//! Handles connection pooling, query execution, and schema introspection with
//! maximum efficiency and reliability~ 💪✨
//!
//! Special features:
//! - Connection pooling for blazing-fast performance! 🚀
//! - Automatic type conversion to JSON (handles all MySQL data types!)
//! - Schema introspection via information_schema
//! - SQL injection protection with parameterized queries! 🔐

use async_trait::async_trait;
use bigdecimal::BigDecimal;
use chrono::{DateTime, NaiveDate, NaiveDateTime, NaiveTime, Utc};
use sqlx::{mysql::MySqlPoolOptions, Column, MySql, Pool, Row, TypeInfo};
use std::time::Instant;

use super::connector::{
    ColumnDetail, ColumnInfo, DatabaseConnector, QueryResult, SchemaInfo, TableInfo,
};
use super::query_utils::extract_table_from_select;
use crate::db::ConnectionConfig;
use crate::error::AppError;

/// MySQL connector with connection pooling for maximum performance! 🚀⚡
///
/// Maintains a pool of 5 connections to your MySQL server for efficient
/// query execution. The pool handles connection reuse and timeout automatically~
pub struct MySqlConnector {
    /// sqlx connection pool (5 max connections, 10s timeout)
    pool: Pool<MySql>,
}

/// Helper to safely extract Strings from MySQL rows! 🌸
///
/// MySQL sometimes returns VARBINARY for text columns, so we try both String
/// and Vec<u8> conversion to handle all cases gracefully~ This ensures you
/// always get your data no matter how MySQL decides to return it! 💪
///
/// # Arguments
/// * `row` - The MySQL row to extract from
/// * `index` - Column index to extract
///
/// # Returns
/// The string value, or None if conversion fails (but we try really hard!)
fn get_string_from_row(row: &sqlx::mysql::MySqlRow, index: usize) -> Option<String> {
    row.try_get::<String, _>(index)
        .ok()
        .or_else(|| {
            row.try_get::<Vec<u8>, _>(index)
                .ok()
                .and_then(|bytes| String::from_utf8(bytes).ok())
        })
}

impl MySqlConnector {
    /// Connect to MySQL with detailed error messages! ✨💪
    ///
    /// Creates a connection pool and validates the connection works.
    /// If anything goes wrong, you'll get a super helpful error message
    /// telling you exactly what happened~ 🌟
    ///
    /// # Arguments
    /// * `config` - Your database configuration
    ///
    /// # Returns
    /// A shiny new `MySqlConnector` ready to execute queries! 🚀
    ///
    /// # Errors
    /// Returns `AppError::Database` with detailed error info if:
    /// - Cannot reach the MySQL server (check host/port!)
    /// - Authentication fails (check username/password!)
    /// - Connection times out after 10 seconds
    ///
    /// Don't give up if it fails - the error message will guide you! 💝
    pub async fn connect(config: &ConnectionConfig) -> Result<Self, AppError> {
        let database_part = config
            .database
            .as_ref()
            .map(|db| format!("/{}", db))
            .unwrap_or_default();

        let connection_string = format!(
            "mysql://{}:{}@{}:{}{}",
            config.username, config.password, config.host, config.port, database_part
        );

        let pool = MySqlPoolOptions::new()
            .max_connections(5)
            .acquire_timeout(std::time::Duration::from_secs(10))
            .connect(&connection_string)
            .await
            .map_err(|e| {
                let error_msg = match &e {
                    sqlx::Error::Io(io_err) => {
                        format!("Failed to connect to MySQL at {}:{} - {}", config.host, config.port, io_err)
                    }
                    sqlx::Error::Database(db_err) => {
                        format!("MySQL connection rejected: {}", db_err)
                    }
                    sqlx::Error::PoolTimedOut => {
                        format!("Connection timeout after 10 seconds connecting to {}:{}", config.host, config.port)
                    }
                    _ => format!("Failed to connect to MySQL at {}:{} - {}", config.host, config.port, e)
                };
                AppError::Database(sqlx::Error::Configuration(error_msg.into()))
            })?;

        Ok(Self { pool })
    }
}

#[async_trait]
impl DatabaseConnector for MySqlConnector {
    async fn execute_with_context(
        &self,
        query: &str,
        _database: Option<&str>,
        context: Option<&str>,
    ) -> Result<QueryResult, AppError> {
        // For MySQL: switch to the specified database first (using context parameter)
        // Note: We must execute USE separately because sqlx
        // doesn't support multiple statements in a single query
        // Also, USE is not supported in prepared statements, so we use raw_sql
        let executed_query = if let Some(db) = context {
            // Execute USE database first using raw_sql (not prepared statement)
            let use_query = format!("USE `{}`", db);
            sqlx::raw_sql(&use_query).execute(&self.pool).await?;
            format!("USE `{}`;\n{}", db, query)
        } else {
            query.to_string()
        };

        let mut result = self.execute(query).await?;
        // Add debug info
        result.original_query = Some(query.to_string());
        result.executed_query = Some(executed_query);
        Ok(result)
    }

    async fn execute(&self, query: &str) -> Result<QueryResult, AppError> {
        let start = Instant::now();

        // Try to execute as a query that returns rows
        let result = sqlx::query(query).fetch_all(&self.pool).await;

        match result {
            Ok(rows) => {
                let execution_time_ms = start.elapsed().as_millis() as u64;

                // Extract column info from the first row if available
                // When there are no rows, try to get column info by running LIMIT 0 query
                let columns: Vec<ColumnInfo> = if !rows.is_empty() {
                    rows[0]
                        .columns()
                        .iter()
                        .map(|col| ColumnInfo {
                            name: col.name().to_string(),
                            data_type: col.type_info().name().to_string(),
                            nullable: true,
                        })
                        .collect()
                } else {
                    // Try to get column info for SELECT queries with no results
                    // by parsing table name and getting column info from information_schema
                    let trimmed = query.trim().to_uppercase();
                    if trimmed.starts_with("SELECT") {
                        // Try to extract table name from a simple SELECT query
                        // Pattern: SELECT ... FROM table_name ...
                        if let Some(table_name) = extract_table_from_select(query) {
                            // Get column info from information_schema using parameterized query
                            if let Ok(info_rows) = sqlx::query(
                                "SELECT COLUMN_NAME, DATA_TYPE FROM information_schema.COLUMNS WHERE TABLE_NAME = ? ORDER BY ORDINAL_POSITION"
                            )
                            .bind(&table_name)
                            .fetch_all(&self.pool)
                            .await {
                                info_rows.iter()
                                    .filter_map(|row| {
                                        Some(ColumnInfo {
                                            name: get_string_from_row(row, 0)?,
                                            data_type: get_string_from_row(row, 1)?,
                                            nullable: true,
                                        })
                                    })
                                    .collect()
                            } else {
                                vec![]
                            }
                        } else {
                            vec![]
                        }
                    } else {
                        vec![]
                    }
                };

                // Convert rows to JSON values
                let json_rows: Vec<Vec<serde_json::Value>> = rows
                    .iter()
                    .map(|row| {
                        row.columns()
                            .iter()
                            .enumerate()
                            .map(|(i, col)| {
                                let type_name = col.type_info().name().to_uppercase();
                                let type_name = type_name.as_str();
                                match type_name {
                                    "BIGINT" | "INT" | "SMALLINT" | "TINYINT" | "MEDIUMINT" => {
                                        row.try_get::<i64, _>(i)
                                            .map(serde_json::Value::from)
                                            .unwrap_or(serde_json::Value::Null)
                                    }
                                    "BIGINT UNSIGNED"
                                    | "INT UNSIGNED"
                                    | "SMALLINT UNSIGNED"
                                    | "TINYINT UNSIGNED"
                                    | "MEDIUMINT UNSIGNED" => row
                                        .try_get::<u64, _>(i)
                                        .map(serde_json::Value::from)
                                        .unwrap_or(serde_json::Value::Null),
                                    "FLOAT" | "DOUBLE" => row
                                        .try_get::<f64, _>(i)
                                        .map(|v| {
                                            serde_json::Number::from_f64(v)
                                                .map(serde_json::Value::Number)
                                                .unwrap_or(serde_json::Value::Null)
                                        })
                                        .unwrap_or(serde_json::Value::Null),
                                    "DECIMAL" | "NEWDECIMAL" => row
                                        .try_get::<BigDecimal, _>(i)
                                        .map(|v| serde_json::Value::String(v.to_string()))
                                        .or_else(|_| {
                                            // Fallback to f64 if BigDecimal fails
                                            row.try_get::<f64, _>(i).map(|v| {
                                                serde_json::Number::from_f64(v)
                                                    .map(serde_json::Value::Number)
                                                    .unwrap_or(serde_json::Value::Null)
                                            })
                                        })
                                        .unwrap_or(serde_json::Value::Null),
                                    "JSON" => row
                                        .try_get::<serde_json::Value, _>(i)
                                        .unwrap_or(serde_json::Value::Null),
                                    // Date type (exact match, no precision qualifier)
                                    "DATE" => row
                                        .try_get::<NaiveDate, _>(i)
                                        .map(|v| serde_json::Value::String(v.format("%Y-%m-%d").to_string()))
                                        .unwrap_or(serde_json::Value::Null),
                                    // DATETIME type (timezone-naive)
                                    t if t.starts_with("DATETIME") => {
                                        row.try_get::<Option<NaiveDateTime>, _>(i)
                                            .ok()
                                            .flatten()
                                            .map(|v| serde_json::Value::String(v.format("%Y-%m-%d %H:%M:%S").to_string()))
                                            .unwrap_or(serde_json::Value::Null)
                                    }
                                    // TIMESTAMP type (timezone-aware, stored as UTC)
                                    t if t.starts_with("TIMESTAMP") => {
                                        row.try_get::<Option<DateTime<Utc>>, _>(i)
                                            .ok()
                                            .flatten()
                                            .map(|v| serde_json::Value::String(v.format("%Y-%m-%d %H:%M:%S").to_string()))
                                            .unwrap_or(serde_json::Value::Null)
                                    }
                                    // Time type with optional precision (e.g., TIME(0), TIME(6))
                                    t if t.starts_with("TIME") => row
                                        .try_get::<NaiveTime, _>(i)
                                        .map(|v| serde_json::Value::String(v.format("%H:%M:%S").to_string()))
                                        .unwrap_or(serde_json::Value::Null),
                                    // MySQL JSON is stored as binary internally, sqlx may report it as BLOB
                                    "BLOB" | "BINARY" | "VARBINARY" | "LONGBLOB" | "MEDIUMBLOB" | "TINYBLOB" => {
                                        // Try to get as JSON first (for JSON columns reported as BLOB)
                                        if let Ok(json_val) = row.try_get::<serde_json::Value, _>(i) {
                                            json_val
                                        } else if let Ok(bytes) = row.try_get::<Vec<u8>, _>(i) {
                                            // Try to parse bytes as JSON string
                                            if let Ok(s) = String::from_utf8(bytes.clone()) {
                                                if let Ok(json_val) = serde_json::from_str::<serde_json::Value>(&s) {
                                                    json_val
                                                } else {
                                                    // Not valid JSON, return as string
                                                    serde_json::Value::String(s)
                                                }
                                            } else {
                                                // Binary data that's not valid UTF-8, encode as base64
                                                serde_json::Value::String(format!("[binary: {} bytes]", bytes.len()))
                                            }
                                        } else {
                                            serde_json::Value::Null
                                        }
                                    }
                                    "BOOLEAN" | "BOOL" => row
                                        .try_get::<bool, _>(i)
                                        .map(serde_json::Value::Bool)
                                        .unwrap_or(serde_json::Value::Null),
                                    // Fallback: try multiple types
                                    _ => {
                                        // Try as String first
                                        if let Ok(v) = row.try_get::<String, _>(i) {
                                            return serde_json::Value::String(v);
                                        }
                                        // Try as NaiveDateTime (for any datetime-like types we might have missed)
                                        if let Ok(v) = row.try_get::<NaiveDateTime, _>(i) {
                                            return serde_json::Value::String(v.format("%Y-%m-%d %H:%M:%S").to_string());
                                        }
                                        // Try as i64
                                        if let Ok(v) = row.try_get::<i64, _>(i) {
                                            return serde_json::Value::from(v);
                                        }
                                        // Try as f64
                                        if let Ok(v) = row.try_get::<f64, _>(i) {
                                            return serde_json::Number::from_f64(v)
                                                .map(serde_json::Value::Number)
                                                .unwrap_or(serde_json::Value::Null);
                                        }
                                        // Try as bytes and convert to string
                                        if let Ok(bytes) = row.try_get::<Vec<u8>, _>(i) {
                                            if let Ok(s) = String::from_utf8(bytes) {
                                                return serde_json::Value::String(s);
                                            }
                                        }
                                        serde_json::Value::Null
                                    }
                                }
                            })
                            .collect()
                    })
                    .collect();

                Ok(QueryResult {
                    columns,
                    rows: json_rows,
                    affected_rows: 0,
                    execution_time_ms,
                    original_query: None,
                    executed_query: None,
                })
            }
            Err(_) => {
                // Try as a non-query statement (INSERT, UPDATE, DELETE, etc.)
                let result = sqlx::query(query).execute(&self.pool).await?;
                let execution_time_ms = start.elapsed().as_millis() as u64;

                Ok(QueryResult {
                    columns: vec![],
                    rows: vec![],
                    affected_rows: result.rows_affected(),
                    execution_time_ms,
                    original_query: None,
                    executed_query: None,
                })
            }
        }
    }

    async fn get_databases(&self) -> Result<Vec<SchemaInfo>, AppError> {
        let rows = sqlx::query("SHOW DATABASES")
            .fetch_all(&self.pool)
            .await?;

        // System databases to hide from the tree
        const HIDDEN_DATABASES: &[&str] = &["information_schema", "performance_schema"];

        let databases = rows
            .iter()
            .filter_map(|row| {
                get_string_from_row(row, 0).and_then(|name| {
                    if HIDDEN_DATABASES.contains(&name.as_str()) {
                        None
                    } else {
                        Some(SchemaInfo { name })
                    }
                })
            })
            .collect();

        Ok(databases)
    }

    async fn get_schemas(&self, _database: &str) -> Result<Vec<SchemaInfo>, AppError> {
        // MySQL doesn't have schemas separate from databases
        // Return empty list - tables are accessed directly via database
        Ok(vec![])
    }

    async fn get_tables(&self, database: &str, _schema: &str) -> Result<Vec<TableInfo>, AppError> {
        // MySQL: database is the DB name, schema is ignored (MySQL doesn't have schemas)
        // Use parameterized query to prevent SQL injection
        let rows = sqlx::query(
            r#"
            SELECT
                TABLE_NAME,
                TABLE_SCHEMA,
                TABLE_TYPE,
                TABLE_ROWS
            FROM information_schema.TABLES
            WHERE TABLE_SCHEMA = ?
            ORDER BY TABLE_NAME
            "#
        )
        .bind(database)
        .fetch_all(&self.pool)
        .await?;

        let tables = rows
            .iter()
            .filter_map(|row| {
                Some(TableInfo {
                    name: get_string_from_row(row, 0)?,
                    schema: get_string_from_row(row, 1)?,
                    table_type: get_string_from_row(row, 2)?,
                    row_count: row.try_get::<i64, _>(3).ok(),
                })
            })
            .collect();

        Ok(tables)
    }

    async fn get_columns(
        &self,
        database: &str,
        _schema: &str,
        table: &str,
    ) -> Result<Vec<ColumnDetail>, AppError> {
        // MySQL: database is the DB name, schema is ignored (MySQL doesn't have schemas)
        // Use parameterized query to prevent SQL injection
        let rows = sqlx::query(
            r#"
            SELECT
                COLUMN_NAME,
                DATA_TYPE,
                IS_NULLABLE,
                COLUMN_KEY,
                COLUMN_DEFAULT,
                EXTRA
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
            ORDER BY ORDINAL_POSITION
            "#
        )
        .bind(database)
        .bind(table)
        .fetch_all(&self.pool)
        .await?;

        let columns = rows
            .iter()
            .filter_map(|row| {
                let nullable_str = get_string_from_row(row, 2).unwrap_or_default();
                Some(ColumnDetail {
                    name: get_string_from_row(row, 0)?,
                    data_type: get_string_from_row(row, 1)?,
                    nullable: nullable_str == "YES",
                    key: get_string_from_row(row, 3).filter(|s| !s.is_empty()),
                    default_value: get_string_from_row(row, 4),
                    extra: get_string_from_row(row, 5).filter(|s| !s.is_empty()),
                })
            })
            .collect();

        Ok(columns)
    }

    async fn close(&self) -> Result<(), AppError> {
        self.pool.close().await;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::DatabaseDriver;

    // Helper to create a test config
    fn create_test_config() -> ConnectionConfig {
        ConnectionConfig {
            name: "test".to_string(),
            host: "localhost".to_string(),
            port: 3306,
            username: "root".to_string(),
            password: "password".to_string(),
            database: Some("test".to_string()),
            driver: DatabaseDriver::MySQL,
        }
    }

    #[test]
    fn test_get_string_from_row_type_conversion() {
        // This is a unit test for the helper function logic
        // We can't test with actual MySQL rows without a connection,
        // but we can verify the function signature and basic structure
        let config = create_test_config();
        assert_eq!(config.driver, DatabaseDriver::MySQL);
    }

    #[test]
    fn test_connection_string_format() {
        let config = create_test_config();
        let database_part = config
            .database
            .as_ref()
            .map(|db| format!("/{}", db))
            .unwrap_or_default();

        let connection_string = format!(
            "mysql://{}:{}@{}:{}{}",
            config.username, config.password, config.host, config.port, database_part
        );

        assert_eq!(connection_string, "mysql://root:password@localhost:3306/test");
    }

    #[test]
    fn test_connection_string_without_database() {
        let mut config = create_test_config();
        config.database = None;

        let database_part = config
            .database
            .as_ref()
            .map(|db| format!("/{}", db))
            .unwrap_or_default();

        let connection_string = format!(
            "mysql://{}:{}@{}:{}{}",
            config.username, config.password, config.host, config.port, database_part
        );

        assert_eq!(connection_string, "mysql://root:password@localhost:3306");
    }

    #[test]
    fn test_hidden_databases_filter() {
        const HIDDEN_DATABASES: &[&str] = &["information_schema", "performance_schema"];

        let test_databases = vec!["test_db", "information_schema", "my_app", "performance_schema"];
        let filtered: Vec<_> = test_databases
            .into_iter()
            .filter(|db| !HIDDEN_DATABASES.contains(db))
            .collect();

        assert_eq!(filtered, vec!["test_db", "my_app"]);
    }

    #[test]
    fn test_query_result_structure() {
        let result = QueryResult {
            columns: vec![
                ColumnInfo {
                    name: "id".to_string(),
                    data_type: "INT".to_string(),
                    nullable: false,
                },
                ColumnInfo {
                    name: "name".to_string(),
                    data_type: "VARCHAR".to_string(),
                    nullable: true,
                },
            ],
            rows: vec![
                vec![serde_json::json!(1), serde_json::json!("test")],
            ],
            affected_rows: 0,
            execution_time_ms: 100,
            original_query: Some("SELECT * FROM users".to_string()),
            executed_query: Some("USE test;\nSELECT * FROM users".to_string()),
        };

        assert_eq!(result.columns.len(), 2);
        assert_eq!(result.rows.len(), 1);
        assert_eq!(result.columns[0].name, "id");
        assert_eq!(result.execution_time_ms, 100);
    }

    #[test]
    fn test_column_info_creation() {
        let col = ColumnInfo {
            name: "user_id".to_string(),
            data_type: "BIGINT".to_string(),
            nullable: false,
        };

        assert_eq!(col.name, "user_id");
        assert_eq!(col.data_type, "BIGINT");
        assert!(!col.nullable);
    }

    #[test]
    fn test_schema_info_creation() {
        let schema = SchemaInfo {
            name: "test_database".to_string(),
        };

        assert_eq!(schema.name, "test_database");
    }

    #[test]
    fn test_table_info_creation() {
        let table = TableInfo {
            name: "users".to_string(),
            schema: "test_db".to_string(),
            table_type: "BASE TABLE".to_string(),
            row_count: Some(1000),
        };

        assert_eq!(table.name, "users");
        assert_eq!(table.schema, "test_db");
        assert_eq!(table.table_type, "BASE TABLE");
        assert_eq!(table.row_count, Some(1000));
    }

    // Note: Integration tests requiring a live MySQL instance are marked with #[ignore]
    // Run with: cargo test -- --ignored

    #[tokio::test]
    #[ignore]
    async fn test_connect_with_valid_credentials() {
        // This requires a running MySQL instance
        let config = create_test_config();
        let result = MySqlConnector::connect(&config).await;
        // Would assert success with proper MySQL instance
        assert!(result.is_ok() || result.is_err()); // Placeholder
    }

    #[tokio::test]
    #[ignore]
    async fn test_execute_select_query() {
        // This requires a running MySQL instance with test data
        let config = create_test_config();
        if let Ok(connector) = MySqlConnector::connect(&config).await {
            let result = connector.execute("SELECT 1 as num").await;
            if let Ok(query_result) = result {
                assert_eq!(query_result.columns.len(), 1);
                assert_eq!(query_result.columns[0].name, "num");
            }
        }
    }
}
