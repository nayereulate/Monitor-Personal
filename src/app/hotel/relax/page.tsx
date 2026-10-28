'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/Icon';
import { F, IsoRoom, THEMES, W } from '@/components/IsoRoom';
import { Modal } from '@/components/Modal';
import { RoomShell } from '@/components/RoomShell';
import { Win } from '@/components/Win';
import { useItems, usePlayer } from '@/lib/session';
import type { Item } from '@/lib/types';

/* ---------------- Plataformas ---------------- */
interface LinkData {
  url: string;
  platform: string;
  note: string;
}

const PLATFORMS: Record<string, { label: string; color: string; home: string }> = {
  spotify: { label: 'SPOTIFY', color: '#1ed760', home: 'https://open.spotify.com' },
  youtube: { label: 'YOUTUBE', color: '#ff3b3b', home: 'https://www.youtube.com' },
  tiktok: { label: 'TIKTOK', color: '#25f4ee', home: 'https://www.tiktok.com' },
  soundcloud: { label: 'SOUNDCLOUD', color: '#ff7700', home: 'https://soundcloud.com' },
  twitch: { label: 'TWITCH', color: '#a970ff', home: 'https://www.twitch.tv' },
  apple: { label: 'APPLE MUSIC', color: '#fa2d48', home: 'https://music.apple.com' },
  instagram: { label: 'INSTAGRAM', color: '#ff2bd6', home: 'https://www.instagram.com' },
  otro: { label: 'LINK', color: '#a9a9d4', home: '' },
};

function detect(url: string) {
  const u = url.toLowerCase();
  if (u.includes('spotify.com')) return 'spotify';
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
  if (u.includes('tiktok.com')) return 'tiktok';
  if (u.includes('soundcloud.com')) return 'soundcloud';
  if (u.includes('twitch.tv')) return 'twitch';
  if (u.includes('music.apple.com')) return 'apple';
  if (u.includes('instagram.com')) return 'instagram';
  return 'otro';
}

