import { useEffect, useRef } from 'react';
import {
  configureTurnstileTokenRequester,
  getTurnstileScriptUrl,
  getTurnstileSiteKey,
  isTurnstileEnabled,
} from '../lib/turnstile.js';

function loadTurnstileScript() {
  if (typeof window === 'undefined') {
    return Promise.resolve();
  }

  if (window.turnstile) {
    return Promise.resolve();
  }

  const existingScript = document.querySelector('script[data-turnstile-script="true"]');
  if (existingScript) {
    return new Promise((resolve, reject) => {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Turnstile.')), {
        once: true,
      });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = getTurnstileScriptUrl();
    script.async = true;
    script.defer = true;
    script.dataset.turnstileScript = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Turnstile.'));
    document.head.appendChild(script);
  });
}

export function TurnstileProvider({ children }) {
  const siteKey = getTurnstileSiteKey();
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const pendingRequestRef = useRef(null);
  const queueRef = useRef(Promise.resolve());

  useEffect(() => {
    if (!isTurnstileEnabled()) {
      configureTurnstileTokenRequester(async () => null);
      return undefined;
    }

    let isDisposed = false;

    const rejectPending = (message) => {
      if (!pendingRequestRef.current) {
        return;
      }

      pendingRequestRef.current.reject(new Error(message));
      pendingRequestRef.current = null;
    };

    const mountWidget = async () => {
      await loadTurnstileScript();
      if (isDisposed || !containerRef.current || !window.turnstile) {
        return;
      }

      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        size: 'invisible',
        callback: (token) => {
          const pendingRequest = pendingRequestRef.current;
          pendingRequestRef.current = null;
          if (widgetIdRef.current !== null) {
            window.turnstile.reset(widgetIdRef.current);
          }
          pendingRequest?.resolve(token);
        },
        'error-callback': () => {
          if (widgetIdRef.current !== null) {
            window.turnstile.reset(widgetIdRef.current);
          }
          rejectPending('Turnstile verification failed. Please try again.');
        },
        'expired-callback': () => {
          if (widgetIdRef.current !== null) {
            window.turnstile.reset(widgetIdRef.current);
          }
          rejectPending('Turnstile token expired. Please try again.');
        },
      });
    };

    configureTurnstileTokenRequester(() => {
      queueRef.current = queueRef.current.then(
        () =>
          new Promise((resolve, reject) => {
            if (!window.turnstile || widgetIdRef.current === null) {
              reject(new Error('Turnstile is not ready yet. Please try again.'));
              return;
            }

            pendingRequestRef.current = { resolve, reject };

            try {
              window.turnstile.execute(widgetIdRef.current);
            } catch (error) {
              pendingRequestRef.current = null;
              reject(error instanceof Error ? error : new Error('Turnstile execution failed.'));
            }
          }),
      );

      return queueRef.current;
    });

    void mountWidget().catch(() => {
      rejectPending('Turnstile could not be loaded.');
    });

    return () => {
      isDisposed = true;
      configureTurnstileTokenRequester(null);
      rejectPending('Turnstile is unavailable.');
      if (widgetIdRef.current !== null && window.turnstile?.remove) {
        window.turnstile.remove(widgetIdRef.current);
      }
    };
  }, [siteKey]);

  return (
    <>
      {children}
      <div ref={containerRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', opacity: 0 }} />
    </>
  );
}