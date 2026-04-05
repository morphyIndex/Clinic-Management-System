import { useEffect } from 'react';
import { createPortal } from 'react-dom';

function getPortalRoot() {
  if (typeof document === 'undefined') {
    return null;
  }

  const existingRoot = document.getElementById('dialog-root');
  if (existingRoot) {
    return existingRoot;
  }

  const root = document.createElement('div');
  root.id = 'dialog-root';
  document.body.appendChild(root);
  return root;
}

export default function ModalPortal({ isOpen, onClose, children }) {
  const portalRoot = getPortalRoot();

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !portalRoot) {
    return null;
  }

  return createPortal(
    <div
      aria-modal="true"
      role="dialog"
      className="fixed inset-0 z-[100] bg-slate-950/40 backdrop-blur-sm px-4 py-10 overflow-y-auto"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose?.();
        }
      }}
    >
      {children}
    </div>,
    portalRoot,
  );
}
