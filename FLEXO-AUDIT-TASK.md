# Satoshi Valley — Comprehensive Audit & Bug Fix Sprint

You're working on **Satoshi Valley**, a Bitcoin farming/life sim game (Stardew Valley meets the Bitcoin Standard).

- **Repo:** `https://github.com/Bender21m/satoshi-valley`
- **Live demo:** `https://bender21m.github.io/satoshi-valley`
- **Codebase:** `web/game.js` (~3500 lines), `web/sprites.js`, `web/music.js`, `web/index.html`
- **Roadmap:** `ROADMAP.md`
- **Sprint plan:** `docs/SPRINT_PLAN.md`
- **GDD:** `docs/GDD.md`

---

## 1. Play the Game End-to-End and Document Every Bug

Play through the full gameplay loop and document everything broken, janky, or confusing:

1. **Tutorial** — Start a fresh game (clear localStorage). Go through all 17 tutorial steps. Are they clear? Do they advance properly? Does the skip button work?
2. **Mining** — Walk into the mining shed. Are rigs visible inside? Can you toggle them? Do they generate sats? Can you place new rigs inside?
3. **Shopping** — Visit Ruby's Hardware Shop (enter building, talk to her outside). Test buying items. Visit Seed Sally. Visit Farmer Pete to sell crops. Does scrolling work? Does mouse clicking work?
4. **Farming** — Plant seeds in the garden (north of home). Do crops grow? Can you harvest? Can you sell at Farmer Pete's?
5. **Animals** — Buy a chicken/goat/cow from Ruby. Place with R. Do they wander? Can you feed them? Do they produce items?
6. **Building Interiors** — Enter every building (Home, Shop, Tavern, Shed, Town Hall). Do they load correctly? Can you exit? Does the fade transition work smoothly?
7. **Citadel Upgrades** — Upgrade your home. Does the building change? Does it break surrounding structures?
8. **Storage Chest** — Buy, place, open. Transfer items. Does save/load preserve chest contents?
9. **Weather** — Wait for weather changes. Does rain appear? Lightning in storms? Do crops get the rain bonus?
10. **Sleep** — Enter your home after 6 PM, press E. Does it skip to morning?
11. **Seed Fragments** — Find one. Does the BIP39 word dialogue appear? Does the quest log show progress?
12. **Minimap** — Press N. Does it show buildings, NPCs, player position? Does it hide indoors?
13. **Save/Load** — Save (P), reload page, load (L). Is everything preserved?

---

## 2. Create GitHub Issues for Each Bug Found

Use `gh issue create --repo Bender21m/satoshi-valley --label bug` for each bug. Be specific:
- **Title:** Short description
- **Body:** Steps to reproduce, expected behavior, actual behavior

### Known Issues to Investigate:

- [ ] Building facades sometimes show interior floor tiles when approaching from certain angles
- [ ] Building entry/exit can be finicky (sometimes takes multiple attempts to enter/exit)
- [ ] Entry detection uses hardcoded building coordinates — verify they match actual building positions
- [ ] NPC positions may not match their buildings after layout changes
- [ ] Grass rendering may still have tiling artifacts at some zoom levels
- [ ] Shop scrolling click detection may be off by scroll offset
- [ ] Animals can potentially wander into water or off the map edge
- [ ] Mining rigs inside shed — verify visible, interactable, generating sats
- [ ] Tutorial direction references may be outdated (buildings moved during development)
- [ ] Day summary screen may overlap with other UI elements
- [ ] Save/load backwards compatibility with older saves (animals, weather, chest, foundWords, rig.interior)
- [ ] Energy system — does it deplete? Can you actually run out? What happens?
- [ ] Seed Sally shop — does it correctly show only seed items?
- [ ] Market stall decorations — are they rendering properly in the farmer's market area?
- [ ] Click-to-move indicator visible through building interiors?
- [ ] Weather particles visible inside buildings? (should be hidden)

---

## 3. Create Enhancement Issues for Gameplay Improvements