/** URL del reproductor embebido, si la plataforma lo permite. */
function embedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace('www.', '');
    if (host === 'open.spotify.com') {
      const m = u.pathname.match(/(track|album|playlist|artist|episode|show)\/([A-Za-z0-9]+)/);
      return m ? `https://open.spotify.com/embed/${m[1]}/${m[2]}?theme=0` : null;
    }
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      const list = u.searchParams.get('list');
      const v = u.searchParams.get('v') ?? u.pathname.match(/\/(shorts|live|embed)\/([\w-]+)/)?.[2];
      if (v) return `https://www.youtube.com/embed/${v}${list ? `?list=${list}` : ''}`;
      if (list) return `https://www.youtube.com/embed/videoseries?list=${list}`;
      return null;
    }
    if (host === 'youtu.be') return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    if (host === 'tiktok.com') {
      const m = u.pathname.match(/video\/(\d+)/);
      return m ? `https://www.tiktok.com/embed/v2/${m[1]}` : null;
    }
    if (host === 'soundcloud.com') return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23ff2bd6&visual=true`;
    if (host === 'music.apple.com') return url.replace('music.apple.com', 'embed.music.apple.com');
    return null;
  } catch {
    return null;
  }
}

/* ---------------- Sonidos ambiente (WebAudio, sin archivos) ---------------- */
type SoundId = 'rain' | 'waves' | 'wind' | 'brown';
const SOUNDS: { id: SoundId; label: string; icon: string }[] = [
  { id: 'rain', label: 'LLUVIA', icon: '🌧️' },
  { id: 'waves', label: 'OLAS', icon: '🌊' },
  { id: 'wind', label: 'VIENTO', icon: '🍃' },
  { id: 'brown', label: 'RUIDO MARRÓN', icon: '🟫' },
];

class Ambient {
  ctx: AudioContext | null = null;
  gains = new Map<SoundId, GainNode>();

  private noise(ctx: AudioContext, brown: boolean) {
    const len = ctx.sampleRate * 4;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (brown) {
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.5;
      } else d[i] = w;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    return src;
  }

  private build(id: SoundId) {
    const ctx = (this.ctx ??= new AudioContext());
    const out = ctx.createGain();
    out.gain.value = 0;
    out.connect(ctx.destination);
    const src = this.noise(ctx, id !== 'rain');
    if (id === 'rain') {
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 900;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 7000;
      src.connect(hp).connect(lp).connect(out);
    } else if (id === 'waves') {
      const swell = ctx.createGain();
      swell.gain.value = 0.5;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.12;
      const depth = ctx.createGain();
      depth.gain.value = 0.45;
      lfo.connect(depth).connect(swell.gain);
      lfo.start();
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1200;
      src.connect(lp).connect(swell).connect(out);
    } else if (id === 'wind') {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.value = 3;
      bp.frequency.value = 500;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.07;
      const depth = ctx.createGain();
      depth.gain.value = 300;
      lfo.connect(depth).connect(bp.frequency);
      lfo.start();
      src.connect(bp).connect(out);
    } else {
      src.connect(out);
    }
    src.start();
    this.gains.set(id, out);
    return out;
  }

  set(id: SoundId, volume: number) {
    const g = this.gains.get(id) ?? this.build(id);
    this.ctx?.resume();
    g.gain.setTargetAtTime(volume * (id === 'rain' ? 0.25 : 0.6), this.ctx!.currentTime, 0.2);
  }

  stop() {
    this.ctx?.close();
    this.ctx = null;
    this.gains.clear();
  }
}

function Mixer() {
  const engine = useRef<Ambient | null>(null);
  const [vol, setVol] = useState<Record<SoundId, number>>({ rain: 0, waves: 0, wind: 0, brown: 0 });
  useEffect(() => () => engine.current?.stop(), []);

  const change = (id: SoundId, v: number) => {
    engine.current ??= new Ambient();
    engine.current.set(id, v);
    setVol((s) => ({ ...s, [id]: v }));
  };

  return (
    <Win title="ambiente.mix" tone="green" actions={<button className="btn btn-sm" onClick={() => SOUNDS.forEach((s) => vol[s.id] && change(s.id, 0))}>SILENCIO</button>}>
      <div className="stack" style={{ gap: 10 }}>
        {SOUNDS.map((s) => (
          <label key={s.id} className="mixer-row">
            <span style={{ fontSize: 22 }}>{s.icon}</span>
            <span className="px" style={{ fontSize: 8, width: 110 }}>{s.label}</span>
            <input type="range" min={0} max={1} step={0.01} value={vol[s.id]} onChange={(e) => change(s.id, Number(e.target.value))} className="grow" />
          </label>
        ))}
        <p className="dim" style={{ margin: 0, fontSize: 15 }}>Sonidos generados en tu navegador. Mézclalos con tu música.</p>
      </div>
    </Win>
  );
}

/* ---------------- Respiración ---------------- */
const PATTERNS = {
  caja: { label: 'CAJA 4-4-4-4', steps: [['INHALA', 4], ['MANTÉN', 4], ['EXHALA', 4], ['MANTÉN', 4]] },
  calma: { label: '4-7-8 DORMIR', steps: [['INHALA', 4], ['MANTÉN', 7], ['EXHALA', 8]] },
  coherencia: { label: 'COHERENCIA 5-5', steps: [['INHALA', 5], ['EXHALA', 5]] },
} as const;

function Breathing() {
  const [pattern, setPattern] = useState<keyof typeof PATTERNS>('caja');
  const [on, setOn] = useState(false);
  const [{ step, count }, setPhase] = useState({ step: 0, count: 0 });
  const steps = PATTERNS[pattern].steps;

  useEffect(() => {
    if (!on) return;
    const id = setInterval(() => {
      setPhase(({ step, count }) => (count + 1 >= steps[step % steps.length][1] ? { step: (step + 1) % steps.length, count: 0 } : { step, count: count + 1 }));
    }, 1000);
    return () => clearInterval(id);
  }, [on, steps]);

  const [label, dur] = steps[step % steps.length];
  const scale = !on ? 0.5 : label === 'INHALA' ? 0.5 + 0.5 * ((count + 1) / dur) : label === 'EXHALA' ? 1 - 0.5 * ((count + 1) / dur) : step === 1 ? 1 : 0.5;

  return (
    <Win title="respira.exe" tone="yellow">
      <div className="breath">
        <div className="breath__box" style={{ transform: `scale(${scale})`, transitionDuration: on ? '1s' : '.3s' }} />
        <span className="breath__label">{on ? `${label} ${dur - count}` : 'LISTO'}</span>
      </div>
      <div className="row row--tight" style={{ justifyContent: 'center' }}>
        {(Object.keys(PATTERNS) as (keyof typeof PATTERNS)[]).map((p) => (
          <button key={p} className={`chip${pattern === p ? ' is-on' : ''}`} style={{ ['--c' as string]: 'var(--yellow)' }} onClick={() => (setPattern(p), setPhase({ step: 0, count: 0 }))}>
            {PATTERNS[p].label}
          </button>
        ))}
      </div>
      <div className="row" style={{ justifyContent: 'center', marginTop: 12 }}>
        <button className={`btn${on ? '' : ' btn-solid'}`} onClick={() => (setOn(!on), setPhase({ step: 0, count: 0 }))}>
          <Icon name={on ? 'pause' : 'play'} /> {on ? 'PARAR' : 'EMPEZAR'}
        </button>
      </div>
    </Win>
  );
}

/* ---------------- Sala ---------------- */
function LinkEditor({ link, onClose }: { link: Item<LinkData> | null; onClose: () => void }) {
  const { create, update, remove } = useItems<LinkData>('link');
  const [title, setTitle] = useState(link?.title ?? '');
  const [d, setD] = useState<LinkData>({ url: '', platform: 'otro', note: '', ...link?.data });
  const platform = detect(d.url);

  return (
    <Modal title={link ? 'editar_link' : 'nuevo_link'} onClose={onClose}>
      <form
        className="stack"
        onSubmit={async (e) => {
          e.preventDefault();
          const data = { ...d, platform };
          const name = title || PLATFORMS[platform].label;
          if (link) await update(link.id, { title: name, data });
          else await create('link', name, data);
          onClose();
        }}
      >
        <label className="field">
          <span>URL (PERFIL, PLAYLIST, CANCIÓN, VÍDEO...)</span>
          <input className="input" type="url" required autoFocus placeholder="https://open.spotify.com/playlist/..." value={d.url} onChange={(e) => setD({ ...d, url: e.target.value })} />
        </label>
        {d.url && (
          <p style={{ margin: 0, color: PLATFORMS[platform].color }}>
            ● {PLATFORMS[platform].label} {embedUrl(d.url) ? '· se puede reproducir aquí' : '· se abrirá en la app/web'}
          </p>
        )}
        <label className="field">
          <span>NOMBRE</span>
          <input className="input" placeholder="Mi playlist para estudiar" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="field">
          <span>NOTA</span>
          <input className="input" placeholder="Para cuando necesito concentrarme" value={d.note} onChange={(e) => setD({ ...d, note: e.target.value })} />
        </label>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          {link ? (
            <button type="button" className="btn btn-sm btn-danger" onClick={async () => (await remove(link.id), onClose())}>
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

function Relax() {
  const params = useSearchParams();
  const { profile } = usePlayer();
  const { items } = useItems<LinkData>('link');
  const [editing, setEditing] = useState<Item<LinkData> | null | 'new'>(null);
  const [playing, setPlaying] = useState<Item<LinkData> | null>(null);
  const handled = useRef<string | null>(null);

  useEffect(() => {
    const id = params.get('open');
    const it = items.find((i) => i.id === id);
    if (it && handled.current !== id) {
      handled.current = id;
      setEditing(it);
    }
  }, [params, items]);

  const embed = playing ? embedUrl(playing.data.url) : null;
  const firstEmbeddable = items.find((i) => embedUrl(i.data.url));

  return (
    <RoomShell
      slug="relax"
      actions={
        <button className="btn btn-sm btn-solid" onClick={() => setEditing('new')}>
          <Icon name="plus" /> LINK
        </button>
      }
      scene={
        <IsoRoom
          theme={THEMES.night}
          avatar={profile.avatar}
          walls={[W.window('right', 1), W.neon('right', 3.2, 7.6, '#00f0ff'), W.poster('left', 1, '#1ed760', { label: 'SPOTIFY', onClick: () => window.open(PLATFORMS.spotify.home, '_blank') }), W.poster('left', 2.4, '#ff3b3b', { label: 'YOUTUBE', onClick: () => window.open(PLATFORMS.youtube.home, '_blank') }), W.poster('left', 3.8, '#25f4ee', { label: 'TIKTOK', onClick: () => window.open(PLATFORMS.tiktok.home, '_blank') })]}
          furni={[
            { id: 'rug', x: 2, y: 2.5, boxes: F.rug(4, 3, '#211a4d') },
            { id: 'sofa', x: 2.6, y: 4.2, boxes: F.sofa('#a239ff', 2.4), label: 'RESPIRAR', onClick: () => document.getElementById('breath')?.scrollIntoView({ behavior: 'smooth' }) },
            { id: 'tv', x: 2.8, y: 0.2, boxes: F.tv(), label: 'REPRODUCIR', onClick: () => firstEmbeddable && setPlaying(firstEmbeddable) },
            { id: 'sp1', x: 1.6, y: 0.2, boxes: F.speaker(), label: 'AMBIENTE', onClick: () => document.getElementById('mixer')?.scrollIntoView({ behavior: 'smooth' }) },
            { id: 'sp2', x: 4.6, y: 0.2, boxes: F.speaker() },
            { id: 'turn', x: 6, y: 0.3, boxes: F.turntable(), label: 'NUEVO LINK', onClick: () => setEditing('new') },
            { id: 'bean', x: 0.4, y: 3, boxes: F.beanbag('#00f0ff') },
            { id: 'plant', x: 0.2, y: 0.3, boxes: F.plant() },
            { id: 'lamp', x: 6.6, y: 2.4, boxes: F.lamp('#a239ff') },
          ]}
        />
      }
    >
      <div className="row row--tight" style={{ marginBottom: 14 }}>
        {(['spotify', 'youtube', 'tiktok', 'soundcloud', 'twitch', 'instagram'] as const).map((p) => (
          <a key={p} className="chip is-on" style={{ ['--c' as string]: PLATFORMS[p].color, textDecoration: 'none' }} href={PLATFORMS[p].home} target="_blank" rel="noreferrer">
            {PLATFORMS[p].label} ↗
          </a>
        ))}
      </div>

      <div className="split split--wide">
        <div className="stack">
          {playing && (
            <Win title={`▶ ${playing.title}`} tone="pink" actions={<button className="icon-btn" onClick={() => setPlaying(null)} aria-label="Cerrar reproductor"><Icon name="x" /></button>} flush>
              {embed && (
                <iframe
                  className={`player player--${playing.data.platform}`}
                  src={embed}
                  title={playing.title}
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                />
              )}
            </Win>
          )}
          <Win title={`mis_links · ${items.length}`}>
            {items.length ? (
              <ul className="link-list">
                {items.map((l) => {
                  const p = PLATFORMS[l.data.platform] ?? PLATFORMS.otro;
                  const canEmbed = !!embedUrl(l.data.url);
                  return (
                    <li key={l.id} style={{ ['--c' as string]: p.color }}>
                      <span className="link-list__badge">{p.label}</span>
                      <span className="grow" style={{ minWidth: 0 }}>
                        <strong>{l.title}</strong>
                        {l.data.note && <span className="dim"> · {l.data.note}</span>}
                      </span>
                      {canEmbed && (
                        <button className="icon-btn" onClick={() => setPlaying(l)} aria-label="Reproducir aquí" title="Reproducir aquí">
                          <Icon name="play" />
                        </button>
                      )}
                      <a className="icon-btn" href={l.data.url} target="_blank" rel="noreferrer" aria-label="Abrir" title="Abrir en la plataforma">
                        <Icon name="external" />
                      </a>
                      <button className="icon-btn" onClick={() => setEditing(l)} aria-label="Editar">
                        <Icon name="edit" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="empty">
                <span className="px">SIN LINKS</span>
                Pega tus playlists de Spotify, vídeos de YouTube, tu perfil de TikTok...
              </div>
            )}
          </Win>
        </div>
        <div className="stack">
          <div id="mixer">
            <Mixer />
          </div>
          <div id="breath">
            <Breathing />
          </div>
        </div>
      </div>
      {editing && <LinkEditor link={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </RoomShell>
  );
}

export default function Page() {
  return (
    <Suspense>
      <Relax />
    </Suspense>
  );
}
