import { BOX_GAP, PAGE_HEIGHT, PAGE_PADDING, PAGE_WIDTH } from '../constants'
import type { EditorBox, Rect, ResizeHandle } from '../types'

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function rectOf(box: EditorBox): Rect {
  return { x: box.x, y: box.y, width: box.width, height: box.height }
}

export function overlapAmount(a: Rect, b: Rect, gap = BOX_GAP) {
  const overlapX = Math.min(a.x + a.width + gap, b.x + b.width + gap) - Math.max(a.x - gap, b.x - gap)
  const overlapY = Math.min(a.y + a.height + gap, b.y + b.height + gap) - Math.max(a.y - gap, b.y - gap)
  return {
    x: Math.max(0, overlapX),
    y: Math.max(0, overlapY),
  }
}

export function intersects(a: Rect, b: Rect, gap = BOX_GAP) {
  const overlap = overlapAmount(a, b, gap)
  return overlap.x > 0 && overlap.y > 0
}

export function clampRectToPage(rect: Rect): Rect {
  return {
    x: clamp(rect.x, PAGE_PADDING, PAGE_WIDTH - PAGE_PADDING - rect.width),
    y: clamp(rect.y, PAGE_PADDING, PAGE_HEIGHT - PAGE_PADDING - rect.height),
    width: rect.width,
    height: rect.height,
  }
}

export function applyResize(rect: Rect, handle: ResizeHandle, dx: number, dy: number, minWidth: number, minHeight: number): Rect {
  let { x, y, width, height } = rect

  if (handle.includes('e')) width += dx
  if (handle.includes('s')) height += dy
  if (handle.includes('w')) {
    width -= dx
    x += dx
  }
  if (handle.includes('n')) {
    height -= dy
    y += dy
  }

  if (width < minWidth) {
    if (handle.includes('w')) x -= minWidth - width
    width = minWidth
  }
  if (height < minHeight) {
    if (handle.includes('n')) y -= minHeight - height
    height = minHeight
  }

  return clampRectToPage({ x, y, width, height })
}

export function translateRect(rect: Rect, dx: number, dy: number): Rect {
  return clampRectToPage({
    x: rect.x + dx,
    y: rect.y + dy,
    width: rect.width,
    height: rect.height,
  })
}

export function sortByZ<T extends EditorBox>(boxes: T[]) {
  return [...boxes].sort((a, b) => a.zIndex - b.zIndex)
}
