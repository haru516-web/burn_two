import { computePage8ResolvedLayout, mapPage8RectToFrame } from './page8Layout.js';

export const page8Template = {
  id: 'page8',
  label: 'Page 8',
  description: 'Custom free layout',
  async render(ctx, values, files, helpers) {
    const {
      addWrappedText,
      drawFileCover,
    } = helpers;

    const frame = {
      x: 84,
      y: 84,
      width: 1240 - 168,
      height: 1754 - 168,
    };

    const resolved = computePage8ResolvedLayout(values.customLayout || {}, values);
    const pretextBoxes = Array.isArray(values.customLayout?.pretextBoxes)
      ? values.customLayout.pretextBoxes
      : null;

    ctx.fillStyle = '#191514';
    ctx.textBaseline = 'top';

    const fileMap = helpers.page8Files || {};

    if (values.customLayout?.editorType === 'pretext' && pretextBoxes) {
      const editorPageWidth = 794;
      const editorPageHeight = 1123;

      for (const box of pretextBoxes) {
        const rect = {
          x: frame.x + ((box.x / editorPageWidth) * frame.width),
          y: frame.y + ((box.y / editorPageHeight) * frame.height),
          width: (box.width / editorPageWidth) * frame.width,
          height: (box.height / editorPageHeight) * frame.height,
          radius: 0,
        };

        if (box.kind === 'image') {
          if (box.data?.src) {
            await drawFileCover(ctx, box.data.src, rect, {
              cropX: Number(box.data.cropX) || 0,
              cropY: Number(box.data.cropY) || 0,
              zoom: Math.max(1, Number(box.data.zoom) || 1),
            });
          }
          continue;
        }

        const padding = Math.max(0, Number(box.data?.padding) || 0);
        const lineHeight = Math.max(12, Number(box.data?.lineHeight) || 34);
        ctx.textAlign = box.data?.align || 'left';
        ctx.fillStyle = box.data?.color || '#191514';
        ctx.font = `${Number(box.data?.fontWeight) || 400} ${Math.max(12, Number(box.data?.fontSize) || 22)}px ${box.data?.fontFamily || '"Noto Sans JP", sans-serif'}`;
        const startX = ctx.textAlign === 'right'
          ? rect.x + rect.width - padding
          : ctx.textAlign === 'center'
            ? rect.x + (rect.width / 2)
            : rect.x + padding;
        addWrappedText(ctx, box.data?.text || '', {
          x: startX,
          y: rect.y + padding,
          maxWidth: Math.max(24, rect.width - (padding * 2)),
          lineHeight,
          maxLines: Math.max(1, Math.floor(Math.max(lineHeight, rect.height - (padding * 2)) / lineHeight)),
        });
      }
      return;
    }

    for (const box of resolved.imageBoxes) {
      const slotRect = mapPage8RectToFrame(frame, box);
      if (fileMap[box.id]?.file) {
        await drawFileCover(ctx, fileMap[box.id].file, slotRect, fileMap[box.id].position);
      }
    }

    resolved.textBoxes.forEach((box) => {
      const rect = mapPage8RectToFrame(frame, box);
      const padding = Math.max(0, frame.width * (box.padding || 0));
      const fontFamily = box.family === 'serif'
        ? '"Cormorant Garamond", "Times New Roman", serif'
        : '"Noto Sans JP", sans-serif';
      ctx.textAlign = box.align;
      ctx.font = `${box.weight} ${Math.round(frame.width * box.fontSize)}px ${fontFamily}`;
      const startX = box.align === 'right'
        ? rect.x + rect.width - padding
        : box.align === 'center'
          ? rect.x + (rect.width / 2)
          : rect.x + padding;
      const usableWidth = Math.max(24, rect.width - (padding * 2));
      const lineHeight = frame.width * box.fontSize * box.lineHeight;
      const usableHeight = Math.max(lineHeight, rect.height - (padding * 2));
      addWrappedText(ctx, box.text || '', {
        x: startX,
        y: rect.y + padding,
        maxWidth: usableWidth,
        lineHeight,
        maxLines: Math.max(1, Math.floor(usableHeight / Math.max(12, lineHeight))),
      });
    });
  },
};
