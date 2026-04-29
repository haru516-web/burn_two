const KEY = 'memories-static-site-state-v1';

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
  return {
    ...state,
    posts: Array.isArray(state.posts)
      ? state.posts.map((post) => ({
        ...post,
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
        composeData: draft?.composeData && typeof draft.composeData === 'object'
          ? {
            ...draft.composeData,
            standardFiles: shrinkComposeStandardFiles(draft.composeData.standardFiles),
          }
          : draft?.composeData ?? null,
      }))
      : [],
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

    try {
      localStorage.setItem(KEY, JSON.stringify(reduceStateForQuota(state)));
      console.warn('Storage quota exceeded. Saved a reduced compose state without original upload blobs.');
    } catch (retryError) {
      console.error('Failed to persist state after quota reduction.', retryError);
    }
  }
}
