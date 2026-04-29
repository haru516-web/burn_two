# AGENTS.md

## Project context
This repository contains the existing application codebase.

The goal is to integrate and improve a magazine-style post editor inside the existing project without breaking current routing, authentication, state management, persistence, or overall design consistency.

The editor direction is:
- fixed A4 page size
- addable image boxes
- addable title boxes
- addable body text boxes
- free dragging inside the page
- resizable boxes
- image cropping
- automatic collision avoidance
- automatic adjustment so boxes do not overlap or overflow the page
- page size itself must remain fixed

## Core behavior rules
- Read the existing architecture before making edits.
- Prefer minimal, reversible changes.
- Integrate into the current stack instead of rewriting large sections.
- Preserve existing design patterns, naming, file organization, and state flow.
- Do not replace existing systems wholesale unless explicitly instructed.
- If multiple integration points are possible, choose the one that best matches the current architecture and explain why.
- Keep changes reviewable and easy to revert.
- When adding new code, favor reuse of existing utilities, hooks, components, and styling patterns.
- Do not introduce new dependencies unless they are clearly necessary.
- If a new dependency is necessary, explain why the current stack is insufficient.

## Design references
Before editing UI, UX, layout, typography, motion, or editor behavior, read `docs/design.md`.
Follow its product philosophy, editorial principles, and interaction tone.
If a tradeoff is needed, prefer choices that preserve composition, restraint, readability, and page integrity.

## Scope protection
Unless explicitly instructed otherwise, do not break or redesign:
- authentication flow
- routing structure
- API contract
- persistence format already used in production
- global state architecture
- existing design system primitives
- unrelated screens or features

## Feature integration rules
For the magazine-style editor:
- Treat the current project as the source of truth.
- Treat any external prototype or reference implementation as reference material, not as code to copy blindly.
- Adapt reference logic into the project’s existing architecture.
- Prioritize a one-page MVP first.
- Keep extension points clear for future multi-page support.
- Preserve a clean separation between editor state, layout logic, rendering, and persistence.
- Prefer deterministic layout behavior over visually clever but fragile behavior.
- When implementing auto-adjustment and collision avoidance, avoid hidden side effects where possible.
- Make layout decisions traceable and debuggable.

## UI and UX expectations
- The editing canvas is fixed to A4 aspect ratio.
- Users can add image boxes, title boxes, and body text boxes onto a blank page.
- Users can drag boxes freely within the page.
- Users can resize boxes.
- Image boxes can be cropped and repositioned internally.
- Text and image boxes should avoid overlapping when possible.
- Auto-adjustment should run during box move and resize interactions.
- The page itself must not be resizable.
- The implementation should visually fit the existing product rather than look like an isolated demo.
- Keep the editing interaction responsive and understandable.
- Favor direct manipulation patterns over deeply nested controls when possible.

## Architecture expectations
Prefer separating the feature into:
- page or editor shell
- canvas rendering
- box model and shared types
- drag and resize interaction logic
- layout and collision avoidance logic
- text measurement and text layout logic
- persistence mapping
- toolbar or insertion controls

If the existing project already has a different feature organization, follow that structure instead.

## State management rules
- Follow the existing state management approach already used in the repo.
- Avoid introducing a second competing state pattern.
- Keep transient interaction state separate from persisted content state where possible.
- Keep saved data structures stable, explicit, and serializable.
- If saved shapes or types change, explain migration implications.

## Styling rules
- Follow the project’s existing styling system.
- Reuse existing tokens, components, spacing scales, and typography rules.
- Do not introduce a parallel design system.
- Avoid hardcoded one-off values when an existing token or pattern already exists.
- Keep the editor visually aligned with the rest of the application.

## Editing workflow
Before major edits:
1. Inspect the current project structure.
2. Identify the correct integration points.
3. Read the relevant files before changing anything.
4. Form a short implementation plan.
5. Then edit in small, reviewable steps.

When working on a large change:
- Summarize the current understanding first.
- State which files are likely to change.
- State the minimal viable implementation path.
- Then implement.

## Validation requirements
Before finishing, run the relevant checks if they exist:
- lint
- typecheck
- tests
- build
- relevant local preview or dev run

If a check exists and is not run, explain why.
If a check fails, report the failure clearly instead of hiding it.
Do not claim completion without describing what was actually validated.

## Final response requirements
Always include:
- files changed
- what changed
- why those changes were made
- how the feature fits into the existing architecture
- how to run or verify it
- any limitations or follow-up work
- any checks that were run and their result

## Safety and change discipline
- Do not make speculative refactors unrelated to the requested task.
- Do not silently rename large areas of code without need.
- Do not delete existing behavior unless replacement is implemented and justified.
- Avoid broad formatting-only edits in unrelated files.
- Keep diffs focused on the requested outcome.

## Dependency discipline
- Prefer existing project dependencies first.
- If adding a new package, explain:
  - what problem it solves
  - why existing dependencies are not enough
  - what files it affects
  - whether it changes bundle size or maintenance cost

