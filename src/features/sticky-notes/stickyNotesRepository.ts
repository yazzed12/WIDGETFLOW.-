import { getSupabaseBrowserClient } from '../../lib/supabase/client';
import type { StickyNote, StickyNoteInput } from './stickyNotesTypes';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const map = (r: any): StickyNote => ({ id:r.id,userId:r.user_id,title:r.title,content:r.content,colorKey:r.color_key,isPinned:r.is_pinned,createdAt:r.created_at,updatedAt:r.updated_at,archivedAt:r.archived_at });

export function buildStickyNoteInsertPayload(input: StickyNoteInput, profileId: string) {
  if (!UUID_PATTERN.test(profileId)) throw new Error('Authenticated profile UUID is required.');
  return { user_id: profileId, title:input.title.trim(),content:input.content.trim(),color_key:input.colorKey,is_pinned:input.isPinned };
}

async function getAuthenticatedProfileId(client: ReturnType<typeof getSupabaseBrowserClient>): Promise<string> {
  const { data, error } = await client.auth.getUser();
  if (error) throw error;
  const profileId = data.user?.id;
  if (!profileId || !UUID_PATTERN.test(profileId)) throw new Error('Authenticated profile UUID is required.');
  // public.profiles.id is the canonical profile identity and is the auth.users.id FK.
  return profileId;
}

function requireNoteId(id: string): string {
  if (!UUID_PATTERN.test(id)) throw new Error('Sticky note UUID is required.');
  return id;
}

export const stickyNotesRepository = {
  async list() { const { data,error }=await getSupabaseBrowserClient().from('sticky_notes').select('*').is('archived_at',null).order('is_pinned',{ascending:false}).order('updated_at',{ascending:false}); if(error) throw error; return (data??[]).map(map); },
  async create(input: StickyNoteInput) { const client = getSupabaseBrowserClient(); const profileId = await getAuthenticatedProfileId(client); const { data,error }=await client.from('sticky_notes').insert(buildStickyNoteInsertPayload(input, profileId)).select().single(); if(error) throw error; return map(data); },
  async update(id:string,input:StickyNoteInput) { const { data,error }=await getSupabaseBrowserClient().from('sticky_notes').update({title:input.title.trim(),content:input.content.trim(),color_key:input.colorKey,is_pinned:input.isPinned}).eq('id',requireNoteId(id)).select().single(); if(error) throw error; return map(data); },
  async remove(id:string) { const { error }=await getSupabaseBrowserClient().from('sticky_notes').delete().eq('id',requireNoteId(id)); if(error) throw error; },
};
