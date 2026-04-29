import type { ChangeEvent } from 'react'
import type { EditorBox, ImageBox, TextBox } from '../types'

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
      { label: 'Cormorant Garamond', value: '"Cormorant Garamond", "Noto Serif JP", serif' },
      { label: 'Noto Serif JP', value: '"Noto Serif JP", serif' },
      { label: 'Sawarabi Mincho', value: '"Sawarabi Mincho", serif' },
      { label: 'Hina Mincho', value: '"Hina Mincho", serif' },
      { label: 'Shippori Mincho', value: '"Shippori Mincho", serif' },
      { label: 'Zen Old Mincho', value: '"Zen Old Mincho", serif' },
    ],
  },
]

type InspectorProps = {
  selected: EditorBox | null
  cropMode: boolean
  embedded?: boolean
  onUpdateText: (patch: Partial<TextBox['data']>) => void
  onUpdateImage: (patch: Partial<ImageBox['data']>) => void
  onConvertKind: (kind: 'title' | 'body') => void
  onSetCropMode: (enabled: boolean) => void
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void
}

export function Inspector({
  selected,
  cropMode,
  embedded = false,
  onUpdateText,
  onUpdateImage,
  onConvertKind,
  onSetCropMode,
  onUpload,
}: InspectorProps) {
  if (embedded && !selected) {
    return null
  }

  const hasKnownFont = selected && selected.kind !== 'image'
    ? FONT_GROUPS.some((group) => group.options.some((option) => option.value === selected.data.fontFamily))
    : false

  return (
    <aside className={`inspector${embedded ? ' inspector--embedded' : ''}`}>
      <div className="inspector__eyebrow">Pretext-inspired editorial controls</div>
      <h2 className="inspector__title">Inspector</h2>
      {!selected ? (
        <p className="inspector__empty">
          Select a box to adjust image or text settings.
        </p>
      ) : selected.kind === 'image' ? (
        <div className="inspector__section">
          <div className="inspector__label">Image box</div>
          <label className="inspector__stack">
            <span>Upload image</span>
            <input type="file" accept="image/*" onChange={onUpload} />
          </label>
          {!embedded ? (
            <div className="inspector__stack">
              <span>Interaction</span>
              <div className="segmented-control">
                <button
                  type="button"
                  className={!cropMode ? 'is-active' : ''}
                  onClick={() => onSetCropMode(false)}
                >
                  Frame
                </button>
                <button
                  type="button"
                  className={cropMode ? 'is-active' : ''}
                  onClick={() => onSetCropMode(true)}
                >
                  Crop
                </button>
              </div>
            </div>
          ) : null}
          <label className="inspector__stack">
            <span>Zoom</span>
            <input
              type="range"
              min="1"
              max="3"
              step="0.01"
              value={selected.data.zoom}
              onChange={(event) => onUpdateImage({ zoom: Number(event.target.value) })}
            />
          </label>
          <p className="inspector__hint">
            {embedded
              ? 'Drag the image directly to adjust crop. Drag the IMAGE label to move the box.'
              : (cropMode
                  ? 'Crop mode is on. Drag inside the image to adjust the crop.'
                  : 'Switch to Crop to drag the image itself instead of the frame.')}
          </p>
        </div>
      ) : (
        <div className="inspector__section">
          <div className="inspector__label">Text box</div>
          <div className="segmented-control">
            <button
              type="button"
              className={selected.kind === 'title' ? 'is-active' : ''}
              onClick={() => onConvertKind('title')}
            >
              Title
            </button>
            <button
              type="button"
              className={selected.kind === 'body' ? 'is-active' : ''}
              onClick={() => onConvertKind('body')}
            >
              Body
            </button>
          </div>
          <label className="inspector__stack">
            <span>Text</span>
            <select
              value={selected.data.fontFamily}
              onChange={(event) => onUpdateText({ fontFamily: event.target.value })}
            >
              {!hasKnownFont ? (
                <option value={selected.data.fontFamily}>Current font</option>
              ) : null}
              {FONT_GROUPS.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label className="inspector__stack">
            <span>Content</span>
            <textarea
              rows={embedded ? 5 : 10}
              value={selected.data.text}
              onChange={(event) => onUpdateText({ text: event.target.value })}
            />
          </label>
          <div className="inspector__grid">
            <label className="inspector__stack">
              <span>Font size</span>
              <input
                type="number"
                value={selected.data.fontSize}
                min={14}
                max={96}
                onChange={(event) => onUpdateText({ fontSize: Number(event.target.value) })}
              />
            </label>
            <label className="inspector__stack">
              <span>Line height</span>
              <input
                type="number"
                value={selected.data.lineHeight}
                min={16}
                max={100}
                onChange={(event) => onUpdateText({ lineHeight: Number(event.target.value) })}
              />
            </label>
          </div>
          <div className="inspector__grid">
            <label className="inspector__stack">
              <span>Align</span>
              <select
                value={selected.data.align}
                onChange={(event) => onUpdateText({ align: event.target.value as TextBox['data']['align'] })}
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </label>
            <label className="inspector__stack">
              <span>Padding</span>
              <input
                type="number"
                value={selected.data.padding}
                min={8}
                max={48}
                onChange={(event) => onUpdateText({ padding: Number(event.target.value) })}
              />
            </label>
          </div>
          <p className="inspector__hint">
            Text settings stay close to the editorial reference while remaining editable on the page.
          </p>
        </div>
      )}
    </aside>
  )
}
