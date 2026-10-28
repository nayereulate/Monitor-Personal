import type { SupabaseClient } from '@supabase/supabase-js';
import { DEFAULT_PROFILE, type Edge, type Item, type Profile } from '../types';
import { emitStoreChange, uid, type Store } from './index';

const BUCKET = 'vault';

/** Modo nube: Postgres + Storage privado; RLS garantiza que cada usuario solo vea lo suyo. */
export function createSupabaseStore(sb: SupabaseClient, userId: string): Store {
  const ok = <T,>(res: { data: T; error: { message: string } | null }): T => {
    if (res.error) throw new Error(res.error.message);
    return res.data;
  };
  const changed = <T,>(v: T) => {
    emitStoreChange();
    return v;
  };

  const store: Store = {
    async listItems(kinds) {
      let q = sb.from('items').select('*').order('created_at');
      if (kinds) q = q.in('kind', Array.isArray(kinds) ? kinds : [kinds]);
      return ok(await q) as Item[];
    },
    async getItem(id) {
      return ok(await sb.from('items').select('*').eq('id', id).maybeSingle()) as Item | null;
    },
    async createItem(kind, title, data) {
      const row = ok(await sb.from('items').insert({ kind, title, data }).select().single());
      return changed(row as Item<any>);
    },
    async updateItem(id, patch) {
      const row = ok(
        await sb
          .from('items')
          .update({ ...patch, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select()
          .single(),
      );
      return changed(row as Item);
    },
    async deleteItem(id) {
      const item = ok(await sb.from('items').select('*').eq('id', id).maybeSingle()) as Item | null;
      if (item?.kind === 'file' && item.data?.path) {
        await sb.storage.from(BUCKET).remove([item.data.path]);
      }
      ok(await sb.from('items').delete().eq('id', id));
      changed(null);
    },
    async listEdges() {
      return (ok(await sb.from('edges').select('id,source,target,label')) ?? []) as Edge[];
    },
    async createEdge(source, target, label) {
      return changed(ok(await sb.from('edges').insert({ source, target, label }).select('id,source,target,label').single()) as Edge);
    },
    async deleteEdge(id) {
      ok(await sb.from('edges').delete().eq('id', id));
      changed(null);
    },
    async getProfile() {
      const row = ok(await sb.from('profiles').select('data').eq('user_id', userId).maybeSingle()) as {
        data: Partial<Profile>;
      } | null;
      return { ...DEFAULT_PROFILE, ...(row?.data ?? {}) };
    },
    async saveProfile(p) {
      ok(await sb.from('profiles').upsert({ user_id: userId, data: p, updated_at: new Date().toISOString() }));
      return changed(p);
    },
    async uploadFile(file, extra = {}) {
      const safe = file.name.replace(/[^\w.\-]+/g, '_');
      const path = `${userId}/${uid()}-${safe}`;
      const up = await sb.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
      if (up.error) throw new Error(up.error.message);
      return store.createItem('file', file.name, { name: file.name, size: file.size, mime: file.type, path, ...extra });
    },
    async fileUrl(item) {
      const res = await sb.storage.from(BUCKET).createSignedUrl(item.data.path, 60 * 30);
      if (res.error) throw new Error(res.error.message);
      return res.data.signedUrl;
    },
  };
  return store;
}
