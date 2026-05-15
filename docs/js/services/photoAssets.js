import { ensureProfileAndMemorySpace } from './completedPages.js';
import { requireSupabase } from './supabase.js';

const PHOTO_BUCKET = 'photo-assets';
const PHOTO_EXPIRY_RETENTION_DAYS = 1;
const PHOTO_EXPIRY_TIME_ZONE = 'Asia/Tokyo';

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

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to load photo.'));
    image.src = dataUrl;
  });
}

function canvasToWebpBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to convert image to WebP.'));
    }, 'image/webp', quality);
  });
}

async function dataUrlToWebpBlob(dataUrl, { maxWidth = 1800, quality = 0.92 } = {}) {
  const image = await loadImage(dataUrl);
  const ratio = image.naturalWidth / image.naturalHeight;
  const width = Math.min(image.naturalWidth, maxWidth);
  const height = Math.round(width / ratio);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrlToBlob(dataUrl);
  ctx.drawImage(image, 0, 0, width, height);
  return canvasToWebpBlob(canvas, quality);
}

function getTokyoDateParts(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: PHOTO_EXPIRY_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function getPhotoExpiryAt(capturedAt) {
  const parts = getTokyoDateParts(capturedAt);
  const year = Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);
  if (!year || !month || !day) {
    const fallback = new Date(capturedAt);
    fallback.setDate(fallback.getDate() + PHOTO_EXPIRY_RETENTION_DAYS);
    fallback.setHours(15, 0, 0, 0);
    return fallback;
  }
  return new Date(Date.UTC(year, month - 1, day + 1, 6, 0, 0, 0));
}

async function createPhotoUrl(client, storagePath) {
  if (!storagePath) return '';
  const { data, error } = await client.storage
    .from(PHOTO_BUCKET)
    .createSignedUrl(storagePath, 60 * 60);
  if (!error && data?.signedUrl) return data.signedUrl;
  return '';
}

async function markExpiredPhotoAssetsDeleted(client, currentIso) {
  const { error } = await client
    .from('photo_assets')
    .update({
      deleted_at: currentIso,
      updated_at: currentIso,
    })
    .is('deleted_at', null)
    .lte('expires_at', currentIso);
  if (error) {
    console.warn('Failed to mark expired photos as deleted.', error);
  }
}

function photoAssetToRecordMemory(asset, imageData = '') {
  const capturedAt = asset.captured_at || asset.created_at || new Date().toISOString();
  const storageScope = asset.storageScope || asset.displayScope || (asset.display_scope === 'personal' ? 'personal' : 'shared');
  return {
    id: asset.id,
    authorId: asset.author_id || asset.user_id || '',
    imageData,
    storagePath: asset.storage_path || '',
    thumbnailPath: asset.thumbnail_path || '',
    sourceType: asset.source_type || 'album',
    time: new Date(capturedAt).toTimeString().slice(0, 5),
    place: asset.place || '',
    memo: asset.memo || '',
    price: asset.price || '',
    timeOfDay: asset.time_of_day || asset.timeOfDay || '',
    atmosphere: asset.atmosphere || '',
    weather: asset.weather || '',
    mood: asset.mood || '',
    tags: Array.isArray(asset.tags) ? asset.tags : [],
    frame: asset.frame === 'portrait' ? 'portrait' : 'landscape',
    pageCrop: asset.page_crop || { x: 0.5, y: 0.5, zoom: 1 },
    createdAt: capturedAt,
    updatedAt: asset.updated_at || null,
    expiresAt: asset.expires_at || null,
    storageScope,
    saveScope: asset.display_scope || asset.save_scope || (storageScope === 'personal' ? 'personal' : 'couple'),
  };
}

function buildPhotoTags({ place = '', memo = '', price = '', timeOfDay = '', atmosphere = '', weather = '', mood = '', tags = [] } = {}) {
  return Array.from(new Set([
    place,
    memo,
    price,
    timeOfDay,
    atmosphere,
    weather,
    mood,
    ...(Array.isArray(tags) ? tags : []),
  ]
    .map((tag) => String(tag || '').trim())
    .filter(Boolean)));
}

function isMissingDisplayColumnError(error) {
  const message = String(error?.message || error?.details || '');
  return error?.code === '42703'
    || message.includes('display_scope')
    || message.includes('display_space_id')
    || message.includes('author_id');
}

