const STORAGE_KEY = 'dcms-session';
const STORAGE_VERSION = 1;

export function readStoredSession() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (
      parsed?.version !== STORAGE_VERSION ||
      !parsed?.accessToken ||
      !parsed?.refreshToken ||
      !parsed?.user
    ) {
      clearStoredSession();
      return null;
    }

    return {
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
      user: parsed.user,
    };
  } catch {
    clearStoredSession();
    return null;
  }
}

export function writeStoredSession(session) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      version: STORAGE_VERSION,
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      user: session.user,
    }),
  );
}

export function clearStoredSession() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
}
