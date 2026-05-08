import { TAG_GROUPS, TAG_GROUP_LABELS } from '../data/tags.js';
import { getFixedTemplateLayout } from '../templates/fixedTemplateLayouts.js';
import { COMPOSE_TEMPLATES, DEFAULT_COMPOSE_TEMPLATE } from '../templates/index.js';
import { getIcon } from '../components/icons.js';

const TEXT_BOX_BACKGROUND_COLORS = [
  { value: '', label: 'None' },
  { value: '#ffffff', label: 'White' },
  { value: '#f8f4ee', label: 'Ivory' },
  { value: '#f4e5de', label: 'Blush' },
  { value: '#ece4d8', label: 'Sand' },
  { value: '#e5ece7', label: 'Sage' },
  { value: '#e8e5df', label: 'Gray' },
];

const TEXT_BOX_BACKGROUND_COLOR_VALUES = new Set(
  TEXT_BOX_BACKGROUND_COLORS
    .map((color) => color.value)
    .filter(Boolean),
);

const FIXED_COMPOSE_TEMPLATES = COMPOSE_TEMPLATES.filter(
  (template) => template.id !== 'page8' && template.id !== 'page9',
);

const COMPOSE_TEXT_FONT_GROUPS = [
  {
    label: 'ショートテキスト用',
    options: [
      { id: 'noto-serif-jp', label: 'Noto Serif JP' },
      { id: 'noto-sans-jp', label: 'Noto Sans JP' },
      { id: 'source-han-serif', label: 'Source Han Serif' },
      { id: 'klee-one', label: 'Klee One' },
      { id: 'zen-kaku-gothic-new', label: 'Zen Kaku Gothic New' },
      { id: 'biz-udgothic', label: 'BIZ UDGothic' },
      { id: 'kosugi-maru', label: 'Kosugi Maru' },
      { id: 'line-seed-jp', label: 'LINE Seed JP' },
    ],
  },
  {
    label: 'タイトル用',
    options: [
      { id: 'kaisei-tokumin', label: 'Kaisei Tokumin' },
      { id: 'sawarabi-mincho', label: 'Sawarabi Mincho' },
      { id: 'hina-mincho', label: 'Hina Mincho' },
      { id: 'shippori-mincho', label: 'Shippori Mincho' },
      { id: 'zen-old-mincho', label: 'Zen Old Mincho' },
    ],
  },
];

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

function getComposeMode(selectedTemplateId = DEFAULT_COMPOSE_TEMPLATE) {
  return selectedTemplateId === 'page8' ? 'custom' : 'template';
}

function buildComposeTextStyleAttr(textStyles = {}, fieldKey) {
  const source = textStyles?.[fieldKey] || {};
  const scale = Number.isFinite(Number(source.scale))
    ? Math.min(2, Math.max(0.5, Number(source.scale)))
    : 1;
  const backgroundColor = TEXT_BOX_BACKGROUND_COLOR_VALUES.has(String(source.backgroundColor || '').toLowerCase())
    ? String(source.backgroundColor).toLowerCase()
    : '';
  const backgroundStyle = backgroundColor ? `background-color:${backgroundColor};` : '';
  const backgroundData = backgroundColor ? ` data-compose-text-background-color="${backgroundColor}"` : '';
  return `style="--compose-text-scale:${scale};${backgroundStyle}"${backgroundData}`;
}

function normalizeComposeRichTextSizeScale(value) {
  const scale = Number(value);
  return Number.isFinite(scale) ? Math.min(2, Math.max(0.5, scale)) : null;
}

