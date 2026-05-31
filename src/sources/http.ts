import { CRATE_USER_AGENT } from '@/constants/sources';
import { logger } from '@/lib/logger';

export class HttpError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

const DEFAULT_TIMEOUT_MS = 15_000;

type GetJsonOptions = {
  timeoutMs?: number;
  /** Send the Crate User-Agent (Internet Archive asks for a descriptive UA). */
  userAgent?: boolean;
  signal?: AbortSignal;
};

/** GET a URL and parse JSON, with a timeout and consistent error surface. */
export async function getJson<T>(url: string, options: GetJsonOptions = {}): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, userAgent = false, signal } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', () => controller.abort(), { once: true });
  }
  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (userAgent) headers['User-Agent'] = CRATE_USER_AGENT;
    const res = await fetch(url, { headers, signal: controller.signal });
    if (!res.ok) {
      throw new HttpError(res.status, `GET ${url} failed with ${res.status}`);
    }
    return (await res.json()) as T;
  } catch (err) {
    if (!(err instanceof HttpError)) {
      logger.warn('http.getJson failed', { url, error: String(err) });
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Follow redirects and return the final URL (used for Audius /resolve and
 * endpoints that 302 to a CDN). React Native fetch follows redirects and exposes
 * the resolved URL on `res.url`.
 */
export async function resolveRedirect(
  url: string,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res.url || url;
  } finally {
    clearTimeout(timeout);
  }
}

export const enc = encodeURIComponent;
