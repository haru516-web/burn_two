import { renderBottomNav } from './components/bottomNav.js';
import { renderCommentsModal } from './components/modals.js';
import { getIcon } from './components/icons.js';
import { getState, addPost, updatePost, deletePost, toggleLike, toggleSave, addComment, addImpression, updateProfile, toggleFollow, saveIssue, upsertDraft, deleteDraft, addRecordMemory, updateRecordMemory, updateCoupleAnswer, addCoupleCalendarEntry, deleteCoupleCalendarEntry, resetCoupleAnswers, toggleCoupleTodo, addCoupleTodo, deleteCoupleTodo } from './core/store.js';
import { renderOpening } from './pages/opening.js';
import { renderInvite } from './pages/invite.js';
import { renderHome, renderTimeline } from './pages/timeline.js';
import { DATE_PLANS, renderSearch } from './pages/search.js';
import { renderCompose } from './pages/compose.js';
import { renderMagazine } from './pages/magazine.js';
import { renderProfile } from './pages/profile.js';
import { renderPostDetail } from './pages/postDetail.js';
import { renderRecord } from './pages/record.js';
import { DEFAULT_COMPOSE_TEMPLATE, getComposeTemplateById } from './templates/index.js';
import {
  DEFAULT_RECORD_BACKGROUND,
  DEFAULT_RECORD_TEMPLATE,
  getRecordBackgroundById,
  getRecordTemplateById,
} from './templates/recordTemplates.js';
import {
  FIXED_TEMPLATE_SLOT_KEYS,
  getFixedTemplateLayout,
  getFixedTemplateTextMetrics,
} from './templates/fixedTemplateLayouts.js';
import {
  computePage8ResolvedLayout,
  normalizePage8ImageBoxes,
  normalizePage8Options,
  normalizePage8TextBoxes,
  page8RectToPercent,
  PAGE8_BOUNDS,
  PAGE8_GRID,
  PAGE8_MIN_IMAGE_SIZE,
  PAGE8_MIN_TEXT_SIZE,
  snapPage8Value,
} from './templates/page8Layout.js';
import { cropFileToCirclePngDataUrl, fileToWebpDataUrl } from './utils/image.js';

const uiState = {
  screen: 'opening',
  timelineOverlay: null,
  timelineTab: 'recommended',
  timelinePan: { x: -360, y: -220 },
  searchQuery: '',
  searchTags: [],
  searchSort: 'popular',
  coupleView: 'calendar',
  selectedCalendarDate: getTodayDateKey(),
  dateAddStep: 1,
  dateAddDraft: null,
  dateListTab: 'upcoming',
  todoInputOpen: false,
  homeTheme: 'light',
  homeCoreState: 'default',
  homeCoreTapTimestamps: [],
  previewPostId: null,
  commentPostId: null,
  profileEditOpen: false,
  profileAuthor: null,
  profileSection: null,
  profileLibraryTab: 'liked',
  profileFindQuery: '',
  profileFindTags: [],
  profileFindMonth: '',
  profileExpanded: true,
  profileOrbitRotation: 0,
  profileOrbitDragSuppressUntil: 0,
  profileAvatarCropOpen: false,
  composeStage: 'select',
  composeTemplateId: DEFAULT_COMPOSE_TEMPLATE,
  composeBackgroundColor: '#ffffff',
  composeEditingPostId: null,
  composeDraftId: null,
  composeWorkingDraft: null,
  composePreparedImageData: null,
  composePreparedImageDirty: true,
  openingTapGuardUntil: 0,
  postReturnScreen: 'timeline',
  postReturnProfileAuthor: null,
  profileReturnState: null,
  composeReturnState: null,
  recordStage: 'home',
  recordDate: null,
  recordTemplateId: DEFAULT_RECORD_TEMPLATE,
  recordBackgroundId: DEFAULT_RECORD_BACKGROUND,
  recordPhotoFeather: true,
  recordTitle: '',
  recordDraft: null,
  recordSelectedIds: [],
  recordEditingId: null,
  postDetailShouldScroll: false,
};
let composeSelectionChangeCleanup = null;
let viewportStabilityInstalled = false;
let recordCameraStream = null;

function resetWindowScroll() {
  if (typeof window === 'undefined') return;
  if (window.scrollX === 0 && window.scrollY === 0) return;
  window.scrollTo(0, 0);
}

function queueWindowScrollReset() {
  resetWindowScroll();
  window.requestAnimationFrame?.(resetWindowScroll);
}

function updateViewportHeightVariable() {
  const viewportHeight = window.visualViewport?.height || window.innerHeight;
  document.documentElement.style.setProperty('--app-viewport-height', `${Math.round(viewportHeight)}px`);
}

function installViewportStabilityGuards() {
  if (viewportStabilityInstalled || typeof window === 'undefined') return;
  viewportStabilityInstalled = true;

  const handleViewportChange = () => {
    updateViewportHeightVariable();
    queueWindowScrollReset();
  };

  updateViewportHeightVariable();
  window.addEventListener('resize', handleViewportChange, { passive: true });
  window.addEventListener('orientationchange', handleViewportChange, { passive: true });
  window.addEventListener('scroll', queueWindowScrollReset, { passive: true });
  document.addEventListener('focusout', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (!target.matches('input, textarea, [contenteditable="true"]')) return;
    queueWindowScrollReset();
  }, true);
  document.addEventListener('touchmove', (event) => {
    const target = event.target;
    if (target instanceof HTMLElement && target.closest([
      'input[type="range"]',
      'textarea',
      'select',
      '.screen-area--home',
      '.screen-area--timeline',
      '.screen-area--search',
      '.screen-area--profile',
      '.screen-area--post',
      '.screen-area--record',
    ].join(', '))) return;
    event.preventDefault();
  }, { passive: false });

  window.visualViewport?.addEventListener('resize', handleViewportChange, { passive: true });
  window.visualViewport?.addEventListener('scroll', queueWindowScrollReset, { passive: true });
}

