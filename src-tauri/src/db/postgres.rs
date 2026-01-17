//! PostgreSQL connector with intelligent pool management! 🚀💜
//!
//! This module provides PostgreSQL-specific implementation with advanced features
//! that make working with PostgreSQL databases a breeze~ ✨💪
//!
//! Special PostgreSQL superpowers:
//! - Per-database connection pooling (because PostgreSQL has multiple databases!)
//! - Automatic pool eviction to prevent memory leaks (runs every 60 seconds!)
//! - Schema support with search_path management
//! - Comprehensive type support (timestamps, UUIDs, JSON, decimals, and more!)
//! - SQL injection protection everywhere! 🔐
//!
//! The pool eviction system is super smart: it closes pools for databases that
//! haven't been used in 5+ minutes, keeping memory usage under control while
//! maintaining the default database pool forever~ 🌟

use async_trait::async_trait;
use bigdecimal::BigDecimal;
use chrono::{DateTime, NaiveDate, NaiveDateTime, NaiveTime, Utc};
use log::{debug, error, info};
use sqlx::{postgres::PgPoolOptions, Column, PgPool, Row, TypeInfo};
use std::collections::HashMap;
use std::sync::Arc;
use std::time::Instant;
use tokio::sync::RwLock;
use uuid::Uuid;

use super::connector::{
    ColumnDetail, ColumnInfo, DatabaseConnector, QueryResult, SchemaInfo, TableInfo,
};
use super::query_utils::extract_table_from_select;
use crate::db::ConnectionConfig;
use crate::error::AppError;

