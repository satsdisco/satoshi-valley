// ============================================================
// SATOSHI VALLEY — v0.3 "The Economy Update"
// A Bitcoin farming sim — Stardew Valley meets the Bitcoin Standard
// ============================================================

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// ---- RESPONSIVE FULLSCREEN ----
function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
window.addEventListener('resize', resize);
resize();

// ---- AUDIO CONTEXT (Web Audio API) ----
let audioCtx = null;
function initAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}
document.addEventListener('click', initAudio, { once: true });
document.addEventListener('keydown', initAudio, { once: true });

function playTone(freq, dur, type = 'square', vol = 0.08) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  gain.gain.setValueAtTime(vol, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + dur);
}

function sfxPlace() { playTone(220, 0.15, 'square', 0.06); setTimeout(() => playTone(330, 0.1, 'square', 0.05), 80); }
function sfxInteract() { playTone(440, 0.08, 'sine', 0.05); }
function sfxBuy() { playTone(523, 0.1, 'sine', 0.06); setTimeout(() => playTone(659, 0.1, 'sine', 0.05), 100); setTimeout(() => playTone(784, 0.15, 'sine', 0.06), 200); }
function sfxError() { playTone(180, 0.2, 'sawtooth', 0.04); }
function sfxBlockFound() {
  [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => playTone(f, 0.3, 'sine', 0.08), i * 120));
}
function sfxCoin() { playTone(880, 0.06, 'sine', 0.03); setTimeout(() => playTone(1100, 0.08, 'sine', 0.03), 60); }
function sfxRepair() { playTone(300, 0.08, 'square', 0.04); setTimeout(() => playTone(400, 0.08, 'square', 0.04), 100); setTimeout(() => playTone(500, 0.1, 'square', 0.04), 200); }
function sfxFootstep() { if (Math.random() < 0.3) playTone(80 + Math.random()*40, 0.04, 'triangle', 0.015); }
function sfxMenuOpen() { playTone(600, 0.06, 'sine', 0.04); playTone(800, 0.08, 'sine', 0.03); }
function sfxMenuClose() { playTone(800, 0.06, 'sine', 0.03); playTone(600, 0.08, 'sine', 0.04); }

// Mining hum (ambient)
let miningHumGain = null;
let miningHumOsc = null;
function updateMiningHum(hashrate) {
  if (!audioCtx) return;
  if (hashrate > 0 && !miningHumOsc) {
    miningHumOsc = audioCtx.createOscillator();
    miningHumGain = audioCtx.createGain();
    miningHumOsc.type = 'sine';
    miningHumOsc.frequency.setValueAtTime(55, audioCtx.currentTime);
    miningHumGain.gain.setValueAtTime(0, audioCtx.currentTime);
    miningHumOsc.connect(miningHumGain);
    miningHumGain.connect(audioCtx.destination);
    miningHumOsc.start();
  }
  if (miningHumGain) {
    const targetVol = Math.min(0.02, hashrate * 0.002);
    miningHumGain.gain.setTargetAtTime(hashrate > 0 ? targetVol : 0, audioCtx.currentTime, 0.5);
  }
}

// ---- CONSTANTS ----
const TILE = 16, SCALE = 3, ST = TILE * SCALE;
const MAP_W = 80, MAP_H = 60;
const FONT = '"Courier New", monospace';

// ---- INPUT ----
const keys = {}, justPressed = {};
document.addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (!keys[k]) justPressed[k] = true;
  keys[k] = true;
  if (!['f5','f11','f12'].includes(k)) e.preventDefault();
});
document.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
document.addEventListener('keydown', e => {
  if (e.key === 'f' || e.key === 'F') {
    if (!document.fullscreenElement) canvas.requestFullscreen();
    else document.exitFullscreen();
  }
});

// ---- SEEDED RNG ----
function mulberry32(a) {
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
}

// ---- COLORS ----
const C = {
  grass: ['#2D5A1E','#3A6C1E','#4A7C2E','#3E7225'],
  grassFlower: ['#E8C840','#D04040','#6060D0','#E870B0'],
  dirt: ['#8B6914','#7B5904','#9B7924'],
  stone: ['#606060','#707070','#808080'],
  water: ['#1A5588','#2266AA','#2870B8'],
  sand: ['#D4B870','#C4A860','#E4C880'],
  woodWall: '#6B4320', woodFloor: '#A08050', roof: '#8B2020',
  path: ['#A09070','#B0A080','#908060'], fence: '#8B6340',
  orange: '#F7931A', darkOrange: '#C47415', skin: '#FFD5A0', hair: '#503214',
  rigBody: '#555555', rigDark: '#333333', rigLight: '#777777',
  ledGreen: '#00FF00', ledRed: '#FF0000', ledOrange: '#F7931A',
  hud: '#F7931A', hudBg: 'rgba(10,10,10,0.88)', hudBorder: '#F7931A',
  white: '#FFF', black: '#000', red: '#FF4444', green: '#44FF44',
  blue: '#4488FF', gold: '#FFD700', gray: '#888',
  phaseColors: ['#4488FF','#44FF44','#FFD700','#FF4444'],
  solar: '#2244AA',
};

// ============================================================
// ITEMS DATABASE
// ============================================================
const ITEMS = {
  wrench: { name: 'Wrench', desc: 'Repairs mining rigs (+25 durability)', icon: '🔧', type: 'tool', buyPrice: 200, sellPrice: 80, stackable: true },
  pickaxe: { name: 'Pickaxe', desc: 'Mine resources in the mountains', icon: '⛏️', type: 'tool', buyPrice: 300, sellPrice: 120, stackable: true },
  cpu_miner: { name: 'CPU Miner', desc: '1 TH/s — Old school but reliable', icon: '💻', type: 'rig', tier: 0, buyPrice: 500, sellPrice: 200, stackable: true },
  gpu_rig: { name: 'GPU Rig', desc: '5 TH/s — Serious mining power', icon: '🖥️', type: 'rig', tier: 1, buyPrice: 5000, sellPrice: 2000, stackable: true },
  asic_s21: { name: 'ASIC S21', desc: '50 TH/s — Industrial grade beast', icon: '⚡', type: 'rig', tier: 2, buyPrice: 50000, sellPrice: 20000, stackable: true },
  solar_panel: { name: 'Solar Panel', desc: 'Generates 2 kW of clean power', icon: '☀️', type: 'power', buyPrice: 1500, sellPrice: 600, stackable: true },
  battery: { name: 'Battery Pack', desc: 'Stores power for night time', icon: '🔋', type: 'power', buyPrice: 2000, sellPrice: 800, stackable: true },
  cooling_fan: { name: 'Cooling Fan', desc: 'Place near rigs to reduce heat', icon: '🌀', type: 'upgrade', buyPrice: 800, sellPrice: 300, stackable: true },
  bread: { name: 'Bread', desc: 'Simple food. Restores energy.', icon: '🍞', type: 'food', buyPrice: 50, sellPrice: 20, stackable: true },
  coffee: { name: 'Coffee', desc: 'Speed boost for 30 seconds', icon: '☕', type: 'food', buyPrice: 100, sellPrice: 40, stackable: true },
  copper_ore: { name: 'Copper Ore', desc: 'Mined from the mountains', icon: '🪨', type: 'material', buyPrice: 0, sellPrice: 50, stackable: true },
  silicon: { name: 'Silicon', desc: 'Used in crafting electronics', icon: '💎', type: 'material', buyPrice: 0, sellPrice: 100, stackable: true },
  seed_fragment: { name: 'Seed Fragment', desc: 'Part of Uncle Toshi\'s seed phrase', icon: '🧩', type: 'quest', buyPrice: 0, sellPrice: 0, stackable: false },
};

// ============================================================
// INVENTORY SYSTEM
// ============================================================
const INVENTORY_SIZE = 20; // 5x4 grid
const inventory = []; // { id, quantity }
let selectedSlot = 0;

function addItem(id, qty = 1) {
  const item = ITEMS[id];
  if (!item) return false;
  if (item.stackable) {
    const existing = inventory.find(s => s && s.id === id);
    if (existing) { existing.quantity += qty; return true; }
  }
  const empty = inventory.findIndex((s, i) => !s || s.quantity <= 0);
  if (empty === -1 && inventory.length >= INVENTORY_SIZE) return false;
  if (empty >= 0) { inventory[empty] = { id, quantity: qty }; }
  else { inventory.push({ id, quantity: qty }); }
  return true;
}

function removeItem(id, qty = 1) {
  const slot = inventory.find(s => s && s.id === id && s.quantity >= qty);
  if (!slot) return false;
  slot.quantity -= qty;
  if (slot.quantity <= 0) { const i = inventory.indexOf(slot); inventory[i] = null; }
  return true;
}

function hasItem(id, qty = 1) {
  const slot = inventory.find(s => s && s.id === id);
  return slot && slot.quantity >= qty;
}

function getItemCount(id) {
  const slot = inventory.find(s => s && s.id === id);
  return slot ? slot.quantity : 0;
}

function getSelectedItem() {
  if (selectedSlot >= 0 && selectedSlot < inventory.length && inventory[selectedSlot]) {
    return inventory[selectedSlot];
  }
  return null;
}

