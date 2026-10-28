'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@/components/Icon';
import { F, IsoRoom, THEMES, W } from '@/components/IsoRoom';
import { Modal } from '@/components/Modal';
import { RoomShell } from '@/components/RoomShell';
import { Win } from '@/components/Win';
import { PALETTE } from '@/lib/rooms';
import { useItems, usePlayer, useSession, useStore } from '@/lib/session';

interface Preset {
  id: string;
  name: string;
  focus: number;
  short: number;
  long: number;
  cycles: number;
  color: string;
}

const BUILTIN: Preset[] = [
  { id: 'classic', name: 'Clásico', focus: 25, short: 5, long: 15, cycles: 4, color: '#ff2bd6' },
  { id: 'deep', name: 'Deep Work', focus: 50, short: 10, long: 30, cycles: 3, color: '#00f0ff' },
  { id: 'sprint', name: 'Sprint', focus: 15, short: 3, long: 10, cycles: 4, color: '#ffe66d' },
];

type Phase = 'focus' | 'short' | 'long';
const PHASE_LABEL: Record<Phase, string> = { focus: 'FOCUS', short: 'DESCANSO', long: 'DESCANSO LARGO' };

interface TimerState {
  presetId: string;
  phase: Phase;
  cycle: number; // pomodoros de foco completados en esta ronda
  endAt: number | null; // corriendo
  remaining: number; // ms, cuando está en pausa
  task: string;
}

function beep() {
  try {
    const ctx = new AudioContext();
    [0, 0.18, 0.36].forEach((t, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'square';
      o.frequency.value = [660, 880, 1320][i];
      g.gain.setValueAtTime(0.08, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.16);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.17);
    });
  } catch {}
}

const fmt = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

