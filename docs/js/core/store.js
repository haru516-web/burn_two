import { loadState, saveState, setStorageScope } from '../utils/storage.js';
import { createId } from '../utils/id.js';

const defaultState = {
  profile: {
    name: 'you',
    bio: 'A small local profile to collect your memories.',
    avatarData: '',
    birthday: '',
    profileSheet: {},
  },
  posts: [],
  drafts: [],
  recordMemories: [],
  issues: [],
  followingAuthors: [],
  couple: {
    partnerBName: 'Partner',
    partnerBirthday: '',
    anniversaryDate: '2025-05-15',
    nextDateId: null,
    answers: {
      you: {},
      partner: {
        mood: 'cafe',
        budget: '5000',
        pace: 'quiet',
      },
    },
    calendarEntries: [],
    todos: [
      { id: 'todo-cafe', title: '気になっているカフェに行く', note: '週末にゆっくり話せる場所を探す', done: false },
      { id: 'todo-photo', title: '写真を撮りに行く', note: '季節の景色を一緒に残す', done: false },
      { id: 'todo-trip', title: '小さな旅行を計画する', note: '行きたい場所を候補にする', done: false },
    ],
  },
};

function normalizeComposeData(post) {
  const composeData = post.composeData && typeof post.composeData === 'object'
    ? post.composeData
    : null;
  if (!composeData) return null;

  const sourceFiles = composeData.standardFiles && typeof composeData.standardFiles === 'object'
    ? composeData.standardFiles
    : {};
  const normalizeFileState = (value, fallbackFile = '') => ({
    file: typeof value?.file === 'string' && value.file ? value.file : fallbackFile,
    position: {
      x: Number(value?.position?.x) || 0.5,
      y: Number(value?.position?.y) || 0.5,
      zoom: Math.max(1, Number(value?.position?.zoom) || 1),
    },
    imageSize: value?.imageSize
      && Number.isFinite(value.imageSize.width)
      && Number.isFinite(value.imageSize.height)
      ? { width: value.imageSize.width, height: value.imageSize.height }
      : null,
  });

  return {
    ...composeData,
    standardFiles: {
      primary: normalizeFileState(sourceFiles.primary),
      secondary: normalizeFileState(sourceFiles.secondary),
      accent: normalizeFileState(sourceFiles.accent),
      detail: normalizeFileState(sourceFiles.detail),
    },
  };
}

function normalizePost(post) {
  return {
    id: post.id,
    authorId: post.authorId || '',
    authorName: post.authorName || 'you',
    authorIcon: post.authorIcon || (post.authorName || 'U').trim().slice(0, 1).toUpperCase(),
    authorAvatarData: post.authorAvatarData || '',
    caption: post.caption || '',
    imageData: post.imageData || '',
    fixedTags: Array.isArray(post.fixedTags) ? post.fixedTags : [],
    freeTags: Array.isArray(post.freeTags) ? post.freeTags : [],
    likes: Number(post.likes || 0),
    saves: Number(post.saves || 0),
    comments: Array.isArray(post.comments) ? post.comments : [],
    impressions: Number(post.impressions || 0),
    liked: Boolean(post.liked),
    saved: Boolean(post.saved),
    createdAt: post.createdAt || new Date().toISOString(),
    updatedAt: post.updatedAt || null,
    storageScope: post.storageScope === 'personal' ? 'personal' : 'shared',
    saveScope: post.saveScope === 'personal' ? 'personal' : 'couple',
    composeData: normalizeComposeData(post),
  };
}

function normalizeDraft(draft) {
  const composeData = normalizeComposeData({
    composeData: draft.composeData && typeof draft.composeData === 'object' ? draft.composeData : null,
    imageData: '',
  });
  const fallbackTitle = composeData?.headline || draft.title || 'Untitled';
  return {
    id: draft.id || createId('draft'),
    title: String(fallbackTitle || 'Untitled').trim() || 'Untitled',
    imageData: draft.imageData || '',
    composeData,
    createdAt: draft.createdAt || new Date().toISOString(),
    updatedAt: draft.updatedAt || draft.createdAt || new Date().toISOString(),
  };
}

