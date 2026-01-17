//! Database connector abstraction layer! ✨🌸
//!
//! This module provides the unified interface for connecting to different database systems~
//! Whether you're team MySQL or team PostgreSQL, we've got you covered with our
//! powerful `DatabaseConnector` trait! 💪⚡
//!
//! The abstraction handles all the database-specific quirks so the rest of Anko
//! can work with a consistent API. Think of it as the universal translator for databases! 🎯

use async_trait::async_trait;
use serde::{Deserialize, Serialize};

use crate::error::AppError;

/// Configuration for establishing a database connection! 🚀
///
/// This struct holds all the information needed to connect to your database.
/// Passwords are stored in plain text here but will be encrypted before
/// saving to local storage - security is our top priority! 🔐✨
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionConfig {
    pub name: String,
    pub host: String,
    pub port: u16,
    pub username: String,
    pub password: String,
    pub database: Option<String>,
    pub driver: DatabaseDriver,
}

/// Which database system you want to connect to! 🎯⚡
///
/// Currently supports MySQL and PostgreSQL with more amazing databases
/// coming in the future! The architecture makes adding new drivers a breeze~ 🌟
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum DatabaseDriver {
    /// MySQL database (the classic!)
    MySQL,
    /// PostgreSQL database (the powerful one!)
    PostgreSQL,
}

impl Default for DatabaseDriver {
    fn default() -> Self {
        Self::MySQL
    }
}

/// The awesome result of executing a SQL query! 🎉✨
///
/// Contains everything you need: column information, row data, performance metrics,
/// and even debug info to help you understand what happened behind the scenes~
/// We measure execution time so you can optimize your queries like a pro! ⚡💪
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryResult {
    /// Column metadata (names, types, nullability)
    pub columns: Vec<ColumnInfo>,
    /// Row data as JSON values (super flexible!)
    pub rows: Vec<Vec<serde_json::Value>>,
    /// Number of rows affected (for INSERT/UPDATE/DELETE)
    pub affected_rows: u64,
    /// How long the query took in milliseconds (speed matters!)
    pub execution_time_ms: u64,
    /// Debug info: the original query sent from frontend
    #[serde(skip_serializing_if = "Option::is_none")]
    pub original_query: Option<String>,
    /// Debug info: the actual query executed (after adding context like USE db)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub executed_query: Option<String>,
}

/// Metadata about a column in a query result! 🌸
///
/// This gives you the essential info about each column in your result set~
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ColumnInfo {
    /// Column name (as returned by the query)
    pub name: String,
    /// Database-specific data type (varchar, int, etc.)
    pub data_type: String,
    /// Whether this column can contain NULL values
    pub nullable: bool,
}

/// Information about a database or schema! 🎯
///
/// In MySQL: represents a database
/// In PostgreSQL: can represent either a database OR a schema
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SchemaInfo {
    /// Database or schema name
    pub name: String,
}

/// Detailed information about a table! 📊✨
///
/// Includes everything you need to know about a table in the schema browser~
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TableInfo {
    /// Table name
    pub name: String,
    /// Schema/database this table belongs to
    pub schema: String,
    /// Type of table ("TABLE", "VIEW", etc.)
    pub table_type: String,
    /// Approximate row count (may be None if unavailable)
    pub row_count: Option<i64>,
}

/// Comprehensive column metadata for schema browsing! 💪🌟
///
/// This is the full version with all the juicy details about a column:
/// constraints, defaults, auto-increment status, and more~
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ColumnDetail {
    /// Column name
    pub name: String,
    /// Full data type specification
    pub data_type: String,
    /// Can this column be NULL?
    pub nullable: bool,
    /// Key type: "PRI" (primary), "UNI" (unique), "MUL" (index), etc.
    pub key: Option<String>,
    /// Default value expression
    pub default_value: Option<String>,
    /// Extra attributes (like "auto_increment")
    pub extra: Option<String>,
}

