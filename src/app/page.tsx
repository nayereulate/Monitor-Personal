'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Background } from '@/components/Background';
import { Icon, Invader } from '@/components/Icon';
import { PixelAvatar } from '@/components/PixelAvatar';
import { BRAND, ROOMS } from '@/lib/rooms';
import { useSession } from '@/lib/session';
import { DEFAULT_AVATAR } from '@/lib/types';

const LINES = ['tu vida, en modo videojuego', 'notas · metas · pomodoros · ideas', 'sube de nivel cada día'];

function useTyped(lines: string[]) {
  const [text, setText] = useState('');
  useEffect(() => {
    let line = 0, i = 0, del = false;
    const id = setInterval(() => {
      const full = lines[line];
      i += del ? -1 : 1;
      setText(full.slice(0, i));
      if (!del && i === full.length + 12) del = true;
      if (del && i === 0) {
        del = false;
        line = (line + 1) % lines.length;
      }
    }, 70);
    return () => clearInterval(id);
  }, [lines]);
  return text;
}

export default function Landing() {
  const { user } = useSession();
  const typed = useTyped(LINES);

  return (
    <>
      <Background />
      <main className="landing">
        <section className="hero">
          <div className="sun" aria-hidden="true" />
          <div className="avatar-frame">
            <PixelAvatar avatar={DEFAULT_AVATAR} title="Avatar de ejemplo" />
          </div>
          <div className="row" style={{ justifyContent: 'center', marginBottom: 12 }}>
            <span className="badge" style={{ ['--c' as string]: 'var(--cyan)' }}>NOTAS</span>
            <span className="badge" style={{ ['--c' as string]: 'var(--pink)' }}>QUESTS</span>
            <span className="badge" style={{ ['--c' as string]: 'var(--yellow)' }}>ARCADE</span>
          </div>
          <h1 className="glitch" data-text={BRAND}>{BRAND}</h1>
          <p className="hero-sub">
            {typed}
            <span className="cursor">_</span>
          </p>
          <p className="kicker blink" style={{ marginBottom: 22 }}>&gt; PRESS START</p>
          <div className="row" style={{ justifyContent: 'center', gap: 18 }}>
            <Link className="btn btn-solid btn-big" href={user ? '/hotel' : '/login?mode=signup'}>
              <Icon name="gamepad" /> {user ? 'CONTINUAR PARTIDA' : 'NUEVA PARTIDA'}
            </Link>
            {!user && (
              <Link className="btn btn-big" href="/login">
                <Icon name="key" /> CARGAR PARTIDA
              </Link>
            )}
          </div>
        </section>

        <section className="feature-grid" aria-label="Salas">
          {ROOMS.map((r) => (
            <article key={r.slug} className="win feature" style={{ ['--accent' as string]: r.color }}>
              <span className="icon-tile">
                <Icon name={r.icon} />
              </span>
              <h3>{r.name.toUpperCase()}</h3>
              <p>{r.desc}</p>
            </article>
          ))}
        </section>

        <footer className="footer">
          <p style={{ margin: 0 }}>
            PRESS START © {new Date().getFullYear()} · {BRAND} · tus datos son privados · hecho con <Invader /> pixel power
          </p>
        </footer>
      </main>
    </>
  );
}
