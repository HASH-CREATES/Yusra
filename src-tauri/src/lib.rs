mod agent;
mod exec;
mod memory;
mod profiler;
mod tasks;

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

// Tasks — re-runnable, harness-driven
#[tauri::command]
fn create_task_command(title: String, prompt: String) -> String {
    tasks::create_task(title, prompt)
}
#[tauri::command]
fn list_tasks_command() -> String {
    tasks::list_tasks()
}
#[tauri::command]
fn run_task_command(id: i64) -> String {
    tasks::run_task(id)
}
#[tauri::command]
fn delete_task_command(id: i64) -> String {
    tasks::delete_task(id)
}
#[tauri::command]
fn toggle_favorite_task_command(id: i64) -> String {
    tasks::toggle_favorite(id)
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
            get_entity_command,
            create_task_command,
            list_tasks_command,
            run_task_command,
            delete_task_command,
            toggle_favorite_task_command
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
