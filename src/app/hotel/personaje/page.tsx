'use client';

import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@/components/Icon';
import { F, IsoRoom, THEMES, W } from '@/components/IsoRoom';
import { PixelAvatar } from '@/components/PixelAvatar';
import { RoomShell } from '@/components/RoomShell';
import { Win } from '@/components/Win';
import { useItems, usePlayer, useSession, useStore, useToast } from '@/lib/session';
import { levelFromXP, type AvatarConfig, type Profile } from '@/lib/types';

const SKINS = ['#ffe0bd', '#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#5c3a1e'];
const HAIRS = ['#2b1b3d', '#09011a', '#6b3e1f', '#c98b3a', '#ffe66d', '#ff2bd6', '#00f0ff', '#eaf6ff', '#a239ff'];
const CLOTHES = ['#ff2bd6', '#00f0ff', '#a239ff', '#ffe66d', '#39ff88', '#ff8a3d', '#ff4d6d', '#eaf6ff', '#1c0d38', '#2a7a5c'];
const STYLES: { id: AvatarConfig['hairStyle']; label: string }[] = [
  { id: 'short', label: 'CORTO' },
  { id: 'long', label: 'LARGO' },
  { id: 'spiky', label: 'PUNKY' },
  { id: 'cap', label: 'GORRA' },
  { id: 'bald', label: 'RAPADO' },
];

function bmiInfo(h: number | null, w: number | null) {
  if (!h || !w) return null;
  const bmi = w / (h / 100) ** 2;
  const [label, color] =
    bmi < 18.5 ? ['BAJO PESO', 'var(--cyan)'] : bmi < 25 ? ['NORMAL', 'var(--green)'] : bmi < 30 ? ['SOBREPESO', 'var(--yellow)'] : ['OBESIDAD', 'var(--orange)'];
  return { bmi, label, color };
}

function ColorRow({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (c: string) => void }) {
  return (
    <div className="field">
      <span>{label}</span>
      <div className="swatches">
        {options.map((c) => (
          <button key={c} className={`swatch${c === value ? ' is-on' : ''}`} style={{ background: c }} onClick={() => onChange(c)} aria-label={c} />
        ))}
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} aria-label={`${label} personalizado`} />
      </div>
    </div>
  );
}

