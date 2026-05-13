import { ensureProfileAndMemorySpace } from './completedPages.js';
import { requireSupabase } from './supabase.js';

function normalizeStorageScope(scope = 'shared') {
  return scope === 'personal' ? 'personal' : 'shared';
}

function normalizeDisplayScope(scope = 'shared') {
  return normalizeStorageScope(scope) === 'personal' ? 'personal' : 'couple';
}

async function getCoupleDataContext(storageScope = 'shared') {
  const scope = normalizeStorageScope(storageScope);
  const { user, memorySpaceId } = await ensureProfileAndMemorySpace({ scope });
  return {
    user,
    memorySpaceId,
    displayScope: normalizeDisplayScope(scope),
  };
}

export async function listCoupleCalendarEntries({ storageScope = 'shared' } = {}) {
  const client = requireSupabase();
  const { user, memorySpaceId, displayScope } = await getCoupleDataContext(storageScope);
  let query = client
    .from('couple_calendar_entries')
    .select('*')
    .order('date', { ascending: true })
    .order('created_at', { ascending: false });

  if (displayScope === 'personal') {
    query = query.eq('author_id', user.id).eq('display_scope', 'personal');
  } else {
    query = query.eq('space_id', memorySpaceId).eq('display_scope', 'couple');
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map((row) => ({
    id: row.id,
    planId: row.plan_id || '',
    title: row.title || '',
    date: row.date || '',
    time: row.time_text || '',
    place: row.place || '',
    note: row.note || '',
    image: row.image || '',
    tags: Array.isArray(row.tags_json) ? row.tags_json : [],
    createdAt: row.created_at || new Date().toISOString(),
  }));
}

export async function saveCoupleCalendarEntry(entry, { storageScope = 'shared' } = {}) {
  if (!entry?.id) return null;
  const client = requireSupabase();
  const { user, memorySpaceId, displayScope } = await getCoupleDataContext(storageScope);
  const { data, error } = await client
    .from('couple_calendar_entries')
    .upsert({
      id: entry.id,
      space_id: memorySpaceId,
      author_id: user.id,
      display_scope: displayScope,
      plan_id: entry.planId || '',
      title: entry.title || '',
      date: entry.date || null,
      time_text: entry.time || '',
      place: entry.place || '',
      note: entry.note || '',
      image: entry.image || '',
      tags_json: Array.isArray(entry.tags) ? entry.tags : [],
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCoupleCalendarEntryFromDatabase(entryId) {
  if (!entryId) return;
  const client = requireSupabase();
  const { error } = await client
    .from('couple_calendar_entries')
    .delete()
    .eq('id', entryId);
  if (error) throw error;
}

export async function listCoupleTodos({ storageScope = 'shared' } = {}) {
  const client = requireSupabase();
  const { user, memorySpaceId, displayScope } = await getCoupleDataContext(storageScope);
  let query = client
    .from('couple_todos')
    .select('*, profiles:author_id(display_name, email)')
    .order('created_at', { ascending: false });

  if (displayScope === 'personal') {
    query = query.eq('author_id', user.id).eq('display_scope', 'personal');
  } else {
    query = query.eq('space_id', memorySpaceId).eq('display_scope', 'couple');
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map((row) => ({
    id: row.id,
    title: row.title || '',
    note: row.note || '',
    done: Boolean(row.done),
    authorId: row.author_id || '',
    authorName: row.profiles?.display_name || row.profiles?.email || '',
    createdAt: row.created_at || new Date().toISOString(),
  }));
}

export async function saveCoupleTodo(todo, { storageScope = 'shared' } = {}) {
  if (!todo?.id) return null;
  const client = requireSupabase();
  const { user, memorySpaceId, displayScope } = await getCoupleDataContext(storageScope);
  const { data, error } = await client
    .from('couple_todos')
    .upsert({
      id: todo.id,
      space_id: memorySpaceId,
      author_id: user.id,
      display_scope: displayScope,
      title: todo.title || '',
      note: todo.note || '',
      done: Boolean(todo.done),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCoupleTodoFromDatabase(todoId) {
  if (!todoId) return;
  const client = requireSupabase();
  const { error } = await client
    .from('couple_todos')
    .delete()
    .eq('id', todoId);
  if (error) throw error;
}

export async function loadCoupleSettings({ storageScope = 'shared' } = {}) {
  const client = requireSupabase();
  const { user, memorySpaceId, displayScope } = await getCoupleDataContext(storageScope);
  let query = client
    .from('couple_settings')
    .select('*')
    .limit(1);

  if (displayScope === 'personal') {
    query = query.eq('author_id', user.id).eq('display_scope', 'personal');
  } else {
    query = query.eq('space_id', memorySpaceId).eq('display_scope', 'couple');
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data ? {
    anniversaryDate: data.anniversary_date || '',
    birthdayDate: data.birthday_date || '',
  } : null;
}

export async function saveCoupleSettings(settings = {}, { storageScope = 'shared' } = {}) {
  const client = requireSupabase();
  const { user, memorySpaceId, displayScope } = await getCoupleDataContext(storageScope);
  const { data, error } = await client
    .from('couple_settings')
    .upsert({
      space_id: memorySpaceId,
      author_id: user.id,
      display_scope: displayScope,
      anniversary_date: settings.anniversaryDate || null,
      birthday_date: settings.birthdayDate || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'space_id,display_scope' })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function loadProfileSheet() {
  const client = requireSupabase();
  const { user } = await getCoupleDataContext('personal');
  const { data, error } = await client
    .from('profile_sheets')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) throw error;
  return data?.sheet_json && typeof data.sheet_json === 'object' ? data.sheet_json : null;
}

export async function saveProfileSheet(profileSheet = {}) {
  const client = requireSupabase();
  const { user } = await getCoupleDataContext('personal');
  const { data, error } = await client
    .from('profile_sheets')
    .upsert({
      user_id: user.id,
      sheet_json: profileSheet && typeof profileSheet === 'object' ? profileSheet : {},
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function loadLoveMobbyDiagnosisResult() {
  const client = requireSupabase();
  const { user } = await getCoupleDataContext('personal');
  const { data, error } = await client
    .from('love_mobby_diagnosis_results')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) throw error;
  return data ? {
    resultCode: data.result_code || '',
    result: data.result_json && typeof data.result_json === 'object' ? data.result_json : null,
    updatedAt: data.updated_at || '',
  } : null;
}

export async function saveLoveMobbyDiagnosisResult(diagnosisState = {}) {
  const resultCode = diagnosisState.resultCode || diagnosisState.result?.resultCode || '';
  if (!resultCode) return null;
  const client = requireSupabase();
  const { user } = await getCoupleDataContext('personal');
  const { data, error } = await client
    .from('love_mobby_diagnosis_results')
    .upsert({
      user_id: user.id,
      result_code: resultCode,
      result_json: diagnosisState.result && typeof diagnosisState.result === 'object' ? diagnosisState.result : {},
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteLoveMobbyDiagnosisResult() {
  const client = requireSupabase();
  const { user } = await getCoupleDataContext('personal');
  const { error } = await client
    .from('love_mobby_diagnosis_results')
    .delete()
    .eq('user_id', user.id);
  if (error) throw error;
}
