import { supabase } from "../lib/supabaseClient";
import { getDeviceId } from "../lib/deviceId";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const deviceId = await getDeviceId();
  const headers: Record<string, string> = { "X-Device-Id": deviceId };
  if (data.session) headers.Authorization = `Bearer ${data.session.access_token}`;
  return headers;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { headers: await authHeaders() });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.error ?? `GET ${path} failed`, res.status);
  }
  return res.json();
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const headers = { ...(await authHeaders()), "Content-Type": "application/json" };
  const res = await fetch(`${API_URL}${path}`, { method: "POST", headers, body: JSON.stringify(body) });
  if (!res.ok) {
    const responseBody = await res.json().catch(() => ({}));
    throw new ApiError(responseBody.error ?? `POST ${path} failed`, res.status);
  }
  return res.json();
}
