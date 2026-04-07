# Modernization Roadmap

Baseline captured on April 1, 2026.

## Current baseline

Commands run locally:

- `npm run check`
- `npx eslint .`
- `npm run lint`
- `npm run build`

Observed results:

- `npm run build` passes.
- `npm run check` fails in `src/routes/api/health/+server.ts` because `process` is used without Node typings being available to TypeScript.
- `npm run lint` fails immediately on formatting drift across 20 files.
- `npx eslint .` fails on 21 errors, mainly `any` usage, unused code, missing keyed `each` blocks, legacy `@ts-ignore`, unsafe `{@html}`, and Svelte reactive-statement rule violations.

## Repository hotspots

### `src/routes/+page.svelte`

- 661 lines with mixed concerns: polling, time math, checkpoint derivation, local storage persistence, modal state, display state, and top-level layout.
- The file currently acts as controller, store, persistence layer, and page view at the same time.
- This should be the first major split point in the refactor.

### `src/lib/OperatorSidebar.svelte`

- 564 lines with repeated inline types and a large prop/event surface.
- Uses `any` for checkpoint props and contains unkeyed `each` blocks.
- Should be narrowed to a presentational/editor role after state extraction.

### `src/lib/ExamClock.svelte`

- 357 lines with DOM measurement, resize handling, font scaling, color logic, and event dispatching in one component.
- Contains `any`, unused values, generic `Function`, and reactive-literal lint failures.
- Candidate for decomposition into display plus sizing utility.

### `src/lib/AnnouncementsBanner.svelte`

- Uses `markdown-it` plus `{@html}`.
- Even with HTML disabled in MarkdownIt, the current lint baseline treats this as an XSS boundary and it should be explicitly sanitized or replaced.

### Server routes

- `src/routes/api/time/+server.ts` mixes transport, env access, NTP integration, logging, and response shaping.
- `src/routes/api/health/+server.ts` is small but already fails type-checking due to runtime typing assumptions.
- Shared response types should move into `$lib/types` or `$lib/server`.

### Tooling and deployment

- `package-lock.json` and `yarn.lock` are both committed.
- `package.json` includes both `@sveltejs/adapter-node` and `@sveltejs/adapter-netlify`.
- `svelte.config.js` is configured for `adapter-node`, while `README.md` and `netlify.toml` still present Netlify as an active target.
- Deployment/documentation expectations need to be reconciled before changing runtime behavior.

## Refactor standards

These standards should govern the modernization sweep:

1. Keep runtime behavior stable while improving structure. Change behavior only when a bug or security issue is being fixed explicitly.
2. Prefer shared domain types over repeated inline object literals.
3. Separate browser-only concerns from SSR-safe logic.
4. Move time calculation, checkpoint derivation, and persistence into plain TypeScript modules before changing UI structure further.
5. Treat lint and type-check as non-optional gates.
6. Remove dead configuration and commit to one package manager and one deployment target per environment story.
7. Add tests before or alongside risky extractions, especially for time math and checkpoint ordering.

## Proposed phases

### Phase 0: Baseline cleanup

- Decide on the package manager and remove the extra lockfile.
- Add missing Node typing support and get `npm run check` green.
- Run Prettier once repo-wide so future diffs are signal-heavy.
- Fix current ESLint errors without broad behavior changes.
- Add a CI job that runs `npm run validate`.

Exit criteria:

- `npm run lint`
- `npm run check`
- `npm run build`

all pass on a clean checkout.

### Phase 1: Extract domain models

- Create shared types for checkpoints, health responses, time responses, persisted settings, and NTP state.
- Move repeated checkpoint and NTP interfaces out of component scripts.
- Replace `any` and ad hoc event payloads with typed contracts.

Exit criteria:

- No `any` in application code except for intentional library boundary shims.

### Phase 2: Pull logic out of `+page.svelte`

- Extract local storage access into a browser-safe persistence module.
- Extract checkpoint calculations and exam progress calculations into pure utilities with tests.
- Extract server polling and recovery interval logic into a dedicated store or controller module.
- Reduce `+page.svelte` to page composition and wiring.

Exit criteria:

- `src/routes/+page.svelte` is primarily layout/composition, not business logic.

### Phase 3: Component hardening

- Split `OperatorSidebar.svelte` into smaller sections or section components.
- Move clock sizing and color helpers out of `ExamClock.svelte`.
- Add keyed `each` blocks and improve modal keyboard/focus handling.
- Review high-contrast mode for global-style leakage.

Exit criteria:

- Large components have clear single responsibilities and smaller prop surfaces.

### Phase 4: Server and security cleanup

- Replace `@ts-ignore` on `ntp-client` with typed module usage that satisfies lint.
- Centralize server logging and reduce verbose production `console.log` noise.
- Decide whether announcement Markdown should be sanitized, rendered to a constrained AST, or downgraded to plain text.
- Add response caching/no-store behavior intentionally rather than implicitly.

Exit criteria:

- Server routes are typed, quiet by default, and explicit about unsafe boundaries.

### Phase 5: Testing and automation

- Add unit tests for time math, checkpoint ordering, cross-midnight exams, and persistence parsing.
- Add endpoint tests for `/api/time` and `/api/health`.
- Add a basic component smoke test layer for key display states.

Exit criteria:

- Time logic no longer depends on manual browser verification alone.

### Phase 6: Deployment and documentation reconciliation

- Pick the supported deployment targets and remove stale ones from docs and dependencies.
- Align `README.md`, `Dockerfile`, `netlify.toml`, and Kubernetes manifests with the actual runtime story.
- Document environment variables and production expectations once.

Exit criteria:

- The documented deployment paths match the code and package configuration.

## First implementation batch

The first modernization PR should stay narrow:

1. Make the repository green without changing features.
2. Introduce shared types plus a persistence module.
3. Add tests for checkpoint/time calculations.
4. Only then start component extraction.

That sequence reduces review risk and avoids mixing formatting, architecture, and behavior changes into one unreviewable diff.
