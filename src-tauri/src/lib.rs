// src-tauri/src/lib.rs
use tauri::Manager;

#[tauri::command]
fn run_command(command: String) -> String {
    let output = std::process::Command::new("cmd.exe")
        .args(&["/c", &command])
        .output()
        .expect("failed to execute process");
    
    String::from_utf8_lossy(&output.stdout)
}