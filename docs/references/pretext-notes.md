# Pretext Reference Notes

Source repo:
- https://github.com/chenglou/pretext

Files reviewed:
- https://raw.githubusercontent.com/chenglou/pretext/main/README.md
- https://raw.githubusercontent.com/chenglou/pretext/main/pages/demos/dynamic-layout.ts
- https://raw.githubusercontent.com/chenglou/pretext/main/pages/demos/editorial-engine.ts

What was adapted into this project:
- Grid-snapped box movement and resizing for custom layout editing.
- Obstacle-aware text relocation logic for custom text boxes when image boxes move.
- Preference for simple geometry-based layout decisions instead of DOM reflow-heavy behavior.

What was not copied directly:
- The React/Canvas demo structure.
- Pretext-specific rendering pipeline and editor architecture.
- Any dependency or build setup, because this project is a static-site style codebase without that toolchain.

Current local target:
- `page8` acts as the freeform editorial canvas.
- New custom layouts start with one image box and one text box to reduce visual noise.
