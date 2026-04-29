import { useEffect, useMemo, useRef, useState, type ChangeEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { DEFAULT_BODY_TEXT, DEFAULT_TITLE_TEXT, PAGE_HEIGHT, PAGE_WIDTH } from './constants'
import { EmbeddedTextTray } from './components/EmbeddedTextTray'
import { Inspector } from './components/Inspector'
import { Toolbar } from './components/Toolbar'
import type { DragMode, EditorBox, ImageBox, ResizeHandle, TextBox } from './types'
import { applyResize, clampRectToPage, rectOf, sortByZ, translateRect } from './utils/geometry'
import { normalizeBoxes } from './utils/editorLayout'
import { clampTextToFitBox, flowTextLines } from './utils/textFlow'

const CENTER_SNAP_THRESHOLD = 18
const EMPTY_SNAP_GUIDES = { horizontal: false, vertical: false }
const DEFAULT_TEXT_FONT_FAMILY = '"Shippori Mincho", serif'

function uid() {
  return globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)
}

function maxZ(boxes: EditorBox[]) {
  return boxes.reduce((max, box) => Math.max(max, box.zIndex), 0)
}

function createTitleBox(zIndex: number, align: TextBox['data']['align'] = 'left'): TextBox {
  return {
    id: uid(),
    kind: 'title',
    x: 48,
    y: 54,
    width: 596,
    height: 140,
    minWidth: 220,
    minHeight: 90,
    zIndex,
    data: {
      text: DEFAULT_TITLE_TEXT,
      fontFamily: DEFAULT_TEXT_FONT_FAMILY,
      fontSize: 48,
      fontWeight: 700,
      lineHeight: 54,
      letterSpacing: 0,
      padding: 12,
      color: '#111111',
      align,
    },
  }
}

function createBodyBox(zIndex: number, align: TextBox['data']['align'] = 'left'): TextBox {
  return {
    id: uid(),
    kind: 'body',
    x: 52,
    y: 238,
    width: 356,
    height: 420,
    minWidth: 200,
    minHeight: 140,
    zIndex,
    data: {
      text: DEFAULT_BODY_TEXT,
      fontFamily: DEFAULT_TEXT_FONT_FAMILY,
      fontSize: 22,
      fontWeight: 400,
      lineHeight: 34,
      letterSpacing: 0,
      padding: 14,
      color: '#121212',
      align,
    },
  }
}

function createImageBox(zIndex: number): ImageBox {
  return {
    id: uid(),
    kind: 'image',
    x: 454,
    y: 252,
    width: 274,
    height: 356,
    minWidth: 140,
    minHeight: 140,
    zIndex,
    data: {
      src: null,
      cropX: 0,
      cropY: 0,
      zoom: 1,
    },
  }
}

function createInitialBoxes() {
  const title = createTitleBox(1)
  const body = createBodyBox(2)
  const image = createImageBox(3)
  return normalizeBoxes([title, body, image], body.id)
}

type AppProps = {
  embedded?: boolean
  initialBoxes?: EditorBox[]
  onBoxesChange?: (boxes: EditorBox[]) => void
  onImageUploadTransform?: (file: File) => Promise<string>
  externalCommand?: (
    | {
        id: number
        type: 'add'
        kind: 'title' | 'body' | 'image'
        align?: TextBox['data']['align']
      }
    | {
        id: number
        type: 'delete-selected'
      }
  ) | null
}

function cloneEditorBox(box: EditorBox): EditorBox {
  if (box.kind === 'image') {
    return {
      ...box,
      data: { ...box.data },
    }
  }

  return {
    ...box,
    data: { ...box.data },
  }
}

function localObstacles(target: TextBox, boxes: EditorBox[]) {
  return boxes
    .filter((box) => box.id !== target.id)
    .map((box) => ({
      x: box.x - target.x,
      y: box.y - target.y,
      width: box.width,
      height: box.height,
    }))
}

function fitTextBoxWithinLayout(input: EditorBox[], targetId: string | null) {
  if (!targetId) return normalizeBoxes(input)
  const normalized = normalizeBoxes(input, targetId)
  const target = normalized.find((box) => box.id === targetId)
  if (!target || target.kind === 'image') {
    return normalized
  }

  const fittedText = clampTextToFitBox(target, localObstacles(target, normalized), target.data.text)
  if (fittedText === target.data.text) {
    return normalized
  }

  const refitted = normalized.map((box) => (
    box.id === targetId && box.kind !== 'image'
      ? {
          ...box,
          data: {
            ...box.data,
            text: fittedText,
          },
        }
      : box
  ))

  return normalizeBoxes(refitted, targetId)
}