Use `gh issue create --repo Bender21m/satoshi-valley --label enhancement` for each:

### High Priority
- [ ] Quest markers (! and ?) above NPCs who have quests/dialogue
- [ ] NPCs inside building interiors (Ruby inside her shop, bartender in tavern)
- [ ] Shed upgradeable to larger mining facility (more space for rigs)
- [ ] Fencing system to contain animals in pastures
- [ ] NPC daily schedules (walk between locations, go home at night)

### Medium Priority
- [ ] Crafting bench (combine items: milk→cheese, wood+nails→fence)
- [ ] Better character sprites (proper walk animation cycles in 4 directions)
- [ ] Title screen / main menu (New Game, Continue, Settings)
- [ ] Pause menu with settings (volume, game speed, controls)
- [ ] Sound effects polish (door open/close, footsteps per terrain type)

### Lower Priority
- [ ] Achievement unlock animations
- [ ] Photo mode / screenshot tool
- [ ] More crop types (seasonal)
- [ ] Traveling merchant NPC (rare items)
- [ ] Building interiors for your home that change with citadel tier

---

## 4. Code Quality Audit

Review `web/game.js` for:

### Crash Safety
- [ ] All `SHOP_LIST` / `SEED_SHOP_LIST` items exist in `ITEMS` object
- [ ] All NPC references to buildings use correct coordinates
- [ ] `ITEMS[id]` access is null-checked everywhere
- [ ] Interior map access is bounds-checked
- [ ] `isSolid()` handles edge cases for both overworld and interior maps

### Save/Load Robustness
- [ ] Save format handles missing fields with `||` defaults
- [ ] Old saves (before animals, weather, chest, foundWords) still load
- [ ] Rig interior property saved and restored correctly
- [ ] Weather state saved and restored

### Performance
- [ ] Particle arrays (weather.particles, ambient, particles, notifs) — are they bounded?
- [ ] How many draw calls per frame? Any easy optimizations?
- [ ] Interior furniture rendering — any redundant draws?
- [ ] Large decor array — could it grow unbounded?

### Architecture Notes
- [ ] game.js is ~3500 lines in one file — note where natural module boundaries exist
- [ ] Global variable usage — what would benefit from encapsulation?
- [ ] Event system — currently all inline, could benefit from pub/sub
- [ ] Data-driven potential — items, NPCs, quests could be JSON configs

---

## 5. Update ROADMAP.md

Based on your audit, add to the roadmap:

### Add a "Known Bugs" Section
List all bugs found with severity (critical/major/minor).

### Prioritize Fixes
Order them by:
1. Game-breaking (crashes, freezes, getting stuck)
2. Gameplay-affecting (features not working)
3. Visual (rendering glitches)
4. Polish (minor annoyances)

### Architecture Notes
Document any structural concerns for the team.

---

## Workflow

- You have direct push access to `Bender21m/satoshi-valley`
- Branch off main for fixes: `git checkout -b audit/bug-fixes`
- Create PRs for code changes
- Create issues for things you find but don't fix
- Don't break existing features — if unsure, create an issue instead of fixing
- `satsdisco` is a collaborator — mention in any relevant issues

---

## Context: What Was Built Today

In one session, 18+ features were shipped:
1. Shop crash fix, 2. Click-to-move, 3. Full mouse interaction, 4. Animal system,
5. Shop scrolling, 6. Visual overhaul, 7. Citadel spacing, 8. Typewriter dialogue,
9. Tutorial overhaul, 10. World layout fixes, 11. Minimap, 12. Farmer's Market + Seed Sally,
13. Weather system, 14. Ambient particles, 15. Storage chest, 16. BIP39 seed words,
17. Building interiors (5 buildings), 18. Building exterior art, 19. Sleep system,
20. Mining rigs inside shed, 21. Grass rendering fix

A LOT was added fast. Bugs are expected. Your job is to find them all, document them, fix what you can, and set up the issue tracker for a clean next session.

---

*Good luck. The valley needs you.* ⛏️
