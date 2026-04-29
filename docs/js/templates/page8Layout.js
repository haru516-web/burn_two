export const PAGE8_BOUNDS = { x: 0.06, y: 0.06, width: 0.88, height: 0.88 };
export const PAGE8_GRID = 0.015;

export const PAGE8_DEFAULT_OPTIONS = {
  densityMode: 'whitespace',
  recoveryMode: 'restore',
};

export const PAGE8_MIN_IMAGE_SIZE = {
  width: 0.14,
  height: 0.12,
};

export const PAGE8_MIN_TEXT_SIZE = {
  width: 0.18,
  height: 0.08,
};

const LEGACY_IMAGE_BOXES = {
  primary: { x: 0.08, y: 0.16, width: 0.4, height: 0.3 },
  secondary: { x: 0.58, y: 0.12, width: 0.24, height: 0.2 },
  accent: { x: 0.56, y: 0.58, width: 0.26, height: 0.18 },
};

const LEGACY_TEXT_SPECS = {
  headline: {
    x: 0.08, y: 0.07, width: 0.46, height: 0.1,
    fontSize: 0.056, lineHeight: 1.08, align: 'left', family: 'serif', weight: 600,
  },
  subhead: {
    x: 0.08, y: 0.16, width: 0.48, height: 0.07,
    fontSize: 0.023, lineHeight: 1.34, align: 'left', family: 'sans', weight: 500,
  },
  intro: {
    x: 0.08, y: 0.52, width: 0.28, height: 0.18,
    fontSize: 0.021, lineHeight: 1.42, align: 'left', family: 'sans', weight: 500,
  },
  body: {
    x: 0.62, y: 0.42, width: 0.22, height: 0.24,
    fontSize: 0.021, lineHeight: 1.42, align: 'left', family: 'sans', weight: 500,
  },
  date: {
    x: 0.08, y: 0.91, width: 0.22, height: 0.04,
    fontSize: 0.019, lineHeight: 1.25, align: 'left', family: 'sans', weight: 500,
  },
  editor: {
    x: 0.66, y: 0.91, width: 0.2, height: 0.04,
    fontSize: 0.019, lineHeight: 1.25, align: 'right', family: 'sans', weight: 500,
  },
};

const DEFAULT_IMAGE_BOXES = [
  { id: 'image-1', x: 0.1, y: 0.14, width: 0.38, height: 0.34 },
];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function snap(value) {
  return Math.round(value / PAGE8_GRID) * PAGE8_GRID;
}

function normalizeId(prefix, incomingId, index) {
  if (typeof incomingId === 'string' && incomingId.trim()) {
    return incomingId.trim();
  }
  return `${prefix}-${index + 1}`;
}

function sanitizeText(value, fallback = '') {
  return String(value ?? fallback).replace(/\r/g, '');
}

function clampRect(rect, minimums) {
  const width = clamp(
    snap(Number.isFinite(rect.width) ? rect.width : minimums.width),
    minimums.width,
    PAGE8_BOUNDS.width,
  );
  const height = clamp(
    snap(Number.isFinite(rect.height) ? rect.height : minimums.height),
    minimums.height,
    PAGE8_BOUNDS.height,
  );

  return {
    x: clamp(
      snap(Number.isFinite(rect.x) ? rect.x : PAGE8_BOUNDS.x),
      PAGE8_BOUNDS.x,
      PAGE8_BOUNDS.x + PAGE8_BOUNDS.width - width,
    ),
    y: clamp(
      snap(Number.isFinite(rect.y) ? rect.y : PAGE8_BOUNDS.y),
      PAGE8_BOUNDS.y,
      PAGE8_BOUNDS.y + PAGE8_BOUNDS.height - height,
    ),
    width,
    height,
  };
}

function normalizeImageBox(box = {}, index = 0) {
  return {
    id: normalizeId('image', box.id, index),
    ...clampRect(box, PAGE8_MIN_IMAGE_SIZE),
  };
}

function normalizeTextBox(box = {}, index = 0) {
  const hasIncomingText = typeof box.text === 'string';
  const inferredKind = box.kind === 'title' || box.kind === 'body'
    ? box.kind
    : ((Number(box.fontSize) || 0) >= 0.04 || box.family === 'serif' ? 'title' : 'body');
  return {
    id: normalizeId('text', box.id, index),
    kind: inferredKind,
    text: sanitizeText(box.text, 'text'),
    isDefaultText: typeof box.isDefaultText === 'boolean' ? box.isDefaultText : !hasIncomingText,
    ...clampRect(box, PAGE8_MIN_TEXT_SIZE),
    fontSize: clamp(Number.isFinite(box.fontSize) ? box.fontSize : 0.028, 0.014, 0.09),
    lineHeight: clamp(Number.isFinite(box.lineHeight) ? box.lineHeight : 1.35, 1, 2.2),
    padding: clamp(Number.isFinite(box.padding) ? box.padding : 0.012, 0.004, 0.05),
    align: box.align === 'center' || box.align === 'right' ? box.align : 'left',
    family: box.family === 'serif' ? 'serif' : 'sans',
    weight: clamp(Number.isFinite(box.weight) ? box.weight : (box.family === 'serif' ? 600 : 500), 400, 700),
  };
}