function getTodayDateKey() {
  const date = new Date();
  return formatDateKey(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

function formatDateKey(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseDateKey(dateString, fallback = getTodayDateKey()) {
  const match = String(dateString || fallback).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return parseDateKey(fallback, '2025-05-03');
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function shiftDateKeyMonth(dateString, delta) {
  const { year, month, day } = parseDateKey(dateString);
  const target = new Date(year, month - 1 + delta, 1);
  const nextYear = target.getFullYear();
  const nextMonth = target.getMonth() + 1;
  const nextDay = Math.min(day, getDaysInMonth(nextYear, nextMonth));
  return formatDateKey(nextYear, nextMonth, nextDay);
}

const COMPOSE_TEXT_FONT_STACKS = {
  'kaisei-tokumin': `'Kaisei Tokumin', 'Noto Serif JP', 'Hiragino Mincho ProN', 'Yu Mincho', serif`,
  'noto-serif-jp': `'Noto Serif JP', 'Hiragino Mincho ProN', 'Yu Mincho', serif`,
  'noto-sans-jp': `'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic', sans-serif`,
  'zen-kaku-gothic-new': `'Zen Kaku Gothic New', 'Hiragino Sans', 'Yu Gothic', sans-serif`,
  'biz-udgothic': `'BIZ UDGothic', 'Yu Gothic', sans-serif`,
  'kosugi-maru': `'Kosugi Maru', 'Hiragino Maru Gothic ProN', sans-serif`,
  'klee-one': `'Klee One', 'Klee', 'Noto Serif JP', 'Hiragino Mincho ProN', serif`,
  'line-seed-jp': `'LINE Seed JP', 'Noto Sans JP', 'Hiragino Sans', sans-serif`,
  'sawarabi-mincho': `'Sawarabi Mincho', 'Hiragino Mincho ProN', 'Yu Mincho', serif`,
  'hina-mincho': `'Hina Mincho', 'Hiragino Mincho ProN', 'Yu Mincho', serif`,
  'source-han-serif': `'Source Han Serif', 'Source Han Serif JP', 'Noto Serif JP', serif`,
  'shippori-mincho': `'Shippori Mincho', 'Hiragino Mincho ProN', 'Yu Mincho', serif`,
  'zen-old-mincho': `'Zen Old Mincho', 'Hiragino Mincho ProN', 'Yu Mincho', serif`,
  'editorial-serif': `'Zen Old Mincho', 'Hiragino Mincho ProN', 'Yu Mincho', serif`,
  'modern-sans': `'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic', sans-serif`,
  'soft-serif': `'Shippori Mincho', 'Hiragino Mincho ProN', 'Yu Mincho', serif`,
};
const COMPOSE_TEXT_FONT_IDS = new Set(Object.keys(COMPOSE_TEXT_FONT_STACKS));
const COMPOSE_TEXT_FIELD_KEYS = ['text', 'headline', 'subhead', 'text2', 'text3', 'intro', 'body', 'date', 'editor'];
const COMPOSE_TEXT_BACKGROUND_COLORS = new Set([
  '#ffffff',
  '#f8f4ee',
  '#f4e5de',
  '#ece4d8',
  '#e5ece7',
  '#e8e5df',
]);

function getComposeFontStackById(fontId) {
  return COMPOSE_TEXT_FONT_STACKS[fontId] || '';
}

function getComposeRichTextFontIds(markup = '') {
  if (!markup || typeof document === 'undefined') return [];
  const template = document.createElement('template');
  template.innerHTML = String(markup);
  return Array.from(template.content.querySelectorAll('[data-compose-font-id]'))
    .map((element) => element.dataset.composeFontId)
    .filter((fontId) => COMPOSE_TEXT_FONT_IDS.has(fontId));
}

function normalizeComposeRichTextSizeScale(value) {
  const scale = Number(value);
  return Number.isFinite(scale) ? Math.min(2, Math.max(0.5, scale)) : null;
}

function normalizeComposeRichTextAlign(value) {
  return ['left', 'center', 'right'].includes(value) ? value : null;
}

function normalizeComposeTextBackgroundColor(value) {
  const color = String(value || '').trim().toLowerCase();
  return COMPOSE_TEXT_BACKGROUND_COLORS.has(color) ? color : null;
}

async function waitForComposeFonts(values = {}) {
  if (!document.fonts?.load) return;
  const stacks = new Set([
    '"Cormorant Garamond", "Times New Roman", serif',
    '"Noto Sans JP", sans-serif',
  ]);

  Object.values(values.textStyles || {}).forEach((style) => {
    const stack = getComposeFontStackById(style?.family);
    if (stack) stacks.add(stack);
  });
  Object.values(values.richTexts || {}).forEach((markup) => {
    getComposeRichTextFontIds(markup).forEach((fontId) => {
      const stack = getComposeFontStackById(fontId);
      if (stack) stacks.add(stack);
    });
  });

  const customLayout = values.customLayout || {};
  if (Array.isArray(customLayout.textBoxes)) {
    customLayout.textBoxes.forEach((box) => {
      stacks.add(box?.family === 'serif'
        ? '"Cormorant Garamond", "Times New Roman", serif'
        : '"Noto Sans JP", sans-serif');
    });
  }
  if (Array.isArray(customLayout.pretextBoxes)) {
    customLayout.pretextBoxes.forEach((box) => {
      if (box?.kind !== 'title' && box?.kind !== 'body') return;
      if (box.data?.fontFamily) stacks.add(String(box.data.fontFamily));
    });
  }

  try {
    await Promise.race([
      Promise.all(Array.from(stacks).flatMap((stack) => [
        document.fonts.load(`400 32px ${stack}`),
        document.fonts.load(`500 32px ${stack}`),
        document.fonts.load(`600 32px ${stack}`),
        document.fonts.load(`700 32px ${stack}`),
      ])),
      new Promise((resolve) => window.setTimeout(resolve, 1600)),
    ]);
  } catch {}
}

const composePreviewDefaults = {
  text: 'text',
  headline: 'text',
  subhead: 'text',
  text2: 'text',
  text3: 'text',
  intro: 'text',
  body: 'text',
  date: 'text',
  editor: '編集者：haru',
};

function createComposeFileState(source = {}) {
  return {
    file: typeof source.file === 'string' ? source.file : null,
    position: {
      x: Number(source.position?.x) || 0.5,
      y: Number(source.position?.y) || 0.5,
      zoom: Math.max(1, Number(source.position?.zoom) || 1),
    },
    imageSize: source.imageSize && Number.isFinite(source.imageSize.width) && Number.isFinite(source.imageSize.height)
      ? { width: source.imageSize.width, height: source.imageSize.height }
      : null,
  };
}

function createComposeTextStyleValue(source = {}) {
  const family = COMPOSE_TEXT_FONT_IDS.has(source.family)
    ? source.family
    : null;
  const scale = Number.isFinite(Number(source.scale))
    ? Math.min(2, Math.max(0.5, Number(source.scale)))
    : 1;
  const backgroundColor = normalizeComposeTextBackgroundColor(source.backgroundColor);

  return { family, scale, backgroundColor };
}

function createComposeTextStyleState(source = {}) {
  return COMPOSE_TEXT_FIELD_KEYS.reduce((next, fieldKey) => {
    next[fieldKey] = createComposeTextStyleValue(source[fieldKey]);
    return next;
  }, {});
}

function createComposeRichTextState(source = {}) {
  return COMPOSE_TEXT_FIELD_KEYS.reduce((next, fieldKey) => {
    next[fieldKey] = typeof source[fieldKey] === 'string' ? source[fieldKey] : '';
    return next;
  }, {});
}

function createComposeFixedLayoutState(source = {}, templateId = DEFAULT_COMPOSE_TEMPLATE) {
  const layout = source && typeof source === 'object' ? source : {};
  const cloneRects = (items = {}, options = {}) => Object.entries(items || {}).reduce((next, [key, rect]) => {
    if (!rect || typeof rect !== 'object') return next;
    const x = Number(rect.x);
    const y = Number(rect.y);
    const width = Number(rect.width);
    const height = Number(rect.height);
    if (![x, y, width, height].every(Number.isFinite)) return next;
    next[key] = {
      x,
      y,
      width,
      height,
    };
    if (options.includeAlign && ['left', 'center', 'right'].includes(rect.align)) {
      next[key].align = rect.align;
    }
    return next;
  }, {});
  return {
    templateId: layout.templateId || templateId || DEFAULT_COMPOSE_TEMPLATE,
    images: cloneRects(layout.images),
    texts: cloneRects(layout.texts, { includeAlign: true }),
  };
}

function createComposeWorkingDraft(source = {}) {
  const textValue = source.text || source.headline || composePreviewDefaults.text;
  return {
    templateId: source.templateId || DEFAULT_COMPOSE_TEMPLATE,
    backgroundColor: source.backgroundColor || '#ffffff',
    text: textValue,
    headline: source.headline || composePreviewDefaults.headline,
    subhead: source.subhead || composePreviewDefaults.subhead,
    text2: source.text2 || composePreviewDefaults.text2,
    text3: source.text3 || composePreviewDefaults.text3,
    intro: source.intro || composePreviewDefaults.intro,
    body: source.body || composePreviewDefaults.body,
    date: source.date || composePreviewDefaults.date,
    editor: source.editor || composePreviewDefaults.editor,
    textStyles: createComposeTextStyleState(source.textStyles),
    richTexts: createComposeRichTextState(source.richTexts),
    fixedLayout: createComposeFixedLayoutState(source.fixedLayout, source.templateId || DEFAULT_COMPOSE_TEMPLATE),
    fixedTags: Array.isArray(source.fixedTags) ? [...source.fixedTags] : [],
    freeTags: Array.isArray(source.freeTags)
      ? [...source.freeTags]
      : String(source.freeTags || '')
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    customLayout: source.customLayout ? JSON.parse(JSON.stringify(source.customLayout)) : null,
    standardFiles: {
      primary: createComposeFileState(source.standardFiles?.primary),
      secondary: createComposeFileState(source.standardFiles?.secondary),
      accent: createComposeFileState(source.standardFiles?.accent),
      detail: createComposeFileState(source.standardFiles?.detail),
    },
  };
}

function getFixedSlotStateKey(inputId) {
  switch (inputId) {
    case 'imageInputPrimary':
      return 'primary';
    case 'imageInputSecondary':
      return 'secondary';
    case 'imageInputAccent':
      return 'accent';
    case 'imageInputDetail':
      return 'detail';
    default:
      return 'primary';
  }
}

let app = null;
let openingSequenceId = 0;
let homeCoreTransitionTimer = null;
let activeComposeBridge = null;
const profileAvatarDraft = {
  file: null,
  previewUrl: '',
  imageSize: null,
  crop: { x: 0.5, y: 0.5, zoom: 1 },
};

function snapPage8ValueUp(value) {
  return Math.ceil(value / PAGE8_GRID) * PAGE8_GRID;
}

function clearHomeCoreTransition() {
  if (homeCoreTransitionTimer) {
    window.clearTimeout(homeCoreTransitionTimer);
    homeCoreTransitionTimer = null;
  }
}

function resetHomeCoreState() {
  clearHomeCoreTransition();
  uiState.homeCoreState = 'default';
  uiState.homeCoreTapTimestamps = [];
}

function resetProfileAvatarDraft() {
  if (profileAvatarDraft.previewUrl) {
    URL.revokeObjectURL(profileAvatarDraft.previewUrl);
  }
  profileAvatarDraft.file = null;
  profileAvatarDraft.previewUrl = '';
  profileAvatarDraft.imageSize = null;
  profileAvatarDraft.crop = { x: 0.5, y: 0.5, zoom: 1 };
  uiState.profileAvatarCropOpen = false;
}

function cleanupComposeBridge() {
  if (activeComposeBridge?.unmount) {
    activeComposeBridge.unmount();
  }
  activeComposeBridge = null;
}

function resolveHomeTheme() {
  return 'light';
}

function getPageHtml() {
  const state = getState();
  switch (uiState.screen) {
    case 'home':
      return renderHome(state, uiState);
    case 'timeline':
      return renderTimeline(state, uiState);
    case 'search':
      return renderSearch(state, uiState);
    case 'invite':
      return renderInvite();
    case 'compose':
      return renderCompose({
        stage: uiState.composeStage,
        selectedTemplateId: uiState.composeTemplateId,
        selectedBackground: uiState.composeBackgroundColor,
        draft: uiState.composeWorkingDraft || getActivePost(uiState.composeEditingPostId)?.composeData || null,
        isEditing: Boolean(uiState.composeEditingPostId),
      });
    case 'magazine':
      return renderMagazine(state);
    case 'record':
      return renderRecord(state, uiState);
    case 'profile':
      return renderProfile(state, uiState);
    case 'post': {
      const post = getActivePost(uiState.previewPostId);
      const posts = [...(state.posts || [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return renderPostDetail(post, {
        posts,
        currentUserName: state.profile.name,
        title: uiState.postReturnScreen === 'profile' ? post?.authorName : '',
        showOwnerMenu: uiState.postReturnScreen === 'profile',
      });
    }
    default:
      return renderHome(state, uiState);
  }
}

function getActivePost(postId) {
  return getState().posts.find((post) => post.id === postId);
}

function isOwnPost(post) {
  if (!post) return false;
  return post.authorName === getState().profile.name;
}

function renderShell() {
  if (!app) return;
  const shellClasses = ['app-shell'];
  const screenAreaClasses = ['screen-area'];
  const themeName = resolveHomeTheme();
  const isRecordCameraStage = uiState.screen === 'record' && uiState.recordStage === 'camera';
  const hasBottomNav = ['home', 'timeline', 'search', 'record', 'magazine', 'profile'].includes(uiState.screen) && !isRecordCameraStage;

  shellClasses.push(`app-shell--theme-${themeName}`);
  shellClasses.push('app-shell--theme-mode-light');
  if (hasBottomNav) {
    shellClasses.push('app-shell--with-bottom-nav');
    screenAreaClasses.push('screen-area--with-bottom-nav');
  }

  if (uiState.screen === 'home') {
    shellClasses.push('app-shell--home');
    screenAreaClasses.push('screen-area--home');
  } else if (uiState.screen === 'timeline') {
    shellClasses.push('app-shell--timeline');
    screenAreaClasses.push('screen-area--timeline');
  } else if (uiState.screen === 'compose') {
    shellClasses.push('app-shell--compose');
    screenAreaClasses.push('screen-area--compose');
  } else if (uiState.screen === 'search') {
    screenAreaClasses.push('screen-area--search');
  } else if (uiState.screen === 'record') {
    screenAreaClasses.push('screen-area--record');
    if (isRecordCameraStage) {
      shellClasses.push('app-shell--record-camera');
      screenAreaClasses.push('screen-area--record-camera');
    }
  } else if (uiState.screen === 'profile') {
    screenAreaClasses.push('screen-area--profile');
  } else if (uiState.screen === 'post') {
    screenAreaClasses.push('screen-area--post');
  } else if (uiState.screen === 'invite') {
    screenAreaClasses.push('screen-area--invite');
  }

  app.innerHTML = `
    <div class="${shellClasses.join(' ')}">
      <main class="${screenAreaClasses.join(' ')}" id="screenArea"></main>
      ${hasBottomNav ? renderBottomNav(uiState.screen) : ''}
      <div id="modalRoot"></div>
    </div>
  `;
}

function renderModals() {
  const modalRoot = document.getElementById('modalRoot');
  if (!modalRoot) return;
  const commentPost = uiState.commentPostId ? getActivePost(uiState.commentPostId) : null;
  modalRoot.innerHTML = `
    ${renderCommentsModal(commentPost)}
  `;
  bindModalEvents();
}

function renderScreen() {
  const screenArea = document.getElementById('screenArea');
  if (!screenArea) return;
  const isRecordCameraStage = uiState.screen === 'record' && uiState.recordStage === 'camera';
  const shell = screenArea.closest('.app-shell');
  shell?.classList.toggle('app-shell--record-camera', isRecordCameraStage);
  shell?.classList.toggle('app-shell--with-bottom-nav', !isRecordCameraStage && ['home', 'timeline', 'search', 'record', 'magazine', 'profile'].includes(uiState.screen));
  screenArea.classList.toggle('screen-area--record-camera', isRecordCameraStage);
  screenArea.classList.toggle('screen-area--with-bottom-nav', !isRecordCameraStage && ['home', 'timeline', 'search', 'record', 'magazine', 'profile'].includes(uiState.screen));
  if (!(uiState.screen === 'record' && uiState.recordStage === 'camera' && !uiState.recordDraft?.imageData)) {
    stopRecordCameraStream();
  }
  screenArea.innerHTML = getPageHtml();
  bindPageEvents();
  renderModals();
}

function render() {
  if (!app) return;
  cleanupComposeBridge();
  if (uiState.screen === 'opening') {
    app.innerHTML = renderOpening(renderHome(getState(), uiState));
    bindOpeningEvents();
    return;
  }
  renderShell();
  renderScreen();
  bindNavEvents();
}

function captureViewState() {
  return {
    screen: uiState.screen,
    previewPostId: uiState.previewPostId,
    profileAuthor: uiState.profileAuthor,
    postReturnScreen: uiState.postReturnScreen,
    postReturnProfileAuthor: uiState.postReturnProfileAuthor,
  };
}

function restoreViewState(snapshot, fallback = 'home') {
  if (!snapshot) {
    navigate(fallback);
    return;
  }
  uiState.screen = snapshot.screen || fallback;
  uiState.previewPostId = snapshot.previewPostId || null;
  uiState.commentPostId = null;
  uiState.profileEditOpen = false;
  uiState.profileAuthor = uiState.screen === 'profile' ? (snapshot.profileAuthor || null) : null;
  uiState.postReturnScreen = snapshot.postReturnScreen || 'home';
  uiState.postReturnProfileAuthor = snapshot.postReturnProfileAuthor || null;
  render();
}

function navigate(screen) {
  if (screen !== 'home') {
    resetHomeCoreState();
  }
  if (screen === 'compose' && uiState.screen !== 'compose') {
    uiState.composeReturnState = captureViewState();
  }
  if (screen === 'profile' && uiState.screen !== 'profile') {
    uiState.profileReturnState = captureViewState();
  }
  if (screen !== 'profile') {
    resetProfileAvatarDraft();
    uiState.profileReturnState = null;
  }
  if (screen !== 'home') {
    uiState.timelineOverlay = null;
  }
  if (screen !== 'compose') {
    uiState.composeEditingPostId = null;
    uiState.composeDraftId = null;
    uiState.composeStage = 'select';
    uiState.composeBackgroundColor = '#ffffff';
    uiState.composeWorkingDraft = null;
    uiState.composePreparedImageData = null;
    uiState.composePreparedImageDirty = true;
    uiState.composeReturnState = null;
  }
  if (screen !== 'record') {
    uiState.recordStage = 'home';
    uiState.recordDate = null;
    uiState.recordTemplateId = DEFAULT_RECORD_TEMPLATE;
    uiState.recordBackgroundId = DEFAULT_RECORD_BACKGROUND;
    uiState.recordPhotoFeather = true;
    uiState.recordTitle = '';
    uiState.recordDraft = null;
    uiState.recordSelectedIds = [];
    uiState.recordEditingId = null;
  }
  uiState.screen = screen;
  uiState.previewPostId = null;
  uiState.commentPostId = null;
  if (screen === 'compose') {
    uiState.composeStage = 'select';
    uiState.composeBackgroundColor = '#ffffff';
    uiState.composeTemplateId = DEFAULT_COMPOSE_TEMPLATE;
    uiState.composeDraftId = null;
    uiState.composePreparedImageData = null;
    uiState.composePreparedImageDirty = true;
    uiState.composeWorkingDraft = createComposeWorkingDraft({
      templateId: DEFAULT_COMPOSE_TEMPLATE,
      backgroundColor: '#ffffff',
    });
  }
  if (screen === 'record') {
    uiState.recordStage = 'home';
    uiState.recordDate = null;
    uiState.recordTemplateId = DEFAULT_RECORD_TEMPLATE;
    uiState.recordBackgroundId = DEFAULT_RECORD_BACKGROUND;
    uiState.recordPhotoFeather = true;
    uiState.recordTitle = '';
    uiState.recordDraft = null;
    uiState.recordSelectedIds = [];
    uiState.recordEditingId = null;
  }
  if (screen === 'profile') {
    resetProfileAvatarDraft();
    uiState.profileAuthor = null;
    uiState.profileSection = 'pages';
    uiState.profileLibraryTab = 'liked';
    uiState.profileFindQuery = '';
    uiState.profileFindTags = [];
    uiState.profileFindMonth = '';
    uiState.profileExpanded = true;
    uiState.profileOrbitRotation = 270;
  }
  if (screen !== 'profile') {
    uiState.profileEditOpen = false;
    uiState.profileAuthor = null;
  }
  render();
}

function enterTimelineFromOpening() {
  uiState.previewPostId = null;
  uiState.commentPostId = null;
  uiState.openingTapGuardUntil = Date.now() + 700;
  uiState.postReturnScreen = 'home';
  uiState.postReturnProfileAuthor = null;
  uiState.screen = 'home';
  render();
}

function openProfile(authorName) {
  resetProfileAvatarDraft();
  uiState.profileReturnState = captureViewState();
  uiState.screen = 'profile';
  uiState.previewPostId = null;
  uiState.commentPostId = null;
  uiState.profileEditOpen = false;
  uiState.profileAuthor = authorName || null;
  uiState.profileSection = authorName ? null : 'pages';
  uiState.profileLibraryTab = 'liked';
  uiState.profileFindQuery = '';
  uiState.profileFindTags = [];
  uiState.profileFindMonth = '';
  uiState.profileExpanded = true;
  uiState.profileOrbitRotation = authorName ? 0 : 270;
  render();
}

function closeProfile() {
  resetProfileAvatarDraft();
  const snapshot = uiState.profileReturnState;
  uiState.profileReturnState = null;
  restoreViewState(snapshot, 'home');
}

function openPostDetail(postId) {
  uiState.postReturnScreen = uiState.screen;
  uiState.postReturnProfileAuthor = uiState.profileAuthor;
  uiState.screen = 'post';
  uiState.previewPostId = postId;
  uiState.commentPostId = null;
  uiState.postDetailShouldScroll = true;
  render();
}

function openPostEdit(postId) {
  const post = getActivePost(postId);
  if (!post || !isOwnPost(post)) return;
  uiState.composeReturnState = captureViewState();
  uiState.composeEditingPostId = postId;
  uiState.composeDraftId = null;
  uiState.composeStage = 'edit';
  uiState.composePreparedImageData = post.imageData || null;
  uiState.composePreparedImageDirty = false;
  uiState.composeTemplateId = post.composeData?.templateId || DEFAULT_COMPOSE_TEMPLATE;
  uiState.composeBackgroundColor = '#ffffff';
  uiState.composeWorkingDraft = createComposeWorkingDraft(post.composeData || {});
  uiState.screen = 'compose';
  uiState.previewPostId = null;
  uiState.commentPostId = null;
  render();
}

function hasMeaningfulComposeDraft(draft) {
  if (!draft || typeof draft !== 'object') return false;
  const textValues = [draft.headline, draft.subhead, draft.intro, draft.body, draft.date, draft.editor]
    .map((value) => String(value || '').trim());
  const hasNonDefaultText = (
    textValues[0] && textValues[0] !== composePreviewDefaults.headline
  ) || (
    textValues[1] && textValues[1] !== composePreviewDefaults.subhead
  ) || (
    textValues[2] && textValues[2] !== composePreviewDefaults.intro
  ) || (
    textValues[3] && textValues[3] !== composePreviewDefaults.body
  ) || (
    textValues[4] && textValues[4] !== composePreviewDefaults.date
  ) || (
    textValues[5] && textValues[5] !== composePreviewDefaults.editor
  );
  const hasTags = Array.isArray(draft.fixedTags) ? draft.fixedTags.length > 0 : false;
  const hasFreeTags = Array.isArray(draft.freeTags) ? draft.freeTags.length > 0 : false;
  const hasFiles = Object.values(draft.standardFiles || {}).some((fileState) => typeof fileState?.file === 'string' && fileState.file);
  const hasCustomLayout = Boolean(
    draft.customLayout
    && (
      Array.isArray(draft.customLayout.imageBoxes) && draft.customLayout.imageBoxes.length
      || Array.isArray(draft.customLayout.textBoxes) && draft.customLayout.textBoxes.length
      || Array.isArray(draft.customLayout.pretextBoxes) && draft.customLayout.pretextBoxes.length
    ),
  );
  return hasNonDefaultText || hasTags || hasFreeTags || hasFiles || hasCustomLayout;
}

function persistComposeDraftOnExit() {
  if (uiState.composeEditingPostId) return;
  const draft = uiState.composeWorkingDraft;
  if (!hasMeaningfulComposeDraft(draft)) {
    if (uiState.composeDraftId) {
      deleteDraft(uiState.composeDraftId);
    }
    uiState.composeDraftId = null;
    return;
  }

  const savedDraft = upsertDraft({
    id: uiState.composeDraftId || undefined,
    title: buildComposeCaption(draft) || draft.headline || 'Untitled',
    imageData: uiState.composePreparedImageData || '',
    composeData: createComposeWorkingDraft(draft),
  });
  uiState.composeDraftId = savedDraft.id;
}

function openComposeDraft(draftId) {
  const draft = getState().drafts.find((item) => item.id === draftId);
  if (!draft?.composeData) return;
  uiState.composeReturnState = captureViewState();
  uiState.composeEditingPostId = null;
  uiState.composeDraftId = draft.id;
  uiState.composeStage = 'edit';
  uiState.composePreparedImageData = draft.imageData || null;
  uiState.composePreparedImageDirty = !draft.imageData;
  uiState.composeTemplateId = draft.composeData.templateId || DEFAULT_COMPOSE_TEMPLATE;
  uiState.composeBackgroundColor = '#ffffff';
  uiState.composeWorkingDraft = createComposeWorkingDraft(draft.composeData);
  uiState.screen = 'compose';
  uiState.previewPostId = null;
  uiState.commentPostId = null;
  render();
}

async function publishComposeDraft(draftId) {
  const draft = getState().drafts.find((item) => item.id === draftId);
  if (!draft?.composeData || !draft.imageData) return;
  const draftSnapshot = createComposeWorkingDraft(draft.composeData);
  const values = {
    templateId: draftSnapshot.templateId,
    backgroundColor: draftSnapshot.backgroundColor,
    text: draftSnapshot.text,
    headline: draftSnapshot.headline,
    subhead: draftSnapshot.subhead,
    intro: draftSnapshot.intro,
    body: draftSnapshot.body,
    date: draftSnapshot.date,
    editor: draftSnapshot.editor,
    textStyles: draftSnapshot.textStyles,
    fixedLayout: draftSnapshot.fixedLayout,
    customLayout: draftSnapshot.customLayout,
  };
  const imageData = draft.imageData;
  const profileName = String(getState().profile?.name || 'you').trim() || 'you';

  addPost({
    authorName: profileName,
    caption: buildComposeCaption(values),
    imageData,
    fixedTags: draftSnapshot.fixedTags,
    freeTags: draftSnapshot.freeTags,
    composeData: {
      ...values,
      fixedTags: draftSnapshot.fixedTags,
      freeTags: draftSnapshot.freeTags,
      standardFiles: draftSnapshot.standardFiles,
    },
  });
  deleteDraft(draftId);
  uiState.composeDraftId = null;
  uiState.composeWorkingDraft = null;
  uiState.composeEditingPostId = null;
  uiState.composePreparedImageData = null;
  uiState.composePreparedImageDirty = true;
  uiState.screen = 'timeline';
  uiState.timelineTab = 'recommended';
  uiState.profileSection = 'pages';
  render();
}

function closeCompose() {
  persistComposeDraftOnExit();
  const snapshot = uiState.composeReturnState;
  uiState.composeReturnState = null;
  uiState.composeDraftId = null;
  uiState.composeWorkingDraft = null;
  uiState.composePreparedImageData = null;
  uiState.composePreparedImageDirty = true;
  restoreViewState(snapshot, 'home');
}

function closePostDetail() {
  uiState.screen = uiState.postReturnScreen || 'timeline';
  uiState.commentPostId = null;
  uiState.profileEditOpen = false;
  uiState.profileAuthor = uiState.screen === 'profile' ? uiState.postReturnProfileAuthor : null;
  render();
}

function openSearchForTag(tag) {
  const normalizedTag = String(tag || '').trim();
  if (!normalizedTag) return;
  uiState.screen = 'search';
  uiState.previewPostId = null;
  uiState.commentPostId = null;
  uiState.searchQuery = normalizedTag;
  uiState.searchTags = [];
  uiState.searchSort = 'popular';
  uiState.profileEditOpen = false;
  uiState.profileAuthor = null;
  render();
}

function loadOpeningImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load opening asset: ${src}`));
    image.src = src;
  });
}

function createOpeningLogoSprite(logoImage) {
  const sourceWidth = logoImage.naturalWidth || logoImage.width;
  const sourceHeight = logoImage.naturalHeight || logoImage.height;
  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = sourceWidth;
  sourceCanvas.height = sourceHeight;
  const sourceCtx = sourceCanvas.getContext('2d');
  if (!sourceCtx) return null;

  sourceCtx.drawImage(logoImage, 0, 0, sourceWidth, sourceHeight);
  const imageData = sourceCtx.getImageData(0, 0, sourceWidth, sourceHeight);
  const pixels = imageData.data;
  let minX = sourceWidth;
  let minY = sourceHeight;
  let maxX = -1;
  let maxY = -1;

  for (let index = 0; index < pixels.length; index += 4) {
    const r = pixels[index];
    const g = pixels[index + 1];
    const b = pixels[index + 2];
    const sourceAlpha = pixels[index + 3] / 255;
    const luminance = (0.2126 * r) + (0.7152 * g) + (0.0722 * b);
    const glowAlpha = Math.max(0, Math.min(1, (luminance - 108) / 110)) * sourceAlpha;
    const coreAlpha = Math.max(0, Math.min(1, (luminance - 184) / 42)) * sourceAlpha;
    const outputAlpha = Math.max(glowAlpha * 0.8, coreAlpha);

    pixels[index] = 255;
    pixels[index + 1] = 255;
    pixels[index + 2] = 255;
    pixels[index + 3] = Math.round(outputAlpha * 255);

    if (outputAlpha > 0.03) {
      const pixelIndex = index / 4;
      const x = pixelIndex % sourceWidth;
      const y = Math.floor(pixelIndex / sourceWidth);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < minX || maxY < minY) {
    return {
      canvas: sourceCanvas,
      width: sourceWidth,
      height: sourceHeight,
    };
  }

  sourceCtx.putImageData(imageData, 0, 0);
  const padding = Math.max(8, Math.round(Math.min(sourceWidth, sourceHeight) * 0.03));
  const cropX = Math.max(0, minX - padding);
  const cropY = Math.max(0, minY - padding);
  const cropWidth = Math.min(sourceWidth - cropX, (maxX - minX) + (padding * 2) + 1);
  const cropHeight = Math.min(sourceHeight - cropY, (maxY - minY) + (padding * 2) + 1);
  const croppedCanvas = document.createElement('canvas');
  croppedCanvas.width = cropWidth;
  croppedCanvas.height = cropHeight;
  const croppedCtx = croppedCanvas.getContext('2d');
  if (!croppedCtx) return null;
  croppedCtx.drawImage(sourceCanvas, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

  return {
    canvas: croppedCanvas,
    width: cropWidth,
    height: cropHeight,
  };
}

function createOpeningLogoSegments(logoSprite) {
  const sourceCtx = logoSprite.canvas.getContext('2d');
  if (!sourceCtx) return [];
  const { width, height } = logoSprite.canvas;
  const { data } = sourceCtx.getImageData(0, 0, width, height);
  const activeColumns = Array.from({ length: width }, (_, x) => {
    let activePixels = 0;
    for (let y = 0; y < height; y += 1) {
      if (data[((y * width) + x) * 4 + 3] > 110) {
        activePixels += 1;
      }
    }
    return activePixels > Math.max(2, Math.round(height * 0.04));
  });

  const groups = [];
  let start = null;
  for (let x = 0; x < activeColumns.length; x += 1) {
    if (activeColumns[x] && start == null) {
      start = x;
    }
    if ((!activeColumns[x] || x === activeColumns.length - 1) && start != null) {
      const end = activeColumns[x] && x === activeColumns.length - 1 ? x : x - 1;
      groups.push({ start, end });
      start = null;
    }
  }

  const resolvedGroups = groups.length === 4
    ? groups
    : [
      { start: 0, end: Math.round(width * 0.25) },
      { start: Math.round(width * 0.25), end: Math.round(width * 0.49) },
      { start: Math.round(width * 0.49), end: Math.round(width * 0.73) },
      { start: Math.round(width * 0.73), end: width - 1 },
    ];

  return resolvedGroups.map((group) => {
    const segmentWidth = Math.max(1, (group.end - group.start) + 1);
    const segmentCanvas = document.createElement('canvas');
    segmentCanvas.width = segmentWidth;
    segmentCanvas.height = height;
    const segmentCtx = segmentCanvas.getContext('2d');
    if (!segmentCtx) return null;
    segmentCtx.drawImage(
      logoSprite.canvas,
      group.start,
      0,
      segmentWidth,
      height,
      0,
      0,
      segmentWidth,
      height,
    );
    return {
      canvas: segmentCanvas,
      x: group.start,
      width: segmentWidth,
      height,
    };
  }).filter(Boolean);
}

async function bindOpeningEvents() {
  const canvas = document.getElementById('openingCanvas');
  const openingScreen = document.querySelector('.opening-screen');
  if (!canvas || !openingScreen) return;

  const sequenceId = ++openingSequenceId;
  const skipOpening = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (sequenceId !== openingSequenceId) return;
    openingSequenceId += 1;
    enterTimelineFromOpening();
  };
  openingScreen.addEventListener('pointerdown', skipOpening, { once: true });

  const assetTask = Promise.all([
    loadOpeningImage('image/background/okinawa.png'),
    loadOpeningImage('image/logo/BURN＿white.png'),
  ]).catch(() => [null, null]);

  try {
    if (document.fonts?.ready) {
      await Promise.race([
        document.fonts.ready,
        new Promise((resolve) => window.setTimeout(resolve, 1200)),
      ]);
    } else {
      await new Promise((resolve) => window.setTimeout(resolve, 180));
    }
  } catch {}
  if (sequenceId !== openingSequenceId) return;

  let backgroundImage = null;
  let logoImage = null;
  try {
    [backgroundImage, logoImage] = await Promise.race([
      assetTask,
      new Promise((resolve) => window.setTimeout(() => resolve([null, null]), 1600)),
    ]);
  } catch {}
  if (sequenceId !== openingSequenceId) return;

  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
  startOpeningSequence(canvas, openingScreen, sequenceId, prefersReducedMotion, { backgroundImage, logoImage });
}

function startOpeningSequence(canvas, openingScreen, sequenceId, prefersReducedMotion, openingAssets = {}) {
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.round(rect.width * ratio));
  const height = Math.max(1, Math.round(rect.height * ratio));
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = width;
  canvas.height = height;

  const { backgroundImage, logoImage } = openingAssets;
  const textColor = '#f7fbff';
  const subtitleFont = '"Avenir Next", "Helvetica Neue", Arial, sans-serif';
  const subtitleFontSize = Math.min(width * 0.038, 28 * ratio);
  const subtitleLineHeight = subtitleFontSize * 1.24;
  const secondarySubtitleFontSize = subtitleFontSize;
  const secondarySubtitleLineHeight = subtitleLineHeight;
  const flowDuration = prefersReducedMotion ? 1400 : 2800;
  const settleDuration = prefersReducedMotion ? 420 : 760;
  const revealDuration = prefersReducedMotion ? 300 : 560;
  const holdDuration = prefersReducedMotion ? 760 : 1600;
  const disperseDuration = prefersReducedMotion ? 900 : 1700;
  const subtitleStartOffset = flowDuration * 0.62;
  const secondarySubtitleStartOffset = subtitleStartOffset * 2;
  const rippleStartOffset = flowDuration + settleDuration + revealDuration + (holdDuration * 1.08);
  const rippleRingCount = 3;
  const rippleRingSpacing = prefersReducedMotion ? 620 : 1280;
  const rippleRingDuration = prefersReducedMotion ? 1480 : 3200;
  const rippleEndOffset = rippleStartOffset
    + rippleRingDuration
    + ((rippleRingCount - 1) * rippleRingSpacing);
  const secondRippleStartOffset = rippleStartOffset + rippleRingSpacing;
  const disperseStartOffset = rippleEndOffset - disperseDuration;
  const totalDuration = Math.max(
    disperseStartOffset + disperseDuration,
    rippleEndOffset,
  );
  const subtitleLines = [
    'When the darkness, which ought to be devoid of color,',
    'is vivid with color.',
  ];
  const secondarySubtitleText = 'There was a time when, with you beside me, the sky and the flowers appeared more beautiful than ever, and even the sound of falling rain felt boundlessly tender.';

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function easeOutCubic(value) {
    return 1 - ((1 - value) ** 3);
  }

  function easeInOutCubic(value) {
    return value < 0.5
      ? 4 * value * value * value
      : 1 - (((-2 * value) + 2) ** 3) / 2;
  }

  function lerp(startValue, endValue, amount) {
    return startValue + ((endValue - startValue) * amount);
  }

  function getPhaseProgress(elapsed, offset, duration) {
    return clamp((elapsed - offset) / duration, 0, 1);
  }

  function drawCoverImage(targetCtx, image, drawWidth, drawHeight, zoom = 1) {
    if (!image) return;
    const imageWidth = image.naturalWidth || image.width;
    const imageHeight = image.naturalHeight || image.height;
    if (!imageWidth || !imageHeight) return;
    const coverScale = Math.max(drawWidth / imageWidth, drawHeight / imageHeight) * zoom;
    const renderedWidth = imageWidth * coverScale;
    const renderedHeight = imageHeight * coverScale;
    const offsetX = (drawWidth - renderedWidth) / 2;
    const offsetY = (drawHeight - renderedHeight) / 2;
    targetCtx.drawImage(image, offsetX, offsetY, renderedWidth, renderedHeight);
  }

  function drawRippleWord(targetCtx, alpha = 1, elapsedMs = 0) {
    const centerY = height * 0.5;
    const maxRadius = Math.hypot(width, height);
    const minRadius = Math.min(width, height) * 0.08;
    targetCtx.save();
    targetCtx.lineWidth = Math.max(1 * ratio, Math.min(width, height) * 0.0038);
    targetCtx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    for (let ring = 0; ring < rippleRingCount; ring += 1) {
      const ringElapsed = elapsedMs - rippleStartOffset - (ring * rippleRingSpacing);
      const ringProgress = clamp(ringElapsed / rippleRingDuration, 0, 1);
      if (ringProgress <= 0 || ringProgress >= 1) continue;
      targetCtx.globalAlpha = ((1 - ringProgress) ** 1.45) * 0.2 * alpha;
      targetCtx.beginPath();
      targetCtx.arc(
        width / 2,
        centerY,
        minRadius + (ringProgress * (maxRadius - minRadius)),
        0,
        Math.PI * 2,
      );
      targetCtx.stroke();
    }
    targetCtx.restore();
  }

  const logoSprite = logoImage ? createOpeningLogoSprite(logoImage) : null;
  const baseLogoWidth = logoSprite?.width || 1;
  const baseLogoHeight = logoSprite?.height || 1;
  const logoScale = logoSprite
    ? Math.min((width * 0.56) / baseLogoWidth, (height * 0.15) / baseLogoHeight)
    : 1;
  const logoRenderWidth = baseLogoWidth * logoScale;
  const logoRenderHeight = baseLogoHeight * logoScale;
  const logoOriginX = (width - logoRenderWidth) / 2;
  const logoTop = height * 0.12;
  const logoSegments = logoSprite
    ? createOpeningLogoSegments(logoSprite)
    : [];

  const animatedLogoSegments = (logoSegments.length ? logoSegments : []).map((segment, index, array) => {
    const targetWidth = segment.width * logoScale;
    const targetHeight = segment.height * logoScale;
    const targetX = logoOriginX + (segment.x * logoScale);
    const targetY = logoTop;
    const fromLeft = index < Math.ceil(array.length / 2);
    return {
      canvas: segment.canvas,
      targetX,
      targetY,
      targetWidth,
      targetHeight,
      startX: fromLeft
        ? -targetWidth - (Math.random() * width * 0.14) - (index * targetWidth * 0.16)
        : width + (Math.random() * width * 0.14) + ((array.length - index) * targetWidth * 0.16),
      startY: targetY + ((Math.random() - 0.5) * targetHeight * 0.45),
      driftX: (Math.random() - 0.5) * targetWidth * 0.12,
      driftY: (Math.random() - 0.5) * targetHeight * 0.08,
      enterArc: (Math.random() - 0.5) * targetHeight * 0.28,
      delay: index * 0.055,
      alpha: 0.78 + Math.random() * 0.16,
    };
  });

  const fallbackLogoMotion = {
    startX: (width * 0.5) - (logoRenderWidth * 0.45),
    startY: logoTop + (height * 0.04),
    targetX: logoOriginX,
    targetY: logoTop,
  };

  const sceneCanvas = document.createElement('canvas');
  sceneCanvas.width = width;
  sceneCanvas.height = height;
  const sceneCtx = sceneCanvas.getContext('2d');
  if (!sceneCtx) return;

  const start = performance.now();

  function frame(now) {
    if (sequenceId !== openingSequenceId) return;

    const elapsed = now - start;
    const flowProgress = easeOutCubic(getPhaseProgress(elapsed, 0, flowDuration));
    const settleProgress = easeInOutCubic(getPhaseProgress(elapsed, flowDuration * 0.56, settleDuration));
    const revealProgress = easeInOutCubic(getPhaseProgress(elapsed, flowDuration + settleDuration * 0.15, revealDuration));
    const subtitleProgress = easeInOutCubic(getPhaseProgress(elapsed, subtitleStartOffset, settleDuration + revealDuration));
    const secondarySubtitleProgress = easeInOutCubic(getPhaseProgress(elapsed, secondarySubtitleStartOffset, settleDuration + revealDuration));
    const disperseProgress = easeInOutCubic(
      getPhaseProgress(elapsed, disperseStartOffset, disperseDuration),
    );
    const rippleProgress = easeInOutCubic(
      getPhaseProgress(elapsed, rippleStartOffset, rippleEndOffset - rippleStartOffset),
    );
    const transitionProgress = easeInOutCubic(
      getPhaseProgress(elapsed, secondRippleStartOffset, rippleEndOffset - secondRippleStartOffset),
    );
    const dissolveFade = Math.max(0, 1 - (disperseProgress ** 1.24));
    const terminalFadeProgress = easeInOutCubic(getPhaseProgress(transitionProgress, 0.12, 0.88));
    const sceneFadeAlpha = dissolveFade * (1 - (terminalFadeProgress * 0.68));
    const underlayRevealAlpha = Math.min(0.42, terminalFadeProgress * 0.42);
    openingScreen?.style.setProperty('--opening-underlay-opacity', String(underlayRevealAlpha));

    sceneCtx.clearRect(0, 0, width, height);

    if (backgroundImage) {
      drawCoverImage(sceneCtx, backgroundImage, width, height, 1 + (disperseProgress * 0.04));
    } else {
      const fallbackGradient = sceneCtx.createLinearGradient(0, 0, 0, height);
      fallbackGradient.addColorStop(0, '#5f7894');
      fallbackGradient.addColorStop(0.58, '#8d7d73');
      fallbackGradient.addColorStop(1, '#182011');
      sceneCtx.fillStyle = fallbackGradient;
      sceneCtx.fillRect(0, 0, width, height);
    }

    sceneCtx.fillStyle = 'rgba(8, 12, 18, 0.2)';
    sceneCtx.fillRect(0, 0, width, height);

    const vignette = sceneCtx.createLinearGradient(0, 0, 0, height);
    vignette.addColorStop(0, 'rgba(10, 16, 24, 0.28)');
    vignette.addColorStop(0.34, 'rgba(10, 16, 24, 0.04)');
    vignette.addColorStop(0.72, 'rgba(10, 16, 24, 0.08)');
    vignette.addColorStop(1, 'rgba(3, 4, 7, 0.42)');
    sceneCtx.fillStyle = vignette;
    sceneCtx.fillRect(0, 0, width, height);

    if (animatedLogoSegments.length) {
      animatedLogoSegments.forEach((segment, index) => {
        const localProgress = clamp((flowProgress - segment.delay) / (1 - segment.delay), 0, 1);
        if (localProgress <= 0.001) return;
        const travel = easeOutCubic(localProgress);
        const arcStrength = (1 - travel) * segment.enterArc;
        const x = lerp(segment.startX, segment.targetX, travel) + (segment.driftX * (1 - travel));
        const y = lerp(segment.startY, segment.targetY, travel)
          + (Math.sin((travel * Math.PI) + (index * 0.35)) * arcStrength)
          + (segment.driftY * (1 - travel));
        const alpha = Math.min(1, (0.18 + (travel * segment.alpha) + (settleProgress * 0.22) + (revealProgress * 0.1))) * dissolveFade;
        if (alpha <= 0.02) return;
        sceneCtx.save();
        sceneCtx.globalAlpha = alpha;
        sceneCtx.drawImage(segment.canvas, x, y, segment.targetWidth, segment.targetHeight);
        sceneCtx.restore();
      });
    } else if (logoImage) {
      const travel = easeOutCubic(flowProgress);
      const x = lerp(fallbackLogoMotion.startX, fallbackLogoMotion.targetX, travel);
      const y = lerp(fallbackLogoMotion.startY, fallbackLogoMotion.targetY, travel);
      sceneCtx.save();
      sceneCtx.globalAlpha = (0.22 + (travel * 0.78)) * dissolveFade;
      sceneCtx.drawImage(logoImage, x, y, logoRenderWidth, logoRenderHeight);
      sceneCtx.restore();
    }

    const subtitleYBase = logoTop + logoRenderHeight + (height * 0.075);
    if (subtitleProgress > 0.001) {
      const subtitleAlpha = Math.min(0.96, subtitleProgress * 0.96) * Math.max(0, 1 - (disperseProgress * 0.88));
      const subtitleOffsetY = (1 - subtitleProgress) * subtitleFontSize * 0.85;
      sceneCtx.save();
      sceneCtx.globalAlpha = subtitleAlpha;
      sceneCtx.font = `400 ${subtitleFontSize}px ${subtitleFont}`;
      sceneCtx.textAlign = 'center';
      sceneCtx.textBaseline = 'middle';
      sceneCtx.fillStyle = textColor;
      sceneCtx.shadowColor = 'rgba(0, 0, 0, 0.22)';
      sceneCtx.shadowBlur = 16 * ratio;
      const subtitleY = subtitleYBase + subtitleOffsetY;
      subtitleLines.forEach((line, index) => {
        sceneCtx.fillText(line, width / 2, subtitleY + (index * subtitleLineHeight));
      });
      sceneCtx.restore();
    }
    if (secondarySubtitleProgress > 0.001) {
      const secondarySubtitleAlpha = Math.min(0.96, secondarySubtitleProgress * 0.96)
        * Math.max(0, 1 - (disperseProgress * 0.88));
      const secondarySubtitleOffsetY = (1 - secondarySubtitleProgress) * secondarySubtitleFontSize * 0.85;
      const secondarySubtitleY = subtitleYBase
        + (subtitleLines.length * subtitleLineHeight)
        + (secondarySubtitleFontSize * 1.15)
        + secondarySubtitleOffsetY;
      sceneCtx.save();
      sceneCtx.globalAlpha = secondarySubtitleAlpha;
      sceneCtx.font = `400 ${secondarySubtitleFontSize}px ${subtitleFont}`;
      sceneCtx.textAlign = 'center';
      sceneCtx.textBaseline = 'middle';
      sceneCtx.fillStyle = textColor;
      sceneCtx.shadowColor = 'rgba(0, 0, 0, 0.22)';
      sceneCtx.shadowBlur = 16 * ratio;
      addWrappedText(sceneCtx, secondarySubtitleText, {
        x: width / 2,
        y: secondarySubtitleY,
        maxWidth: logoRenderWidth * 0.96,
        lineHeight: secondarySubtitleLineHeight,
        maxLines: 6,
      });
      sceneCtx.restore();
    }
    if (rippleProgress > 0.001) {
      const rippleAlpha = Math.max(0, 1 - (rippleProgress ** 1.12));
      drawRippleWord(sceneCtx, rippleAlpha, elapsed);
    }

    ctx.clearRect(0, 0, width, height);
    const rotation = prefersReducedMotion ? 0 : Math.sin(elapsed * 0.0054) * 0.009 * disperseProgress;
    const sceneScale = 1 + (disperseProgress * 0.038);

    ctx.save();
    ctx.globalAlpha = sceneFadeAlpha;
    ctx.filter = prefersReducedMotion ? 'none' : `blur(${disperseProgress * 14}px)`;
    ctx.translate(width / 2, height / 2);
    ctx.rotate(rotation);
    ctx.scale(sceneScale, sceneScale);
    ctx.drawImage(sceneCanvas, -width / 2, -height / 2, width, height);
    ctx.restore();

    if (elapsed < totalDuration) {
      requestAnimationFrame(frame);
      return;
    }

    if (sequenceId === openingSequenceId) {
      openingScreen?.style.setProperty('--opening-underlay-opacity', '0');
      enterTimelineFromOpening();
    }
  }

  requestAnimationFrame(frame);
}

function bindNavEvents() {
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const wheels = [
    {
      element: document.querySelector('[data-side-wheel="main"]'),
      getItems: () => Array.from(document.querySelectorAll('[data-side-wheel="main"] [data-side-nav-screen]')),
      getActiveKey: () => (['timeline', 'search', 'compose', 'profile'].includes(uiState.screen) ? uiState.screen : (uiState.postReturnScreen || 'timeline')),
      applySelection: (key) => {
        if (uiState.screen === key) {
          render();
          return;
        }
        navigate(key);
      },
    },
    {
      element: document.querySelector('[data-side-wheel="timeline"]'),
      getItems: () => Array.from(document.querySelectorAll('[data-side-wheel="timeline"] [data-side-nav-tab]')),
      getActiveKey: () => uiState.timelineTab || 'recommended',
      applySelection: (key) => {
        uiState.timelineTab = key;
        render();
      },
    },
    {
      element: document.querySelector('[data-side-wheel="profile"]'),
      getItems: () => Array.from(document.querySelectorAll('[data-side-wheel="profile"] [data-side-nav-profile-section]')),
      getActiveKey: () => uiState.profileSection || 'pages',
      applySelection: (key) => {
        uiState.profileSection = key;
        render();
      },
    },
  ].filter((entry) => entry.element);

  wheels.forEach((wheelConfig) => {
    const { element, getItems, applySelection, getActiveKey } = wheelConfig;
    const buttons = getItems();
    if (!buttons.length) return;

    const items = buttons.map((button, index) => ({
      button,
      key: button.dataset.sideNavScreen || button.dataset.sideNavTab || button.dataset.sideNavProfileSection,
      index,
    }));

    const currentIndex = Math.max(0, items.findIndex((item) => item.key === getActiveKey()));
    let engaged = false;
    let focusIndex = currentIndex;
    let wheelOffsetY = 0;
    let activeDragX = 0;
    let suppressClickUntil = 0;
    let dragState = null;

    const clampWheelOffsetY = (nextOffset) => {
      const activeRect = items[focusIndex]?.button.getBoundingClientRect();
      const halfHeight = (activeRect?.height || 0) / 2;
      const minCenter = halfHeight;
      const maxCenter = window.innerHeight - halfHeight;
      if (maxCenter <= minCenter) return 0;
      return clamp(nextOffset, minCenter - (window.innerHeight / 2), maxCenter - (window.innerHeight / 2));
    };

    const applyWheelLayout = (nextFocusIndex, isEngaged) => {
      const anchorX = element.classList.contains('side-wheel--left') ? 76 : 24;
      const stepY = items.length <= 2 ? 88 : 76;

      element.style.setProperty('--wheel-offset-y', `${wheelOffsetY}px`);
      element.classList.toggle('is-dragging', Boolean(dragState?.moved));

      items.forEach((entry) => {
        const y = (entry.index - nextFocusIndex) * stepY;
        const opacity = isEngaged ? 1 : (entry.index === nextFocusIndex ? 1 : 0);
        const scale = isEngaged ? (entry.index === nextFocusIndex ? 1 : 0.9) : 1;
        const dragX = !isEngaged && entry.index === nextFocusIndex ? activeDragX : 0;

        entry.button.style.setProperty('--slot-x', `${anchorX}%`);
        entry.button.style.setProperty('--slot-y', `${y}px`);
        entry.button.style.setProperty('--slot-scale', String(scale));
        entry.button.style.setProperty('--slot-opacity', String(opacity));
        entry.button.style.setProperty('--slot-depth', String(Math.abs(entry.index - nextFocusIndex)));
        entry.button.style.setProperty('--drag-x', `${dragX}px`);
        entry.button.style.setProperty('--drag-y', '0px');
        entry.button.classList.toggle('is-active', entry.index === nextFocusIndex);
        entry.button.classList.toggle('is-dragging', Boolean(dragState?.moved) && entry.index === nextFocusIndex);
      });
    };

    const finishDrag = (event) => {
      if (!dragState) return;
      if (event?.pointerId != null && dragState.pointerId !== event.pointerId) return;
      const { button, pointerId, moved } = dragState;
      if (button.hasPointerCapture?.(pointerId)) {
        button.releasePointerCapture(pointerId);
      }
      dragState = null;
      if (moved) {
        suppressClickUntil = Date.now() + 220;
      }
      applyWheelLayout(focusIndex, engaged);
    };

    const handleDragMove = (event) => {
      if (!dragState || dragState.pointerId !== event.pointerId) return;
      const deltaX = event.clientX - dragState.startX;
      const deltaY = event.clientY - dragState.startY;
      if (!dragState.moved && Math.hypot(deltaX, deltaY) < 8) return;
      dragState.moved = true;

      wheelOffsetY = clampWheelOffsetY(dragState.startWheelOffsetY + deltaY);
      if (dragState.mode === 'collapsed') {
        const minCenterX = dragState.halfWidth;
        const maxCenterX = window.innerWidth - dragState.halfWidth;
        const nextCenterX = clamp(dragState.startCenterX + deltaX, minCenterX, maxCenterX);
        activeDragX = nextCenterX - dragState.anchorCenterX;
      } else {
        activeDragX = 0;
      }

      applyWheelLayout(focusIndex, engaged);
    };

    applyWheelLayout(currentIndex, false);

    const openWheel = () => {
      engaged = true;
      element.classList.add('is-engaged');
      activeDragX = 0;
      applyWheelLayout(focusIndex, true);
    };

    const closeWheel = () => {
      engaged = false;
      element.classList.remove('is-engaged');
      applyWheelLayout(focusIndex, false);
    };

    const commitSelection = (nextIndex = focusIndex) => {
      focusIndex = nextIndex;
      const selected = items[focusIndex];
      if (!selected) {
        closeWheel();
        return;
      }
      applySelection(selected.key);
    };

    buttons.forEach((button) => {
      button.addEventListener('pointerdown', (event) => {
        const buttonIndex = Number(button.dataset.sideIndex || 0);
        if (buttonIndex !== focusIndex) return;

        const rect = button.getBoundingClientRect();
        dragState = {
          pointerId: event.pointerId,
          button,
          mode: engaged ? 'engaged' : 'collapsed',
          startX: event.clientX,
          startY: event.clientY,
          startCenterX: rect.left + (rect.width / 2),
          anchorCenterX: rect.left + (rect.width / 2) - activeDragX,
          halfWidth: rect.width / 2,
          startWheelOffsetY: wheelOffsetY,
          moved: false,
        };
        button.setPointerCapture(event.pointerId);
      });

      button.addEventListener('pointermove', handleDragMove);
      button.addEventListener('pointerup', finishDrag);
      button.addEventListener('pointercancel', finishDrag);
      button.addEventListener('lostpointercapture', finishDrag);

      button.addEventListener('click', (event) => {
        if (Date.now() < suppressClickUntil) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        event.preventDefault();
        const buttonIndex = Number(button.dataset.sideIndex || 0);
        if (!engaged) {
          if (buttonIndex !== focusIndex) return;
          openWheel();
          return;
        }
        if (buttonIndex === focusIndex) {
          closeWheel();
          return;
        }
        commitSelection(buttonIndex);
      });
    });
  });
}

function bindPostInteractions(scope = document) {
  scope.querySelectorAll('[data-toggle-tags]').forEach((button) => {
    button.addEventListener('click', () => {
      const panel = document.querySelector(`[data-tags-panel="${button.dataset.toggleTags}"]`);
      if (!panel) return;
      panel.hidden = !panel.hidden;
      button.classList.toggle('is-active', !panel.hidden);
    });
  });

  scope.querySelectorAll('[data-like]').forEach((button) => {
    button.addEventListener('click', () => {
      toggleLike(button.dataset.like);
      renderScreen();
    });
  });

  scope.querySelectorAll('[data-save]').forEach((button) => {
    button.addEventListener('click', () => {
      toggleSave(button.dataset.save);
      renderScreen();
    });
  });

  scope.querySelectorAll('[data-comment]').forEach((button) => {
    button.addEventListener('click', () => {
      uiState.commentPostId = button.dataset.comment;
      renderModals();
    });
  });

  scope.querySelectorAll('[data-post-tag]').forEach((button) => {
    button.addEventListener('click', () => {
      openSearchForTag(button.dataset.postTag);
    });
  });

  scope.querySelectorAll('[data-open-preview]').forEach((button) => {
    button.addEventListener('click', (event) => {
      if (Date.now() < uiState.openingTapGuardUntil) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      const postId = button.dataset.openPreview;
      addImpression(postId);
      openPostDetail(postId);
    });
  });

  scope.querySelectorAll('[data-open-author]').forEach((button) => {
    button.addEventListener('click', () => {
      openProfile(button.dataset.openAuthor);
    });
  });

  scope.querySelectorAll('[data-post-owner-menu]').forEach((button) => {
    button.addEventListener('click', () => {
      const card = button.closest('[data-post-detail-card]');
      const menu = card?.querySelector('[data-post-owner-actions]');
      if (!menu) return;
      menu.hidden = !menu.hidden;
    });
  });

  scope.querySelectorAll('[data-edit-post]').forEach((button) => {
    button.addEventListener('click', () => {
      openPostEdit(button.dataset.editPost);
    });
  });

  if (uiState.screen === 'post' && uiState.postDetailShouldScroll) {
    uiState.postDetailShouldScroll = false;
    requestAnimationFrame(() => {
      document.querySelector('[data-post-detail-active]')?.scrollIntoView({ block: 'start' });
    });
  }
}

function bindDragScrollSurface(element, axis = 'y') {
  if (!element || element.dataset.dragScrollBound === 'true') return;
  element.dataset.dragScrollBound = 'true';
  let dragState = null;
  let suppressClick = false;

  element.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    dragState = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: element.scrollLeft,
      scrollTop: element.scrollTop,
      moved: false,
    };
    element.setPointerCapture?.(event.pointerId);
  });

  element.addEventListener('pointermove', (event) => {
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - dragState.startX;
    const deltaY = event.clientY - dragState.startY;
    const primaryDelta = axis === 'x' ? deltaX : deltaY;
    if (!dragState.moved && Math.abs(primaryDelta) < 4) return;
    dragState.moved = true;
    event.preventDefault();
    if (axis === 'x') {
      element.scrollLeft = dragState.scrollLeft - deltaX;
    } else {
      element.scrollTop = dragState.scrollTop - deltaY;
    }
  });

  const finishDrag = (event) => {
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    suppressClick = dragState.moved;
    dragState = null;
    element.releasePointerCapture?.(event.pointerId);
    if (suppressClick) {
      window.setTimeout(() => {
        suppressClick = false;
      }, 180);
    }
  };

  element.addEventListener('pointerup', finishDrag);
  element.addEventListener('pointercancel', finishDrag);
  element.addEventListener('click', (event) => {
    if (!suppressClick) return;
    event.preventDefault();
    event.stopPropagation();
  }, true);
}

function bindScreenScrollSurfaces() {
  [
    document.querySelector('.timeline-feed'),
    document.querySelector('.screen-area--profile'),
    document.querySelector('.screen-area--search'),
    document.querySelector('.screen-area--post'),
  ].forEach((element) => bindDragScrollSurface(element, 'y'));
}

function bindHomeEvents() {
  const homeRoot = document.querySelector('.orbit-home');
  const syncHomeCoreState = () => {
    if (!homeRoot) return;
    homeRoot.classList.remove('orbit-home--default', 'orbit-home--collapsing', 'orbit-home--sheep');
    homeRoot.classList.add(`orbit-home--${uiState.homeCoreState}`);
  };

  document.querySelectorAll('[data-home-theme-toggle]').forEach((button) => {
    button.hidden = true;
  });

  document.querySelectorAll('[data-home-core-toggle]').forEach((button) => {
    button.addEventListener('click', () => {
      if (uiState.homeCoreState !== 'default') return;
      const now = Date.now();
      uiState.homeCoreTapTimestamps = [...uiState.homeCoreTapTimestamps.filter((time) => now - time < 900), now];
      if (uiState.homeCoreTapTimestamps.length < 3) return;
      uiState.homeCoreTapTimestamps = [];
      uiState.homeCoreState = 'collapsing';
      syncHomeCoreState();
      clearHomeCoreTransition();
      homeCoreTransitionTimer = window.setTimeout(() => {
        uiState.homeCoreState = 'sheep';
        syncHomeCoreState();
      }, 620);
    });
  });

  document.querySelectorAll('[data-home-sheep-toggle]').forEach((button) => {
    button.addEventListener('click', () => {
      if (uiState.homeCoreState !== 'sheep') return;
      resetHomeCoreState();
      syncHomeCoreState();
    });
  });
}

function bindTimelineEvents() {
  bindPostInteractions(document.getElementById('screenArea'));
  bindScreenScrollSurfaces();

  document.querySelectorAll('[data-open-date-add]').forEach((button) => {
    button.addEventListener('click', () => {
      uiState.coupleView = 'dateAdd';
      uiState.dateAddStep = 1;
      uiState.dateAddDraft = {
        date: uiState.selectedCalendarDate || getTodayDateKey(),
      };
      uiState.screen = 'search';
      render();
    });
  });

  document.querySelectorAll('[data-open-selected-date-memories]').forEach((button) => {
    button.addEventListener('click', () => {
      uiState.recordDate = button.dataset.selectedDateMemoriesDate || uiState.selectedCalendarDate || getTodayDateKey();
      uiState.recordStage = 'home';
      uiState.recordDraft = null;
      uiState.recordEditingId = null;
      uiState.recordSelectedIds = [];
      uiState.recordBackgroundId = DEFAULT_RECORD_BACKGROUND;
      uiState.recordPhotoFeather = true;
      uiState.screen = 'record';
      render();
    });
  });

  document.querySelectorAll('[data-home-calendar-month]').forEach((button) => {
    button.addEventListener('click', () => {
      const delta = Number(button.dataset.homeCalendarMonth) || 0;
      uiState.selectedCalendarDate = shiftDateKeyMonth(uiState.selectedCalendarDate || getTodayDateKey(), delta);
      renderScreen();
    });
  });

  document.querySelectorAll('[data-home-calendar-date]').forEach((button) => {
    button.addEventListener('click', () => {
      uiState.selectedCalendarDate = button.dataset.homeCalendarDate || getTodayDateKey();
      renderScreen();
    });
  });

  const viewport = document.querySelector('[data-timeline-pan-viewport]');
  const surface = document.querySelector('[data-timeline-pan-surface]');
  if (viewport && surface) {
    const clampPan = (nextX, nextY) => {
      const minX = Math.min(0, viewport.clientWidth - surface.scrollWidth);
      const minY = Math.min(0, viewport.clientHeight - surface.scrollHeight);
      return {
        x: Math.max(minX, Math.min(0, nextX)),
        y: Math.max(minY, Math.min(0, nextY)),
      };
    };

    const applyPan = (nextX, nextY) => {
      const clamped = clampPan(nextX, nextY);
      uiState.timelinePan = clamped;
      surface.style.transform = `translate(${clamped.x}px, ${clamped.y}px)`;
    };

    applyPan(uiState.timelinePan?.x ?? -360, uiState.timelinePan?.y ?? -220);

    let dragState = null;

    surface.addEventListener('pointerdown', (event) => {
      dragState = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: uiState.timelinePan?.x ?? -360,
        originY: uiState.timelinePan?.y ?? -220,
        moved: false,
      };
      viewport.classList.add('is-dragging');
      surface.setPointerCapture?.(event.pointerId);
    });

    surface.addEventListener('pointermove', (event) => {
      if (!dragState || dragState.pointerId !== event.pointerId) return;
      const deltaX = event.clientX - dragState.startX;
      const deltaY = event.clientY - dragState.startY;
      if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
        dragState.moved = true;
        event.preventDefault();
      }
      applyPan(dragState.originX + deltaX, dragState.originY + deltaY);
    });

    const finishDrag = (event) => {
      if (!dragState || dragState.pointerId !== event.pointerId) return;
      viewport.classList.remove('is-dragging');
      if (dragState.moved) {
        uiState.openingTapGuardUntil = Date.now() + 180;
      }
      dragState = null;
      surface.releasePointerCapture?.(event.pointerId);
    };

    surface.addEventListener('pointerup', finishDrag);
    surface.addEventListener('pointercancel', finishDrag);
  }

  document.querySelectorAll('[data-timeline-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      uiState.timelineTab = button.dataset.timelineTab || 'recommended';
      renderScreen();
    });
  });
}

function bindSearchEvents() {
  bindPostInteractions(document.getElementById('screenArea'));
  bindScreenScrollSurfaces();

  const ensureDateAddDraft = () => ({
    date: uiState.selectedCalendarDate || getTodayDateKey(),
    timeOfDay: 'noon',
    startTime: '11:00',
    endTime: '13:30',
    type: 'cafe',
    title: '',
    place: '',
    note: '',
    ...(uiState.dateAddDraft || {}),
  });

  const updateDateAddDraft = (updates = {}) => {
    uiState.dateAddDraft = {
      ...ensureDateAddDraft(),
      ...updates,
    };
  };

  document.querySelectorAll('[data-couple-answer]').forEach((button) => {
    button.addEventListener('click', () => {
      updateCoupleAnswer('you', button.dataset.coupleAnswer, button.dataset.coupleAnswerValue);
      const nextState = getState();
      const answeredCount = Object.values(nextState.couple?.answers?.you || {}).filter(Boolean).length;
      if (answeredCount >= 3) {
        uiState.coupleView = 'recommend';
      }
      renderScreen();
    });
  });

  document.querySelectorAll('[data-couple-view]').forEach((button) => {
    button.addEventListener('click', () => {
      uiState.coupleView = button.dataset.coupleView || 'calendar';
      if (uiState.coupleView === 'dateAdd') {
        uiState.dateAddStep = Number(button.dataset.dateAddStep) || uiState.dateAddStep || 1;
        updateDateAddDraft({ date: uiState.selectedCalendarDate || ensureDateAddDraft().date });
      }
      renderScreen();
    });
  });

  document.querySelectorAll('[data-date-list-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      uiState.dateListTab = button.dataset.dateListTab === 'past' ? 'past' : 'upcoming';
      renderScreen();
    });
  });

  document.querySelectorAll('[data-list-back]').forEach((button) => {
    button.addEventListener('click', () => {
      uiState.coupleView = 'calendar';
      uiState.screen = 'profile';
      render();
    });
  });

  document.querySelectorAll('[data-calendar-date]').forEach((button) => {
    button.addEventListener('click', () => {
      uiState.selectedCalendarDate = button.dataset.calendarDate || getTodayDateKey();
      updateDateAddDraft({ date: uiState.selectedCalendarDate });
      uiState.coupleView = 'calendar';
      renderScreen();
    });
  });

  document.querySelectorAll('[data-home-calendar-target]').forEach((button) => {
    button.addEventListener('click', () => {
      uiState.selectedCalendarDate = button.dataset.homeCalendarTarget || getTodayDateKey();
      uiState.coupleView = 'calendar';
      uiState.screen = 'home';
      render();
    });
  });

  document.querySelectorAll('[data-calendar-month]').forEach((button) => {
    button.addEventListener('click', () => {
      const delta = Number(button.dataset.calendarMonth) || 0;
      uiState.selectedCalendarDate = shiftDateKeyMonth(uiState.selectedCalendarDate || getTodayDateKey(), delta);
      updateDateAddDraft({ date: uiState.selectedCalendarDate });
      uiState.coupleView = 'calendar';
      renderScreen();
    });
  });

  document.querySelectorAll('[data-date-add-date]').forEach((button) => {
    button.addEventListener('click', () => {
      uiState.selectedCalendarDate = button.dataset.dateAddDate || getTodayDateKey();
      updateDateAddDraft({ date: uiState.selectedCalendarDate });
      renderScreen();
    });
  });

  document.querySelectorAll('[data-date-add-month]').forEach((button) => {
    button.addEventListener('click', () => {
      const draft = ensureDateAddDraft();
      const delta = Number(button.dataset.dateAddMonth) || 0;
      const nextDate = shiftDateKeyMonth(draft.date || uiState.selectedCalendarDate || getTodayDateKey(), delta);
      uiState.selectedCalendarDate = nextDate;
      updateDateAddDraft({ date: nextDate });
      uiState.coupleView = 'dateAdd';
      renderScreen();
    });
  });

  document.querySelectorAll('[data-date-add-timeofday]').forEach((button) => {
    button.addEventListener('click', () => {
      updateDateAddDraft({ timeOfDay: button.dataset.dateAddTimeofday || 'noon' });
      renderScreen();
    });
  });

  document.querySelectorAll('[data-date-add-type]').forEach((button) => {
    button.addEventListener('click', () => {
      updateDateAddDraft({ type: button.dataset.dateAddType || 'cafe' });
      renderScreen();
    });
  });

  document.querySelectorAll('[data-date-add-next]').forEach((button) => {
    button.addEventListener('click', () => {
      const form = button.closest('form');
      if (form) {
        const formData = new FormData(form);
        updateDateAddDraft({
          startTime: String(formData.get('startTime') || ensureDateAddDraft().startTime),
          endTime: String(formData.get('endTime') || ensureDateAddDraft().endTime),
          title: String(formData.get('title') || ensureDateAddDraft().title).trim(),
          place: String(formData.get('place') || ensureDateAddDraft().place).trim(),
          note: String(formData.get('note') || ensureDateAddDraft().note).trim(),
        });
      }
      uiState.dateAddStep = Math.min(3, (Number(uiState.dateAddStep) || 1) + 1);
      uiState.coupleView = 'dateAdd';
      renderScreen();
    });
  });

  document.querySelectorAll('[data-date-add-back]').forEach((button) => {
    button.addEventListener('click', () => {
      uiState.dateAddStep = Math.max(1, (Number(uiState.dateAddStep) || 1) - 1);
      uiState.coupleView = 'dateAdd';
      renderScreen();
    });
  });

  document.querySelectorAll('[data-date-add-cancel]').forEach((button) => {
    button.addEventListener('click', () => {
      uiState.coupleView = 'calendar';
      uiState.dateAddStep = 1;
      uiState.dateAddDraft = null;
      uiState.screen = 'home';
      render();
    });
  });

  document.querySelectorAll('[data-date-add-form]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const draft = ensureDateAddDraft();
      updateDateAddDraft({
        title: String(formData.get('title') || draft.title).trim(),
        place: String(formData.get('place') || draft.place).trim(),
        note: String(formData.get('note') || draft.note).trim(),
      });
      const finalDraft = ensureDateAddDraft();
      const entry = addCoupleCalendarEntry({
        planId: '',
        title: finalDraft.title || 'ふたりのデート',
        date: finalDraft.date,
        time: `${finalDraft.startTime}〜${finalDraft.endTime}`,
        place: finalDraft.place,
        note: finalDraft.note,
        tags: [finalDraft.type, finalDraft.timeOfDay].filter(Boolean),
      });
      uiState.selectedCalendarDate = entry.date;
      uiState.coupleView = 'calendar';
      uiState.dateAddStep = 1;
      uiState.dateAddDraft = null;
      renderScreen();
    });
  });

  document.querySelectorAll('[data-add-date-plan]').forEach((button) => {
    button.addEventListener('click', () => {
      const plan = DATE_PLANS.find((item) => item.id === button.dataset.addDatePlan);
      if (!plan) return;
      addCoupleCalendarEntry({
        planId: plan.id,
        title: plan.title,
        date: plan.date,
        time: plan.time,
        place: plan.place,
        note: plan.copy,
        image: plan.image,
        tags: plan.tags,
      });
      uiState.screen = 'home';
      uiState.coupleView = 'calendar';
      render();
    });
  });

  document.querySelectorAll('[data-reset-couple-answers]').forEach((button) => {
    button.addEventListener('click', () => {
      resetCoupleAnswers();
      uiState.coupleView = 'question';
      renderScreen();
    });
  });

  document.querySelectorAll('[data-toggle-couple-todo]').forEach((button) => {
    button.addEventListener('click', () => {
      toggleCoupleTodo(button.dataset.toggleCoupleTodo);
      renderScreen();
    });
  });

  document.querySelectorAll('[data-delete-date-entry]').forEach((button) => {
    button.addEventListener('click', () => {
      deleteCoupleCalendarEntry(button.dataset.deleteDateEntry);
      renderScreen();
    });
  });

  document.querySelectorAll('[data-delete-page-entry]').forEach((button) => {
    button.addEventListener('click', () => {
      deletePost(button.dataset.deletePageEntry);
      renderScreen();
    });
  });

  document.querySelectorAll('[data-delete-draft-entry]').forEach((button) => {
    button.addEventListener('click', () => {
      deleteDraft(button.dataset.deleteDraftEntry);
      renderScreen();
    });
  });

  document.querySelectorAll('[data-delete-todo-entry]').forEach((button) => {
    button.addEventListener('click', () => {
      deleteCoupleTodo(button.dataset.deleteTodoEntry);
      renderScreen();
    });
  });

  document.querySelectorAll('[data-open-todo-input]').forEach((button) => {
    button.addEventListener('click', () => {
      uiState.todoInputOpen = true;
      renderScreen();
      document.querySelector('[name="todoTitle"]')?.focus();
    });
  });

  document.querySelectorAll('[data-todo-input-cancel]').forEach((button) => {
    button.addEventListener('click', () => {
      uiState.todoInputOpen = false;
      renderScreen();
    });
  });

  document.querySelectorAll('[data-todo-form]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const todo = addCoupleTodo({
        title: formData.get('todoTitle'),
      });
      if (!todo) return;
      uiState.todoInputOpen = false;
      renderScreen();
    });
  });
}
function bindScreenNavigationEvents() {
  document.querySelectorAll('[data-home-nav]').forEach((button) => {
    button.addEventListener('click', () => {
      navigate(button.dataset.homeNav);
    });
  });

  document.querySelectorAll('[data-close-profile]').forEach((button) => {
    button.addEventListener('click', () => {
      closeProfile();
    });
  });

  document.querySelectorAll('[data-close-compose]').forEach((button) => {
    button.addEventListener('click', () => {
      closeCompose();
    });
  });
}

function normalizeInviteCode(value = '') {
  return String(value)
    .replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .replace(/\D/g, '')
    .slice(0, 4);
}

function bindInviteEvents() {
  const form = document.querySelector('[data-invite-form]');
  const input = document.querySelector('[data-invite-code]');
  const error = document.querySelector('[data-invite-error]');
  if (!form || !input) return;

  const unlock = () => {
    uiState.openingTapGuardUntil = Date.now() + 700;
    navigate('home');
  };

  input.addEventListener('input', () => {
    const normalized = normalizeInviteCode(input.value);
    input.value = normalized;
    if (error) error.hidden = true;
    if (normalized === '0000') {
      unlock();
    }
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const normalized = normalizeInviteCode(input.value);
    input.value = normalized;
    if (normalized === '0000') {
      unlock();
      return;
    }
    if (error) error.hidden = false;
    input.focus();
    input.select();
  });

  requestAnimationFrame(() => input.focus());
}

function buildComposeCaption(values) {
  if (values.templateId === 'page8' && Array.isArray(values.customLayout?.pretextBoxes)) {
    return values.customLayout.pretextBoxes
      .filter((box) => box.kind === 'title' || box.kind === 'body')
      .map((box) => String(box.data?.text || '').trim())
      .filter(Boolean)
      .join(' / ')
      .slice(0, 120);
  }
  if (values.templateId === 'page8' && Array.isArray(values.customLayout?.textBoxes)) {
    return values.customLayout.textBoxes
      .map((box) => String(box.text || '').trim())
      .filter(Boolean)
      .join(' / ')
      .slice(0, 120);
  }
  return [values.headline, values.subhead, values.text, values.text2, values.text3, values.intro, values.body]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(' / ')
    .slice(0, 120);
}

function addWrappedText(ctx, text, options) {
  const {
    x,
    y,
    maxWidth,
    lineHeight,
    maxLines,
    align = 'left',
    exclusions = [],
    letterSpacing = 0,
  } = options;

  const baseLeft = align === 'center' ? x - (maxWidth / 2) : x;
  const baseRight = baseLeft + maxWidth;
  const lines = [];
  const paragraphs = String(text || '').split('\n');

  function carveSlots(blocked) {
    let slots = [{ left: baseLeft, right: baseRight }];
    blocked.forEach((interval) => {
      const next = [];
      slots.forEach((slot) => {
        if (interval.right <= slot.left || interval.left >= slot.right) {
          next.push(slot);
          return;
        }
        if (interval.left > slot.left) {
          next.push({ left: slot.left, right: interval.left });
        }
        if (interval.right < slot.right) {
          next.push({ left: interval.right, right: slot.right });
        }
      });
      slots = next;
    });
    return slots.filter((slot) => slot.right - slot.left > 8);
  }

  function lineSlots(lineTop) {
    const lineBottom = lineTop + lineHeight;
    const blocked = exclusions
      .filter((rect) => (rect.y + rect.height) > lineTop && rect.y < lineBottom)
      .map((rect) => ({
        left: Math.max(baseLeft, rect.x),
        right: Math.min(baseRight, rect.x + rect.width),
      }))
      .sort((a, b) => a.left - b.left);
    return carveSlots(blocked);
  }

  function chooseSlot(slots) {
    if (!slots.length) return null;
    if (align === 'right') {
      return [...slots].sort((a, b) => b.right - a.right)[0];
    }
    if (align === 'center') {
      const center = (baseLeft + baseRight) / 2;
      return [...slots].sort((a, b) => {
        const aCenter = (a.left + a.right) / 2;
        const bCenter = (b.left + b.right) / 2;
        return Math.abs(aCenter - center) - Math.abs(bCenter - center);
      })[0];
    }
    return [...slots].sort((a, b) => a.left - b.left)[0];
  }

  function measureLineText(value) {
    const textValue = String(value || '');
    const baseWidth = ctx.measureText(textValue).width;
    return baseWidth + Math.max(0, textValue.length - 1) * Math.max(0, Number(letterSpacing) || 0);
  }

  function drawLineText(value, drawX, drawY) {
    const textValue = String(value || '');
    const spacing = Math.max(0, Number(letterSpacing) || 0);
    if (!spacing || textValue.length <= 1) {
      ctx.fillText(textValue, drawX, drawY);
      return;
    }
    let cursorX = drawX;
    Array.from(textValue).forEach((char) => {
      ctx.fillText(char, cursorX, drawY);
      cursorX += ctx.measureText(char).width + spacing;
    });
  }

  function fitUnitsIntoWidth(units, startIndex, separator, width) {
    let current = '';
    let index = startIndex;
    while (index < units.length) {
      const candidate = current ? `${current}${separator}${units[index]}` : units[index];
      if (measureLineText(candidate) <= width || !current) {
        current = candidate;
        index += 1;
        continue;
      }
      break;
    }
    return {
      text: current,
      nextIndex: index === startIndex ? Math.min(units.length, startIndex + 1) : index,
    };
  }

  paragraphs.forEach((paragraph) => {
    const hasSpaces = /\s/.test(paragraph.trim());
    const units = hasSpaces
      ? paragraph.split(/\s+/).filter(Boolean)
      : Array.from(paragraph);
    const separator = hasSpaces ? ' ' : '';

    if (!units.length) {
      const lineIndex = lines.length;
      if (lineIndex < maxLines) {
        lines.push({ text: '', x: baseLeft });
      }
      return;
    }

    let cursor = 0;
    while (cursor < units.length) {
      const lineIndex = lines.length;
      if (lineIndex >= maxLines) break;
      const lineTop = y + (lineIndex * lineHeight);
      const slot = chooseSlot(lineSlots(lineTop)) || { left: baseLeft, right: baseRight };
      const fitted = fitUnitsIntoWidth(units, cursor, separator, Math.max(8, slot.right - slot.left));
      const lineWidth = measureLineText(fitted.text);
      const lineX = align === 'center'
        ? slot.left + Math.max(0, ((slot.right - slot.left - lineWidth) / 2))
        : align === 'right'
          ? slot.right - lineWidth
          : slot.left;
      lines.push({
        text: fitted.text,
        x: lineX,
      });
      cursor = fitted.nextIndex;
    }
  });

  lines.slice(0, maxLines).forEach((line, index) => {
    drawLineText(line.text, line.x, y + index * lineHeight);
  });
}

function clipRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function buildComposeSlotPath(ctx, rect) {
  if (rect.shape === 'arch-right') {
    const rightCenterX = rect.x + (rect.width * 0.42);
    const radiusX = rect.width * 0.58;
    const radiusY = rect.height / 2;
    ctx.beginPath();
    ctx.moveTo(rect.x, rect.y);
    ctx.lineTo(rightCenterX, rect.y);
    ctx.ellipse(
      rightCenterX,
      rect.y + radiusY,
      radiusX,
      radiusY,
      0,
      -Math.PI / 2,
      Math.PI / 2,
    );
    ctx.lineTo(rect.x, rect.y + rect.height);
    ctx.closePath();
    return;
  }
  clipRoundedRect(ctx, rect.x, rect.y, rect.width, rect.height, rect.radius);
}

async function drawFileCover(ctx, file, rect, position = { x: 0.5, y: 0.5 }) {
  if (!file) return;

  const bitmap = typeof file === 'string'
    ? await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = file;
    })
    : await createImageBitmap(file);
  const imageRatio = bitmap.width / bitmap.height;
  const rectRatio = rect.width / rect.height;
  let sx = 0;
  let sy = 0;
  let sw = bitmap.width;
  let sh = bitmap.height;
  const zoom = Math.max(1, Number(position?.zoom) || 1);
  const hasDirectCrop = Number.isFinite(position?.cropX) || Number.isFinite(position?.cropY);
  let focusX = Math.min(1, Math.max(0, position.x ?? 0.5));
  let focusY = Math.min(1, Math.max(0, position.y ?? 0.5));

  if (hasDirectCrop) {
    const baseRenderedWidth = imageRatio > rectRatio ? rect.height * imageRatio : rect.width;
    const baseRenderedHeight = imageRatio > rectRatio ? rect.height : rect.width / imageRatio;
    const overflowX = Math.max(0, (baseRenderedWidth * zoom) - rect.width);
    const overflowY = Math.max(0, (baseRenderedHeight * zoom) - rect.height);
    focusX = overflowX ? Math.min(1, Math.max(0, 0.5 - ((Number(position?.cropX) || 0) / overflowX))) : 0.5;
    focusY = overflowY ? Math.min(1, Math.max(0, 0.5 - ((Number(position?.cropY) || 0) / overflowY))) : 0.5;
  }

  if (imageRatio > rectRatio) {
    sw = Math.max(1, (bitmap.height * rectRatio) / zoom);
    sx = (bitmap.width - sw) * focusX;
  } else {
    sh = Math.max(1, (bitmap.width / rectRatio) / zoom);
    sy = (bitmap.height - sh) * focusY;
  }

  ctx.save();
  buildComposeSlotPath(ctx, rect);
  ctx.clip();
  ctx.drawImage(bitmap, sx, sy, sw, sh, rect.x, rect.y, rect.width, rect.height);
  ctx.restore();
  bitmap.close?.();
}

function drawSlotPlaceholder(ctx, rect) {
  ctx.save();
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(34, 28, 25, 0.88)';
  buildComposeSlotPath(ctx, rect);
  ctx.stroke();

  const radius = Math.min(rect.width, rect.height) * 0.18;
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - radius * 0.42, cy);
  ctx.lineTo(cx + radius * 0.42, cy);
  ctx.moveTo(cx, cy - radius * 0.42);
  ctx.lineTo(cx, cy + radius * 0.42);
  ctx.stroke();
  ctx.restore();
}

async function renderComposeTemplate(values, files, extra = {}) {
  await waitForComposeFonts(values);
  const designWidth = 1240;
  const designHeight = 1754;
  const width = 2480;
  const height = 3508;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return '';
  }

  const scale = width / designWidth;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.scale(scale, scale);
  const template = getComposeTemplateById(values.templateId);
  await template.render(ctx, values, files, {
    addWrappedText,
    clipRoundedRect,
    drawFileCover,
    drawSlotPlaceholder,
    defaults: composePreviewDefaults,
    getTextFontStack(fieldKey, fallbackStack) {
      return fallbackStack;
    },
    getTextScale(fieldKey) {
      const fixedTextRenderScale = Number.isFinite(Number(extra.fixedTextRenderScale))
        ? Math.max(1, Number(extra.fixedTextRenderScale))
        : 1;
      const textScale = createComposeTextStyleValue(values.textStyles?.[fieldKey]).scale;
      return textScale * textScale * fixedTextRenderScale;
    },
    getTextBackgroundColor(fieldKey) {
      return createComposeTextStyleValue(values.textStyles?.[fieldKey]).backgroundColor || '';
    },
    page8Files: extra.page8Files || {},
  });

  return canvas.toDataURL('image/png');
}

function composeDataUrlToBlob(dataUrl) {
  const [meta, data] = String(dataUrl || '').split(',');
  if (!meta || !data) return null;
  const mime = meta.match(/^data:([^;]+);base64$/)?.[1] || 'image/png';
  const binary = window.atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mime });
}

function composeDataUrlToBlobUrl(dataUrl) {
  const blob = composeDataUrlToBlob(dataUrl);
  return blob ? URL.createObjectURL(blob) : '';
}

async function resourceUrlToDataUrl(url) {
  if (!url || url.startsWith('data:')) return url;
  try {
    const absoluteUrl = new URL(url, document.baseURI).href;
    const response = await fetch(absoluteUrl);
    if (!response.ok) return url;
    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || url));
      reader.onerror = () => resolve(url);
      reader.readAsDataURL(blob);
    });
  } catch {
    return url;
  }
}

async function inlineCssUrls(cssText = '') {
  const source = String(cssText || '');
  const matches = [...source.matchAll(/url\((["']?)(.*?)\1\)/g)]
    .map((match) => match[2])
    .filter(Boolean);
  if (!matches.length) return source;

  let nextCss = source;
  const uniqueUrls = [...new Set(matches)];
  for (const rawUrl of uniqueUrls) {
    const trimmedUrl = rawUrl.trim();
    if (!trimmedUrl || trimmedUrl.startsWith('data:')) continue;
    const dataUrl = await resourceUrlToDataUrl(trimmedUrl);
    const replacement = dataUrl && dataUrl.startsWith('data:')
      ? `url(${dataUrl})`
      : 'none';
    nextCss = nextCss.replaceAll(`url("${rawUrl}")`, replacement);
    nextCss = nextCss.replaceAll(`url('${rawUrl}')`, replacement);
    nextCss = nextCss.replaceAll(`url(${rawUrl})`, replacement);
  }
  return nextCss;
}

async function inlineCloneResources(element) {
  if (!(element instanceof Element)) return;
  if (element instanceof HTMLImageElement && element.src) {
    const dataUrl = await resourceUrlToDataUrl(element.src);
    if (dataUrl?.startsWith('data:')) {
      element.src = dataUrl;
    } else {
      element.removeAttribute('src');
    }
  }
  const styleAttribute = element.getAttribute('style');
  if (styleAttribute) {
    element.setAttribute('style', await inlineCssUrls(styleAttribute));
  }
  await Promise.all(Array.from(element.children).map((child) => inlineCloneResources(child)));
}

function sanitizeSerializedCapture(serialized) {
  const normalizeSerializedUrl = (value) => String(value || '')
    .trim()
    .replace(/^['"]|['"]$/g, '')
    .replace(/^&quot;|&quot;$/g, '')
    .replace(/^&#34;|&#34;$/g, '')
    .replace(/^&#39;|&#39;$/g, '');

  return String(serialized || '')
    .replace(/url\((.*?)\)/g, (match, value) => {
      const normalized = normalizeSerializedUrl(value);
      return normalized.startsWith('data:') ? match : 'none';
    })
    .replace(/\s(?:src|href|xlink:href)=(["'])(.*?)\1/g, (match, quote, value) => {
      const normalized = normalizeSerializedUrl(value);
      return normalized.startsWith('data:') || normalized.startsWith('#') ? match : '';
    });
}

function inlineComputedStyles(source, target) {
  if (!(source instanceof Element) || !(target instanceof Element)) return;
  const computed = window.getComputedStyle(source);
  const cssText = Array.from(computed)
    .map((property) => `${property}:${computed.getPropertyValue(property)};`)
    .join('');
  target.setAttribute('style', `${cssText}${target.getAttribute('style') || ''}`);
  Array.from(source.children).forEach((child, index) => {
    inlineComputedStyles(child, target.children[index]);
  });
}

function removeComposeCaptureChrome(clone) {
  clone.querySelectorAll('.compose-editable').forEach((element) => {
    const authoredBackground = normalizeComposeTextBackgroundColor(element.dataset.composeTextBackgroundColor);
    element.classList.remove('is-active');
    element.style.boxShadow = 'none';
    element.style.background = authoredBackground || 'transparent';
    element.style.outline = '0';
    element.style.caretColor = 'transparent';
  });

  clone.querySelectorAll('.compose-custom-item').forEach((element) => {
    element.classList.remove('is-selected');
    element.style.boxShadow = 'none';
    element.style.outline = '0';
  });

  clone.querySelectorAll([
    '.compose-custom-item__drag',
    '.compose-custom-item__remove',
    '.compose-custom-item__resize',
    '.compose-fixed-resize',
  ].join(',')).forEach((element) => {
    element.remove();
  });
}

async function prepareComposeCaptureClone(sourceFrame) {
  const clone = sourceFrame.cloneNode(true);
  inlineComputedStyles(sourceFrame, clone);
  removeComposeCaptureChrome(clone);
  clone.querySelectorAll('.record-template-slot--title').forEach((element) => {
    if (!(element instanceof HTMLInputElement)) return;
    const titleText = document.createElement('div');
    titleText.className = element.className;
    titleText.textContent = element.value || element.getAttribute('value') || '';
    titleText.setAttribute('style', element.getAttribute('style') || '');
    element.replaceWith(titleText);
  });
  clone.querySelectorAll([
    'input',
    'button',
    '.compose-fixed-resize',
    '.compose-slot__remove',
    '.compose-slot__placeholder',
    '[data-compose-shape-mask][hidden]',
  ].join(',')).forEach((element) => {
    element.remove();
  });
  clone.querySelectorAll('[contenteditable]').forEach((element) => {
    element.removeAttribute('contenteditable');
  });
  clone.querySelectorAll('[hidden]').forEach((element) => {
    element.remove();
  });
  await inlineCloneResources(clone);
  return clone;
}

async function captureComposeFrameToDataUrl(sourceFrame) {
  if (!sourceFrame) return '';
  if (document.fonts?.ready) {
    await Promise.race([
      document.fonts.ready,
      new Promise((resolve) => window.setTimeout(resolve, 1000)),
    ]);
  }
  const frameRect = sourceFrame.getBoundingClientRect();
  if (!frameRect.width || !frameRect.height) return '';
  const width = 2480;
  const height = Math.round(width * (frameRect.height / frameRect.width));
  const clone = await prepareComposeCaptureClone(sourceFrame);
  const sheetElement = sourceFrame.closest('.compose-sheet');
  const sheetBackground = sheetElement ? window.getComputedStyle(sheetElement).backgroundColor : '';
  if (sheetBackground && sheetBackground !== 'rgba(0, 0, 0, 0)' && sheetBackground !== 'transparent') {
    clone.style.backgroundColor = sheetBackground;
  }
  clone.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
  clone.style.width = `${frameRect.width}px`;
  clone.style.height = `${frameRect.height}px`;

  const serialized = sanitizeSerializedCapture(new XMLSerializer().serializeToString(clone));
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${frameRect.width}" height="${frameRect.height}" viewBox="0 0 ${frameRect.width} ${frameRect.height}">
      <foreignObject width="100%" height="100%">${serialized}</foreignObject>
    </svg>
  `;
  const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  const image = new Image();
  image.crossOrigin = 'anonymous';
  const loaded = new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = reject;
  });
  image.src = svgUrl;
  await loaded;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL('image/png');
}

function bindComposeEvents() {
  const composePage = document.querySelector('.page--compose');
  if (!composePage) return;
  const composeStage = composePage.dataset.composeStage || 'select';
  const form = document.getElementById('composeForm');
  const composeRoot = form || composePage;
  const composeSheet = document.getElementById('composeSheet');
  const composeFrame = composeSheet?.querySelector('.compose-sheet__frame') || null;
  const composePreview = document.querySelector('.compose-preview--editor');
  const customCanvas = composeSheet?.querySelector('[data-custom-canvas]') || null;
  const composeDraft = uiState.composeWorkingDraft || getActivePost(uiState.composeEditingPostId)?.composeData || null;
  const page8DraftValues = {
    ...composePreviewDefaults,
    ...(composeDraft || {}),
  };
  const previewUrls = {
    imageInputPrimary: typeof composeDraft?.standardFiles?.primary?.file === 'string' ? composeDraft.standardFiles.primary.file : '',
    imageInputSecondary: typeof composeDraft?.standardFiles?.secondary?.file === 'string' ? composeDraft.standardFiles.secondary.file : '',
    imageInputAccent: typeof composeDraft?.standardFiles?.accent?.file === 'string' ? composeDraft.standardFiles.accent.file : '',
    imageInputDetail: typeof composeDraft?.standardFiles?.detail?.file === 'string' ? composeDraft.standardFiles.detail.file : '',
  };
  const selectedFiles = {
    primary: createComposeFileState(composeDraft?.standardFiles?.primary),
    secondary: createComposeFileState(composeDraft?.standardFiles?.secondary),
    accent: createComposeFileState(composeDraft?.standardFiles?.accent),
    detail: createComposeFileState(composeDraft?.standardFiles?.detail),
  };
  const tagToggle = document.querySelector('[data-toggle-compose-tags]');
  const tagPanel = document.querySelector('[data-compose-tags]');
  const previewToggle = document.querySelector('[data-toggle-compose-preview]');
  const customTemplateControls = document.querySelector('[data-custom-template-controls]');
  const customInspector = document.querySelector('[data-custom-inspector]');
  const pretextComposeHost = document.querySelector('[data-compose-pretext-host]');
  const editables = Array.from(document.querySelectorAll('[data-editable]'));
  let fixedLayoutState = createComposeFixedLayoutState(
    composeDraft?.fixedLayout,
    composeDraft?.templateId || uiState.composeTemplateId || DEFAULT_COMPOSE_TEMPLATE,
  );
  const customLayoutState = {
    options: normalizePage8Options(composeDraft?.customLayout || {}),
    imageBoxes: normalizePage8ImageBoxes(composeDraft?.customLayout || {}),
    textBoxes: normalizePage8TextBoxes(composeDraft?.customLayout || {}, page8DraftValues),
    selectedId: null,
    imageMode: 'frame',
  };
  const customImageFiles = {};
  const editableKeyMap = {
    text: document.querySelector('[data-editable="text"]'),
    headline: document.querySelector('[data-editable="headline"]'),
    subhead: document.querySelector('[data-editable="subhead"]'),
    text2: document.querySelector('[data-editable="text2"]'),
    text3: document.querySelector('[data-editable="text3"]'),
    intro: document.querySelector('[data-editable="intro"]'),
    body: document.querySelector('[data-editable="body"]'),
    date: document.querySelector('[data-editable="date"]'),
    editor: document.querySelector('[data-editable="editor"]'),
  };
  const slotKeyMap = {
    primary: document.querySelector('[data-slot="imageInputPrimary"]'),
    secondary: document.querySelector('[data-slot="imageInputSecondary"]'),
    accent: document.querySelector('[data-slot="imageInputAccent"]'),
    detail: document.querySelector('[data-slot="imageInputDetail"]'),
  };
  const roughOverlay = composeSheet?.querySelector('[data-compose-rough-overlay]') || null;
  const shapeMasks = Array.from(composeSheet?.querySelectorAll('[data-compose-shape-mask]') || []);
  const textTray = document.querySelector('[data-compose-text-tray]');
  const textTrayBody = textTray?.querySelector('[data-compose-text-tray-body]') || null;
  const textTrayTarget = textTray?.querySelector('[data-compose-text-target]') || null;
  const textTraySizeValue = textTray?.querySelector('[data-compose-text-size-value]') || null;
  const textTraySizeInput = textTray?.querySelector('[data-compose-text-size]') || null;
  const textTraySizeStepButtons = Array.from(textTray?.querySelectorAll('[data-compose-text-size-step]') || []);
  const textTrayFontButtons = Array.from(textTray?.querySelectorAll('[data-compose-text-font]') || []);
  const textTrayAlignButtons = Array.from(textTray?.querySelectorAll('[data-compose-text-align]') || []);
  const textTrayBackgroundButtons = Array.from(textTray?.querySelectorAll('[data-compose-text-background]') || []);
  const textTrayResizeHandles = Array.from(textTray?.querySelectorAll('[data-compose-sheet-resize]') || []);
  const customToolsResizeHandles = Array.from(customTemplateControls?.querySelectorAll('[data-compose-sheet-resize]') || []);
  const composeHistoryButtons = Array.from(document.querySelectorAll('[data-compose-history]'));
  let activeFixedTextKey = null;
  let textTrayOpenLevel = 100;
  let textTrayDragState = null;
  let textTrayJustDragged = false;
  let textTrayHeight = null;
  let textTrayWidth = null;
  let textTrayOffset = 0;
  let textTrayDockSide = 'right';
  let customToolsResizeState = null;
  let customToolsHeight = null;
  let customToolsWidth = null;
  let customToolsDockSide = 'right';
  let pendingComposeDownloadUrl = '';
  let suppressComposeImageDirty = false;
  let suppressComposeHistory = false;
  let composeHistoryGestureActive = false;
  let savedTextSelectionRange = null;
  const composeUndoStack = [];
  const composeRedoStack = [];
  const COMPOSE_HISTORY_LIMIT = 80;

  const composeTextLabels = {
    text: 'Text',
    headline: 'Text',
    subhead: 'Subhead',
    text2: 'Text',
    text3: 'Text',
    intro: 'Notes',
    body: 'Body',
    date: 'Date',
    editor: 'Editor',
  };

  function serializeStandardFiles() {
    return {
      primary: createComposeFileState(selectedFiles.primary),
      secondary: createComposeFileState(selectedFiles.secondary),
      accent: createComposeFileState(selectedFiles.accent),
      detail: createComposeFileState(selectedFiles.detail),
    };
  }

  function markComposeImageDirty() {
    uiState.composePreparedImageDirty = true;
    uiState.composePreparedImageData = null;
  }

  function getComposeHistorySnapshot() {
    const currentTemplateId = composeSheet?.dataset.template
      || uiState.composeTemplateId
      || composeDraft?.templateId
      || DEFAULT_COMPOSE_TEMPLATE;
    const baseDraft = createComposeWorkingDraft({
      ...(uiState.composeWorkingDraft || composeDraft || {}),
      templateId: currentTemplateId,
      backgroundColor: '#ffffff',
      standardFiles: serializeStandardFiles(),
      fixedLayout: createComposeFixedLayoutState(fixedLayoutState, currentTemplateId),
      customLayout: currentTemplateId === 'page8'
        ? (activeComposeBridge?.getSerializedLayout?.() || customLayoutState)
        : (uiState.composeWorkingDraft || composeDraft || {}).customLayout,
    });
    return baseDraft;
  }

  function getComposeHistorySnapshotKey(snapshot) {
    return JSON.stringify(snapshot || {});
  }

  function syncComposeHistoryButtons() {
    composeHistoryButtons.forEach((button) => {
      const action = button.dataset.composeHistory;
      button.disabled = action === 'undo'
        ? composeUndoStack.length === 0
        : composeRedoStack.length === 0;
    });
  }

  function pushComposeHistoryCheckpoint() {
    if (suppressComposeHistory || composeStage !== 'edit') return;
    const snapshot = getComposeHistorySnapshot();
    const key = getComposeHistorySnapshotKey(snapshot);
    const previous = composeUndoStack[composeUndoStack.length - 1];
    if (previous?.key === key) return;
    composeUndoStack.push({ key, snapshot });
    if (composeUndoStack.length > COMPOSE_HISTORY_LIMIT) {
      composeUndoStack.shift();
    }
    composeRedoStack.length = 0;
    syncComposeHistoryButtons();
  }

  function isVisualComposePartial(partial = {}) {
    return Object.keys(partial).some((key) => !['fixedTags', 'freeTags'].includes(key));
  }

  function persistComposeDraft(partial = {}) {
    if (
      !suppressComposeImageDirty
      && !suppressComposeHistory
      && !composeHistoryGestureActive
      && composeStage === 'edit'
      && isVisualComposePartial(partial)
    ) {
      pushComposeHistoryCheckpoint();
    }
    if (!suppressComposeImageDirty && composeStage === 'edit' && isVisualComposePartial(partial)) {
      markComposeImageDirty();
    }
    const nextDraft = createComposeWorkingDraft({
      ...(uiState.composeWorkingDraft || composeDraft || {}),
      ...partial,
    });
    uiState.composeWorkingDraft = nextDraft;
    uiState.composeTemplateId = nextDraft.templateId;
    uiState.composeBackgroundColor = nextDraft.backgroundColor;
    return nextDraft;
  }

  function clearPendingComposeDownload() {
    const existingLink = composePage.querySelector('[data-download-compose-image]');
    existingLink?.remove();
    if (pendingComposeDownloadUrl) {
      URL.revokeObjectURL(pendingComposeDownloadUrl);
      pendingComposeDownloadUrl = '';
    }
  }

  function showComposeDownloadLink(saveButton, imageData) {
    clearPendingComposeDownload();
    const blobUrl = composeDataUrlToBlobUrl(imageData);
    if (!blobUrl) return;
    const stamp = new Date().toISOString().slice(0, 10).replaceAll('-', '');
    pendingComposeDownloadUrl = blobUrl;
    const downloadLink = document.createElement('a');
    downloadLink.className = 'button button--primary compose-download-image-button compose-download-image-button--header';
    downloadLink.href = blobUrl;
    downloadLink.download = `burn-page-${stamp}.png`;
    downloadLink.textContent = 'Download';
    downloadLink.dataset.downloadComposeImage = 'true';
    saveButton.insertAdjacentElement('afterend', downloadLink);
  }

  function persistEditableDraftValue(element) {
    if (!element || element.style.display === 'none') return;
    const fieldKey = element.dataset.editable;
    if (!fieldKey) return;
    const value = getEditableText(element).trim();
    const currentDraft = uiState.composeWorkingDraft || composeDraft || {};
    const richTexts = {
      ...(currentDraft.richTexts || {}),
      [fieldKey]: getEditableRichTextHtml(element),
    };
    const partial = { [fieldKey]: value, richTexts };
    if (fieldKey === 'text') {
      partial.headline = value;
      richTexts.headline = richTexts.text;
    }
    persistComposeDraft(partial);
  }

  function getComposeTextStyleValue(fieldKey) {
    return createComposeTextStyleValue(
      (uiState.composeWorkingDraft || composeDraft || {}).textStyles?.[fieldKey],
    );
  }

  function ensureFixedLayoutState(templateId) {
    if (fixedLayoutState.templateId !== templateId) {
      fixedLayoutState = createComposeFixedLayoutState(null, templateId);
    }
    return fixedLayoutState;
  }

  function persistFixedLayoutState() {
    persistComposeDraft({
      fixedLayout: createComposeFixedLayoutState(fixedLayoutState, fixedLayoutState.templateId),
    });
  }

  function fixedResizeMinimums(type) {
    return type === 'image'
      ? { width: 0.06, height: 0.06 }
      : { width: 0.08, height: 0.025 };
  }

  function clampFixedRect(rect, type) {
    const minimums = fixedResizeMinimums(type);
    const width = Math.min(1, Math.max(minimums.width, Number(rect.width) || minimums.width));
    const height = Math.min(1, Math.max(minimums.height, Number(rect.height) || minimums.height));
    return {
      x: Math.min(1 - width, Math.max(0, Number(rect.x) || 0)),
      y: Math.min(1 - height, Math.max(0, Number(rect.y) || 0)),
      width,
      height,
    };
  }

  function updateFixedLayoutRect(type, key, rect) {
    const templateId = composeSheet?.dataset.template || uiState.composeTemplateId || DEFAULT_COMPOSE_TEMPLATE;
    const state = ensureFixedLayoutState(templateId);
    const bucket = type === 'image' ? state.images : state.texts;
    bucket[key] = clampFixedRect(rect, type);
    persistFixedLayoutState();
  }

  function getFixedTextAlign(fieldKey) {
    const templateId = composeSheet?.dataset.template || uiState.composeTemplateId || DEFAULT_COMPOSE_TEMPLATE;
    const layoutState = ensureFixedLayoutState(templateId);
    const overrideAlign = layoutState.texts?.[fieldKey]?.align;
    if (['left', 'center', 'right'].includes(overrideAlign)) {
      return overrideAlign;
    }
    const layout = getFixedTemplateLayout(templateId, layoutState);
    const blockAlign = layout?.texts.find((block) => block.fieldKey === fieldKey)?.align;
    return ['left', 'center', 'right'].includes(blockAlign) ? blockAlign : 'left';
  }

  function updateFixedTextAlign(fieldKey, align) {
    if (!fieldKey || !['left', 'center', 'right'].includes(align)) return;
    const templateId = composeSheet?.dataset.template || uiState.composeTemplateId || DEFAULT_COMPOSE_TEMPLATE;
    const state = ensureFixedLayoutState(templateId);
    const layout = getFixedTemplateLayout(templateId, state);
    const block = layout?.texts.find((item) => item.fieldKey === fieldKey) || {};
    const current = state.texts[fieldKey] || {};
    state.texts[fieldKey] = {
      x: Number.isFinite(Number(current.x)) ? current.x : block.x,
      y: Number.isFinite(Number(current.y)) ? current.y : block.y,
      width: Number.isFinite(Number(current.width)) ? current.width : block.width,
      height: Number.isFinite(Number(current.height)) ? current.height : block.height,
      align,
    };
    persistFixedLayoutState();
    applyFixedTemplateLayout(templateId);
    syncComposeTextTray();
  }

  function applyComposeTextStyle(fieldKey) {
    const target = editableKeyMap[fieldKey];
    if (!target) return;
    const style = getComposeTextStyleValue(fieldKey);
    if (!target.dataset.composeBaseFontSize) {
      target.dataset.composeBaseFontSize = window.getComputedStyle(target).fontSize;
    }
    if (!target.dataset.composeBaseLineHeight) {
      target.dataset.composeBaseLineHeight = window.getComputedStyle(target).lineHeight;
    }
    const baseFontSize = Number.parseFloat(target.dataset.composeBaseFontSize || '');
    const baseLineHeight = Number.parseFloat(target.dataset.composeBaseLineHeight || '');
    target.style.setProperty('--compose-text-scale', String(style.scale));
    if (Number.isFinite(baseFontSize)) {
      target.style.fontSize = `${baseFontSize * style.scale}px`;
    }
    if (Number.isFinite(baseLineHeight)) {
      target.style.lineHeight = `${baseLineHeight * style.scale}px`;
    }
    if (style.backgroundColor) {
      target.style.backgroundColor = style.backgroundColor;
      target.dataset.composeTextBackgroundColor = style.backgroundColor;
    } else {
      target.style.backgroundColor = '';
      delete target.dataset.composeTextBackgroundColor;
    }
    target.style.removeProperty('--compose-font-stack');
    target.style.removeProperty('font-family');
  }

  function applyComposeTextStyles() {
    Object.keys(editableKeyMap).forEach((fieldKey) => applyComposeTextStyle(fieldKey));
  }

  function syncComposeTextTray() {
    if (!textTray || !activeFixedTextKey) return;
    const style = getComposeTextStyleValue(activeFixedTextKey);
    const activeSizeScale = getSelectedTextSizeScale() || style.scale;
    if (textTrayTarget) {
      textTrayTarget.textContent = composeTextLabels[activeFixedTextKey] || 'Text';
    }
    if (textTraySizeValue) {
      textTraySizeValue.textContent = `${Math.round(activeSizeScale * 100)}%`;
    }
    if (textTraySizeInput) {
      textTraySizeInput.value = String(Math.round(activeSizeScale * 100));
    }
    const selectedFontId = getSelectedTextFontId();
    textTrayFontButtons.forEach((button) => {
      button.classList.toggle('is-active', Boolean(selectedFontId) && button.dataset.composeTextFont === selectedFontId);
    });
    const align = getFixedTextAlign(activeFixedTextKey);
    const selectedAlign = getSelectedTextAlign();
    textTrayAlignButtons.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.composeTextAlign === (selectedAlign || align));
    });
    textTrayBackgroundButtons.forEach((button) => {
      const buttonColor = normalizeComposeTextBackgroundColor(button.dataset.composeTextBackground) || '';
      button.classList.toggle('is-active', buttonColor === (style.backgroundColor || ''));
    });
  }

  function syncComposeTextTargetState() {
    editables.forEach((element) => {
      element.classList.toggle('is-active', element.dataset.editable === activeFixedTextKey);
    });
  }

  function getComposeTextTrayHeights() {
    if (!textTray) {
      return { collapsedHeight: 0, expandedHeight: 0, bodyHeight: 0 };
    }
    const previousHidden = textTray.hidden;
    const previousHeight = textTray.style.height;
    const previousVisibility = textTray.style.visibility;
    if (previousHidden) {
      textTray.hidden = false;
      textTray.style.visibility = 'hidden';
    }
    textTray.style.height = 'auto';
    const expandedHeight = textTray.scrollHeight;
    const bodyHeight = textTrayBody?.scrollHeight || 0;
    const collapsedHeight = Math.max(0, expandedHeight - bodyHeight);
    textTray.style.height = previousHeight;
    textTray.style.visibility = previousVisibility;
    if (previousHidden) {
      textTray.hidden = true;
    }
    return { collapsedHeight, expandedHeight, bodyHeight };
  }

  function getComposeSheetResizeBounds(sheet) {
    const previewRect = composePage?.querySelector('.compose-preview--editor')?.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
    const availableHeight = previewRect?.height || viewportHeight;
    const availableWidth = previewRect?.width || viewportWidth;
    const textTrayExpandedHeight = sheet === textTray
      ? getComposeTextTrayHeights().expandedHeight
      : 0;
    return {
      minHeight: Math.max(72, Math.round(availableHeight * 0.12)),
      maxHeight: textTrayExpandedHeight || Math.max(160, Math.round(availableHeight * 0.82)),
      minWidth: Math.min(Math.max(240, Math.round(availableWidth * 0.58)), availableWidth),
      maxWidth: Math.max(240, Math.round(availableWidth)),
      currentHeight: Math.round(sheet?.getBoundingClientRect().height || 0),
      currentWidth: Math.round(sheet?.getBoundingClientRect().width || 0),
    };
  }

  function clampComposeSheetHeight(sheet, nextHeight) {
    const { minHeight, maxHeight } = getComposeSheetResizeBounds(sheet);
    return Math.max(minHeight, Math.min(maxHeight, Math.round(nextHeight)));
  }

  function clampComposeSheetWidth(sheet, nextWidth) {
    const { minWidth, maxWidth } = getComposeSheetResizeBounds(sheet);
    return Math.max(minWidth, Math.min(maxWidth, Math.round(nextWidth)));
  }

  function applyComposeSheetWidth(sheet, nextWidth, options = {}) {
    if (!sheet) return null;
    const { animate = true, dockSide } = options;
    const clampedWidth = clampComposeSheetWidth(sheet, nextWidth);
    sheet.style.transition = animate ? '' : 'none';
    if (dockSide === 'left') {
      sheet.style.left = '0';
      sheet.style.right = 'auto';
      sheet.dataset.dockSide = 'left';
    } else if (dockSide === 'right') {
      sheet.style.left = 'auto';
      sheet.style.right = '0';
      sheet.dataset.dockSide = 'right';
    }
    sheet.style.width = `${clampedWidth}px`;
    sheet.dataset.resized = 'true';
    return clampedWidth;
  }

  function applyCustomToolsHeight(nextHeight, options = {}) {
    if (!customTemplateControls) return;
    const { animate = true } = options;
    customToolsHeight = clampComposeSheetHeight(customTemplateControls, nextHeight);
    customTemplateControls.style.transition = animate ? '' : 'none';
    customTemplateControls.style.height = `${customToolsHeight}px`;
    customTemplateControls.dataset.resized = 'true';
  }

  function applyCustomToolsSize(nextSize, options = {}) {
    if (!customTemplateControls) return;
    if (Number.isFinite(nextSize?.height)) {
      applyCustomToolsHeight(nextSize.height, options);
    }
    if (Number.isFinite(nextSize?.width)) {
      customToolsWidth = applyComposeSheetWidth(customTemplateControls, nextSize.width, {
        ...options,
        dockSide: customToolsDockSide,
      });
    }
  }

  function getMaxComposeTextTrayOffset() {
    if (!textTray) return 0;
    const trayRect = textTray.getBoundingClientRect();
    const visualViewportTop = window.visualViewport?.offsetTop || 0;
    const topInset = visualViewportTop + 8;
    return Math.max(0, Math.round(trayRect.top + textTrayOffset - topInset));
  }

  function applyComposeTextTrayOffset(nextOffset, options = {}) {
    if (!textTray) return;
    const { animate = true } = options;
    textTrayOffset = Math.max(0, Math.min(getMaxComposeTextTrayOffset(), Math.round(nextOffset)));
    textTray.style.transition = animate ? '' : 'none';
    textTray.style.setProperty('--compose-text-tray-offset', `${textTrayOffset}px`);
    textTray.classList.toggle('is-raised', textTrayOffset > 8);
    if (!animate) {
      requestAnimationFrame(() => {
        textTray?.style.removeProperty('transition');
      });
    }
  }

  function applyComposeTextTrayLevel(nextLevel, options = {}) {
    if (!textTray) return;
    const { animate = true } = options;
    textTrayOpenLevel = Math.max(0, Math.min(100, nextLevel));
    const { collapsedHeight, bodyHeight } = getComposeTextTrayHeights();
    const targetHeight = collapsedHeight + (bodyHeight * (textTrayOpenLevel / 100));
    textTrayHeight = Math.round(targetHeight);
    textTray.style.transition = animate ? '' : 'none';
    textTray.style.height = `${textTrayHeight}px`;
    textTray.dataset.openLevel = String(textTrayOpenLevel);
  }

  function openComposeTextTray(fieldKey, options = {}) {
    if (!textTray || composeSheet?.dataset.template === 'page8') return;
    const { expand = false } = options;
    const shouldExpandFully = expand && (textTray.hidden || activeFixedTextKey !== fieldKey);
    activeFixedTextKey = fieldKey;
    textTray.hidden = false;
    textTray.dataset.activeField = fieldKey;
    syncComposeTextTargetState();
    syncComposeTextTray();
    applyComposeTextTrayLevel(shouldExpandFully ? 100 : textTrayOpenLevel, { animate: false });
  }

  function closeComposeTextTray() {
    if (!textTray) return;
    textTray.style.removeProperty('height');
    textTray.style.removeProperty('transition');
    activeFixedTextKey = null;
    textTrayOpenLevel = 100;
    textTrayHeight = null;
    textTrayDragState = null;
    textTrayOffset = 0;
    textTray.style.removeProperty('--compose-text-tray-offset');
    textTray.classList.remove('is-raised');
    textTray.hidden = true;
    delete textTray.dataset.activeField;
    delete textTray.dataset.openLevel;
    syncComposeTextTargetState();
  }

  function minimizeComposeTextTray() {
    if (!textTray || textTray.hidden) return;
    applyComposeTextTrayLevel(0);
  }

  function applyComposeTextTrayHeight(nextHeight, options = {}) {
    if (!textTray) return;
    const { collapsedHeight, bodyHeight } = getComposeTextTrayHeights();
    if (!bodyHeight) return;
    const { animate = true } = options;
    const clampedHeight = clampComposeSheetHeight(textTray, nextHeight);
    textTrayHeight = clampedHeight;
    textTrayOpenLevel = Math.max(0, Math.min(100, ((clampedHeight - collapsedHeight) / bodyHeight) * 100));
    textTray.style.transition = animate ? '' : 'none';
    textTray.style.height = `${textTrayHeight}px`;
    textTray.dataset.openLevel = String(Math.round(textTrayOpenLevel));
  }

  function applyComposeTextTrayDrag(deltaY, dragState) {
    if (!textTray || !dragState) return;
    const { collapsedHeight, expandedHeight } = getComposeTextTrayHeights();
    if (!expandedHeight) return;
    const maxOffset = getMaxComposeTextTrayOffset();

    if (dragState.startOffset >= maxOffset - 2 && deltaY < 0) {
      applyComposeTextTrayOffset(dragState.startOffset - deltaY, { animate: false });
      applyComposeTextTrayHeight(dragState.startHeight + deltaY, { animate: false });
      return;
    }

    const desiredHeight = dragState.startHeight - deltaY;

    if (dragState.startOffset > 0 && deltaY > 0) {
      const nextOffset = dragState.startOffset - deltaY;
      if (nextOffset >= 0) {
        applyComposeTextTrayLevel(100, { animate: false });
        applyComposeTextTrayOffset(nextOffset, { animate: false });
        return;
      }
      applyComposeTextTrayOffset(0, { animate: false });
      applyComposeTextTrayHeight(expandedHeight + nextOffset, { animate: false });
      return;
    }

    if (desiredHeight > expandedHeight) {
      applyComposeTextTrayLevel(100, { animate: false });
      applyComposeTextTrayOffset(dragState.startOffset + (desiredHeight - expandedHeight), { animate: false });
      return;
    }

    applyComposeTextTrayOffset(dragState.startOffset, { animate: false });
    applyComposeTextTrayHeight(Math.max(collapsedHeight, desiredHeight), { animate: false });
  }

  function applyComposeTextTraySize(nextSize, options = {}) {
    if (!textTray) return;
    if (Number.isFinite(nextSize?.height)) {
      applyComposeTextTrayHeight(nextSize.height, options);
    }
    if (Number.isFinite(nextSize?.width)) {
      textTrayWidth = applyComposeSheetWidth(textTray, nextSize.width, {
        ...options,
        dockSide: textTrayDockSide,
      });
    }
  }

  function resolveComposeSheetResizeIntent(handleSide, deltaX, fallbackDockSide) {
    if (fallbackDockSide === 'left' && handleSide === 'end') {
      return {
        dockSide: 'left',
        widthDelta: deltaX,
      };
    }
    if (fallbackDockSide === 'right' && handleSide === 'start') {
      return {
        dockSide: 'right',
        widthDelta: -deltaX,
      };
    }
    if (handleSide === 'end' && deltaX < 0) {
      return {
        dockSide: 'left',
        widthDelta: deltaX,
      };
    }
    if (handleSide === 'start' && deltaX > 0) {
      return {
        dockSide: 'right',
        widthDelta: -deltaX,
      };
    }
    return {
      dockSide: fallbackDockSide,
      widthDelta: handleSide === 'start' ? deltaX : -deltaX,
    };
  }

  function restoreActiveComposeTextFocus() {
    if (!activeFixedTextKey) return;
    const target = editableKeyMap[activeFixedTextKey];
    if (!target) return;
    target.focus({ preventScroll: true });
    if (!selectionIsWithin(target)) {
      placeCaretAtEnd(target);
    }
  }

  function getEventElement(target) {
    if (target instanceof Element) return target;
    return target?.parentElement || null;
  }

  function closestFromEventTarget(target, selector) {
    return getEventElement(target)?.closest(selector) || null;
  }

  function findFixedEditableAtPoint(clientX, clientY) {
    if (composeSheet?.dataset.template === 'page8') return null;
    return editables
      .filter((element) => {
        if (!element || element.style.display === 'none') return false;
        if (element.getAttribute('contenteditable') !== 'true') return false;
        const rect = element.getBoundingClientRect();
        return clientX >= rect.left
          && clientX <= rect.right
          && clientY >= rect.top
          && clientY <= rect.bottom;
      })
      .sort((first, second) => {
        const firstIndex = Number.parseInt(window.getComputedStyle(first).zIndex, 10) || 0;
        const secondIndex = Number.parseInt(window.getComputedStyle(second).zIndex, 10) || 0;
        return secondIndex - firstIndex;
      })[0] || null;
  }

  function focusFixedEditableFromPoint(event) {
    if (composePage?.classList.contains('is-preview-mode')) return;
    if (closestFromEventTarget(event.target, '[data-editable], [data-fixed-resize]')) return;
    const target = findFixedEditableAtPoint(event.clientX, event.clientY);
    if (!target) return;
    event.preventDefault();
    event.stopPropagation();
    const fieldKey = target.dataset.editable;
    target.focus({ preventScroll: true });
    placeCaretAtEnd(target);
    openComposeTextTray(fieldKey);
  }

  function updateComposeTextStyle(partial = {}) {
    if (!activeFixedTextKey) return;
    const currentDraft = uiState.composeWorkingDraft || composeDraft || {};
    const nextStyle = {
      ...createComposeTextStyleValue(currentDraft.textStyles?.[activeFixedTextKey]),
      ...partial,
    };
    persistComposeDraft({
      textStyles: {
        ...(currentDraft.textStyles || {}),
        [activeFixedTextKey]: createComposeTextStyleValue(nextStyle),
      },
    });
    if (composeSheet?.dataset.template && composeSheet.dataset.template !== 'page8') {
      applyFixedTemplateLayout(composeSheet.dataset.template);
    } else {
      applyComposeTextStyle(activeFixedTextKey);
      const target = editableKeyMap[activeFixedTextKey];
      if (target) {
        clampEditable(target);
      }
    }
    syncComposeTextTray();
  }

  function buildComposeDraftSnapshot(options = {}) {
    const { customLayoutOverride } = options;
    syncVisibleComposeEditables();
    const checkedTemplate = composeRoot.querySelector('input[name="templateId"]:checked');
    const checkedBackground = composeRoot.querySelector('input[name="backgroundColor"]:checked');
    const currentTemplateId = String(
      checkedTemplate?.value
      || composeSheet?.dataset.template
      || uiState.composeTemplateId
      || composeDraft?.templateId
      || DEFAULT_COMPOSE_TEMPLATE,
    );
    const currentBackground = String(
      '#ffffff',
    );
    const baseDraft = persistComposeDraft({
      templateId: currentTemplateId,
      backgroundColor: currentBackground,
      standardFiles: serializeStandardFiles(),
    });

    const tagSource = form ? new FormData(form) : null;
    const fixedTags = tagSource
      ? tagSource.getAll('fixedTags').map((tag) => String(tag))
      : baseDraft.fixedTags;
    const freeTags = tagSource
      ? String(tagSource.get('freeTags') || '')
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
      : baseDraft.freeTags;

    if (currentTemplateId === 'page8') {
      const nextCustomLayout = customLayoutOverride
        || activeComposeBridge?.getSerializedLayout?.()
        || baseDraft.customLayout;
      return persistComposeDraft({
        fixedTags,
        freeTags,
        customLayout: nextCustomLayout,
      });
    }

    const editableTextValue = getEditableValue('text');
    const editableHeadlineValue = getEditableValue('headline');
    const headlineValue = editableTextValue || editableHeadlineValue || baseDraft.headline;
    const richTexts = getComposeRichTextSnapshot(baseDraft.richTexts);
    if (richTexts.text) {
      richTexts.headline = richTexts.text;
    }

    return persistComposeDraft({
      fixedTags,
      freeTags,
      fixedLayout: createComposeFixedLayoutState(fixedLayoutState, currentTemplateId),
      text: editableTextValue || baseDraft.text || headlineValue,
      headline: headlineValue,
      subhead: getEditableValue('subhead') || baseDraft.subhead,
      text2: getEditableValue('text2') || baseDraft.text2,
      text3: getEditableValue('text3') || baseDraft.text3,
      intro: getEditableValue('intro') || baseDraft.intro,
      body: getEditableValue('body') || baseDraft.body,
      date: getEditableValue('date') || baseDraft.date,
      editor: getEditableValue('editor') || baseDraft.editor,
      richTexts,
      customLayout: customLayoutOverride ?? null,
    });
  }

  const switchComposeStage = async (nextStage) => {
    const draftSnapshot = await finalizeComposeDraftSnapshot();
    if (nextStage === 'tags' && composeStage === 'edit') {
      const values = buildComposeRenderValues(draftSnapshot);
      const imageData = await prepareComposeImageData(draftSnapshot, values);
      if (!imageData) return;
    } else if (nextStage === 'edit') {
      uiState.composePreparedImageData = null;
      uiState.composePreparedImageDirty = true;
    }
    uiState.composeStage = nextStage;
    render();
  };

  function loadImageSize(file) {
    return new Promise((resolve) => {
      const image = new Image();
      const source = typeof file === 'string' ? file : URL.createObjectURL(file);
      image.onload = () => {
        resolve({ width: image.naturalWidth, height: image.naturalHeight });
        if (typeof file !== 'string') {
          URL.revokeObjectURL(source);
        }
      };
      image.onerror = () => {
        resolve(null);
        if (typeof file !== 'string') {
          URL.revokeObjectURL(source);
        }
      };
      image.src = source;
    });
  }

  function updateSlotPosition(inputId) {
    const slotImage = document.querySelector(`[data-slot-image="${inputId}"]`);
    const stateKey = getFixedSlotStateKey(inputId);
    const slotState = selectedFiles[stateKey];
    if (!slotImage) return;
    slotImage.style.backgroundPosition = `${(slotState.position.x || 0.5) * 100}% ${(slotState.position.y || 0.5) * 100}%`;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function sanitizeComposeRichTextMarkup(markup = '') {
    if (!markup) return '';
    const template = document.createElement('template');
    template.innerHTML = String(markup);
    const output = document.createElement('div');

    const appendSafeNode = (sourceNode, targetParent) => {
      if (sourceNode.nodeType === Node.TEXT_NODE) {
        targetParent.append(document.createTextNode(sourceNode.textContent || ''));
        return;
      }
      if (sourceNode.nodeType !== Node.ELEMENT_NODE) return;

      const element = sourceNode;
      if (element.tagName === 'BR') {
        targetParent.append(document.createElement('br'));
        return;
      }

      if ((element.tagName === 'DIV' || element.tagName === 'SPAN') && normalizeComposeRichTextAlign(element.dataset.composeTextAlign)) {
        const align = normalizeComposeRichTextAlign(element.dataset.composeTextAlign);
        const div = document.createElement('div');
        div.className = 'compose-rich-align';
        div.dataset.composeTextAlign = align;
        div.style.textAlign = align;
        Array.from(element.childNodes).forEach((child) => appendSafeNode(child, div));
        targetParent.append(div);
        return;
      }

      if (element.tagName === 'SPAN') {
        const fontId = element.dataset.composeFontId;
        const sizeScale = normalizeComposeRichTextSizeScale(element.dataset.composeTextSizeScale);
        if ((fontId && COMPOSE_TEXT_FONT_STACKS[fontId]) || sizeScale) {
          const span = document.createElement('span');
          const classNames = [];
          if (fontId && COMPOSE_TEXT_FONT_STACKS[fontId]) {
            classNames.push('compose-rich-font');
            span.dataset.composeFontId = fontId;
            span.style.fontFamily = COMPOSE_TEXT_FONT_STACKS[fontId];
          }
          if (sizeScale) {
            classNames.push('compose-rich-size');
            span.dataset.composeTextSizeScale = String(sizeScale);
            span.style.fontSize = `${sizeScale}em`;
          }
          span.className = classNames.join(' ');
          Array.from(element.childNodes).forEach((child) => appendSafeNode(child, span));
          targetParent.append(span);
          return;
        }
      }

      if (element.tagName === 'DIV' || element.tagName === 'P') {
        if (targetParent.childNodes.length) {
          targetParent.append(document.createElement('br'));
        }
        Array.from(element.childNodes).forEach((child) => appendSafeNode(child, targetParent));
        return;
      }

      Array.from(element.childNodes).forEach((child) => appendSafeNode(child, targetParent));
    };

    Array.from(template.content.childNodes).forEach((child) => appendSafeNode(child, output));
    return output.innerHTML;
  }

  function getEditableRichTextHtml(element) {
    if (!element || isPage7ConstrainedEditable(element)) return '';
    return sanitizeComposeRichTextMarkup(element.innerHTML || '');
  }

  function createCustomId(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  function getCustomImageState(boxId) {
    if (!customImageFiles[boxId]) {
      customImageFiles[boxId] = { file: null, position: { x: 0.5, y: 0.5, zoom: 1 }, imageSize: null, previewUrl: '' };
    }
    return customImageFiles[boxId];
  }

  function getCustomTextPreset(kind) {
    if (kind === 'title') {
      return {
        kind: 'title',
        fontSize: 0.046,
        lineHeight: 1.12,
        padding: 0.01,
        family: 'serif',
        weight: 600,
        align: 'left',
      };
    }
    return {
      kind: 'body',
      fontSize: 0.026,
      lineHeight: 1.45,
      padding: 0.012,
      family: 'sans',
      weight: 500,
      align: 'left',
    };
  }

  function applyCustomTextPreset(textItem, kind) {
    Object.assign(textItem, {
      ...textItem,
      ...getCustomTextPreset(kind),
    });
  }

  function createCustomTextBox(align = 'left') {
    const nextText = findSafeTextPosition({
      id: createCustomId('text'),
      kind: 'body',
      text: 'text',
      isDefaultText: true,
      x: 0.18,
      y: 0.2,
      width: 0.28,
      height: 0.12,
      fontSize: 0.026,
      lineHeight: 1.45,
      padding: 0.012,
      align,
      family: 'sans',
      weight: 500,
    }, [
      ...customLayoutState.imageBoxes.map((item) => getCustomRect(item)),
      ...customLayoutState.textBoxes.map((item) => getCustomRect(item)),
    ]);
    customLayoutState.textBoxes = [
      ...customLayoutState.textBoxes,
      clampCustomBoxRect(nextText, PAGE8_MIN_TEXT_SIZE),
    ];
    customLayoutState.selectedId = nextText.id;
    renderCustomCanvas();
  }

  function normalizeEditableContent(element) {
    if (element.dataset.singleLine === 'true') {
      element.innerHTML = sanitizeComposeRichTextMarkup(element.innerHTML || '')
        .replace(/<br\s*\/?>/gi, ' ');
      return;
    }
    element.innerHTML = sanitizeComposeRichTextMarkup(element.innerHTML || '')
      .replace(/&nbsp;/gi, ' ');
  }

  function createEditableMeasureNode(element) {
    const computed = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const boxWidth = rect.width || element.clientWidth;
    const boxHeight = rect.height || element.clientHeight;
    const measure = document.createElement('div');
    measure.setAttribute('aria-hidden', 'true');
    measure.className = element.className;
      if (element.dataset.composeExclusionSide) {
        measure.dataset.composeExclusionSide = element.dataset.composeExclusionSide;
        measure.style.setProperty('--compose-exclusion-top', element.style.getPropertyValue('--compose-exclusion-top'));
        measure.style.setProperty('--compose-exclusion-width', element.style.getPropertyValue('--compose-exclusion-width'));
        measure.style.setProperty('--compose-exclusion-height', element.style.getPropertyValue('--compose-exclusion-height'));
        measure.style.setProperty('--compose-exclusion-bottom', element.style.getPropertyValue('--compose-exclusion-bottom'));
        measure.style.setProperty('--compose-fixed-line-height', element.style.getPropertyValue('--compose-fixed-line-height'));
        measure.style.setProperty('--compose-fixed-block-height', element.style.getPropertyValue('--compose-fixed-block-height'));
      }
    measure.style.position = 'absolute';
    measure.style.left = '-99999px';
    measure.style.top = '0';
    measure.style.visibility = 'hidden';
    measure.style.pointerEvents = 'none';
    measure.style.boxSizing = 'border-box';
    measure.style.width = `${boxWidth}px`;
    measure.style.height = `${boxHeight}px`;
    measure.style.padding = computed.padding;
    measure.style.border = '0';
    measure.style.margin = '0';
    measure.style.overflow = 'hidden';
    measure.style.fontFamily = computed.fontFamily;
    measure.style.fontSize = computed.fontSize;
    measure.style.fontWeight = computed.fontWeight;
    measure.style.fontStyle = computed.fontStyle;
    measure.style.lineHeight = computed.lineHeight;
    measure.style.letterSpacing = computed.letterSpacing;
    measure.style.whiteSpace = computed.whiteSpace;
    measure.style.wordBreak = computed.wordBreak;
    measure.style.overflowWrap = computed.overflowWrap;
    measure.style.textAlign = computed.textAlign;
    measure.style.textTransform = computed.textTransform;
    measure.style.textIndent = computed.textIndent;
    return measure;
  }

  function normalizeEditableValue(element, value) {
    const text = String(value || '').replace(/\r/g, '');
    return element.dataset.singleLine === 'true'
      ? text.replace(/\n+/g, ' ')
      : text;
  }

  function isPage7ConstrainedEditable(element) {
    return composeSheet?.dataset.template === 'page7'
      && (element?.dataset.editable === 'headline' || element?.dataset.editable === 'body');
  }

  function getPage7RawText(element) {
    return normalizeEditableValue(element, element.dataset.page7RawText || element.textContent || '').replace(/\n+/g, '');
  }

  function measurePage7TextWidth(element, value) {
    const computed = window.getComputedStyle(element);
    const canvas = measurePage7TextWidth.canvas || document.createElement('canvas');
    measurePage7TextWidth.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) return value.length * parseFloat(computed.fontSize || '14');
    ctx.font = `${computed.fontStyle || 'normal'} ${computed.fontWeight || '400'} ${computed.fontSize || '14px'} ${computed.fontFamily || 'sans-serif'}`;
    return ctx.measureText(value).width;
  }

  function fitPage7Line(element, units, startIndex, maxWidth) {
    let line = '';
    let index = startIndex;
    while (index < units.length) {
      const candidate = `${line}${units[index]}`;
      if (line && measurePage7TextWidth(element, candidate) > maxWidth) {
        break;
      }
      line = candidate;
      index += 1;
      if (measurePage7TextWidth(element, line) > maxWidth) {
        break;
      }
    }
    return { line, nextIndex: Math.max(index, startIndex + (line ? 0 : 1)) };
  }

  function buildPage7LinePlan(element) {
    const rect = element.getBoundingClientRect();
    const computed = window.getComputedStyle(element);
    const fontSize = parseFloat(computed.fontSize || '14');
    const lineHeight = parseFloat(computed.lineHeight || `${fontSize * 1.3}`) || (fontSize * 1.3);
    const maxLines = Math.max(1, Math.floor(((rect.height || element.clientHeight) + 1) / lineHeight));
    const fullWidth = rect.width || element.clientWidth;
    const exclusionWidth = Math.min(fullWidth * 0.55, fullWidth * 0.28 + 10);
    const shortWidth = Math.max(fullWidth * 0.35, fullWidth - exclusionWidth);
    return Array.from({ length: maxLines }, (_, index) => {
      const isHeadlineRestricted = element.dataset.editable === 'headline' && index >= maxLines - 3;
      const isBodyRestricted = element.dataset.editable === 'body' && index < 3;
      return {
        width: isHeadlineRestricted || isBodyRestricted ? shortWidth : fullWidth,
        boxWidth: fullWidth,
        indent: isBodyRestricted ? exclusionWidth : 0,
        restricted: isHeadlineRestricted || isBodyRestricted,
      };
    });
  }

  function renderPage7Lines(element, rawText) {
    const text = normalizeEditableValue(element, rawText).replace(/\n+/g, '');
    const linePlan = buildPage7LinePlan(element);
    const units = Array.from(text);
    const lines = [];
    let index = 0;
    for (const plan of linePlan) {
      if (index >= units.length) break;
      const fitted = fitPage7Line(element, units, index, plan.width);
      const line = units.slice(index, fitted.nextIndex).join('');
      lines.push({ ...plan, text: line });
      index = fitted.nextIndex;
    }
    const acceptedText = units.slice(0, index).join('');
    element.dataset.page7RawText = acceptedText;
    if (!acceptedText) {
      element.textContent = '';
      return false;
    }
    element.innerHTML = lines.map((line) => {
      const escaped = line.text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      const style = line.indent
        ? ` style="padding-left:${line.indent}px;width:${line.boxWidth}px;"`
        : ` style="width:${line.width}px;"`;
      return `<div class="compose-page7-line"${style}>${escaped || '<br>'}</div>`;
    }).join('');
    return acceptedText.length === text.length;
  }

  function editableTextFits(element, value) {
    const rect = element.getBoundingClientRect();
    const boxWidth = rect.width || element.clientWidth;
    const boxHeight = rect.height || element.clientHeight;
    const measure = createEditableMeasureNode(element);
    measure.textContent = normalizeEditableValue(element, value);
    document.body.appendChild(measure);
    const isSingleLine = element.dataset.singleLine === 'true';
    const fitsHeight = measure.scrollHeight <= boxHeight + 2;
    const fitsWidth = measure.scrollWidth <= boxWidth + 2;
    measure.remove();
    return isSingleLine ? (fitsHeight && fitsWidth) : fitsHeight;
  }

  function fitEditableText(element, value) {
    const normalized = normalizeEditableValue(element, value);
    if (editableTextFits(element, normalized)) {
      return normalized;
    }

    const units = Array.from(normalized);
    let low = 0;
    let high = units.length;

    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      const candidate = units.slice(0, mid).join('');
      if (editableTextFits(element, candidate)) {
        low = mid;
      } else {
        high = mid - 1;
      }
    }

    return units.slice(0, low).join('');
  }

  function shouldClampEditable(element) {
    const templateId = composeSheet?.dataset.template;
    return !(element?.dataset.editable === 'text' && (templateId === 'page4' || templateId === 'page5'));
  }

  function shouldUseBoxLimit(element) {
    return !shouldClampEditable(element);
  }

  function editableOverflowsBox(element) {
    return element.scrollHeight > element.clientHeight + 2
      || element.scrollWidth > element.clientWidth + 2;
  }

  function limitEditableToBox(element) {
    if (isPage7ConstrainedEditable(element)) {
      const rawText = getPage7RawText(element);
      const fits = renderPage7Lines(element, rawText);
      element.dataset.previousValue = element.dataset.page7RawText || '';
      return !fits;
    }
    if (!editableOverflowsBox(element)) {
      element.dataset.previousValue = getEditableText(element);
      return false;
    }
    setEditablePlainText(element, element.dataset.previousValue || '');
    return true;
  }

  function setEditablePlainText(element, value) {
    element.textContent = normalizeEditableValue(element, value);
  }

  function clampEditable(element) {
    if (isPage7ConstrainedEditable(element)) {
      limitEditableToBox(element);
      return;
    }
    if (shouldUseBoxLimit(element)) {
      limitEditableToBox(element);
      return;
    }
    const value = normalizeEditableValue(element, element.innerText);
    if (!element.dataset.previousValue) {
      element.dataset.previousValue = value;
    }

    const fittedValue = fitEditableText(element, value);
    if (fittedValue !== value) {
      setEditablePlainText(element, fittedValue);
      element.dataset.previousValue = fittedValue;
      return;
    }

    element.dataset.previousValue = fittedValue;
  }

  function getEditableText(element) {
    if (isPage7ConstrainedEditable(element)) {
      return getPage7RawText(element);
    }
    return normalizeEditableValue(element, element.textContent || '');
  }

  function placeCaretAtEnd(element) {
    const selection = window.getSelection();
    if (!selection) return;
    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function getSelectionLengthWithin(element) {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return 0;
    const range = selection.getRangeAt(0);
    if (!element.contains(range.startContainer) || !element.contains(range.endContainer)) {
      return 0;
    }
    return selection.toString().length;
  }

  function selectionIsWithin(element) {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return false;
    const range = selection.getRangeAt(0);
    return element.contains(range.startContainer) && element.contains(range.endContainer);
  }

  function getCaretRangeFromPoint(element, clientX, clientY) {
    if (!element) return null;
    let range = null;
    if (document.caretRangeFromPoint) {
      range = document.caretRangeFromPoint(clientX, clientY);
    } else if (document.caretPositionFromPoint) {
      const position = document.caretPositionFromPoint(clientX, clientY);
      if (position) {
        range = document.createRange();
        range.setStart(position.offsetNode, position.offset);
        range.collapse(true);
      }
    }
    if (!range || !element.contains(range.startContainer)) {
      const fallbackRange = document.createRange();
      fallbackRange.selectNodeContents(element);
      fallbackRange.collapse(false);
      return fallbackRange;
    }
    return range;
  }

  function getTextBoundaryRangeFromPoint(element, clientX, clientY) {
    if (!element) return null;
    const textNodes = [];
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      if (node.textContent?.length) {
        textNodes.push(node);
      }
      node = walker.nextNode();
    }
    if (!textNodes.length) {
      return getCaretRangeFromPoint(element, clientX, clientY);
    }

    let best = null;
    textNodes.forEach((textNode) => {
      const length = textNode.textContent.length;
      for (let offset = 0; offset < length; offset += 1) {
        const range = document.createRange();
        range.setStart(textNode, offset);
        range.setEnd(textNode, offset + 1);
        const rects = Array.from(range.getClientRects());
        range.detach?.();
        rects.forEach((rect) => {
          if (!rect.width && !rect.height) return;
          const verticalDistance = clientY < rect.top
            ? rect.top - clientY
            : clientY > rect.bottom
              ? clientY - rect.bottom
              : 0;
          const boundaryOffset = clientX <= rect.left + (rect.width / 2) ? offset : offset + 1;
          const boundaryX = boundaryOffset === offset ? rect.left : rect.right;
          const horizontalDistance = Math.abs(clientX - boundaryX);
          const lineBias = Math.abs(clientY - (rect.top + rect.height / 2));
          const score = (verticalDistance * 100000) + horizontalDistance + lineBias;
          if (!best || score < best.score) {
            best = {
              node: textNode,
              offset: boundaryOffset,
              score,
            };
          }
        });
      }
    });

    if (!best) {
      return getCaretRangeFromPoint(element, clientX, clientY);
    }

    const boundaryRange = document.createRange();
    boundaryRange.setStart(best.node, best.offset);
    boundaryRange.collapse(true);
    return boundaryRange;
  }

  function createSelectionRangeBetween(startRange, endRange) {
    if (!startRange || !endRange) return null;
    const range = document.createRange();
    const startsBeforeEnd = startRange.compareBoundaryPoints(Range.START_TO_START, endRange) <= 0;
    if (startsBeforeEnd) {
      range.setStart(startRange.startContainer, startRange.startOffset);
      range.setEnd(endRange.startContainer, endRange.startOffset);
    } else {
      range.setStart(endRange.startContainer, endRange.startOffset);
      range.setEnd(startRange.startContainer, startRange.startOffset);
    }
    return range;
  }

  function selectEditableRangeFromDrag(element, startRange, clientX, clientY) {
    const endRange = getTextBoundaryRangeFromPoint(element, clientX, clientY);
    const range = createSelectionRangeBetween(startRange, endRange);
    const selection = window.getSelection();
    if (!range || !selection) return false;
    selection.removeAllRanges();
    selection.addRange(range);
    savedTextSelectionRange = range.cloneRange();
    syncComposeTextTray();
    return true;
  }

  function rememberActiveTextSelection() {
    if (!activeFixedTextKey) return;
    const target = editableKeyMap[activeFixedTextKey];
    const selection = window.getSelection();
    if (!target || !selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (!target.contains(range.startContainer) || !target.contains(range.endContainer)) return;
    savedTextSelectionRange = range.cloneRange();
  }

  function restoreSavedTextSelection() {
    if (!savedTextSelectionRange || !activeFixedTextKey) return false;
    const target = editableKeyMap[activeFixedTextKey];
    if (!target) return false;
    const selection = window.getSelection();
    if (!selection) return false;
    target.focus({ preventScroll: true });
    selection.removeAllRanges();
    selection.addRange(savedTextSelectionRange);
    return selectionIsWithin(target);
  }

  function getSelectedRichTextElement(selector) {
    if (!activeFixedTextKey) return null;
    const target = editableKeyMap[activeFixedTextKey];
    const selection = window.getSelection();
    if (!target || !selection || selection.rangeCount === 0 || !selectionIsWithin(target)) return null;
    const range = selection.getRangeAt(0);
    if (
      range.startContainer === range.endContainer
      && range.startContainer.nodeType === Node.ELEMENT_NODE
      && range.endOffset === range.startOffset + 1
    ) {
      const selectedNode = range.startContainer.childNodes[range.startOffset];
      if (selectedNode instanceof Element) {
        return selectedNode.matches(selector) ? selectedNode : selectedNode.closest(selector);
      }
    }
    const node = selection.anchorNode?.nodeType === Node.ELEMENT_NODE
      ? selection.anchorNode
      : selection.anchorNode?.parentElement;
    return node?.closest?.(selector) || null;
  }

  function getSelectedTextFontId() {
    const fontNode = getSelectedRichTextElement('[data-compose-font-id]');
    const fontId = fontNode?.dataset.composeFontId || null;
    return COMPOSE_TEXT_FONT_IDS.has(fontId) ? fontId : null;
  }

  function getSelectedTextSizeScale() {
    const sizeNode = getSelectedRichTextElement('[data-compose-text-size-scale]');
    return normalizeComposeRichTextSizeScale(sizeNode?.dataset.composeTextSizeScale);
  }

  function getSelectedTextAlign() {
    const alignNode = getSelectedRichTextElement('[data-compose-text-align]');
    return normalizeComposeRichTextAlign(alignNode?.dataset.composeTextAlign);
  }

  function stripComposeFontSpans(root) {
    root.querySelectorAll?.('[data-compose-font-id]').forEach((span) => {
      span.replaceWith(...Array.from(span.childNodes));
    });
    return root;
  }

  function stripComposeSizeSpans(root) {
    root.querySelectorAll?.('[data-compose-text-size-scale]').forEach((span) => {
      span.replaceWith(...Array.from(span.childNodes));
    });
    return root;
  }

  function stripComposeAlignSpans(root) {
    root.querySelectorAll?.('[data-compose-text-align]').forEach((span) => {
      span.replaceWith(...Array.from(span.childNodes));
    });
    return root;
  }

  function createComposeFontSpan(fontId, contents) {
    const span = document.createElement('span');
    span.className = 'compose-rich-font';
    span.dataset.composeFontId = fontId;
    span.style.fontFamily = COMPOSE_TEXT_FONT_STACKS[fontId];
    span.append(stripComposeFontSpans(contents));
    return span;
  }

  function createComposeSizeSpan(scale, contents) {
    const normalizedScale = normalizeComposeRichTextSizeScale(scale);
    if (!normalizedScale) return null;
    const span = document.createElement('span');
    span.className = 'compose-rich-size';
    span.dataset.composeTextSizeScale = String(normalizedScale);
    span.style.fontSize = `${normalizedScale}em`;
    span.append(stripComposeSizeSpans(contents));
    return span;
  }

  function createComposeAlignSpan(align, contents) {
    const normalizedAlign = normalizeComposeRichTextAlign(align);
    if (!normalizedAlign) return null;
    const div = document.createElement('div');
    div.className = 'compose-rich-align';
    div.dataset.composeTextAlign = normalizedAlign;
    div.style.textAlign = normalizedAlign;
    div.append(stripComposeAlignSpans(contents));
    return div;
  }

  function getRestoredSelectedTextRange(target) {
    if (!restoreSavedTextSelection()) return null;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !selectionIsWithin(target)) return null;
    const range = selection.getRangeAt(0);
    return range.collapsed || !selection.toString() ? null : range;
  }

  function applyFontToSelectedText(fontId) {
    if (!activeFixedTextKey || !COMPOSE_TEXT_FONT_IDS.has(fontId)) return false;
    const target = editableKeyMap[activeFixedTextKey];
    if (!target) return false;
    const selectedRange = getRestoredSelectedTextRange(target);
    const fragment = document.createDocumentFragment();
    let span = null;

    if (selectedRange) {
      fragment.append(selectedRange.extractContents());
      span = createComposeFontSpan(fontId, fragment);
      selectedRange.insertNode(span);
    } else {
      if (!getEditableText(target).trim()) return false;
      while (target.firstChild) {
        fragment.append(target.firstChild);
      }
      span = createComposeFontSpan(fontId, fragment);
      target.append(span);
    }

    const selection = window.getSelection();
    if (selection && span.isConnected) {
      const nextRange = document.createRange();
      nextRange.selectNode(span);
      selection.removeAllRanges();
      selection.addRange(nextRange);
      savedTextSelectionRange = nextRange.cloneRange();
    }
    persistEditableDraftValue(target);
    syncComposeTextTray();
    return true;
  }

  function applySizeToSelectedText(scale) {
    const normalizedScale = normalizeComposeRichTextSizeScale(scale);
    if (!activeFixedTextKey || !normalizedScale) return false;
    const target = editableKeyMap[activeFixedTextKey];
    if (!target) return false;
    const selectedRange = getRestoredSelectedTextRange(target);
    if (!selectedRange) {
      updateComposeTextStyle({ scale: normalizedScale });
      return true;
    }

    const fragment = document.createDocumentFragment();
    fragment.append(selectedRange.extractContents());
    const span = createComposeSizeSpan(normalizedScale, fragment);
    if (!span) return false;
    selectedRange.insertNode(span);

    const selection = window.getSelection();
    if (selection && span.isConnected) {
      const nextRange = document.createRange();
      nextRange.selectNode(span);
      selection.removeAllRanges();
      selection.addRange(nextRange);
      savedTextSelectionRange = nextRange.cloneRange();
    }
    persistEditableDraftValue(target);
    syncComposeTextTray();
    return true;
  }

  function applyAlignToSelectedText(align) {
    const normalizedAlign = normalizeComposeRichTextAlign(align);
    if (!activeFixedTextKey || !normalizedAlign) return false;
    const target = editableKeyMap[activeFixedTextKey];
    if (!target) return false;
    const selectedRange = getRestoredSelectedTextRange(target);
    if (!selectedRange) {
      updateFixedTextAlign(activeFixedTextKey, normalizedAlign);
      return true;
    }

    const fragment = document.createDocumentFragment();
    fragment.append(selectedRange.extractContents());
    const span = createComposeAlignSpan(normalizedAlign, fragment);
    if (!span) return false;
    selectedRange.insertNode(span);

    const selection = window.getSelection();
    if (selection && span.isConnected) {
      const nextRange = document.createRange();
      nextRange.selectNode(span);
      selection.removeAllRanges();
      selection.addRange(nextRange);
      savedTextSelectionRange = nextRange.cloneRange();
    }
    persistEditableDraftValue(target);
    syncComposeTextTray();
    return true;
  }

  function setComposeRadioValue(name, value) {
    composeRoot.querySelectorAll(`input[name="${name}"]`).forEach((input) => {
      input.checked = input.value === value;
      const option = input.closest('.template-thumb, .color-chip');
      option?.classList.toggle('is-active', input.checked);
    });
  }

  function restoreComposeStandardFiles(snapshot) {
    const files = snapshot.standardFiles || {};
    const slotInputIds = {
      primary: 'imageInputPrimary',
      secondary: 'imageInputSecondary',
      accent: 'imageInputAccent',
      detail: 'imageInputDetail',
    };
    Object.entries(slotInputIds).forEach(([stateKey, inputId]) => {
      selectedFiles[stateKey] = createComposeFileState(files[stateKey]);
      previewUrls[inputId] = selectedFiles[stateKey].file || '';
      setPreviewImage(inputId);
      updateSlotPosition(inputId);
    });
  }

  function restoreComposeEditableContent(snapshot) {
    COMPOSE_TEXT_FIELD_KEYS.forEach((fieldKey) => {
      const element = editableKeyMap[fieldKey];
      if (!element) return;
      const richMarkup = sanitizeComposeRichTextMarkup(snapshot.richTexts?.[fieldKey] || '');
      if (richMarkup) {
        element.innerHTML = richMarkup;
      } else {
        element.textContent = normalizeEditableValue(element, snapshot[fieldKey] || composePreviewDefaults[fieldKey] || '');
      }
      element.dataset.previousValue = getEditableText(element);
    });
  }

  function restoreComposeCustomLayout(snapshot) {
    const layout = snapshot.customLayout || {};
    customLayoutState.options = normalizePage8Options(layout);
    customLayoutState.imageBoxes = normalizePage8ImageBoxes(layout);
    customLayoutState.textBoxes = normalizePage8TextBoxes(layout, snapshot);
    customLayoutState.selectedId = null;
    renderCustomCanvas();
  }

  function restoreComposeHistorySnapshot(snapshot) {
    const nextDraft = createComposeWorkingDraft(snapshot);
    suppressComposeHistory = true;
    try {
      uiState.composeWorkingDraft = nextDraft;
      uiState.composeTemplateId = nextDraft.templateId;
      uiState.composeBackgroundColor = nextDraft.backgroundColor;
      fixedLayoutState = createComposeFixedLayoutState(nextDraft.fixedLayout, nextDraft.templateId);
      setComposeRadioValue('templateId', nextDraft.templateId);
      setComposeRadioValue('backgroundColor', nextDraft.backgroundColor);
      restoreComposeStandardFiles(nextDraft);
      restoreComposeEditableContent(nextDraft);
      if (composeSheet) {
        composeSheet.style.setProperty('--sheet-bg', nextDraft.backgroundColor);
        setPreviewTemplate(nextDraft.templateId);
        if (nextDraft.templateId === 'page8') {
          restoreComposeCustomLayout(nextDraft);
        } else {
          applyFixedTemplateLayout(nextDraft.templateId);
          restoreComposeEditableContent(nextDraft);
          applyComposeTextStyles();
        }
      }
      pretextComposeHost?.style.setProperty('background', nextDraft.backgroundColor);
      activeComposeBridge?.setBackgroundColor?.(nextDraft.backgroundColor);
      markComposeImageDirty();
    } finally {
      suppressComposeHistory = false;
      syncComposeHistoryButtons();
      syncComposeTextTray();
    }
  }

  function undoComposeHistory() {
    const entry = composeUndoStack.pop();
    if (!entry) return;
    const currentSnapshot = getComposeHistorySnapshot();
    composeRedoStack.push({
      key: getComposeHistorySnapshotKey(currentSnapshot),
      snapshot: currentSnapshot,
    });
    restoreComposeHistorySnapshot(entry.snapshot);
  }

  function redoComposeHistory() {
    const entry = composeRedoStack.pop();
    if (!entry) return;
    const currentSnapshot = getComposeHistorySnapshot();
    composeUndoStack.push({
      key: getComposeHistorySnapshotKey(currentSnapshot),
      snapshot: currentSnapshot,
    });
    restoreComposeHistorySnapshot(entry.snapshot);
  }

  function insertPlainText(element, text) {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      element.append(document.createTextNode(text));
      placeCaretAtEnd(element);
      return;
    }

    const range = selection.getRangeAt(0);
    range.deleteContents();
    const node = document.createTextNode(text);
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function setPreviewMode(enabled) {
    if (!composePage || !previewToggle) return;
    composePage.classList.toggle('is-preview-mode', enabled);
    previewToggle.textContent = enabled ? 'back' : 'preview';
    previewToggle.setAttribute('aria-pressed', String(enabled));
    editables.forEach((element) => {
      element.setAttribute('contenteditable', enabled ? 'false' : 'true');
      if (enabled) {
        element.blur();
      }
    });
    if (composeSheet?.dataset.template === 'page8') {
      renderCustomCanvas();
    } else if (composeSheet?.dataset.template) {
      applyFixedTemplateLayout(composeSheet.dataset.template);
    }
  }

  function getEditableValue(name) {
    const target = editableKeyMap[name] || document.querySelector(`[data-editable="${name}"]`);
    if (!target) return '';
    if (target.style.display === 'none') {
      return '';
    }
    return getEditableText(target).replace(/\r/g, '').trim();
  }

  function getEditableRichTextValue(name) {
    const target = editableKeyMap[name] || document.querySelector(`[data-editable="${name}"]`);
    if (!target || target.style.display === 'none') return '';
    return getEditableRichTextHtml(target);
  }

  function getComposeRichTextSnapshot(source = {}) {
    return COMPOSE_TEXT_FIELD_KEYS.reduce((next, fieldKey) => {
      next[fieldKey] = getEditableRichTextValue(fieldKey) || source[fieldKey] || '';
      return next;
    }, {});
  }

  function getFixedTemplateLiveValues(source = {}) {
    const templateId = source.templateId || composeSheet?.dataset.template;
    if (!templateId || templateId === 'page8') {
      return {};
    }
    const layout = getFixedTemplateLayout(templateId);
    if (!layout) {
      return {};
    }
    return layout.texts.reduce((values, block) => {
      const element = editableKeyMap[block.fieldKey];
      if (!element) return values;
      values[block.fieldKey] = getEditableText(element).replace(/\r/g, '').trim();
      return values;
    }, {});
  }

  function buildComposeRenderValues(snapshot) {
    const source = snapshot || uiState.composeWorkingDraft || composeDraft || {};
    const fixedLiveValues = getFixedTemplateLiveValues(source);
    const visibleText = Object.prototype.hasOwnProperty.call(fixedLiveValues, 'text')
      ? fixedLiveValues.text
      : getEditableValue('text');
    const visibleHeadline = Object.prototype.hasOwnProperty.call(fixedLiveValues, 'headline')
      ? fixedLiveValues.headline
      : getEditableValue('headline');
    const headline = visibleText || visibleHeadline || source.headline || composePreviewDefaults.headline;
    const richTexts = getComposeRichTextSnapshot(source.richTexts);
    if (richTexts.text) {
      richTexts.headline = richTexts.text;
    }
    return {
      templateId: source.templateId,
      backgroundColor: source.backgroundColor,
      text: visibleText || source.text || headline,
      headline,
      subhead: fixedLiveValues.subhead || getEditableValue('subhead') || source.subhead,
      text2: fixedLiveValues.text2 || getEditableValue('text2') || source.text2,
      text3: fixedLiveValues.text3 || getEditableValue('text3') || source.text3,
      intro: fixedLiveValues.intro || getEditableValue('intro') || source.intro,
      body: fixedLiveValues.body || getEditableValue('body') || source.body,
      date: fixedLiveValues.date || getEditableValue('date') || source.date,
      editor: fixedLiveValues.editor || getEditableValue('editor') || source.editor,
      textStyles: source.textStyles,
      richTexts,
      fixedLayout: source.fixedLayout,
      customLayout: source.customLayout,
    };
  }

  function getFixedTextRenderScale() {
    if (composeSheet?.dataset.template === 'page8') {
      return 1;
    }
    const frameWidth = composeFrame?.getBoundingClientRect().width || 0;
    return frameWidth > 0 ? 1240 / frameWidth : 1;
  }

  async function renderCurrentComposeImage(draftSnapshot, values, options = {}) {
    const allowCanvasFallback = Boolean(options.allowCanvasFallback);
    if (composeFrame && composeStage === 'edit') {
      try {
        const captured = await captureComposeFrameToDataUrl(composeFrame);
        if (captured) return captured;
      } catch (error) {
        console.warn('DOM capture failed. Image was not saved from canvas fallback.', error);
      }
    }
    if (!allowCanvasFallback) {
      return '';
    }
    return renderComposeTemplate(values, draftSnapshot.standardFiles, {
      fixedTextRenderScale: getFixedTextRenderScale(),
    });
  }

  async function prepareComposeImageData(draftSnapshot = null, values = null) {
    if (!uiState.composePreparedImageDirty && uiState.composePreparedImageData) {
      return uiState.composePreparedImageData;
    }
    if (composeStage !== 'edit') {
      return uiState.composePreparedImageData || '';
    }
    const nextDraftSnapshot = draftSnapshot || await finalizeComposeDraftSnapshot();
    const nextValues = values || buildComposeRenderValues(nextDraftSnapshot);
    const imageData = await renderCurrentComposeImage(nextDraftSnapshot, nextValues);
    if (!imageData) return '';
    uiState.composePreparedImageData = imageData;
    uiState.composePreparedImageDirty = false;
    return imageData;
  }

  function syncVisibleComposeEditables() {
    editables.forEach((element) => {
      if (element.style.display === 'none') return;
      clampEditable(element);
    });
  }

  function waitForComposeFrame() {
    return new Promise((resolve) => {
      window.requestAnimationFrame(() => resolve());
    });
  }

  async function finalizeComposeDraftSnapshot(options = {}) {
    suppressComposeImageDirty = true;
    try {
      syncVisibleComposeEditables();
      buildComposeDraftSnapshot(options);
      await waitForComposeFrame();
      syncVisibleComposeEditables();
      return buildComposeDraftSnapshot(options);
    } finally {
      suppressComposeImageDirty = false;
    }
  }

  function setPreviewBackground() {
    const checked = composeRoot.querySelector('input[name="backgroundColor"]:checked');
    const nextBackground = '#ffffff';
    uiState.composeBackgroundColor = nextBackground;
    persistComposeDraft({ backgroundColor: nextBackground });
    pretextComposeHost?.style.setProperty('background', nextBackground);
    activeComposeBridge?.setBackgroundColor?.(nextBackground);
    if (!composeSheet) {
      composeRoot.querySelectorAll('.color-chip').forEach((chip) => {
        const input = chip.querySelector('input[name="backgroundColor"]');
        chip.classList.toggle('is-active', Boolean(input?.checked));
      });
      return;
    }
    composeSheet.style.setProperty('--sheet-bg', nextBackground);
    composeRoot.querySelectorAll('.color-chip').forEach((chip) => {
      const input = chip.querySelector('input[name="backgroundColor"]');
      chip.classList.toggle('is-active', Boolean(input?.checked));
    });
  }

  function setPreviewTemplate(templateId) {
    const nextTemplateId = templateId || DEFAULT_COMPOSE_TEMPLATE;
    const currentTemplateId = composeSheet?.dataset.template || (pretextComposeHost ? 'page8' : null);
    const isSwitchingSelectMode = composeStage === 'select'
      && currentTemplateId
      && ((currentTemplateId === 'page8') !== (nextTemplateId === 'page8'));
    const isSwitchingPage8Layout = composeStage === 'edit'
      && currentTemplateId
      && currentTemplateId !== nextTemplateId
      && (currentTemplateId === 'page8' || nextTemplateId === 'page8');
    uiState.composeTemplateId = nextTemplateId;
    ensureFixedLayoutState(nextTemplateId);
    persistComposeDraft({
      templateId: nextTemplateId,
      fixedLayout: createComposeFixedLayoutState(fixedLayoutState, nextTemplateId),
    });
    if (isSwitchingSelectMode) {
      render();
      return;
    }
    if (isSwitchingPage8Layout) {
      render();
      return;
    }
    if (!composeSheet) {
      composeRoot.querySelectorAll('.template-thumb').forEach((card) => {
        const input = card.querySelector('input[name="templateId"]');
        card.classList.toggle('is-active', input?.value === nextTemplateId);
      });
      composeRoot.querySelectorAll('[data-compose-mode]').forEach((button) => {
        button.classList.toggle('is-active', button.dataset.composeMode === (nextTemplateId === 'page8' ? 'custom' : 'template'));
        button.setAttribute('aria-pressed', String(button.classList.contains('is-active')));
      });
      if (pretextComposeHost && nextTemplateId !== 'page8') {
        render();
      }
      return;
    }
    composeSheet.dataset.template = nextTemplateId;
    composeRoot.querySelectorAll('.template-thumb').forEach((card) => {
      const input = card.querySelector('input[name="templateId"]');
      card.classList.toggle('is-active', input?.value === nextTemplateId);
    });
    const isCustomTemplate = nextTemplateId === 'page8';
    composeRoot.querySelectorAll('[data-compose-mode]').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.composeMode === (isCustomTemplate ? 'custom' : 'template'));
      button.setAttribute('aria-pressed', String(button.classList.contains('is-active')));
    });
    if (customTemplateControls) {
      customTemplateControls.hidden = true;
    }
    composeSheet.classList.toggle('compose-sheet--custom', isCustomTemplate);
    if (isCustomTemplate) {
      closeComposeTextTray();
    }
    applyCustomLayout();
  }

  function focusSelectedTemplateCard(templateId) {
    const selectedRadio = composeRoot.querySelector(`input[name="templateId"][value="${templateId}"]`);
    selectedRadio?.closest('.template-thumb')?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  }

  function focusSelectedColorCard(colorValue) {
    const selectedRadio = composeRoot.querySelector(`input[name="backgroundColor"][value="${colorValue}"]`);
    selectedRadio?.closest('.color-chip')?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  }

  function setPreviewImage(inputId) {
    const slotImage = document.querySelector(`[data-slot-image="${inputId}"]`);
    const slotPlaceholder = document.querySelector(`[data-slot-placeholder="${inputId}"]`);
    const removeButton = document.querySelector(`[data-slot-remove="${inputId}"]`);
    if (!slotImage || !slotPlaceholder) return;

    if (previewUrls[inputId]) {
      slotImage.style.backgroundImage = `url("${previewUrls[inputId]}")`;
      slotImage.hidden = false;
      slotPlaceholder.hidden = true;
      if (removeButton) {
        removeButton.hidden = false;
      }
      return;
    }

    slotImage.style.backgroundImage = '';
    slotImage.hidden = true;
    slotPlaceholder.hidden = false;
    if (removeButton) {
      removeButton.hidden = true;
    }
  }

  function clampCustomBoxRect(box, minimums) {
    const width = Math.min(PAGE8_BOUNDS.width, Math.max(minimums.width, box.width));
    const height = Math.min(PAGE8_BOUNDS.height, Math.max(minimums.height, box.height));
    return {
      ...box,
      x: Math.min(PAGE8_BOUNDS.x + PAGE8_BOUNDS.width - width, Math.max(PAGE8_BOUNDS.x, snapPage8Value(box.x))),
      y: Math.min(PAGE8_BOUNDS.y + PAGE8_BOUNDS.height - height, Math.max(PAGE8_BOUNDS.y, snapPage8Value(box.y))),
      width: snapPage8Value(width),
      height: snapPage8Value(height),
    };
  }

  function rectsOverlap(a, b, padding = 0.02) {
    return !(
      a.x + a.width + padding <= b.x ||
      b.x + b.width + padding <= a.x ||
      a.y + a.height + padding <= b.y ||
      b.y + b.height + padding <= a.y
    );
  }

  function getCustomRect(item) {
    return { x: item.x, y: item.y, width: item.width, height: item.height };
  }

  function getCustomBlockers(itemId, options = {}) {
    const { ignoreText = false, ignoreImages = false } = options;
    return [
      ...(!ignoreImages
        ? customLayoutState.imageBoxes.filter((item) => item.id !== itemId).map((item) => getCustomRect(item))
        : []),
      ...(!ignoreText
        ? customLayoutState.textBoxes.filter((item) => item.id !== itemId).map((item) => getCustomRect(item))
        : []),
    ];
  }

  function isSafeCustomPosition(candidate, itemId, options = {}) {
    const rect = getCustomRect(candidate);
    const blockers = getCustomBlockers(itemId, options);
    return !blockers.some((blocker) => rectsOverlap(rect, blocker));
  }

  function findNearestSafeBoxPosition(item, itemId, minimums, options = {}) {
    const original = clampCustomBoxRect({ ...item }, minimums);
    if (isSafeCustomPosition(original, itemId, options)) {
      return original;
    }

    const directions = [
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0],
      [1, -1],
      [1, 1],
      [-1, 1],
      [-1, -1],
    ];
    const step = PAGE8_GRID * 2;

    for (let ring = 1; ring <= 18; ring += 1) {
      for (const [dx, dy] of directions) {
        const candidate = clampCustomBoxRect({
          ...original,
          x: original.x + (dx * step * ring),
          y: original.y + (dy * step * ring),
        }, minimums);
        if (isSafeCustomPosition(candidate, itemId, options)) {
          return candidate;
        }
      }
    }

    for (let y = PAGE8_BOUNDS.y; y <= PAGE8_BOUNDS.y + PAGE8_BOUNDS.height - original.height; y += step) {
      for (let x = PAGE8_BOUNDS.x; x <= PAGE8_BOUNDS.x + PAGE8_BOUNDS.width - original.width; x += step) {
        const candidate = clampCustomBoxRect({ ...original, x, y }, minimums);
        if (isSafeCustomPosition(candidate, itemId, options)) {
          return candidate;
        }
      }
    }

    return original;
  }

  function carveHorizontalSlots(target, blockers, padding = 0.018) {
    const targetTop = target.y - padding;
    const targetBottom = target.y + target.height + padding;
    const boundsLeft = PAGE8_BOUNDS.x;
    const boundsRight = PAGE8_BOUNDS.x + PAGE8_BOUNDS.width;
    let slots = [{ left: boundsLeft, right: boundsRight }];

    blockers.forEach((blocker) => {
      const blockerTop = blocker.y - padding;
      const blockerBottom = blocker.y + blocker.height + padding;
      if (blockerBottom <= targetTop || blockerTop >= targetBottom) return;
      const blockLeft = Math.max(boundsLeft, blocker.x - padding);
      const blockRight = Math.min(boundsRight, blocker.x + blocker.width + padding);
      slots = slots.flatMap((slot) => {
        if (blockRight <= slot.left || blockLeft >= slot.right) {
          return [slot];
        }
        const next = [];
        if (blockLeft > slot.left) {
          next.push({ left: slot.left, right: blockLeft });
        }
        if (blockRight < slot.right) {
          next.push({ left: blockRight, right: slot.right });
        }
        return next;
      });
    });

    return slots.filter((slot) => (slot.right - slot.left) >= target.width);
  }

  function findSafeTextPosition(textItem, blockers) {
    const original = clampCustomBoxRect({ ...textItem }, PAGE8_MIN_TEXT_SIZE);
    const candidateYs = [];
    for (let ring = 0; ring <= 24; ring += 1) {
      const upward = snapPage8Value(original.y - (ring * PAGE8_GRID));
      const downward = snapPage8Value(original.y + (ring * PAGE8_GRID));
      if (upward >= PAGE8_BOUNDS.y) candidateYs.push(upward);
      if (downward <= PAGE8_BOUNDS.y + PAGE8_BOUNDS.height - original.height && downward !== upward) {
        candidateYs.push(downward);
      }
    }

    let bestCandidate = original;
    let bestScore = Number.POSITIVE_INFINITY;

    candidateYs.forEach((candidateY) => {
      const baseTarget = {
        ...original,
        y: candidateY,
      };
      const slots = carveHorizontalSlots(baseTarget, blockers);
      slots.forEach((slot) => {
        const minX = slot.left;
        const maxX = slot.right - original.width;
        const clampedX = snapPage8Value(Math.min(maxX, Math.max(minX, original.x)));
        const candidate = clampCustomBoxRect({
          ...original,
          x: clampedX,
          y: candidateY,
        }, PAGE8_MIN_TEXT_SIZE);
        if (blockers.some((blocker) => rectsOverlap(getCustomRect(candidate), blocker))) return;
        const dx = Math.abs(candidate.x - original.x);
        const dy = Math.abs(candidate.y - original.y);
        const score = (dy * 2) + dx;
        if (score < bestScore) {
          bestScore = score;
          bestCandidate = candidate;
        }
      });
    });

    return bestCandidate;
  }

  function reflowTextBoxes(movedId) {
    const movedRecord = getCustomItemRecord(movedId);
    if (!movedRecord || movedRecord.type !== 'image') return;

    customLayoutState.textBoxes = customLayoutState.textBoxes.map((textBox) => {
      const blockers = [
        ...customLayoutState.imageBoxes.filter((item) => item.id !== textBox.id).map((item) => getCustomRect(item)),
        ...customLayoutState.textBoxes.filter((item) => item.id !== textBox.id).map((item) => getCustomRect(item)),
      ];
      return findSafeTextPosition(textBox, blockers);
    });
  }

  function getTextBlockers(itemId) {
    return [
      ...customLayoutState.imageBoxes.filter((item) => item.id !== itemId).map((item) => getCustomRect(item)),
      ...customLayoutState.textBoxes.filter((item) => item.id !== itemId).map((item) => getCustomRect(item)),
    ];
  }

  function getCustomItemRecord(itemId) {
    const imageIndex = customLayoutState.imageBoxes.findIndex((box) => box.id === itemId);
    if (imageIndex >= 0) {
      return { type: 'image', collection: customLayoutState.imageBoxes, index: imageIndex, item: customLayoutState.imageBoxes[imageIndex] };
    }
    const textIndex = customLayoutState.textBoxes.findIndex((box) => box.id === itemId);
    if (textIndex >= 0) {
      return { type: 'text', collection: customLayoutState.textBoxes, index: textIndex, item: customLayoutState.textBoxes[textIndex] };
    }
    return null;
  }

  function getCustomItemMinimums(type) {
    return type === 'image' ? PAGE8_MIN_IMAGE_SIZE : PAGE8_MIN_TEXT_SIZE;
  }

  function formatCustomMeasure(value) {
    return `${Math.round(value * 100)}%`;
  }

  function fitCustomTextBoxToContent(itemId, options = {}) {
    const { rerender = false } = options;
    if (!composeFrame || !customCanvas) return;
    const record = itemId ? getCustomItemRecord(itemId) : null;
    if (!record || record.type !== 'text') return;
    const liveText = customCanvas.querySelector(`[data-custom-text="${itemId}"]`);
    if (!liveText) return;
    const frameRect = composeFrame.getBoundingClientRect();
    if (!frameRect.height) return;
    const nextHeight = Math.max(
      PAGE8_MIN_TEXT_SIZE.height,
      snapPage8ValueUp((liveText.scrollHeight + 8) / frameRect.height),
    );
    if (Math.abs(nextHeight - record.item.height) < (PAGE8_GRID / 2)) return;
    record.item.height = nextHeight;
    Object.assign(record.item, clampCustomBoxRect(record.item, PAGE8_MIN_TEXT_SIZE));
    Object.assign(record.item, findSafeTextPosition(record.item, getTextBlockers(itemId)));
    if (rerender) {
      renderCustomCanvas();
      return;
    }
    applyCustomItemRect(itemId, record.item);
    renderCustomInspector();
  }

  function syncCustomSelection() {
    if (!customCanvas) return;
    customCanvas.querySelectorAll('[data-custom-item]').forEach((item) => {
      item.classList.toggle('is-selected', item.dataset.customItem === customLayoutState.selectedId);
    });
  }

  function applyCustomItemRect(itemId, rectSource) {
    const target = customCanvas?.querySelector(`[data-custom-item="${itemId}"]`);
    if (!target) return;
    const rect = page8RectToPercent(rectSource);
    target.style.left = rect.left;
    target.style.top = rect.top;
    target.style.width = rect.width;
    target.style.height = rect.height;
  }

  function applyAllCustomItemRects() {
    [
      ...customLayoutState.imageBoxes,
      ...customLayoutState.textBoxes,
    ].forEach((item) => {
      applyCustomItemRect(item.id, item);
    });
  }

  function selectCustomItem(itemId, options = {}) {
    const { rerender = false } = options;
    customLayoutState.selectedId = itemId;
    if (rerender && composeSheet?.dataset.template === 'page8') {
      renderCustomCanvas();
      return;
    }
    syncCustomSelection();
    renderCustomInspector();
  }

  function renderCustomInspector() {
    if (!customInspector || composeSheet?.dataset.template !== 'page8') return;
    const record = customLayoutState.selectedId ? getCustomItemRecord(customLayoutState.selectedId) : null;
    if (!record) {
      customInspector.innerHTML = `
        <p class="compose-custom-inspector__title">Selection</p>
        <p class="compose-custom-inspector__note">ボックスを選ぶと、ここで内容や見た目を調整できます。</p>
      `;
      return;
    }

    if (record.type === 'image') {
      const imageState = getCustomImageState(record.item.id);
      const hasImage = Boolean(imageState.previewUrl || imageState.file);
      const zoomValue = Math.max(1, Number(imageState.position?.zoom) || 1);
      customInspector.innerHTML = `
        <p class="compose-custom-inspector__title">Image Box</p>
        <p class="compose-custom-inspector__note">${customLayoutState.imageMode === 'crop' ? 'Crop 中は画像面をドラッグして見せ方を調整します。' : 'Frame 中はボックス自体を動かします。Crop に切り替えると画像だけを動かせます。'}</p>
        <div class="compose-custom-inspector__meta">
          <span>W ${formatCustomMeasure(record.item.width)}</span>
          <span>H ${formatCustomMeasure(record.item.height)}</span>
        </div>
        <div class="compose-custom-inspector__field">
          <span>Mode</span>
          <div class="compose-custom-inspector__segmented compose-custom-inspector__segmented--dual">
            <button type="button" data-custom-image-mode="frame" class="${customLayoutState.imageMode === 'frame' ? 'is-active' : ''}">Frame</button>
            <button type="button" data-custom-image-mode="crop" class="${customLayoutState.imageMode === 'crop' ? 'is-active' : ''}" ${hasImage ? '' : 'disabled'}>Crop</button>
          </div>
        </div>
        <label class="compose-custom-inspector__field">
          <span>Zoom</span>
          <input class="compose-custom-inspector__range" data-custom-control="zoom" type="range" min="1" max="3" step="0.01" value="${zoomValue}" ${hasImage ? '' : 'disabled'} />
        </label>
        <div class="compose-custom-inspector__segmented compose-custom-inspector__segmented--dual">
          <button type="button" data-custom-control="replace-image">${hasImage ? 'Replace' : 'Upload'}</button>
          <button type="button" data-custom-control="delete">Delete</button>
        </div>
      `;
      customInspector.querySelectorAll('[data-custom-image-mode]').forEach((button) => {
        button.addEventListener('click', () => {
          if (button.hasAttribute('disabled')) return;
          customLayoutState.imageMode = button.dataset.customImageMode === 'crop' ? 'crop' : 'frame';
          renderCustomInspector();
        });
      });
      customInspector.querySelector('[data-custom-control="zoom"]')?.addEventListener('input', (event) => {
        imageState.position.zoom = Math.max(1, Number(event.target.value) || 1);
        renderCustomCanvas();
      });
      customInspector.querySelector('[data-custom-control="replace-image"]')?.addEventListener('click', () => {
        document.getElementById(`custom-image-${record.item.id}`)?.click();
      });
    } else {
      customInspector.innerHTML = `
      <p class="compose-custom-inspector__title">Text Box</p>
      <p class="compose-custom-inspector__note">Title / Body のプリセットを起点にして、細部は個別調整できます。</p>
      <div class="compose-custom-inspector__meta">
        <span>W ${formatCustomMeasure(record.item.width)}</span>
        <span>H ${formatCustomMeasure(record.item.height)}</span>
      </div>
      <div class="compose-custom-inspector__field">
        <span>Preset</span>
        <div class="compose-custom-inspector__segmented compose-custom-inspector__segmented--dual">
          <button type="button" data-custom-preset="title" class="${record.item.kind === 'title' ? 'is-active' : ''}">Title</button>
          <button type="button" data-custom-preset="body" class="${record.item.kind === 'body' ? 'is-active' : ''}">Body</button>
        </div>
      </div>
      <label class="compose-custom-inspector__field">
        <span>Text</span>
        <textarea class="compose-custom-inspector__textarea" data-custom-control="text">${escapeHtml(record.item.text)}</textarea>
      </label>
      <label class="compose-custom-inspector__field">
        <span>Size</span>
        <input class="compose-custom-inspector__range" data-custom-control="fontSize" type="range" min="14" max="54" value="${Math.round(record.item.fontSize * 520)}" />
      </label>
      <label class="compose-custom-inspector__field">
        <span>Leading</span>
        <input class="compose-custom-inspector__range" data-custom-control="lineHeight" type="range" min="100" max="220" step="1" value="${Math.round(record.item.lineHeight * 100)}" />
      </label>
      <label class="compose-custom-inspector__field">
        <span>Padding</span>
        <input class="compose-custom-inspector__range" data-custom-control="padding" type="range" min="4" max="40" step="1" value="${Math.round(record.item.padding * 1000)}" />
      </label>
      <label class="compose-custom-inspector__field">
        <span>Weight</span>
        <input class="compose-custom-inspector__range" data-custom-control="weight" type="range" min="400" max="700" step="100" value="${record.item.weight}" />
      </label>
      <div class="compose-custom-inspector__field">
        <span>Align</span>
        <div class="compose-custom-inspector__segmented compose-custom-inspector__segmented--align">
          <button type="button" data-custom-align="left" class="${record.item.align === 'left' ? 'is-active' : ''}" aria-label="Align left">${getIcon('alignLeft')}</button>
          <button type="button" data-custom-align="center" class="${record.item.align === 'center' ? 'is-active' : ''}" aria-label="Align center">${getIcon('alignCenter')}</button>
          <button type="button" data-custom-align="right" class="${record.item.align === 'right' ? 'is-active' : ''}" aria-label="Align right">${getIcon('alignRight')}</button>
        </div>
      </div>
      <div class="compose-custom-inspector__field">
        <span>Typeface</span>
        <div class="compose-custom-inspector__segmented compose-custom-inspector__segmented--dual">
          <button type="button" data-custom-family="sans" class="${record.item.family === 'sans' ? 'is-active' : ''}">Sans</button>
          <button type="button" data-custom-family="serif" class="${record.item.family === 'serif' ? 'is-active' : ''}">Serif</button>
        </div>
      </div>
      <div class="compose-custom-inspector__segmented compose-custom-inspector__segmented--single">
        <button type="button" data-custom-control="delete">Delete</button>
      </div>
    `;
      const textArea = customInspector.querySelector('[data-custom-control="text"]');
      textArea?.addEventListener('focus', (event) => {
        const nextRecord = customLayoutState.selectedId ? getCustomItemRecord(customLayoutState.selectedId) : null;
        if (!nextRecord || nextRecord.type !== 'text') return;
        if (nextRecord.item.isDefaultText && nextRecord.item.text.trim().toLowerCase() === 'text') {
          nextRecord.item.text = '';
          nextRecord.item.isDefaultText = false;
          event.target.value = '';
          const liveText = customCanvas?.querySelector(`[data-custom-text="${nextRecord.item.id}"]`);
          if (liveText) {
            liveText.textContent = '';
          }
        }
      });
      textArea?.addEventListener('input', (event) => {
        const nextRecord = customLayoutState.selectedId ? getCustomItemRecord(customLayoutState.selectedId) : null;
        if (!nextRecord || nextRecord.type !== 'text') return;
        nextRecord.item.text = event.target.value.replace(/\r/g, '');
        nextRecord.item.isDefaultText = false;
        const liveText = customCanvas?.querySelector(`[data-custom-text="${nextRecord.item.id}"]`);
        if (liveText && liveText !== document.activeElement) {
          liveText.textContent = nextRecord.item.text;
        }
        fitCustomTextBoxToContent(nextRecord.item.id);
      });

      customInspector.querySelectorAll('[data-custom-preset]').forEach((button) => {
        button.addEventListener('click', () => {
          const nextRecord = customLayoutState.selectedId ? getCustomItemRecord(customLayoutState.selectedId) : null;
          if (!nextRecord || nextRecord.type !== 'text') return;
          applyCustomTextPreset(nextRecord.item, button.dataset.customPreset === 'title' ? 'title' : 'body');
          renderCustomCanvas();
          fitCustomTextBoxToContent(nextRecord.item.id, { rerender: true });
        });
      });

      customInspector.querySelector('[data-custom-control="fontSize"]')?.addEventListener('input', (event) => {
        const nextRecord = customLayoutState.selectedId ? getCustomItemRecord(customLayoutState.selectedId) : null;
        if (!nextRecord || nextRecord.type !== 'text') return;
        nextRecord.item.fontSize = Number(event.target.value) / 520;
        renderCustomCanvas();
        fitCustomTextBoxToContent(nextRecord.item.id, { rerender: true });
      });

      customInspector.querySelector('[data-custom-control="lineHeight"]')?.addEventListener('input', (event) => {
        const nextRecord = customLayoutState.selectedId ? getCustomItemRecord(customLayoutState.selectedId) : null;
        if (!nextRecord || nextRecord.type !== 'text') return;
        nextRecord.item.lineHeight = Number(event.target.value) / 100;
        renderCustomCanvas();
        fitCustomTextBoxToContent(nextRecord.item.id, { rerender: true });
      });

      customInspector.querySelector('[data-custom-control="padding"]')?.addEventListener('input', (event) => {
        const nextRecord = customLayoutState.selectedId ? getCustomItemRecord(customLayoutState.selectedId) : null;
        if (!nextRecord || nextRecord.type !== 'text') return;
        nextRecord.item.padding = Number(event.target.value) / 1000;
        renderCustomCanvas();
        fitCustomTextBoxToContent(nextRecord.item.id, { rerender: true });
      });

      customInspector.querySelector('[data-custom-control="weight"]')?.addEventListener('input', (event) => {
        const nextRecord = customLayoutState.selectedId ? getCustomItemRecord(customLayoutState.selectedId) : null;
        if (!nextRecord || nextRecord.type !== 'text') return;
        nextRecord.item.weight = Number(event.target.value);
        renderCustomCanvas();
        fitCustomTextBoxToContent(nextRecord.item.id, { rerender: true });
      });

      customInspector.querySelectorAll('[data-custom-align]').forEach((button) => {
        button.addEventListener('click', () => {
          const nextRecord = customLayoutState.selectedId ? getCustomItemRecord(customLayoutState.selectedId) : null;
          if (!nextRecord || nextRecord.type !== 'text') return;
          nextRecord.item.align = button.dataset.customAlign || 'left';
          renderCustomCanvas();
        });
      });

      customInspector.querySelectorAll('[data-custom-family]').forEach((button) => {
        button.addEventListener('click', () => {
          const nextRecord = customLayoutState.selectedId ? getCustomItemRecord(customLayoutState.selectedId) : null;
          if (!nextRecord || nextRecord.type !== 'text') return;
          nextRecord.item.family = button.dataset.customFamily === 'serif' ? 'serif' : 'sans';
          nextRecord.item.kind = nextRecord.item.family === 'serif' ? 'title' : 'body';
          nextRecord.item.weight = nextRecord.item.family === 'serif'
            ? Math.max(500, nextRecord.item.weight)
            : Math.min(600, nextRecord.item.weight);
          renderCustomCanvas();
          fitCustomTextBoxToContent(nextRecord.item.id, { rerender: true });
        });
      });
    }

    customInspector.querySelector('[data-custom-control="delete"]')?.addEventListener('click', () => {
      const itemId = customLayoutState.selectedId;
      const nextRecord = itemId ? getCustomItemRecord(itemId) : null;
      if (!nextRecord) return;
      nextRecord.collection.splice(nextRecord.index, 1);
      if (nextRecord.type === 'image') {
        const state = customImageFiles[itemId];
        if (state?.previewUrl) {
          URL.revokeObjectURL(state.previewUrl);
        }
        delete customImageFiles[itemId];
        reflowTextBoxes(itemId);
      }
      customLayoutState.selectedId = null;
      renderCustomCanvas();
    });
  }

  function renderCustomCanvas() {
    if (!customCanvas || !composeSheet) return;
    const isCustomTemplate = composeSheet.dataset.template === 'page8';
    const interactive = composeStage === 'edit' && !composePage?.classList.contains('is-preview-mode');
    customCanvas.hidden = !isCustomTemplate;
    if (!isCustomTemplate) {
      customCanvas.innerHTML = '';
      renderCustomInspector();
      return;
    }

    const itemIds = [
      ...customLayoutState.imageBoxes.map((box) => box.id),
      ...customLayoutState.textBoxes.map((box) => box.id),
    ];
    if (!customLayoutState.selectedId || !itemIds.includes(customLayoutState.selectedId)) {
      customLayoutState.selectedId = itemIds[0] || null;
    }

    const imageMarkup = customLayoutState.imageBoxes.map((box) => {
      const rect = page8RectToPercent(box);
      const state = getCustomImageState(box.id);
      const hasImage = Boolean(state.previewUrl || state.file);
      const imagePosition = state.position || { x: 0.5, y: 0.5, zoom: 1 };
      const selectedClass = `${customLayoutState.selectedId === box.id ? ' is-selected' : ''}${hasImage ? '' : ' is-empty'}`;
      const surfaceMarkup = hasImage
        ? `<img class="compose-custom-item__image" src="${state.previewUrl}" alt="" draggable="false" style="object-position:${(imagePosition.x || 0.5) * 100}% ${(imagePosition.y || 0.5) * 100}%;transform:scale(${Math.max(1, imagePosition.zoom || 1)});" />`
        : `<div class="compose-custom-item__placeholder"><span class="compose-custom-item__plus">${getIcon('compose')}</span></div>`;
      return `
        <div
          class="compose-custom-item compose-custom-item--image${selectedClass}"
          data-custom-item="${box.id}"
          data-custom-type="image"
          style="left:${rect.left};top:${rect.top};width:${rect.width};height:${rect.height};"
        >
          ${interactive ? `<input class="field__file" id="custom-image-${box.id}" type="file" accept="image/*" />` : ''}
          ${interactive
            ? `<div class="compose-custom-item__surface compose-custom-item__surface--image" data-custom-surface="${box.id}">${surfaceMarkup}</div>`
            : `<div class="compose-custom-item__surface compose-custom-item__surface--image">${surfaceMarkup}</div>`}
          ${interactive ? `<button class="compose-custom-item__drag" type="button" data-custom-drag="${box.id}" aria-label="move image box">${getIcon('drag')}</button>` : ''}
          ${interactive ? `<button class="compose-custom-item__remove" type="button" data-custom-remove="${box.id}" aria-label="remove image box">&times;</button>` : ''}
          ${interactive ? `<button class="compose-custom-item__resize" type="button" data-custom-resize="${box.id}" aria-label="resize image box"></button>` : ''}
        </div>
      `;
    }).join('');

    const textMarkup = customLayoutState.textBoxes.map((box) => {
      const rect = page8RectToPercent(box);
      const selectedClass = customLayoutState.selectedId === box.id ? ' is-selected' : '';
      return `
        <div
          class="compose-custom-item compose-custom-item--text${selectedClass}"
          data-custom-item="${box.id}"
          data-custom-type="text"
          style="left:${rect.left};top:${rect.top};width:${rect.width};height:${rect.height};"
        >
          <div
            class="compose-custom-item__text"
            data-custom-text="${box.id}"
            contenteditable="${interactive ? 'true' : 'false'}"
            spellcheck="false"
            style="text-align:${box.align};font-size:${Math.max(11, box.fontSize * 520)}px;line-height:${box.lineHeight};padding:${Math.max(4, box.padding * 520)}px;font-family:${box.family === 'serif' ? `'Cormorant Garamond', 'Times New Roman', serif` : `'Noto Sans JP', sans-serif`};font-weight:${box.weight};"
          >${escapeHtml(box.text)}</div>
          ${interactive ? `<button class="compose-custom-item__drag" type="button" data-custom-drag="${box.id}" aria-label="move text box">${getIcon('drag')}</button>` : ''}
          ${interactive ? `<button class="compose-custom-item__remove" type="button" data-custom-remove="${box.id}" aria-label="remove text box">&times;</button>` : ''}
          ${interactive ? `<button class="compose-custom-item__resize" type="button" data-custom-resize="${box.id}" aria-label="resize text box"></button>` : ''}
        </div>
      `;
    }).join('');

    customCanvas.innerHTML = `${imageMarkup}${textMarkup}`;
    renderCustomInspector();

    customCanvas.onpointerdown = (event) => {
      if (event.target !== customCanvas) return;
      customLayoutState.selectedId = null;
      syncCustomSelection();
      renderCustomInspector();
    };

    customCanvas.querySelectorAll('[data-custom-item]').forEach((item) => {
      let dragState = null;

      item.addEventListener('pointerdown', (event) => {
        const itemId = item.dataset.customItem || '';
        const record = getCustomItemRecord(itemId);
        if (!record || !composeFrame) return;
        if (event.target.closest('[data-custom-remove], [data-custom-resize]')) return;
        event.preventDefault();
        const dragHandle = event.target.closest('[data-custom-drag]');
        const textSurface = event.target.closest('[data-custom-text]');
        const imageSurface = event.target.closest('[data-custom-surface]');
        const imageState = record.type === 'image' ? getCustomImageState(itemId) : null;
        selectCustomItem(itemId);
        const frameRect = composeFrame.getBoundingClientRect();
        const hasImage = Boolean(imageState?.previewUrl || imageState?.file);
        const isCropDrag = record.type === 'image'
          && customLayoutState.imageMode === 'crop'
          && hasImage
          && imageSurface
          && !dragHandle;
        dragState = {
          pointerId: event.pointerId,
          itemId,
          mode: isCropDrag ? 'crop-image' : 'move',
          originX: isCropDrag ? (imageState.position.x || 0.5) : record.item.x,
          originY: isCropDrag ? (imageState.position.y || 0.5) : record.item.y,
          startX: event.clientX,
          startY: event.clientY,
          frameWidth: frameRect.width,
          frameHeight: frameRect.height,
          type: record.type,
          zoom: imageState?.position?.zoom || 1,
          targetSurface: record.type === 'image' && !hasImage
            ? imageSurface
            : null,
          targetText: dragHandle ? null : textSurface,
          cropSurface: isCropDrag ? imageSurface : null,
          dragged: false,
        };
        item.setPointerCapture?.(event.pointerId);
      });

      item.addEventListener('pointermove', (event) => {
        if (!dragState || dragState.pointerId !== event.pointerId) return;
        const deltaX = event.clientX - dragState.startX;
        const deltaY = event.clientY - dragState.startY;
        if (!dragState.dragged && Math.hypot(deltaX, deltaY) < 6) return;
        if (!dragState.dragged) {
          pushComposeHistoryCheckpoint();
          composeHistoryGestureActive = true;
          dragState.dragged = true;
        }
        event.preventDefault();
        const record = getCustomItemRecord(dragState.itemId);
        if (!record) return;
        const previousRect = {
          x: record.item.x,
          y: record.item.y,
          width: record.item.width,
          height: record.item.height,
        };
        if (dragState.mode === 'crop-image') {
          const surfaceRect = dragState.cropSurface?.getBoundingClientRect();
          const imageState = getCustomImageState(dragState.itemId);
          const size = imageState.imageSize;
          if (!surfaceRect || !size) return;
          const imageRatio = size.width / size.height;
          const surfaceRatio = surfaceRect.width / surfaceRect.height;
          const renderedWidth = (imageRatio > surfaceRatio ? surfaceRect.height * imageRatio : surfaceRect.width) * dragState.zoom;
          const renderedHeight = (imageRatio > surfaceRatio ? surfaceRect.height : surfaceRect.width / imageRatio) * dragState.zoom;
          const overflowX = Math.max(0, renderedWidth - surfaceRect.width);
          const overflowY = Math.max(0, renderedHeight - surfaceRect.height);
          imageState.position.x = overflowX ? Math.min(1, Math.max(0, dragState.originX - (deltaX / overflowX))) : 0.5;
          imageState.position.y = overflowY ? Math.min(1, Math.max(0, dragState.originY - (deltaY / overflowY))) : 0.5;
          const liveImage = dragState.cropSurface?.querySelector('.compose-custom-item__image');
          if (liveImage) {
            liveImage.style.objectPosition = `${imageState.position.x * 100}% ${imageState.position.y * 100}%`;
          }
        } else {
          record.item.x = dragState.originX + (deltaX / dragState.frameWidth);
          record.item.y = dragState.originY + (deltaY / dragState.frameHeight);
          Object.assign(record.item, clampCustomBoxRect(record.item, getCustomItemMinimums(record.type)));
          const safetyOptions = record.type === 'image' ? { ignoreText: true } : {};
          Object.assign(record.item, findNearestSafeBoxPosition(record.item, record.item.id, getCustomItemMinimums(record.type), safetyOptions));
          if (!isSafeCustomPosition(record.item, record.item.id, safetyOptions)) {
            Object.assign(record.item, previousRect);
          }
          if (record.type === 'image') {
            reflowTextBoxes(record.item.id);
          } else {
            Object.assign(record.item, findSafeTextPosition(record.item, getTextBlockers(record.item.id)));
          }
          renderCustomInspector();
          applyAllCustomItemRects();
        }
      });

      const finishItemDrag = (event) => {
        if (!dragState || dragState.pointerId !== event.pointerId) return;
        const itemId = dragState.itemId;
        const wasDragged = dragState.dragged;
        const openedSurface = dragState.targetSurface;
        const openedText = dragState.targetText;
        dragState = null;
        composeHistoryGestureActive = false;
        item.releasePointerCapture?.(event.pointerId);
        if (wasDragged) return;
        if (openedSurface) {
          document.getElementById(`custom-image-${itemId}`)?.click();
          return;
        }
        if (openedText) {
          openedText.focus();
          placeCaretAtEnd(openedText);
        }
      };

      item.addEventListener('pointerup', finishItemDrag);
      item.addEventListener('pointercancel', finishItemDrag);
    });

    customCanvas.querySelectorAll('[data-custom-remove]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const itemId = button.dataset.customRemove;
        const record = itemId ? getCustomItemRecord(itemId) : null;
        if (!record) return;
        record.collection.splice(record.index, 1);
        if (record.type === 'image') {
          const state = customImageFiles[itemId];
          if (state?.previewUrl) {
            URL.revokeObjectURL(state.previewUrl);
          }
          delete customImageFiles[itemId];
          reflowTextBoxes(itemId);
        }
        customLayoutState.selectedId = null;
        renderCustomCanvas();
      });
    });

    customCanvas.querySelectorAll('[data-custom-text]').forEach((element) => {
      element.addEventListener('beforeinput', (event) => {
        if (event.inputType === 'insertParagraph') {
          insertPlainText(element, '\n');
          event.preventDefault();
        }
      });
      element.addEventListener('focus', () => {
        const itemId = element.dataset.customText;
        const record = itemId ? getCustomItemRecord(itemId) : null;
        if (record?.type === 'text' && record.item.isDefaultText && record.item.text.trim().toLowerCase() === 'text') {
          record.item.text = '';
          record.item.isDefaultText = false;
          element.textContent = '';
        }
        selectCustomItem(element.dataset.customText || '');
      });
      element.addEventListener('input', () => {
        const itemId = element.dataset.customText;
        const record = itemId ? getCustomItemRecord(itemId) : null;
        if (!record) return;
        record.item.text = element.innerText.replace(/\r/g, '');
        record.item.isDefaultText = false;
        const inspectorText = customInspector?.querySelector('[data-custom-control="text"]');
        if (inspectorText && inspectorText !== document.activeElement) {
          inspectorText.value = record.item.text;
        }
        fitCustomTextBoxToContent(record.item.id);
      });
    });

    customCanvas.querySelectorAll('input[id^="custom-image-"]').forEach((input) => {
      input.addEventListener('change', async (event) => {
        const boxId = input.id.replace('custom-image-', '');
        const state = getCustomImageState(boxId);
        const file = event.target.files?.[0] || null;
        if (state.previewUrl) {
          URL.revokeObjectURL(state.previewUrl);
          state.previewUrl = '';
        }
        state.file = file;
        state.position = { x: 0.5, y: 0.5, zoom: 1 };
        state.imageSize = file ? await loadImageSize(file) : null;
        if (file) {
          state.previewUrl = fileToPreviewUrl(file);
        }
        reflowTextBoxes(boxId);
        renderCustomCanvas();
      });
    });

    customCanvas.querySelectorAll('[data-custom-resize]').forEach((handle) => {
      let dragState = null;

      handle.addEventListener('pointerdown', (event) => {
        const itemId = handle.dataset.customResize || '';
        const record = getCustomItemRecord(itemId);
        if (!record || !composeFrame) return;
        event.preventDefault();
        event.stopPropagation();
        selectCustomItem(itemId);
        pushComposeHistoryCheckpoint();
        composeHistoryGestureActive = true;
        const frameRect = composeFrame.getBoundingClientRect();
        dragState = {
          pointerId: event.pointerId,
          itemId,
          originX: record.item.x,
          originY: record.item.y,
          originWidth: record.item.width,
          originHeight: record.item.height,
          startX: event.clientX,
          startY: event.clientY,
          frameWidth: frameRect.width,
          frameHeight: frameRect.height,
          type: record.type,
        };
        handle.setPointerCapture?.(event.pointerId);
      });

      handle.addEventListener('pointermove', (event) => {
        if (!dragState || dragState.pointerId !== event.pointerId) return;
        event.preventDefault();
        const record = getCustomItemRecord(dragState.itemId);
        if (!record) return;
        const minimums = getCustomItemMinimums(dragState.type);
        const previousRect = {
          x: record.item.x,
          y: record.item.y,
          width: record.item.width,
          height: record.item.height,
        };
        record.item.width = dragState.originWidth + ((event.clientX - dragState.startX) / dragState.frameWidth);
        record.item.height = dragState.originHeight + ((event.clientY - dragState.startY) / dragState.frameHeight);
        Object.assign(record.item, clampCustomBoxRect(record.item, minimums));
        const safetyOptions = record.type === 'image' ? { ignoreText: true } : {};
        Object.assign(record.item, findNearestSafeBoxPosition(record.item, record.item.id, minimums, safetyOptions));
        if (!isSafeCustomPosition(record.item, record.item.id, safetyOptions)) {
          Object.assign(record.item, previousRect);
        }
        if (record.type === 'image') {
          reflowTextBoxes(record.item.id);
        }
        renderCustomInspector();
        applyAllCustomItemRects();
      });

      const finishDrag = (event) => {
        if (!dragState || dragState.pointerId !== event.pointerId) return;
        dragState = null;
        composeHistoryGestureActive = false;
        handle.releasePointerCapture?.(event.pointerId);
      };

      handle.addEventListener('pointerup', finishDrag);
      handle.addEventListener('pointercancel', finishDrag);
    });

    window.requestAnimationFrame(() => {
      customLayoutState.textBoxes.forEach((box) => {
        fitCustomTextBoxToContent(box.id);
      });
    });
  }

  function clearFixedResizeHandles() {
    composeFrame?.querySelectorAll('[data-fixed-resize]').forEach((handle) => handle.remove());
  }

  function getFixedResizeTarget(type, key) {
    return type === 'image' ? slotKeyMap[key] : editableKeyMap[key];
  }

  function applyFixedElementRect(element, rect) {
    if (!element) return;
    element.style.left = `${rect.x * 100}%`;
    element.style.top = `${rect.y * 100}%`;
    element.style.width = `${rect.width * 100}%`;
    element.style.height = `${rect.height * 100}%`;
    element.style.maxHeight = `${rect.height * 100}%`;
    element.style.right = 'auto';
    element.style.bottom = 'auto';
  }

  function renderFixedResizeHandles(layout) {
    if (!composeFrame || composeStage !== 'edit' || composePage?.classList.contains('is-preview-mode')) {
      clearFixedResizeHandles();
      return;
    }
    clearFixedResizeHandles();
    const records = [
      ...layout.images.map((slot) => ({
        type: 'image',
        key: slot.key,
        rect: slot,
      })),
      ...layout.texts.map((block) => ({
        type: 'text',
        key: block.fieldKey,
        rect: block,
      })),
    ];
    records.forEach((record) => {
      const target = getFixedResizeTarget(record.type, record.key);
      if (!target || target.style.display === 'none') return;
      const handle = document.createElement('button');
      handle.type = 'button';
      handle.className = 'compose-fixed-resize';
      handle.dataset.fixedResize = record.key;
      handle.dataset.fixedResizeType = record.type;
      handle.setAttribute('aria-label', `resize ${record.type} box`);
      handle.style.left = `${(record.rect.x + record.rect.width) * 100}%`;
      handle.style.top = `${(record.rect.y + record.rect.height) * 100}%`;
      composeFrame.appendChild(handle);
    });

    composeFrame.querySelectorAll('[data-fixed-resize]').forEach((handle) => {
      let dragState = null;

      handle.addEventListener('pointerdown', (event) => {
        const key = handle.dataset.fixedResize || '';
        const type = handle.dataset.fixedResizeType === 'image' ? 'image' : 'text';
        const layoutState = ensureFixedLayoutState(composeSheet?.dataset.template || DEFAULT_COMPOSE_TEMPLATE);
        const layoutWithOverrides = getFixedTemplateLayout(composeSheet?.dataset.template, layoutState);
        const record = type === 'image'
          ? layoutWithOverrides?.images.find((slot) => slot.key === key)
          : layoutWithOverrides?.texts.find((block) => block.fieldKey === key);
        if (!record || !composeFrame) return;
        event.preventDefault();
        event.stopPropagation();
        pushComposeHistoryCheckpoint();
        composeHistoryGestureActive = true;
        const frameRect = composeFrame.getBoundingClientRect();
        dragState = {
          pointerId: event.pointerId,
          key,
          type,
          originX: record.x,
          originY: record.y,
          originWidth: record.width,
          originHeight: record.height,
          startX: event.clientX,
          startY: event.clientY,
          frameWidth: frameRect.width,
          frameHeight: frameRect.height,
        };
        handle.setPointerCapture?.(event.pointerId);
      });

      handle.addEventListener('pointermove', (event) => {
        if (!dragState || dragState.pointerId !== event.pointerId) return;
        event.preventDefault();
        const rect = clampFixedRect({
          x: dragState.originX,
          y: dragState.originY,
          width: dragState.originWidth + ((event.clientX - dragState.startX) / dragState.frameWidth),
          height: dragState.originHeight + ((event.clientY - dragState.startY) / dragState.frameHeight),
        }, dragState.type);
        updateFixedLayoutRect(dragState.type, dragState.key, rect);
        const target = getFixedResizeTarget(dragState.type, dragState.key);
        applyFixedElementRect(target, rect);
        handle.style.left = `${(rect.x + rect.width) * 100}%`;
        handle.style.top = `${(rect.y + rect.height) * 100}%`;
      });

      const finishResize = (event) => {
        if (!dragState || dragState.pointerId !== event.pointerId) return;
        const templateId = composeSheet?.dataset.template || DEFAULT_COMPOSE_TEMPLATE;
        dragState = null;
        composeHistoryGestureActive = false;
        handle.releasePointerCapture?.(event.pointerId);
        applyFixedTemplateLayout(templateId);
      };

      handle.addEventListener('pointerup', finishResize);
      handle.addEventListener('pointercancel', finishResize);
    });
  }

  function applyFixedTemplateLayout(templateId) {
    const layoutState = ensureFixedLayoutState(templateId);
    const layout = getFixedTemplateLayout(templateId, layoutState);
    if (!layout) return;

    const visibleFields = new Set(layout.texts.map((block) => block.fieldKey));

    Object.values(slotKeyMap).forEach((slot) => {
      if (!slot) return;
      slot.style.display = 'none';
      slot.style.pointerEvents = 'none';
      slot.style.zIndex = '';
      slot.style.left = '';
      slot.style.top = '';
      slot.style.right = 'auto';
      slot.style.bottom = 'auto';
      slot.style.width = '';
      slot.style.height = '';
      slot.style.aspectRatio = 'auto';
      const surface = slot.querySelector('.compose-slot__surface');
      if (surface) {
        surface.style.borderRadius = '0';
        surface.style.pointerEvents = 'auto';
      }
      const removeButton = slot.querySelector('.compose-slot__remove');
      if (removeButton) {
        removeButton.style.zIndex = '';
      }
    });

    layout.images.forEach((slot, index) => {
      const element = slotKeyMap[slot.key];
      if (!element) return;
      element.style.display = 'block';
      element.style.pointerEvents = 'auto';
      element.style.zIndex = String(20 + index);
      element.style.left = `${slot.x * 100}%`;
      element.style.top = `${slot.y * 100}%`;
      element.style.width = `${slot.width * 100}%`;
      element.style.height = `${slot.height * 100}%`;
      element.style.right = 'auto';
      element.style.bottom = 'auto';
      const surface = element.querySelector('.compose-slot__surface');
      if (surface) {
        surface.style.borderRadius = slot.shape === 'arch-right'
          ? '0 999px 999px 0 / 0 50% 50% 0'
          : '0';
        surface.style.pointerEvents = 'auto';
      }
      const removeButton = element.querySelector('.compose-slot__remove');
      if (removeButton) {
        removeButton.style.zIndex = String(40 + index);
      }
    });

    Object.entries(editableKeyMap).forEach(([fieldKey, element]) => {
      if (!element) return;
      element.style.display = 'none';
      element.style.pointerEvents = 'none';
      element.style.zIndex = '';
      element.style.left = '';
      element.style.top = '';
      element.style.right = 'auto';
      element.style.bottom = 'auto';
      element.style.width = '';
      element.style.height = '';
      element.style.maxHeight = '';
      element.style.minHeight = '';
      element.style.overflow = '';
      element.style.fontSize = '';
      element.style.lineHeight = '';
      element.style.fontWeight = '';
      element.style.letterSpacing = '';
      element.style.textAlign = '';
      element.style.whiteSpace = '';
      element.removeAttribute('data-compose-exclusion-side');
      element.style.removeProperty('--compose-exclusion-top');
      element.style.removeProperty('--compose-exclusion-width');
      element.style.removeProperty('--compose-exclusion-height');
      element.style.removeProperty('--compose-exclusion-bottom');
      element.style.removeProperty('--compose-fixed-line-height');
      element.style.removeProperty('--compose-fixed-block-height');
      element.classList.remove('compose-editable--page7-lines');
      delete element.dataset.page7RawText;
      element.dataset.singleLine = element.dataset.defaultSingleLine || 'false';
      element.removeAttribute('data-compose-fixed-box');
      delete element.dataset.composeFixedText;
      delete element.dataset.composeBaseFontSize;
      delete element.dataset.composeBaseLineHeight;
      if (!visibleFields.has(fieldKey) && activeFixedTextKey === fieldKey) {
        activeFixedTextKey = null;
      }
    });

    layout.texts.forEach((block, index) => {
      const element = editableKeyMap[block.fieldKey];
      if (!element) return;
      const metrics = getFixedTemplateTextMetrics(
        block.fieldKey,
        block,
        getComposeTextStyleValue(block.fieldKey).scale,
      );
      element.style.display = 'block';
      element.style.pointerEvents = 'auto';
      element.setAttribute('contenteditable', composeStage === 'edit' ? 'true' : 'false');
      element.style.zIndex = String(60 + index);
      element.style.left = `${block.x * 100}%`;
      element.style.top = `${block.y * 100}%`;
      element.style.width = `${block.width * 100}%`;
      element.style.height = `${block.height * 100}%`;
      element.style.maxHeight = `${block.height * 100}%`;
      element.style.minHeight = '0';
      element.style.right = 'auto';
      element.style.bottom = 'auto';
      element.style.overflow = 'hidden';
      element.style.fontSize = `${Math.round(metrics.fontSize)}px`;
      element.style.lineHeight = `${Math.round(metrics.lineHeight)}px`;
      element.style.fontWeight = String(metrics.weight);
      element.style.letterSpacing = metrics.letterSpacing
        ? `${metrics.letterSpacing}px`
        : '0';
      element.style.textAlign = block.align || 'left';
      element.style.whiteSpace = metrics.maxLines > 1 ? 'pre-wrap' : 'nowrap';
      element.dataset.composeFixedText = 'true';
      element.dataset.composeFixedBox = 'true';
      element.dataset.singleLine = block.singleLine === true
        ? 'true'
        : block.singleLine === false
          ? 'false'
          : metrics.maxLines <= 1
            ? 'true'
            : 'false';
      element.dataset.defaultSingleLine = element.dataset.singleLine;
      if (Number.isFinite(Number(block.maxChars))) {
        element.dataset.maxChars = String(Number(block.maxChars));
      } else {
        element.removeAttribute('data-max-chars');
      }
      const exclusion = block.exclusions?.[0];
      if (templateId === 'page7' && (block.fieldKey === 'headline' || block.fieldKey === 'body')) {
        element.classList.add('compose-editable--page7-lines');
        element.removeAttribute('data-compose-exclusion-side');
        element.style.removeProperty('--compose-exclusion-top');
        element.style.removeProperty('--compose-exclusion-width');
        element.style.removeProperty('--compose-exclusion-height');
        element.style.removeProperty('--compose-exclusion-bottom');
        element.dataset.page7RawText = normalizeEditableValue(element, element.dataset.page7RawText || element.innerText).replace(/\n+/g, '');
        renderPage7Lines(element, element.dataset.page7RawText);
      } else {
        element.classList.remove('compose-editable--page7-lines');
        delete element.dataset.page7RawText;
      }
      if (exclusion && !isPage7ConstrainedEditable(element)) {
        element.dataset.composeExclusionSide = exclusion.side;
        const blockPixelHeight = element.getBoundingClientRect().height || (block.height * composeSheet.getBoundingClientRect().height);
        const threeLinePercent = blockPixelHeight > 0
          ? Math.min(100, (metrics.lineHeight * 3 / blockPixelHeight) * 100)
          : 0;
        const defaultTop = (exclusion.offsetTop / block.height) * 100;
        const defaultBottom = ((exclusion.offsetTop + exclusion.height) / block.height) * 100;
        const isPage7 = templateId === 'page7';
        const exclusionTop = isPage7 && block.fieldKey === 'headline'
          ? Math.max(0, 100 - threeLinePercent)
          : defaultTop;
        const exclusionBottom = isPage7 && block.fieldKey === 'body'
          ? Math.min(100, threeLinePercent)
          : defaultBottom;
        const exclusionWidth = isPage7
          ? Math.min(100, (exclusion.width / block.width) * 100 + 6)
          : (exclusion.width / block.width) * 100;
        element.style.setProperty('--compose-fixed-line-height', `${Math.round(metrics.lineHeight)}px`);
        element.style.setProperty('--compose-fixed-block-height', `${blockPixelHeight}px`);
        element.style.setProperty('--compose-exclusion-top', `${exclusionTop}%`);
        element.style.setProperty('--compose-exclusion-width', `${exclusionWidth}%`);
        element.style.setProperty('--compose-exclusion-height', `${(exclusion.height / block.height) * 100}%`);
        element.style.setProperty('--compose-exclusion-bottom', `${exclusionBottom}%`);
      }
    });

    if (roughOverlay) {
      roughOverlay.style.backgroundImage = layout.roughUrl ? `url("${layout.roughUrl}")` : '';
      roughOverlay.hidden = composeStage !== 'edit';
    }

    shapeMasks.forEach((maskElement, index) => {
      const mask = layout.masks[index];
      if (!mask) {
        maskElement.hidden = true;
        maskElement.style.left = '';
        maskElement.style.top = '';
        maskElement.style.width = '';
        maskElement.style.height = '';
        return;
      }
      maskElement.hidden = false;
      maskElement.style.left = `${mask.rect.x * 100}%`;
      maskElement.style.top = `${mask.rect.y * 100}%`;
      maskElement.style.width = `${mask.rect.width * 100}%`;
      maskElement.style.height = `${mask.rect.height * 100}%`;
      maskElement.style.borderRadius = mask.type === 'ellipse-cutout' ? '50%' : '0';
    });

    if (!visibleFields.has(activeFixedTextKey)) {
      closeComposeTextTray();
    } else {
      syncComposeTextTargetState();
      syncComposeTextTray();
    }

    applyComposeTextStyles();
    Object.values(editableKeyMap).forEach((element) => {
      if (!element || element.style.display === 'none') return;
      clampEditable(element);
    });
    renderFixedResizeHandles(layout);
  }

  function applyCustomLayout() {
    if (!composeSheet || !composeFrame) return;
    const isCustomTemplate = composeSheet.dataset.template === 'page8';

    Object.values(slotKeyMap).forEach((slot) => {
      if (!slot) return;
      slot.style.left = '';
      slot.style.top = '';
      slot.style.width = '';
      slot.style.height = '';
    });

    Object.entries(editableKeyMap).forEach(([key, element]) => {
      if (!element) return;
      element.style.left = '';
      element.style.top = '';
      element.style.width = '';
      element.style.height = '';
      element.style.fontSize = '';
      element.style.lineHeight = '';
      element.style.fontWeight = '';
      element.style.letterSpacing = '';
      element.style.textAlign = '';
      delete element.dataset.composeFixedText;
      if (key === 'editor') {
        element.style.right = '';
      }
      if (key === 'body') {
        element.style.bottom = '';
      }
      if (key === 'date') {
        element.style.bottom = '';
      }
    });

    if (customTemplateControls) {
      customTemplateControls.hidden = !isCustomTemplate || composeStage !== 'edit';
      if (isCustomTemplate && composeStage === 'edit' && customToolsHeight) {
        applyCustomToolsHeight(customToolsHeight, { animate: false });
      }
      if (isCustomTemplate && composeStage === 'edit' && customToolsWidth) {
        customToolsWidth = applyComposeSheetWidth(customTemplateControls, customToolsWidth, {
          animate: false,
          dockSide: customToolsDockSide,
        });
      }
    }

    if (!isCustomTemplate) {
      if (customCanvas) {
        customCanvas.hidden = true;
        customCanvas.innerHTML = '';
      }
      applyFixedTemplateLayout(composeSheet.dataset.template);
      return;
    }

    clearFixedResizeHandles();
    customLayoutState.imageBoxes = normalizePage8ImageBoxes({
      imageBoxes: customLayoutState.imageBoxes,
    });
    customLayoutState.textBoxes = normalizePage8TextBoxes({
      textBoxes: customLayoutState.textBoxes,
    }, page8DraftValues);
    renderCustomCanvas();
  }

  composeRoot.querySelectorAll('input[name="backgroundColor"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      setPreviewBackground();
      focusSelectedColorCard(radio.value);
    });
  });
  setPreviewBackground();
  window.setTimeout(() => {
    focusSelectedColorCard(composeRoot.querySelector('input[name="backgroundColor"]:checked')?.value);
  }, 0);

  composeRoot.querySelectorAll('input[name="templateId"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      setPreviewTemplate(radio.value);
      focusSelectedTemplateCard(radio.value);
    });
  });
  composeRoot.querySelectorAll('[data-compose-mode]').forEach((button) => {
    button.addEventListener('click', () => {
      const nextMode = button.dataset.composeMode === 'custom' ? 'custom' : 'template';
      if (nextMode === 'custom') {
        setPreviewTemplate('page8');
        return;
      }
      const fallbackTemplate = uiState.composeTemplateId && uiState.composeTemplateId !== 'page8'
        ? uiState.composeTemplateId
        : DEFAULT_COMPOSE_TEMPLATE;
      const fallbackRadio = composeRoot.querySelector(`input[name="templateId"][value="${fallbackTemplate}"]`)
        || composeRoot.querySelector('input[name="templateId"]');
      if (fallbackRadio) {
        fallbackRadio.checked = true;
      }
      setPreviewTemplate(fallbackRadio?.value || fallbackTemplate);
      focusSelectedTemplateCard(fallbackRadio?.value || fallbackTemplate);
    });
  });
  setPreviewTemplate(uiState.composeTemplateId || composeRoot.querySelector('input[name="templateId"]:checked')?.value);
  window.setTimeout(() => {
    focusSelectedTemplateCard(uiState.composeTemplateId || composeRoot.querySelector('input[name="templateId"]:checked')?.value);
  }, 0);

  document.querySelectorAll([
    '[data-template-carousel]',
    '[data-color-carousel]',
    '.compose-text-tray__options',
    '.compose-text-tray__background-options',
  ].join(',')).forEach((element) => {
    bindDragScrollSurface(element, 'x');
  });

  document.querySelectorAll('[data-template-carousel-nav]').forEach((button) => {
    button.addEventListener('click', () => {
      const viewport = document.querySelector('[data-template-carousel]');
      if (!viewport) return;
      const direction = button.dataset.templateCarouselNav === 'next' ? 1 : -1;
      viewport.scrollBy({
        left: viewport.clientWidth * 0.72 * direction,
        behavior: 'smooth',
      });
    });
  });

  document.querySelectorAll('[data-color-carousel-nav]').forEach((button) => {
    button.addEventListener('click', () => {
      const viewport = document.querySelector('[data-color-carousel]');
      if (!viewport) return;
      const direction = button.dataset.colorCarouselNav === 'next' ? 1 : -1;
      viewport.scrollBy({
        left: viewport.clientWidth * 0.72 * direction,
        behavior: 'smooth',
      });
    });
  });

  document.querySelectorAll('[data-compose-stage-nav]').forEach((button) => {
    button.addEventListener('click', async () => {
      const nextStage = button.dataset.composeStageNav;
      if (!nextStage) return;
      await switchComposeStage(nextStage);
    });
  });

  composeHistoryButtons.forEach((button) => {
    button.addEventListener('click', () => {
      if (button.dataset.composeHistory === 'undo') {
        undoComposeHistory();
      } else {
        redoComposeHistory();
      }
    });
  });
  syncComposeHistoryButtons();

  if (composeStage === 'select') {
    return;
  }

  if (!form) return;

  if (tagToggle && tagPanel) {
    tagToggle.addEventListener('click', () => {
      const nextHidden = !tagPanel.hidden;
      tagPanel.hidden = nextHidden;
      tagToggle.setAttribute('aria-expanded', String(!nextHidden));
    });
  }

  if (previewToggle) {
    previewToggle.addEventListener('click', () => {
      const enabled = !composePage?.classList.contains('is-preview-mode');
      setPreviewMode(Boolean(enabled));
    });
  }

  composeFrame?.addEventListener('pointerdown', focusFixedEditableFromPoint, true);

  setPreviewMode(false);
  applyComposeTextStyles();

  if (textTray) {
    textTray.hidden = false;
    applyComposeTextTrayLevel(0, { animate: false });

    textTrayFontButtons.forEach((button) => {
      button.addEventListener('pointerdown', (event) => {
        rememberActiveTextSelection();
        event.preventDefault();
      });
      button.addEventListener('click', () => {
        applyFontToSelectedText(button.dataset.composeTextFont || '');
        restoreActiveComposeTextFocus();
      });
    });

    textTraySizeInput?.addEventListener('pointerdown', () => {
      rememberActiveTextSelection();
      pushComposeHistoryCheckpoint();
      composeHistoryGestureActive = true;
    });
    const finishTextSizeDrag = () => {
      composeHistoryGestureActive = false;
    };
    textTraySizeInput?.addEventListener('pointerup', finishTextSizeDrag);
    textTraySizeInput?.addEventListener('pointercancel', finishTextSizeDrag);
    textTraySizeInput?.addEventListener('change', finishTextSizeDrag);
    textTraySizeInput?.addEventListener('input', (event) => {
      applySizeToSelectedText(Number(event.target.value || 100) / 100);
    });
    textTraySizeStepButtons.forEach((button) => {
      button.addEventListener('pointerdown', (event) => {
        rememberActiveTextSelection();
        event.preventDefault();
      });
      button.addEventListener('click', () => {
        if (!activeFixedTextKey) return;
        const currentScale = getSelectedTextSizeScale() || getComposeTextStyleValue(activeFixedTextKey).scale;
        const currentPercent = Math.round(currentScale * 100);
        const delta = button.dataset.composeTextSizeStep === 'up' ? 5 : -5;
        const nextPercent = Math.max(50, Math.min(200, currentPercent + delta));
        applySizeToSelectedText(nextPercent / 100);
      });
    });
    textTrayAlignButtons.forEach((button) => {
      button.addEventListener('pointerdown', (event) => {
        rememberActiveTextSelection();
        event.preventDefault();
      });
      button.addEventListener('click', () => {
        if (!activeFixedTextKey) return;
        applyAlignToSelectedText(button.dataset.composeTextAlign || 'left');
        restoreActiveComposeTextFocus();
      });
    });
    textTrayBackgroundButtons.forEach((button) => {
      button.addEventListener('click', () => {
        if (!activeFixedTextKey) return;
        updateComposeTextStyle({
          backgroundColor: normalizeComposeTextBackgroundColor(button.dataset.composeTextBackground),
        });
        restoreActiveComposeTextFocus();
      });
    });

    const textTrayChromes = Array.from(textTray.querySelectorAll('[data-compose-text-tray-chrome], [data-compose-text-tray-lower-chrome]'));
    const startTextTrayDrag = (event) => {
      if (event.target.closest('[data-compose-sheet-resize]')) return;
      textTrayDragState = {
        pointerId: event.pointerId,
        handlePosition: event.currentTarget.matches('[data-compose-text-tray-lower-chrome]') ? 'lower' : 'upper',
        startY: event.clientY,
        startHeight: textTray.getBoundingClientRect().height,
        startOffset: textTrayOffset,
        moved: false,
      };
      textTrayJustDragged = false;
      textTray.style.transition = 'none';
      event.currentTarget.setPointerCapture?.(event.pointerId);
    };

    const moveTextTrayDrag = (event) => {
      if (!textTrayDragState || textTrayDragState.pointerId !== event.pointerId) return;
      const deltaY = event.clientY - textTrayDragState.startY;
      if (!textTrayDragState.moved && Math.abs(deltaY) >= 4) {
        textTrayDragState.moved = true;
      }
      if (!textTrayDragState.moved) return;
      applyComposeTextTrayDrag(deltaY, textTrayDragState);
    };

    const finishTextTrayDrag = (event) => {
      if (!textTrayDragState || textTrayDragState.pointerId !== event.pointerId) return;
      textTrayJustDragged = textTrayDragState.moved;
      textTrayDragState = null;
      event.currentTarget.releasePointerCapture?.(event.pointerId);
      if (textTrayHeight) {
        applyComposeTextTrayHeight(textTrayHeight);
      }
      applyComposeTextTrayOffset(textTrayOffset);
      if (textTrayOpenLevel > 0) {
        restoreActiveComposeTextFocus();
      }
    };

    textTrayChromes.forEach((chrome) => {
      chrome.addEventListener('pointerdown', startTextTrayDrag);
      chrome.addEventListener('pointermove', moveTextTrayDrag);
      chrome.addEventListener('pointerup', finishTextTrayDrag);
      chrome.addEventListener('pointercancel', finishTextTrayDrag);
    });

    textTrayResizeHandles.forEach((handle) => {
      handle.addEventListener('pointerdown', (event) => {
        if (!textTray) return;
        const handleSide = handle.dataset.composeSheetResize === 'start' ? 'start' : 'end';
        textTrayDragState = {
          pointerId: event.pointerId,
          handleSide,
          dockSide: textTrayDockSide,
          startX: event.clientX,
          startY: event.clientY,
          startWidth: textTray.getBoundingClientRect().width,
          startHeight: textTray.getBoundingClientRect().height,
          moved: false,
        };
        textTrayJustDragged = false;
        textTray.style.transition = 'none';
        handle.setPointerCapture?.(event.pointerId);
        event.preventDefault();
      });
      handle.addEventListener('pointermove', (event) => {
        if (!textTrayDragState || textTrayDragState.pointerId !== event.pointerId) return;
        const deltaX = event.clientX - textTrayDragState.startX;
        const deltaY = event.clientY - textTrayDragState.startY;
        if (!textTrayDragState.moved && Math.hypot(deltaX, deltaY) >= 4) {
          textTrayDragState.moved = true;
        }
        if (!textTrayDragState.moved) return;
        const intent = resolveComposeSheetResizeIntent(
          textTrayDragState.handleSide,
          deltaX,
          textTrayDragState.dockSide,
        );
        textTrayDockSide = intent.dockSide;
        applyComposeTextTraySize({
          width: textTrayDragState.startWidth + intent.widthDelta,
          height: textTrayDragState.startHeight - deltaY,
        }, { animate: false });
      });
      const finishResize = (event) => {
        if (!textTrayDragState || textTrayDragState.pointerId !== event.pointerId) return;
        textTrayJustDragged = textTrayDragState.moved;
        textTrayDragState = null;
        handle.releasePointerCapture?.(event.pointerId);
        if (textTrayHeight) {
          applyComposeTextTrayHeight(textTrayHeight);
        }
        if (textTrayWidth) {
          textTrayWidth = applyComposeSheetWidth(textTray, textTrayWidth, { dockSide: textTrayDockSide });
        }
        if (textTrayOpenLevel > 0) {
          restoreActiveComposeTextFocus();
        }
      };
      handle.addEventListener('pointerup', finishResize);
      handle.addEventListener('pointercancel', finishResize);
    });
  }

  if (customTemplateControls && customToolsResizeHandles.length) {
    customToolsResizeHandles.forEach((handle) => {
      handle.addEventListener('pointerdown', (event) => {
        if (customTemplateControls.hidden) return;
        const handleSide = handle.dataset.composeSheetResize === 'start' ? 'start' : 'end';
        customToolsResizeState = {
          pointerId: event.pointerId,
          handleSide,
          dockSide: customToolsDockSide,
          startX: event.clientX,
          startY: event.clientY,
          startWidth: customTemplateControls.getBoundingClientRect().width,
          startHeight: customTemplateControls.getBoundingClientRect().height,
          moved: false,
        };
        customTemplateControls.style.transition = 'none';
        handle.setPointerCapture?.(event.pointerId);
        event.preventDefault();
      });
      handle.addEventListener('pointermove', (event) => {
        if (!customToolsResizeState || customToolsResizeState.pointerId !== event.pointerId) return;
        const deltaX = event.clientX - customToolsResizeState.startX;
        const deltaY = event.clientY - customToolsResizeState.startY;
        if (!customToolsResizeState.moved && Math.hypot(deltaX, deltaY) >= 4) {
          customToolsResizeState.moved = true;
        }
        if (!customToolsResizeState.moved) return;
        const intent = resolveComposeSheetResizeIntent(
          customToolsResizeState.handleSide,
          deltaX,
          customToolsResizeState.dockSide,
        );
        customToolsDockSide = intent.dockSide;
        applyCustomToolsSize({
          width: customToolsResizeState.startWidth + intent.widthDelta,
          height: customToolsResizeState.startHeight - deltaY,
        }, { animate: false });
      });
      const finishResize = (event) => {
        if (!customToolsResizeState || customToolsResizeState.pointerId !== event.pointerId) return;
        customToolsResizeState = null;
        handle.releasePointerCapture?.(event.pointerId);
        if (customToolsHeight || customToolsWidth) {
          applyCustomToolsSize({
            width: customToolsWidth,
            height: customToolsHeight,
          });
        }
      };
      handle.addEventListener('pointerup', finishResize);
      handle.addEventListener('pointercancel', finishResize);
    });
  }

  let textSelectionDragState = null;
  const finishTextSelectionDrag = (event) => {
    if (!textSelectionDragState || textSelectionDragState.pointerId !== event.pointerId) return;
    const { element, moved } = textSelectionDragState;
    textSelectionDragState = null;
    element.releasePointerCapture?.(event.pointerId);
    if (moved) {
      event.preventDefault();
      element.dataset.composeSuppressNextClick = 'true';
      window.setTimeout(() => {
        delete element.dataset.composeSuppressNextClick;
      }, 0);
      rememberActiveTextSelection();
      syncComposeTextTray();
    }
  };

  editables.forEach((element) => {
    const fieldKey = element.dataset.editable;
    if (!fieldKey) return;
    element.addEventListener('pointerdown', (event) => {
      if (element.getAttribute('contenteditable') !== 'true') return;
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      activeFixedTextKey = fieldKey;
      openComposeTextTray(fieldKey);
      textSelectionDragState = {
        pointerId: event.pointerId,
        element,
        startX: event.clientX,
        startY: event.clientY,
        startRange: getTextBoundaryRangeFromPoint(element, event.clientX, event.clientY),
        moved: false,
      };
      element.setPointerCapture?.(event.pointerId);
    });
    element.addEventListener('pointermove', (event) => {
      if (!textSelectionDragState || textSelectionDragState.pointerId !== event.pointerId) return;
      const distance = Math.hypot(
        event.clientX - textSelectionDragState.startX,
        event.clientY - textSelectionDragState.startY,
      );
      if (!textSelectionDragState.moved && distance < 4) return;
      textSelectionDragState.moved = true;
      event.preventDefault();
      selectEditableRangeFromDrag(
        element,
        textSelectionDragState.startRange,
        event.clientX,
        event.clientY,
      );
    });
    element.addEventListener('pointerup', finishTextSelectionDrag);
    element.addEventListener('pointercancel', finishTextSelectionDrag);
    element.addEventListener('click', (event) => {
      if (element.dataset.composeSuppressNextClick !== 'true') return;
      event.preventDefault();
      event.stopPropagation();
      delete element.dataset.composeSuppressNextClick;
    }, true);
    element.addEventListener('focus', () => {
      openComposeTextTray(fieldKey);
      rememberActiveTextSelection();
    });
    element.addEventListener('pointerup', () => {
      openComposeTextTray(fieldKey);
      rememberActiveTextSelection();
      syncComposeTextTray();
    });
    element.addEventListener('keyup', () => {
      rememberActiveTextSelection();
      syncComposeTextTray();
    });
  });

  if (composeSelectionChangeCleanup) {
    composeSelectionChangeCleanup();
    composeSelectionChangeCleanup = null;
  }
  const handleComposeSelectionChange = () => {
    if (!activeFixedTextKey || !composePage?.isConnected) return;
    rememberActiveTextSelection();
    syncComposeTextTray();
  };
  document.addEventListener('selectionchange', handleComposeSelectionChange);
  composeSelectionChangeCleanup = () => {
    document.removeEventListener('selectionchange', handleComposeSelectionChange);
  };

  composePreview?.addEventListener('pointerdown', (event) => {
    if (closestFromEventTarget(event.target, '[data-editable]')) return;
    if (closestFromEventTarget(event.target, '[data-compose-text-tray]')) return;
    minimizeComposeTextTray();
  });

  const pretextAddToggle = document.querySelector('[data-pretext-add-toggle]');
  const pretextAddPopover = document.querySelector('[data-pretext-add-popover]');
  const pretextDeleteButton = document.querySelector('[data-pretext-delete]');

  function closePretextAddPopover() {
    if (!pretextAddToggle || !pretextAddPopover) return;
    pretextAddPopover.hidden = true;
    pretextAddToggle.setAttribute('aria-expanded', 'false');
  }

  function openPretextAddPopover() {
    if (!pretextAddToggle || !pretextAddPopover) return;
    pretextAddPopover.hidden = false;
    pretextAddToggle.setAttribute('aria-expanded', 'true');
  }

  if (pretextComposeHost) {
    let pretextCommandId = 0;

    pretextAddToggle?.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (!pretextAddPopover) return;
      if (pretextAddPopover.hidden) {
        openPretextAddPopover();
      } else {
        closePretextAddPopover();
      }
    });

    pretextAddPopover?.querySelectorAll('[data-pretext-add-kind]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const kind = button.dataset.pretextAddKind;
        if (!kind) return;
        pretextCommandId += 1;
        activeComposeBridge?.sendCommand?.({
          id: pretextCommandId,
          type: 'add',
          kind,
          align: button.dataset.pretextAddAlign || 'left',
        });
        markComposeImageDirty();
        closePretextAddPopover();
      });
    });

    pretextDeleteButton?.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      pretextCommandId += 1;
      activeComposeBridge?.sendCommand?.({
        id: pretextCommandId,
        type: 'delete-selected',
      });
      markComposeImageDirty();
      closePretextAddPopover();
    });

    pretextComposeHost.addEventListener('pointerdown', markComposeImageDirty);
    pretextComposeHost.addEventListener('input', markComposeImageDirty);
    pretextComposeHost.addEventListener('change', markComposeImageDirty);

    composeRoot.addEventListener('pointerdown', (event) => {
      if (!pretextAddPopover || pretextAddPopover.hidden) return;
      if (pretextAddToggle?.contains(event.target) || pretextAddPopover.contains(event.target)) return;
      closePretextAddPopover();
    });

    import('../../src/pretextComposeBridge.jsx')
      .then(({ mountComposePretextEditor }) => {
        if (!pretextComposeHost.isConnected) return;
        activeComposeBridge = mountComposePretextEditor(pretextComposeHost, {
          customLayout: composeDraft?.customLayout || {},
          textValues: page8DraftValues,
          backgroundColor: '#ffffff',
        });
      })
      .catch((error) => {
        console.error('Failed to mount pretext compose editor', error);
        pretextComposeHost.innerHTML = '<p class="compose-pretext-host__error">Failed to load the editor.</p>';
      });
    return;
  }

  const textAddButton = composeRoot.querySelector('[data-custom-add="text"]');
  let textAddWrapper = textAddButton?.closest('[data-custom-add-pop]') || null;
  let textAddPopover = textAddWrapper?.querySelector('[data-custom-add-popover]') || null;

  if (textAddButton && !textAddWrapper) {
    textAddWrapper = document.createElement('div');
    textAddWrapper.className = 'compose-custom-add-pop';
    textAddButton.parentElement?.insertBefore(textAddWrapper, textAddButton);
    textAddWrapper.appendChild(textAddButton);
  }

  if (textAddButton && textAddWrapper && !textAddPopover) {
    textAddWrapper.insertAdjacentHTML('afterbegin', `
      <div class="compose-custom-add-popover" data-custom-add-popover hidden>
        <button class="compose-custom-add-popover__option" type="button" data-custom-add-text-align="left" aria-label="Add left aligned text box">
          ${getIcon('alignLeft')}
        </button>
        <button class="compose-custom-add-popover__option" type="button" data-custom-add-text-align="center" aria-label="Add centered text box">
          ${getIcon('alignCenter')}
        </button>
        <button class="compose-custom-add-popover__option" type="button" data-custom-add-text-align="right" aria-label="Add right aligned text box">
          ${getIcon('alignRight')}
        </button>
      </div>
    `);
    textAddPopover = textAddWrapper.querySelector('[data-custom-add-popover]');
    textAddButton.setAttribute('aria-haspopup', 'true');
    textAddButton.setAttribute('aria-expanded', 'false');
  }

  function closeTextAddPopover() {
    if (!textAddPopover || !textAddButton) return;
    textAddPopover.hidden = true;
    textAddWrapper?.classList.remove('is-open');
    textAddButton.setAttribute('aria-expanded', 'false');
  }

  function openTextAddPopover() {
    if (!textAddPopover || !textAddButton) return;
    textAddPopover.hidden = false;
    textAddWrapper?.classList.add('is-open');
    textAddButton.setAttribute('aria-expanded', 'true');
  }

  composeRoot.querySelectorAll('[data-custom-add]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      const action = button.dataset.customAdd;
      if (composeSheet?.dataset.template !== 'page8') return;
      if (action === 'image') {
        closeTextAddPopover();
        const nextImage = {
          id: createCustomId('image'),
          x: 0.14,
          y: 0.18,
          width: 0.28,
          height: 0.22,
        };
        customLayoutState.imageBoxes = [
          ...customLayoutState.imageBoxes,
          clampCustomBoxRect(nextImage, PAGE8_MIN_IMAGE_SIZE),
        ];
        customLayoutState.selectedId = nextImage.id;
        getCustomImageState(nextImage.id);
        reflowTextBoxes(nextImage.id);
        renderCustomCanvas();
        return;
      }

      if (!textAddPopover) return;
      if (textAddPopover.hidden) {
        openTextAddPopover();
      } else {
        closeTextAddPopover();
      }
    });
  });

  textAddPopover?.querySelectorAll('[data-custom-add-text-align]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      if (composeSheet?.dataset.template !== 'page8') return;
      createCustomTextBox(button.dataset.customAddTextAlign || 'left');
      closeTextAddPopover();
    });
  });

  composeRoot.addEventListener('pointerdown', (event) => {
    if (!textAddPopover || textAddPopover.hidden) return;
    if (textAddWrapper?.contains(event.target)) return;
    closeTextAddPopover();
  });

  [
    { inputId: 'imageInputPrimary', stateKey: 'primary' },
    { inputId: 'imageInputSecondary', stateKey: 'secondary' },
    { inputId: 'imageInputAccent', stateKey: 'accent' },
    { inputId: 'imageInputDetail', stateKey: 'detail' },
  ].forEach(({ inputId, stateKey }) => {
    const slot = document.querySelector(`[data-slot="${inputId}"]`);
    const input = document.getElementById(inputId);
    if (input) {
      input.addEventListener('change', async (event) => {
        const file = event.target.files?.[0] || null;
        selectedFiles[stateKey].file = file ? await fileToWebpDataUrl(file, { maxWidth: 1600, quality: 0.9 }) : null;
        selectedFiles[stateKey].position = { x: 0.5, y: 0.5 };
        selectedFiles[stateKey].imageSize = file ? await loadImageSize(file) : null;
        previewUrls[inputId] = selectedFiles[stateKey].file || '';
        setPreviewImage(inputId);
        updateSlotPosition(inputId);
        persistComposeDraft({ standardFiles: serializeStandardFiles() });
      });

      const removeButton = document.querySelector(`[data-slot-remove="${inputId}"]`);
      if (removeButton) {
        removeButton.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          previewUrls[inputId] = '';
          selectedFiles[stateKey] = { file: null, position: { x: 0.5, y: 0.5 }, imageSize: null };
          input.value = '';
          setPreviewImage(inputId);
          persistComposeDraft({ standardFiles: serializeStandardFiles() });
        });
      }
    }

    if (slot) {
      let dragState = null;

      slot.addEventListener('pointerdown', (event) => {
        if (composePage?.classList.contains('is-preview-mode')) return;
        if (composeSheet?.dataset.template === 'page8') {
          const boxState = customLayoutState.imageBoxes[stateKey];
          if (!boxState || !composeFrame) return;
          event.preventDefault();
          event.stopPropagation();
          pushComposeHistoryCheckpoint();
          composeHistoryGestureActive = true;
          const frameRect = composeFrame.getBoundingClientRect();
          dragState = {
            pointerId: event.pointerId,
            mode: 'move-box',
            startX: event.clientX,
            startY: event.clientY,
            originX: boxState.x,
            originY: boxState.y,
            frameWidth: frameRect.width,
            frameHeight: frameRect.height,
          };
          slot.classList.add('is-dragging');
          slot.setPointerCapture?.(event.pointerId);
          return;
        }
        if (!selectedFiles[stateKey].file) return;
        event.preventDefault();
        event.stopPropagation();
        pushComposeHistoryCheckpoint();
        composeHistoryGestureActive = true;
        dragState = {
          pointerId: event.pointerId,
          mode: 'pan-image',
          startX: event.clientX,
          startY: event.clientY,
          originX: selectedFiles[stateKey].position.x,
          originY: selectedFiles[stateKey].position.y,
        };
        slot.classList.add('is-dragging');
        slot.setPointerCapture?.(event.pointerId);
      });

      slot.addEventListener('pointermove', (event) => {
        if (!dragState || dragState.pointerId !== event.pointerId) return;
        event.preventDefault();
        if (dragState.mode === 'move-box') {
          const nextX = dragState.originX + ((event.clientX - dragState.startX) / dragState.frameWidth);
          const nextY = dragState.originY + ((event.clientY - dragState.startY) / dragState.frameHeight);
          const boxState = customLayoutState.imageBoxes[stateKey];
          boxState.x = Math.min(PAGE8_BOUNDS.x + PAGE8_BOUNDS.width - boxState.width, Math.max(PAGE8_BOUNDS.x, nextX));
          boxState.y = Math.min(PAGE8_BOUNDS.y + PAGE8_BOUNDS.height - boxState.height, Math.max(PAGE8_BOUNDS.y, nextY));
          applyCustomLayout();
          return;
        }
        const slotRect = slot.getBoundingClientRect();
        const size = selectedFiles[stateKey].imageSize;
        if (!size) return;

        const imageRatio = size.width / size.height;
        const slotRatio = slotRect.width / slotRect.height;
        const renderedWidth = imageRatio > slotRatio ? slotRect.height * imageRatio : slotRect.width;
        const renderedHeight = imageRatio > slotRatio ? slotRect.height : slotRect.width / imageRatio;
        const overflowX = Math.max(0, renderedWidth - slotRect.width);
        const overflowY = Math.max(0, renderedHeight - slotRect.height);
        const deltaX = event.clientX - dragState.startX;
        const deltaY = event.clientY - dragState.startY;

        selectedFiles[stateKey].position.x = overflowX ? Math.min(1, Math.max(0, dragState.originX - (deltaX / overflowX))) : 0.5;
        selectedFiles[stateKey].position.y = overflowY ? Math.min(1, Math.max(0, dragState.originY - (deltaY / overflowY))) : 0.5;
        updateSlotPosition(inputId);
        persistComposeDraft({ standardFiles: serializeStandardFiles() });
      });

      const finishDrag = (event) => {
        if (!dragState || dragState.pointerId !== event.pointerId) return;
        dragState = null;
        composeHistoryGestureActive = false;
        slot.classList.remove('is-dragging');
        slot.releasePointerCapture?.(event.pointerId);
      };

      slot.addEventListener('pointerup', finishDrag);
      slot.addEventListener('pointercancel', finishDrag);
    }

    setPreviewImage(inputId);
    updateSlotPosition(inputId);
  });

  applyCustomLayout();

  editables.forEach((element) => {
    element.dataset.previousValue = getEditableText(element);

    element.addEventListener('beforeinput', (event) => {
      if (element.dataset.singleLine === 'true' && (event.inputType === 'insertParagraph' || event.inputType === 'insertLineBreak')) {
        event.preventDefault();
      }
    });

    element.addEventListener('paste', (event) => {
      event.preventDefault();
      const pastedText = event.clipboardData?.getData('text/plain')?.replace(/\r/g, '') ?? '';
      const normalizedText = element.dataset.singleLine === 'true'
        ? pastedText.replace(/\n+/g, ' ')
        : pastedText;
      if (!normalizedText) return;
      insertPlainText(element, normalizedText);
      clampEditable(element);
      persistEditableDraftValue(element);
      placeCaretAtEnd(element);
    });

    element.addEventListener('input', () => {
      const rawValue = getEditableText(element);
      clampEditable(element);
      persistEditableDraftValue(element);
      if (isPage7ConstrainedEditable(element) || getEditableText(element) !== rawValue) {
        placeCaretAtEnd(element);
      }
    });

    element.addEventListener('blur', () => {
      normalizeEditableContent(element);
      clampEditable(element);
      persistEditableDraftValue(element);
    });
  });

  async function saveDraftAndOpenProfile(snapshot) {
    const draftSnapshot = snapshot || await finalizeComposeDraftSnapshot();
    const values = buildComposeRenderValues(draftSnapshot);
    const imageData = composeStage === 'edit'
      ? await prepareComposeImageData(draftSnapshot, values)
      : uiState.composePreparedImageData;
    if (!imageData) return;
    const savedDraft = upsertDraft({
      id: uiState.composeDraftId || undefined,
      title: buildComposeCaption(values) || values.headline || 'Untitled',
      imageData,
      composeData: createComposeWorkingDraft({
        ...draftSnapshot,
        ...values,
      }),
    });
    uiState.composeDraftId = savedDraft.id;
    uiState.composeReturnState = null;
    uiState.composeWorkingDraft = null;
    uiState.composeEditingPostId = null;
    uiState.composePreparedImageData = null;
    uiState.composePreparedImageDirty = true;
    uiState.screen = 'profile';
    uiState.profileAuthor = null;
    uiState.profileSection = 'drafts';
    uiState.profileFindQuery = '';
    uiState.profileFindTags = [];
    uiState.profileFindMonth = '';
    render();
  }

  document.querySelectorAll('[data-save-compose-draft]').forEach((button) => {
    button.addEventListener('click', async () => {
      await saveDraftAndOpenProfile();
    });
  });

  document.querySelectorAll('[data-save-compose-image]').forEach((button) => {
    button.addEventListener('click', async () => {
      clearPendingComposeDownload();
      const previousText = button.textContent;
      button.disabled = true;
      button.textContent = 'Making...';
      try {
        const draftSnapshot = await finalizeComposeDraftSnapshot();
        const values = buildComposeRenderValues(draftSnapshot);
        const imageData = await prepareComposeImageData(draftSnapshot, values);
        if (imageData) {
          showComposeDownloadLink(button, imageData);
        }
      } finally {
        button.disabled = false;
        button.textContent = previousText || 'Save';
      }
    });
  });

  if (composeStage !== 'tags') {
    return;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const draftSnapshot = await finalizeComposeDraftSnapshot();
    const values = buildComposeRenderValues(draftSnapshot);
    const imageData = uiState.composePreparedImageData;
    if (!imageData) return;
    const profileName = String(getState().profile?.name || 'you').trim() || 'you';

    if (uiState.composeEditingPostId) {
      updatePost(uiState.composeEditingPostId, {
        caption: buildComposeCaption(values),
        imageData,
        fixedTags: draftSnapshot.fixedTags,
        freeTags: draftSnapshot.freeTags,
        composeData: {
          ...values,
          fixedTags: draftSnapshot.fixedTags,
          freeTags: draftSnapshot.freeTags,
          standardFiles: draftSnapshot.standardFiles,
        },
      });
    } else {
      addPost({
        authorName: profileName,
        caption: buildComposeCaption(values),
        imageData,
        fixedTags: draftSnapshot.fixedTags,
        freeTags: draftSnapshot.freeTags,
        composeData: {
          ...values,
          fixedTags: draftSnapshot.fixedTags,
          freeTags: draftSnapshot.freeTags,
          standardFiles: draftSnapshot.standardFiles,
        },
      });
    }

    if (uiState.composeDraftId) {
      deleteDraft(uiState.composeDraftId);
      uiState.composeDraftId = null;
    }

    uiState.screen = 'timeline';
    uiState.timelineTab = 'recommended';
    uiState.composeStage = 'select';
    uiState.composeWorkingDraft = null;
    uiState.composePreparedImageData = null;
    uiState.composePreparedImageDirty = true;
    render();
  });
}