export default function Focus() {
  const { user } = useSession();
  const store = useStore();
  const { profile, addXP } = usePlayer();
  const { items: custom, create, update, remove } = useItems<Omit<Preset, 'id' | 'name'>>('timer');
  const { items: sessions } = useItems<{ minutes: number; preset: string; task: string }>('session');

  const presets: Preset[] = useMemo(() => [...BUILTIN, ...custom.map((c) => ({ ...c.data, id: c.id, name: c.title }))], [custom]);
  const KEY = `lifeexe:${user!.id}:timer`;

  const [state, setState] = useState<TimerState>({ presetId: 'classic', phase: 'focus', cycle: 0, endAt: null, remaining: 25 * 60000, task: '' });
  const [now, setNow] = useState(Date.now());
  const [editing, setEditing] = useState<Preset | null>(null);
  const loaded = useRef(false);

  const preset = presets.find((p) => p.id === state.presetId) ?? BUILTIN[0];
  const phaseMs = (p: Preset, ph: Phase) => (ph === 'focus' ? p.focus : ph === 'short' ? p.short : p.long) * 60000;

  // restaurar temporizador al volver a la sala
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setState(JSON.parse(raw));
    } catch {}
    loaded.current = true;
  }, [KEY]);
  useEffect(() => {
    if (loaded.current) localStorage.setItem(KEY, JSON.stringify(state));
  }, [state, KEY]);

  const left = state.endAt ? state.endAt - now : state.remaining;
  const total = phaseMs(preset, state.phase);

  const complete = useCallback(async () => {
    beep();
    if (state.phase === 'focus') {
      await store.createItem('session', state.task || preset.name, { minutes: preset.focus, preset: preset.name, task: state.task });
      await addXP(Math.round(preset.focus), 'pomodoro');
      if ('Notification' in window && Notification.permission === 'granted') new Notification('¡Pomodoro completado! Toca descansar ☕');
      const cycle = state.cycle + 1;
      const phase: Phase = cycle % preset.cycles === 0 ? 'long' : 'short';
      setState((s) => ({ ...s, phase, cycle, endAt: Date.now() + phaseMs(preset, phase), remaining: phaseMs(preset, phase) }));
    } else {
      if ('Notification' in window && Notification.permission === 'granted') new Notification('Descanso terminado. ¡A por otro! 🎯');
      setState((s) => ({ ...s, phase: 'focus', endAt: null, remaining: phaseMs(preset, 'focus') }));
    }
  }, [state, preset, store, addXP]);

  useEffect(() => {
    if (!state.endAt) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [state.endAt]);

  const completing = useRef(false);
  useEffect(() => {
    if (state.endAt && left <= 0 && !completing.current) {
      completing.current = true;
      complete().finally(() => (completing.current = false));
    }
  }, [left, state.endAt, complete]);

  useEffect(() => {
    document.title = state.endAt ? `${fmt(left)} · ${PHASE_LABEL[state.phase]}` : 'LIFE.EXE';
    return () => {
      document.title = 'LIFE.EXE';
    };
  }, [left, state.endAt, state.phase]);

  const start = () => {
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
    setNow(Date.now());
    setState((s) => ({ ...s, endAt: Date.now() + s.remaining }));
  };
  const pause = () => setState((s) => ({ ...s, endAt: null, remaining: Math.max(0, (s.endAt ?? 0) - Date.now()) }));
  const reset = (p = preset, phase: Phase = 'focus') => setState((s) => ({ ...s, presetId: p.id, phase, endAt: null, remaining: phaseMs(p, phase), cycle: phase === 'focus' ? s.cycle : s.cycle }));
  const skip = () => {
    const phase: Phase = state.phase === 'focus' ? 'short' : 'focus';
    reset(preset, phase);
  };

  // estadísticas de la semana
  const days = useMemo(() => {
    const out: { label: string; min: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      out.push({
        label: ['D', 'L', 'M', 'X', 'J', 'V', 'S'][d.getDay()],
        min: sessions.filter((s) => s.created_at.slice(0, 10) === key).reduce((a, s) => a + (s.data.minutes || 0), 0),
      });
    }
    return out;
  }, [sessions]);
  const maxMin = Math.max(25, ...days.map((d) => d.min));
  const todayCount = sessions.filter((s) => s.created_at.slice(0, 10) === new Date().toISOString().slice(0, 10)).length;

  const SEGMENTS = 30;
  const filled = Math.round((1 - left / total) * SEGMENTS);
  const color = state.phase === 'focus' ? preset.color : '#39ff88';

  return (
    <RoomShell
      slug="focus"
      scene={
        <IsoRoom
          theme={THEMES.rose}
          avatar={profile.avatar}
          walls={[W.window('right', 1), W.neon('right', 3.4, 7, '#ff2bd6'), W.poster('left', 1.4, '#00f0ff'), W.shelf('left', 3.6)]}
          furni={[
            { id: 'rug', x: 2, y: 2, boxes: F.rug(4, 3, '#5a1a50') },
            { id: 'desk', x: 3, y: 0.2, boxes: F.desk('#6b3a8a'), label: 'EMPEZAR FOCUS', onClick: start },
            { id: 'chair', x: 3.6, y: 1.2, boxes: F.chair() },
            { id: 'hour', x: 5.4, y: 0.3, boxes: F.hourglass(), label: 'REINICIAR', onClick: () => reset() },
            { id: 'clock', x: 0.2, y: 0.4, boxes: F.clock() },
            { id: 'plant', x: 0.2, y: 5.6, boxes: F.plant() },
            { id: 'bean', x: 0.6, y: 3, boxes: F.beanbag('#ff2bd6'), label: 'DESCANSO', onClick: () => reset(preset, 'short') },
            { id: 'lamp', x: 6.6, y: 0.4, boxes: F.lamp('#00f0ff') },
          ]}
        />
      }
    >
      <div className="split split--wide">
        <Win title={`pomodoro.exe · ${preset.name}`} tone="pink">
          <div className="timer" style={{ ['--c' as string]: color }}>
            <span className="kicker" style={{ color }}>
              {PHASE_LABEL[state.phase]} · {state.cycle} POMODORO{state.cycle === 1 ? '' : 'S'} · DESCANSO LARGO CADA {preset.cycles}
            </span>
            <div className="timer__digits">{fmt(left)}</div>
            <div className="timer__segs" aria-hidden="true">
              {Array.from({ length: SEGMENTS }, (_, i) => (
                <span key={i} className={i < filled ? 'on' : ''} />
              ))}
            </div>
            <input className="input" style={{ textAlign: 'center', maxWidth: 420 }} placeholder="¿En qué te vas a enfocar?" value={state.task} onChange={(e) => setState((s) => ({ ...s, task: e.target.value }))} />
            <div className="row" style={{ justifyContent: 'center' }}>
              {state.endAt ? (
                <button className="btn btn-big" onClick={pause}>
                  <Icon name="pause" /> PAUSA
                </button>
              ) : (
                <button className="btn btn-solid btn-big" onClick={start}>
                  <Icon name="play" /> {left < total ? 'SEGUIR' : 'START'}
                </button>
              )}
              <button className="btn" onClick={() => reset(preset, state.phase)} title="Reiniciar fase">
                <Icon name="reset" />
              </button>
              <button className="btn" onClick={skip} title="Saltar fase">
                <Icon name="arrow-right" />
              </button>
            </div>
            <p className="dim" style={{ margin: 0, fontSize: 16 }}>Cada pomodoro de foco completado = +{preset.focus} XP. El tiempo sigue aunque cambies de sala.</p>
          </div>
        </Win>

        <div className="stack">
          <Win
            title="presets"
            actions={
              <button className="btn btn-sm btn-solid" onClick={() => setEditing({ id: '', name: 'Mi pomodoro', focus: 30, short: 5, long: 20, cycles: 4, color: '#a239ff' })}>
                <Icon name="plus" /> CREAR
              </button>
            }
          >
            <ul className="preset-list">
              {presets.map((p) => (
                <li key={p.id} className={p.id === preset.id ? 'is-active' : ''} style={{ ['--c' as string]: p.color }}>
                  <button className="grow" onClick={() => reset(p)}>
                    <span className="preset-dot" />
                    <span className="grow">{p.name}</span>
                    <span className="dim">{p.focus}/{p.short}/{p.long} ×{p.cycles}</span>
                  </button>
                  {!BUILTIN.some((b) => b.id === p.id) && (
                    <button className="icon-btn" onClick={() => setEditing(p)} aria-label="Editar preset">
                      <Icon name="edit" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </Win>

          <Win title={`stats · ${todayCount} hoy`} tone="green">
            <div className="mini-chart" role="img" aria-label="Minutos de foco en los últimos 7 días">
              {days.map((d, i) => (
                <div key={i} className="mini-chart__col" title={`${d.min} min`}>
                  <span className="mini-chart__val">{d.min || ''}</span>
                  <span className="mini-chart__bar" style={{ height: `${(d.min / maxMin) * 100}%` }} />
                  <span className="mini-chart__lbl">{d.label}</span>
                </div>
              ))}
            </div>
            <p className="dim" style={{ margin: '8px 0 0', fontSize: 16 }}>
              {sessions.length} pomodoros en total · {sessions.reduce((a, s) => a + (s.data.minutes || 0), 0)} min de foco
            </p>
          </Win>
        </div>
      </div>

      {editing && (
        <Modal title={editing.id ? 'editar_preset' : 'nuevo_preset'} onClose={() => setEditing(null)}>
          <form
            className="stack"
            onSubmit={async (e) => {
              e.preventDefault();
              const { id, name, ...data } = editing;
              if (id) await update(id, { title: name, data });
              else await create('timer', name, data);
              setEditing(null);
            }}
          >
            <label className="field">
              <span>NOMBRE</span>
              <input className="input" required value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </label>
            <div className="grid" style={{ ['--min' as string]: '110px', gap: 10 }}>
              {(['focus', 'short', 'long', 'cycles'] as const).map((k) => (
                <label key={k} className="field">
                  <span>{{ focus: 'FOCUS MIN', short: 'DESCANSO', long: 'DESC. LARGO', cycles: 'RONDAS' }[k]}</span>
                  <input className="input" type="number" min={1} max={k === 'cycles' ? 12 : 180} required value={editing[k]} onChange={(e) => setEditing({ ...editing, [k]: Number(e.target.value) })} />
                </label>
              ))}
            </div>
            <div className="field">
              <span>COLOR</span>
              <div className="swatches">
                {PALETTE.map((c) => (
                  <button type="button" key={c} className={`swatch${c === editing.color ? ' is-on' : ''}`} style={{ background: c }} onClick={() => setEditing({ ...editing, color: c })} aria-label={c} />
                ))}
              </div>
            </div>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              {editing.id ? (
                <button
                  type="button"
                  className="btn btn-sm btn-danger"
                  onClick={async () => {
                    await remove(editing.id);
                    if (state.presetId === editing.id) reset(BUILTIN[0]);
                    setEditing(null);
                  }}
                >
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
      )}
    </RoomShell>
  );
}
