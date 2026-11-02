---
name: page-ux-design
description: "Use only when the user asks to design, redesign, improve, polish, or audit page or component UI/UX, including responsive layout for phones, tablets/iPads, laptops, and desktop/computer screens. Applies to any page the user names. Applies Fitts's, Hick's, Jakob's Law and the Doherty Threshold with an accessibility baseline. Do NOT trigger for backend, API, database, auth, bug-fix, refactor, testing, or deployment work, or for UI edits that are incidental to another task."
---

# Page UX Design

Improve the clarity, speed, and accessibility of the pages the user scoped,
**without changing data, permissions, or API behavior** unless explicitly asked.

## Activation rules

- **Trigger only when the task is design:** the user asks to design, redesign,
  restyle, improve UX, or audit the look, layout, or usability of a page,
  screen, or component.
- **Do not trigger** when the request is functional or technical (bug fix, new
  endpoint, logic change, data migration, performance tuning, tests, deploys),
  even if it touches a UI file. If a feature needs a small UI addition, match the
  existing style and leave this workflow out of it.
- **Scope = what the user named.** Work only on those pages/components and the
  shared pieces they depend on. If the user names no page ("improve the UX"),
  ask which page(s) before editing.
- Anything noticed outside the scope goes in the report as a suggestion. Do not
  implement it.
- If the user's instructions conflict with a rule below, follow the user.

## Guardrails

- UI/UX changes only: layout, hierarchy, components, copy, states, styling.
- Preserve role permissions, auth guards, API contracts, routes, data semantics,
  and existing product terminology.
- Reuse the project's existing components, theme tokens, and conventions. Do not
  introduce a new design system or dependency without clear justification.
- If a shared component must change, check every page that uses it and keep the
  change backward compatible.

## Principles

### Fitts's Law: make targets easy to hit
- Primary buttons and icon-only actions: **44x44px minimum on touch** (never
  below 24x24px with spacing, per WCAG 2.2 AA).
- Put the primary action where it is expected and keep it consistent across
  pages (page header, or end of a form).
- Separate destructive actions from frequent ones by distance and styling.
- Make a whole row or card clickable when it opens a detail view, keeping inner
  controls independently clickable.
- Use sticky action bars for long forms and bulk-selection toolbars.

### Hick's Law: reduce decision load
- One primary action per view; secondary actions visually quieter; rare actions
  in an overflow menu or "Advanced" section.
- Group navigation by task; aim for about 7 or fewer top-level items.
- Use sensible defaults, remembered filters, and contextual actions.
- Split long forms into labeled sections or steps; show only fields relevant to
  the current choice.
- Remove duplicate entry points to the same action unless one is a clear shortcut.

### Jakob's Law: match familiar conventions
- Page structure: title, short supporting text, primary action, search/filters,
  then content.
- Tables: search above, filters beside it, sortable headers where useful,
  pagination or "load more" below, row actions at the right edge.
- Forms: labels above inputs, required indicators, inline validation on blur,
  Enter to submit, predictable Cancel/Save placement.
- Status uses consistent words **plus** color **plus** icon (never color alone).
- Links look like links, buttons like buttons; breadcrumbs for nested pages.

### Doherty Threshold: respond fast and truthfully
- Acknowledge every action within **~400ms**: pressed state, disabled while
  submitting, spinner or inline progress.
- Skeletons for page and table loads; spinners for short button actions;
  determinate progress for uploads and long jobs.
- Optimistic updates only when failure is cheap to reverse; roll back visibly.
- Never show success before server confirmation for money, stock, permissions,
  deletion, or publishing.
- Prevent double submission; keep user input after errors.

## Workflow

1. **Confirm scope.** List the page(s) you will touch. Ask if unclear.
2. **Trace first.** Read the route, layout, data loading, actions, validation,
   permissions, and loading/error/empty paths. Note what must not change.
3. **Audit** against the checklist and list the 3 to 7 highest-impact problems.
   Fix those before polish.
4. **Reuse** existing components and tokens; extend rather than fork.
5. **Establish hierarchy:** one title, concise supporting text, a prominent
   primary action, scannable summary, grouped content.
6. **Design every state** alongside the default (matrix below).
7. **Make it accessible and responsive.**
8. **Verify:** lint, type-check, relevant tests, and build; check the responsive
   viewport matrix, light and dark themes, keyboard-only use, and realistic data
   (0, 1, and many items; long text).
9. **Report** using the template.

## State matrix

| State | Requirement |
|---|---|
| Loading | Skeleton or progress matching final layout; no layout jump |
| Empty | Explain why and offer the next action |
| Error | Plain-language message, recovery action, keep entered data |
| Partial/Stale | Show available data and flag what failed |
| Success | Specific, non-blocking confirmation |
| Disabled | Visibly disabled, with a reason when not obvious |
| Permission denied | Clear message and a way back; do not expose hidden actions |
| Slow/Offline | Surface delays honestly; never fake completion |

