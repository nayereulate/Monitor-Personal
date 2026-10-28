'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { roomBySlug } from '@/lib/rooms';
import { Icon } from './Icon';

/** Cabecera común de cada sala + escena isométrica plegable. */
export function RoomShell({ slug, scene, actions, children }: { slug: string; scene?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  const room = roomBySlug(slug)!;
  const key = `lifeexe:scene:${slug}`;
  const [showScene, setShowScene] = useState(true);

  useEffect(() => {
    try {
      if (localStorage.getItem(key) === 'off') setShowScene(false);
    } catch {}
  }, [key]);

  const toggle = () => {
    setShowScene((s) => {
      try {
        localStorage.setItem(key, s ? 'off' : 'on');
      } catch {}
      return !s;
    });
  };

  return (
    <main className="page">
      <div className="page-head">
        <span className="icon-tile" style={{ ['--accent' as string]: room.color }}>
          <Icon name={room.icon} />
        </span>
        <div className="grow">
          <span className="kicker">{room.floor} · SALA</span>
          <h1 className="glitch" data-text={room.name.toUpperCase()}>
            {room.name.toUpperCase()}
          </h1>
          <p>{room.desc}</p>
        </div>
        <div className="row">
          {actions}
          {scene && (
            <button className="btn btn-sm" onClick={toggle} aria-pressed={showScene}>
              <Icon name="eye" /> {showScene ? 'OCULTAR SALA' : 'VER SALA'}
            </button>
          )}
        </div>
      </div>
      {scene && showScene && (
        <div className="win" style={{ marginBottom: 18 }}>
          <div className="win-bar">
            <i />
            <i />
            <i />
            <span className="win-title">{room.slug}.room · haz click en los muebles o en el suelo para caminar</span>
          </div>
          <div className="room-scene">{scene}</div>
        </div>
      )}
      {children}
    </main>
  );
}
