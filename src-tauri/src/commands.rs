use crate::persona::Persona;
use crate::danger::CommandResult;
use crate::{memory, engine, danger, agent};
use sysinfo::System;
use tauri::Manager;

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
pub async fn download_model_command(app: tauri::AppHandle, url: String) -> Result<String, String> {
    let model_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("models");
    std::fs::create_dir_all(&model_dir).map_err(|e| e.to_string())?;

    let filename = url.rsplit('/').next().unwrap_or("model.gguf");
    let dest = model_dir.join(filename);

    let client = reqwest::Client::new();
    let resp = client.get(&url).send().await.map_err(|e| e.to_string())?;
    let total_size = resp.content_length().unwrap_or(0);

    let mut file = std::fs::File::create(&dest).map_err(|e| e.to_string())?;
    let mut downloaded: u64 = 0;
    let mut stream = resp.bytes_stream();

    use futures_util::StreamExt;
    use std::io::Write;

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| e.to_string())?;
        file.write_all(&chunk).map_err(|e| e.to_string())?;
        downloaded += chunk.len() as u64;
        let _progress = if total_size > 0 {
            (downloaded as f64 / total_size as f64 * 100.0) as u32
        } else {
            0
        };
    }

    file.flush().map_err(|e| e.to_string())?;
    Ok(dest.to_string_lossy().to_string())
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
