export interface LlmResponse {
  thought: string | null;
  speak: string;
  action: AgentAction | null;
}

export interface AgentAction {
  type: 'shell' | 'python' | 'file_read' | 'file_write' | 'done';
  command?: string;
}

export interface CommandResult {
  stdout: string;
  stderr: string;
  requires_confirmation: boolean;
  risk_level: string;
}

export interface Message {
  id: string;
  role: 'user' | 'yusra';
  content: string;
  thought?: string;
  timestamp: number;
  action?: AgentAction;
  result?: CommandResult;
}
