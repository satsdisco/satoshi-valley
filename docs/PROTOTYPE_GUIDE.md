# Satoshi Valley — Prototype Setup Guide

## What's Included

The scripts are ready. You need to wire them up in Godot's editor.

### Scripts

| Script | Purpose |
|---|---|
| `scripts/player.gd` | Character movement (WASD/arrows), interaction (E), rig placement (R) |
| `scripts/mining_rig.gd` | Mining rig with hashrate, power, heat, durability, sat generation |
| `scripts/economy.gd` | Global economy: wallet, market cycles, difficulty adjustment |
| `scripts/day_night_cycle.gd` | 18-minute day cycle with color-graded lighting |
| `scripts/hud.gd` | On-screen display: sats, time, hashrate, phase |
| `scripts/camera.gd` | Smooth follow camera |

### Pre-built Scenes

| Scene | Purpose |
|---|---|
| `scenes/objects/mining_rig.tscn` | Mining rig object (needs collision shape tweaked) |

---

## Setup Steps in Godot

### 1. Create the Autoload (Singleton)

The Economy manager needs to be a global autoload:

1. Go to **Project → Project Settings → Autoload**
2. Add `res://scripts/economy.gd` with name `Economy`
3. Click "Add"

### 2. Set Up Input Map

Go to **Project → Project Settings → Input Map** and add:

| Action | Key |
|---|---|
| `move_up` | W / Arrow Up |
| `move_down` | S / Arrow Down |
| `move_left` | A / Arrow Left |
| `move_right` | D / Arrow Right |
| `interact` | E |
| `place_rig` | R |

### 3. Create the Main Scene

Create `scenes/main/main.tscn`:

```
Main (Node2D)
├── TileMapLayer (TileMapLayer)    — your ground tiles
├── Player (CharacterBody2D)       — attach player.gd
│   ├── AnimatedSprite2D           — player sprite/animations
│   ├── CollisionShape2D           — player hitbox (small circle)
│   └── InteractionRay (RayCast2D) — for interacting with objects
├── Camera2D                       — attach camera.gd
├── DayNightCycle (CanvasModulate) — attach day_night_cycle.gd
└── HUD (CanvasLayer)              — attach hud.gd
    ├── MarginContainer
    │   └── VBoxContainer
    │       ├── SatsLabel (Label)
    │       ├── TimeLabel (Label)
    │       ├── DayLabel (Label)
    │       ├── HashrateLabel (Label)
    │       └── PhaseLabel (Label)
    └── BlockNotification (Label)
```

### 4. Quick Placeholder Art

Until we have real sprites, use Godot's built-in:

- **Player:** Use a `ColorRect` (16x16, orange #F7931A) inside the AnimatedSprite2D, or a simple sprite
- **Mining Rig:** Use a `ColorRect` (16x16, gray) 
- **Tiles:** Create a simple TileSet with colored squares (green = grass, brown = dirt, gray = stone)

### 5. Create a Basic TileSet

1. Select the TileMapLayer node
2. In the inspector, create a new TileSet
3. Add a simple atlas texture (or use Godot's default)
4. Paint a small map (32x32 tiles is fine for testing)

### 6. Test It

1. Press F5 (or the Play button)
2. WASD to move
3. R to place a mining rig
4. E to interact (toggle rig power)
5. Watch sats accumulate in the HUD
6. Watch the day/night cycle change lighting

---

## What Each System Does

### Mining Rigs
- 3 tiers: CPU → GPU → ASIC (only CPU available at start)
- Generate sats every 2 seconds based on hashrate
- Heat up over time — overheat at 85°C, stop mining
- Degrade with use — need repair eventually
- Tiny chance to "find a block" (jackpot!)

### Economy
- Start with 1,000 sats
- Market cycles: Accumulation → Hype → Euphoria → Capitulation (28 days each)
- Difficulty increases as you add more hashrate
- Fiat prices inflate 5% per cycle (shops with fiat prices get more expensive)

### Day/Night
- Full day = 18 real minutes
- Beautiful color transitions: dawn → morning → noon → sunset → night
- Time displayed on HUD

---

## Next Steps After Prototype Works

1. **Real pixel art** — player character, mining rigs, tiles
2. **Tilemap** — build out the homestead area
3. **Shop NPC** — buy/sell items for sats
4. **Inventory system** — carry items, tools
5. **Save/load** — persist game state
6. **Sound** — mining hum, block found notification, ambient