export async function savePhotoAsset({ imageData, sourceType = 'album', frame = 'landscape', place = '', memo = '', price = '', timeOfDay = '', atmosphere = '', weather = '', mood = '', tags = [], createdAt = '', storageScope = 'shared' }) {
  if (!imageData) throw new Error('Photo image data is required.');
  const client = requireSupabase();
  const displayScope = storageScope === 'personal' ? 'personal' : 'shared';
  const displaySaveScope = displayScope === 'personal' ? 'personal' : 'couple';
  const { user, memorySpaceId: storageSpaceId } = await ensureProfileAndMemorySpace({ scope: 'personal' });
  const displaySpaceId = displayScope === 'shared'
    ? (await ensureProfileAndMemorySpace({ scope: 'shared' })).memorySpaceId
    : null;
  const capturedAt = createdAt ? new Date(createdAt) : new Date();
  const now = Number.isNaN(capturedAt.getTime()) ? new Date() : capturedAt;
  const assetId = crypto.randomUUID();
  const storagePath = `${storageSpaceId}/${assetId}/original.webp`;
  const thumbnailPath = `${storageSpaceId}/${assetId}/thumbnail.webp`;
  const blob = await dataUrlToWebpBlob(imageData, { maxWidth: 1800, quality: 0.92 });
  const thumbnailBlob = await dataUrlToWebpBlob(imageData, { maxWidth: 420, quality: 0.78 });

  const { error: uploadError } = await client.storage
    .from(PHOTO_BUCKET)
    .upload(storagePath, blob, {
      contentType: 'image/webp',
      upsert: false,
    });
  if (uploadError) throw uploadError;

  const { error: thumbnailUploadError } = await client.storage
    .from(PHOTO_BUCKET)
    .upload(thumbnailPath, thumbnailBlob, {
      contentType: 'image/webp',
      upsert: false,
    });
  if (thumbnailUploadError) throw thumbnailUploadError;

  const insertPayload = {
    id: assetId,
    user_id: user.id,
    author_id: user.id,
    space_id: storageSpaceId,
    memory_space_id: storageSpaceId,
    display_space_id: displaySpaceId,
    display_scope: displaySaveScope,
    source_type: sourceType === 'camera' ? 'camera' : 'album',
    storage_path: storagePath,
    thumbnail_path: thumbnailPath,
    captured_at: now.toISOString(),
    place: String(place || '').trim(),
    memo: String(memo || '').trim(),
    price: String(price || '').trim(),
    time_of_day: String(timeOfDay || '').trim(),
    atmosphere: String(atmosphere || '').trim(),
    weather: String(weather || '').trim(),
    mood: String(mood || '').trim(),
    tags: buildPhotoTags({ place, memo, price, timeOfDay, atmosphere, weather, mood, tags }),
    expires_at: getPhotoExpiryAt(now).toISOString(),
    retention_days: PHOTO_EXPIRY_RETENTION_DAYS,
  };

  let { data, error } = await client
    .from('photo_assets')
    .insert(insertPayload)
    .select('*')
    .single();
  if (error && isMissingDisplayColumnError(error)) {
    const {
      author_id: _authorId,
      display_space_id: _displaySpaceId,
      display_scope: _displayScope,
      price: _price,
      time_of_day: _timeOfDay,
      atmosphere: _atmosphere,
      weather: _weather,
      mood: _mood,
      tags: _tags,
      ...legacyPayload
    } = insertPayload;
    ({ data, error } = await client
      .from('photo_assets')
      .insert(legacyPayload)
      .select('*')
      .single());
  }
  if (error) throw error;

  return {
    ...photoAssetToRecordMemory({ ...data, storageScope: displayScope }, imageData),
    place,
    memo,
    price,
    timeOfDay,
    atmosphere,
    weather,
    mood,
    tags: buildPhotoTags({ place, memo, price, timeOfDay, atmosphere, weather, mood, tags }),
    frame: frame === 'portrait' ? 'portrait' : 'landscape',
  };
}

