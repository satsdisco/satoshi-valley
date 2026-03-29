# SATOSHI VALLEY — Game Design Document
### Version 0.1 | March 2026

---

## 1. VISION

**One-liner:** A farming/life sim where you inherit a run-down Bitcoin node farm and build it into a sovereign citadel — set against a world trapped in fiat decay.

**Elevator pitch:** Stardew Valley meets the Bitcoin standard. You're a burnt-out fiat wage slave who inherits your mysterious uncle's property in a forgotten valley. What starts as fixing up old mining rigs becomes a journey through Bitcoin's history, philosophy, and culture — wrapped in an addictive life sim with deep economic systems, memorable characters, and a story about what money really means.

**Why this game needs to exist:**
- No game has ever captured Bitcoin culture authentically
- The farming/life sim genre is proven and beloved
- Bitcoin's real history is more dramatic than most fiction
- The economic mechanics of Bitcoin (scarcity, halvings, difficulty adjustment) naturally create incredible gameplay systems
- A decade of development means we can build something with Dwarf Fortress-level depth under Stardew-level charm

**Target audience:**
- Primary: Farming sim / cozy game fans (massive market, 30M+ Stardew copies sold)
- Secondary: Bitcoiners who want to see their culture represented authentically
- Tertiary: Anyone who likes pixel art RPGs with deep systems
- The game should be fun even if you've never heard of Bitcoin. The Bitcoin layer is a bonus, not a barrier.

**Design pillars:**
1. **Fun first** — Every mechanic must be enjoyable independent of the Bitcoin theme
2. **Earn your sovereignty** — Progression = becoming more self-sovereign
3. **Teach without preaching** — Players learn Bitcoin through gameplay, not lectures
4. **Depth beneath simplicity** — Easy to start, endlessly deep
5. **Community is everything** — NPCs, multiplayer, modding support

---

## 2. GAME OVERVIEW

**Genre:** Life simulation / farming sim / RPG  
**Engine:** Godot 4  
**Platforms:** PC (Steam) first → Mac/Linux → Switch → Mobile (long term)  
**Perspective:** Top-down 2D, 16-bit pixel art  
**Camera:** Fixed orthographic with subtle parallax  
**Players:** Single-player (multiplayer co-op in later phases)  
**Price:** $24.99 (no microtransactions, ever)  
**Content rating:** E10+ (some themes of financial ruin, mild humor)  
**Save system:** Per-slot saves, manual + sleep auto-save  

---

## 3. SETTING & WORLD

### 3.1 The Valley

**Satoshi Valley** — a once-thriving mining town nestled between mountains, now in decline. The nearby city of **Fiatropolis** has been printing money for decades, and the valley's been forgotten. Your uncle was the last person running nodes out here.

The world is divided into regions:

**The Homestead (Starting Area)**
- Your uncle's property — overgrown, run-down
- Old mining shed with one broken ASIC
- A small cabin (upgradeable to a full citadel)
- Garden plots for food (you still gotta eat)
- Room for node infrastructure, solar panels, batteries

**The Village (Social Hub)**
- ~20 NPCs with daily routines
- General store, tavern, town hall
- The Fiat Bank (antagonist institution)
- Community center (restoration = main quest line)
- Weekly market days

**The Mines (Exploration/Adventure)**
- Abandoned data center beneath the mountains
- Dungeon-crawling meets hardware salvage
- Find old GPUs, ASICs, server racks, cooling systems
- Deeper levels = better hardware but more dangerous
- Boss encounters = corrupted mining pools

**The Forest (Gathering)**
- Wood for building, herbs for cooking
- Hidden clearings with Bitcoin history Easter eggs
- The hermit's cabin (Hal Finney-inspired NPC)

**Fiatropolis (Late Game)**
- The city across the bridge
- Debt-ridden, surveillance state, CBDC everywhere
- Missions to help citizens escape the fiat system
- The final confrontation with the Central Bank

**The Underground (Secret)**
- Cypherpunk bunker network
- Unlocked through story progression
- Contains the deepest lore and hardest content

### 3.2 Time System

