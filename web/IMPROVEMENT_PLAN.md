# Satoshi Valley — Comprehensive Improvement Plan

## Executive Summary
After analyzing all 6,781 lines of game.js, I've identified **81 Math.sin/cos calls**, **28 performance.now() calls**, and **17 getHour() calls** — many redundant per frame. Below is a prioritized plan with concrete code changes.

---

## TOP 10 CONCRETE CHANGES (with code snippets)

### 1. PERFORMANCE: Per-Frame Trig/Time Cache (HIGHEST IMPACT)
**Lines affected: 3590-4800, 6623-6679**
**Problem:** Every tile/decor draw calls `performance.now()/1000`, `getHour()`, `Math.sin(t*...)` independently. With ~100 visible tiles + ~50 decor items, that's 150+ redundant performance.now() calls and hundreds of redundant trig calls per frame.

**Fix — Add frame cache at top of draw():**
```javascript
// Add at line 6623, inside draw() before any rendering:
const _now = performance.now();
const _t = _now / 1000;
const _hour = getHour();
const _isNight = _hour < 6 || _hour > 20;
const _dayOv = getDayOv();
// Pre-compute common trig values used in water, tree sway, animations
const _sinT08 = Math.sin(_t * 0.8);
const _sinT15 = Math.sin(_t * 1.5);
const _sinT18 = Math.sin(_t * 1.8);
const _sinT2 = Math.sin(_t * 2);
const _sinT3 = Math.sin(_t * 3);
const _cosT = Math.cos(_t);
```

Then pass or use globals. The biggest wins:
- **drawTile (line 3593):** `const t=performance.now()/1000` — replace with `_t` (called per visible tile, ~100x/frame)
- **drawDecor (line 3850):** `const t = performance.now()/1000` — replace with `_t` (~50x/frame)
- **drawPlaced (line 4742-4797):** Multiple `performance.now()` — replace with `_now`
- **drawRig (line 5224):** `const t = performance.now()/1000` — replace with `_t`
- **drawNPC (line 4975, 5076, 5182):** `performance.now()` — replace with `_now`

**Estimated savings:** 150-200 fewer performance.now() calls/frame, ~300 fewer Math.sin/cos calculations.

---

### 2. PERFORMANCE: Entity Sort Optimization
**Line 6676:** `entities.sort((a,b)=>a.y-b.y)`
**Problem:** Array.sort uses TimSort which is great for random data but this array changes minimally between frames — entities move slowly so they're nearly sorted already.

**Fix — Use insertion sort for nearly-sorted data (O(n) best case vs O(n log n)):**
```javascript
// Replace line 6676 with:
// Insertion sort — optimal for nearly-sorted arrays (entities barely move frame to frame)
for (let i = 1; i < entities.length; i++) {
  const key = entities[i];
  let j = i - 1;
  while (j >= 0 && entities[j].y > key.y) {
    entities[j + 1] = entities[j];
    j--;
  }
  entities[j + 1] = key;
}
```

**Estimated savings:** 3-5x faster sort for typical 100-200 entity counts since only 1-2 swaps needed per frame.

---

### 3. PERFORMANCE: fbm() called per visible grass/dirt/stone tile every frame
**Lines 3599-3600, 3640, 3653, 3680, 3694, 3707, 3723, 3734, 3770, 3775, 3783**
**Problem:** `fbm()` is expensive (4 octaves of Perlin noise) and is called 2x per grass tile. With ~100 visible tiles, that's ~200 fbm() calls per frame for STATIC terrain that never changes.

**Fix — Cache fbm results in a Float32Array at map generation:**
```javascript
// Add after line 1321 (after map array declaration):
const tileColorCache = new Float32Array(MAP_W * MAP_H * 2); // 2 noise values per tile
// In generateMap(), after terrain generation (~line 1341):
for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
  const idx = (y * MAP_W + x) * 2;
  tileColorCache[idx] = fbm(x * 0.15 + 0.5, y * 0.15 + 0.5, 2);
  tileColorCache[idx + 1] = fbm(x * 0.3 + 10, y * 0.3 + 10, 2);
}
// Then in drawTile, replace fbm() calls with lookups:
// const gn = tileColorCache[(y * MAP_W + x) * 2];
// const gn2 = tileColorCache[(y * MAP_W + x) * 2 + 1];
```

**Estimated savings:** Eliminates ~200 fbm() calls per frame (~800 perlin() calls). Massive win.

---

