import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const PHOTO_BUCKET = 'photo-assets';
const BATCH_SIZE = 100;
const ORPHAN_BATCH_SIZE = 200;
const ORPHAN_GRACE_MINUTES = 10;

type PhotoAsset = {
  id: string;
  storage_path: string | null;
  thumbnail_path: string | null;
};

type StorageObject = {
  name: string;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

function isAuthorized(request: Request) {
  const cronSecret = Deno.env.get('DELETE_EXPIRED_PHOTOS_SECRET') || '';
  if (!cronSecret) return true;
  const authorization = request.headers.get('Authorization') || '';
  return authorization === `Bearer ${cronSecret}`;
}

async function listOrphanStoragePaths(supabase: ReturnType<typeof createClient>) {
  const graceDate = new Date(Date.now() - ORPHAN_GRACE_MINUTES * 60 * 1000).toISOString();
  const { data: objects, error: objectsError } = await supabase
    .schema('storage')
    .from('objects')
    .select('name')
    .eq('bucket_id', PHOTO_BUCKET)
    .lt('created_at', graceDate)
    .limit(ORPHAN_BATCH_SIZE);

  if (objectsError) throw objectsError;

  const objectPaths = ((objects || []) as StorageObject[])
    .map((object) => object.name)
    .filter(Boolean);
  if (!objectPaths.length) return [];

  const { data: storageReferences, error: storageReferenceError } = await supabase
    .from('photo_assets')
    .select('storage_path, thumbnail_path')
    .in('storage_path', objectPaths);

  if (storageReferenceError) throw storageReferenceError;

  const { data: thumbnailReferences, error: thumbnailReferenceError } = await supabase
    .from('photo_assets')
    .select('storage_path, thumbnail_path')
    .in('thumbnail_path', objectPaths);

  if (thumbnailReferenceError) throw thumbnailReferenceError;

  const referencedPaths = new Set([...(storageReferences || []), ...(thumbnailReferences || [])].flatMap((asset) => [
    asset.storage_path,
    asset.thumbnail_path,
  ]).filter(Boolean));

  return objectPaths.filter((path) => !referencedPaths.has(path));
}

Deno.serve(async (request) => {
  if (!isAuthorized(request)) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'Supabase service credentials are missing.' }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data: expiredPhotos, error: listError } = await supabase
    .from('photo_assets')
    .select('id, storage_path, thumbnail_path')
    .lte('expires_at', new Date().toISOString())
    .limit(BATCH_SIZE);

  if (listError) {
    return jsonResponse({ error: listError.message }, 500);
  }

  const photos = (expiredPhotos || []) as PhotoAsset[];
  const storagePaths = Array.from(new Set(photos.flatMap((photo) => [
    photo.storage_path,
    photo.thumbnail_path,
  ]).filter((path): path is string => Boolean(path))));

  let orphanStoragePaths: string[] = [];
  try {
    orphanStoragePaths = await listOrphanStoragePaths(supabase);
  } catch (error) {
    console.warn('Failed to list orphan photo storage objects.', error);
  }

  const allStoragePaths = Array.from(new Set([
    ...storagePaths,
    ...orphanStoragePaths,
  ]));

  if (allStoragePaths.length) {
    const { error: storageError } = await supabase.storage
      .from(PHOTO_BUCKET)
      .remove(allStoragePaths);
    if (storageError) {
      return jsonResponse({ error: storageError.message }, 500);
    }
  }

  const photoIds = photos.map((photo) => photo.id);
  if (photoIds.length) {
    const { error: deleteError } = await supabase
      .from('photo_assets')
      .delete()
      .in('id', photoIds);
    if (deleteError) {
      return jsonResponse({ error: deleteError.message }, 500);
    }
  }

  return jsonResponse({
    deletedPhotos: photoIds.length,
    deletedStorageObjects: allStoragePaths.length,
    deletedOrphanStorageObjects: orphanStoragePaths.length,
  });
});