/// The magical trait that unifies all database systems! ✨🚀
///
/// This trait provides a consistent interface for working with different databases.
/// Each database driver (MySQL, PostgreSQL, etc.) implements this trait with its
/// own special behavior while maintaining a unified API~ 💪⚡
///
/// All methods are async because database operations can take time, and we don't
/// want to block your awesome application! The trait is `Send + Sync` so you can
/// safely share connections across threads - perfect for Tauri's async runtime! 🌟
#[async_trait]
pub trait DatabaseConnector: Send + Sync {
    /// Execute a raw SQL query with maximum power! ⚡💫
    ///
    /// Runs your query directly without any context switching. Perfect for
    /// queries that don't need database/schema context~
    ///
    /// # Arguments
    /// * `query` - Your SQL query string
    ///
    /// # Returns
    /// A `QueryResult` with columns, rows, and performance metrics! 🎯
    ///
    /// # Errors
    /// Returns `AppError::Database` if the query fails. Don't worry though -
    /// the error message will help you debug! You got this! 💪
    async fn execute(&self, query: &str) -> Result<QueryResult, AppError>;

    /// Execute a query with database/schema context switching! 🎯✨
    ///
    /// This is super powerful because it handles the different ways MySQL and
    /// PostgreSQL deal with databases/schemas:
    ///
    /// **MySQL behavior:**
    /// - Uses `context` parameter to execute `USE database`
    /// - `database` parameter is ignored
    /// - Switches to the database before running your query
    ///
    /// **PostgreSQL behavior:**
    /// - Uses `database` parameter to select connection pool
    /// - Uses `context` parameter to set `search_path` to schema
    /// - Creates pools on-demand for each database you access
    ///
    /// # Arguments
    /// * `query` - Your SQL query to execute
    /// * `database` - Database name (PostgreSQL only, MySQL ignores this)
    /// * `context` - Schema/database context (MySQL: database, PostgreSQL: schema)
    ///
    /// # Returns
    /// A `QueryResult` with debug info showing what was actually executed! 🌟
    async fn execute_with_context(
        &self,
        query: &str,
        database: Option<&str>,
        context: Option<&str>,
    ) -> Result<QueryResult, AppError>;

    /// Get all databases accessible to this connection! 🌸
    ///
    /// Returns a list of databases you can work with. System databases
    /// are filtered out to keep things clean and tidy~
    ///
    /// # Returns
    /// Vector of `SchemaInfo` containing database names! 💫
    async fn get_databases(&self) -> Result<Vec<SchemaInfo>, AppError>;

    /// Get all schemas within a specific database! 🎯
    ///
    /// **MySQL:** Returns empty vec (MySQL doesn't have schemas separate from databases)
    /// **PostgreSQL:** Creates a pool for the database and lists its schemas
    ///
    /// # Arguments
    /// * `database` - The database to get schemas from
    ///
    /// # Returns
    /// Vector of schema names (empty for MySQL!) ✨
    async fn get_schemas(&self, database: &str) -> Result<Vec<SchemaInfo>, AppError>;

    /// Get all tables in a database/schema! 📊💪
    ///
    /// Returns the complete list of tables and views with metadata~
    ///
    /// # Arguments
    /// * `database` - Database name
    /// * `schema` - Schema name (ignored for MySQL)
    ///
    /// # Returns
    /// Vector of `TableInfo` with names, types, and row counts! 🌟
    async fn get_tables(&self, database: &str, schema: &str) -> Result<Vec<TableInfo>, AppError>;

    /// Get detailed column information for a table! 💫🔍
    ///
    /// Retrieves everything about the table's columns: names, types,
    /// constraints, defaults, and more! Perfect for schema exploration~
    ///
    /// # Arguments
    /// * `database` - Database name
    /// * `schema` - Schema name (ignored for MySQL)
    /// * `table` - Table name
    ///
    /// # Returns
    /// Vector of `ColumnDetail` with comprehensive metadata! ✨
    async fn get_columns(&self, database: &str, schema: &str, table: &str) -> Result<Vec<ColumnDetail>, AppError>;

    /// Gracefully close the connection and clean up resources! 🌸
    ///
    /// Always call this when you're done with a connection to prevent
    /// resource leaks. We believe in clean code and tidy resources! 💝
    async fn close(&self) -> Result<(), AppError>;
}
