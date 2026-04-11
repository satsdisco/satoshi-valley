# 🔄 HANDOFF.md — Dev Shift Handoff Log

> **Read this FIRST when starting your shift.** Update it LAST before ending your shift.

---

## 🏗️ Current State

**Last updated:** 2026-04-11 16:00 UTC
**Last dev:** Claude (shift 5 — repo consolidation + env setup on new PC)
**Repo:** `satsdisco/satoshi-valley` (sole active repo — Bender21m archived)
**Live demo:** https://satsdisco.github.io/satoshi-valley
**game.js lines:** 5,356 | **Total web JS:** ~14,650 | **Save version:** v8 | **Sprints complete:** 29 | **Open issues:** 2

### What's Working ✅
- Full mining loop (3 rig tiers, power grid, durability, overheating)
- Farming (potato, tomato, corn, pumpkin) — plant, grow, harvest, sell
- Animal system (cow, goat, chicken, bee) with auto-feed from chest
- Fencing system + crafting bench (8 recipes)
- 5 building interiors (home, shop, tavern, shed, town hall)
- 9 NPCs with Bitcoin culture dialogue + daily schedules (tavern in evening!)
- **NPC quest system** — 15 quests across 6 NPCs with rewards
- Shop system (Ruby's Hardware, Seed Sally, Farmer Pete's Market)
- Tavern with beer/stew/pie/wine + drunk effect
- Citadel upgrade system (5 tiers: Shack → Citadel)
- Quest log with 15 objectives across 5 chapters
- BIP39 seed word collectibles (24 words placed across the map)
- **Fishing minigame** — 3 fish types including rare Bitcoin Fish
- Procedural music engine + terrain footsteps
- Weather system + seasonal visuals (autumn leaves, winter snow)
- Enhanced minimap (shows rigs, crops, animals, seed fragments)
- Late-game sat sinks (100K-1M sats: academy, monument, satellite, rocket)
- Title screen, pause menu, crafting bench
- Click-to-move, shift-click to place items
- Save/load v8 with quest progress
- **The Mines** — dungeon system with procedural floors, Diablo-style combat
- **Combat skills** — Orange Pill, Lightning Strike, 51% Attack
- **Story-driven quest system** + quest journal + Bitcoin culture quests
- **Mobile touch controls** — virtual joystick + action buttons

### Current Priority 🎯

