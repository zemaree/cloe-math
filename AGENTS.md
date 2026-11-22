# AGENTS.md — Cloe Math

Compact instructions for agents working in this repo. Trust executable sources (`index.html`, `sw.js`, `manifest.webmanifest`) over `README.md` — the README is stale (see below).

## Overview

- Single-file PWA: an Italian multiplication/division practice app for a tablet, built for one child ("Cloe") plus parent/teacher consult and practice modes.
- No framework, no build system, no package manager. GitHub Pages serves the raw files from the repo root; Firebase/Firestore is the only progress store.
- Everything an agent does here is: edit the inline CSS/JS in `index.html`, keep `sw.js` cache knobs in sync, and push to `main`.

## Files (the whole repo)

- `index.html` — the entire app: `<style>` blocks, app JS, Firebase SDK `<script src>` tags, and the cloud/login IIFE. Also carries `<meta http-equiv="Cache-Control" content="no-store">`.
- `sw.js` — service worker: offline cache bootstrap + network-first fetch for app documents.
- `manifest.webmanifest` — PWA manifest (`lang: it`, no `icons`).
- `README.md` — user-facing setup/deploy notes; partially wrong, see Discrepancies.

## How the page is wired (not obvious from filenames)

- One shared global scope across three script regions in `index.html`. The app script declares `function save(){renderStats();renderCalendar()}`; the later cloud IIFE **rebinds** it: `save = function(){persist();renderStats();renderCalendar()}`. All progress writes go through that override — there is no `localStorage` anywhere in the repo.
- The cloud IIFE reads DOM ids declared earlier in the HTML (`cloudLogin`, `cloudLoginForm`, `cloudProfile`, `cloudPassword`, `cloudLoginButton`, `cloudLoginError`, `cloudToolbar`, `cloudMode`, `cloudRealMode`, `cloudPracticeMode`, `cloudLogout`, `adminOpen`, `adminPanel`, `resetData`, `dashboard`, `summary`, `layout`). Renaming an id means editing **both** the markup and the JS.
- Role/permission gating is hardcoded: `profiles` maps `cloe`/`parent`/`teacher` to a fixed Firebase `uid` + email; login calls `auth.signOut()` if `user.uid` doesn't match the selected role. Cloe only ever sees `mode==="real"`; parent/teacher toggle `real` (consult) vs `practice`; the admin reset panel opens only for `role==="parent" && mode==="real"`.
- Firestore layout: `students/cloe` (real progress) vs `practice/<uid>` (parent/teacher scratch), each `{progress, updatedAt}`. Never write Cloe's real doc from parent/teacher roles.
- Visibility of parent view is CSS-driven via `body.cloud-parent` classes plus `setParentView()` — DOM is hidden, not removed, so app buttons remain in the tree.

## Commands

There is no install/build/test/lint command and no dependency manifest. Do not invent one. The Firebase SDK is loaded from `gstatic` at v10.14.1 (compat API: `firebase-app`/`firebase-auth`/`firebase-firestore`), with no vendored copy.

- Local dev: serve the folder over **localhost or HTTPS**, never `file://` — `file://` silently disables service-worker registration and the Web Speech API (`it-IT` dictation).
  `python -m http.server 8000` (then open `http://localhost:8000/`).
- Deploy: push to `main`; Pages is manual ("Settings → Pages → Deploy from a branch → `main`, folder `/`"). There is no CI workflow to run.
- Ad-hoc verification of the inline scripts: extract each `<script>` region and run `node --check` on it (Node is the only practical syntax check; there is no parser config in the repo).

## Operational gotchas

