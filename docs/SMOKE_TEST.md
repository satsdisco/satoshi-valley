# 🧪 Satoshi Valley — Smoke Test

> The play-through that must still work after any refactor. Run this before every commit on the modularization sprint. Takes ~5 minutes.

If any step fails: **don't commit**. Revert and diagnose. The whole point of the smoke test is to catch load-order and reference bugs that `node -c` can't see.

---

## Before starting

- [ ] `node -c web/*.js` passes on every touched file
- [ ] Cache-bust version bumped in `web/index.html` (`?v=N` → `?v=N+1`)
- [ ] Browser console is open (DevTools) so errors surface immediately
- [ ] Hard-reload the page (⌘⇧R / Ctrl+Shift+R) to bypass cache

---

## 1. Boot

- [ ] Game loads without red errors in the console
- [ ] Title screen appears with "New Game" / "Continue"
- [ ] Choose **New Game** — intro cinematic plays (text on black, slides advance)
- [ ] Intro ends, player spawns outside Uncle Toshi's cabin
- [ ] Music starts, terrain renders with grass/paths/water/trees, NPCs visible
- [ ] HUD shows: time, sats, energy, hotbar, minimap

## 2. Movement + input

- [ ] Arrow keys / WASD move the player smoothly in 4 directions
- [ ] Click-to-move: click a distant tile, player walks there
- [ ] Mouse-hover highlights NPCs and interactables
- [ ] Hotbar slot selection with number keys (1–0) works
- [ ] I opens inventory, Esc closes

## 3. Mining (core entity: Rig)

- [ ] Walk into the mining shed (starter rigs placed inside)
- [ ] Rigs are visible, humming, with temperature + status displays
- [ ] Sats tick up in the HUD over ~10 seconds
- [ ] Exit the shed — rig continues mining in background
- [ ] Open inventory, verify you have sats

## 4. Farming (core entity: Crop)

- [ ] Select hoe, till a grass tile (should become dirt)
- [ ] Select a seed (e.g. potato), plant on tilled tile — crop sprite appears
- [ ] Advance time (or sleep) so crop grows to harvest stage
- [ ] Harvest the crop with R — item enters inventory, sparkle particles fire
- [ ] Sell to Farmer Pete's Market — sats increase

## 5. Animals (core entity: Animal)

- [ ] Buy a chicken (or use existing) at Ruby's Hardware
- [ ] Place animal inside a fenced area
- [ ] Feed animal from inventory — happiness visible
- [ ] Collect product (egg/milk/etc.) when ready

## 6. Fences (FenceSet)

- [ ] Craft a fence post at the workbench
- [ ] Shift-click to place — fence renders, blocks player + animals
- [ ] Pick up the fence — it removes cleanly (no phantom collision)

## 7. NPCs + dialogue

- [ ] Approach Hodl Hannah — interact with E
- [ ] Dialogue appears, advances character-by-character, full line shows
- [ ] NPCs still walk their daily schedules (day → evening → tavern → sleep)

## 8. Shop

- [ ] Enter Ruby's Hardware, trigger shop UI
- [ ] Buy tab: select an item, confirm purchase, sats decrease, inventory updates
- [ ] Sell tab: sell an item, sats increase
- [ ] Toggle buy/sell modes rapidly — no ghost double-clicks

## 9. Mines (dungeon system)

- [ ] Enter mine entrance
- [ ] Floor generates, torches render, fog of war works
- [ ] Fight an enemy — click-attack + right-click skill both fire
- [ ] Descend stairs to next floor, exit mine successfully

## 10. Save / Load

- [ ] Save game (pause menu → Save Game)
- [ ] Reload the page (hard-reload)
- [ ] Choose **Continue** — game restores: position, sats, inventory, rigs, crops, citadel tier, hearts, quest progress
- [ ] Save format version should still read `v8`

## 11. Mobile (if possible)

- [ ] Open in mobile emulator or actual device
- [ ] Virtual joystick appears, action buttons present
- [ ] Hotbar taps work, quick-action menu (☰) opens and closes
- [ ] Contextual interact button shows correct action

## 12. Final check

- [ ] Browser console still shows **zero errors and zero warnings** after the full run
- [ ] Frame rate feels smooth (no visible stutter in overworld or mines)
- [ ] No items, NPCs, or decor appear missing vs. the pre-change version

---

## If something fails

1. **Don't commit.** The smoke test exists to catch exactly this.
2. **Note what broke** — which step, what the console says.
3. **Decide:** is it the refactor (revert) or a pre-existing bug (file an issue and continue)?
4. **Revert or fix, then re-run the full smoke test from the top.** Partial re-runs are tempting but miss cascade bugs.

---

## Updating this doc

If you add a new core system that needs smoke-testing, add it here. If a step becomes obsolete (e.g. mobile gets its own dedicated test suite), move it out. Keep the test around 5 minutes total — longer than that and it stops getting run.