// ============================================================
// POWER SYSTEM
// ============================================================
const power = {
  generation: 0,  // kW from solar etc
  consumption: 0, // kW from rigs
  stored: 0,      // kWh in batteries
  maxStorage: 0,  // kWh capacity
  gridCost: 10,   // sats per kW per tick from grid
  solarPanels: [], // placed solar panels {x, y}
  batteries: [],   // placed batteries {x, y}
};

function updatePower(dt) {
  // Solar generation (only during day)
  const h = getHour();
  const sunFactor = (h >= 6 && h <= 20) ? Math.sin((h - 6) / 14 * Math.PI) : 0;
  power.generation = power.solarPanels.length * 2 * sunFactor;
  power.maxStorage = power.batteries.length * 10;
  
  // Rig consumption
  power.consumption = 0;
  for (const rig of rigs) {
    if (rig.powered && rig.durability > 0) {
      power.consumption += [0.3, 1.2, 3.0][rig.tier];
    }
  }
  
  // Charge batteries with surplus
  const surplus = power.generation - power.consumption;
  if (surplus > 0) {
    power.stored = Math.min(power.maxStorage, power.stored + surplus * dt * 0.1);
  } else if (surplus < 0) {
    // Draw from batteries
    const deficit = -surplus;
    if (power.stored > 0) {
      power.stored = Math.max(0, power.stored - deficit * dt * 0.1);
    } else {
      // Pay grid cost
      const gridPay = Math.ceil(deficit * power.gridCost * dt * 0.01);
      player.wallet = Math.max(0, player.wallet - gridPay);
    }
  }
}

// ============================================================
// MAP
// ============================================================
const T = {
  GRASS:0, DIRT:1, STONE:2, WATER:3, PATH:4,
  WOOD_WALL:5, WOOD_FLOOR:6, SAND:7, FENCE:8,
  DEEP_WATER:9, FLOWERS:10, TALL_GRASS:11, SHOP_FLOOR:12,
};
const SOLID = new Set([T.WATER, T.WOOD_WALL, T.DEEP_WATER, T.FENCE]);
const map = [];
const decorations = [];

function generateMap() {
  const rng = mulberry32(2009);
  for (let y = 0; y < MAP_H; y++) { map[y] = []; for (let x = 0; x < MAP_W; x++) map[y][x] = T.GRASS; }
  
  // River
  let riverY = 10;
  for (let x = 0; x < MAP_W; x++) {
    riverY += Math.round((rng() - 0.5) * 1.5);
    riverY = Math.max(5, Math.min(15, riverY));
    for (let dy = -1; dy <= 1; dy++) { const ry = riverY + dy; if (ry >= 0 && ry < MAP_H) map[ry][x] = dy === 0 ? T.DEEP_WATER : T.WATER; }
    for (let dy = -2; dy <= 2; dy++) { const ry = riverY + dy; if (ry >= 0 && ry < MAP_H && map[ry][x] === T.GRASS && rng() < 0.6) map[ry][x] = T.SAND; }
  }
  
  // Lake
  const lakeX = 58, lakeY = 42;
  for (let dy = -5; dy <= 5; dy++) for (let dx = -7; dx <= 7; dx++) {
    const dist = Math.sqrt(dx*dx*0.7 + dy*dy), ty = lakeY+dy, tx = lakeX+dx;
    if (ty >= 0 && ty < MAP_H && tx >= 0 && tx < MAP_W) {
      if (dist < 3.5) map[ty][tx] = T.DEEP_WATER;
      else if (dist < 4.5) map[ty][tx] = T.WATER;
      else if (dist < 5.5 && rng() < 0.5) map[ty][tx] = T.SAND;
    }
  }
  
  // Buildings
  buildCabin(35, 30, 7, 6);  // Home
  buildCabin(20, 28, 6, 5);  // Mining shed
  buildShop(28, 42, 8, 6);   // Shop
  
  // Paths
  for (let x = 22; x <= 38; x++) { setTile(x, 36, T.PATH); if (rng() < 0.3) setTile(x, 35, T.PATH); }
  for (let y = 36; y <= 48; y++) { setTile(35, y, T.PATH); setTile(36, y, T.PATH); }
  for (let y = 33; y <= 36; y++) setTile(22, y, T.PATH);
  for (let y = 18; y <= 30; y++) setTile(35, y, T.PATH);
  // Path to shop
  for (let x = 32; x <= 36; x++) setTile(x, 45, T.PATH);
  for (let y = 42; y <= 48; y++) { setTile(32, y, T.PATH); }
  
  // Bridge
  for (let y = 0; y < MAP_H; y++) {
    if (map[y][35] === T.WATER || map[y][35] === T.DEEP_WATER) { map[y][35] = T.WOOD_FLOOR; map[y][36] = T.WOOD_FLOOR; }
  }
  
  // Garden
  for (let y = 31; y <= 35; y++) for (let x = 44; x <= 52; x++) setTile(x, y, T.DIRT);
  for (let x = 43; x <= 53; x++) { setTile(x, 30, T.FENCE); setTile(x, 36, T.FENCE); }
  for (let y = 30; y <= 36; y++) { setTile(43, y, T.FENCE); setTile(53, y, T.FENCE); }
  setTile(48, 36, T.PATH);
  
  // Forest
  for (let y = 20; y < MAP_H - 5; y++) for (let x = 2; x < 15; x++) {
    if (rng() < 0.15) decorations.push({ x, y, type: 'tree', variant: Math.floor(rng() * 3) });
    if (rng() < 0.1) map[y][x] = T.TALL_GRASS;
  }
  
  // Mountains
  for (let y = 1; y < 7; y++) for (let x = 1; x < MAP_W - 1; x++)
    if (map[y][x] !== T.WATER && map[y][x] !== T.DEEP_WATER && rng() < 0.5) map[y][x] = T.STONE;
  
  // Decorations
  for (let i = 0; i < 30; i++) { const fx = 15+Math.floor(rng()*50), fy = 20+Math.floor(rng()*35); if (map[fy] && map[fy][fx] === T.GRASS) map[fy][fx] = T.FLOWERS; }
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) if (map[y][x] === T.GRASS && rng() < 0.04) map[y][x] = T.TALL_GRASS;
  
  // Border
  for (let x = 0; x < MAP_W; x++) { map[0][x] = T.STONE; map[MAP_H-1][x] = T.STONE; }
  for (let y = 0; y < MAP_H; y++) { map[y][0] = T.STONE; map[y][MAP_W-1] = T.STONE; }
}

function buildCabin(cx, cy, w, h) {
  for (let y = cy; y < cy+h; y++) for (let x = cx; x < cx+w; x++)
    map[y][x] = (y===cy||y===cy+h-1||x===cx||x===cx+w-1) ? T.WOOD_WALL : T.WOOD_FLOOR;
  map[cy+h-1][cx+Math.floor(w/2)] = T.PATH;
}

function buildShop(cx, cy, w, h) {
  for (let y = cy; y < cy+h; y++) for (let x = cx; x < cx+w; x++)
    map[y][x] = (y===cy||y===cy+h-1||x===cx||x===cx+w-1) ? T.WOOD_WALL : T.SHOP_FLOOR;
  map[cy+h-1][cx+Math.floor(w/2)] = T.PATH;
}

function setTile(x, y, t) { if (y >= 0 && y < MAP_H && x >= 0 && x < MAP_W) map[y][x] = t; }
function isSolid(tx, ty) { if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return true; return SOLID.has(map[ty][tx]); }

// ============================================================
// PLAYER
// ============================================================
const player = {
  x: 35*TILE+8, y: 38*TILE+8,
  speed: 90, facing: {x:0, y:-1},
  wallet: 2500, totalEarned: 0,
  walkFrame: 0, walkTimer: 0, isMoving: false,
  speedBoost: 0, // coffee timer
  energy: 100, maxEnergy: 100,
};

// ============================================================
// MINING RIGS
// ============================================================
const rigs = [];
class MiningRig {
  constructor(x, y, tier = 0) {
    this.x = x; this.y = y; this.tier = tier;
    this.powered = true;
    this.hashrate = [1.0, 5.0, 50.0][tier];
    this.heat = [0.2, 0.8, 2.0][tier];
    this.temperature = 20; this.durability = 100;
    this.overheating = false; this.satsMined = 0;
    this.mineAcc = 0; this.heatAcc = 0;
    this.animFrame = 0; this.animTimer = 0;
  }
  static NAMES = ['CPU Miner', 'GPU Rig', 'ASIC S21'];
  static COLORS = ['#555555', '#666699', '#997733'];
  
  update(dt) {
    this.animTimer += dt;
    if (this.animTimer > 0.3) { this.animTimer = 0; this.animFrame = (this.animFrame+1) % 4; }
    
    // Cooling fans nearby reduce heat
    let coolBonus = 0;
    for (const item of placedItems) {
      if (item.type === 'cooling_fan' && Math.hypot(item.x - this.x, item.y - this.y) < TILE * 3) coolBonus += 0.15;
    }
    
    this.heatAcc += dt;
    if (this.heatAcc >= 1) {
      this.heatAcc = 0;
      if (this.powered && this.durability > 0) this.temperature += this.heat * 3;
      this.temperature -= (this.temperature - 20) * (0.06 + coolBonus);
      this.temperature = Math.max(15, Math.min(100, this.temperature));
      if (this.temperature >= 85) this.overheating = true;
      if (this.temperature < 65) this.overheating = false;
    }
    
    if (!this.powered || this.durability <= 0 || this.overheating) return 0;
    
    this.mineAcc += dt;
    let earned = 0;
    if (this.mineAcc >= 2) {
      this.mineAcc = 0;
      const heatPen = 1 - Math.max(0, Math.min(0.5, (this.temperature-70)/30));
      const durPen = this.durability / 100;
      const effective = this.hashrate * heatPen * durPen;
      earned = Math.max(1, Math.floor(effective * 10 / economy.difficulty));
      this.satsMined += earned;
      
      if (Math.random() < effective * 0.0001) {
        const reward = 312500;
        earned += reward; this.satsMined += reward;
        notifications.push({ text: '⛏️ BLOCK FOUND! +312,500 sats!', timer: 6, big: true });
        sfxBlockFound();
      }
      this.durability = Math.max(0, this.durability - 0.03);
    }
    return earned;
  }
  
