mod agent;
mod exec;
mod memory;
mod profiler;

#[tauri::command]
fn ask_yusra_command(prompt: String) -> String {
    agent::ask_yusra(prompt)
}

#[tauri::command]
fn execute_command_command(cmd: String) -> exec::CommandResult {
    exec::execute_command(cmd)
}

#[tauri::command]
fn get_device_specs_command() -> String {
    profiler::get_device_specs()
}

#[tauri::command]
fn store_memory_command(prompt: String, response: String) -> bool {
    memory::store_memory(prompt, response)
}

#[tauri::command]
fn search_memory_command(query: String) -> String {
    memory::search_memory(query)
}

#[tauri::command]
fn set_entity_command(key: String, value_json: String) -> bool {
    memory::set_entity(key, value_json)
}

#[tauri::command]
fn get_entity_command(key: String) -> String {
    memory::get_entity(key)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            ask_yusra_command,
            execute_command_command,
            get_device_specs_command,
            store_memory_command,
            search_memory_command,
            set_entity_command,
            get_entity_command
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
