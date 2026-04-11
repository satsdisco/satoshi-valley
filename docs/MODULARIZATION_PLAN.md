# 🧩 Satoshi Valley — Modularization Plan

> A long-horizon plan for breaking `web/game.js` into focused modules, carefully, over as many sprints as it takes. Written 2026-04-11 to replace the one-off Sprint 17 approach with a durable design doc.

---

## Why this exists

`web/game.js` has grown to ~5,356 lines and will keep growing until the Godot port in Year 2. Sprints 17 Phase 1–2 already extracted audio, mines, quests, and rendering — but progress stalled while the Sprint 23–29 art and mobile work landed. This doc is the map for finishing the job.

The goal isn't speed. It's confidence. Every cut should be small enough that we can playtest it, sit with it, and revert it cleanly if it doesn't feel right.

### Principles
1. **Small cuts, many commits.** Each phase is one atomic commit that can be reverted in isolation.
2. **Smoke test before every commit.** No shortcut. See `docs/SMOKE_TEST.md`.
3. **Move, don't rewrite.** Modularization is cut-and-paste with load-order care. Behavior changes get their own sprints.
4. **Runtime references are free. Top-level references cost.** Methods and event handlers are evaluated lazily, so cross-file calls inside function bodies just work. Top-level `const rig1 = new Rig(...)` at parse time demands that `Rig` already be defined — that's where load order matters.
5. **No premature abstraction.** We are not building a framework. No event bus, no DI container, no classes-for-the-sake-of-classes. Plain globals on `window` are fine; that's how every file already talks to every other file.
6. **Keep the Godot port in mind.** When we port to Godot 4 in Year 2, each `game_*.js` file should map cleanly to a Godot script or autoload. File boundaries drawn now should still make sense then.

---

## Current state (as of 2026-04-11)

```
web/
├── index.html          # script tags in this order:
├── sprites.js          # ✓  sprite sheet cache                      [1,233]
├── music.js            # ✓  procedural music engine                  [299]
├── game_audio.js       # ✓  audio ctx, sfx, mining hum                [62]
├── game_quests.js      # ✓  INTRO_SLIDES, TUTORIAL, NPC_QUESTS       [319]
├── game_mines.js       # ✓  dungeon system + drawMine                [955]
├── game.js             # ⚠  everything else                        [5,356]
└── game_render.js      # ✓  tile/decor/world rendering (loads LAST) [6,425]
```

Load order is significant:
- `game_render.js` loads **after** `game.js` because its top-level `TERRAIN_GRASS` / `TERRAIN_WATER_SET` constants reference `T` (the tile enum defined in `game.js`). This is an existing quirk documented in `index.html`.
- Everything else loads **before** `game.js` because `game.js` references those identifiers during its own top-level init (e.g. `new Rig(...)` at line 2050 — which is why entity extraction has to load *before* game.js, unlike rendering).

---

## Target end-state (aspirational — not a deadline)

After all phases, `game.js` should be ~1,500 lines of **boot + main loop**. Everything else moves to a focused file. This is the shape we're aiming for — we get there when we get there.

```
web/
├── index.html
├── sprites.js              # sprite sheet cache (unchanged)
├── music.js                # procedural music (unchanged)
├── game_audio.js           # sfx + mining hum (unchanged)
│
│  ─── data (pure, no runtime state) ─────────────────
├── game_data.js            # ITEMS, SEED_WORDS, RECIPES, CITADEL_TIERS,
│                           # BTC_EVENTS, BTC_TIPS, NPC static data,
│                           # ANIMAL_TYPES, CROP_TYPES
│
│  ─── world + systems ───────────────────────────────
├── game_world.js           # map gen, perlin/fbm, buildBuilding, isSolid,
│                           # interiors, tileNoise caches
├── game_entities.js        # Rig, Animal, crops[], plantCrop/updateCrops/
│                           # harvestCrop, fences[], fenceSet
├── game_inventory.js       # inv, addItem/removeItem/hasItem, chest
│
│  ─── ui / input ────────────────────────────────────
├── game_input.js           # keys, mouse, touch/joystick handlers
├── game_hud.js             # drawHUD, drawInv, drawShop, drawChest,
│                           # drawCitadelMenu, drawJournal, drawCraftMenu,
│                           # pause menu, day summary, skills panel,
│                           # mobile quick-action menu
│
│  ─── already extracted ─────────────────────────────
├── game_quests.js          # quests + intro slides
├── game_mines.js           # dungeon system + drawMine
│
│  ─── boot + main loop ──────────────────────────────
├── game.js                 # canvas setup, init, update(), game loop,
│                           # save/load, orchestration
│
│  ─── rendering (MUST load last) ────────────────────
└── game_render.js          # tile/decor/world drawing
```