### 4. VISUAL: Star Field at Night
**Lines 6691-6693 (day/night overlay area)**
**Add starfield rendering before the night overlay:**
```javascript
// Insert before line 6693 (before the day/night overlay):
if (!interior && _isNight) {
  // Star field — fixed positions, twinkle with sin
  const starSeed = 42;
  const starRng = rng32(starSeed);
  ctx.fillStyle = '#FFF';
  for (let i = 0; i < 80; i++) {
    const sx = starRng() * canvas.width;
    const sy = starRng() * canvas.height * 0.6;
    const brightness = 0.3 + starRng() * 0.7;
    const twinkle = Math.sin(_t * (1.5 + starRng() * 3) + i) * 0.3;
    ctx.globalAlpha = Math.max(0, (brightness + twinkle) * dn.a * 1.5);
    const size = starRng() < 0.1 ? 2 : 1;
    ctx.fillRect(sx, sy, size, size);
  }
  ctx.globalAlpha = 1;
}
```

---

### 5. VISUAL: Warm Window Glow from Buildings at Night
**Lines 4269-4272 (home lantern glow) — extend to all buildings**
The tavern already has some window glow (lines 4404-4407). Extend this pattern to ALL buildings and make it more visible.

```javascript
// After existing building window drawing, for ALL buildings with windows:
// Add larger warm light pools that cast onto the ground
if (_isNight) {
  // Warm light spilling from windows onto ground (draw at building base)
  const glowPulse = 0.08 + Math.sin(_t * 1.5) * 0.02;
  ctx.fillStyle = `rgba(255,200,100,${glowPulse})`;
  // Left window light pool
  ctx.beginPath();
  ctx.ellipse(wx1 + ww/2, ry + bh + 10, ww * 1.2, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  // Right window light pool (if exists)
  if (d.w >= 6) {
    ctx.beginPath();
    ctx.ellipse(wx2 + ww/2, ry + bh + 10, ww * 1.2, 12, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}
```

---

### 6. VISUAL: Screen Shake Enhancement
**Lines 6286-6288 (mine screen shake) — already exists but weak**
**Problem:** Screen shake exists (line 713, 733, 2700, 2722, 2922, 3054) but only in mines. No feedback for farming/chopping.

**Fix — Add screen shake for impactful actions:**
```javascript
// In axe/tree chop (line 3267), after "decor.splice":
screenShake = 0.06; // Subtle shake for tree chop

// In pickaxe mining (line 3238), after "addItem('copper_ore')":
screenShake = 0.04; // Very subtle shake for mining

// In harvestCrop (line 2067), on successful harvest:
screenShake = 0.03; // Tiny satisfying shake

// Also apply screen shake in overworld draw() — currently only in drawMine():
// Add to line ~6638 area, before tile rendering:
if (screenShake > 0 && !mineFloor) {
  cam.x += (Math.random() - 0.5) * screenShake * 80;
  cam.y += (Math.random() - 0.5) * screenShake * 80;
}
```

---

### 7. GAMEPLAY: Quick Stack / Sort Inventory
**Lines 1279-1285 (inventory system)**
**Problem:** No way to organize inventory. Items accumulate randomly.

**Fix — Add Q key to quick-sort inventory:**
```javascript
// Add after line 2811 (key handling section):
if (jp['q'] && invOpen) {
  // Quick-sort inventory: tools first, then mats, food, seeds, deco
  const typeOrder = {tool:0, rig:1, power:2, upgrade:3, mat:4, crop:5, food:6, seed:7, supply:8, deco:9, quest:10, placeable:11, animal:12};
  const items = inv.filter(s => s != null);
  items.sort((a, b) => {
    const ta = typeOrder[ITEMS[a.id]?.type] ?? 99;
    const tb = typeOrder[ITEMS[b.id]?.type] ?? 99;
    return ta - tb || a.id.localeCompare(b.id);
  });
  inv.length = 0;
  for (let i = 0; i < INV_SIZE; i++) inv.push(items[i] || null);
  sfx.interact();
  notify('📦 Inventory sorted!', 1.5);
}
```

Also add to CONTROLS_LIST: `['Q', 'Sort inventory (when open)']`

---

### 8. BUG FIX: isSolid() fences linear scan
**Line 1733:** `if(!interior&&fences.some(f=>f.x===tx&&f.y===ty))return true;`
**Problem:** Linear O(n) scan of all fences on EVERY collision check. With many fences, this becomes a performance bottleneck.

**Fix — Use a Set for O(1) lookup:**
```javascript
// Replace fences array (line 1969) with both array and Set:
const fences = []; // [{x,y}] tile coords
const fenceSet = new Set(); // "x,y" strings for O(1) lookup

// Helper functions:
function addFence(x, y) {
  fences.push({x, y});
  fenceSet.add(x + ',' + y);
}
function removeFence(x, y) {
  const idx = fences.findIndex(f => f.x === x && f.y === y);
  if (idx >= 0) fences.splice(idx, 1);
  fenceSet.delete(x + ',' + y);
}

// Replace line 1733 with:
if (!interior && fenceSet.has(tx + ',' + ty)) return true;
```

