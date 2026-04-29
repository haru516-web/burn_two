import { BOX_GAP, PAGE_HEIGHT, PAGE_PADDING, PAGE_WIDTH } from '../constants'
import type { EditorBox, Rect, TextBox } from '../types'
import { clampRectToPage, intersects, overlapAmount, rectOf } from './geometry'
import { flowTextLines, measureTextHeight } from './textFlow'

function cloneBox<T extends EditorBox>(box: T): T {
  return JSON.parse(JSON.stringify(box)) as T
}

function localObstacles(target: TextBox, boxes: EditorBox[]): Rect[] {
  return boxes
    .filter((box) => box.id !== target.id)
    .map((box) => ({
      x: box.x - target.x,
      y: box.y - target.y,
      width: box.width,
      height: box.height,
    }))
}

function autoSizeTextBoxes(boxes: EditorBox[]) {
  for (const box of boxes) {
    if (box.kind === 'image') continue
    const obstacles = localObstacles(box, boxes)
    const flowed = flowTextLines(box, obstacles)
    const measured = measureTextHeight(box, box.width)
    const targetHeight = Math.max(measured, flowed.requiredHeight)
    box.height = Math.min(PAGE_HEIGHT - PAGE_PADDING - box.y, Math.max(box.minHeight, targetHeight))
  }
}

function shrinkToAvoid(box: EditorBox, against: EditorBox, overlapX: number, overlapY: number) {
  if (box.kind !== 'image' && box.width - overlapX > box.minWidth + 24) {
    const shrink = Math.min(overlapX, box.width - box.minWidth)
    if (box.x < against.x) {
      box.width -= shrink
    } else {
      box.x += shrink
      box.width -= shrink
    }
    return true
  }

  if (box.height - overlapY > box.minHeight + 24) {
    const shrink = Math.min(overlapY, box.height - box.minHeight)
    if (box.y < against.y) {
      box.height -= shrink
    } else {
      box.y += shrink
      box.height -= shrink
    }
    return true
  }

  return false
}

function isTextImagePair(primary: EditorBox, secondary: EditorBox) {
  return (primary.kind === 'image' && secondary.kind !== 'image')
    || (primary.kind !== 'image' && secondary.kind === 'image')
}

function pushApart(primary: EditorBox, secondary: EditorBox, activeId?: string) {
  const primaryRect = rectOf(primary)
  const secondaryRect = rectOf(secondary)
  if (!intersects(primaryRect, secondaryRect)) return

  const overlap = overlapAmount(primaryRect, secondaryRect)
  if (overlap.x <= 0 || overlap.y <= 0) return

  // Image/text pairs should keep the image in place and let text reflow around it.
  if (isTextImagePair(primary, secondary)) return

  const moveSecondary = secondary.id !== activeId || primary.id === activeId
  const target = moveSecondary ? secondary : primary
  const against = moveSecondary ? primary : secondary

  const shrunk = shrinkToAvoid(target, against, overlap.x / 2, overlap.y / 2)
  if (shrunk) {
    const clamped = clampRectToPage(rectOf(target))
    target.x = clamped.x
    target.y = clamped.y
    target.width = clamped.width
    target.height = clamped.height
    return
  }

  const xDirection = target.x < against.x ? -1 : 1
  const yDirection = target.y < against.y ? -1 : 1

  if (overlap.x < overlap.y) {
    target.x += xDirection * (overlap.x + BOX_GAP)
  } else {
    target.y += yDirection * (overlap.y + BOX_GAP)
  }

  const clamped = clampRectToPage(rectOf(target))
  target.x = clamped.x
  target.y = clamped.y
  target.width = clamped.width
  target.height = clamped.height
}

export function normalizeBoxes(input: EditorBox[], activeId?: string) {
  const boxes = input.map((box) => cloneBox(box))

  for (const box of boxes) {
    const clamped = clampRectToPage(rectOf(box))
    box.x = clamped.x
    box.y = clamped.y
    box.width = Math.min(box.width, PAGE_WIDTH - PAGE_PADDING * 2)
    box.height = Math.min(box.height, PAGE_HEIGHT - PAGE_PADDING * 2)
  }

  for (let pass = 0; pass < 6; pass++) {
    autoSizeTextBoxes(boxes)
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        pushApart(boxes[i]!, boxes[j]!, activeId)
      }
    }
  }

  autoSizeTextBoxes(boxes)
  return boxes
}
