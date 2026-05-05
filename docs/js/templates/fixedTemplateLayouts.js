const DESIGN_WIDTH = 1240;
const DESIGN_HEIGHT = 1754;

export const FIXED_TEMPLATE_SAFE_AREA = {
  x: 0.06,
  y: 0.06,
  width: 0.88,
  height: 0.88,
};

export const FIXED_TEMPLATE_SLOT_KEYS = ['primary', 'secondary', 'accent', 'detail'];

const TEXT_KEY_ORDERS = {
  1: ['text'],
  2: ['text', 'text2'],
  3: ['text', 'text2', 'text3'],
  4: ['text', 'text2', 'text3', 'intro'],
  5: ['text', 'text2', 'text3', 'intro', 'body'],
  6: ['text', 'text2', 'text3', 'intro', 'body', 'editor'],
};

function roughAsset(fileName) {
  return new URL(`../../references/template_roughs/${fileName}`, import.meta.url).href;
}

function rawRect(x1, y1, x2, y2) {
  return {
    x: x1,
    y: y1,
    width: x2 - x1,
    height: y2 - y1,
  };
}

function intersectRect(primary, secondary) {
  const x = Math.max(primary.x, secondary.x);
  const y = Math.max(primary.y, secondary.y);
  const right = Math.min(primary.x + primary.width, secondary.x + secondary.width);
  const bottom = Math.min(primary.y + primary.height, secondary.y + secondary.height);
  if (right <= x || bottom <= y) return null;
  return {
    x,
    y,
    width: right - x,
    height: bottom - y,
  };
}

function pickExclusionSide(blockRect, overlapRect) {
  const touchesLeft = Math.abs(overlapRect.x - blockRect.x) < 0.0001;
  const touchesRight = Math.abs((overlapRect.x + overlapRect.width) - (blockRect.x + blockRect.width)) < 0.0001;
  if (touchesLeft && !touchesRight) return 'left';
  if (touchesRight && !touchesLeft) return 'right';
  const overlapCenter = overlapRect.x + (overlapRect.width / 2);
  const blockCenter = blockRect.x + (blockRect.width / 2);
  return overlapCenter <= blockCenter ? 'left' : 'right';
}

function blockExclusions(blockRect, masks = []) {
  return masks
    .map((mask) => {
      const overlap = intersectRect(blockRect, mask.rect);
      if (!overlap) return null;
      return {
        type: mask.type,
        side: pickExclusionSide(blockRect, overlap),
        x: overlap.x,
        y: overlap.y,
        width: overlap.width,
        height: overlap.height,
        offsetTop: Math.max(0, overlap.y - blockRect.y),
      };
    })
    .filter(Boolean);
}

function pickTextKeys(count) {
  return TEXT_KEY_ORDERS[count] || TEXT_KEY_ORDERS[6];
}

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeRectOverride(baseRect, override, minimums) {
  if (!override || typeof override !== 'object') {
    return { ...baseRect };
  }
  const width = clampNumber(
    Number.isFinite(Number(override.width)) ? Number(override.width) : baseRect.width,
    minimums.width,
    1,
  );
  const height = clampNumber(
    Number.isFinite(Number(override.height)) ? Number(override.height) : baseRect.height,
    minimums.height,
    1,
  );
  return {
    ...baseRect,
    x: clampNumber(
      Number.isFinite(Number(override.x)) ? Number(override.x) : baseRect.x,
      0,
      1 - width,
    ),
    y: clampNumber(
      Number.isFinite(Number(override.y)) ? Number(override.y) : baseRect.y,
      0,
      1 - height,
    ),
    width,
    height,
    align: ['left', 'center', 'right'].includes(override.align)
      ? override.align
      : baseRect.align,
  };
}

function applyLayoutOverrides(layout, overrides) {
  if (!overrides || overrides.templateId !== layout.id) {
    return layout;
  }
  const imageOverrides = overrides.images || {};
  const textOverrides = overrides.texts || {};
  return {
    ...layout,
    safeArea: { ...layout.safeArea },
    masks: layout.masks.map((mask) => ({
      ...mask,
      rect: { ...mask.rect },
    })),
    images: layout.images.map((slot) => normalizeRectOverride(
      slot,
      imageOverrides[slot.key],
      { width: 0.06, height: 0.06 },
    )),
    texts: layout.texts.map((block) => {
      const rect = normalizeRectOverride(
        block,
        textOverrides[block.fieldKey],
        { width: 0.08, height: 0.025 },
      );
      return {
        ...rect,
        exclusions: blockExclusions(rect, layout.masks),
      };
    }),
  };
}

