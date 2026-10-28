'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BlockEditor, newBlock, type Block } from '@/components/BlockEditor';
import { Icon } from '@/components/Icon';
import { F, IsoRoom, THEMES, W } from '@/components/IsoRoom';
import { Modal } from '@/components/Modal';
import { RoomShell } from '@/components/RoomShell';
import { Win } from '@/components/Win';
import { PALETTE } from '@/lib/rooms';
import { useItems, usePlayer, useStore, useToast } from '@/lib/session';
import type { Item } from '@/lib/types';

interface NoteData {
  icon: string;
  color: string;
  cover: 'none' | 'grid' | 'sunset' | 'stripes' | 'dots' | 'stars';
  font: 'mono' | 'pixel';
  tags: string[];
  pinned: boolean;
  blocks: Block[];
}

const ICONS = ['📝', '📚', '💡', '🎯', '🧠', '🎮', '🔥', '⭐', '💾', '🧪', '🎨', '💪', '🗺️', '🎵', '📌', '👾', '🚀', '🍀', '🔒', '✏️'];
const COVERS: NoteData['cover'][] = ['none', 'grid', 'sunset', 'stripes', 'dots', 'stars'];

const defaultNote = (): NoteData => ({
  icon: '📝',
  color: '#00f0ff',
  cover: 'grid',
  font: 'mono',
  tags: [],
  pinned: false,
  blocks: [newBlock()],
});

