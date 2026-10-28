'use client';

import { useEffect, type ReactNode } from 'react';
import { Icon } from './Icon';
import { Win } from './Win';

export function Modal({
  title,
  onClose,
  children,
  wide,
  actions,
}: {
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  actions?: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="modal__backdrop" onClick={onClose} />
      <div className={`modal__panel${wide ? ' modal__panel--wide' : ''}`}>
        <Win
          title={title}
          actions={
            <>
              {actions}
              <button className="icon-btn" onClick={onClose} aria-label="Cerrar">
                <Icon name="x" />
              </button>
            </>
          }
        >
          {children}
        </Win>
      </div>
    </div>
  );
}
