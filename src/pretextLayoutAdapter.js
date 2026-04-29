import { PAGE8_BOUNDS, normalizePage8ImageBoxes, normalizePage8TextBoxes } from '../docs/js/templates/page8Layout.js';

export const PRETEXT_PAGE_WIDTH = 794;
export const PRETEXT_PAGE_HEIGHT = 1123;
const PRETEXT_CONTENT_WIDTH = PRETEXT_PAGE_WIDTH * PAGE8_BOUNDS.width;
const PRETEXT_CONTENT_HEIGHT = PRETEXT_PAGE_HEIGHT * PAGE8_BOUNDS.height;
const DEFAULT_SERIF_FONT_FAMILY = '"Shippori Mincho", serif';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function fromRelativeX(value) {
  const normalized = (value - PAGE8_BOUNDS.x) / PAGE8_BOUNDS.width;
  return clamp(normalized, 0, 1) * PRETEXT_PAGE_WIDTH;
}

function fromRelativeY(value) {
  const normalized = (value - PAGE8_BOUNDS.y) / PAGE8_BOUNDS.height;
  return clamp(normalized, 0, 1) * PRETEXT_PAGE_HEIGHT;
}

function fromRelativeWidth(value) {
  return clamp(value / PAGE8_BOUNDS.width, 0, 1) * PRETEXT_PAGE_WIDTH;
}

function fromRelativeHeight(value) {
  return clamp(value / PAGE8_BOUNDS.height, 0, 1) * PRETEXT_PAGE_HEIGHT;
}

function toRelativeX(value) {
  return PAGE8_BOUNDS.x + ((value / PRETEXT_PAGE_WIDTH) * PAGE8_BOUNDS.width);
}

function toRelativeY(value) {
  return PAGE8_BOUNDS.y + ((value / PRETEXT_PAGE_HEIGHT) * PAGE8_BOUNDS.height);
}

function toRelativeWidth(value) {
  return (value / PRETEXT_PAGE_WIDTH) * PAGE8_BOUNDS.width;
}

function toRelativeHeight(value) {
  return (value / PRETEXT_PAGE_HEIGHT) * PAGE8_BOUNDS.height;
}

function normalizeAlign(value) {
  return value === 'center' || value === 'right' ? value : 'left';
}

function textFamilyToReference(value) {
  return value === 'serif'
    ? DEFAULT_SERIF_FONT_FAMILY
    : '"Noto Sans JP", sans-serif';
}

function referenceFamilyToLayout(fontFamily = '') {
  return /iowan|palatino|garamond|times|serif/i.test(fontFamily) ? 'serif' : 'sans';
}

export function getDefaultPretextBoxes(customLayout = {}, textValues = {}) {
  if (customLayout?.editorType === 'pretext' && Array.isArray(customLayout.pretextBoxes)) {
    return clone(customLayout.pretextBoxes);
  }

  const imageBoxes = normalizePage8ImageBoxes(customLayout);
  const textBoxes = normalizePage8TextBoxes(customLayout, textValues);

  const nextImages = imageBoxes.map((box, index) => ({
    id: box.id || `image-${index + 1}`,
    kind: 'image',
    x: fromRelativeX(box.x),
    y: fromRelativeY(box.y),
    width: fromRelativeWidth(box.width),
    height: fromRelativeHeight(box.height),
    minWidth: 140,
    minHeight: 140,
    zIndex: index + 1,
    data: {
      src: null,
      cropX: 0,
      cropY: 0,
      zoom: 1,
    },
  }));

  const nextTexts = textBoxes.map((box, index) => ({
    id: box.id || `text-${index + 1}`,
    kind: box.kind === 'title' ? 'title' : 'body',
    x: fromRelativeX(box.x),
    y: fromRelativeY(box.y),
    width: fromRelativeWidth(box.width),
    height: fromRelativeHeight(box.height),
    minWidth: box.kind === 'title' ? 220 : 200,
    minHeight: box.kind === 'title' ? 90 : 140,
    zIndex: nextImages.length + index + 1,
    data: {
      text: String(box.text || ''),
      fontFamily: textFamilyToReference(box.family),
      fontSize: Math.max(14, Math.round(PRETEXT_CONTENT_WIDTH * box.fontSize)),
      fontWeight: box.weight || (box.kind === 'title' ? 700 : 400),
      lineHeight: Math.max(16, Math.round((PRETEXT_CONTENT_WIDTH * box.fontSize) * box.lineHeight)),
      letterSpacing: 0,
      padding: Math.max(8, Math.round(PRETEXT_CONTENT_WIDTH * (box.padding || 0.012))),
      color: '#111111',
      align: normalizeAlign(box.align),
    },
  }));

  return [...nextTexts, ...nextImages];
}

