//! Persistent storage for Anko! 💾✨
//!
//! This module handles all local data persistence using SQLite.
//! Manages saved connections, workspaces, and password encryption~
//! All passwords are encrypted before storage using AES-256-GCM! 🔐💪
//!
//! Key modules:
//! - `connections`: CRUD operations for saved database connections
//! - `encryption`: AES-256-GCM password encryption with OS keychain integration
//! - `workspaces`: Groups of connections for organization
//! - `query_history`: Query execution history tracking

pub mod connections;
pub mod encryption;
pub mod query_history;
pub mod workspaces;

pub use connections::*;
pub use query_history::*;
pub use workspaces::*;