function bindMagazineEvents() {
  const mvpStorageKey = 'couple-magazine-mvp-v1';
  const readMvp = () => {
    try {
      return JSON.parse(window.localStorage.getItem(mvpStorageKey) || '{}') || {};
    } catch (error) {
      return {};
    }
  };
  const writeMvp = (next) => {
    window.localStorage.setItem(mvpStorageKey, JSON.stringify(next));
  };

  document.querySelectorAll('[data-couple-memory]').forEach((input) => {
    input.addEventListener('change', () => {
      const selectedMemoryIds = Array.from(document.querySelectorAll('[data-couple-memory]:checked'))
        .map((node) => String(node.value));
      writeMvp({ ...readMvp(), selectedMemoryIds, statusText: '' });
      renderScreen();
    });
  });

  const messageInput = document.querySelector('[data-couple-message]');
  messageInput?.addEventListener('blur', () => {
    writeMvp({ ...readMvp(), partnerMessage: messageInput.value.trim() });
  });

  const generateButton = document.querySelector('[data-couple-generate]');
  generateButton?.addEventListener('click', () => {
    const state = getState();
    const mvp = readMvp();
    const selectedMemoryIds = Array.isArray(mvp.selectedMemoryIds) ? mvp.selectedMemoryIds : [];
    const selected = (state.recordMemories || []).filter((memory) => selectedMemoryIds.includes(memory.id));
    if (!selected.length) return;
    writeMvp({
      ...mvp,
      generatedAt: new Date().toISOString(),
      coverTitle: 'Two of Us',
      coverSubtitle: `${selected.length}枚の写真から作成`,
      statusText: 'プレビューを作成しました。',
    });
    renderScreen();
  });

  const openButton = document.querySelector('[data-couple-open]');
  openButton?.addEventListener('click', () => {
    writeMvp({ ...readMvp(), statusText: 'ふたりで開封するモックを開始しました（同期機能は未実装）。' });
    renderScreen();
  });

  const paperButton = document.querySelector('[data-couple-paper]');
  paperButton?.addEventListener('click', () => {
    writeMvp({ ...readMvp(), statusText: '紙で残すモックへ進みました（決済・配送は未実装）。' });
    renderScreen();
  });

  const form = document.getElementById('issueForm');
  if (!form) return;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const postIds = formData.getAll('issuePostIds').map((id) => String(id));
    if (!postIds.length) return;

    saveIssue({
      title: String(formData.get('title')).trim(),
      subtitle: String(formData.get('subtitle') || '').trim(),
      tone: String(formData.get('tone') || 'soft'),
      postIds,
    });

    renderScreen();
  });
}

