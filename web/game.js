// ============================================================
// SATOSHI VALLEY — v0.5 "The Daily Loop Update"
// ============================================================

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// ---- TRUE FULLSCREEN ----
function resize() {
  canvas.width = window.innerWidth * (window.devicePixelRatio || 1);
  canvas.height = window.innerHeight * (window.devicePixelRatio || 1);
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
}
window.addEventListener('resize', resize);
resize();

// ---- AUDIO ----
let audioCtx = null;
function initAudio() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
document.addEventListener('click', initAudio, { once: true });
document.addEventListener('keydown', initAudio, { once: true });

function tone(freq, dur, type='square', vol=0.06) {
  if (!audioCtx) return;
  const o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(vol, audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
  o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + dur);
}
const sfx = {
  place() { tone(220,.12); setTimeout(()=>tone(330,.1),80); },
  interact() { tone(440,.08,'sine',.04); },
  buy() { [523,659,784].forEach((f,i)=>setTimeout(()=>tone(f,.12,'sine',.05),i*100)); },
  error() { tone(180,.2,'sawtooth',.03); },
  block() { [523,659,784,1047].forEach((f,i)=>setTimeout(()=>tone(f,.3,'sine',.07),i*120)); },
  coin() { tone(880,.05,'sine',.03); setTimeout(()=>tone(1100,.07,'sine',.03),60); },
  repair() { [300,400,500].forEach((f,i)=>setTimeout(()=>tone(f,.08,'square',.03),i*100)); },
  step() { if(Math.random()<0.25) tone(80+Math.random()*40,.03,'triangle',.012); },
  menuOpen() { tone(600,.05,'sine',.03); tone(800,.07,'sine',.02); },
  menuClose() { tone(800,.05,'sine',.02); tone(600,.07,'sine',.03); },
  story() { tone(440,.3,'sine',.04); setTimeout(()=>tone(554,.3,'sine',.03),300); setTimeout(()=>tone(659,.4,'sine',.04),600); },
};

// Mining hum
let humOsc = null, humGain = null;
function updateHum(hash) {
  if (!audioCtx) return;
  if (!humOsc) {
    humOsc = audioCtx.createOscillator(); humGain = audioCtx.createGain();
    humOsc.type = 'sine'; humOsc.frequency.value = 55; humGain.gain.value = 0;
    humOsc.connect(humGain); humGain.connect(audioCtx.destination); humOsc.start();
  }
  humGain.gain.setTargetAtTime(hash > 0 ? Math.min(.015, hash*.002) : 0, audioCtx.currentTime, .5);
}

// ---- CONSTANTS ----
const TILE = 16, SCALE = 3, ST = TILE * SCALE;
const MAP_W = 120, MAP_H = 90; // MUCH bigger world
const FONT = '"Courier New", monospace';

// ---- INPUT ----
const keys = {}, jp = {};
document.addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (!keys[k]) jp[k] = true; keys[k] = true;
  if (!['f5','f11','f12'].includes(k)) e.preventDefault();
  if (k === 'f' && !e.repeat) { if (!document.fullscreenElement) canvas.requestFullscreen(); else document.exitFullscreen(); }
});
document.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

// ---- RNG ----
function rng32(a) { return()=>{a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;}; }

// ---- PERLIN NOISE (simple) ----
const permutation = [];
{const r=rng32(2009);for(let i=0;i<256;i++)permutation[i]=i;for(let i=255;i>0;i--){const j=Math.floor(r()*(i+1));[permutation[i],permutation[j]]=[permutation[j],permutation[i]];}}
const perm = [...permutation, ...permutation];
function fade(t){return t*t*t*(t*(t*6-15)+10);}
function grad(hash,x,y){const h=hash&3;return((h&1)?-x:x)+((h&2)?-y:y);}
function perlin(x,y){
  const X=Math.floor(x)&255,Y=Math.floor(y)&255;
  x-=Math.floor(x);y-=Math.floor(y);
  const u=fade(x),v=fade(y);
  const A=perm[X]+Y,B=perm[X+1]+Y;
  return 0.5+0.5*(
    lerp(lerp(grad(perm[A],x,y),grad(perm[B],x-1,y),u),
         lerp(grad(perm[A+1],x,y-1),grad(perm[B+1],x-1,y-1),u),v));
}
function fbm(x,y,oct=4){let v=0,a=1,f=1,t=0;for(let i=0;i<oct;i++){v+=a*perlin(x*f,y*f);t+=a;a*=0.5;f*=2;}return v/t;}
function lerp(a,b,t){return a+(b-a)*t;}

// ============================================================
// COLORS - Rich, warm palette
// ============================================================
const C = {
  // Greens (5 shades for depth)
  grass:['#1F4D0F','#2A5E18','#347020','#3E8228','#489430'],
  darkGrass:'#1A4A0C',
  // Nature
  flower:['#E8C840','#D04040','#7070E0','#E870B0','#70D0A0','#F0A030'],
  dirt:['#6B5020','#7B5E28','#8B6C30'],
  richDirt:'#5A4018',
  stone:['#505058','#606068','#707078'],
  darkStone:'#404048',
  water:['#1A5080','#206090','#2870A0'],
  deepWater:'#103050',
  sand:['#C4A868','#D4B878','#E4C888'],
  path:['#908060','#A09070','#B0A080'],
  // Wood
  woodWall:'#5A3818',woodDark:'#4A2810',woodFloor:'#9A7848',woodLight:'#B09060',
  // Foliage
  treeTrunk:['#4A2A10','#5A3A1A','#6A4A2A'],
  treeLeaf:['#1A4A10','#2A5A1A','#1E5014','#2E6020','#3A7028'],
  treeLeafLight:['#3A7028','#4A8035','#5A9040'],
  bush:'#2A5A1A',
  // Player
  orange:'#F7931A',darkOrange:'#C47415',skin:'#FFD5A0',hair:'#503214',
  // Rigs
  rigBody:'#555',rigDark:'#333',rigLight:'#777',
  ledGreen:'#0F0',ledRed:'#F00',ledOrange:'#F7931A',
  // UI
  hud:'#F7931A',hudBg:'rgba(8,8,12,0.88)',hudBorder:'rgba(247,147,26,0.6)',
  hudBorderBright:'#F7931A',
  white:'#FFF',black:'#000',red:'#F44',green:'#4F4',
  blue:'#48F',gold:'#FFD700',gray:'#888',dimGray:'#555',
  phaseCol:['#4488FF','#44FF44','#FFD700','#FF4444'],
  solar:'#2244AA',
};

// ============================================================
// ITEMS
// ============================================================
const ITEMS = {
  wrench:{name:'Wrench',desc:'Repairs mining rigs (+25 durability)',icon:'🔧',type:'tool',buy:200,sell:80,stack:true},
  pickaxe:{name:'Pickaxe',desc:'Mine resources from stone',icon:'⛏️',type:'tool',buy:300,sell:120,stack:true},
  cpu_miner:{name:'CPU Miner',desc:'1 TH/s — Reliable starter rig',icon:'💻',type:'rig',tier:0,buy:500,sell:200,stack:true},
  gpu_rig:{name:'GPU Rig',desc:'5 TH/s — Serious power',icon:'🖥️',type:'rig',tier:1,buy:5000,sell:2000,stack:true},
  asic_s21:{name:'ASIC S21',desc:'50 TH/s — Industrial beast',icon:'⚡',type:'rig',tier:2,buy:50000,sell:20000,stack:true},
  solar_panel:{name:'Solar Panel',desc:'2 kW clean power',icon:'☀️',type:'power',buy:1500,sell:600,stack:true},
  battery:{name:'Battery Pack',desc:'Stores power for night',icon:'🔋',type:'power',buy:2000,sell:800,stack:true},
  cooling_fan:{name:'Cooling Fan',desc:'Reduces nearby rig heat',icon:'🌀',type:'upgrade',buy:800,sell:300,stack:true},
  bread:{name:'Bread',desc:'Restores 30 energy',icon:'🍞',type:'food',buy:50,sell:20,stack:true},
  coffee:{name:'Coffee',desc:'Speed boost for 30 seconds',icon:'☕',type:'food',buy:100,sell:40,stack:true},
  copper_ore:{name:'Copper Ore',desc:'Mined from mountains',icon:'🪨',type:'mat',buy:0,sell:50,stack:true},
  silicon:{name:'Silicon',desc:'Used in crafting',icon:'💎',type:'mat',buy:0,sell:100,stack:true},
  seed_fragment:{name:'Seed Fragment',desc:"Part of Uncle Toshi's seed phrase",icon:'🧩',type:'quest',buy:0,sell:0,stack:false},
  potato_seed:{name:'Potato Seeds',desc:'Plant on dirt. Grows in 4 days.',icon:'🥔',type:'seed',buy:30,sell:10,stack:true},
  tomato_seed:{name:'Tomato Seeds',desc:'Plant on dirt. Grows in 6 days.',icon:'🍅',type:'seed',buy:60,sell:20,stack:true},
  corn_seed:{name:'Corn Seeds',desc:'Plant on dirt. Grows in 8 days.',icon:'🌽',type:'seed',buy:100,sell:35,stack:true},
};

// ============================================================
// GAME STATE
// ============================================================
let gameState = 'intro'; // 'intro', 'playing', 'paused'
let introStep = 0;
let introTimer = 0;
let introFade = 1;
let tutorialStep = 0;
let tutorialDone = false;
let showObjectives = false;
let showSkills = false;

const INTRO_SLIDES = [
  { text: '"Chancellor on brink of second bailout for banks."', sub: "— The Times, January 3, 2009", dur: 4 },
  { text: "One person saw this headline\nand decided to change everything.", sub: "", dur: 3.5 },
  { text: "They gave the world a gift:\n21 million coins. No more. No less. Forever.", sub: "", dur: 4 },
  { text: "Decades passed. Fiatropolis printed and printed.\nBread costs 500 FiatBucks. Rent is a joke.", sub: "You were a wage slave. Like everyone else.", dur: 5 },
  { text: "Then a letter arrived from a valley\nyou'd never heard of.", sub: "", dur: 3 },
  { text: '"I\'ve been running the last node in this valley\nfor 15 years. Not your keys, not your coins.\nNot your node, not your rules."', sub: "— Uncle Toshi", dur: 6 },
  { text: '"The seed is split into 24 pieces, hidden in the\nplaces where Bitcoin history was made.\nFind them all. Verify, don\'t trust."', sub: "", dur: 6 },
  { text: "He left you everything.", sub: "A homestead. Mining rigs. A node. And the most important thing: sovereignty.", dur: 5 },
  { text: "⛏️ SATOSHI VALLEY ⛏️", sub: "Stack sats. Build your citadel. Fix the money, fix the world.", dur: 999 },
];

const TUTORIAL_STEPS = [
  { msg: "Welcome to Satoshi Valley. This is your uncle's homestead.", trigger: 'auto', dur: 4 },
  { msg: "Use WASD or Arrow Keys to move around. Explore your new home.", trigger: 'move' },
  { msg: "Walk to the Mining Shed (west). Your uncle left two CPU miners running.", trigger: 'near_rig' },
  { msg: "Press E near a rig to toggle its power. Try turning one off and on.", trigger: 'interact_rig' },
  { msg: "Rigs generate sats automatically. Watch your balance grow!", trigger: 'earn_sats' },
  { msg: "Press I to open your Inventory. You have a wrench and some bread.", trigger: 'open_inv' },
  { msg: "Select items with number keys 1-9. Press R to use the selected item.", trigger: 'select_item' },
  { msg: "Ruby's Shop is south of your cabin. Walk there and press B near Ruby to buy supplies.", trigger: 'visit_shop' },
  { msg: "Press O anytime to see your current objectives. Now go explore!", trigger: 'auto', dur: 5 },
];

const objectives = [
  { id: 'place_rig', text: 'Place your first mining rig', done: false },
  { id: 'earn_1000', text: 'Earn 1,000 sats', done: false },
  { id: 'visit_shop', text: "Visit Ruby's Shop", done: false },
  { id: 'buy_gpu', text: 'Buy a GPU Rig upgrade', done: false },
  { id: 'place_solar', text: 'Place a solar panel', done: false },
  { id: 'repair_rig', text: 'Repair a broken rig', done: false },
  { id: 'find_hermit', text: 'Find The Hermit in the forest', done: false },
  { id: 'earn_50000', text: 'Earn 50,000 sats', done: false },
  { id: 'survive_bear', text: 'Survive a Capitulation phase', done: false },
  { id: 'first_halving', text: 'Witness the first Halving', done: false },
];

function completeObjective(id) {
  const o = objectives.find(ob => ob.id === id && !ob.done);
  if (o) { o.done = true; notify(`✅ Objective complete: ${o.text}`, 4, true); sfx.buy(); }
}

// ============================================================
// INVENTORY
// ============================================================
const INV_SIZE = 20;
const inv = [];
let selSlot = 0;
function addItem(id,qty=1){const it=ITEMS[id];if(!it)return false;if(it.stack){const s=inv.find(s=>s&&s.id===id);if(s){s.qty+=qty;return true;}}const e=inv.findIndex(s=>!s);if(e===-1&&inv.length>=INV_SIZE)return false;if(e>=0)inv[e]={id,qty};else inv.push({id,qty});return true;}
function removeItem(id,qty=1){const s=inv.find(s=>s&&s.id===id&&s.qty>=qty);if(!s)return false;s.qty-=qty;if(s.qty<=0){const i=inv.indexOf(s);inv[i]=null;}return true;}
function hasItem(id){const s=inv.find(s=>s&&s.id===id);return s&&s.qty>0;}
function getSelected(){return(selSlot>=0&&selSlot<inv.length&&inv[selSlot])?inv[selSlot]:null;}

