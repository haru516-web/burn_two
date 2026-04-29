import { AlignCenter, AlignLeft, AlignRight, ImagePlus, Type, WholeWord, Trash2 } from 'lucide-react'

type ToolbarProps = {
  onAddTitle: (align: 'left' | 'center' | 'right') => void
  onAddBody: (align: 'left' | 'center' | 'right') => void
  onAddImage: () => void
  onDelete: () => void
  canDelete: boolean
  mode?: 'full' | 'delete-only'
}

export function Toolbar({
  onAddTitle,
  onAddBody,
  onAddImage,
  onDelete,
  canDelete,
  mode = 'full',
}: ToolbarProps) {
  if (mode === 'delete-only') {
    return (
      <div className="toolbar toolbar--compact">
        <button type="button" className="toolbar__button toolbar__button--danger" onClick={onDelete} disabled={!canDelete}>
          <Trash2 size={16} />
          Delete
        </button>
      </div>
    )
  }

  return (
    <div className="toolbar">
      <div className="toolbar__group" aria-label="Title alignment options">
        <button type="button" className="toolbar__button toolbar__button--label" aria-hidden="true" tabIndex={-1}>
          <Type size={16} />
          Title
        </button>
        <div className="toolbar__align-inline">
          <button
            type="button"
            className="toolbar__align-option"
            onClick={() => onAddTitle('left')}
            aria-label="Add left aligned title"
          >
            <AlignLeft size={16} />
          </button>
          <button
            type="button"
            className="toolbar__align-option"
            onClick={() => onAddTitle('center')}
            aria-label="Add centered title"
          >
            <AlignCenter size={16} />
          </button>
          <button
            type="button"
            className="toolbar__align-option"
            onClick={() => onAddTitle('right')}
            aria-label="Add right aligned title"
          >
            <AlignRight size={16} />
          </button>
        </div>
      </div>
      <div className="toolbar__group" aria-label="Body alignment options">
        <button type="button" className="toolbar__button toolbar__button--label" aria-hidden="true" tabIndex={-1}>
          <WholeWord size={16} />
          Body
        </button>
        <div className="toolbar__align-inline">
          <button
            type="button"
            className="toolbar__align-option"
            onClick={() => onAddBody('left')}
            aria-label="Add left aligned body"
          >
            <AlignLeft size={16} />
          </button>
          <button
            type="button"
            className="toolbar__align-option"
            onClick={() => onAddBody('center')}
            aria-label="Add centered body"
          >
            <AlignCenter size={16} />
          </button>
          <button
            type="button"
            className="toolbar__align-option"
            onClick={() => onAddBody('right')}
            aria-label="Add right aligned body"
          >
            <AlignRight size={16} />
          </button>
        </div>
      </div>
      <button type="button" className="toolbar__button" onClick={onAddImage}>
        <ImagePlus size={16} />
        Image
      </button>
      <button type="button" className="toolbar__button toolbar__button--danger" onClick={onDelete} disabled={!canDelete}>
        <Trash2 size={16} />
        Delete
      </button>
    </div>
  )
}
