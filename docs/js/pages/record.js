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

function formatPageDate(dateKey = '') {
  const date = getDateFromKey(dateKey || getTodayDateKey());
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
}

function getSelectedMemories(memories, selectedIds) {
  const memoryById = new Map(memories.map((memory) => [memory.id, memory]));
  return (selectedIds || []).map((id) => memoryById.get(id)).filter(Boolean).slice(0, 3);
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

function renderRecordHome(memories, recordDate = '') {
  const dateLabel = recordDate ? formatTodayLabel(getDateFromKey(recordDate)) : formatTodayLabel();
  const sectionTitle = recordDate ? '選択した日の思い出' : '今日の思い出';
  return `
    <section class="record-page record-page--home">
      <header class="record-header">
        <p class="record-header__title">記録</p>
        <div class="record-today-mark"><span></span><strong>TODAY</strong><span></span></div>
      </header>

      <section class="record-start-card">
        <div class="record-start-card__copy">
          <h1>今日の記録を残す</h1>
          <button class="record-primary-button" type="button" data-record-open-camera>
            ${getIcon('camera')} カメラを起動
          </button>
        </div>
      </section>

      <section class="record-section">
        <div class="record-section__head">
          <h2>${getIcon('clock')} ${sectionTitle}</h2>
        </div>
        <p class="record-selected-date-label">${dateLabel}</p>
        ${renderMemoryCards(memories)}
        ${memories.length ? `<button class="record-primary-button record-create-page-button" type="button" data-record-stage="select">${getIcon('bookOpen')} ページを作る</button>` : ''}
        ${memories.length ? '' : '<p class="record-empty-text">この日の思い出はまだありません。</p>'}
      </section>

    </section>
  `;
}

function renderRecordCamera(draft) {
  const hasPhoto = Boolean(draft?.imageData);
  const activeFilter = draft?.filter || 'none';
  const activeFacingMode = draft?.facingMode === 'user' ? 'user' : 'environment';
  const activeFrame = draft?.frame === 'portrait' ? 'portrait' : 'landscape';
  const activeZoom = Math.min(5, Math.max(1, Number(draft?.zoom) || 1));
  const zoomPercent = ((activeZoom - 1) / 4) * 100;
  const filters = [
    { id: 'none', label: 'フィルターなし' },
    { id: 'canon-ixy', label: 'Canon IXY' },
    { id: 'nikon-d200', label: 'Nikon D200' },
  ];
  return `
    <section class="record-page record-page--camera">
      <header class="record-camera-header">
        <button type="button" data-record-back-home aria-label="閉じる">${getIcon('close')}</button>
        <h1>写真を記録</h1>
        <span>${getIcon('bolt')}</span>
      </header>

      <div class="record-camera-stage record-camera-stage--${activeFrame} ${hasPhoto ? 'has-photo' : ''}">
        <div class="record-camera-preview record-camera-preview--${activeFrame} ${hasPhoto ? 'has-photo' : ''}">
        ${hasPhoto
          ? `<img class="record-filter-${escapeHtml(activeFilter)}" src="${draft.imageData}" alt="" />`
          : `<button class="record-frame-switch" type="button" data-record-switch-frame aria-label="写真枠を切り替え">
               <span>${activeFrame === 'portrait' ? '縦' : '横'}</span>
             </button>
             <video class="record-camera-video record-filter-${escapeHtml(activeFilter)}" data-record-camera-video autoplay playsinline muted style="transform:scale(${activeZoom});"></video>
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

      <section class="record-capture-sheet ${hasPhoto ? 'is-expanded' : ''}">
        <div class="record-filter-bar" aria-label="フィルター">
          ${filters.map((filter) => `
            <button class="${activeFilter === filter.id ? 'is-selected' : ''}" type="button" data-record-filter="${filter.id}">
              ${escapeHtml(filter.label)}
            </button>
          `).join('')}
        </div>
        ${hasPhoto ? `
          <label class="record-field">
            <span>場所</span>
            <div class="record-input-wrap">${getIcon('pin')}<input type="text" data-record-place value="${escapeHtml(draft.place || '')}" placeholder="代官山" /></div>
          </label>
          <label class="record-field">
            <span>メモ (任意)</span>
            <input type="text" data-record-memo value="${escapeHtml(draft.memo || '')}" placeholder="例: カフェの雰囲気が素敵だった" />
          </label>
        ` : ''}
        <div class="record-camera-actions">
          <button class="record-secondary-button" type="button" data-record-open-album>
            ${getIcon('image')} アルバム
          </button>
          <button class="record-shutter" type="button" data-record-open-camera-input aria-label="写真を撮る"></button>
          <button class="record-secondary-button record-save-button" type="button" data-record-save ${hasPhoto ? '' : 'disabled'}>保存</button>
        </div>
        ${hasPhoto ? '<button class="record-photo-download" type="button" data-record-save-photo>写真だけ保存</button>' : ''}
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
          <span>場所</span>
          <div class="record-input-wrap">${getIcon('pin')}<input type="text" data-record-edit-place value="${escapeHtml(memory.place || '')}" placeholder="代官山" /></div>
        </label>
        <label class="record-field">
          <span>メモ</span>
          <input type="text" data-record-edit-memo value="${escapeHtml(memory.memo || '')}" placeholder="例: カフェの雰囲気が素敵だった" />
        </label>
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
        <button class="record-select-back" type="button" data-record-back-home aria-label="戻る">${getIcon('returnLeft')}</button>
        <p class="record-select-date">${formatTodayLabel()}</p>
        <div class="record-select-rule"><span></span><i>♡</i><span></span></div>
        <p class="record-select-lead">使いたい写真を選択</p>
      </header>

      <div class="record-select-list">
        ${orderedMemories.map((memory) => {
          const isSelected = selected.has(memory.id);
          const selectedIndex = orderedSelectedIds.indexOf(memory.id);
          const frame = memory.frame === 'portrait' ? 'portrait' : 'landscape';
          const frameLabel = frame === 'portrait' ? '縦画像' : '横画像';
          return `
            <article class="record-select-card ${isSelected ? 'is-selected' : ''}">
              <button class="record-select-card__toggle" type="button" data-record-toggle-memory="${memory.id}">
              <img class="record-select-card__image record-select-card__image--${frame}" src="${memory.imageData}" alt="" />
              <div class="record-select-card__copy">
                <strong><time>${escapeHtml(memory.time)}</time><span>${getIcon('pin')} ${escapeHtml(memory.place || '場所未設定')}</span></strong>
                <p>${escapeHtml(frameLabel)}</p>
                ${selectedIndex === 0 ? '<em>メイン写真</em>' : ''}
              </div>
              <span class="record-select-card__check">${isSelected ? getIcon('check') : ''}</span>
              </button>
              ${isSelected ? `
                <div class="record-select-card__order" aria-label="photo order">
                  <button type="button" data-record-move-memory="${memory.id}" data-record-move-direction="-1" ${selectedIndex <= 0 ? 'disabled' : ''}>↑</button>
                  <span>${selectedIndex + 1}</span>
                  <button type="button" data-record-move-memory="${memory.id}" data-record-move-direction="1" ${selectedIndex >= selectedMemories.length - 1 ? 'disabled' : ''}>↓</button>
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
        <p>選択中 <strong>${selected.size}</strong> / 3 枚</p>
        <button class="record-primary-button" type="button" data-record-create-page ${selected.size === 3 ? '' : 'disabled'}>ページを自動作成</button>
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

function renderRecordComplete(memories, templateId = DEFAULT_RECORD_TEMPLATE, recordTitle = '', recordDate = '', backgroundId = DEFAULT_RECORD_BACKGROUND, photoFeather = true) {
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

  if (stage === 'camera') return renderRecordCamera(uiState.recordDraft || {});
  if (stage === 'edit') return renderRecordEdit(memories.find((memory) => memory.id === uiState.recordEditingId));
  const photoFeather = uiState.recordPhotoFeather !== false;
  if (stage === 'select') return renderRecordSelect(memories, uiState.recordSelectedIds || [], uiState.recordTemplateId || DEFAULT_RECORD_TEMPLATE, uiState.recordTitle || '', photoFeather);
  if (stage === 'preview') return renderRecordPreview(getSelectedMemories(memories, uiState.recordSelectedIds || []), uiState.recordTemplateId || DEFAULT_RECORD_TEMPLATE, uiState.recordTitle || '', recordDate, uiState.recordBackgroundId || DEFAULT_RECORD_BACKGROUND, photoFeather);
  if (stage === 'complete') return renderRecordComplete(getSelectedMemories(memories, uiState.recordSelectedIds || []), uiState.recordTemplateId || DEFAULT_RECORD_TEMPLATE, uiState.recordTitle || '', recordDate, uiState.recordBackgroundId || DEFAULT_RECORD_BACKGROUND, photoFeather);
  return renderRecordHome(memories, recordDate);
}