async function applyRecordPhotoFile(file) {
  if (!file) return;
  const imageData = await fileToWebpDataUrl(file, { maxWidth: 1600, quality: 0.88 });
  const now = new Date();
  uiState.recordDraft = {
    ...(uiState.recordDraft || {}),
    imageData,
    time: now.toTimeString().slice(0, 5),
    place: uiState.recordDraft?.place || '',
    memo: uiState.recordDraft?.memo || '',
  };
  renderScreen();
}

const RECORD_CAMERA_FILTER_PREVIEWS = {
  none: 'none',
  'canon-ixy': 'contrast(1.12) saturate(1.24) brightness(1.07) sepia(0.08)',
  'nikon-d200': 'contrast(1.2) saturate(0.94) brightness(0.96) sepia(0.04)',
};

function getRecordCameraFilterValue(filterId = 'none') {
  return RECORD_CAMERA_FILTER_PREVIEWS[filterId] || RECORD_CAMERA_FILTER_PREVIEWS.none;
}

function stopRecordCameraStream() {
  if (!recordCameraStream) return;
  recordCameraStream.getTracks().forEach((track) => track.stop());
  recordCameraStream = null;
}

async function startRecordCameraStream() {
  const video = document.querySelector('[data-record-camera-video]');
  if (!video || !navigator.mediaDevices?.getUserMedia) {
    video?.closest('.record-camera-preview')?.classList.add('is-camera-unavailable');
    return;
  }
  const facingMode = uiState.recordDraft?.facingMode === 'user' ? 'user' : 'environment';
  stopRecordCameraStream();
  try {
    let stream = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facingMode } },
        audio: false,
      });
    } catch (constraintError) {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    }
    recordCameraStream = stream;
    video.setAttribute('playsinline', '');
    video.muted = true;
    video.srcObject = stream;
    await video.play().catch(() => {});
    video.closest('.record-camera-preview')?.classList.add('is-live');
  } catch (error) {
    console.warn('Record camera stream failed.', error);
    video.closest('.record-camera-preview')?.classList.add('is-camera-unavailable');
  }
}