export function serializePretextBoxes(boxes = []) {
  return {
    editorType: 'pretext',
    pretextBoxes: clone(boxes).map((box) => {
      if (box.kind === 'image') {
        return {
          id: box.id,
          kind: 'image',
          x: Math.round(box.x * 1000) / 1000,
          y: Math.round(box.y * 1000) / 1000,
          width: Math.round(box.width * 1000) / 1000,
          height: Math.round(box.height * 1000) / 1000,
          minWidth: box.minWidth,
          minHeight: box.minHeight,
          zIndex: box.zIndex,
          data: {
            src: box.data?.src || null,
            cropX: Number(box.data?.cropX) || 0,
            cropY: Number(box.data?.cropY) || 0,
            zoom: Math.max(1, Number(box.data?.zoom) || 1),
          },
        };
      }

      return {
        id: box.id,
        kind: box.kind === 'title' ? 'title' : 'body',
        x: Math.round(box.x * 1000) / 1000,
        y: Math.round(box.y * 1000) / 1000,
        width: Math.round(box.width * 1000) / 1000,
        height: Math.round(box.height * 1000) / 1000,
        minWidth: box.minWidth,
        minHeight: box.minHeight,
        zIndex: box.zIndex,
        data: {
          text: String(box.data?.text || ''),
          fontFamily: String(box.data?.fontFamily || textFamilyToReference('sans')),
          fontSize: Number(box.data?.fontSize) || 22,
          fontWeight: Number(box.data?.fontWeight) || 400,
          lineHeight: Number(box.data?.lineHeight) || 34,
          letterSpacing: Number(box.data?.letterSpacing) || 0,
          padding: Number(box.data?.padding) || 12,
          color: String(box.data?.color || '#111111'),
          align: normalizeAlign(box.data?.align),
        },
      };
    }),
  };
}

export function buildLegacyPage8LayoutFromPretext(customLayout = {}) {
  const pretextBoxes = Array.isArray(customLayout?.pretextBoxes) ? customLayout.pretextBoxes : [];
  const imageBoxes = [];
  const textBoxes = [];

  pretextBoxes.forEach((box, index) => {
    if (box.kind === 'image') {
      imageBoxes.push({
        id: box.id || `image-${index + 1}`,
        x: toRelativeX(box.x),
        y: toRelativeY(box.y),
        width: toRelativeWidth(box.width),
        height: toRelativeHeight(box.height),
      });
      return;
    }

    const fontSize = (Number(box.data?.fontSize) || 22) / PRETEXT_CONTENT_WIDTH;
    const padding = (Number(box.data?.padding) || 12) / PRETEXT_CONTENT_WIDTH;
    textBoxes.push({
      id: box.id || `text-${index + 1}`,
      kind: box.kind === 'title' ? 'title' : 'body',
      text: String(box.data?.text || ''),
      x: toRelativeX(box.x),
      y: toRelativeY(box.y),
      width: toRelativeWidth(box.width),
      height: toRelativeHeight(box.height),
      fontSize,
      lineHeight: Math.max(1, (Number(box.data?.lineHeight) || 34) / Math.max(1, Number(box.data?.fontSize) || 22)),
      padding,
      align: normalizeAlign(box.data?.align),
      family: referenceFamilyToLayout(box.data?.fontFamily),
      weight: Number(box.data?.fontWeight) || 400,
    });
  });

  return {
    ...customLayout,
    imageBoxes,
    textBoxes,
  };
}

export function collectPretextCaption(customLayout = {}) {
  const pretextBoxes = Array.isArray(customLayout?.pretextBoxes) ? customLayout.pretextBoxes : [];
  return pretextBoxes
    .filter((box) => box.kind === 'title' || box.kind === 'body')
    .map((box) => String(box.data?.text || '').trim())
    .filter(Boolean)
    .join(' / ')
    .slice(0, 120);
}
