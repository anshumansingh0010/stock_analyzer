// ─── All API calls go through this base ──────────────────────
// Vite proxy forwards /api → http://localhost:3001/api
export const API_BASE = '/api';

function getAuthToken(): string | null {
  return localStorage.getItem("stock_sense_token");
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });
  return res;
}

export function buildSSEReader<T = any>(response: Response) {
  if (!response.body) {
    throw new Error('Response body is missing');
  }
  const reader  = response.body.getReader();
  const decoder = new TextDecoder();
  let   buffer  = '';

  return async function* (): AsyncGenerator<T, void, unknown> {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n');
      buffer = events.pop() || "";
      for (const event of events) {
        if (!event.startsWith('data: ')) continue;
        try { yield JSON.parse(event.slice(6)) as T; } catch { /* skip */ }
      }
    }
  };
}