const RAW_FIXED_TEMPLATE_LAYOUTS = {
  page1: {
    roughUrl: roughAsset('3.webp'),
    images: [
      rawRect(0.0523, 0.0555, 0.4717, 0.2360),
      rawRect(0.5021, 0.0555, 0.9477, 0.5150),
      rawRect(0.4724, 0.5385, 0.9477, 0.7195),
      rawRect(0.0523, 0.6375, 0.4052, 0.9445),
    ],
    texts: [
      rawRect(0.0523, 0.2640, 0.4717, 0.4470),
      rawRect(0.0523, 0.4755, 0.4335, 0.6120),
      rawRect(0.4335, 0.7395, 0.9477, 0.9445),
    ],
  },
  page2: {
    roughUrl: roughAsset('4.webp'),
    images: [
      rawRect(0.0636, 0.0460, 0.4837, 0.3860),
      rawRect(0.1351, 0.4065, 0.4837, 0.6410),
      rawRect(0.5191, 0.5940, 0.9364, 0.9545),
    ],
    texts: [
      rawRect(0.5191, 0.0460, 0.9364, 0.5705),
      rawRect(0.0997, 0.6615, 0.4837, 0.9545),
    ],
  },
  page3: {
    roughUrl: roughAsset('5.webp'),
    images: [
      rawRect(0.0870, 0.1705, 0.4823, 0.4215),
      rawRect(0.0870, 0.4420, 0.9123, 0.9370),
    ],
    texts: [
      rawRect(0.0870, 0.0610, 0.9123, 0.1495),
      rawRect(0.5141, 0.1705, 0.9123, 0.4215),
    ],
  },
  page4: {
    roughUrl: roughAsset('6.webp'),
    images: [
      rawRect(0.1004, 0.1065, 0.4823, 0.4905),
      rawRect(0.1004, 0.5120, 0.4823, 0.8955),
    ],
    texts: [
      rawRect(0.5184, 0.1065, 0.8996, 0.4905),
      rawRect(0.5184, 0.5120, 0.8996, 0.8955),
    ],
    masks: [
      {
        type: 'ellipse-cutout',
        rect: rawRect(0.3586, 0.3900, 0.6414, 0.5900),
      },
    ],
  },
  page5: {
    roughUrl: roughAsset('7.webp'),
    images: [
      rawRect(0.0792, 0.1745, 0.4823, 0.9290),
    ],
    texts: [
      {
        ...rawRect(0.0785, 0.0710, 0.4823, 0.1385),
        fieldKey: 'text',
        singleLine: false,
      },
      {
        ...rawRect(0.5184, 0.0710, 0.9215, 0.9290),
        fieldKey: 'body',
      },
    ],
  },
  page6: {
    roughUrl: roughAsset('8.webp'),
    images: [
      rawRect(0.0997, 0.4820, 0.4866, 0.7560),
      rawRect(0.5134, 0.4820, 0.9003, 0.7560),
    ],
    texts: [
      rawRect(0.0997, 0.0705, 0.9003, 0.3785),
      rawRect(0.0997, 0.3915, 0.9003, 0.4690),
      rawRect(0.0997, 0.7690, 0.4866, 0.9195),
      rawRect(0.5134, 0.7690, 0.9003, 0.9195),
    ],
  },
  page7: {
    roughUrl: roughAsset('9.webp'),
    images: [
      rawRect(0.5354, 0.1065, 0.8777, 0.4700),
      rawRect(0.1004, 0.5295, 0.4427, 0.8930),
    ],
    texts: [
      {
        ...rawRect(0.1011, 0.1065, 0.4427, 0.4700),
        singleLine: false,
      },
      rawRect(0.5347, 0.5295, 0.8777, 0.8930),
    ],
    masks: [
      {
        type: 'ellipse-cutout',
        rect: rawRect(0.3570, 0.3925, 0.6430, 0.6075),
      },
    ],
  },
  page9: {
    roughUrl: roughAsset('10.webp'),
    images: [
      {
        ...rawRect(0.0552, 0.2795, 0.4632, 0.9015),
        shape: 'arch-right',
      },
    ],
    texts: [
      rawRect(0.1011, 0.0975, 0.8996, 0.2440),
      rawRect(0.1952, 0.2800, 0.9455, 0.9025),
    ],
  },
  page10: {
    roughUrl: roughAsset('11.webp'),
    images: [
      rawRect(0.0651, 0.0395, 0.3324, 0.9605),
      rawRect(0.3798, 0.2940, 0.9349, 0.5380),
    ],
    texts: [
      rawRect(0.3791, 0.0385, 0.6337, 0.2600),
      rawRect(0.6810, 0.0395, 0.9349, 0.2610),
      rawRect(0.3791, 0.5710, 0.6337, 0.9605),
      rawRect(0.6810, 0.5705, 0.9349, 0.9605),
    ],
  },
  page11: {
    roughUrl: roughAsset('2.webp'),
    images: [
      rawRect(0.2313, 0.1260, 0.7687, 0.6600),
    ],
    texts: [
      {
        ...rawRect(0.0460, 0.0590, 0.2051, 0.1050),
        fieldKey: 'date',
        singleLine: true,
      },
      {
        ...rawRect(0.1825, 0.6835, 0.8175, 0.7495),
        fieldKey: 'text2',
        singleLine: false,
      },
      {
        ...rawRect(0.1528, 0.7735, 0.8472, 0.8180),
        fieldKey: 'text3',
        singleLine: false,
      },
      {
        ...rawRect(0.1528, 0.8415, 0.3670, 0.9425),
        fieldKey: 'intro',
        singleLine: false,
      },
      {
        ...rawRect(0.3897, 0.8415, 0.6040, 0.9425),
        fieldKey: 'body',
        singleLine: false,
      },
      {
        ...rawRect(0.6330, 0.8415, 0.8472, 0.9425),
        fieldKey: 'editor',
        singleLine: false,
      },
    ],
  },
};