function normalizeRecordMemory(memory) {
  const storageScope = memory.storageScope === 'personal'
    || memory.saveScope === 'personal'
    || memory.displayScope === 'personal'
    || memory.display_scope === 'personal'
    ? 'personal'
    : 'shared';

  return {
    id: memory.id || createId('memory'),
    authorId: memory.authorId || memory.author_id || '',
    imageData: memory.imageData || '',
    time: memory.time || new Date().toTimeString().slice(0, 5),
    place: memory.place || '',
    memo: memory.memo || '',
    frame: memory.frame === 'portrait' ? 'portrait' : 'landscape',
    pageCrop: {
      x: Math.min(1, Math.max(0, Number(memory.pageCrop?.x) || 0.5)),
      y: Math.min(1, Math.max(0, Number(memory.pageCrop?.y) || 0.5)),
      zoom: Math.max(1, Number(memory.pageCrop?.zoom) || 1),
    },
    createdAt: memory.createdAt || new Date().toISOString(),
    storagePath: memory.storagePath || '',
    thumbnailPath: memory.thumbnailPath || '',
    sourceType: memory.sourceType === 'camera' ? 'camera' : 'album',
    expiresAt: memory.expiresAt || null,
    storageScope,
    saveScope: memory.saveScope || (storageScope === 'personal' ? 'personal' : 'couple'),
    updatedAt: memory.updatedAt || null,
  };
}

function normalizeState(saved) {
  const savedCouple = saved?.couple && typeof saved.couple === 'object' ? saved.couple : {};
  const savedAnswers = savedCouple.answers && typeof savedCouple.answers === 'object' ? savedCouple.answers : {};
  if (!saved) return structuredClone(defaultState);
  return {
    profile: {
      name: saved.profile?.name || defaultState.profile.name,
      bio: saved.profile?.bio || defaultState.profile.bio,
      avatarData: saved.profile?.avatarData || '',
      birthday: saved.profile?.birthday || '',
      profileSheet: saved.profile?.profileSheet && typeof saved.profile.profileSheet === 'object'
        ? saved.profile.profileSheet
        : {},
    },
    posts: Array.isArray(saved.posts) ? saved.posts.map(normalizePost) : [],
    drafts: Array.isArray(saved.drafts) ? saved.drafts.map(normalizeDraft) : [],
    recordMemories: Array.isArray(saved.recordMemories)
      ? saved.recordMemories.map(normalizeRecordMemory)
      : [],
    issues: Array.isArray(saved.issues) ? saved.issues : [],
    followingAuthors: Array.isArray(saved.followingAuthors) ? saved.followingAuthors : [],
    couple: {
      partnerBName: savedCouple.partnerBName || defaultState.couple.partnerBName,
      partnerBirthday: savedCouple.partnerBirthday || '',
      anniversaryDate: savedCouple.anniversaryDate || defaultState.couple.anniversaryDate,
      nextDateId: savedCouple.nextDateId || null,
      answers: {
        you: savedAnswers.you && typeof savedAnswers.you === 'object' ? savedAnswers.you : {},
        partner: savedAnswers.partner && typeof savedAnswers.partner === 'object'
          ? savedAnswers.partner
          : structuredClone(defaultState.couple.answers.partner),
      },
      calendarEntries: Array.isArray(savedCouple.calendarEntries)
        ? savedCouple.calendarEntries.map((entry) => ({
          id: entry.id || createId('date'),
          planId: entry.planId || '',
    title: entry.title || 'ふたりの予定',
          date: entry.date || '2025-05-03',
          time: entry.time || '11:00〜13:30',
          place: entry.place || '',
          note: entry.note || '',
          image: entry.image || '',
          tags: Array.isArray(entry.tags) ? entry.tags : [],
          createdAt: entry.createdAt || new Date().toISOString(),
        }))
        : [],
      todos: Array.isArray(savedCouple.todos)
        ? savedCouple.todos.map((todo) => ({
          id: todo.id || createId('todo'),
          title: todo.title || 'やりたいこと',
          note: todo.note || '',
          done: Boolean(todo.done),
          createdAt: todo.createdAt || new Date().toISOString(),
        }))
        : structuredClone(defaultState.couple.todos).map((todo) => ({
          ...todo,
          createdAt: new Date().toISOString(),
        })),
    },
  };
}