**One in-game day = 18 real minutes** (adjustable in settings)

Time is structured around **Halving Cycles** instead of traditional seasons:

| Cycle Phase | Real-World Equivalent | Vibe | Duration |
|---|---|---|---|
| **Accumulation** | Spring | Quiet, cheap sats, building time | 28 days |
| **Hype** | Summer | Tourists arrive, prices rise, energy high | 28 days |
| **Euphoria** | Fall | Everything pumping, harvest time, peak prices | 28 days |
| **Capitulation** | Winter | Crash, FUD, survival mode, introspection | 28 days |

**One full cycle = 112 in-game days ≈ 33.6 real hours**

After 4 full cycles = 1 Halving Event (major story beat + block reward reduction)

The game's main story spans **3 Halvings** (~400 hours for completionists).

### 3.3 Weather & Events

- Power outages (affects mining)
- Network congestion (mempool mechanics)
- FUD storms (China bans Bitcoin — again)
- Bull run festivals
- Eclipse attacks (seasonal threat)
- Difficulty adjustment every 14 in-game days

---

## 4. CORE MECHANICS

### 4.1 Mining

Your primary income source. Not just "place rig, get money" — it's a real system:

**Hardware:**
- **CPUs** (early game) — low hash rate, low power, nostalgic
- **GPUs** (mid game) — better performance, need cooling
- **ASICs** (late game) — serious hash rate, serious power/heat management
- Each unit has: hash rate, power draw, heat output, noise level, durability
- Hardware degrades over time, needs maintenance
- Can be overclocked (risk/reward)

**Power Management:**
- Start with grid power (expensive, unreliable)
- Build solar panels, wind turbines, hydro
- Battery storage for overnight/cloudy days
- Power grid balancing minigame
- Stranded energy discovery (late game — methane flaring, etc.)

**Heat & Cooling:**
- Rigs generate heat
- Need ventilation, fans, immersion cooling (late game)
- Overheat = hardware damage
- Clever: route heat to greenhouse for food growing in winter

**The Mining Minigame:**
- Not just passive income
- Occasionally find blocks (lottery mechanic with actual probability)
- Finding a block is a HUGE event early game
- Can join mining pools (trade variance for steady income)
- Solo mining vs pool mining = real strategic choice

**Difficulty Adjustment:**
- As you (and NPCs) add more hash rate, difficulty increases
- Mirrors real Bitcoin — prevents runaway inflation
- Creates natural economic pressure

### 4.2 Node Running

**Running a Bitcoin node = raising livestock equivalent**

- Full node: validates all transactions, earns respect/reputation
- Lightning node: opens channels, routes payments, earns fees
- Each node needs: hardware, bandwidth, uptime
- Node uptime affects your reputation in the valley

**Lightning Network:**
- Open channels with NPCs and other players
- Route payments for fees
- Channel management is a puzzle mechanic
- Lightning = fast travel system on the map (thematic!)

### 4.3 Building & Crafting

**Your Homestead:**
- Cabin → House → Compound → Citadel (4 upgrade tiers)
- Each tier unlocks new rooms/functions
- Faraday cage room (protects against EMP events)
- Cold storage vault
- War room (late game planning)
- Guest quarters (for NPCs who join your citadel)

**Crafting System:**
- Build mining rigs from components
- Solder circuits (minigame)
- Assemble cooling systems
- Craft mesh network repeaters
- Build renewable energy systems
- Cooking (food buffs for productivity)

### 4.4 Farming (Yes, Actual Farming)

You still need to eat. Food ≠ optional.

- Small garden plots for vegetables
- Greenhouse (heated by mining rigs!)
- Cooking recipes with buffs
- Can sell food at market for sats
- Bee-keeping (honey = trade good)
- Goats (because every Bitcoiner needs a citadel with goats)

### 4.5 Economy

**Currency: Satoshis (sats)**
- 100,000,000 sats = 1 BTC (accurate)
- All prices in sats
- Prices fluctuate with market cycles
- Your purchasing power INCREASES over time (deflationary!)

