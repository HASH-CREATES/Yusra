use rusqlite::{params, Connection};
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

fn db_path() -> PathBuf {
    let mut dir = std::env::var("APPDATA")
        .map(PathBuf::from)
        .unwrap_or_else(|_| std::env::temp_dir());
    dir.push("Yusra");
    let _ = std::fs::create_dir_all(&dir);
    dir.push("memory.db");
    dir
}

fn open() -> rusqlite::Result<Connection> {
    let conn = Connection::open(db_path())?;
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS episodic_memory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            prompt TEXT NOT NULL,
            response TEXT NOT NULL,
            timestamp INTEGER NOT NULL,
            links_json TEXT NOT NULL DEFAULT '[]'
         );
         CREATE TABLE IF NOT EXISTS entity_state (
            key TEXT PRIMARY KEY,
            value_json TEXT NOT NULL
         );",
    )?;
    Ok(conn)
}

fn now() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}

pub fn store_memory(prompt: String, response: String) -> bool {
    let Ok(conn) = open() else { return false };
    conn.execute(
        "INSERT INTO episodic_memory (prompt, response, timestamp, links_json)
         VALUES (?1, ?2, ?3, '[]')",
        params![prompt, response, now()],
    )
    .is_ok()
}

pub fn search_memory(query: String) -> String {
    let Ok(conn) = open() else {
        return "[]".to_string();
    };
    let like = format!("%{}%", query);
    let rows = (|| -> rusqlite::Result<Vec<serde_json::Value>> {
        let mut stmt = conn.prepare(
            "SELECT id, prompt, response, timestamp, links_json FROM episodic_memory
             WHERE prompt LIKE ?1 OR response LIKE ?1
             ORDER BY timestamp DESC LIMIT 10",
        )?;
        let iter = stmt.query_map([&like], |r| {
            Ok(serde_json::json!({
                "id": r.get::<_, i64>(0)?,
                "prompt": r.get::<_, String>(1)?,
                "response": r.get::<_, String>(2)?,
                "timestamp": r.get::<_, i64>(3)?,
                "links": r.get::<_, String>(4)?,
            }))
        })?;
        iter.collect()
    })();

    match rows {
        Ok(v) => serde_json::to_string(&v).unwrap_or_else(|_| "[]".to_string()),
        Err(_) => "[]".to_string(),
    }
}

pub fn set_entity(key: String, value_json: String) -> bool {
    let Ok(conn) = open() else { return false };
    conn.execute(
        "INSERT INTO entity_state (key, value_json) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json",
        params![key, value_json],
    )
    .is_ok()
}

pub fn get_entity(key: String) -> String {
    let Ok(conn) = open() else {
        return "null".to_string();
    };
    conn.query_row(
        "SELECT value_json FROM entity_state WHERE key = ?1",
        [&key],
        |r| r.get::<_, String>(0),
    )
    .unwrap_or_else(|_| "null".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn roundtrip() {
        assert!(store_memory("test prompt zzq".into(), "test response".into()));
        let hits = search_memory("zzq".into());
        assert!(hits.contains("test response"));
        assert!(set_entity("k1".into(), "{\"a\":1}".into()));
        assert_eq!(get_entity("k1".into()), "{\"a\":1}");
    }
}
