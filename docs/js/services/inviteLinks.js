import { requireSupabase } from './supabase.js';
import { ensureProfileAndMemorySpace, setPreferredMemorySpaceId } from './completedPages.js';

export function getInviteCodeFromUrl() {
  if (typeof window === 'undefined') return '';
  return String(new URLSearchParams(window.location.search).get('code') || '').trim();
}

function createInviteCode() {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
}

async function createInviteCodeDirect(client, user, memorySpaceId) {
  const expiresAt = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)).toISOString();
  let lastError = null;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = createInviteCode();
    const { data, error } = await client
      .from('invite_links')
      .insert({
        couple_id: memorySpaceId,
        inviter_id: user.id,
        code,
        expires_at: expiresAt,
      })
      .select('code, expires_at')
      .single();

    if (!error) {
      const rowCode = String(data?.code || code).trim();
      return {
        code: rowCode,
        expiresAt: data?.expires_at || expiresAt,
      };
    }

    lastError = error;
    if (error.code !== '23505') break;
  }

  throw lastError || new Error('Invite link could not be created.');
}

export async function createInviteLink() {
  const client = requireSupabase();
  const { user, memorySpaceId } = await ensureProfileAndMemorySpace();
  return createInviteCodeDirect(client, user, memorySpaceId);
}

export async function acceptInviteLink(code) {
  const normalizedCode = String(code || '').trim();
  if (!normalizedCode) throw new Error('Invite code is missing.');
  const client = requireSupabase();
  await ensureProfileAndMemorySpace();
  const { data, error } = await client.rpc('accept_invite_link', {
    invite_code: normalizedCode,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (row?.couple_id) {
    const { user } = await ensureProfileAndMemorySpace();
    setPreferredMemorySpaceId(user.id, row.couple_id);
  }
  return {
    coupleId: row?.couple_id || null,
    status: row?.status || 'accepted',
  };
}
