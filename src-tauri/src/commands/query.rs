use tauri::State;

use crate::db::connector::QueryResult;
use crate::error::AppError;
use crate::state::AppState;

#[tauri::command]
pub async fn execute_query(
    state: State<'_, AppState>,
    connection_id: String,
    query: String,
    database: Option<String>,
    context: Option<String>,
) -> Result<QueryResult, AppError> {
    let connector = state.get_connection(&connection_id).await?;
    connector
        .execute_with_context(&query, database.as_deref(), context.as_deref())
        .await
}
