import { API_BASE_URL } from "../constants/misc";

export async function readApiResponse(response: Response) {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {
      message: text || "Server returned a non-JSON response",
    };
  }
}

/** Calls the API and parses a JSON body. Throws on non-2xx responses. */
export async function apiCall(path: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const data = await readApiResponse(response);

  if (!response.ok) {
    throw new Error(data.message || `Request failed with ${response.status}`);
  }

  return data;
}

/** Calls the API and returns a raw text body (used for SVG QR codes). Throws on non-2xx responses. */
export async function textApiCall(path: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
    },
  });

  const text = await response.text();

  if (!response.ok) {
    try {
      const data = JSON.parse(text);
      throw new Error(data.message || `Request failed with ${response.status}`);
    } catch {
      throw new Error(text || `Request failed with ${response.status}`);
    }
  }

  return text;
}

export function authHeader(token?: string): HeadersInit {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
