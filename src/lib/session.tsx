'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createLocalStore } from './store/local';
import { createSupabaseStore } from './store/supabase';
import { onStoreChange, type Store } from './store';
import { DEFAULT_PROFILE, levelFromXP, type Item, type Kind, type Profile } from './types';

/* =========================================================================
   Sesión: si hay claves de Supabase → modo NUBE (login real, datos privados
   en Postgres con RLS). Si no → modo LOCAL (demo, datos en este navegador).
   ========================================================================= */

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const CLOUD = Boolean(SB_URL && SB_KEY);

let sbClient: SupabaseClient | null = null;
function supabase() {
  if (!sbClient) sbClient = createClient(SB_URL!, SB_KEY!);
  return sbClient;
}

export interface SessionUser {
  id: string;
  email: string;
}

interface SessionCtx {
  ready: boolean;
  user: SessionUser | null;
  store: Store | null;
  mode: 'cloud' | 'local';
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string): Promise<string | void>;
  signOut(): Promise<void>;
}

const Ctx = createContext<SessionCtx | null>(null);

/* ---------- cuentas locales (solo demo: hash SHA-256 con sal) ---------- */
const ACCOUNTS = 'lifeexe:accounts';
const LOCAL_SESSION = 'lifeexe:session';
async function hash(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
type Accounts = Record<string, { id: string; salt: string; hash: string }>;
const readAccounts = (): Accounts => JSON.parse(localStorage.getItem(ACCOUNTS) || '{}');

export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    if (CLOUD) {
      const sb = supabase();
      sb.auth.getSession().then(({ data }) => {
        const u = data.session?.user;
        setUser(u ? { id: u.id, email: u.email ?? '' } : null);
        setReady(true);
      });
      const { data } = sb.auth.onAuthStateChange((_e, session) => {
        const u = session?.user;
        setUser(u ? { id: u.id, email: u.email ?? '' } : null);
      });
      return () => data.subscription.unsubscribe();
    }
    try {
      const raw = localStorage.getItem(LOCAL_SESSION);
      if (raw) setUser(JSON.parse(raw));
    } catch {
      /* almacenamiento bloqueado */
    }
    setReady(true);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    email = email.trim().toLowerCase();
    if (CLOUD) {
      const { error } = await supabase().auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message === 'Invalid login credentials' ? 'Email o contraseña incorrectos' : error.message);
      return;
    }
    const acc = readAccounts()[email];
    if (!acc || acc.hash !== (await hash(acc.salt + password))) throw new Error('Usuario o contraseña incorrectos');
    const u = { id: acc.id, email };
    localStorage.setItem(LOCAL_SESSION, JSON.stringify(u));
    setUser(u);
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    email = email.trim().toLowerCase();
    if (password.length < 6) throw new Error('La contraseña necesita al menos 6 caracteres');
    if (CLOUD) {
      const { data, error } = await supabase().auth.signUp({ email, password });
      if (error) throw new Error(error.message);
      if (!data.session) return 'Te enviamos un correo para confirmar tu cuenta. Revísalo y luego entra.';
      return;
    }
    const accounts = readAccounts();
    if (accounts[email]) throw new Error('Ese usuario ya existe');
    const salt = crypto.randomUUID();
    const id = crypto.randomUUID();
    accounts[email] = { id, salt, hash: await hash(salt + password) };
    localStorage.setItem(ACCOUNTS, JSON.stringify(accounts));
    const u = { id, email };
    localStorage.setItem(LOCAL_SESSION, JSON.stringify(u));
    setUser(u);
  }, []);

  const signOut = useCallback(async () => {
    if (CLOUD) await supabase().auth.signOut();
    else localStorage.removeItem(LOCAL_SESSION);
    setUser(null);
  }, []);

  const store = useMemo(
    () => (user ? (CLOUD ? createSupabaseStore(supabase(), user.id) : createLocalStore(user.id)) : null),
    [user],
  );

  const value = useMemo<SessionCtx>(
    () => ({ ready, user, store, mode: CLOUD ? 'cloud' : 'local', signIn, signUp, signOut }),
    [ready, user, store, signIn, signUp, signOut],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSession fuera de SessionProvider');
  return ctx;
}

export function useStore(): Store {
  const { store } = useSession();
  if (!store) throw new Error('Sin sesión');
  return store;
}

/* =========================================================================
   Toasts estilo nayer.dev
   ========================================================================= */
interface Toast {
  id: number;
  text: string;
  tone: 'ok' | 'xp' | 'err';
}
const ToastCtx = createContext<(text: string, tone?: Toast['tone']) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);
  const push = useCallback((text: string, tone: Toast['tone'] = 'ok') => {
    const id = ++seq.current;
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.tone}`}>
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

/* =========================================================================
   Perfil del jugador + XP
   ========================================================================= */
interface PlayerCtx {
  profile: Profile;
  loaded: boolean;
  save(p: Partial<Profile>): Promise<void>;
  addXP(amount: number, reason?: string): Promise<void>;
}
const PlayerContext = createContext<PlayerCtx | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const store = useStore();
  const toast = useToast();
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef(profile);
  ref.current = profile;

  useEffect(() => {
    store.getProfile().then((p) => {
      setProfile(p);
      setLoaded(true);
    });
  }, [store]);

  const save = useCallback(
    async (patch: Partial<Profile>) => {
      const next = { ...ref.current, ...patch };
      setProfile(next);
      ref.current = next;
      await store.saveProfile(next);
    },
    [store],
  );

  const addXP = useCallback(
    async (amount: number, reason?: string) => {
      const before = levelFromXP(ref.current.xp).level;
      const xp = Math.max(0, ref.current.xp + amount);
      await save({ xp });
      if (amount > 0) toast(`+${amount} XP${reason ? ' · ' + reason : ''}`, 'xp');
      const after = levelFromXP(xp).level;
      if (after > before) toast(`★ LEVEL UP! Nivel ${after}`, 'xp');
    },
    [save, toast],
  );

  const value = useMemo(() => ({ profile, loaded, save, addXP }), [profile, loaded, save, addXP]);
  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer fuera de PlayerProvider');
  return ctx;
}

/* =========================================================================
   useItems: lista reactiva de items de uno o varios tipos
   ========================================================================= */
export function useItems<D = any>(kinds: Kind | Kind[]) {
  const store = useStore();
  const key = Array.isArray(kinds) ? kinds.join(',') : kinds;
  const [items, setItems] = useState<Item<D>[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const list = await store.listItems(key.split(',') as Kind[]);
    setItems(list as Item<D>[]);
    setLoading(false);
  }, [store, key]);

  useEffect(() => {
    reload();
    return onStoreChange(reload);
  }, [reload]);

  const create = useCallback((kind: Kind, title: string, data: D) => store.createItem(kind, title, data), [store]);
  const update = useCallback(
    (id: string, patch: { title?: string; data?: D }) => {
      // actualización optimista para que escribir se sienta instantáneo
      setItems((list) => list.map((i) => (i.id === id ? { ...i, ...patch } : i)));
      return store.updateItem(id, patch);
    },
    [store],
  );
  const remove = useCallback((id: string) => store.deleteItem(id), [store]);

  return { items, loading, create, update, remove, reload };
}
