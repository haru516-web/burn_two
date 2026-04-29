
---

## 2. `docs/design.md` にそのまま貼る完成版

```md
# Design Principles

## Purpose
This document defines the design philosophy, product tone, and interaction principles for the app.

This app is not just a social network and not just a photo archive.
It is an editorial space for selecting, arranging, and preserving shared memories with meaning.

When making design decisions, prefer choices that support clarity, editorial quality, emotional restraint, and lasting visual coherence.

---

## Core Product Idea

### Memory is not storage. Memory is editing.
The value of this product is not in storing more.
The value is in choosing what to keep, how to place it, and how to shape it into a meaningful page.

A memory becomes stronger when it is selected, arranged, and given form.

### Design is not decoration. Design is compressed thought.
Visual choices must carry meaning.
Layout, spacing, typography, motion, and image treatment should reflect intention, not just style.

Avoid empty styling.
Prefer forms that feel inevitable.

### Beauty comes from selection, not volume.
More content does not create more value.
A strong page is made by restraint, hierarchy, and breathing space.

Prefer fewer, better-placed elements over crowded expression.

### A page should feel composed, not assembled.
The final result should feel like a single editorial page, not a loose collection of draggable objects.

Even when the editing process is flexible, the output should feel deliberate.

---

## Product Personality

The product should feel:

- quiet
- thoughtful
- refined
- editorial
- emotionally warm, but not loud
- poetic, but still usable
- intelligent, but not cold
- minimal, but not empty

The product should not feel:

- noisy
- overly cheerful
- aggressively trendy
- cheap
- cluttered
- overexplained
- mechanically corporate

This product does not shout.
It gently guides.

Its ideal voice is:
“Place this more beautifully.”
not
“Boost engagement now.”

---

## Experience Principles

### 1. Selection before expression
The product should encourage choosing, not dumping.

### 2. Composition before decoration
The system should help users compose a page, not just place items randomly.

### 3. Freedom with quiet structure
Users should feel free to move, resize, crop, and arrange.
But the page should still resist chaos.

### 4. Assistance without domination
Automatic adjustment is allowed when it improves readability, spacing, and page integrity.
It should feel like subtle support, not loss of control.

### 5. One page should feel complete
Each page should feel like a finished editorial unit with visual balance and internal relationships.

---

## Editorial Principles

### White space is meaningful
White space is not empty area to fill.
It gives rhythm, dignity, and room for memory to breathe.

### Hierarchy must be visible
Users should immediately feel what is primary, secondary, and supporting.

### Text and image should cooperate
Text should not merely describe the image.
It should deepen, frame, or counterbalance it.

### Layout should feel intentional
Positions should feel chosen.
The page should suggest editorial judgment, not arbitrary placement.

### Restraint is a feature
Avoid excess.
Avoid ornamental clutter.
Avoid “doing more” when “doing less” gives the page more force.

---

## Magazine Quality

In this product, “magazine-like” does not mean decorative templates.
It means:

- clear visual hierarchy
- editorial spacing
- deliberate rhythm
- balanced tension between text and image
- readable but expressive typography
- one-page coherence
- meaningful placement

Magazine quality is structural, not cosmetic.

---

## Editor Behavior Principles

### Fixed page size is a design decision
The page stays fixed.
Constraint creates composition.

The goal is not infinite freedom.
The goal is meaningful arrangement within a defined frame.

### Objects may move freely, but should not ignore each other
Image boxes, title boxes, and body text boxes may be added and moved freely.
But they should not behave as isolated objects.
They should respond to the page and to neighboring elements.

### Auto-adjustment should preserve page integrity
When boxes approach overlap or overflow, the system may adjust layout.
The best auto-adjustment feels natural and quiet.

It should preserve:
- readability
- balance
- hierarchy
- usable control

### Flexible transformation is acceptable
Boxes may resize and adapt when needed.
This is allowed when it protects composition and avoids collision.

---

## Text Principles

Text is part of the composition, not just content.

### Title
A title should:
- create gravity
- feel concise
- work even when short
- support the page without overpowering it

### Body text
Body text should:
- remain readable
- avoid unnecessary density
- support the image rather than compete with it
- preserve breathing room

Prefer density with purpose over long filler text.

---

## Image Principles

Images shape the atmosphere of the page.

Cropping is not just a tool.
Cropping is a decision about attention.

Images should:
- have a clear role on the page
- feel intentionally framed
- work in relationship with text
- avoid meaningless accumulation

A smaller number of well-placed images is better than many weak ones.

---

## Interaction Tone

Interaction should feel:
- direct
- calm
- graceful
- controlled
- responsive

Avoid interaction that feels:
- gimmicky
- noisy
- game-like in the wrong way
- visually restless
- harder than necessary

The user should feel like they are editing a page, not fighting a layout engine.

---

## What to Avoid

Avoid:
- crowded layouts
- loud effects
- excessive gradients, shadows, or ornament
- social-media-template aesthetics
- fake luxury cues
- random placement that weakens the page
- automatic behavior that surprises or breaks trust
- UI that is more expressive than the memory itself

---

## Decision Priority

When making tradeoffs, prioritize in this order:

1. Preserve the sense of editorial composition
2. Preserve page readability and hierarchy
3. Preserve product tone and dignity
4. Preserve user control
5. Preserve visual restraint
6. Preserve implementation simplicity where possible

---

## One-sentence Definition
This product is a quiet editorial vessel for selecting, arranging, and preserving memory with meaning.

---

## Working Motto
- Not storage, but editing
- Not volume, but selection
- Not decoration, but intention
- Not noise, but presence
- Not endless content, but one meaningful page