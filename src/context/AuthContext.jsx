import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { ApiError, apiRequest } from '../lib/api.js';
import { clearStoredSession, readStoredSession, writeStoredSession } from '../lib/session.js';

const AuthContext = createContext(null);

function buildSession(authPayload, user) {
  return {
    accessToken: authPayload.accessToken,
    refreshToken: authPayload.refreshToken,
    user,
  };
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => readStoredSession());
  const sessionRef = useRef(session);
  const refreshPromiseRef = useRef(null);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const updateSession = (nextSession) => {
    sessionRef.current = nextSession;
    setSession(nextSession);

    if (nextSession) {
      writeStoredSession(nextSession);
      return;
    }

    clearStoredSession();
  };

  const fetchCurrentUser = async (accessToken) =>
    apiRequest('/users/me', {
      token: accessToken,
    });

  const refreshSession = async () => {
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    const currentSession = sessionRef.current;

    if (!currentSession?.refreshToken) {
      updateSession(null);
      throw new ApiError('Session expired. Please sign in again.', 401);
    }

    refreshPromiseRef.current = (async () => {
      try {
        const authPayload = await apiRequest('/auth/refresh', {
          method: 'POST',
          body: {
            refreshToken: currentSession.refreshToken,
          },
        });
        const user = await fetchCurrentUser(authPayload.accessToken);
        const nextSession = buildSession(authPayload, user);
        updateSession(nextSession);
        return nextSession;
      } finally {
        refreshPromiseRef.current = null;
      }
    })();

    return refreshPromiseRef.current;
  };

  const request = async (path, options = {}) => {
    const requiresAuth = options.auth !== false;
    const currentSession = sessionRef.current;

    if (!requiresAuth) {
      return apiRequest(path, options);
    }

    if (!currentSession?.accessToken) {
      throw new ApiError('Please sign in to continue.', 401);
    }

    try {
      return await apiRequest(path, {
        ...options,
        token: currentSession.accessToken,
      });
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 401 && currentSession.refreshToken) {
        const nextSession = await refreshSession();
        return apiRequest(path, {
          ...options,
          token: nextSession.accessToken,
        });
      }

      if (error instanceof ApiError && error.statusCode === 401) {
        updateSession(null);
      }

      throw error;
    }
  };

  const login = async (credentials) => {
    const authPayload = await apiRequest('/auth/login', {
      method: 'POST',
      body: credentials,
    });
    const user = await fetchCurrentUser(authPayload.accessToken);
    const nextSession = buildSession(authPayload, user);
    updateSession(nextSession);
    return nextSession;
  };

  const logout = async () => {
    const currentSession = sessionRef.current;

    try {
      if (currentSession?.refreshToken) {
        await apiRequest('/auth/logout', {
          method: 'POST',
          body: {
            refreshToken: currentSession.refreshToken,
          },
        });
      }
    } finally {
      updateSession(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        isAuthenticated: Boolean(session?.accessToken),
        login,
        logout,
        refreshSession,
        request,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
