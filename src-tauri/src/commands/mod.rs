//! Tauri command handlers exposed to the frontend! 🚀✨
//!
//! This module contains all Tauri commands that the React frontend can invoke.
//! Each command is async and automatically serializes results to JSON~ The
//! frontend uses these to manage connections, execute queries, and browse schemas! 💪
//!
//! Command categories:
//! - `connection`: Connect, disconnect, test connections
//! - `query`: Execute SQL queries with context
//! - `schema`: Browse databases, schemas, tables, and columns
//! - `storage`: Save/load connections and manage workspaces

pub mod connection;
pub mod query;
pub mod schema;
pub mod storage;

pub use connection::*;
pub use query::*;
pub use schema::*;
pub use storage::*;