export async function listPhotoAssets({ storageScope = 'shared' } = {}) {
  const client = requireSupabase();
  const resolvedScope = storageScope === 'personal' ? 'personal' : 'shared';
  const displayScope = resolvedScope === 'personal' ? 'personal' : 'couple';
  const currentIso = new Date().toISOString();
  const { user, memorySpaceId } = await ensureProfileAndMemorySpace({ scope: resolvedScope });
  await markExpiredPhotoAssetsDeleted(client, currentIso);
  let query = client
    .from('photo_assets')
    .select('*')
    .is('deleted_at', null)
    .gt('expires_at', currentIso)
    .order('captured_at', { ascending: false });
  if (resolvedScope === 'personal') {
    query = query
      .or(`author_id.eq.${user.id},user_id.eq.${user.id}`)
      .eq('display_scope', displayScope);
  } else {
    query = query
      .eq('display_space_id', memorySpaceId)
      .eq('display_scope', displayScope);
  }
  let { data, error } = await query;
  if (error && isMissingDisplayColumnError(error)) {
    ({ data, error } = await client
      .from('photo_assets')
      .select('*')
      .or(`space_id.eq.${memorySpaceId},memory_space_id.eq.${memorySpaceId}`)
      .is('deleted_at', null)
      .gt('expires_at', currentIso)
      .order('captured_at', { ascending: false }));
  }
  if (error) throw error;

  return Promise.all((data || []).map(async (asset) => {
    const imageData = await createPhotoUrl(client, asset.thumbnail_path || asset.storage_path)
      || await createPhotoUrl(client, asset.storage_path);
    return photoAssetToRecordMemory({ ...asset, storageScope: resolvedScope }, imageData);
  }));
}

export async function updatePhotoAssetMeta(photoId, { place = '', memo = '', price = '', timeOfDay = '', atmosphere = '', weather = '', mood = '', tags = [] } = {}) {
  const normalizedPhotoId = String(photoId || '');
  if (!normalizedPhotoId) throw new Error('Photo id is missing.');

  const client = requireSupabase();
  const { user } = await ensureProfileAndMemorySpace({ scope: 'personal' });
  const { data, error } = await client
    .from('photo_assets')
    .update({
      place: String(place || '').trim(),
      memo: String(memo || '').trim(),
      price: String(price || '').trim(),
      time_of_day: String(timeOfDay || '').trim(),
      atmosphere: String(atmosphere || '').trim(),
      weather: String(weather || '').trim(),
      mood: String(mood || '').trim(),
      tags: buildPhotoTags({ place, memo, price, timeOfDay, atmosphere, weather, mood, tags }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', normalizedPhotoId)
    .eq('author_id', user.id)
    .select('*')
    .single();
  if (error) throw error;
  return photoAssetToRecordMemory(data);
}

export async function movePhotoAssetStorageScope(photoId, nextStorageScope = 'shared') {
  const normalizedPhotoId = String(photoId || '');
  if (!normalizedPhotoId) throw new Error('Photo id is missing.');

  const client = requireSupabase();
  const targetScope = nextStorageScope === 'personal' ? 'personal' : 'shared';
  const targetDisplayScope = targetScope === 'personal' ? 'personal' : 'couple';
  const { user } = await ensureProfileAndMemorySpace({ scope: 'personal' });
  const targetDisplaySpaceId = targetScope === 'shared'
    ? (await ensureProfileAndMemorySpace({ scope: 'shared' })).memorySpaceId
    : null;

  const { data, error } = await client
    .from('photo_assets')
    .update({
      display_space_id: targetDisplaySpaceId,
      display_scope: targetDisplayScope,
      updated_at: new Date().toISOString(),
    })
    .eq('id', normalizedPhotoId)
    .eq('author_id', user.id)
    .select('*')
    .single();
  if (error) throw error;

  return photoAssetToRecordMemory({ ...data, storageScope: targetScope });
}

export async function deletePhotoAsset(photoId) {
  const normalizedPhotoId = String(photoId || '');
  if (!normalizedPhotoId) throw new Error('Photo id is missing.');

  const client = requireSupabase();
  const { user } = await ensureProfileAndMemorySpace({ scope: 'personal' });
  const { error } = await client
    .from('photo_assets')
    .update({
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', normalizedPhotoId)
    .eq('author_id', user.id);
  if (error) throw error;
  return true;
}
