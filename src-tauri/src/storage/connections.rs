//! Persistent storage for database connections! 💾✨
//!
//! This module provides CRUD operations for saving database connections
//! to local SQLite storage with encrypted passwords. Your connections are
//! saved between app sessions - super convenient! 🌟
//!
//! All passwords are encrypted using the Encryptor module before storage,
//! so they're safe even if someone gets access to the database file~ 🔐💪

use serde::{Deserialize, Serialize};
use sqlx::{sqlite::SqlitePoolOptions, Pool, Row, Sqlite};
use uuid::Uuid;

use crate::db::connector::{ConnectionConfig, DatabaseDriver};
use crate::error::AppError;
use crate::storage::encryption::Encryptor;

/// A saved database connection with encrypted password! 🌸💾
///
/// This represents a connection configuration stored in local SQLite.
/// The password is encrypted and never exposed in serialized form
/// (notice the `skip_serializing` on encrypted_password)~ 🔐
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SavedConnection {
    /// Unique identifier (UUID)
    pub id: String,
    /// User-friendly connection name
    pub name: String,
    /// Database server hostname or IP
    pub host: String,
    /// Database server port
    pub port: u16,
    /// Database username
    pub username: String,
    /// Optional default database name
    pub database: Option<String>,
    /// Database type (MySQL or PostgreSQL)
    pub driver: DatabaseDriver,
    /// Encrypted password (never serialized to frontend!)
    #[serde(skip_serializing)]
    pub encrypted_password: Vec<u8>,
}

impl SavedConnection {
    /// Convert to ConnectionConfig by providing the decrypted password! ✨
    ///
    /// This creates a usable ConnectionConfig from a SavedConnection.
    /// You need to decrypt the password first using ConnectionStorage~
    ///
    /// # Arguments
    /// * `password` - The decrypted plaintext password
    ///
    /// # Returns
    /// A ConnectionConfig ready to create a database connection! 🚀
    pub fn to_config(&self, password: String) -> ConnectionConfig {
        ConnectionConfig {
            name: self.name.clone(),
            host: self.host.clone(),
            port: self.port,
            username: self.username.clone(),
            password,
            database: self.database.clone(),
            driver: self.driver,
        }
    }
}

/// SQLite storage for saved connections with encryption! 💾🔐
///
/// Manages persistent storage of database connections in a local SQLite file.
/// All passwords are encrypted before storage using AES-256-GCM~ The database
/// is created automatically in the app data directory! ✨💪
pub struct ConnectionStorage {
    /// SQLite connection pool
    pool: Pool<Sqlite>,
    /// Password encryptor (handles AES-256-GCM encryption)
    encryptor: Encryptor,
}

impl ConnectionStorage {
    /// Create new ConnectionStorage and initialize the database schema! 🌟
    ///
    /// Creates the SQLite database file if it doesn't exist and sets up
    /// the connections table. The database is stored in your app's data
    /// directory for persistence across restarts~ 💪
    ///
    /// # Arguments
    /// * `app_data_dir` - Path to app data directory (from Tauri)
    ///
    /// # Returns
    /// A ready-to-use ConnectionStorage instance! ✨
    ///
    /// # Errors
    /// Returns `AppError` if database creation or schema initialization fails
    pub async fn new(app_data_dir: &std::path::Path) -> Result<Self, AppError> {
        std::fs::create_dir_all(app_data_dir)?;

        let db_path = app_data_dir.join("connections.db");
        let connection_string = format!("sqlite:{}?mode=rwc", db_path.display());

        let pool = SqlitePoolOptions::new()
            .max_connections(5)
            .connect(&connection_string)
            .await?;

        let storage = Self {
            pool,
            encryptor: Encryptor::new()?,
        };

        storage.initialize_schema().await?;

        Ok(storage)
    }

    pub fn get_pool(&self) -> Pool<Sqlite> {
        self.pool.clone()
    }