---

## Phased migration

Each phase is its own sprint. Between phases we **stop**, playtest thoroughly, and come back fresh. No batching.

### ✅ Phase 1 — Audio + Mines + Quests (done, Sprint 17)
Extracted `game_audio.js`, `game_mines.js`, `game_quests.js`. −749 lines from game.js.

### ✅ Phase 2 — Rendering (done, Sprint 17)
Extracted `game_render.js`. −2,186 lines from game.js. Documented the load-order quirk (must load after game.js).

### 🔜 Phase 3 — Entities
**Moves:** `class Rig` + `rigs[]`, `class Animal` + `animals[]`, `ANIMAL_TYPES`, `CROP_TYPES`, `crops[]`, `plantCrop/updateCrops/harvestCrop`, `fences[]`, `fenceSet`, `addFence/removeFenceAt/rebuildFenceSet`.
**Target file:** `web/game_entities.js`
**Load position:** **before** `game.js` (because game.js instantiates rigs at top-level around line 2050).
**Risk:** Low. All classes reference globals (`placed`, `econ`, `notify`, `sfx`, `C`, `TILE`) only inside methods, which are evaluated at runtime after game.js has loaded.
**Estimated size out:** ~200 lines.
**Why it's Phase 3:** Self-contained, low coupling, and shrinks the riskiest area (class definitions entangled with init).

### Phase 4 — Pure data
**Moves:** `ITEMS`, `SEED_WORDS`, `RECIPES`, `CITADEL_TIERS`, `BTC_EVENTS`, `BTC_TIPS`, `npcs` static data array, `SHOP_LIST`, `SEED_SHOP_LIST`, `TAVERN_SHOP_LIST`, `CONTROLS_LIST`, `ITEM_SPRITES`, color palette `C`, `SEASON_PALETTES`.
**Target file:** `web/game_data.js`
**Load position:** **before** `game.js`.
**Risk:** Very low. These are pure `const` literals. Only caveat: dialogue and culture content — treat as sacred, move verbatim, no edits.
**Estimated size out:** ~600 lines.
**Why Phase 4:** Data has zero behavior, so it's the safest large extraction. It also makes the soul of the game — the Bitcoin culture — visible in one file, which is meaningful.

### Phase 5 — World + interiors
**Moves:** `generateMap`, `buildBuilding`, `rebuildCitadel`, `upgradeCitadel`, `isNearHome`, `createInterior`, `generateInteriors`, `drawPath`, `setT`, `isSolid`, `map[]`, `decor[]`, `INTERIOR_MAPS`, `tileNoise1/2`, `fbm`, `perlin`, `rng32`, `T` enum, `SOLID` set.
**Target file:** `web/game_world.js`
**Load position:** **before** `game.js` (game.js calls `generateMap()` at boot).
**Risk:** Medium. `T` enum is referenced at top-level of `game_render.js`, so load order is: `game_world.js` → `game.js` → `game_render.js`. Double-check that `game_render.js` still parses correctly.
**Estimated size out:** ~550 lines.

