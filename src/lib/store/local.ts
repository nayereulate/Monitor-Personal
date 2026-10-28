import { DEFAULT_PROFILE, type Edge, type Item, type Kind, type Profile } from '../types';
import { emitStoreChange, now, uid, type Store } from './index';

/* ---------- IndexedDB mínimo para los blobs de archivos ---------- */
const DB_NAME = 'lifeexe-files';
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore('blobs');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function idb<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction('blobs', mode).objectStore('blobs'));
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error);
  });
}

/** Modo local: todo vive en el navegador, separado por usuario local. */
export function createLocalStore(userId: string): Store {
  const k = (name: string) => `lifeexe:${userId}:${name}`;
  const read = <T,>(name: string, fallback: T): T => {
    try {
      const raw = localStorage.getItem(k(name));
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  };
  const write = (name: string, value: unknown) => {
    localStorage.setItem(k(name), JSON.stringify(value));
    emitStoreChange();
  };
  const items = () => read<Item[]>('items', []);
  const edges = () => read<Edge[]>('edges', []);

  return {
    async listItems(kinds) {
      const list = items();
      if (!kinds) return list;
      const set = new Set(Array.isArray(kinds) ? kinds : [kinds]);
      return list.filter((i) => set.has(i.kind));
    },
    async getItem(id) {
      return items().find((i) => i.id === id) ?? null;
    },
    async createItem(kind, title, data) {
      const item: Item = { id: uid(), kind, title, data, created_at: now(), updated_at: now() };
      write('items', [...items(), item]);
      return item;
    },
    async updateItem(id, patch) {
      let updated: Item | undefined;
      const list = items().map((i) => {
        if (i.id !== id) return i;
        updated = { ...i, ...patch, updated_at: now() };
        return updated;
      });
      if (!updated) throw new Error('Item no encontrado');
      write('items', list);
      return updated;
    },
    async deleteItem(id) {
      const item = items().find((i) => i.id === id);
      if (item?.kind === 'file') await idb('readwrite', (s) => s.delete(id)).catch(() => {});
      write('edges', edges().filter((e) => e.source !== id && e.target !== id));
      write('items', items().filter((i) => i.id !== id));
    },
    async listEdges() {
      return edges();
    },
    async createEdge(source, target, label) {
      const edge: Edge = { id: uid(), source, target, label: label ?? null };
      write('edges', [...edges(), edge]);
      return edge;
    },
    async deleteEdge(id) {
      write('edges', edges().filter((e) => e.id !== id));
    },
    async getProfile() {
      return { ...DEFAULT_PROFILE, ...read<Partial<Profile>>('profile', {}) };
    },
    async saveProfile(p) {
      write('profile', p);
      return p;
    },
    async uploadFile(file, extra = {}) {
      const id = uid();
      await idb('readwrite', (s) => s.put(file, id));
      const item: Item = {
        id,
        kind: 'file',
        title: file.name,
        data: { name: file.name, size: file.size, mime: file.type, ...extra },
        created_at: now(),
        updated_at: now(),
      };
      write('items', [...items(), item]);
      return item;
    },
    async fileUrl(item) {
      const blob = await idb<Blob | undefined>('readonly', (s) => s.get(item.id));
      if (!blob) throw new Error('Archivo no encontrado en este navegador');
      return URL.createObjectURL(blob);
    },
  };
}
