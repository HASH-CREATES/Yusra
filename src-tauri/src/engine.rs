use std::sync::OnceLock;
use std::sync::Mutex;
use std::path::PathBuf;

struct ModelState {
    model_path: PathBuf,
    tokenizer_path: PathBuf,
}

static MODEL_STATE: OnceLock<Mutex<Option<ModelState>>> = OnceLock::new();

pub fn init_model(model_path: String, tokenizer_path: String) -> bool {
    let state = MODEL_STATE.get_or_init(|| Mutex::new(None));
    let model_file = PathBuf::from(&model_path);
    let tok_file = PathBuf::from(&tokenizer_path);

    if !model_file.exists() || !tok_file.exists() {
        return false;
    }

    let mut guard = state.lock().unwrap();
    *guard = Some(ModelState {
        model_path: model_file,
        tokenizer_path: tok_file,
    });
    true
}

pub fn generate_text(prompt: String, system_prompt: String) -> String {
    let state = MODEL_STATE.get_or_init(|| Mutex::new(None));
    let guard = state.lock().unwrap();

    if guard.is_none() {
        return "Master, my mind is empty. Please load a model in Settings.".to_string();
    }

    let model_info = guard.as_ref().unwrap();
    let full_prompt = format!("{}\n\n{}", system_prompt, prompt);

    // Attempt candle-core GGUF inference
    match run_inference(&full_prompt, &model_info.model_path, &model_info.tokenizer_path) {
        Ok(text) => text,
        Err(e) => format!("{{\"thought\":\"Inference error\",\"speak\":\"Master, the model encountered an error: {}\",\"action\":null}}", e),
    }
}

fn run_inference(prompt: &str, model_path: &PathBuf, tokenizer_path: &PathBuf) -> Result<String, String> {
    use candle_core::Device;
    use tokenizers::Tokenizer;

    let device = Device::Cpu;

    let tokenizer = Tokenizer::from_file(tokenizer_path)
        .map_err(|e| format!("Tokenizer load failed: {}", e))?;

    let encoding = tokenizer.encode(prompt, true)
        .map_err(|e| format!("Tokenization failed: {}", e))?;

    let tokens = encoding.get_ids();
    let vocab_size = tokenizer.get_vocab_size(true);

    let _model_bytes = std::fs::read(model_path)
        .map_err(|e| format!("Model read failed: {}", e))?;

    // Placeholder: real GGUF parsing requires quantized_llama integration
    // For now, return structured JSON acknowledging the model is loaded
    let token_count = tokens.len();
    let response = format!(
        "{{\"thought\":\"Processed {} tokens from model at {}\",\"speak\":\"Master, the model is loaded and I processed your input. Full inference will be available once GGUF quantized model integration is complete.\",\"action\":null}}",
        token_count,
        model_path.display()
    );

    // Keep unused warnings at bay
    let _ = vocab_size;
    let _ = device;

    Ok(response)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_no_model_response() {
        let state = MODEL_STATE.get_or_init(|| Mutex::new(None));
        let mut guard = state.lock().unwrap();
        *guard = None;
        drop(guard);

        let resp = generate_text("hello".to_string(), "system".to_string());
        assert!(resp.contains("empty"));
    }
}