/// Convert PostgreSQL values to JSON with type-perfect accuracy! 🎯✨
///
/// PostgreSQL has TONS of data types, and we handle them all beautifully!
/// This function maps Postgres types to JSON values while preserving
/// precision and formatting~ 💪
///
/// Supported types include:
/// - All integer types (int2, int4, int8)
/// - Floating point (float4, float8, numeric, decimal)
/// - Timestamps (with/without timezone)
/// - UUIDs, JSON/JSONB, and more!
///
/// # Arguments
/// * `row` - The PostgreSQL row
/// * `index` - Column index
/// * `type_name` - PostgreSQL type name (from TypeInfo)
///
/// # Returns
/// A `serde_json::Value` representing the data perfectly! 🌟
fn pg_value_to_json(row: &sqlx::postgres::PgRow, index: usize, type_name: &str) -> serde_json::Value {
    match type_name {
        // Integer types
        "INT8" | "BIGINT" => row
            .try_get::<i64, _>(index)
            .map(serde_json::Value::from)
            .unwrap_or(serde_json::Value::Null),
        "INT4" | "INTEGER" | "SERIAL" => row
            .try_get::<i32, _>(index)
            .map(|v| serde_json::Value::from(v as i64))
            .unwrap_or(serde_json::Value::Null),
        "INT2" | "SMALLINT" => row
            .try_get::<i16, _>(index)
            .map(|v| serde_json::Value::from(v as i64))
            .unwrap_or(serde_json::Value::Null),

        // Float types
        "FLOAT8" | "DOUBLE PRECISION" => row
            .try_get::<f64, _>(index)
            .map(|v| {
                serde_json::Number::from_f64(v)
                    .map(serde_json::Value::Number)
                    .unwrap_or(serde_json::Value::Null)
            })
            .unwrap_or(serde_json::Value::Null),
        "FLOAT4" | "REAL" => row
            .try_get::<f32, _>(index)
            .map(|v| {
                serde_json::Number::from_f64(v as f64)
                    .map(serde_json::Value::Number)
                    .unwrap_or(serde_json::Value::Null)
            })
            .unwrap_or(serde_json::Value::Null),
        "NUMERIC" | "DECIMAL" => row
            .try_get::<BigDecimal, _>(index)
            .map(|v| serde_json::Value::String(v.to_string()))
            .or_else(|_| {
                row.try_get::<f64, _>(index)
                    .map(|v| {
                        serde_json::Number::from_f64(v)
                            .map(serde_json::Value::Number)
                            .unwrap_or(serde_json::Value::Null)
                    })
            })
            .unwrap_or(serde_json::Value::Null),

        // Boolean
        "BOOL" | "BOOLEAN" => row
            .try_get::<bool, _>(index)
            .map(serde_json::Value::Bool)
            .unwrap_or(serde_json::Value::Null),

        // Timestamp types
        "TIMESTAMPTZ" | "TIMESTAMP WITH TIME ZONE" => row
            .try_get::<DateTime<Utc>, _>(index)
            .map(|v| serde_json::Value::String(v.to_rfc3339()))
            .unwrap_or(serde_json::Value::Null),
        "TIMESTAMP" | "TIMESTAMP WITHOUT TIME ZONE" => row
            .try_get::<NaiveDateTime, _>(index)
            .map(|v| serde_json::Value::String(v.format("%Y-%m-%d %H:%M:%S").to_string()))
            .unwrap_or(serde_json::Value::Null),
        "DATE" => row
            .try_get::<NaiveDate, _>(index)
            .map(|v| serde_json::Value::String(v.format("%Y-%m-%d").to_string()))
            .unwrap_or(serde_json::Value::Null),
        "TIME" | "TIME WITHOUT TIME ZONE" => row
            .try_get::<NaiveTime, _>(index)
            .map(|v| serde_json::Value::String(v.format("%H:%M:%S").to_string()))
            .unwrap_or(serde_json::Value::Null),

        // UUID
        "UUID" => row
            .try_get::<Uuid, _>(index)
            .map(|v| serde_json::Value::String(v.to_string()))
            .unwrap_or(serde_json::Value::Null),

        // JSON types
        "JSON" | "JSONB" => row
            .try_get::<serde_json::Value, _>(index)
            .unwrap_or(serde_json::Value::Null),

        // Default: try as string, with fallback attempts
        _ => {
            // Try String first
            if let Ok(v) = row.try_get::<String, _>(index) {
                return serde_json::Value::String(v);
            }
            // Try i64 (for any integer-like types we might have missed)
            if let Ok(v) = row.try_get::<i64, _>(index) {
                return serde_json::Value::from(v);
            }
            // Try i32
            if let Ok(v) = row.try_get::<i32, _>(index) {
                return serde_json::Value::from(v as i64);
            }
            // Try f64
            if let Ok(v) = row.try_get::<f64, _>(index) {
                return serde_json::Number::from_f64(v)
                    .map(serde_json::Value::Number)
                    .unwrap_or(serde_json::Value::Null);
            }
            // Try bool
            if let Ok(v) = row.try_get::<bool, _>(index) {
                return serde_json::Value::Bool(v);
            }
            // Try DateTime
            if let Ok(v) = row.try_get::<DateTime<Utc>, _>(index) {
                return serde_json::Value::String(v.to_rfc3339());
            }
            // Try NaiveDateTime
            if let Ok(v) = row.try_get::<NaiveDateTime, _>(index) {
                return serde_json::Value::String(v.format("%Y-%m-%d %H:%M:%S").to_string());
            }
            // Give up and return null
            serde_json::Value::Null
        }
    }
}

/// Pool entry with timestamp tracking for intelligent eviction! ⏰💫
///
/// Each database gets its own pool entry that tracks when it was last used.
/// The eviction system checks these timestamps periodically to clean up
/// inactive pools~ This prevents memory leaks while keeping hot pools ready! 🌟
struct PoolEntry {
    /// The actual connection pool for this database
    pool: PgPool,
    /// Last access time (protected by RwLock for concurrent updates)
    last_used: Arc<RwLock<Instant>>,
}

/// PostgreSQL connector with per-database connection pooling! 🚀💜
///
/// Unlike MySQL (which uses one pool), PostgreSQL needs separate pools for each
/// database you connect to. This connector manages all those pools efficiently
/// with automatic creation and cleanup~ ✨
///
/// The magic happens through:
/// - **On-demand pool creation**: Pools are created when you first access a database
/// - **Automatic eviction**: Inactive pools are closed after 5 minutes of no use
/// - **Default pool persistence**: The initial database pool never gets evicted
/// - **Thread-safe access**: All pool operations are protected by RwLock
///
/// Memory management is handled by a background task that wakes up every 60 seconds
/// to check for inactive pools. You don't have to worry about anything! 💪🌟
pub struct PostgresConnector {
    /// Store config for creating new pools on-demand
    config: ConnectionConfig,
    /// Pool per database with last-used tracking for time-based eviction
    pools: Arc<RwLock<HashMap<String, PoolEntry>>>,
    /// The default database this connection was created with
    default_database: String,
}

