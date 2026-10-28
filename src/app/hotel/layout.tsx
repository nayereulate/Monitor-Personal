'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Background } from '@/components/Background';
import { CommandPalette } from '@/components/CommandPalette';
import { Icon } from '@/components/Icon';
import { PixelAvatar } from '@/components/PixelAvatar';
import { BRAND, ROOMS } from '@/lib/rooms';
import { PlayerProvider, usePlayer, useSession } from '@/lib/session';
import { levelFromXP } from '@/lib/types';

function Hud() {
  const pathname = usePathname();
  const { profile } = usePlayer();
  const { signOut, mode } = useSession();
  const router = useRouter();
  const lvl = levelFromXP(profile.xp);
  const [fxOff, setFxOff] = useState(false);

  useEffect(() => {
    try {
      setFxOff(localStorage.getItem('lifeexe:fx') === 'off');
    } catch {}
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle('fx-off', fxOff);
  }, [fxOff]);
  const toggleFx = () => {
    const next = !fxOff;
    setFxOff(next);
    try {
      localStorage.setItem('lifeexe:fx', next ? 'off' : 'on');
    } catch {}
  };

  return (
    <header className="hud">
      <Link href="/hotel" className="hud__brand">
        {BRAND}
      </Link>
      <nav className="hud__nav" aria-label="Salas">
        <Link href="/hotel" className={pathname === '/hotel' ? 'is-active' : ''}>
          <Icon name="home" /> <span>Lobby</span>
        </Link>
        {ROOMS.map((r) => (
          <Link key={r.slug} href={`/hotel/${r.slug}`} title={r.name} className={pathname.startsWith(`/hotel/${r.slug}`) ? 'is-active' : ''}>
            <Icon name={r.icon} /> <span>{r.name}</span>
          </Link>
        ))}
      </nav>
      <div className="row row--tight" style={{ marginLeft: 'auto', flexWrap: 'nowrap' }}>
        <button className="icon-btn" onClick={() => window.dispatchEvent(new Event('open-cmdk'))} aria-label="Buscar (Ctrl+K)" title="Buscar (Ctrl+K)">
          <Icon name="search" />
        </button>
        <button className={`icon-btn${fxOff ? '' : ' is-on'}`} onClick={toggleFx} aria-label="Efectos visuales" title="Efectos CRT on/off">
          <Icon name="zap" />
        </button>
        <Link href="/hotel/personaje" className="hud__player" title={mode === 'local' ? 'Modo local' : 'Cuenta en la nube'}>
          <span className="hud__avatar">
            <PixelAvatar avatar={profile.avatar} />
          </span>
          <span className="hud__stats">
            <span className="hud__name">
              {profile.display_name} <span className="hud__lvl">LV{lvl.level}</span>
            </span>
            <span className="bar" title={`${profile.xp} / ${lvl.next} XP`}>
              <span style={{ width: `${Math.round(lvl.progress * 100)}%`, ['--c' as string]: 'var(--yellow)' }} />
            </span>
          </span>
        </Link>
        <button
          className="icon-btn"
          aria-label="Salir"
          title="Salir"
          onClick={async () => {
            await signOut();
            router.replace('/');
          }}
        >
          <Icon name="logout" />
        </button>
      </div>
    </header>
  );
}

export default function HotelLayout({ children }: { children: React.ReactNode }) {
  const { ready, user } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (ready && !user) router.replace('/login');
  }, [ready, user, router]);

  if (!ready || !user) {
    return (
      <>
        <Background calm />
        <main className="landing" style={{ justifyContent: 'center', alignItems: 'center' }}>
          <p className="kicker blink">CARGANDO PARTIDA...</p>
        </main>
      </>
    );
  }

  return (
    <PlayerProvider>
      <Background calm />
      <div className="shell">
        <Hud />
        {children}
      </div>
      <CommandPalette />
    </PlayerProvider>
  );
}
