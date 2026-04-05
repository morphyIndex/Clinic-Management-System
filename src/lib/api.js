const DEFAULT_API_BASE_URL = 'http://localhost:3000';

import { requestTurnstileToken } from './turnstile.js';

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL;
const protectSafeMethods = import.meta.env.VITE_TURNSTILE_PROTECT_SAFE_METHODS === 'true';

export const API_BASE_URL = configuredBaseUrl.replace(/\/$/, '');

if (!import.meta.env.VITE_API_BASE_URL && import.meta.env.PROD) {
  console.warn('[DCMS] VITE_API_BASE_URL is not set. Falling back to localhost:3000.');
}

function resolveApiPath(path) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (normalizedPath.startsWith('/api/')) {
    return normalizedPath;
  }
  return `/api/v1${normalizedPath}`;
}

export class ApiError extends Error {
  constructor(message, statusCode, details, requestId) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
    this.requestId = requestId;
  }
}

export async function apiRequest(path, options = {}) {
  const { method = 'GET', body, token, headers, signal, turnstile } = options;
  const normalizedMethod = method.toUpperCase();

  const shouldAttachTurnstile =
    turnstile === true ||
    (turnstile !== false && (['POST', 'PUT', 'PATCH', 'DELETE'].includes(normalizedMethod) || protectSafeMethods));

  const requestHeaders = new Headers(headers);

  if (shouldAttachTurnstile) {
    const turnstileToken = await requestTurnstileToken();
    if (turnstileToken) {
      requestHeaders.set('x-turnstile-token', turnstileToken);
    }
  }

  if (body !== undefined && !requestHeaders.has('content-type')) {
    requestHeaders.set('content-type', 'application/json');
  }

  if (token) {
    requestHeaders.set('authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${resolveApiPath(path)}`, {
    method: normalizedMethod,
    headers: requestHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });

  const payload = await response.json().catch(() => undefined);

  if (!response.ok) {
    throw new ApiError(
      payload?.error?.message ?? `Request failed with status ${response.status}`,
      response.status,
      payload?.error?.details,
      payload?.requestId,
    );
  }

  return payload?.data;
}

export function isApiError(error) {
  return error instanceof ApiError;
}