function handlePositions() {
  return [
    'nw', 'n', 'ne',
    'w',        'e',
    'sw', 's', 'se',
  ] as ResizeHandle[]
}

export default function App({ embedded = false, initialBoxes, onBoxesChange, onImageUploadTransform, externalCommand = null }: AppProps = {}) {
  const [boxes, setBoxes] = useState<EditorBox[]>(() => initialBoxes ?? createInitialBoxes())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dragMode, setDragMode] = useState<DragMode>({ type: 'idle' })
  const [cropMode, setCropMode] = useState(false)
  const [embeddedScale, setEmbeddedScale] = useState(1)
  const [embeddedTrayInset, setEmbeddedTrayInset] = useState(0)
  const [snapGuides, setSnapGuides] = useState(EMPTY_SNAP_GUIDES)
  const [editingTextId, setEditingTextId] = useState<string | null>(null)
  const [uploadTargetId, setUploadTargetId] = useState<string | null>(null)
  const canvasAreaRef = useRef<HTMLDivElement | null>(null)
  const pageRef = useRef<HTMLDivElement | null>(null)
  const hiddenUploadInputRef = useRef<HTMLInputElement | null>(null)
  const inlineEditorRef = useRef<HTMLTextAreaElement | null>(null)
  const dragFrameRef = useRef<number | null>(null)
  const dragPointerRef = useRef<{ clientX: number, clientY: number } | null>(null)
  const lastTextTapRef = useRef<{ id: string, time: number } | null>(null)
  const activePointerTargetRef = useRef<HTMLElement | null>(null)
  const activePointerIdRef = useRef<number | null>(null)
  const handledExternalCommandIdRef = useRef<number | null>(null)

  const selected = useMemo(() => boxes.find((box) => box.id === selectedId) ?? null, [boxes, selectedId])

  const toPagePoint = (clientX: number, clientY: number) => {
    const rect = pageRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return {
      x: ((clientX - rect.left) / rect.width) * PAGE_WIDTH,
      y: ((clientY - rect.top) / rect.height) * PAGE_HEIGHT,
    }
  }

  const bringToFront = (id: string, sourceBoxes = boxes) => {
    const nextZ = maxZ(sourceBoxes) + 1
    return sourceBoxes.map((box) => (box.id === id ? { ...box, zIndex: nextZ } : box))
  }

  const snapRectToPageCenter = (rect: { x: number, y: number, width: number, height: number }) => {
    let nextRect = { ...rect }
    let horizontal = false
    let vertical = false
    const pageCenterX = PAGE_WIDTH / 2
    const pageCenterY = PAGE_HEIGHT / 2
    const boxCenterX = nextRect.x + (nextRect.width / 2)
    const boxCenterY = nextRect.y + (nextRect.height / 2)

    if (Math.abs(boxCenterX - pageCenterX) <= CENTER_SNAP_THRESHOLD) {
      nextRect.x = pageCenterX - (nextRect.width / 2)
      vertical = true
    }

    if (Math.abs(boxCenterY - pageCenterY) <= CENTER_SNAP_THRESHOLD) {
      nextRect.y = pageCenterY - (nextRect.height / 2)
      horizontal = true
    }

    nextRect = clampRectToPage(nextRect)
    return {
      rect: nextRect,
      guides: { horizontal, vertical },
    }
  }

  const selectBox = (id: string) => {
    setSelectedId(id)
    setBoxes((prev) => bringToFront(id, prev))
  }

  const addBox = (kind: 'title' | 'body' | 'image', options?: { align?: TextBox['data']['align'] }) => {
    setBoxes((prev) => {
      const z = maxZ(prev) + 1
      const nextBox = kind === 'title'
        ? createTitleBox(z, options?.align ?? 'left')
        : kind === 'body'
          ? createBodyBox(z, options?.align ?? 'left')
          : createImageBox(z)
      const next = normalizeBoxes([...prev, nextBox], nextBox.id)
      setSelectedId(nextBox.id)
      return next
    })
  }

  const updateSelectedText = (patch: Partial<TextBox['data']>) => {
    if (!selectedId) return
    setBoxes((prev) => {
      const drafted = prev.map((box) => (
        box.id === selectedId && box.kind !== 'image'
          ? { ...box, data: { ...box.data, ...patch } }
          : box
      ))
      return fitTextBoxWithinLayout(drafted, selectedId)
    })
  }

  const updateSelectedImage = (patch: Partial<ImageBox['data']>) => {
    if (!selectedId) return
    setBoxes((prev) =>
      normalizeBoxes(
        prev.map((box) =>
          box.id === selectedId && box.kind === 'image'
            ? { ...box, data: { ...box.data, ...patch } }
            : box,
        ),
        selectedId,
      ),
    )
  }

  const convertSelectedKind = (kind: 'title' | 'body') => {
    if (!selectedId) return
    setBoxes((prev) => {
      const drafted = prev.map((box) => {
        if (box.id !== selectedId || box.kind === 'image') return box
        return {
          ...box,
          kind,
          minHeight: kind === 'title' ? 90 : 140,
          data: {
            ...box.data,
            fontSize: kind === 'title' ? Math.max(38, box.data.fontSize) : Math.min(24, box.data.fontSize),
            fontWeight: kind === 'title' ? 700 : 400,
            lineHeight: kind === 'title' ? Math.max(44, box.data.lineHeight) : Math.min(36, box.data.lineHeight),
            align: box.data.align,
          },
        }
      })
      return fitTextBoxWithinLayout(drafted, selectedId)
    })
  }

  const deleteSelected = () => {
    if (!selectedId) return
    setBoxes((prev) => prev.filter((box) => box.id !== selectedId))
    setSelectedId(null)
    setEditingTextId(null)
    setCropMode(false)
  }

  const clearSelection = () => {
    setSelectedId(null)
    setEditingTextId(null)
    setCropMode(false)
    setSnapGuides(EMPTY_SNAP_GUIDES)
  }

  const openUploadPicker = (boxId: string) => {
    setSelectedId(boxId)
    setEditingTextId(null)
    setUploadTargetId(boxId)
    hiddenUploadInputRef.current?.click()
  }

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    const targetId = uploadTargetId ?? selectedId
    if (!file || !targetId) return
    const dataUrl = onImageUploadTransform
      ? await onImageUploadTransform(file)
      : await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(String(reader.result))
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
    setSelectedId(targetId)
    setBoxes((prev) =>
      normalizeBoxes(
        prev.map((box) =>
          box.id === targetId && box.kind === 'image'
            ? { ...box, data: { ...box.data, src: dataUrl } }
            : box,
        ),
        targetId,
      ),
    )
    setUploadTargetId(null)
    event.target.value = ''
  }

  const handleTextBoxTap = (box: TextBox) => {
    const now = Date.now()
    const previousTap = lastTextTapRef.current
    if (previousTap && previousTap.id === box.id && now - previousTap.time < 320) {
      setSelectedId(box.id)
      setEditingTextId(box.id)
      lastTextTapRef.current = null
      return
    }
    lastTextTapRef.current = { id: box.id, time: now }
  }

  const beginBoxInteraction = (box: EditorBox, event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    if (box.kind !== 'image' && editingTextId === box.id) return
    setEditingTextId(null)
    event.currentTarget.setPointerCapture?.(event.pointerId)
    activePointerTargetRef.current = event.currentTarget
    activePointerIdRef.current = event.pointerId
    selectBox(box.id)
    const point = toPagePoint(event.clientX, event.clientY)
    const target = event.target as HTMLElement | null
    const shouldCropImage = box.kind === 'image'
      && (
        embedded
          ? Boolean(box.data.src) && !target?.closest('.editor-box__label')
          : cropMode
      )
    if (shouldCropImage && box.kind === 'image') {
      setDragMode({
        type: 'crop',
        startX: point.x,
        startY: point.y,
        originCropX: box.data.cropX,
        originCropY: box.data.cropY,
      })
      return
    }

    setDragMode({
      type: 'move',
      startX: point.x,
      startY: point.y,
      origin: rectOf(box),
    })
  }

  const beginResize = (box: EditorBox, handle: ResizeHandle, event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture?.(event.pointerId)
    activePointerTargetRef.current = event.currentTarget
    activePointerIdRef.current = event.pointerId
    selectBox(box.id)
    const point = toPagePoint(event.clientX, event.clientY)
    setDragMode({
      type: 'resize',
      handle,
      startX: point.x,
      startY: point.y,
      origin: rectOf(box),
    })
  }

  useEffect(() => {
    if (dragMode.type === 'idle' || !selectedId) return

    const applyDrag = (clientX: number, clientY: number) => {
      const point = toPagePoint(clientX, clientY)
      const dx = point.x - dragMode.startX
      const dy = point.y - dragMode.startY
      let nextGuides = EMPTY_SNAP_GUIDES

      setBoxes((prev) => {
        const next = prev.map(cloneEditorBox)
        const index = next.findIndex((box) => box.id === selectedId)
        if (index === -1) return prev
        const current = next[index]!

        if (dragMode.type === 'move') {
          const moved = translateRect(dragMode.origin, dx, dy)
          const snapped = snapRectToPageCenter(moved)
          current.x = snapped.rect.x
          current.y = snapped.rect.y
          nextGuides = snapped.guides
        } else if (dragMode.type === 'resize') {
          const resized = applyResize(dragMode.origin, dragMode.handle, dx, dy, current.minWidth, current.minHeight)
          current.x = resized.x
          current.y = resized.y
          current.width = resized.width
          current.height = resized.height
        } else if (dragMode.type === 'crop' && current.kind === 'image') {
          current.data.cropX = dragMode.originCropX + dx / current.data.zoom
          current.data.cropY = dragMode.originCropY + dy / current.data.zoom
        }

        return next
      })
      setSnapGuides(nextGuides)
    }

    const onPointerMove = (event: PointerEvent) => {
      dragPointerRef.current = { clientX: event.clientX, clientY: event.clientY }
      if (dragFrameRef.current !== null) return
      dragFrameRef.current = window.requestAnimationFrame(() => {
        dragFrameRef.current = null
        if (!dragPointerRef.current) return
        applyDrag(dragPointerRef.current.clientX, dragPointerRef.current.clientY)
      })
    }

    const releasePointerCapture = () => {
      const target = activePointerTargetRef.current
      const pointerId = activePointerIdRef.current
      if (target && pointerId !== null) {
        target.releasePointerCapture?.(pointerId)
      }
      activePointerTargetRef.current = null
      activePointerIdRef.current = null
    }

    const onPointerUp = () => {
      if (dragFrameRef.current !== null) {
        window.cancelAnimationFrame(dragFrameRef.current)
        dragFrameRef.current = null
      }
      if (dragPointerRef.current) {
        applyDrag(dragPointerRef.current.clientX, dragPointerRef.current.clientY)
        dragPointerRef.current = null
      }
      setDragMode({ type: 'idle' })
      setSnapGuides(EMPTY_SNAP_GUIDES)
      setBoxes((prev) => normalizeBoxes(prev, selectedId))
      releasePointerCapture()
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
    return () => {
      if (dragFrameRef.current !== null) {
        window.cancelAnimationFrame(dragFrameRef.current)
        dragFrameRef.current = null
      }
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
      releasePointerCapture()
    }
  }, [dragMode, selectedId])

  useEffect(() => {
    if (selected?.kind !== 'image') setCropMode(false)
  }, [selected?.kind])

  useEffect(() => {
    if (!selected || selected.kind === 'image' || selected.id !== editingTextId) return
    inlineEditorRef.current?.focus()
    const length = inlineEditorRef.current?.value.length ?? 0
    inlineEditorRef.current?.setSelectionRange(length, length)
  }, [editingTextId, selected])

  useEffect(() => {
    if (!selected || selected.kind === 'image') {
      setEditingTextId(null)
    }
  }, [selected])

  useEffect(() => {
    onBoxesChange?.(boxes)
  }, [boxes, onBoxesChange])

  useEffect(() => {
    if (!externalCommand) return
    if (handledExternalCommandIdRef.current === externalCommand.id) return
    handledExternalCommandIdRef.current = externalCommand.id

    if (externalCommand.type === 'add') {
      addBox(externalCommand.kind, { align: externalCommand.align })
      return
    }

    if (externalCommand.type === 'delete-selected') {
      deleteSelected()
    }
  }, [externalCommand])

  useEffect(() => {
    if (!embedded) {
      setEmbeddedScale(1)
      return
    }

    const container = canvasAreaRef.current
    if (!container) return

      const updateScale = () => {
        const styles = window.getComputedStyle(container)
        const paddingX = Number.parseFloat(styles.paddingLeft || '0') + Number.parseFloat(styles.paddingRight || '0')
        const paddingY = Number.parseFloat(styles.paddingTop || '0') + Number.parseFloat(styles.paddingBottom || '0')
        const availableWidth = Math.max(1, container.clientWidth - paddingX)
        const availableHeight = Math.max(1, container.clientHeight - paddingY)
        const widthFitScale = availableWidth / PAGE_WIDTH
        const heightFitScale = availableHeight / PAGE_HEIGHT
        const nextScale = Math.min(1, widthFitScale, heightFitScale)
        setEmbeddedScale(nextScale)
      }

    updateScale()
    const observer = new ResizeObserver(() => updateScale())
    observer.observe(container)
    window.addEventListener('resize', updateScale)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateScale)
    }
  }, [embedded, embeddedTrayInset])

  useEffect(() => {
    if (!embedded || !selected || selected.kind === 'image') {
      setEmbeddedTrayInset(0)
    }
  }, [embedded, selected])

  const renderedBoxes = useMemo(() => sortByZ(boxes), [boxes])

  return (
    <div className={`app-shell ${embedded ? 'app-shell--embedded' : ''}`}>
      {embedded ? null : (
        <div className="chrome-bar">
          <div>
            <div className="chrome-bar__eyebrow">A4 / movable boxes / auto reflow</div>
            <h1 className="chrome-bar__title">Magazine Post Composer</h1>
          </div>
          <Toolbar
            onAddTitle={(align) => addBox('title', { align })}
            onAddBody={(align) => addBox('body', { align })}
            onAddImage={() => addBox('image')}
            onDelete={deleteSelected}
            canDelete={Boolean(selectedId)}
          />
        </div>
      )}

      <div className="workspace">
        <input
          ref={hiddenUploadInputRef}
          type="file"
          accept="image/*"
          onChange={handleUpload}
          style={{ display: 'none' }}
        />
        {embedded
          ? null
          : (
            <Inspector
              selected={selected}
              cropMode={cropMode}
              onUpdateText={updateSelectedText}
              onUpdateImage={updateSelectedImage}
              onConvertKind={convertSelectedKind}
              onSetCropMode={setCropMode}
              onUpload={handleUpload}
            />
          )}

        <div
          ref={canvasAreaRef}
          className={`canvas-area ${embedded ? 'canvas-area--embedded' : ''}`}
          style={embedded
            ? {
                paddingBottom: `${Math.round(embeddedTrayInset)}px`,
                scrollPaddingBottom: `${Math.round(embeddedTrayInset)}px`,
              }
            : undefined}
          onPointerDown={(event) => {
            const target = event.target as HTMLElement | null
            if (target?.closest('[data-editor-box-id]')) return
            clearSelection()
          }}
        >
          <div
            className={`page-stage-shell ${embedded ? 'page-stage-shell--embedded' : ''}`}
            style={embedded ? { width: `${PAGE_WIDTH * embeddedScale}px`, height: `${PAGE_HEIGHT * embeddedScale}px` } : undefined}
          >
            <div
              className={`page-stage ${embedded ? 'page-stage--fit' : ''}`}
              style={embedded
                ? {
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    transform: `scale(${embeddedScale})`,
                    transformOrigin: 'top left',
                  }
                : undefined}
            >
            <div className="page-shadow" />
            <div
              ref={pageRef}
              className="page"
              onPointerDown={() => clearSelection()}
            >
              <div className={`page__guides ${snapGuides.vertical ? 'is-vertical-active' : ''} ${snapGuides.horizontal ? 'is-horizontal-active' : ''}`}>
                <div className="page__guide page__guide--vertical" />
                <div className="page__guide page__guide--horizontal" />
              </div>
              {renderedBoxes.map((box) => {
                const isSelected = box.id === selectedId
                const baseStyle = {
                  left: `${box.x}px`,
                  top: `${box.y}px`,
                  width: `${box.width}px`,
                  height: `${box.height}px`,
                  zIndex: box.zIndex,
                }

                if (box.kind === 'image') {
                  return (
                    <div
                      key={box.id}
                      data-editor-box-id={box.id}
                      className={`editor-box editor-box--image ${isSelected ? 'is-selected' : ''} ${cropMode && isSelected ? 'is-cropping' : ''}`}
                      style={baseStyle}
                      onPointerDown={(event) => beginBoxInteraction(box, event)}
                    >
                      <div className="editor-box__label">IMAGE</div>
                      <div className="image-frame">
                        {box.data.src ? (
                          <img
                            src={box.data.src}
                            alt="uploaded"
                            draggable={false}
                            style={{
                              transform: `translate(calc(-50% + ${box.data.cropX}px), calc(-50% + ${box.data.cropY}px)) scale(${box.data.zoom})`,
                            }}
                          />
                        ) : (
                          <div className="image-placeholder">
                            <button
                              type="button"
                              className="image-placeholder__button"
                              onClick={(event) => {
                                event.preventDefault()
                                event.stopPropagation()
                                openUploadPicker(box.id)
                              }}
                            >
                              <span>Upload image</span>
                              <small>Then drag / resize / crop</small>
                            </button>
                          </div>
                        )}
                      </div>
                      {isSelected && handlePositions().map((handle) => (
                        <button
                          type="button"
                          key={handle}
                          className={`resize-handle resize-handle--${handle}`}
                          onPointerDown={(event) => beginResize(box, handle, event)}
                          aria-label={`Resize ${handle}`}
                        />
                      ))}
                    </div>
                  )
                }

                const flow = flowTextLines(box, localObstacles(box, boxes))
                const isEditingText = editingTextId === box.id
                return (
                  <div
                    key={box.id}
                    data-editor-box-id={box.id}
                    className={`editor-box editor-box--text editor-box--${box.kind} ${isSelected ? 'is-selected' : ''}`}
                    style={baseStyle}
                    onPointerDown={(event) => beginBoxInteraction(box, event)}
                    onClick={() => handleTextBoxTap(box)}
                  >
                    <div className="editor-box__label">{box.kind === 'title' ? 'TITLE' : 'BODY'}</div>
                    {isEditingText ? (
                      <textarea
                        ref={inlineEditorRef}
                        className="compose-pretext-inline-editor"
                        value={box.data.text}
                        onChange={(event) => updateSelectedText({ text: event.target.value })}
                        onBlur={() => setEditingTextId(null)}
                        onKeyDown={(event) => {
                          if (event.key === 'Escape') {
                            event.preventDefault()
                            setEditingTextId(null)
                          }
                        }}
                        onPointerDown={(event) => event.stopPropagation()}
                        style={{
                          padding: `${box.data.padding}px`,
                          color: box.data.color,
                          fontFamily: box.data.fontFamily,
                          fontSize: `${box.data.fontSize}px`,
                          fontWeight: box.data.fontWeight,
                          lineHeight: `${box.data.lineHeight}px`,
                          letterSpacing: `${box.data.letterSpacing}px`,
                          textAlign: box.data.align,
                        }}
                      />
                    ) : (
                      <div className="text-flow-surface">
                        {flow.lines.map((line, index) => (
                          <div
                            key={`${box.id}-${index}`}
                            className="flow-line"
                            style={{
                              left: `${line.x}px`,
                              top: `${line.y}px`,
                              width: `${Math.max(line.width, 1)}px`,
                              color: box.data.color,
                              fontFamily: box.data.fontFamily,
                              fontSize: `${box.data.fontSize}px`,
                              fontWeight: box.data.fontWeight,
                              lineHeight: `${box.data.lineHeight}px`,
                              letterSpacing: `${box.data.letterSpacing}px`,
                              textAlign: box.data.align,
                            }}
                          >
                            {line.text}
                          </div>
                        ))}
                      </div>
                    )}
                    {isSelected && handlePositions().map((handle) => (
                      <button
                        type="button"
                        key={handle}
                        className={`resize-handle resize-handle--${handle}`}
                        onPointerDown={(event) => beginResize(box, handle, event)}
                        aria-label={`Resize ${handle}`}
                      />
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
          </div>
        </div>
      </div>
      {embedded && selected && selected.kind !== 'image' ? (
        <EmbeddedTextTray
          selected={selected}
          onUpdateText={updateSelectedText}
          onConvertKind={convertSelectedKind}
          onVisibleInsetChange={setEmbeddedTrayInset}
        />
      ) : null}
    </div>
  )
}
