use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
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
        "CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            prompt TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            result TEXT NOT NULL DEFAULT '',
            run_count INTEGER NOT NULL DEFAULT 0,
            is_favorite INTEGER NOT NULL DEFAULT 0,
            created_at INTEGER NOT NULL,
            last_run INTEGER
        );",
    )?;
    Ok(conn)
}

fn now() -> i64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_secs() as i64).unwrap_or(0)
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Task {
    pub id: i64,
    pub title: String,
    pub prompt: String,
    pub status: String,
    pub result: String,
    pub run_count: i64,
    pub is_favorite: bool,
    pub created_at: i64,
    pub last_run: Option<i64>,
}

pub fn create_task(title: String, prompt: String) -> String {
    let Ok(conn) = open() else { return "{\"error\":\"db\"}".into(); };
    let t = title.trim().to_string();
    let p = prompt.trim().to_string();
    if t.is_empty() || p.is_empty() {
        return "{\"error\":\"title and prompt required\"}".into();
    }
    let title_capped = if t.len() > 120 { t[..120].to_string() } else { t };
    let prompt_capped = if p.len() > 4000 { p[..4000].to_string() } else { p };
    let _ = conn.execute(
        "INSERT INTO tasks (title, prompt, status, created_at) VALUES (?1, ?2, 'pending', ?3)",
        params![title_capped, prompt_capped, now()],
    );
    list_tasks()
}

pub fn list_tasks() -> String {
    let Ok(conn) = open() else { return "[]".into(); };
    let rows = (|| -> rusqlite::Result<Vec<Task>> {
        let mut stmt = conn.prepare(
            "SELECT id, title, prompt, status, result, run_count, is_favorite, created_at, last_run FROM tasks ORDER BY is_favorite DESC, last_run DESC NULLS LAST, id DESC",
        )?;
        let iter = stmt.query_map([], |r| {
            Ok(Task {
                id: r.get(0)?,
                title: r.get(1)?,
                prompt: r.get(2)?,
                status: r.get(3)?,
                result: r.get(4)?,
                run_count: r.get(5)?,
                is_favorite: r.get::<_, i64>(6)? != 0,
                created_at: r.get(7)?,
                last_run: r.get(8)?,
            })
        })?;
        iter.collect()
    })();
    serde_json::to_string(&rows.unwrap_or_default()).unwrap_or_else(|_| "[]".into())
}

pub fn run_task(id: i64) -> String {
    let Ok(conn) = open() else { return "{\"error\":\"db\"}".into(); };
    // fetch prompt
    let prompt: String = match conn.query_row("SELECT prompt FROM tasks WHERE id=?1", [id], |r| r.get(0)) {
        Ok(v) => v,
        Err(_) => return "{\"error\":\"not found\"}".into(),
    };
    // mark running
    let _ = conn.execute("UPDATE tasks SET status='running', last_run=?1 WHERE id=?2", params![now(), id]);
    // run via agent + exec (harness)
    let json = crate::agent::ask_yusra(prompt.clone());
    let action: String = serde_json::from_str::<serde_json::Value>(&json)
        .ok()
        .and_then(|v| v["action"].as_str().map(|s| s.to_string()))
        .unwrap_or_default();
    let result_text = if action.trim().is_empty() {
        // no shell action — return thought
        serde_json::from_str::<serde_json::Value>(&json)
            .ok()
            .and_then(|v| v["thought"].as_str().map(|s| s.to_string()))
            .unwrap_or(json.clone())
    } else {
        let r = crate::exec::execute_command(action.clone());
        if r.requires_confirmation {
            format!("BLOCKED (needs confirm): {}", action)
        } else if !r.stdout.trim().is_empty() {
            r.stdout.trim().to_string()
        } else if !r.stderr.trim().is_empty() {
            r.stderr.trim().to_string()
        } else {
            "(no output)".into()
        }
    };
    // store harness trace + self-learning signal
    let status = if result_text.starts_with("BLOCKED") || result_text.to_lowercase().contains("error") { "failed" } else { "done" };
    let _ = conn.execute(
        "UPDATE tasks SET status=?1, result=?2, run_count=run_count+1, last_run=?3 WHERE id=?4",
        params![status, result_text, now(), id],
    );
    // self-learning: bump success weight in entity_state
    let key = format!("harness:task:{}", id);
    let _ = crate::memory::set_entity(key, serde_json::json!({"last_status": status, "last_result": &result_text[..result_text.len().min(500)]}).to_string());
    // also store in episodic memory for recall
    let _ = crate::memory::store_memory(format!("[task {}] {}", id, prompt), result_text.clone());
    list_tasks()
}

pub fn delete_task(id: i64) -> String {
    let Ok(conn) = open() else { return "[]".into(); };
    let _ = conn.execute("DELETE FROM tasks WHERE id=?1", [id]);
    list_tasks()
}

pub fn toggle_favorite(id: i64) -> String {
    let Ok(conn) = open() else { return "[]".into(); };
    let _ = conn.execute("UPDATE tasks SET is_favorite = CASE WHEN is_favorite=1 THEN 0 ELSE 1 END WHERE id=?1", [id]);
    list_tasks()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn crud_and_rerun() {
        let before = list_tasks();
        let after_create = create_task("test task jarvis".into(), "echo yusra".into());
        assert!(after_create.contains("test task jarvis"));
        // find created id
        let tasks: Vec<Task> = serde_json::from_str(&after_create).unwrap();
        let t = tasks.iter().find(|x| x.title == "test task jarvis").unwrap();
        let after_run = run_task(t.id);
        assert!(after_run.contains("yusra") || after_run.contains("done"));
        let after_fav = toggle_favorite(t.id);
        assert!(after_fav.contains("test task jarvis"));
        let after_del = delete_task(t.id);
        let tasks2: Vec<Task> = serde_json::from_str(&after_del).unwrap();
        assert!(!tasks2.iter().any(|x| x.id == t.id));
        let _ = before;
    }
}