**Fiat Contrast:**
- The village shop has some items priced in "FiatBucks"
- FiatBuck prices go UP every cycle (inflation!)
- NPCs complain about rising prices
- The Bank offers "stimulus" that causes more inflation
- Players viscerally experience fiat vs Bitcoin

**Trade:**
- Weekly market with traveling merchants
- Barter system with NPCs
- Lightning payments for instant settlement
- On-chain payments for large purchases (with fee/confirmation mechanics)
- Black market in Fiatropolis (privacy tools)

**The Cantillon Effect (in-game):**
- NPCs closest to the Fiat Bank get money first, buy cheap
- By the time prices reach regular villagers, everything's expensive
- Players can see this happening in real-time
- Teaches the most important concept in monetary economics through gameplay

### 4.6 Social System

**Relationships:**
- Friendship levels with all NPCs (0-10 hearts, like Stardew)
- Gift giving, quests, daily conversations
- Romance options (4-6 romanceable characters)
- Marriage + partnership (spouse helps with operations)
- Rivalry system (some NPCs oppose your choices)

**Reputation:**
- **Sovereignty Score** — how self-sufficient you are
- **Community Trust** — how much the valley trusts you
- **Node Reputation** — uptime, validation accuracy
- These affect prices, NPC interactions, story paths

### 4.7 Exploration & Combat

**The Mines/Data Center:**
- Procedurally generated floors
- Find hardware components, rare materials
- Environmental puzzles (reroute power, fix networks)
- Enemies: malware bots, script kiddies, 51% attack swarms
- Combat is simple but satisfying (Stardew-style with upgrades)
- Boss: The Pool Operator (controls hashrate, must be defeated)

**The Forest:**
- Foraging, woodcutting, discovery
- Hidden locations with lore
- Seasonal changes affect what's available

---

## 5. NARRATIVE

### 5.1 Main Story

**Act 1: The Inheritance (Cycles 1-4)**
You arrive in Satoshi Valley. Your uncle left you everything — a run-down property, some old hardware, and a letter:

> "I've been running the last node in this valley for 15 years. They'll tell you I was crazy. Maybe I was. But someone has to keep the chain alive. The seed is split into 24 pieces. Find them all, and you'll understand everything. — Uncle Toshi"

You fix up the homestead, meet the villagers, learn the basics. The first halving happens. You find the first few seed phrase fragments.

**Act 2: The Awakening (Cycles 5-8)**
The village is struggling. The Fiat Bank is tightening control. You start converting villagers to a Bitcoin standard. The community center restoration begins — each room requires collective effort and represents a Bitcoin milestone (genesis block, first transaction, etc.).

Political tension rises. The Bank sends an agent. Some NPCs resist change. You explore the abandoned data center and learn the valley's history — it was once a thriving cypherpunk community.

Second halving. Your operation is growing. More seed fragments found.

**Act 3: The Citadel (Cycles 9-12)**
Full confrontation with the fiat system. Fiatropolis is in crisis. Citizens are fleeing. You can help them or focus on your own sovereignty. The final seed fragments are in the most dangerous locations.

Third halving. You assemble the complete seed phrase. It doesn't unlock money — it unlocks your uncle's message: the history of how Bitcoin was created, told through an interactive flashback sequence.

The ending depends on your choices:
- **Full Sovereignty** — your citadel is self-sufficient, the valley thrives on a Bitcoin standard
- **Community Builder** — you've helped everyone transition, less personal wealth but stronger community
- **The Diplomat** — you found a way to coexist with Fiatropolis, pragmatic but compromised
- **The Maximalist** — you went full toxic maxi, valley is a fortress, outsiders not welcome

No ending is "wrong." All are valid philosophies within Bitcoin culture.

### 5.2 Side Stories

- **The Silk Road** — a morally grey questline about privacy and freedom
- **The Pizza Quest** — find and deliver 10,000 BTC worth of pizza (historical)
- **The Fork Wars** — a village schism that mirrors the blocksize debate
- **The Lost Keys** — help an NPC recover a lost wallet (tragedy/comedy)
- **The Bitfinex Heist** — detective questline
- **Mt. Gox Memorial** — emotional questline about loss and recovery
- **The 21 Million Club** — secret society with endgame content

