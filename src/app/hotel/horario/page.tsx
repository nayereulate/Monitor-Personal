'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/Icon';
import { F, IsoRoom, THEMES, W } from '@/components/IsoRoom';
import { Modal } from '@/components/Modal';
import { RoomShell } from '@/components/RoomShell';
import { PALETTE } from '@/lib/rooms';
import { useItems, usePlayer } from '@/lib/session';
import type { Item } from '@/lib/types';

interface EventData {
  day: number; // 0 = lunes
  start: string; // HH:MM
  end: string;
  color: string;
  place: string;
  notes: string;
}

const DAYS = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];
const FROM = 6;
const TO = 24;
const HOUR_PX = 48;

const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
};
const toTime = (min: number) => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

function EventEditor({ ev, init, onClose }: { ev: Item<EventData> | null; init: Partial<EventData>; onClose: () => void }) {
  const { create, update, remove } = useItems<EventData>('event');
  const [title, setTitle] = useState(ev?.title ?? '');
  const [d, setD] = useState<EventData>({ day: 0, start: '09:00', end: '10:00', color: '#ff8a3d', place: '', notes: '', ...init, ...ev?.data });
  const [repeat, setRepeat] = useState<number[]>([]);
  const [error, setError] = useState('');

  return (
    <Modal title={ev ? 'editar_bloque' : 'nuevo_bloque'} onClose={onClose}>
      <form
        className="stack"
        onSubmit={async (e) => {
          e.preventDefault();
          if (toMin(d.end) <= toMin(d.start)) return setError('La hora de fin debe ser posterior al inicio');
          if (ev) await update(ev.id, { title, data: d });
          else for (const day of [...new Set([d.day, ...repeat])]) await create('event', title, { ...d, day });
          onClose();
        }}
      >
        <label className="field">
          <span>ACTIVIDAD</span>
          <input className="input" required autoFocus placeholder="Ej: Clase de cálculo" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <div className="grid" style={{ ['--min' as string]: '120px', gap: 10 }}>
          <label className="field">
            <span>DÍA</span>
            <select className="select" value={d.day} onChange={(e) => setD({ ...d, day: Number(e.target.value) })}>
              {DAYS.map((x, i) => (
                <option key={x} value={i}>
                  {x}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>INICIO</span>
            <input className="input" type="time" required value={d.start} onChange={(e) => setD({ ...d, start: e.target.value })} />
          </label>
          <label className="field">
            <span>FIN</span>
            <input className="input" type="time" required value={d.end} onChange={(e) => setD({ ...d, end: e.target.value })} />
          </label>
        </div>
        {!ev && (
          <div className="field">
            <span>REPETIR TAMBIÉN EL...</span>
            <div className="row row--tight">
              {DAYS.map((x, i) =>
                i === d.day ? null : (
                  <button
                    type="button"
                    key={x}
                    className={`btn btn-sm${repeat.includes(i) ? ' btn-cyan' : ''}`}
                    onClick={() => setRepeat(repeat.includes(i) ? repeat.filter((r) => r !== i) : [...repeat, i])}
                  >
                    {x}
                  </button>
                ),
              )}
            </div>
          </div>
        )}
        <label className="field">
          <span>LUGAR</span>
          <input className="input" value={d.place} onChange={(e) => setD({ ...d, place: e.target.value })} />
        </label>
        <label className="field">
          <span>NOTAS</span>
          <textarea className="textarea" rows={2} value={d.notes} onChange={(e) => setD({ ...d, notes: e.target.value })} />
        </label>
        <div className="field">
          <span>COLOR</span>
          <div className="swatches">
            {PALETTE.map((c) => (
              <button type="button" key={c} className={`swatch${c === d.color ? ' is-on' : ''}`} style={{ background: c }} onClick={() => setD({ ...d, color: c })} aria-label={c} />
            ))}
          </div>
        </div>
        {error && <p style={{ color: 'var(--red)', margin: 0 }}>✖ {error}</p>}
        <div className="row" style={{ justifyContent: 'space-between' }}>
          {ev ? (
            <button type="button" className="btn btn-sm btn-danger" onClick={async () => (await remove(ev.id), onClose())}>
              <Icon name="trash" /> BORRAR
            </button>
          ) : (
            <span />
          )}
          <button className="btn btn-solid">
            <Icon name="save" /> GUARDAR
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Horario() {
  const params = useSearchParams();
  const { profile } = usePlayer();
  const { items } = useItems<EventData>('event');
  const [editing, setEditing] = useState<{ ev: Item<EventData> | null; init: Partial<EventData> } | null>(null);
  const [now, setNow] = useState(new Date());
  const today = (now.getDay() + 6) % 7;
  const [mobileDay, setMobileDay] = useState(today);
  const handled = useRef<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    const openId = params.get('open');
    const it = items.find((i) => i.id === openId);
    if (it && handled.current !== openId) {
      handled.current = openId;
      setEditing({ ev: it, init: {} });
    }
  }, [params, items]);

  const nowMin = now.getHours() * 60 + now.getMinutes();
  const totalH = TO - FROM;
  const weekMin = items.reduce((a, e) => a + Math.max(0, toMin(e.data.end) - toMin(e.data.start)), 0);

  return (
    <RoomShell
      slug="horario"
      actions={
        <button className="btn btn-sm btn-solid" onClick={() => setEditing({ ev: null, init: { day: today } })}>
          <Icon name="plus" /> BLOQUE
        </button>
      }
      scene={
        <IsoRoom
          theme={THEMES.wood}
          avatar={profile.avatar}
          walls={[W.poster('right', 1, '#ff8a3d'), W.window('right', 3), W.neon('left', 1, 6, '#ff8a3d')]}
          furni={[
            { id: 'cal', x: 1.2, y: 0.2, boxes: F.calendar(), label: 'NUEVO BLOQUE', onClick: () => setEditing({ ev: null, init: { day: today } }) },
            { id: 'clock', x: 6.6, y: 0.2, boxes: F.clock() },
            { id: 'table', x: 3, y: 3, boxes: F.table('#8a5a3c', 1.6, 1.2) },
            { id: 'chair', x: 3.4, y: 4.3, boxes: F.chair('#ff8a3d') },
            { id: 'plant', x: 0.2, y: 4, boxes: F.plant() },
            { id: 'lamp', x: 5, y: 0.2, boxes: F.lamp('#ff8a3d') },
          ]}
        />
      }
    >
      <p className="muted" style={{ marginTop: 0 }}>
        {items.length} bloques · {Math.round(weekMin / 60)} h planificadas a la semana · click en un hueco para añadir
      </p>
      <div className="row row--tight week-tabs">
        {DAYS.map((d, i) => (
          <button key={d} className={`btn btn-sm${i === mobileDay ? ' btn-cyan' : ''}`} onClick={() => setMobileDay(i)}>
            {d}
          </button>
        ))}
      </div>
      <div className="week" style={{ ['--hour' as string]: `${HOUR_PX}px` }}>
        <div className="week__corner" />
        {DAYS.map((d, i) => (
          <div key={d} className={`week__day-head${i === today ? ' is-today' : ''}${i === mobileDay ? ' is-mobile' : ''}`}>
            {d}
          </div>
        ))}
        <div className="week__hours">
          {Array.from({ length: totalH }, (_, h) => (
            <span key={h} style={{ height: HOUR_PX }}>{String(FROM + h).padStart(2, '0')}:00</span>
          ))}
        </div>
        {DAYS.map((d, day) => (
          <div
            key={d}
            className={`week__col${day === today ? ' is-today' : ''}${day === mobileDay ? ' is-mobile' : ''}`}
            style={{ height: totalH * HOUR_PX }}
            onClick={(e) => {
              if (e.target !== e.currentTarget) return;
              const y = e.nativeEvent.offsetY;
              const start = FROM * 60 + Math.floor(y / HOUR_PX) * 60;
              setEditing({ ev: null, init: { day, start: toTime(start), end: toTime(Math.min(start + 60, 23 * 60 + 59)) } });
            }}
          >
            {day === today && nowMin >= FROM * 60 && <div className="week__now" style={{ top: ((nowMin - FROM * 60) / 60) * HOUR_PX }} />}
            {items
              .filter((e) => e.data.day === day)
              .map((e) => {
                const s = Math.max(toMin(e.data.start), FROM * 60);
                const en = Math.min(toMin(e.data.end), TO * 60);
                if (en <= s) return null;
                return (
                  <button
                    key={e.id}
                    className="week__ev"
                    style={{ top: ((s - FROM * 60) / 60) * HOUR_PX, height: Math.max(20, ((en - s) / 60) * HOUR_PX - 2), ['--c' as string]: e.data.color }}
                    onClick={() => setEditing({ ev: e, init: {} })}
                    title={`${e.title} · ${e.data.start}–${e.data.end}${e.data.place ? ' · ' + e.data.place : ''}`}
                  >
                    <strong>{e.title}</strong>
                    <span>
                      {e.data.start}–{e.data.end}
                      {e.data.place && ` · ${e.data.place}`}
                    </span>
                  </button>
                );
              })}
          </div>
        ))}
      </div>
      {editing && <EventEditor ev={editing.ev} init={editing.init} onClose={() => setEditing(null)} />}
    </RoomShell>
  );
}

export default function Page() {
  return (
    <Suspense>
      <Horario />
    </Suspense>
  );
}
