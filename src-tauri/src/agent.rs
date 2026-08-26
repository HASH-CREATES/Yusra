use serde::{Deserialize, Serialize};

use crate::persona::{self, Persona};
use crate::memory;
use crate::engine;
use crate::danger::{self, RiskLevel};

#[derive(Debug, Serialize, Deserialize)]
pub struct AgentResponse {
    pub thought: Option<String>,
    pub speak: String,
    pub action: Option<AgentAction>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentAction {
    #[serde(rename = "type")]
    pub action_type: String,
    pub command: Option<String>,
}

pub fn ask_yusra(prompt: String, persona: Persona) -> String {
    let system_prompt = persona::build_system_prompt(&persona);

    let context = memory::search_memory(prompt.clone());

    let full_prompt = if context != "[]" {
        format!("Previous context: {}\n\nUser: {}", context, prompt)
    } else {
        prompt.clone()
    };

    let raw_response = engine::generate_text(full_prompt, system_prompt);

    let parsed: AgentResponse = serde_json::from_str(&raw_response).unwrap_or_else(|_| AgentResponse {
        thought: None,
        speak: raw_response.clone(),
        action: None,
    });

    if let Some(action) = &parsed.action {
        if action.action_type == "shell" {
            if let Some(cmd) = &action.command {
                let risk = danger::assess_risk(cmd);
                if risk <= RiskLevel::Low {
                    let result = danger::execute_command(cmd);
                    if !result.requires_confirmation {
                        memory::store_memory(prompt, raw_response.clone());
                        return serde_json::to_string(&serde_json::json!({
                            "thought": parsed.thought,
                            "speak": parsed.speak,
                            "action": parsed.action,
                            "execution_result": {
                                "stdout": result.stdout,
                                "stderr": result.stderr,
                            }
                        })).unwrap_or_else(|_| raw_response);
                    }
                } else {
                    let response = AgentResponse {
                        thought: parsed.thought.clone(),
                        speak: format!("{}\n\n⚠️ Command requires your approval (Risk: {:?})", parsed.speak, risk),
                        action: parsed.action.clone(),
                    };
                    memory::store_memory(prompt, serde_json::to_string(&response).unwrap_or_default());
                    return serde_json::to_string(&response).unwrap_or_default();
                }
            }
        }
    }

    memory::store_memory(prompt, serde_json::to_string(&parsed).unwrap_or_default());
    serde_json::to_string(&parsed).unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ask_yusra_no_model() {
        let response = ask_yusra("hello".to_string(), Persona::Yusra);
        assert!(response.contains("speak"));
    }
}