## Persistence guidance
If implementing saved editor data, prefer explicit structures for:
- page metadata
- boxes
- text content
- image source
- crop state
- transform state
- z-order
- layout hints

Do not hide essential editor state in DOM-only assumptions.

## Performance guidance
- Avoid unnecessary re-layout of the full page on every minor interaction if a smaller recalculation is possible.
- Prefer predictable update boundaries.
- Keep interaction smooth during drag, resize, and crop operations.
- Be careful with excessive rerenders and expensive measurements.

## Debuggability guidance
- Keep layout logic understandable.
- Prefer named helper functions over large opaque blocks.
- Leave concise comments where layout behavior would otherwise be difficult to reason about.
- Make collision and auto-adjustment behavior inspectable.

## Planning files
If the requested task is large, multi-step, or likely to span many files, create or update a short plan document before deep implementation work.

Suggested file:
- `PLANS.md`

Suggested contents:
- goal
- current constraints
- target files
- implementation steps
- validation steps
- open questions

## Windows PowerShell helpers

These helpers are for Windows environments when reading or writing files from the terminal.

**Rule:** In each command, define → use. Do not escape $. Use generic 'path/to/file.ext'.

### 1) READ (UTF-8 no BOM, line-numbered)

```bash
bash -lc 'powershell -NoLogo -Command "
$OutputEncoding = [Console]::OutputEncoding = [Text.UTF8Encoding]::new($false);
Set-Location -LiteralPath (Convert-Path .);
function Get-Lines { param([string]$Path,[int]$Skip=0,[int]$First=40)
  $enc=[Text.UTF8Encoding]::new($false)
  $text=[IO.File]::ReadAllText($Path,$enc)
  if($text.Length -gt 0 -and $text[0] -eq [char]0xFEFF){ $text=$text.Substring(1) }
  $ls=$text -split \"`r?`n\"
  for($i=$Skip; $i -lt [Math]::Min($Skip+$First,$ls.Length); $i++){ \"{0:D4}: {1}\" -f ($i+1), $ls[$i] }
}
Get-Lines -Path \"path/to/file.ext\" -First 120 -Skip 0
"'
bash -lc 'powershell -NoLogo -Command "
$OutputEncoding = [Console]::OutputEncoding = [Text.UTF8Encoding]::new($false);
Set-Location -LiteralPath (Convert-Path .);
function Write-Utf8NoBom { param([string]$Path,[string]$Content)
  $dir = Split-Path -Parent $Path
  if (-not (Test-Path $dir)) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
  }
  $tmp = [IO.Path]::GetTempFileName()
  try {
    $enc = [Text.UTF8Encoding]::new($false)
    [IO.File]::WriteAllText($tmp,$Content,$enc)
    Move-Item $tmp $Path -Force
  }
  finally {
    if (Test-Path $tmp) {
      Remove-Item $tmp -Force -ErrorAction SilentlyContinue
    }
  }
}
$file = "path/to/your_file.ext"
$enc  = [Text.UTF8Encoding]::new($false)
$old  = (Test-Path $file) ? ([IO.File]::ReadAllText($file,$enc)) : ''
Write-Utf8NoBom -Path $file -Content ($old+"`nYOUR_TEXT_HERE`n")
"'
bash -lc 'powershell -NoLogo -Command "
$OutputEncoding = [Console]::OutputEncoding = [Text.UTF8Encoding]::new($false);
Set-Location -LiteralPath (Convert-Path .);
function Write-Utf8NoBom { param([string]$Path,[string]$Content)
  $dir = Split-Path -Parent $Path
  if (-not (Test-Path $dir)) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
  }
  $tmp = [IO.Path]::GetTempFileName()
  try {
    $enc = [Text.UTF8Encoding]::new($false)
    [IO.File]::WriteAllText($tmp,$Content,$enc)
    Move-Item $tmp $Path -Force
  }
  finally {
    if (Test-Path $tmp) {
      Remove-Item $tmp -Force -ErrorAction SilentlyContinue
    }
  }
}
$content = @"
YOUR_FULL_FILE_CONTENT_HERE
"@
Write-Utf8NoBom -Path "path/to/file.ext" -Content $content
"'
bash -lc 'powershell -NoLogo -Command "
$OutputEncoding = [Console]::OutputEncoding = [Text.UTF8Encoding]::new($false);
Set-Location -LiteralPath (Convert-Path .);
Get-ChildItem -LiteralPath . -Recurse | Select-Object FullName
"'
bash -lc 'powershell -NoLogo -Command "
$OutputEncoding = [Console]::OutputEncoding = [Text.UTF8Encoding]::new($false);
Set-Location -LiteralPath (Convert-Path .);
$pattern = 'search_text'
Get-ChildItem -Recurse -File | Select-String -Pattern $pattern | ForEach-Object {
  '{0}:{1}: {2}' -f $_.Path, $_.LineNumber, $_.Line.Trim()
}
"'
