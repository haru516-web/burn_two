import { isFresh } from './date.js';

export function sortRecommended(posts) {
  return [...posts].sort((a, b) => recommendationScore(b) - recommendationScore(a));
}

export function recommendationScore(post) {
  const reactionScore = (post.likes || 0) * 2 + (post.saves || 0) * 2 + (post.comments?.length || 0) * 1.5 + (post.impressions || 0) * 1.2;
  const freshBoost = isFresh(post.createdAt) ? 120 : 0;
  const ageHours = Math.max(1, (Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60));
  const recencyScore = 220 / ageHours;
  return reactionScore + freshBoost + recencyScore;
}

export function filterPosts(posts, { query = '', tags = [] } = {}) {
  const normalizedQuery = query.trim().toLowerCase();
  return posts.filter((post) => {
    const textBlob = [
      post.authorName,
      post.caption || '',
      ...(post.fixedTags || []),
      ...(post.freeTags || []),
    ].join(' ').toLowerCase();

    const matchesQuery = !normalizedQuery || textBlob.includes(normalizedQuery);
    const matchesTags = !tags.length || tags.every((tag) => [...(post.fixedTags || []), ...(post.freeTags || [])].includes(tag));
    return matchesQuery && matchesTags;
  });
}
