import { requireSupabase } from './supabase.js';

const COMPLETED_PAGES_BUCKET = 'completed-pages';
const ACTIVE_SPACE_KEY = 'burn-active-memory-space-v1';
const PERSONAL_SPACE_KEY = 'burn-personal-memory-space-v1';

function getActiveSpaceStorageKey(userId) {
  return `${ACTIVE_SPACE_KEY}:${userId}`;
}

function getPersonalSpaceStorageKey(userId) {
  return `${PERSONAL_SPACE_KEY}:${userId}`;
}

function getPreferredMemorySpaceId(userId) {
  if (typeof localStorage === 'undefined' || !userId) return '';
  try {
    return localStorage.getItem(getActiveSpaceStorageKey(userId)) || '';
  } catch {
    return '';
  }
}

function getPersonalMemorySpaceId(userId) {
  if (typeof localStorage === 'undefined' || !userId) return '';
  try {
    return localStorage.getItem(getPersonalSpaceStorageKey(userId)) || '';
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

export function setPersonalMemorySpaceId(userId, memorySpaceId) {
  if (typeof localStorage === 'undefined' || !userId || !memorySpaceId) return;
  try {
    localStorage.setItem(getPersonalSpaceStorageKey(userId), memorySpaceId);
  } catch {
    // Non-critical. A personal space can be recreated if local storage is unavailable.
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

function getCompletedPageStoragePaths(page = {}) {
  return Array.from(new Set([
    page.final_image_path,
    page.final_base_image_path,
    page.final_preview_image_path,
    page.editor_snapshot_json?.finalImagePath,
  ]
    .map((path) => String(path || '').trim())
    .filter(Boolean)));
}

async function removeCompletedPageFiles(client, page = {}) {
  const paths = getCompletedPageStoragePaths(page);
  if (!paths.length) return;
  const { error } = await client.storage.from(COMPLETED_PAGES_BUCKET).remove(paths);
  if (error) {
    console.warn('Failed to remove completed page files from storage.', error);
  }
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

async function getVerifiedMembership(client, userId, spaceId) {
  if (!spaceId) return null;
  const { data, error } = await client
    .from('space_members')
    .select('space_id')
    .eq('user_id', userId)
    .eq('space_id', spaceId)
    .maybeSingle();
  if (error) throw error;
  return data?.space_id || null;
}

async function createOwnedMemorySpace(client, userId) {
  const { data: space, error: spaceError } = await client
    .from('memory_spaces')
    .insert({
      owner_id: userId,
    })
    .select('id')
    .single();
  if (spaceError) throw spaceError;

  const { error: memberError } = await client
    .from('space_members')
    .upsert({
      space_id: space.id,
      user_id: userId,
      role: 'owner',
    }, { onConflict: 'space_id,user_id' });
  if (memberError) throw memberError;

  return space.id;
}

export async function ensureProfileAndMemorySpace({ scope = 'shared' } = {}) {
  const client = requireSupabase();
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError) throw userError;
  const user = userData.user;
  if (!user) throw new Error('ログインが必要です。');

  await upsertProfile(client, user);

  if (scope === 'personal') {
    const personalMemorySpaceId = getPersonalMemorySpaceId(user.id);
    const verifiedPersonalSpaceId = await getVerifiedMembership(client, user.id, personalMemorySpaceId);
    if (verifiedPersonalSpaceId) {
      return { user, memorySpaceId: verifiedPersonalSpaceId, storageScope: 'personal' };
    }

    const personalSpaceId = await createOwnedMemorySpace(client, user.id);
    setPersonalMemorySpaceId(user.id, personalSpaceId);
    return { user, memorySpaceId: personalSpaceId, storageScope: 'personal' };
  }

  const preferredMemorySpaceId = getPreferredMemorySpaceId(user.id);
  const verifiedPreferredSpaceId = await getVerifiedMembership(client, user.id, preferredMemorySpaceId);
  if (verifiedPreferredSpaceId) {
    return { user, memorySpaceId: verifiedPreferredSpaceId, storageScope: 'shared' };
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
    return { user, memorySpaceId: membership.space_id, storageScope: 'shared' };
  }

  const spaceId = await createOwnedMemorySpace(client, user.id);
  setPreferredMemorySpaceId(user.id, spaceId);
  setPersonalMemorySpaceId(user.id, spaceId);
  return { user, memorySpaceId: spaceId, storageScope: 'shared' };
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
  storageScope = 'shared',
}) {
  const client = requireSupabase();
  const displayScope = storageScope === 'personal' ? 'personal' : 'shared';
  const displaySaveScope = displayScope === 'personal' ? 'personal' : 'couple';
  const { user, memorySpaceId: storageSpaceId } = await ensureProfileAndMemorySpace({ scope: 'personal' });
  const displaySpaceId = displayScope === 'shared'
    ? (await ensureProfileAndMemorySpace({ scope: 'shared' })).memorySpaceId
    : null;
  const completedPageId = crypto.randomUUID();
  const finalImagePath = `${storageSpaceId}/${completedPageId}/final.webp`;
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
      space_id: storageSpaceId,
      display_space_id: displaySpaceId,
      author_id: user.id,
      title: title || 'Untitled',
      final_image_path: finalImagePath,
      save_scope: displaySaveScope,
      display_scope: displaySaveScope,
      is_locked: true,
      editor_snapshot_json: {
        ...(editorSnapshot || {}),
        imageData: '',
        finalImagePath,
        isLocked: true,
        storageScope: displayScope,
        saveScope: displaySaveScope,
        displayScope: displaySaveScope,
      },
      updated_at: now,
    })
    .select('*')
    .single();

  if (error) throw error;
  return {
    ...data,
    storageScope: displayScope,
  };
}

export async function listCompletedPages({ storageScope = 'shared' } = {}) {
  const client = requireSupabase();
  const resolvedScope = storageScope === 'personal' ? 'personal' : 'shared';
  const { user, memorySpaceId } = await ensureProfileAndMemorySpace({ scope: resolvedScope });
  let query = client
    .from('completed_pages')
    .select('*')
    .order('created_at', { ascending: false });
  if (resolvedScope === 'personal') {
    query = query
      .eq('author_id', user.id)
      .eq('display_scope', 'personal');
  } else {
    query = query
      .eq('display_space_id', memorySpaceId)
      .eq('display_scope', 'couple');
  }
  const { data, error } = await query;

  if (error) throw error;
  return Promise.all((data || []).map(async (page) => ({
    ...page,
    storageScope: resolvedScope,
    finalImageUrl: await createCompletedPageUrl(client, page.final_image_path || page.final_base_image_path || page.final_preview_image_path),
  })));
}

export async function moveCompletedPageStorageScope(pageId, nextStorageScope = 'shared') {
  const normalizedPageId = String(pageId || '').replace(/^completed_/, '');
  if (!normalizedPageId) throw new Error('Page id is missing.');

  const client = requireSupabase();
  const targetScope = nextStorageScope === 'personal' ? 'personal' : 'shared';
  const targetDisplayScope = targetScope === 'personal' ? 'personal' : 'couple';
  const { user } = await ensureProfileAndMemorySpace({ scope: 'personal' });
  const targetDisplaySpaceId = targetScope === 'shared'
    ? (await ensureProfileAndMemorySpace({ scope: 'shared' })).memorySpaceId
    : null;
  const { data: page, error: readError } = await client
    .from('completed_pages')
    .select('*')
    .eq('id', normalizedPageId)
    .eq('author_id', user.id)
    .single();
  if (readError) throw readError;

  const snapshot = page.editor_snapshot_json && typeof page.editor_snapshot_json === 'object'
    ? page.editor_snapshot_json
    : {};
  const nextSnapshot = {
    ...snapshot,
    storageScope: targetScope,
    saveScope: targetDisplayScope,
    displayScope: targetDisplayScope,
  };

  const { data, error } = await client
    .from('completed_pages')
    .update({
      display_space_id: targetDisplaySpaceId,
      save_scope: targetDisplayScope,
      display_scope: targetDisplayScope,
      editor_snapshot_json: nextSnapshot,
      updated_at: new Date().toISOString(),
    })
    .eq('id', normalizedPageId)
    .eq('author_id', user.id)
    .select('*')
    .single();
  if (error) throw error;

  return {
    ...data,
    storageScope: targetScope,
    finalImageUrl: await createCompletedPageUrl(client, data.final_image_path || data.final_base_image_path || data.final_preview_image_path),
  };
}

export async function deleteCompletedPage(pageId) {
  const normalizedPageId = String(pageId || '').replace(/^completed_/, '');
  if (!normalizedPageId) throw new Error('Page id is missing.');

  const client = requireSupabase();
  const { user } = await ensureProfileAndMemorySpace({ scope: 'personal' });
  const { data: page, error: readError } = await client
    .from('completed_pages')
    .select('*')
    .eq('id', normalizedPageId)
    .eq('author_id', user.id)
    .maybeSingle();
  if (readError) throw readError;
  if (!page) return true;

  await removeCompletedPageFiles(client, page);

  const { error } = await client
    .from('completed_pages')
    .delete()
    .eq('id', normalizedPageId)
    .eq('author_id', user.id);
  if (error) throw error;
  return true;
}

export function completedPageToLocalPost(page, authorName = 'you') {
  const snapshot = page.editor_snapshot_json && typeof page.editor_snapshot_json === 'object'
    ? page.editor_snapshot_json
    : {};
  const snapshotComposeData = snapshot.composeData && typeof snapshot.composeData === 'object'
    ? snapshot.composeData
    : {};
  const resolvedAuthorName = String(snapshot.authorName || authorName || 'you').trim() || 'you';
  return {
    id: `completed_${page.id}`,
    authorId: page.author_id || '',
    authorName: resolvedAuthorName,
    authorIcon: (resolvedAuthorName || 'U').trim().slice(0, 1).toUpperCase(),
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
    storageScope: page.storageScope || snapshot.storageScope || (page.display_scope === 'personal' ? 'personal' : 'shared'),
    saveScope: page.display_scope || page.save_scope || snapshot.saveScope || (page.storageScope === 'personal' ? 'personal' : 'couple'),
    composeData: {
      ...snapshot,
      ...snapshotComposeData,
      source: snapshot.source || snapshotComposeData.source || 'completed_page',
      completedPageId: page.id,
      finalImagePath: page.final_image_path || snapshot.finalImagePath || '',
      isLocked: true,
    },
  };
}
