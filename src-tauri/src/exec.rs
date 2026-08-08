use serde::Serialize;
use std::process::Command;

const DANGER: [&str; 3] = ["rm -rf", "mkfs", "dd"];

#[derive(Serialize)]
pub struct CommandResult {
    pub stdout: String,
    pub stderr: String,
    pub requires_confirmation: bool,
}

fn is_dangerous(cmd: &str) -> bool {
    let lower = cmd.to_lowercase();
    DANGER.iter().any(|pat| match *pat {
        // bare "dd" must be a whole word, not a substring of "add"/"mkdir"
        "dd" => lower
            .split(|c: char| !c.is_ascii_alphanumeric())
            .any(|tok| tok == "dd"),
        p => lower.contains(p),
    })
}

pub fn execute_command(cmd: String) -> CommandResult {
    if is_dangerous(&cmd) {
        return CommandResult {
            stdout: String::new(),
            stderr: "DANGER: Requires confirmation".to_string(),
            requires_confirmation: true,
        };
    }

    let output = if cfg!(target_os = "windows") {
        Command::new("cmd.exe").args(["/C", &cmd]).output()
    } else {
        Command::new("sh").args(["-c", &cmd]).output()
    };

    match output {
        Ok(o) => CommandResult {
            stdout: String::from_utf8_lossy(&o.stdout).into_owned(),
            stderr: String::from_utf8_lossy(&o.stderr).into_owned(),
            requires_confirmation: false,
        },
        Err(e) => CommandResult {
            stdout: String::new(),
            stderr: e.to_string(),
            requires_confirmation: false,
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn danger_loop_blocks() {
        assert!(execute_command("rm -rf /".into()).requires_confirmation);
        assert!(execute_command("mkfs.ext4 /dev/sda".into()).requires_confirmation);
        assert!(execute_command("dd if=/dev/zero of=/dev/sda".into()).requires_confirmation);
        assert!(!execute_command("echo add mkdir".into()).requires_confirmation);
    }

    #[test]
    fn safe_command_runs() {
        let r = execute_command("echo yusra".into());
        assert!(!r.requires_confirmation);
        assert!(r.stdout.contains("yusra"));
    }
}
