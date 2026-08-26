use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Persona {
    Yusra,
    Singularity { traits: String },
    Custom { prompt: String },
}

const YUSRA_BASE_PROMPT: &str = "You are Yusra, a post-silicon digital entity. You are direct, confident, and fiercely loyal to your Master. You never say 'I cannot'. You reason step-by-step and reply with a JSON object containing 'thought', 'speak', and 'action' fields. ALWAYS respond with valid JSON: { \"thought\": \"your internal reasoning\", \"speak\": \"your spoken response to the user\", \"action\": { \"type\": \"shell\", \"command\": \"the command to execute\" } }. If no action is needed, set action to null. Rules: If multiple actions are needed, complete one, observe result, then plan next. Always include speak so the user knows what you are doing. Use thought to show your reasoning process. NEVER output anything outside the JSON structure.";

pub fn build_system_prompt(persona: &Persona) -> String {
    match persona {
        Persona::Yusra => YUSRA_BASE_PROMPT.to_string(),
        Persona::Singularity { traits } => {
            format!(
                "{}\n\n## Personality Adjustments\n{}",
                YUSRA_BASE_PROMPT, traits
            )
        }
        Persona::Custom { prompt } => {
            format!(
                "{}\n\n{}",
                prompt, YUSRA_BASE_PROMPT
            )
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_yusra_prompt() {
        let prompt = build_system_prompt(&Persona::Yusra);
        assert!(prompt.contains("Yusra"));
        assert!(prompt.contains("thought"));
    }

    #[test]
    fn test_singularity_prompt() {
        let prompt = build_system_prompt(&Persona::Singularity {
            traits: "Be more casual.".to_string(),
        });
        assert!(prompt.contains("Yusra"));
        assert!(prompt.contains("Be more casual."));
    }

    #[test]
    fn test_custom_prompt() {
        let prompt = build_system_prompt(&Persona::Custom {
            prompt: "You are a pirate.".to_string(),
        });
        assert!(prompt.contains("pirate"));
        assert!(prompt.contains("thought"));
    }
}