// ============================================================
// POWER
// ============================================================
const pwr = {gen:0,use:0,stored:0,maxStore:0,panels:[],batts:[],gridCost:10};
function updatePower(dt) {
  const h = getHour();
  const sun = (h>=6&&h<=20)?Math.sin((h-6)/14*Math.PI):0;
  pwr.gen = pwr.panels.length * 2 * sun;
  pwr.maxStore = pwr.batts.length * 10;
  pwr.use = 0;
  for (const r of rigs) if (r.powered&&r.dur>0) pwr.use += [.3,1.2,3][r.tier];
  const surplus = pwr.gen - pwr.use;
  if (surplus > 0) pwr.stored = Math.min(pwr.maxStore, pwr.stored + surplus*dt*.1);
  else if (surplus < 0) {
    if (pwr.stored > 0) pwr.stored = Math.max(0, pwr.stored + surplus*dt*.1);
    else player.wallet = Math.max(0, player.wallet - Math.ceil(-surplus*pwr.gridCost*dt*.01));
  }
}

// ============================================================
// MAP GENERATION — Beautiful procedural world
// ============================================================
const T = { GRASS:0,DIRT:1,STONE:2,WATER:3,PATH:4,WALL:5,FLOOR:6,SAND:7,FENCE:8,DEEP:9,FLOWER:10,TALLGRASS:11,SHOP:12,BRIDGE:13,CLIFF:14,MUSHROOM:15 };
const SOLID = new Set([T.WATER,T.WALL,T.DEEP,T.FENCE,T.CLIFF]);
const map = [];
const decor = []; // trees, bushes, rocks, signs

function generateMap() {
  // Use perlin noise for organic terrain
  for (let y = 0; y < MAP_H; y++) {
    map[y] = [];
    for (let x = 0; x < MAP_W; x++) {
      const n = fbm(x*0.06, y*0.06, 4);
      const m = fbm(x*0.03+100, y*0.03+100, 3); // moisture
      
      if (n < 0.32) map[y][x] = T.DEEP;
      else if (n < 0.38) map[y][x] = T.WATER;
      else if (n < 0.42) map[y][x] = T.SAND;
      else if (n > 0.72) map[y][x] = T.STONE;
      else if (n > 0.68) map[y][x] = T.CLIFF;
      else if (m > 0.58 && n > 0.45) map[y][x] = T.TALLGRASS;
      else if (m > 0.55 && n > 0.48 && Math.random() < 0.1) map[y][x] = T.FLOWER;
      else map[y][x] = T.GRASS;
    }
  }
  
  // Clear area around homestead (center of map)
  const homeX = 55, homeY = 45;
  for (let dy = -12; dy <= 12; dy++) for (let dx = -15; dx <= 15; dx++) {
    const ty = homeY+dy, tx = homeX+dx;
    if (ty>=0&&ty<MAP_H&&tx>=0&&tx<MAP_W) {
      const d = Math.sqrt(dx*dx*.6+dy*dy);
      if (d < 10) map[ty][tx] = T.GRASS;
      if (d < 7 && Math.random() < 0.03) map[ty][tx] = T.FLOWER;
    }
  }
  
  // ---- BUILDINGS ----
  // Cabin (home)
  buildBuilding(homeX-3, homeY-3, 7, 6, 'home');
  // Mining Shed
  buildBuilding(homeX-14, homeY-2, 6, 5, 'shed');
  // Ruby's Shop
  buildBuilding(homeX+2, homeY+10, 8, 6, 'shop');
  // Tavern
  buildBuilding(homeX+12, homeY+8, 7, 6, 'tavern');
  // Town Hall
  buildBuilding(homeX+8, homeY-5, 8, 6, 'hall');
  
  // ---- PATHS (connecting buildings) ----
  // Main path horizontal
  drawPath(homeX-15, homeY+3, homeX+20, homeY+3, 2);
  // Path to cabin
  drawPath(homeX, homeY+3, homeX, homeY+2, 1);
  // Path to shed
  drawPath(homeX-11, homeY+3, homeX-11, homeY+2, 1);
  // Path south to shop
  drawPath(homeX+5, homeY+3, homeX+5, homeY+10, 2);
  // Path to tavern
  drawPath(homeX+15, homeY+3, homeX+15, homeY+8, 1);
  // Path to town hall
  drawPath(homeX+11, homeY+3, homeX+11, homeY, 1);
  // Path north to bridge
  drawPath(homeX, homeY-3, homeX, homeY-18, 1);
  // Path south to lake area
  drawPath(homeX+5, homeY+16, homeX+5, homeY+25, 1);
  
  // ---- GARDEN (right of cabin) ----
  for (let y = homeY-2; y <= homeY+2; y++) for (let x = homeX+6; x <= homeX+12; x++) {
    if (y >= 0 && y < MAP_H && x >= 0 && x < MAP_W) map[y][x] = T.DIRT;
  }
  for (let x = homeX+5; x <= homeX+13; x++) { setT(x, homeY-3, T.FENCE); setT(x, homeY+3, T.FENCE); }
  for (let y = homeY-3; y <= homeY+3; y++) { setT(homeX+5, y, T.FENCE); setT(homeX+13, y, T.FENCE); }
  setT(homeX+9, homeY+3, T.PATH); // gate
  
  // ---- BRIDGE over water ----
  // Find water crossing near the north path
  for (let y = 0; y < MAP_H; y++) {
    if (map[y][homeX] === T.WATER || map[y][homeX] === T.DEEP) {
      map[y][homeX] = T.BRIDGE; map[y][homeX+1] = T.BRIDGE;
      if (map[y][homeX-1] === T.WATER || map[y][homeX-1] === T.DEEP) map[y][homeX-1] = T.BRIDGE;
    }
  }
  
  // ---- TREES (dense forests, scattered elsewhere) ----
  const rng = rng32(2009);
  for (let y = 2; y < MAP_H-2; y++) for (let x = 2; x < MAP_W-2; x++) {
    const tile = map[y][x];
    if (tile === T.GRASS || tile === T.TALLGRASS) {
      const n = fbm(x*0.08+50, y*0.08+50, 3);
      const treeDensity = n > 0.6 ? 0.35 : n > 0.5 ? 0.12 : 0.03;
      // Don't put trees near buildings
      const nearBuilding = Math.abs(x-homeX)<18 && Math.abs(y-homeY)<16;
      if (rng() < treeDensity && !nearBuilding) {
        decor.push({ x, y, type: 'tree', v: Math.floor(rng()*5), size: 0.7+rng()*0.6 });
      }
      // Bushes
      if (rng() < 0.02 && !nearBuilding) {
        decor.push({ x, y, type: 'bush', v: Math.floor(rng()*3) });
      }
    }
    // Rocks on stone
    if (tile === T.STONE && rng() < 0.08) {
      decor.push({ x, y, type: 'rock', v: Math.floor(rng()*3) });
    }
    // Mushrooms
    if (tile === T.GRASS && rng() < 0.005) {
      map[y][x] = T.MUSHROOM;
    }
  }
  
  // Signs
  decor.push({ x: homeX-1, y: homeY+3, type: 'sign', text: 'The Homestead' });
  decor.push({ x: homeX-12, y: homeY+3, type: 'sign', text: 'Mining Shed' });
  decor.push({ x: homeX+5, y: homeY+9, type: 'sign', text: "Ruby's Hardware" });
  decor.push({ x: homeX+14, y: homeY+7, type: 'sign', text: "The Hodl Tavern" });
  decor.push({ x: homeX+10, y: homeY-6, type: 'sign', text: "Town Hall" });
  decor.push({ x: homeX, y: homeY-15, type: 'sign', text: "← Forest  Mountains →" });
  decor.push({ x: 15, y: 30, type: 'sign', text: "Cypherpunk Woods" });
  
  // Bitcoin graffiti / easter eggs
  decor.push({ x: homeX+20, y: homeY+5, type: 'sign', text: "21M" });
  decor.push({ x: homeX-8, y: homeY-8, type: 'sign', text: "HODL" });
  decor.push({ x: 30, y: 25, type: 'sign', text: "In code we trust" });
  
  // Seed fragments hidden in the world
  const fragLocations = [
    { x: homeX-14, y: homeY-1 }, // In mining shed
    { x: 15, y: 20 }, // Deep forest
    { x: 90, y: 15 }, // Mountain cave
    { x: homeX+30, y: homeY+20 }, // Near lake
  ];
  for (const loc of fragLocations) {
    decor.push({ x: loc.x, y: loc.y, type: 'seed_fragment' });
  }
  
  // Border
  for (let x = 0; x < MAP_W; x++) { map[0][x] = T.CLIFF; map[MAP_H-1][x] = T.CLIFF; }
  for (let y = 0; y < MAP_H; y++) { map[y][0] = T.CLIFF; map[y][MAP_W-1] = T.CLIFF; }
}

function buildBuilding(bx, by, w, h, type) {
  for (let y = by; y < by+h; y++) for (let x = bx; x < bx+w; x++) {
    if (y>=0&&y<MAP_H&&x>=0&&x<MAP_W) {
      if (y===by||y===by+h-1||x===bx||x===bx+w-1) map[y][x] = T.WALL;
      else map[y][x] = type==='shop' ? T.SHOP : T.FLOOR;
    }
  }
  // Door
  const doorX = bx + Math.floor(w/2);
  if (by+h-1 < MAP_H) map[by+h-1][doorX] = T.PATH;
  if (w > 5 && by+h-1 < MAP_H) map[by+h-1][doorX+1] = T.PATH; // double door for shop
}

function drawPath(x1, y1, x2, y2, width) {
  const dx = Math.sign(x2-x1), dy = Math.sign(y2-y1);
  let x = x1, y = y1;
  while (true) {
    for (let w = 0; w < width; w++) {
      const px = dx !== 0 ? x : x + w;
      const py = dy !== 0 ? y : y + w;
      if (px>=0&&px<MAP_W&&py>=0&&py<MAP_H && !SOLID.has(map[py][px])) map[py][px] = T.PATH;
    }
    if (x === x2 && y === y2) break;
    if (x !== x2) x += dx;
    if (y !== y2) y += dy;
  }
}

function setT(x,y,t){if(y>=0&&y<MAP_H&&x>=0&&x<MAP_W)map[y][x]=t;}
function isSolid(tx,ty){if(tx<0||ty<0||tx>=MAP_W||ty>=MAP_H)return true;return SOLID.has(map[ty][tx]);}

// ============================================================
// PLAYER
// ============================================================
const player = {
  x:55*TILE+8, y:47*TILE+8,
  speed:95, facing:{x:0,y:-1},
  wallet:2500, totalEarned:0,
  wf:0, wt:0, moving:false,
  boost:0, energy:100, maxEnergy:100,
};

// ============================================================
// MINING RIGS
// ============================================================
const rigs = [];
class Rig {
  constructor(x,y,tier=0){
    this.x=x;this.y=y;this.tier=tier;
    this.powered=true;this.hr=[1,5,50][tier];this.ht=[.2,.8,2][tier];
    this.temp=20;this.dur=100;this.oh=false;this.mined=0;
    this.ma=0;this.ha=0;this.af=0;this.at=0;
  }
  static N=['CPU Miner','GPU Rig','ASIC S21'];
  static C=['#556','#669','#975'];
  update(dt){
    this.at+=dt;if(this.at>.3){this.at=0;this.af=(this.af+1)%4;}
    let cool=0;
    for(const i of placed) if(i.type==='cooling_fan'&&Math.hypot(i.x-this.x,i.y-this.y)<TILE*3) cool+=.15;
    this.ha+=dt;
    if(this.ha>=1){this.ha=0;if(this.powered&&this.dur>0)this.temp+=this.ht*3;this.temp-=(this.temp-20)*(.06+cool);this.temp=Math.max(15,Math.min(100,this.temp));if(this.temp>=85)this.oh=true;if(this.temp<65)this.oh=false;}
    if(!this.powered||this.dur<=0||this.oh)return 0;
    this.ma+=dt;let e=0;
    if(this.ma>=2){this.ma=0;const hp=1-Math.max(0,Math.min(.5,(this.temp-70)/30));const dp=this.dur/100;const ef=this.hr*hp*dp;e=Math.max(1,Math.floor(ef*10/econ.diff));this.mined+=e;
    if(Math.random()<ef*.0001){const rw=312500;e+=rw;this.mined+=rw;notify('⛏️ BLOCK FOUND! +312,500 sats!',6,true);sfx.block();}
    this.dur=Math.max(0,this.dur-.03);}return e;
  }
  status(){if(this.dur<=0)return'BROKEN';if(this.oh)return'OVERHEAT';if(!this.powered)return'OFF';return Math.floor(this.hr*(this.dur/100)/econ.diff*10)+' s/s';}
  statusCol(){if(this.dur<=0)return C.red;if(this.oh)return C.ledOrange;if(!this.powered)return C.gray;return C.ledGreen;}
}
const placed = []; // solar, battery, fan

