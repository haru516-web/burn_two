# Pretext Magazine Editor

A Vite + React + TypeScript prototype for an A4 magazine-post composer.

## What this prototype focuses on

- Fixed A4 page (`794 x 1123`)
- User can add **image boxes**, **title boxes**, and **body boxes** freely
- Boxes are draggable and resizable inside the page
- Image boxes support in-frame crop positioning via drag + zoom
- Text height is computed with **`@chenglou/pretext`**
- Text rendering uses **manual line flow** so the editor can be extended toward obstacle-aware routing like Cheng Lou's demo pages
- During move/resize, layout normalization runs automatically to reduce overlap and keep elements inside the page

## Why Pretext is used here

This implementation borrows the repo's core idea rather than copying a demo wholesale:

- `prepare()` + `layout()` are used to get text height cheaply without DOM reads
- `prepareWithSegments()` + `layoutNextLineRange()` + `materializeLineRange()` are used to render individual lines in JS
- The editor therefore has a foundation for:
  - editorial wrap around moving objects
  - collision-aware text resizing
  - multi-column continuation
  - page-safe reflow during drag interactions

## Run

```bash
npm install
npm run dev
```

Open the Vite dev server URL in the browser. Do not open `index.html` with VS Code `Live Server`: this app depends on Vite to transform `src/main.tsx` and resolve package imports.

## Main files

- `src/App.tsx` - editor shell, drag / resize / crop interaction
- `src/utils/textFlow.ts` - Pretext-powered line layout and text measurement
- `src/utils/editorLayout.ts` - auto-resize + collision normalization
- `src/components/Toolbar.tsx` - add/delete/crop controls
- `src/components/Inspector.tsx` - selected-box editing UI

## Important note

This is a strong prototype skeleton, not a finished publishing engine.

The current auto-adjustment behavior is deliberately practical:
- first, keep boxes inside the A4 page
- then resize text boxes from measured content
- then reduce overlap by shrinking and pushing boxes away

If you want, the next step should be turning this into a more exact **magazine engine** with:

1. true obstacle-aware text wrap around image geometry,
2. better pairwise packing / constraints,
3. snapping guides,
4. export to PNG / PDF,
5. multiple pages.