let state = normalizeState(loadState());

export function getState() {
  return state;
}

export function switchStateScope(scope = 'guest') {
  const changed = setStorageScope(scope);
  if (!changed) return state;
  state = normalizeState(loadState());
  return state;
}

function commit(nextState) {
  state = nextState;
  saveState(state);
}

export function addPost(post) {
  const next = structuredClone(state);
  next.posts.unshift({
    id: post.id || createId('post'),
    authorName: post.authorName,
    authorIcon: (post.authorName || 'U').trim().slice(0, 1).toUpperCase(),
    authorAvatarData: state.profile.avatarData || '',
    caption: post.caption || '',
    imageData: post.imageData,
    fixedTags: post.fixedTags || [],
    freeTags: post.freeTags || [],
    likes: 0,
    saves: 0,
    comments: [],
    impressions: 0,
    liked: false,
    saved: false,
    createdAt: post.createdAt || new Date().toISOString(),
    updatedAt: null,
    composeData: post.composeData || null,
  });
  commit(next);
}

export function upsertPostCache(post) {
  if (!post?.id) return null;
  const next = structuredClone(state);
  const existingIndex = next.posts.findIndex((item) => item.id === post.id);
  const normalized = normalizePost({
    ...post,
    createdAt: post.createdAt || new Date().toISOString(),
  });
  if (existingIndex >= 0) {
    next.posts[existingIndex] = {
      ...next.posts[existingIndex],
      ...normalized,
    };
  } else {
    next.posts.unshift(normalized);
  }
  commit(next);
  return normalized;
}

export function upsertPostCacheMany(posts = []) {
  posts.forEach((post) => {
    upsertPostCache(post);
  });
}

export function replaceCompletedPostCache(posts = [], storageScope = 'shared') {
  const resolvedScope = storageScope === 'personal' ? 'personal' : 'shared';
  const next = structuredClone(state);
  const completedPosts = Array.isArray(posts)
    ? posts.map((post) => normalizePost({
        ...post,
        storageScope: post.storageScope || resolvedScope,
        createdAt: post.createdAt || new Date().toISOString(),
      }))
    : [];
  next.posts = [
    ...completedPosts,
    ...next.posts.filter((post) => (
      !String(post.id || '').startsWith('completed_')
      || (post.storageScope || 'shared') !== resolvedScope
    )),
  ];
  commit(next);
}

export function replaceRecordMemories(recordMemories = []) {
  const next = structuredClone(state);
  next.recordMemories = Array.isArray(recordMemories)
    ? recordMemories.map(normalizeRecordMemory)
    : [];
  commit(next);
}

export function markAllContentPersonal() {
  const next = structuredClone(state);
  let changed = false;

  next.posts = (next.posts || []).map((post) => {
    const composeData = post.composeData && typeof post.composeData === 'object'
      ? {
          ...post.composeData,
          storageScope: 'personal',
          saveScope: 'personal',
        }
      : post.composeData;
    if (post.storageScope === 'personal' && post.saveScope === 'personal' && composeData === post.composeData) {
      return post;
    }
    changed = true;
    return {
      ...post,
      storageScope: 'personal',
      saveScope: 'personal',
      composeData,
      updatedAt: new Date().toISOString(),
    };
  });

  next.recordMemories = (next.recordMemories || []).map((memory) => {
    if (memory.storageScope === 'personal' && memory.saveScope === 'personal') return memory;
    changed = true;
    return {
      ...memory,
      storageScope: 'personal',
      saveScope: 'personal',
      updatedAt: new Date().toISOString(),
    };
  });

  if (!changed) return false;
  commit(next);
  return true;
}

export function deleteRecordMemory(memoryId) {
  const next = structuredClone(state);
  if (!next.recordMemories.some((memory) => memory.id === memoryId)) return;
  next.recordMemories = next.recordMemories.filter((memory) => memory.id !== memoryId);
  commit(next);
}

