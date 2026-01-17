mod commands;
mod db;
mod error;
mod state;
mod storage;

use state::AppState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(AppState::new())
        .setup(|app| {
            // Initialize storage with app data directory
            let app_handle = app.handle().clone();
            let app_data_dir = app_handle
                .path()
                .app_data_dir()
                .expect("Failed to get app data directory");

            let state = app.state::<AppState>();
            tauri::async_runtime::block_on(async {
                state
                    .initialize_storage(&app_data_dir)
                    .await
                    .expect("Failed to initialize storage");
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Connection commands
            commands::connect,
            commands::disconnect,
            commands::test_connection,
            // Query commands
            commands::execute_query,
            // Schema commands
            commands::get_databases,
            commands::get_schemas,
            commands::get_tables,
            commands::get_columns,
            // Storage commands - Connections
            commands::save_connection,
            commands::update_connection,
            commands::list_connections,
            commands::delete_connection,
            commands::get_connection_config,
            // Storage commands - Workspaces
            commands::list_workspaces,
            commands::create_workspace,
            commands::update_workspace,
            commands::delete_workspace,
            commands::add_connection_to_workspace,
            commands::remove_connection_from_workspace,
            commands::move_connection_between_workspaces,
            // Dev tools commands
            commands::clear_all_data,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
