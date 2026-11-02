---
name: design-regression-check
description: "Use after a UI/UX design or redesign has been applied, or when the user asks to verify, QA, or regression-check design changes. Acts as an IT/QA engineer: inventories everything the design touched, then checks that functions, forms, flows, navigation, permissions, data, states, and layouts still work, and reports a verdict with evidence. Do NOT trigger for building new features, fixing unrelated bugs, general code review, or when no design change has been made."
---

# Design Regression Check

Verify that a design change did not break anything. Think like an IT/QA
engineer: assume something broke until evidence shows otherwise.

## Activation rules

- **Trigger when:** a design/redesign just finished (typically via
  `page-ux-design`), or the user asks to check, test, QA, or verify design changes.
- **Do not trigger** for new feature work, unrelated bug fixes, or reviews of
  code that no design change touched.
- **Scope = everything the design touched, plus what depends on it.** Do not
  audit the whole app. Anything broken outside that scope is reported as a
  side finding, not investigated further.
- **Read-only by default.** Report problems; fix them only if the user asks.
  When asked to fix, fix only regressions caused by the design, and keep each
  fix minimal.
- If the user's instructions conflict with a rule below, follow the user.

## Core rules

- **Evidence over assumption.** Never write "works" without running or tracing
  something. Each result is **PASS** (verified, with how), **FAIL** (with
  reproduction), or **NOT VERIFIED** (with the reason, e.g. no browser, no test
  data, needs credentials). Never turn NOT VERIFIED into PASS.
