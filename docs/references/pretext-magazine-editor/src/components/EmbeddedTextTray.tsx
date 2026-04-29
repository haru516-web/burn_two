import { AlignCenter, AlignLeft, AlignRight, Type, WholeWord } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { TextBox } from '../types'

const SCALE_MIN = 80
const SCALE_MAX = 140
const SCALE_STEP = 1
const FONT_GROUPS = [
  {
    label: 'Sans',
    options: [
      { label: 'Noto Sans JP', value: '"Noto Sans JP", sans-serif' },
      { label: 'Zen Kaku Gothic New', value: '"Zen Kaku Gothic New", sans-serif' },
      { label: 'BIZ UDGothic', value: '"BIZ UDGothic", sans-serif' },
      { label: 'Kosugi Maru', value: '"Kosugi Maru", sans-serif' },
      { label: 'LINE Seed JP', value: '"LINE Seed JP", sans-serif' },
    ],
  },
  {
    label: 'Serif',
    options: [
      { label: 'Sawarabi Mincho', value: '"Sawarabi Mincho", serif' },
      { label: 'Hina Mincho', value: '"Hina Mincho", serif' },
      { label: 'Source Han Serif', value: '"Source Han Serif", "Source Han Serif JP", "Noto Serif JP", serif' },
      { label: 'Shippori Mincho', value: '"Shippori Mincho", serif' },
      { label: 'Zen Old Mincho', value: '"Zen Old Mincho", serif' },
    ],
  },
] as const

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

type EmbeddedTextTrayProps = {
  selected: TextBox
  onUpdateText: (patch: Partial<TextBox['data']>) => void
  onConvertKind: (kind: 'title' | 'body') => void
  onVisibleInsetChange?: (inset: number) => void
}

