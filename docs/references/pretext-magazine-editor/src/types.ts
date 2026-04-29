export type BoxKind = 'image' | 'title' | 'body'

export type Rect = {
  x: number
  y: number
  width: number
  height: number
}

export type TextBoxData = {
  text: string
  fontFamily: string
  fontSize: number
  fontWeight: number
  lineHeight: number
  letterSpacing: number
  padding: number
  color: string
  align: 'left' | 'center' | 'right'
}

export type ImageBoxData = {
  src: string | null
  cropX: number
  cropY: number
  zoom: number
}

export type BaseBox = Rect & {
  id: string
  kind: BoxKind
  minWidth: number
  minHeight: number
  zIndex: number
}

export type TextBox = BaseBox & {
  kind: 'title' | 'body'
  data: TextBoxData
}

export type ImageBox = BaseBox & {
  kind: 'image'
  data: ImageBoxData
}

export type EditorBox = TextBox | ImageBox

export type ResizeHandle =
  | 'n'
  | 'e'
  | 's'
  | 'w'
  | 'ne'
  | 'nw'
  | 'se'
  | 'sw'

export type DragMode =
  | { type: 'idle' }
  | { type: 'move'; startX: number; startY: number; origin: Rect }
  | { type: 'resize'; handle: ResizeHandle; startX: number; startY: number; origin: Rect }
  | { type: 'crop'; startX: number; startY: number; originCropX: number; originCropY: number }

export type FlowLine = {
  text: string
  x: number
  y: number
  width: number
}
