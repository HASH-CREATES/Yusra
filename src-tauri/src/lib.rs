pub mod persona;
pub mod memory;
pub mod engine;
pub mod danger;
pub mod agent;
pub mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::ask_yusra_command,
            commands::execute_command_command,
            commands::init_model_command,
            commands::download_model_command,
            commands::store_memory_command,
            commands::search_memory_command,
            commands::get_device_specs_command,
            commands::set_entity_command,
            commands::get_entity_command,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
