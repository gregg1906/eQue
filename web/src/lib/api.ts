const TOKEN_KEY = 'eque_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

let unauthorizedHandler: (() => void) | null = null;

/** App.tsx rejestruje tu wylogowanie z komunikatem „Sesja wygasła” na czas trwania sesji. */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

/**
  Serwer odrzucił token (401) albo konto zostało wyłączone — kończymy sesję zamiast
  zostawiać panel, który wygląda na działający, a po cichu nie zapisuje zmian.
*/
export function notifyUnauthorized() {
  unauthorizedHandler?.();
}

export async function errorDetail(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (body?.detail) return typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail);
  } catch {
    // odpowiedź nie była JSON-em — zostaje statusText
  }
  return res.statusText;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (options.headers) Object.assign(headers, options.headers as Record<string, string>);
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`/api/v1${path}`, { ...options, headers });

  if (!res.ok) {
    // 401 przy logowaniu to złe hasło, a nie wygasła sesja
    if (res.status === 401 && token && path !== '/auth/login') notifyUnauthorized();
    throw new ApiError(res.status, await errorDetail(res));
  }

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const api = {
  get: <T,>(path: string) => request<T>(path),
  post: <T,>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
  put: <T,>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  del: <T,>(path: string) => request<T>(path, { method: 'DELETE' }),
};
