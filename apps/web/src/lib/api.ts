'use client';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

let accessToken: string | null = null;
let refreshing: Promise<string | null> | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (typeof window !== 'undefined') {
    if (token) sessionStorage.setItem('sel_access', token);
    else sessionStorage.removeItem('sel_access');
  }
}

export function getAccessToken(): string | null {
  if (accessToken) return accessToken;
  if (typeof window !== 'undefined') {
    accessToken = sessionStorage.getItem('sel_access');
  }
  return accessToken;
}

async function refreshAccess(): Promise<string | null> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        setAccessToken(null);
        return null;
      }
      const data = (await res.json()) as { accessToken: string };
      setAccessToken(data.accessToken);
      return data.accessToken;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

export interface ApiOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  skipAuth?: boolean;
}

export async function api<T = unknown>(path: string, opts: ApiOptions = {}): Promise<T> {
  const { body, skipAuth, headers: hdrs, ...rest } = opts;

  const headers: Record<string, string> = { Accept: 'application/json', ...((hdrs as Record<string, string>) ?? {}) };
  if (body !== undefined && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (!skipAuth) {
    const t = getAccessToken();
    if (t) headers.Authorization = `Bearer ${t}`;
  }

  const init: RequestInit = {
    ...rest,
    headers,
    credentials: 'include',
    body:
      body === undefined
        ? undefined
        : body instanceof FormData
          ? body
          : JSON.stringify(body),
  };

  let res = await fetch(`${API_URL}${path}`, init);

  if (res.status === 401 && !skipAuth) {
    const newToken = await refreshAccess();
    if (newToken) {
      headers.Authorization = `Bearer ${newToken}`;
      res = await fetch(`${API_URL}${path}`, { ...init, headers });
    }
  }

  if (!res.ok) {
    let message = res.statusText;
    try {
      const data = await res.json();
      message = (data as { message?: string | string[] }).message
        ? Array.isArray((data as { message: string[] }).message)
          ? ((data as { message: string[] }).message as string[]).join(', ')
          : ((data as { message: string }).message as string)
        : message;
    } catch {
      // body wasn't JSON
    }
    throw new Error(message);
  }

  if (res.status === 204) return undefined as T;
  const ctype = res.headers.get('content-type') ?? '';
  if (ctype.includes('application/json')) return (await res.json()) as T;
  return (await res.text()) as unknown as T;
}
