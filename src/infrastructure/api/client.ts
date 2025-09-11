import { auth } from "../firebase/client";

export class ApiError extends Error {
    constructor(message: string, public status: number, public body: any) {
        super(message);
        this.name = 'ApiError';
    }
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const user = auth.currentUser;
  const token = user ? await user.getIdToken() : null;

  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const fullUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}${path}`;
  const finalOptions: RequestInit = {
    ...options,
    headers,
  };

  const response = await fetch(fullUrl, finalOptions);

  if (!response.ok) {
    let errorBody;
    try {
        errorBody = await response.json();
    } catch (e) {
        errorBody = await response.text().catch(() => 'Could not read error body');
    }
    throw new ApiError(`API Error: ${response.status}`, response.status, errorBody);
  }

  if (response.status === 204) {
    return null;
  }
  return response.json();
}