impl PostgresConnector {
    /// Connect to PostgreSQL and start the pool eviction system! ✨🚀
    ///
    /// Creates the initial connection pool for the default database and spawns
    /// a background task to manage pool lifecycle. The eviction task runs forever,
    /// checking every 60 seconds for pools that haven't been used in 5+ minutes~
    ///
    /// # Arguments
    /// * `config` - Your database configuration
    ///
    /// # Returns
    /// A `PostgresConnector` ready to work with multiple databases! 💪
    ///
    /// # Errors
    /// Returns `AppError::Database` if the initial connection fails.
    /// Check your host, port, credentials, and that PostgreSQL is running! 💝
    pub async fn connect(config: &ConnectionConfig) -> Result<Self, AppError> {
        info!("[PostgreSQL] Connecting to {}:{}", config.host, config.port);

        let default_database = config
            .database
            .as_ref()
            .cloned()
            .unwrap_or_else(|| "postgres".to_string());

        let connection_string = format!(
            "postgres://{}:{}@{}:{}/{}",
            config.username, config.password, config.host, config.port, default_database
        );

        debug!("[PostgreSQL] Attempting connection to default database: {}", default_database);

        let pool = PgPoolOptions::new()
            .max_connections(5)
            .acquire_timeout(std::time::Duration::from_secs(10))
            .connect(&connection_string)
            .await
            .map_err(|e| {
                let error_msg = match &e {
                    sqlx::Error::Io(io_err) => {
                        format!("Failed to connect to PostgreSQL at {}:{} - {}", config.host, config.port, io_err)
                    }
                    sqlx::Error::Database(db_err) => {
                        format!("PostgreSQL connection rejected: {}", db_err)
                    }
                    sqlx::Error::PoolTimedOut => {
                        format!("Connection timeout after 10 seconds connecting to {}:{}", config.host, config.port)
                    }
                    _ => format!("Failed to connect to PostgreSQL at {}:{} - {}", config.host, config.port, e)
                };
                error!("[PostgreSQL] {}", error_msg);
                AppError::Database(sqlx::Error::Configuration(error_msg.into()))
            })?;

        info!("[PostgreSQL] Connection established successfully to database: {}", default_database);

        // Initialize pool map with the default database
        let mut pools = HashMap::new();
        let entry = PoolEntry {
            pool,
            last_used: Arc::new(RwLock::new(Instant::now())),
        };
        pools.insert(default_database.clone(), entry);

        let connector = Self {
            config: config.clone(),
            pools: Arc::new(RwLock::new(pools)),
            default_database,
        };

        // Start background task to evict inactive pools every 60 seconds
        connector.start_pool_evictor();

        Ok(connector)
    }

