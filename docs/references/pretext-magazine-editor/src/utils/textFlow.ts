import { layout, layoutNextLineRange, materializeLineRange, prepare, prepareWithSegments } from '@chenglou/pretext'
import type { FlowLine, Rect, TextBox } from '../types'

const preparedCache = new Map<string, any>()
const preparedSegmentsCache = new Map<string, any>()

type Interval = { left: number; right: number }

function fontString(box: TextBox) {
  const { fontWeight, fontSize, fontFamily } = box.data
  return `${fontWeight} ${fontSize}px ${fontFamily}`
}

function cacheKey(box: TextBox) {
  return [box.kind, box.data.text, fontString(box), box.data.letterSpacing].join('::')
}

function getPrepared(box: TextBox) {
  const key = cacheKey(box)
  if (!preparedCache.has(key)) {
    preparedCache.set(key, prepare(box.data.text, fontString(box), { whiteSpace: 'pre-wrap' }))
  }
  return preparedCache.get(key)
}

function getPreparedSegments(box: TextBox) {
  const key = cacheKey(box)
  if (!preparedSegmentsCache.has(key)) {
    preparedSegmentsCache.set(key, prepareWithSegments(box.data.text, fontString(box), { whiteSpace: 'pre-wrap' }))
  }
  return preparedSegmentsCache.get(key)
}

export function measureTextHeight(box: TextBox, width: number) {
  const innerWidth = Math.max(40, width - box.data.padding * 2)
  const result = layout(getPrepared(box), innerWidth, box.data.lineHeight)
  return result.height + box.data.padding * 2
}

function carveSlots(base: Interval, blocked: Interval[]) {
  let slots = [base]
  for (const interval of blocked) {
    const next: Interval[] = []
    for (const slot of slots) {
      if (interval.right <= slot.left || interval.left >= slot.right) {
        next.push(slot)
        continue
      }
      if (interval.left > slot.left) next.push({ left: slot.left, right: interval.left })
      if (interval.right < slot.right) next.push({ left: interval.right, right: slot.right })
    }
    slots = next
  }
  return slots.filter((slot) => slot.right - slot.left > 32)
}

function chooseSlot(slots: Interval[], align: 'left' | 'center' | 'right', containerCenter: number) {
  if (slots.length === 0) return null
  if (align === 'center') {
    return [...slots].sort((a, b) => {
      const aCenter = (a.left + a.right) / 2
      const bCenter = (b.left + b.right) / 2
      return Math.abs(aCenter - containerCenter) - Math.abs(bCenter - containerCenter)
    })[0]!
  }
  if (align === 'right') {
    return [...slots].sort((a, b) => b.right - a.right)[0]!
  }
  return [...slots].sort((a, b) => (b.right - b.left) - (a.right - a.left))[0]!
}

function intervalsForBand(obstacles: Rect[], bandTop: number, bandBottom: number, left: number, right: number) {
  const blocked: Interval[] = []
  for (const obstacle of obstacles) {
    const obstacleTop = obstacle.y
    const obstacleBottom = obstacle.y + obstacle.height
    if (obstacleBottom <= bandTop || obstacleTop >= bandBottom) continue
    blocked.push({
      left: Math.max(left, obstacle.x),
      right: Math.min(right, obstacle.x + obstacle.width),
    })
  }
  return blocked.sort((a, b) => a.left - b.left)
}

export function flowTextLines(box: TextBox, obstacles: Rect[]) {
  const prepared = getPreparedSegments(box)
  const lines: FlowLine[] = []
  const padding = box.data.padding
  const left = padding
  const right = box.width - padding
  const top = padding
  const maxBottom = Math.max(box.height - padding, padding + box.data.lineHeight)
  let cursor: any = { segmentIndex: 0, graphemeIndex: 0 }
  let y = top
  let safety = 0
  let isOverflowing = false
  let usedBottom = top

  while (safety < 3000) {
    safety += 1
    const bandTop = y
    const bandBottom = y + box.data.lineHeight
    const blocked = intervalsForBand(obstacles, bandTop, bandBottom, left, right)
    const slots = carveSlots({ left, right }, blocked)

    if (slots.length === 0) {
      y += box.data.lineHeight
      continue
    }

    const slot = chooseSlot(slots, box.data.align, (left + right) / 2)
    if (!slot) break

    const range = layoutNextLineRange(prepared, cursor, Math.max(16, slot.right - slot.left))
    if (range === null) break

    const line = materializeLineRange(prepared, range)
    const lineWidth = typeof line.width === 'number' ? line.width : Math.max(16, slot.right - slot.left)
    const x = box.data.align === 'center'
      ? slot.left + Math.max(0, (slot.right - slot.left - lineWidth) / 2)
      : box.data.align === 'right'
        ? slot.right - lineWidth
        : slot.left

    lines.push({
      text: line.text,
      x,
      y,
      width: lineWidth,
    })

    usedBottom = Math.max(usedBottom, bandBottom)
    if (bandBottom > maxBottom + 0.5) {
      isOverflowing = true
    }

    cursor = range.end
    y += box.data.lineHeight

    if (bandBottom > maxBottom && lines.length > 0) {
      // keep measuring beyond current height so the editor can auto-grow
      continue
    }
  }

  const requiredHeight = Math.max(box.minHeight, (lines.length === 0 ? box.data.lineHeight : lines.length * box.data.lineHeight) + padding * 2)

  return {
    lines,
    requiredHeight,
    isOverflowing,
    usedBottom,
  }
}

function cloneTextBox(box: TextBox, text: string) {
  return {
    ...box,
    data: {
      ...box.data,
      text,
    },
  }
}

export function textFitsInBox(box: TextBox, obstacles: Rect[], text: string) {
  const nextBox = cloneTextBox(box, text)
  return !flowTextLines(nextBox, obstacles).isOverflowing
}

export function clampTextToFitBox(box: TextBox, obstacles: Rect[], text: string) {
  const normalizedText = String(text || '').replace(/\r/g, '')
  if (textFitsInBox(box, obstacles, normalizedText)) {
    return normalizedText
  }

  const units = Array.from(normalizedText)
  let low = 0
  let high = units.length

  while (low < high) {
    const mid = Math.ceil((low + high) / 2)
    const candidate = units.slice(0, mid).join('')
    if (textFitsInBox(box, obstacles, candidate)) {
      low = mid
    } else {
      high = mid - 1
    }
  }

  return units.slice(0, low).join('')
}