export function upsertDraft(draftInput) {
  const next = structuredClone(state);
  const existingIndex = next.drafts.findIndex((draft) => draft.id === draftInput.id);
  const normalized = normalizeDraft({
    ...draftInput,
    updatedAt: new Date().toISOString(),
    createdAt: existingIndex >= 0 ? next.drafts[existingIndex].createdAt : (draftInput.createdAt || new Date().toISOString()),
  });

  if (existingIndex >= 0) {
    next.drafts[existingIndex] = normalized;
  } else {
    next.drafts.unshift(normalized);
  }

  commit(next);
  return normalized;
}

export function deleteDraft(draftId) {
  const next = structuredClone(state);
  if (!next.drafts.some((draft) => draft.id === draftId)) return;
  next.drafts = next.drafts.filter((draft) => draft.id !== draftId);
  commit(next);
}

export function addRecordMemory(memory) {
  const next = structuredClone(state);
  const normalized = normalizeRecordMemory({
    ...memory,
    id: memory.id || createId('memory'),
    createdAt: memory.createdAt || new Date().toISOString(),
  });
  next.recordMemories = [normalized, ...(next.recordMemories || [])];
  commit(next);
  return normalized;
}

export function updateRecordMemory(memoryId, updates) {
  const next = structuredClone(state);
  const memory = (next.recordMemories || []).find((item) => item.id === memoryId);
  if (!memory) return null;
  memory.place = String(updates?.place ?? memory.place ?? '').trim();
  memory.memo = String(updates?.memo ?? memory.memo ?? '').trim();
  if (updates?.pageCrop && typeof updates.pageCrop === 'object') {
    memory.pageCrop = {
      x: Math.min(1, Math.max(0, Number(updates.pageCrop.x) || 0.5)),
      y: Math.min(1, Math.max(0, Number(updates.pageCrop.y) || 0.5)),
      zoom: Math.max(1, Number(updates.pageCrop.zoom) || 1),
    };
  }
  if (updates?.storageScope === 'personal' || updates?.storageScope === 'shared') {
    memory.storageScope = updates.storageScope;
    memory.saveScope = updates.storageScope === 'personal' ? 'personal' : 'couple';
  }
  memory.updatedAt = new Date().toISOString();
  commit(next);
  return normalizeRecordMemory(memory);
}

export function updatePost(postId, updates) {
  const next = structuredClone(state);
  const post = next.posts.find((item) => item.id === postId);
  if (!post) return;

  post.caption = updates.caption ?? post.caption;
  post.imageData = updates.imageData ?? post.imageData;
  post.fixedTags = Array.isArray(updates.fixedTags) ? updates.fixedTags : post.fixedTags;
  post.freeTags = Array.isArray(updates.freeTags) ? updates.freeTags : post.freeTags;
  post.composeData = updates.composeData ?? post.composeData;
  post.updatedAt = new Date().toISOString();
  commit(next);
}

export function deletePost(postId) {
  const next = structuredClone(state);
  const exists = next.posts.some((item) => item.id === postId);
  if (!exists) return;

  next.posts = next.posts.filter((item) => item.id !== postId);
  next.issues = next.issues
    .map((issue) => ({
      ...issue,
      postIds: (issue.postIds || []).filter((id) => id !== postId),
    }))
    .filter((issue) => issue.postIds.length);

  commit(next);
}

export function toggleLike(postId) {
  const next = structuredClone(state);
  const post = next.posts.find((item) => item.id === postId);
  if (!post) return;
  post.liked = !post.liked;
  post.likes += post.liked ? 1 : -1;
  commit(next);
}

export function toggleSave(postId) {
  const next = structuredClone(state);
  const post = next.posts.find((item) => item.id === postId);
  if (!post) return;
  post.saved = !post.saved;
  post.saves += post.saved ? 1 : -1;
  commit(next);
}

export function addComment(postId, text) {
  const next = structuredClone(state);
  const post = next.posts.find((item) => item.id === postId);
  if (!post || !text.trim()) return;
  post.comments.unshift({
    id: createId('comment'),
    text: text.trim(),
    createdAt: new Date().toISOString(),
  });
  commit(next);
}

export function addImpression(postId) {
  const next = structuredClone(state);
  const post = next.posts.find((item) => item.id === postId);
  if (!post) return;
  post.impressions += 1;
  commit(next);
}