## Patterns by page type

- **Dashboard:** 3 to 6 key metrics first (label, value, context), then items
  needing attention or recent activity.
- **Table/list:** search, filters, sort, result count, "Reset filters"; sticky
  header on long tables; bulk actions on selection; truncate with tooltip; cards
  or contained horizontal scroll on mobile.
- **Form:** grouped fields, helper text, inline errors linked via
  `aria-describedby`, error summary for long forms, unsaved-changes warning.
- **Detail page:** header with title, status, and primary action; secondary
  info in sections or tabs; related actions grouped.
- **Auth/landing/onboarding:** one goal per screen, minimal fields, clear
  progress and recovery paths.
- **Destructive actions:** prefer undo when reversible; otherwise confirm with a
  named item and consequence, safe option as default focus, and a specific danger
  label ("Delete item", not "OK").
- **Dialogs/drawers:** short focused tasks only; trap focus, close on Esc, return
  focus to the trigger; use a full page for complex flows.
- **Navigation:** clear current-page indicator; sidebar on desktop, drawer on
  mobile; show only links the role can use.

## Accessibility baseline

- Full keyboard operation with a visible focus indicator (3:1 contrast).
- Text contrast 4.5:1 (3:1 for large text and UI components) in both themes.
- Accessible names on all controls; `aria-label` on icon-only buttons.
- Semantic elements and ordered headings; tables with `th` scope and a name.
- Announce async results via `aria-live`.
- Respect `prefers-reduced-motion`; keep animations short and non-essential.
- Never rely on hover, color, or position alone.

## Responsive and theming

- Design mobile-first and use the project's breakpoints; do not assume a device
  from its name or hard-code layouts for one model.
- Check at least these **CSS viewport widths** (use browser responsive mode, not
  only a physical device):

  | Viewport | Example coverage |
  |---|---|
  | 320-390px | Small and typical phones, portrait |
  | 600-800px | Large phone / iPad or tablet, portrait |
  | 900-1100px | Tablet landscape / compact laptop |
  | 1280-1440px | Laptop and typical desktop |
  | 1920px or wider | Large desktop; ensure content does not become awkwardly wide |

- Also check a narrow phone in landscape and a tablet in landscape when the
  page uses orientation-sensitive navigation, dialogs, charts, or dense forms.
- At every width, confirm the whole page has no unintended horizontal scrolling;
  constrain wide tables, cards, and charts to their own scroll region where
  appropriate.
- Reflow navigation, toolbars, grids, and forms instead of merely shrinking
  desktop layouts. Keep controls visible, readable, and reachable without
  clipping or overlap; preserve logical reading and keyboard order.
- Ensure touch targets remain at least 44x44px, text inputs remain usable, and
  dialogs/drawers fit within the viewport and can scroll internally.
- Do not make functionality available only on hover; provide equivalent
  touch/keyboard interaction. Check sticky elements do not cover focused fields
  or content.
- Exercise key loading, empty, error, and populated states at narrow and wide
  widths, including long labels and validation messages.
- Use existing tokens; no hard-coded colors that break dark mode.
- Test long strings, large numbers, and currency formatting.

## Anti-patterns

- Multiple equally prominent primary buttons.
- Icon-only actions without labels in dense toolbars.
- Blank screens on error or spinner-only pages.
- Success shown before the server responds on critical actions.
- Modal-on-modal flows; confirmations for trivial actions.
- Renaming terms, routes, or payloads for cosmetic reasons.
- Removing advanced controls instead of disclosing them progressively.
- Redesigning pages the user did not ask about.

## Acceptance checklist

- [ ] Only the user-scoped pages were changed.
- [ ] One clear title and primary action; next step is obvious.
- [ ] Touch targets are at least 44px; destructive actions are separated.
- [ ] No duplicate or unnecessary choices; rare options disclosed progressively.
- [ ] Navigation, tables, forms, and status labels follow familiar conventions.
- [ ] Feedback within ~400ms; loading, empty, error, success, and disabled
      states exist.
- [ ] Errors are recoverable and keep input; no premature success.
- [ ] Keyboard, focus, labels, contrast, and live announcements work.
- [ ] Verified at phone, tablet portrait/landscape, laptop, and desktop viewport
      widths; no unintended overflow, clipping, or inaccessible responsive controls.
- [ ] Verified in both themes and with realistic data.
- [ ] Permissions, data, routes, and API behavior are unchanged.
- [ ] Lint, type-check, tests, and build pass (or failures are explained).

## Report template

1. **Scope:** pages/components touched.
2. **Changed:** files and what changed.
3. **Why:** top problems fixed, mapped to Fitts/Hick/Jakob/Doherty or accessibility.
4. **Preserved:** permissions, data flow, API contracts, terminology.
5. **Verified:** commands run and viewport/theme/keyboard checks.
6. **Suggestions:** out-of-scope ideas, not implemented.