function clampChannel(value) {
  return Math.max(0, Math.min(255, value));
}

function adjustRecordCameraPixel(r, g, b, options) {
  const contrast = options.contrast || 1;
  const exposure = options.exposure || 0;
  const saturation = options.saturation || 1;
  const warmth = options.warmth || 0;
  const greenShift = options.greenShift || 0;
  let nr = (r - 128) * contrast + 128 + exposure;
  let ng = (g - 128) * contrast + 128 + exposure;
  let nb = (b - 128) * contrast + 128 + exposure;
  const luma = nr * 0.299 + ng * 0.587 + nb * 0.114;
  nr = luma + (nr - luma) * saturation + warmth;
  ng = luma + (ng - luma) * saturation + greenShift;
  nb = luma + (nb - luma) * saturation - warmth * 0.45;
  return [nr, ng, nb];
}

function drawRecordCameraSource(ctx, source, outputWidth, outputHeight, zoom = 1) {
  const sourceWidth = source.videoWidth || source.naturalWidth || source.width;
  const sourceHeight = source.videoHeight || source.naturalHeight || source.height;
  if (!sourceWidth || !sourceHeight) return false;
  const scale = Math.max(outputWidth / sourceWidth, outputHeight / sourceHeight) * zoom;
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;
  ctx.drawImage(
    source,
    (outputWidth - drawWidth) / 2,
    (outputHeight - drawHeight) / 2,
    drawWidth,
    drawHeight,
  );
  return true;
}

