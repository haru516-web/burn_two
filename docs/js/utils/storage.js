const KEY = 'memories-static-site-state-v1';

function stripDataUrls(value) {
  if (typeof value === 'string') {
    return value.startsWith('data:') ? '' : value;
  }
  if (Array.isArray(value)) {
    return value.map(stripDataUrls);
  }
  if (!value || typeof value !== 'object') {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, stripDataUrls(entry)]),
  );
}

function shrinkComposeStandardFiles(standardFiles) {
  if (!standardFiles || typeof standardFiles !== 'object') return standardFiles;
  return Object.fromEntries(
    Object.entries(standardFiles).map(([key, value]) => [
      key,
      value && typeof value === 'object'
        ? {
          ...value,
          // Original upload data URLs are the biggest contributor to quota usage.
          file: '',
        }
        : value,
    ]),
  );
}

function reduceStateForQuota(state) {
  if (!state || typeof state !== 'object') return state;
  return stripDataUrls({
    ...state,
    profile: state.profile && typeof state.profile === 'object'
      ? {
        ...state.profile,
        avatarData: '',
      }
      : state.profile,
    posts: Array.isArray(state.posts)
      ? state.posts.map((post) => ({
        ...post,
        imageData: '',
        authorAvatarData: '',
        composeData: post?.composeData && typeof post.composeData === 'object'
          ? {
            ...post.composeData,
            standardFiles: shrinkComposeStandardFiles(post.composeData.standardFiles),
          }
          : post?.composeData ?? null,
      }))
      : [],
    drafts: Array.isArray(state.drafts)
      ? state.drafts.map((draft) => ({
        ...draft,
        imageData: '',
        composeData: draft?.composeData && typeof draft.composeData === 'object'
          ? {
            ...draft.composeData,
            standardFiles: shrinkComposeStandardFiles(draft.composeData.standardFiles),
          }
          : draft?.composeData ?? null,
      }))
      : [],
    recordMemories: Array.isArray(state.recordMemories)
      ? state.recordMemories.map((memory) => ({
        ...memory,
        imageData: '',
      }))
      : [],
  });
}

function createMinimalStateForQuota(state) {
  if (!state || typeof state !== 'object') return state;
  const reduced = reduceStateForQuota(state);
  return {
    profile: reduced.profile || {},
    posts: Array.isArray(reduced.posts)
      ? reduced.posts.slice(0, 80).map((post) => ({
        ...post,
        imageData: '',
        authorAvatarData: '',
      }))
      : [],
    drafts: [],
    recordMemories: Array.isArray(reduced.recordMemories)
      ? reduced.recordMemories.slice(0, 120).map((memory) => ({
        ...memory,
        imageData: '',
      }))
      : [],
    issues: Array.isArray(reduced.issues) ? reduced.issues.slice(0, 80) : [],
    followingAuthors: Array.isArray(reduced.followingAuthors) ? reduced.followingAuthors : [],
    couple: reduced.couple || {},
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (error) {
    if (error?.name !== 'QuotaExceededError') {
      throw error;
    }

    const reducedState = reduceStateForQuota(state);
    try {
      localStorage.setItem(KEY, JSON.stringify(reducedState));
      console.warn('Storage quota exceeded. Saved reduced state without large image blobs.');
    } catch (retryError) {
      try {
        localStorage.setItem(KEY, JSON.stringify(createMinimalStateForQuota(reducedState)));
        console.warn('Storage quota exceeded. Saved minimal state without image blobs or drafts.');
      } catch (minimalError) {
        console.error('Failed to persist state after quota reduction.', minimalError);
      }
    }
  }
}