- **Compare against the baseline.** Use the pre-design state (git history or
  diff, or the user's description) to decide what "correct" means. Behavior
  that changed without being requested is a regression.
- **Report honestly.** Do not hide failures, skip checks quietly, or reword a
  failure as a "note."

## Workflow

### 1. Build the touched inventory
- Get the change set (`git diff` or `git status` against the pre-design
  commit). List every changed file: pages, components, styles, layouts, copy,
  assets, config.
- Classify each as **page**, **shared component**, **style/theme token**,
  **layout/navigation**, or **other**.

### 2. Map the blast radius
- For each shared component, hook, token, or layout that changed, find every
  consumer (search imports and usages) and add those pages to the check list.
- For each page, list its **route**, **data sources** (API calls, queries,
  props), **actions** (buttons, forms, mutations), and **roles** that can reach it.
- Output a short checklist table: item, type, why it is in scope.

### 3. Static and automated checks
Run what the project supports and record the exact commands and results:
- Install integrity (no unintended dependency or lockfile changes).
- Lint, formatter, and type-check.
- Unit/component/integration/e2e tests relevant to the touched files; run the
  full suite if it is fast.
- Production build, with no new warnings or errors; check bundle or asset
  errors and missing imports.
- Search for leftovers: `console.log`, `TODO`, commented-out code, dead
  imports, hard-coded colors that break dark mode, placeholder text.
- If a check fails, determine whether the design caused it by comparing with
  the baseline. Pre-existing failures are reported as such.

### 4. Functional checks (every touched page)
For each page, exercise every interactive element:
- **Buttons, links, menus, tabs, toggles:** each does what it did before; no
  dead controls, no wrong targets.
- **Forms:** every field renders and accepts input; labels map to the correct
  fields; validation (required, format, limits) behaves as before; submit
  sends the same payload shape; success and failure paths both work; values
  survive a failed submit; double submit is prevented.
- **Tables/lists:** search, filter, sort, pagination, selection, bulk actions,
  row actions and row clicks target the correct record; counts match data.
- **Dialogs/drawers:** open, close (button, Esc, backdrop), confirm, cancel,
  focus return; destructive actions still require the intended confirmation and
  affect the right item.
- **Uploads/downloads/exports/media:** still work end to end.
- **Dynamic UI:** conditional fields, expand/collapse, toasts, and live
  updates still trigger correctly.

### 5. Flow and alignment checks
- **Navigation flow:** walk the main user journeys end to end for each role
  (e.g. list, detail, edit, save, back to list). Check redirects after
  actions, back/forward behavior, deep links, refresh on a nested route, and
  breadcrumbs or active-nav indicators.
- **Flow misalignment:** primary action in the wrong step, steps out of order,
  a button that no longer matches its label, copy that describes old behavior,
  inconsistent terminology between linked pages, and orphaned or unreachable pages.
- **Routes:** no route renamed, removed, or broken; links point where they should.
- **Cross-page consistency:** the same action looks and behaves the same everywhere.

### 6. Data and contract integrity
- API calls: same endpoints, methods, params, and payload shapes as baseline
  (compare diff of fetch/mutation code and network calls).
- Displayed values are correct: formatting of dates, currency, numbers,
  statuses; truncation does not hide meaning; no field silently dropped or
  mislabeled.
- No data fetched twice, no new request waterfalls, no stale cache after
  mutations.

### 7. Roles and permissions
- For each role that can access the touched pages (e.g. admin, seller,
  student): visible controls and reachable routes match baseline.
- No hidden action became visible to the wrong role; no allowed action became
  unreachable.
- Unauthenticated and unauthorized access still redirect or deny as before.

### 8. State coverage
For each touched view, check loading, empty, error, partial, success, disabled,
permission-denied, and slow-network states. Check realistic data volumes: 0,
1, and many items, plus very long text and large numbers.

### 9. Layout, visual, and responsive checks
- Check about 360px, 768px, and 1280px+ widths: overlap, clipping, overflow,
  horizontal page scroll, misaligned columns or grids, broken spacing, sticky
  elements covering content, z-index/modal stacking, touch targets of at least
  44px.
- Check light and dark themes: contrast, invisible text, wrong tokens, unstyled
  elements.
- Check images, icons, fonts, and fallbacks; layout shift during loading.
- If a real browser is available, capture screenshots as evidence. If not,
  mark visual checks NOT VERIFIED and review the CSS and markup statically.

### 10. Accessibility and runtime health
- Keyboard-only pass: logical tab order, visible focus, no traps, Esc closes
  overlays, Enter submits forms.
- Labels, accessible names, heading order, table semantics, `aria-live` for
  async messages, reduced-motion respected.
- Browser console: no new errors or warnings (React key warnings,
  hydration mismatch, failed requests, 404 assets, CSP issues).
- Network panel: no new failed or slow requests; interactions respond in about
  400ms or show feedback.

## Severity levels

| Level | Meaning | Examples |
|---|---|---|
| **Blocker** | Feature unusable, data risk, or security/permission issue | Submit button does nothing, wrong record deleted, role sees admin action, build fails |
| **Major** | Works but broken in a common path | Layout overlaps at mobile width, validation lost, wrong redirect after save |
| **Minor** | Cosmetic or edge-case issue | Misaligned icon, inconsistent spacing, long text clipped in a rare case |
| **Note** | Observation, pre-existing issue, or suggestion | Failing test that predates the design |

## Verdict

- **PASS:** no blockers or majors; all in-scope checks verified or explicitly
  listed as NOT VERIFIED with reasons.
- **PASS WITH NOTES:** no blockers; minors or notes remain.
- **FAIL:** any blocker or major, or a failed build/test caused by the design.

Never give PASS if core flows (submit, save, delete, navigate) were NOT VERIFIED.
State that as a gap instead.

## Anti-patterns

- Declaring success from reading code alone when the behavior could be run.
- Checking only the files that changed and skipping their consumers.
- Treating "build passes" as "nothing broke."
- Ignoring pre-existing failures without labeling them as such.
- Fixing problems silently or expanding scope to unrelated pages.
- Testing only the happy path, only one role, or only desktop light mode.
- Vague findings ("looks off") with no page, steps, or expected result.

## Report template

1. **Verdict:** PASS / PASS WITH NOTES / FAIL, with a one-line reason.
2. **Scope checked:** touched files, shared components, and consumer pages.
3. **Automated results:** command, result, and whether failures pre-existed.
4. **Findings:** one entry each, sorted by severity:
   - Severity, page/route, role
   - Steps to reproduce
   - Expected vs actual
   - Likely cause (file/component) and suggested fix
   - Caused by design? (yes / no / pre-existing)
5. **Verified OK:** key flows and checks that passed, and how they were verified.
6. **Not verified:** what could not be checked and why (missing browser, data,
   credentials, environment).
7. **Recommended next steps:** fixes for the design skill or user to apply.

## Handoff

If the verdict is FAIL or PASS WITH NOTES, list the fixes as a short ordered
list. After fixes are applied, re-run only the affected checks plus the build
and tests, and update the report.