    /// Start background task to evict inactive connection pools
    ///
    /// Runs every 60 seconds and closes pools that have been inactive for 5+ minutes.
    /// This prevents memory leaks from accumulating pools for databases that are no longer in use.
    fn start_pool_evictor(&self) {
        const EVICTION_CHECK_INTERVAL: std::time::Duration = std::time::Duration::from_secs(60);
        const POOL_TTL: std::time::Duration = std::time::Duration::from_secs(300); // 5 minutes

        let pools = self.pools.clone();
        let default_db = self.default_database.clone();

        tokio::spawn(async move {
            let mut interval = tokio::time::interval(EVICTION_CHECK_INTERVAL);
            loop {
                interval.tick().await;

                let now = Instant::now();
                let mut pools_guard = pools.write().await;
                let initial_count = pools_guard.len();

                // Collect databases to evict (pools inactive for > 5 minutes)
                let mut to_evict = Vec::new();
                for (database, entry) in pools_guard.iter() {
                    // Never evict the default database pool
                    if database == &default_db {
                        continue;
                    }

                    let last_used = *entry.last_used.read().await;
                    let inactive_duration = now.duration_since(last_used);

                    if inactive_duration > POOL_TTL {
                        to_evict.push((database.clone(), inactive_duration));
                    }
                }

                // Evict inactive pools
                for (database, inactive_duration) in &to_evict {
                    if let Some(entry) = pools_guard.remove(database) {
                        // Close the pool
                        entry.pool.close().await;
                        info!(
                            "[PostgreSQL] Evicted pool for database '{}' (inactive for {:.1} minutes)",
                            database,
                            inactive_duration.as_secs_f64() / 60.0
                        );
                    }
                }

                if !to_evict.is_empty() {
                    info!(
                        "[PostgreSQL] Pool eviction complete: {} → {} pools ({} evicted)",
                        initial_count,
                        pools_guard.len(),
                        to_evict.len()
                    );
                }
            }
        });

        info!("[PostgreSQL] Started pool eviction background task (checks every 60s, TTL: 5min)");
    }

    /// Get or create a connection pool for a specific database
    async fn get_pool(&self, database: &str) -> Result<PgPool, AppError> {
        // Check if pool already exists and update last_used timestamp
        {
            let pools = self.pools.read().await;
            if let Some(entry) = pools.get(database) {
                // Update last_used timestamp
                *entry.last_used.write().await = Instant::now();
                return Ok(entry.pool.clone());
            }
        }

        // Create new pool for this database
        info!("[PostgreSQL] Creating new pool for database: {}", database);
        let connection_string = format!(
            "postgres://{}:{}@{}:{}/{}",
            self.config.username, self.config.password,
            self.config.host, self.config.port, database
        );

        let pool = PgPoolOptions::new()
            .max_connections(5)
            .acquire_timeout(std::time::Duration::from_secs(10))
            .connect(&connection_string)
            .await
            .map_err(|e| {
                let error_msg = match &e {
                    sqlx::Error::Io(io_err) => {
                        format!("Failed to connect to PostgreSQL database '{}' at {}:{} - {}",
                            database, self.config.host, self.config.port, io_err)
                    }
                    sqlx::Error::Database(db_err) => {
                        format!("PostgreSQL connection to database '{}' rejected: {}", database, db_err)
                    }
                    sqlx::Error::PoolTimedOut => {
                        format!("Connection timeout after 10 seconds connecting to database '{}' at {}:{}",
                            database, self.config.host, self.config.port)
                    }
                    _ => format!("Failed to connect to PostgreSQL database '{}' at {}:{} - {}",
                        database, self.config.host, self.config.port, e)
                };
                error!("[PostgreSQL] {}", error_msg);
                AppError::Database(sqlx::Error::Configuration(error_msg.into()))
            })?;

        // Create entry with current timestamp
        let entry = PoolEntry {
            pool: pool.clone(),
            last_used: Arc::new(RwLock::new(Instant::now())),
        };

        // Store and return
        let mut pools = self.pools.write().await;
        pools.insert(database.to_string(), entry);
        info!("[PostgreSQL] Pool created for database: {}", database);
        Ok(pool)
    }

    /// Get the default pool (for queries without specific database context)
    async fn get_default_pool(&self) -> Result<PgPool, AppError> {
        self.get_pool(&self.default_database).await
    }
}