const normalizedLayoutCache = new Map();

function normalizeLayoutSource(templateId) {
  const source = RAW_FIXED_TEMPLATE_LAYOUTS[templateId];
  if (!source) return null;

  const textKeys = pickTextKeys(source.texts.length);
  const layout = {
    id: templateId,
    roughUrl: source.roughUrl,
    safeArea: { ...FIXED_TEMPLATE_SAFE_AREA },
    masks: (source.masks || []).map((mask) => ({
      ...mask,
      rect: { ...mask.rect },
    })),
    images: source.images.map((rect, index) => ({
      key: FIXED_TEMPLATE_SLOT_KEYS[index],
      ...rect,
    })),
    texts: source.texts.map((rect, index) => ({
      fieldKey: rect.fieldKey || textKeys[index],
      ...rect,
      align: rect.align || 'left',
      singleLine: rect.singleLine,
      exclusions: blockExclusions(rect, source.textExclusionMasks || source.masks || []),
    })),
  };
  return layout;
}

export function getFixedTemplateLayout(templateId, overrides = null) {
  if (!normalizedLayoutCache.has(templateId)) {
    normalizedLayoutCache.set(templateId, normalizeLayoutSource(templateId));
  }
  const layout = normalizedLayoutCache.get(templateId) || null;
  return layout ? applyLayoutOverrides(layout, overrides) : null;
}

export function getFixedTemplateTextMetrics(fieldKey, rect, textScale = 1) {
  const boxHeight = rect.height * DESIGN_HEIGHT;
  const sharedFontSize = (28 / 1.5) * 0.5;
  const sharedLineRatio = 1.35;
  const preset = {
    weight: 600,
    fallbackStack: '"Cormorant Garamond", "Times New Roman", serif',
    size: sharedFontSize,
    lineRatio: sharedLineRatio,
  };
  const fontSize = preset.size * clampNumber(Number(textScale) || 1, 1, 4);
  const lineHeight = Math.max(fontSize * preset.lineRatio, fontSize + 4);
  const letterSpacing = fontSize * 0.03;
  const maxLines = Math.max(1, Math.floor((boxHeight + (fontSize * 0.2)) / lineHeight));
  return {
    fontSize,
    lineHeight,
    letterSpacing,
    maxLines,
    weight: preset.weight,
    fallbackStack: preset.fallbackStack,
  };
}

function measureFixedTextLine(ctx, value, letterSpacing = 0) {
  const text = String(value || '');
  return ctx.measureText(text).width + Math.max(0, text.length - 1) * Math.max(0, Number(letterSpacing) || 0);
}

function drawFixedTextLine(ctx, value, x, y, letterSpacing = 0) {
  const text = String(value || '');
  const spacing = Math.max(0, Number(letterSpacing) || 0);
  if (!spacing || text.length <= 1) {
    ctx.fillText(text, x, y);
    return;
  }
  let cursorX = x;
  Array.from(text).forEach((char) => {
    ctx.fillText(char, cursorX, y);
    cursorX += ctx.measureText(char).width + spacing;
  });
}

function fitTextLine(ctx, units, startIndex, maxWidth, letterSpacing = 0) {
  let line = '';
  let index = startIndex;
  while (index < units.length) {
    const candidate = `${line}${units[index]}`;
    if (line && measureFixedTextLine(ctx, candidate, letterSpacing) > maxWidth) {
      break;
    }
    line = candidate;
    index += 1;
    if (measureFixedTextLine(ctx, line, letterSpacing) > maxWidth) {
      break;
    }
  }
  return {
    line,
    nextIndex: Math.max(index, startIndex + (line ? 0 : 1)),
  };
}