export function updateProfile(profile) {
  const next = structuredClone(state);
  const previousName = next.profile.name;
  const nextAvatar = profile.avatarData || '';
  next.profile.name = profile.name;
  next.profile.bio = profile.bio;
  next.profile.avatarData = nextAvatar;
  next.profile.birthday = profile.birthday ?? next.profile.birthday ?? '';
  next.profile.profileSheet = profile.profileSheet && typeof profile.profileSheet === 'object'
    ? profile.profileSheet
    : (next.profile.profileSheet || {});
  next.posts = next.posts.map((post) => (
    post.authorName === previousName
      ? {
        ...post,
        authorName: profile.name,
        authorIcon: (profile.name || 'U').trim().slice(0, 1).toUpperCase(),
        authorAvatarData: nextAvatar,
      }
      : post
  ));
  next.followingAuthors = next.followingAuthors.map((name) => (
    name === previousName ? profile.name : name
  ));
  commit(next);
}

export function updateCoupleSettings(settings = {}) {
  const next = structuredClone(state);
  next.couple = next.couple || structuredClone(defaultState.couple);
  if (Object.prototype.hasOwnProperty.call(settings, 'anniversaryDate')) {
    next.couple.anniversaryDate = String(settings.anniversaryDate || '').trim() || defaultState.couple.anniversaryDate;
  }
  if (Object.prototype.hasOwnProperty.call(settings, 'partnerBName')) {
    next.couple.partnerBName = String(settings.partnerBName || '').trim() || defaultState.couple.partnerBName;
  }
  if (Object.prototype.hasOwnProperty.call(settings, 'partnerBirthday')) {
    next.couple.partnerBirthday = String(settings.partnerBirthday || '').trim();
  }
  commit(next);
}

export function replaceCoupleDatabaseData({
  calendarEntries,
  todos,
  profileSheet,
} = {}) {
  const next = structuredClone(state);
  next.couple = next.couple || structuredClone(defaultState.couple);

  if (Array.isArray(calendarEntries)) {
    next.couple.calendarEntries = calendarEntries.map((entry) => ({
      id: entry.id || createId('date'),
      planId: entry.planId || '',
    title: entry.title || 'ふたりの予定',
      date: entry.date || '2025-05-03',
      time: entry.time || '',
      place: entry.place || '',
      note: entry.note || '',
      image: entry.image || '',
      tags: Array.isArray(entry.tags) ? entry.tags : [],
      createdAt: entry.createdAt || new Date().toISOString(),
    }));
    next.couple.nextDateId = next.couple.calendarEntries[0]?.id || null;
  }

  if (Array.isArray(todos)) {
    next.couple.todos = todos.map((todo) => ({
      id: todo.id || createId('todo'),
      title: todo.title || 'やりたいこと',
      note: todo.note || '',
      done: Boolean(todo.done),
      createdAt: todo.createdAt || new Date().toISOString(),
    }));
  }

  if (profileSheet && typeof profileSheet === 'object') {
    next.profile.profileSheet = profileSheet;
    if (profileSheet.name) {
      next.profile.name = String(profileSheet.name).trim() || next.profile.name;
    }
  }

  commit(next);
}

export function toggleFollow(authorName) {
  const next = structuredClone(state);
  const exists = next.followingAuthors.includes(authorName);
  next.followingAuthors = exists
    ? next.followingAuthors.filter((name) => name !== authorName)
    : [...next.followingAuthors, authorName];
  commit(next);
}

export function saveIssue(issue) {
  const next = structuredClone(state);
  next.issues.unshift({
    id: createId('issue'),
    title: issue.title,
    subtitle: issue.subtitle,
    tone: issue.tone,
    postIds: issue.postIds,
    createdAt: new Date().toISOString(),
  });
  commit(next);
}

export function updateCoupleAnswer(person, questionId, value) {
  const next = structuredClone(state);
  const target = person === 'partner' ? 'partner' : 'you';
  next.couple = next.couple || structuredClone(defaultState.couple);
  next.couple.answers = next.couple.answers || { you: {}, partner: {} };
  next.couple.answers[target] = {
    ...(next.couple.answers[target] || {}),
    [questionId]: value,
  };
  commit(next);
}

