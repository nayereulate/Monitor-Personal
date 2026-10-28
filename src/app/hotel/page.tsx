'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/Icon';
import { F, IsoRoom, THEMES, W } from '@/components/IsoRoom';
import { Win } from '@/components/Win';
import { ROOMS } from '@/lib/rooms';
import { useItems, usePlayer } from '@/lib/session';
import { levelFromXP } from '@/lib/types';

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export default function Lobby() {
  const router = useRouter();
  const { profile } = usePlayer();
  const { items } = useItems(['note', 'goal', 'project', 'idea', 'event', 'session', 'outfit', 'file']);
  const lvl = levelFromXP(profile.xp);
  const go = (slug: string) => () => router.push(`/hotel/${slug}`);

  const count = (k: string) => items.filter((i) => i.kind === k).length;
  const today = new Date();
  const dow = (today.getDay() + 6) % 7; // 0 = lunes
  const events = items
    .filter((i) => i.kind === 'event' && i.data.day === dow)
    .sort((a, b) => a.data.start.localeCompare(b.data.start));
  const quests = items.filter((i) => i.kind === 'goal' && !i.data.done).slice(0, 5);
  const todayKey = today.toISOString().slice(0, 10);
  const pomosToday = items.filter((i) => i.kind === 'session' && i.created_at.slice(0, 10) === todayKey).length;

  const counts: Record<string, string> = {
    estudio: `${count('note')} notas · ${count('file')} archivos`,
    metas: `${items.filter((i) => i.kind === 'goal' && !i.data.done).length} quests activas`,
    mapa: `${count('idea')} ideas`,
    armario: `${count('outfit')} outfits`,
    horario: `${events.length} bloques hoy`,
    focus: `${pomosToday} pomodoros hoy`,
    personaje: `nivel ${lvl.level} · ${profile.xp} XP`,
  };

  return (
    <main className="page">
      <div className="page-head">
        <div className="grow">
          <span className="kicker">LOBBY · {DAYS[today.getDay()].toUpperCase()}</span>
          <h1 className="glitch" data-text={`HOLA, ${profile.display_name.toUpperCase()}`}>
            HOLA, {profile.display_name.toUpperCase()}
          </h1>
          <p>Elige una sala. Haz click en los muebles del lobby o usa <kbd>Ctrl</kbd>+<kbd>K</kbd> para saltar a cualquier lado.</p>
        </div>
      </div>

      <div className="split split--wide">
        <Win title="lobby.room · click en los muebles para entrar" flush>
          <IsoRoom
            cols={9}
            rows={9}
            theme={THEMES.violet}
            avatar={profile.avatar}
            start={[5, 6]}
            walls={[
              W.poster('right', 0.6, '#00f0ff', { id: 'p1', label: 'ESTUDIO', onClick: go('estudio') }),
              W.window('right', 2.4),
              W.poster('right', 4.6, '#ff2bd6', { id: 'p2', label: 'SALA FOCUS', onClick: go('focus') }),
              W.neon('right', 6, 8.6, '#ffe66d'),
              W.poster('left', 0.8, '#a239ff', { id: 'p3', label: 'MAPA MENTAL', onClick: go('mapa') }),
              W.shelf('left', 2.6),
              W.poster('left', 5.2, '#39ff88', { id: 'p4', label: 'QUESTS', onClick: go('metas') }),
            ]}
            furni={[
              { id: 'rug', x: 3, y: 3, boxes: F.rug(3, 3, '#3a1d6b') },
              { id: 'desk', x: 1, y: 0.2, boxes: F.desk(), label: 'ESTUDIO', onClick: go('estudio') },
              { id: 'shelf', x: 3.6, y: 0.1, boxes: F.bookshelf(), label: 'ESTUDIO', onClick: go('estudio') },
              { id: 'clock', x: 5.4, y: 0.1, boxes: F.hourglass(), label: 'SALA FOCUS', onClick: go('focus') },
              { id: 'cal', x: 6.4, y: 0.1, boxes: F.calendar(), label: 'HORARIO', onClick: go('horario') },
              { id: 'arcade', x: 0.1, y: 2.4, boxes: F.arcade(), label: 'ARCADE', onClick: go('arcade') },
              { id: 'chess', x: 0.4, y: 4.2, boxes: F.chessTable(), label: 'ARCADE', onClick: go('arcade') },
              { id: 'wardrobe', x: 0.1, y: 6, boxes: F.wardrobe('#6b3a8a'), label: 'ARMARIO', onClick: go('armario') },
              { id: 'sofa', x: 3.4, y: 3.4, boxes: F.sofa('#00b8c4', 2.2), label: 'MÚSICA & RELAX', onClick: go('relax') },
              { id: 'speaker', x: 6.4, y: 3.2, boxes: F.speaker(), label: 'MÚSICA & RELAX', onClick: go('relax') },
              { id: 'trophy', x: 7.8, y: 0.3, boxes: F.trophy(), label: 'QUESTS', onClick: go('metas') },
              { id: 'mirror', x: 2.2, y: 7.5, boxes: F.mirror(), label: 'PERSONAJE', onClick: go('personaje') },
              { id: 'nodes', x: 7.6, y: 6.6, boxes: F.nodes(), label: 'MAPA MENTAL', onClick: go('mapa') },
              { id: 'plant', x: 7.8, y: 2, boxes: F.plant() },
              { id: 'lamp', x: 2.4, y: 0.2, boxes: F.lamp('#ff2bd6') },
            ]}
          />
        </Win>

        <div className="stack">
          <Win title={`player.stats · LV${lvl.level}`} tone="yellow">
            <div className="stack" style={{ gap: 8 }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="px" style={{ fontSize: 10, color: 'var(--yellow)' }}>NIVEL {lvl.level}</span>
                <span className="muted">{profile.xp} / {lvl.next} XP</span>
              </div>
              <div className="bar">
                <span style={{ width: `${lvl.progress * 100}%`, ['--c' as string]: 'var(--yellow)' }} />
              </div>
              <span className="dim" style={{ fontSize: 16 }}>Gana XP completando pomodoros, quests y tareas.</span>
            </div>
          </Win>

          <Win title={`hoy.log · ${events.length} bloques`} tone="pink" actions={<Link className="btn btn-sm" href="/hotel/horario">VER</Link>}>
            {events.length ? (
              <ul className="stack" style={{ listStyle: 'none', margin: 0, padding: 0, gap: 6 }}>
                {events.map((e) => (
                  <li key={e.id} className="row" style={{ borderLeft: `4px solid ${e.data.color}`, paddingLeft: 8 }}>
                    <span className="muted">{e.data.start}–{e.data.end}</span> <span>{e.title}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="dim" style={{ margin: 0 }}>Nada en el horario para hoy.</p>
            )}
          </Win>

          <Win title="quests.activas" tone="green" actions={<Link className="btn btn-sm" href="/hotel/metas">VER</Link>}>
            {quests.length ? (
              <ul className="stack" style={{ listStyle: 'none', margin: 0, padding: 0, gap: 8 }}>
                {quests.map((q) => {
                  const steps = q.data.steps ?? [];
                  const pct = steps.length ? steps.filter((s: { done: boolean }) => s.done).length / steps.length : 0;
                  return (
                    <li key={q.id} className="stack" style={{ gap: 4 }}>
                      <span>★ {q.title}</span>
                      <span className="bar">
                        <span style={{ width: `${pct * 100}%` }} />
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="dim" style={{ margin: 0 }}>Sin quests activas. ¡Crea una!</p>
            )}
          </Win>
        </div>
      </div>

      <h2 className="kicker" style={{ margin: '28px 0 12px' }}>&gt; MAPA DEL HOTEL</h2>
      <div className="grid" style={{ ['--min' as string]: '230px' }}>
        {ROOMS.map((r) => (
          <Link key={r.slug} href={`/hotel/${r.slug}`} className="card" style={{ ['--c' as string]: r.color, ['--accent' as string]: r.color }}>
            <div className="row">
              <span className="icon-tile icon-tile--sm">
                <Icon name={r.icon} />
              </span>
              <span className="kicker" style={{ fontSize: 7 }}>{r.floor}</span>
            </div>
            <h3 className="card__title">{r.name}</h3>
            <span className="muted" style={{ fontSize: 17 }}>{counts[r.slug] ?? r.desc}</span>
            <span className="px" style={{ fontSize: 8, color: r.color, marginTop: 'auto' }}>
              ENTRAR <Icon name="arrow-right" />
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