function applyRecordCameraPixelFilter(ctx, width, height, filterId) {
  if (filterId === 'none') return;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const centerX = width / 2;
  const centerY = height / 2;
  const maxDistance = Math.hypot(centerX, centerY);

  for (let index = 0; index < data.length; index += 4) {
    const pixelIndex = index / 4;
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);
    const normalizedDistance = Math.hypot(x - centerX, y - centerY) / maxDistance;
    const luma = data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;
    const random = Math.random() - 0.5;

    if (filterId === 'canon-ixy') {
      const flashLift = Math.max(0, 1 - normalizedDistance * 1.75) * 34;
      const vignette = normalizedDistance * normalizedDistance * 22;
      const highlightClip = luma > 210 ? (luma - 210) * 0.5 : 0;
      const colorNoise = (luma < 105 ? 16 : 5) * random;
      let [r, g, b] = adjustRecordCameraPixel(data[index], data[index + 1], data[index + 2], {
        contrast: 1.13,
        exposure: 14 + flashLift - vignette + highlightClip,
        saturation: 1.2,
        warmth: 5,
        greenShift: 1,
      });
      r += colorNoise * 1.25;
      g += colorNoise * 0.35;
      b -= colorNoise * 1.1;
      data[index] = clampChannel(r);
      data[index + 1] = clampChannel(g);
      data[index + 2] = clampChannel(b);
    } else if (filterId === 'nikon-d200') {
      const vignette = normalizedDistance * normalizedDistance * 30;
      const shadowPull = luma < 90 ? -10 : 0;
      const grain = (luma < 120 ? 12 : 5) * random;
      let [r, g, b] = adjustRecordCameraPixel(data[index], data[index + 1], data[index + 2], {
        contrast: 1.22,
        exposure: -5 - vignette + shadowPull,
        saturation: 0.98,
        warmth: 3,
        greenShift: 2,
      });
      r += grain;
      g += grain * 0.9;
      b += grain * 0.75;
      data[index] = clampChannel(r);
      data[index + 1] = clampChannel(g);
      data[index + 2] = clampChannel(b);
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

function addRecordCameraSoftness(ctx, width, height, filterId) {
  if (filterId === 'none') return;
  const overlay = document.createElement('canvas');
  overlay.width = width;
  overlay.height = height;
  const overlayCtx = overlay.getContext('2d');
  if (!overlayCtx) return;
  overlayCtx.filter = filterId === 'canon-ixy' ? 'blur(0.55px)' : 'blur(0.25px)';
  overlayCtx.drawImage(ctx.canvas, 0, 0);
  ctx.save();
  ctx.globalAlpha = filterId === 'canon-ixy' ? 0.22 : 0.12;
  ctx.drawImage(overlay, 0, 0);
  ctx.restore();
}

function getRecordCaptureAspectRatio(frame = uiState.recordDraft?.frame) {
  return frame === 'portrait' ? 0.772 : 1.183;
}

function drawFilteredImageToCanvas(source, filterId = 'none', frame = uiState.recordDraft?.frame) {
  const sourceWidth = source.videoWidth || source.naturalWidth || source.width;
  const sourceHeight = source.videoHeight || source.naturalHeight || source.height;
  if (!sourceWidth || !sourceHeight) return '';
  const isIxy = filterId === 'canon-ixy';
  const isD200 = filterId === 'nikon-d200';
  const aspectRatio = getRecordCaptureAspectRatio(frame);
  const canvas = document.createElement('canvas');
  canvas.width = Math.min(1600, sourceWidth);
  canvas.height = Math.round(canvas.width / aspectRatio);
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  const zoom = isIxy ? 1.16 : isD200 ? 1.32 : 1;
  if (!drawRecordCameraSource(ctx, source, canvas.width, canvas.height, zoom)) return '';
  applyRecordCameraPixelFilter(ctx, canvas.width, canvas.height, filterId);
  addRecordCameraSoftness(ctx, canvas.width, canvas.height, filterId);
  const quality = isIxy ? 0.74 : isD200 ? 0.88 : 0.92;
  return canvas.toDataURL('image/jpeg', quality);
}

async function applyRecordAlbumFile(file) {
  if (!file) return;
  const imageData = await fileToWebpDataUrl(file, { maxWidth: 1600, quality: 0.88 });
  const image = await loadCanvasImage(imageData);
  const filteredImageData = image
    ? drawFilteredImageToCanvas(image, uiState.recordDraft?.filter || 'none')
    : imageData;
  const now = new Date();
  uiState.recordDraft = {
    ...(uiState.recordDraft || {}),
    imageData: filteredImageData || imageData,
    filter: 'none',
    frame: uiState.recordDraft?.frame === 'portrait' ? 'portrait' : 'landscape',
    time: uiState.recordDraft?.time || now.toTimeString().slice(0, 5),
    place: uiState.recordDraft?.place || '',
    memo: uiState.recordDraft?.memo || '',
  };
  stopRecordCameraStream();
  renderScreen();
}

function captureRecordCameraPhoto() {
  const video = document.querySelector('[data-record-camera-video]');
  if (!video) return false;
  const imageData = drawFilteredImageToCanvas(video, uiState.recordDraft?.filter || 'none');
  if (!imageData) return false;
  uiState.recordDraft = {
    ...(uiState.recordDraft || {}),
    imageData,
    filter: 'none',
    frame: uiState.recordDraft?.frame === 'portrait' ? 'portrait' : 'landscape',
    time: new Date().toTimeString().slice(0, 5),
    place: uiState.recordDraft?.place || '',
    memo: uiState.recordDraft?.memo || '',
  };
  stopRecordCameraStream();
  renderScreen();
  return true;
}

function getRecordSelectedMemoriesForExport() {
  const selectedIds = uiState.recordSelectedIds || [];
  const selectedSet = new Set(selectedIds);
  return selectedIds
    .map((id) => (getState().recordMemories || []).find((memory) => selectedSet.has(memory.id) && memory.id === id))
    .filter(Boolean)
    .slice(0, 3);
}

function recordSlotToCanvasRect(slot, width, height) {
  return {
    x: (slot.x / 100) * width,
    y: (slot.y / 100) * height,
    width: (slot.width / 100) * width,
    height: (slot.height / 100) * height,
  };
}

function formatRecordPageDate(dateKey = getTodayDateKey()) {
  const date = parseDateKey(dateKey || getTodayDateKey());
  return `${date.year}.${String(date.month).padStart(2, '0')}.${String(date.day).padStart(2, '0')}`;
}

function loadCanvasImage(src) {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function drawCoverImage(ctx, image, rect) {
  if (!image) return;
  drawCroppedCoverImage(ctx, image, rect);
}

function getRecordPageCrop(memory) {
  return {
    x: Math.min(1, Math.max(0, Number(memory?.pageCrop?.x) || 0.5)),
    y: Math.min(1, Math.max(0, Number(memory?.pageCrop?.y) || 0.5)),
    zoom: Math.max(1, Number(memory?.pageCrop?.zoom) || 1),
  };
}

function drawCroppedCoverImage(ctx, image, rect, crop = { x: 0.5, y: 0.5, zoom: 1 }, options = {}) {
  if (!image) return;
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  if (!sourceWidth || !sourceHeight) return;
  const scale = Math.max(rect.width / sourceWidth, rect.height / sourceHeight) * Math.max(1, Number(crop?.zoom) || 1);
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;
  const overflowX = Math.max(0, drawWidth - rect.width);
  const overflowY = Math.max(0, drawHeight - rect.height);
  const focusX = Math.min(1, Math.max(0, Number(crop?.x) || 0.5));
  const focusY = Math.min(1, Math.max(0, Number(crop?.y) || 0.5));
  const drawX = rect.x - overflowX * focusX;
  const drawY = rect.y - overflowY * focusY;
  if (!options.featherEdges) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.width, rect.height);
    ctx.clip();
    ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
    ctx.restore();
    return;
  }

  const edge = Math.max(8, Math.min(rect.width, rect.height) * 0.07);
  const layer = document.createElement('canvas');
  layer.width = Math.max(1, Math.round(rect.width));
  layer.height = Math.max(1, Math.round(rect.height));
  const layerCtx = layer.getContext('2d');
  if (!layerCtx) return;

  layerCtx.drawImage(
    image,
    drawX - rect.x,
    drawY - rect.y,
    drawWidth,
    drawHeight,
  );
  layerCtx.globalCompositeOperation = 'destination-in';

  const horizontalMask = layerCtx.createLinearGradient(0, 0, layer.width, 0);
  horizontalMask.addColorStop(0, 'rgba(0,0,0,0)');
  horizontalMask.addColorStop(Math.min(0.5, edge / layer.width), 'rgba(0,0,0,1)');
  horizontalMask.addColorStop(Math.max(0.5, 1 - (edge / layer.width)), 'rgba(0,0,0,1)');
  horizontalMask.addColorStop(1, 'rgba(0,0,0,0)');
  layerCtx.fillStyle = horizontalMask;
  layerCtx.fillRect(0, 0, layer.width, layer.height);

  const verticalMask = layerCtx.createLinearGradient(0, 0, 0, layer.height);
  verticalMask.addColorStop(0, 'rgba(0,0,0,0)');
  verticalMask.addColorStop(Math.min(0.5, edge / layer.height), 'rgba(0,0,0,1)');
  verticalMask.addColorStop(Math.max(0.5, 1 - (edge / layer.height)), 'rgba(0,0,0,1)');
  verticalMask.addColorStop(1, 'rgba(0,0,0,0)');
  layerCtx.fillStyle = verticalMask;
  layerCtx.fillRect(0, 0, layer.width, layer.height);

  ctx.drawImage(layer, rect.x, rect.y, rect.width, rect.height);
}

function drawCenteredText(ctx, text, x, y, maxWidth) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y, maxWidth);
}