// ============================================================
// NPCs
// ============================================================
const homeX=55, homeY=45;
const npcs = [
  { name:'Hodl Hannah',x:(homeX+8)*TILE+8,y:(homeY)*TILE+8,col:'#FF69B4',hair:'#FFD700',role:'friend',
    dlg:[
      '"The garden grows slow, but it grows forever. Just like the timechain."',
      '"Your uncle ran this node for 15 years straight. 99.98% uptime. Legend."',
      '"I bought my first sats when everyone said it was dead. Again."',
      '"Don\'t listen to Larry. Low time preference is the way."',
      '"My cold storage is backed up in three locations. You should do the same."',
      '"Have you read The Bitcoin Standard? Your uncle had a signed copy somewhere."',
      '"21 million. That\'s it. That\'s the whole point."',
      '"They called your uncle crazy for stacking at $100. Who\'s crazy now?"',
      '"Every sat you earn is a sat they can\'t print."',
      '"I remember the first time I ran my own node. Felt like freedom."',
    ],
    wp:[{x:homeX+8,y:homeY},{x:homeX+11,y:homeY},{x:homeX+11,y:homeY+2},{x:homeX+8,y:homeY+2}],pi:0,mt:0,mi:3 },
  { name:'Leverage Larry',x:(homeX+14)*TILE+8,y:(homeY+10)*TILE+8,col:'#4455FF',hair:'#222',role:'friend',
    dlg:[
      '"100x long, funded. Can\'t go tits up."',
      '"I\'m either getting a lambo or sleeping on your couch again."',
      '"Bro this altcoin is doing a 50x, you gotta — wait, wrong valley."',
      '"Down 90% but my conviction is UP. That\'s what matters."',
      '"I got liquidated at 3am. Market makers are out to get me."',
      '"Just need one more trade to make it all back."',
      '"My portfolio is 50% BTC, 50% regret."',
      '"The chart is forming a reverse head and shoulders if you squint."',
      '"I\'m not gambling, it\'s called risk management."',
      '"When I make it, I\'m buying this whole valley. Mark my words."',
    ],
    wp:[{x:homeX+14,y:homeY+10},{x:homeX+17,y:homeY+10},{x:homeX+17,y:homeY+12},{x:homeX+14,y:homeY+12}],pi:0,mt:0,mi:2 },
  { name:'Mayor Keynesian',x:(homeX+10)*TILE+8,y:(homeY-3)*TILE+8,col:'#888',hair:'#AAA',role:'friend',
    dlg:[
      '"We need more stimulus for the village economy!"',
      '"A little inflation is GOOD for the economy. Trust the experts."',
      '"Your uncle refused FiatBucks. Very unpatriotic."',
      '"The Central Bank has our best interests at heart."',
      '"We\'re printing — I mean, providing liquidity to help everyone."',
      '"Deflation is dangerous! People would stop buying bread!"',
      '"Gold bugs, bitcoin bugs... why can\'t people just trust the system?"',
      '"I\'ve raised village taxes 3% to fund... important infrastructure."',
      '"The village debt is an investment in our future!"',
      '"We\'re not bankrupt, we\'re strategically leveraged."',
    ],
    wp:[{x:homeX+10,y:homeY-3},{x:homeX+13,y:homeY-3},{x:homeX+13,y:homeY-1},{x:homeX+10,y:homeY-1}],pi:0,mt:0,mi:4 },
  { name:'Ruby',x:(homeX+5)*TILE+8,y:(homeY+13)*TILE+8,col:'#CC4444',hair:'#FF6644',role:'shop',
    dlg:[
      '"Press B to browse! Everything priced in sats — no fiat here."',
      '"These ASICs came off the boat from Shenzhen last week."',
      '"Your uncle was my best customer. Bought three S9s on launch day."',
      '"Solar + mining = proof of work powered by proof of sunshine."',
      '"I only accept Bitcoin. Mayor tried paying in FiatBucks once. Once."',
      '"Pro tip: immersion cooling is endgame. I\'m working on it."',
      '"Every miner I sell makes the network stronger. That\'s the real product."',
    ],
    wp:[{x:homeX+5,y:homeY+13},{x:homeX+7,y:homeY+13}],pi:0,mt:0,mi:5 },
  { name:'The Hermit',x:12*TILE+8,y:35*TILE+8,col:'#363',hair:'#555',role:'friend',
    dlg:[
      '"Your uncle understood: cypherpunks write code."',
      '"Privacy is not secrecy. A private matter is something one doesn\'t want the whole world to know."',
      '"I was there for the Block Size Wars. You weren\'t. Be grateful."',
      '"Running a node isn\'t about profit. It\'s about not trusting anyone else to verify."',
      '"Don\'t trust. Verify. That\'s not just a slogan."',
      '"I knew Hal... before. He would have loved what this became."',
      '"The seed phrase fragments your uncle left — each one is a piece of history."',
      '"UASF. Four letters that saved Bitcoin. Ask me sometime."',
      '"In the early days, you could mine on a laptop. I still have mine."',
      '"The Chancellor was on the brink of a second bailout for the banks. That\'s how it started."',
    ],
    wp:[{x:12,y:35},{x:10,y:35},{x:10,y:38},{x:12,y:38}],pi:0,mt:0,mi:6 },
  { name:'Saylor',x:(homeX+14)*TILE+8,y:(homeY-4)*TILE+8,col:'#1A1A6B',hair:'#333',role:'friend',
    dlg:[
      '"Bitcoin is a swarm of cyber hornets serving the goddess of wisdom."',
      '"I bought the top. Then I bought more. The top is just the beginning."',
      '"There is no second best. There is Bitcoin, and there are shitcoins."',
      '"Your uncle understood monetary energy before most people understood money."',
      '"MicroStrategy — I mean, my previous venture — we went all in."',
      '"Every day you don\'t stack is a day you chose inflation."',
      '"Laser eyes aren\'t a meme. They\'re a lifestyle."',
      '"I sold my house to buy bitcoin. Then I bought a better house."',
    ],
    wp:[{x:homeX+14,y:homeY-4},{x:homeX+16,y:homeY-4},{x:homeX+16,y:homeY-2},{x:homeX+14,y:homeY-2}],pi:0,mt:0,mi:5 },
  { name:'Pizza Pete',x:(homeX-5)*TILE+8,y:(homeY+12)*TILE+8,col:'#CC8800',hair:'#664400',role:'friend',
    dlg:[
      '"I once traded 10,000 BTC for two pizzas. Don\'t look at me like that."',
      '"May 22nd, 2010. The most expensive lunch in history. My lunch."',
      '"Laszlo was right about one thing — the pizza was pretty good."',
      '"Every time BTC hits a new ATH, someone sends me a pizza emoji."',
      '"I\'m not bitter. I bootstrapped the first real BTC transaction. History."',
      '"Your uncle always ordered two pizzas on Pizza Day. Tradition."',
      '"At least I proved Bitcoin had real-world value. You\'re welcome."',
    ],
    wp:[{x:homeX-5,y:homeY+12},{x:homeX-3,y:homeY+12},{x:homeX-3,y:homeY+14},{x:homeX-5,y:homeY+14}],pi:0,mt:0,mi:4 },
];

// ============================================================
// SHOP
// ============================================================
const SHOP_LIST = ['wrench','pickaxe','cpu_miner','gpu_rig','asic_s21','solar_panel','battery','cooling_fan','bread','coffee','potato_seed','tomato_seed','corn_seed'];
let shopOpen=false, shopCur=0, shopMode='buy';

// ============================================================
// UI STATE
// ============================================================
let dlg = null; // active dialogue
let invOpen = false;
const notifs = [];
function notify(text,dur=2.5,big=false){notifs.push({text,t:dur,big});}
const particles = [];
function satPart(x,y,n){particles.push({x:x*SCALE,y:y*SCALE,text:'+'+fmt(n),life:1.5,vy:-30});}

// ============================================================
// ECONOMY & TIME
// ============================================================
const econ = {diff:1,phase:0,phaseN:['Accumulation','Hype','Euphoria','Capitulation'],pd:0,cycle:0,inf:1,halvings:0};

// ============================================================
// SKILLS SYSTEM — Visible progression
// ============================================================
const skills = {
  mining: { level: 1, xp: 0, next: 100, icon: '⛏️', name: 'Mining' },
  farming: { level: 1, xp: 0, next: 100, icon: '🌱', name: 'Farming' },
  engineering: { level: 1, xp: 0, next: 100, icon: '⚙️', name: 'Engineering' },
  social: { level: 1, xp: 0, next: 100, icon: '💬', name: 'Social' },
  foraging: { level: 1, xp: 0, next: 100, icon: '🍄', name: 'Foraging' },
};

function addXP(skill, amount) {
  const s = skills[skill]; if (!s) return;
  s.xp += amount;
  while (s.xp >= s.next) {
    s.xp -= s.next; s.level++;
    s.next = Math.floor(s.next * 1.5);
    notify(`🎉 ${s.icon} ${s.name} leveled up to ${s.level}!`, 4, true);
    sfx.buy();
  }
}

// ============================================================
// CROP SYSTEM — "Something finishing soon" mechanic
// ============================================================
const crops = []; // { x, y, type, planted, growDays, stage, water }
const CROP_TYPES = {
  potato: { name: 'Potato', icon: '🥔', grow: 4, sell: 120, stages: ['🌱','🌿','🥬','🥔'] },
  tomato: { name: 'Tomato', icon: '🍅', grow: 6, sell: 200, stages: ['🌱','🌿','🌺','🍅'] },
  corn: { name: 'Corn', icon: '🌽', grow: 8, sell: 350, stages: ['🌱','🌿','🌾','🌽'] },
  pumpkin: { name: 'Pumpkin', icon: '🎃', grow: 12, sell: 800, stages: ['🌱','🌿','🎃','🎃'] },
};

function plantCrop(x, y, type) {
  crops.push({ x, y, type, planted: time.day, dayAge: 0, stage: 0, watered: false });
}

function updateCrops() {
  for (const crop of crops) {
    crop.dayAge++;
    const info = CROP_TYPES[crop.type];
    const progress = crop.dayAge / info.grow;
    crop.stage = Math.min(info.stages.length - 1, Math.floor(progress * info.stages.length));
    crop.watered = false; // Reset daily
  }
}

function harvestCrop(index) {
  const crop = crops[index];
  const info = CROP_TYPES[crop.type];
  if (crop.dayAge >= info.grow) {
    const value = Math.ceil(info.sell * marketMult());
    player.wallet += value;
    player.totalEarned += value;
    addXP('farming', 15 + info.grow * 2);
    notify(`${info.icon} Harvested ${info.name}! +${fmt(value)} sats`, 3);
    sfx.coin();
    crops.splice(index, 1);
    return true;
  }
  return false;
}

// ============================================================
// NPC RELATIONSHIP SYSTEM — Hearts
// ============================================================
const relationships = {};
function initRelationships() {
  for (const npc of npcs) {
    if (!relationships[npc.name]) {
      relationships[npc.name] = { hearts: 0, maxHearts: 10, talked: false, gifted: false };
    }
  }
}

function addHearts(name, amount) {
  const r = relationships[name]; if (!r) return;
  r.hearts = Math.min(r.maxHearts, r.hearts + amount);
  addXP('social', 5);
}

// ============================================================
// DAILY SUMMARY — End of day recap
// ============================================================
let showDaySummary = false;
let daySummary = null;
let lastDayEarned = 0;
let lastDayCrops = 0;

function createDaySummary() {
  const earned = player.totalEarned - lastDayEarned;
  lastDayEarned = player.totalEarned;
  
  daySummary = {
    day: time.day - 1,
    earned,
    rigsActive: rigs.filter(r => r.powered && r.dur > 0).length,
    cropsGrown: 0,
    phase: econ.phaseN[econ.phase],
  };
  showDaySummary = true;
}

// ============================================================
// CONTROLS OVERLAY
// ============================================================
let showControls = false;
const CONTROLS_LIST = [
  ['WASD / Arrows', 'Move around'],
  ['E', 'Interact (talk, toggle rigs, repair)'],
  ['R', 'Use selected item / Plant crop on dirt'],
  ['1-9, 0', 'Select hotbar slot'],
  ['I / Tab', 'Open inventory'],
  ['B', 'Open shop (near Ruby)'],
  ['O', 'View objectives'],
  ['H', 'Harvest crop (when near ready crop)'],
  ['K', 'Skills overview'],
  ['P', 'Save game'],
  ['L', 'Load game'],
  ['M', 'Toggle music'],
  ['Space', 'Fast forward time'],
  ['F', 'Toggle fullscreen'],
  ['?', 'This controls screen'],
  ['Esc', 'Close any menu'],
];

// ============================================================
// MUSIC
// ============================================================
let music = null;
let musicOn = true;
function startMusic() {
  if (!music) music = new MusicEngine();
  music.start();
}
// ============================================================
// BITCOIN CULTURE EVENTS — Random daily events
// ============================================================
const BTC_EVENTS = [
  // FUD events (Capitulation phase more likely)
  { text: '📰 BREAKING: China bans Bitcoin for the 47th time!', effect: 'fud', phase: [3], chance: 0.15 },
  { text: '📰 Senator proposes "Digital Asset Compliance Act"', effect: 'fud', phase: [2,3], chance: 0.1 },
  { text: '📰 Famous economist declares Bitcoin dead (obituary #892)', effect: 'fud', phase: [3], chance: 0.12 },
  { text: '📰 Major exchange suffers "temporary" withdrawal freeze', effect: 'fud', phase: [2,3], chance: 0.08 },
  { text: '📰 Tether FUD resurfaces again', effect: 'fud', phase: [2,3], chance: 0.1 },
  { text: '💥 FTX 2.0 collapses! "Your keys, your coins" validated again', effect: 'fud', phase: [3], chance: 0.06 },
  
  // Bullish events (Hype/Euphoria more likely)
  { text: '🚀 Nation-state adds Bitcoin to treasury reserves!', effect: 'bull', phase: [1,2], chance: 0.08 },
  { text: '🚀 Major corporation announces Bitcoin salary option', effect: 'bull', phase: [1,2], chance: 0.1 },
  { text: '🚀 Lightning Network capacity hits new ATH!', effect: 'bull', phase: [1], chance: 0.12 },
  { text: '🟢 Hash rate reaches all-time high!', effect: 'bull', phase: [0,1], chance: 0.15 },
  { text: '🎉 Bitcoin Pizza Day! Community celebrates the OG transaction', effect: 'bull', phase: [0,1,2,3], chance: 0.05 },
  { text: '📈 Wall Street FOMO: Another ETF application filed', effect: 'bull', phase: [1,2], chance: 0.1 },
  { text: '🏛️ "Bitcoin is freedom money" trends worldwide', effect: 'bull', phase: [2], chance: 0.08 },
  
  // Neutral / cultural events
  { text: '🐻 Bear spotted near the valley. Not that kind of bear.', effect: 'none', phase: [0,1,2,3], chance: 0.05 },
  { text: '🐋 A whale moved 10,000 BTC. Mempool is sweating.', effect: 'none', phase: [0,1,2,3], chance: 0.08 },
  { text: '⚡ Lightning payment broke the speed record: 0.003 seconds!', effect: 'none', phase: [0,1], chance: 0.06 },
  { text: '📻 Podcast: "What Bitcoin Did" interviews the village hermit', effect: 'none', phase: [0,1,2,3], chance: 0.04 },
  { text: '🔮 Astrologer predicts BTC to $1M. Charts confirm, obviously.', effect: 'none', phase: [1,2], chance: 0.06 },
  { text: '🐦 "Few understand" trends on Nostr', effect: 'none', phase: [0,1,2,3], chance: 0.07 },
  { text: '📖 Saifedean releases a new chapter. The village reads it overnight.', effect: 'none', phase: [0,1,2,3], chance: 0.04 },
  { text: '🏔️ Difficulty adjustment incoming — your rigs feel it', effect: 'diff', phase: [0,1,2,3], chance: 0.1 },
  { text: '⏰ Tick tock, next block. The timechain never stops.', effect: 'none', phase: [0,1,2,3], chance: 0.08 },
  { text: '🧡 "We\'re all gonna make it" — the village motto today', effect: 'none', phase: [1,2], chance: 0.06 },
  { text: '💀 "Have fun staying poor" — graffiti appears on the Fiat Bank', effect: 'none', phase: [0,1,2,3], chance: 0.05 },
  { text: '🌋 Volcano mining facility comes online in neighboring region!', effect: 'bull', phase: [0,1], chance: 0.04 },
  { text: '🗓️ Today is Proof of Keys Day! Not your keys, not your coins.', effect: 'none', phase: [0,1,2,3], chance: 0.03 },
  { text: '🎯 Block 21,000,000 mined. Oh wait, that\'s not how it works.', effect: 'none', phase: [0,1,2,3], chance: 0.02 },
];

