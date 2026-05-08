# Plan: Invite Code And Page Save Scope

## Goal
- Replace invite-link UI with invite-code generation/input inside settings.
- Keep couple_id/shared memory space model.
- Allow completed pages to be saved to exactly one destination: shared couple space or personal space.
- Let album pages switch between shared pages and personal pages, defaulting to shared pages.

## Constraints
- Keep existing Supabase tables and `space_id` model.
- Avoid broad routing/auth changes.
- Keep GitHub Pages build output in `docs` updated.

## Target files
- `docs/js/services/completedPages.js`
- `docs/js/services/inviteLinks.js`
- `docs/js/pages/profile.js`
- `docs/js/pages/search.js`
- `docs/js/app.js`
- `docs/js/core/store.js`
- `docs/css/profile.css` / existing CSS only if needed
- `supabase/schema.sql` only if a small RPC/helper is required

## Implementation steps
1. Add personal/shared page scope resolution in completed page service.
2. Change invite UI to code generation + code input acceptance.
3. Add save destination control for page posting flows.
4. Add album pages scope tabs, default shared.
5. Build, verify generated assets, commit and push.

## Validation
- `npm.cmd run build`
- Verify built `docs/index.html` and `docs/404.html` point to the latest main asset.
- Verify source and built assets include invite code and page scope strings.

## Notes
- Supabase SQL may be needed only for production RPC availability if we add/adjust functions.
