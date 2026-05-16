import { getIcon } from '../components/icons.js';
import {
  DEFAULT_RECORD_BACKGROUND,
  DEFAULT_RECORD_TEMPLATE,
  getRecordBackgroundById,
  getRecordTemplateById,
  RECORD_BACKGROUNDS,
  RECORD_TEMPLATES,
} from '../templates/recordTemplates.js';

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatTodayLabel(date = new Date()) {
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 (${weekdays[date.getDay()]})`;
}

function getDateKeyFromValue(value = '') {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getTodayDateKey() {
  return getDateKeyFromValue(new Date().toISOString());
}

function getDateFromKey(dateKey = '') {
  const match = String(dateKey).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return new Date();
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function addDaysToDateKey(dateKey = '', days = 0) {
  const date = getDateFromKey(dateKey || getTodayDateKey());
  date.setDate(date.getDate() + days);
  return getDateKeyFromValue(date);
}

function formatPageDate(dateKey = '') {
  const date = getDateFromKey(dateKey || getTodayDateKey());
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
}

function getSelectedMemories(memories, selectedIds) {
  const memoryById = new Map(memories.map((memory) => [memory.id, memory]));
  return (selectedIds || []).map((id) => memoryById.get(id)).filter(Boolean).slice(0, 3);
}

const RECORD_TIME_OF_DAY_OPTIONS = [
  { value: '', label: '未選択' },
  { value: '朝', label: '朝' },
  { value: '昼', label: '昼' },
  { value: '夕', label: '夕' },
  { value: '夜', label: '夜' },
];

function renderRecordTagFields(draft = {}, { edit = false } = {}) {
  const prefix = edit ? 'data-record-edit' : 'data-record';
  const timeOfDay = String(draft.timeOfDay || draft.time_of_day || '');
  return `
    <div class="record-tag-fields" aria-label="写真タグ">
      <label class="record-field">
        <span>場所タグ</span>
        <div class="record-input-wrap">${getIcon('pin')}<input type="text" ${prefix}-place value="${escapeHtml(draft.place || '')}" placeholder="代官山" /></div>
      </label>
      <label class="record-field">
        <span>メモタグ</span>
        <input type="text" ${prefix}-memo value="${escapeHtml(draft.memo || '')}" placeholder="カフェの雰囲気が素敵" />
      </label>
      <label class="record-field">
        <span>値段タグ</span>
        <input type="text" ${prefix}-price value="${escapeHtml(draft.price || '')}" placeholder="3,000円くらい" />
      </label>
      <label class="record-field">
        <span>時間帯タグ</span>
        <select ${prefix}-time-of-day>
          ${RECORD_TIME_OF_DAY_OPTIONS.map((option) => `
            <option value="${escapeHtml(option.value)}" ${timeOfDay === option.value ? 'selected' : ''}>${escapeHtml(option.label)}</option>
          `).join('')}
        </select>
      </label>
      <label class="record-field">
        <span>雰囲気タグ</span>
        <input type="text" ${prefix}-atmosphere value="${escapeHtml(draft.atmosphere || '')}" placeholder="静か / にぎやか / レトロ" />
      </label>
      <label class="record-field">
        <span>天気タグ</span>
        <input type="text" ${prefix}-weather value="${escapeHtml(draft.weather || '')}" placeholder="晴れ / 雨 / 曇り" />
      </label>
      <label class="record-field">
        <span>気分タグ</span>
        <input type="text" ${prefix}-mood value="${escapeHtml(draft.mood || '')}" placeholder="うれしい / のんびり" />
      </label>
    </div>
  `;
}

const RECORD_PRICE_CHOICES = ['〜1,000円', '〜3,000円', '〜5,000円', '5,000円〜'];
const RECORD_TIME_CHOICES = ['朝', '昼', '夕', '夜'];
const RECORD_ATMOSPHERE_CHOICES = ['静か', 'にぎやか', 'おしゃれ', 'レトロ', '自然'];
const RECORD_WEATHER_CHOICES = ['晴れ', '曇り', '雨', '雪'];
const RECORD_MOOD_CHOICES = ['うれしい', 'のんびり', '楽しい', '特別', '落ち着く'];

function renderRecordChoiceField({ label, field, value = '', options = [], edit = false }) {
  const attrPrefix = edit ? 'data-record-edit' : 'data-record';
  const dataPrefix = edit ? 'record-edit' : 'record';
  const selectedValue = String(value || '');
  return `
    <div class="record-choice-field">
      <p>${escapeHtml(label)}</p>
      <input type="hidden" ${attrPrefix}-${field} value="${escapeHtml(selectedValue)}" />
      <div class="record-choice-list" role="group" aria-label="${escapeHtml(label)}">
        ${options.map((option) => `<button class="${selectedValue === option ? 'is-selected' : ''}" type="button" data-${dataPrefix}-choice="${escapeHtml(field)}" data-choice-value="${escapeHtml(option)}">${escapeHtml(option)}</button>`).join('')}
      </div>
    </div>
  `;
}

function renderRecordChoiceFields(draft = {}, { edit = false } = {}) {
  return `
    <div class="record-tag-fields record-tag-fields--extra" aria-label="追加情報">
      ${renderRecordChoiceField({ label: '値段', field: 'price', value: draft.price, options: RECORD_PRICE_CHOICES, edit })}
      ${renderRecordChoiceField({ label: '時間帯', field: 'time-of-day', value: draft.timeOfDay || draft.time_of_day, options: RECORD_TIME_CHOICES, edit })}
      ${renderRecordChoiceField({ label: '雰囲気', field: 'atmosphere', value: draft.atmosphere, options: RECORD_ATMOSPHERE_CHOICES, edit })}
      ${renderRecordChoiceField({ label: '天気', field: 'weather', value: draft.weather, options: RECORD_WEATHER_CHOICES, edit })}
      ${renderRecordChoiceField({ label: '気分', field: 'mood', value: draft.mood, options: RECORD_MOOD_CHOICES, edit })}
    </div>
  `;
}

function renderMemoryCards(memories) {
  if (!memories.length) return '';
  return `
    <div class="record-timeline">
      ${memories.map((memory) => `
        <article class="record-memory-card">
          <time>${escapeHtml(memory.time)}</time>
          <img src="${memory.imageData}" alt="" />
          <div>
            <strong>${getIcon('pin')} ${escapeHtml(memory.place || '場所未設定')}</strong>
            <p>${escapeHtml(memory.memo || 'メモはまだありません。')}</p>
          </div>
          <button class="record-memory-card__edit" type="button" data-record-edit-memory="${memory.id}" aria-label="この思い出を編集">${getIcon('chevronRight')}</button>
        </article>
      `).join('')}
    </div>
  `;
}

function renderRecordPreviewCard(memories) {
  if (!memories.length) return '';
  const previewMemories = memories.slice(0, 3);
  return `
    <section class="record-page-preview-card">
      <div class="record-page-preview-card__head">
        ${getIcon('bookOpen')}
        <h2>今日のページ preview</h2>
      </div>
      <div class="record-page-preview-card__body">
        <div class="record-page-preview-card__mini">
          <p>COUPLE MEMORIES</p>
          <h3>A Day in Tokyo</h3>
          ${previewMemories.map((memory) => `
            <article>
              <time>${escapeHtml(memory.time)}</time>
              <img src="${memory.imageData}" alt="" />
              <span>${getIcon('pin')} ${escapeHtml(memory.place || 'Tokyo')}</span>
            </article>
          `).join('')}
        </div>
        <div class="record-page-preview-card__copy">
          <p>今日の思い出を1ページのマガジンにまとめます。保存やシェアもお楽しみに。</p>
          <button type="button" data-record-stage="select">プレビューを見る</button>
        </div>
      </div>
    </section>
  `;
}

function renderRecordHomeAlbumPhotos(albumPhotos = []) {
  const photos = albumPhotos
    .filter((memory) => memory?.imageData)
    .slice(0, 6);
  return `
    <section class="record-home-album-section" aria-label="album photos">
      <p class="record-home-album-section__label">photos</p>
      ${photos.length ? `
        <div class="record-home-album-grid">
          ${photos.map((memory) => `
            <article class="record-home-album-photo couple-album-page couple-album-page--photo">
              <button class="record-home-album-photo__image couple-album-page__image" type="button" data-open-photo-preview="${memory.id}" aria-label="写真を開く">
                <img src="${memory.imageData}" alt="" />
              </button>
              <div class="couple-album-page__meta">
                <p class="couple-kicker">${new Date(memory.createdAt || Date.now()).toLocaleDateString('ja-JP').replace(/\//g, '.')}</p>
              </div>
            </article>
          `).join('')}
        </div>
      ` : '<p class="record-home-album-empty">No photos yet.</p>'}
    </section>
  `;
}

function renderRecordHome(memories, recordDate = '') {
  const todayKey = getTodayDateKey();
  const yesterdayKey = addDaysToDateKey(todayKey, -1);
  const activeDate = recordDate || todayKey;
  const canOpenCamera = activeDate === todayKey;
  return `
    <section class="record-page record-page--home">
      <header class="record-header">
        <p class="record-header__title">記録</p>
        <div class="record-today-mark"><span></span><strong>TODAY</strong><span></span></div>
      </header>

      <div class="record-date-switch" aria-label="記録する日">
        <button class="${activeDate === todayKey ? 'is-selected' : ''}" type="button" data-record-date-choice="${todayKey}">今日</button>
        <button class="${activeDate === yesterdayKey ? 'is-selected' : ''}" type="button" data-record-date-choice="${yesterdayKey}">昨日</button>
      </div>

      <section class="record-start-card">
        <div class="record-start-card__copy">
          <h1>今日の記録を残す</h1>
          ${canOpenCamera ? `
            <button class="record-primary-button" type="button" data-record-open-camera>
              ${getIcon('camera')} カメラを起動
            </button>
          ` : ''}
          <button class="record-primary-button record-create-page-button" type="button" data-record-stage="select" ${memories.length ? '' : 'disabled aria-disabled="true"'}>${getIcon('bookOpen')} &#12506;&#12540;&#12472;&#12434;&#20316;&#12427;</button>
        </div>
      </section>
      ${renderRecordHomeAlbumPhotos(memories)}

    </section>
  `;
}

function renderRecordCamera(draft, isSaving = false) {
  const hasPhoto = Boolean(draft?.imageData);
  const isPhotoConfirmed = Boolean(draft?.reviewConfirmed);
  const activeFilter = draft?.filter || 'none';
  const activeFacingMode = draft?.facingMode === 'user' ? 'user' : 'environment';
  const activeFrame = draft?.frame === 'portrait' ? 'portrait' : 'landscape';
  const activeZoom = Math.min(5, Math.max(1, Number(draft?.zoom) || 1));
  const zoomPercent = ((activeZoom - 1) / 4) * 100;
  const filters = [
    { id: 'none', label: 'フィルターなし' },
    { id: 'canon-ixy', label: 'heisei' },
    { id: 'nikon-d200', label: '2000' },
  ];
  return `
    <section class="record-page record-page--camera ${hasPhoto && !isPhotoConfirmed ? 'is-reviewing' : ''} ${hasPhoto && isPhotoConfirmed ? 'is-inputting' : ''}">
      <header class="record-camera-header">
        <button type="button" data-record-back-home aria-label="閉じる">${getIcon('close')}</button>
        <h1>写真を記録</h1>
        <span>${getIcon('bolt')}</span>
      </header>

      <div class="record-camera-stage record-camera-stage--${activeFrame} ${hasPhoto ? 'has-photo' : ''} ${hasPhoto && !isPhotoConfirmed ? 'is-reviewing' : ''} ${hasPhoto && isPhotoConfirmed ? 'is-inputting' : ''}">
        <div class="record-camera-preview record-camera-preview--${activeFrame} ${hasPhoto ? 'has-photo' : ''} ${hasPhoto && !isPhotoConfirmed ? 'is-reviewing' : ''} ${hasPhoto && isPhotoConfirmed ? 'is-inputting' : ''}">
        ${hasPhoto
          ? `<img class="record-filter-${escapeHtml(activeFilter)}" src="${draft.imageData}" alt="" />`
          : `<button class="record-frame-switch" type="button" data-record-switch-frame aria-label="写真枠を切り替え">
               <span>${activeFrame === 'portrait' ? '縦' : '横'}</span>
             </button>
             <video class="record-camera-video" data-record-camera-video autoplay playsinline muted></video>
             <canvas class="record-camera-canvas record-filter-${escapeHtml(activeFilter)}" data-record-camera-canvas aria-hidden="true"></canvas>
             <div class="record-camera-crop-frame record-camera-crop-frame--${activeFrame}" data-record-camera-crop-frame aria-hidden="true"></div>
             <button class="record-camera-switch" type="button" data-record-switch-camera aria-label="カメラを切り替え">
               ${getIcon('refreshCw')}
               <span>${activeFacingMode === 'user' ? '内カメ' : '外カメ'}</span>
             </button>
             <div class="record-camera-placeholder" data-record-camera-placeholder>${getIcon('camera')}<p>カメラを起動しています</p></div>`}
        </div>
        ${hasPhoto ? '' : `
          <div class="record-camera-zoom" style="--record-camera-zoom-progress:${zoomPercent}%">
            <div class="record-camera-zoom__value">${activeZoom.toFixed(activeZoom % 1 === 0 ? 0 : 1)}x</div>
            <input type="range" min="1" max="5" step="0.1" value="${activeZoom}" data-record-camera-zoom aria-label="zoom" />
            <div class="record-camera-zoom__ticks" aria-hidden="true">
              <span>1x</span>
              <span>2x</span>
              <span>3x</span>
              <span>4x</span>
              <span>5x</span>
            </div>
          </div>
        `}
      </div>

      <section class="record-capture-sheet ${hasPhoto ? 'is-expanded' : ''} ${hasPhoto && !isPhotoConfirmed ? 'is-reviewing' : ''} ${hasPhoto && isPhotoConfirmed ? 'is-inputting' : ''}">
        ${hasPhoto && !isPhotoConfirmed ? `
          <div class="record-camera-review-actions">
            <button class="record-secondary-button" type="button" data-record-retake-photo>取り直す</button>
            <button class="record-primary-button" type="button" data-record-use-photo>このまま使用</button>
          </div>
        ` : `
        <div class="record-filter-bar" aria-label="フィルター">
          ${filters.map((filter) => `
            <button class="${activeFilter === filter.id ? 'is-selected' : ''}" type="button" data-record-filter="${filter.id}">
              ${escapeHtml(filter.label)}
            </button>
          `).join('')}
        </div>
        ${hasPhoto && isPhotoConfirmed ? `
          <label class="record-field">
            <span>場所 <em>必須</em></span>
            <div class="record-input-wrap">${getIcon('pin')}<input type="text" data-record-place value="${escapeHtml(draft.place || '')}" placeholder="代官山" required /></div>
          </label>
          <label class="record-field">
            <span>感想 <em>必須</em></span>
            <input type="text" data-record-memo value="${escapeHtml(draft.memo || '')}" placeholder="例: カフェの雰囲気が素敵だった" required />
          </label>
          ${renderRecordChoiceFields(draft)}
        ` : ''}
        ${hasPhoto && isPhotoConfirmed ? `
          <div class="record-tag-fields record-tag-fields--extra" aria-label="追加タグ">
            <label class="record-field">
              <span>値段タグ</span>
              <input type="text" data-record-price value="${escapeHtml(draft.price || '')}" placeholder="3,000円くらい" />
            </label>
            <label class="record-field">
              <span>時間帯タグ</span>
              <select data-record-time-of-day>
                ${RECORD_TIME_OF_DAY_OPTIONS.map((option) => `
                  <option value="${escapeHtml(option.value)}" ${String(draft.timeOfDay || draft.time_of_day || '') === option.value ? 'selected' : ''}>${escapeHtml(option.label)}</option>
                `).join('')}
              </select>
            </label>
            <label class="record-field">
              <span>雰囲気タグ</span>
              <input type="text" data-record-atmosphere value="${escapeHtml(draft.atmosphere || '')}" placeholder="静か / レトロ" />
            </label>
            <label class="record-field">
              <span>天気タグ</span>
              <input type="text" data-record-weather value="${escapeHtml(draft.weather || '')}" placeholder="晴れ / 雨" />
            </label>
            <label class="record-field">
              <span>気分タグ</span>
              <input type="text" data-record-mood value="${escapeHtml(draft.mood || '')}" placeholder="うれしい / のんびり" />
            </label>
          </div>
        ` : ''}
        <div class="record-camera-actions">
          <button class="record-secondary-button" type="button" data-record-open-album>
            ${getIcon('image')} アルバム
          </button>
          <button class="record-shutter" type="button" data-record-open-camera-input aria-label="写真を撮る"></button>
          <button class="record-secondary-button record-save-button" type="button" data-record-save ${hasPhoto && !isSaving ? '' : 'disabled'} ${isSaving ? 'aria-busy="true"' : ''}>${isSaving ? '保存中' : '保存'}</button>
        </div>
        ${hasPhoto ? '<button class="record-photo-download" type="button" data-record-save-photo>写真だけ保存</button>' : ''}
        `}
      </section>
      <input type="file" accept="image/*" capture="${activeFacingMode === 'user' ? 'user' : 'environment'}" data-record-camera-input hidden />
      <input type="file" accept="image/*" data-record-album-input hidden />
    </section>
  `;
}

function renderRecordEdit(memory) {
  if (!memory) return renderRecordHome([]);
  return `
    <section class="record-page record-page--edit-memory">
      <header class="record-stack-header">
        <button type="button" data-record-stage="home" aria-label="戻る">${getIcon('returnLeft')}</button>
        <h1>思い出を編集</h1>
      </header>

      <article class="record-edit-card">
        <img src="${memory.imageData}" alt="" />
        <div class="record-edit-card__time">${getIcon('clock')} <strong>${escapeHtml(memory.time)}</strong></div>
        <label class="record-field">
          <span>場所 <em>必須</em></span>
          <div class="record-input-wrap">${getIcon('pin')}<input type="text" data-record-edit-place value="${escapeHtml(memory.place || '')}" placeholder="代官山" required /></div>
        </label>
        <label class="record-field">
          <span>感想 <em>必須</em></span>
          <input type="text" data-record-edit-memo value="${escapeHtml(memory.memo || '')}" placeholder="例: カフェの雰囲気が素敵だった" required />
        </label>
        ${renderRecordChoiceFields(memory, { edit: true })}
        <div class="record-tag-fields record-tag-fields--extra" aria-label="追加タグ">
          <label class="record-field">
            <span>値段タグ</span>
            <input type="text" data-record-edit-price value="${escapeHtml(memory.price || '')}" placeholder="3,000円くらい" />
          </label>
          <label class="record-field">
            <span>時間帯タグ</span>
            <select data-record-edit-time-of-day>
              ${RECORD_TIME_OF_DAY_OPTIONS.map((option) => `
                <option value="${escapeHtml(option.value)}" ${String(memory.timeOfDay || memory.time_of_day || '') === option.value ? 'selected' : ''}>${escapeHtml(option.label)}</option>
              `).join('')}
            </select>
          </label>
          <label class="record-field">
            <span>雰囲気タグ</span>
            <input type="text" data-record-edit-atmosphere value="${escapeHtml(memory.atmosphere || '')}" placeholder="静か / レトロ" />
          </label>
          <label class="record-field">
            <span>天気タグ</span>
            <input type="text" data-record-edit-weather value="${escapeHtml(memory.weather || '')}" placeholder="晴れ / 雨" />
          </label>
          <label class="record-field">
            <span>気分タグ</span>
            <input type="text" data-record-edit-mood value="${escapeHtml(memory.mood || '')}" placeholder="うれしい / のんびり" />
          </label>
        </div>
        <button class="record-primary-button" type="button" data-record-update-memory="${memory.id}">保存</button>
      </article>
    </section>
  `;
}

function rectStyle(slot) {
  return `left:${slot.x}%;top:${slot.y}%;width:${slot.width}%;height:${slot.height}%;`;
}

function renderRecordTemplatePicker(selectedTemplateId = DEFAULT_RECORD_TEMPLATE) {
  return `
    <section class="record-template-picker" aria-label="record template">
      <div class="record-template-picker__head">
        <h2>Template</h2>
        <p>Photos and text are placed automatically.</p>
      </div>
      <div class="record-template-grid" data-record-template-grid>
        ${RECORD_TEMPLATES.map((template) => `
          <button class="record-template-option ${selectedTemplateId === template.id ? 'is-selected' : ''}" type="button" data-record-template="${template.id}">
            <img src="${template.src}" alt="${template.label}" />
            <span>${template.label}</span>
          </button>
        `).join('')}
      </div>
    </section>
  `;
}

function renderRecordBackgroundPicker(selectedBackgroundId = DEFAULT_RECORD_BACKGROUND) {
  return `
    <section class="record-background-picker" aria-label="record background">
      <div class="record-template-picker__head">
        <h2>Background</h2>
        <p>Choose a page texture.</p>
      </div>
      <div class="record-background-grid" data-record-background-grid>
        ${RECORD_BACKGROUNDS.map((background) => `
          <button class="record-background-option ${selectedBackgroundId === background.id ? 'is-selected' : ''}" type="button" data-record-background="${background.id}">
            ${background.src
              ? `<img src="${background.src}" alt="${background.label}" />`
              : '<span class="record-background-option__none">None</span>'}
            <span>${background.label}</span>
          </button>
        `).join('')}
      </div>
    </section>
  `;
}

function renderRecordPhotoEdgePicker(photoFeather = true) {
  return `
    <section class="record-photo-edge-picker" aria-label="photo edge">
      <div class="record-template-picker__head">
        <h2>Photo edge</h2>
        <p>写真の縁を背景になじませます。</p>
      </div>
      <div class="record-photo-edge-options">
        <button class="${photoFeather ? 'is-selected' : ''}" type="button" data-record-photo-feather="true">ぼかす</button>
        <button class="${photoFeather ? '' : 'is-selected'}" type="button" data-record-photo-feather="false">そのまま</button>
      </div>
    </section>
  `;
}

function renderRecordTitleInput(title = '') {
  return `
    <label class="record-title-field">
      <span>Page title</span>
      <input type="text" data-record-title value="${escapeHtml(title)}" placeholder="A day to remember" />
    </label>
  `;
}

function renderRecordSelect(memories, selectedIds, selectedTemplateId = DEFAULT_RECORD_TEMPLATE, recordTitle = '', photoFeather = true) {
  const orderedSelectedIds = (selectedIds || []).slice(0, 3);
  const selected = new Set(orderedSelectedIds);
  const memoryById = new Map(memories.map((memory) => [memory.id, memory]));
  const selectedMemories = orderedSelectedIds.map((id) => memoryById.get(id)).filter(Boolean);
  const unselectedMemories = memories.filter((memory) => !selected.has(memory.id));
  const orderedMemories = [...selectedMemories, ...unselectedMemories];
  return `
    <section class="record-page record-page--select">
      <header class="record-stack-header">
        <button class="record-select-back" type="button" data-record-back-home aria-label="&#25147;&#12427;">${getIcon('returnLeft')}</button>
        <p class="record-select-date">${formatTodayLabel()}</p>
        <div class="record-select-rule"><span></span><i>&#9825;</i><span></span></div>
        <p class="record-select-lead">&#20889;&#30495;&#12434;3&#26522;&#36984;&#25246;</p>
      </header>

      <div class="record-select-list">
        ${orderedMemories.map((memory) => {
          const isSelected = selected.has(memory.id);
          const selectedIndex = orderedSelectedIds.indexOf(memory.id);
          const frameLabel = memory.frame === 'portrait' ? '&#32294;&#30011;&#20687;' : '&#27178;&#30011;&#20687;';
          return `
            <article class="record-select-card ${isSelected ? 'is-selected' : ''}">
              <button class="record-select-card__toggle" type="button" data-record-toggle-memory="${memory.id}" aria-pressed="${isSelected}">
                ${memory.imageData ? `<img class="record-select-card__image" src="${memory.imageData}" alt="" />` : '<span class="record-select-card__image-placeholder">photo</span>'}
                <span class="record-select-card__check" aria-hidden="true">${isSelected ? getIcon('check') : ''}</span>
              </button>
              <div class="record-select-card__copy">
                <p class="record-select-card__date">${frameLabel}</p>
                ${selectedIndex === 0 ? '<em>&#12513;&#12452;&#12531;&#20889;&#30495;</em>' : ''}
              </div>
              ${isSelected ? `
                <div class="record-select-card__order" aria-label="photo order">
                  <button type="button" data-record-move-memory="${memory.id}" data-record-move-direction="-1" ${selectedIndex <= 0 ? 'disabled' : ''}>&#8593;</button>
                  <span>${selectedIndex + 1}</span>
                  <button type="button" data-record-move-memory="${memory.id}" data-record-move-direction="1" ${selectedIndex >= selectedMemories.length - 1 ? 'disabled' : ''}>&#8595;</button>
                </div>
              ` : ''}
            </article>
          `;
        }).join('')}
      </div>

      ${renderRecordTemplatePicker(selectedTemplateId)}
      ${renderRecordTitleInput(recordTitle)}
      ${renderRecordPhotoEdgePicker(photoFeather)}

      <div class="record-create-bar">
        <p>&#36984;&#25246;&#20013; <strong>${selected.size}</strong> / 3 &#26522;</p>
        <button class="record-primary-button" type="button" data-record-create-page ${selected.size === 3 ? '' : 'disabled'}>&#12506;&#12540;&#12472;&#12434;&#33258;&#21205;&#20316;&#25104;</button>
      </div>
    </section>
  `;
}

function renderGeneratedPagePreview(memories, templateId = DEFAULT_RECORD_TEMPLATE, recordTitle = '', recordDate = '', backgroundId = DEFAULT_RECORD_BACKGROUND, photoFeather = true) {
  const template = getRecordTemplateById(templateId);
  const background = getRecordBackgroundById(backgroundId);
  const title = String(recordTitle || '').trim() || 'A day to remember';
  const pageDate = formatPageDate(recordDate);
  const textDensityClass = (memory) => {
    const placeLength = String(memory?.place || '').trim().length;
    const memoLength = String(memory?.memo || '').trim().length;
    const score = placeLength * 1.4 + memoLength;
    if (score >= 62) return ' is-very-dense';
    if (score >= 38) return ' is-dense';
    return '';
  };
  const renderImageSlot = (memory, slot, index) => {
    if (!memory) return `<div class="record-template-slot record-template-slot--image is-empty" style="${rectStyle(slot)}">Photo ${index + 1}</div>`;
    return `
      <figure class="record-template-slot record-template-slot--image" style="${rectStyle(slot)}">
        <figcaption><span></span><time>${escapeHtml(memory.time)}</time><span></span></figcaption>
        <img src="${memory.imageData}" alt="" />
      </figure>
    `;
  };
  const renderTextSlot = (memory, slot, index) => {
    if (!memory) return `<div class="record-template-slot record-template-slot--text is-empty" style="${rectStyle(slot)}">Text ${index + 1}</div>`;
    return `
      <article class="record-template-slot record-template-slot--text${textDensityClass(memory)}" style="${rectStyle(slot)}">
        <strong>${getIcon('pin')} ${escapeHtml(memory.place || '場所未設定')}</strong>
        <p>${escapeHtml(memory.memo || '今日の思い出')}</p>
      </article>
    `;
  };

  return `
    <div class="record-generated-page record-generated-page--template ${photoFeather ? 'record-generated-page--photo-soft' : 'record-generated-page--photo-plain'}" data-record-template="${template.id}">
      ${background.src ? `<img class="record-generated-page__background" src="${background.src}" alt="" />` : ''}
      <img class="record-generated-page__template" src="${template.src}" alt="" />
      <time class="record-generated-page__date" datetime="${escapeHtml(recordDate || getTodayDateKey())}">${escapeHtml(pageDate)}</time>
      ${template.titleSlot ? `
        <input
          class="record-template-slot record-template-slot--title"
          style="${rectStyle(template.titleSlot)}"
          type="text"
          data-record-title
          value="${escapeHtml(title)}"
          aria-label="ページタイトル"
        />
      ` : ''}
      ${template.imageSlots.map((slot, index) => renderImageSlot(memories[index], slot, index)).join('')}
      ${template.textSlots.map((slot, index) => renderTextSlot(memories[index], slot, index)).join('')}
    </div>
  `;
}

function renderRecordComplete(memories, templateId = DEFAULT_RECORD_TEMPLATE, recordTitle = '', recordDate = '', backgroundId = DEFAULT_RECORD_BACKGROUND, photoFeather = true, saveScope = 'shared') {
  const activeScope = saveScope === 'personal' ? 'personal' : 'shared';
  return `
    <section class="record-page record-page--complete">
      <header class="record-stack-header">
        <button type="button" data-record-stage="select" aria-label="戻る">${getIcon('returnLeft')}</button>
        <h1>完成</h1>
      </header>
      <div class="record-complete-copy">
        <span>${getIcon('heart')}</span>
        <h2>今日の思い出が<br />1ページになりました</h2>
      </div>
      ${renderGeneratedPagePreview(memories, templateId, recordTitle, recordDate, backgroundId, photoFeather)}
      <div class="couple-album-tabs" role="tablist" aria-label="保存先">
        <button class="${activeScope === 'shared' ? 'is-active' : ''}" type="button" data-record-save-scope="shared" role="tab" aria-selected="${activeScope === 'shared'}">共有に保存</button>
        <button class="${activeScope === 'personal' ? 'is-active' : ''}" type="button" data-record-save-scope="personal" role="tab" aria-selected="${activeScope === 'personal'}">個人に保存</button>
      </div>
      <div class="record-complete-actions">
        <button type="button" data-record-save-page>${getIcon('download')}<span>写真を保存</span></button>
        <button type="button" data-record-post-page>${getIcon('camera')}<span>投稿する</span></button>
        <button type="button">${getIcon('bookOpen')}<span>雑誌化する</span></button>
        <button type="button">${getIcon('document')}<span>PDF</span></button>
      </div>
      <button class="record-outline-button" type="button" data-record-stage="select">あとで編集</button>
    </section>
  `;
}

function renderRecordPreview(memories, templateId = DEFAULT_RECORD_TEMPLATE, recordTitle = '', recordDate = '', backgroundId = DEFAULT_RECORD_BACKGROUND, photoFeather = true) {
  return `
    <section class="record-page record-page--preview">
      <header class="record-stack-header">
        <button type="button" data-record-stage="select" aria-label="戻る">${getIcon('returnLeft')}</button>
        <h1>プレビュー</h1>
      </header>
      ${renderGeneratedPagePreview(memories, templateId, recordTitle, recordDate, backgroundId, photoFeather)}
      ${renderRecordBackgroundPicker(backgroundId)}
      <div class="record-create-bar record-create-bar--preview">
        <button class="record-primary-button" type="button" data-record-confirm-page>決定</button>
      </div>
    </section>
  `;
}

export function renderRecord(state, uiState) {
  const recordDate = uiState.recordDate || getTodayDateKey();
  const memories = [...(state.recordMemories || [])]
    .filter((memory) => getDateKeyFromValue(memory.createdAt) === recordDate)
    .sort((a, b) => {
    const byTime = String(a.time || '').localeCompare(String(b.time || ''));
    if (byTime) return byTime;
    return new Date(a.createdAt) - new Date(b.createdAt);
  });
  const stage = uiState.recordStage || 'home';

  if (stage === 'camera') return renderRecordCamera(uiState.recordDraft || {}, Boolean(uiState.recordMemorySaving));
  if (stage === 'edit') return renderRecordEdit(memories.find((memory) => memory.id === uiState.recordEditingId));
  const photoFeather = uiState.recordPhotoFeather !== false;
  if (stage === 'select') return renderRecordSelect(memories, uiState.recordSelectedIds || [], uiState.recordTemplateId || DEFAULT_RECORD_TEMPLATE, uiState.recordTitle || '', photoFeather);
  if (stage === 'preview') return renderRecordPreview(getSelectedMemories(memories, uiState.recordSelectedIds || []), uiState.recordTemplateId || DEFAULT_RECORD_TEMPLATE, uiState.recordTitle || '', recordDate, uiState.recordBackgroundId || DEFAULT_RECORD_BACKGROUND, photoFeather);
  if (stage === 'complete') return renderRecordComplete(getSelectedMemories(memories, uiState.recordSelectedIds || []), uiState.recordTemplateId || DEFAULT_RECORD_TEMPLATE, uiState.recordTitle || '', recordDate, uiState.recordBackgroundId || DEFAULT_RECORD_BACKGROUND, photoFeather, uiState.recordSaveScope || 'shared');
  return renderRecordHome(memories, recordDate);
}
