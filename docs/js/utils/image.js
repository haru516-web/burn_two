export async function fileToWebpDataUrl(file, options = {}) {
  const { maxWidth = 900, quality = 0.82 } = options;
  const imageBitmap = await createImageBitmap(file);
  const ratio = imageBitmap.width / imageBitmap.height;
  const targetWidth = Math.min(imageBitmap.width, maxWidth);
  const targetHeight = Math.round(targetWidth / ratio);
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(imageBitmap, 0, 0, targetWidth, targetHeight);
  return canvas.toDataURL('image/webp', quality);
}

export function fileToPreviewUrl(file) {
  return URL.createObjectURL(file);
}

export async function cropFileToCirclePngDataUrl(file, crop, options = {}) {
  const { size = 320 } = options;
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const zoom = Math.max(1, Number(crop?.zoom) || 1);
  const focusX = Math.min(1, Math.max(0, Number(crop?.x) || 0.5));
  const focusY = Math.min(1, Math.max(0, Number(crop?.y) || 0.5));
  const baseScale = Math.max(size / bitmap.width, size / bitmap.height);
  const scaledWidth = bitmap.width * baseScale * zoom;
  const scaledHeight = bitmap.height * baseScale * zoom;
  const sourceWidth = size / (baseScale * zoom);
  const sourceHeight = size / (baseScale * zoom);
  const sourceX = Math.max(0, (bitmap.width - sourceWidth) * focusX);
  const sourceY = Math.max(0, (bitmap.height - sourceHeight) * focusY);

  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(
    bitmap,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    size,
    size,
  );
  ctx.restore();
  bitmap.close?.();
  return canvas.toDataURL('image/png');
}
