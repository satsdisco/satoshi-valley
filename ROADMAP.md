# ⛏️ Satoshi Valley — Development Roadmap

> *A Bitcoin farming/life sim — Stardew Valley meets the Bitcoin Standard.*
>
> **Live demo:** [bender21m.github.io/satoshi-valley](https://bender21m.github.io/satoshi-valley)
> **Repo:** [github.com/Bender21m/satoshi-valley](https://github.com/Bender21m/satoshi-valley)

---

## 🎯 Vision

Build the definitive Bitcoin culture game — a beautiful, addictive farming/life sim where players mine sats, build citadels, raise cattle, trade P2P, and discover Bitcoin's history through gameplay.

### Design Pillars
1. **Fun first** — every mechanic must be enjoyable before the Bitcoin theme
2. **"Just one more day"** — always something finishing soon
3. **Visible progress everywhere** — skills, hearts, citadel, farm, wallet
4. **Bitcoin culture is king** — every NPC, event, item breathes Bitcoin
5. **Sovereignty as progression** — you're building independence
6. **Teach without preaching** — learn Bitcoin through gameplay

---

## 📅 5-Year Plan

### Year 1 (2026): Foundation to Playable Demo
| Quarter | Focus | Milestone |
|---|---|---|
| Q1 ✅ | Core engine, economy, daily loop, living world | Playable web prototype |
| Q2 | Enhancements, P2P economy, dungeon | Feature-complete demo |
| Q3 | Custom art, original soundtrack | Visual identity locked |
| Q4 | Full story, Godot port begins | Narrative complete |

### Year 2 (2027): Godot Port to Early Access
| Quarter | Focus | Milestone |
|---|---|---|
| Q1 | Port to Godot 4, proper sprite system | Native build running |
| Q2 | Content expansion (Fiatropolis, Underground) | All regions playable |
| Q3 | QA, balancing, Steam page, wishlists | 10K+ wishlists |
| Q4 | **Steam Early Access launch** | Public release |

### Year 3 (2028): Post-Launch and Community
| Quarter | Focus | Milestone |
|---|---|---|
| Q1 | Post-launch patches, community feedback | Stable 1.0 |
| Q2 | Multiplayer co-op (2-4 players) | Co-op beta |
| Q3 | Modding tools, Steam Workshop | Community content |
| Q4 | Console prep (Switch, PlayStation) | Console dev kits |

### Year 4 (2029): Expansion and Multiplatform
| Quarter | Focus | Milestone |
|---|---|---|
| Q1 | Console launch (Switch + PlayStation) | Multiplatform |
| Q2 | Expansion: "The Lightning Era" | New region + story |
| Q3 | Mobile port (iOS/Android) | Touch controls |
| Q4 | Localization (10+ languages) | Global reach |

### Year 5 (2030): Legacy
| Quarter | Focus | Milestone |
|---|---|---|
| Q1 | Expansion 2: "The Blocksize Wars" | Historical epic |
| Q2 | Community content season | Mod showcase |
| Q3 | Sequel planning | Pre-production |
| Q4 | **THE Bitcoin game of the decade** | Legacy achieved |

---

## ✅ Completed Sprints

### Sprint 1-2: Foundation + Homestead
Core engine, 120x90 Perlin world, 5 buildings, paths, bridges, day/night cycle.

### Sprint 3-4: Economy + Daily Loop
32-item shop, inventory, 3 rig tiers, power grid, crops, skills, NPC hearts, music engine, 25+ Bitcoin events.

### Sprint 5-6: Tutorial + Visual Polish
17-step tutorial, quest log, building interiors, gorgeous exteriors, character redesign, chimneys with smoke.

### Sprint 7-8: Citadel + Circular Economy
5-tier citadel upgrade, terraforming (axe/hoe/shovel), Farmer Pete market, Seed Sally, 20+ new items.

### Sprint 9: Living World
Animals (cow/goat/chicken/bee), weather (rain/storms), ambient particles, storage chests, BIP39 seed words, minimap, click-to-move, sleep mechanic, building facades.

### Sprint 10: Audit + Bug Fixes
Full codebase audit, bugs fixed, enhancements filed, particle bounds, ROADMAP updated.

### Sprint 11: Quality of Life ✅
Quest markers (!) above NPCs, NPCs inside building interiors, pause menu with settings, title screen (New Game/Continue), terrain-specific footstep sounds, NPC walk animations.

### Sprint 12: Crafting + Fencing ✅
Crafting bench (8 recipes: fence posts, cheese, circuit boards, shed upgrade, citadel materials), fencing system (craft from wood, place with R, animals respect fences), decorative items (torch, flower pot, bitcoin sign).

### Sprint 13: Visual Polish ✅ (2026-03-30)
- Perlin noise terrain rendering (grass, paths, sand, stone, dirt — no more checkerboard)
- Stardew-style edge blending (soft grass↔path↔dirt transitions, corner arcs)
- Ground clutter (twigs, pebbles, weeds scattered on grass)
- Beautiful water (Perlin colors, animated caustic light patterns, curved wave highlights)
- Lush trees (tapered trunks with bark detail, 5-layer elliptical canopies, dappled light, root bumps)
- Animated shoreline foam
- Rich stone/cliff/mushroom/flower/rock detail
- 9 unique NPC pixel art characters with personality (Saylor has laser eyes!)
- Building interaction fixes (no ghost rigs, shop works inside, less sensitive doors)
- Energy system with depletion (actions cost energy, passive drain, speed penalty at 0)
- Missing crop products fixed (potato/tomato/corn/pumpkin harvesting works)

---

## 🔨 In Progress: Sprint 14 — NPC Quests & Circular Economy

> 🎯 Goal: Meaningful NPC interactions, request chains, and a self-sustaining Bitcoin circular economy

- [ ] **NPC request system** — NPCs ask for specific items, reward with sats/hearts/recipes
- [ ] **Pizza Pete quest chain** — needs wheat → dough, tomatoes → sauce, cheese → pizza
- [ ] **Tavern menu** — buy food/beer from barkeep, too many beers = drunk effect
- [ ] **Crafting chains** — wheat + tomato + cheese = pizza, milk → cheese → dishes
- [ ] **Recipe unlocks** — fulfilling NPC requests unlocks new crafting recipes
- [ ] **Circular economy loop** — farm → craft → sell/trade → unlock → expand
- [ ] **NPC daily schedules** — NPCs walk between locations (home → work → tavern → sleep)
- [ ] **Gift system** — give items to NPCs, each has preferences (+/- hearts)
- [ ] **Seasonal crops** — different crops available per season

---

## 📋 Upcoming Sprints

### Sprint 15: P2P Trading
Haggle mechanic, Lightning invoices, barter, traveling merchant, black market, fiat inflation visualization.

### Sprint 16: The Mines (Dungeon)
Abandoned data center, procedural floors, hardware loot, combat (malware bots), boss (Pool Operator).

### Sprint 17: Bitcoin World
Fiatropolis (dystopian city), Cypherpunk Underground, Volcano mining, Lightning fast travel, conferences.

### Sprint 18: Story Completion
24 seed fragments with history flashbacks, Uncle Toshi's journal, 4 endings, Blocksize Wars quest.

### Sprint 19: Custom Art
Original 16x16 sprite sheets, proper character animations (4-dir walk cycles), seasonal repaints, pixel art soundtrack.

### Sprint 20: Code Modularization
Split game.js (~4600 lines) into modules: engine, world, entities, systems, ui, data. ES modules, event system, data-driven configs.

### Sprint 21: Godot Port
Port to Godot 4, native builds, controller support, Steam integration.

---

## 🧡 Bitcoin Culture

**8 NPCs:** Hodl Hannah, Leverage Larry, Mayor Keynesian, Ruby, The Hermit, Saylor, Pizza Pete, Farmer Pete

**25+ Events:** China bans (47th time), FTX collapse, nation-state adoption, Pizza Day, whale moves, Nostr trending

**24 BIP39 Words:** Each unlocks Bitcoin history (Genesis Block, Pizza Transaction, Mt. Gox, UASF, SegWit, Lightning, Taproot, ETF...)

---

## 🐛 Open Issues

**Bugs:** All critical bugs fixed. See [Issues](https://github.com/Bender21m/satoshi-valley/issues).

**Enhancements:** #28-#35 (NPCs in buildings, quest markers, title screen, fencing, pause menu, crafting, citadel interiors, terrain sounds)

---

*Built with love by the Satoshi Valley team — Last updated: 2026-03-30*

---

## 🎬 Opening Cinematic Vision

The intro sequence sets the emotional stakes. Currently text-on-black — the vision is illustrated pixel art scenes:

**Scene 1: "Chancellor on brink..."** — Newspaper headline on a desk, rain on windows, grey Fiatropolis skyline
**Scene 2: "One person saw this..."** — Silhouette at a computer screen, green terminal text, Genesis Block mining
**Scene 3: "21 million coins"** — Gold ₿ coins falling, counter ticking up, white paper floating
**Scene 4: "Fiatropolis printed and printed"** — Dystopian city: neon CBDC ads, bread line, price boards with ridiculous numbers
**Scene 5: "A letter arrived"** — Envelope on doormat, wax seal with ₿, warm light from inside
**Scene 6: Uncle Toshi's letter** — Handwritten letter, old mining rig in background, mountain valley through window
**Scene 7: "The seed is split"** — 24 puzzle pieces scattered across a map of the valley
**Scene 8: "He left you everything"** — Pan across the valley at dawn — your homestead, the shed, mountains, river
**Scene 9: Title card** — "SATOSHI VALLEY" in pixel art with animated ₿ particles, sunrise behind mountains

Each scene = a 16:9 pixel art illustration with parallax layers and subtle animation. This is the first impression — it needs to be **breathtaking**.

---

## 🏆 Endgame: Hyperbitcoinization

The game doesn't end when you find all 24 seed words. That's Act 3. The true endgame:

### Act 4: The Tipping Point
- Fiatropolis citizens start arriving in the valley (refugees from inflation)
- You help them set up nodes, wallets, mining
- Village economy fully transitions to Bitcoin standard
- Mayor Keynesian has a crisis of faith (redemption arc)
- Lightning Network connects the valley to the world

### Act 5: Hyperbitcoinization
- The Fiat Bank collapses (dramatic event sequence)
- Fiatropolis reaches out for help
- Player chooses: help rebuild on Bitcoin, or isolate the citadel
- Global adoption event — the whole world map changes
- Your citadel becomes a beacon

### New Game+
- Restart with upgraded knowledge, tools carry over
- Harder difficulty: faster market cycles, more FUD events
- New NPC interactions (they remember you)
- Hidden content only accessible in NG+
- Secret 25th seed word
- Compete for fastest hyperbitcoinization speedrun

### Prestige System
- Each NG+ cycle unlocks cosmetic upgrades
- Bitcoin-themed character skins (laser eyes, space suit, cypherpunk hoodie)
- Citadel visual themes (cyberpunk, solarpunk, mountain fortress)
- Custom rig skins
- Achievement trophies displayed in citadel

---

## 📐 10-Year Vision (Extended Plan)

### Years 1-5 (2026-2030): Core Game
As documented above — prototype → Early Access → full release → console → expansions.

### Years 6-7 (2031-2032): Multiplayer Era
- Persistent online valleys (visit friends)
- Cooperative citadel building
- Inter-valley Lightning Network trading
- Seasonal community events (real-world halving celebrations)
- Competitive mining pool tournaments

### Years 8-9 (2033-2034): The Platform
- Full modding SDK
- Community marketplace for mods/content
- Educational mode (schools and onboarding)
- VR exploration mode
- Documentary companion content (real Bitcoin history)

### Year 10 (2035): Legacy
- Satoshi Valley becomes THE cultural artifact of the Bitcoin era
- Open-source the engine
- Community-maintained forever
- The game that taught a generation about sound money

---