function normalizeComposeRichTextAlign(value) {
  return ['left', 'center', 'right'].includes(value) ? value : null;
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
  if (!markup || typeof document === 'undefined') return '';
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

function getComposeTextMarkup(values, fieldKey) {
  const richMarkup = sanitizeComposeRichTextMarkup(values.richTexts?.[fieldKey] || '');
  if (richMarkup) return richMarkup;
  return escapeHtml(values[fieldKey] || '');
}

function renderComposeBackButton(actionAttr) {
  return `
    <button class="button button--ghost page-back page-back--icon compose-back-button" type="button" ${actionAttr} aria-label="Back">
      ${getIcon('returnLeft')}
    </button>
  `;
}

function renderComposeCloseButton(actionAttr) {
  return `
    <button class="button button--ghost page-back page-back--icon compose-close-button" type="button" ${actionAttr} aria-label="Close">
      ${getIcon('close')}
    </button>
  `;
}

function renderComposeAddPopoverButton() {
  return `
    <div class="compose-header-add" data-pretext-add>
      <button
        class="button button--ghost page-back page-back--icon compose-add-button"
        type="button"
        data-pretext-add-toggle
        aria-label="Add layout element"
        aria-haspopup="true"
        aria-expanded="false"
      >
        ${getIcon('compose')}
      </button>
      <div class="compose-header-add__popover" data-pretext-add-popover hidden>
        <div class="compose-header-add__row">
          <span class="compose-header-add__label">Title</span>
          <div class="compose-header-add__align">
            <button type="button" class="compose-header-add__option" data-pretext-add-kind="title" data-pretext-add-align="left" aria-label="Add left aligned title">${getIcon('alignLeft')}</button>
            <button type="button" class="compose-header-add__option" data-pretext-add-kind="title" data-pretext-add-align="center" aria-label="Add centered title">${getIcon('alignCenter')}</button>
            <button type="button" class="compose-header-add__option" data-pretext-add-kind="title" data-pretext-add-align="right" aria-label="Add right aligned title">${getIcon('alignRight')}</button>
          </div>
        </div>
        <div class="compose-header-add__row">
          <span class="compose-header-add__label">Body</span>
          <div class="compose-header-add__align">
            <button type="button" class="compose-header-add__option" data-pretext-add-kind="body" data-pretext-add-align="left" aria-label="Add left aligned body">${getIcon('alignLeft')}</button>
            <button type="button" class="compose-header-add__option" data-pretext-add-kind="body" data-pretext-add-align="center" aria-label="Add centered body">${getIcon('alignCenter')}</button>
            <button type="button" class="compose-header-add__option" data-pretext-add-kind="body" data-pretext-add-align="right" aria-label="Add right aligned body">${getIcon('alignRight')}</button>
          </div>
        </div>
        <div class="compose-header-add__row compose-header-add__row--image">
          <span class="compose-header-add__label">Image</span>
          <button type="button" class="compose-header-add__image" data-pretext-add-kind="image">
            ${getIcon('image')}
            <span>Image</span>
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderComposeDeleteButton() {
  return `
    <button
      class="button button--ghost page-back page-back--icon compose-delete-button"
      type="button"
      data-pretext-delete
      aria-label="Delete selected element"
    >
      ${getIcon('trash')}
    </button>
  `;
}

function renderComposeTagsButton(isEditing) {
  return `
    <button class="button button--primary compose-header-tags-button" type="button" data-compose-stage-nav="tags">
      ${isEditing ? 'Update Tags' : 'Tags'}
    </button>
  `;
}

function renderComposeEditHeaderActions(isEditing) {
  return `
    <div class="compose-stage-header__inline-actions">
      <div class="compose-history-actions" aria-label="Edit history">
        <button class="compose-history-button" type="button" data-compose-history="undo" aria-label="Undo" disabled>
          ${getIcon('undo')}
        </button>
        <button class="compose-history-button" type="button" data-compose-history="redo" aria-label="Redo" disabled>
          ${getIcon('redo')}
        </button>
      </div>
      <button class="button button--ghost compose-draft-button compose-draft-button--header" type="button" data-save-compose-draft>Save Draft</button>
      <button class="button button--primary compose-submit-button compose-submit-button--header" type="button" data-compose-stage-nav="tags">${isEditing ? 'Update Tags' : 'Tags'}</button>
      <button class="button button--ghost compose-save-image-button compose-save-image-button--header" type="button" data-save-compose-image>Save</button>
    </div>
  `;
}

function renderGroup(groupKey, options, selectedTags = []) {
  return `
    <section class="compose-group compose-group--tags">
      <div class="compose-group__head">
        <h3>${TAG_GROUP_LABELS[groupKey]}</h3>
      </div>
      <div class="tag-select-grid">
        ${options.map((tag) => `
          <label class="tag-check">
            <input type="checkbox" name="fixedTags" value="${tag}" ${selectedTags.includes(tag) ? 'checked' : ''} />
            <span>${tag}</span>
          </label>
        `).join('')}
      </div>
    </section>
  `;
}

function renderTemplatePicker(selectedTemplateId = DEFAULT_COMPOSE_TEMPLATE) {
  return `
    <div class="template-carousel template-carousel--select">
      <div class="template-carousel__viewport" data-template-carousel>
        <div class="template-thumb-track">
          ${FIXED_COMPOSE_TEMPLATES.map((template) => `
            <label class="template-thumb ${selectedTemplateId === template.id ? 'is-active' : ''}">
              <input type="radio" name="templateId" value="${template.id}" ${selectedTemplateId === template.id ? 'checked' : ''} />
              <span class="template-thumb__preview template-option__preview template-option__preview--${template.id} ${template.roughUrl ? 'template-thumb__preview--rough' : ''}" aria-hidden="true" ${template.roughUrl ? `style="background-image:url('${template.roughUrl}');background-size:cover;background-position:center;"` : ''}></span>
            </label>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function renderUploadSlot({ id, slotClass }) {
  return `
    <div class="compose-slot ${slotClass}" data-slot="${id}">
      <input class="field__file" id="${id}" type="file" accept="image/*" />
      <label class="compose-slot__surface" for="${id}">
        <div class="compose-slot__image" data-slot-image="${id}" hidden></div>
        <div class="compose-slot__placeholder" data-slot-placeholder="${id}">
          <span class="compose-slot__plus">${getIcon('compose')}</span>
        </div>
      </label>
      <button class="compose-slot__remove" type="button" data-slot-remove="${id}" hidden aria-label="remove image">&times;</button>
    </div>
  `;
}

function renderStaticSlot({ id, slotClass }) {
  return `
    <div class="compose-slot ${slotClass}" data-slot="${id}">
      <div class="compose-slot__surface">
        <div class="compose-slot__image" data-slot-image="${id}" hidden></div>
        <div class="compose-slot__placeholder" data-slot-placeholder="${id}">
          <span class="compose-slot__plus">${getIcon('compose')}</span>
        </div>
      </div>
    </div>
  `;
}

function renderComposeSheet(values, selectedId, selectedBackground, options = {}) {
  const { editable = false, interactiveSlots = false } = options;
  const isCustomTemplate = selectedId === 'page8';
  const baseClass = editable ? 'compose-sheet' : 'compose-sheet compose-sheet--locked';
  const sheetClass = isCustomTemplate ? `${baseClass} compose-sheet--custom` : baseClass;
  const editableAttr = editable ? 'true' : 'false';
  const textStyles = values.textStyles || {};
  const fixedLayout = isCustomTemplate ? null : getFixedTemplateLayout(selectedId);
  const roughOverlayStyle = fixedLayout?.roughUrl
    ? `style="background-image:url('${fixedLayout.roughUrl}');"`
    : '';

  if (isCustomTemplate) {
    return `
      <div class="${sheetClass}" id="composeSheet" data-template="${selectedId}" style="--sheet-bg:${selectedBackground};">
        <div class="compose-sheet__frame">
          <div class="compose-sheet__custom-preview" aria-hidden="true">
            <span class="compose-sheet__custom-eyebrow">Custom</span>
            <strong>Free image and text layout</strong>
            <p>Add, move, resize, and crop freely on a fixed A4 page.</p>
          </div>
          <div class="compose-custom-canvas" data-custom-canvas hidden></div>
        </div>
      </div>
    `;
  }

  return `
    <div class="${sheetClass}" id="composeSheet" data-template="${selectedId}" style="--sheet-bg:${selectedBackground};">
      <div class="compose-sheet__frame">
        <div class="compose-sheet__outline" aria-hidden="true"></div>
        <div class="compose-sheet__footer-bar" aria-hidden="true"></div>
        <div class="compose-sheet__rough-overlay" data-compose-rough-overlay hidden ${roughOverlayStyle}></div>
        <div class="compose-sheet__shape-mask" data-compose-shape-mask="0" hidden></div>
        <div class="compose-sheet__shape-mask" data-compose-shape-mask="1" hidden></div>
        <div class="compose-custom-canvas" data-custom-canvas hidden></div>
        <div
          class="compose-sheet__text compose-editable"
          data-editable="text"
          data-placeholder="text"
          data-default-single-line="false"
          contenteditable="${editableAttr}"
          tabindex="0"
          inputmode="text"
          spellcheck="false"
          ${buildComposeTextStyleAttr(textStyles, 'text')}
        >${getComposeTextMarkup(values, 'text')}</div>
        <div
          class="compose-sheet__headline compose-editable"
          data-editable="headline"
          data-placeholder="text"
          data-max-chars="42"
          data-default-single-line="true"
          data-single-line="true"
          contenteditable="${editableAttr}"
          tabindex="0"
          inputmode="text"
          spellcheck="false"
          ${buildComposeTextStyleAttr(textStyles, 'headline')}
        >${getComposeTextMarkup(values, 'headline')}</div>
        <div
          class="compose-sheet__subhead compose-editable"
          data-editable="subhead"
          data-placeholder="subhead"
          data-max-chars="56"
          data-default-single-line="true"
          data-single-line="true"
          contenteditable="${editableAttr}"
          tabindex="0"
          spellcheck="false"
          ${buildComposeTextStyleAttr(textStyles, 'subhead')}
        >${getComposeTextMarkup(values, 'subhead')}</div>
        <div
          class="compose-sheet__body compose-editable"
          data-editable="text2"
          data-placeholder="text"
          data-default-single-line="false"
          contenteditable="${editableAttr}"
          tabindex="0"
          inputmode="text"
          spellcheck="false"
          ${buildComposeTextStyleAttr(textStyles, 'text2')}
        >${getComposeTextMarkup(values, 'text2')}</div>
        <div
          class="compose-sheet__body compose-editable"
          data-editable="text3"
          data-placeholder="text"
          data-default-single-line="false"
          contenteditable="${editableAttr}"
          tabindex="0"
          inputmode="text"
          spellcheck="false"
          ${buildComposeTextStyleAttr(textStyles, 'text3')}
        >${getComposeTextMarkup(values, 'text3')}</div>
        <div
          class="compose-sheet__notes compose-editable"
          data-editable="intro"
          data-placeholder="notes"
          data-max-chars="72"
          data-default-single-line="false"
          contenteditable="${editableAttr}"
          tabindex="0"
          spellcheck="false"
          ${buildComposeTextStyleAttr(textStyles, 'intro')}
        >${getComposeTextMarkup(values, 'intro')}</div>
        ${interactiveSlots
          ? renderUploadSlot({ id: 'imageInputSecondary', slotClass: 'compose-slot--secondary' })
          : renderStaticSlot({ id: 'imageInputSecondary', slotClass: 'compose-slot--secondary' })}
        ${interactiveSlots
          ? renderUploadSlot({ id: 'imageInputAccent', slotClass: 'compose-slot--accent' })
          : renderStaticSlot({ id: 'imageInputAccent', slotClass: 'compose-slot--accent' })}
        ${interactiveSlots
          ? renderUploadSlot({ id: 'imageInputDetail', slotClass: 'compose-slot--detail' })
          : renderStaticSlot({ id: 'imageInputDetail', slotClass: 'compose-slot--detail' })}
        ${interactiveSlots
          ? renderUploadSlot({ id: 'imageInputPrimary', slotClass: 'compose-slot--primary' })
          : renderStaticSlot({ id: 'imageInputPrimary', slotClass: 'compose-slot--primary' })}
        <div
          class="compose-sheet__body compose-editable"
          data-editable="body"
          data-placeholder="body"
          data-max-chars="120"
          data-default-single-line="false"
          contenteditable="${editableAttr}"
          tabindex="0"
          spellcheck="false"
          ${buildComposeTextStyleAttr(textStyles, 'body')}
        >${getComposeTextMarkup(values, 'body')}</div>
        <div
          class="compose-sheet__date compose-editable"
          data-editable="date"
          data-placeholder="date"
          data-max-chars="18"
          data-default-single-line="true"
          data-single-line="true"
          contenteditable="${editableAttr}"
          tabindex="0"
          spellcheck="false"
          ${buildComposeTextStyleAttr(textStyles, 'date')}
        >${getComposeTextMarkup(values, 'date')}</div>
        <div
          class="compose-sheet__editor compose-editable"
          data-editable="editor"
          data-placeholder="editor"
          data-max-chars="24"
          data-default-single-line="true"
          data-single-line="true"
          contenteditable="${editableAttr}"
          tabindex="0"
          spellcheck="false"
          ${buildComposeTextStyleAttr(textStyles, 'editor')}
        >${getComposeTextMarkup(values, 'editor')}</div>
      </div>
    </div>
  `;
}

function renderTagsStagePanel(selectedFixedTags, freeTagsValue) {
  return `
    <section class="compose-group compose-group--tags-stage">
      <div class="compose-group__head">
        <h3>Tags</h3>
      </div>
      ${Object.entries(TAG_GROUPS).map(([groupKey, options]) => renderGroup(groupKey, options, selectedFixedTags)).join('')}
      <section class="compose-group compose-group--tags compose-group--tags-nested">
        <div class="compose-group__head">
          <h3>Free Tags</h3>
        </div>
        <label class="field">
          <input class="field__input" type="text" name="freeTags" placeholder="cafe, spring, film" value="${freeTagsValue}" />
        </label>
      </section>
    </section>
  `;
}

function renderComposeModeSwitch(activeMode) {
  return `
    <div class="compose-mode-switch" role="tablist" aria-label="Choose compose mode">
      <button
        class="compose-mode-switch__button ${activeMode === 'template' ? 'is-active' : ''}"
        type="button"
        data-compose-mode="template"
        aria-pressed="${activeMode === 'template'}"
      >
        Template
      </button>
      <button
        class="compose-mode-switch__button ${activeMode === 'custom' ? 'is-active' : ''}"
        type="button"
        data-compose-mode="custom"
        aria-pressed="${activeMode === 'custom'}"
      >
        Custom
      </button>
    </div>
  `;
}

function renderFixedTextTray() {
  return `
    <section class="compose-text-tray" data-compose-text-tray hidden>
      <button class="compose-sheet-resize compose-sheet-resize--start" type="button" data-compose-sheet-resize="start" aria-label="Resize text settings sheet from left corner"></button>
      <button class="compose-sheet-resize compose-sheet-resize--end" type="button" data-compose-sheet-resize="end" aria-label="Resize text settings sheet from right corner"></button>
      <div class="compose-text-tray__chrome" data-compose-text-tray-chrome>
        <button class="compose-text-tray__handle" type="button" data-compose-text-tray-close aria-label="Toggle text settings height"></button>
      </div>
      <div class="compose-text-tray__body" data-compose-text-tray-body>
        <div class="compose-text-tray__section">
          <div class="compose-text-tray__heading">
            <span>Font</span>
            <strong data-compose-text-target>Text</strong>
          </div>
          ${COMPOSE_TEXT_FONT_GROUPS.map((group) => `
            <div class="compose-text-tray__font-group">
              <div class="compose-text-tray__options">
                ${group.options.map((option) => `
                  <button class="compose-text-tray__option" type="button" data-compose-text-font="${option.id}">
                    ${option.label}
                  </button>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
        <div class="compose-text-tray__section">
          <div class="compose-text-tray__heading">
            <span>Size</span>
          </div>
          <div class="compose-text-tray__slider">
            <div class="compose-text-tray__stepper" aria-label="Adjust text size">
              <button class="compose-text-tray__step-button" type="button" data-compose-text-size-step="up" aria-label="Increase text size">▲</button>
              <button class="compose-text-tray__step-button" type="button" data-compose-text-size-step="down" aria-label="Decrease text size">▼</button>
            </div>
            <input type="range" min="50" max="200" step="1" value="100" data-compose-text-size />
          </div>
        </div>
        <div class="compose-text-tray__section">
          <div class="compose-text-tray__heading">
            <span>Align</span>
          </div>
          <div class="compose-text-tray__align" aria-label="Text alignment">
            <button class="compose-text-tray__align-button" type="button" data-compose-text-align="left" aria-label="Align left">
              ${getIcon('alignLeft')}
            </button>
            <button class="compose-text-tray__align-button" type="button" data-compose-text-align="center" aria-label="Align center">
              ${getIcon('alignCenter')}
            </button>
            <button class="compose-text-tray__align-button" type="button" data-compose-text-align="right" aria-label="Align right">
              ${getIcon('alignRight')}
            </button>
          </div>
        </div>
        <div class="compose-text-tray__section">
          <div class="compose-text-tray__heading">
            <span>Background</span>
          </div>
          <div class="compose-text-tray__background-options" aria-label="Text box background color">
            ${TEXT_BOX_BACKGROUND_COLORS.map((color) => `
              <button
                class="compose-text-tray__background-button"
                type="button"
                data-compose-text-background="${color.value}"
                aria-label="${color.label}"
                title="${color.label}"
              >
                <span class="compose-text-tray__background-swatch" style="--swatch:${color.value || 'transparent'}"></span>
              </button>
            `).join('')}
          </div>
        </div>
      </div>
      <div class="compose-text-tray__chrome compose-text-tray__chrome--lower" data-compose-text-tray-lower-chrome>
        <button class="compose-text-tray__handle" type="button" data-compose-text-tray-close aria-label="Toggle text settings height"></button>
      </div>
    </section>
  `;
}

function renderSelectionScreen({ values, selectedId, selectedBackground }) {
  const selectionMode = getComposeMode(selectedId);
  const fixedSelectionId = selectionMode === 'custom' ? DEFAULT_COMPOSE_TEMPLATE : selectedId;

  return `
    <section class="page page--compose page--compose--select" data-compose-stage="select">
      <header class="page-header page-header--with-back page-header--compose compose-stage-header">
        ${renderComposeBackButton('data-close-compose')}
        <div class="compose-stage-header__title-wrap">
          ${renderComposeModeSwitch(selectionMode)}
        </div>
      </header>

      <section class="compose-select-shell">
        <section class="compose-preview compose-preview--select">
          ${renderComposeSheet(values, selectedId, selectedBackground, { editable: false, interactiveSlots: false })}
        </section>
        <section class="compose-select-rail">
          ${selectionMode === 'custom' ? '' : renderTemplatePicker(fixedSelectionId)}
          <div class="compose-select-rail__footer">
            <button class="button button--primary compose-confirm-button" type="button" data-compose-stage-nav="edit">Edit</button>
          </div>
        </section>
      </section>
    </section>
  `;
}

function renderEditorScreen({ values, selectedId, selectedBackground, isEditing }) {
  const isCustomTemplate = selectedId === 'page8';

  return `
    <section class="page page--compose page--compose--edit ${isCustomTemplate ? 'page--compose--edit--page8' : ''}" data-compose-stage="edit">
      <header class="page-header page-header--with-back page-header--compose compose-stage-header compose-stage-header--edit">
        <div class="page-header__actions page-header__actions--compose">
          ${renderComposeBackButton('data-compose-stage-nav="select"')}
          ${renderComposeEditHeaderActions(isEditing)}
          ${isCustomTemplate ? renderComposeAddPopoverButton() : ''}
          ${isCustomTemplate ? renderComposeDeleteButton() : ''}
        </div>
      </header>

      <form class="compose-form compose-form--edit" id="composeForm">
        <section class="compose-editor compose-editor--focus ${isCustomTemplate ? 'compose-editor--page8' : ''}">
          <section class="compose-preview compose-preview--editor ${isCustomTemplate ? 'compose-preview--page8' : ''}">
            ${isCustomTemplate
              ? `<div class="compose-pretext-host compose-pretext-host--page8" data-compose-pretext-host></div>
                 ${renderCustomTools(isCustomTemplate)}`
              : renderComposeSheet(values, selectedId, selectedBackground, { editable: true, interactiveSlots: true })}
            ${isCustomTemplate ? '' : renderFixedTextTray()}
          </section>
        </section>
      </form>
    </section>
  `;
}

function renderCustomTools(isCustomTemplate) {
  return `
    <section class="compose-custom-tools" data-custom-template-controls hidden>
      <button class="compose-sheet-resize compose-sheet-resize--start" type="button" data-compose-sheet-resize="start" aria-label="Resize custom tools sheet from left corner"></button>
      <button class="compose-sheet-resize compose-sheet-resize--end" type="button" data-compose-sheet-resize="end" aria-label="Resize custom tools sheet from right corner"></button>
      <div class="compose-custom-tools__header">
        <p class="compose-custom-tools__eyebrow">Pretext-inspired editorial controls</p>
        <h3 class="compose-custom-tools__title">Custom Layout</h3>
        <p class="compose-custom-tools__hint">Add, crop, and arrange image or text blocks freely on the page while keeping the page size fixed.</p>
      </div>
      <div class="compose-custom-tools__buttons">
        <button class="button button--ghost" type="button" data-custom-add="image">Add Image</button>
        <button class="button button--ghost" type="button" data-custom-add="text">Add Text</button>
      </div>
      <section class="compose-custom-inspector" data-custom-inspector></section>
    </section>
  `;
}

function renderSaveScopeControl(saveScope = 'shared') {
  const activeScope = saveScope === 'personal' ? 'personal' : 'shared';
  return `
    <div class="couple-album-tabs" role="tablist" aria-label="保存先">
      <button class="${activeScope === 'shared' ? 'is-active' : ''}" type="button" data-compose-save-scope="shared" role="tab" aria-selected="${activeScope === 'shared'}">共有に保存</button>
      <button class="${activeScope === 'personal' ? 'is-active' : ''}" type="button" data-compose-save-scope="personal" role="tab" aria-selected="${activeScope === 'personal'}">個人に保存</button>
    </div>
  `;
}

function renderTagScreen({ selectedFixedTags, freeTagsValue, submitLabel, saveScope }) {
  return `
    <section class="page page--compose page--compose--tags" data-compose-stage="tags">
      <header class="page-header page-header--with-back page-header--compose compose-stage-header">
        ${renderComposeBackButton('data-compose-stage-nav="edit"')}
        <div class="compose-stage-header__title-wrap">
          <h2 class="page-header__title compose-stage-header__title">Tags</h2>
        </div>
        ${renderComposeCloseButton('data-close-compose')}
      </header>

      <form class="compose-form compose-form--tags" id="composeForm">
        <section class="compose-tag-stage">
          ${renderTagsStagePanel(selectedFixedTags, freeTagsValue)}
        </section>
        <div class="compose-flow-actions">
          ${renderSaveScopeControl(saveScope)}
          <button class="button button--ghost compose-draft-button" type="button" data-save-compose-draft>Save Draft</button>
          <button class="button button--primary compose-submit-button" type="submit">${submitLabel}</button>
        </div>
      </form>
    </section>
  `;
}

export function renderCompose(selectedTemplateId = DEFAULT_COMPOSE_TEMPLATE) {
  const options = typeof selectedTemplateId === 'object'
    ? selectedTemplateId
    : { selectedTemplateId };
  const draft = options.draft || {};
  const values = {
    text: draft.text || draft.headline || 'text',
    headline: draft.headline || 'text',
    subhead: draft.subhead || 'text',
    text2: draft.text2 || 'text',
    text3: draft.text3 || 'text',
    intro: draft.intro || 'text',
    body: draft.body || 'text',
    date: draft.date || 'text',
    editor: draft.editor || '編集者 : haru',
    textStyles: draft.textStyles || {},
    richTexts: draft.richTexts || {},
  };
  const selectedId = options.selectedTemplateId || draft.templateId || DEFAULT_COMPOSE_TEMPLATE;
  const selectedBackground = '#ffffff';
  const selectedFixedTags = Array.isArray(draft.fixedTags) ? draft.fixedTags : [];
  const freeTagsValue = Array.isArray(draft.freeTags) ? draft.freeTags.join(', ') : (draft.freeTags || '');
  const submitLabel = options.isEditing ? 'Update Post' : 'Post This Layout';
  const stage = options.stage || 'select';

  if (stage === 'select') {
    return renderSelectionScreen({
      values,
      selectedId,
      selectedBackground,
    });
  }

  if (stage === 'tags') {
    return renderTagScreen({
      selectedFixedTags,
      freeTagsValue,
      submitLabel,
      saveScope: options.saveScope,
    });
  }

  return renderEditorScreen({
    values,
    selectedId,
    selectedBackground,
    isEditing: Boolean(options.isEditing),
  });
}
