export interface AgentAction {
  type: 'shell' | 'python' | 'file_read' | 'file_write' | 'done';
  code: string;
  path?: string | null;
  content?: string | null;
}

export interface ExecResult {
  stdout: string;
  stderr: string;
  exit_code: number;
  duration_ms: number;
}

export interface AgentStep {
  thought: string | null;
  speak: string;
  action: AgentAction | null;
  observation?: ExecResult | null;
}

export interface AgentTurn {
  session_id: string;
  status: 'done' | 'pending_confirmation' | 'blocked' | 'error';
  steps: AgentStep[];
  final_speak: string;
  confirmation_id?: string | null;
  command?: string | null;
  risk_level?: string | null;
}

export interface ModelInfo {
  filename: string;
  size_bytes: number;
}

export interface ModelsResponse {
  models: ModelInfo[];
  active: string | null;
  models_dir: string;
}

export interface HealthResponse {
  status: string;
  model_loaded: boolean;
  model: string | null;
}

export type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking';

export interface Message {
  id: string;
  role: 'user' | 'yusra';
  content: string;
  thought?: string;
  timestamp: number;
  steps?: AgentStep[];
}