function fmtSize(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 ** 2).toFixed(1)} MB`;
}

/* ---------------- Notas ---------------- */
function NoteEditor({ note, onDelete }: { note: Item<NoteData>; onDelete: () => void }) {
  const store = useStore();
  const [title, setTitle] = useState(note.title);
  const [data, setData] = useState<NoteData>({ ...defaultNote(), ...note.data });
  const [tagDraft, setTagDraft] = useState('');
  const [custom, setCustom] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pending = useRef<{ title: string; data: NoteData } | null>(null);

  const flush = useCallback(() => {
    if (pending.current) {
      store.updateItem(note.id, pending.current);
      pending.current = null;
    }
  }, [note.id, store]);

  // guardado con debounce (escribir se siente instantáneo y no satura la base de datos)
  const queue = (t: string, d: NoteData) => {
    pending.current = { title: t, data: d };
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, 600);
  };
  useEffect(() => () => (clearTimeout(timer.current), flush()), [flush]);

  const setD = (p: Partial<NoteData>) => {
    const next = { ...data, ...p };
    setData(next);
    queue(title, next);
  };

  return (
    <article className="note" style={{ ['--accent' as string]: data.color }}>
      <div className={`note__cover cover--${data.cover}`} />
      <div className="note__body">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <button className="note__icon" onClick={() => setCustom(!custom)} title="Personalizar nota">
            {data.icon}
          </button>
          <div className="row row--tight">
            <button className={`icon-btn${data.pinned ? ' is-on' : ''}`} onClick={() => setD({ pinned: !data.pinned })} title="Fijar">
              <Icon name="star" />
            </button>
            <button className={`icon-btn${custom ? ' is-on' : ''}`} onClick={() => setCustom(!custom)} title="Personalizar">
              <Icon name="palette" />
            </button>
            <button className="icon-btn" onClick={onDelete} title="Borrar nota">
              <Icon name="trash" />
            </button>
          </div>
        </div>

        {custom && (
          <div className="note__custom win">
            <div className="win-body stack">
              <div className="field">
                <span>ICONO</span>
                <div className="row row--tight">
                  {ICONS.map((ic) => (
                    <button key={ic} className={`emoji-btn${ic === data.icon ? ' is-on' : ''}`} onClick={() => setD({ icon: ic })}>
                      {ic}
                    </button>
                  ))}
                </div>
              </div>
              <div className="field">
                <span>COLOR</span>
                <div className="swatches">
                  {PALETTE.map((c) => (
                    <button key={c} className={`swatch${c === data.color ? ' is-on' : ''}`} style={{ background: c }} onClick={() => setD({ color: c })} aria-label={c} />
                  ))}
                  <input type="color" value={data.color} onChange={(e) => setD({ color: e.target.value })} aria-label="Color personalizado" />
                </div>
              </div>
              <div className="field">
                <span>PORTADA</span>
                <div className="row row--tight">
                  {COVERS.map((c) => (
                    <button key={c} className={`cover-pick cover--${c}${c === data.cover ? ' is-on' : ''}`} onClick={() => setD({ cover: c })} aria-label={c} title={c} />
                  ))}
                </div>
              </div>
              <div className="field">
                <span>FUENTE</span>
                <div className="row row--tight">
                  <button className={`btn btn-sm${data.font === 'mono' ? ' btn-cyan' : ''}`} onClick={() => setD({ font: 'mono' })}>
                    TERMINAL
                  </button>
                  <button className={`btn btn-sm${data.font === 'pixel' ? ' btn-cyan' : ''}`} onClick={() => setD({ font: 'pixel' })}>
                    PIXEL
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <input
          className="note__title"
          value={title}
          placeholder="Sin título"
          onChange={(e) => {
            setTitle(e.target.value);
            queue(e.target.value, data);
          }}
        />

        <div className="row row--tight" style={{ marginBottom: 14 }}>
          {data.tags.map((t) => (
            <button key={t} className="tag" onClick={() => setD({ tags: data.tags.filter((x) => x !== t) })} title="Quitar etiqueta">
              #{t} ×
            </button>
          ))}
          <input
            className="input input--bare"
            style={{ width: 140, fontSize: 17 }}
            placeholder="+ etiqueta"
            value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && tagDraft.trim()) {
                setD({ tags: [...new Set([...data.tags, tagDraft.trim().replace(/^#/, '')])] });
                setTagDraft('');
              }
            }}
          />
        </div>

        <div className={data.font === 'pixel' ? 'note--pixel' : ''}>
          <BlockEditor blocks={data.blocks} accent={data.color} onChange={(blocks) => setD({ blocks })} />
        </div>
        <p className="dim" style={{ fontSize: 15, marginTop: 20 }}>
          <Icon name="lock" /> Privada · guardado automático · escribe <kbd>/</kbd> para comandos
        </p>
      </div>
    </article>
  );
}

function Notes({ openId }: { openId: string | null }) {
  const { items, create, remove, loading } = useItems<NoteData>('note');
  const { addXP } = usePlayer();
  const router = useRouter();
  const [q, setQ] = useState('');
  const [current, setCurrent] = useState<string | null>(openId);

  useEffect(() => {
    if (openId) setCurrent(openId);
  }, [openId]);
  useEffect(() => {
    if (!loading && !current && items.length) setCurrent(items[items.length - 1].id);
  }, [loading, current, items]);

  const sorted = useMemo(() => {
    const term = q.toLowerCase();
    return items
      .filter((n) => !term || n.title.toLowerCase().includes(term) || n.data.tags?.some((t) => t.toLowerCase().includes(term)) || n.data.blocks?.some((b) => b.text.toLowerCase().includes(term)))
      .sort((a, b) => Number(!!b.data.pinned) - Number(!!a.data.pinned) || b.updated_at.localeCompare(a.updated_at));
  }, [items, q]);

  const note = items.find((n) => n.id === current);

  const add = async () => {
    const n = await create('note', '', defaultNote());
    setCurrent(n.id);
    router.replace('/hotel/estudio');
    if (items.length === 0) addXP(10, 'primera nota');
  };

  return (
    <div className="split">
      <Win title={`notas · ${items.length}`} actions={<button className="btn btn-sm btn-solid" onClick={add}><Icon name="plus" /> NUEVA</button>} flush>
        <div style={{ padding: 10, borderBottom: '2px solid var(--line)' }}>
          <input className="input" placeholder="Buscar..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <ul className="note-list">
          {sorted.map((n) => (
            <li key={n.id}>
              <button className={n.id === current ? 'is-active' : ''} onClick={() => setCurrent(n.id)} style={{ ['--c' as string]: n.data.color }}>
                <span>{n.data.icon}</span>
                <span className="grow" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {n.title || 'Sin título'}
                </span>
                {n.data.pinned && <Icon name="star" />}
              </button>
            </li>
          ))}
          {!loading && !sorted.length && <li className="dim" style={{ padding: 12 }}>{q ? 'Sin resultados' : 'Aún no hay notas'}</li>}
        </ul>
      </Win>

      {note ? (
        <NoteEditor
          key={note.id}
          note={note}
          onDelete={async () => {
            if (!confirm('¿Borrar esta nota?')) return;
            setCurrent(null);
            await remove(note.id);
          }}
        />
      ) : (
        <div className="empty">
          <span className="px">NO HAY NOTA ABIERTA</span>
          Crea una nota para empezar a escribir.
          <div style={{ marginTop: 14 }}>
            <button className="btn btn-solid" onClick={add}>
              <Icon name="plus" /> NUEVA NOTA
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Baúl privado ---------------- */
function Vault() {
  const store = useStore();
  const toast = useToast();
  const { items, remove } = useItems('file');
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [viewing, setViewing] = useState<{ item: Item; url: string } | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      for (const f of Array.from(files)) {
        if (f.size > 50 * 1024 * 1024) {
          toast(`${f.name}: máximo 50 MB`, 'err');
          continue;
        }
        await store.uploadFile(f, { folder: 'estudio' });
      }
      toast('Guardado en el baúl 🔒');
    } catch (e) {
      toast((e as Error).message, 'err');
    } finally {
      setBusy(false);
    }
  };

  const open = async (item: Item) => {
    try {
      setViewing({ item, url: await store.fileUrl(item) });
    } catch (e) {
      toast((e as Error).message, 'err');
    }
  };

  const files = items.filter((f) => f.data.folder !== 'armario');

  return (
    <>
      <Win title={`baul_privado · ${files.length} archivos`} tone="yellow" actions={<button className="btn btn-sm" onClick={() => input.current?.click()} disabled={busy}><Icon name="upload" /> {busy ? 'SUBIENDO...' : 'SUBIR'}</button>}>
        <input ref={input} type="file" multiple hidden accept=".pdf,image/*,.txt,.md,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip" onChange={(e) => (upload(e.target.files), (e.target.value = ''))} />
        <div
          className={`dropzone${drag ? ' is-drag' : ''}`}
          onDragOver={(e) => (e.preventDefault(), setDrag(true))}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            upload(e.dataTransfer.files);
          }}
          onClick={() => input.current?.click()}
        >
          <Icon name="lock" /> Arrastra PDFs, imágenes o documentos aquí · solo tú puedes verlos
        </div>
        {files.length > 0 && (
          <ul className="file-list">
            {files.map((f) => (
              <li key={f.id}>
                <button className="file-list__main" onClick={() => open(f)}>
                  <span className="file-ext">{(f.title.split('.').pop() || 'file').slice(0, 4).toUpperCase()}</span>
                  <span className="grow" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.title}</span>
                  <span className="dim">{fmtSize(f.data.size)}</span>
                </button>
                <button
                  className="icon-btn"
                  aria-label="Borrar archivo"
                  onClick={async () => {
                    if (confirm(`¿Borrar ${f.title}?`)) await remove(f.id);
                  }}
                >
                  <Icon name="trash" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Win>

      {viewing && (
        <Modal
          wide
          title={viewing.item.title}
          onClose={() => setViewing(null)}
          actions={
            <a className="btn btn-sm" href={viewing.url} download={viewing.item.title} target="_blank" rel="noreferrer">
              <Icon name="download" /> DESCARGAR
            </a>
          }
        >
          {viewing.item.data.mime === 'application/pdf' ? (
            <iframe src={viewing.url} title={viewing.item.title} style={{ width: '100%', height: '72vh', border: 0, background: '#fff' }} />
          ) : viewing.item.data.mime?.startsWith('image/') ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={viewing.url} alt={viewing.item.title} style={{ display: 'block', margin: '0 auto', maxHeight: '72vh' }} />
          ) : (
            <p className="muted">Vista previa no disponible. Usa DESCARGAR para abrirlo.</p>
          )}
        </Modal>
      )}
    </>
  );
}

function Estudio() {
  const params = useSearchParams();
  const { profile } = usePlayer();
  const [tab, setTab] = useState<'notas' | 'baul'>('notas');
  const openId = params.get('open');

  useEffect(() => {
    if (openId) setTab('notas');
  }, [openId]);

  return (
    <RoomShell
      slug="estudio"
      scene={
        <IsoRoom
          theme={THEMES.teal}
          avatar={profile.avatar}
          walls={[W.window('right', 1.2), W.poster('right', 4.4, '#ff2bd6'), W.shelf('left', 1.2, { id: 'sh', label: 'BAÚL PRIVADO', onClick: () => setTab('baul') }), W.poster('left', 4.6, '#ffe66d')]}
          furni={[
            { id: 'rug', x: 2, y: 3, boxes: F.rug(3, 2, '#164a5c') },
            { id: 'desk', x: 2, y: 0.2, boxes: F.desk(), label: 'NOTAS', onClick: () => setTab('notas') },
            { id: 'chair', x: 2.6, y: 1.2, boxes: F.chair('#00f0ff') },
            { id: 'shelf1', x: 0.1, y: 2.4, boxes: F.bookshelf(), label: 'BAÚL PRIVADO', onClick: () => setTab('baul') },
            { id: 'shelf2', x: 5, y: 0.1, boxes: F.bookshelf(), label: 'BAÚL PRIVADO', onClick: () => setTab('baul') },
            { id: 'lamp', x: 4.2, y: 0.2, boxes: F.lamp() },
            { id: 'plant', x: 0.2, y: 0.2, boxes: F.plant() },
            { id: 'board', x: 0.1, y: 5, boxes: F.board(), label: 'NOTAS', onClick: () => setTab('notas') },
          ]}
        />
      }
      actions={
        <div className="row row--tight">
          <button className={`btn btn-sm${tab === 'notas' ? ' btn-cyan' : ''}`} onClick={() => setTab('notas')}>
            <Icon name="edit" /> NOTAS
          </button>
          <button className={`btn btn-sm${tab === 'baul' ? ' btn-cyan' : ''}`} onClick={() => setTab('baul')}>
            <Icon name="lock" /> BAÚL
          </button>
        </div>
      }
    >
      {tab === 'notas' ? <Notes openId={openId} /> : <Vault />}
    </RoomShell>
  );
}

export default function Page() {
  return (
    <Suspense>
      <Estudio />
    </Suspense>
  );
}
