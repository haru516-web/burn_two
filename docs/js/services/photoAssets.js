import { ensureProfileAndMemorySpace } from './completedPages.js';
import { requireSupabase } from './supabase.js';

const PHOTO_BUCKET = 'photo-assets';
const RETENTION_DAYS = 3;

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

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

async function createPhotoUrl(client, storagePath) {
  if (!storagePath) return '';
  const { data, error } = await client.storage
    .from(PHOTO_BUCKET)
    .createSignedUrl(storagePath, 60 * 60);
  if (!error && data?.signedUrl) return data.signedUrl;
  return '';
}

function photoAssetToRecordMemory(asset, imageData = '') {
  const capturedAt = asset.captured_at || asset.created_at || new Date().toISOString();
  return {
    id: asset.id,
    imageData,
    storagePath: asset.storage_path || '',
    thumbnailPath: asset.thumbnail_path || '',
    sourceType: asset.source_type || 'album',
    time: new Date(capturedAt).toTimeString().slice(0, 5),
    place: asset.place || '',
    memo: asset.memo || '',
    frame: asset.frame === 'portrait' ? 'portrait' : 'landscape',
    pageCrop: asset.page_crop || { x: 0.5, y: 0.5, zoom: 1 },
    createdAt: capturedAt,
    expiresAt: asset.expires_at || null,
  };
}

export async function savePhotoAsset({ imageData, sourceType = 'album', frame = 'landscape', place = '', memo = '', createdAt = '' }) {
  if (!imageData) throw new Error('Photo image data is required.');
  const client = requireSupabase();
  const { user, memorySpaceId } = await ensureProfileAndMemorySpace();
  const capturedAt = createdAt ? new Date(createdAt) : new Date();
  const now = Number.isNaN(capturedAt.getTime()) ? new Date() : capturedAt;
  const assetId = crypto.randomUUID();
  const storagePath = `${memorySpaceId}/${assetId}/original.webp`;
  const thumbnailPath = `${memorySpaceId}/${assetId}/thumbnail.webp`;
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

  const { data, error } = await client
    .from('photo_assets')
    .insert({
      id: assetId,
      user_id: user.id,
      space_id: memorySpaceId,
      source_type: sourceType === 'camera' ? 'camera' : 'album',
      storage_path: storagePath,
      thumbnail_path: thumbnailPath,
      captured_at: now.toISOString(),
      expires_at: addDays(now, RETENTION_DAYS).toISOString(),
      retention_days: RETENTION_DAYS,
    })
    .select('*')
    .single();
  if (error) throw error;

  return {
    ...photoAssetToRecordMemory(data, imageData),
    place,
    memo,
    frame: frame === 'portrait' ? 'portrait' : 'landscape',
  };
}

export async function listPhotoAssets() {
  const client = requireSupabase();
  const { memorySpaceId } = await ensureProfileAndMemorySpace();
  const { data, error } = await client
    .from('photo_assets')
    .select('*')
    .eq('space_id', memorySpaceId)
    .is('deleted_at', null)
    .order('captured_at', { ascending: false });
  if (error) throw error;

  return Promise.all((data || []).map(async (asset) => {
    const imageData = await createPhotoUrl(client, asset.storage_path);
    return photoAssetToRecordMemory(asset, imageData);
  }));
}
