import * as SecureStore from 'expo-secure-store';
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from '../app/auth/otp';

const BASE = process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:3001';

async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  if (res.status === 401) {
    // Attempt refresh
    const refreshed = await tryRefresh();
    if (refreshed) {
      return apiFetch<T>(path, init);
    }
    throw new Error('SESSION_EXPIRED');
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

async function tryRefresh(): Promise<boolean> {
  try {
    const rt = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    if (!rt) return false;
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: rt }),
    });
    if (!res.ok) return false;
    const { accessToken, refreshToken } = (await res.json()) as {
      accessToken: string;
      refreshToken: string;
    };
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    return true;
  } catch {
    return false;
  }
}
