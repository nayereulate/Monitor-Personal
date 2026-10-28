'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/Icon';
import { F, IsoRoom, THEMES, W } from '@/components/IsoRoom';
import { Modal } from '@/components/Modal';
import { PixelAvatar } from '@/components/PixelAvatar';
import { RoomShell } from '@/components/RoomShell';
import { useItems, usePlayer, useStore, useToast } from '@/lib/session';
import type { Item } from '@/lib/types';

interface OutfitData {
  occasion: string;
  season: string;
  pieces: string[];
  colors: string[];
  notes: string;
  fav: boolean;
  fileId: string | null;
  url: string;
}

const OCCASIONS = ['Diario', 'Clase', 'Trabajo', 'Fiesta', 'Cita', 'Deporte', 'Viaje', 'Evento'];
const SEASONS = ['Todo el año', 'Verano', 'Invierno', 'Primavera', 'Otoño'];

const blank = (): OutfitData => ({ occasion: 'Diario', season: 'Todo el año', pieces: [], colors: ['#ff2bd6', '#1c0d38'], notes: '', fav: false, fileId: null, url: '' });

function useImage(o: OutfitData) {
  const store = useStore();
  const [src, setSrc] = useState<string | null>(o.url || null);
  useEffect(() => {
    let alive = true;
    if (o.fileId) {
      store
        .getItem(o.fileId)
        .then((f) => (f ? store.fileUrl(f) : null))
        .then((u) => alive && setSrc(u))
        .catch(() => alive && setSrc(null));
    } else setSrc(o.url || null);
    return () => {
      alive = false;
    };
  }, [o.fileId, o.url, store]);
  return src;
}

function OutfitVisual({ o }: { o: OutfitData }) {
  const { profile } = usePlayer();
  const src = useImage(o);
  if (src)
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="outfit__img" src={src} alt="" loading="lazy" />;
  return (
    <div className="outfit__img outfit__img--avatar">
      <div style={{ width: '45%', margin: '0 auto' }}>
        <PixelAvatar avatar={{ ...profile.avatar, shirt: o.colors[0] ?? profile.avatar.shirt, pants: o.colors[1] ?? profile.avatar.pants }} />
      </div>
    </div>
  );
}