---

## 6. CHARACTERS

### 6.1 Main Cast

**Uncle Toshi** (deceased, present through letters/recordings)
- The Satoshi figure — never fully revealed
- Left clues throughout the valley
- His recordings teach you Bitcoin gradually

**Mayor Keynesian**
- Runs the village, allied with the Fiat Bank
- Not evil — genuinely believes fiat helps people
- Can be convinced over time (long redemption arc)
- Comic relief with his money-printing schemes

**Hodl Hannah** ❤️ (Romanceable)
- Diamond hands incarnate. Never sold, never will.
- Runs a small node farm, lives simply
- Teaches you patience and conviction
- Romance arc: she tests if you're a real hodler

**Leverage Larry** 💀
- Degenerate trader, always 100x long
- Alternates between "we're all gonna make it" and sleeping on your couch
- Comic relief but also genuinely tragic
- Has a redemption arc if you help him

**Ruby the Miner** ⛏️ (Romanceable)
- Hardware wizard, can build anything
- Lives in the mines, socially awkward
- Teaches you crafting and tech tree
- Romance arc: connecting through building things together

**Saylor** 🏦 (Romanceable)
- Former bank executive who defected
- Brings institutional knowledge
- Helps with large-scale operations later
- Romance arc: trust issues from her fiat past

**The Hermit (Hal)** 🌲
- Lives deep in the forest
- Cryptography expert, knows your uncle
- Teaches the philosophical side of Bitcoin
- Has a devastating backstory revealed slowly
- Named as subtle tribute to Hal Finney

**Shitcoin Sam** 🐍
- Charismatic, always has a new token launch
- The Joja Corp equivalent — tempts you with shortcuts
- His products always fail eventually
- Can be reformed or defeated (player choice)

**Agent CBDC** 🕴️
- Sent by Fiatropolis to "help" the village
- Surveillance, control, "consumer protection"
- Becomes the primary antagonist in Act 2-3
- Represents central bank digital currencies

**The Pleb Council** (5 NPCs)
- Village elders who govern by rough consensus
- Each represents a Bitcoin archetype:
  - The Developer (builds tools)
  - The Educator (runs workshops)
  - The Artist (Bitcoin-themed art)
  - The Merchant (local businesses)
  - The Activist (privacy/freedom fighter)

### 6.2 Villagers (~20 total)

Each with daily routines, preferences, birthdays, gift preferences, and unique dialogue that changes with story progression and relationship level. Full character bios to be developed in pre-production.

---

## 7. ART DIRECTION

### 7.1 Visual Style

