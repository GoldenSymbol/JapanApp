import { auth } from './firebase';

export class ApiError extends Error {
  status: number;
  payload: any;
  constructor(status: number, payload: any) {
    super(payload?.message || payload?.error || `HTTP ${status}`);
    this.status = status;
    this.payload = payload;
  }
}

export async function api<T = any>(path: string, options: RequestInit & { json?: any } = {}): Promise<T> {
  const { json, headers, ...rest } = options;
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch(`/api${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}

// FormData sets its own multipart boundary in the Content-Type header — letting the browser do
// that (rather than forcing 'application/json' like api() above) is the only real difference here.
export async function apiUpload<T = any>(path: string, formData: FormData): Promise<T> {
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch(`/api${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}

// Fetches a file's bytes as a Blob (auth-gated, unlike a plain <a href> which can't carry a
// bearer token) — used to hand a real File to navigator.share() for the native share sheet.
export async function apiDownload(path: string): Promise<Blob> {
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch(`/api${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) throw new ApiError(res.status, null);
  return res.blob();
}
