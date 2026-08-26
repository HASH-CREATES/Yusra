use crate::persona::Persona;
use crate::danger::CommandResult;
use crate::{memory, engine, danger, agent};
use sysinfo::System;

#[tauri::command]
pub fn ask_yusra_command(prompt: String) -> String {
    agent::ask_yusra(prompt, Persona::Yusra)
}

#[tauri::command]
pub fn execute_command_command(cmd: String) -> CommandResult {
    danger::execute_command(&cmd)
}

#[tauri::command]
pub fn init_model_command(model_path: String, tokenizer_path: String) -> bool {
    engine::init_model(model_path, tokenizer_path)
}

#[tauri::command]
pub fn store_memory_command(prompt: String, response: String) -> bool {
    memory::store_memory(prompt, response)
}

#[tauri::command]
pub fn search_memory_command(query: String) -> String {
    memory::search_memory(query)
}

#[tauri::command]
pub fn get_device_specs_command() -> String {
    let mut sys = System::new_all();
    sys.refresh_all();

    let total_mem = sys.total_memory() / (1024 * 1024 * 1024);
    let cpu_count = sys.cpus().len();
    let cpu_name = sys.cpus().first().map(|c| c.brand()).unwrap_or("Unknown");

    serde_json::to_string(&serde_json::json!({
        "os": std::env::consts::OS,
        "arch": std::env::consts::ARCH,
        "total_ram_gb": total_mem,
        "cpu_cores": cpu_count,
        "cpu_name": cpu_name,
    })).unwrap_or_default()
}

#[tauri::command]
pub fn set_entity_command(key: String, value: String) -> bool {
    memory::set_entity(key, value)
}

#[tauri::command]
pub fn get_entity_command(key: String) -> String {
    memory::get_entity(key)
}
