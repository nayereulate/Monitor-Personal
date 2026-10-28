'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ROOMS } from '@/lib/rooms';
import { useStore } from '@/lib/session';
import type { Item } from '@/lib/types';
import { KIND_LABEL, KIND_ROOM } from '@/lib/rooms';
import { Icon, type IconName } from './Icon';
import { Win } from './Win';

interface Entry {
  label: string;
  hint?: string;
  icon: IconName;
  href: string;
}

/** Ctrl/Cmd+K: saltar a cualquier sala o buscar en todo lo guardado. */
export function CommandPalette() {
  const router = useRouter();
  const store = useStore();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const [items, setItems] = useState<Item[]>([]);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    const onOpen = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('open-cmdk', onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('open-cmdk', onOpen);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    setQ('');
    setActive(0);
    store.listItems().then((list) => setItems(list.filter((i) => KIND_ROOM[i.kind])));
  }, [open, store]);

  const entries = useMemo<Entry[]>(() => {
    const rooms: Entry[] = [
      { label: 'Lobby del hotel', icon: 'home', href: '/hotel' },
      ...ROOMS.map((r) => ({ label: r.name, hint: 'SALA', icon: r.icon, href: `/hotel/${r.slug}` })),
    ];
    const term = q.trim().toLowerCase();
    if (!term) return rooms;
    const found: Entry[] = items
      .filter((i) => i.title.toLowerCase().includes(term))
      .slice(0, 20)
      .map((i) => ({
        label: i.title || '(sin título)',
        hint: KIND_LABEL[i.kind],
        icon: 'file',
        href: `/hotel/${KIND_ROOM[i.kind]}?open=${i.id}`,
      }));
    return [...rooms.filter((r) => r.label.toLowerCase().includes(term)), ...found];
  }, [q, items]);

  if (!open) return null;
  const go = (e: Entry) => {
    setOpen(false);
    router.push(e.href);
  };

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Buscar">
      <div className="modal__backdrop" onClick={() => setOpen(false)} />
      <div className="modal__panel" style={{ width: 'min(620px,100%)' }}>
        <Win title="buscar.exe" flush>
          <div className="row" style={{ padding: '12px 14px', borderBottom: '2px solid var(--line)' }}>
            <Icon name="search" />
            <input
              ref={input}
              autoFocus
              className="cmdk__input"
              placeholder="Ir a una sala o buscar notas, metas, ideas..."
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setActive(0);
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') (e.preventDefault(), setActive((a) => Math.min(a + 1, entries.length - 1)));
                if (e.key === 'ArrowUp') (e.preventDefault(), setActive((a) => Math.max(a - 1, 0)));
                if (e.key === 'Enter' && entries[active]) go(entries[active]);
              }}
            />
          </div>
          <ul className="cmdk__list">
            {entries.map((e, i) => (
              <li
                key={e.href + i}
                className={`cmdk__item${i === active ? ' is-active' : ''}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(e)}
              >
                <Icon name={e.icon} />
                <span style={{ flex: 1 }}>{e.label}</span>
                {e.hint && <span className="kicker" style={{ fontSize: 7 }}>{e.hint}</span>}
              </li>
            ))}
            {!entries.length && <li className="cmdk__item dim">Nada por aquí...</li>}
          </ul>
        </Win>
      </div>
    </div>
  );
}