- **Cache knobs must move together.** `sw.js` top line `const CACHE='cloe-math-vNN'` and the registration URL in `index.html` `navigator.serviceWorker.register('./sw.js?v=NN', ...)` are two separate knobs; the repo's git history is largely these bumps. Change both in the same commit, and update `const FILES=['./','./index.html','./manifest.webmanifest']` whenever a new asset is added — it is a hand-maintained list.
- `activate` deletes any cache whose key starts with `cloe-math-` except the current one, so a version bump is how stale offline HTML is invalidated.
- `Versione 1.5.4` appears 3 times in `index.html` (header `#appVersion`, login card `#loginVersion`, footer). Keep them in sync.
- `index.html` is UTF-8 **without BOM** and full of accented Italian strings. Never rewrite it with PowerShell `>`/`Set-Content` (UTF-16) — use file-writing tools that keep UTF-8. `core.autocrlf=true` locally: the index stores LF, the working tree may show CRLF.
- Firebase config (apiKey/project `cloe-math`) plus per-role `uid`+email are hardcoded in `index.html`; there is no `.env`, no secret file. Don't add a second copy of the project credentials elsewhere, and don't move the file — it is public by design.
- Firestore writes are queued on `saveChain` and failures only `console.error("Cloud sync failed")`. Navigation (mode switch, logout) must `await saveChain` first or the last answer is lost; the reset panel already does. Both mode-switch handlers also early-return on `role==="cloe"||!user`, so Cloe can never leave `mode==="real"` even from the console.
- `normalize()` (cloud IIFE) re-seeds `days[today]={correct:0,total:0,seconds:[]}` on every load **and** on reset, so a "cleared" `students/cloe` doc still carries today's empty bucket; `renderStats()`/`submit()` index `data.days[today]` directly and depend on that guarantee.
- The admin reset clears only `students/cloe` (via `normalize(blank())`: empty `days`/`mistakes`/`answers`/`history`, `points:0`, `programStart` = today). `practice/<uid>` docs are never deleted or cleaned — there is no client-side way to list or purge them. Reset waits only on the current tab's `saveChain`, so a second open tab (e.g. Cloe's) can still write stale progress back after the reset.
- Skips share the answering path: `submit(value,skipped)` stores `answer:null` in `history`/`answers`, records no `seconds`, gives `+0` points, but still does `d.total++` — skips count toward the daily 10. `renderHistory()` prints `non lo so` for `x.answer===null`.
- If the Firebase scripts fail to load (offline), the cloud IIFE's `try/catch` runs `showError(...)` and `save` is **not** overridden: the app still plays but progress is never persisted. Offline PWA usage therefore shows blank progress.

## README discrepancies (trust code, fix README if asked)

1. README says progress is stored "locally in the browser using LocalStorage" — there is no `localStorage`; persistence is Firestore-only via `persist()`.
2. README says "Ten-question practice rounds" — the app runs a **timed 15-minute session** (`sessionDeadline = Date.now() + 15*60*1000`) of **120 drawn exercises** (`for(let i=0;i<120;i++)` over `sessionPool`). "10" is now the daily goal: `d.total>=10` awards `+20` stars once (`dailyBonusAwarded`) and marks the calendar day `completed` (`completeDay()` also accepts legacy `d.completed===true`).
3. README claims an "installable PWA manifest" — `manifest.webmanifest` has **no `icons`** (or screenshots), which Chrome install prompts generally require.
4. README never mentions Firebase login, roles, or the `students` vs `practice` docs, yet the app is unusable without a Firebase project (`cloe-math`) with email sign-in enabled and Firestore rules allowing those writes.
5. `sw.js` was bumped to `cloe-math-v23` while `index.html` still registered `./sw.js?v=22` (HEAD commit touched only `sw.js`) — verify they match after any change. They currently **do** match (both `v24`).

## Conventions

- UI copy is informal Italian with intentional misspellings ("risposta", "allenarti"); match the existing register when editing strings and never switch language.
- Code style here is minified single-`function`-per-line JS with `$=document.getElementById` shorthand, DOM-id-based state, `class="hidden"` toggling, and no modules/exports. Follow it for in-file edits; don't reformat the whole file.
- Dates are keyed `YYYY-MM-DD` via `toLocaleDateString('sv-SE')` (`dateKey()`/`today`), which is what the calendar and streak logic depend on.
- Keep role gating and Firestore paths untouched when touching reset/cleanup logic.