function OutfitEditor({ outfit, onClose }: { outfit: Item<OutfitData> | null; onClose: () => void }) {
  const store = useStore();
  const toast = useToast();
  const { addXP } = usePlayer();
  const { create, update, remove } = useItems<OutfitData>('outfit');
  const [title, setTitle] = useState(outfit?.title ?? '');
  const [d, setD] = useState<OutfitData>({ ...blank(), ...outfit?.data });
  const [pieces, setPieces] = useState((outfit?.data.pieces ?? []).join('\n'));
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const original = outfit?.data.fileId ?? null;

  // cancelar: borra la foto nueva que no llegó a guardarse
  const cancel = () => {
    if (d.fileId && d.fileId !== original) store.deleteItem(d.fileId).catch(() => {});
    onClose();
  };

  const upload = async (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) return toast('Solo imágenes', 'err');
    setBusy(true);
    try {
      const it = await store.uploadFile(f, { folder: 'armario' });
      // una foto subida en esta edición y luego reemplazada ya no la usa nadie
      if (d.fileId && d.fileId !== original) await store.deleteItem(d.fileId).catch(() => {});
      setD({ ...d, fileId: it.id, url: '' });
    } catch (e) {
      toast((e as Error).message, 'err');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={outfit ? 'editar_outfit' : 'nuevo_outfit'} onClose={cancel} wide>
      <form
        className="outfit-form"
        onSubmit={async (e) => {
          e.preventDefault();
          const data = { ...d, pieces: pieces.split('\n').map((p) => p.trim()).filter(Boolean) };
          if (original && original !== data.fileId) await store.deleteItem(original).catch(() => {});
          if (outfit) await update(outfit.id, { title, data });
          else {
            await create('outfit', title, data);
            addXP(5, 'outfit');
          }
          onClose();
        }}
      >
        <div className="stack">
          <OutfitVisual o={d} />
          <input ref={file} type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files?.[0])} />
          <button type="button" className="btn btn-sm" onClick={() => file.current?.click()} disabled={busy}>
            <Icon name="upload" /> {busy ? 'SUBIENDO...' : d.fileId ? 'CAMBIAR FOTO' : 'SUBIR FOTO'}
          </button>
          <label className="field">
            <span>O PEGA UNA URL (PINTEREST, ETC.)</span>
            <input className="input" type="url" placeholder="https://..." value={d.url} onChange={(e) => setD({ ...d, url: e.target.value, fileId: e.target.value ? null : d.fileId })} />
          </label>
        </div>
        <div className="stack">
          <label className="field">
            <span>NOMBRE DEL OUTFIT</span>
            <input className="input" required autoFocus value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <div className="grid" style={{ ['--min' as string]: '140px', gap: 10 }}>
            <label className="field">
              <span>OCASIÓN</span>
              <select className="select" value={d.occasion} onChange={(e) => setD({ ...d, occasion: e.target.value })}>
                {OCCASIONS.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>TEMPORADA</span>
              <select className="select" value={d.season} onChange={(e) => setD({ ...d, season: e.target.value })}>
                {SEASONS.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="field">
            <span>PRENDAS (UNA POR LÍNEA)</span>
            <textarea className="textarea" rows={4} placeholder={'Chaqueta denim\nCamiseta negra\nZapatillas blancas'} value={pieces} onChange={(e) => setPieces(e.target.value)} />
          </label>
          <div className="field">
            <span>PALETA DE COLORES</span>
            <div className="row row--tight">
              {d.colors.map((c, i) => (
                <span key={i} className="row row--tight">
                  <input type="color" value={c} onChange={(e) => setD({ ...d, colors: d.colors.map((x, j) => (j === i ? e.target.value : x)) })} aria-label={`Color ${i + 1}`} />
                  {d.colors.length > 1 && (
                    <button type="button" className="icon-btn" style={{ width: 24, height: 24 }} onClick={() => setD({ ...d, colors: d.colors.filter((_, j) => j !== i) })} aria-label="Quitar color">
                      ×
                    </button>
                  )}
                </span>
              ))}
              {d.colors.length < 6 && (
                <button type="button" className="btn btn-sm" onClick={() => setD({ ...d, colors: [...d.colors, '#ffffff'] })}>
                  <Icon name="plus" />
                </button>
              )}
            </div>
          </div>
          <label className="field">
            <span>NOTAS</span>
            <textarea className="textarea" rows={2} value={d.notes} onChange={(e) => setD({ ...d, notes: e.target.value })} />
          </label>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            {outfit ? (
              <button
                type="button"
                className="btn btn-sm btn-danger"
                onClick={async () => {
                  if (!confirm('¿Borrar outfit?')) return;
                  if (outfit.data.fileId) await store.deleteItem(outfit.data.fileId).catch(() => {});
                  await remove(outfit.id);
                  onClose();
                }}
              >
                <Icon name="trash" /> BORRAR
              </button>
            ) : (
              <span />
            )}
            <button className="btn btn-solid" disabled={busy}>
              <Icon name="save" /> GUARDAR
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

function Armario() {
  const params = useSearchParams();
  const { profile } = usePlayer();
  const { items, update } = useItems<OutfitData>('outfit');
  const [editing, setEditing] = useState<Item<OutfitData> | null | 'new'>(null);
  const [filter, setFilter] = useState<string>('Todos');
  const handled = useRef<string | null>(null);

  useEffect(() => {
    const id = params.get('open');
    const it = items.find((i) => i.id === id);
    if (it && handled.current !== id) {
      handled.current = id;
      setEditing(it);
    }
  }, [params, items]);

  const list = items
    .filter((o) => filter === 'Todos' || (filter === '★' ? o.data.fav : o.data.occasion === filter))
    .sort((a, b) => Number(b.data.fav) - Number(a.data.fav));

  return (
    <RoomShell
      slug="armario"
      actions={
        <button className="btn btn-sm btn-solid" onClick={() => setEditing('new')}>
          <Icon name="plus" /> OUTFIT
        </button>
      }
      scene={
        <IsoRoom
          theme={THEMES.rose}
          avatar={profile.avatar}
          walls={[W.poster('right', 4, '#ff2bd6'), W.window('right', 5.4), W.neon('left', 2, 6, '#ff2bd6')]}
          furni={[
            { id: 'w1', x: 0.2, y: 0.1, boxes: F.wardrobe('#6b3a8a'), label: 'NUEVO OUTFIT', onClick: () => setEditing('new') },
            { id: 'w2', x: 2, y: 0.1, boxes: F.wardrobe('#6b3a8a'), label: 'FAVORITOS', onClick: () => setFilter('★') },
            { id: 'mirror', x: 0.1, y: 2.2, boxes: F.mirror(), label: 'TODOS', onClick: () => setFilter('Todos') },
            { id: 'rack', x: 0.3, y: 4, boxes: F.rack(), label: 'NUEVO OUTFIT', onClick: () => setEditing('new') },
            { id: 'rug', x: 3, y: 3, boxes: F.rug(2, 2, '#ff2bd6') },
            { id: 'plant', x: 6.6, y: 0.4, boxes: F.plant() },
          ]}
        />
      }
    >
      <div className="row row--tight" style={{ marginBottom: 14 }}>
        {['Todos', '★', ...OCCASIONS].map((o) => (
          <button key={o} className={`chip${filter === o ? ' is-on' : ''}`} style={{ ['--c' as string]: 'var(--pink)' }} onClick={() => setFilter(o)}>
            {o.toUpperCase()}
          </button>
        ))}
      </div>
      {list.length ? (
        <div className="grid" style={{ ['--min' as string]: '200px' }}>
          {list.map((o) => (
            <article key={o.id} className="card outfit" style={{ ['--c' as string]: o.data.colors[0] ?? 'var(--pink)' }} onClick={() => setEditing(o)}>
              <OutfitVisual o={o.data} />
              <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
                <h3 className="card__title" style={{ fontSize: 20 }}>{o.title}</h3>
                <button
                  className={`icon-btn${o.data.fav ? ' is-on' : ''}`}
                  aria-label="Favorito"
                  onClick={(e) => {
                    e.stopPropagation();
                    update(o.id, { data: { ...o.data, fav: !o.data.fav } });
                  }}
                >
                  <Icon name="heart" />
                </button>
              </div>
              <div className="row row--tight">
                <span className="tag">{o.data.occasion}</span>
                <span className="tag">{o.data.season}</span>
              </div>
              <div className="outfit__palette">
                {o.data.colors.map((c, i) => (
                  <span key={i} style={{ background: c }} />
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty">
          <span className="px">ARMARIO VACÍO</span>
          Guarda ideas de outfits con fotos, prendas y paleta de colores.
        </div>
      )}
      {editing && <OutfitEditor outfit={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </RoomShell>
  );
}

export default function Page() {
  return (
    <Suspense>
      <Armario />
    </Suspense>
  );
}
