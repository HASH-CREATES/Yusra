use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub enum RiskLevel {
    Safe,
    Low,
    Medium,
    High,
    Critical,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommandResult {
    pub stdout: String,
    pub stderr: String,
    pub requires_confirmation: bool,
    pub risk_level: String,
}

pub fn assess_risk(cmd: &str) -> RiskLevel {
    let lower = cmd.trim().to_lowercase();

    // Critical patterns
    if lower.contains("rm -rf /") || lower.contains("rm -rf ~") || lower.contains("rmdir /s /q")
        || lower.contains("format c:") || lower.contains("format d:")
        || lower.contains("mkfs.") || lower.contains("dd if=")
    {
        return RiskLevel::Critical;
    }

    // High patterns
    if lower.contains("rm -rf ") || lower.contains("rm -r ") || lower.contains("sudo rm")
        || lower.contains("chmod 777") || lower.contains("kill -9")
        || lower.contains("taskkill /f") || lower.contains("remove-item -recurse")
        || lower.contains("remove-item") && lower.contains("-force")
    {
        return RiskLevel::High;
    }

    // Medium patterns
    if lower.contains("sudo ") || lower.contains("rm ") || lower.contains("del ")
        || lower.contains("mv ") || lower.contains("chmod ") || lower.contains("chown ")
        || lower.contains("net user") || lower.contains("net localgroup")
    {
        return RiskLevel::Medium;
    }

    // Low patterns
    if lower.contains("mkdir ") || lower.contains("touch ") || lower.contains("echo ")
        || lower.contains("cp ") || lower.contains("copy ")
    {
        return RiskLevel::Low;
    }

    RiskLevel::Safe
}

pub fn execute_command(cmd: &str) -> CommandResult {
    let risk = assess_risk(cmd);

    if risk >= RiskLevel::Critical {
        return CommandResult {
            stdout: String::new(),
            stderr: "Command blocked: too dangerous.".to_string(),
            requires_confirmation: false,
            risk_level: format!("{:?}", risk),
        };
    }

    if risk >= RiskLevel::Medium {
        return CommandResult {
            stdout: String::new(),
            stderr: String::new(),
            requires_confirmation: true,
            risk_level: format!("{:?}", risk),
        };
    }

    let output = std::process::Command::new("cmd")
        .args(["/C", cmd])
        .output();

    match output {
        Ok(out) => CommandResult {
            stdout: String::from_utf8_lossy(&out.stdout).to_string(),
            stderr: String::from_utf8_lossy(&out.stderr).to_string(),
            requires_confirmation: false,
            risk_level: format!("{:?}", risk),
        },
        Err(e) => CommandResult {
            stdout: String::new(),
            stderr: format!("Execution error: {}", e),
            requires_confirmation: false,
            risk_level: format!("{:?}", risk),
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_risk_levels() {
        assert_eq!(assess_risk("ls"), RiskLevel::Safe);
        assert_eq!(assess_risk("mkdir test"), RiskLevel::Low);
        assert_eq!(assess_risk("rm file.txt"), RiskLevel::Medium);
        assert_eq!(assess_risk("sudo rm -rf /"), RiskLevel::Critical);
    }

    #[test]
    fn test_execute_safe() {
        let result = execute_command("dir");
        assert!(!result.requires_confirmation);
        assert_eq!(result.risk_level, "Safe");
    }

    #[test]
    fn test_execute_critical_blocked() {
        let result = execute_command("rm -rf /");
        assert!(!result.requires_confirmation);
        assert!(result.stderr.contains("blocked"));
    }
}
