use rusqlite::{params, Connection, Result as SqlResult};
use once_cell::sync::OnceCell;
use std::sync::Mutex;
use std::path::PathBuf;

static DB: OnceCell<Mutex<Connection>> = OnceCell::new();

fn get_db_path() -> PathBuf {
    let appdata = std::env::var("APPDATA").unwrap_or_else(|_| ".".to_string());
    let dir = PathBuf::from(appdata).join("Yusra");
    std::fs::create_dir_all(&dir).ok();
    dir.join("memory.db")
}

fn get_conn() -> &'static Mutex<Connection> {
    DB.get_or_init(|| {
        let path = get_db_path();
        let conn = Connection::open(path).expect("Failed to open SQLite database");
        init_tables(&conn).expect("Failed to initialize tables");
        Mutex::new(conn)
    })
}

fn init_tables(conn: &Connection) -> SqlResult<()> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS episodic_memory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            prompt TEXT NOT NULL,
            response TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            links_json TEXT DEFAULT '[]'
        );
        CREATE TABLE IF NOT EXISTS entity_state (
            key TEXT PRIMARY KEY,
            value_json TEXT NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS downloaded_models (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            model_name TEXT NOT NULL UNIQUE,
            local_path TEXT NOT NULL,
            is_active BOOLEAN DEFAULT FALSE,
            size_bytes INTEGER NOT NULL
        );"
    )?;
    Ok(())
}

pub fn store_memory(prompt: String, response: String) -> bool {
    let conn = get_conn().lock().unwrap();
    conn.execute(
        "INSERT INTO episodic_memory (prompt, response) VALUES (?1, ?2)",
        params![prompt, response],
    ).is_ok()
}

pub fn search_memory(query: String) -> String {
    let conn = get_conn().lock().unwrap();
    let search_pattern = format!("%{}%", query);
    let mut stmt = match conn.prepare(
        "SELECT id, prompt, response, timestamp FROM episodic_memory WHERE prompt LIKE ?1 OR response LIKE ?1 ORDER BY timestamp DESC LIMIT 10"
    ) {
        Ok(s) => s,
        Err(_) => return "[]".to_string(),
    };
    let results: Vec<String> = stmt.query_map(params![search_pattern], |row| {
        let id: i64 = row.get(0)?;
        let prompt: String = row.get(1)?;
        let response: String = row.get(2)?;
        let timestamp: String = row.get(3)?;
        Ok(format!("{{\"id\":{},\"prompt\":\"{}\",\"response\":\"{}\",\"timestamp\":\"{}\"}}", id, prompt.replace('"', "\\\""), response.replace('"', "\\\""), timestamp))
    })
    .unwrap()
    .filter_map(|r| r.ok())
    .collect();
    format!("[{}]", results.join(","))
}

pub fn set_entity(key: String, value: String) -> bool {
    let conn = get_conn().lock().unwrap();
    conn.execute(
        "INSERT OR REPLACE INTO entity_state (key, value_json, updated_at) VALUES (?1, ?2, datetime('now'))",
        params![key, value],
    ).is_ok()
}

pub fn get_entity(key: String) -> String {
    let conn = get_conn().lock().unwrap();
    let mut stmt = match conn.prepare("SELECT value_json FROM entity_state WHERE key = ?1") {
        Ok(s) => s,
        Err(_) => return "".to_string(),
    };
    stmt.query_row(params![key], |row| row.get::<_, String>(0))
        .unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_store_and_search_memory() {
        let stored = store_memory("test prompt".to_string(), "test response".to_string());
        assert!(stored);
        let results = search_memory("test".to_string());
        assert!(results.contains("test prompt"));
    }

    #[test]
    fn test_entity_state() {
        set_entity("test_key".to_string(), "\"test_value\"".to_string());
        let val = get_entity("test_key".to_string());
        assert!(val.contains("test_value"));
    }
}
