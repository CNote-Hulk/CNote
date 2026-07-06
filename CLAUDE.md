# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Console Notebook (Cnote Bakery) — a web platform for retro/console gaming enthusiasts: a console encyclopedia, hardware comparison tool, a repair course with progress tracking, a marketplace (with OLX/eBay sync), forums, DMs, friends, and gamification (XP/levels/achievements). Beta stage, live at consolenotebook.com.

## Rules

When you have to look for a file look first in INDEX.md.
If you have questions, you didn`t quite understand my prompt, ask.
Every file you make, you delete, you move, you modify update in INDEX.md
When you finish, always update curent status so we can resume were we remained and commit.
This repo (the site/backend) gets committed automatically after any modification — no need to ask first. The Android app repo (`E:\Console-Notebook`) is the opposite: never commit there without being explicitly asked.
The native Android client for this same website lives in a separate repo at `E:\Console-Notebook` (Kotlin + Jetpack Compose). It hits this backend's REST API directly plus Supabase PostgREST for chat/forum/marketplace — it has its own CLAUDE.md/INDEX.md and in fact points back here for API/backend reference. When a task involves "the app" (as opposed to the website), it means that repo, not anything inside `frontend/`.

## Commands

```bash
npm install          # from repo root — installs root + backend (postinstall runs install:server)
npm start             # runs backend/server.js (serves API + static frontend on :3000)
npm run dev:server     # same server, via backend's "dev" script (no watch/reload configured)
npm run reset-db       # wipes user/session/token data — frontend/js/reset-database.js is a 2-line shim requiring backend/js/reset-database.js (the real logic)
npm run import-consoles # (re-)imports console encyclopedia data from JSON into Postgres
cd backend && npm run precheck   # verifies every require()'d package is declared in package.json
```

There is no bundler, no build step, no linter config, and no test framework in this repo (only third-party test files exist, inside `node_modules`). Don't assume `npm test`/`npm run build`/`npm run lint` exist.

The frontend has no dev server of its own — it's plain static HTML/CSS/JS served directly by the Express backend (`express.static`), so `npm start` is the only thing you need running to work on either side.

## Architecture

### Backend (`backend/`)

Express 4 app in `backend/server.js`, single process, deployed on Railway. Key things that aren't obvious from any single file:

- **DB**: Postgres hosted on Supabase, accessed via raw `pg` (`backend/db.js`), not an ORM. Schema is defined inline as `CREATE TABLE IF NOT EXISTS` plus an ever-growing array of idempotent `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` migration strings, run on every boot. **When changing the schema, add a new migration string to that array — do not edit the `CREATE TABLE` blocks for existing tables**, since those only run once per fresh DB and existing environments rely on the migration array to catch up. Not all schema setup lives in `db.js`, though — `routes/courses.js` runs its own `CREATE TABLE IF NOT EXISTS` (for `lesson_reactions`) on module load, so a table absent from `db.js` may still be self-initialized by the route that owns it.
- **Auth**: dual-strategy in `backend/middleware/auth.js` (`authRequired`) — tries JWT (`Authorization: Bearer`) first, falls back to a hashed session-token cookie (`user_sessions` table) if JWT verification fails. Both paths populate `req.user` with the same shape. Google OAuth (`routes/google-auth.js`, Passport) links into the same `users` table via `google_id`.
- **Routes**: one file per domain under `backend/routes/`, all mounted in `server.js` (`auth.js` is the largest — registration, login, 2FA, profile, avatar upload). Route modules assume `pool` (from `db.js`) and `authRequired` are required directly; there's no central router aggregator beyond `server.js`'s explicit `app.use(...)` list.
- **Avatar uploads**: `POST/DELETE /api/me/avatar` in `routes/auth.js` — multer (memory storage) → magic-byte check (rejects anything that isn't a real JPEG/PNG/WebP/GIF, since `sharp` *rasterizes* SVGs via librsvg rather than rejecting them) → `sharp` resize/re-encode to WebP → uploaded to a Supabase Storage bucket (`avatars`, service-role key in `backend/utils/supabaseStorage.js`) at a fixed `${userId}.webp` key → public URL (cache-busted) written to `users.avatar`. There is no external-URL avatar option — upload is the only path.
- **Gamification**: `backend/utils/gamification.js` is the single source of truth for XP actions, levels, and achievement definitions — the file's own header warns not to duplicate these values elsewhere. `awardXP(...)` is called from routes after an action completes; Socket.io pushes `achievement_unlocked` events in real time.
- **Marketplace integrations**: `backend/providers/MarketplaceProvider.js` is an abstract base class; `EbayProvider.js`/`OlxProvider.js` implement it. `backend/services/marketplace-sync.js` picks the right provider by name and drives the sync — follow this pattern if a new marketplace provider is added rather than special-casing in routes.
- **Realtime**: Socket.io is initialized in `server.js` and attached via `app.set('io', io)` so route handlers can reach it (`req.app.get('io')`). Clients `emit('register', token)` (JWT or session token) to join a room named after their user id. This channel is specifically for pushing achievement-unlock/notification events (`utils/gamification.js` and various routes emit into a user's room) — it is **not** used for chat or DM transport, which are plain REST/poll endpoints (`routes/chat.js`, `routes/dm.js`). Client-side counterpart: `frontend/js/modules/achievement-socket.js`.
- **Security posture**: `helmet` CSP is enforced (not report-only) with a per-request nonce injected into inline `<script>` tags by a custom middleware in `server.js` that intercepts `.html` requests *before* `express.static` — if you add inline scripts to any HTML page, they need the nonce or they'll be blocked. Rate limiters (`express-rate-limit`) are wired per-route in `server.js` (login, register, 2FA, password reset, avatar) — follow that pattern for new sensitive endpoints. Sentry (`@sentry/node`) is initialized before any other `require()` in `server.js` and must stay first.
- **Console encyclopedia data**: source of truth is JSON files at `frontend/js/data/consoles-{lang}.json` (per-language), imported into Postgres by `backend/js/import-consoles.js`, which Railway runs on every deploy (see `railway.toml`'s `startCommand`). To change console data, edit the JSON files and re-run the import — don't hand-edit the DB rows directly, they'll be overwritten/skipped on next deploy depending on the import logic.

### Frontend (`frontend/`)

No framework, no bundler — plain HTML pages with vanilla JS ES modules.

- `frontend/html/pages/*.html` — one file per page (plus `frontend/html/pages/consoles/*.html`, one static page per console; `frontend/html/pages/help/*.html`; `frontend/html/pages/legal files/*.html` translated into 6 languages).
- `frontend/js/pages/*.js` — page-specific logic, one module per page, imported by that page's HTML.
- `frontend/js/modules/*.js` — shared modules (`auth.js` is the client-side session/API wrapper, `search.js`, `i18n.js`, `profile-dropdown.js`, `navigation.js`, gamification/achievement UI, etc.).
- `frontend/js/config.js` exports `API_BASE_URL`, overridable via `window.CN_API_BASE_URL` for deployments where the frontend is hosted separately from the API (e.g. GitHub Pages).
- **Shared navbar/footer**: every page has empty `#navbar-placeholder`/`#footer-placeholder` elements; `frontend/html/js/components.js` fetches `frontend/html/components/navbar.html` and `footer.html` and injects them client-side, sanitized through DOMPurify (loaded from CDN with a pinned SRI hash) before insertion — this is why the navbar/footer aren't duplicated into every page's HTML, and why editing them means editing those two component files, not each page.
- **i18n**: `frontend/js/modules/i18n.js` + `data-i18n`/`data-i18n-attr` attributes throughout the HTML — translations are applied client-side, not server-rendered.
- Root `index.html` and `frontend/js/redirect.js` are just a redirect shim into `frontend/html/pages/`; don't confuse this with the actual app entry point.
- `GET /user/:username` is handled specially in `server.js` (not a static file) — it serves `user-profile.html` for any username, SPA-route-style, with the same CSP-nonce injection as regular `.html` requests.

### Gotchas

- `.claude/worktrees/` may contain leftover git worktrees (full duplicate `backend/`+`frontend/` checkouts) from prior sessions — they're gitignored, but a repo-wide search that doesn't respect `.gitignore` will surface confusing duplicate hits. Ignore anything under `.claude/` when searching the codebase.

### Data flow for a typical authenticated request

Frontend module (e.g. `frontend/js/modules/auth.js`) attaches `Authorization: Bearer <JWT>` from `localStorage` (`cn_token`) and `credentials: 'include'` for the cookie fallback → hits `/api/...` → `authRequired` middleware resolves `req.user` → route handler queries `pool` directly with parameterized SQL → JSON response is normalized through a per-domain `sanitizeUser`-style function before being sent back (avatar/`avatar_url` fields get scrubbed of Google CDN URLs, etc. — check `routes/auth.js`'s `sanitizeUser` before adding a new user field to make sure it's actually returned to clients).