    async fn initialize_schema(&self) -> Result<(), AppError> {
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS connections (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                host TEXT NOT NULL,
                port INTEGER NOT NULL,
                username TEXT NOT NULL,
                encrypted_password BLOB NOT NULL,
                database TEXT,
                driver TEXT NOT NULL DEFAULT 'mysql',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn save(&self, config: &ConnectionConfig) -> Result<SavedConnection, AppError> {
        let id = Uuid::new_v4().to_string();
        let encrypted_password = self.encryptor.encrypt(&config.password)?;
        let driver_str = match config.driver {
            DatabaseDriver::MySQL => "mysql",
            DatabaseDriver::PostgreSQL => "postgresql",
        };

        sqlx::query(
            r#"
            INSERT INTO connections (id, name, host, port, username, encrypted_password, database, driver)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&id)
        .bind(&config.name)
        .bind(&config.host)
        .bind(config.port as i32)
        .bind(&config.username)
        .bind(&encrypted_password)
        .bind(&config.database)
        .bind(driver_str)
        .execute(&self.pool)
        .await?;

        Ok(SavedConnection {
            id,
            name: config.name.clone(),
            host: config.host.clone(),
            port: config.port,
            username: config.username.clone(),
            database: config.database.clone(),
            driver: config.driver,
            encrypted_password,
        })
    }

    pub async fn update(&self, id: &str, config: &ConnectionConfig) -> Result<(), AppError> {
        let encrypted_password = self.encryptor.encrypt(&config.password)?;
        let driver_str = match config.driver {
            DatabaseDriver::MySQL => "mysql",
            DatabaseDriver::PostgreSQL => "postgresql",
        };

        sqlx::query(
            r#"
            UPDATE connections
            SET name = ?, host = ?, port = ?, username = ?, encrypted_password = ?, database = ?, driver = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            "#,
        )
        .bind(&config.name)
        .bind(&config.host)
        .bind(config.port as i32)
        .bind(&config.username)
        .bind(&encrypted_password)
        .bind(&config.database)
        .bind(driver_str)
        .bind(id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn list(&self) -> Result<Vec<SavedConnection>, AppError> {
        let rows = sqlx::query(
            r#"
            SELECT id, name, host, port, username, encrypted_password, database, driver
            FROM connections
            ORDER BY name
            "#,
        )
        .fetch_all(&self.pool)
        .await?;

        let connections = rows
            .iter()
            .map(|row| {
                let driver_str: String = row.get(7);
                let driver = match driver_str.as_str() {
                    "mysql" => DatabaseDriver::MySQL,
                    "postgresql" => DatabaseDriver::PostgreSQL,
                    _ => DatabaseDriver::MySQL,
                };

                SavedConnection {
                    id: row.get(0),
                    name: row.get(1),
                    host: row.get(2),
                    port: row.get::<i32, _>(3) as u16,
                    username: row.get(4),
                    encrypted_password: row.get(5),
                    database: row.get(6),
                    driver,
                }
            })
            .collect();

        Ok(connections)
    }

    pub async fn get(&self, id: &str) -> Result<Option<SavedConnection>, AppError> {
        let row = sqlx::query(
            r#"
            SELECT id, name, host, port, username, encrypted_password, database, driver
            FROM connections
            WHERE id = ?
            "#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.map(|row| {
            let driver_str: String = row.get(7);
            let driver = match driver_str.as_str() {
                "mysql" => DatabaseDriver::MySQL,
                "postgresql" => DatabaseDriver::PostgreSQL,
                _ => DatabaseDriver::MySQL,
            };

            SavedConnection {
                id: row.get(0),
                name: row.get(1),
                host: row.get(2),
                port: row.get::<i32, _>(3) as u16,
                username: row.get(4),
                encrypted_password: row.get(5),
                database: row.get(6),
                driver,
            }
        }))
    }

    pub async fn delete(&self, id: &str) -> Result<(), AppError> {
        sqlx::query("DELETE FROM connections WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    pub fn decrypt_password(&self, encrypted: &[u8]) -> Result<String, AppError> {
        self.encryptor.decrypt(encrypted)
    }

    pub async fn clear_all(&self) -> Result<(), AppError> {
        sqlx::query("DELETE FROM connections")
            .execute(&self.pool)
            .await?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[tokio::test]
    async fn test_connection_storage_creation() {
        let temp_dir = tempdir().unwrap();
        let result = ConnectionStorage::new(temp_dir.path()).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_save_and_get_connection() {
        let temp_dir = tempdir().unwrap();
        let storage = ConnectionStorage::new(temp_dir.path()).await.unwrap();

        let config = ConnectionConfig {
            name: "Test Connection".to_string(),
            host: "localhost".to_string(),
            port: 3306,
            username: "testuser".to_string(),
            password: "testpass".to_string(),
            database: Some("testdb".to_string()),
            driver: DatabaseDriver::MySQL,
        };

        // Save connection
        let saved = storage.save(&config).await.unwrap();
        assert_eq!(saved.name, "Test Connection");
        assert_eq!(saved.host, "localhost");
        assert_eq!(saved.port, 3306);

        // Retrieve connection
        let retrieved = storage.get(&saved.id).await.unwrap();
        assert!(retrieved.is_some());
        let retrieved = retrieved.unwrap();
        assert_eq!(retrieved.id, saved.id);
        assert_eq!(retrieved.name, "Test Connection");
        assert_eq!(retrieved.username, "testuser");
    }

    #[tokio::test]
    async fn test_list_connections() {
        let temp_dir = tempdir().unwrap();
        let storage = ConnectionStorage::new(temp_dir.path()).await.unwrap();

        // Initially empty
        let connections = storage.list().await.unwrap();
        assert_eq!(connections.len(), 0);

        // Add connections
        let config1 = ConnectionConfig {
            name: "Connection 1".to_string(),
            host: "host1".to_string(),
            port: 3306,
            username: "user1".to_string(),
            password: "pass1".to_string(),
            database: None,
            driver: DatabaseDriver::MySQL,
        };

        let config2 = ConnectionConfig {
            name: "Connection 2".to_string(),
            host: "host2".to_string(),
            port: 5432,
            username: "user2".to_string(),
            password: "pass2".to_string(),
            database: Some("db2".to_string()),
            driver: DatabaseDriver::PostgreSQL,
        };

        storage.save(&config1).await.unwrap();
        storage.save(&config2).await.unwrap();

        let connections = storage.list().await.unwrap();
        assert_eq!(connections.len(), 2);
    }

    #[tokio::test]
    async fn test_update_connection() {
        let temp_dir = tempdir().unwrap();
        let storage = ConnectionStorage::new(temp_dir.path()).await.unwrap();

        let config = ConnectionConfig {
            name: "Original".to_string(),
            host: "localhost".to_string(),
            port: 3306,
            username: "user".to_string(),
            password: "pass".to_string(),
            database: None,
            driver: DatabaseDriver::MySQL,
        };

        let saved = storage.save(&config).await.unwrap();

        // Update
        let updated_config = ConnectionConfig {
            name: "Updated".to_string(),
            host: "newhost".to_string(),
            port: 3307,
            username: "newuser".to_string(),
            password: "newpass".to_string(),
            database: Some("newdb".to_string()),
            driver: DatabaseDriver::PostgreSQL,
        };

        storage.update(&saved.id, &updated_config).await.unwrap();

        // Verify update
        let retrieved = storage.get(&saved.id).await.unwrap().unwrap();
        assert_eq!(retrieved.name, "Updated");
        assert_eq!(retrieved.host, "newhost");
        assert_eq!(retrieved.port, 3307);
        assert_eq!(retrieved.driver, DatabaseDriver::PostgreSQL);
    }

    #[tokio::test]
    async fn test_delete_connection() {
        let temp_dir = tempdir().unwrap();
        let storage = ConnectionStorage::new(temp_dir.path()).await.unwrap();

        let config = ConnectionConfig {
            name: "To Delete".to_string(),
            host: "localhost".to_string(),
            port: 3306,
            username: "user".to_string(),
            password: "pass".to_string(),
            database: None,
            driver: DatabaseDriver::MySQL,
        };

        let saved = storage.save(&config).await.unwrap();

        // Verify exists
        assert!(storage.get(&saved.id).await.unwrap().is_some());

        // Delete
        storage.delete(&saved.id).await.unwrap();

        // Verify deleted
        assert!(storage.get(&saved.id).await.unwrap().is_none());
    }

    #[tokio::test]
    async fn test_password_encryption() {
        let temp_dir = tempdir().unwrap();
        let storage = ConnectionStorage::new(temp_dir.path()).await.unwrap();

        let config = ConnectionConfig {
            name: "Test".to_string(),
            host: "localhost".to_string(),
            port: 3306,
            username: "user".to_string(),
            password: "my_secret_password".to_string(),
            database: None,
            driver: DatabaseDriver::MySQL,
        };

        let saved = storage.save(&config).await.unwrap();

        // Verify password is encrypted (not plain text)
        assert_ne!(saved.encrypted_password, b"my_secret_password");
        assert!(!saved.encrypted_password.is_empty());

        // Verify decryption works
        let decrypted = storage.decrypt_password(&saved.encrypted_password).unwrap();
        assert_eq!(decrypted, "my_secret_password");
    }

    #[tokio::test]
    async fn test_clear_all_connections() {
        let temp_dir = tempdir().unwrap();
        let storage = ConnectionStorage::new(temp_dir.path()).await.unwrap();

        // Add multiple connections
        for i in 0..3 {
            let config = ConnectionConfig {
                name: format!("Connection {}", i),
                host: "localhost".to_string(),
                port: 3306,
                username: "user".to_string(),
                password: "pass".to_string(),
                database: None,
                driver: DatabaseDriver::MySQL,
            };
            storage.save(&config).await.unwrap();
        }

        // Verify connections exist
        assert_eq!(storage.list().await.unwrap().len(), 3);

        // Clear all
        storage.clear_all().await.unwrap();

        // Verify all cleared
        assert_eq!(storage.list().await.unwrap().len(), 0);
    }
}