  getStatus() {
    if (this.durability <= 0) return 'BROKEN';
    if (this.overheating) return 'OVERHEAT';
    if (!this.powered) return 'OFF';
    return Math.floor(this.hashrate * (this.durability/100) / economy.difficulty * 10) + ' s/s';
  }
  getStatusColor() {
    if (this.durability <= 0) return C.red;
    if (this.overheating) return C.ledOrange;
    if (!this.powered) return C.gray;
    return C.ledGreen;
  }
}

// Placed world items (solar panels, fans, batteries)
const placedItems = [];

// ============================================================
// NPCs
// ============================================================
const npcs = [
  {
    name: 'Hodl Hannah', x: 46*TILE+8, y: 33*TILE+8,
    color: '#FF69B4', hairColor: '#FFD700', role: 'friend',
    dialogue: [
      '"The garden grows slow, but it grows forever."',
      '"I bought my first sats at 60k. Still hodling."',
      '"Your uncle taught me everything about nodes."',
      '"Don\'t listen to Leverage Larry. Just stack."',
      '"Have you checked on the rigs today? Durability matters."',
    ],
    walkPath: [{x:46,y:33},{x:50,y:33},{x:50,y:35},{x:46,y:35}],
    pathIndex: 0, moveTimer: 0, moveInterval: 3,
  },
  {
    name: 'Leverage Larry', x: 28*TILE+8, y: 40*TILE+8,
    color: '#4444FF', hairColor: '#222222', role: 'friend',
    dialogue: [
      '"Bro, 100x long. Can\'t go tits up."',
      '"I\'m either getting a lambo or sleeping on your couch."',
      '"This time is different. Trust me."',
      '"Down 90% but still bullish."',
      '"You should put ALL your sats into ASICs. Trust me bro."',
    ],
    walkPath: [{x:28,y:40},{x:32,y:40},{x:32,y:42},{x:28,y:42}],
    pathIndex: 0, moveTimer: 0, moveInterval: 2,
  },
  {
    name: 'Mayor Keynesian', x: 40*TILE+8, y: 45*TILE+8,
    color: '#888888', hairColor: '#AAAAAA', role: 'friend',
    dialogue: [
      '"We need more stimulus for the village!"',
      '"A little inflation never hurt anyone."',
      '"Your uncle was... eccentric. But respected."',
      '"The Fiat Bank has the village\'s best interests at heart."',
      '"You know, if we just printed more FiatBucks everyone would be happier."',
    ],
    walkPath: [{x:40,y:45},{x:42,y:45},{x:42,y:47},{x:40,y:47}],
    pathIndex: 0, moveTimer: 0, moveInterval: 4,
  },
  {
    name: 'Ruby the Miner', x: 31*TILE+8, y: 45*TILE+8,
    color: '#CC4444', hairColor: '#FF6644', role: 'shopkeeper',
    dialogue: [
      '"Welcome to my shop! Press [B] to browse."',
      '"I\'ve got everything from CPUs to ASICs."',
      '"Need a wrench? Your rigs won\'t fix themselves."',
      '"Solar panels are the future. Off-grid is the way."',
    ],
    walkPath: [{x:31,y:45},{x:33,y:45}],
    pathIndex: 0, moveTimer: 0, moveInterval: 5,
  },
  {
    name: 'The Hermit', x: 8*TILE+8, y: 35*TILE+8,
    color: '#336633', hairColor: '#555555', role: 'friend',
    dialogue: [
      '"I knew your uncle. He was the last true cypherpunk."',
      '"Privacy is not secrecy. A private matter is something one doesn\'t want the whole world to know."',
      '"If you find pieces of the seed phrase... be careful who you tell."',
      '"The trees remember everything. Unlike blockchains, they can\'t be pruned."',
      '"Running a node isn\'t about profit. It\'s about verification."',
    ],
    walkPath: [{x:8,y:35},{x:6,y:35},{x:6,y:38},{x:8,y:38}],
    pathIndex: 0, moveTimer: 0, moveInterval: 6,
  },
];

// ============================================================
// SHOP SYSTEM
// ============================================================
const SHOP_ITEMS = ['wrench','pickaxe','cpu_miner','gpu_rig','asic_s21','solar_panel','battery','cooling_fan','bread','coffee'];
let shopOpen = false;
let shopCursor = 0;
let shopMode = 'buy'; // 'buy' or 'sell'

// ============================================================
// UI STATE
// ============================================================
let activeDialogue = null;
let inventoryOpen = false;
let gameMenu = null; // null, 'save', 'load'

// ============================================================
// ECONOMY
// ============================================================
const economy = {
  difficulty: 1.0, phase: 0,
  phaseNames: ['Accumulation', 'Hype', 'Euphoria', 'Capitulation'],
  phaseDays: 0, cycle: 0, fiatInflation: 1.0, halvings: 0,
};

// ============================================================
// TIME
// ============================================================
const time = { dayLength: 180, current: 0.25, day: 1, speed: 1, totalDays: 1 };
function getHour() { return time.current * 24; }
function getTimeStr() { const h = Math.floor(getHour()), m = Math.floor((getHour()-h)*60); return `${h%12||12}:${m.toString().padStart(2,'0')} ${h<12?'AM':'PM'}`; }
function getPeriod() { const h = getHour(); if(h<5) return 'Night'; if(h<7) return 'Dawn'; if(h<12) return 'Morning'; if(h<14) return 'Noon'; if(h<17) return 'Afternoon'; if(h<21) return 'Evening'; return 'Night'; }
function getDayOverlay() {
  const h = getHour();
  if(h<5) return{r:15,g:15,b:40,a:0.55}; if(h<6) return{r:60,g:40,b:60,a:lp(0.45,0.2,h-5)}; if(h<7) return{r:180,g:140,b:100,a:lp(0.2,0.05,h-6)};
  if(h<17) return{r:255,g:255,b:240,a:0}; if(h<19) return{r:220,g:130,b:60,a:lp(0,0.15,(h-17)/2)}; if(h<21) return{r:80,g:60,b:100,a:lp(0.15,0.4,(h-19)/2)};
  return{r:20,g:20,b:50,a:lp(0.4,0.55,(h-21)/3)};
}
function lp(a,b,t) { return a+(b-a)*Math.max(0,Math.min(1,t)); }

// ============================================================
// PARTICLES & NOTIFICATIONS
// ============================================================
const particles = [];
function spawnSatParticle(x, y, amount) { particles.push({ x: x*SCALE, y: y*SCALE, text: `+${fmt(amount)}`, life: 1.5, vy: -30 }); }
const notifications = [];
function notify(text, timer = 2.5, big = false) { notifications.push({ text, timer, big }); }

// ============================================================
// CAMERA
// ============================================================
const cam = { x: 0, y: 0 };

// ============================================================
// SAVE / LOAD
// ============================================================
function saveGame() {
  const data = {
    version: 3,
    player: { x: player.x, y: player.y, wallet: player.wallet, totalEarned: player.totalEarned, energy: player.energy },
    inventory: inventory.map(s => s ? { id: s.id, quantity: s.quantity } : null),
    selectedSlot,
    rigs: rigs.map(r => ({ x: r.x, y: r.y, tier: r.tier, powered: r.powered, temperature: r.temperature, durability: r.durability, satsMined: r.satsMined })),
    placedItems: placedItems.map(i => ({ x: i.x, y: i.y, type: i.type })),
    economy: { ...economy },
    time: { ...time },
    power: { solarPanels: power.solarPanels, batteries: power.batteries },
  };
  try {
    localStorage.setItem('satoshi_valley_save', JSON.stringify(data));
    notify('💾 Game saved!', 2);
    sfxBuy();
  } catch(e) { notify('❌ Save failed!', 2); }
}

function loadGame() {
  try {
    const raw = localStorage.getItem('satoshi_valley_save');
    if (!raw) { notify('No save found!', 2); return false; }
    const data = JSON.parse(raw);
    
    player.x = data.player.x; player.y = data.player.y;
    player.wallet = data.player.wallet; player.totalEarned = data.player.totalEarned;
    player.energy = data.player.energy || 100;
    
    inventory.length = 0;
    if (data.inventory) data.inventory.forEach(s => inventory.push(s));
    selectedSlot = data.selectedSlot || 0;
    
    rigs.length = 0;
    data.rigs.forEach(rd => {
      const r = new MiningRig(rd.x, rd.y, rd.tier);
      r.powered = rd.powered; r.temperature = rd.temperature;
      r.durability = rd.durability; r.satsMined = rd.satsMined;
      rigs.push(r);
    });
    
    placedItems.length = 0;
    if (data.placedItems) data.placedItems.forEach(i => placedItems.push(i));
    
    Object.assign(economy, data.economy);
    Object.assign(time, data.time);
    
    if (data.power) {
      power.solarPanels = data.power.solarPanels || [];
      power.batteries = data.power.batteries || [];
    }
    
    notify('📂 Game loaded!', 2);
    sfxBuy();
    return true;
  } catch(e) { notify('❌ Load failed!', 2); return false; }
}

