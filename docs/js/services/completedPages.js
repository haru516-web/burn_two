import { requireSupabase } from './supabase.js';

const COMPLETED_PAGES_BUCKET = 'completed-pages';
const ACTIVE_SPACE_KEY = 'burn-active-memory-space-v1';

function getActiveSpaceStorageKey(userId) {
  return `${ACTIVE_SPACE_KEY}:${userId}`;
}

function getPreferredMemorySpaceId(userId) {
  if (typeof localStorage === 'undefined' || !userId) return '';
  try {
    return localStorage.getItem(getActiveSpaceStorageKey(userId)) || '';
  } catch {
    return '';
  }
}

export function setPreferredMemorySpaceId(userId, memorySpaceId) {
  if (typeof localStorage === 'undefined' || !userId || !memorySpaceId) return;
  try {
    localStorage.setItem(getActiveSpaceStorageKey(userId), memorySpaceId);
  } catch {
    // Non-critical. The latest membership fallback still keeps invitees on the shared space.
  }
}

function getUserEmail(user) {
  return user?.email || user?.user_metadata?.email || '';
}

function dataUrlToBlob(dataUrl) {
  const [meta, content] = String(dataUrl || '').split(',');
  const mime = meta?.match(/data:([^;]+)/)?.[1] || 'image/webp';
  const binary = atob(content || '');
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mime });
}

async function createCompletedPageUrl(client, storagePath) {
  if (!storagePath) return '';
  const { data, error } = await client.storage
    .from(COMPLETED_PAGES_BUCKET)
    .createSignedUrl(storagePath, 60 * 60);
  if (!error && data?.signedUrl) return data.signedUrl;
  return '';
}

async function upsertProfile(client, user) {
  const email = getUserEmail(user);
  const displayName = user.user_metadata?.name || email.split('@')[0] || 'you';
  const fullProfile = {
    id: user.id,
    email,
    display_name: displayName,
    updated_at: new Date().toISOString(),
  };

  const { error } = await client
    .from('profiles')
    .upsert(fullProfile, { onConflict: 'id' });
  if (!error) return;

  if (error.code === '42501') {
    console.warn('Skipping profile upsert because profiles is not writable by authenticated users.', error);
    return;
  }

  if (error.code !== 'PGRST204') {
    throw error;
  }

  const { error: minimalError } = await client
    .from('profiles')
    .upsert({ id: user.id }, { onConflict: 'id' });
  if (minimalError?.code === '42501') {
    console.warn('Skipping minimal profile upsert because profiles is not writable by authenticated users.', minimalError);
    return;
  }
  if (minimalError) throw minimalError;
}

export async function ensureProfileAndMemorySpace() {
  const client = requireSupabase();
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError) throw userError;
  const user = userData.user;
  if (!user) throw new Error('ログインが必要です。');

  await upsertProfile(client, user);

  const preferredMemorySpaceId = getPreferredMemorySpaceId(user.id);
  if (preferredMemorySpaceId) {
    const { data: preferredMembership, error: preferredError } = await client
      .from('space_members')
      .select('space_id')
      .eq('user_id', user.id)
      .eq('space_id', preferredMemorySpaceId)
      .maybeSingle();
    if (preferredError) throw preferredError;
    if (preferredMembership?.space_id) {
      return { user, memorySpaceId: preferredMembership.space_id };
    }
  }

  const { data: membership, error: membershipError } = await client
    .from('space_members')
    .select('space_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (membershipError) throw membershipError;
  if (membership?.space_id) {
    setPreferredMemorySpaceId(user.id, membership.space_id);
    return { user, memorySpaceId: membership.space_id };
  }

  const { data: space, error: spaceError } = await client
    .from('memory_spaces')
    .insert({
      owner_id: user.id,
    })
    .select('id')
    .single();
  if (spaceError) throw spaceError;

  const { error: memberError } = await client
    .from('space_members')
    .upsert({
      space_id: space.id,
      user_id: user.id,
      role: 'owner',
    }, { onConflict: 'space_id,user_id' });
  if (memberError) throw memberError;

  setPreferredMemorySpaceId(user.id, space.id);
  return { user, memorySpaceId: space.id };
}

export function extractTextLayers(editorSnapshot = {}) {
  const textKeys = ['text', 'headline', 'subhead', 'text2', 'text3', 'intro', 'body', 'date', 'editor'];
  return textKeys
    .filter((key) => typeof editorSnapshot[key] === 'string')
    .map((key, index) => ({
      key,
      text: editorSnapshot[key],
      style: editorSnapshot.textStyles?.[key] || null,
      zIndex: index,
    }));
}

export async function saveCompletedPage({
  pageId,
  title,
  editorSnapshot,
  finalImageData,
}) {
  const client = requireSupabase();
  const { user, memorySpaceId } = await ensureProfileAndMemorySpace();
  const completedPageId = crypto.randomUUID();
  const finalImagePath = `${memorySpaceId}/${completedPageId}/final.webp`;
  const finalImageBlob = dataUrlToBlob(finalImageData || editorSnapshot?.imageData || '');
  if (!finalImageBlob.size) throw new Error('完成ページ画像がありません。');
  const now = new Date().toISOString();

  const { error: uploadError } = await client.storage
    .from(COMPLETED_PAGES_BUCKET)
    .upload(finalImagePath, finalImageBlob, {
      contentType: 'image/webp',
      upsert: false,
    });
  if (uploadError) throw uploadError;

  const { data, error } = await client
    .from('completed_pages')
    .insert({
      id: completedPageId,
      page_id: pageId || null,
      space_id: memorySpaceId,
      author_id: user.id,
      title: title || 'Untitled',
      final_image_path: finalImagePath,
      is_locked: true,
      editor_snapshot_json: {
        ...(editorSnapshot || {}),
        imageData: '',
        finalImagePath,
        isLocked: true,
      },
      updated_at: now,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function listCompletedPages() {
  const client = requireSupabase();
  const { memorySpaceId } = await ensureProfileAndMemorySpace();
  const { data, error } = await client
    .from('completed_pages')
    .select('*')
    .eq('space_id', memorySpaceId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return Promise.all((data || []).map(async (page) => ({
    ...page,
    finalImageUrl: await createCompletedPageUrl(client, page.final_image_path || page.final_base_image_path || page.final_preview_image_path),
  })));
}

export function completedPageToLocalPost(page, authorName = 'you') {
  const snapshot = page.editor_snapshot_json && typeof page.editor_snapshot_json === 'object'
    ? page.editor_snapshot_json
    : {};
  return {
    id: `completed_${page.id}`,
    authorName,
    authorIcon: (authorName || 'U').trim().slice(0, 1).toUpperCase(),
    caption: page.title || snapshot.headline || 'Untitled',
    imageData: page.finalImageUrl || snapshot.imageData || '',
    fixedTags: Array.isArray(snapshot.fixedTags) ? snapshot.fixedTags : ['completed'],
    freeTags: Array.isArray(snapshot.freeTags) ? snapshot.freeTags : [],
    likes: 0,
    saves: 0,
    comments: [],
    impressions: 0,
    liked: false,
    saved: false,
    createdAt: snapshot.createdAt || snapshot.composeData?.createdAt || page.completed_at || page.created_at || new Date().toISOString(),
    updatedAt: page.updated_at || null,
    composeData: {
      ...(snapshot.composeData || snapshot),
      source: snapshot.source || snapshot.composeData?.source || 'completed_page',
      completedPageId: page.id,
      finalImagePath: page.final_image_path || snapshot.finalImagePath || '',
      isLocked: true,
    },
  };
}