function createLegacyTextBoxes(textValues = {}) {
  return Object.entries(LEGACY_TEXT_SPECS)
    .map(([key, spec], index) => normalizeTextBox({
      id: `text-${index + 1}`,
      text: sanitizeText(textValues[key], ''),
      x: spec.x,
      y: spec.y,
      width: spec.width,
      height: spec.height,
      fontSize: spec.fontSize,
      lineHeight: spec.lineHeight,
      padding: spec.family === 'serif' ? 0.01 : 0.012,
      align: spec.align,
      kind: spec.family === 'serif' && spec.fontSize >= 0.04 ? 'title' : 'body',
      family: spec.family,
      weight: spec.weight,
    }, index))
    .filter((box) => box.text.trim());
}

export function normalizePage8Options(customLayout = {}) {
  return {
    densityMode: customLayout.densityMode === 'fill' ? 'fill' : PAGE8_DEFAULT_OPTIONS.densityMode,
    recoveryMode: customLayout.recoveryMode === 'keep' ? 'keep' : PAGE8_DEFAULT_OPTIONS.recoveryMode,
  };
}

export function normalizePage8ImageBoxes(customLayout = {}) {
  if (Array.isArray(customLayout.imageBoxes) && customLayout.imageBoxes.length) {
    return customLayout.imageBoxes.map((box, index) => normalizeImageBox(box, index));
  }

  if (customLayout.imageBoxes && typeof customLayout.imageBoxes === 'object') {
    return Object.entries(LEGACY_IMAGE_BOXES).map(([key, defaults], index) => {
      const incoming = customLayout.imageBoxes?.[key] || {};
      return normalizeImageBox({
        id: key,
        x: Number.isFinite(incoming.x) ? incoming.x : defaults.x,
        y: Number.isFinite(incoming.y) ? incoming.y : defaults.y,
        width: Number.isFinite(incoming.width) ? incoming.width : defaults.width,
        height: Number.isFinite(incoming.height) ? incoming.height : defaults.height,
      }, index);
    });
  }

  return DEFAULT_IMAGE_BOXES.map((box, index) => normalizeImageBox(box, index));
}

export function normalizePage8TextBoxes(customLayout = {}, textValues = {}) {
  if (Array.isArray(customLayout.textBoxes) && customLayout.textBoxes.length) {
    return customLayout.textBoxes.map((box, index) => normalizeTextBox(box, index));
  }

  const hasLegacyImageBoxMap = Boolean(
    customLayout.imageBoxes &&
    !Array.isArray(customLayout.imageBoxes) &&
    typeof customLayout.imageBoxes === 'object',
  );

  const legacyTextBoxes = createLegacyTextBoxes(textValues);
  if (hasLegacyImageBoxMap && legacyTextBoxes.length) {
    return legacyTextBoxes;
  }

  return [
    normalizeTextBox({
      id: 'text-1',
      text: sanitizeText(textValues.headline, 'text'),
      isDefaultText: !textValues.headline,
      x: 0.56,
      y: 0.18,
      width: 0.24,
      height: 0.14,
      kind: 'title',
      fontSize: 0.046,
      lineHeight: 1.12,
      padding: 0.01,
      family: 'serif',
      weight: 600,
    }, 0),
  ];
}

export function computePage8ResolvedLayout(customLayout = {}, textValues = {}) {
  return {
    options: normalizePage8Options(customLayout),
    imageBoxes: normalizePage8ImageBoxes(customLayout),
    textBoxes: normalizePage8TextBoxes(customLayout, textValues),
  };
}

export function page8RectToPercent(rect) {
  return {
    left: `${rect.x * 100}%`,
    top: `${rect.y * 100}%`,
    width: `${rect.width * 100}%`,
    height: `${rect.height * 100}%`,
  };
}

export function mapPage8RectToFrame(frame, rect) {
  return {
    x: frame.x + (frame.width * rect.x),
    y: frame.y + (frame.height * rect.y),
    width: frame.width * rect.width,
    height: frame.height * rect.height,
    radius: 0,
  };
}

export function snapPage8Value(value) {
  return snap(value);
}