// ============================================================
// INIT
// ============================================================
generateMap();
rigs.push(new MiningRig(22*TILE+8, 30*TILE+8, 0));
rigs.push(new MiningRig(24*TILE+8, 30*TILE+8, 0));
addItem('wrench', 2);
addItem('bread', 3);

// Try auto-load
if (localStorage.getItem('satoshi_valley_save')) {
  // Don't auto-load, let player choose
}

// ============================================================
// UPDATE
// ============================================================
let lastTime = performance.now();
let placeCd = 0, interactCd = 0;
let footstepTimer = 0;

function update(dt) {
  // Time
  time.current += (dt * time.speed) / time.dayLength;
  if (time.current >= 1) {
    time.current -= 1; time.day++; time.totalDays++;
    economy.phaseDays++;
    // Auto-save each day
    if (time.day % 7 === 0) saveGame();
    if (economy.phaseDays >= 28) {
      economy.phaseDays = 0;
      economy.phase = (economy.phase + 1) % 4;
      if (economy.phase === 0) {
        economy.cycle++; economy.fiatInflation *= 1.05;
        if (economy.cycle % 4 === 0) { economy.halvings++; notify(`🔶 HALVING #${economy.halvings}! Block reward reduced!`, 6, true); }
      }
      notify(`📈 ${economy.phaseNames[economy.phase]} phase begins`, 3);
    }
  }
  
  time.speed = keys[' '] ? 15 : 1;
  
  // Coffee speed boost
  if (player.speedBoost > 0) {
    player.speedBoost -= dt;
    if (player.speedBoost <= 0) notify('☕ Coffee wore off', 1.5);
  }
  const moveSpeed = player.speed * (player.speedBoost > 0 ? 1.5 : 1);
  
  // ---- MENU INPUTS ----
  if (justPressed['b']) {
    // Check if near Ruby
    const nearRuby = npcs.find(n => n.role === 'shopkeeper' && Math.hypot(n.x - player.x, n.y - player.y) < 48);
    if (nearRuby && !shopOpen) { shopOpen = true; shopCursor = 0; shopMode = 'buy'; sfxMenuOpen(); activeDialogue = null; }
    else if (shopOpen) { shopOpen = false; sfxMenuClose(); }
  }
  
  if (justPressed['i'] || justPressed['tab']) {
    if (!shopOpen) {
      inventoryOpen = !inventoryOpen;
      inventoryOpen ? sfxMenuOpen() : sfxMenuClose();
    }
  }
  
  if (justPressed['escape']) {
    if (shopOpen) { shopOpen = false; sfxMenuClose(); }
    else if (inventoryOpen) { inventoryOpen = false; sfxMenuClose(); }
    else if (activeDialogue) { activeDialogue = null; }
  }
  
  // Save/Load
  if (justPressed['p']) saveGame();
  if (justPressed['l']) loadGame();
  
  // Inventory slot selection (1-9, 0)
  for (let n = 0; n <= 9; n++) {
    if (justPressed[n.toString()]) { selectedSlot = n === 0 ? 9 : n - 1; }
  }
  if (justPressed['q']) selectedSlot = Math.max(0, selectedSlot - 1);
  // Mouse wheel for slot selection
  
  // ---- SHOP NAVIGATION ----
  if (shopOpen) {
    if (justPressed['arrowup'] || justPressed['w']) { shopCursor = Math.max(0, shopCursor - 1); }
    if (justPressed['arrowdown'] || justPressed['s']) { shopCursor = Math.min((shopMode === 'buy' ? SHOP_ITEMS.length : inventory.filter(s=>s).length) - 1, shopCursor + 1); }
    if (justPressed['enter'] || justPressed['e']) {
      if (shopMode === 'buy') {
        const itemId = SHOP_ITEMS[shopCursor];
        const item = ITEMS[itemId];
        // Apply market multiplier
        const price = Math.ceil(item.buyPrice * getMarketMultiplier());
        if (player.wallet >= price) {
          if (addItem(itemId)) {
            player.wallet -= price;
            sfxBuy();
            notify(`Bought ${item.icon} ${item.name} for ${fmt(price)} sats`, 2);
          } else { notify('Inventory full!', 1.5); sfxError(); }
        } else { notify(`Need ${fmt(price)} sats!`, 1.5); sfxError(); }
      } else {
        const sellable = inventory.filter(s => s && ITEMS[s.id].sellPrice > 0);
        if (shopCursor < sellable.length) {
          const slot = sellable[shopCursor];
          const item = ITEMS[slot.id];
          const price = Math.ceil(item.sellPrice * getMarketMultiplier());
          removeItem(slot.id);
          player.wallet += price;
          sfxCoin();
          notify(`Sold ${item.icon} ${item.name} for ${fmt(price)} sats`, 2);
        }
      }
    }
    if (justPressed['arrowleft'] || justPressed['a'] || justPressed['arrowright'] || justPressed['d']) {
      shopMode = shopMode === 'buy' ? 'sell' : 'buy';
      shopCursor = 0;
    }
    // Clear justPressed and skip movement
    for (const k in justPressed) justPressed[k] = false;
    return;
  }
  
  // ---- PLAYER MOVEMENT ----
  if (!activeDialogue && !inventoryOpen) {
    let dx = 0, dy = 0;
    if (keys['w'] || keys['arrowup']) dy -= 1;
    if (keys['s'] || keys['arrowdown']) dy += 1;
    if (keys['a'] || keys['arrowleft']) dx -= 1;
    if (keys['d'] || keys['arrowright']) dx += 1;
    
    player.isMoving = dx !== 0 || dy !== 0;
    
    if (player.isMoving) {
      const len = Math.sqrt(dx*dx + dy*dy);
      dx /= len; dy /= len;
      player.facing = { x: dx, y: dy };
      const nx = player.x + dx * moveSpeed * dt;
      const ny = player.y + dy * moveSpeed * dt;
      const r = 5;
      const canX = !isSolid(Math.floor((nx-r)/TILE), Math.floor((player.y-r)/TILE)) &&
                   !isSolid(Math.floor((nx+r)/TILE), Math.floor((player.y+r)/TILE)) &&
                   !isSolid(Math.floor((nx-r)/TILE), Math.floor((player.y+r)/TILE)) &&
                   !isSolid(Math.floor((nx+r)/TILE), Math.floor((player.y-r)/TILE));
      const canY = !isSolid(Math.floor((player.x-r)/TILE), Math.floor((ny-r)/TILE)) &&
                   !isSolid(Math.floor((player.x+r)/TILE), Math.floor((ny+r)/TILE)) &&
                   !isSolid(Math.floor((player.x-r)/TILE), Math.floor((ny+r)/TILE)) &&
                   !isSolid(Math.floor((player.x+r)/TILE), Math.floor((ny-r)/TILE));
      if (canX) player.x = nx;
      if (canY) player.y = ny;
      
      player.walkTimer += dt;
      if (player.walkTimer > 0.15) { player.walkTimer = 0; player.walkFrame = (player.walkFrame+1) % 4; }
      
      footstepTimer += dt;
      if (footstepTimer > 0.35) { footstepTimer = 0; sfxFootstep(); }
    }
  }
  
  // ---- INTERACT ----
  interactCd -= dt;
  if (justPressed['e'] && interactCd <= 0 && !shopOpen && !inventoryOpen) {
    interactCd = 0.25;
    
    if (activeDialogue) { activeDialogue = null; }
    else {
      const ix = player.x + player.facing.x * 20;
      const iy = player.y + player.facing.y * 20;
      
      // Check rigs
      let closestRig = null, closestDist = 28;
      for (const rig of rigs) { const d = Math.hypot(rig.x-ix, rig.y-iy); if (d < closestDist) { closestRig = rig; closestDist = d; } }
      
      if (closestRig) {
        const selected = getSelectedItem();
        if (selected && selected.id === 'wrench' && closestRig.durability < 100) {
          // Repair rig
          closestRig.durability = Math.min(100, closestRig.durability + 25);
          removeItem('wrench');
          sfxRepair();
          notify(`🔧 Repaired! Durability: ${closestRig.durability.toFixed(0)}%`, 2);
        } else {
          closestRig.powered = !closestRig.powered;
          sfxInteract();
          notify(`Rig ${closestRig.powered ? 'ON ⚡' : 'OFF 💤'}`, 1.5);
        }
      } else {
        // Check NPCs
        for (const npc of npcs) {
          if (Math.hypot(npc.x-ix, npc.y-iy) < 32) {
            const line = npc.dialogue[Math.floor(Math.random() * npc.dialogue.length)];
            activeDialogue = { name: npc.name, text: line, role: npc.role };
            sfxInteract();
            break;
          }
        }
      }
    }
  }
  
  // ---- PLACE / USE ITEM ----
  placeCd -= dt;
  if (justPressed['r'] && placeCd <= 0 && !shopOpen && !inventoryOpen && !activeDialogue) {
    placeCd = 0.3;
    const selected = getSelectedItem();
    if (!selected) { notify('Select an item first (1-9)', 1.5); }
    else {
      const item = ITEMS[selected.id];
      const px = Math.round((player.x + player.facing.x * 24) / TILE) * TILE + 8;
      const py = Math.round((player.y + player.facing.y * 24) / TILE) * TILE + 8;
      const ptx = Math.floor(px / TILE), pty = Math.floor(py / TILE);
      
      if (item.type === 'rig') {
        const overlap = rigs.some(r => Math.abs(r.x-px) < TILE && Math.abs(r.y-py) < TILE);
        if (!isSolid(ptx, pty) && !overlap) {
          removeItem(selected.id);
          rigs.push(new MiningRig(px, py, item.tier));
          sfxPlace();
          notify(`⛏️ ${item.name} placed!`, 2);
        } else { notify("Can't place here!", 1.5); sfxError(); }
      }
      else if (selected.id === 'solar_panel') {
        const overlap = placedItems.some(i => Math.abs(i.x-px) < TILE && Math.abs(i.y-py) < TILE);
        if (!isSolid(ptx, pty) && !overlap) {
          removeItem('solar_panel');
          placedItems.push({ x: px, y: py, type: 'solar_panel' });
          power.solarPanels.push({ x: px, y: py });
          sfxPlace();
          notify('☀️ Solar panel placed!', 2);
        } else { notify("Can't place here!", 1.5); sfxError(); }
      }
      else if (selected.id === 'battery') {
        const overlap = placedItems.some(i => Math.abs(i.x-px) < TILE && Math.abs(i.y-py) < TILE);
        if (!isSolid(ptx, pty) && !overlap) {
          removeItem('battery');
          placedItems.push({ x: px, y: py, type: 'battery' });
          power.batteries.push({ x: px, y: py });
          sfxPlace();
          notify('🔋 Battery placed!', 2);
        } else { notify("Can't place here!", 1.5); sfxError(); }
      }
      else if (selected.id === 'cooling_fan') {
        const overlap = placedItems.some(i => Math.abs(i.x-px) < TILE && Math.abs(i.y-py) < TILE);
        if (!isSolid(ptx, pty) && !overlap) {
          removeItem('cooling_fan');
          placedItems.push({ x: px, y: py, type: 'cooling_fan' });
          sfxPlace();
          notify('🌀 Cooling fan placed!', 2);
        } else { notify("Can't place here!", 1.5); sfxError(); }
      }
      else if (selected.id === 'bread') {
        removeItem('bread');
        player.energy = Math.min(player.maxEnergy, player.energy + 30);
        sfxCoin();
        notify('🍞 Ate bread! +30 energy', 1.5);
      }
      else if (selected.id === 'coffee') {
        removeItem('coffee');
        player.speedBoost = 30;
        player.energy = Math.min(player.maxEnergy, player.energy + 10);
        sfxCoin();
        notify('☕ Speed boost for 30 seconds!', 2);
      }
      else if (selected.id === 'pickaxe') {
        // Mine stone if on stone tile
        const tx = Math.floor(player.x / TILE), ty = Math.floor(player.y / TILE);
        const targetTx = Math.floor((player.x + player.facing.x * 16) / TILE);
        const targetTy = Math.floor((player.y + player.facing.y * 16) / TILE);
        if (map[targetTy] && map[targetTy][targetTx] === T.STONE) {
          if (Math.random() < 0.5) {
            addItem('copper_ore');
            sfxRepair();
            notify('🪨 Found copper ore!', 1.5);
          } else if (Math.random() < 0.3) {
            addItem('silicon');
            sfxRepair();
            notify('💎 Found silicon!', 1.5);
          } else {
            sfxInteract();
            notify('Nothing here...', 1);
          }
        }
      }
    }
  }
  
  // ---- UPDATE SYSTEMS ----
  // NPCs
  for (const npc of npcs) {
    npc.moveTimer += dt;
    if (npc.moveTimer >= npc.moveInterval) { npc.moveTimer = 0; npc.pathIndex = (npc.pathIndex+1) % npc.walkPath.length; }
    const target = npc.walkPath[npc.pathIndex];
    const tx = target.x*TILE+8, ty = target.y*TILE+8;
    const spd = 30 * dt;
    if (Math.abs(npc.x-tx) > 1) npc.x += Math.sign(tx-npc.x) * spd;
    if (Math.abs(npc.y-ty) > 1) npc.y += Math.sign(ty-npc.y) * spd;
  }
  
  // Rigs
  let totalHash = 0;
  for (const rig of rigs) {
    const earned = rig.update(dt);
    if (earned > 0) {
      player.wallet += earned; player.totalEarned += earned;
      if (earned > 50) spawnSatParticle(rig.x, rig.y - 10, earned);
      if (earned > 5 && Math.random() < 0.1) sfxCoin();
    }
    if (rig.powered && !rig.overheating && rig.durability > 0) totalHash += rig.hashrate;
  }
  economy.difficulty = 1 + (totalHash / 10) * 0.5;
  updateMiningHum(totalHash);
  
  // Power
  updatePower(dt);
  
  // Camera
  cam.x += (player.x * SCALE - canvas.width/2 - cam.x) * 4 * dt;
  cam.y += (player.y * SCALE - canvas.height/2 - cam.y) * 4 * dt;
  
  // Particles
  for (let i = particles.length-1; i >= 0; i--) { particles[i].life -= dt; particles[i].y += particles[i].vy * dt; if (particles[i].life <= 0) particles.splice(i, 1); }
  for (let i = notifications.length-1; i >= 0; i--) { notifications[i].timer -= dt; if (notifications[i].timer <= 0) notifications.splice(i, 1); }
  
  for (const k in justPressed) justPressed[k] = false;
}