function triggerRandomEvent() {
  const eligible = BTC_EVENTS.filter(e => e.phase.includes(econ.phase) && Math.random() < e.chance);
  if (eligible.length === 0) return;
  const event = eligible[Math.floor(Math.random() * eligible.length)];
  
  notify(event.text, 5, true);
  
  switch (event.effect) {
    case 'fud':
      // FUD slows mining temporarily, shakes weak hands
      for (const r of rigs) r.temp += 5; // Stress on rigs
      break;
    case 'bull':
      // Bullish: small sat bonus
      const bonus = Math.floor(50 + Math.random() * 200);
      player.wallet += bonus;
      player.totalEarned += bonus;
      break;
    case 'diff':
      // Difficulty adjustment
      econ.diff *= (0.9 + Math.random() * 0.2);
      break;
  }
}

// ============================================================
// BITCOIN LOADING TIPS (shown during intro)
// ============================================================
const BTC_TIPS = [
  "Not your keys, not your coins.",
  "Bitcoin fixes this.",
  "Stack sats. Stay humble.",
  "In a world of infinite money, be finite.",
  "The best time to buy bitcoin was yesterday. The second best time is now.",
  "Proof of work > Proof of stake.",
  "1 BTC = 100,000,000 satoshis.",
  "Running a node means trusting no one but the math.",
  "The halvening reduces the block reward every 210,000 blocks.",
  "Satoshi Nakamoto's identity remains unknown to this day.",
  "The Genesis Block contains: 'Chancellor on brink of second bailout for banks'.",
  "There will only ever be 21 million bitcoin.",
  "Bitcoin has been declared dead 474+ times. It's still here.",
  "HODL originated from a drunk forum post in 2013.",
  "The Lightning Network enables instant micropayments.",
  "Bitcoin's difficulty adjusts every 2,016 blocks (~2 weeks).",
  "Len Sassaman and Hal Finney: legends of cryptography.",
  "UASF: when users took back control from miners.",
  "Fix the money, fix the world.",
  "Low time preference is a superpower.",
  "Fiat currency has a 100% failure rate over a long enough timeline.",
  "The cantillon effect: those closest to the money printer benefit most.",
  "Number go up technology™",
  "Hyperbitcoinization is inevitable.",
];

function toggleMusic() {
  if (!music) { startMusic(); return; }
  if (musicOn) { music.stop(); musicOn = false; notify('🔇 Music off', 1.5); }
  else { music.start(); musicOn = true; notify('🎵 Music on', 1.5); }
}
const time = {dl:180,cur:.25,day:1,spd:1,td:1};
function getHour(){return time.cur*24;}
function getTimeStr(){const h=Math.floor(getHour()),m=Math.floor((getHour()-h)*60);return`${h%12||12}:${m.toString().padStart(2,'0')} ${h<12?'AM':'PM'}`;}
function getPeriod(){const h=getHour();if(h<5)return'Night';if(h<7)return'Dawn';if(h<12)return'Morning';if(h<14)return'Noon';if(h<17)return'Afternoon';if(h<21)return'Evening';return'Night';}
function getDayOv(){const h=getHour();if(h<5)return{r:10,g:10,b:30,a:.5};if(h<6.5)return{r:80,g:50,b:60,a:lerp(.4,.1,(h-5)/1.5)};if(h<7.5)return{r:200,g:160,b:110,a:lerp(.1,0,(h-6.5))};if(h<17)return{r:0,g:0,b:0,a:0};if(h<19)return{r:220,g:120,b:50,a:lerp(0,.12,(h-17)/2)};if(h<21)return{r:60,g:40,b:90,a:lerp(.12,.35,(h-19)/2)};return{r:15,g:15,b:35,a:lerp(.35,.5,(h-21)/3)};}
function marketMult(){return[.9,1.1,1.5,.7][econ.phase];}

const cam = {x:0,y:0};

// ============================================================
// SAVE / LOAD
// ============================================================
function saveGame(){try{localStorage.setItem('sv_save',JSON.stringify({v:5,p:{x:player.x,y:player.y,w:player.wallet,te:player.totalEarned,e:player.energy},inv:inv.map(s=>s?{id:s.id,q:s.qty}:null),ss:selSlot,rigs:rigs.map(r=>({x:r.x,y:r.y,t:r.tier,p:r.powered,tp:r.temp,d:r.dur,m:r.mined})),placed:placed.map(i=>({x:i.x,y:i.y,t:i.type})),econ:{...econ},time:{...time},pwr:{p:pwr.panels,b:pwr.batts},obj:objectives.map(o=>o.done),tut:tutorialDone,skills,crops:crops.map(c=>({x:c.x,y:c.y,type:c.type,dayAge:c.dayAge,stage:c.stage})),rels:relationships}));notify('💾 Saved!',2);sfx.buy();}catch(e){notify('❌ Save failed!',2);}}
function loadGame(){try{const d=JSON.parse(localStorage.getItem('sv_save'));if(!d)return notify('No save found!',2),false;player.x=d.p.x;player.y=d.p.y;player.wallet=d.p.w;player.totalEarned=d.p.te;player.energy=d.p.e||100;inv.length=0;d.inv.forEach(s=>inv.push(s?{id:s.id,qty:s.q}:null));selSlot=d.ss||0;rigs.length=0;d.rigs.forEach(r=>{const ri=new Rig(r.x,r.y,r.t);ri.powered=r.p;ri.temp=r.tp;ri.dur=r.d;ri.mined=r.m;rigs.push(ri);});placed.length=0;(d.placed||[]).forEach(i=>placed.push(i));Object.assign(econ,d.econ);Object.assign(time,d.time);pwr.panels=d.pwr?.p||[];pwr.batts=d.pwr?.b||[];if(d.obj)d.obj.forEach((done,i)=>{if(objectives[i])objectives[i].done=done;});tutorialDone=d.tut||false;
    if(d.skills)Object.assign(skills,d.skills);
    crops.length=0;if(d.crops)d.crops.forEach(c=>crops.push(c));
    if(d.rels)Object.assign(relationships,d.rels);gameState='playing';notify('📂 Loaded!',2);sfx.buy();return true;}catch(e){notify('❌ Load failed!',2);return false;}}

// ============================================================
// INIT
// ============================================================
generateMap();
rigs.push(new Rig((homeX-12)*TILE+8, (homeY)*TILE+8, 0));
rigs.push(new Rig((homeX-10)*TILE+8, (homeY)*TILE+8, 0));
addItem('wrench', 3);
addItem('bread', 5);
addItem('cpu_miner', 1);
addItem('potato_seed', 5);
addItem('tomato_seed', 3);

// Check for existing save
if (localStorage.getItem('sv_save')) {
  // Will offer load on title
}

// ============================================================
// INTRO / STORY SCREEN
// ============================================================
function updateIntro(dt) {
  introTimer += dt;
  const slide = INTRO_SLIDES[introStep];
  
  if (jp['enter'] || jp['e'] || jp[' ']) {
    if (introStep === INTRO_SLIDES.length - 1) {
      // Check for save
      if (localStorage.getItem('sv_save')) {
        if (confirm('Continue saved game?')) { loadGame(); }
        else { gameState = 'playing'; sfx.story(); startMusic(); }
      } else {
        gameState = 'playing'; sfx.story(); startMusic();
      }
    } else {
      introStep++; introTimer = 0;
    }
  }
  
  if (slide.dur < 900 && introTimer > slide.dur) {
    introStep = Math.min(introStep + 1, INTRO_SLIDES.length - 1);
    introTimer = 0;
  }
  
  for (const k in jp) jp[k] = false;
}