---

### 9. BUG FIX: Potential null reference in drawChest
**Line 5983-5993:** `ctx.fillText(ITEMS[sl.id].icon, ...)` — no null check on ITEMS[sl.id]
**Similar issue in shop sell list (line 5929):** `inv.filter(s=>s&&ITEMS[s.id].sell>0)` — if ITEMS[s.id] is undefined, `.sell` throws.

**Fix:**
```javascript
// Line 5929, replace:
const sl = inv.filter(s => s && ITEMS[s.id].sell > 0);
// With:
const sl = inv.filter(s => s && ITEMS[s.id] && ITEMS[s.id].sell > 0);

// Line 5983, add guard:
const sl = chestInv[i];
if (sl && ITEMS[sl.id]) {
  ctx.font = '28px serif'; ctx.textAlign = 'center';
  ctx.fillText(ITEMS[sl.id].icon, sx2 + ss/2, sy2 + ss/2 + 8);
  // ...
}
```

---

### 10. BUG FIX: HOE checks non-existent T.FLOWERS constant
**Line 3285:** `map[ty][tx]===T.FLOWERS` — T.FLOWERS doesn't exist! Only T.FLOWER (=10) exists.
```javascript
// Line 3285, replace:
if(map[ty]&&(map[ty][tx]===T.GRASS||map[ty][tx]===T.TALLGRASS||map[ty][tx]===T.FLOWERS)){
// With:
if(map[ty]&&(map[ty][tx]===T.GRASS||map[ty][tx]===T.TALLGRASS||map[ty][tx]===T.FLOWER)){
```
**Impact:** Currently the hoe silently fails on flower tiles because `T.FLOWERS` is `undefined`, so the comparison always fails.

---

## ADDITIONAL PRIORITIZED IMPROVEMENTS

### PERFORMANCE (Priority: High)

**P1. Water tile rendering is extremely expensive**
Lines 3732-3766: Each water tile does 8+ Math.sin/cos calls, 4 arc draws, quadratic curves, and 4 neighbor checks with foam. For a lake with 50+ visible water tiles, this is ~400 trig calls.
- **Fix:** Pre-compute `wt = _t * 1.5 + x * 0.5 + y * 0.3` once and share common sin values. Cache foam neighbor checks since they don't change.

**P2. getSeasonalColor() called per tree in drawDecor**
Lines 3870-3871: Called for every tree, but returns the same value all frame.
- **Fix:** Cache `_seasonLeaf` and `_seasonLeafLight` at frame start in draw().

**P3. Mouse hover iterates ALL entities every mousemove**
Lines 173-184: Every mouse move checks ALL npcs, animals, rigs, crops.
- **Fix:** Only check when mouse actually moves more than 5px. Add throttle.

**P4. decor array searched linearly for mine_entrance**
Line 3032: `decor.find(d=>d.type==='mine_entrance'&&...)` — searches all ~1000+ decor items.
- **Fix:** Cache mine entrance position in a variable.

### VISUAL IMPROVEMENTS (Priority: Medium)

**V1. Improved particle system for mining**
Lines 5305-5308: Mining particles are basic random dots.
- **Fix:** Add proper upward-floating sparkle particles with size fade and slight horizontal drift.

**V2. Better transition effects**
Lines 6757-6762: Transitions are simple linear black fades.
- **Fix:** Add a circular iris-wipe effect or diamond transition for building entry/exit.

**V3. Day/night ambient color shift**
Currently the night overlay is a flat rgba fill. Add:
- Blue-tinted ambient light at dusk
- Warm orange tones at dawn
- The `getDayOv()` function already handles this but the rendering is just a solid rect

**V4. Crop growth visual stages**
Lines 6029-6061: Crops just show emoji icons with no animation.
- **Fix:** Add subtle sway animation, soil moisture visual, and leaf particles when harvesting.

### GAMEPLAY QUICK WINS (Priority: Medium)

**G1. Shift+Click already works for placement (line 207-244) — add tooltip**
Players don't know about Shift+Click placement. Add a hint in the tutorial.

**G2. Auto-feed animals from chest**
Lines 2556-2564: Animals check inventory then chest for feed — GOOD, already implemented. But no visual indicator for "auto-fed from chest."

**G3. Stack splitting**
No way to split item stacks. Add right-click on inventory slot to split.

**G4. Keyboard shortcut for "use food"**
Currently must select food + press R. Add a quick-eat shortcut (e.g., F key eats first food item).