function getMarketMultiplier() {
  return [0.9, 1.1, 1.5, 0.7][economy.phase]; // Prices fluctuate with market
}

// ============================================================
// DRAWING
// ============================================================
function drawTile(x, y, tile) {
  const sx = x*ST - cam.x, sy = y*ST - cam.y;
  if (sx > canvas.width+ST || sy > canvas.height+ST || sx < -ST || sy < -ST) return;
  const v = (x*7+y*13) % 3, t = performance.now() / 1000;
  
  switch(tile) {
    case T.GRASS: ctx.fillStyle = C.grass[v]; ctx.fillRect(sx,sy,ST,ST);
      if ((x*3+y*7)%11===0) { ctx.fillStyle = C.grass[(v+1)%4]; ctx.fillRect(sx+12,sy+8,4,8); } break;
    case T.TALL_GRASS: ctx.fillStyle = C.grass[v]; ctx.fillRect(sx,sy,ST,ST);
      const sw = Math.sin(t*2+x+y)*3; ctx.fillStyle = '#5A9C3E';
      for (let i=0;i<3;i++) ctx.fillRect(sx+8+i*12+sw, sy+4, 3, ST-8); break;
    case T.FLOWERS: ctx.fillStyle = C.grass[v]; ctx.fillRect(sx,sy,ST,ST);
      ctx.fillStyle = C.grassFlower[(x+y)%4]; ctx.fillRect(sx+12,sy+12,6,6); ctx.fillRect(sx+28,sy+24,6,6); break;
    case T.DIRT: ctx.fillStyle = C.dirt[v]; ctx.fillRect(sx,sy,ST,ST); break;
    case T.STONE: ctx.fillStyle = C.stone[v]; ctx.fillRect(sx,sy,ST,ST);
      ctx.fillStyle = C.stone[(v+1)%3]; ctx.fillRect(sx+6,sy+6,12,8); break;
    case T.WATER: ctx.fillStyle = C.water[v]; ctx.fillRect(sx,sy,ST,ST);
      ctx.fillStyle = `rgba(100,180,255,${0.1+Math.sin(t*2+x+y)*0.08})`; ctx.fillRect(sx,sy,ST,ST); break;
    case T.DEEP_WATER: ctx.fillStyle = '#1A4570'; ctx.fillRect(sx,sy,ST,ST);
      ctx.fillStyle = `rgba(60,140,220,${0.1+Math.sin(t*1.5+x*2+y)*0.1})`; ctx.fillRect(sx,sy,ST,ST); break;
    case T.SAND: ctx.fillStyle = C.sand[v]; ctx.fillRect(sx,sy,ST,ST); break;
    case T.PATH: ctx.fillStyle = C.path[v]; ctx.fillRect(sx,sy,ST,ST); break;
    case T.WOOD_WALL: ctx.fillStyle = C.woodWall; ctx.fillRect(sx,sy,ST,ST);
      ctx.fillStyle = '#5A3310'; ctx.fillRect(sx+2,sy+ST/2-1,ST-4,2); break;
    case T.WOOD_FLOOR: ctx.fillStyle = C.woodFloor; ctx.fillRect(sx,sy,ST,ST);
      ctx.fillStyle = '#907040'; for(let i=0;i<3;i++) ctx.fillRect(sx,sy+i*16,ST,1); break;
    case T.SHOP_FLOOR: ctx.fillStyle = '#B09060'; ctx.fillRect(sx,sy,ST,ST);
      ctx.fillStyle = '#A08050'; ctx.fillRect(sx,sy,ST/2,ST/2); ctx.fillRect(sx+ST/2,sy+ST/2,ST/2,ST/2); break;
    case T.FENCE: ctx.fillStyle = C.grass[v]; ctx.fillRect(sx,sy,ST,ST);
      ctx.fillStyle = C.fence; ctx.fillRect(sx+ST/2-3,sy,6,ST); ctx.fillRect(sx,sy+10,ST,4); ctx.fillRect(sx,sy+ST-14,ST,4); break;
  }
}