export function addCoupleCalendarEntry(entry) {
  const next = structuredClone(state);
  next.couple = next.couple || structuredClone(defaultState.couple);
  const normalized = {
    id: createId('date'),
    planId: entry.planId || '',
    title: entry.title || 'ふたりの予定',
    date: entry.date || '2025-05-03',
    time: entry.time || '11:00〜13:30',
    place: entry.place || '',
    note: entry.note || '',
    image: entry.image || '',
    tags: Array.isArray(entry.tags) ? entry.tags : [],
    createdAt: new Date().toISOString(),
  };
  next.couple.calendarEntries = [normalized, ...(next.couple.calendarEntries || [])];
  next.couple.nextDateId = normalized.id;
  commit(next);
  return normalized;
}

export function updateCoupleCalendarEntry(entryId, updates = {}) {
  if (!entryId) return null;
  const next = structuredClone(state);
  next.couple = next.couple || structuredClone(defaultState.couple);
  const entries = next.couple.calendarEntries || [];
  const entryIndex = entries.findIndex((entry) => entry.id === entryId);
  if (entryIndex < 0) return null;
  const current = entries[entryIndex];
  const updated = {
    ...current,
    planId: updates.planId ?? current.planId ?? '',
    title: updates.title || current.title || 'ふたりの予定',
    date: updates.date || current.date || '2025-05-03',
    time: updates.time || current.time || '',
    place: updates.place ?? current.place ?? '',
    note: updates.note ?? current.note ?? '',
    image: updates.image ?? current.image ?? '',
    tags: Array.isArray(updates.tags) ? updates.tags : (Array.isArray(current.tags) ? current.tags : []),
    createdAt: current.createdAt || new Date().toISOString(),
  };
  next.couple.calendarEntries = [
    updated,
    ...entries.filter((entry) => entry.id !== entryId),
  ];
  next.couple.nextDateId = updated.id;
  commit(next);
  return updated;
}

export function deleteCoupleCalendarEntry(entryId) {
  const next = structuredClone(state);
  next.couple = next.couple || structuredClone(defaultState.couple);
  const entries = next.couple.calendarEntries || [];
  if (!entries.some((entry) => entry.id === entryId)) return;
  next.couple.calendarEntries = entries.filter((entry) => entry.id !== entryId);
  if (next.couple.nextDateId === entryId) {
    next.couple.nextDateId = next.couple.calendarEntries[0]?.id || null;
  }
  commit(next);
}

export function resetCoupleAnswers() {
  const next = structuredClone(state);
  next.couple = next.couple || structuredClone(defaultState.couple);
  next.couple.answers = {
    you: {},
    partner: {
      ...(next.couple.answers?.partner || defaultState.couple.answers.partner),
    },
  };
  commit(next);
}

export function toggleCoupleTodo(todoId) {
  const next = structuredClone(state);
  next.couple = next.couple || structuredClone(defaultState.couple);
  next.couple.todos = Array.isArray(next.couple.todos)
    ? next.couple.todos
    : structuredClone(defaultState.couple.todos);
  const todo = next.couple.todos.find((item) => item.id === todoId);
  if (!todo) return;
  todo.done = !todo.done;
  commit(next);
}

export function addCoupleTodo(todo) {
  const title = String(todo?.title || '').trim();
  if (!title) return null;
  const next = structuredClone(state);
  next.couple = next.couple || structuredClone(defaultState.couple);
  next.couple.todos = Array.isArray(next.couple.todos)
    ? next.couple.todos
    : structuredClone(defaultState.couple.todos);
  const normalized = {
    id: createId('todo'),
    title,
    note: String(todo?.note || '').trim(),
    done: false,
    createdAt: new Date().toISOString(),
  };
  next.couple.todos = [normalized, ...next.couple.todos];
  commit(next);
  return normalized;
}

export function deleteCoupleTodo(todoId) {
  const next = structuredClone(state);
  next.couple = next.couple || structuredClone(defaultState.couple);
  next.couple.todos = Array.isArray(next.couple.todos)
    ? next.couple.todos.filter((todo) => todo.id !== todoId)
    : [];
  commit(next);
}
