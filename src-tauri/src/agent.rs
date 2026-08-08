use crate::memory;

const SYSTEM_PROMPT: &str = "You are Yusra, a local-first desktop agent. \
You reason step by step and reply with a single JSON object containing \
\"thought\" (your reasoning) and \"action\" (a shell command to run, or an empty \
string when no command is needed). Never emit destructive commands.";

/// Deterministic planner used until candle inference is wired in.
/// Maps intent keywords to a concrete shell action for the host platform.
fn plan(prompt: &str) -> (String, String) {
    let p = prompt.to_lowercase();
    let windows = cfg!(target_os = "windows");

    let table: [(&[&str], &str, &str, &str); 6] = [
        (
            &["list", "ls", "files", "directory", "folder"],
            "User wants to see the contents of the current directory",
            "dir",
            "ls -la",
        ),
        (
            &["disk", "storage", "space", "free space"],
            "User wants disk usage information",
            "wmic logicaldisk get size,freespace,caption",
            "df -h",
        ),
        (
            &["process", "running", "task", "cpu usage"],
            "User wants the list of running processes",
            "tasklist",
            "ps aux",
        ),
        (
            &["network", "ip", "ipconfig", "ifconfig"],
            "User wants network interface information",
            "ipconfig /all",
            "ip addr",
        ),
        (
            &["date", "time", "clock"],
            "User wants the current system date and time",
            "echo %DATE% %TIME%",
            "date",
        ),
        (
            &["where am i", "current path", "pwd", "working directory"],
            "User wants the current working directory",
            "cd",
            "pwd",
        ),
    ];

    for (keys, thought, win_cmd, unix_cmd) in table {
        if keys.iter().any(|k| p.contains(k)) {
            let cmd = if windows { win_cmd } else { unix_cmd };
            return (thought.to_string(), cmd.to_string());
        }
    }

    (
        format!("No executable action inferred for: {}", prompt.trim()),
        String::new(),
    )
}

pub fn ask_yusra(prompt: String) -> String {
    let context = memory::search_memory(prompt.clone());
    let context_value: serde_json::Value =
        serde_json::from_str(&context).unwrap_or(serde_json::Value::Array(vec![]));

    let (thought, action) = plan(&prompt);

    let response = serde_json::json!({
        "system": SYSTEM_PROMPT,
        "thought": thought,
        "action": action,
        "context_used": context_value.as_array().map(|a| a.len()).unwrap_or(0),
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
}
