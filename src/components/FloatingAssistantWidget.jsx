import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

function getFloatingPortalRoot() {
  if (typeof document === 'undefined') {
    return null;
  }

  const existingRoot = document.getElementById('floating-root');
  if (existingRoot) {
    return existingRoot;
  }

  const root = document.createElement('div');
  root.id = 'floating-root';
  document.body.appendChild(root);
  return root;
}

function getAvatarLabel(role, title) {
  if (role === 'assistant') {
    return 'AI';
  }

  const source = String(title ?? 'You')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (source.length === 0) {
    return 'YO';
  }

  return source.map((part) => part[0]?.toUpperCase() ?? '').join('');
}

function formatChatTime(value) {
  if (!value) {
    return '';
  }

  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function FloatingAssistantWidget({
  isOpen,
  onToggle,
  onClose,
  onReset,
  assistantMessages,
  assistantPrompt,
  onPromptChange,
  onSubmit,
  assistantResult,
  assistantError,
  isAssistantLoading,
  onUseDepartment,
  onAutoFillSlot,
}) {
  const [portalRoot, setPortalRoot] = useState(null);
  const threadRef = useRef(null);

  useEffect(() => {
    setPortalRoot(getFloatingPortalRoot());
  }, []);

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!threadRef.current) {
      return;
    }

    threadRef.current.scrollTo({
      top: threadRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [assistantMessages, isAssistantLoading, isOpen]);

  if (!portalRoot) {
    return null;
  }

  const hasConversation = assistantMessages.length > 1;

  return createPortal(
    <div className="pointer-events-none fixed inset-x-4 bottom-8 z-[90] flex justify-end sm:left-auto sm:right-8">
      <div className="flex max-w-full flex-col items-end gap-3">
        {isOpen && (
          <div className="pointer-events-auto flex w-[calc(100vw-2rem)] max-w-[25rem] max-h-[min(46rem,calc(100dvh-8rem))] flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
            <div className="shrink-0 border-b border-slate-100 bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.22),_transparent_40%),linear-gradient(135deg,_rgba(255,255,255,1),_rgba(248,250,252,0.98))] px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.3rem] bg-slate-900 text-sm font-black text-white shadow-lg shadow-slate-200">
                    AI
                    <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white bg-emerald-400" />
                  </div>
                  <div>
                    <h2 className="mt-1 text-lg font-bold text-slate-900">Smart Assistant</h2>
                    <p className="mt-1 text-xs text-slate-500">Talk naturally and I will guide the booking flow.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onReset}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    New
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>

            <div
              ref={threadRef}
              className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-slate-50/80 px-4 py-4"
            >
              {assistantMessages.map((message) => {
                const isUser = message.role === 'user';
                return (
                  <div key={message.id} className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
                    {!isUser && (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-xs font-black text-slate-900 shadow-sm">
                        {getAvatarLabel(message.role, message.title)}
                      </div>
                    )}

                    <div className={`flex max-w-[82%] flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                      <div
                        className={`rounded-[1.6rem] border px-4 py-3 shadow-sm ${isUser
                          ? 'border-indigo-200 bg-indigo-600 text-white'
                          : 'border-slate-200 bg-white text-slate-800'
                          }`}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <p className={`text-[11px] font-bold uppercase tracking-[0.18em] ${isUser ? 'text-indigo-100' : 'text-slate-400'}`}>
                            {message.title}
                          </p>
                          <span className={`text-[11px] ${isUser ? 'text-indigo-100/80' : 'text-slate-400'}`}>
                            {formatChatTime(message.createdAt)}
                          </span>
                        </div>
                        <p className={`mt-2 text-sm leading-6 ${isUser ? 'text-white' : 'text-slate-700'}`}>
                          {message.message}
                        </p>
                      </div>
                    </div>

                    {isUser && (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-xs font-black text-white shadow-sm">
                        {getAvatarLabel(message.role, message.title)}
                      </div>
                    )}
                  </div>
                );
              })}

              {isAssistantLoading && (
                <div className="flex gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-xs font-black text-slate-900 shadow-sm">
                    AI
                  </div>
                  <div className="rounded-[1.6rem] border border-slate-200 bg-white px-4 py-4 shadow-sm">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Clinic Assistant</p>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.2s]" />
                      <span className="h-2.5 w-2.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.1s]" />
                      <span className="h-2.5 w-2.5 rounded-full bg-indigo-400 animate-bounce" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {assistantResult && (
              <div className="shrink-0 border-t border-indigo-100 bg-indigo-50/80 px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-500">Recommendation</p>
                    <h3 className="mt-1 text-base font-bold text-slate-900">
                      {assistantResult.departmentName ?? 'General Medicine'}
                    </h3>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-indigo-700">
                    {assistantResult.urgency ?? 'routine'}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">{assistantResult.summary}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={onUseDepartment}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Use This Department
                  </button>
                  {assistantResult.canBook && (
                    <button
                      type="button"
                      onClick={onAutoFillSlot}
                      className="rounded-2xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                    >
                      Auto-fill Earliest Slot
                    </button>
                  )}
                </div>
              </div>
            )}

            <form className="shrink-0 border-t border-slate-100 bg-white px-4 py-5" onSubmit={onSubmit}>
              {assistantError && (
                <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {assistantError}
                </div>
              )}

              <div className="flex items-end gap-3">
                <textarea
                  rows="1"
                  value={assistantPrompt}
                  onChange={(event) => onPromptChange(event.target.value)}
                  placeholder="Describe your symptoms..."
                  className="min-h-[4rem] max-h-28 flex-1 resize-none rounded-3xl border border-slate-200 px-5 py-5 text-sm leading-6 text-slate-700 placeholder:text-[15px] placeholder:font-medium placeholder:leading-6 placeholder:text-slate-400 placeholder:opacity-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  disabled={isAssistantLoading}
                  className="shrink-0 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white shadow-lg transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {isAssistantLoading ? 'Replying...' : 'Send'}
                </button>
              </div>
            </form>
          </div>
        )}

        {!isOpen && (
          <div className="pointer-events-none hidden rounded-full border border-slate-200 bg-white/95 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-500 shadow-sm sm:block">
            Smart Assistant
          </div>
        )}

        <button
          type="button"
          onClick={onToggle}
          aria-label={isOpen ? 'Close smart assistant' : 'Open smart assistant'}
          className="pointer-events-auto relative flex h-16 w-16 items-center justify-center rounded-full bg-slate-900 text-sm font-black text-white shadow-[0_18px_45px_rgba(79,70,229,0.38)] transition-transform duration-200 hover:scale-105"
        >
          {!isOpen && <span className="absolute inset-0 rounded-full bg-indigo-500/25 animate-ping" />}
          <span className="relative">AI</span>
          {hasConversation && !isOpen && (
            <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full border-2 border-white bg-emerald-400" />
          )}
        </button>
      </div>
    </div>,
    portalRoot,
  );
}