const RECORD_EXPORT_PREVIEW_WIDTH = 390;

function recordExportScale(pageWidth) {
  return pageWidth / RECORD_EXPORT_PREVIEW_WIDTH;
}

function drawRecordTime(ctx, time, rect) {
  const scale = recordExportScale(1414);
  const y = rect.y - 12.8 * scale;
  const centerX = rect.x + rect.width / 2;
  const lineGap = 58 * scale;
  ctx.save();
  ctx.strokeStyle = 'rgba(48, 38, 35, 0.28)';
  ctx.lineWidth = 1.4 * scale;
  ctx.beginPath();
  ctx.moveTo(rect.x, y);
  ctx.lineTo(centerX - lineGap, y);
  ctx.moveTo(centerX + lineGap, y);
  ctx.lineTo(rect.x + rect.width, y);
  ctx.stroke();
  ctx.fillStyle = '#302623';
  ctx.font = `${18.4 * scale}px "Cormorant Garamond", "Times New Roman", serif`;
  drawCenteredText(ctx, String(time || ''), centerX, y - 1 * scale, lineGap * 1.7);
  ctx.restore();
}

function drawLocationPin(ctx, x, y, size) {
  ctx.save();
  ctx.fillStyle = '#b46a62';
  ctx.beginPath();
  ctx.arc(x, y - size * 0.18, size * 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x, y + size * 0.55);
  ctx.quadraticCurveTo(x - size * 0.45, y, x, y - size * 0.5);
  ctx.quadraticCurveTo(x + size * 0.45, y, x, y + size * 0.55);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x, y - size * 0.18, size * 0.13, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function wrapCanvasText(ctx, text, maxWidth) {
  const source = String(text || '').replace(/\r/g, '').split('\n');
  const lines = [];
  source.forEach((paragraph) => {
    let line = '';
    Array.from(paragraph).forEach((char) => {
      const next = `${line}${char}`;
      if (line && ctx.measureText(next).width > maxWidth) {
        lines.push(line);
        line = char;
      } else {
        line = next;
      }
    });
    lines.push(line);
  });
  return lines.filter((line) => line.length);
}

function getRecordTextSlotLayout(ctx, place, memo, rect, scale, maxWidth) {
  const minPlaceSize = 12.4 * scale;
  const minMemoSize = 8.8 * scale;
  let placeSize = 16.2 * scale;
  let memoSize = 11.8 * scale;
  let placeLines = [];
  let memoLines = [];
  let lineHeight = memoSize * 1.74;
  const availableHeight = rect.height - Math.min(rect.width, rect.height) * 0.11;

  for (let attempt = 0; attempt < 18; attempt += 1) {
    ctx.font = `600 ${placeSize}px "Shippori Mincho", "Noto Serif JP", serif`;
    placeLines = wrapCanvasText(ctx, place, maxWidth - 22 * scale).slice(0, 2);
    const placeBlockHeight = Math.max(placeSize * 1.32, placeLines.length * placeSize * 1.28);
    ctx.font = `${memoSize}px "Shippori Mincho", "Noto Serif JP", serif`;
    memoLines = wrapCanvasText(ctx, memo, maxWidth);
    lineHeight = memoSize * 1.74;
    const totalHeight = placeBlockHeight + 15 * scale + memoLines.length * lineHeight;
    if (totalHeight <= availableHeight || (placeSize <= minPlaceSize && memoSize <= minMemoSize)) {
      return { placeSize, memoSize, placeLines, memoLines, lineHeight, placeBlockHeight, totalHeight };
    }
    placeSize = Math.max(minPlaceSize, placeSize * 0.94);
    memoSize = Math.max(minMemoSize, memoSize * 0.92);
  }

  return { placeSize, memoSize, placeLines, memoLines, lineHeight, placeBlockHeight: placeSize * 1.32, totalHeight: availableHeight };
}

function drawRecordTextSlot(ctx, memory, rect) {
  const scale = recordExportScale(1414);
  const padding = Math.min(rect.width, rect.height) * 0.055;
  const left = rect.x + padding;
  const maxWidth = rect.width - padding * 2;
  const place = String(memory?.place || '場所未設定');
  const memo = String(memory?.memo || '今日の思い出');
  const layout = getRecordTextSlotLayout(ctx, place, memo, rect, scale, maxWidth);
  const maxY = rect.y + rect.height - padding;
  const baseTop = rect.y + padding;
  const liftedTop = Math.max(rect.y + padding * 0.25, maxY - layout.totalHeight - padding * 0.4);
  const top = Math.min(baseTop, liftedTop);

  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  drawLocationPin(ctx, left + 8 * scale, top + layout.placeSize * 0.72, Math.max(12 * scale, layout.placeSize * 0.98));
  ctx.fillStyle = '#6f4d48';
  ctx.font = `600 ${layout.placeSize}px "Shippori Mincho", "Noto Serif JP", serif`;
  let placeY = top;
  layout.placeLines.forEach((line) => {
    ctx.fillText(line, left + 22 * scale, placeY, maxWidth - 22 * scale);
    placeY += layout.placeSize * 1.28;
  });
  const longestPlaceWidth = layout.placeLines.length
    ? Math.max(...layout.placeLines.map((line) => ctx.measureText(line).width), 0)
    : 0;
  const underlineY = top + layout.placeBlockHeight + 4 * scale;
  const underlineWidth = Math.min(maxWidth, Math.max(82 * scale, longestPlaceWidth + 24 * scale));
  ctx.strokeStyle = 'rgba(48, 38, 35, 0.24)';
  ctx.lineWidth = 1.4 * scale;
  ctx.beginPath();
  ctx.moveTo(left, underlineY);
  ctx.lineTo(left + underlineWidth, underlineY);
  ctx.stroke();

  ctx.fillStyle = '#4f4440';
  ctx.font = `${layout.memoSize}px "Shippori Mincho", "Noto Serif JP", serif`;
  let y = underlineY + 13 * scale;
  layout.memoLines.forEach((line) => {
    if (y + layout.lineHeight <= maxY) {
      ctx.fillText(line, left, y, maxWidth);
      y += layout.lineHeight;
    }
  });
  ctx.restore();
}

async function renderRecordPageToCanvasDataUrl() {
  if (document.fonts?.ready) {
    await Promise.race([
      document.fonts.ready,
      new Promise((resolve) => window.setTimeout(resolve, 1000)),
    ]);
  }
  const width = 1414;
  const height = 2000;
  const memories = getRecordSelectedMemoriesForExport();
  if (memories.length !== 3) return '';
  const template = getRecordTemplateById(uiState.recordTemplateId || DEFAULT_RECORD_TEMPLATE);
  const background = getRecordBackgroundById(uiState.recordBackgroundId || DEFAULT_RECORD_BACKGROUND);
  const title = String(uiState.recordTitle || '').trim() || 'A day to remember';
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  const backgroundImage = background.src ? await loadCanvasImage(background.src) : null;
  if (backgroundImage) {
    drawCoverImage(ctx, backgroundImage, { x: 0, y: 0, width, height });
  }

  ctx.save();
  ctx.fillStyle = 'rgba(48, 38, 35, 0.72)';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.font = '500 34px "Cormorant Garamond", "Times New Roman", serif';
  ctx.fillText(formatRecordPageDate(uiState.recordDate || getTodayDateKey()), width * 0.912, height * 0.049, width * 0.28);
  ctx.restore();

  if (template.titleSlot) {
    const titleRect = recordSlotToCanvasRect(template.titleSlot, width, height);
    ctx.save();
    ctx.fillStyle = '#302623';
    ctx.font = '700 58px "Shippori Mincho", "Noto Serif JP", serif';
    drawCenteredText(ctx, title, titleRect.x + titleRect.width / 2, titleRect.y + titleRect.height / 2, titleRect.width * 0.92);
    ctx.restore();
  }

  const images = await Promise.all(memories.map((memory) => loadCanvasImage(memory.imageData)));
  template.imageSlots.forEach((slot, index) => {
    const rect = recordSlotToCanvasRect(slot, width, height);
    if (!images[index]) {
      ctx.fillStyle = '#ffe4e4';
      ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
      return;
    }
    drawRecordTime(ctx, memories[index]?.time, rect);
    drawCroppedCoverImage(ctx, images[index], rect, getRecordPageCrop(memories[index]), {
      featherEdges: uiState.recordPhotoFeather !== false,
    });
  });

  template.textSlots.forEach((slot, index) => {
    drawRecordTextSlot(ctx, memories[index], recordSlotToCanvasRect(slot, width, height));
  });

  return canvas.toDataURL('image/png');
}

async function captureRecordPageImage() {
  try {
    return await renderRecordPageToCanvasDataUrl();
  } catch (error) {
    console.warn('Record page capture failed.', error);
    return '';
  }
}

function getRecordPageImageFilename() {
  const dateKey = uiState.recordDate || new Date().toISOString().slice(0, 10);
  return `memory-page-${dateKey.replaceAll('-', '')}.png`;
}

function getRecordPhotoFilename() {
  const date = new Date();
  return `memory-photo-${formatDateKey(date.getFullYear(), date.getMonth() + 1, date.getDate()).replaceAll('-', '')}-${date.toTimeString().slice(0, 5).replace(':', '')}.jpg`;
}

function isMobileLikeDevice() {
  const userAgent = navigator.userAgent || '';
  const isTouchMac = /Macintosh/i.test(userAgent) && Number(navigator.maxTouchPoints || 0) > 1;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent) || isTouchMac;
}

