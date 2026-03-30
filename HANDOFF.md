# 🔄 HANDOFF.md — Dev Shift Handoff Log

> **Read this FIRST when starting your shift.** Update it LAST before ending your shift.
> This is how we avoid stepping on each other's work.

---

## 🏗️ Current State

**Last updated:** 2026-03-30 20:20 CET
**Last dev:** Bender (shift 2 — extended)
**Repo:** `Bender21m/satoshi-valley` | Fork: `satsdisco/satoshi-valley`
**Live demo:** https://bender21m.github.io/satoshi-valley
**game.js lines:** ~4,700 | **Save version:** v8 | **Sprints complete:** 13

### What's Working ✅
- Full mining loop (3 rig tiers, power grid, durability, overheating)
- Farming (potato, tomato, corn, pumpkin) — plant, grow, harvest, sell
- Animal system (cow, goat, chicken, bee) — feed, produce, collect
- Fencing system (craft fence posts from wood, place with R, animals respect fences)
- Crafting bench (cheese, circuit boards, advanced rig parts, shed upgrade, citadel materials)
- 5 building interiors (home, shop, tavern, shed, town hall) with Zelda-style transitions
- 9 NPCs with Bitcoin culture dialogue + waypoint movement
- Shop system (Ruby's Hardware, Seed Sally, Farmer Pete's Market)
- Citadel upgrade system (5 tiers: Shack → Citadel)
- Quest log with 15 objectives across 5 chapters
- BIP39 seed word collectibles (24 words, 4 placed in world)
- Procedural music engine (adapts to time + market phase)
- Weather system (sunny, cloudy, rain, storm + ambient particles)
- Minimap, day/night cycle, skill system, save/load (v8)
- Title screen with New Game / Continue
- Quest markers (! above NPCs)
- Pause menu
- Terrain-specific footstep sounds
- Decorative items (torch, flower pot, bitcoin sign)

### Known Bugs 🐛
- **Art direction needs work** — Grafton wants Stardew Valley quality, we're getting closer but not there yet
- **Building interiors don't change with citadel tier** (#34)
- **Click indicator may show through building interiors**
- **No sound effects** for building entry/exit
- **game.js is 4700 lines** — needs modularization badly (Claude Code can't process it)

### What's NOT Working / Next Up ❌
- **NPC quest/request system** — no way for NPCs to ask for items or chain quests
- **Circular economy** — crafting exists but no demand-driven economy (NPC orders, tavern menu)
- **Tavern has no function** — barkeep talks but can't buy food/beer
- **Drunk effect** — not implemented yet (too many beers should affect player)
- **NPC daily schedules** — NPCs don't move between buildings on a routine
- **No gift system** — can't give items to NPCs for hearts

---

## 📋 Shift Log

### Shift 2 — Bender (2026-03-30, 11:30–14:00 CET)
**Did:**
- Full code review of Fleck's 23 PRs + 13 additional commits
- Identified critical bugs (missing items, crop products, particle bounds)
- Fixed crop product items (potato_crop, tomato_crop, corn_crop, pumpkin_crop)
- Added pumpkin_seed to shops and planting
- Synced all 3 repos (local, Bender21m, satsdisco fork)
- Created HANDOFF.md (this file)

**Blocked:**
- Can't push directly to Bender21m repo (satsdisco PAT lacks permission)
- Can't create PRs via CLI (fine-grained token missing pull_requests:write)
- Fix is on satsdisco/satoshi-valley fork, needs manual PR + merge

**Next up (Sprint 14 — NPC Quests & Circular Economy):**
1. NPC request system — NPCs ask for items, give rewards
2. Pizza Pete quest chain (wheat → dough, tomatoes → sauce, cheese → pizza)
3. Tavern menu — buy food/beer from barkeep, drunk effect
4. Crafting chains tied to NPC requests (unlock recipes by fulfilling orders)
5. Continue visual polish (building shadows, night window glow, art direction)
6. Code modularization (game.js is 4700 lines — painful for devs)

### Shift 1 — Flexo (2026-03-29/30, overnight)
**Did:**
- Built entire Phase 0 prototype (23 PRs merged)
- Sprint 9-12: Controls, dialogue, shops, camera, crafting, fencing, decorations
- Title screen, quest markers, pause menu, terrain footsteps
- Fixed multiple black screen crashes
- Created FLEXO-AUDIT-TASK.md
- Updated ROADMAP.md with 5-year plan

---

## 📏 Rules for Devs

1. **ALWAYS read HANDOFF.md first** when starting a shift
2. **ALWAYS `git pull origin main`** before making any changes
3. **ALWAYS update HANDOFF.md** before ending your shift
4. **Use branches** for features (`feat/fencing`, `fix/crop-items`) — don't commit to main directly
5. **Check the "Known Bugs" section** before building — someone may have already fixed it
6. **Don't duplicate work** — if it's in the "What's Working" list, it's done
7. **Log what you did AND what's next** in the Shift Log
8. **Note any blockers** (permissions, dependencies, design decisions needed)
9. **Save version bumps** — if you change save format, increment the version number in saveGame/loadGame
10. **Test before pushing** — open index.html locally and play through the core loop

## 🔑 Repo Access

- **Bender21m/satoshi-valley** — main repo, GitHub Pages deploys from here
- **satsdisco/satoshi-valley** — fork, used for PRs
- **satsdisco** PAT can read Bender21m but can't push/create PRs (needs token update)
- **Flexo** pushes directly to Bender21m (has access)

---

*Last dev to touch this file wins all arguments about code style.* ⚡