export function EmbeddedTextTray({
  selected,
  onUpdateText,
  onConvertKind,
  onVisibleInsetChange,
}: EmbeddedTextTrayProps) {
  const trayRef = useRef<HTMLElement | null>(null)
  const bodyRef = useRef<HTMLDivElement | null>(null)
  const dragStateRef = useRef<{ pointerId: number, startY: number, startLevel: number, moved: boolean } | null>(null)
  const justDraggedRef = useRef(false)
  const baseMetricsRef = useRef({
    id: selected.id,
    kind: selected.kind,
    fontSize: selected.data.fontSize,
    lineHeight: selected.data.lineHeight,
  })
  const shouldAnimateRef = useRef(false)

  const [openLevel, setOpenLevel] = useState(0)
  const [scalePercent, setScalePercent] = useState(100)

  useEffect(() => {
    baseMetricsRef.current = {
      id: selected.id,
      kind: selected.kind,
      fontSize: selected.data.fontSize,
      lineHeight: selected.data.lineHeight,
    }
    setScalePercent(100)
  }, [selected.id, selected.kind])

  const getHeights = () => {
    const tray = trayRef.current
    if (!tray) {
      return { collapsedHeight: 0, bodyHeight: 0 }
    }

    const previousHeight = tray.style.height
    tray.style.height = 'auto'
    const expandedHeight = tray.scrollHeight
    const bodyHeight = bodyRef.current?.scrollHeight || 0
    const collapsedHeight = Math.max(0, expandedHeight - bodyHeight)
    tray.style.height = previousHeight

    return { collapsedHeight, bodyHeight }
  }

  const applyOpenLevel = (nextLevel: number, animate = true) => {
    shouldAnimateRef.current = animate
    setOpenLevel(clamp(nextLevel, 0, 100))
  }

  const snapOpenLevel = (level: number) => {
    const snapPoints = [0, 50, 100]
    return snapPoints.reduce((closest, candidate) => (
      Math.abs(candidate - level) < Math.abs(closest - level) ? candidate : closest
    ))
  }

  useLayoutEffect(() => {
    const tray = trayRef.current
    if (!tray) return

    const { collapsedHeight, bodyHeight } = getHeights()
    const targetHeight = collapsedHeight + (bodyHeight * (openLevel / 100))
    tray.style.transition = shouldAnimateRef.current ? '' : 'none'
    tray.style.height = `${Math.round(targetHeight)}px`
    tray.style.transform = 'translateY(0)'
    onVisibleInsetChange?.(Math.round(targetHeight))

    if (!shouldAnimateRef.current) {
      requestAnimationFrame(() => {
        tray.style.removeProperty('transition')
      })
    }
  }, [openLevel, onVisibleInsetChange, selected.id, selected.kind])

  useEffect(() => () => {
    onVisibleInsetChange?.(0)
  }, [onVisibleInsetChange])

  const handleScaleChange = (nextPercent: number) => {
    const safePercent = clamp(nextPercent, SCALE_MIN, SCALE_MAX)
    const base = baseMetricsRef.current
    const scale = safePercent / 100
    setScalePercent(safePercent)
    onUpdateText({
      fontSize: clamp(Math.round(base.fontSize * scale), 14, 96),
      lineHeight: clamp(Math.round(base.lineHeight * scale), 16, 120),
    })
  }

  const handleChromePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null
    if (target?.closest('[data-pretext-tray-level]')) return

    dragStateRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startLevel: openLevel,
      moved: false,
    }
    justDraggedRef.current = false
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  const handleChromePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current
    if (!dragState || dragState.pointerId !== event.pointerId) return

    const { bodyHeight } = getHeights()
    if (!bodyHeight) return

    const deltaY = event.clientY - dragState.startY
    if (!dragState.moved && Math.abs(deltaY) >= 4) {
      dragState.moved = true
    }
    applyOpenLevel(dragState.startLevel - ((deltaY / bodyHeight) * 100), false)
  }

  const finishChromeDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current
    if (!dragState || dragState.pointerId !== event.pointerId) return

    justDraggedRef.current = dragState.moved
    dragStateRef.current = null
    event.currentTarget.releasePointerCapture?.(event.pointerId)
    applyOpenLevel(snapOpenLevel(openLevel))
  }

  return (
    <section
      ref={trayRef}
      className="compose-text-tray compose-text-tray--embedded"
      data-open-level={openLevel}
    >
      <div
        className="compose-text-tray__chrome"
        onPointerDown={handleChromePointerDown}
        onPointerMove={handleChromePointerMove}
        onPointerUp={finishChromeDrag}
        onPointerCancel={finishChromeDrag}
      >
        <button
          className="compose-text-tray__handle"
          type="button"
          aria-label="Toggle text settings height"
          onClick={() => {
            if (justDraggedRef.current) {
              justDraggedRef.current = false
              return
            }
            applyOpenLevel(openLevel === 0 ? 100 : 0)
          }}
        />
        <div className="compose-text-tray__levels" role="group" aria-label="Text settings height">
          {[0, 50, 100].map((level) => (
            <button
              key={level}
              className={`compose-text-tray__level ${openLevel === level ? 'is-active' : ''}`}
              type="button"
              data-pretext-tray-level={level}
              onClick={() => applyOpenLevel(level)}
            >
              {level}%
            </button>
          ))}
        </div>
      </div>

      <div ref={bodyRef} className="compose-text-tray__body">
        <div className="compose-text-tray__section">
          <div className="compose-text-tray__heading">
            <span>Style</span>
            <strong>{selected.kind === 'title' ? 'Title' : 'Body'}</strong>
          </div>
          <div className="segmented-control">
            <button
              type="button"
              className={selected.kind === 'title' ? 'is-active' : ''}
              onClick={() => onConvertKind('title')}
              aria-label="Title style"
              title="Title"
            >
              <Type size={16} />
            </button>
            <button
              type="button"
              className={selected.kind === 'body' ? 'is-active' : ''}
              onClick={() => onConvertKind('body')}
              aria-label="Body style"
              title="Body"
            >
              <WholeWord size={16} />
            </button>
          </div>
        </div>

        <div className="compose-text-tray__section">
          <div className="compose-text-tray__heading">
            <span>Align</span>
            <strong>{selected.data.align === 'left' ? 'Left' : selected.data.align === 'center' ? 'Center' : 'Right'}</strong>
          </div>
          <div className="segmented-control segmented-control--triple">
            <button
              type="button"
              className={selected.data.align === 'left' ? 'is-active' : ''}
              onClick={() => onUpdateText({ align: 'left' })}
              aria-label="Align left"
              title="Left"
            >
              <AlignLeft size={16} />
            </button>
            <button
              type="button"
              className={selected.data.align === 'center' ? 'is-active' : ''}
              onClick={() => onUpdateText({ align: 'center' })}
              aria-label="Align center"
              title="Center"
            >
              <AlignCenter size={16} />
            </button>
            <button
              type="button"
              className={selected.data.align === 'right' ? 'is-active' : ''}
              onClick={() => onUpdateText({ align: 'right' })}
              aria-label="Align right"
              title="Right"
            >
              <AlignRight size={16} />
            </button>
          </div>
        </div>

        <div className="compose-text-tray__section">
          <div className="compose-text-tray__heading">
            <span>Font</span>
            <strong>Text</strong>
          </div>
          {FONT_GROUPS.map((group) => (
            <div key={group.label} className="compose-text-tray__font-group">
              <span className="compose-text-tray__group-label">{group.label}</span>
              <div className="compose-text-tray__options">
                {group.options.map((option) => (
                  <button
                    key={option.value}
                    className={`compose-text-tray__option ${selected.data.fontFamily === option.value ? 'is-active' : ''}`}
                    type="button"
                    onClick={() => onUpdateText({ fontFamily: option.value })}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="compose-text-tray__section">
          <div className="compose-text-tray__heading">
            <span>Size</span>
            <strong>{scalePercent}%</strong>
          </div>
          <div className="compose-text-tray__slider">
            <span>A</span>
            <input
              type="range"
              min={SCALE_MIN}
              max={SCALE_MAX}
              step={SCALE_STEP}
              value={scalePercent}
              onChange={(event) => handleScaleChange(Number(event.target.value))}
            />
            <span className="compose-text-tray__slider-large">A</span>
          </div>
        </div>
      </div>
    </section>
  )
}
