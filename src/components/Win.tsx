import type { ReactNode } from 'react';

/** Ventana con barra de título estilo nayer.dev (tres pixeles de colores). */
export function Win({
  title,
  actions,
  tone,
  children,
  flush,
  className = '',
  style,
}: {
  title: ReactNode;
  actions?: ReactNode;
  tone?: 'pink' | 'yellow' | 'green';
  children: ReactNode;
  flush?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <section className={`win${tone ? ` win--${tone}` : ''} ${className}`} style={style}>
      <div className="win-bar">
        <i />
        <i />
        <i />
        <span className="win-title">{title}</span>
        {actions && <span className="win-actions">{actions}</span>}
      </div>
      <div className={flush ? 'win-body--flush' : 'win-body'}>{children}</div>
    </section>
  );
}