export default function Personaje() {
  const { profile, save, addXP } = usePlayer();
  const { user, mode } = useSession();
  const store = useStore();
  const toast = useToast();
  const { items: measures, create, remove } = useItems<{ kg: number; date: string }>('measure');
  const { items: all } = useItems(['note', 'goal', 'project', 'idea', 'session', 'outfit', 'file', 'event']);
  const [draft, setDraft] = useState<Profile>(profile);
  const [weightInput, setWeightInput] = useState('');

  useEffect(() => setDraft(profile), [profile]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(profile);
  const set = (p: Partial<Profile>) => setDraft({ ...draft, ...p });
  const setAv = (p: Partial<AvatarConfig>) => setDraft({ ...draft, avatar: { ...draft.avatar, ...p } });

  const lvl = levelFromXP(profile.xp);
  const bmi = bmiInfo(draft.height_cm, draft.weight_kg);
  const age = draft.birth_year ? new Date().getFullYear() - draft.birth_year : null;

  const log = useMemo(() => [...measures].sort((a, b) => a.data.date.localeCompare(b.data.date)).slice(-14), [measures]);
  const minKg = Math.min(...log.map((m) => m.data.kg)) - 1;
  const maxKg = Math.max(...log.map((m) => m.data.kg)) + 1;

  const n = (k: string, f?: (d: any) => boolean) => all.filter((i) => i.kind === k && (!f || f(i.data))).length;
  const achievements = [
    { label: 'Primera nota', icon: '📝', ok: n('note') >= 1 },
    { label: '10 notas', icon: '📚', ok: n('note') >= 10 },
    { label: 'Primer pomodoro', icon: '🍅', ok: n('session') >= 1 },
    { label: '25 pomodoros', icon: '⏳', ok: n('session') >= 25 },
    { label: 'Quest completada', icon: '🏆', ok: n('goal', (d) => d.done) >= 1 },
    { label: '5 quests', icon: '👑', ok: n('goal', (d) => d.done) >= 5 },
    { label: 'Proyecto terminado', icon: '🚀', ok: n('project', (d) => d.status === 'done') >= 1 },
    { label: '10 ideas', icon: '💡', ok: n('idea') >= 10 },
    { label: 'Fashionista', icon: '👗', ok: n('outfit') >= 5 },
    { label: 'Semana planificada', icon: '📅', ok: n('event') >= 10 },
    { label: 'Nivel 5', icon: '⭐', ok: lvl.level >= 5 },
    { label: 'Nivel 10', icon: '🌟', ok: lvl.level >= 10 },
  ];

  const logWeight = async () => {
    const kg = Number(weightInput.replace(',', '.'));
    if (!kg || kg < 20 || kg > 400) return toast('Peso no válido', 'err');
    await create('measure', `${kg} kg`, { kg, date: new Date().toISOString().slice(0, 10) });
    await save({ weight_kg: kg });
    setWeightInput('');
    if (!measures.length) addXP(10, 'primer registro');
  };

  const exportData = async () => {
    const [items, edges, prof] = await Promise.all([store.listItems(), store.listEdges(), store.getProfile()]);
    const blob = new Blob([JSON.stringify({ app: 'LIFE.EXE', exported_at: new Date().toISOString(), profile: prof, items, edges }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `lifeexe-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <RoomShell
      slug="personaje"
      scene={
        <IsoRoom
          theme={THEMES.violet}
          avatar={draft.avatar}
          start={[3, 4]}
          walls={[W.poster('right', 1, '#ffe66d'), W.window('right', 3), W.shelf('left', 1.4), W.neon('left', 4, 7, '#ffe66d')]}
          furni={[
            { id: 'bed', x: 0.1, y: 0.1, boxes: F.bed('#a239ff') },
            { id: 'mirror', x: 5.4, y: 0.1, boxes: F.mirror(), label: 'MI AVATAR' },
            { id: 'scale', x: 6.4, y: 1.4, boxes: F.scale(), label: 'REGISTRAR PESO', onClick: () => document.getElementById('peso')?.focus() },
            { id: 'dumb', x: 6, y: 4, boxes: F.dumbbell() },
            { id: 'rug', x: 2.5, y: 3, boxes: F.rug(3, 3, '#3a1d6b') },
            { id: 'trophy', x: 0.3, y: 6.4, boxes: F.trophy(), label: 'LOGROS', onClick: () => document.getElementById('logros')?.scrollIntoView({ behavior: 'smooth' }) },
            { id: 'plant', x: 3.8, y: 0.2, boxes: F.plant() },
          ]}
        />
      }
      actions={
        dirty && (
          <button className="btn btn-sm btn-solid" onClick={() => save(draft).then(() => toast('Personaje guardado'))}>
            <Icon name="save" /> GUARDAR CAMBIOS
          </button>
        )
      }
    >
      <div className="grid" style={{ ['--min' as string]: '320px', alignItems: 'start' }}>
        <Win title="avatar.editor" tone="yellow">
          <div className="avatar-editor">
            <div className="avatar-editor__preview">
              <PixelAvatar avatar={draft.avatar} />
            </div>
            <div className="stack" style={{ gap: 10 }}>
              <ColorRow label="PIEL" value={draft.avatar.skin} options={SKINS} onChange={(skin) => setAv({ skin })} />
              <ColorRow label="PELO" value={draft.avatar.hair} options={HAIRS} onChange={(hair) => setAv({ hair })} />
              <div className="field">
                <span>PEINADO</span>
                <div className="row row--tight">
                  {STYLES.map((s) => (
                    <button key={s.id} className={`chip${draft.avatar.hairStyle === s.id ? ' is-on' : ''}`} style={{ ['--c' as string]: 'var(--yellow)' }} onClick={() => setAv({ hairStyle: s.id })}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <ColorRow label="CAMISETA" value={draft.avatar.shirt} options={CLOTHES} onChange={(shirt) => setAv({ shirt })} />
              <ColorRow label="PANTALÓN" value={draft.avatar.pants} options={CLOTHES} onChange={(pants) => setAv({ pants })} />
            </div>
          </div>
        </Win>

        <Win title="player.data">
          <div className="stack">
            <label className="field">
              <span>NOMBRE DE JUGADOR</span>
              <input className="input" maxLength={24} value={draft.display_name} onChange={(e) => set({ display_name: e.target.value })} />
            </label>
            <label className="field">
              <span>BIO / LEMA</span>
              <textarea className="textarea" rows={2} maxLength={280} value={draft.bio} onChange={(e) => set({ bio: e.target.value })} />
            </label>
            <div className="grid" style={{ ['--min' as string]: '110px', gap: 10 }}>
              <label className="field">
                <span>ALTURA CM</span>
                <input className="input" type="number" min={50} max={250} value={draft.height_cm ?? ''} onChange={(e) => set({ height_cm: e.target.value ? Number(e.target.value) : null })} />
              </label>
              <label className="field">
                <span>PESO KG</span>
                <input className="input" type="number" step="0.1" min={20} max={400} value={draft.weight_kg ?? ''} onChange={(e) => set({ weight_kg: e.target.value ? Number(e.target.value) : null })} />
              </label>
              <label className="field">
                <span>AÑO NAC.</span>
                <input className="input" type="number" min={1900} max={new Date().getFullYear()} value={draft.birth_year ?? ''} onChange={(e) => set({ birth_year: e.target.value ? Number(e.target.value) : null })} />
              </label>
            </div>
            <div className="statline">
              {age !== null && <span>EDAD <b>{age}</b></span>}
              {bmi && (
                <span>
                  IMC <b style={{ color: bmi.color }}>{bmi.bmi.toFixed(1)}</b> <small style={{ color: bmi.color }}>{bmi.label}</small>
                </span>
              )}
              <span>NIVEL <b style={{ color: 'var(--yellow)' }}>{lvl.level}</b></span>
              <span>XP <b>{profile.xp}</b></span>
            </div>
          </div>
        </Win>

        <Win title="atributos.rpg" tone="pink">
          <div className="stack" style={{ gap: 10 }}>
            {draft.attributes.map((a, i) => (
              <div key={i} className="attr">
                <input className="input input--bare attr__name" value={a.name} onChange={(e) => set({ attributes: draft.attributes.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} />
                <div className="attr__pips">
                  {Array.from({ length: 10 }, (_, k) => (
                    <button key={k} className={k < a.value ? 'on' : ''} onClick={() => set({ attributes: draft.attributes.map((x, j) => (j === i ? { ...x, value: k + 1 } : x)) })} aria-label={`${a.name} ${k + 1}`} />
                  ))}
                </div>
                <button className="icon-btn" style={{ width: 26, height: 26 }} onClick={() => set({ attributes: draft.attributes.filter((_, j) => j !== i) })} aria-label="Quitar atributo">
                  ×
                </button>
              </div>
            ))}
            <button className="btn btn-sm" onClick={() => set({ attributes: [...draft.attributes, { name: 'Nuevo atributo', value: 5 }] })}>
              <Icon name="plus" /> ATRIBUTO
            </button>
          </div>
        </Win>

        <Win title="peso.log" tone="green">
          <div className="row row--tight" style={{ marginBottom: 12 }}>
            <input id="peso" className="input grow" type="number" step="0.1" placeholder="Peso de hoy (kg)" value={weightInput} onChange={(e) => setWeightInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && logWeight()} />
            <button className="btn btn-sm btn-solid" onClick={logWeight}>
              <Icon name="plus" /> REGISTRAR
            </button>
          </div>
          {log.length ? (
            <>
              <div className="mini-chart" style={{ gridTemplateColumns: `repeat(${log.length}, 1fr)` }}>
                {log.map((m) => (
                  <div key={m.id} className="mini-chart__col" title={`${m.data.date}: ${m.data.kg} kg (click para borrar)`} onClick={() => confirm(`¿Borrar registro de ${m.data.date}?`) && remove(m.id)}>
                    <span className="mini-chart__val">{m.data.kg}</span>
                    <span className="mini-chart__bar" style={{ height: `${((m.data.kg - minKg) / (maxKg - minKg)) * 100}%` }} />
                    <span className="mini-chart__lbl">{m.data.date.slice(8)}</span>
                  </div>
                ))}
              </div>
              {log.length > 1 && (
                <p className="dim" style={{ margin: '8px 0 0', fontSize: 16 }}>
                  Cambio: {(log[log.length - 1].data.kg - log[0].data.kg).toFixed(1)} kg desde {log[0].data.date}
                </p>
              )}
            </>
          ) : (
            <p className="dim" style={{ margin: 0 }}>Registra tu peso para ver tu progreso.</p>
          )}
        </Win>

        <Win title={`logros · ${achievements.filter((a) => a.ok).length}/${achievements.length}`} tone="yellow">
          <div id="logros" className="achievements">
            {achievements.map((a) => (
              <div key={a.label} className={`achv${a.ok ? ' is-ok' : ''}`} title={a.label}>
                <span>{a.ok ? a.icon : '🔒'}</span>
                <small>{a.label}</small>
              </div>
            ))}
          </div>
        </Win>

        <Win title="partida.save">
          <div className="stack">
            <p className="muted" style={{ margin: 0 }}>
              <Icon name="shield" /> {mode === 'cloud' ? `Cuenta: ${user?.email}. Tus datos están protegidos y solo tú puedes verlos.` : 'Modo local: tus datos viven solo en este navegador.'}
            </p>
            <button className="btn btn-sm" onClick={exportData}>
              <Icon name="download" /> EXPORTAR COPIA (JSON)
            </button>
          </div>
        </Win>
      </div>
    </RoomShell>
  );
}
