# Contractor Manager v3 — Spec & Handoff

Local-first rebuild of v2 (Supabase removed). One-man electrical/contracting company manager,
built for phone-first use. This scaffold has the storage layer, app shell, Dashboard basics,
and Backup done. Everything below is the feature spec recovered from v2 — build tabs in order.

## Owner's taste (from his other projects: workout-gen, meal-prep, journal)
- Lean flat repos, dense single-file components, no framework bloat, no UI libraries.
- Dark theme (tokens in App.jsx CSS), DM Sans + JetBrains Mono for numbers.
- Small font sizes, information-dense, decisive structure. Pragmatic > pretty.
- PWA: manifest present; add sw.js when stable.
- Data: key-value store (SK map), arrays of plain objects, `uid()` ids. Export/import JSON.

## Architecture
- `src/lib/storage.js` — IndexedDB (load/save/allData/snapshot/export/import). DO NOT scatter
  storage calls; all persistence flows through App.jsx state->save effects. When the home
  server is ready, reimplement storage.js against its API; nothing else changes.
- Old Supabase exports: `app_data` rows were (key, jsonb value) — reshape to `{data:{key:value}}`
  and use Import. Keys: projects, team, theme, settings, notes, vendors, labels, plans.

## Feature spec (v2 parity, then refine)
### Dashboard
Stat cards: open projects, open invoices ($ + count), paid invoices, total P&L.
Project list -> project detail: invoices (line items, mark paid), materials log (item/cost/vendor/date),
labor log (member, hours, rate from team), change orders, per-project P&L (billed - materials - labor).
"My Plate" widget surfaces due/overdue items.

### My Plate (Notes)
Personal/project/management notes. Checkbox items w/ strikethrough, bullets, nesting.
Any line -> convert to actionable (work item / material / invoice line) linked to a project.
Recurring tasks (daily, weekly, every N days, monthly on date) that regenerate; due dates shown.
v2 used TipTap — fine to re-add (@tiptap/react, starter-kit, task-list, task-item, placeholder).

### Materials (3 sub-views)
1. Purchases: date/project filters; "Best Price" column cross-refs price book, shows potential savings.
2. Vendors: cards (name/phone/address/notes), each with item price list.
3. Price Book: per-item price comparison across vendors, BEST badge on cheapest, spread indicator,
   unit types (ea/ft/roll/box/bag/spool/case). Catalog aggregates case-insensitively by item name.

### Schedule
Week/day work scheduling per project & crew member. (v2 was thin here — improve freely.)

### Crew Clock (#clock route, no login)
Standalone page: pick name -> pick project -> big Clock In/Out. Editable times, optional note.
Entries flow into project labor. In local-first mode this only works on the owner's device;
real multi-device clock-in waits for the server.

### Takeoff (the big one — v2's flagship)
Canvas blueprint takeoff over an uploaded plan image (pan/zoom):
- Scale calibration (two points + known ft). Devices palette (19 types: receptacle, GFCI, AFCI,
  AFCI/GFCI, switches, 3-way, dimmer, lights, smoke, CO, jbox, panel...) w/ per-type cost+markup.
- Areas: polygon rooms, sqft, room type (14 types: bedroom/bath/kitchen/etc).
- NEC compliance engine: per room type rules {spacing, gfci, afci, smoke, co, light, minReceps}
  (receptacle spacing NEC 210.52, AFCI 210.12). Check Code button -> issues list (error/warn/info)
  with ghost-device suggestions along wall perimeter; Auto-Place All.
- Conduit runs: polyline w/ type (EMT/Rigid/PVC/MC/Flex) + size; smooth bends drawn with arcTo
  using NEC Table 344.24 min radii (1/2"=4"...4"=16"); arc length in footage; bend counts (90/45);
  vertical drops; sticks/straps/tapcons/couplings BOM; circuits per run (gauge, conductors) -> wire totals.
- Box fill (NEC 314.16): conductors near device (1.5ft) -> cu.in. (Table 314.16(B): #14=2.0,
  #12=2.25, #10=2.5, #8=3.0, #6=5.0), + EGC 1x largest, + clamps 1x, + device yoke 2x.
  Min box suggestion from size table; over-fill flagged red on canvas ring w/ fill %.
- Historical estimator: across projects compute dev/sqft, $/sqft, conduit-ft/sqft, $/device;
  predict expected counts/costs for current takeoff; confidence low/med/high by sample size.

### Labels (QR system)
Panel / Run / Box labels. Panel: main breaker, phase, 42-slot circuit schedule (amps, breaker
type std/GFCI/AFCI/dual, description). Run: conduit+wire+footage+from/to+panel slot. Box: device
type, feeding breaker, controls, splice notes, connected runs. QR encodes URL `#label/<id>`;
scan view renders read-only card. Print sheet: 2-up stickers w/ QR. Import from takeoff
auto-creates panel+run labels. Dep: `qrcode` npm package.

### Backup (done)
Session snapshots (last 10, auto on start + visibility hidden) + JSON export/import.

## Deploy
GitHub Pages via .github/workflows/deploy.yml (GH_PAGES=1 sets base /contractor-manager/).
Repo Settings -> Pages -> Source: GitHub Actions. Later: home server serves dist/ at root.

## Security note
The GitHub PAT previously used in chat is compromised — revoke and reissue.