function drawIntro() {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  const slide = INTRO_SLIDES[introStep];
  const alpha = Math.min(1, introTimer * 2) * (introStep === INTRO_SLIDES.length - 1 ? 1 : Math.min(1, (slide.dur - introTimer) * 2));
  
  ctx.globalAlpha = Math.max(0, alpha);
  
  if (introStep === INTRO_SLIDES.length - 1) {
    // Title screen
    ctx.fillStyle = C.orange;
    ctx.font = `bold ${Math.floor(canvas.width * 0.04)}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('⛏️ SATOSHI VALLEY ⛏️', canvas.width/2, canvas.height * 0.35);
    
    ctx.fillStyle = '#AAA';
    ctx.font = `${Math.floor(canvas.width * 0.014)}px ${FONT}`;
    ctx.fillText('A Bitcoin Farming Sim', canvas.width/2, canvas.height * 0.42);
    
    // Pulsing "Press ENTER"
    ctx.globalAlpha = 0.5 + Math.sin(performance.now() / 500) * 0.5;
    ctx.fillStyle = C.orange;
    ctx.font = `bold ${Math.floor(canvas.width * 0.012)}px ${FONT}`;
    ctx.fillText('Press ENTER to begin', canvas.width/2, canvas.height * 0.6);
    
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#666';
    ctx.font = `${Math.floor(canvas.width * 0.009)}px ${FONT}`;
    if (localStorage.getItem('sv_save')) ctx.fillText('(Saved game found)', canvas.width/2, canvas.height * 0.65);
  } else {
    // Story slides
    ctx.fillStyle = C.white;
    ctx.font = `${Math.floor(canvas.width * 0.018)}px ${FONT}`;
    ctx.textAlign = 'center';
    const lines = slide.text.split('\n');
    lines.forEach((line, i) => {
      ctx.fillText(line, canvas.width/2, canvas.height * 0.4 + i * canvas.width * 0.025);
    });
    
    if (slide.sub) {
      ctx.fillStyle = C.orange;
      ctx.font = `italic ${Math.floor(canvas.width * 0.013)}px ${FONT}`;
      ctx.fillText(slide.sub, canvas.width/2, canvas.height * 0.55);
    }
    
    // Bitcoin tip
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = C.orange;
    ctx.font = `italic ${Math.floor(canvas.width * 0.009)}px ${FONT}`;
    ctx.fillText('💡 ' + BTC_TIPS[introStep % BTC_TIPS.length], canvas.width/2, canvas.height * 0.82);
    
    // Skip hint
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#555';
    ctx.font = `${Math.floor(canvas.width * 0.008)}px ${FONT}`;
    ctx.fillText('Press ENTER to skip', canvas.width/2, canvas.height * 0.9);
  }
  
  ctx.globalAlpha = 1;
}

// ============================================================
// MAIN UPDATE
// ============================================================
let lastTime = performance.now();
let placeCd=0, intCd=0, footT=0;
let tutTimer = 0, tutTriggered = false;

function update(dt) {
  if (gameState === 'intro') { updateIntro(dt); return; }
  
  // Time
  time.cur += (dt*time.spd)/time.dl;
  if (time.cur>=1){time.cur-=1;time.day++;time.td++;econ.pd++;
    updateCrops(); // Grow crops each day
    triggerRandomEvent(); // Bitcoin culture events
    createDaySummary(); // Show daily recap
    // Reset NPC talk flags
    for (const name in relationships) { relationships[name].talked = false; relationships[name].gifted = false; }
    if(time.day%7===0)saveGame();
    if(econ.pd>=28){econ.pd=0;econ.phase=(econ.phase+1)%4;
      if(econ.phase===0){econ.cycle++;econ.inf*=1.05;
        if(econ.cycle%4===0){econ.halvings++;notify(`🔶 HALVING #${econ.halvings}!`,6,true);completeObjective('first_halving');}
      }
      if(econ.phase===3)completeObjective('survive_bear');
      notify(`📈 ${econ.phaseN[econ.phase]} phase`,3);
    }
  }
  time.spd = keys[' '] ? 15 : 1;
  if(player.boost>0){player.boost-=dt;if(player.boost<=0)notify('☕ Coffee wore off',1.5);}
  const spd = player.speed*(player.boost>0?1.5:1);
  
  // Objective checks
  if(player.totalEarned>=1000) completeObjective('earn_1000');
  if(player.totalEarned>=50000) completeObjective('earn_50000');
  
  // ---- TUTORIAL ----
  if (!tutorialDone && tutorialStep < TUTORIAL_STEPS.length) {
    const tut = TUTORIAL_STEPS[tutorialStep];
    tutTimer += dt;
    if (tut.trigger === 'auto' && tutTimer > (tut.dur || 4)) { tutorialStep++; tutTimer = 0; }
    if (tut.trigger === 'move' && player.moving) { tutorialStep++; tutTimer = 0; }
    if (tut.trigger === 'near_rig' && rigs.some(r => Math.hypot(r.x-player.x,r.y-player.y) < 48)) { tutorialStep++; tutTimer = 0; }
    if (tut.trigger === 'interact_rig' && jp['e'] && rigs.some(r => Math.hypot(r.x-player.x,r.y-player.y) < 48)) { tutTriggered=true; }
    if (tut.trigger === 'interact_rig' && tutTriggered) { tutorialStep++; tutTimer = 0; tutTriggered=false; }
    if (tut.trigger === 'earn_sats' && player.totalEarned > 10) { tutorialStep++; tutTimer = 0; }
    if (tut.trigger === 'open_inv' && jp['i']) { tutorialStep++; tutTimer = 0; }
    if (tut.trigger === 'select_item' && (jp['1']||jp['2']||jp['3'])) { tutorialStep++; tutTimer = 0; }
    if (tut.trigger === 'visit_shop' && npcs.find(n=>n.role==='shop'&&Math.hypot(n.x-player.x,n.y-player.y)<60)) { tutorialStep++; tutTimer = 0; completeObjective('visit_shop'); }
    if (tutorialStep >= TUTORIAL_STEPS.length) tutorialDone = true;
  }
  
  // ---- MENU INPUTS ----
  if(jp['o']) showObjectives = !showObjectives;
  if(jp['k']) showSkills = !showSkills;
  if(jp['?']) showControls = !showControls;
  if(jp['m']) toggleMusic();
  if(jp['h'] && !shopOpen && !invOpen) {
    // Harvest nearest crop
    const ix = player.x + player.facing.x * 16, iy = player.y + player.facing.y * 16;
    for (let i = crops.length - 1; i >= 0; i--) {
      if (Math.hypot(crops[i].x * TILE + 8 - ix, crops[i].y * TILE + 8 - iy) < 24) {
        if (harvestCrop(i)) break;
        else { notify('Not ready yet! ' + (CROP_TYPES[crops[i].type].grow - crops[i].dayAge) + ' days left', 2); break; }
      }
    }
  }
  if (showDaySummary && (jp['enter'] || jp['e'] || jp[' '])) { showDaySummary = false; }
  if(jp['b']){const nr=npcs.find(n=>n.role==='shop'&&Math.hypot(n.x-player.x,n.y-player.y)<60);if(nr&&!shopOpen){shopOpen=true;shopCur=0;shopMode='buy';sfx.menuOpen();dlg=null;}else if(shopOpen){shopOpen=false;sfx.menuClose();}}
  if(jp['i']||jp['tab']){if(!shopOpen){invOpen=!invOpen;invOpen?sfx.menuOpen():sfx.menuClose();}}
  if(jp['escape']){if(shopOpen){shopOpen=false;sfx.menuClose();}else if(invOpen){invOpen=false;sfx.menuClose();}else if(dlg)dlg=null;else if(showObjectives)showObjectives=false;}
  if(jp['p'])saveGame();if(jp['l'])loadGame();
  for(let n=0;n<=9;n++)if(jp[n.toString()])selSlot=n===0?9:n-1;
  
  // ---- SHOP NAV ----
  if(shopOpen){
    if(jp['arrowup']||jp['w'])shopCur=Math.max(0,shopCur-1);
    if(jp['arrowdown']||jp['s'])shopCur=Math.min((shopMode==='buy'?SHOP_LIST.length:inv.filter(s=>s).length)-1,shopCur+1);
    if(jp['enter']||jp['e']){
      if(shopMode==='buy'){const id=SHOP_LIST[shopCur],it=ITEMS[id],pr=Math.ceil(it.buy*marketMult());
        if(player.wallet>=pr){if(addItem(id)){player.wallet-=pr;sfx.buy();notify(`Bought ${it.icon} ${it.name} (${fmt(pr)})`,2);if(id==='gpu_rig')completeObjective('buy_gpu');}else{notify('Inventory full!',1.5);sfx.error();}}else{notify(`Need ${fmt(pr)} sats!`,1.5);sfx.error();}}
      else{const sell=inv.filter(s=>s&&ITEMS[s.id].sell>0);if(shopCur<sell.length){const s=sell[shopCur],it=ITEMS[s.id],pr=Math.ceil(it.sell*marketMult());removeItem(s.id);player.wallet+=pr;sfx.coin();notify(`Sold ${it.icon} ${it.name} (+${fmt(pr)})`,2);}}
    }
    if(jp['arrowleft']||jp['a']||jp['arrowright']||jp['d']){shopMode=shopMode==='buy'?'sell':'buy';shopCur=0;}
    for(const k in jp)jp[k]=false;return;
  }
  
  // ---- MOVEMENT ----
  if(!dlg&&!invOpen&&!showObjectives){
    let dx=0,dy=0;
    if(keys['w']||keys['arrowup'])dy-=1;if(keys['s']||keys['arrowdown'])dy+=1;
    if(keys['a']||keys['arrowleft'])dx-=1;if(keys['d']||keys['arrowright'])dx+=1;
    player.moving=dx!==0||dy!==0;
    if(player.moving){
      const len=Math.sqrt(dx*dx+dy*dy);dx/=len;dy/=len;player.facing={x:dx,y:dy};
      const nx=player.x+dx*spd*dt,ny=player.y+dy*spd*dt;
      const r=5;
      if(!isSolid(Math.floor((nx-r)/TILE),Math.floor((player.y-r)/TILE))&&!isSolid(Math.floor((nx+r)/TILE),Math.floor((player.y+r)/TILE))&&!isSolid(Math.floor((nx-r)/TILE),Math.floor((player.y+r)/TILE))&&!isSolid(Math.floor((nx+r)/TILE),Math.floor((player.y-r)/TILE)))player.x=nx;
      if(!isSolid(Math.floor((player.x-r)/TILE),Math.floor((ny-r)/TILE))&&!isSolid(Math.floor((player.x+r)/TILE),Math.floor((ny+r)/TILE))&&!isSolid(Math.floor((player.x-r)/TILE),Math.floor((ny+r)/TILE))&&!isSolid(Math.floor((player.x+r)/TILE),Math.floor((ny-r)/TILE)))player.y=ny;
      player.wt+=dt;if(player.wt>.15){player.wt=0;player.wf=(player.wf+1)%4;}
      footT+=dt;if(footT>.35){footT=0;sfx.step();}
      
      // Check seed fragments
      for(let i=decor.length-1;i>=0;i--){
        if(decor[i].type==='seed_fragment'&&Math.hypot(decor[i].x*TILE+8-player.x,decor[i].y*TILE+8-player.y)<20){
          addItem('seed_fragment');notify('🧩 Found a seed phrase fragment!',4,true);sfx.block();decor.splice(i,1);
        }
      }
    }
  }
  
  // ---- INTERACT ----
  intCd-=dt;
  if(jp['e']&&intCd<=0&&!shopOpen&&!invOpen){
    intCd=.25;
    if(dlg){dlg=null;}
    else{
      const ix=player.x+player.facing.x*20,iy=player.y+player.facing.y*20;
      let cr=null,cd=28;for(const r of rigs){const d=Math.hypot(r.x-ix,r.y-iy);if(d<cd){cr=r;cd=d;}}
      if(cr){const sel=getSelected();
        if(sel&&sel.id==='wrench'&&cr.dur<100){cr.dur=Math.min(100,cr.dur+25);removeItem('wrench');sfx.repair();notify(`🔧 Repaired! ${cr.dur.toFixed(0)}%`,2);completeObjective('repair_rig');}
        else{cr.powered=!cr.powered;sfx.interact();notify(`Rig ${cr.powered?'ON ⚡':'OFF 💤'}`,1.5);}
      }else{
        for(const n of npcs){if(Math.hypot(n.x-ix,n.y-iy)<32){dlg={name:n.name,text:n.dlg[Math.floor(Math.random()*n.dlg.length)],role:n.role};sfx.interact();
          if(n.name==='The Hermit')completeObjective('find_hermit');
          initRelationships();
          if(!relationships[n.name].talked){relationships[n.name].talked=true;addHearts(n.name,0.2);addXP('social',3);}
          break;}}
      }
    }
  }
  
  // ---- USE ITEM ----
  placeCd-=dt;
  if(jp['r']&&placeCd<=0&&!shopOpen&&!invOpen&&!dlg){
    placeCd=.3;const sel=getSelected();
    if(!sel){notify('Select item (1-9)',1.5);}
    else{
      const it=ITEMS[sel.id];
      const px=Math.round((player.x+player.facing.x*24)/TILE)*TILE+8;
      const py=Math.round((player.y+player.facing.y*24)/TILE)*TILE+8;
      const ptx=Math.floor(px/TILE),pty=Math.floor(py/TILE);
      if(it.type==='rig'){
        if(!isSolid(ptx,pty)&&!rigs.some(r=>Math.abs(r.x-px)<TILE&&Math.abs(r.y-py)<TILE)){
          removeItem(sel.id);rigs.push(new Rig(px,py,it.tier));sfx.place();notify(`⛏️ ${it.name} placed!`,2);completeObjective('place_rig');
        }else{sfx.error();notify("Can't place here!",1.5);}
      }else if(sel.id==='solar_panel'){
        if(!isSolid(ptx,pty)&&!placed.some(i=>Math.abs(i.x-px)<TILE&&Math.abs(i.y-py)<TILE)){
          removeItem('solar_panel');placed.push({x:px,y:py,type:'solar_panel'});pwr.panels.push({x:px,y:py});sfx.place();notify('☀️ Solar panel!',2);completeObjective('place_solar');
        }else{sfx.error();notify("Can't place here!",1.5);}
      }else if(sel.id==='battery'){
        if(!isSolid(ptx,pty)&&!placed.some(i=>Math.abs(i.x-px)<TILE&&Math.abs(i.y-py)<TILE)){
          removeItem('battery');placed.push({x:px,y:py,type:'battery'});pwr.batts.push({x:px,y:py});sfx.place();notify('🔋 Battery!',2);
        }else{sfx.error();notify("Can't place here!",1.5);}
      }else if(sel.id==='cooling_fan'){
        if(!isSolid(ptx,pty)&&!placed.some(i=>Math.abs(i.x-px)<TILE&&Math.abs(i.y-py)<TILE)){
          removeItem('cooling_fan');placed.push({x:px,y:py,type:'cooling_fan'});sfx.place();notify('🌀 Fan placed!',2);
        }else{sfx.error();notify("Can't place here!",1.5);}
      }else if(sel.id==='bread'){removeItem('bread');player.energy=Math.min(player.maxEnergy,player.energy+30);sfx.coin();notify('🍞 +30 energy',1.5);}
      else if(sel.id==='coffee'){removeItem('coffee');player.boost=30;player.energy=Math.min(player.maxEnergy,player.energy+10);sfx.coin();notify('☕ Speed boost!',2);}
      else if(sel.id==='pickaxe'){
        const tx=Math.floor((player.x+player.facing.x*16)/TILE),ty=Math.floor((player.y+player.facing.y*16)/TILE);
        if(map[ty]&&(map[ty][tx]===T.STONE||map[ty][tx]===T.CLIFF)){
          if(Math.random()<.4){addItem('copper_ore');sfx.repair();notify('🪨 Copper ore!',1.5);addXP('foraging',3);}
          else if(Math.random()<.25){addItem('silicon');sfx.repair();notify('💎 Silicon!',1.5);addXP('foraging',5);}
          else{sfx.interact();notify('Nothing...',1);addXP('foraging',1);}
        }
      }
      // CROP PLANTING on dirt tiles
      else if(sel.id==='potato_seed'||sel.id==='tomato_seed'||sel.id==='corn_seed'){
        const tx=Math.floor((player.x+player.facing.x*16)/TILE),ty=Math.floor((player.y+player.facing.y*16)/TILE);
        if(map[ty]&&map[ty][tx]===T.DIRT&&!crops.some(c=>c.x===tx&&c.y===ty)){
          const cropType = sel.id.replace('_seed','');
          removeItem(sel.id);
          plantCrop(tx,ty,cropType);
          sfx.place();notify(`🌱 Planted ${CROP_TYPES[cropType].name}! (${CROP_TYPES[cropType].grow} days)`,2);
          addXP('farming',5);
        } else { notify("Plant on empty dirt tiles!",1.5); sfx.error(); }
      }
    }
  }
  
  // NPCs
  for(const n of npcs){n.mt+=dt;if(n.mt>=n.mi){n.mt=0;n.pi=(n.pi+1)%n.wp.length;}
    const t=n.wp[n.pi],tx=t.x*TILE+8,ty=t.y*TILE+8,s=30*dt;
    if(Math.abs(n.x-tx)>1)n.x+=Math.sign(tx-n.x)*s;if(Math.abs(n.y-ty)>1)n.y+=Math.sign(ty-n.y)*s;}
  
  // Rigs
  let th=0;for(const r of rigs){const e=r.update(dt);if(e>0){player.wallet+=e;player.totalEarned+=e;if(e>50)satPart(r.x,r.y-10,e);if(e>5&&Math.random()<.1){sfx.coin();if(Math.random()<.05)addXP('mining',1);}}if(r.powered&&!r.oh&&r.dur>0)th+=r.hr;}
  econ.diff=1+(th/10)*.5;updateHum(th);updatePower(dt);
  // Music sync
  if(music&&musicOn){music.setPhase(econ.phase);music.setTimeOfDay(getHour());}
  
  // Camera (smooth)
  cam.x+=(player.x*SCALE-canvas.width/2-cam.x)*3.5*dt;
  cam.y+=(player.y*SCALE-canvas.height/2-cam.y)*3.5*dt;
  
  // Particles & notifs
  for(let i=particles.length-1;i>=0;i--){particles[i].life-=dt;particles[i].y+=particles[i].vy*dt;if(particles[i].life<=0)particles.splice(i,1);}
  for(let i=notifs.length-1;i>=0;i--){notifs[i].t-=dt;if(notifs[i].t<=0)notifs.splice(i,1);}
  
  for(const k in jp)jp[k]=false;
}