function drawPage7ConstrainedText(ctx, text, block, metrics) {
  const rawText = String(text || '').replace(/\r/g, '').replace(/\n+/g, '');
  const units = Array.from(rawText);
  const maxLines = metrics.maxLines;
  const x = block.x * DESIGN_WIDTH;
  const y = block.y * DESIGN_HEIGHT;
  const fullWidth = block.width * DESIGN_WIDTH;
  const exclusionWidth = Math.min(fullWidth * 0.55, fullWidth * 0.28 + 10);
  const shortWidth = Math.max(fullWidth * 0.35, fullWidth - exclusionWidth);
  let index = 0;

  for (let lineIndex = 0; lineIndex < maxLines && index < units.length; lineIndex += 1) {
    const restrictRight = block.fieldKey === 'headline' && lineIndex >= maxLines - 3;
    const restrictLeft = block.fieldKey === 'body' && lineIndex < 3;
    const maxWidth = restrictRight || restrictLeft ? shortWidth : fullWidth;
    const line = fitTextLine(ctx, units, index, maxWidth, metrics.letterSpacing);
    drawFixedTextLine(
      ctx,
      line.line,
      x + (restrictLeft ? exclusionWidth : 0),
      y + (lineIndex * metrics.lineHeight),
      metrics.letterSpacing,
    );
    index = line.nextIndex;
  }
}

export async function renderFixedTemplate(ctx, templateId, values, files, helpers) {
  const layout = getFixedTemplateLayout(templateId, values?.fixedLayout);
  if (!layout) return;

  const {
    addWrappedText,
    drawFileCover,
    drawSlotPlaceholder,
    defaults,
    getTextFontStack,
    getTextScale = () => 1,
    getTextBackgroundColor = () => '',
  } = helpers;

  ctx.fillStyle = '#191514';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';

  for (const slot of layout.images) {
    const fileState = files?.[slot.key];
    const rect = {
      x: slot.x * DESIGN_WIDTH,
      y: slot.y * DESIGN_HEIGHT,
      width: slot.width * DESIGN_WIDTH,
      height: slot.height * DESIGN_HEIGHT,
      radius: 0,
      shape: slot.shape || 'rect',
    };
    if (fileState?.file) {
      await drawFileCover(ctx, fileState.file, rect, fileState.position);
    } else {
      drawSlotPlaceholder(ctx, rect);
    }
  }

  for (const block of layout.texts) {
    const text = values?.[block.fieldKey] || defaults?.[block.fieldKey] || '';
    const metrics = getFixedTemplateTextMetrics(block.fieldKey, block, getTextScale(block.fieldKey));
    const textBackgroundColor = getTextBackgroundColor(block.fieldKey);
    ctx.save();
    if (textBackgroundColor) {
      ctx.fillStyle = textBackgroundColor;
      ctx.fillRect(
        block.x * DESIGN_WIDTH,
        block.y * DESIGN_HEIGHT,
        block.width * DESIGN_WIDTH,
        block.height * DESIGN_HEIGHT,
      );
    }
    ctx.fillStyle = '#191514';
    ctx.textAlign = block.align || 'left';
    ctx.font = `${metrics.weight} ${Math.round(metrics.fontSize)}px ${getTextFontStack(block.fieldKey, metrics.fallbackStack)}`;
    if (templateId === 'page7' && (block.fieldKey === 'headline' || block.fieldKey === 'body')) {
      drawPage7ConstrainedText(ctx, text, block, metrics);
    } else {
      addWrappedText(ctx, text, {
        x: (block.align || 'left') === 'center'
          ? (block.x + (block.width / 2)) * DESIGN_WIDTH
          : block.x * DESIGN_WIDTH,
        y: block.y * DESIGN_HEIGHT,
        maxWidth: block.width * DESIGN_WIDTH,
        lineHeight: metrics.lineHeight,
        letterSpacing: metrics.letterSpacing,
        maxLines: metrics.maxLines,
        align: block.align || 'left',
        exclusions: (block.exclusions || []).map((exclusion) => ({
          x: exclusion.x * DESIGN_WIDTH,
          y: exclusion.y * DESIGN_HEIGHT,
          width: exclusion.width * DESIGN_WIDTH,
          height: exclusion.height * DESIGN_HEIGHT,
        })),
      });
    }
    ctx.restore();
  }

  if (layout.masks.length) {
    ctx.save();
    ctx.fillStyle = values.backgroundColor || '#f8f4ee';
    layout.masks.forEach((mask) => {
      const rect = {
        x: mask.rect.x * DESIGN_WIDTH,
        y: mask.rect.y * DESIGN_HEIGHT,
        width: mask.rect.width * DESIGN_WIDTH,
        height: mask.rect.height * DESIGN_HEIGHT,
      };
      if (mask.type === 'ellipse-cutout') {
        ctx.beginPath();
        ctx.ellipse(
          rect.x + (rect.width / 2),
          rect.y + (rect.height / 2),
          rect.width / 2,
          rect.height / 2,
          0,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    });
    ctx.restore();
  }
}
