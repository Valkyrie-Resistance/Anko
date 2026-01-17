//! Error types for Anko with helpful messages! 💝✨
//!
//! This module defines all error types used throughout the application.
//! Every error is designed to give you clear, actionable information to
//! help you fix issues quickly~ We believe in friendly error messages! 🌟

use serde::Serialize;
use thiserror::Error;

/// All possible errors in Anko! 🎯
///
/// This enum covers every error case from database issues to validation failures.
/// Each variant provides context to help you understand what went wrong~ The error
/// messages are automatically serializable for sending to the frontend! 💪✨
#[derive(Error, Debug)]
pub enum AppError {
    /// Database operation failed! 💔
    ///
    /// Could be connection issues, query errors, or constraint violations.
    /// Check the error message for details - sqlx provides great diagnostics!
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    /// Tried to use a connection that doesn't exist! 🔍
    ///
    /// This happens when you reference a connection_id that was never created
    /// or was already closed. Make sure you're using a valid connection ID!
    #[error("Connection not found: {0}")]
    ConnectionNotFound(String),

    /// Password encryption/decryption failed! 🔐
    ///
    /// Usually means corrupted data or keychain access issues. Don't worry,
    /// your passwords are safe - we just can't access them right now!
    #[error("Encryption error: {0}")]
    Encryption(String),

    /// SQLite storage operation failed! 💾
    ///
    /// Could be file permissions, disk space, or database corruption.
    /// Check the error message for specifics!
    #[error("Storage error: {0}")]
    Storage(String),

    /// File system operation failed! 📁
    ///
    /// Problems reading/writing files or creating directories.
    /// Check permissions and available disk space!
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    /// Resource not found! 🎯
    ///
    /// Generic "not found" error for various resources.
    #[error("Not found: {0}")]
    NotFound(String),

    /// Input validation failed! ⚠️
    ///
    /// You provided invalid data (empty strings, out of range values, etc).
    /// Check the error message for what needs to be fixed!
    #[error("Validation error: {0}")]
    Validation(String),
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