function drawTree(d) {
  const sx = d.x*ST-cam.x, sy = d.y*ST-cam.y;
  if (sx > canvas.width+ST*2 || sy > canvas.height+ST*2 || sx < -ST*2 || sy < -ST*2) return;
  ctx.fillStyle = '#5A3A1A'; ctx.fillRect(sx+ST/2-6,sy+8,12,ST-8);
  ctx.fillStyle = ['#2B5E1A','#3A7025','#2E6820'][d.variant];
  ctx.beginPath(); ctx.arc(sx+ST/2,sy-4,22,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = '#4A8A35'; ctx.beginPath(); ctx.arc(sx+ST/2-6,sy,14,0,Math.PI*2); ctx.fill();
}

function drawPlacedItem(item) {
  const sx = item.x*SCALE-cam.x, sy = item.y*SCALE-cam.y;
  if (sx > canvas.width+ST || sy > canvas.height+ST || sx < -ST || sy < -ST) return;
  const w = ST*0.8, h = ST*0.6;
  const rx = sx-w/2, ry = sy-h/2;
  
  if (item.type === 'solar_panel') {
    ctx.fillStyle = C.solar; ctx.fillRect(rx, ry, w, h);
    ctx.fillStyle = '#3366CC'; ctx.fillRect(rx+3, ry+3, w-6, h-6);
    // Grid lines
    ctx.strokeStyle = '#4477DD'; ctx.lineWidth = 1;
    ctx.strokeRect(rx+3, ry+3, (w-6)/2, (h-6)/2);
    ctx.strokeRect(rx+3+(w-6)/2, ry+3, (w-6)/2, (h-6)/2);
    ctx.strokeRect(rx+3, ry+3+(h-6)/2, (w-6)/2, (h-6)/2);
    ctx.strokeRect(rx+3+(w-6)/2, ry+3+(h-6)/2, (w-6)/2, (h-6)/2);
    // Sun reflection
    const t = performance.now() / 1000;
    const sunFactor = getHour() >= 6 && getHour() <= 20 ? 0.3 : 0;
    if (sunFactor > 0) {
      ctx.fillStyle = `rgba(255,255,200,${sunFactor * (0.5 + Math.sin(t*3)*0.2)})`;
      ctx.fillRect(rx+8, ry+4, 10, 6);
    }
  }
  else if (item.type === 'battery') {
    ctx.fillStyle = '#333'; ctx.fillRect(rx, ry, w, h);
    ctx.fillStyle = '#444'; ctx.fillRect(rx+2, ry+2, w-4, h-4);
    // Charge indicator
    const pct = power.maxStorage > 0 ? power.stored / power.maxStorage : 0;
    ctx.fillStyle = pct > 0.5 ? C.green : pct > 0.2 ? C.ledOrange : C.red;
    ctx.fillRect(rx+4, ry+h-8, (w-8)*pct, 4);
    // Terminal
    ctx.fillStyle = '#666'; ctx.fillRect(rx+w/2-4, ry-3, 8, 4);
  }
  else if (item.type === 'cooling_fan') {
    ctx.fillStyle = '#445566'; ctx.fillRect(rx, ry, w, h);
    // Spinning fan blades
    const t = performance.now() / 200;
    ctx.save(); ctx.translate(sx, sy);
    for (let i = 0; i < 4; i++) {
      ctx.rotate(Math.PI/2);
      ctx.fillStyle = '#778899';
      ctx.fillRect(-2, -12, 4, 12);
    }
    ctx.restore();
    // Center
    ctx.fillStyle = '#556677'; ctx.beginPath(); ctx.arc(sx, sy, 4, 0, Math.PI*2); ctx.fill();
  }
}

function drawPlayer() {
  const sx = player.x*SCALE-cam.x, sy = player.y*SCALE-cam.y;
  const w = ST, h = ST+12;
  const px = sx-w/2, py = sy-h/2;
  const bob = player.isMoving ? Math.sin(player.walkFrame*Math.PI/2)*2 : 0;
  
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(sx,sy+h/2+2,14,5,0,0,Math.PI*2); ctx.fill();
  // Legs
  const lo = player.isMoving ? Math.sin(player.walkFrame*Math.PI)*4 : 0;
  ctx.fillStyle = C.darkOrange; ctx.fillRect(px+10+lo,py+h-16,10,16); ctx.fillRect(px+w-20-lo,py+h-16,10,16);
  // Boots
  ctx.fillStyle = '#4A3520'; ctx.fillRect(px+8+lo,py+h-6,14,6); ctx.fillRect(px+w-22-lo,py+h-6,14,6);
  // Body
  ctx.fillStyle = player.speedBoost > 0 ? '#FFB030' : C.orange;
  ctx.fillRect(px+6,py+16+bob,w-12,h-34);
  // Bitcoin logo
  ctx.fillStyle = '#FFF'; ctx.font = `bold 14px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText('₿', sx, py+36+bob);
  // Arms
  const as = player.isMoving ? Math.sin(player.walkFrame*Math.PI)*6 : 0;
  ctx.fillStyle = C.skin; ctx.fillRect(px+1,py+18+bob-as,8,20); ctx.fillRect(px+w-9,py+18+bob+as,8,20);
  // Head
  ctx.fillStyle = C.skin; ctx.fillRect(px+10,py+2+bob,w-20,18);
  ctx.fillStyle = C.hair; ctx.fillRect(px+8,py-2+bob,w-16,8);
  // Eyes
  ctx.fillStyle = C.black;
  if (player.facing.x <= 0) ctx.fillRect(px+14,py+10+bob,4,4);
  if (player.facing.x >= 0) ctx.fillRect(px+w-18,py+10+bob,4,4);
  
  // Selected item indicator above head
  const sel = getSelectedItem();
  if (sel) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.font = `12px ${FONT}`; ctx.textAlign = 'center';
    ctx.fillText(`${ITEMS[sel.id].icon} ${ITEMS[sel.id].name}`, sx, py - 10);
  }
}

function drawNPC(npc) {
  const sx = npc.x*SCALE-cam.x, sy = npc.y*SCALE-cam.y;
  const w = ST, h = ST+8, px = sx-w/2, py = sy-h/2;
  if (sx > canvas.width+w || sy > canvas.height+h || sx < -w || sy < -h) return;
  
  ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(sx,sy+h/2,12,4,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = npc.color; ctx.fillRect(px+8,py+14,w-16,h-28);
  ctx.fillStyle = C.skin; ctx.fillRect(px+12,py+2,w-24,16);
  ctx.fillStyle = npc.hairColor; ctx.fillRect(px+10,py-2,w-20,8);
  ctx.fillStyle = C.black; ctx.fillRect(px+16,py+8,3,3); ctx.fillRect(px+w-19,py+8,3,3);
  
  const dist = Math.hypot(npc.x-player.x, npc.y-player.y);
  if (dist < 48) {
    ctx.fillStyle = C.white; ctx.font = `bold 11px ${FONT}`; ctx.textAlign = 'center';
    ctx.fillText(npc.name, sx, py - 8);
    ctx.fillStyle = C.gray; ctx.font = `10px ${FONT}`;
    if (npc.role === 'shopkeeper') ctx.fillText('[E] Talk  [B] Shop', sx, py - 20);
    else ctx.fillText('[E] Talk', sx, py - 20);
  }
}

function drawRig(rig) {
  const sx = rig.x*SCALE-cam.x, sy = rig.y*SCALE-cam.y;
  const w = ST, h = ST, rx = sx-w/2, ry = sy-h/2;
  if (sx > canvas.width+w || sy > canvas.height+h || sx < -w || sy < -h) return;
  
  if (rig.temperature > 60) {
    const i = (rig.temperature-60)/40;
    ctx.fillStyle = `rgba(255,${Math.floor(80-i*80)},0,${i*0.2})`;
    ctx.fillRect(rx-6,ry-6,w+12,h+12);
  }
  
  ctx.fillStyle = C.rigDark; ctx.fillRect(rx,ry,w,6);
  ctx.fillStyle = MiningRig.COLORS[rig.tier]; ctx.fillRect(rx,ry+6,w,h-6);
  ctx.fillStyle = C.rigLight; ctx.fillRect(rx+2,ry+8,w-4,2);
  ctx.fillStyle = '#444'; for(let i=0;i<3;i++) ctx.fillRect(rx+6,ry+16+i*10,w-12,2);
  
  const led = rig.powered && rig.durability > 0;
  ctx.fillStyle = led ? C.ledGreen : '#440000';
  if (led && rig.animFrame%2===0) ctx.fillStyle = '#00CC00';
  ctx.fillRect(rx+4,ry+2,6,3);
  ctx.fillStyle = rig.overheating ? C.red : (rig.powered ? C.ledOrange : '#442200');
  ctx.fillRect(rx+w-10,ry+2,6,3);
  
  // Tier badge
  ctx.fillStyle = C.white; ctx.font = `bold 8px ${FONT}`; ctx.textAlign = 'center';
  ctx.fillText(['CPU','GPU','ASIC'][rig.tier], sx, ry + h - 4);
  
  ctx.fillStyle = rig.getStatusColor(); ctx.font = `bold 10px ${FONT}`;
  ctx.fillText(rig.getStatus(), sx, ry - 4);
  
  const dist = Math.hypot(rig.x-player.x, rig.y-player.y);
  if (dist < 48) {
    const barW = w-4, pct = (rig.temperature-15)/85;
    ctx.fillStyle = '#222'; ctx.fillRect(rx+2,ry+h+2,barW,4);
    ctx.fillStyle = pct>0.8 ? C.red : pct>0.5 ? C.ledOrange : C.green;
    ctx.fillRect(rx+2,ry+h+2,barW*pct,4);
    ctx.fillStyle = C.gray; ctx.font = `10px ${FONT}`;
    ctx.fillText(hasItem('wrench') && rig.durability < 100 ? '[E] Repair' : '[E] Toggle', sx, ry-16);
  }
}

// ============================================================
// HUD DRAWING
// ============================================================
function drawHUD() {
  const pad = 12;
  
  // ---- Main stats panel ----
  drawPanel(pad, pad, 250, 180);
  let y = pad + 18;
  ctx.fillStyle = C.hud; ctx.font = `bold 16px ${FONT}`; ctx.textAlign = 'left';
  ctx.fillText(`₿ ${fmt(player.wallet)} sats`, pad+10, y); y += 20;
  
  ctx.font = `13px ${FONT}`; ctx.fillStyle = '#CCC';
  ctx.fillText(`${getTimeStr()}${time.speed>1?' ⏩':''}`, pad+10, y); y += 16;
  ctx.fillText(`Day ${time.day} — ${getPeriod()}`, pad+10, y); y += 18;
  
  const totalHash = rigs.reduce((s,r) => s+(r.powered&&!r.overheating&&r.durability>0?r.hashrate:0), 0);
  ctx.fillText(`⚡ ${totalHash.toFixed(1)} TH/s | Diff ${economy.difficulty.toFixed(1)}`, pad+10, y); y += 16;
  
  // Power
  ctx.fillStyle = power.generation >= power.consumption ? C.green : C.red;
  ctx.fillText(`⚡ ${power.generation.toFixed(1)}/${power.consumption.toFixed(1)} kW`, pad+10, y);
  if (power.maxStorage > 0) ctx.fillText(`🔋 ${power.stored.toFixed(0)}/${power.maxStorage} kWh`, pad+130, y);
  y += 18;
  
  ctx.fillStyle = C.phaseColors[economy.phase]; ctx.font = `bold 13px ${FONT}`;
  ctx.fillText(economy.phaseNames[economy.phase], pad+10, y); y += 14;
  ctx.fillStyle = C.gray; ctx.font = `11px ${FONT}`;
  ctx.fillText(`Day ${economy.phaseDays+1}/28 | Cycle ${economy.cycle+1} | Halvings: ${economy.halvings}`, pad+10, y); y += 14;
  ctx.fillText(`Rigs: ${rigs.length} | Total: ${fmt(player.totalEarned)}`, pad+10, y);
  
  // ---- Hotbar ----
  const hbW = 42, hbH = 42, hbGap = 4;
  const hbTotal = 10;
  const hbTotalW = hbTotal * (hbW + hbGap);
  const hbX = (canvas.width - hbTotalW) / 2;
  const hbY = canvas.height - hbH - 16;
  
  for (let i = 0; i < hbTotal; i++) {
    const x = hbX + i * (hbW + hbGap);
    ctx.fillStyle = i === selectedSlot ? 'rgba(247,147,26,0.3)' : 'rgba(10,10,10,0.7)';
    ctx.fillRect(x, hbY, hbW, hbH);
    ctx.strokeStyle = i === selectedSlot ? C.hud : '#444';
    ctx.lineWidth = i === selectedSlot ? 2 : 1;
    ctx.strokeRect(x, hbY, hbW, hbH);
    
    // Slot number
    ctx.fillStyle = '#555'; ctx.font = `9px ${FONT}`; ctx.textAlign = 'left';
    ctx.fillText(`${(i+1)%10}`, x + 3, hbY + 10);
    
    const slot = inventory[i];
    if (slot) {
      const item = ITEMS[slot.id];
      ctx.font = `20px serif`; ctx.textAlign = 'center';
      ctx.fillText(item.icon, x + hbW/2, hbY + hbH/2 + 6);
      if (slot.quantity > 1) {
        ctx.fillStyle = C.white; ctx.font = `bold 10px ${FONT}`;
        ctx.fillText(slot.quantity, x + hbW - 8, hbY + hbH - 4);
      }
    }
  }
  
  // ---- Controls hint ----
  ctx.fillStyle = '#444'; ctx.font = `10px ${FONT}`; ctx.textAlign = 'center';
  ctx.fillText('I: Inventory | P: Save | L: Load | B: Shop (near Ruby) | R: Use Item | F: Fullscreen', canvas.width/2, canvas.height - 4);
  
  // ---- Energy bar ----
  const ebW = 100, ebH = 8;
  const ebX = canvas.width - ebW - pad - 10, ebY = canvas.height - hbH - 36;
  ctx.fillStyle = '#222'; ctx.fillRect(ebX, ebY, ebW, ebH);
  ctx.fillStyle = player.energy > 30 ? C.green : C.red;
  ctx.fillRect(ebX, ebY, ebW * (player.energy / player.maxEnergy), ebH);
  ctx.fillStyle = C.white; ctx.font = `9px ${FONT}`; ctx.textAlign = 'right';
  ctx.fillText(`Energy: ${Math.floor(player.energy)}`, ebX + ebW, ebY - 2);
  
  // ---- Nearest rig detail ----
  let nearRig = null, nearDist = 60;
  for (const r of rigs) { const d = Math.hypot(r.x-player.x,r.y-player.y); if (d < nearDist) { nearRig = r; nearDist = d; } }
  if (nearRig) {
    const rw = 220, rh = 105;
    const rx = canvas.width - rw - pad;
    drawPanel(rx, pad, rw, rh);
    ctx.fillStyle = C.hud; ctx.font = `bold 13px ${FONT}`; ctx.textAlign = 'left';
    ctx.fillText(MiningRig.NAMES[nearRig.tier], rx+10, pad+18);
    ctx.font = `11px ${FONT}`; ctx.fillStyle = '#CCC';
    ctx.fillText(`Temp: ${nearRig.temperature.toFixed(0)}°C`, rx+10, pad+36);
    ctx.fillText(`Hash: ${nearRig.hashrate.toFixed(1)} TH/s`, rx+10, pad+52);
    ctx.fillText(`Durability: ${nearRig.durability.toFixed(0)}%`, rx+10, pad+68);
    ctx.fillText(`Mined: ${fmt(nearRig.satsMined)} sats`, rx+10, pad+84);
    ctx.fillStyle = nearRig.getStatusColor();
    ctx.fillText(`Status: ${nearRig.getStatus()}`, rx+10, pad+100);
  }
  
  // ---- Dialogue ----
  if (activeDialogue) {
    const dw = Math.min(600, canvas.width-40), dh = 80;
    const dx = (canvas.width-dw)/2, dy = canvas.height - hbH - 80 - dh;
    drawPanel(dx, dy, dw, dh);
    ctx.fillStyle = C.hud; ctx.font = `bold 14px ${FONT}`; ctx.textAlign = 'left';
    ctx.fillText(activeDialogue.name, dx+16, dy+24);
    ctx.fillStyle = C.white; ctx.font = `13px ${FONT}`;
    // Word wrap
    wrapText(activeDialogue.text, dx+16, dy+44, dw-32, 16);
    ctx.fillStyle = C.gray; ctx.font = `10px ${FONT}`; ctx.textAlign = 'right';
    ctx.fillText('[E] Close', dx+dw-12, dy+dh-8);
  }
  
  // ---- Shop UI ----
  if (shopOpen) drawShop();
  
  // ---- Inventory UI ----
  if (inventoryOpen) drawInventory();
  
  // ---- Notifications ----
  ctx.textAlign = 'center';
  for (let i = 0; i < notifications.length; i++) {
    const n = notifications[i], alpha = Math.min(1, n.timer);
    ctx.fillStyle = n.big ? `rgba(255,215,0,${alpha})` : `rgba(247,147,26,${alpha})`;
    ctx.font = `bold ${n.big?18:14}px ${FONT}`;
    ctx.fillText(n.text, canvas.width/2, canvas.height - 120 - i*24);
  }
  
  // Particles
  for (const p of particles) {
    ctx.fillStyle = `rgba(247,147,26,${Math.min(1,p.life)})`;
    ctx.font = `bold 12px ${FONT}`; ctx.textAlign = 'center';
    ctx.fillText(p.text, p.x-cam.x, p.y-cam.y);
  }
  ctx.textAlign = 'left';
}

function drawPanel(x, y, w, h) {
  ctx.fillStyle = C.hudBg;
  rr(x, y, w, h, 6);
  ctx.strokeStyle = C.hudBorder; ctx.lineWidth = 1.5; ctx.stroke();
}

function drawShop() {
  const w = 500, h = 400;
  const x = (canvas.width-w)/2, y = (canvas.height-h)/2;
  drawPanel(x, y, w, h);
  
  // Title
  ctx.fillStyle = C.hud; ctx.font = `bold 18px ${FONT}`; ctx.textAlign = 'center';
  ctx.fillText("⛏️ Ruby's Hardware Shop", x+w/2, y+28);
  
  // Tabs
  const tabW = w/2 - 20;
  ctx.fillStyle = shopMode === 'buy' ? 'rgba(247,147,26,0.2)' : 'rgba(50,50,50,0.5)';
  ctx.fillRect(x+10, y+38, tabW, 24);
  ctx.fillStyle = shopMode === 'sell' ? 'rgba(247,147,26,0.2)' : 'rgba(50,50,50,0.5)';
  ctx.fillRect(x+w/2+10, y+38, tabW, 24);
  ctx.fillStyle = shopMode === 'buy' ? C.hud : C.gray; ctx.font = `bold 13px ${FONT}`; ctx.textAlign = 'center';
  ctx.fillText('BUY (← →)', x+10+tabW/2, y+54);
  ctx.fillStyle = shopMode === 'sell' ? C.hud : C.gray;
  ctx.fillText('SELL (← →)', x+w/2+10+tabW/2, y+54);
  
  // Balance
  ctx.fillStyle = C.hud; ctx.font = `13px ${FONT}`;
  ctx.fillText(`Balance: ${fmt(player.wallet)} sats`, x+w/2, y+78);
  
  // Market modifier
  const mult = getMarketMultiplier();
  ctx.fillStyle = mult > 1 ? C.red : C.green; ctx.font = `11px ${FONT}`;
  ctx.fillText(`Market: ${mult > 1 ? '▲' : '▼'} ${Math.round(mult*100)}%`, x+w/2, y+92);
  
  // Items list
  ctx.textAlign = 'left';
  const listY = y + 105;
  
  if (shopMode === 'buy') {
    SHOP_ITEMS.forEach((id, i) => {
      const item = ITEMS[id];
      const price = Math.ceil(item.buyPrice * mult);
      const iy = listY + i * 28;
      if (iy > y + h - 30) return;
      
      if (i === shopCursor) {
        ctx.fillStyle = 'rgba(247,147,26,0.15)';
        ctx.fillRect(x+8, iy-8, w-16, 26);
      }
      
      ctx.font = `16px serif`; ctx.fillStyle = C.white;
      ctx.fillText(item.icon, x+16, iy+8);
      ctx.font = `12px ${FONT}`;
      ctx.fillStyle = i === shopCursor ? C.hud : C.white;
      ctx.fillText(item.name, x+42, iy+4);
      ctx.fillStyle = C.gray; ctx.font = `10px ${FONT}`;
      ctx.fillText(item.desc, x+42, iy+16);
      ctx.fillStyle = player.wallet >= price ? C.green : C.red;
      ctx.font = `bold 12px ${FONT}`; ctx.textAlign = 'right';
      ctx.fillText(`${fmt(price)} sats`, x+w-16, iy+8);
      ctx.textAlign = 'left';
    });
  } else {
    const sellable = inventory.filter(s => s && ITEMS[s.id].sellPrice > 0);
    if (sellable.length === 0) {
      ctx.fillStyle = C.gray; ctx.font = `13px ${FONT}`; ctx.textAlign = 'center';
      ctx.fillText('Nothing to sell!', x+w/2, listY+30);
      ctx.textAlign = 'left';
    }
    sellable.forEach((slot, i) => {
      const item = ITEMS[slot.id];
      const price = Math.ceil(item.sellPrice * mult);
      const iy = listY + i * 28;
      if (iy > y + h - 30) return;
      
      if (i === shopCursor) { ctx.fillStyle = 'rgba(247,147,26,0.15)'; ctx.fillRect(x+8,iy-8,w-16,26); }
      ctx.font = `16px serif`; ctx.fillStyle = C.white; ctx.fillText(item.icon, x+16, iy+8);
      ctx.font = `12px ${FONT}`; ctx.fillStyle = i===shopCursor ? C.hud : C.white;
      ctx.fillText(`${item.name} x${slot.quantity}`, x+42, iy+8);
      ctx.fillStyle = C.green; ctx.font = `bold 12px ${FONT}`; ctx.textAlign = 'right';
      ctx.fillText(`+${fmt(price)} sats`, x+w-16, iy+8);
      ctx.textAlign = 'left';
    });
  }
  
  // Footer
  ctx.fillStyle = C.gray; ctx.font = `10px ${FONT}`; ctx.textAlign = 'center';
  ctx.fillText('↑↓: Navigate | Enter/E: Buy/Sell | ←→: Switch Tab | B/Esc: Close', x+w/2, y+h-10);
}

function drawInventory() {
  const cols = 5, rows = 4, slotSize = 56, gap = 6;
  const w = cols * (slotSize+gap) + gap + 180, h = rows * (slotSize+gap) + gap + 60;
  const x = (canvas.width-w)/2, y = (canvas.height-h)/2;
  drawPanel(x, y, w, h);
  
  ctx.fillStyle = C.hud; ctx.font = `bold 16px ${FONT}`; ctx.textAlign = 'center';
  ctx.fillText('📦 Inventory', x+w/2, y+24);
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const i = row * cols + col;
      const sx = x + gap + col * (slotSize+gap);
      const sy = y + 36 + row * (slotSize+gap);
      
      ctx.fillStyle = i === selectedSlot ? 'rgba(247,147,26,0.2)' : 'rgba(30,30,30,0.8)';
      ctx.fillRect(sx, sy, slotSize, slotSize);
      ctx.strokeStyle = i === selectedSlot ? C.hud : '#444';
      ctx.lineWidth = i === selectedSlot ? 2 : 1;
      ctx.strokeRect(sx, sy, slotSize, slotSize);
      
      const slot = inventory[i];
      if (slot) {
        ctx.font = `28px serif`; ctx.textAlign = 'center';
        ctx.fillText(ITEMS[slot.id].icon, sx+slotSize/2, sy+slotSize/2+8);
        if (slot.quantity > 1) {
          ctx.fillStyle = C.white; ctx.font = `bold 11px ${FONT}`;
          ctx.fillText(slot.quantity, sx+slotSize-10, sy+slotSize-6);
        }
      }
      
      // Slot number
      ctx.fillStyle = '#555'; ctx.font = `9px ${FONT}`; ctx.textAlign = 'left';
      ctx.fillText(i < 10 ? `${(i+1)%10}` : '', sx+3, sy+11);
    }
  }
  
  // Item detail panel
  const sel = inventory[selectedSlot];
  const detX = x + cols*(slotSize+gap) + gap + 10;
  const detY = y + 36;
  if (sel) {
    const item = ITEMS[sel.id];
    ctx.fillStyle = C.hud; ctx.font = `bold 14px ${FONT}`; ctx.textAlign = 'left';
    ctx.fillText(`${item.icon} ${item.name}`, detX, detY+16);
    ctx.fillStyle = '#CCC'; ctx.font = `11px ${FONT}`;
    wrapText(item.desc, detX, detY+36, 160, 14);
    ctx.fillStyle = C.gray;
    if (item.buyPrice > 0) ctx.fillText(`Buy: ${fmt(item.buyPrice)}`, detX, detY+80);
    if (item.sellPrice > 0) ctx.fillText(`Sell: ${fmt(item.sellPrice)}`, detX, detY+94);
    ctx.fillText(`Qty: ${sel.quantity}`, detX, detY+108);
    ctx.fillText(`Type: ${item.type}`, detX, detY+122);
  }
  
  ctx.fillStyle = C.gray; ctx.font = `10px ${FONT}`; ctx.textAlign = 'center';
  ctx.fillText('1-9,0: Select | I/Tab/Esc: Close', x+w/2, y+h-10);
}

function wrapText(text, x, y, maxW, lineH) {
  const words = text.split(' ');
  let line = '';
  for (const word of words) {
    const test = line + word + ' ';
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line.trim(), x, y);
      line = word + ' '; y += lineH;
    } else { line = test; }
  }
  if (line.trim()) ctx.fillText(line.trim(), x, y);
}

function rr(x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
  ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h-r);
  ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r);
  ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath(); ctx.fill();
}

function fmt(n) { return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

// ============================================================
// MAIN DRAW
// ============================================================
function draw() {
  ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0,0,canvas.width,canvas.height);
  
  const startX = Math.max(0, Math.floor(cam.x/ST)-1), startY = Math.max(0, Math.floor(cam.y/ST)-1);
  const endX = Math.min(MAP_W, startX+Math.ceil(canvas.width/ST)+3), endY = Math.min(MAP_H, startY+Math.ceil(canvas.height/ST)+3);
  
  for (let y = startY; y < endY; y++) for (let x = startX; x < endX; x++) drawTile(x, y, map[y][x]);
  for (const d of decorations) if (d.type === 'tree') drawTree(d);
  for (const item of placedItems) drawPlacedItem(item);
  for (const rig of rigs) drawRig(rig);
  for (const npc of npcs) drawNPC(npc);
  drawPlayer();
  
  const dn = getDayOverlay();
  if (dn.a > 0) { ctx.fillStyle = `rgba(${dn.r},${dn.g},${dn.b},${dn.a})`; ctx.fillRect(0,0,canvas.width,canvas.height); }
  
  drawHUD();
}

// ============================================================
// GAME LOOP
// ============================================================
function gameLoop(now) {
  const dt = Math.min(0.1, (now-lastTime)/1000);
  lastTime = now;
  update(dt);
  draw();
  requestAnimationFrame(gameLoop);
}
requestAnimationFrame(gameLoop);