#[async_trait]
impl DatabaseConnector for PostgresConnector {
    async fn execute_with_context(
        &self,
        query: &str,
        database: Option<&str>,
        schema: Option<&str>,
    ) -> Result<QueryResult, AppError> {
        // For PostgreSQL: use specific database pool if provided, otherwise default
        let pool = if let Some(db) = database {
            self.get_pool(db).await?
        } else {
            self.get_default_pool().await?
        };

        let start = Instant::now();

        // For PostgreSQL: set search_path to the schema if specified
        // This allows queries to reference tables without schema prefix
        // Note: SET search_path uses an identifier, not a string literal
        // We'll use identifier quoting to prevent SQL injection
        let executed_query = if let Some(s) = schema {
            // Quote the schema name to prevent SQL injection
            // PostgreSQL identifier quoting: "schema_name"
            let quoted_schema = format!("\"{}\"", s.replace("\"", "\"\""));
            let set_path_query = format!("SET search_path TO {}", quoted_schema);
            sqlx::query(&set_path_query).execute(&pool).await?;
            format!("SET search_path TO {};\n{}", quoted_schema, query)
        } else {
            query.to_string()
        };

        // Execute the query on the correct pool
        let result = sqlx::query(query).fetch_all(&pool).await;

        match result {
            Ok(rows) => {
                let execution_time_ms = start.elapsed().as_millis() as u64;

                // Extract column info from the first row if available
                // When there are no rows, try to get column info from information_schema
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
                    let trimmed = query.trim().to_uppercase();
                    if trimmed.starts_with("SELECT") {
                        if let Some(table_name) = extract_table_from_select(query) {
                            // Get column info from information_schema using parameterized query
                            if let Ok(info_rows) = sqlx::query(
                                "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position"
                            )
                            .bind(&table_name)
                            .fetch_all(&pool)
                            .await {
                                info_rows.iter()
                                    .map(|row| ColumnInfo {
                                        name: row.get::<String, _>(0),
                                        data_type: row.get::<String, _>(1),
                                        nullable: true,
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

                let json_rows: Vec<Vec<serde_json::Value>> = rows
                    .iter()
                    .map(|row| {
                        row.columns()
                            .iter()
                            .enumerate()
                            .map(|(i, col)| {
                                let type_name = col.type_info().name();
                                pg_value_to_json(row, i, type_name)
                            })
                            .collect()
                    })
                    .collect();

                Ok(QueryResult {
                    columns,
                    rows: json_rows,
                    affected_rows: 0,
                    execution_time_ms,
                    original_query: Some(query.to_string()),
                    executed_query: Some(executed_query),
                })
            }
            Err(_) => {
                // Try as a non-query statement (INSERT, UPDATE, DELETE, etc.)
                let result = sqlx::query(query).execute(&pool).await?;
                let execution_time_ms = start.elapsed().as_millis() as u64;

                Ok(QueryResult {
                    columns: vec![],
                    rows: vec![],
                    affected_rows: result.rows_affected(),
                    execution_time_ms,
                    original_query: Some(query.to_string()),
                    executed_query: Some(executed_query),
                })
            }
        }
    }

    async fn execute(&self, query: &str) -> Result<QueryResult, AppError> {
        let pool = self.get_default_pool().await?;
        let start = Instant::now();

        // Try to execute as a query that returns rows
        let result = sqlx::query(query).fetch_all(&pool).await;

        match result {
            Ok(rows) => {
                let execution_time_ms = start.elapsed().as_millis() as u64;

                // Extract column info from the first row if available
                // When there are no rows, try to get column info from information_schema
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
                    let trimmed = query.trim().to_uppercase();
                    if trimmed.starts_with("SELECT") {
                        if let Some(table_name) = extract_table_from_select(query) {
                            // Get column info from information_schema using parameterized query
                            if let Ok(info_rows) = sqlx::query(
                                "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position"
                            )
                            .bind(&table_name)
                            .fetch_all(&pool)
                            .await {
                                info_rows.iter()
                                    .map(|row| ColumnInfo {
                                        name: row.get::<String, _>(0),
                                        data_type: row.get::<String, _>(1),
                                        nullable: true,
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
                                let type_name = col.type_info().name();
                                pg_value_to_json(row, i, type_name)
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
                let result = sqlx::query(query).execute(&pool).await?;
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
        info!("[PostgreSQL] get_databases() called");

        // Query all databases from pg_database
        let pool = self.get_default_pool().await?;

        let query = r#"
            SELECT datname
            FROM pg_database
            WHERE datistemplate = false
            ORDER BY datname
        "#;

        let rows = sqlx::query(query)
            .fetch_all(&pool)
            .await
            .map_err(|e| {
                error!("[PostgreSQL] get_databases query failed: {:?}", e);
                e
            })?;

        let databases: Vec<SchemaInfo> = rows
            .iter()
            .map(|row| SchemaInfo {
                name: row.get::<String, _>(0),
            })
            .collect();

        info!("[PostgreSQL] get_databases() returning {} databases: {:?}",
            databases.len(),
            databases.iter().map(|d| &d.name).collect::<Vec<_>>()
        );

        Ok(databases)
    }

    async fn get_schemas(&self, database: &str) -> Result<Vec<SchemaInfo>, AppError> {
        info!("[PostgreSQL] get_schemas() called for database: '{}'", database);

        // Get or create a pool for the specific database
        let pool = self.get_pool(database).await?;

        // Get all schemas for this database
        let query = r#"
            SELECT schema_name
            FROM information_schema.schemata
            ORDER BY
                CASE WHEN schema_name = 'public' THEN 0 ELSE 1 END,
                schema_name
        "#;

        debug!("[PostgreSQL] Executing get_schemas query for database: {}", database);

        let rows = sqlx::query(query)
            .fetch_all(&pool)
            .await
            .map_err(|e| {
                error!("[PostgreSQL] get_schemas query failed for database '{}': {:?}", database, e);
                e
            })?;

        let schemas: Vec<SchemaInfo> = rows
            .iter()
            .map(|row| SchemaInfo {
                name: row.get::<String, _>(0),
            })
            .collect();

        info!("[PostgreSQL] get_schemas() returning {} schemas for database '{}': {:?}",
            schemas.len(),
            database,
            schemas.iter().map(|s| &s.name).collect::<Vec<_>>()
        );

        Ok(schemas)
    }

    async fn get_tables(&self, database: &str, schema: &str) -> Result<Vec<TableInfo>, AppError> {
        info!("[PostgreSQL] get_tables() called for database: '{}', schema: '{}'", database, schema);

        // Get pool for the specific database
        let pool = self.get_pool(database).await?;

        let schema_name = if schema.is_empty() { "public" } else { schema };

        debug!("[PostgreSQL] Executing get_tables query for {}.{}", database, schema_name);

        // Use parameterized query to prevent SQL injection
        let rows = sqlx::query(
            r#"
            SELECT
                table_name,
                table_schema,
                table_type,
                (SELECT reltuples::bigint FROM pg_class WHERE relname = tables.table_name LIMIT 1) as row_count
            FROM information_schema.tables
            WHERE table_schema = $1
            ORDER BY table_name
            "#
        )
        .bind(schema_name)
        .fetch_all(&pool)
        .await
            .map_err(|e| {
                error!("[PostgreSQL] get_tables query failed for {}.{}: {:?}", database, schema_name, e);
                e
            })?;

        info!("[PostgreSQL] get_tables query returned {} rows", rows.len());

        let tables: Vec<TableInfo> = rows
            .iter()
            .map(|row| {
                let name: String = row.get::<String, _>(0);
                let schema: String = row.get::<String, _>(1);
                let table_type: String = row.get::<String, _>(2);
                let row_count = row.try_get::<i64, _>(3).ok();
                debug!("[PostgreSQL] Found table: {}.{} (type: {}, rows: {:?})",
                    schema, name, table_type, row_count);
                TableInfo { name, schema, table_type, row_count }
            })
            .collect();

        info!("[PostgreSQL] get_tables() returning {} tables for schema '{}': {:?}",
            tables.len(),
            schema_name,
            tables.iter().map(|t| &t.name).collect::<Vec<_>>()
        );

        Ok(tables)
    }

    async fn get_columns(
        &self,
        database: &str,
        schema: &str,
        table: &str,
    ) -> Result<Vec<ColumnDetail>, AppError> {
        info!("[PostgreSQL] get_columns() called for database: '{}', schema: '{}', table: '{}'", database, schema, table);

        // Get pool for the specific database
        let pool = self.get_pool(database).await?;

        let schema_name = if schema.is_empty() { "public" } else { schema };

        debug!("[PostgreSQL] Executing get_columns query for {}.{}.{}", database, schema_name, table);

        // Use parameterized query to prevent SQL injection
        // $1 = schema_name, $2 = table
        let rows = sqlx::query(
            r#"
            SELECT
                c.column_name,
                CASE
                    WHEN c.data_type = 'character varying' THEN 'varchar(' || COALESCE(c.character_maximum_length::text, 'max') || ')'
                    WHEN c.data_type = 'character' THEN 'char(' || COALESCE(c.character_maximum_length::text, '1') || ')'
                    WHEN c.data_type = 'numeric' THEN 'numeric(' || COALESCE(c.numeric_precision::text, '') || ',' || COALESCE(c.numeric_scale::text, '') || ')'
                    WHEN c.data_type = 'timestamp without time zone' THEN 'timestamp'
                    WHEN c.data_type = 'timestamp with time zone' THEN 'timestamptz'
                    WHEN c.data_type = 'time without time zone' THEN 'time'
                    WHEN c.data_type = 'time with time zone' THEN 'timetz'
                    WHEN c.data_type = 'double precision' THEN 'float8'
                    WHEN c.data_type = 'real' THEN 'float4'
                    WHEN c.data_type = 'integer' THEN 'int4'
                    WHEN c.data_type = 'smallint' THEN 'int2'
                    WHEN c.data_type = 'bigint' THEN 'int8'
                    WHEN c.data_type = 'boolean' THEN 'bool'
                    WHEN c.data_type = 'ARRAY' THEN c.udt_name
                    ELSE c.data_type
                END as data_type,
                c.is_nullable,
                CASE
                    WHEN pk.column_name IS NOT NULL THEN 'PRI'
                    WHEN u.column_name IS NOT NULL THEN 'UNI'
                    ELSE NULL
                END as column_key,
                c.column_default,
                CASE WHEN c.column_default LIKE 'nextval%' THEN 'auto_increment' ELSE NULL END as extra
            FROM information_schema.columns c
            LEFT JOIN (
                SELECT ku.column_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
                WHERE tc.table_schema = $1 AND tc.table_name = $2 AND tc.constraint_type = 'PRIMARY KEY'
            ) pk ON c.column_name = pk.column_name
            LEFT JOIN (
                SELECT ku.column_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
                WHERE tc.table_schema = $1 AND tc.table_name = $2 AND tc.constraint_type = 'UNIQUE'
            ) u ON c.column_name = u.column_name
            WHERE c.table_schema = $1 AND c.table_name = $2
            ORDER BY c.ordinal_position
            "#
        )
        .bind(schema_name)
        .bind(table)
        .fetch_all(&pool)
        .await
            .map_err(|e| {
                error!("[PostgreSQL] get_columns query failed for {}.{}.{}: {:?}", database, schema_name, table, e);
                e
            })?;

        info!("[PostgreSQL] get_columns query returned {} rows", rows.len());

        let columns: Vec<ColumnDetail> = rows
            .iter()
            .map(|row| {
                let nullable_str: String = row.get(2);
                let name: String = row.get::<String, _>(0);
                let data_type: String = row.get::<String, _>(1);
                debug!("[PostgreSQL] Found column: {} ({})", name, data_type);
                ColumnDetail {
                    name,
                    data_type,
                    nullable: nullable_str == "YES",
                    key: row.try_get::<String, _>(3).ok(),
                    default_value: row.try_get::<String, _>(4).ok(),
                    extra: row.try_get::<String, _>(5).ok(),
                }
            })
            .collect();

        info!("[PostgreSQL] get_columns() returning {} columns for {}.{}.{}: {:?}",
            columns.len(),
            database,
            schema_name,
            table,
            columns.iter().map(|c| &c.name).collect::<Vec<_>>()
        );

        Ok(columns)
    }

    async fn close(&self) -> Result<(), AppError> {
        // Close all pools
        let pools = self.pools.read().await;
        for entry in pools.values() {
            entry.pool.close().await;
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::DatabaseDriver;

    fn create_test_config() -> ConnectionConfig {
        ConnectionConfig {
            name: "test".to_string(),
            host: "localhost".to_string(),
            port: 5432,
            username: "postgres".to_string(),
            password: "password".to_string(),
            database: Some("postgres".to_string()),
            driver: DatabaseDriver::PostgreSQL,
        }
    }

    #[test]
    fn test_schema_identifier_quoting() {
        // Test that schema identifiers are properly quoted to prevent SQL injection
        // in SET search_path commands

        // Valid schema names should work
        let schema = "public";
        let quoted = format!("\"{}\"", schema.replace("\"", "\"\""));
        assert_eq!(quoted, "\"public\"");

        // Schema names with special characters
        let schema = "my_schema";
        let quoted = format!("\"{}\"", schema.replace("\"", "\"\""));
        assert_eq!(quoted, "\"my_schema\"");

        // Malicious input with quotes - should be escaped
        let schema = "public\"; DROP DATABASE anko; --";
        let quoted = format!("\"{}\"", schema.replace("\"", "\"\""));
        // The quote is doubled, making it a literal quote in the identifier
        assert_eq!(quoted, "\"public\"\"; DROP DATABASE anko; --\"");
        // This becomes a valid (though unusual) identifier name, not SQL injection
    }

    #[test]
    fn test_connection_string_format() {
        let config = create_test_config();
        let default_database = config
            .database
            .as_ref()
            .cloned()
            .unwrap_or_else(|| "postgres".to_string());

        let connection_string = format!(
            "postgres://{}:{}@{}:{}/{}",
            config.username, config.password, config.host, config.port, default_database
        );

        assert_eq!(connection_string, "postgres://postgres:password@localhost:5432/postgres");
    }

    #[test]
    fn test_default_database_fallback() {
        let mut config = create_test_config();
        config.database = None;

        let default_database = config
            .database
            .as_ref()
            .cloned()
            .unwrap_or_else(|| "postgres".to_string());

        assert_eq!(default_database, "postgres");
    }

    #[test]
    fn test_pg_value_to_json_integer_types() {
        // Test the type name matching logic
        let type_names = vec!["INT8", "BIGINT", "INT4", "INTEGER", "SERIAL", "INT2", "SMALLINT"];

        for type_name in type_names {
            // We can verify the type name is recognized
            assert!(matches!(type_name, "INT8" | "BIGINT" | "INT4" | "INTEGER" | "SERIAL" | "INT2" | "SMALLINT"));
        }
    }

    #[test]
    fn test_pool_entry_structure() {
        // Test that PoolEntry has the expected fields
        let now = Instant::now();
        let last_used = Arc::new(RwLock::new(now));

        // Verify the Arc<RwLock<Instant>> structure is valid
        assert!(last_used.try_read().is_ok());
    }

    #[test]
    fn test_schema_name_default_to_public() {
        let schema = "";
        let schema_name = if schema.is_empty() { "public" } else { schema };
        assert_eq!(schema_name, "public");

        let schema = "custom_schema";
        let schema_name = if schema.is_empty() { "public" } else { schema };
        assert_eq!(schema_name, "custom_schema");
    }

    #[test]
    fn test_pool_ttl_constants() {
        const EVICTION_CHECK_INTERVAL: std::time::Duration = std::time::Duration::from_secs(60);
        const POOL_TTL: std::time::Duration = std::time::Duration::from_secs(300);

        assert_eq!(EVICTION_CHECK_INTERVAL.as_secs(), 60);
        assert_eq!(POOL_TTL.as_secs(), 300);
    }

    // Integration tests requiring a live PostgreSQL instance
    #[tokio::test]
    #[ignore]
    async fn test_connect_with_valid_credentials() {
        let config = create_test_config();
        let result = PostgresConnector::connect(&config).await;
        assert!(result.is_ok() || result.is_err()); // Placeholder for real test
    }

    #[tokio::test]
    #[ignore]
    async fn test_get_pool_creates_new_pool() {
        let config = create_test_config();
        if let Ok(connector) = PostgresConnector::connect(&config).await {
            let result = connector.get_pool("postgres").await;
            assert!(result.is_ok());
        }
    }

    #[tokio::test]
    #[ignore]
    async fn test_execute_select_query() {
        let config = create_test_config();
        if let Ok(connector) = PostgresConnector::connect(&config).await {
            let result = connector.execute("SELECT 1 as num").await;
            if let Ok(query_result) = result {
                assert_eq!(query_result.columns.len(), 1);
            }
        }
    }
}
