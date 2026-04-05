const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim() ?? '';
const TURNSTILE_ENABLED = import.meta.env.VITE_TURNSTILE_ENABLED !== 'false' && Boolean(TURNSTILE_SITE_KEY);
const TURNSTILE_SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

let tokenRequester = null;

export function isTurnstileEnabled() {
  return TURNSTILE_ENABLED && Boolean(TURNSTILE_SITE_KEY);
}

export function getTurnstileSiteKey() {
  return TURNSTILE_SITE_KEY;
}

export function getTurnstileScriptUrl() {
  return TURNSTILE_SCRIPT_URL;
}

export function configureTurnstileTokenRequester(requester) {
  tokenRequester = requester;
}

export async function requestTurnstileToken() {
  if (!isTurnstileEnabled()) {
    return null;
  }

  if (typeof tokenRequester !== 'function') {
    throw new Error('Turnstile is not ready yet. Please try again.');
  }

  return tokenRequester();
}