// ============================================================
// TILE DRAWING — Beautiful pixel art style
// ============================================================
function drawTile(x,y,tile){
  const sx=x*ST-cam.x,sy=y*ST-cam.y;
  if(sx>canvas.width+ST||sy>canvas.height+ST||sx<-ST||sy<-ST)return;
  const v=(x*7+y*13)%3,t=performance.now()/1000;
  const v2=(x*11+y*3)%5;
  
  switch(tile){
    case T.GRASS:{
      // Rich layered grass
      ctx.fillStyle=C.grass[v2%4];ctx.fillRect(sx,sy,ST,ST);
      // Subtle variation
      if((x+y)%3===0){ctx.fillStyle=C.grass[(v2+1)%4];ctx.fillRect(sx+4,sy+4,ST-8,ST-8);}
      // Tiny grass blades
      if((x*13+y*7)%9===0){ctx.fillStyle=C.grass[4];ctx.fillRect(sx+12,sy+6,3,10);ctx.fillRect(sx+30,sy+14,3,8);}
      break;}
    case T.TALLGRASS:{
      ctx.fillStyle=C.grass[v2%4];ctx.fillRect(sx,sy,ST,ST);
      const sw=Math.sin(t*1.8+x*.7+y*.5)*4;
      ctx.fillStyle='#4A9030';
      for(let i=0;i<4;i++){const ox=6+i*10+sw*(i%2?1:-1);ctx.fillRect(sx+ox,sy+2,3,ST-4);}
      ctx.fillStyle='#5AA040';
      for(let i=0;i<3;i++){const ox=10+i*12+sw*1.2;ctx.fillRect(sx+ox,sy+6,2,ST-10);}
      break;}
    case T.FLOWER:{
      ctx.fillStyle=C.grass[v2%4];ctx.fillRect(sx,sy,ST,ST);
      // Pretty flowers
      const fc=C.flower[(x+y*3)%6];
      ctx.fillStyle='#3A7020';ctx.fillRect(sx+14,sy+16,2,18); // stem
      ctx.fillStyle=fc;ctx.beginPath();ctx.arc(sx+15,sy+14,5,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#FFE060';ctx.beginPath();ctx.arc(sx+15,sy+14,2,0,Math.PI*2);ctx.fill();
      if((x+y)%2===0){ctx.fillStyle='#3A7020';ctx.fillRect(sx+32,sy+22,2,14);
        ctx.fillStyle=C.flower[(x+y*7)%6];ctx.beginPath();ctx.arc(sx+33,sy+20,4,0,Math.PI*2);ctx.fill();}
      break;}
    case T.MUSHROOM:{
      ctx.fillStyle=C.grass[v2%4];ctx.fillRect(sx,sy,ST,ST);
      ctx.fillStyle='#B08040';ctx.fillRect(sx+20,sy+28,4,12); // stem
      ctx.fillStyle='#DD3030';ctx.beginPath();ctx.arc(sx+22,sy+26,8,Math.PI,0);ctx.fill();
      ctx.fillStyle='#FFEECC';ctx.fillRect(sx+19,sy+22,2,2);ctx.fillRect(sx+25,sy+24,2,2);
      break;}
    case T.DIRT:ctx.fillStyle=C.dirt[v];ctx.fillRect(sx,sy,ST,ST);
      if(v2%3===0){ctx.fillStyle=C.richDirt;ctx.fillRect(sx+8,sy+12,8,6);}break;
    case T.STONE:{ctx.fillStyle=C.stone[v];ctx.fillRect(sx,sy,ST,ST);
      ctx.fillStyle=C.darkStone;ctx.fillRect(sx+4,sy+4,14,10);ctx.fillRect(sx+24,sy+20,16,12);
      ctx.fillStyle=C.stone[(v+1)%3];ctx.fillRect(sx+6,sy+6,10,6);break;}
    case T.CLIFF:{ctx.fillStyle=C.darkStone;ctx.fillRect(sx,sy,ST,ST);
      ctx.fillStyle='#353540';ctx.fillRect(sx,sy,ST,ST/3);
      ctx.fillStyle='#4A4A55';ctx.fillRect(sx+4,sy+ST/3,ST-8,4);break;}
    case T.WATER:{const wt=t*1.5+x*.5+y*.3;
      ctx.fillStyle=C.water[v];ctx.fillRect(sx,sy,ST,ST);
      ctx.fillStyle=`rgba(80,160,230,${.08+Math.sin(wt)*.06})`;ctx.fillRect(sx,sy,ST,ST);
      // Wave lines
      ctx.strokeStyle=`rgba(140,200,255,${.1+Math.sin(wt+1)*.05})`;ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(sx,sy+ST*.3+Math.sin(wt)*3);ctx.lineTo(sx+ST,sy+ST*.3+Math.sin(wt+2)*3);ctx.stroke();
      ctx.beginPath();ctx.moveTo(sx,sy+ST*.7+Math.sin(wt+3)*3);ctx.lineTo(sx+ST,sy+ST*.7+Math.sin(wt+5)*3);ctx.stroke();
      break;}
    case T.DEEP:{ctx.fillStyle=C.deepWater;ctx.fillRect(sx,sy,ST,ST);
      ctx.fillStyle=`rgba(40,100,180,${.1+Math.sin(t+x+y)*.08})`;ctx.fillRect(sx,sy,ST,ST);break;}
    case T.SAND:ctx.fillStyle=C.sand[v];ctx.fillRect(sx,sy,ST,ST);
      if(v2%4===0){ctx.fillStyle=C.sand[(v+1)%3];ctx.fillRect(sx+10,sy+8,12,6);}break;
    case T.PATH:ctx.fillStyle=C.path[v];ctx.fillRect(sx,sy,ST,ST);
      if((x+y)%4===0){ctx.fillStyle=C.path[(v+1)%3];ctx.fillRect(sx+8,sy+8,8,8);}break;
    case T.WALL:ctx.fillStyle=C.woodWall;ctx.fillRect(sx,sy,ST,ST);
      ctx.fillStyle=C.woodDark;ctx.fillRect(sx+2,sy+ST/2-1,ST-4,2);ctx.fillRect(sx+ST/2-1,sy+2,2,ST-4);break;
    case T.FLOOR:ctx.fillStyle=C.woodFloor;ctx.fillRect(sx,sy,ST,ST);
      ctx.fillStyle=C.woodLight;for(let i=0;i<3;i++)ctx.fillRect(sx,sy+i*16,ST,1);break;
    case T.SHOP:{ctx.fillStyle='#B09060';ctx.fillRect(sx,sy,ST,ST);
      ctx.fillStyle='#A08050';ctx.fillRect(sx,sy,ST/2,ST/2);ctx.fillRect(sx+ST/2,sy+ST/2,ST/2,ST/2);break;}
    case T.BRIDGE:{ctx.fillStyle='#7A5A30';ctx.fillRect(sx,sy,ST,ST);
      ctx.fillStyle='#6A4A20';ctx.fillRect(sx,sy,ST,4);ctx.fillRect(sx,sy+ST-4,ST,4);
      ctx.fillStyle='#8A6A40';for(let i=0;i<3;i++)ctx.fillRect(sx+4+i*14,sy+6,10,ST-12);break;}
    case T.FENCE:{ctx.fillStyle=C.grass[v2%4];ctx.fillRect(sx,sy,ST,ST);
      ctx.fillStyle=C.woodWall;ctx.fillRect(sx+ST/2-3,sy,6,ST);ctx.fillRect(sx,sy+10,ST,4);ctx.fillRect(sx,sy+ST-14,ST,4);break;}
  }
}

function drawDecor(d) {
  const sx=d.x*ST-cam.x,sy=d.y*ST-cam.y;
  if(sx>canvas.width+ST*2||sy>canvas.height+ST*2||sx<-ST*2||sy<-ST*2)return;
  const t = performance.now()/1000;
  
  if(d.type==='tree'){
    const sz = d.size || 1;
    // Shadow
    ctx.fillStyle='rgba(0,0,0,0.15)';ctx.beginPath();ctx.ellipse(sx+ST/2,sy+ST+4,18*sz,6*sz,0,0,Math.PI*2);ctx.fill();
    // Trunk
    ctx.fillStyle=C.treeTrunk[d.v%3];
    const tw=8*sz;ctx.fillRect(sx+ST/2-tw/2,sy+ST*.3,tw,ST*.7);
    // Canopy layers (depth!)
    const sway = Math.sin(t*.8+d.x+d.y)*.5;
    ctx.fillStyle=C.treeLeaf[d.v%5];ctx.beginPath();ctx.arc(sx+ST/2+sway,sy-4*sz,24*sz,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=C.treeLeaf[(d.v+1)%5];ctx.beginPath();ctx.arc(sx+ST/2-8*sz+sway*.5,sy+4*sz,18*sz,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=C.treeLeafLight[d.v%3];ctx.beginPath();ctx.arc(sx+ST/2+6*sz+sway*1.5,sy-8*sz,14*sz,0,Math.PI*2);ctx.fill();
  }
  else if(d.type==='bush'){
    ctx.fillStyle='#2A5A1A';ctx.beginPath();ctx.arc(sx+ST/2,sy+ST/2+4,12,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#3A7028';ctx.beginPath();ctx.arc(sx+ST/2+4,sy+ST/2,8,0,Math.PI*2);ctx.fill();
  }
  else if(d.type==='rock'){
    ctx.fillStyle=C.stone[d.v];
    ctx.beginPath();ctx.ellipse(sx+ST/2,sy+ST/2+6,14,10,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=C.stone[(d.v+1)%3];
    ctx.beginPath();ctx.ellipse(sx+ST/2-2,sy+ST/2+4,10,7,0,0,Math.PI*2);ctx.fill();
  }
  else if(d.type==='sign'){
    ctx.fillStyle='#6A4A2A';ctx.fillRect(sx+ST/2-2,sy+ST/2,4,ST/2);
    ctx.fillStyle='#8A6A40';ctx.fillRect(sx+ST/2-16,sy+ST/2-8,32,16);
    ctx.fillStyle=C.white;ctx.font=`bold 8px ${FONT}`;ctx.textAlign='center';
    ctx.fillText(d.text,sx+ST/2,sy+ST/2+2);
  }
  else if(d.type==='seed_fragment'){
    const glow=.5+Math.sin(t*3)*.3;
    ctx.fillStyle=`rgba(247,147,26,${glow})`;ctx.beginPath();ctx.arc(sx+ST/2,sy+ST/2,10+Math.sin(t*2)*3,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=C.orange;ctx.font='16px serif';ctx.textAlign='center';ctx.fillText('🧩',sx+ST/2,sy+ST/2+5);
  }
}

function drawPlaced(item){
  const sx=item.x*SCALE-cam.x,sy=item.y*SCALE-cam.y;
  if(sx>canvas.width+ST||sy>canvas.height+ST||sx<-ST||sy<-ST)return;
  const w=ST*.8,h=ST*.6,rx=sx-w/2,ry=sy-h/2;
  if(item.type==='solar_panel'){ctx.fillStyle='#2244AA';ctx.fillRect(rx,ry,w,h);ctx.fillStyle='#3366CC';ctx.fillRect(rx+3,ry+3,w-6,h-6);
    const sun=getHour()>=6&&getHour()<=20?.3:0;if(sun>0){ctx.fillStyle=`rgba(255,255,200,${sun*(0.4+Math.sin(performance.now()/300)*.2)})`;ctx.fillRect(rx+8,ry+4,10,6);}}
  else if(item.type==='battery'){ctx.fillStyle='#333';ctx.fillRect(rx,ry,w,h);const pct=pwr.maxStore>0?pwr.stored/pwr.maxStore:0;ctx.fillStyle=pct>.5?C.green:pct>.2?C.ledOrange:C.red;ctx.fillRect(rx+4,ry+h-8,(w-8)*pct,4);}
  else if(item.type==='cooling_fan'){ctx.fillStyle='#445566';ctx.fillRect(rx,ry,w,h);ctx.save();ctx.translate(sx,sy);const t=performance.now()/150;for(let i=0;i<4;i++){ctx.rotate(Math.PI/2+t);ctx.fillStyle='#778899';ctx.fillRect(-2,-12,4,12);}ctx.restore();}
}

function drawPlayer(){
  const sx=player.x*SCALE-cam.x,sy=player.y*SCALE-cam.y;
  const w=ST,h=ST+12,px=sx-w/2,py=sy-h/2;
  const bob=player.moving?Math.sin(player.wf*Math.PI/2)*2:0;
  ctx.fillStyle='rgba(0,0,0,.2)';ctx.beginPath();ctx.ellipse(sx,sy+h/2+2,14,5,0,0,Math.PI*2);ctx.fill();
  const lo=player.moving?Math.sin(player.wf*Math.PI)*4:0;
  ctx.fillStyle=C.darkOrange;ctx.fillRect(px+10+lo,py+h-16,10,16);ctx.fillRect(px+w-20-lo,py+h-16,10,16);
  ctx.fillStyle='#4A3520';ctx.fillRect(px+8+lo,py+h-6,14,6);ctx.fillRect(px+w-22-lo,py+h-6,14,6);
  ctx.fillStyle=player.boost>0?'#FFB030':C.orange;ctx.fillRect(px+6,py+16+bob,w-12,h-34);
  ctx.fillStyle='#FFF';ctx.font=`bold 14px ${FONT}`;ctx.textAlign='center';ctx.fillText('₿',sx,py+36+bob);
  const as=player.moving?Math.sin(player.wf*Math.PI)*6:0;
  ctx.fillStyle=C.skin;ctx.fillRect(px+1,py+18+bob-as,8,20);ctx.fillRect(px+w-9,py+18+bob+as,8,20);
  ctx.fillStyle=C.skin;ctx.fillRect(px+10,py+2+bob,w-20,18);
  ctx.fillStyle=C.hair;ctx.fillRect(px+8,py-2+bob,w-16,8);
  ctx.fillStyle=C.black;
  if(player.facing.x<=0)ctx.fillRect(px+14,py+10+bob,4,4);
  if(player.facing.x>=0)ctx.fillRect(px+w-18,py+10+bob,4,4);
  const sel=getSelected();
  if(sel){ctx.fillStyle='rgba(0,0,0,.5)';ctx.font=`11px ${FONT}`;ctx.textAlign='center';ctx.fillText(`${ITEMS[sel.id].icon} ${ITEMS[sel.id].name}`,sx,py-8);}
}

function drawNPC(n){
  const sx=n.x*SCALE-cam.x,sy=n.y*SCALE-cam.y;
  const w=ST,h=ST+8,px=sx-w/2,py=sy-h/2;
  if(sx>canvas.width+w||sy>canvas.height+h||sx<-w||sy<-h)return;
  ctx.fillStyle='rgba(0,0,0,.15)';ctx.beginPath();ctx.ellipse(sx,sy+h/2,12,4,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=n.col;ctx.fillRect(px+8,py+14,w-16,h-28);
  ctx.fillStyle=C.skin;ctx.fillRect(px+12,py+2,w-24,16);
  ctx.fillStyle=n.hair;ctx.fillRect(px+10,py-2,w-20,8);
  ctx.fillStyle=C.black;ctx.fillRect(px+16,py+8,3,3);ctx.fillRect(px+w-19,py+8,3,3);
  const dist=Math.hypot(n.x-player.x,n.y-player.y);
  if(dist<48){
    ctx.fillStyle=C.white;ctx.font=`bold 11px ${FONT}`;ctx.textAlign='center';ctx.fillText(n.name,sx,py-8);
    ctx.fillStyle=C.gray;ctx.font=`10px ${FONT}`;
    ctx.fillText(n.role==='shop'?'[E] Talk  [B] Shop':'[E] Talk',sx,py-20);
  }
}

function drawRig(r){
  const sx=r.x*SCALE-cam.x,sy=r.y*SCALE-cam.y;
  const w=ST,h=ST,rx=sx-w/2,ry=sy-h/2;
  if(sx>canvas.width+w||sy>canvas.height+h||sx<-w||sy<-h)return;
  if(r.temp>60){const i=(r.temp-60)/40;ctx.fillStyle=`rgba(255,${Math.floor(80-i*80)},0,${i*.2})`;ctx.fillRect(rx-6,ry-6,w+12,h+12);}
  ctx.fillStyle=C.rigDark;ctx.fillRect(rx,ry,w,6);
  ctx.fillStyle=Rig.C[r.tier];ctx.fillRect(rx,ry+6,w,h-6);
  ctx.fillStyle=C.rigLight;ctx.fillRect(rx+2,ry+8,w-4,2);
  ctx.fillStyle='#444';for(let i=0;i<3;i++)ctx.fillRect(rx+6,ry+16+i*10,w-12,2);
  const led=r.powered&&r.dur>0;ctx.fillStyle=led?C.ledGreen:'#440000';if(led&&r.af%2===0)ctx.fillStyle='#0C0';ctx.fillRect(rx+4,ry+2,6,3);
  ctx.fillStyle=r.oh?C.red:(r.powered?C.ledOrange:'#420');ctx.fillRect(rx+w-10,ry+2,6,3);
  ctx.fillStyle=C.white;ctx.font=`bold 8px ${FONT}`;ctx.textAlign='center';ctx.fillText(['CPU','GPU','ASIC'][r.tier],sx,ry+h-4);
  ctx.fillStyle=r.statusCol();ctx.font=`bold 10px ${FONT}`;ctx.fillText(r.status(),sx,ry-4);
  const dist=Math.hypot(r.x-player.x,r.y-player.y);
  if(dist<48){const bw=w-4,pct=(r.temp-15)/85;ctx.fillStyle='#222';ctx.fillRect(rx+2,ry+h+2,bw,4);
    ctx.fillStyle=pct>.8?C.red:pct>.5?C.ledOrange:C.green;ctx.fillRect(rx+2,ry+h+2,bw*pct,4);
    ctx.fillStyle=C.gray;ctx.font=`10px ${FONT}`;ctx.fillText(hasItem('wrench')&&r.dur<100?'[E] Repair':'[E] Toggle',sx,ry-16);}
}

// ============================================================
// HUD
// ============================================================
function drawHUD(){
  const p=14;
  // Main panel
  panel(p,p,260,185);
  let y=p+18;ctx.fillStyle=C.hud;ctx.font=`bold 16px ${FONT}`;ctx.textAlign='left';
  ctx.fillText(`₿ ${fmt(player.wallet)} sats`,p+12,y);y+=20;
  ctx.font=`13px ${FONT}`;ctx.fillStyle='#CCC';
  ctx.fillText(`${getTimeStr()}${time.spd>1?' ⏩':''}`,p+12,y);y+=16;
  ctx.fillText(`Day ${time.day} — ${getPeriod()}`,p+12,y);y+=18;
  const th=rigs.reduce((s,r)=>s+(r.powered&&!r.oh&&r.dur>0?r.hr:0),0);
  ctx.fillText(`⚡ ${th.toFixed(1)} TH/s | Diff ${econ.diff.toFixed(1)}`,p+12,y);y+=16;
  ctx.fillStyle=pwr.gen>=pwr.use?C.green:C.red;
  ctx.fillText(`Power: ${pwr.gen.toFixed(1)}/${pwr.use.toFixed(1)} kW`,p+12,y);
  if(pwr.maxStore>0){ctx.fillStyle='#CCC';ctx.fillText(`🔋${pwr.stored.toFixed(0)}/${pwr.maxStore}`,p+160,y);}y+=18;
  ctx.fillStyle=C.phaseCol[econ.phase];ctx.font=`bold 13px ${FONT}`;ctx.fillText(econ.phaseN[econ.phase],p+12,y);y+=14;
  ctx.fillStyle=C.gray;ctx.font=`11px ${FONT}`;
  ctx.fillText(`Day ${econ.pd+1}/28 | Cycle ${econ.cycle+1} | ₿${econ.halvings}`,p+12,y);y+=14;
  ctx.fillText(`Rigs: ${rigs.length} | Earned: ${fmt(player.totalEarned)}`,p+12,y);
  
  // Hotbar
  const hbW=44,hbH=44,hbGap=4,hbN=10;
  const hbTW=hbN*(hbW+hbGap);const hbX=(canvas.width-hbTW)/2,hbY=canvas.height-hbH-20;
  ctx.fillStyle='rgba(8,8,12,0.7)';rr(hbX-4,hbY-4,hbTW+8,hbH+8,6);
  for(let i=0;i<hbN;i++){
    const x=hbX+i*(hbW+hbGap);
    ctx.fillStyle=i===selSlot?'rgba(247,147,26,.25)':'rgba(20,20,25,.8)';ctx.fillRect(x,hbY,hbW,hbH);
    ctx.strokeStyle=i===selSlot?C.hud:'#333';ctx.lineWidth=i===selSlot?2:1;ctx.strokeRect(x,hbY,hbW,hbH);
    ctx.fillStyle='#444';ctx.font=`9px ${FONT}`;ctx.textAlign='left';ctx.fillText(`${(i+1)%10}`,x+3,hbY+10);
    const sl=inv[i];if(sl){ctx.font='20px serif';ctx.textAlign='center';ctx.fillText(ITEMS[sl.id].icon,x+hbW/2,hbY+hbH/2+6);
      if(sl.qty>1){ctx.fillStyle=C.white;ctx.font=`bold 10px ${FONT}`;ctx.fillText(sl.qty,x+hbW-8,hbY+hbH-4);}}
  }
  
  // Controls hint
  ctx.fillStyle='#333';ctx.font=`9px ${FONT}`;ctx.textAlign='center';
  ctx.fillText('WASD:Move  E:Interact  R:Use/Plant  H:Harvest  I:Inventory  B:Shop  O:Objectives  K:Skills  M:Music  ?:Help',canvas.width/2,canvas.height-6);
  
  // Energy
  const ebW=100,ebX=canvas.width-ebW-p-10,ebY=hbY-18;
  ctx.fillStyle='#1A1A20';ctx.fillRect(ebX,ebY,ebW,8);ctx.fillStyle=player.energy>30?C.green:C.red;
  ctx.fillRect(ebX,ebY,ebW*(player.energy/player.maxEnergy),8);
  ctx.fillStyle='#AAA';ctx.font=`9px ${FONT}`;ctx.textAlign='right';ctx.fillText(`Energy: ${Math.floor(player.energy)}`,ebX+ebW,ebY-2);
  
  // Rig detail
  let nr=null,nd=60;for(const r of rigs){const d=Math.hypot(r.x-player.x,r.y-player.y);if(d<nd){nr=r;nd=d;}}
  if(nr){const rw=220,rh=110,rx=canvas.width-rw-p;panel(rx,p,rw,rh);
    ctx.fillStyle=C.hud;ctx.font=`bold 13px ${FONT}`;ctx.textAlign='left';ctx.fillText(Rig.N[nr.tier],rx+10,p+18);
    ctx.font=`11px ${FONT}`;ctx.fillStyle='#CCC';
    ctx.fillText(`Temp: ${nr.temp.toFixed(0)}°C`,rx+10,p+36);ctx.fillText(`Hash: ${nr.hr.toFixed(1)} TH/s`,rx+10,p+52);
    ctx.fillText(`Durability: ${nr.dur.toFixed(0)}%`,rx+10,p+68);ctx.fillText(`Mined: ${fmt(nr.mined)} sats`,rx+10,p+84);
    ctx.fillStyle=nr.statusCol();ctx.fillText(`Status: ${nr.status()}`,rx+10,p+100);}
  
  // Tutorial
  if(!tutorialDone&&tutorialStep<TUTORIAL_STEPS.length){
    const tw=Math.min(600,canvas.width-80),th=50;
    const tx=(canvas.width-tw)/2,ty=p+200;
    panel(tx,ty,tw,th);ctx.fillStyle=C.orange;ctx.font=`bold 12px ${FONT}`;ctx.textAlign='center';
    ctx.fillText(TUTORIAL_STEPS[tutorialStep].msg,canvas.width/2,ty+30);
  }
  
  // Dialogue
  if(dlg){const dw=Math.min(600,canvas.width-40),dh=80,dx=(canvas.width-dw)/2,dy=hbY-dh-20;
    panel(dx,dy,dw,dh);ctx.fillStyle=C.hud;ctx.font=`bold 14px ${FONT}`;ctx.textAlign='left';
    ctx.fillText(dlg.name,dx+16,dy+24);ctx.fillStyle=C.white;ctx.font=`13px ${FONT}`;
    wrapText(dlg.text,dx+16,dy+44,dw-32,16);ctx.fillStyle=C.gray;ctx.font=`10px ${FONT}`;ctx.textAlign='right';ctx.fillText('[E] Close',dx+dw-12,dy+dh-8);}
  
  // Objectives panel
  if(showObjectives){const ow=350,oh=30+objectives.length*22,ox=(canvas.width-ow)/2,oy=(canvas.height-oh)/2;
    panel(ox,oy,ow,oh);ctx.fillStyle=C.hud;ctx.font=`bold 15px ${FONT}`;ctx.textAlign='center';
    ctx.fillText('📋 Objectives',canvas.width/2,oy+22);
    objectives.forEach((o,i)=>{ctx.fillStyle=o.done?C.green:'#AAA';ctx.font=`12px ${FONT}`;ctx.textAlign='left';
      ctx.fillText(`${o.done?'✅':'⬜'} ${o.text}`,ox+20,oy+42+i*22);});
    ctx.fillStyle=C.gray;ctx.font=`10px ${FONT}`;ctx.textAlign='center';ctx.fillText('[O] or [Esc] to close',canvas.width/2,oy+oh-8);}
  
  // Shop
  if(shopOpen) drawShop();
  if(invOpen) drawInv();
  if(showSkills) drawSkillsPanel();
  if(showControls) drawControlsPanel();
  if(showDaySummary && daySummary) drawDaySummary();
  
  // Notifications
  ctx.textAlign='center';
  for(let i=0;i<notifs.length;i++){const n=notifs[i],a=Math.min(1,n.t);
    ctx.fillStyle=n.big?`rgba(255,215,0,${a})`:`rgba(247,147,26,${a})`;
    ctx.font=`bold ${n.big?18:14}px ${FONT}`;ctx.fillText(n.text,canvas.width/2,hbY-30-i*24);}
  
  // Particles
  for(const pt of particles){ctx.fillStyle=`rgba(247,147,26,${Math.min(1,pt.life)})`;ctx.font=`bold 12px ${FONT}`;ctx.textAlign='center';ctx.fillText(pt.text,pt.x-cam.x,pt.y-cam.y);}
  ctx.textAlign='left';
}

function drawShop(){
  const w=520,h=420,x=(canvas.width-w)/2,y=(canvas.height-h)/2;panel(x,y,w,h);
  ctx.fillStyle=C.hud;ctx.font=`bold 18px ${FONT}`;ctx.textAlign='center';ctx.fillText("⛏️ Ruby's Hardware Shop",x+w/2,y+28);
  const tw=w/2-20;ctx.fillStyle=shopMode==='buy'?'rgba(247,147,26,.15)':'rgba(30,30,30,.5)';ctx.fillRect(x+10,y+38,tw,24);
  ctx.fillStyle=shopMode==='sell'?'rgba(247,147,26,.15)':'rgba(30,30,30,.5)';ctx.fillRect(x+w/2+10,y+38,tw,24);
  ctx.fillStyle=shopMode==='buy'?C.hud:C.gray;ctx.font=`bold 13px ${FONT}`;ctx.textAlign='center';ctx.fillText('BUY (←→)',x+10+tw/2,y+54);
  ctx.fillStyle=shopMode==='sell'?C.hud:C.gray;ctx.fillText('SELL (←→)',x+w/2+10+tw/2,y+54);
  ctx.fillStyle=C.hud;ctx.font=`13px ${FONT}`;ctx.fillText(`Balance: ${fmt(player.wallet)} sats`,x+w/2,y+78);
  const mult=marketMult();ctx.fillStyle=mult>1?C.red:C.green;ctx.font=`11px ${FONT}`;ctx.fillText(`Market: ${mult>1?'▲':'▼'} ${Math.round(mult*100)}%`,x+w/2,y+92);
  ctx.textAlign='left';const ly=y+108;
  if(shopMode==='buy'){SHOP_LIST.forEach((id,i)=>{const it=ITEMS[id],pr=Math.ceil(it.buy*mult),iy=ly+i*28;if(iy>y+h-30)return;
    if(i===shopCur){ctx.fillStyle='rgba(247,147,26,.12)';ctx.fillRect(x+8,iy-8,w-16,26);}
    ctx.font='16px serif';ctx.fillStyle=C.white;ctx.fillText(it.icon,x+16,iy+8);ctx.font=`12px ${FONT}`;
    ctx.fillStyle=i===shopCur?C.hud:C.white;ctx.fillText(it.name,x+42,iy+4);ctx.fillStyle=C.gray;ctx.font=`10px ${FONT}`;ctx.fillText(it.desc,x+42,iy+16);
    ctx.fillStyle=player.wallet>=pr?C.green:C.red;ctx.font=`bold 12px ${FONT}`;ctx.textAlign='right';ctx.fillText(`${fmt(pr)}`,x+w-16,iy+8);ctx.textAlign='left';});}
  else{const sl=inv.filter(s=>s&&ITEMS[s.id].sell>0);if(!sl.length){ctx.fillStyle=C.gray;ctx.font=`13px ${FONT}`;ctx.textAlign='center';ctx.fillText('Nothing to sell!',x+w/2,ly+30);ctx.textAlign='left';}
    sl.forEach((s,i)=>{const it=ITEMS[s.id],pr=Math.ceil(it.sell*mult),iy=ly+i*28;if(iy>y+h-30)return;
      if(i===shopCur){ctx.fillStyle='rgba(247,147,26,.12)';ctx.fillRect(x+8,iy-8,w-16,26);}
      ctx.font='16px serif';ctx.fillStyle=C.white;ctx.fillText(it.icon,x+16,iy+8);ctx.font=`12px ${FONT}`;ctx.fillStyle=i===shopCur?C.hud:C.white;ctx.fillText(`${it.name} x${s.qty}`,x+42,iy+8);
      ctx.fillStyle=C.green;ctx.font=`bold 12px ${FONT}`;ctx.textAlign='right';ctx.fillText(`+${fmt(pr)}`,x+w-16,iy+8);ctx.textAlign='left';});}
  ctx.fillStyle=C.gray;ctx.font=`10px ${FONT}`;ctx.textAlign='center';ctx.fillText('↑↓:Nav  Enter/E:Buy/Sell  ←→:Tab  B/Esc:Close',x+w/2,y+h-10);
}

function drawInv(){
  const cols=5,rows=4,ss=56,gap=6;const w=cols*(ss+gap)+gap+180,h=rows*(ss+gap)+gap+60;
  const x=(canvas.width-w)/2,y=(canvas.height-h)/2;panel(x,y,w,h);
  ctx.fillStyle=C.hud;ctx.font=`bold 16px ${FONT}`;ctx.textAlign='center';ctx.fillText('📦 Inventory',x+w/2,y+24);
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
    const i=r*cols+c,sx=x+gap+c*(ss+gap),sy=y+36+r*(ss+gap);
    ctx.fillStyle=i===selSlot?'rgba(247,147,26,.2)':'rgba(20,20,25,.8)';ctx.fillRect(sx,sy,ss,ss);
    ctx.strokeStyle=i===selSlot?C.hud:'#333';ctx.lineWidth=i===selSlot?2:1;ctx.strokeRect(sx,sy,ss,ss);
    ctx.fillStyle='#444';ctx.font=`9px ${FONT}`;ctx.textAlign='left';ctx.fillText(i<10?`${(i+1)%10}`:'',sx+3,sy+11);
    const sl=inv[i];if(sl){ctx.font='28px serif';ctx.textAlign='center';ctx.fillText(ITEMS[sl.id].icon,sx+ss/2,sy+ss/2+8);
      if(sl.qty>1){ctx.fillStyle=C.white;ctx.font=`bold 11px ${FONT}`;ctx.fillText(sl.qty,sx+ss-10,sy+ss-6);}}}
  const sel=inv[selSlot],dx=x+cols*(ss+gap)+gap+10,dy=y+36;
  if(sel){const it=ITEMS[sel.id];ctx.fillStyle=C.hud;ctx.font=`bold 14px ${FONT}`;ctx.textAlign='left';
    ctx.fillText(`${it.icon} ${it.name}`,dx,dy+16);ctx.fillStyle='#CCC';ctx.font=`11px ${FONT}`;wrapText(it.desc,dx,dy+36,160,14);
    ctx.fillStyle=C.gray;if(it.buy>0)ctx.fillText(`Buy: ${fmt(it.buy)}`,dx,dy+80);if(it.sell>0)ctx.fillText(`Sell: ${fmt(it.sell)}`,dx,dy+94);ctx.fillText(`Qty: ${sel.qty}`,dx,dy+108);}
  ctx.fillStyle=C.gray;ctx.font=`10px ${FONT}`;ctx.textAlign='center';ctx.fillText('1-9,0:Select  I/Tab/Esc:Close',x+w/2,y+h-10);
}

function panel(x,y,w,h){ctx.fillStyle=C.hudBg;rr(x,y,w,h,6);ctx.strokeStyle=C.hudBorder;ctx.lineWidth=1.5;ctx.stroke();}
function wrapText(text,x,y,mw,lh){const w=text.split(' ');let l='';for(const word of w){const t=l+word+' ';if(ctx.measureText(t).width>mw&&l){ctx.fillText(l.trim(),x,y);l=word+' ';y+=lh;}else l=t;}if(l.trim())ctx.fillText(l.trim(),x,y);}
function rr(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();ctx.fill();}
function fmt(n){return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g,',');}

// ============================================================
// MAIN DRAW
// ============================================================
// ---- Draw crops in world ----
function drawCrop(crop) {
  const sx = crop.x * ST - cam.x, sy = crop.y * ST - cam.y;
  if (sx > canvas.width + ST || sy > canvas.height + ST || sx < -ST || sy < -ST) return;
  const info = CROP_TYPES[crop.type];
  const icon = info.stages[crop.stage];
  const ready = crop.dayAge >= info.grow;
  
  // Glow when ready
  if (ready) {
    ctx.fillStyle = `rgba(247,147,26,${0.2 + Math.sin(performance.now()/400)*0.1})`;
    ctx.beginPath(); ctx.arc(sx + ST/2, sy + ST/2, 20, 0, Math.PI*2); ctx.fill();
  }
  
  ctx.font = `${16 + crop.stage * 4}px serif`; ctx.textAlign = 'center';
  ctx.fillText(icon, sx + ST/2, sy + ST/2 + 8);
  
  // Progress bar
  if (!ready) {
    const pct = crop.dayAge / info.grow;
    ctx.fillStyle = '#222'; ctx.fillRect(sx + 6, sy + ST - 6, ST - 12, 4);
    ctx.fillStyle = C.green; ctx.fillRect(sx + 6, sy + ST - 6, (ST - 12) * pct, 4);
  }
  
  // Harvest prompt
  const dist = Math.hypot(crop.x * TILE + 8 - player.x, crop.y * TILE + 8 - player.y);
  if (dist < 32 && ready) {
    ctx.fillStyle = C.gold; ctx.font = `bold 10px ${FONT}`; ctx.textAlign = 'center';
    ctx.fillText('[H] Harvest!', sx + ST/2, sy - 4);
  } else if (dist < 32) {
    ctx.fillStyle = C.gray; ctx.font = `9px ${FONT}`; ctx.textAlign = 'center';
    ctx.fillText(`${info.grow - crop.dayAge}d left`, sx + ST/2, sy - 4);
  }
}

// ---- Skills Panel ----
function drawSkillsPanel() {
  const skillKeys = Object.keys(skills);
  const w = 320, h = 50 + skillKeys.length * 50;
  const x = (canvas.width - w) / 2, y = (canvas.height - h) / 2;
  panel(x, y, w, h);
  ctx.fillStyle = C.hud; ctx.font = `bold 16px ${FONT}`; ctx.textAlign = 'center';
  ctx.fillText('📊 Skills', canvas.width / 2, y + 24);
  
  skillKeys.forEach((key, i) => {
    const s = skills[key];
    const sy = y + 40 + i * 48;
    ctx.fillStyle = C.white; ctx.font = `14px ${FONT}`; ctx.textAlign = 'left';
    ctx.fillText(`${s.icon} ${s.name}`, x + 16, sy + 16);
    ctx.fillStyle = C.hud; ctx.font = `bold 14px ${FONT}`;
    ctx.fillText(`Lv ${s.level}`, x + w - 70, sy + 16);
    // XP bar
    ctx.fillStyle = '#222'; ctx.fillRect(x + 16, sy + 24, w - 32, 10);
    ctx.fillStyle = C.orange; ctx.fillRect(x + 16, sy + 24, (w - 32) * (s.xp / s.next), 10);
    ctx.fillStyle = C.gray; ctx.font = `9px ${FONT}`;
    ctx.fillText(`${s.xp}/${s.next} XP`, x + w / 2 - 20, sy + 33);
  });
  
  ctx.fillStyle = C.gray; ctx.font = `10px ${FONT}`; ctx.textAlign = 'center';
  ctx.fillText('[K] or [Esc] to close', canvas.width / 2, y + h - 10);
}

// ---- Controls Panel ----
function drawControlsPanel() {
  const w = 420, h = 40 + CONTROLS_LIST.length * 22;
  const x = (canvas.width - w) / 2, y = (canvas.height - h) / 2;
  panel(x, y, w, h);
  ctx.fillStyle = C.hud; ctx.font = `bold 16px ${FONT}`; ctx.textAlign = 'center';
  ctx.fillText('🎮 Controls', canvas.width / 2, y + 24);
  
  CONTROLS_LIST.forEach((item, i) => {
    const sy = y + 40 + i * 22;
    ctx.fillStyle = C.hud; ctx.font = `bold 11px ${FONT}`; ctx.textAlign = 'left';
    ctx.fillText(item[0], x + 20, sy + 14);
    ctx.fillStyle = '#CCC'; ctx.font = `11px ${FONT}`;
    ctx.fillText(item[1], x + 160, sy + 14);
  });
  
  ctx.fillStyle = C.gray; ctx.font = `10px ${FONT}`; ctx.textAlign = 'center';
  ctx.fillText('[?] or [Esc] to close', canvas.width / 2, y + h - 10);
}

// ---- Daily Summary ----
function drawDaySummary() {
  const w = 380, h = 240;
  const x = (canvas.width - w) / 2, y = (canvas.height - h) / 2;
  
  // Dim background
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  panel(x, y, w, h);
  ctx.fillStyle = C.hud; ctx.font = `bold 20px ${FONT}`; ctx.textAlign = 'center';
  ctx.fillText(`🌙 End of Day ${daySummary.day}`, canvas.width / 2, y + 32);
  
  let sy = y + 60;
  ctx.font = `14px ${FONT}`; ctx.textAlign = 'left';
  
  ctx.fillStyle = C.white;
  ctx.fillText(`💰 Sats earned today:`, x + 24, sy);
  ctx.fillStyle = C.green; ctx.textAlign = 'right';
  ctx.fillText(`+${fmt(daySummary.earned)}`, x + w - 24, sy);
  sy += 28;
  
  ctx.textAlign = 'left'; ctx.fillStyle = C.white;
  ctx.fillText(`⛏️ Active rigs:`, x + 24, sy);
  ctx.fillStyle = C.hud; ctx.textAlign = 'right';
  ctx.fillText(`${daySummary.rigsActive}`, x + w - 24, sy);
  sy += 28;
  
  ctx.textAlign = 'left'; ctx.fillStyle = C.white;
  ctx.fillText(`🌱 Crops growing:`, x + 24, sy);
  ctx.fillStyle = C.hud; ctx.textAlign = 'right';
  ctx.fillText(`${crops.length}`, x + w - 24, sy);
  sy += 28;
  
  ctx.textAlign = 'left'; ctx.fillStyle = C.white;
  ctx.fillText(`📈 Market phase:`, x + 24, sy);
  ctx.fillStyle = C.phaseCol[econ.phase]; ctx.textAlign = 'right';
  ctx.fillText(daySummary.phase, x + w - 24, sy);
  sy += 28;
  
  ctx.textAlign = 'left'; ctx.fillStyle = C.white;
  ctx.fillText(`💰 Total balance:`, x + 24, sy);
  ctx.fillStyle = C.gold; ctx.textAlign = 'right';
  ctx.fillText(`${fmt(player.wallet)} sats`, x + w - 24, sy);
  
  // Pulsing continue
  ctx.globalAlpha = 0.5 + Math.sin(performance.now() / 400) * 0.5;
  ctx.fillStyle = C.orange; ctx.font = `bold 13px ${FONT}`; ctx.textAlign = 'center';
  ctx.fillText('Press ENTER to continue', canvas.width / 2, y + h - 20);
  ctx.globalAlpha = 1;
}

// ---- NPC hearts in HUD near NPC ----
function drawNPCHearts(npc) {
  initRelationships();
  const r = relationships[npc.name]; if (!r) return;
  const sx = npc.x * SCALE - cam.x, sy = npc.y * SCALE - cam.y - ST/2 - 34;
  const dist = Math.hypot(npc.x - player.x, npc.y - player.y);
  if (dist > 48) return;
  
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < Math.floor(r.hearts) ? '#FF4466' : (i < Math.ceil(r.hearts) ? '#FF8899' : '#333');
    ctx.font = '10px serif';
    ctx.fillText('♥', sx - 20 + i * 10, sy);
  }
}

function draw(){
  if(gameState==='intro'){drawIntro();return;}
  
  ctx.fillStyle='#0a0a0a';ctx.fillRect(0,0,canvas.width,canvas.height);
  
  const sX=Math.max(0,Math.floor(cam.x/ST)-1),sY=Math.max(0,Math.floor(cam.y/ST)-1);
  const eX=Math.min(MAP_W,sX+Math.ceil(canvas.width/ST)+3),eY=Math.min(MAP_H,sY+Math.ceil(canvas.height/ST)+3);
  
  // Tiles
  for(let y=sY;y<eY;y++)for(let x=sX;x<eX;x++)drawTile(x,y,map[y][x]);
  
  // Sort all entities by Y for depth
  const entities = [];
  for(const d of decor)entities.push({y:d.y*TILE+TILE,draw:()=>drawDecor(d)});
  for(const i of placed)entities.push({y:i.y,draw:()=>drawPlaced(i)});
  for(const r of rigs)entities.push({y:r.y,draw:()=>drawRig(r)});
  for(const n of npcs)entities.push({y:n.y,draw:()=>drawNPC(n)});
  entities.push({y:player.y,draw:drawPlayer});
  entities.sort((a,b)=>a.y-b.y);
  // Draw crops
  for(const crop of crops) drawCrop(crop);
  for(const e of entities)e.draw();
  // NPC hearts
  for(const npc of npcs) drawNPCHearts(npc);
  
  // Day/night
  const dn=getDayOv();
  if(dn.a>0){ctx.fillStyle=`rgba(${dn.r},${dn.g},${dn.b},${dn.a})`;ctx.fillRect(0,0,canvas.width,canvas.height);}
  
  drawHUD();
}

// ============================================================
// GAME LOOP
// ============================================================
function gameLoop(now){
  const dt=Math.min(.1,(now-lastTime)/1000);lastTime=now;
  update(dt);draw();requestAnimationFrame(gameLoop);
}
requestAnimationFrame(gameLoop);
