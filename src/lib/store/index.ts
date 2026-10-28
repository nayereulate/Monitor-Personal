import type { Edge, Item, Kind, Profile } from '../types';

/** Interfaz común: la app no sabe si los datos están en Supabase o en el navegador. */
export interface Store {
  listItems(kinds?: Kind | Kind[]): Promise<Item[]>;
  getItem(id: string): Promise<Item | null>;
  createItem<D>(kind: Kind, title: string, data: D): Promise<Item<D>>;
  updateItem(id: string, patch: { title?: string; data?: any }): Promise<Item>;
  deleteItem(id: string): Promise<void>;

  listEdges(): Promise<Edge[]>;
  createEdge(source: string, target: string, label?: string): Promise<Edge>;
  deleteEdge(id: string): Promise<void>;

  getProfile(): Promise<Profile>;
  saveProfile(p: Profile): Promise<Profile>;

  /** Sube un archivo al baúl privado y crea el item 'file' que lo representa. */
  uploadFile(file: File, extra?: Record<string, unknown>): Promise<Item>;
  /** URL temporal (firmada / blob:) para ver o descargar el archivo. */
  fileUrl(item: Item): Promise<string>;
}

export function uid() {
  return crypto.randomUUID();
}

export function now() {
  return new Date().toISOString();
}

/* Bus de cambios: cuando una sala modifica datos, las demás vistas se refrescan. */
type Listener = () => void;
const listeners = new Set<Listener>();
export function onStoreChange(fn: Listener) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
export function emitStoreChange() {
  listeners.forEach((fn) => fn());
}