**G5. Better HUD information density**
Line 5337-5377: HUD panel is large (290x256px) but could show more:
- Add total hash rate per second (sats/s estimate)
- Show next halving countdown
- Show active buff timers (coffee, beer)

**G6. Balance issue: Beer penalty too harsh**
Lines 3219-3224: 4 beers = lose 30 energy + negative boost. This wipes out the 80 energy gained from 4 beers. Consider making it 3 beers before sick.

**G7. Balance: Fishing rod too cheap relative to fish value**
Rod costs 500 sats, salmon sells for 300. ROI in 2 catches. Consider raising rod price or lowering fish sell price.

### BUGS FOUND (Priority: High)

**B1. T.FLOWERS typo (line 3285)** — CRITICAL, hoe broken on flower tiles
Already covered in Top 10 #10.

**B2. screenShake never decays in overworld**
Line 2932-2933: `if(screenShake>0)screenShake-=dt;` — only runs inside `if(mineFloor)` block.
If screenShake is set in overworld code, it never decays. Currently not triggered in overworld, but if shake is added (change #6), this needs fixing.
- **Fix:** Move screenShake decay to main update loop (before the mineFloor check).

**B3. initRelationships() called every NPC draw frame**
Lines 5179, 6210: `initRelationships()` is called in drawNPC() and drawNPCHearts() — every frame, for every NPC. It creates objects for NPCs not yet in the map.
- **Fix:** Call once at game init and after loadGame, not in render loop.

**B4. Memory leak: weather.particles and ambient arrays grow unbounded during pause**
Line 3457-3468: Rain particles keep spawning but if game is paused (pauseOpen), the update loop returns early (line 2527), so particles never get cleaned up. When unpaused, there could be a burst.
- **Fix:** Already handled since update returns during pause, preventing new particles. However, particles that were alive when paused will all decay at once. Minor visual glitch, not a real leak.

**B5. Shop double-click timing uses performance.now() globally**
Line 171/364: `lastShopClickTime` is shared across buy/sell modes. If you click sell and quickly switch to buy, the double-click timer could trigger an unintended purchase.
- **Fix:** Reset `lastShopClickTime` when switching modes (line 2838).

**B6. Seed fragment search radius inconsistency**
Line 1560: The code tries to detect if a seed fragment was successfully moved but checks position against `fx` (the clamped original), not a reliable indicator. Could place fragments on top of each other.
- **Fix:** Track placed fragments in a Set and check for duplicates.

**B7. crops drawn before entities (line 6678)**
`for(const crop of crops) drawCrop(crop)` is called before `for(const e of entities)e.draw()`, but crops should be sorted into the entity Y-sort to draw at correct depth relative to the player and other entities.

---

## IMPLEMENTATION PRIORITY ORDER

1. **T.FLOWERS bug fix** (1 minute, fixes broken gameplay)
2. **Frame cache for performance.now() and trig** (30 minutes, biggest perf win)
3. **fbm() terrain color cache** (20 minutes, huge perf win for terrain rendering)
4. **Fence Set for collision** (15 minutes, fixes O(n) collision per movement)
5. **Entity insertion sort** (5 minutes, sort optimization)
6. **Star field at night** (10 minutes, high visual impact)
7. **Window glow enhancement** (15 minutes, atmosphere)
8. **Screen shake for farming** (10 minutes, game feel)
9. **Inventory sort** (10 minutes, quality of life)
10. **Null reference guards** (5 minutes, crash prevention)

Total estimated time: ~2-3 hours for all Top 10 changes.

---

## ✅ COMPLETED (Sprint 17 — Hermes, 2026-04-06)

### Wave 1:
- [x] T.FLOWERS bug fix (hoe works on flower tiles)
- [x] Frame cache for performance.now() and trig
- [x] fbm() terrain color cache (Float32Array)
- [x] Fence Set for O(1) collision
- [x] Entity insertion sort
- [x] Star field at night (100 twinkling stars)
- [x] Screen shake for tree chop + tilling
- [x] Inventory sort (Q key)
- [x] Null reference guards (shop, chest)
- [x] initRelationships removed from render loop
- [x] screenShake decay moved to main update

### Wave 2:
- [x] Warm window light pools (home + tavern) at night
- [x] Replaced ALL remaining performance.now() in render with cached _now/_t
- [x] Replaced getHour() in drawing with cached _hour/_isNight

### Wave 3:
- [x] HUD shows sats/second mining rate
- [x] Improved energy bar (larger, color-coded, low energy warning flash)
- [x] Quick eat (G key) — eats best food, handles boosts
- [x] Updated controls bar with G:Eat and Q:Sort