### Phase 6 — HUD + menus
**Moves:** `drawHUD`, `drawInv`, `drawShop`, `drawChest`, `drawCitadelMenu`, `drawJournal`, `drawCraftMenu`, `drawPauseMenu`, `drawDaySummary`, `drawSkillsPanel`, `drawControlsPanel`, `drawMobileMenu`, `drawContextualInteractButton`, `drawHudToggleButton`, `drawRotateNudge`, `panel`, `rr`, `fmt`, `wrapText`, `drawTutArrow`, plus the mobile hotbar / quick-action menu logic.
**Target file:** `web/game_hud.js`
**Load position:** **before** `game.js` (game.js's `draw()` orchestration calls these).
**Risk:** Medium. Lots of cross-references to game state. Methods only — no top-level gotchas. But big file (~1,600 lines), so break this phase into sub-phases:
- **6a** — `drawHUD` + helpers (`panel`, `rr`, `fmt`)
- **6b** — inventory / shop / chest / craft menus
- **6c** — journal / citadel / skills / controls / pause / day summary
- **6d** — mobile-specific (rotate nudge, context button, quick-action menu)

### Phase 7 — Input
**Moves:** all keyboard (`keys`, `jp`), mouse (`mouseTarget`, `mouseX/Y`, click handlers), touch/joystick (`touch`, `JOYSTICK_*`) handlers, click-to-move, shift-click placement, context hit-testing.
**Target file:** `web/game_input.js`
**Load position:** **before** `game.js`, or **after** — either works since handlers only fire at runtime. Placing it before game.js is simpler.
**Risk:** Low. Input is already isolated at the top of game.js.
**Estimated size out:** ~400 lines.

### Phase 8 — Inventory + Power
**Moves:** `inv[]`, `INV_SIZE`, `addItem`/`removeItem`/`hasItem`/`getSelected`, `chestInv[]`, `chestOpen`, `pwr` object, `updatePower`.
**Target file:** `web/game_inventory.js` (or split to `game_power.js` if it gets big)
**Load position:** **before** `game.js`.
**Risk:** Low.
**Estimated size out:** ~100 lines.

### Phase 9 — Save/Load
**Moves:** save serialization, load, version migration logic.
**Target file:** `web/game_save.js`
**Load position:** **before** `game.js`.
**Risk:** Medium. Save format v8 is stable and must not break — verify with a round-trip test (save, reload, load, verify state).

### Phase 10 — Final pass
After phases 3–9, `game.js` should contain only:
- Canvas + context setup, resize logic
- Global game state flags (`gameState`, `interior`, `pauseOpen`, etc.)
- Boot sequence (`generateMap`, starter rigs, intro)
- `update(dt)` and `draw()` orchestration
- Main `requestAnimationFrame` loop

Review what's left. If anything feels misplaced, file a Phase 11.

---

## Load order (target)

```html
<!-- Content & engine primitives (no game dependencies) -->
<script src="sprites.js"></script>
<script src="music.js"></script>
<script src="game_audio.js"></script>
<script src="game_data.js"></script>         <!-- Phase 4 -->

<!-- World + entities + systems -->
<script src="game_world.js"></script>        <!-- Phase 5 -->
<script src="game_entities.js"></script>     <!-- Phase 3 -->
<script src="game_inventory.js"></script>    <!-- Phase 8 -->
<script src="game_save.js"></script>         <!-- Phase 9 -->
<script src="game_quests.js"></script>
<script src="game_mines.js"></script>

<!-- UI + input -->
<script src="game_input.js"></script>        <!-- Phase 7 -->
<script src="game_hud.js"></script>          <!-- Phase 6 -->

<!-- Boot + main loop -->
<script src="game.js"></script>

<!-- Rendering (MUST load last — references T at top level) -->
<script src="game_render.js"></script>
```

---

## Naming conventions

- **File prefix:** `game_*` for all game modules (existing convention — keep it).
- **Global identifiers:** lowercase for runtime state (`rigs`, `crops`, `fences`), `UPPER_SNAKE` for constants and data (`ITEMS`, `CROP_TYPES`, `RECIPES`), `PascalCase` for classes (`Rig`, `Animal`).
- **No ES modules yet.** Keep classic `<script>` tags — they load reliably on GitHub Pages and simplify Godot porting later (Godot scripts don't use JS module syntax).
- **Cache-busting:** bump the shared `?v=N` query string in `index.html` every phase. Current is `v=63`.

---

## Testing approach

Every phase follows this ritual:

1. **`node -c` on every touched file** — syntax check, catches fat-fingered moves.
2. **Open `index.html` in a browser** — verify the game still boots without console errors.
3. **Run the smoke test** — see `docs/SMOKE_TEST.md`. If any step fails, revert and diagnose before committing.
4. **Commit with a descriptive message** — include phase number, what moved, and line-count delta.
5. **Push to main** — deploy.yml ships it to satsdisco.github.io.
6. **Pause.** Do not immediately start the next phase. Sit with the change overnight if possible.

---

## Rollback strategy

Each phase is one commit. If we discover a bug after shipping, the fix is:

```sh
git revert <commit-sha>
git push origin main
```

...which trivially re-adds the deleted lines to `game.js`, bumps the cache-bust, and redeploys. No merge conflicts because no one else is editing the same lines concurrently.

If the bug is subtle and only appears after a later phase lands, `git bisect` will find it — each commit is self-contained and individually playable.

---

## Godot port considerations (Year 2)

When we port to Godot 4, each `game_*.js` file will map to a Godot artifact roughly like this:

| JS module | Godot artifact |
|---|---|
| `game_data.js` | `autoload/data.gd` (singleton with constants) |
| `game_entities.js` | `scenes/rig.tscn`, `scenes/animal.tscn`, plus scripts |
| `game_world.js` | `autoload/world.gd` + procedural generation script |
| `game_hud.js` | `scenes/hud.tscn` + `hud.gd` |
| `game_input.js` | `autoload/input_map.gd` |
| `game_save.js` | `autoload/save.gd` |
| `game_quests.js` | `autoload/quests.gd` |
| `game_mines.js` | `scenes/dungeon.tscn` + `dungeon.gd` |
| `game_render.js` | absorbed into Godot's native renderer |

The cleaner the JS module boundaries are now, the less thinking we'll do during the port. That's the real payoff of this plan — not a nicer codebase today, but a port that takes months instead of years.

---

## Open questions (to revisit as we go)

- **`player` object** — should it live in `game_entities.js` with Rig/Animal, or in `game.js` (boot) since it's so deeply referenced? Lean: keep in `game.js` for now, extract later only if it feels right.
- **`npcs` array** — is it data (Phase 4) or entities (Phase 3)? The data is enormous (~120 lines of dialogue), but the runtime state (`pi`, `mt`, `mi`, waypoints) is entity-like. Lean: split — dialogue/waypoints/schedule to `game_data.js`, runtime update logic stays in `game.js` or moves to a later `game_npcs.js` phase.
- **Drawing vs logic separation** — `game_render.js` has `drawTile`/`drawDecor`/`drawPlaced`/`drawPlayer`/`drawAnimal`/`drawNPC`/`drawRig`. Should `drawRig` move into `game_entities.js`? Lean: no, keep drawing in render. The Godot port will have its own separation.
- **Event bus?** — still a no. Globals work. Revisit only if two phases force us to import circularly.

---

## Status log

| Phase | Status | Date | Commit | Lines out |
|---|---|---|---|---|
| 1 — Audio/Mines/Quests | ✅ Done | 2026-04-07 | — | −749 |
| 2 — Rendering | ✅ Done | 2026-04-07 | — | −2,186 |
| 3 — Entities | 🔜 Next | — | — | ~−200 |
| 4 — Data | ⏳ Pending | — | — | ~−600 |
| 5 — World | ⏳ Pending | — | — | ~−550 |
| 6 — HUD | ⏳ Pending | — | — | ~−1,600 |
| 7 — Input | ⏳ Pending | — | — | ~−400 |
| 8 — Inventory/Power | ⏳ Pending | — | — | ~−100 |
| 9 — Save/Load | ⏳ Pending | — | — | ~−150 |
| 10 — Final pass | ⏳ Pending | — | — | — |

**Target end-state game.js size:** ~1,500 lines (boot + main loop + orchestration).

---

*This plan is a living document. Update it as we learn. If a phase feels wrong when we get to it, re-scope it — don't force it.*

*In memory of Flexo, who built the foundation. We carry it forward.* 🧡