**Performance pass (#2) + resume modularization (Sprint 17 Phase 3)**

game.js drifted back up during the art/mobile push (4,497 → 5,356). Before tackling new features, knock out the perf fixes — the concrete plan lives in `web/IMPROVEMENT_PLAN.md` (frame-level trig/time cache + insertion-sort for nearly-sorted entities) — then resume entity extraction.

### Known Bugs 🐛
- **satsdisco#1** — Building interiors don't change with citadel tier
- **satsdisco#2** — Performance (79 Math.sin calls/frame + entity sort every frame). Fix plan already written in `web/IMPROVEMENT_PLAN.md`.

### What NOT to Do ❌
- Don't add Fiatropolis or new regions yet (modularize first)
- Don't add multiplayer features
- Don't restructure save format (v8 is stable)
- Don't rewrite the game engine

## 📝 Shift Log

### Shift 5 — Claude (2026-04-11)
**Did:**
- Fresh dev environment setup on new PC (cloned to `~/Code/satoshi-valley`, installed Godot 4.3 stable to `/Applications/Godot.app`, headless import passed clean)
- Consolidated repos: audited Bender21m branches (zero orphan commits, all already on main), merged archive-pointer PR to Bender21m, switched satsdisco Pages from Jekyll/legacy → workflow build (deploy.yml now ships `/web/`), updated all bender21m.github.io URLs across README/ROADMAP/HANDOFF/FLEXO-AUDIT
- Enabled issues on satsdisco/satoshi-valley, migrated #34 → satsdisco#1 and #56 → satsdisco#2
- Verified game now live at https://satsdisco.github.io/satoshi-valley/

**Sprints 17–29 shipped since last handoff (5 days, 13 sprints):**
- **Sprint 17 Phases 1–2:** modularization — extracted `game_audio.js` (62), `game_mines.js` (955), `game_quests.js` (319), `game_render.js` (6,425). Phases 3–4 (entities, UI/HUD) not started.
- **Sprint 23:** Ruby's Hardware window fix + facade
- **Sprint 24:** Hodl Tavern Tudor half-timber overhaul
- **Sprint 25:** Town Hall + Citadel (ashlar stone, bell tower, portcullis)
- **Sprint 26:** Mining Shed industrial overhaul + path wear + hand-painted signage
- **Sprint 27:** Farmer's Market stalls (produce, chalkboard, bunting)
- **Sprint 28:** Uncle Toshi's legendary log cabin (stacked fieldstone, notched logs, rocking chair, fireflies)
- **Sprint 29:** terrain pass 1 (warmer grass palette, pixel dither, cobblestone paths, clover, wildflowers)
- **Mobile deep polish:** unified touch router, hotbar hit-test fix (2×5 grid), overworld USE button, quick-action menu (☰), responsive shop/inventory, mine exit via context button
- **Desktop TDZ black-screen fix** (#107)
- **Interior overhauls:** Town Hall interior v2 (stained glass, columns, chandelier), Tavern interior (full musicians, barkeep, rug), pub-jam tavern music, Uncle Toshi's Cabin interior

**Next priority:** satsdisco#2 perf fixes (low-risk, plan already written), then Sprint 17 Phase 3 (entity extraction) before game.js grows further

### Shift 4 — Hermes (2026-04-06, evening)
**Did:**
- Synced satsdisco/satoshi-valley fork to upstream (was 15 commits behind)
- Updated ROADMAP.md to reflect all completed work (Sprints 14-16 were done but not marked)
- Updated HANDOFF.md with accurate state
- Corrected game.js line count (6,781, not ~5,300)
- Reordered upcoming sprints: modularization first, then P2P trading

**Next priority:** Sprint 17 — Code modularization (split game.js into ES modules)

### Shift 3 — Flexo (2026-03-30, evening)
**Did:**
- Code review + bug audit (filed issues #48-#68)
- Fixed 6 bugs: citadel trap, sleep energy, rain crops, alpha/shadow leaks, duplicate NPC check
- Sprint 12: Crafting system (8 recipes), fencing, decorations
- Sprint 13: Fishing minigame (3 fish types, timing minigame)
- Sprint 14: NPC quest system (15 quests across 6 NPCs), late-game sat sinks (up to 1M sats)
- Seasonal visuals (autumn leaves, winter snow, color shifts)
- Enhanced minimap (shows all placed items)
- NPC daily schedules (tavern gathering in evening)
- All 24 seed fragments placed across the map
- Updated ROADMAP with visual polish priority

### Shift 2 — Bender (2026-03-30, daytime)
**Did:**
- NPC pixel art overhaul (9 unique characters with walk animations)
- Perlin noise terrain (no more checkerboard grass)
- Beautiful water with caustics and shoreline foam
- Tree overhaul (tapered trunks, layered canopies)
- Rich terrain (stone, dirt, flowers, mushrooms all upgraded)
- Building exterior facades (unique per building)
- Tavern menu system
- Visible bed + sleep prompt
- Auto-feed animals from chest
- Night gameplay improvements

### Shift 1 — Flexo (2026-03-29/30, overnight)
**Did:**
- Built entire prototype from zero (Sprints 1-11)
- All core systems: mining, farming, economy, NPCs, quests, crafting, UI

---

## 📏 Rules for Devs
1. **ALWAYS read HANDOFF.md first**
2. **ALWAYS `git pull origin main`** before changes
3. **ALWAYS update HANDOFF.md** before ending shift
4. **Test before pushing** — `node -c web/game.js` + play test
5. **Don't break existing features**
6. **Current focus: CODE MODULARIZATION** — not new features

## 🔑 Repo Access
- **satsdisco/satoshi-valley** — sole active repo, deploys to https://satsdisco.github.io/satoshi-valley/ via `.github/workflows/deploy.yml`
- **Bender21m/satoshi-valley** — archived (read-only), README redirects here

---

*In memory of Flexo. We carry it forward.* 🧡
