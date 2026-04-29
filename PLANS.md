Goal
- Add a new fixed post template that matches the attached reference layout: one large image box and four text boxes.
- Add a second fixed post template that matches the newer attached reference layout: one large image box and six text boxes.

Current Constraints
- Reuse the existing fixed-template architecture.
- Keep current routing, editor flow, and persistence format intact.
- Preserve only spatial relationships from the reference image, not the gray/pink colors.

Target Files
- docs/js/templates/index.js
- docs/js/templates/page9.js
- docs/js/templates/page10.js
- docs/css/compose.css

Implementation Steps
- Add a new template definition to the compose template registry.
- Implement the export/render layout for the new template with one image slot and four text fields.
- Implement the second export/render layout for the new template with one image slot and six text fields.
- Add compose-sheet CSS positions and thumbnail preview styling for the new template.

Validation Steps
- Build the app.
- Verify the template appears in the picker and matches the reference composition.

Open Questions
- None for MVP; use existing text fields `headline`, `subhead`, `body`, `date` and hide unused text fields.
## Opening Burn Variant

- Goal: Replace the opening screen with a new burn variant using the supplied background and logo assets.
- Constraints:
  - Keep existing route flow and opening sequence timing.
  - Use `docs/image/background/okinawa.png` for the background.
  - Use `docs/image/logo/b439a9c7-433e-4123-91c2-7d9eb952c1b4.png` for the logo.
  - Match the composition of `docs/references/images/opening_burn.png`.
  - Keep the central ripple effect and add a whole-screen shake/fade transition into the main page.
- Target files:
  - `docs/js/pages/opening.js`
  - `docs/css/opening.css`
  - `docs/js/app.js`
- Steps:
  - Add opening DOM layers for background, logo, subtitle, and effect canvas.
  - Rework opening sequence logic to animate the image-based logo and subtitle using the existing timing phases.
  - Add ripple, screen wobble, and fade-out transition.
  - Build and verify generated assets.

## Compose Flow Polish

- Goal: Restyle the `Post` flow so template selection, editing, and tag selection feel like one restrained full-screen editorial experience closer to the supplied mobile reference.
- Constraints:
  - Keep current routing, stage flow, and persistence intact.
  - Reuse existing compose renderer and CSS structure.
  - Do not redesign unrelated screens.
- Target files:
  - `docs/js/pages/compose.js`
  - `docs/css/compose.css`
  - `docs/css/layout.css`
- Steps:
  - Flatten the compose shell so the stages use the full mobile canvas instead of nested panel cards.
  - Rework the template selection stage into a larger preview + bottom selection rail.
  - Refine the edit stage to keep the page dominant and controls secondary.
  - Simplify the tags stage into a cleaner scrollable list with fixed submit action.
  - Build and verify on mobile-sized layout.

## Compose Template / Custom Selector

- Goal: Bring the `Post` flow closer to the newly attached mobile reference with a segmented `Template / Custom` selector on the selection screen and a hidden text-style tray on the edit screen.
- Constraints:
  - Keep existing `select -> edit -> tags` stage flow and persistence mapping intact.
  - Reuse current fixed-template renderer and page8 custom editor instead of replacing them.
  - Hide the segmented selector on the edit screen.
- Target files:
  - `docs/js/pages/compose.js`
  - `docs/js/app.js`
  - `docs/css/compose.css`
- Steps:
  - Add a segmented selector to the selection screen and map `Custom` to the existing `page8` template.
  - Change the selection CTA to `Edit`.
  - Fix the edit-stage layout so the page fits within the available viewport.
  - Add a bottom text-style tray for fixed templates that appears when a text box is focused.
  - Keep the existing page8 controls available only for the custom template path.
  - Build and verify on a mobile-sized viewport.

## Local Font Hosting

- Goal: Remove runtime dependence on Google Fonts so all editor fonts work on restricted or unstable networks.
- Constraints:
  - Keep the existing font family choices and current CSS stack names where possible.
  - Avoid adding a font-loading dependency.
  - Preserve existing routing and editor behavior.
- Target files:
  - `public/fonts/*`
  - `src/local-fonts.css`
  - `src/main.jsx`
  - `src/pretext-main.jsx`
  - `index.html`
  - `pretext-editor.html`
  - `src/pretextLayoutAdapter.js`
  - `docs/references/pretext-magazine-editor/src/App.tsx`
  - `docs/references/pretext-magazine-editor/src/components/Inspector.tsx`
- Steps:
  - Download local copies of the currently offered fonts from their official repositories.
  - Add `@font-face` declarations and remove the external Google Fonts links.
  - Replace remaining OS-dependent serif defaults in the embedded editor with bundled Japanese-safe fonts.
  - Build and verify that the app no longer depends on remote font CDNs.

## Template Rough Recreation