- **16-bit pixel art** — detailed but not overwhelming
- **Color palette:** Warm earth tones + Bitcoin orange (#F7931A) as accent
- Night scenes: deep blues/purples with orange rig glows
- UI: Clean, minimal, orange accent on dark backgrounds

**Visual Identity:**
- Mining rigs should glow and hum (visible even from outside buildings)
- Lightning network connections shown as actual lightning between buildings
- The valley looks warmer as you progress (literal warmth from mining)
- Fiatropolis is grey, cold, sterile — visual contrast

### 7.2 UI/UX

- Inventory system: grid-based, simple (Stardew-style)
- Mining dashboard: clean stats view (hashrate, power, heat, income)
- Node monitor: network visualization
- Wallet: balance, transactions, UTXO view (optional detail)
- Map: gradually revealed, with fast travel via Lightning

### 7.3 Animation

- Character animations: 4-direction walk, run, tool use
- Mining rigs: idle hum, active mining, overheating, breakdown
- Weather particles: rain, snow, FUD storms (red tint)
- Day/night cycle with smooth transitions

---

## 8. AUDIO

### 8.1 Music

- **Accumulation:** Ambient, lo-fi, peaceful (think Stardew spring but with subtle electronic elements)
- **Hype:** Upbeat, building energy, synthwave touches
- **Euphoria:** Full energy, triumphant, celebration
- **Capitulation:** Melancholic, stripped back, piano-driven
- **Mining shed:** Rhythmic electronic that syncs with rig activity
- **The Mines:** Dark ambient, tension, discovery
- **Fiatropolis:** Corporate muzak, soul-crushing, deliberately annoying

### 8.2 Sound Design

- Mining rig hum (iconic, satisfying)
- Block found notification (most satisfying sound in the game)
- Lightning payment zap
- Sat stacking sound (coins, but digital)
- UI sounds: minimal, crisp
- Nature: birds, wind, water, seasonal changes

---

## 9. TECHNICAL ARCHITECTURE

### 9.1 Engine & Stack

- **Engine:** Godot 4.x (GDScript primary, C# for performance-critical systems)
- **Rendering:** 2D with lighting/shader effects
- **Save format:** JSON (human-readable, moddable)
- **Config:** TOML
- **Version control:** Git (GitHub)
- **CI/CD:** GitHub Actions
- **Build targets:** Windows, macOS, Linux (Steam), later Switch/Mobile

### 9.2 Key Systems

**Economy Simulation:**
- Discrete event simulation for market cycles
- NPC economic agents with simple behavior models
- Supply/demand curves for all tradeable items
- Inflation simulation for fiat-priced goods
- Halving events trigger systemic changes

**World Simulation:**
- Tile-based map with chunk loading
- Day/night cycle with lighting system
- Weather system affecting gameplay
- NPC schedule system (daily routines)
- Farming growth system with environmental factors

**Mining Simulation:**
- Real hashrate/difficulty math (simplified but accurate in principle)
- Power grid simulation (generation, storage, consumption)
- Heat propagation (affects nearby tiles)
- Probability-based block discovery
- Pool mechanics (variance reduction)

**Dialogue System:**
- Branching dialogue trees
- Relationship-aware responses
- Story-state-aware content
- Localization-ready from day one

**Modding Support (Phase 4+):**
- Custom NPCs, items, events
- Map editor
- Scripting API for new mechanics
- Steam Workshop integration

### 9.3 Performance Targets

- 60fps on integrated graphics (2020 era)
- <2 second load times
- <500MB install size (at launch)
- Save files < 1MB

---

## 10. DEVELOPMENT ROADMAP

### Year 1-2 (2026-2027): Foundation

**Q2 2026 — Learning & Prototyping**
- Learn Godot 4 fundamentals
- Build movement, tile system, day/night cycle
- Prototype mining rig placement + power mechanic
- Playtest core loop with placeholder art

**Q3-Q4 2026 — Core Systems**
- Economy simulation v1
- Mining mechanics complete
- Basic NPC system (schedules, dialogue)
- Farming basics
- First pass at art style (style guide, key sprites)

**Q1-Q2 2027 — Vertical Slice**
- One complete halving cycle playable
- 5 NPCs fully implemented
- Mining + farming + building all functional
- Art style locked in
- Internal playtesting begins

**Q3-Q4 2027 — Alpha**
- 2 full halving cycles
- 10+ NPCs
- Main story Act 1 complete
- Mines/dungeon system
- Crafting system
- Closed alpha testing (trusted friends)

### Year 3-4 (2028-2029): Content & Polish

**2028 — Beta**
- Full main story (3 acts)
- All 20+ NPCs
- All regions accessible
- Economy balanced
- Side quests 50%+
- Open beta (Steam Next Fest demo)

**2029 — Release Prep**
- Content complete
- Polish pass (animations, particles, juice)
- Sound design & music finalized
- QA, bug fixing, optimization
- Localization (EN, ES, PT, JP minimum)
- Marketing ramp-up
- **Steam Early Access launch (late 2029)**

### Year 5-6 (2030-2031): Launch & Post-Launch

**2030 — Full Release**
- v1.0 launch on Steam (Win/Mac/Linux)
- Post-launch patches and balance
- Community feedback integration
- Begin console port preparation

**2031 — Expansion**
- Switch port
- First major content update
- Multiplayer co-op beta
- Modding tools v1

### Year 7-10 (2032-2036): Legacy

**2032-2033**
- Multiplayer launch
- Mobile ports
- Major expansion: "The Blocksize Wars" (new region, story, characters)
- Steam Workshop / mod support

**2034-2036**
- Community-driven content
- Expansion 2: "The Lightning Era"
- Potential sequel planning
- The game becomes a living document of Bitcoin culture

---

## 11. TEAM & RESOURCES

### Starting (Solo/Small Team)
- **Game Designer / Writer** — you (with my help on docs and design)
- **Art** — learn pixel art OR commission (Fiverr/dedicated artist later)
- **Music** — commission or collaborate
- **Programming** — you + Godot community resources

### Growth Plan
- Year 1-2: Solo or 1-2 people
- Year 3-4: Core team of 3-5
- Year 5+: 5-8 people
- Consider Bitcoin grants (OpenSats, HRF, Spiral) for funding

### Budget Considerations (Early Phase)
- Godot: Free
- Art assets: $0 (learning) to $2-5K (commissioned)
- Music: $1-3K for soundtrack
- Sound effects: $200-500 (libraries + custom)
- Steam: $100 (developer fee)
- Marketing: $0 initially (build in public, Bitcoin community)
- Total Year 1: $0 - $5,000

---

## 12. MARKETING & COMMUNITY

**Build in public from Day 1:**
- Devlog on Nostr (primary — it's where Bitcoiners are)
- Twitter/X for broader reach
- YouTube devlogs (monthly progress)
- Steam page up early for wishlists
- Discord community for playtesting

**Bitcoin Community Leverage:**
- Present at Bitcoin conferences (Amsterdam, Nashville, Prague)
- Podcast appearances
- Bitcoin grants for funding
- Collaborate with Bitcoin educators
- The game itself is orange-pilling tool

**Organic Marketing:**
- The concept sells itself to Bitcoiners
- Stardew fans are always looking for the next thing
- "Bitcoin Stardew Valley" is a headline that writes itself
- Streamers/YouTubers will cover this

---

## 13. RISKS & MITIGATIONS

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Scope creep | High | High | Strict phase gates, MVP mindset |
| Burnout (solo dev) | High | Critical | Sustainable pace, take breaks, get help |
| Bitcoin price crash kills interest | Medium | Medium | Game is fun regardless of Bitcoin sentiment |
| "Too niche" perception | Medium | Medium | Fun first, Bitcoin second in marketing |
| Technical debt | Medium | High | Clean architecture from day 1, refactor early |
| Art quality inconsistent | Medium | Medium | Style guide, hire artist when budget allows |
| Feature creep in economy sim | High | Medium | Start simple, add complexity in layers |

---

## 14. SUCCESS METRICS

**Prototype (6 months):**
- Core loop is fun for 30+ minutes
- 3 people outside the team say "I want to keep playing"

**Alpha (18 months):**
- 2+ hour play sessions feel natural
- Economy doesn't break
- Players understand Bitcoin concepts without being told

**Launch:**
- 10,000+ wishlists before Early Access
- 85%+ positive Steam reviews
- Players who don't know Bitcoin learn something
- Players who know Bitcoin feel represented

**Long-term:**
- 100,000+ copies sold
- Active modding community
- Recognized as THE Bitcoin game
- Referenced in Bitcoin culture the way Stardew is referenced in farming sim culture

---

## 15. IMMEDIATE NEXT STEPS

### This Week
1. ✅ Game Design Document (this file)
2. Set up Godot 4 development environment
3. Create project repository on GitHub
4. Start Godot tutorial (official "Your First 2D Game")

### This Month
5. Build basic tile map + character movement
6. Implement day/night cycle
7. Create first mining rig object (place, power, earn)
8. Draft art style guide with reference images

### This Quarter
9. Playable prototype of core mining loop
10. 3 NPCs with basic dialogue
11. Simple economy (buy/sell at shop)
12. First round of playtesting

---

*This is a living document. Update it as the game evolves.*
*The best games are discovered through making them, not just designing them.*
*Start building. Iterate. Trust the process.*

---

**Document authored by:** Flexo (AI) & Satsdisco (Human)  
**Last updated:** 2026-03-29  
**Status:** Draft v0.1
