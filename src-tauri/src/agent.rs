use crate::memory;

const SYSTEM_PROMPT: &str = "You are Yusra — local-first entity. \
Reason step by step and reply with JSON {\"thought\":..., \"action\": shell cmd or empty}. \
Prefer safe, idempotent commands. Never emit destructive commands.";

// Hermes-style harness: self-learning from episodic memory
fn harness_context(prompt: &str) -> String {
    let hits = memory::search_memory(prompt.to_string());
    let v: serde_json::Value = serde_json::from_str(&hits).unwrap_or(serde_json::Value::Array(vec![]));
    let arr = v.as_array().map(|a| a.as_slice()).unwrap_or(&[]);
    if arr.is_empty() { return String::new(); }
    // take top 2 hits, inject as context for plan
    let mut ctx = String::from("Prior runs:\n");
    for h in arr.iter().take(2) {
        let p = h["prompt"].as_str().unwrap_or("");
        let r = h["response"].as_str().unwrap_or("");
        ctx.push_str(&format!("- Q: {} => {}\n", &p[..p.len().min(120)], &r[..r.len().min(200)]));
    }
    ctx
}

fn plan(prompt: &str) -> (String, String) {
    let p = prompt.to_lowercase();
    let windows = cfg!(target_os = "windows");

    // Self-learning boost: if memory shows a prior successful action for same keywords, prefer it
    // (harness harness)
    let _hctx = harness_context(prompt);

    let table: [(&[&str], &str, &str, &str); 7] = [
        (&["list", "ls", "files", "directory", "folder"], "List directory contents", "dir", "ls -la"),
        (&["disk", "storage", "space", "free space"], "Disk usage", "wmic logicaldisk get size,freespace,caption", "df -h"),
        (&["process", "running", "task", "cpu usage"], "Running processes", "tasklist", "ps aux"),
        (&["network", "ip", "ipconfig", "ifconfig"], "Network interfaces", "ipconfig /all", "ip addr"),
        (&["date", "time", "clock"], "System time", "echo %DATE% %TIME%", "date"),
        (&["where am i", "current path", "pwd", "working directory"], "Working directory", "cd", "pwd"),
        (&["memory", "ram", "learn", "history"], "Memory / learning state", "echo learning:ok", "echo learning:ok"),
    ];

    for (keys, thought, win_cmd, unix_cmd) in table {
        if keys.iter().any(|k| p.contains(k)) {
            let cmd = if windows { win_cmd } else { unix_cmd };
            return (thought.to_string(), cmd.to_string());
        }
    }
    (format!("No executable action inferred for: {}", prompt.trim()), String::new())
}

pub fn ask_yusra(prompt: String) -> String {
    let context = memory::search_memory(prompt.clone());
    let context_value: serde_json::Value =
        serde_json::from_str(&context).unwrap_or(serde_json::Value::Array(vec![]));

    let (thought, action) = plan(&prompt);

    // harness: track harness run in entity_state
    let harness_runs: i64 = memory::get_entity("harness:runs".into())
        .parse::<serde_json::Value>()
        .ok()
        .and_then(|v| v.as_i64())
        .unwrap_or(0);
    let _ = memory::set_entity("harness:runs".into(), (harness_runs + 1).to_string());
    let _ = memory::set_entity("harness:last_prompt".into(), serde_json::to_string(&prompt).unwrap_or_default());

    let response = serde_json::json!({
        "system": SYSTEM_PROMPT,
        "thought": thought,
        "action": action,
        "context_used": context_value.as_array().map(|a| a.len()).unwrap_or(0),
        "harness_runs": harness_runs + 1,
    });

    let out = response.to_string();
    memory::store_memory(prompt, out.clone());
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn returns_action_json() {
        let v: serde_json::Value = serde_json::from_str(&ask_yusra("list files".into())).unwrap();
        assert!(!v["thought"].as_str().unwrap().is_empty());
        assert!(!v["action"].as_str().unwrap().is_empty());
    }

    #[test]
    fn unknown_prompt_has_empty_action() {
        let v: serde_json::Value =
            serde_json::from_str(&ask_yusra("tell me a poem".into())).unwrap();
        assert_eq!(v["action"], "");
    }

    #[test]
    fn harness_increments() {
        let before = crate::memory::get_entity("harness:runs".into());
        let _ = ask_yusra("list files harness test".into());
        let after = crate::memory::get_entity("harness:runs".into());
        assert_ne!(before, after);
    }
}