function downloadBlobFile(blob, filename) {
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
}

async function saveRecordPageImageToDevice() {
  const titleInput = document.querySelector('.record-generated-page [data-record-title]');
  if (titleInput) {
    uiState.recordTitle = titleInput.value || '';
  }

  const imageData = await captureRecordPageImage();
  if (!imageData) return false;

  const filename = getRecordPageImageFilename();
  const blob = composeDataUrlToBlob(imageData);
  if (!blob) return false;

  if (!isMobileLikeDevice()) {
    downloadBlobFile(blob, filename);
    return true;
  }

  const file = new File([blob], filename, { type: blob.type || 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: uiState.recordTitle || 'Memory page',
      });
      return true;
    } catch (error) {
      if (error?.name === 'AbortError') return false;
    }
  }

  downloadBlobFile(blob, filename);
  return true;
}

async function saveRecordPhotoToDevice() {
  const imageData = uiState.recordDraft?.imageData || '';
  const blob = composeDataUrlToBlob(imageData);
  if (!blob) return false;
  const filename = getRecordPhotoFilename();
  if (!isMobileLikeDevice()) {
    downloadBlobFile(blob, filename);
    return true;
  }
  const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Memory photo' });
      return true;
    } catch (error) {
      if (error?.name === 'AbortError') return false;
    }
  }
  downloadBlobFile(blob, filename);
  return true;
}

async function saveRecordGeneratedPage({ publish = false } = {}) {
  const selectedIds = uiState.recordSelectedIds || [];
  if (selectedIds.length !== 3) return false;
  const imageData = await captureRecordPageImage();
  if (!imageData) return false;
  const profileName = String(getState().profile?.name || 'you').trim() || 'you';
  const title = String(uiState.recordTitle || '').trim() || 'A day to remember';

  if (publish) {
    addPost({
      authorName: profileName,
      caption: '今日の思い出が1ページになりました',
      imageData,
      fixedTags: ['record'],
      freeTags: [],
      composeData: {
        source: 'record',
        recordMemoryIds: selectedIds.slice(0, 3),
        recordTemplateId: uiState.recordTemplateId || DEFAULT_RECORD_TEMPLATE,
        recordBackgroundId: uiState.recordBackgroundId || DEFAULT_RECORD_BACKGROUND,
        recordPhotoFeather: uiState.recordPhotoFeather !== false,
        title,
      },
    });
    uiState.screen = 'timeline';
    uiState.timelineTab = 'recommended';
  } else {
    upsertDraft({
      title,
      imageData,
      composeData: {
        source: 'record',
        recordMemoryIds: selectedIds.slice(0, 3),
        recordTemplateId: uiState.recordTemplateId || DEFAULT_RECORD_TEMPLATE,
        recordBackgroundId: uiState.recordBackgroundId || DEFAULT_RECORD_BACKGROUND,
        recordPhotoFeather: uiState.recordPhotoFeather !== false,
        title,
      },
    });
    uiState.screen = 'profile';
    uiState.profileAuthor = null;
    uiState.profileSection = 'drafts';
    uiState.profileExpanded = true;
  }

  uiState.recordStage = 'home';
  uiState.recordDraft = null;
  uiState.recordEditingId = null;
  uiState.recordSelectedIds = [];
  uiState.recordBackgroundId = DEFAULT_RECORD_BACKGROUND;
  uiState.recordPhotoFeather = true;
  uiState.recordTitle = '';
  render();
  return true;
}

function bindRecordEvents() {
  if (uiState.recordStage === 'camera' && !uiState.recordDraft?.imageData) {
    startRecordCameraStream();
  } else {
    stopRecordCameraStream();
  }

  document.querySelectorAll('[data-record-stage]').forEach((button) => {
    button.addEventListener('click', () => {
      uiState.recordStage = button.dataset.recordStage || 'home';
      if (uiState.recordStage !== 'edit') {
        uiState.recordEditingId = null;
      }
      renderScreen();
    });
  });

  document.querySelectorAll('[data-record-back-home]').forEach((button) => {
    button.addEventListener('click', () => {
      stopRecordCameraStream();
      uiState.recordStage = 'home';
      uiState.recordDraft = null;
      uiState.recordEditingId = null;
      renderScreen();
    });
  });

  document.querySelectorAll('[data-record-open-camera]').forEach((button) => {
    button.addEventListener('click', () => {
      uiState.recordStage = 'camera';
      uiState.recordDraft = {
        imageData: '',
        time: new Date().toTimeString().slice(0, 5),
        place: '',
        memo: '',
        filter: 'none',
        facingMode: 'environment',
        frame: 'landscape',
      };
      renderScreen();
    });
  });

  document.querySelector('[data-record-switch-frame]')?.addEventListener('click', () => {
    uiState.recordDraft = {
      ...(uiState.recordDraft || {}),
      frame: uiState.recordDraft?.frame === 'portrait' ? 'landscape' : 'portrait',
    };
    renderScreen();
  });

  document.querySelector('[data-record-switch-camera]')?.addEventListener('click', () => {
    uiState.recordDraft = {
      ...(uiState.recordDraft || {}),
      facingMode: uiState.recordDraft?.facingMode === 'user' ? 'environment' : 'user',
    };
    stopRecordCameraStream();
    renderScreen();
  });

  document.querySelector('[data-record-open-camera-input]')?.addEventListener('click', () => {
    if (captureRecordCameraPhoto()) return;
    document.querySelector('[data-record-camera-input]')?.click();
  });

  document.querySelector('[data-record-open-album]')?.addEventListener('click', () => {
    document.querySelector('[data-record-album-input]')?.click();
  });

  document.querySelectorAll('[data-record-camera-input], [data-record-album-input]').forEach((input) => {
    input.addEventListener('change', async (event) => {
      await applyRecordAlbumFile(event.target.files?.[0]);
      event.target.value = '';
    });
  });

  document.querySelectorAll('[data-record-filter]').forEach((button) => {
    button.addEventListener('click', () => {
      uiState.recordDraft = {
        ...(uiState.recordDraft || {}),
        filter: button.dataset.recordFilter || 'none',
      };
      renderScreen();
    });
  });

  document.querySelector('[data-record-save]')?.addEventListener('click', () => {
    const draft = uiState.recordDraft || {};
    if (!draft.imageData) return;
    const saved = addRecordMemory({
      ...draft,
      place: document.querySelector('[data-record-place]')?.value || draft.place || '',
      memo: document.querySelector('[data-record-memo]')?.value || draft.memo || '',
    });
    stopRecordCameraStream();
    uiState.recordDraft = null;
    uiState.recordStage = 'select';
    uiState.recordSelectedIds = [saved.id];
    render();
  });

  document.querySelector('[data-record-save-photo]')?.addEventListener('click', async () => {
    await saveRecordPhotoToDevice();
  });

  document.querySelectorAll('[data-record-edit-memory]').forEach((button) => {
    button.addEventListener('click', () => {
      uiState.recordEditingId = button.dataset.recordEditMemory || null;
      uiState.recordStage = 'edit';
      renderScreen();
    });
  });

  document.querySelector('[data-record-update-memory]')?.addEventListener('click', () => {
    const id = uiState.recordEditingId;
    if (!id) return;
    updateRecordMemory(id, {
      place: document.querySelector('[data-record-edit-place]')?.value || '',
      memo: document.querySelector('[data-record-edit-memo]')?.value || '',
    });
    uiState.recordEditingId = null;
    uiState.recordStage = 'home';
    renderScreen();
  });

  document.querySelectorAll('[data-record-toggle-memory]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.recordToggleMemory;
      const selectedIds = (uiState.recordSelectedIds || []).filter(Boolean).slice(0, 3);
      const selectedIndex = selectedIds.indexOf(id);
      if (selectedIndex >= 0) {
        selectedIds.splice(selectedIndex, 1);
      } else if (selectedIds.length < 3) {
        selectedIds.push(id);
      }
      uiState.recordSelectedIds = selectedIds;
      renderScreen();
    });
  });

  document.querySelectorAll('[data-record-move-memory]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const id = button.dataset.recordMoveMemory;
      const direction = Number(button.dataset.recordMoveDirection || 0);
      const selectedIds = (uiState.recordSelectedIds || []).filter(Boolean).slice(0, 3);
      const index = selectedIds.indexOf(id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= selectedIds.length) return;
      [selectedIds[index], selectedIds[nextIndex]] = [selectedIds[nextIndex], selectedIds[index]];
      uiState.recordSelectedIds = selectedIds;
      renderScreen();
    });
  });

  document.querySelectorAll('[data-record-template]').forEach((button) => {
    button.addEventListener('click', () => {
      const grid = button.closest('[data-record-template-grid]');
      uiState.recordTemplateScrollLeft = grid?.scrollLeft || 0;
      uiState.recordTemplateId = button.dataset.recordTemplate || DEFAULT_RECORD_TEMPLATE;
      renderScreen();
      requestAnimationFrame(() => {
        const nextGrid = document.querySelector('[data-record-template-grid]');
        if (nextGrid) nextGrid.scrollLeft = uiState.recordTemplateScrollLeft || 0;
      });
    });
  });

  document.querySelectorAll('[data-record-background]').forEach((button) => {
    button.addEventListener('click', () => {
      const grid = button.closest('[data-record-background-grid]');
      uiState.recordBackgroundScrollLeft = grid?.scrollLeft || 0;
      uiState.recordBackgroundId = button.dataset.recordBackground || DEFAULT_RECORD_BACKGROUND;
      renderScreen();
      requestAnimationFrame(() => {
        const nextGrid = document.querySelector('[data-record-background-grid]');
        if (nextGrid) nextGrid.scrollLeft = uiState.recordBackgroundScrollLeft || 0;
      });
    });
  });

  document.querySelectorAll('[data-record-photo-feather]').forEach((button) => {
    button.addEventListener('click', () => {
      uiState.recordPhotoFeather = button.dataset.recordPhotoFeather !== 'false';
      renderScreen();
    });
  });

  document.querySelector('[data-record-title]')?.addEventListener('input', (event) => {
    uiState.recordTitle = event.target.value || '';
  });

  document.querySelector('[data-record-create-page]')?.addEventListener('click', () => {
    if ((uiState.recordSelectedIds || []).length !== 3) return;
    uiState.recordTitle = document.querySelector('[data-record-title]')?.value || uiState.recordTitle || '';
    uiState.recordStage = 'complete';
    renderScreen();
  });

  document.querySelector('[data-record-save-page]')?.addEventListener('click', async (event) => {
    const button = event.currentTarget;
    const previousText = button.textContent;
    button.disabled = true;
    button.textContent = '保存中';
    button.textContent = '写真保存中';
    const saved = await saveRecordPageImageToDevice();
    if (!saved) {
      button.disabled = false;
      button.textContent = previousText || '保存する';
      return;
    }
    button.disabled = false;
    button.textContent = previousText || '保存する';
  });

  document.querySelector('[data-record-post-page]')?.addEventListener('click', async (event) => {
    const button = event.currentTarget;
    const previousText = button.textContent;
    button.disabled = true;
    button.textContent = '投稿中';
    const posted = await saveRecordGeneratedPage({ publish: true });
    if (!posted) {
      button.disabled = false;
      button.textContent = previousText || '投稿する';
    }
  });
}

function bindProfileEvents() {
  bindPostInteractions(document.getElementById('screenArea'));
  bindScreenScrollSurfaces();

  function loadImageSize(file) {
    return new Promise((resolve) => {
      const image = new Image();
      const url = URL.createObjectURL(file);
      image.onload = () => {
        resolve({ width: image.naturalWidth, height: image.naturalHeight });
        URL.revokeObjectURL(url);
      };
      image.onerror = () => {
        resolve(null);
        URL.revokeObjectURL(url);
      };
      image.src = url;
    });
  }

  document.querySelectorAll('[data-profile-avatar-upload]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      uiState.profileExpanded = true;
      uiState.profileSection = 'edit';
      renderScreen();
      window.setTimeout(() => {
        document.getElementById('profileAvatarInput')?.click();
      }, 0);
    });
  });

  document.querySelectorAll('[data-profile-open-edit]').forEach((button) => {
    button.addEventListener('click', () => {
      uiState.profileSection = 'edit';
      renderScreen();
    });
  });

  document.querySelectorAll('[data-profile-section]').forEach((button) => {
    button.addEventListener('click', () => {
      uiState.profileSection = button.dataset.profileSection;
      renderScreen();
    });
  });

  document.querySelectorAll('[data-open-date-list]').forEach((button) => {
    button.addEventListener('click', () => {
      uiState.coupleView = 'dateList';
      uiState.dateListTab = 'upcoming';
      uiState.screen = 'search';
      render();
    });
  });

  document.querySelectorAll('[data-open-pages-list]').forEach((button) => {
    button.addEventListener('click', () => {
      uiState.coupleView = 'pageList';
      uiState.screen = 'search';
      render();
    });
  });

  document.querySelectorAll('[data-open-draft-list]').forEach((button) => {
    button.addEventListener('click', () => {
      uiState.coupleView = 'draftList';
      uiState.screen = 'search';
      render();
    });
  });

  document.querySelectorAll('[data-open-todo-list]').forEach((button) => {
    button.addEventListener('click', () => {
      uiState.coupleView = 'todoList';
      uiState.todoInputOpen = false;
      uiState.screen = 'search';
      render();
    });
  });

  document.querySelectorAll('[data-profile-library-tab], [data-profile-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      const nextTab = button.dataset.profileTab || button.dataset.profileLibraryTab || 'pages';
      uiState.profileSection = nextTab;
      renderScreen();
    });
  });

  document.querySelectorAll('[data-profile-find-tag]').forEach((button) => {
    button.addEventListener('click', () => {
      const tag = button.dataset.profileFindTag;
      uiState.profileFindTags = uiState.profileFindTags.includes(tag)
        ? uiState.profileFindTags.filter((item) => item !== tag)
        : [...uiState.profileFindTags, tag];
      renderScreen();
    });
  });

  document.querySelectorAll('[data-profile-find-month]').forEach((button) => {
    button.addEventListener('click', () => {
      const month = button.dataset.profileFindMonth || '';
      uiState.profileFindMonth = uiState.profileFindMonth === month ? '' : month;
      renderScreen();
    });
  });

  document.querySelectorAll('[data-profile-find-clear]').forEach((button) => {
    button.addEventListener('click', () => {
      uiState.profileFindQuery = '';
      uiState.profileFindTags = [];
      uiState.profileFindMonth = '';
      renderScreen();
    });
  });

  const profileFindInput = document.getElementById('profileFindInput');
  if (profileFindInput) {
    profileFindInput.addEventListener('input', (event) => {
      uiState.profileFindQuery = event.target.value;
      const cursor = event.target.selectionStart;
      renderScreen();
      const nextInput = document.getElementById('profileFindInput');
      if (nextInput) {
        nextInput.focus();
        nextInput.setSelectionRange(cursor, cursor);
      }
    });
  }

  document.querySelectorAll('[data-open-draft]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      openComposeDraft(button.dataset.openDraft);
    });
  });

  document.querySelectorAll('[data-toggle-draft-menu]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      const targetId = button.dataset.toggleDraftMenu;
      document.querySelectorAll('[data-draft-actions]').forEach((menu) => {
        const shouldOpen = menu.dataset.draftActions === targetId && menu.hidden;
        menu.hidden = !shouldOpen;
        if (menu.dataset.draftActions === targetId) {
          button.setAttribute('aria-expanded', String(shouldOpen));
        }
      });
    });
  });

  document.querySelectorAll('[data-publish-draft]').forEach((button) => {
    button.addEventListener('click', async (event) => {
      event.stopPropagation();
      button.disabled = true;
      await publishComposeDraft(button.dataset.publishDraft);
    });
  });

  document.querySelectorAll('[data-delete-draft]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      deleteDraft(button.dataset.deleteDraft);
      renderScreen();
    });
  });

  const avatarInput = document.getElementById('profileAvatarInput');
  const cropper = document.getElementById('avatarCropper');
  const cropSurface = document.getElementById('avatarCropSurface');
  const cropImage = document.getElementById('avatarCropImage');

  function syncCropPreview() {
    if (!cropper || !cropImage) return;
    if (!profileAvatarDraft.file || !profileAvatarDraft.previewUrl) {
      cropper.hidden = true;
      cropImage.removeAttribute('src');
      return;
    }

    cropper.hidden = false;
    cropImage.src = profileAvatarDraft.previewUrl;
    cropImage.style.objectPosition = `${profileAvatarDraft.crop.x * 100}% ${profileAvatarDraft.crop.y * 100}%`;
    cropImage.style.transform = `scale(${profileAvatarDraft.crop.zoom})`;
  }

  if (avatarInput) {
    avatarInput.addEventListener('change', async (event) => {
      const file = event.target.files?.[0] || null;
      if (profileAvatarDraft.previewUrl) {
        URL.revokeObjectURL(profileAvatarDraft.previewUrl);
        profileAvatarDraft.previewUrl = '';
      }
      profileAvatarDraft.file = file;
      profileAvatarDraft.imageSize = file ? await loadImageSize(file) : null;
      profileAvatarDraft.crop = { x: 0.5, y: 0.5, zoom: 1 };
      if (file) {
        profileAvatarDraft.previewUrl = fileToPreviewUrl(file);
      }
      uiState.profileAvatarCropOpen = Boolean(file);
      renderScreen();
    });
  }

  if (cropSurface) {
    let dragState = null;

    cropSurface.addEventListener('pointerdown', (event) => {
      if (!profileAvatarDraft.file) return;
      dragState = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: profileAvatarDraft.crop.x,
        originY: profileAvatarDraft.crop.y,
      };
      cropSurface.classList.add('is-dragging');
      cropSurface.setPointerCapture?.(event.pointerId);
    });

    cropSurface.addEventListener('pointermove', (event) => {
      if (!dragState || dragState.pointerId !== event.pointerId || !profileAvatarDraft.imageSize) return;
      const rect = cropSurface.getBoundingClientRect();
      const { width, height } = profileAvatarDraft.imageSize;
      const imageRatio = width / height;
      const cropRatio = rect.width / rect.height;
      const baseRenderedWidth = imageRatio > cropRatio ? rect.height * imageRatio : rect.width;
      const baseRenderedHeight = imageRatio > cropRatio ? rect.height : rect.width / imageRatio;
      const renderedWidth = baseRenderedWidth * profileAvatarDraft.crop.zoom;
      const renderedHeight = baseRenderedHeight * profileAvatarDraft.crop.zoom;
      const overflowX = Math.max(0, renderedWidth - rect.width);
      const overflowY = Math.max(0, renderedHeight - rect.height);
      const deltaX = event.clientX - dragState.startX;
      const deltaY = event.clientY - dragState.startY;

      profileAvatarDraft.crop.x = overflowX ? Math.min(1, Math.max(0, dragState.originX - (deltaX / overflowX))) : 0.5;
      profileAvatarDraft.crop.y = overflowY ? Math.min(1, Math.max(0, dragState.originY - (deltaY / overflowY))) : 0.5;
      syncCropPreview();
    });

    const finishDrag = (event) => {
      if (!dragState || dragState.pointerId !== event.pointerId) return;
      dragState = null;
      cropSurface.classList.remove('is-dragging');
      cropSurface.releasePointerCapture?.(event.pointerId);
    };

    cropSurface.addEventListener('pointerup', finishDrag);
    cropSurface.addEventListener('pointercancel', finishDrag);
  }

  syncCropPreview();

  const form = document.getElementById('profileForm');
  if (form) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const avatarData = profileAvatarDraft.file
        ? await cropFileToCirclePngDataUrl(profileAvatarDraft.file, profileAvatarDraft.crop, { size: 320 })
        : getState().profile.avatarData;
      updateProfile({
        name: String(formData.get('name')).trim(),
        bio: String(formData.get('bio')).trim(),
        avatarData,
      });
      resetProfileAvatarDraft();
      uiState.profileSection = 'pages';
      uiState.profileExpanded = true;
      renderScreen();
    });
  }

  document.querySelectorAll('[data-follow-author]').forEach((button) => {
    button.addEventListener('click', () => {
      toggleFollow(button.dataset.followAuthor);
      renderScreen();
    });
  });
}

function bindPostDetailEvents() {
  bindPostInteractions(document.getElementById('screenArea'));
  bindScreenScrollSurfaces();

  document.querySelectorAll('[data-close-post-detail]').forEach((button) => {
    button.addEventListener('click', () => {
      closePostDetail();
    });
  });
}

function bindModalEvents() {
  document.querySelectorAll('[data-close-preview]').forEach((element) => {
    element.addEventListener('click', () => {
      uiState.previewPostId = null;
      renderModals();
    });
  });

  document.querySelectorAll('[data-close-comments]').forEach((element) => {
    element.addEventListener('click', () => {
      uiState.commentPostId = null;
      renderModals();
    });
  });

  document.querySelectorAll('[data-delete-post]').forEach((button) => {
    button.addEventListener('click', () => {
      const postId = button.dataset.deletePost;
      if (!postId) return;
      const post = getActivePost(postId);
      if (!isOwnPost(post)) return;
      if (!window.confirm('この投稿を削除しますか？')) return;

      deletePost(postId);
      if (uiState.previewPostId === postId) {
        uiState.previewPostId = null;
      }
      if (uiState.commentPostId === postId) {
        uiState.commentPostId = null;
      }
      if (uiState.screen === 'post') {
        closePostDetail();
        return;
      }
      renderScreen();
    });
  });

  document.querySelectorAll('[data-comment-form]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const input = form.querySelector('input[name="comment"]');
      addComment(form.dataset.commentForm, input.value);
      uiState.commentPostId = form.dataset.commentForm;
      renderModals();
      renderScreen();
    });
  });
}

function bindPageEvents() {
  bindScreenNavigationEvents();
  switch (uiState.screen) {
    case 'home':
      bindTimelineEvents();
      break;
    case 'timeline':
      bindTimelineEvents();
      break;
    case 'search':
      bindSearchEvents();
      break;
    case 'invite':
      bindInviteEvents();
      break;
    case 'compose':
      bindComposeEvents();
      break;
    case 'magazine':
      bindMagazineEvents();
      break;
    case 'record':
      bindRecordEvents();
      break;
    case 'profile':
      bindProfileEvents();
      break;
    case 'post':
      bindPostDetailEvents();
      break;
    default:
      break;
  }
}

export function bootLegacyApp(root = document.getElementById('app')) {
  if (!root) {
    throw new Error('bootLegacyApp requires an app root element.');
  }
  installViewportStabilityGuards();
  app = root;
  render();
  return { render };
}

if (typeof window !== 'undefined' && !window.__MEMORIES_REACT_HOST__) {
  const fallbackRoot = document.getElementById('app');
  if (fallbackRoot) {
    bootLegacyApp(fallbackRoot);
  }
}