- Goal: Rebuild the fixed template set from the provided A4 rough images while applying a shared outer 6% safety area.
- Constraints:
  - Keep the existing fixed-template architecture, compose flow, routing, and persistence format.
  - Treat the supplied roughs as layout geometry references for image boxes and text boxes.
  - Use the roughs as an edit-only background overlay for placement verification; final output stays plain unless explicitly changed.
- Target files:
  - `docs/references/template_roughs/*.png`
  - `docs/js/templates/page1.js`
  - `docs/js/templates/page2.js`
  - `docs/js/templates/page3.js`
  - `docs/js/templates/page4.js`
  - `docs/js/templates/page5.js`
  - `docs/js/templates/page6.js`
  - `docs/js/templates/page7.js`
  - `docs/js/templates/page9.js`
  - `docs/js/templates/page10.js`
  - `docs/js/pages/compose.js`
  - `docs/js/app.js`
  - `docs/css/compose.css`
- Steps:
  - Inspect the 9 rough images and map each to an existing fixed template id.
  - Add a shared 6% safe-area rule for fixed templates and verify all editable slots stay within it.
  - Rebuild each fixed template's preview/export geometry to match the rough image box and text box positions as closely as possible.
  - Add an edit-only rough-background overlay so placement can be checked directly against the provided A4 reference.
  - Build and validate that the template picker, editor preview, and rendered export remain aligned.

## Fixed Template Box Interactivity

- Goal: Make every visible fixed-template box consistently interactive so users can fill all shown image and text areas.
- Constraints:
  - Keep the current fixed-template persistence shape (`headline/subhead/intro/body/date/editor` and `primary/secondary/accent/detail`) intact.
  - Avoid rewriting the compose flow or replacing the fixed-template layout system.
  - Prefer layout-driven visibility and interaction fixes over template-by-template special cases.
- Target files:
  - `docs/js/app.js`
  - `docs/js/pages/compose.js`
  - `docs/css/compose.css`
- Steps:
  - Audit how fixed-template text boxes and image slots are shown and hidden during layout application.
  - Ensure only the active template boxes accept pointer input and give visible boxes explicit stacking order.
  - Verify that text boxes are not blocked by neighboring image surfaces when templates are applied.
  - Build and check the compose flow after the interaction changes.

## Search Screen Editorial Restyle

- Goal: Restyle the search screen so it matches the supplied mobile reference more closely in spacing, typography, chip sizing, and card composition.
- Constraints:
  - Keep current search interactions, filtering behavior, routing, and bottom navigation intact.
  - Reuse the existing search page/render path instead of creating a parallel screen.
  - Keep the work scoped to search-specific markup, icons, and CSS.
- Target files:
  - `docs/js/pages/search.js`
  - `docs/css/search.css`
  - `docs/js/components/icons.js`
- Steps:
  - Refine the search page copy and section structure to match the reference layout.
  - Restyle the search shell, chips, sort control, and result cards to the quieter editorial look from the mock.
  - Add any small missing icon needed for the search UI and verify the updated layout on a mobile-sized viewport.

## Compose ImageData / ComposeData Separation

- Goal: Make final post display always use the completed PNG in `imageData`, while `composeData` is used only for re-editing.
- Constraints:
  - Do not change timeline/profile/post-detail scroll or horizontal font tray behavior.
  - Do not add SVG download or a second display renderer.
  - Keep the current compose editor and fixed-template persistence shape.
- Target files:
  - `docs/js/app.js`
  - `docs/js/core/store.js`
  - display readers under `docs/js/pages/`
- Steps:
  - Confirm display surfaces render only `<img src="${post.imageData}">`.
  - Add a dirty flag for the prepared compose PNG.
  - Generate the completed PNG before leaving edit for tags, while the editor DOM still exists.
  - Reuse the same preparation path for download, draft save, post create, and post update.
  - Remove tag-submit/profile-draft publish fallbacks that regenerate from `composeData`.
  - Preserve `composeData` only as the editable source of truth.
- Validation:
  - Run JS syntax check and production build.
  - Verify no display path calls compose rendering from `composeData`.

## Couple Service MVP

- Goal: Change the app from a social posting surface into a private couple service with meaningful behavior, not only visual mock screens.
- Constraints:
  - Keep the existing compose/page editor route and persistence shape intact.
  - Use the existing `uiState.screen` routing and local `store.js` persistence.
  - Do not add dependencies.
- Target files:
  - `docs/js/core/store.js`
  - `docs/js/pages/timeline.js`
  - `docs/js/pages/search.js`
  - `docs/js/app.js`
  - `docs/js/components/bottomNav.js`
  - `docs/css/timeline.css`
- Steps:
  - Add serializable couple state for question answers, suggested plans, and calendar entries.
  - Render a question flow that collects one user's mood/date preferences and simulates partner completion for MVP.
  - Generate deterministic date recommendations from both answers.
  - Let users add a recommended plan to the calendar.
  - Reflect selected plans and composed pages on the home calendar.
  - Preserve `compose` as the editing entry point.
- Validation:
  - Build the app.
  - Confirm Go Live uses the built `docs` output.
