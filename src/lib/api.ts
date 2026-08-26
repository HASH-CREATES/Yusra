// The transport seam — ALL backend fetch() calls live here. Zero direct LLM/shell calls elsewhere.
import type { AgentTurn, HealthResponse, ModelsResponse } from './types';

// 127.0.0.1 on purpose: `localhost` can resolve to ::1 on Windows and miss uvicorn's bind.
const API_BASE = 'http://127.0.0.1:8000';

async function j<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

function post<T>(path: string, body: unknown): Promise<T> {
  return fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then((r) => j<T>(r));
}

export const api = {
  health: (): Promise<HealthResponse> => fetch(`${API_BASE}/health`).then((r) => j<HealthResponse>(r)),

  chat: (prompt: string, sessionId: string): Promise<AgentTurn> =>
    post<AgentTurn>('/chat', { prompt, session_id: sessionId }),

  confirm: (confirmationId: string, approved: boolean): Promise<AgentTurn> =>
    post<AgentTurn>(`/confirm/${confirmationId}`, { approved }),

  models: (): Promise<ModelsResponse> => fetch(`${API_BASE}/models`).then((r) => j<ModelsResponse>(r)),

  loadModel: (filename: string): Promise<{ loaded: string }> =>
    post<{ loaded: string }>('/models/load', { filename }),
};
