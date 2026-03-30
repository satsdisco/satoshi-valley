// ============================================================
// SATOSHI VALLEY — v0.5 "The Daily Loop Update"
// ============================================================

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// ---- TRUE FULLSCREEN (no DPR scaling — keeps text readable) ----
function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
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
  step(tile) {
    // Terrain-based footstep sounds
    if(tile===T.GRASS||tile===T.TALLGRASS||tile===T.FLOWER||tile===T.MUSHROOM){
      if(Math.random()<0.25) tone(60+Math.random()*20,.04,'triangle',.008);
    } else if(tile===T.PATH||tile===T.DIRT){
      if(Math.random()<0.3) tone(100+Math.random()*40,.04,'square',.018);
    } else if(tile===T.FLOOR||tile===T.SHOP){
      if(Math.random()<0.3) tone(200+Math.random()*50,.05,'sine',.015);
    } else if(tile===T.STONE||tile===T.CLIFF){
      if(Math.random()<0.25) tone(300+Math.random()*100,.03,'square',.020);
    } else if(tile===T.SAND){
      if(Math.random()<0.3){tone(800+Math.random()*200,.06,'triangle',.005);tone(820+Math.random()*200,.06,'triangle',.005);}
    } else if(tile===T.BRIDGE){
      if(Math.random()<0.3) tone(150+Math.random()*30,.05,'triangle',.015);
    } else {
      if(Math.random()<0.25) tone(80+Math.random()*40,.03,'triangle',.012);
    }
  },
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

// ---- MOUSE CLICK-TO-MOVE & INTERACTION ----
let mouseTarget = null; // {x, y} in world pixel coords
let clickIndicator = null; // {x, y, life} for visual feedback
let mouseX = 0, mouseY = 0;
let lastShopClickTime = 0;

canvas.addEventListener('mousemove', e => {
  mouseX = e.clientX; mouseY = e.clientY;
  if (gameState !== 'playing') { canvas.style.cursor = 'default'; return; }
  if (shopOpen || invOpen || chestOpen) { canvas.style.cursor = 'pointer'; return; }
  const hbXc=(canvas.width-480)/2, hbYc=canvas.height-64;
  if (e.clientX>=hbXc&&e.clientX<=hbXc+480&&e.clientY>=hbYc&&e.clientY<=hbYc+44) { canvas.style.cursor='pointer'; return; }
  const wx=(e.clientX+cam.x)/SCALE, wy=(e.clientY+cam.y)/SCALE;
  for (const n of npcs) { if (Math.hypot(n.x-wx,n.y-wy)<40) { canvas.style.cursor='pointer'; return; } }
  for (const a of animals) { if (Math.hypot(a.x-wx,a.y-wy)<32) { canvas.style.cursor='pointer'; return; } }
  for (const r of rigs) { if (Math.hypot(r.x-wx,r.y-wy)<32) { canvas.style.cursor='pointer'; return; } }
  for (const crop of crops) { if (crop.dayAge>=CROP_TYPES[crop.type].grow&&Math.hypot(crop.x*TILE+8-wx,crop.y*TILE+8-wy)<24) { canvas.style.cursor='pointer'; return; } }
  canvas.style.cursor = 'crosshair';
});

canvas.addEventListener('click', e => {
  if (gameState !== 'playing') {
    // Title menu click handling
    if (gameState === 'intro' && titleMenuOpen) {
      const hasSave = !!localStorage.getItem('sv_save');
      const options = hasSave ? ['new_game','continue','controls'] : ['new_game','controls'];
      const menuY = canvas.height * 0.50;
      const menuSpacing = Math.floor(canvas.width * 0.035);
      for (let i = 0; i < options.length; i++) {
        const y = menuY + i * menuSpacing;
        if (e.clientX >= canvas.width/2 - 140 && e.clientX <= canvas.width/2 + 140 &&
            e.clientY >= y - menuSpacing*0.35 && e.clientY <= y + menuSpacing*0.35) {
          titleCur = i;
          // Trigger selection
          const choice = options[i];
          if (choice === 'new_game') { localStorage.removeItem('sv_save'); gameState='playing'; titleMenuOpen=false; sfx.story(); startMusic(); }
          else if (choice === 'continue') { loadGame(); titleMenuOpen=false; startMusic(); }
          else if (choice === 'controls') { showControls=true; }
          return;
        }
      }
    }
    // Click to advance intro slides
    if (gameState === 'intro' && !titleMenuOpen && introStep < INTRO_SLIDES.length - 1) {
      introStep++; introTimer = 0;
    }
    return;
  }
  // Pause menu click
  if (pauseOpen) {
    const pw=320,ph=60+PAUSE_ITEMS.length*50,px=(canvas.width-pw)/2,py=(canvas.height-ph)/2;
    PAUSE_ITEMS.forEach((item,i)=>{
      const iy=py+50+i*50;
      if(e.clientX>=px+20&&e.clientX<=px+pw-20&&e.clientY>=iy&&e.clientY<=iy+40){
        pauseCur=i;
        if(item==='Resume'){pauseOpen=false;sfx.menuClose();}
        else if(item==='Save Game'){saveGame();pauseOpen=false;}
        else if(item==='Load Game'){loadGame();pauseOpen=false;}
        else if(item==='Music'){toggleMusic();}
        else if(item==='Controls'){showControls=true;pauseOpen=false;}
        else if(item==='Quit to Title'){gameState='intro';introStep=INTRO_SLIDES.length-1;titleMenuOpen=true;titleCur=0;titleTip=BTC_TIPS[Math.floor(Math.random()*BTC_TIPS.length)];pauseOpen=false;shopOpen=false;invOpen=false;citadelMenuOpen=false;dlg=null;sfx.menuClose();}
      }
    });
    return;
  }
  if (dlg){if(!dlg.done){dlg.displayedChars=dlg.fullText.length;dlg.done=true;}else{dlg=null;}return;}
  if (citadelMenuOpen||showObjectives||showDaySummary||showSkills||showControls) return;
  // Minimap click — consume the click so it doesn't trigger movement
  if(minimapOpen){
    const mmW=160,mmH=120,mmX=canvas.width-mmW-12,mmY=12;
    if(e.clientX>=mmX-4&&e.clientX<=mmX+mmW+4&&e.clientY>=mmY-4&&e.clientY<=mmY+mmH+4){
      return;
    }
  }
  // Tutorial skip button + press-to-advance
  if (!tutorialDone && tutorialStep < TUTORIAL_STEPS.length) {
    const tw2=Math.min(650,canvas.width-60), th2=58;
    const tx2=(canvas.width-tw2)/2, ty2=canvas.height*0.14;
    const skipX2=tx2+tw2-108, skipY2=ty2+th2+4;
    if (e.clientX>=skipX2&&e.clientX<=skipX2+100&&e.clientY>=skipY2&&e.clientY<=skipY2+24) {
      tutorialDone=true;notify('Tutorial skipped! Press ? for controls.',3);sfx.menuClose();return;
    }
    if (TUTORIAL_STEPS[tutorialStep].trigger==='press'){tutorialStep++;tutTimer=0;if(tutorialStep>=TUTORIAL_STEPS.length)tutorialDone=true;return;}
  }
  // Crafting layer
  if (craftOpen) {
    const cw=580,ch=480,cx2=(canvas.width-cw)/2,cy2=(canvas.height-ch)/2;
    if(e.clientX<cx2||e.clientX>cx2+cw||e.clientY<cy2||e.clientY>cy2+ch){craftOpen=false;sfx.menuClose();return;}
    const ly2=cy2+68,rowH2=46;
    if(e.clientY>=ly2){
      const row=Math.floor((e.clientY-ly2)/rowH2);
      if(row>=0&&row<RECIPES.length){
        if(craftCur===row){doCraft(RECIPES[row]);}else{craftCur=row;}
      }
    }
    return;
  }
  // Shop layer
  if (shopOpen) {
    const sw=560,sh=460,sx=(canvas.width-sw)/2,sy=(canvas.height-sh)/2;
    if (e.clientX<sx||e.clientX>sx+sw||e.clientY<sy||e.clientY>sy+sh) { shopOpen=false; sfx.menuClose(); return; }
    if (e.clientY>=sy+40&&e.clientY<=sy+66) { shopMode=e.clientX<sx+sw/2?'buy':'sell'; shopCur=0; shopScroll=0; return; }
    const ly=sy+112, rowH=32;
    if (e.clientY>=ly) {
      const activeList=shopNpcRole==='seeds'?SEED_SHOP_LIST:SHOP_LIST;
      const row=Math.floor((e.clientY-ly)/rowH)+shopScroll;
      const listLen=shopMode==='buy'?activeList.length:inv.filter(s=>s&&ITEMS[s.id].sell>0).length;
      if (row>=0&&row<listLen) {
        const wasSelected=shopCur===row, now=performance.now(); shopCur=row;
        if (wasSelected||now-lastShopClickTime<400) {
          if (shopMode==='buy') {
            const id=activeList[shopCur],it=ITEMS[id];
            if(!it){sfx.error();}else{const pr=Math.ceil(it.buy*marketMult());if(player.wallet>=pr){if(addItem(id)){player.wallet-=pr;sfx.buy();notify(`Bought ${it.icon} ${it.name} (${fmt(pr)})`,2);if(id==='gpu_rig')completeObjective('buy_gpu');}else{notify('Inventory full!',1.5);sfx.error();}}else{notify(`Need ${fmt(pr)} sats!`,1.5);sfx.error();}}
          } else {
            const sell=inv.filter(s=>s&&ITEMS[s.id].sell>0);
            if(shopCur<sell.length){const s=sell[shopCur],it=ITEMS[s.id],pr=Math.ceil(it.sell*marketMult());removeItem(s.id);player.wallet+=pr;sfx.coin();notify(`Sold ${it.icon} ${it.name} (+${fmt(pr)})`,2);}
          }
        }
        lastShopClickTime=now;
      }
    }
    return;
  }
  // Inventory layer
  if (invOpen) {
    const cols=5,rows=4,ss=56,gap=6;
    const iw=cols*(ss+gap)+gap+180, ih=rows*(ss+gap)+gap+60;
    const ix=(canvas.width-iw)/2, iy=(canvas.height-ih)/2;
    if (e.clientX<ix||e.clientX>ix+iw||e.clientY<iy||e.clientY>iy+ih) { invOpen=false; sfx.menuClose(); return; }
    for (let r=0;r<rows;r++) for (let c=0;c<cols;c++) {
      const cx2=ix+gap+c*(ss+gap), cy2=iy+36+r*(ss+gap);
      if (e.clientX>=cx2&&e.clientX<=cx2+ss&&e.clientY>=cy2&&e.clientY<=cy2+ss) { selSlot=r*cols+c; sfx.interact(); return; }
    }
    return;
  }
  // Chest layer
  if(chestOpen){
    const cols=5,rows=4,ss=56,gap=6;
    const totalW=cols*(ss+gap)+gap;
    const w=totalW*2+40,h=rows*(ss+gap)+gap+60;
    const cx=(canvas.width-w)/2,cy=(canvas.height-h)/2;
    if(e.clientX<cx||e.clientX>cx+w||e.clientY<cy||e.clientY>cy+h){chestOpen=false;sfx.menuClose();return;}
    // Left side (inventory) — click to move to chest
    for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
      const i=r*cols+c,sx2=cx+gap+c*(ss+gap)+10,sy2=cy+50+r*(ss+gap);
      if(e.clientX>=sx2&&e.clientX<=sx2+ss&&e.clientY>=sy2&&e.clientY<=sy2+ss){
        if(inv[i]){
          const ce=chestInv.findIndex(s=>!s);
          if(ce===-1&&chestInv.length>=CHEST_SIZE){notify('Chest full!',1);sfx.error();}
          else{const item=inv[i];inv[i]=null;if(ce>=0)chestInv[ce]=item;else chestInv.push(item);sfx.interact();}
        }
        return;
      }
    }
    // Right side (chest) — click to move to inventory
    for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
      const i=r*cols+c,sx2=cx+totalW+30+gap+c*(ss+gap),sy2=cy+50+r*(ss+gap);
      if(e.clientX>=sx2&&e.clientX<=sx2+ss&&e.clientY>=sy2&&e.clientY<=sy2+ss){
        if(chestInv[i]){
          const ie=inv.findIndex(s=>!s);
          if(ie===-1&&inv.length>=INV_SIZE){notify('Inventory full!',1);sfx.error();}
          else{const item=chestInv[i];chestInv[i]=null;if(ie>=0)inv[ie]=item;else inv.push(item);sfx.interact();}
        }
        return;
      }
    }
    return;
  }
  // Hotbar (always visible)
  const hbXh=(canvas.width-480)/2, hbYh=canvas.height-64;
  if (e.clientY>=hbYh&&e.clientY<=hbYh+44) {
    const rel=e.clientX-hbXh;
    if (rel>=0&&rel<480) { const slot=Math.floor(rel/48); if(slot>=0&&slot<10&&rel%48<44){selSlot=slot;sfx.interact();return;} }
  }
  // World entities
  const wx=(e.clientX+cam.x)/SCALE, wy=(e.clientY+cam.y)/SCALE;
  // NPC
  for (const n of npcs) {
    if (Math.hypot(n.x-wx,n.y-wy)<32) {
      const _nd=n.dlg[Math.floor(Math.random()*n.dlg.length)];dlg={name:n.name,text:_nd,role:n.role,fullText:_nd,displayedChars:0,done:false};dlgCharTimer=0; sfx.interact();
      if(n.name==='The Hermit')completeObjective('find_hermit');
      initRelationships();
      if(!relationships[n.name].talked){relationships[n.name].talked=true;addHearts(n.name,0.2);addXP('social',3);}
      return;
    }
  }
  // Animal
  for (const a of animals) {
    if (Math.hypot(a.x-wx,a.y-wy)<28) {
      const info=ANIMAL_TYPES[a.type];
      if(a.prodReady){
        if(addItem(info.product,info.prodQty)){
          a.prodReady=false;a.daysSinceProd=0;
          sfx.coin();notify(info.icon+' Collected '+info.productName+'!',2);addXP('farming',5);
          satPart(a.x,a.y,info.sellPrice);
        }else{notify('Inventory full!',1.5);sfx.error();}
      }else{
        const daysLeft=info.produceTime-a.daysSinceProd;
        const mood=a.happiness>=70?'😊 Happy':a.happiness>=30?'😐 OK':'😞 Unhappy';
        const _at=mood+' | Fed: '+(a.fed?'Yes ✅':'No ❌')+' | '+(daysLeft>0?daysLeft+' days until '+info.productName:info.productName+' ready!');dlg={name:info.name,text:_at,role:'animal',fullText:_at,displayedChars:0,done:false};dlgCharTimer=0;
        sfx.interact();
      }
      return;
    }
  }
  // Rig
  for (const r of rigs) {
    if (Math.hypot(r.x-wx,r.y-wy)<28) {
      const sel=getSelected();
      if(sel&&sel.id==='wrench'&&r.dur<100){r.dur=Math.min(100,r.dur+25);removeItem('wrench');sfx.repair();notify(`🔧 Repaired! ${r.dur.toFixed(0)}%`,2);completeObjective('repair_rig');}
      else{r.powered=!r.powered;sfx.interact();notify(`Rig ${r.powered?'ON ⚡':'OFF 💤'}`,1.5);}
      return;
    }
  }
  // Crop
  for (let i=crops.length-1;i>=0;i--) {
    if (Math.hypot(crops[i].x*TILE+8-wx,crops[i].y*TILE+8-wy)<20) {
      const info=CROP_TYPES[crops[i].type];
      if(crops[i].dayAge>=info.grow){harvestCrop(i);}else{notify('Not ready yet! '+(info.grow-crops[i].dayAge)+' days left',2);}
      return;
    }
  }
  // Click-to-move
  mouseTarget={x:wx,y:wy};
  clickIndicator={x:wx,y:wy,life:1.0};
});

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
  seed_fragment:{name:'Seed Word',desc:"A BIP39 seed word — part of Uncle Toshi's wallet",icon:'🧩',type:'quest',buy:0,sell:0,stack:false},
  potato_seed:{name:'Potato Seeds',desc:'Plant on dirt. Grows in 4 days.',icon:'🥔',type:'seed',buy:30,sell:10,stack:true},
  tomato_seed:{name:'Tomato Seeds',desc:'Plant on dirt. Grows in 6 days.',icon:'🍅',type:'seed',buy:60,sell:20,stack:true},
  corn_seed:{name:'Corn Seeds',desc:'Plant on dirt. Grows in 8 days.',icon:'🌽',type:'seed',buy:100,sell:35,stack:true},
  axe:{name:'Axe',desc:'Chop trees for wood, clear grass for fiber',icon:'🪓',type:'tool',buy:250,sell:100,stack:true},
  hoe:{name:'Hoe',desc:'Convert grass to farmable dirt',icon:'🌾',type:'tool',buy:200,sell:80,stack:true},
  shovel:{name:'Shovel',desc:'Pick up placed items back to inventory',icon:'⚒️',type:'tool',buy:150,sell:60,stack:true},
  immersion_tank:{name:'Immersion Tank',desc:'Advanced cooling — doubles rig lifespan',icon:'🛢️',type:'upgrade',buy:15000,sell:6000,stack:true},
  mesh_antenna:{name:'Mesh Antenna',desc:'Off-grid comms — boosts social XP gain',icon:'📡',type:'upgrade',buy:3000,sell:1200,stack:true},
  bitcoin_sign:{name:'Bitcoin Sign',desc:'Decorative ₿ sign for your citadel',icon:'🪧',type:'deco',buy:500,sell:200,stack:true},
  chest:{name:'Storage Chest',desc:'Place near home for 20 extra item slots',icon:'📦',type:'placeable',buy:500,sell:200,stack:true},
  goat:{name:'Goat',desc:'Produces milk daily. Every citadel needs goats.',icon:'🐐',type:'animal',buy:2000,sell:800,stack:false},
  cow:{name:'Cow',desc:'Raise for beef — premium sats at the meat market',icon:'🐄',type:'animal',buy:5000,sell:2000,stack:false},
  bee_hive:{name:'Bee Hive',desc:'Place near flowers — produces honey over time',icon:'🐝',type:'animal',buy:1500,sell:600,stack:false},
  chicken:{name:'Chicken',desc:'Produces eggs daily. Clucks included.',icon:'🐔',type:'animal',buy:800,sell:300,stack:false},
  beef:{name:'Beef Steak',desc:'Premium grass-fed beef. Carnivore approved.',icon:'🥩',type:'food',buy:0,sell:500,stack:true},
  milk:{name:'Fresh Milk',desc:'Straight from the goat. Rich and creamy.',icon:'🥛',type:'food',buy:0,sell:200,stack:true},
  egg:{name:'Farm Eggs',desc:'Free-range eggs. Two per chicken per day.',icon:'🥚',type:'food',buy:0,sell:80,stack:true},
  honey:{name:'Raw Honey',desc:'Local wildflower honey. Nature\'s gold.',icon:'🍯',type:'food',buy:0,sell:350,stack:true},
  feed:{name:'Animal Feed',desc:'Keeps your animals happy and productive.',icon:'🌾',type:'supply',buy:30,sell:10,stack:true},
  wood:{name:'Wood',desc:'Chopped from trees. Used in crafting.',icon:'🪵',type:'mat',buy:0,sell:15,stack:true},
  fiber:{name:'Fiber',desc:'Plant fiber from grass and bushes.',icon:'🎋',type:'mat',buy:0,sell:5,stack:true},
  potato_crop:{name:'Potato',desc:'Fresh potato from the garden.',icon:'🥔',type:'crop',buy:0,sell:120,stack:true},
  tomato_crop:{name:'Tomato',desc:'Ripe red tomato.',icon:'🍅',type:'crop',buy:0,sell:200,stack:true},
  corn_crop:{name:'Corn',desc:'Golden sweet corn.',icon:'🌽',type:'crop',buy:0,sell:350,stack:true},
  pumpkin_crop:{name:'Pumpkin',desc:'A magnificent orange pumpkin.',icon:'🎃',type:'crop',buy:0,sell:800,stack:true},
  pumpkin_seed:{name:'Pumpkin Seeds',desc:'Plant on dirt. Grows in 12 days.',icon:'🎃',type:'seed',buy:200,sell:70,stack:true},
  fence_post:{name:'Fence Post',desc:'Place with R to contain animals',icon:'🪵',type:'placeable',buy:0,sell:30,stack:true},
  flower_pot:{name:'Flower Pot',desc:'Decorative planter',icon:'🌸',type:'deco',buy:0,sell:40,stack:true},
  torch_item:{name:'Torch',desc:'Light up your citadel at night',icon:'🔥',type:'deco',buy:0,sell:25,stack:true},
  cheese:{name:'Cheese',desc:'Aged goat cheese. Fancy.',icon:'🧀',type:'food',buy:0,sell:300,stack:true},
  circuit_board:{name:'Circuit Board',desc:'Electronics component',icon:'🔌',type:'mat',buy:0,sell:400,stack:true},
  advanced_rig_part:{name:'Advanced Rig Part',desc:'High-performance mining component',icon:'⚙️',type:'mat',buy:0,sell:1000,stack:true},
  shed_upgrade:{name:'Shed Expansion Kit',desc:'Doubles mining shed capacity',icon:'🏗️',type:'quest',buy:0,sell:0,stack:false},
  citadel_materials:{name:'Citadel Materials',desc:'Reduces next citadel upgrade cost by 25%',icon:'🏰',type:'quest',buy:0,sell:0,stack:false},
  fishing_rod:{name:'Fishing Rod',desc:'Cast into water to catch fish. Coming soon!',icon:'🎣',type:'tool',buy:500,sell:200,stack:true},
};

// ============================================================
// BIP39 SEED WORDS — Bitcoin history lore
// ============================================================
const SEED_WORDS = [
  {word:'abandon',hint:'Genesis Block — Jan 3, 2009. "Chancellor on brink of second bailout for banks."'},
  {word:'ability',hint:'Hal Finney receives the first Bitcoin transaction — Jan 12, 2009.'},
  {word:'liberty',hint:'10,000 BTC for two pizzas — May 22, 2010. The first real purchase.'},
  {word:'satoshi',hint:'Satoshi Nakamoto disappears — April 2011. "I\'ve moved on to other things."'},
  {word:'verify',hint:'Mt. Gox hack — 850,000 BTC lost. "Don\'t trust, verify."'},
  {word:'network',hint:'Bitcoin network hits 1 EH/s — Jan 2016. Unstoppable.'},
  {word:'digital',hint:'The DAO hack sparks the ETH fork debate — June 2016.'},
  {word:'node',hint:'UASF — Users Activate Soft Fork. The nodes spoke. Aug 2017.'},
  {word:'enforce',hint:'SegWit activates — Block 481,824. Aug 24, 2017.'},
  {word:'million',hint:'Bitcoin crosses $10,000 for the first time — Dec 2017.'},
  {word:'flash',hint:'Lightning Network goes live on mainnet — March 2018.'},
  {word:'decline',hint:'China bans Bitcoin... again. For the 47th time.'},
  {word:'legal',hint:'El Salvador makes Bitcoin legal tender — June 2021.'},
  {word:'private',hint:'Taproot activates — Privacy upgrade. Nov 2021.'},
  {word:'exchange',hint:'FTX collapses — Nov 2022. Not your keys, not your coins.'},
  {word:'rare',hint:'Ordinals and inscriptions arrive — Jan 2023. Controversy erupts.'},
  {word:'approve',hint:'Spot Bitcoin ETF approved — Jan 10, 2024.'},
  {word:'country',hint:'Nation-states begin adding Bitcoin to reserves — 2024.'},
  {word:'energy',hint:'Bitcoin mining goes majority renewable — the green revolution.'},
  {word:'freedom',hint:'Bitcoin enables financial freedom for billions.'},
  {word:'future',hint:'The future is being built, one block at a time.'},
  {word:'wealth',hint:'21 million. Hard cap. Digital scarcity.'},
  {word:'trust',hint:'"Don\'t trust, verify." The cypherpunk ethos.'},
  {word:'valley',hint:'Welcome home. You\'ve found all 24 words. Check your wallet.'},
];
let foundWords = []; // indices of found words

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
let minimapOpen = true;
let interior = null; // null = overworld, or {type, map, w, h, furniture, doorX, returnX, returnY}
let doorCooldown = 0; // prevent instant re-entry after exiting
let transition = null; // {type:'fadeIn'|'fadeOut', timer, duration, callback}
let titleMenuOpen = false;
let titleCur = 0;
let titleTip = '';
let interiorNPCs = []; // NPCs present in current interior
const INTERIOR_MAPS = {}; // generated once, keyed by building type

const INTRO_SLIDES = [
  { text: '"Chancellor on brink of second bailout for banks."', sub: "— The Times, January 3, 2009", dur: 4 },
  { text: "One person saw this headline\nand decided to change everything.", sub: "", dur: 3.5 },
  { text: "They gave the world a gift:\n21 million coins. No more. No less. Forever.", sub: "", dur: 4 },
  { text: "Decades passed. Fiatropolis printed and printed.\nBread costs 500 FiatBucks. Rent is a joke.", sub: "You were a wage slave. Like everyone else.", dur: 5 },
  { text: "Then a letter arrived from a valley\nyou'd never heard of.", sub: "", dur: 3 },
  { text: '"I\'ve been running the last node in this valley\nfor 15 years. Not your keys, not your coins.\nNot your node, not your rules."', sub: "— Uncle Toshi", dur: 6 },
  { text: '"The seed is split into 24 pieces, hidden in the\nplaces where Bitcoin history was made.\nFind them all. Verify, don\'t trust."', sub: "", dur: 6 },
  { text: "He left you everything.", sub: "A homestead. Mining rigs. A node. And the most important thing: sovereignty.", dur: 5 },
  { text: "⛏️ SATOSHI VALLEY ⛏️", sub: "Stack sats. Build your citadel. Fix the money, fix the world.\n\nA guided tutorial will show you how to play.", dur: 999 },
];

const TUTORIAL_STEPS = [
  { msg: '📜 A letter from your Uncle Toshi: "Dear nephew, I\'ve left you something in the valley..."', trigger: 'press' },
  { msg: '"My mining rigs still run. The garden needs tending. And I hid something important..."', trigger: 'press' },
  { msg: '🎮 Use WASD or Arrow Keys to move. Click anywhere to walk there. Try it!', trigger: 'move', highlight: 'controls' },
  { msg: '⛏️ Head WEST to the Mining Shed. Your uncle\'s rigs are still running!', trigger: 'near_rig', highlight: 'arrow_west' },
  { msg: 'These CPU miners earn sats automatically. Press E near one to toggle power!', trigger: 'interact_rig', highlight: 'key_e' },
  { msg: '₿ Watch your sats grow in the top-left. You\'re mining Bitcoin!', trigger: 'earn_sats', highlight: 'hud_sats' },
  { msg: '📦 Press I to open your Inventory. Your uncle left you some starting supplies.', trigger: 'open_inv', highlight: 'key_i' },
  { msg: 'Use number keys 1-9 to select items on your hotbar. Or just click them!', trigger: 'select_item', highlight: 'hotbar' },
  { msg: '🔧 Select the Wrench and press E near a rig to repair it. Keep them running!', trigger: 'press', highlight: 'key_1' },
  { msg: '🏪 Ruby runs the Hardware Shop to the SOUTH. She sells everything you need.', trigger: 'visit_shop', highlight: 'arrow_south' },
  { msg: 'Press B near Ruby to browse her shop. Click or arrow keys to navigate!', trigger: 'press', highlight: 'key_b' },
  { msg: '🌱 Find dirt tiles in the garden (north of home). Select seeds and press R to plant!', trigger: 'press', highlight: null },
  { msg: '⏳ Crops grow over several days. Click a golden glowing crop or press H nearby to harvest.', trigger: 'press' },
  { msg: '🪓 The AXE chops trees for wood. The HOE tills grass into farmable dirt. The SHOVEL picks up placed items.', trigger: 'press' },
  { msg: '🔨 Press T to open the Crafting Bench! Combine materials to make fence posts, cheese, circuits, and more.', trigger: 'press' },
  { msg: '🪵 Chop trees with the axe to get WOOD. Craft FENCE POSTS (2 wood each) at the bench. Place fences with R to build animal pens!', trigger: 'press' },
  { msg: '🐄 Buy animals from Ruby\'s shop. Place them with R inside a fenced area. Feed them daily with FEED from the shop.', trigger: 'press' },
  { msg: '🥛 Happy, fed animals produce items over time — eggs, milk, beef, honey. Click them or press E to collect!', trigger: 'press' },
  { msg: '😴 Actions cost ENERGY. Eat food (bread, coffee, meat) to restore it, or sleep at home after 6 PM. Press E inside your house.', trigger: 'press' },
  { msg: '🏰 Press C near your home to upgrade your Citadel. Build toward sovereignty!', trigger: 'press' },
  { msg: '🧩 Your uncle hid 24 seed phrase fragments across the valley. Each one unlocks Bitcoin history.', trigger: 'press' },
  { msg: '🗺️ Explore! Press N for minimap, O for quests, K for skills, ? for all controls. Good luck, pleb!', trigger: 'press' },
];

const objectives = [
  // Chapter 1: Getting Started
  { id: 'place_rig', text: '⛏️ Place your first mining rig', done: false, chapter: 'Chapter 1: The Homestead' },
  { id: 'earn_1000', text: '💰 Earn 1,000 sats', done: false, chapter: '' },
  { id: 'visit_shop', text: "🏪 Visit Ruby's Hardware Shop", done: false, chapter: '' },
  { id: 'repair_rig', text: '🔧 Repair a broken rig', done: false, chapter: '' },
  
  // Chapter 2: Growing
  { id: 'buy_gpu', text: '🖥️ Buy a GPU Rig upgrade', done: false, chapter: 'Chapter 2: Proof of Work' },
  { id: 'place_solar', text: '☀️ Place a solar panel (off-grid!)', done: false, chapter: '' },
  { id: 'plant_crop', text: '🌱 Plant your first crop', done: false, chapter: '' },
  { id: 'find_hermit', text: '🌲 Find The Hermit in the forest', done: false, chapter: '' },
  
  // Chapter 3: The Market
  { id: 'earn_50000', text: '💰 Earn 50,000 sats', done: false, chapter: 'Chapter 3: Market Cycles' },
  { id: 'survive_bear', text: '🐻 Survive a Capitulation phase', done: false, chapter: '' },
  { id: 'first_halving', text: '🔶 Witness the first Halving', done: false, chapter: '' },
  
  // Chapter 4: The Mystery
  { id: 'find_seed', text: '🧩 Find a seed phrase fragment', done: false, chapter: "Chapter 4: Uncle Toshi's Secret" },
  { id: 'talk_all', text: '💬 Talk to every villager', done: false, chapter: '' },
  { id: 'upgrade_citadel', text: '🏰 Upgrade your Citadel', done: false, chapter: 'Chapter 5: The Citadel' },
  { id: 'max_citadel', text: '🗼 Achieve full Citadel tier', done: false, chapter: '' },
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
function useEnergy(amount){if(player.energy<amount){notify('Too tired! Eat food or sleep.',2);sfx.error();return false;}player.energy-=amount;return true;}

// ============================================================
// POWER
// ============================================================
const pwr = {gen:0,use:0,stored:0,maxStore:0,panels:[],batts:[],gridCost:1,gridAcc:0};
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
    else {
      // Grid power costs sats but only deducts every few seconds, not every frame
      pwr.gridAcc += -surplus * dt;
      if (pwr.gridAcc >= 5) { // Only charge when 5+ kWh accumulated
        const cost = Math.ceil(pwr.gridAcc * pwr.gridCost * 0.1);
        player.wallet = Math.max(0, player.wallet - cost);
        pwr.gridAcc = 0;
        if (cost > 0) notify(`⚡ Grid power: -${cost} sats`, 1.5);
      }
    }
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
  // Home (citadel) — size determined by citadelTier
  buildBuilding(homeX-Math.floor(CITADEL_TIERS[citadelTier].w/2), homeY-Math.floor(CITADEL_TIERS[citadelTier].h/2), CITADEL_TIERS[citadelTier].w, CITADEL_TIERS[citadelTier].h, 'home');
  // Mining Shed (northwest of town — room to expand)
  buildBuilding(homeX-18, homeY-6, 6, 5, 'shed');
  // Ruby's Shop
  buildBuilding(homeX+4, homeY+16, 8, 6, 'shop');
  // Tavern
  buildBuilding(homeX+20, homeY+12, 7, 6, 'tavern');
  // Town Hall
  buildBuilding(homeX+12, homeY-10, 8, 6, 'hall');
  
  // ---- PATHS (connecting buildings) ----
  // Main east-west road (wider, longer)
  drawPath(homeX-20, homeY+3, homeX+25, homeY+3, 3);
  // Path to cabin
  drawPath(homeX, homeY+3, homeX, homeY+2, 1);
  // Path from shed door down to main road
  drawPath(homeX-15, homeY-1, homeX-15, homeY+3, 1);
  // Path south to shop
  drawPath(homeX+8, homeY+3, homeX+8, homeY+21, 2);
  // Path to tavern
  drawPath(homeX+23, homeY+3, homeX+23, homeY+17, 1);
  // Path north to town hall
  drawPath(homeX+16, homeY+3, homeX+16, homeY-5, 1);
  // Path north to bridge
  drawPath(homeX, homeY-3, homeX, homeY-18, 1);
  // Path south to market/lake area
  drawPath(homeX+8, homeY+22, homeX+8, homeY+30, 1);
  // Village plaza (4x4 path tiles where south paths diverge)
  for(let py=homeY+4;py<=homeY+7;py++) for(let px=homeX+4;px<=homeX+7;px++) setT(px,py,T.PATH);
  
  // ---- GARDEN (behind/north of home — clear of max citadel) ----
  // Max citadel top edge: homeY - 5. Garden starts at homeY-10
  const gardenX = homeX-3, gardenY = homeY-12;
  for (let y = gardenY; y <= gardenY+4; y++) for (let x = gardenX; x <= gardenX+7; x++) {
    if (y >= 0 && y < MAP_H && x >= 0 && x < MAP_W) map[y][x] = T.DIRT;
  }
  for (let x = gardenX-1; x <= gardenX+8; x++) { setT(x, gardenY-1, T.FENCE); setT(x, gardenY+5, T.FENCE); }
  for (let y = gardenY-1; y <= gardenY+5; y++) { setT(gardenX-1, y, T.FENCE); setT(gardenX+8, y, T.FENCE); }
  setT(gardenX+3, gardenY+5, T.PATH); // gate at south side
  decor.push({ x: gardenX+3, y: gardenY+6, type: 'sign', text: 'The Garden' });
  
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
      const nearBuilding = Math.abs(x-homeX)<30 && Math.abs(y-homeY)<26;
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
  decor.push({ x: homeX-16, y: homeY-1, type: 'sign', text: 'Mining Shed' });
  decor.push({ x: homeX+7, y: homeY+15, type: 'sign', text: "Ruby's Hardware" });
  decor.push({ x: homeX+22, y: homeY+11, type: 'sign', text: 'The Hodl Tavern' });
  decor.push({ x: homeX+14, y: homeY-11, type: 'sign', text: 'Town Hall' });
  decor.push({ x: homeX, y: homeY-15, type: 'sign', text: "← Forest  Mountains →" });
  decor.push({ x: 15, y: 30, type: 'sign', text: "Cypherpunk Woods" });
  
  // Bitcoin graffiti / easter eggs
  decor.push({ x: homeX+20, y: homeY+5, type: 'sign', text: "21M" });
  decor.push({ x: homeX-8, y: homeY-8, type: 'sign', text: "HODL" });
  decor.push({ x: 30, y: 25, type: 'sign', text: "In code we trust" });
  
  // ---- INTERIOR DECORATIONS ----
  // Shop interior items
  const shopX=homeX+4, shopY=homeY+16;
  decor.push({x:shopX+1,y:shopY+1,type:'furniture',item:'shelf'});
  decor.push({x:shopX+2,y:shopY+1,type:'furniture',item:'shelf'});
  decor.push({x:shopX+5,y:shopY+1,type:'furniture',item:'shelf'});
  decor.push({x:shopX+6,y:shopY+1,type:'furniture',item:'shelf'});
  decor.push({x:shopX+3,y:shopY+3,type:'furniture',item:'counter'});
  decor.push({x:shopX+4,y:shopY+3,type:'furniture',item:'counter'});

  // Tavern interior
  const tavX=homeX+20, tavY=homeY+12;
  decor.push({x:tavX+1,y:tavY+1,type:'furniture',item:'barrel'});
  decor.push({x:tavX+2,y:tavY+3,type:'furniture',item:'table'});
  decor.push({x:tavX+4,y:tavY+3,type:'furniture',item:'table'});
  decor.push({x:tavX+5,y:tavY+1,type:'furniture',item:'barrel'});

  // Town Hall interior
  const hallX=homeX+12, hallY=homeY-10;
  decor.push({x:hallX+2,y:hallY+1,type:'furniture',item:'desk'});
  decor.push({x:hallX+5,y:hallY+1,type:'furniture',item:'bookshelf'});
  decor.push({x:hallX+3,y:hallY+3,type:'furniture',item:'chair'});
  decor.push({x:hallX+4,y:hallY+3,type:'furniture',item:'chair'});

  // Shed interior
  decor.push({x:homeX-17,y:homeY-5,type:'furniture',item:'workbench'});
  decor.push({x:homeX-14,y:homeY-5,type:'furniture',item:'crate'});

  // ---- FARMER'S MARKET (south of main road) ----
  const mktX=homeX+2, mktY=homeY+8;
  // Market ground (path tiles)
  for(let y=mktY;y<=mktY+5;y++) for(let x=mktX;x<=mktX+8;x++) setT(x,y,T.PATH);
  // Path connecting market to main road
  drawPath(mktX+4, homeY+3, mktX+4, mktY, 2);
  // Market stall decorations
  decor.push({x:mktX+1,y:mktY+1,type:'furniture',item:'market_stall'});
  decor.push({x:mktX+3,y:mktY+1,type:'furniture',item:'market_stall'});
  decor.push({x:mktX+5,y:mktY+1,type:'furniture',item:'market_stall'});
  decor.push({x:mktX+7,y:mktY+1,type:'furniture',item:'market_stall'});
  decor.push({x:mktX+1,y:mktY+4,type:'furniture',item:'market_stall'});
  decor.push({x:mktX+3,y:mktY+4,type:'furniture',item:'market_stall'});
  decor.push({x:mktX+5,y:mktY+4,type:'furniture',item:'market_stall'});
  decor.push({x:mktX+7,y:mktY+4,type:'furniture',item:'market_stall'});
  decor.push({x:mktX+4,y:mktY-1,type:'sign',text:'Farmer\'s Market'});

  // Seed fragments hidden in the world
  const fragLocations = [
    // Near home & buildings
    {x:homeX-16,y:homeY-5},   // Mining shed
    {x:homeX+10,y:homeY+18},  // Behind shop
    {x:homeX+22,y:homeY+14},  // Near tavern
    {x:homeX-3,y:homeY-10},   // In the garden
    // Forest (west)
    {x:15,y:20},{x:8,y:40},{x:20,y:55},{x:12,y:65},{x:6,y:30},
    // Mountains (north)
    {x:40,y:8},{x:70,y:6},{x:90,y:12},
    // Lake & beaches (east)
    {x:95,y:45},{x:100,y:60},{x:85,y:75},
    // Map edges & corners (reward exploration)
    {x:5,y:80},{x:110,y:10},{x:105,y:80},{x:60,y:5},
    // Unique terrain spots
    {x:35,y:25},{x:75,y:35},{x:50,y:70},{x:30,y:50},{x:80,y:25},
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
  if (w > 5 && by+h-1 < MAP_H) map[by+h-1][doorX+1] = T.PATH;
  
  // Add roof decoration
  const roofColors = { home:'#8B2020', shed:'#5A6A4A', shop:'#C47415', tavern:'#6A3A1A', hall:'#4A4A6A' };
  decor.push({ x: bx, y: by-1, type: 'roof', w, h: 1, bh: h, color: roofColors[type] || '#8B2020', label: type });
}

function rebuildCitadel() {
  const t = CITADEL_TIERS[citadelTier];
  const cx = homeX - Math.floor(t.w/2), cy = homeY - Math.floor(t.h/2);
  // Clear old home area first (tier 4 max size)
  const maxT = CITADEL_TIERS[CITADEL_TIERS.length-1];
  const clearCx = homeX - Math.floor(maxT.w/2), clearCy = homeY - Math.floor(maxT.h/2);
  for (let y = clearCy-1; y < clearCy+maxT.h+2; y++) for (let x = clearCx-1; x < clearCx+maxT.w+2; x++) {
    if (y>=0&&y<MAP_H&&x>=0&&x<MAP_W) map[y][x] = T.GRASS;
  }
  // Remove old home roof from decor
  for (let i = decor.length-1; i >= 0; i--) { if (decor[i].type==='roof'&&decor[i].label==='home') decor.splice(i,1); }
  // Build new footprint
  buildBuilding(cx, cy, t.w, t.h, 'home');
  // For Compound (tier 3+): add outer defensive wall ring
  if (citadelTier >= 3) {
    for (let x = cx-2; x < cx+t.w+2; x++) { setT(x, cy-2, T.WALL); setT(x, cy+t.h+1, T.WALL); }
    for (let y = cy-2; y < cy+t.h+2; y++) { setT(cx-2, y, T.WALL); setT(cx+t.w+1, y, T.WALL); }
    // Gate in outer wall
    setT(homeX, cy+t.h+1, T.PATH); setT(homeX+1, cy+t.h+1, T.PATH);
  }
  // For Citadel (tier 4): mark tower tile in decor
  if (citadelTier >= 4) {
    decor.push({ x: homeX+Math.floor(t.w/2)-1, y: cy, type: 'citadel_tower' });
  }
  // Restore paths around citadel
  drawPath(homeX, homeY+Math.floor(t.h/2)+1, homeX, homeY+5, 1); // front door to main road
  drawPath(homeX-20, homeY+3, homeX+25, homeY+3, 3); // re-draw main road segment near home
}

function upgradeCitadel() {
  if (citadelTier >= CITADEL_TIERS.length-1) { notify('🗼 Already at max Citadel tier!', 2); sfx.error(); return; }
  const next = CITADEL_TIERS[citadelTier+1];
  if (player.wallet < next.cost) { notify(`Need ${fmt(next.cost)} sats to upgrade!`, 2); sfx.error(); return; }
  player.wallet -= next.cost;
  citadelTier++;
  rebuildCitadel();
  // Teleport player outside the new footprint to prevent getting trapped (#70)
  const t = CITADEL_TIERS[citadelTier];
  player.x = homeX * TILE + 8;
  player.y = (homeY + Math.floor(t.h/2) + 2) * TILE + 8;
  notify(`🏰 Upgraded to ${t.icon} ${t.name}! (Tier ${citadelTier})`, 4, true);
  sfx.block();
  completeObjective('upgrade_citadel');
  if (citadelTier >= CITADEL_TIERS.length-1) completeObjective('max_citadel');
}

function isNearHome() {
  const t = CITADEL_TIERS[citadelTier];
  const doorX = homeX * TILE + 8, doorY = (homeY + Math.floor(t.h/2) + 1) * TILE + 8;
  return Math.hypot(player.x - doorX, player.y - doorY) < TILE * 4;
}

function startTransition(type, duration, callback) {
  transition = {type, timer: 0, duration, callback};
}

function createInterior(type, w, h, furniture) {
  const tileMap = [];
  for (let y = 0; y < h; y++) {
    tileMap[y] = [];
    for (let x = 0; x < w; x++) {
      if (y === 0 || y === h-1 || x === 0 || x === w-1) tileMap[y][x] = T.WALL;
      else tileMap[y][x] = T.FLOOR;
    }
  }
  // Door at bottom center
  const doorX = Math.floor(w/2);
  tileMap[h-1][doorX] = T.PATH;
  if (w > 6) tileMap[h-1][doorX+1] = T.PATH;
  // Mark non-chair furniture tiles as solid
  for (const f of furniture) {
    if (f.item !== 'chair') tileMap[f.y][f.x] = T.WALL;
  }
  return {type, map: tileMap, w, h, furniture, doorX, spawnX: doorX*TILE+8, spawnY: (h-3)*TILE+8};
}

function generateInteriors() {
  INTERIOR_MAPS.home = createInterior('home', 12, 10, [
    {x:2,y:1,item:'bed'},{x:3,y:1,item:'bed'},
    {x:8,y:1,item:'bookshelf'},{x:9,y:1,item:'bookshelf'},
    {x:2,y:4,item:'table'},{x:3,y:4,item:'chair'},
    {x:8,y:4,item:'desk'},{x:9,y:3,item:'chair'},
    {x:5,y:1,item:'fireplace'},
    {x:1,y:7,item:'crate'},{x:10,y:7,item:'crate'},
  ]);
  INTERIOR_MAPS.shop = createInterior('shop', 14, 10, [
    {x:1,y:1,item:'shelf'},{x:2,y:1,item:'shelf'},{x:3,y:1,item:'shelf'},
    {x:5,y:1,item:'shelf'},{x:6,y:1,item:'shelf'},{x:7,y:1,item:'shelf'},
    {x:9,y:1,item:'shelf'},{x:10,y:1,item:'shelf'},{x:11,y:1,item:'shelf'},
    {x:4,y:4,item:'counter'},{x:5,y:4,item:'counter'},{x:6,y:4,item:'counter'},
    {x:7,y:4,item:'counter'},{x:8,y:4,item:'counter'},
    {x:1,y:7,item:'barrel'},{x:12,y:7,item:'barrel'},
    {x:3,y:7,item:'crate'},{x:10,y:7,item:'crate'},
  ]);
  INTERIOR_MAPS.tavern = createInterior('tavern', 12, 10, [
    {x:1,y:1,item:'barrel'},{x:2,y:1,item:'barrel'},{x:9,y:1,item:'barrel'},{x:10,y:1,item:'barrel'},
    {x:1,y:2,item:'counter'},{x:2,y:2,item:'counter'},{x:3,y:2,item:'counter'},
    {x:3,y:4,item:'table'},{x:5,y:4,item:'table'},{x:7,y:4,item:'table'},
    {x:3,y:6,item:'table'},{x:5,y:6,item:'table'},{x:7,y:6,item:'table'},
    {x:9,y:4,item:'chair'},{x:9,y:6,item:'chair'},
    {x:6,y:1,item:'fireplace'},
  ]);
  INTERIOR_MAPS.shed = createInterior('shed', 10, 8, [
    {x:1,y:1,item:'workbench'},{x:2,y:1,item:'workbench'},
    {x:5,y:1,item:'shelf'},{x:6,y:1,item:'shelf'},
    {x:8,y:1,item:'shelf'},
    {x:1,y:4,item:'crate'},{x:2,y:4,item:'crate'},
    {x:7,y:4,item:'workbench'},
  ]);
  INTERIOR_MAPS.hall = createInterior('hall', 14, 10, [
    {x:6,y:1,item:'desk'},{x:7,y:1,item:'desk'},
    {x:6,y:2,item:'chair'},
    {x:1,y:1,item:'bookshelf'},{x:2,y:1,item:'bookshelf'},{x:11,y:1,item:'bookshelf'},{x:12,y:1,item:'bookshelf'},
    {x:3,y:5,item:'chair'},{x:5,y:5,item:'chair'},{x:8,y:5,item:'chair'},{x:10,y:5,item:'chair'},
    {x:3,y:6,item:'bench'},{x:5,y:6,item:'bench'},{x:8,y:6,item:'bench'},{x:10,y:6,item:'bench'},
    {x:1,y:8,item:'barrel'},
  ]);
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
function isSolid(tx,ty){
  const m=interior?interior.map:map;
  const mw=interior?interior.w:MAP_W;
  const mh=interior?interior.h:MAP_H;
  if(tx<0||ty<0||tx>=mw||ty>=mh)return true;
  if(SOLID.has(m[ty][tx]))return true;
  if(!interior&&fences.some(f=>f.x===tx&&f.y===ty))return true;
  return false;
}

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
    this.interior=null; // null = overworld, or building type string
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
    if(this.ma>=1.5){this.ma=0;const hp=1-Math.max(0,Math.min(.5,(this.temp-70)/30));const dp=this.dur/100;const ef=this.hr*hp*dp;e=Math.max(1,Math.floor(ef*15/econ.diff));this.mined+=e;
    if(Math.random()<ef*.0001){const rw=312500;e+=rw;this.mined+=rw;notify('⛏️ BLOCK FOUND! +312,500 sats!',6,true);sfx.block();}
    this.dur=Math.max(0,this.dur-.03);}return e;
  }
  status(){if(this.dur<=0)return'BROKEN';if(this.oh)return'OVERHEAT';if(!this.powered)return'OFF';return Math.floor(this.hr*(this.dur/100)/econ.diff*10)+' s/s';}
  statusCol(){if(this.dur<=0)return C.red;if(this.oh)return C.ledOrange;if(!this.powered)return C.gray;return C.ledGreen;}
}
const placed = []; // solar, battery, fan, chest
const chestInv = []; // extra storage, same format as inv
const CHEST_SIZE = 20;
let chestOpen = false;
const animals = [];
class Animal {
  constructor(x, y, type) {
    this.x = x; this.y = y; this.type = type;
    this.homeX = x; this.homeY = y;
    this.happiness = 80; this.fed = true;
    this.daysSinceProd = 0; this.prodReady = false;
    this.dir = Math.random() < 0.5 ? -1 : 1;
    this.moveTimer = Math.random() * 3; this.moving = false;
    this.targetX = x; this.targetY = y;
    this.animFrame = 0; this.animTimer = 0;
  }
}

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
  { name:'Leverage Larry',x:(homeX+23)*TILE+8,y:(homeY+15)*TILE+8,col:'#4455FF',hair:'#222',role:'friend',
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
    wp:[{x:homeX+21,y:homeY+15},{x:homeX+24,y:homeY+15},{x:homeX+24,y:homeY+17},{x:homeX+21,y:homeY+17}],pi:0,mt:0,mi:2 },
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
  { name:'Ruby',x:(homeX+8)*TILE+8,y:(homeY+19)*TILE+8,col:'#CC4444',hair:'#FF6644',role:'shop',
    dlg:[
      '"Press B to browse! Everything priced in sats — no fiat here."',
      '"These ASICs came off the boat from Shenzhen last week."',
      '"Your uncle was my best customer. Bought three S9s on launch day."',
      '"Solar + mining = proof of work powered by proof of sunshine."',
      '"I only accept Bitcoin. Mayor tried paying in FiatBucks once. Once."',
      '"Pro tip: immersion cooling is endgame. I\'m working on it."',
      '"Every miner I sell makes the network stronger. That\'s the real product."',
    ],
    wp:[{x:homeX+6,y:homeY+19},{x:homeX+9,y:homeY+19},{x:homeX+9,y:homeY+21},{x:homeX+6,y:homeY+21}],pi:0,mt:0,mi:5 },
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
  { name:'Saylor',x:(homeX+16)*TILE+8,y:(homeY-7)*TILE+8,col:'#1A1A6B',hair:'#333',role:'friend',
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
    wp:[{x:homeX+14,y:homeY-7},{x:homeX+18,y:homeY-7},{x:homeX+18,y:homeY-6},{x:homeX+14,y:homeY-6}],pi:0,mt:0,mi:5 },
  { name:'Pizza Pete',x:(homeX+2)*TILE+8,y:(homeY+22)*TILE+8,col:'#CC8800',hair:'#664400',role:'friend',
    dlg:[
      '"I once traded 10,000 BTC for two pizzas. Don\'t look at me like that."',
      '"May 22nd, 2010. The most expensive lunch in history. My lunch."',
      '"Laszlo was right about one thing — the pizza was pretty good."',
      '"Every time BTC hits a new ATH, someone sends me a pizza emoji."',
      '"I\'m not bitter. I bootstrapped the first real BTC transaction. History."',
      '"Your uncle always ordered two pizzas on Pizza Day. Tradition."',
      '"At least I proved Bitcoin had real-world value. You\'re welcome."',
    ],
    wp:[{x:homeX+1,y:homeY+21},{x:homeX+4,y:homeY+21},{x:homeX+4,y:homeY+23},{x:homeX+1,y:homeY+23}],pi:0,mt:0,mi:4 },
  { name:'Farmer Pete',x:(homeX+6)*TILE+8,y:(homeY+10)*TILE+8,col:'#228822',hair:'#886633',role:'market',
    dlg:[
      '"Press B to sell your harvest! I pay in sats, naturally."',
      '"Potatoes, tomatoes, corn — bring me what you\'ve got."',
      '"Farm-to-table, no middlemen. The way Satoshi intended."',
      '"Your uncle grew the best tomatoes in the valley."',
      '"Low time preference applies to farming too. Be patient."',
      '"Sell in Euphoria phase for max profit. Buy seeds in Capitulation."',
    ],
    wp:[{x:homeX+3,y:homeY+10},{x:homeX+8,y:homeY+10},{x:homeX+8,y:homeY+12},{x:homeX+3,y:homeY+12}],pi:0,mt:0,mi:4 },
  { name:'Seed Sally',x:(homeX+4)*TILE+8,y:(homeY+12)*TILE+8,col:'#44AA44',hair:'#886633',role:'seeds',
    dlg:[
      '"Fresh seeds, straight from the valley! Everything organic."',
      '"Plant potatoes first — they grow fastest. 4 days and you\'re harvesting."',
      '"Corn takes 8 days but sells for the most. Patience pays."',
      '"Your uncle always said: the best time to plant was yesterday."',
      '"Buy seeds from me, grow them, sell the harvest to Pete. Circle of life!"',
      '"I\'ve got tomato seeds on special today. Well, every day actually."',
    ],
    wp:[{x:homeX+3,y:homeY+12},{x:homeX+6,y:homeY+12},{x:homeX+6,y:homeY+11},{x:homeX+3,y:homeY+11}],pi:0,mt:0,mi:5 },
];

// ============================================================
// SHOP
// ============================================================
const SHOP_LIST = ['wrench','pickaxe','axe','hoe','shovel','cpu_miner','gpu_rig','asic_s21','solar_panel','battery','cooling_fan','bread','coffee','potato_seed','tomato_seed','corn_seed','pumpkin_seed','immersion_tank','mesh_antenna','bitcoin_sign','chest','goat','cow','bee_hive','chicken','feed'];
const SEED_SHOP_LIST = ['potato_seed','tomato_seed','corn_seed','pumpkin_seed','feed','bread'];

// Map item IDs to sprite cache names
const ITEM_SPRITES = {
  wrench: 'item_wrench', pickaxe: 'item_pickaxe',
  cpu_miner: 'item_cpu', gpu_rig: 'item_gpu', asic_s21: 'item_asic',
  solar_panel: 'item_solar', battery: 'item_battery', cooling_fan: 'item_fan',
};
let shopOpen=false, shopCur=0, shopMode='buy', shopNpcRole='shop', shopScroll=0;

// ============================================================
// CRAFTING SYSTEM
// ============================================================
const RECIPES = [
  { id:'fence_post',    result:{id:'fence_post',qty:1},    ingredients:[{id:'wood',qty:2}],                                          xp:3  },
  { id:'flower_pot',   result:{id:'flower_pot',qty:1},   ingredients:[{id:'wood',qty:1},{id:'fiber',qty:1}],                         xp:5  },
  { id:'torch_item',   result:{id:'torch_item',qty:1},   ingredients:[{id:'wood',qty:1},{id:'fiber',qty:1}],                         xp:5  },
  { id:'cheese',       result:{id:'cheese',qty:1},       ingredients:[{id:'milk',qty:2}],                                            xp:8  },
  { id:'circuit_board',result:{id:'circuit_board',qty:1},ingredients:[{id:'copper_ore',qty:1},{id:'silicon',qty:1}],                 xp:20 },
  { id:'advanced_rig_part',result:{id:'advanced_rig_part',qty:1},ingredients:[{id:'circuit_board',qty:1},{id:'wood',qty:2}],         xp:40 },
  { id:'shed_upgrade', result:{id:'shed_upgrade',qty:1}, ingredients:[{id:'wood',qty:10},{id:'copper_ore',qty:5}],                   xp:50 },
  { id:'citadel_materials',result:{id:'citadel_materials',qty:1},ingredients:[{id:'wood',qty:20},{id:'copper_ore',qty:10},{id:'silicon',qty:5}], xp:80 },
];
let craftOpen=false, craftCur=0;

function canCraft(recipe){
  return recipe.ingredients.every(ing=>inv.some(s=>s&&s.id===ing.id&&s.qty>=ing.qty));
}
function doCraft(recipe){
  if(!canCraft(recipe)){sfx.error();notify('Missing ingredients!',1.5);return;}
  for(const ing of recipe.ingredients){removeItem(ing.id,ing.qty);}
  if(addItem(recipe.result.id,recipe.result.qty)){
    addXP('engineering',recipe.xp);
    sfx.buy();
    const it=ITEMS[recipe.result.id];
    notify(`${it.icon} Crafted ${it.name}!`,2);
  }else{
    // Undo removal if inventory full
    for(const ing of recipe.ingredients){addItem(ing.id,ing.qty);}
    notify('Inventory full!',1.5);sfx.error();
  }
}

// ============================================================
// FENCES
// ============================================================
const fences=[]; // [{x,y}] tile coords

// ============================================================
// UI STATE
// ============================================================
let dlg = null; // {name, text, role, displayedChars, done, fullText}
let dlgCharTimer = 0;
const DLG_CHAR_SPEED = 0.03; // seconds per character
let invOpen = false;
const notifs = [];
function notify(text,dur=2.5,big=false){if(notifs.length<20)notifs.push({text,t:dur,big});}
const particles = [];
function satPart(x,y,n){if(particles.length<150)particles.push({x:x*SCALE,y:y*SCALE,text:'+'+fmt(n)+' ₿',life:2,vy:-25,size:n>100?16:13});}

// ============================================================
// ECONOMY & TIME
// ============================================================
const econ = {diff:1,phase:0,phaseN:['Accumulation','Hype','Euphoria','Capitulation'],pd:0,cycle:0,inf:1,halvings:0};

const weather = {current:'sunny',timer:0,duration:0,particles:[],lightning:0,windX:0};
const WEATHER_TYPES = {
  sunny:  {weight:40,minDur:60,maxDur:180,overlay:null},
  cloudy: {weight:30,minDur:40,maxDur:120,overlay:'rgba(40,40,60,0.08)'},
  rain:   {weight:20,minDur:30,maxDur:90, overlay:'rgba(30,40,70,0.12)'},
  storm:  {weight:10,minDur:20,maxDur:60, overlay:'rgba(20,25,50,0.2)'},
};
const ambient = []; // {x,y,type,vx,vy,life,maxLife,size,color,phase}

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
// ANIMAL TYPES
// ============================================================
const ANIMAL_TYPES = {
  cow:    { name:'Cow',     sprite:'animal_cow',     product:'beef',    productName:'Beef',    icon:'🥩', produceTime:7, prodQty:1, feedCost:2, sellPrice:500 },
  goat:   { name:'Goat',    sprite:'animal_goat',    product:'milk',    productName:'Milk',    icon:'🥛', produceTime:3, prodQty:1, feedCost:1, sellPrice:200 },
  chicken:{ name:'Chicken', sprite:'animal_chicken', product:'egg',     productName:'Eggs',    icon:'🥚', produceTime:1, prodQty:2, feedCost:1, sellPrice:80  },
  bee:    { name:'Bee Hive',sprite:'animal_bee',     product:'honey',   productName:'Honey',   icon:'🍯', produceTime:5, prodQty:1, feedCost:0, sellPrice:350 },
};

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
    // Add crop to inventory (sell at Farmer Pete's market)
    const cropItem = crop.type + '_crop';
    if (addItem(cropItem)) {
      addXP('farming', 15 + info.grow * 2);
      notify(`${info.icon} Harvested ${info.name}! Sell at Farmer Pete's market.`, 3);
      sfx.coin();
      crops.splice(index, 1);
      return true;
    } else {
      notify('Inventory full! Make room first.', 2);
      sfx.error();
      return false;
    }
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
let citadelTier = 0;
let citadelMenuOpen = false;
let pauseOpen = false;
let pauseCur = 0;
const PAUSE_ITEMS = ['Resume','Save Game','Load Game','Music','Controls','Quit to Title'];

// ============================================================
// CITADEL UPGRADE TIERS
// ============================================================
const CITADEL_TIERS = [
  {name:'Shack',   cost:0,      w:5,  h:4,  rooms:1, icon:'🛖', desc:'1 room. A humble beginning.'},
  {name:'Cabin',   cost:2000,   w:7,  h:6,  rooms:2, icon:'🏠', desc:'2 rooms. A cozy upgrade.'},
  {name:'House',   cost:10000,  w:9,  h:7,  rooms:4, icon:'🏡', desc:'4 rooms. A proper home.'},
  {name:'Compound',cost:50000,  w:12, h:9,  rooms:6, icon:'🏰', desc:'6 rooms + defensive wall.'},
  {name:'Citadel', cost:200000, w:15, h:11, rooms:8, icon:'🗼', desc:'8 rooms + Faraday cage + tower.'},
];

const CONTROLS_LIST = [
  ['WASD / Arrows', 'Move around (click to walk)'],
  ['E', 'Interact (talk, toggle rigs, repair, collect, sleep)'],
  ['R', 'Use item / Plant seeds / Place rigs, fences, animals'],
  ['H', 'Harvest crop (near golden glowing crop)'],
  ['B', 'Open shop (near Ruby, or inside shop/tavern)'],
  ['T', 'Open Workbench (craft fence posts, cheese, circuits...)'],
  ['I / Tab', 'Open inventory'],
  ['1-9, 0', 'Select hotbar slot'],
  ['C', 'Citadel upgrade (near home)'],
  ['O', 'Quest log'],
  ['K', 'Skills overview'],
  ['N', 'Toggle minimap'],
  ['M', 'Toggle music'],
  ['P', 'Save game'],
  ['L', 'Load game'],
  ['Space', 'Fast forward time'],
  ['F', 'Toggle fullscreen'],
  ['?', 'This controls screen'],
  ['Esc', 'Close any menu / Open pause menu'],
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
const time = {dl:300,cur:.25,day:1,spd:1,td:1}; // 5 min days (was 3)
function getHour(){return time.cur*24;}
function getTimeStr(){const h=Math.floor(getHour()),m=Math.floor((getHour()-h)*60);return`${h%12||12}:${m.toString().padStart(2,'0')} ${h<12?'AM':'PM'}`;}
function getPeriod(){const h=getHour();if(h<5)return'Night';if(h<7)return'Dawn';if(h<12)return'Morning';if(h<14)return'Noon';if(h<17)return'Afternoon';if(h<21)return'Evening';return'Night';}
function getDayOv(){const h=getHour();if(h<5)return{r:10,g:10,b:30,a:.5};if(h<6.5)return{r:80,g:50,b:60,a:lerp(.4,.1,(h-5)/1.5)};if(h<7.5)return{r:200,g:160,b:110,a:lerp(.1,0,(h-6.5))};if(h<17)return{r:0,g:0,b:0,a:0};if(h<19)return{r:220,g:120,b:50,a:lerp(0,.12,(h-17)/2)};if(h<21)return{r:60,g:40,b:90,a:lerp(.12,.35,(h-19)/2)};return{r:15,g:15,b:35,a:lerp(.35,.5,(h-21)/3)};}
function marketMult(){return[.9,1.1,1.5,.7][econ.phase];}

const cam = {x:0,y:0};

// ============================================================
// SAVE / LOAD
// ============================================================
function saveGame(){try{localStorage.setItem('sv_save',JSON.stringify({v:8,p:{x:player.x,y:player.y,w:player.wallet,te:player.totalEarned,e:player.energy},inv:inv.map(s=>s?{id:s.id,q:s.qty}:null),ss:selSlot,rigs:rigs.map(r=>({x:r.x,y:r.y,t:r.tier,p:r.powered,tp:r.temp,d:r.dur,m:r.mined,int:r.interior||null})),placed:placed.map(i=>({x:i.x,y:i.y,t:i.type})),fences:[...fences],econ:{...econ},time:{...time},pwr:{p:pwr.panels,b:pwr.batts},obj:objectives.map(o=>o.done),tut:tutorialDone,skills,crops:crops.map(c=>({x:c.x,y:c.y,type:c.type,dayAge:c.dayAge,stage:c.stage})),rels:relationships,citadelTier,animals:animals.map(a=>({x:a.x,y:a.y,t:a.type,hx:a.homeX,hy:a.homeY,hp:a.happiness,fed:a.fed,dsp:a.daysSinceProd,pr:a.prodReady,dir:a.dir})),weather:{c:weather.current},chest:chestInv.map(s=>s?{id:s.id,q:s.qty}:null),fw:foundWords}));notify('💾 Saved!',2);sfx.buy();}catch(e){notify('❌ Save failed!',2);}}
function loadGame(){try{const d=JSON.parse(localStorage.getItem('sv_save'));if(!d)return notify('No save found!',2),false;player.x=d.p.x;player.y=d.p.y;player.wallet=d.p.w;player.totalEarned=d.p.te;player.energy=d.p.e||100;inv.length=0;d.inv.forEach(s=>inv.push(s?{id:s.id,qty:s.q}:null));selSlot=d.ss||0;rigs.length=0;d.rigs.forEach(r=>{const ri=new Rig(r.x,r.y,r.t);ri.powered=r.p;ri.temp=r.tp;ri.dur=r.d;ri.mined=r.m;ri.interior=r.int||null;rigs.push(ri);});placed.length=0;(d.placed||[]).forEach(i=>placed.push(i));Object.assign(econ,d.econ);Object.assign(time,d.time);pwr.panels=d.pwr?.p||[];pwr.batts=d.pwr?.b||[];if(d.obj)d.obj.forEach((done,i)=>{if(objectives[i])objectives[i].done=done;});tutorialDone=d.tut||false;
    if(d.skills)Object.assign(skills,d.skills);
    crops.length=0;if(d.crops)d.crops.forEach(c=>crops.push(c));
    if(d.rels)Object.assign(relationships,d.rels);
    if(d.citadelTier!=null){citadelTier=d.citadelTier;rebuildCitadel();}
    animals.length=0;(d.animals||[]).forEach(a=>{const an=new Animal(a.x,a.y,a.t);an.homeX=a.hx;an.homeY=a.hy;an.happiness=a.hp;an.fed=a.fed;an.daysSinceProd=a.dsp;an.prodReady=a.pr;an.dir=a.dir;animals.push(an);});
    if(d.weather)weather.current=d.weather.c;
    chestInv.length=0;(d.chest||[]).forEach(s=>chestInv.push(s?{id:s.id,qty:s.q}:null));
    foundWords=(d.fw||[]);
    fences.length=0;(d.fences||[]).forEach(f=>fences.push(f));
    gameState='playing';notify('📂 Loaded!',2);sfx.buy();return true;}catch(e){notify('❌ Load failed!',2);return false;}}

// ============================================================
// INIT
// ============================================================
initSprites();
generateMap();
generateInteriors();
// Starter rigs inside the mining shed — already mining!
const rig1 = new Rig(3*TILE+8, 3*TILE+8, 0);
const rig2 = new Rig(5*TILE+8, 3*TILE+8, 0);
rig1.interior = 'shed'; rig2.interior = 'shed';
rig1.powered = true; rig2.powered = true;
rigs.push(rig1); rigs.push(rig2);
addItem('wrench', 3);
addItem('bread', 5);
addItem('cpu_miner', 1);
addItem('potato_seed', 5);
addItem('tomato_seed', 3);
addItem('hoe', 1);
addItem('axe', 1);

// Clear old saves from different versions to avoid broken state
const existingSave = localStorage.getItem('sv_save');
if (existingSave) {
  try {
    const d = JSON.parse(existingSave);
    if (!d.v || d.v < 8) {
      localStorage.removeItem('sv_save');
      console.log('Cleared old save (version mismatch)');
    }
  } catch(e) { localStorage.removeItem('sv_save'); }
}

// ============================================================
// INTRO / STORY SCREEN
// ============================================================
function updateIntro(dt) {
  introTimer += dt;
  const slide = INTRO_SLIDES[introStep];
  
  // Title menu on last slide
  if (introStep === INTRO_SLIDES.length - 1) {
    if (!titleMenuOpen) {
      titleMenuOpen = true;
      titleCur = localStorage.getItem('sv_save') ? 1 : 0; // default to Continue if save exists
      titleTip = BTC_TIPS[Math.floor(Math.random() * BTC_TIPS.length)];
    }
    
    const hasSave = !!localStorage.getItem('sv_save');
    const options = hasSave ? ['new_game','continue','controls'] : ['new_game','controls'];
    
    // Navigation
    if (jp['arrowup'] || jp['w']) { titleCur = Math.max(0, titleCur - 1); sfx.interact(); }
    if (jp['arrowdown'] || jp['s']) { titleCur = Math.min(options.length - 1, titleCur + 1); sfx.interact(); }
    
    if (jp['enter'] || jp['e'] || jp[' ']) {
      const choice = options[titleCur];
      if (choice === 'new_game') {
        localStorage.removeItem('sv_save');
        gameState = 'playing'; titleMenuOpen = false;
        sfx.story(); startMusic();
      } else if (choice === 'continue') {
        loadGame(); titleMenuOpen = false;
        startMusic();
      } else if (choice === 'controls') {
        showControls = true;
      }
    }
  } else {
    // Regular slides — advance on input or timer
    if (jp['enter'] || jp['e'] || jp[' ']) {
      introStep++; introTimer = 0;
    }
    if (slide.dur < 900 && introTimer > slide.dur) {
      introStep = Math.min(introStep + 1, INTRO_SLIDES.length - 1);
      introTimer = 0;
    }
  }
  
  for (const k in jp) jp[k] = false;
}

function drawIntro() {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  const slide = INTRO_SLIDES[introStep];
  const alpha = Math.min(1, introTimer * 2) * (introStep === INTRO_SLIDES.length - 1 ? 1 : Math.min(1, (slide.dur - introTimer) * 2));
  
  ctx.globalAlpha = Math.max(0, alpha);
  
  if (introStep === INTRO_SLIDES.length - 1) {
    // ---- TITLE SCREEN WITH MENU ----
    const t = performance.now() / 1000;
    
    // Animated title with glow
    const titleGlow = 0.6 + Math.sin(t * 1.5) * 0.2;
    ctx.shadowColor = C.orange; ctx.shadowBlur = 20 * titleGlow;
    ctx.fillStyle = C.orange;
    ctx.font = `bold ${Math.floor(canvas.width * 0.04)}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('⛏️ SATOSHI VALLEY ⛏️', canvas.width/2, canvas.height * 0.28);
    ctx.shadowBlur = 0;
    
    // Subtitle
    ctx.fillStyle = '#AAA';
    ctx.font = `${Math.floor(canvas.width * 0.013)}px ${FONT}`;
    ctx.fillText('A Bitcoin Farming Sim', canvas.width/2, canvas.height * 0.35);
    ctx.fillStyle = '#777';
    ctx.font = `italic ${Math.floor(canvas.width * 0.01)}px ${FONT}`;
    ctx.fillText('Stack sats. Build your citadel. Fix the money, fix the world.', canvas.width/2, canvas.height * 0.40);
    
    // Menu options
    const hasSave = !!localStorage.getItem('sv_save');
    const options = hasSave
      ? [{label:'⛏️  New Game', id:'new_game'}, {label:'📂  Continue', id:'continue'}, {label:'🎮  Controls', id:'controls'}]
      : [{label:'⛏️  New Game', id:'new_game'}, {label:'🎮  Controls', id:'controls'}];
    
    const menuY = canvas.height * 0.50;
    const menuSpacing = Math.floor(canvas.width * 0.035);
    
    options.forEach((opt, i) => {
      const y = menuY + i * menuSpacing;
      const selected = i === titleCur;
      
      // Selection indicator
      if (selected) {
        const pulse = 0.15 + Math.sin(t * 3) * 0.05;
        ctx.fillStyle = `rgba(247,147,26,${pulse})`;
        ctx.fillRect(canvas.width/2 - 140, y - menuSpacing * 0.35, 280, menuSpacing * 0.7);
      }
      
      ctx.fillStyle = selected ? C.orange : '#666';
      ctx.font = `bold ${Math.floor(canvas.width * 0.016)}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText(opt.label, canvas.width/2, y + 6);
      
      if (selected) {
        // Arrow indicators
        ctx.fillText('▸', canvas.width/2 - 120, y + 6);
        ctx.fillText('◂', canvas.width/2 + 120, y + 6);
      }
    });
    
    // Bitcoin tip at bottom
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = C.orange;
    ctx.font = `italic ${Math.floor(canvas.width * 0.009)}px ${FONT}`;
    ctx.fillText('💡 ' + titleTip, canvas.width/2, canvas.height * 0.85);
    
    // Version
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#555';
    ctx.font = `${Math.floor(canvas.width * 0.008)}px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.fillText('v0.6', canvas.width - 20, canvas.height - 12);
    ctx.textAlign = 'left';
    ctx.fillText('↑↓ Navigate  Enter Select', 20, canvas.height - 12);
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

  // Pause freeze — nothing updates while paused
  if (pauseOpen) {
    if(jp['escape']){pauseOpen=false;sfx.menuClose();}
    else if(jp['arrowup']||jp['w'])pauseCur=Math.max(0,pauseCur-1);
    else if(jp['arrowdown']||jp['s'])pauseCur=Math.min(PAUSE_ITEMS.length-1,pauseCur+1);
    else if(jp['enter']||jp['e']){
      const _psel=PAUSE_ITEMS[pauseCur];
      if(_psel==='Resume'){pauseOpen=false;sfx.menuClose();}
      else if(_psel==='Save Game'){saveGame();pauseOpen=false;}
      else if(_psel==='Load Game'){loadGame();pauseOpen=false;}
      else if(_psel==='Music'){toggleMusic();}
      else if(_psel==='Controls'){showControls=true;pauseOpen=false;}
      else if(_psel==='Quit to Title'){gameState='intro';introStep=INTRO_SLIDES.length-1;titleMenuOpen=true;titleCur=0;titleTip=BTC_TIPS[Math.floor(Math.random()*BTC_TIPS.length)];pauseOpen=false;shopOpen=false;invOpen=false;citadelMenuOpen=false;dlg=null;sfx.menuClose();}
    }
    for(const k in jp)jp[k]=false;
    return;
  }

  // Transition freeze — nothing updates while fading
  if (transition) {
    transition.timer += dt;
    if (transition.timer >= transition.duration) {
      const cb = transition.callback;
      transition = null;
      if (cb) cb();
    }
    return;
  }
  
  // Time
  time.cur += (dt*time.spd)/time.dl;
  if (time.cur>=1){time.cur-=1;time.day++;time.td++;econ.pd++;
    player.energy=Math.max(0,player.energy-2);
    if(player.energy<20&&player.energy>0)notify('Getting tired...',2);
    updateCrops(); // Grow crops each day
    // Rain bonus: crops grow 1 extra day in rain/storm (#60 — use integer to avoid harvest check issues)
    if(weather.current==='rain'||weather.current==='storm'){
      for(const c of crops){c.dayAge+=1;}
      notify('🌧️ Rain helped your crops grow faster!',2);
    }
    // Animal daily update
    for(const a of animals){
      const info=ANIMAL_TYPES[a.type];if(!info)continue;
      if(info.feedCost>0){
        const feedSlot=inv.find(s=>s&&s.id==='feed');
        if(feedSlot&&feedSlot.qty>=info.feedCost){
          feedSlot.qty-=info.feedCost;if(feedSlot.qty<=0){const idx=inv.indexOf(feedSlot);inv[idx]=null;}
          a.fed=true;a.happiness=Math.min(100,a.happiness+5);
        }else{a.fed=false;a.happiness=Math.max(0,a.happiness-15);}
      }else{a.fed=true;}
      a.daysSinceProd++;
      if(a.fed&&a.daysSinceProd>=info.produceTime&&a.happiness>=30){a.prodReady=true;}
    }
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
  // Weather update
  weather.timer -= dt;
  if (weather.timer <= 0) {
    const types = Object.entries(WEATHER_TYPES);
    const total = types.reduce((s,[,v]) => s + v.weight, 0);
    let r = Math.random() * total;
    for (const [name, info] of types) {
      r -= info.weight;
      if (r <= 0) { weather.current = name; weather.duration = info.minDur + Math.random() * (info.maxDur - info.minDur); weather.timer = weather.duration; break; }
    }
    weather.windX = (Math.random() - 0.3) * 2;
  }

  time.spd = keys[' '] ? 15 : 1;
  if(player.boost>0){player.boost-=dt;if(player.boost<=0)notify('☕ Coffee wore off',1.5);}
  // Energy affects movement speed (#51 — meaningful consequences)
  const energyMult = player.energy<=0?0.35:player.energy<15?0.65:player.energy<30?0.85:1;
  const spd = player.speed*(player.boost>0?1.5:1)*energyMult;
  // Pass out at 0 energy if not at home (forced blackout)
  if(player.energy<=0&&!interior&&Math.random()<0.001){
    notify('💫 You collapsed from exhaustion!',3,true);sfx.error();
    startTransition('fadeOut',0.8,()=>{
      time.cur=0.25;player.energy=Math.floor(player.maxEnergy*0.5);
      player.wallet=Math.max(0,player.wallet-Math.floor(player.wallet*0.05));
      notify('😵 You woke up at home. Lost 5% of your sats.',4,true);
      // Teleport home
      const ct=CITADEL_TIERS[citadelTier];
      player.x=homeX*TILE+8;player.y=(homeY+Math.floor(ct.h/2)+2)*TILE+8;
      cam.x=player.x*SCALE-canvas.width/2;cam.y=player.y*SCALE-canvas.height/2;
      startTransition('fadeIn',0.8,null);
    });
  }
  
  // Objective checks
  if(player.totalEarned>=1000) completeObjective('earn_1000');
  if(player.totalEarned>=50000) completeObjective('earn_50000');
  
  // ---- TUTORIAL ----
  if (!tutorialDone && tutorialStep < TUTORIAL_STEPS.length) {
    const tut = TUTORIAL_STEPS[tutorialStep];
    tutTimer += dt;
    if (tut.trigger === 'auto' && tutTimer > (tut.dur || 4)) { tutorialStep++; tutTimer = 0; }
    if (tut.trigger === 'press' && (jp['enter'] || jp['e'] || jp[' '])) { tutorialStep++; tutTimer = 0; }
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
  if(jp['n']) minimapOpen = !minimapOpen;
  if(jp['m']) toggleMusic();
  if(jp['t']){craftOpen=!craftOpen;craftOpen?sfx.menuOpen():sfx.menuClose();craftCur=0;}
  if(jp['c']){if(isNearHome()){citadelMenuOpen=!citadelMenuOpen;citadelMenuOpen?sfx.menuOpen():sfx.menuClose();}else{notify('Get near your home to open the Citadel menu [C]',2);sfx.error();}}
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
  if(jp['b']){
    // Check NPCs nearby (overworld)
    let nr=npcs.find(n=>(n.role==='shop'||n.role==='market'||n.role==='seeds')&&Math.hypot(n.x-player.x,n.y-player.y)<60);
    // Also open shop when inside the shop/tavern building (NPC is conceptually there)
    if(!nr&&interior){
      if(interior.type==='shop')nr={role:'shop',name:'Ruby'};
      else if(interior.type==='tavern')nr={role:'shop',name:'Barkeep'};
    }
    if(nr&&!shopOpen){
      shopOpen=true;shopCur=0;
      shopMode=nr.role==='market'?'sell':'buy';
      shopNpcRole=nr.role;
      sfx.menuOpen();dlg=null;
    }else if(shopOpen){shopOpen=false;sfx.menuClose();}
  }
  if(jp['i']||jp['tab']){if(!shopOpen){invOpen=!invOpen;invOpen?sfx.menuOpen():sfx.menuClose();}}
  if(jp['escape']){if(pauseOpen){pauseOpen=false;sfx.menuClose();}else if(craftOpen){craftOpen=false;sfx.menuClose();}else if(chestOpen){chestOpen=false;sfx.menuClose();}else if(shopOpen){shopOpen=false;sfx.menuClose();}else if(citadelMenuOpen){citadelMenuOpen=false;sfx.menuClose();}else if(invOpen){invOpen=false;sfx.menuClose();}else if(dlg){if(!dlg.done){dlg.displayedChars=dlg.fullText.length;dlg.done=true;}else{dlg=null;}}else if(showObjectives)showObjectives=false;else if(showControls)showControls=false;else if(showSkills)showSkills=false;else{pauseOpen=true;pauseCur=0;sfx.menuOpen();}}
  if(jp['p'])saveGame();if(jp['l'])loadGame();
  for(let n=0;n<=9;n++)if(jp[n.toString()])selSlot=n===0?9:n-1;
  
  // ---- CRAFTING MENU NAV ----
  if(craftOpen){
    if(jp['arrowup']||jp['w'])craftCur=Math.max(0,craftCur-1);
    if(jp['arrowdown']||jp['s'])craftCur=Math.min(RECIPES.length-1,craftCur+1);
    if(jp['enter']||jp['e'])doCraft(RECIPES[craftCur]);
    for(const k in jp)jp[k]=false;return;
  }

  // ---- CITADEL MENU NAV ----
  if(citadelMenuOpen){
    if(jp['enter']||jp['e']||jp['u']){upgradeCitadel();}
    for(const k in jp)jp[k]=false;return;
  }
  
  // ---- SHOP NAV ----
  if(shopOpen){
    const activeList=shopNpcRole==='seeds'?SEED_SHOP_LIST:SHOP_LIST;
    if(jp['arrowup']||jp['w'])shopCur=Math.max(0,shopCur-1);
    if(jp['arrowdown']||jp['s'])shopCur=Math.min((shopMode==='buy'?activeList.length:inv.filter(s=>s).length)-1,shopCur+1);
    if(jp['enter']||jp['e']){
      if(shopMode==='buy'){const id=activeList[shopCur],it=ITEMS[id];if(!it){sfx.error();return;}const pr=Math.ceil(it.buy*marketMult());
        if(player.wallet>=pr){if(addItem(id)){player.wallet-=pr;sfx.buy();notify(`Bought ${it.icon} ${it.name} (${fmt(pr)})`,2);if(id==='gpu_rig')completeObjective('buy_gpu');}else{notify('Inventory full!',1.5);sfx.error();}}else{notify(`Need ${fmt(pr)} sats!`,1.5);sfx.error();}}
      else{const sell=inv.filter(s=>s&&ITEMS[s.id].sell>0);if(shopCur<sell.length){const s=sell[shopCur],it=ITEMS[s.id],pr=Math.ceil(it.sell*marketMult());removeItem(s.id);player.wallet+=pr;sfx.coin();notify(`Sold ${it.icon} ${it.name} (+${fmt(pr)})`,2);}}
    }
    if(jp['arrowleft']||jp['a']||jp['arrowright']||jp['d']){shopMode=shopMode==='buy'?'sell':'buy';shopCur=0;shopScroll=0;}
    for(const k in jp)jp[k]=false;return;
  }
  
  // ---- MOVEMENT ----
  if(!dlg&&!invOpen&&!showObjectives&&!chestOpen){
    let dx=0,dy=0;
    if(keys['w']||keys['arrowup'])dy-=1;if(keys['s']||keys['arrowdown'])dy+=1;
    if(keys['a']||keys['arrowleft'])dx-=1;if(keys['d']||keys['arrowright'])dx+=1;
    if(dx!==0||dy!==0) mouseTarget=null; // keyboard cancels mouse target
    // Mouse click-to-move: inject direction from target if no keyboard input
    if(!dx&&!dy&&mouseTarget){
      const mdx=mouseTarget.x-player.x,mdy=mouseTarget.y-player.y;
      const md=Math.sqrt(mdx*mdx+mdy*mdy);
      if(md<4){mouseTarget=null;}
      else{dx=mdx/md;dy=mdy/md;}
    }
    player.moving=dx!==0||dy!==0;
    if(player.moving){
      const len=Math.sqrt(dx*dx+dy*dy);dx/=len;dy/=len;player.facing={x:dx,y:dy};
      const nx=player.x+dx*spd*dt,ny=player.y+dy*spd*dt;
      const r=5;
      if(!isSolid(Math.floor((nx-r)/TILE),Math.floor((player.y-r)/TILE))&&!isSolid(Math.floor((nx+r)/TILE),Math.floor((player.y+r)/TILE))&&!isSolid(Math.floor((nx-r)/TILE),Math.floor((player.y+r)/TILE))&&!isSolid(Math.floor((nx+r)/TILE),Math.floor((player.y-r)/TILE)))player.x=nx;
      if(!isSolid(Math.floor((player.x-r)/TILE),Math.floor((ny-r)/TILE))&&!isSolid(Math.floor((player.x+r)/TILE),Math.floor((ny+r)/TILE))&&!isSolid(Math.floor((player.x-r)/TILE),Math.floor((ny+r)/TILE))&&!isSolid(Math.floor((player.x+r)/TILE),Math.floor((ny-r)/TILE)))player.y=ny;
      player.wt+=dt;if(player.wt>.15){player.wt=0;player.wf=(player.wf+1)%4;}
      footT+=dt;if(footT>.35){footT=0;const _sm=interior?interior.map:map;const _stx=Math.floor(player.x/TILE),_sty=Math.floor(player.y/TILE);const _stile=(_sm[_sty]&&_sm[_sty][_stx]!=null)?_sm[_sty][_stx]:T.GRASS;sfx.step(_stile);}
      
      // Check seed fragments
      for(let i=decor.length-1;i>=0;i--){
        if(decor[i].type==='seed_fragment'&&Math.hypot(decor[i].x*TILE+8-player.x,decor[i].y*TILE+8-player.y)<20){
          const wordIdx=foundWords.length;
          if(wordIdx<SEED_WORDS.length){
            const sw=SEED_WORDS[wordIdx];
            foundWords.push(wordIdx);
            notify('🧩 Seed word #'+(wordIdx+1)+': "'+sw.word+'"',4,true);
            dlg={name:"Uncle Toshi's Journal",text:sw.hint,role:'lore',fullText:sw.hint,displayedChars:0,done:false};
            sfx.block();
          }
          decor.splice(i,1);completeObjective('find_seed');
        }
      }
    }
  }
  
  // ---- BUILDING ENTRY (overworld) ----
  if(doorCooldown>0) doorCooldown-=dt;
  if (!interior && !transition && doorCooldown<=0) {
    const ptx = Math.floor(player.x / TILE), pty = Math.floor(player.y / TILE);
    // Detect door positions for each building (bottom-center tile of each building)
    // Buildings use buildBuilding() which puts doors at bottom row center
    const ct = CITADEL_TIERS[citadelTier];
    const homeCx = homeX-Math.floor(ct.w/2), homeCy = homeY-Math.floor(ct.h/2);
    
    // Check if player is at or near a door position (within 1 tile of door)
    let buildingType = null;
    const doorChecks = [
      { type:'home', dx: homeCx+Math.floor(ct.w/2), dy: homeCy+ct.h-1 },
      { type:'shed', dx: homeX-18+3, dy: homeY-6+5-1 },   // shed door: x=homeX-15, y=homeY-2
      { type:'shop', dx: homeX+4+4, dy: homeY+16+6-1 },    // shop door: x=homeX+8, y=homeY+21
      { type:'tavern', dx: homeX+20+3, dy: homeY+12+6-1 },  // tavern door: x=homeX+23, y=homeY+17
      { type:'hall', dx: homeX+12+4, dy: homeY-10+6-1 },    // hall door: x=homeX+16, y=homeY-5
    ];
    
    for (const dc of doorChecks) {
      // Enter if player is within 1 tile of door position (and walking toward it)
      if (Math.abs(ptx - dc.dx) <= 1 && Math.abs(pty - dc.dy) <= 1) {
        // Also check the tile is floor, path, or shop (not a wall)
        const tile = map[pty] ? map[pty][ptx] : -1;
        if (tile === T.FLOOR || tile === T.SHOP || tile === T.PATH) {
          buildingType = dc.type;
          break;
        }
      }
    }

    if (buildingType && INTERIOR_MAPS[buildingType]) {
      mouseTarget = null; clickIndicator = null;
      const returnX = player.x, returnY = player.y + TILE * 3;
      startTransition('fadeOut', 0.4, () => {
        const im = INTERIOR_MAPS[buildingType];
        interior = {type:buildingType, map:im.map, w:im.w, h:im.h, furniture:im.furniture, doorX:im.doorX, returnX, returnY};
        player.x = im.spawnX; player.y = im.spawnY;
        cam.x = player.x * SCALE - canvas.width / 2;
        cam.y = player.y * SCALE - canvas.height / 2;
        startTransition('fadeIn', 0.4, null);
        particles.length=0; // Clear sat particles on room transition
          notify('Entered ' + buildingType.charAt(0).toUpperCase() + buildingType.slice(1), 2);
        interiorNPCs = [];
        if (buildingType === 'shop') {
          interiorNPCs.push({ name:'Ruby', x:3*TILE+8, y:2*TILE+8, col:'#CC4444', hair:'#FF6644',
            dlg:['"Welcome to my shop! Take a look around."','"Everything priced in sats — no fiat accepted."','"Your uncle was my best customer."','"Need anything? I\'ve got CPUs to ASICs."'] });
        } else if (buildingType === 'tavern') {
          interiorNPCs.push({ name:'Barkeep', x:4*TILE+8, y:2*TILE+8, col:'#8B6340', hair:'#2A1A08',
            dlg:['"Welcome to the Hodl Tavern. What\'ll it be?"','"We only serve Bitcoin-branded beverages here."','"Your uncle used to sit right where you\'re standing."','"Lightning tips accepted and appreciated."'] });
        } else if (buildingType === 'hall') {
          interiorNPCs.push({ name:'Mayor Keynesian', x:4*TILE+8, y:2*TILE+8, col:'#888', hair:'#AAA',
            dlg:['"Ah, you\'ve come to discuss village policy?"','"I\'ve been thinking about a new stimulus package..."','"The village budget is... flexible. Very flexible."','"Don\'t listen to the hermit. The system works fine."'] });
        }
      });
    }
  } // end building entry

  // ---- BUILDING EXIT (interior) ----
  if (interior && !transition) {
    // Exit ONLY when player walks past the very bottom edge (intentional exit)
    const atDoor = player.y >= (interior.h - 1) * TILE + TILE/2;
    
    if (atDoor) {
      const rx = interior.returnX, ry = interior.returnY;
      startTransition('fadeOut', 0.3, () => {
        interior = null;
        interiorNPCs = [];
        doorCooldown = 2.0;
        player.x = rx; player.y = ry;
        cam.x = player.x * SCALE - canvas.width / 2;
        cam.y = player.y * SCALE - canvas.height / 2;
        startTransition('fadeIn', 0.3, null);
      });
    }
  }

  // ---- INTERACT ----
  intCd-=dt;
  if(jp['e']&&intCd<=0&&!shopOpen&&!invOpen&&!chestOpen){
    intCd=.25;
    if(dlg){if(!dlg.done){dlg.displayedChars=dlg.fullText.length;dlg.done=true;}else{dlg=null;}}
    else if(interior && interior.type==='home'){
      // Sleep — skip to morning
      const hour=getHour();
      if(hour>=18||hour<6){
        startTransition('fadeOut', 0.6, ()=>{
          time.cur=0.25; // 6 AM
          player.energy=player.maxEnergy; // Full restore on sleep (#59)
          notify('💤 You slept through the night. Energy restored!',3);
          sfx.story();
          startTransition('fadeIn', 0.6, null);
        });
      } else {
        notify("Not tired yet. Come back after 6 PM.",2);sfx.error();
      }
    }
    else{
      const ix=player.x+player.facing.x*20,iy=player.y+player.facing.y*20;
      // PRIORITY: Check interior NPCs first (before rigs/animals/anything else)
      if(interior && interiorNPCs.length > 0){
        let intNpcHandled=false;
        for(const n of interiorNPCs){
          if(Math.hypot(n.x-ix,n.y-iy)<48){
            const _ndInt=n.dlg[Math.floor(Math.random()*n.dlg.length)];
            dlg={name:n.name,text:_ndInt,role:n.role||'friend',fullText:_ndInt,displayedChars:0,done:false};dlgCharTimer=0;sfx.interact();
            addXP('social',2);intNpcHandled=true;break;
          }
        }
        if(intNpcHandled){for(const k in jp)jp[k]=false;return;}
      }
      // Only find rigs in current view (interior match)
      const currentInt=interior?interior.type:null;
      let cr=null,cd=28;for(const r of rigs){if((currentInt&&r.interior===currentInt)||(!currentInt&&!r.interior)){const d=Math.hypot(r.x-ix,r.y-iy);if(d<cd){cr=r;cd=d;}}}
      if(cr){const sel=getSelected();
        if(sel&&sel.id==='wrench'&&cr.dur<100){cr.dur=Math.min(100,cr.dur+25);removeItem('wrench');sfx.repair();notify(`🔧 Repaired! ${cr.dur.toFixed(0)}%`,2);completeObjective('repair_rig');}
        else{cr.powered=!cr.powered;sfx.interact();notify(`Rig ${cr.powered?'ON ⚡':'OFF 💤'}`,1.5);}
      }else{
        // Check animals
        let animalHandled=false;
        for(const a of animals){
          if(Math.hypot(a.x-ix,a.y-iy)<28){
            const info=ANIMAL_TYPES[a.type];
            if(a.prodReady){
              if(addItem(info.product,info.prodQty)){
                a.prodReady=false;a.daysSinceProd=0;
                sfx.coin();notify(info.icon+' Collected '+info.productName+'!',2);addXP('farming',5);
                satPart(a.x,a.y,info.sellPrice);
              }else{notify('Inventory full!',1.5);sfx.error();}
            }else{
              const daysLeft=info.produceTime-a.daysSinceProd;
              const mood=a.happiness>=70?'😊 Happy':a.happiness>=30?'😐 OK':'😞 Unhappy';
              const _at2=mood+' | Fed: '+(a.fed?'Yes ✅':'No ❌')+' | '+(daysLeft>0?daysLeft+' days until '+info.productName:info.productName+' ready!');dlg={name:info.name,text:_at2,role:'animal',fullText:_at2,displayedChars:0,done:false};dlgCharTimer=0;
              sfx.interact();
            }
            animalHandled=true;break;
          }
        }
        if(!animalHandled){
          // Check placed chests
          for(const p of placed){
            if(p.type==='chest'&&Math.hypot(p.x-ix,p.y-iy)<24){
              chestOpen=true;sfx.menuOpen();break;
            }
          }
          // Interior NPCs handled at top of interact block (priority check) — removed duplicate here (#58)
          if(!chestOpen)for(const n of npcs){if(Math.hypot(n.x-ix,n.y-iy)<32){const _nd2=n.dlg[Math.floor(Math.random()*n.dlg.length)];dlg={name:n.name,text:_nd2,role:n.role,fullText:_nd2,displayedChars:0,done:false};dlgCharTimer=0;sfx.interact();
            if(n.name==='The Hermit')completeObjective('find_hermit');
            initRelationships();
            if(!relationships[n.name].talked){relationships[n.name].talked=true;addHearts(n.name,0.2);addXP('social',3);}
            break;}}
        }
      }
    }
  }
  
  // ---- TYPEWRITER DIALOGUE UPDATE ----
  if(dlg && !dlg.done){
    dlgCharTimer+=dt;
    while(dlgCharTimer>=DLG_CHAR_SPEED && dlg.displayedChars<dlg.fullText.length){
      dlg.displayedChars++;dlgCharTimer-=DLG_CHAR_SPEED;
      if(dlg.displayedChars%2===0)tone(300+Math.random()*200,0.02,'square',0.015);
    }
    if(dlg.displayedChars>=dlg.fullText.length)dlg.done=true;
  }

  // ---- USE ITEM ----
  placeCd-=dt;
  if(jp['r']&&placeCd<=0&&!shopOpen&&!invOpen&&!dlg&&!chestOpen){
    placeCd=.3;const sel=getSelected();
    if(!sel){notify('Select item (1-9)',1.5);}
    else{
      const it=ITEMS[sel.id];
      // Block placing world items inside buildings (food consumption still works below)
      if(interior && it.type!=='food' && !(interior.type==='shed' && it.type==='rig')){notify("Can't place items indoors!",1.5);sfx.error();}
      else{
      const px=Math.round((player.x+player.facing.x*24)/TILE)*TILE+8;
      const py=Math.round((player.y+player.facing.y*24)/TILE)*TILE+8;
      const ptx=Math.floor(px/TILE),pty=Math.floor(py/TILE);
      if(it.type==='rig'){
        if(!isSolid(ptx,pty)&&!rigs.some(r=>Math.abs(r.x-px)<TILE&&Math.abs(r.y-py)<TILE)){
          removeItem(sel.id);rigs.push(new Rig(px,py,it.tier));if(interior) rigs[rigs.length-1].interior=interior.type;sfx.place();notify(`⛏️ ${it.name} placed!`,2);completeObjective('place_rig');
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
      }else if(sel.id==='chest'){
        if(!isSolid(ptx,pty)&&!placed.some(i=>Math.abs(i.x-px)<TILE&&Math.abs(i.y-py)<TILE)){
          removeItem('chest');placed.push({x:px,y:py,type:'chest'});sfx.place();notify('📦 Storage chest placed!',2);
        }else{sfx.error();notify("Can't place here!",1.5);}
      }else if(it.type==='animal'){
        const animalType = sel.id === 'bee_hive' ? 'bee' : sel.id;
        if(!isSolid(ptx,pty)&&!rigs.some(r=>Math.abs(r.x-px)<TILE&&Math.abs(r.y-py)<TILE)
           &&!animals.some(a=>Math.abs(a.x-px)<TILE&&Math.abs(a.y-py)<TILE)){
          removeItem(sel.id);animals.push(new Animal(px,py,animalType));sfx.place();
          notify(ANIMAL_TYPES[animalType].icon+' '+ANIMAL_TYPES[animalType].name+' placed!',2);addXP('farming',10);
        } else { sfx.error(); notify("Can't place here!",1.5); }
      }else if(sel.id==='bread'){removeItem('bread');player.energy=Math.min(player.maxEnergy,player.energy+30);sfx.coin();notify('🍞 +30 energy',1.5);}
      else if(sel.id==='coffee'){removeItem('coffee');player.boost=30;player.energy=Math.min(player.maxEnergy,player.energy+10);sfx.coin();notify('☕ Speed boost!',2);}
      else if(sel.id==='beef'){removeItem('beef');player.energy=Math.min(player.maxEnergy,player.energy+60);player.boost=45;sfx.coin();notify('🥩 Beef steak! +60 energy, strength boost!',2.5);addXP('farming',2);}
      else if(sel.id==='milk'){removeItem('milk');player.energy=Math.min(player.maxEnergy,player.energy+25);sfx.coin();notify('🥛 Fresh milk! +25 energy',1.5);}
      else if(sel.id==='egg'){removeItem('egg');player.energy=Math.min(player.maxEnergy,player.energy+15);sfx.coin();notify('🥚 Farm fresh! +15 energy',1.5);}
      else if(sel.id==='honey'){removeItem('honey');player.energy=Math.min(player.maxEnergy,player.energy+35);player.boost=20;sfx.coin();notify('🍯 Sweet honey! +35 energy, speed boost!',2);}
      else if(sel.id==='cheese'){removeItem('cheese');player.energy=Math.min(player.maxEnergy,player.energy+40);sfx.coin();notify('🧀 Aged cheese! +40 energy',1.5);}
      else if(sel.id==='pickaxe'){
        if(!useEnergy(8))return;
        const tx=Math.floor((player.x+player.facing.x*16)/TILE),ty=Math.floor((player.y+player.facing.y*16)/TILE);
        if(map[ty]&&(map[ty][tx]===T.STONE||map[ty][tx]===T.CLIFF)){
          if(Math.random()<.4){addItem('copper_ore');sfx.repair();notify('🪨 Copper ore!',1.5);addXP('foraging',3);}
          else if(Math.random()<.25){addItem('silicon');sfx.repair();notify('💎 Silicon!',1.5);addXP('foraging',5);}
          else{sfx.interact();notify('Nothing...',1);addXP('foraging',1);}
        }
      }
      // CROP PLANTING on dirt tiles
      else if(sel.id==='potato_seed'||sel.id==='tomato_seed'||sel.id==='corn_seed'||sel.id==='pumpkin_seed'){
        if(!useEnergy(2))return;
        const tx=Math.floor((player.x+player.facing.x*16)/TILE),ty=Math.floor((player.y+player.facing.y*16)/TILE);
        if(map[ty]&&map[ty][tx]===T.DIRT&&!crops.some(c=>c.x===tx&&c.y===ty)){
          const cropType = sel.id.replace('_seed','');
          removeItem(sel.id);
          plantCrop(tx,ty,cropType);
          sfx.place();notify(`🌱 Planted ${CROP_TYPES[cropType].name}! (${CROP_TYPES[cropType].grow} days)`,2);
          addXP('farming',5);
          completeObjective('plant_crop');
        } else { notify("Plant on empty dirt tiles!",1.5); sfx.error(); }
      }
      // AXE — chop trees, clear tall grass
      else if(sel.id==='axe'){
        if(!useEnergy(5))return;
        const tx=Math.floor((player.x+player.facing.x*20)/TILE),ty=Math.floor((player.y+player.facing.y*20)/TILE);
        // Check for trees in decor
        let chopped = false;
        for(let i=decor.length-1;i>=0;i--){
          const d=decor[i];
          if(d.type==='tree'&&Math.abs(d.x-tx)<=1&&Math.abs(d.y-ty)<=1){
            decor.splice(i,1);
            addItem('wood',2+Math.floor(Math.random()*3));
            sfx.repair();notify('🪓 Chopped tree! +wood',2);addXP('foraging',8);chopped=true;break;
          }
          if(d.type==='bush'&&Math.abs(d.x-tx)<=1&&Math.abs(d.y-ty)<=1){
            decor.splice(i,1);
            addItem('fiber',1+Math.floor(Math.random()*2));
            sfx.interact();notify('🪓 Cleared bush! +fiber',1.5);addXP('foraging',3);chopped=true;break;
          }
        }
        if(!chopped&&map[ty]&&map[ty][tx]===T.TALLGRASS){
          map[ty][tx]=T.GRASS;
          addItem('fiber');sfx.interact();notify('🌿 Cleared grass! +fiber',1.5);addXP('foraging',2);
        }
        else if(!chopped){notify('Nothing to chop here',1);sfx.error();}
      }
      // HOE — convert grass to dirt
      else if(sel.id==='hoe'){
        if(!useEnergy(3))return;
        const tx=Math.floor((player.x+player.facing.x*16)/TILE),ty=Math.floor((player.y+player.facing.y*16)/TILE);
        if(map[ty]&&(map[ty][tx]===T.GRASS||map[ty][tx]===T.TALLGRASS||map[ty][tx]===T.FLOWERS)){
          map[ty][tx]=T.DIRT;
          sfx.place();notify('🌾 Tilled soil!',1.5);addXP('farming',2);
        } else { notify("Can only till grass!",1.5);sfx.error(); }
      }
      // SHOVEL — pick up placed items and rigs
      else if(sel.id==='shovel'){
        if(!useEnergy(2))return;
        const ix=player.x+player.facing.x*20,iy=player.y+player.facing.y*20;
        // Check placed items first
        let picked=false;
        for(let i=placed.length-1;i>=0;i--){
          if(Math.hypot(placed[i].x-ix,placed[i].y-iy)<24){
            const p=placed[i];
            const itemMap={solar_panel:'solar_panel',battery:'battery',cooling_fan:'cooling_fan',chest:'chest',flower_pot:'flower_pot',torch_item:'torch_item',bitcoin_sign:'bitcoin_sign'};
            if(itemMap[p.type]){addItem(itemMap[p.type]);notify(`⚒️ Picked up ${p.type.replace('_',' ')}`,2);}
            // Remove from power arrays too
            if(p.type==='solar_panel') pwr.panels=pwr.panels.filter(pp=>pp.x!==p.x||pp.y!==p.y);
            if(p.type==='battery') pwr.batts=pwr.batts.filter(pp=>pp.x!==p.x||pp.y!==p.y);
            placed.splice(i,1);sfx.repair();addXP('engineering',5);picked=true;break;
          }
        }
        // Check rigs
        if(!picked){
          for(let i=rigs.length-1;i>=0;i--){
            if(Math.hypot(rigs[i].x-ix,rigs[i].y-iy)<24){
              const r=rigs[i];
              const rigItems=['cpu_miner','gpu_rig','asic_s21'];
              addItem(rigItems[r.tier]);
              notify(`⚒️ Picked up ${Rig.N[r.tier]}`,2);
              rigs.splice(i,1);sfx.repair();addXP('engineering',5);picked=true;break;
            }
          }
        }
        if(!picked){
          for(let i=animals.length-1;i>=0;i--){
            if(Math.hypot(animals[i].x-ix,animals[i].y-iy)<24){
              const a=animals[i];const itemId=a.type==='bee'?'bee_hive':a.type;
              addItem(itemId);animals.splice(i,1);
              sfx.interact();notify('⚒️ Picked up '+ANIMAL_TYPES[a.type].name,2);picked=true;break;
            }
          }
        }
        // Check fences
        if(!picked){
          const ftx=Math.floor(ix/TILE),fty=Math.floor(iy/TILE);
          const fi=fences.findIndex(f=>f.x===ftx&&f.y===fty);
          if(fi>=0){fences.splice(fi,1);addItem('fence_post');sfx.repair();notify('⚒️ Picked up fence post',1.5);picked=true;}
        }
        if(!picked){notify('Nothing to pick up',1.5);sfx.error();}
      }
      // FENCE POST placement
      else if(sel.id==='fence_post'){
        const tx=Math.floor((player.x+player.facing.x*20)/TILE),ty=Math.floor((player.y+player.facing.y*20)/TILE);
        if(!isSolid(tx,ty)&&!fences.some(f=>f.x===tx&&f.y===ty)){
          removeItem('fence_post');fences.push({x:tx,y:ty});sfx.place();notify('🪵 Fence placed!',1.5);
        }else{sfx.error();notify("Can't place fence here!",1.5);}
      }
      // DECORATION placement (flower_pot, torch_item, bitcoin_sign)
      else if(sel.id==='flower_pot'||sel.id==='torch_item'||sel.id==='bitcoin_sign'){
        if(!isSolid(ptx,pty)&&!placed.some(i=>Math.abs(i.x-px)<TILE&&Math.abs(i.y-py)<TILE)){
          removeItem(sel.id);placed.push({x:px,y:py,type:sel.id});sfx.place();notify(`${it.icon} ${it.name} placed!`,1.5);
        }else{sfx.error();notify("Can't place here!",1.5);}
      }
    } // end interior check
  } // end R-key use item
  }
  
  // NPCs
  for(const n of npcs){n.mt+=dt;if(n.mt>=n.mi){n.mt=0;n.pi=(n.pi+1)%n.wp.length;}
    const t=n.wp[n.pi],tx=t.x*TILE+8,ty=t.y*TILE+8,s=30*dt;
    const nMoving=Math.abs(n.x-tx)>1||Math.abs(n.y-ty)>1;
    if(Math.abs(n.x-tx)>1)n.x+=Math.sign(tx-n.x)*s;if(Math.abs(n.y-ty)>1)n.y+=Math.sign(ty-n.y)*s;
    n.moving=nMoving;
    if(nMoving){n.wt=(n.wt||0)+dt;if(n.wt>0.15){n.wt=0;n.wf=((n.wf||0)+1)%4;}}else n.wt=0;}
  
  // Rigs
  let th=0;for(const r of rigs){const e=r.update(dt);if(e>0){player.wallet+=e;player.totalEarned+=e;
    // Only show sat particles for rigs in current view (interior match)
    const rigVisible=interior?(r.interior===interior.type):!r.interior;
    if(rigVisible)satPart(r.x,r.y-10,e);
    if(Math.random()<.2){sfx.coin();if(Math.random()<.1)addXP('mining',1);}
  }if(r.powered&&!r.oh&&r.dur>0)th+=r.hr;}
  econ.diff=1+(th/10)*.5;updateHum(th);updatePower(dt);
  // Music sync
  if(music&&musicOn){music.setPhase(econ.phase);music.setTimeOfDay(getHour());}
  
  // Animal AI
  for(const a of animals){
    if(a.type==='bee') continue;
    a.moveTimer-=dt;
    if(a.moveTimer<=0){
      a.moveTimer=2+Math.random()*4;
      if(Math.random()<0.6){
        a.moving=true;
        a.targetX=a.homeX+(Math.random()*6-3)*TILE;
        a.targetY=a.homeY+(Math.random()*6-3)*TILE;
        a.targetX=Math.max(TILE,Math.min(a.targetX,(MAP_W-2)*TILE));
        a.targetY=Math.max(TILE,Math.min(a.targetY,(MAP_H-2)*TILE));
      } else { a.moving=false; }
    }
    if(a.moving){
      const dx=a.targetX-a.x,dy=a.targetY-a.y;
      const dist=Math.sqrt(dx*dx+dy*dy);
      if(dist<2){a.moving=false;}
      else{
        const spd=20*dt;
        const nx=a.x+dx/dist*spd,ny=a.y+dy/dist*spd;
        const ntx=Math.floor(nx/TILE),nty=Math.floor(ny/TILE);
        if(!isSolid(ntx,nty)){a.x=nx;a.y=ny;}else{a.moving=false;}
        if(dx>0)a.dir=1;else if(dx<0)a.dir=-1;
      }
    }
    a.animTimer+=dt;if(a.animTimer>0.3){a.animTimer=0;a.animFrame=(a.animFrame+1)%2;}
  }

  // Camera
  if (interior) {
    // Snap camera to center interior (no smooth pan for small rooms)
    const targetX = (interior.w * TILE * SCALE) / 2 - canvas.width / 2;
    const targetY = (interior.h * TILE * SCALE) / 2 - canvas.height / 2;
    cam.x = targetX; cam.y = targetY;
  } else {
    // Smooth follow in overworld
    cam.x+=(player.x*SCALE-canvas.width/2-cam.x)*3.5*dt;
    cam.y+=(player.y*SCALE-canvas.height/2-cam.y)*3.5*dt;
  }

  // Particles & notifs
  for(let i=particles.length-1;i>=0;i--){particles[i].life-=dt;particles[i].y+=particles[i].vy*dt;if(particles[i].life<=0)particles.splice(i,1);}
  if(clickIndicator){clickIndicator.life-=dt*1.5;if(clickIndicator.life<=0)clickIndicator=null;}
  for(let i=notifs.length-1;i>=0;i--){notifs[i].t-=dt;if(notifs[i].t<=0)notifs.splice(i,1);}
  
  // Weather particles
  if (weather.current === 'rain' || weather.current === 'storm') {
    const rate = weather.current === 'storm' ? 8 : 4;
    for (let i = 0; i < rate && weather.particles.length < 500; i++) {
      weather.particles.push({
        x: Math.random() * canvas.width,
        y: -10,
        vy: 400 + Math.random() * 200 + (weather.current === 'storm' ? 200 : 0),
        vx: weather.windX * 100 + (weather.current === 'storm' ? Math.random() * 100 - 50 : 0),
        life: 1.5,
        len: weather.current === 'storm' ? 16 : 10,
      });
    }
  }
  for (let i = weather.particles.length - 1; i >= 0; i--) {
    const p = weather.particles[i];
    p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
    if (p.life <= 0 || p.y > canvas.height) weather.particles.splice(i, 1);
  }
  // Storm lightning
  if (weather.current === 'storm' && Math.random() < 0.002) weather.lightning = 0.3;
  if (weather.lightning > 0) weather.lightning -= dt;

  // Ambient life particles
  const hour = getHour();
  const isNight = hour < 6 || hour > 20;
  // Butterflies (daytime, sunny/cloudy)
  if (!isNight && weather.current !== 'storm' && ambient.length < 30 && Math.random() < 0.02) {
    const bx = (player.x + (Math.random()-0.5)*600) * SCALE - cam.x;
    const by = (player.y + (Math.random()-0.5)*400) * SCALE - cam.y;
    if(ambient.length<100) ambient.push({x:bx,y:by,type:'butterfly',vx:(Math.random()-0.5)*30,vy:Math.sin(Math.random()*6)*15,life:8+Math.random()*10,maxLife:18,size:3,color:['#E8C840','#E870B0','#7070E0','#FF6644','#70D0A0'][Math.floor(Math.random()*5)],phase:Math.random()*6});
  }
  // Fireflies (night)
  if (isNight && ambient.length < 40 && Math.random() < 0.03) {
    const fx = (player.x + (Math.random()-0.5)*500) * SCALE - cam.x;
    const fy = (player.y + (Math.random()-0.5)*300) * SCALE - cam.y;
    if(ambient.length<100) ambient.push({x:fx,y:fy,type:'firefly',vx:(Math.random()-0.5)*15,vy:(Math.random()-0.5)*15,life:5+Math.random()*8,maxLife:13,size:2,color:'#CCFF66',phase:Math.random()*6});
  }
  // Dust motes (when player runs, daytime)
  if (player.moving && !isNight && Math.random() < 0.15) {
    if(ambient.length<100) ambient.push({x:player.x*SCALE-cam.x+(Math.random()-0.5)*10,y:player.y*SCALE-cam.y+15,type:'dust',vx:(Math.random()-0.5)*20+weather.windX*10,vy:-10-Math.random()*15,life:0.8+Math.random()*0.5,maxLife:1.3,size:2,color:'#B0A080'});
  }
  // Leaves (windy/storm)
  if ((weather.current === 'storm' || weather.windX > 0.5) && ambient.length < 20 && Math.random() < 0.01) {
    if(ambient.length<100) ambient.push({x:-20,y:Math.random()*canvas.height,type:'leaf',vx:60+Math.random()*40,vy:20+Math.random()*30,life:6+Math.random()*4,maxLife:10,size:4,color:['#8A6A20','#AA8830','#6A8A20','#CC8833'][Math.floor(Math.random()*4)],phase:Math.random()*6});
  }
  // Update ambient
  for (let i = ambient.length - 1; i >= 0; i--) {
    const p = ambient[i];
    p.life -= dt;
    if (p.life <= 0) { ambient.splice(i, 1); continue; }
    if (p.type === 'butterfly') {
      p.phase += dt * 3;
      p.x += (Math.sin(p.phase) * 25 + p.vx) * dt;
      p.y += (Math.cos(p.phase * 0.7) * 18 + p.vy) * dt;
    } else if (p.type === 'firefly') {
      p.phase += dt * 2;
      p.x += (Math.sin(p.phase) * 12 + p.vx) * dt;
      p.y += (Math.cos(p.phase * 1.3) * 10 + p.vy) * dt;
    } else if (p.type === 'leaf') {
      p.phase += dt * 4;
      p.x += p.vx * dt;
      p.y += (p.vy + Math.sin(p.phase) * 20) * dt;
    } else {
      p.x += p.vx * dt; p.y += p.vy * dt;
    }
  }

  for(const k in jp)jp[k]=false;
} // end update()

// ============================================================
// TILE DRAWING — Beautiful pixel art style
// ============================================================
// Tile neighbor helper for edge blending
function getTile(tx,ty){if(ty<0||ty>=MAP_H||tx<0||tx>=MAP_W)return T.CLIFF;return map[ty][tx];}
const TERRAIN_GRASS=new Set([T.GRASS,T.TALLGRASS,T.FLOWER,T.MUSHROOM]);
const TERRAIN_WATER_SET=new Set([T.WATER,T.DEEP]);

function drawTile(x,y,tile){
  const sx=x*ST-cam.x,sy=y*ST-cam.y;
  if(sx>canvas.width+ST||sy>canvas.height+ST||sx<-ST||sy<-ST)return;
  const v=(x*7+y*13)%3,t=performance.now()/1000;
  const v2=(x*11+y*3)%5;
  
  switch(tile){
    case T.GRASS:{
      // Use Perlin noise for smooth, organic color blending (no checkerboard!)
      const gn=fbm(x*0.15+0.5,y*0.15+0.5,2); // smooth noise 0-1
      const gn2=fbm(x*0.3+10,y*0.3+10,2); // finer detail layer
      // Blend between 2-3 greens smoothly based on noise
      const baseR=Math.floor(30+gn*30);const baseG=Math.floor(90+gn*50+gn2*20);const baseB=Math.floor(15+gn*20);
      ctx.fillStyle=`rgb(${baseR},${baseG},${baseB})`;ctx.fillRect(sx,sy,ST,ST);
      // Subtle lighter patches using second noise octave
      if(gn2>0.55){ctx.fillStyle=`rgba(80,160,50,${(gn2-0.55)*0.4})`;ctx.fillRect(sx,sy,ST,ST);}
      // Darker patches for depth
      if(gn<0.4){ctx.fillStyle=`rgba(15,50,10,${(0.4-gn)*0.25})`;ctx.fillRect(sx,sy,ST,ST);}
      // Sparse grass tufts (use noise-based seeding, not modulo)
      const gSeed=(x*31+y*17)%37;
      if(gSeed<4){
        ctx.fillStyle=`rgba(60,140,40,0.6)`;
        ctx.fillRect(sx+10+gSeed*6,sy+8+gSeed*3,1,7);
        ctx.fillRect(sx+14+gSeed*5,sy+12+gSeed*2,1,5);
      }
      // Very sparse wildflowers
      if(gSeed===1){ctx.fillStyle='#E8C840';ctx.fillRect(sx+22,sy+18,2,2);}
      if(gSeed===17){ctx.fillStyle='#D0D0F0';ctx.fillRect(sx+14,sy+28,2,2);}
      // Ground clutter — tiny scattered details like Stardew
      if(gSeed===3){ctx.fillStyle='rgba(80,60,30,0.2)';ctx.fillRect(sx+30,sy+36,3,2);} // twig
      if(gSeed===7){ctx.fillStyle='rgba(100,90,70,0.25)';ctx.beginPath();ctx.arc(sx+38,sy+10,2,0,Math.PI*2);ctx.fill();} // pebble
      if(gSeed===12){ctx.fillStyle='rgba(60,100,40,0.3)';ctx.fillRect(sx+6,sy+40,4,3);} // small weed
      if(gSeed===20){ctx.fillStyle='rgba(90,80,50,0.2)';ctx.fillRect(sx+24,sy+30,2,4);} // stick
      // Edge blending — soft transition where grass meets non-grass
      const tN=getTile(x,y-1),tS=getTile(x,y+1),tW=getTile(x-1,y),tE=getTile(x+1,y);
      if(!TERRAIN_GRASS.has(tN)){ctx.fillStyle='rgba(120,100,60,0.18)';ctx.fillRect(sx,sy,ST,6);ctx.fillStyle='rgba(80,65,35,0.12)';ctx.fillRect(sx+4,sy,ST-8,3);}
      if(!TERRAIN_GRASS.has(tS)){ctx.fillStyle='rgba(120,100,60,0.18)';ctx.fillRect(sx,sy+ST-6,ST,6);ctx.fillStyle='rgba(80,65,35,0.12)';ctx.fillRect(sx+4,sy+ST-3,ST-8,3);}
      if(!TERRAIN_GRASS.has(tW)){ctx.fillStyle='rgba(120,100,60,0.18)';ctx.fillRect(sx,sy,6,ST);ctx.fillStyle='rgba(80,65,35,0.12)';ctx.fillRect(sx,sy+4,3,ST-8);}
      if(!TERRAIN_GRASS.has(tE)){ctx.fillStyle='rgba(120,100,60,0.18)';ctx.fillRect(sx+ST-6,sy,6,ST);ctx.fillStyle='rgba(80,65,35,0.12)';ctx.fillRect(sx+ST-3,sy+4,3,ST-8);}
      // Corner blending (diagonal neighbors)
      if(!TERRAIN_GRASS.has(tN)&&!TERRAIN_GRASS.has(tW)){ctx.fillStyle='rgba(100,80,40,0.2)';ctx.beginPath();ctx.arc(sx,sy,8,0,Math.PI/2);ctx.fill();}
      if(!TERRAIN_GRASS.has(tN)&&!TERRAIN_GRASS.has(tE)){ctx.fillStyle='rgba(100,80,40,0.2)';ctx.beginPath();ctx.arc(sx+ST,sy,8,Math.PI/2,Math.PI);ctx.fill();}
      if(!TERRAIN_GRASS.has(tS)&&!TERRAIN_GRASS.has(tW)){ctx.fillStyle='rgba(100,80,40,0.2)';ctx.beginPath();ctx.arc(sx,sy+ST,8,-Math.PI/2,0);ctx.fill();}
      if(!TERRAIN_GRASS.has(tS)&&!TERRAIN_GRASS.has(tE)){ctx.fillStyle='rgba(100,80,40,0.2)';ctx.beginPath();ctx.arc(sx+ST,sy+ST,8,Math.PI,-Math.PI/2);ctx.fill();}
      break;}
    case T.TALLGRASS:{
      // Same smooth Perlin base as regular grass
      const tgn=fbm(x*0.15+0.5,y*0.15+0.5,2);
      const tgR=Math.floor(30+tgn*30);const tgG=Math.floor(90+tgn*50);const tgB=Math.floor(15+tgn*20);
      ctx.fillStyle=`rgb(${tgR},${tgG},${tgB})`;ctx.fillRect(sx,sy,ST,ST);
      const sw=Math.sin(t*1.8+x*.7+y*.5)*3;
      ctx.fillStyle='#4A9030';
      for(let i=0;i<5;i++){const ox=4+i*8+sw*(i%2?1:-1);ctx.fillRect(sx+ox,sy+4,1,ST-6);}
      ctx.fillStyle='#5AA040';
      for(let i=0;i<4;i++){const ox=8+i*10+sw*1.1;ctx.fillRect(sx+ox,sy+8,1,ST-12);}
      ctx.fillStyle='#3A8020';
      for(let i=0;i<3;i++){const ox=6+i*12-sw*0.7;ctx.fillRect(sx+ox,sy+6,1,ST-8);}
      break;}
    case T.FLOWER:{
      // Grass base
      const fgn=fbm(x*0.15+0.5,y*0.15+0.5,2);
      ctx.fillStyle=`rgb(${Math.floor(30+fgn*30)},${Math.floor(90+fgn*50)},${Math.floor(15+fgn*20)})`;ctx.fillRect(sx,sy,ST,ST);
      // Multiple flowers in a meadow cluster
      const fSeed=(x*13+y*7);
      const flowerCount=2+(fSeed%3);
      for(let fi=0;fi<flowerCount;fi++){
        const fx=sx+8+((fSeed+fi*17)%30);
        const fy=sy+6+((fSeed+fi*11)%32);
        const fc=C.flower[(fSeed+fi)%6];
        const fSize=3+((fSeed+fi)%3);
        // Stem
        ctx.fillStyle='#3A7020';ctx.fillRect(fx,fy+fSize,2,10+fi*2);
        // Leaf
        if(fi%2===0){ctx.fillStyle='#4A8A2A';ctx.fillRect(fx+2,fy+fSize+4,4,2);}
        // Petals (small circles around center)
        ctx.fillStyle=fc;
        for(let p=0;p<5;p++){
          const pa=p/5*Math.PI*2;
          ctx.beginPath();ctx.arc(fx+1+Math.cos(pa)*(fSize-1),fy+Math.sin(pa)*(fSize-1),fSize*0.5,0,Math.PI*2);ctx.fill();
        }
        // Center
        ctx.fillStyle='#FFE060';ctx.beginPath();ctx.arc(fx+1,fy,fSize*0.35,0,Math.PI*2);ctx.fill();
      }
      break;}
    case T.MUSHROOM:{
      // Grass base
      const mgn=fbm(x*0.15+0.5,y*0.15+0.5,2);
      ctx.fillStyle=`rgb(${Math.floor(30+mgn*30)},${Math.floor(90+mgn*50)},${Math.floor(15+mgn*20)})`;ctx.fillRect(sx,sy,ST,ST);
      // Main mushroom
      ctx.fillStyle='#C4A070';ctx.fillRect(sx+19,sy+28,6,12); // thick stem
      ctx.fillStyle='#B09060';ctx.fillRect(sx+20,sy+29,4,10); // stem highlight
      ctx.fillStyle='#DD3030';ctx.beginPath();ctx.ellipse(sx+22,sy+26,10,7,0,Math.PI,0);ctx.fill(); // cap
      ctx.fillStyle='#EE4040';ctx.beginPath();ctx.ellipse(sx+22,sy+25,8,5,0,Math.PI,0);ctx.fill(); // cap highlight
      ctx.fillStyle='#FFEECC';ctx.fillRect(sx+18,sy+22,3,3);ctx.fillRect(sx+24,sy+20,2,2);ctx.fillRect(sx+21,sy+18,2,2); // spots
      // Small second mushroom
      ctx.fillStyle='#C4A070';ctx.fillRect(sx+10,sy+34,3,8);
      ctx.fillStyle='#CC8030';ctx.beginPath();ctx.ellipse(sx+11,sy+33,5,4,0,Math.PI,0);ctx.fill();
      ctx.fillStyle='#DD9040';ctx.beginPath();ctx.ellipse(sx+11,sy+32,4,3,0,Math.PI,0);ctx.fill();
      break;}
    case T.DIRT:{
      // Rich tilled soil with Perlin variation
      const dn=fbm(x*0.2+7,y*0.2+7,2);
      const dR=Math.floor(85+dn*25);const dG=Math.floor(60+dn*20);const dB=Math.floor(25+dn*15);
      ctx.fillStyle=`rgb(${dR},${dG},${dB})`;ctx.fillRect(sx,sy,ST,ST);
      // Furrow lines (tilled rows)
      ctx.fillStyle='rgba(50,35,15,0.18)';
      for(let i=0;i<4;i++){ctx.fillRect(sx,sy+6+i*10,ST,2);}
      // Occasional small rocks/clumps in dirt
      const dSeed=(x*19+y*23)%31;
      if(dSeed<3){ctx.fillStyle='rgba(100,80,50,0.3)';ctx.beginPath();ctx.arc(sx+12+dSeed*8,sy+20+dSeed*4,3,0,Math.PI*2);ctx.fill();}
      if(dSeed===10){ctx.fillStyle='rgba(60,45,20,0.25)';ctx.fillRect(sx+28,sy+14,5,3);}
      break;}
    case T.STONE:{
      // Smooth Perlin stone with embedded rock details
      const stn=fbm(x*0.15+20,y*0.15+20,2);
      const stR=Math.floor(70+stn*20);const stG=Math.floor(70+stn*18);const stB=Math.floor(78+stn*20);
      ctx.fillStyle=`rgb(${stR},${stG},${stB})`;ctx.fillRect(sx,sy,ST,ST);
      // Embedded rock shapes (not rectangles — rounded)
      ctx.fillStyle='rgba(50,50,58,0.35)';
      ctx.beginPath();ctx.ellipse(sx+12,sy+10,8,5,0.3,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.ellipse(sx+32,sy+28,10,6,0.5,0,Math.PI*2);ctx.fill();
      // Lighter mineral veins
      ctx.fillStyle='rgba(110,108,118,0.25)';
      ctx.beginPath();ctx.ellipse(sx+20,sy+20,6,4,0,0,Math.PI*2);ctx.fill();
      // Tiny cracks
      ctx.strokeStyle='rgba(40,40,48,0.2)';ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(sx+8,sy+18);ctx.lineTo(sx+20,sy+22);ctx.lineTo(sx+26,sy+18);ctx.stroke();
      break;}
    case T.CLIFF:{
      // Layered cliff face with depth
      const cln=fbm(x*0.12+15,y*0.12+15,2);
      ctx.fillStyle=`rgb(${Math.floor(50+cln*15)},${Math.floor(50+cln*12)},${Math.floor(58+cln*15)})`;ctx.fillRect(sx,sy,ST,ST);
      // Horizontal strata layers
      ctx.fillStyle='rgba(35,35,42,0.3)';ctx.fillRect(sx,sy+ST*0.2,ST,3);ctx.fillRect(sx,sy+ST*0.55,ST,3);ctx.fillRect(sx,sy+ST*0.8,ST,2);
      // Lighter top edge (catching light)
      ctx.fillStyle='rgba(90,88,100,0.3)';ctx.fillRect(sx,sy,ST,4);
      // Shadow at base
      ctx.fillStyle='rgba(20,20,28,0.2)';ctx.fillRect(sx,sy+ST-5,ST,5);
      break;}
    case T.WATER:{const wt=t*1.5+x*.5+y*.3;
      // Smooth Perlin-based water — no checkerboard
      const wn=fbm(x*0.12+t*0.08,y*0.12+t*0.05,2);
      const wR=Math.floor(25+wn*15);const wG=Math.floor(80+wn*30);const wB=Math.floor(140+wn*25);
      ctx.fillStyle=`rgb(${wR},${wG},${wB})`;ctx.fillRect(sx,sy,ST,ST);
      // Animated shimmer layer
      ctx.fillStyle=`rgba(100,180,240,${0.06+Math.sin(wt)*0.04})`;ctx.fillRect(sx,sy,ST,ST);
      // Gentle caustic light patterns
      const cx1=sx+ST*0.3+Math.sin(wt*0.7+x)*6,cy1=sy+ST*0.4+Math.cos(wt*0.9+y)*5;
      const cx2=sx+ST*0.7+Math.sin(wt*0.5+x+2)*5,cy2=sy+ST*0.6+Math.cos(wt*0.8+y+1)*6;
      ctx.fillStyle=`rgba(150,210,255,${0.06+Math.sin(wt*1.3)*0.03})`;
      ctx.beginPath();ctx.arc(cx1,cy1,6+Math.sin(wt)*2,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.arc(cx2,cy2,5+Math.cos(wt+1)*2,0,Math.PI*2);ctx.fill();
      // Soft wave highlights
      ctx.strokeStyle=`rgba(160,210,255,${0.08+Math.sin(wt+1)*0.04})`;ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(sx,sy+ST*0.35+Math.sin(wt)*3);ctx.quadraticCurveTo(sx+ST/2,sy+ST*0.3+Math.sin(wt+1)*4,sx+ST,sy+ST*0.35+Math.sin(wt+2)*3);ctx.stroke();
      // Shoreline foam where water meets land
      const wN=getTile(x,y-1),wS=getTile(x,y+1),wW=getTile(x-1,y),wE=getTile(x+1,y);
      const foamA=0.3+Math.sin(wt*2)*0.12;
      if(!TERRAIN_WATER_SET.has(wN)){
        ctx.fillStyle=`rgba(220,240,255,${foamA})`;ctx.fillRect(sx,sy,ST,5+Math.sin(wt)*2);
        ctx.fillStyle=`rgba(255,255,255,${foamA*0.5})`;ctx.fillRect(sx+4,sy,ST-8,2+Math.sin(wt)*1);
      }
      if(!TERRAIN_WATER_SET.has(wS)){
        ctx.fillStyle=`rgba(220,240,255,${foamA})`;ctx.fillRect(sx,sy+ST-5-Math.sin(wt)*2,ST,5+Math.sin(wt)*2);
        ctx.fillStyle=`rgba(255,255,255,${foamA*0.5})`;ctx.fillRect(sx+4,sy+ST-2-Math.sin(wt)*1,ST-8,2);
      }
      if(!TERRAIN_WATER_SET.has(wW)){
        ctx.fillStyle=`rgba(220,240,255,${foamA})`;ctx.fillRect(sx,sy,5+Math.sin(wt+1)*2,ST);
        ctx.fillStyle=`rgba(255,255,255,${foamA*0.5})`;ctx.fillRect(sx,sy+4,2+Math.sin(wt+1)*1,ST-8);
      }
      if(!TERRAIN_WATER_SET.has(wE)){
        ctx.fillStyle=`rgba(220,240,255,${foamA})`;ctx.fillRect(sx+ST-5-Math.sin(wt+1)*2,sy,5+Math.sin(wt+1)*2,ST);
        ctx.fillStyle=`rgba(255,255,255,${foamA*0.5})`;ctx.fillRect(sx+ST-2-Math.sin(wt+1)*1,sy+4,2,ST-8);
      }
      break;}
    case T.DEEP:{
      // Deep water — darker Perlin, subtle undercurrent
      const dwn=fbm(x*0.1+t*0.05,y*0.1+t*0.03,2);
      ctx.fillStyle=`rgb(${Math.floor(12+dwn*15)},${Math.floor(40+dwn*20)},${Math.floor(80+dwn*20)})`;ctx.fillRect(sx,sy,ST,ST);
      ctx.fillStyle=`rgba(20,60,120,${0.1+Math.sin(t*0.8+x+y)*0.06})`;ctx.fillRect(sx,sy,ST,ST);
      break;}
    case T.SAND:{
      const sn=fbm(x*0.18+3,y*0.18+3,2);
      const sR=Math.floor(180+sn*20);const sG=Math.floor(155+sn*20);const sB=Math.floor(95+sn*15);
      ctx.fillStyle=`rgb(${sR},${sG},${sB})`;ctx.fillRect(sx,sy,ST,ST);
      // Subtle sand ripples
      if((x*13+y*7)%11<3){ctx.fillStyle='rgba(210,190,140,0.15)';ctx.fillRect(sx+4,sy+12,ST-8,2);ctx.fillRect(sx+8,sy+28,ST-16,2);}
      break;}
    case T.PATH:{
      // Smooth dirt path with subtle noise variation
      const pn=fbm(x*0.2+5,y*0.2+5,2);
      const pR=Math.floor(130+pn*20);const pG=Math.floor(115+pn*15);const pB=Math.floor(90+pn*15);
      ctx.fillStyle=`rgb(${pR},${pG},${pB})`;ctx.fillRect(sx,sy,ST,ST);
      // Subtle pebble/texture details
      const pSeed=(x*23+y*11)%29;
      if(pSeed<5){ctx.fillStyle=`rgba(100,85,65,0.3)`;ctx.fillRect(sx+8+pSeed*5,sy+10+pSeed*4,6,4);}
      if(pSeed>22){ctx.fillStyle=`rgba(170,150,120,0.25)`;ctx.fillRect(sx+12+pSeed%5*6,sy+20,8,5);}
      // Worn center line (paths get lighter in the middle from foot traffic)
      ctx.fillStyle='rgba(180,165,140,0.12)';ctx.fillRect(sx+ST/4,sy,ST/2,ST);
      // Path edge blending — grassy edges where path meets grass
      const ptN=getTile(x,y-1),ptS=getTile(x,y+1),ptW=getTile(x-1,y),ptE=getTile(x+1,y);
      if(TERRAIN_GRASS.has(ptN)){ctx.fillStyle='rgba(50,100,30,0.2)';ctx.fillRect(sx+2,sy,ST-4,4);
        ctx.fillStyle='rgba(60,120,35,0.15)';for(let i=0;i<4;i++)ctx.fillRect(sx+4+i*10,sy,2,6+((x+i)%3)*2);}
      if(TERRAIN_GRASS.has(ptS)){ctx.fillStyle='rgba(50,100,30,0.2)';ctx.fillRect(sx+2,sy+ST-4,ST-4,4);
        ctx.fillStyle='rgba(60,120,35,0.15)';for(let i=0;i<4;i++)ctx.fillRect(sx+6+i*10,sy+ST-6-((x+i)%3)*2,2,6);}
      if(TERRAIN_GRASS.has(ptW)){ctx.fillStyle='rgba(50,100,30,0.2)';ctx.fillRect(sx,sy+2,4,ST-4);
        ctx.fillStyle='rgba(60,120,35,0.15)';for(let i=0;i<3;i++)ctx.fillRect(sx,sy+6+i*12,6+((y+i)%3)*2,2);}
      if(TERRAIN_GRASS.has(ptE)){ctx.fillStyle='rgba(50,100,30,0.2)';ctx.fillRect(sx+ST-4,sy+2,4,ST-4);
        ctx.fillStyle='rgba(60,120,35,0.15)';for(let i=0;i<3;i++)ctx.fillRect(sx+ST-6-((y+i)%3)*2,sy+8+i*12,6,2);}
      break;}
    case T.WALL:{
      // Detailed log cabin walls
      ctx.fillStyle=C.woodWall;ctx.fillRect(sx,sy,ST,ST);
      // Horizontal log lines
      ctx.fillStyle=C.woodDark;
      for(let i=0;i<4;i++) ctx.fillRect(sx+1,sy+i*12+5,ST-2,2);
      // Wood grain
      ctx.fillStyle='rgba(90,56,24,0.3)';
      ctx.fillRect(sx+8,sy+2,3,ST-4);ctx.fillRect(sx+28,sy+2,3,ST-4);
      // Corner beam
      ctx.fillStyle='#4A2808';ctx.fillRect(sx,sy,4,ST);ctx.fillRect(sx+ST-4,sy,4,ST);
      // Nail details
      ctx.fillStyle='#888';ctx.fillRect(sx+6,sy+8,2,2);ctx.fillRect(sx+6,sy+32,2,2);
      break;}
    case T.FLOOR:{
      // Detailed wooden floorboards
      ctx.fillStyle=C.woodFloor;ctx.fillRect(sx,sy,ST,ST);
      // Plank lines
      ctx.fillStyle='#8A6838';
      ctx.fillRect(sx,sy+15,ST,1);ctx.fillRect(sx,sy+31,ST,1);
      // Plank variation
      ctx.fillStyle='rgba(160,120,80,0.3)';
      ctx.fillRect(sx+2,sy+2,20,12);ctx.fillRect(sx+24,sy+18,20,12);
      // Knots
      ctx.fillStyle='#7A5828';
      ctx.beginPath();ctx.arc(sx+12,sy+8,3,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.arc(sx+36,sy+24,2,0,Math.PI*2);ctx.fill();
      break;}
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
  // Roofs have tall facades — use building height for culling
  if(d.type==='roof'){
    const facadeBottom = sy + (d.bh+2)*ST;
    if(sx>canvas.width+ST*2||facadeBottom<-ST||sx+d.w*ST<-ST*2||sy>canvas.height+ST*2)return;
  } else {
    if(sx>canvas.width+ST*2||sy>canvas.height+ST*2||sx<-ST*2||sy<-ST*2)return;
  }
  const t = performance.now()/1000;
  
  if(d.type==='tree'){
    const sz = d.size || 1;
    const sway = Math.sin(t*.8+d.x+d.y)*1.5;
    const tcx=sx+ST/2, tcy=sy;
    // Ground shadow (larger, softer)
    ctx.fillStyle='rgba(0,0,0,0.12)';ctx.beginPath();ctx.ellipse(tcx+4,sy+ST+6,22*sz,8*sz,0.1,0,Math.PI*2);ctx.fill();
    // Trunk — tapered, with bark detail
    ctx.fillStyle=C.treeTrunk[d.v%3];
    const tw=7*sz,tbw=10*sz;
    ctx.beginPath();ctx.moveTo(tcx-tw/2,tcy+ST*0.2);ctx.lineTo(tcx-tbw/2,sy+ST);ctx.lineTo(tcx+tbw/2,sy+ST);ctx.lineTo(tcx+tw/2,tcy+ST*0.2);ctx.closePath();ctx.fill();
    // Bark lines
    ctx.fillStyle='rgba(0,0,0,0.15)';ctx.fillRect(tcx-2,tcy+ST*0.3,1,ST*0.5);ctx.fillRect(tcx+2,tcy+ST*0.4,1,ST*0.4);
    // Root bumps at base
    ctx.fillStyle=C.treeTrunk[d.v%3];
    ctx.beginPath();ctx.ellipse(tcx-tbw/2-2,sy+ST,5*sz,3*sz,0,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.ellipse(tcx+tbw/2+2,sy+ST,4*sz,3*sz,0,0,Math.PI*2);ctx.fill();
    // Canopy — multiple overlapping layers for depth, not single circles
    // Back layer (darkest, largest)
    ctx.fillStyle=C.treeLeaf[d.v%5];
    ctx.beginPath();ctx.ellipse(tcx+sway*0.5,tcy-2*sz,26*sz,20*sz,0,0,Math.PI*2);ctx.fill();
    // Mid layer clusters
    ctx.fillStyle=C.treeLeaf[(d.v+1)%5];
    ctx.beginPath();ctx.ellipse(tcx-10*sz+sway,tcy+4*sz,16*sz,14*sz,0,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.ellipse(tcx+10*sz+sway*0.8,tcy+2*sz,15*sz,13*sz,0,0,Math.PI*2);ctx.fill();
    // Front highlight layer (lightest, smaller)
    ctx.fillStyle=C.treeLeafLight[d.v%3];
    ctx.beginPath();ctx.ellipse(tcx+4*sz+sway*1.5,tcy-8*sz,12*sz,10*sz,0,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.ellipse(tcx-6*sz+sway,tcy+1*sz,10*sz,8*sz,0,0,Math.PI*2);ctx.fill();
    // Dappled light spots on canopy
    ctx.fillStyle='rgba(120,200,80,0.15)';
    ctx.beginPath();ctx.arc(tcx-5*sz+sway,tcy-4*sz,5*sz,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(tcx+8*sz+sway,tcy+3*sz,4*sz,0,Math.PI*2);ctx.fill();
    // Leaf shadow on ground beneath tree
    ctx.fillStyle='rgba(0,40,0,0.08)';ctx.beginPath();ctx.ellipse(tcx+2,sy+ST+2,20*sz,7*sz,0,0,Math.PI*2);ctx.fill();
  }
  else if(d.type==='bush'){
    // More organic bush — overlapping leaf clusters
    ctx.fillStyle='rgba(0,0,0,0.1)';ctx.beginPath();ctx.ellipse(sx+ST/2+2,sy+ST/2+8,14,6,0,0,Math.PI*2);ctx.fill(); // shadow
    ctx.fillStyle='#1E4A14';ctx.beginPath();ctx.ellipse(sx+ST/2,sy+ST/2+4,14,12,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#2A5A1A';ctx.beginPath();ctx.ellipse(sx+ST/2-4,sy+ST/2+2,10,9,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#3A7028';ctx.beginPath();ctx.ellipse(sx+ST/2+5,sy+ST/2-1,9,8,0,0,Math.PI*2);ctx.fill();
    // Highlight
    ctx.fillStyle='rgba(80,160,50,0.2)';ctx.beginPath();ctx.arc(sx+ST/2+2,sy+ST/2-2,5,0,Math.PI*2);ctx.fill();
  }
  else if(d.type==='rock'){
    // Shadow
    ctx.fillStyle='rgba(0,0,0,0.12)';ctx.beginPath();ctx.ellipse(sx+ST/2+3,sy+ST/2+10,16,7,0.1,0,Math.PI*2);ctx.fill();
    // Main rock body
    ctx.fillStyle=C.stone[d.v];
    ctx.beginPath();ctx.ellipse(sx+ST/2,sy+ST/2+4,16,12,0,0,Math.PI*2);ctx.fill();
    // Lighter top face
    ctx.fillStyle=C.stone[(d.v+1)%3];
    ctx.beginPath();ctx.ellipse(sx+ST/2-1,sy+ST/2+1,13,9,0,0,Math.PI*2);ctx.fill();
    // Highlight (top-left, catching light)
    ctx.fillStyle='rgba(180,178,188,0.25)';
    ctx.beginPath();ctx.ellipse(sx+ST/2-4,sy+ST/2-2,7,5,0,0,Math.PI*2);ctx.fill();
    // Crack detail
    ctx.strokeStyle='rgba(40,40,48,0.2)';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(sx+ST/2-5,sy+ST/2+2);ctx.lineTo(sx+ST/2+3,sy+ST/2+5);ctx.stroke();
    // Moss (on some rocks)
    if(d.v===0){ctx.fillStyle='rgba(60,120,40,0.25)';ctx.beginPath();ctx.ellipse(sx+ST/2+6,sy+ST/2+6,5,3,0,0,Math.PI*2);ctx.fill();}
  }
  else if(d.type==='sign'){
    ctx.fillStyle='#6A4A2A';ctx.fillRect(sx+ST/2-2,sy+ST/2,4,ST/2);
    ctx.fillStyle='#8A6A40';ctx.fillRect(sx+ST/2-16,sy+ST/2-8,32,16);
    ctx.fillStyle=C.white;ctx.font=`bold 10px ${FONT}`;ctx.textAlign='center';
    ctx.fillText(d.text,sx+ST/2,sy+ST/2+2);
  }
  else if(d.type==='furniture'){
    const fx=sx,fy=sy;
    if(d.item==='shelf'){
      ctx.fillStyle='#7A5A30';ctx.fillRect(fx+4,fy+8,ST-8,6);ctx.fillRect(fx+4,fy+24,ST-8,6);
      ctx.fillRect(fx+6,fy+8,4,22);ctx.fillRect(fx+ST-10,fy+8,4,22);
      ctx.fillStyle='#CC4444';ctx.fillRect(fx+12,fy+4,6,4);
      ctx.fillStyle='#4488CC';ctx.fillRect(fx+22,fy+4,5,4);
      ctx.fillStyle='#CCAA44';ctx.fillRect(fx+14,fy+20,4,4);
      ctx.fillStyle='#44CC44';ctx.fillRect(fx+24,fy+19,5,5);
    }
    else if(d.item==='counter'){
      ctx.fillStyle='#8A6A40';ctx.fillRect(fx+2,fy+12,ST-4,16);
      ctx.fillStyle='#A08050';ctx.fillRect(fx+2,fy+10,ST-4,4);
      ctx.fillStyle='#333';ctx.fillRect(fx+14,fy+6,14,6);
      ctx.fillStyle='#0A0';ctx.fillRect(fx+16,fy+7,10,3);
    }
    else if(d.item==='barrel'){
      ctx.fillStyle='#6A4A20';ctx.beginPath();ctx.ellipse(fx+ST/2,fy+ST/2+4,14,16,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#8A6A40';ctx.fillRect(fx+ST/2-12,fy+12,24,4);ctx.fillRect(fx+ST/2-12,fy+24,24,4);
      ctx.fillStyle='#5A3A10';ctx.fillRect(fx+ST/2-1,fy+8,2,24);
    }
    else if(d.item==='table'){
      ctx.fillStyle='#9A7A50';ctx.fillRect(fx+4,fy+14,ST-8,14);
      ctx.fillStyle='#7A5A30';ctx.fillRect(fx+6,fy+28,6,12);ctx.fillRect(fx+ST-12,fy+28,6,12);
      ctx.fillStyle='#B08040';ctx.fillRect(fx+12,fy+10,8,6);ctx.fillStyle='#DDD';ctx.fillRect(fx+28,fy+11,6,5);
    }
    else if(d.item==='desk'){
      ctx.fillStyle='#6A5030';ctx.fillRect(fx+2,fy+16,ST-4,12);
      ctx.fillStyle='#8A7050';ctx.fillRect(fx+2,fy+14,ST-4,4);
      ctx.fillStyle='#EEE';ctx.fillRect(fx+8,fy+10,10,6);
      ctx.fillStyle='#DDD';ctx.fillRect(fx+22,fy+11,8,5);
    }
    else if(d.item==='bookshelf'){
      ctx.fillStyle='#5A3A18';ctx.fillRect(fx+4,fy+4,ST-8,ST-8);
      ctx.fillStyle='#7A5A30';ctx.fillRect(fx+6,fy+8,ST-12,4);ctx.fillRect(fx+6,fy+18,ST-12,4);ctx.fillRect(fx+6,fy+28,ST-12,4);
      const bc=['#CC3333','#3366CC','#33AA33','#CC9933','#9933CC','#CC6633'];
      for(let b=0;b<4;b++){ctx.fillStyle=bc[b];ctx.fillRect(fx+8+b*6,fy+4,4,4);}
      for(let b=0;b<3;b++){ctx.fillStyle=bc[b+2];ctx.fillRect(fx+10+b*7,fy+14,5,4);}
    }
    else if(d.item==='chair'){
      ctx.fillStyle='#7A5A30';ctx.fillRect(fx+12,fy+20,ST-24,12);ctx.fillRect(fx+12,fy+14,ST-24,8);ctx.fillRect(fx+14,fy+6,ST-28,10);
    }
    else if(d.item==='workbench'){
      ctx.fillStyle='#6A5030';ctx.fillRect(fx+2,fy+16,ST-4,12);
      ctx.fillStyle='#888';ctx.fillRect(fx+6,fy+12,10,6);
      ctx.fillStyle='#AAA';ctx.fillRect(fx+22,fy+13,8,4);
    }
    else if(d.item==='crate'){
      ctx.fillStyle='#8A6A30';ctx.fillRect(fx+8,fy+10,ST-16,ST-14);
      ctx.fillStyle='#6A4A20';ctx.fillRect(fx+10,fy+16,ST-20,2);ctx.fillRect(fx+ST/2-1,fy+10,2,ST-14);
    }
    else if(d.item==='bed'){
      ctx.fillStyle='#5A3A18';ctx.fillRect(fx+4,fy+8,ST-8,ST-10); // frame
      ctx.fillStyle='#8888CC';ctx.fillRect(fx+6,fy+10,ST-12,ST-16); // blanket
      ctx.fillStyle='#CCCCEE';ctx.fillRect(fx+6,fy+6,ST-12,8); // pillow
    }
    else if(d.item==='fireplace'){
      ctx.fillStyle='#555';ctx.fillRect(fx+6,fy+4,ST-12,ST-6); // stone surround
      ctx.fillStyle='#333';ctx.fillRect(fx+10,fy+10,ST-20,ST-14); // opening
      const ft=performance.now()/200;
      ctx.fillStyle='#FF6622';ctx.fillRect(fx+14,fy+16+Math.sin(ft)*2,4,8);
      ctx.fillStyle='#FFAA22';ctx.fillRect(fx+20,fy+18+Math.sin(ft+1)*2,4,6);
      ctx.fillStyle='#FF4400';ctx.fillRect(fx+17,fy+14+Math.sin(ft+2)*3,3,10);
      ctx.fillStyle='rgba(255,150,50,0.08)';ctx.beginPath();ctx.arc(fx+ST/2,fy+ST/2,40,0,Math.PI*2);ctx.fill();
    }
    else if(d.item==='bench'){
      ctx.fillStyle='#7A5A30';ctx.fillRect(fx+4,fy+20,ST-8,8);
      ctx.fillStyle='#6A4A20';ctx.fillRect(fx+6,fy+28,6,10);ctx.fillRect(fx+ST-12,fy+28,6,10);
      ctx.fillStyle='#8A6A40';ctx.fillRect(fx+4,fy+14,ST-8,8);
    }
    else if(d.item==='market_stall'){
      ctx.fillStyle='#7A5A30';ctx.fillRect(fx+4,fy+20,ST-8,14);
      ctx.fillStyle='#6A4A20';ctx.fillRect(fx+6,fy+34,4,8);ctx.fillRect(fx+ST-10,fy+34,4,8);
      const canopyCol=['#CC4444','#CC8844','#44AA44','#4488CC'][(d.x+d.y)%4];
      ctx.fillStyle=canopyCol;ctx.fillRect(fx+2,fy+12,ST-4,10);
      ctx.fillStyle='#44AA44';ctx.fillRect(fx+8,fy+16,6,4);
      ctx.fillStyle='#CC8844';ctx.fillRect(fx+18,fy+16,6,4);
      ctx.fillStyle='#CCCC44';ctx.fillRect(fx+28,fy+17,5,3);
    }
  }
  else if(d.type==='roof'){
    // PATH 2 TOOLS for custom pixel art buildings:
    // - Aseprite (best pixel art editor, used by Stardew Valley dev)
    // - Piskel (free, browser-based pixel art editor at piskelapp.com)
    // - Libresprite (free Aseprite fork)
    // - Tiled (free tilemap editor for laying out sprite sheets)
    // - Lospec (lospec.com — palettes, tutorials, community)
    // To use custom PNGs: create 16x16 or 32x32 sprites, load with new Image(),
    // then draw with ctx.drawImage() instead of fillRect in this section.

    // Full building exterior (covers interior when viewed from overworld)
    if (interior) return; // don't draw roofs when inside a building
    const rw = d.w * ST, bh = (d.bh || 4) * ST;
    const rx = sx, ry = sy;
    if(sx+rw<-ST||sx>canvas.width+ST||ry>canvas.height+ST||ry+bh+ST<0)return;

    // Shared helpers
    const hr = getHour();
    const isNight = hr < 6 || hr > 20;
    const winGlow = isNight ? 'rgba(255,210,100,0.45)' : 'rgba(200,225,255,0.28)';
    const winGlowAmber = isNight ? 'rgba(255,180,60,0.55)' : 'rgba(220,185,100,0.3)';
    // Ground shadow under building
    ctx.fillStyle='rgba(0,0,0,0.18)';
    ctx.beginPath();ctx.ellipse(rx+rw/2,ry+bh+4,rw*0.48,6,0,0,Math.PI*2);ctx.fill();

    // ── HOME ──────────────────────────────────────────────────────────────
    if(d.label==='home'){
      // Foundation — dark stone strip
      ctx.fillStyle='#4A3A28';ctx.fillRect(rx-2,ry+bh-8,rw+4,8);
      ctx.fillStyle='#5A4A34';
      for(let i=0;i<Math.floor(rw/12);i++){ctx.fillRect(rx+i*12,ry+bh-8,10,3);}

      // Log walls — warm brown base
      ctx.fillStyle='#7A5030';ctx.fillRect(rx,ry+ST,rw,bh-ST-8);
      // Horizontal log grain lines
      ctx.fillStyle='rgba(0,0,0,0.12)';
      for(let i=0;i<Math.floor((bh-ST)/8);i++){ctx.fillRect(rx,ry+ST+i*8+6,rw,2);}
      // Subtle lighter highlight on each log
      ctx.fillStyle='rgba(255,200,130,0.07)';
      for(let i=0;i<Math.floor((bh-ST)/8);i++){ctx.fillRect(rx,ry+ST+i*8,rw,3);}
      // Knot details
      ctx.fillStyle='rgba(0,0,0,0.18)';
      ctx.beginPath();ctx.ellipse(rx+rw*0.25,ry+ST+bh*0.35,4,3,0,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.ellipse(rx+rw*0.72,ry+ST+bh*0.55,3,2,0,0,Math.PI*2);ctx.fill();
      // Corner beams
      ctx.fillStyle='#5A3818';ctx.fillRect(rx,ry+ST,5,bh-ST-8);ctx.fillRect(rx+rw-5,ry+ST,5,bh-ST-8);

      // Stone chimney — right side
      const chx=rx+rw-18,chy=ry-ST*0.6;
      ctx.fillStyle='#5A5050';ctx.fillRect(chx,chy,14,ST*0.6+ST+4);
      ctx.fillStyle='#4A4040';
      for(let i=0;i<6;i++){
        ctx.fillRect(chx+(i%2===0?0:2),chy+i*8,12,6);
        ctx.fillStyle='rgba(0,0,0,0.15)';ctx.fillRect(chx,chy+i*8+6,14,2);ctx.fillStyle='#4A4040';
      }
      ctx.fillStyle='#3A3030';ctx.fillRect(chx-2,chy-4,18,5); // cap
      // Chimney smoke (animated)
      const sa=0.25+Math.sin(t*1.8)*0.1;
      ctx.fillStyle=`rgba(190,190,190,${sa})`;
      ctx.beginPath();ctx.arc(chx+7+Math.sin(t)*3,chy-12-Math.sin(t*1.3)*5,4+Math.sin(t*2)*1.5,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=`rgba(200,200,200,${sa*0.7})`;
      ctx.beginPath();ctx.arc(chx+6+Math.sin(t+1)*4,chy-22-Math.sin(t*1.1)*7,3+Math.sin(t*2.5)*1,0,Math.PI*2);ctx.fill();

      // Left window with flower box
      const ww=ST-4,wh=ST-10;
      const wx1=rx+ST*0.6;const wy=ry+ST+10;
      ctx.fillStyle='#5A3818';ctx.fillRect(wx1-3,wy-3,ww+6,wh+6);
      ctx.fillStyle=winGlow;ctx.fillRect(wx1,wy,ww,wh);
      ctx.fillStyle='rgba(255,255,255,0.12)';ctx.fillRect(wx1,wy,ww/2,wh); // glare
      ctx.fillStyle='#5A3818';ctx.fillRect(wx1+ww/2-1,wy,2,wh);ctx.fillRect(wx1,wy+wh/2-1,ww,2); // cross
      // Flower box left
      ctx.fillStyle='#6A4020';ctx.fillRect(wx1-3,wy+wh+3,ww+6,7);
      ctx.fillStyle='#3A6020';ctx.fillRect(wx1,wy+wh+4,ww,4); // soil
      // Flowers: red & yellow pixels
      const flx=[wx1+3,wx1+8,wx1+14,wx1+20,wx1+26];
      const flc=['#E04040','#F0C020','#E04040','#F0C020','#E04040'];
      for(let i=0;i<flx.length;i++){ctx.fillStyle=flc[i];ctx.fillRect(flx[i],wy+wh+3,3,4);}

      // Right window with flower box (only if wide enough)
      if(d.w>=6){
        const wx2=rx+rw-ST*0.6-ww;
        ctx.fillStyle='#5A3818';ctx.fillRect(wx2-3,wy-3,ww+6,wh+6);
        ctx.fillStyle=winGlow;ctx.fillRect(wx2,wy,ww,wh);
        ctx.fillStyle='rgba(255,255,255,0.12)';ctx.fillRect(wx2,wy,ww/2,wh);
        ctx.fillStyle='#5A3818';ctx.fillRect(wx2+ww/2-1,wy,2,wh);ctx.fillRect(wx2,wy+wh/2-1,ww,2);
        ctx.fillStyle='#6A4020';ctx.fillRect(wx2-3,wy+wh+3,ww+6,7);
        ctx.fillStyle='#3A6020';ctx.fillRect(wx2,wy+wh+4,ww,4);
        for(let i=0;i<flx.length;i++){ctx.fillStyle=flc[i];ctx.fillRect(wx2+3+i*5-wx1+wx1%5,wy+wh+3,3,4);}
      }

      // Door — warm wood, ₿ carved
      const doorW=ST-2,doorH=ST+10;
      const doorX=rx+Math.floor(rw/2)-doorW/2;const doorY=ry+bh-doorH;
      ctx.fillStyle='#3A2010';ctx.fillRect(doorX-3,doorY,doorW+6,doorH+1);
      ctx.fillStyle='#7A5030';ctx.fillRect(doorX,doorY+2,doorW,doorH-2);
      // Door panels
      ctx.fillStyle='rgba(0,0,0,0.15)';ctx.fillRect(doorX+4,doorY+6,doorW-8,doorH/2-8);
      ctx.fillRect(doorX+4,doorY+doorH/2+2,doorW-8,doorH/2-10);
      // ₿ symbol carved
      ctx.fillStyle='#5A3818';ctx.font='bold 10px '+FONT;ctx.textAlign='center';
      ctx.fillText('₿',doorX+doorW/2,doorY+doorH/2+4);
      // Handle
      ctx.fillStyle='#C09040';ctx.fillRect(doorX+doorW-9,doorY+doorH/2-2,4,8);
      // Porch step
      ctx.fillStyle='#5A4A30';ctx.fillRect(doorX-6,ry+bh-4,doorW+12,6);
      // Welcome mat
      ctx.fillStyle='#8A5A30';ctx.fillRect(doorX-4,ry+bh+1,doorW+8,5);
      ctx.fillStyle='rgba(255,180,80,0.3)';
      for(let i=0;i<3;i++){ctx.fillRect(doorX-2+i*8,ry+bh+2,6,3);}

      // Lantern — left of door
      const lx=doorX-14,ly=doorY+doorH/2-4;
      ctx.fillStyle='#5A4020';ctx.fillRect(lx,ly,4,16); // post
      ctx.fillStyle='#6A5030';ctx.fillRect(lx-3,ly-8,10,9); // lantern body
      ctx.fillStyle='rgba(255,200,80,0.7)';ctx.fillRect(lx-1,ly-6,6,5); // flame
      if(isNight){
        ctx.fillStyle='rgba(255,200,80,0.15)';
        ctx.beginPath();ctx.arc(lx+2,ly-3,12,0,Math.PI*2);ctx.fill();
      }

      // Pitched roof — shingle texture
      ctx.fillStyle='#8A3820';ctx.fillRect(rx-8,ry-6,rw+16,ST+10);
      // Shingle rows — alternating slightly different shades
      for(let row=0;row<4;row++){
        ctx.fillStyle=row%2===0?'#9A4028':'#7A3018';
        const rowY=ry-6+row*(ST+10)/4;
        for(let col=0;col<Math.ceil((rw+16)/12);col++){
          ctx.fillRect(rx-8+col*12+(row%2)*6,rowY,11,Math.floor((ST+10)/4)-1);
        }
      }
      // Roof ridge
      ctx.fillStyle='#5A2010';ctx.fillRect(rx-8,ry-8,rw+16,4);
      // Eaves shadow
      ctx.fillStyle='rgba(0,0,0,0.22)';ctx.fillRect(rx-10,ry+ST+3,rw+20,5);
      // Slight overhang shadow on walls
      ctx.fillStyle='rgba(0,0,0,0.1)';ctx.fillRect(rx,ry+ST+8,rw,8);
    }

    // ── SHOP (Ruby's Hardware) ────────────────────────────────────────────
    else if(d.label==='shop'){
      // Foundation
      ctx.fillStyle='#3A2A18';ctx.fillRect(rx-2,ry+bh-8,rw+4,8);

      // Darker wood walls with metal reinforcement
      ctx.fillStyle='#5A3A18';ctx.fillRect(rx,ry+ST,rw,bh-ST-8);
      // Horizontal plank lines
      ctx.fillStyle='rgba(0,0,0,0.13)';
      for(let i=0;i<Math.floor((bh-ST)/10);i++){ctx.fillRect(rx,ry+ST+i*10+8,rw,2);}
      // Metal corner brackets (grey squares)
      ctx.fillStyle='#888880';
      ctx.fillRect(rx,ry+ST,6,6);ctx.fillRect(rx+rw-6,ry+ST,6,6);
      ctx.fillRect(rx,ry+bh-ST,6,6);ctx.fillRect(rx+rw-6,ry+bh-ST,6,6);
      // Metal strip reinforcements
      ctx.fillStyle='#707068';ctx.fillRect(rx,ry+ST+bh*0.4-ST,rw,3);

      // Large display window LEFT — with awning
      const dwinW=ST+8,dwinH=ST-6;
      const dwinX=rx+8,dwinY=ry+ST+14;
      // Awning — orange striped
      ctx.fillStyle='#C06010';ctx.fillRect(dwinX-4,dwinY-12,dwinW+8,10);
      for(let i=0;i<Math.ceil((dwinW+8)/8);i++){
        ctx.fillStyle=i%2===0?'#E07818':'#A05010';
        ctx.fillRect(dwinX-4+i*8,dwinY-12,8,10);
      }
      ctx.fillStyle='#8A4010';ctx.fillRect(dwinX-4,dwinY-2,dwinW+8,2);
      // Window frame
      ctx.fillStyle='#8A6030';ctx.fillRect(dwinX-3,dwinY-3,dwinW+6,dwinH+6);
      ctx.fillStyle='rgba(180,210,255,0.25)';ctx.fillRect(dwinX,dwinY,dwinW,dwinH);
      // Display items inside window (colored squares representing stock)
      const itemColors=['#E04040','#40A040','#4080E0','#E0A020','#A040A0'];
      for(let i=0;i<5;i++){
        ctx.fillStyle=itemColors[i];
        ctx.fillRect(dwinX+4+i*(dwinW-8)/5,dwinY+dwinH-14,Math.floor((dwinW-10)/5),8);
      }
      ctx.fillStyle='rgba(255,255,255,0.12)';ctx.fillRect(dwinX,dwinY,dwinW/2,dwinH);

      // Hanging sign on chain — '₿ RUBY'S'
      const sigW=52,sigH=14;const sigX=rx+rw/2-sigW/2,sigY=ry+4;
      ctx.fillStyle='#555540';ctx.fillRect(sigX+sigW*0.25,sigY-8,2,8);ctx.fillRect(sigX+sigW*0.72,sigY-8,2,8);
      ctx.fillStyle='#3A2A10';ctx.fillRect(sigX,sigY,sigW,sigH);
      ctx.fillStyle='#C06010';ctx.font='bold 8px '+FONT;ctx.textAlign='center';
      ctx.fillText("₿ RUBY'S",sigX+sigW/2,sigY+10);

      // Orange-trimmed door — RIGHT side
      const doorW2=ST,doorH2=ST+10;
      const doorX2=rx+rw-ST-10;const doorY2=ry+bh-doorH2;
      ctx.fillStyle='#C06010';ctx.fillRect(doorX2-4,doorY2,doorW2+8,doorH2+1); // orange trim
      ctx.fillStyle='#5A3010';ctx.fillRect(doorX2,doorY2+2,doorW2,doorH2-2);
      ctx.fillStyle='rgba(0,0,0,0.1)';ctx.fillRect(doorX2+4,doorY2+5,doorW2-8,doorH2/2-6);
      // 'OPEN' sign on door
      ctx.fillStyle='#60C040';ctx.fillRect(doorX2+3,doorY2+8,doorW2-6,9);
      ctx.fillStyle='#1A3010';ctx.font='bold 6px '+FONT;ctx.textAlign='center';
      ctx.fillText('OPEN',doorX2+doorW2/2,doorY2+16);
      // Handle
      ctx.fillStyle='#C09040';ctx.fillRect(doorX2+6,doorY2+doorH2/2-2,4,8);
      // Door mat
      ctx.fillStyle='#8A5020';ctx.fillRect(doorX2-4,ry+bh+1,doorW2+8,5);

      // Pickaxe decoration left of door
      const pax=doorX2-22,pay=ry+bh-24;
      ctx.fillStyle='#887870';ctx.fillRect(pax,pay,4,16); // handle
      ctx.fillStyle='#A09088';ctx.fillRect(pax-4,pay,12,4); // head
      ctx.fillStyle='#7A6858';ctx.fillRect(pax-4,pay,4,4); // tip

      // Copper/orange-brown roof
      ctx.fillStyle='#8A5020';ctx.fillRect(rx-8,ry-6,rw+16,ST+10);
      for(let row=0;row<3;row++){
        ctx.fillStyle=row%2===0?'#A06028':'#784018';
        ctx.fillRect(rx-8,ry-6+row*(ST+10)/3,rw+16,Math.floor((ST+10)/3)-1);
      }
      ctx.fillStyle='#603010';ctx.fillRect(rx-8,ry-8,rw+16,4);
      // Vent pipe on roof
      const vpx=rx+rw*0.3;
      ctx.fillStyle='#606060';ctx.fillRect(vpx,ry-16,8,14);
      ctx.fillStyle='#404040';ctx.fillRect(vpx-2,ry-18,12,4);
      // Eaves
      ctx.fillStyle='rgba(0,0,0,0.22)';ctx.fillRect(rx-10,ry+ST+3,rw+20,5);
    }

    // ── TAVERN (The Hodl Tavern) ──────────────────────────────────────────
    else if(d.label==='tavern'){
      // Foundation
      ctx.fillStyle='#3A2810';ctx.fillRect(rx-2,ry+bh-8,rw+4,8);

      // Dark mahogany walls
      ctx.fillStyle='#4A2810';ctx.fillRect(rx,ry+ST,rw,bh-ST-8);
      // Thick timber frame beams — vertical
      ctx.fillStyle='#2A1808';
      ctx.fillRect(rx,ry+ST,7,bh-ST-8);ctx.fillRect(rx+rw-7,ry+ST,7,bh-ST-8);
      ctx.fillRect(rx+Math.floor(rw/2)-3,ry+ST,6,bh-ST-8);
      // Horizontal cross beams
      ctx.fillRect(rx,ry+ST,rw,5);ctx.fillRect(rx,ry+bh-ST-6,rw,5);
      // Panel fill between beams
      ctx.fillStyle='#5A3418';
      ctx.fillRect(rx+7,ry+ST+5,Math.floor(rw/2)-10,bh-ST*2-2);
      ctx.fillRect(rx+Math.floor(rw/2)+3,ry+ST+5,Math.floor(rw/2)-10,bh-ST*2-2);
      // Horizontal plank detail in panels
      ctx.fillStyle='rgba(0,0,0,0.08)';
      for(let i=0;i<Math.floor((bh-ST*2)/9);i++){ctx.fillRect(rx+7,ry+ST+5+i*9+7,rw-14,2);}

      // Two windows with warm AMBER glow (candlelit!)
      const wh3=ST-10,ww3=ST-6;
      const wy3=ry+ST+12;
      // Left window
      const lwx=rx+14;
      ctx.fillStyle='#3A2010';ctx.fillRect(lwx-3,wy3-3,ww3+6,wh3+6);
      ctx.fillStyle=winGlowAmber;ctx.fillRect(lwx,wy3,ww3,wh3);
      ctx.fillStyle='rgba(255,255,255,0.1)';ctx.fillRect(lwx,wy3,ww3/2,wh3);
      ctx.fillStyle='#3A2010';ctx.fillRect(lwx+ww3/2-1,wy3,2,wh3);ctx.fillRect(lwx,wy3+wh3/2-1,ww3,2);
      // Warm glow pool on ground from left window
      if(isNight){
        ctx.fillStyle='rgba(255,180,60,0.1)';
        ctx.beginPath();ctx.ellipse(lwx+ww3/2,ry+bh+6,20,8,0,0,Math.PI*2);ctx.fill();
      }
      // Right window (if wide enough)
      if(d.w>=6){
        const rwx2=rx+rw-14-ww3;
        ctx.fillStyle='#3A2010';ctx.fillRect(rwx2-3,wy3-3,ww3+6,wh3+6);
        ctx.fillStyle=winGlowAmber;ctx.fillRect(rwx2,wy3,ww3,wh3);
        ctx.fillStyle='rgba(255,255,255,0.1)';ctx.fillRect(rwx2,wy3,ww3/2,wh3);
        ctx.fillStyle='#3A2010';ctx.fillRect(rwx2+ww3/2-1,wy3,2,wh3);ctx.fillRect(rwx2,wy3+wh3/2-1,ww3,2);
        if(isNight){
          ctx.fillStyle='rgba(255,180,60,0.1)';
          ctx.beginPath();ctx.ellipse(rwx2+ww3/2,ry+bh+6,20,8,0,0,Math.PI*2);ctx.fill();
        }
      }

      // Hanging sign — '🍺 HODL' on dark plaque
      const ts3W=54,ts3H=14;const ts3X=rx+rw/2-ts3W/2,ts3Y=ry+4;
      ctx.fillStyle='#444438';ctx.fillRect(ts3X+ts3W*0.3,ts3Y-8,2,8);ctx.fillRect(ts3X+ts3W*0.68,ts3Y-8,2,8);
      ctx.fillStyle='#2A1808';ctx.fillRect(ts3X,ts3Y,ts3W,ts3H);
      ctx.fillStyle='#C88030';ctx.font='bold 8px '+FONT;ctx.textAlign='center';
      ctx.fillText('🍺 HODL',ts3X+ts3W/2,ts3Y+10);

      // Swinging door — slightly ajar, lighter
      const dW3=ST-2,dH3=ST+12;
      const dX3=rx+Math.floor(rw/2)-dW3/2;const dY3=ry+bh-dH3;
      ctx.fillStyle='#3A2010';ctx.fillRect(dX3-3,dY3,dW3+6,dH3+1);
      ctx.fillStyle='#8A6030';ctx.fillRect(dX3,dY3+2,dW3*0.55,dH3-2); // left door panel ajar
      ctx.fillStyle='#7A5028';ctx.fillRect(dX3+dW3*0.55,dY3+2,dW3*0.45,dH3-2); // right panel
      // Door panels detail
      ctx.fillStyle='rgba(0,0,0,0.1)';
      ctx.fillRect(dX3+4,dY3+6,dW3*0.45,dH3/2-8);
      ctx.fillRect(dX3+4,dY3+dH3/2+2,dW3*0.45,dH3/2-10);
      // Handle
      ctx.fillStyle='#B08040';ctx.fillRect(dX3+dW3-10,dY3+dH3/2-3,4,8);
      // Door mat
      ctx.fillStyle='#7A4820';ctx.fillRect(dX3-4,ry+bh+1,dW3+8,5);
      ctx.fillStyle='rgba(200,140,60,0.3)';
      for(let i=0;i<3;i++){ctx.fillRect(dX3-2+i*9,ry+bh+2,7,3);}

      // Barrel outside left of door
      const brlX=dX3-22,brlY=ry+bh-ST+4;
      ctx.fillStyle='#6A4020';ctx.fillRect(brlX,brlY,14,ST-8);
      ctx.fillStyle='#888060';ctx.fillRect(brlX-1,brlY+4,16,3);ctx.fillRect(brlX-1,brlY+12,16,3);
      ctx.fillStyle='#5A3010';
      for(let i=0;i<3;i++){ctx.fillRect(brlX+i*5+1,brlY,3,ST-8);}

      // Small bench outside right of door
      const bnX=dX3+dW3+6,bnY=ry+bh-12;
      ctx.fillStyle='#7A5028';ctx.fillRect(bnX,bnY,20,4); // seat
      ctx.fillStyle='#5A3818';ctx.fillRect(bnX+2,bnY+4,3,8);ctx.fillRect(bnX+15,bnY+4,3,8); // legs

      // Chimney — left side, orange-tinged smoke
      const tchx=rx+10,tchy=ry-ST*0.5;
      ctx.fillStyle='#5A3820';ctx.fillRect(tchx,tchy,12,ST*0.5+ST+4);
      ctx.fillStyle='#4A2810';
      for(let i=0;i<5;i++){ctx.fillRect(tchx+(i%2)*2,tchy+i*8,12,6);}
      ctx.fillStyle='#3A1A08';ctx.fillRect(tchx-2,tchy-4,16,5);
      // Orange-tinged smoke (fireplace)
      const tsa=0.25+Math.sin(t*2)*0.1;
      ctx.fillStyle=`rgba(200,130,60,${tsa})`;
      ctx.beginPath();ctx.arc(tchx+6+Math.sin(t)*3,tchy-12-Math.sin(t*1.4)*5,4+Math.sin(t*2)*1.5,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=`rgba(180,100,40,${tsa*0.7})`;
      ctx.beginPath();ctx.arc(tchx+5+Math.sin(t+1)*4,tchy-22-Math.sin(t)*6,3,0,Math.PI*2);ctx.fill();

      // Thatched/darker roof
      ctx.fillStyle='#5A4020';ctx.fillRect(rx-8,ry-6,rw+16,ST+10);
      for(let row=0;row<5;row++){
        ctx.fillStyle=row%2===0?'#6A5028':'#4A3010';
        const rowy=ry-6+row*(ST+10)/5;
        for(let col=0;col<Math.ceil((rw+16)/10);col++){
          ctx.fillRect(rx-8+col*10+(row%2)*4,rowy,9,Math.floor((ST+10)/5));
        }
      }
      ctx.fillStyle='#3A2010';ctx.fillRect(rx-8,ry-8,rw+16,4);
      ctx.fillStyle='rgba(0,0,0,0.22)';ctx.fillRect(rx-10,ry+ST+3,rw+20,5);
    }

    // ── SHED (Mining Shed) ────────────────────────────────────────────────
    else if(d.label==='shed'){
      // Foundation
      ctx.fillStyle='#3A3A38';ctx.fillRect(rx-2,ry+bh-8,rw+4,8);

      // Corrugated metal walls — alternating grey stripes
      for(let i=0;i<Math.floor(rw/4)+1;i++){
        ctx.fillStyle=i%2===0?'#6A6A68':'#5A5A58';
        ctx.fillRect(rx+i*4,ry+ST,4,bh-ST-8);
      }
      // Horizontal seam lines
      ctx.fillStyle='rgba(0,0,0,0.15)';
      for(let i=0;i<Math.floor((bh-ST)/ST);i++){ctx.fillRect(rx,ry+ST+i*ST,rw,3);}
      // Metal reinforcement verticals
      ctx.fillStyle='#484846';ctx.fillRect(rx,ry+ST,5,bh-ST-8);ctx.fillRect(rx+rw-5,ry+ST,5,bh-ST-8);

      // 'MINING' stenciled in orange on the wall
      ctx.fillStyle='#C07010';ctx.font='bold 9px '+FONT;ctx.textAlign='center';
      ctx.fillText('MINING',rx+rw/2,ry+ST+Math.floor((bh-ST)*0.55));

      // Single small barred window
      const sw=ST-12,sh=ST-18;
      const swx=rx+ST*0.5,swy=ry+ST+12;
      ctx.fillStyle='#484846';ctx.fillRect(swx-3,swy-3,sw+6,sh+6);
      ctx.fillStyle='rgba(120,160,180,0.2)';ctx.fillRect(swx,swy,sw,sh);
      // Window bars
      ctx.fillStyle='#383836';
      ctx.fillRect(swx+sw/2-1,swy,2,sh);
      ctx.fillRect(swx,swy+sh/2-1,sw,2);
      // Vertical bars
      for(let b=0;b<3;b++){ctx.fillRect(swx+b*(sw/3),swy,2,sh);}

      // Power cable — thin dark line from right wall
      ctx.strokeStyle='#2A2A28';ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(rx+rw,ry+ST+bh*0.3-ST);ctx.lineTo(rx+rw+20,ry+ST+bh*0.2-ST);ctx.stroke();

      // Exhaust vent on right side
      const evx=rx+rw-12,evy=ry+ST+bh*0.65-ST;
      ctx.fillStyle='#505050';ctx.fillRect(evx,evy,10,12);
      ctx.fillStyle='#404040';ctx.fillRect(evx+2,evy+2,6,8); // vent opening
      // Heat shimmer (subtle flicker)
      const hs=0.04+Math.sin(t*4+0.5)*0.02;
      ctx.fillStyle=`rgba(200,180,100,${hs})`;ctx.fillRect(evx+2,evy-4,6,6);

      // Heavy metal door — grey, with handle
      const dW4=ST,dH4=ST+12;
      const dX4=rx+Math.floor(rw/2)-dW4/2;const dY4=ry+bh-dH4;
      ctx.fillStyle='#2A2A28';ctx.fillRect(dX4-4,dY4,dW4+8,dH4+1);
      ctx.fillStyle='#484846';ctx.fillRect(dX4,dY4+2,dW4,dH4-2);
      // Door rivets/bolts
      ctx.fillStyle='#3A3A38';
      for(let r=0;r<3;r++){
        ctx.fillRect(dX4+4,dY4+8+r*14,4,4);
        ctx.fillRect(dX4+dW4-8,dY4+8+r*14,4,4);
      }
      // Handle — vertical bar style
      ctx.fillStyle='#888880';ctx.fillRect(dX4+dW4-10,dY4+dH4/2-10,5,20);
      ctx.fillStyle='#AAAAAA';ctx.fillRect(dX4+dW4-9,dY4+dH4/2-8,3,16);
      // Door mat
      ctx.fillStyle='#555550';ctx.fillRect(dX4-4,ry+bh+1,dW4+8,5);

      // Flat metal roof — grey-blue
      ctx.fillStyle='#5A5A68';ctx.fillRect(rx-6,ry-4,rw+12,ST+6);
      ctx.fillStyle='#4A4A58';ctx.fillRect(rx-6,ry-4,rw+12,4); // front edge
      ctx.fillStyle='#6A6A78';
      for(let p=0;p<Math.ceil((rw+12)/20);p++){ctx.fillRect(rx-6+p*20,ry-4,18,ST+6);}
      ctx.fillStyle='rgba(0,0,0,0.2)';ctx.fillRect(rx-8,ry+ST+2,rw+16,4);

      // Satellite dish / antenna on roof
      const antX=rx+rw*0.6,antY=ry-16;
      ctx.fillStyle='#888880';ctx.fillRect(antX,antY,3,14); // mast
      ctx.fillStyle='#AAAAAA';ctx.fillRect(antX-8,antY,18,4); // dish top
      ctx.fillStyle='#909088';ctx.fillRect(antX-6,antY+4,14,2); // dish body

      // Blinking LED light on roof (red, toggles)
      const ledOn=Math.floor(performance.now()/500)%2===0;
      ctx.fillStyle=ledOn?'#FF2020':'#600000';
      ctx.beginPath();ctx.arc(rx+rw*0.2,ry-2,3,0,Math.PI*2);ctx.fill();
      if(ledOn){
        ctx.fillStyle='rgba(255,0,0,0.2)';
        ctx.beginPath();ctx.arc(rx+rw*0.2,ry-2,7,0,Math.PI*2);ctx.fill();
      }
      
      // Show rig count and status on shed exterior
      const shedRigs = rigs.filter(r => r.interior === 'shed');
      const activeRigs = shedRigs.filter(r => r.powered && r.dur > 0 && !r.oh);
      if (shedRigs.length > 0) {
        // Status panel above door
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(dX4-10, dY4-22, dW4+20, 20);
        ctx.fillStyle = activeRigs.length > 0 ? C.ledGreen : C.red;
        ctx.font = `bold 11px ${FONT}`; ctx.textAlign = 'center';
        ctx.fillText(`⛏️ ${activeRigs.length}/${shedRigs.length} mining`, rx+rw/2, dY4-8);
        // Hash indicator
        const shedHash = activeRigs.reduce((s,r) => s + r.hr, 0);
        if (shedHash > 0) {
          ctx.fillStyle = C.orange; ctx.font = `10px ${FONT}`;
          ctx.fillText(`${shedHash.toFixed(1)} TH/s`, rx+rw/2, dY4+4);
        }
      }
      // "Enter" prompt when player is near
      const playerDist = Math.hypot(player.x - (d.x*TILE+d.w*TILE/2), player.y - ((d.y+d.bh)*TILE));
      if (playerDist < TILE * 4 && !interior) {
        ctx.fillStyle = C.orange; ctx.font = `bold 12px ${FONT}`; ctx.textAlign = 'center';
        ctx.fillText('Walk to door to enter', rx+rw/2, ry+bh+16);
      }
    }

    // ── HALL (Town Hall) ──────────────────────────────────────────────────
    else if(d.label==='hall'){
      // Foundation — stone base
      ctx.fillStyle='#3A3A40';ctx.fillRect(rx-4,ry+bh-10,rw+8,10);
      ctx.fillStyle='#4A4A50';
      for(let i=0;i<Math.floor((rw+8)/16);i++){ctx.fillRect(rx-4+i*16,ry+bh-10,14,9);}

      // Stone brick walls — grey with brick pattern
      ctx.fillStyle='#5A5A62';ctx.fillRect(rx,ry+ST,rw,bh-ST-10);
      // Horizontal mortar lines
      ctx.fillStyle='rgba(0,0,0,0.12)';
      for(let i=0;i<Math.floor((bh-ST)/10);i++){ctx.fillRect(rx,ry+ST+i*10+8,rw,2);}
      // Vertical brick joints (every 3rd pixel offset by row)
      for(let row=0;row<Math.floor((bh-ST)/10);row++){
        const offset=row%2===0?0:8;
        for(let col=0;col<Math.ceil(rw/16);col++){
          ctx.fillRect(rx+col*16+offset,ry+ST+row*10,2,8);
        }
      }
      // Subtle stone variation
      ctx.fillStyle='rgba(255,255,255,0.04)';
      ctx.fillRect(rx+rw*0.2,ry+ST,rw*0.15,bh-ST-10);
      ctx.fillRect(rx+rw*0.6,ry+ST,rw*0.1,bh-ST-10);

      // Two tall narrow windows with dark frames
      const tww=ST-14,twh=ST+4;const twy=ry+ST+12;
      const tw1x=rx+ST*0.7,tw2x=rx+rw-ST*0.7-tww;
      for(const twx of [tw1x,tw2x]){
        ctx.fillStyle='#2A2A30';ctx.fillRect(twx-3,twy-3,tww+6,twh+6);
        ctx.fillStyle=winGlow;ctx.fillRect(twx,twy,tww,twh);
        ctx.fillStyle='rgba(255,255,255,0.1)';ctx.fillRect(twx,twy,tww/2,twh);
        ctx.fillStyle='#2A2A30';ctx.fillRect(twx+tww/2-1,twy,2,twh);
        // Arched top
        ctx.fillStyle='#2A2A30';ctx.beginPath();ctx.arc(twx+tww/2,twy,tww/2+3,Math.PI,0);ctx.fill();
        ctx.fillStyle=winGlow;ctx.beginPath();ctx.arc(twx+tww/2,twy,tww/2,Math.PI,0);ctx.fill();
      }

      // Two columns flanking door area
      const colY=ry+bh-ST*1.6;const colH=ST*1.4;
      const colX1=rx+rw/2-ST*0.9,colX2=rx+rw/2+ST*0.9-4;
      for(const cx of [colX1,colX2]){
        ctx.fillStyle='#8A8A92';ctx.fillRect(cx,colY,4,colH); // column shaft
        ctx.fillStyle='#9A9AA2';ctx.fillRect(cx-2,colY,8,5); // capital top
        ctx.fillStyle='#7A7A82';ctx.fillRect(cx-2,colY+colH-4,8,4); // base
      }

      // Triangular pediment above door
      const pedW=rw*0.6,pedX=rx+rw*0.2;
      const pedY=ry+bh-ST*1.65;
      ctx.fillStyle='#6A6A72';
      ctx.beginPath();ctx.moveTo(pedX,pedY);ctx.lineTo(pedX+pedW,pedY);ctx.lineTo(pedX+pedW/2,pedY-ST*0.5);ctx.closePath();ctx.fill();
      ctx.fillStyle='#5A5A62';ctx.fillRect(pedX,pedY-2,pedW,3); // pediment base line

      // Clock face on pediment
      const clkX=pedX+pedW/2,clkY=pedY-ST*0.25;const clkR=ST*0.18;
      ctx.fillStyle='#E8E4D8';ctx.beginPath();ctx.arc(clkX,clkY,clkR,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#3A3040';ctx.lineWidth=1;ctx.beginPath();ctx.arc(clkX,clkY,clkR,0,Math.PI*2);ctx.stroke();
      // Hour dots
      for(let h=0;h<12;h++){
        const ang=h/12*Math.PI*2-Math.PI/2;
        ctx.fillStyle='#3A3040';ctx.fillRect(clkX+Math.cos(ang)*(clkR-3)-1,clkY+Math.sin(ang)*(clkR-3)-1,2,2);
      }
      // Clock hands based on game time
      const clkHr=getHour()%12,clkMin=(getHour()-Math.floor(getHour()))*60;
      const hAng=(clkHr/12+clkMin/720)*Math.PI*2-Math.PI/2;
      const mAng=clkMin/60*Math.PI*2-Math.PI/2;
      ctx.strokeStyle='#3A3040';ctx.lineWidth=1.5;
      ctx.beginPath();ctx.moveTo(clkX,clkY);ctx.lineTo(clkX+Math.cos(hAng)*(clkR-5),clkY+Math.sin(hAng)*(clkR-5));ctx.stroke();
      ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(clkX,clkY);ctx.lineTo(clkX+Math.cos(mAng)*(clkR-3),clkY+Math.sin(mAng)*(clkR-3));ctx.stroke();

      // Grand double door — wider, darker, with brass handles
      const gdW=ST+12,gdH=ST+14;
      const gdX=rx+rw/2-gdW/2;const gdY=ry+bh-gdH;
      ctx.fillStyle='#1A1820';ctx.fillRect(gdX-4,gdY,gdW+8,gdH+1);
      ctx.fillStyle='#3A3440';ctx.fillRect(gdX,gdY+2,gdW/2-1,gdH-2); // left door
      ctx.fillStyle='#2E2838';ctx.fillRect(gdX+gdW/2+1,gdY+2,gdW/2-1,gdH-2); // right door
      // Door panels
      ctx.fillStyle='rgba(0,0,0,0.15)';
      ctx.fillRect(gdX+4,gdY+6,gdW/2-7,gdH/2-8);ctx.fillRect(gdX+4,gdY+gdH/2+2,gdW/2-7,gdH/2-10);
      ctx.fillRect(gdX+gdW/2+3,gdY+6,gdW/2-7,gdH/2-8);ctx.fillRect(gdX+gdW/2+3,gdY+gdH/2+2,gdW/2-7,gdH/2-10);
      // Brass handles
      ctx.fillStyle='#C8A020';
      ctx.fillRect(gdX+gdW/2-6,gdY+gdH/2-4,4,10);ctx.fillRect(gdX+gdW/2+3,gdY+gdH/2-4,4,10);
      // 'TOWN HALL' carved into stone lintel
      ctx.fillStyle='#2A2A30';ctx.fillRect(gdX-8,gdY-12,gdW+16,12);
      ctx.fillStyle='#8A8A92';ctx.font='bold 7px '+FONT;ctx.textAlign='center';
      ctx.fillText('TOWN HALL',gdX+gdW/2,gdY-2);
      // Door mat
      ctx.fillStyle='#4A4A50';ctx.fillRect(gdX-6,ry+bh+1,gdW+12,5);
      ctx.fillStyle='rgba(200,160,20,0.25)';
      for(let i=0;i<4;i++){ctx.fillRect(gdX-4+i*10,ry+bh+2,8,3);}

      // Slate grey roof — clean lines
      ctx.fillStyle='#6A6A72';ctx.fillRect(rx-8,ry-6,rw+16,ST+10);
      ctx.fillStyle='#5A5A62';
      for(let i=0;i<Math.ceil((rw+16)/16);i++){ctx.fillRect(rx-8+i*16,ry-6,15,ST+10);}
      ctx.fillStyle='#4A4A52';ctx.fillRect(rx-8,ry-8,rw+16,4);
      ctx.fillStyle='rgba(0,0,0,0.22)';ctx.fillRect(rx-10,ry+ST+3,rw+20,5);

      // Small ₿ flag on top
      const flagX=rx+rw/2-1,flagY=ry-18;
      ctx.fillStyle='#888888';ctx.fillRect(flagX,flagY,2,16); // pole
      ctx.fillStyle='#C07010';ctx.fillRect(flagX+2,flagY,14,9); // flag orange
      ctx.fillStyle='#F7931A';ctx.font='bold 7px '+FONT;ctx.textAlign='left';
      ctx.fillText('₿',flagX+3,flagY+8);
    }

    // ── DEFAULT building ──────────────────────────────────────────────────
    else {
      const wallCol2={home:'#6A4430',shed:'#5A5A4A',shop:'#7A5A30',tavern:'#5A3A1A',hall:'#4A4A5A'}[d.label]||'#6A4430';
      ctx.fillStyle=wallCol2;ctx.fillRect(rx,ry+ST,rw,bh-ST);
      ctx.fillStyle='rgba(0,0,0,0.1)';
      for(let i=0;i<Math.floor(bh/ST)-1;i++){ctx.fillRect(rx,ry+ST+i*ST+ST-2,rw,2);}
      ctx.fillStyle='rgba(0,0,0,0.08)';ctx.fillRect(rx+2,ry+ST,4,bh-ST);ctx.fillRect(rx+rw-6,ry+ST,4,bh-ST);
      const dWd=ST,dHd=ST+8;const dXd=rx+Math.floor(d.w/2)*ST-dWd/2;
      ctx.fillStyle='#3A2010';ctx.fillRect(dXd-2,ry+bh-dHd,dWd+4,dHd);
      ctx.fillStyle='#5A3A18';ctx.fillRect(dXd,ry+bh-dHd+2,dWd,dHd-2);
      ctx.fillStyle='#AA8844';ctx.fillRect(dXd+dWd-8,ry+bh-dHd/2,4,4);
      ctx.fillStyle='#8A6A40';ctx.fillRect(dXd-4,ry+bh-2,dWd+8,4);
      ctx.fillStyle=d.color;ctx.fillRect(rx-6,ry-4,rw+12,ST+8);
      ctx.fillStyle='rgba(0,0,0,0.15)';ctx.fillRect(rx-6,ry+ST/2-1,rw+12,3);
      ctx.fillStyle='rgba(0,0,0,0.2)';ctx.fillRect(rx-8,ry+ST+2,rw+16,4);
    }

    ctx.textAlign='left'; // restore default
    return;
  }
  else if(d.type==='seed_fragment'){
    const glow=.5+Math.sin(t*3)*.3;
    ctx.fillStyle=`rgba(247,147,26,${glow})`;ctx.beginPath();ctx.arc(sx+ST/2,sy+ST/2,10+Math.sin(t*2)*3,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=C.orange;ctx.font='16px serif';ctx.textAlign='center';ctx.fillText('🧩',sx+ST/2,sy+ST/2+5);
  }
  else if(d.type==='citadel_tower'){
    // Draw a tall tower above the citadel
    ctx.fillStyle='#5A3818';ctx.fillRect(sx+ST/2-8,sy-ST*1.5,16,ST*1.5+ST*.4);
    ctx.fillStyle='#6A4820';ctx.fillRect(sx+ST/2-10,sy-ST*1.5,20,8); // parapet
    // Battlements
    for(let i=0;i<3;i++){ctx.fillStyle='#5A3818';ctx.fillRect(sx+ST/2-9+i*7,sy-ST*1.5-6,5,8);}
    // Window
    ctx.fillStyle='#F7931A';const glow2=0.4+Math.sin(t*2)*0.2;
    ctx.globalAlpha=glow2;ctx.fillRect(sx+ST/2-3,sy-ST*.9,6,8);ctx.globalAlpha=1;
    ctx.fillStyle=C.orange;ctx.font='10px serif';ctx.textAlign='center';ctx.fillText('🗼',sx+ST/2,sy-ST*1.2);
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
  else if(item.type==='chest'){
    ctx.fillStyle='#7A5A20';ctx.fillRect(sx-ST/2+6,sy-ST/2+12,ST-12,ST-16);
    ctx.fillStyle='#8A6A30';ctx.fillRect(sx-ST/2+4,sy-ST/2+10,ST-8,6);
    ctx.fillStyle='#5A3A10';ctx.fillRect(sx-3,sy-ST/2+12,6,4);
    ctx.fillStyle='#AA8A40';ctx.fillRect(sx-2,sy-ST/2+13,4,2);
  }
  else if(item.type==='flower_pot'){
    // Pot body
    ctx.fillStyle='#A0522D';ctx.fillRect(sx-8,sy,16,12);
    ctx.fillStyle='#8B4513';ctx.fillRect(sx-10,sy-2,20,4);
    // Soil
    ctx.fillStyle='#4A3010';ctx.fillRect(sx-7,sy+1,14,4);
    // Flower
    ctx.fillStyle='#228B22';ctx.fillRect(sx-1,sy-14,2,14); // stem
    ctx.fillStyle='#FF69B4';ctx.beginPath();ctx.arc(sx,sy-16,6,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#FFD700';ctx.beginPath();ctx.arc(sx,sy-16,2.5,0,Math.PI*2);ctx.fill();
    // Extra leaf
    ctx.fillStyle='#32CD32';ctx.beginPath();ctx.ellipse(sx+5,sy-10,4,2,0.5,0,Math.PI*2);ctx.fill();
  }
  else if(item.type==='torch_item'){
    const t=performance.now()/1000;
    const isNight=getHour()<6||getHour()>20;
    // Glow at night
    if(isNight){
      const glow=0.15+Math.sin(t*3)*0.05;
      ctx.fillStyle=`rgba(255,150,50,${glow})`;
      ctx.beginPath();ctx.arc(sx,sy-10,30+Math.sin(t*2)*4,0,Math.PI*2);ctx.fill();
    }
    // Stick
    ctx.fillStyle='#8B4513';ctx.fillRect(sx-3,sy-4,6,20);
    // Flame base
    ctx.fillStyle='#FF4400';ctx.beginPath();ctx.arc(sx,sy-8,7,0,Math.PI*2);ctx.fill();
    // Flame animated
    const fl=Math.sin(t*8)*2;
    ctx.fillStyle='#FF8800';ctx.beginPath();ctx.arc(sx+fl,sy-14,5,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#FFDD00';ctx.beginPath();ctx.arc(sx+fl*0.5,sy-18,3,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='rgba(255,255,200,0.6)';ctx.beginPath();ctx.arc(sx,sy-20,2,0,Math.PI*2);ctx.fill();
  }
  else if(item.type==='bitcoin_sign'){
    const t=performance.now()/1000;
    const glow=0.5+Math.sin(t*2)*0.2;
    // Post
    ctx.fillStyle='#6A4A2A';ctx.fillRect(sx-3,sy-4,6,20);
    // Sign board
    ctx.fillStyle=`rgba(247,147,26,${glow})`;
    ctx.beginPath();ctx.arc(sx,sy-14,14,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#FFD700';ctx.font=`bold 18px ${FONT}`;ctx.textAlign='center';
    ctx.fillText('₿',sx,sy-9);
    // Outer ring
    ctx.strokeStyle=`rgba(255,200,50,${glow})`;ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(sx,sy-14,16,0,Math.PI*2);ctx.stroke();
    ctx.textAlign='left';
  }
}

function drawFence(fence){
  const sx=fence.x*ST-cam.x,sy=fence.y*ST-cam.y;
  if(sx>canvas.width+ST||sy>canvas.height+ST||sx<-ST||sy<-ST)return;
  // Ground tile already drawn — draw fence posts and rails on top
  ctx.fillStyle='#8B6340'; // post color
  // Center vertical post
  ctx.fillRect(sx+ST/2-3,sy,6,ST);
  // Horizontal rails
  ctx.fillStyle='#A07850';
  ctx.fillRect(sx,sy+8,ST,5);
  ctx.fillRect(sx,sy+ST-16,ST,5);
  // Post highlight
  ctx.fillStyle='#C09060';
  ctx.fillRect(sx+ST/2-2,sy+2,2,ST-4);
}

function drawPlayer(){
  const sx=player.x*SCALE-cam.x,sy=player.y*SCALE-cam.y;
  const w=ST+4,h=ST+16,px=sx-w/2,py=sy-h/2;
  const bob=player.moving?Math.sin(player.wf*Math.PI/2)*2:0;
  const lo=player.moving?Math.sin(player.wf*Math.PI)*5:0;
  const as=player.moving?Math.sin(player.wf*Math.PI)*7:0;
  
  // Shadow
  ctx.fillStyle='rgba(0,0,0,.2)';ctx.beginPath();ctx.ellipse(sx,sy+h/2+3,16,6,0,0,Math.PI*2);ctx.fill();
  
  // Legs with jeans
  ctx.fillStyle='#3A4A6A'; // jeans blue
  ctx.fillRect(px+12+lo,py+h-20,10,16);ctx.fillRect(px+w-22-lo,py+h-20,10,16);
  // Boots
  ctx.fillStyle='#4A3018';
  ctx.fillRect(px+10+lo,py+h-6,14,6);ctx.fillRect(px+w-24-lo,py+h-6,14,6);
  // Boot detail
  ctx.fillStyle='#5A4028';
  ctx.fillRect(px+10+lo,py+h-6,14,2);ctx.fillRect(px+w-24-lo,py+h-6,14,2);
  
  // Body (orange Bitcoin hoodie)
  ctx.fillStyle=player.boost>0?'#FFB030':C.orange;
  ctx.fillRect(px+8,py+18+bob,w-16,h-38);
  // Hoodie pocket
  ctx.fillStyle=C.darkOrange;
  ctx.fillRect(px+14,py+34+bob,w-28,8);
  // Zipper line
  ctx.fillStyle='#DDD';ctx.fillRect(sx-1,py+18+bob,2,h-38);
  
  // Bitcoin logo on chest
  ctx.fillStyle='#FFF';ctx.font=`bold 16px ${FONT}`;ctx.textAlign='center';
  ctx.fillText('₿',sx,py+32+bob);
  
  // Arms with skin + hoodie sleeve
  ctx.fillStyle=C.orange;
  ctx.fillRect(px+1,py+18+bob-as,10,14);ctx.fillRect(px+w-11,py+18+bob+as,10,14);
  // Hands
  ctx.fillStyle=C.skin;
  ctx.fillRect(px+2,py+30+bob-as,8,8);ctx.fillRect(px+w-10,py+30+bob+as,8,8);
  
  // Head
  ctx.fillStyle=C.skin;
  ctx.fillRect(px+12,py+4+bob,w-24,16);
  // Jaw
  ctx.fillRect(px+14,py+18+bob,w-28,4);
  
  // Hair
  ctx.fillStyle=C.hair;
  ctx.fillRect(px+10,py+bob,w-20,8);
  ctx.fillRect(px+10,py+2+bob,4,10); // sideburn left
  ctx.fillRect(px+w-14,py+2+bob,4,10); // sideburn right
  
  // Eyes (direction-aware)
  const eyeOff = player.facing.x > 0.3 ? 3 : player.facing.x < -0.3 ? -3 : 0;
  ctx.fillStyle=C.white;
  ctx.fillRect(px+16+eyeOff,py+10+bob,6,5);ctx.fillRect(px+w-22+eyeOff,py+10+bob,6,5);
  ctx.fillStyle=C.black;
  ctx.fillRect(px+18+eyeOff,py+11+bob,3,3);ctx.fillRect(px+w-20+eyeOff,py+11+bob,3,3);
  
  // Mouth
  ctx.fillStyle='#D09070';ctx.fillRect(px+20,py+16+bob,w-40,2);
  
  // Baseball cap (Bitcoin orange)
  ctx.fillStyle=C.darkOrange;
  ctx.fillRect(px+8,py-2+bob,w-16,6);
  ctx.fillStyle=C.orange;
  ctx.fillRect(px+6,py+2+bob,w-12,4); // brim
  // Cap ₿
  ctx.fillStyle='#FFF';ctx.font=`bold 8px ${FONT}`;ctx.fillText('₿',sx,py+3+bob);
  
  // Selected item in hand
  const sel=getSelected();
  if(sel){
    ctx.font='14px serif';
    ctx.fillText(ITEMS[sel.id].icon, sx + (player.facing.x>0?18:-18), py+32+bob);
    // Item name above head
    ctx.fillStyle='rgba(0,0,0,.6)';ctx.font=`13px ${FONT}`;
    ctx.fillText(ITEMS[sel.id].name,sx,py-12);
  }
}

function drawAnimal(a){
  const info=ANIMAL_TYPES[a.type];if(!info)return;
  const sx=a.x*SCALE-cam.x, sy=a.y*SCALE-cam.y;
  if(sx<-60||sx>canvas.width+60||sy<-60||sy>canvas.height+60) return;
  // Shadow
  ctx.fillStyle='rgba(0,0,0,0.15)';ctx.beginPath();ctx.ellipse(sx,sy+22,14,6,0,0,Math.PI*2);ctx.fill();
  // Sprite (flip based on direction)
  ctx.save();
  if(a.dir<0){ctx.translate(sx,sy-20);ctx.scale(-1,1);drawSprite(info.sprite,-24,-4,3);}
  else{drawSprite(info.sprite,sx-24,sy-24,3);}
  ctx.restore();
  // Product ready indicator (bouncing icon)
  if(a.prodReady){
    const bounce=Math.sin(performance.now()/300)*4;
    ctx.font='16px serif';ctx.textAlign='center';
    ctx.fillText(info.icon,sx,sy-30+bounce);
  }
  // Happiness indicator when nearby
  if(Math.hypot(a.x-player.x,a.y-player.y)<60){
    const hp=a.happiness;
    const emoji=hp>=70?'😊':hp>=30?'😐':'😞';
    ctx.font='12px serif';ctx.textAlign='center';
    ctx.fillText(emoji,sx+18,sy-22);
  }
}

function drawNPC(n){
  const sx=n.x*SCALE-cam.x,sy=n.y*SCALE-cam.y;
  const w=ST+4,h=ST+16,px=sx-w/2,py=sy-h/2;
  if(sx>canvas.width+w||sy>canvas.height+h||sx<-w||sy<-h)return;
  const bob=n.moving?Math.sin((n.wf||0)*Math.PI/2)*2:0;
  const lo=n.moving?Math.sin((n.wf||0)*Math.PI)*4:0;
  const as=n.moving?Math.sin((n.wf||0)*Math.PI)*5:0;
  const eyeOff=player?((n.x<player.x)?2:(n.x>player.x)?-2:0):0;
  
  // Shadow
  ctx.fillStyle='rgba(0,0,0,.18)';ctx.beginPath();ctx.ellipse(sx,sy+h/2+3,16,6,0,0,Math.PI*2);ctx.fill();

  // === PER-NPC UNIQUE DESIGNS ===
  if(n.name==='Hodl Hannah'){
    // Legs — dark leggings
    ctx.fillStyle='#2A2A3A';ctx.fillRect(px+12+lo,py+h-20,10,16);ctx.fillRect(px+w-22-lo,py+h-20,10,16);
    ctx.fillStyle='#C06080';ctx.fillRect(px+10+lo,py+h-6,14,6);ctx.fillRect(px+w-24-lo,py+h-6,14,6); // pink shoes
    // Body — pink top
    ctx.fillStyle='#FF69B4';ctx.fillRect(px+8,py+18+bob,w-16,h-38);
    ctx.fillStyle='#E05A9E';ctx.fillRect(px+14,py+34+bob,w-28,6); // belt line
    // ₿ necklace
    ctx.fillStyle='#FFD700';ctx.font='bold 10px '+FONT;ctx.textAlign='center';ctx.fillText('₿',sx,py+28+bob);
    // Arms
    ctx.fillStyle='#FF69B4';ctx.fillRect(px+1,py+18+bob-as,10,12);ctx.fillRect(px+w-11,py+18+bob+as,10,12);
    ctx.fillStyle=C.skin;ctx.fillRect(px+2,py+28+bob-as,8,8);ctx.fillRect(px+w-10,py+28+bob+as,8,8);
    // Head
    ctx.fillStyle=C.skin;ctx.fillRect(px+12,py+4+bob,w-24,16);ctx.fillRect(px+14,py+18+bob,w-28,4);
    // Blonde hair — long flowing
    ctx.fillStyle='#FFD700';ctx.fillRect(px+10,py+bob,w-20,8);
    ctx.fillRect(px+8,py+2+bob,6,18);ctx.fillRect(px+w-14,py+2+bob,6,18); // long sides
    // Eyes
    ctx.fillStyle=C.white;ctx.fillRect(px+16+eyeOff,py+10+bob,6,5);ctx.fillRect(px+w-22+eyeOff,py+10+bob,6,5);
    ctx.fillStyle='#4488CC';ctx.fillRect(px+18+eyeOff,py+11+bob,3,3);ctx.fillRect(px+w-20+eyeOff,py+11+bob,3,3); // blue eyes
    ctx.fillStyle='#D09070';ctx.fillRect(px+20,py+16+bob,w-40,2); // mouth
  }
  else if(n.name==='Leverage Larry'){
    // Legs — suit pants
    ctx.fillStyle='#2A2A55';ctx.fillRect(px+12+lo,py+h-20,10,16);ctx.fillRect(px+w-22-lo,py+h-20,10,16);
    ctx.fillStyle='#1A1A30';ctx.fillRect(px+10+lo,py+h-6,14,6);ctx.fillRect(px+w-24-lo,py+h-6,14,6); // dark shoes
    // Body — blue suit jacket
    ctx.fillStyle='#4455FF';ctx.fillRect(px+8,py+18+bob,w-16,h-38);
    ctx.fillStyle='#3344DD';ctx.fillRect(px+14,py+20+bob,2,h-42); // lapel left
    ctx.fillRect(px+w-16,py+20+bob,2,h-42); // lapel right
    ctx.fillStyle='#DDD';ctx.fillRect(sx-1,py+20+bob,2,h-40); // tie
    ctx.fillStyle='#FF4444';ctx.fillRect(sx-2,py+22+bob,4,8); // red tie knot
    // Arms
    ctx.fillStyle='#4455FF';ctx.fillRect(px+1,py+18+bob-as,10,12);ctx.fillRect(px+w-11,py+18+bob+as,10,12);
    ctx.fillStyle=C.skin;ctx.fillRect(px+2,py+28+bob-as,8,8);ctx.fillRect(px+w-10,py+28+bob+as,8,8);
    // Head
    ctx.fillStyle=C.skin;ctx.fillRect(px+12,py+4+bob,w-24,16);ctx.fillRect(px+14,py+18+bob,w-28,4);
    ctx.fillStyle='#222';ctx.fillRect(px+10,py+bob,w-20,8); // dark slicked hair
    // Nervous sweat drop
    const st=performance.now()/800;
    if(Math.sin(st)>0.3){ctx.fillStyle='rgba(100,180,255,0.7)';ctx.fillRect(px+w-12,py+6+bob,3,5);}
    // Eyes — wide, nervous
    ctx.fillStyle=C.white;ctx.fillRect(px+15+eyeOff,py+9+bob,7,6);ctx.fillRect(px+w-22+eyeOff,py+9+bob,7,6);
    ctx.fillStyle=C.black;ctx.fillRect(px+18+eyeOff,py+11+bob,3,3);ctx.fillRect(px+w-20+eyeOff,py+11+bob,3,3);
    ctx.fillStyle='#D09070';ctx.fillRect(px+20,py+16+bob,w-40,2);
  }
  else if(n.name==='Mayor Keynesian'){
    // Legs — grey trousers
    ctx.fillStyle='#555';ctx.fillRect(px+12+lo,py+h-20,10,16);ctx.fillRect(px+w-22-lo,py+h-20,10,16);
    ctx.fillStyle='#333';ctx.fillRect(px+10+lo,py+h-6,14,6);ctx.fillRect(px+w-24-lo,py+h-6,14,6);
    // Body — grey suit, white shirt front
    ctx.fillStyle='#777';ctx.fillRect(px+8,py+18+bob,w-16,h-38);
    ctx.fillStyle='#EEE';ctx.fillRect(px+16,py+20+bob,w-32,h-42); // white shirt
    ctx.fillStyle='#333';ctx.fillRect(sx-1,py+20+bob,2,h-40); // black tie
    // Gold pocket watch chain
    ctx.fillStyle='#FFD700';ctx.fillRect(px+12,py+30+bob,8,2);
    // Arms
    ctx.fillStyle='#777';ctx.fillRect(px+1,py+18+bob-as,10,12);ctx.fillRect(px+w-11,py+18+bob+as,10,12);
    ctx.fillStyle=C.skin;ctx.fillRect(px+2,py+28+bob-as,8,8);ctx.fillRect(px+w-10,py+28+bob+as,8,8);
    // Head
    ctx.fillStyle=C.skin;ctx.fillRect(px+12,py+4+bob,w-24,16);ctx.fillRect(px+14,py+18+bob,w-28,4);
    ctx.fillStyle='#AAA';ctx.fillRect(px+10,py+bob,w-20,8); // grey hair
    // Top hat
    ctx.fillStyle='#222';ctx.fillRect(px+12,py-10+bob,w-24,12);ctx.fillRect(px+8,py+bob,w-16,4); // brim
    // Monocle
    ctx.strokeStyle='#FFD700';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(px+w-18+eyeOff,py+11+bob,5,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle='rgba(200,220,255,0.3)';ctx.beginPath();ctx.arc(px+w-18+eyeOff,py+11+bob,4,0,Math.PI*2);ctx.fill();
    // Eyes
    ctx.fillStyle=C.white;ctx.fillRect(px+16+eyeOff,py+10+bob,5,4);ctx.fillRect(px+w-22+eyeOff,py+9+bob,6,5);
    ctx.fillStyle=C.black;ctx.fillRect(px+18+eyeOff,py+11+bob,2,2);ctx.fillRect(px+w-20+eyeOff,py+10+bob,3,3);
    ctx.fillStyle='#B09070';ctx.fillRect(px+20,py+16+bob,w-40,2);
  }
  else if(n.name==='Ruby'){
    // Legs — work jeans
    ctx.fillStyle='#3A4A6A';ctx.fillRect(px+12+lo,py+h-20,10,16);ctx.fillRect(px+w-22-lo,py+h-20,10,16);
    ctx.fillStyle='#5A3818';ctx.fillRect(px+10+lo,py+h-6,14,6);ctx.fillRect(px+w-24-lo,py+h-6,14,6); // work boots
    // Body — red work shirt + apron
    ctx.fillStyle='#CC4444';ctx.fillRect(px+8,py+18+bob,w-16,h-38);
    ctx.fillStyle='#8B6A40';ctx.fillRect(px+12,py+26+bob,w-24,h-48); // brown apron
    ctx.fillStyle='#6A4A20';ctx.fillRect(px+12,py+24+bob,w-24,4); // apron top strap
    // Tool belt
    ctx.fillStyle='#4A3010';ctx.fillRect(px+10,py+38+bob,w-20,4);
    ctx.fillStyle='#888';ctx.fillRect(px+14,py+36+bob,4,6); // wrench
    ctx.fillStyle='#AAA';ctx.fillRect(px+w-18,py+36+bob,3,6); // screwdriver
    // Arms
    ctx.fillStyle='#CC4444';ctx.fillRect(px+1,py+18+bob-as,10,12);ctx.fillRect(px+w-11,py+18+bob+as,10,12);
    ctx.fillStyle=C.skin;ctx.fillRect(px+2,py+28+bob-as,8,8);ctx.fillRect(px+w-10,py+28+bob+as,8,8);
    // Head
    ctx.fillStyle=C.skin;ctx.fillRect(px+12,py+4+bob,w-24,16);ctx.fillRect(px+14,py+18+bob,w-28,4);
    ctx.fillStyle='#FF6644';ctx.fillRect(px+10,py+bob,w-20,8); // orange hair
    ctx.fillRect(px+8,py+2+bob,5,12);ctx.fillRect(px+w-13,py+2+bob,5,12); // side hair
    // Bandana
    ctx.fillStyle='#CC2222';ctx.fillRect(px+10,py+bob,w-20,4);
    // Eyes
    ctx.fillStyle=C.white;ctx.fillRect(px+16+eyeOff,py+10+bob,6,5);ctx.fillRect(px+w-22+eyeOff,py+10+bob,6,5);
    ctx.fillStyle='#442200';ctx.fillRect(px+18+eyeOff,py+11+bob,3,3);ctx.fillRect(px+w-20+eyeOff,py+11+bob,3,3);
    ctx.fillStyle='#D09070';ctx.fillRect(px+20,py+16+bob,w-40,2);
  }
  else if(n.name==='The Hermit'){
    // Legs — hidden under cloak
    ctx.fillStyle='#2A3A2A';ctx.fillRect(px+12+lo,py+h-16,10,12);ctx.fillRect(px+w-22-lo,py+h-16,10,12);
    ctx.fillStyle='#3A2A18';ctx.fillRect(px+10+lo,py+h-6,14,6);ctx.fillRect(px+w-24-lo,py+h-6,14,6); // leather boots
    // Body — dark green cloak
    ctx.fillStyle='#2A4A2A';ctx.fillRect(px+6,py+12+bob,w-12,h-28);
    ctx.fillStyle='#1A3A1A';ctx.fillRect(px+6,py+12+bob,w-12,6); // cloak collar
    // Cloak drape effect
    ctx.fillStyle='rgba(0,0,0,0.15)';ctx.fillRect(px+8,py+20+bob,4,h-36);ctx.fillRect(px+w-12,py+20+bob,4,h-36);
    // Rope belt
    ctx.fillStyle='#8A7A50';ctx.fillRect(px+10,py+34+bob,w-20,3);
    // No visible arms (hidden in cloak)
    // Head
    ctx.fillStyle=C.skin;ctx.fillRect(px+14,py+6+bob,w-28,14);
    // Hood
    ctx.fillStyle='#2A4A2A';ctx.fillRect(px+8,py-4+bob,w-16,14);
    ctx.fillRect(px+6,py+bob,w-12,6); // hood overhang
    // Grey beard
    ctx.fillStyle='#888';ctx.fillRect(px+16,py+14+bob,w-32,8);
    ctx.fillRect(px+18,py+20+bob,w-36,4); // longer beard
    // Eyes — deep set, mysterious
    ctx.fillStyle='#8A8';ctx.fillRect(px+18+eyeOff,py+9+bob,4,3);ctx.fillRect(px+w-22+eyeOff,py+9+bob,4,3); // green eyes
  }
  else if(n.name==='Saylor'){
    // Legs — navy suit pants
    ctx.fillStyle='#1A1A4B';ctx.fillRect(px+12+lo,py+h-20,10,16);ctx.fillRect(px+w-22-lo,py+h-20,10,16);
    ctx.fillStyle='#111';ctx.fillRect(px+10+lo,py+h-6,14,6);ctx.fillRect(px+w-24-lo,py+h-6,14,6); // polished shoes
    // Body — navy power suit
    ctx.fillStyle='#1A1A6B';ctx.fillRect(px+8,py+18+bob,w-16,h-38);
    ctx.fillStyle='#EEE';ctx.fillRect(px+16,py+20+bob,w-32,h-42); // white shirt
    ctx.fillStyle='#F7931A';ctx.fillRect(sx-2,py+20+bob,4,h-42); // ORANGE tie (Bitcoin orange!)
    // Power shoulders
    ctx.fillStyle='#1A1A6B';ctx.fillRect(px+4,py+18+bob,w-8,6);
    // Arms
    ctx.fillStyle='#1A1A6B';ctx.fillRect(px+1,py+18+bob-as,10,12);ctx.fillRect(px+w-11,py+18+bob+as,10,12);
    ctx.fillStyle=C.skin;ctx.fillRect(px+2,py+28+bob-as,8,8);ctx.fillRect(px+w-10,py+28+bob+as,8,8);
    // Head
    ctx.fillStyle=C.skin;ctx.fillRect(px+12,py+4+bob,w-24,16);ctx.fillRect(px+14,py+18+bob,w-28,4);
    ctx.fillStyle='#333';ctx.fillRect(px+10,py+bob,w-20,8);
    ctx.fillRect(px+10,py+2+bob,4,6); // sideburns
    // LASER EYES
    const lt=performance.now()/200;
    const laserAlpha=0.5+Math.sin(lt)*0.3;
    ctx.fillStyle=C.white;ctx.fillRect(px+16+eyeOff,py+10+bob,6,5);ctx.fillRect(px+w-22+eyeOff,py+10+bob,6,5);
    ctx.fillStyle=`rgba(247,147,26,${laserAlpha})`;
    ctx.fillRect(px+17+eyeOff,py+10+bob,4,4);ctx.fillRect(px+w-21+eyeOff,py+10+bob,4,4);
    // Laser beam glow
    ctx.fillStyle=`rgba(247,147,26,${laserAlpha*0.3})`;
    ctx.fillRect(px+15,py+8+bob,8,2);ctx.fillRect(px+w-23,py+8+bob,8,2);
    ctx.fillStyle='#D09070';ctx.fillRect(px+20,py+16+bob,w-40,2);
  }
  else if(n.name==='Pizza Pete'){
    // Legs — kitchen pants
    ctx.fillStyle='#555';ctx.fillRect(px+12+lo,py+h-20,10,16);ctx.fillRect(px+w-22-lo,py+h-20,10,16);
    ctx.fillStyle='#444';ctx.fillRect(px+10+lo,py+h-6,14,6);ctx.fillRect(px+w-24-lo,py+h-6,14,6);
    // Body — white chef coat with stains
    ctx.fillStyle='#EEE';ctx.fillRect(px+8,py+18+bob,w-16,h-38);
    ctx.fillStyle='#CC8800';ctx.fillRect(px+12,py+26+bob,6,4); // cheese stain
    ctx.fillStyle='#CC3300';ctx.fillRect(px+w-18,py+30+bob,4,4); // sauce stain
    // Apron
    ctx.fillStyle='#DDD';ctx.fillRect(px+12,py+28+bob,w-24,h-48);
    ctx.fillStyle='#CCC';ctx.fillRect(px+16,py+26+bob,w-32,4); // apron strap
    // Arms
    ctx.fillStyle='#EEE';ctx.fillRect(px+1,py+18+bob-as,10,12);ctx.fillRect(px+w-11,py+18+bob+as,10,12);
    ctx.fillStyle=C.skin;ctx.fillRect(px+2,py+28+bob-as,8,8);ctx.fillRect(px+w-10,py+28+bob+as,8,8);
    // Head
    ctx.fillStyle=C.skin;ctx.fillRect(px+12,py+4+bob,w-24,16);ctx.fillRect(px+14,py+18+bob,w-28,4);
    ctx.fillStyle='#664400';ctx.fillRect(px+10,py+bob,w-20,8);
    // Chef hat
    ctx.fillStyle='#FFF';ctx.fillRect(px+10,py-2+bob,w-20,6); // hat band
    ctx.fillRect(px+12,py-12+bob,w-24,12); // tall hat
    ctx.fillStyle='#EEE';ctx.fillRect(px+14,py-10+bob,w-28,8); // hat crease
    // Eyes + mustache
    ctx.fillStyle=C.white;ctx.fillRect(px+16+eyeOff,py+10+bob,6,5);ctx.fillRect(px+w-22+eyeOff,py+10+bob,6,5);
    ctx.fillStyle=C.black;ctx.fillRect(px+18+eyeOff,py+11+bob,3,3);ctx.fillRect(px+w-20+eyeOff,py+11+bob,3,3);
    ctx.fillStyle='#664400';ctx.fillRect(px+16,py+15+bob,w-32,3); // mustache
    ctx.fillStyle='#D09070';ctx.fillRect(px+20,py+17+bob,w-40,2);
  }
  else if(n.name==='Farmer Pete'){
    // Legs — denim overalls continue
    ctx.fillStyle='#3A5A8A';ctx.fillRect(px+12+lo,py+h-20,10,16);ctx.fillRect(px+w-22-lo,py+h-20,10,16);
    ctx.fillStyle='#5A3818';ctx.fillRect(px+10+lo,py+h-6,14,6);ctx.fillRect(px+w-24-lo,py+h-6,14,6); // muddy boots
    // Body — plaid shirt + overalls
    ctx.fillStyle='#CC4444';ctx.fillRect(px+8,py+18+bob,w-16,h-38); // red plaid base
    ctx.fillStyle='rgba(0,0,0,0.12)';for(let i=0;i<4;i++){ctx.fillRect(px+8,py+20+bob+i*6,w-16,2);} // plaid lines
    ctx.fillStyle='#3A5A8A';ctx.fillRect(px+12,py+24+bob,w-24,h-44); // overalls front
    // Suspender straps
    ctx.fillStyle='#3A5A8A';ctx.fillRect(px+14,py+18+bob,4,8);ctx.fillRect(px+w-18,py+18+bob,4,8);
    // Arms
    ctx.fillStyle='#CC4444';ctx.fillRect(px+1,py+18+bob-as,10,12);ctx.fillRect(px+w-11,py+18+bob+as,10,12);
    ctx.fillStyle=C.skin;ctx.fillRect(px+2,py+28+bob-as,8,8);ctx.fillRect(px+w-10,py+28+bob+as,8,8);
    // Head
    ctx.fillStyle=C.skin;ctx.fillRect(px+12,py+4+bob,w-24,16);ctx.fillRect(px+14,py+18+bob,w-28,4);
    ctx.fillStyle='#886633';ctx.fillRect(px+10,py+bob,w-20,8);
    // Straw hat
    ctx.fillStyle='#D4B060';ctx.fillRect(px+6,py+bob,w-12,4); // wide brim
    ctx.fillRect(px+12,py-6+bob,w-24,8); // hat top
    ctx.fillStyle='#C4A050';ctx.fillRect(px+12,py-2+bob,w-24,3); // hat band
    // Eyes
    ctx.fillStyle=C.white;ctx.fillRect(px+16+eyeOff,py+10+bob,6,5);ctx.fillRect(px+w-22+eyeOff,py+10+bob,6,5);
    ctx.fillStyle='#442200';ctx.fillRect(px+18+eyeOff,py+11+bob,3,3);ctx.fillRect(px+w-20+eyeOff,py+11+bob,3,3);
    ctx.fillStyle='#D09070';ctx.fillRect(px+20,py+16+bob,w-40,2);
  }
  else if(n.name==='Seed Sally'){
    // Legs — garden pants
    ctx.fillStyle='#5A7A3A';ctx.fillRect(px+12+lo,py+h-20,10,16);ctx.fillRect(px+w-22-lo,py+h-20,10,16);
    ctx.fillStyle='#886633';ctx.fillRect(px+10+lo,py+h-6,14,6);ctx.fillRect(px+w-24-lo,py+h-6,14,6); // garden clogs
    // Body — green gardening top + floral apron
    ctx.fillStyle='#44AA44';ctx.fillRect(px+8,py+18+bob,w-16,h-38);
    ctx.fillStyle='#EED8AA';ctx.fillRect(px+12,py+26+bob,w-24,h-48); // cream apron
    // Flower embroidery on apron
    ctx.fillStyle='#E04060';ctx.fillRect(px+16,py+32+bob,4,4);
    ctx.fillStyle='#40A0E0';ctx.fillRect(px+26,py+34+bob,4,4);
    ctx.fillStyle='#E0C040';ctx.fillRect(px+20,py+38+bob,4,4);
    // Arms
    ctx.fillStyle='#44AA44';ctx.fillRect(px+1,py+18+bob-as,10,12);ctx.fillRect(px+w-11,py+18+bob+as,10,12);
    ctx.fillStyle=C.skin;ctx.fillRect(px+2,py+28+bob-as,8,8);ctx.fillRect(px+w-10,py+28+bob+as,8,8);
    // Head
    ctx.fillStyle=C.skin;ctx.fillRect(px+12,py+4+bob,w-24,16);ctx.fillRect(px+14,py+18+bob,w-28,4);
    ctx.fillStyle='#886633';ctx.fillRect(px+10,py+bob,w-20,8);
    ctx.fillRect(px+8,py+2+bob,5,14);ctx.fillRect(px+w-13,py+2+bob,5,14); // long brown hair
    // Sun hat with flower
    ctx.fillStyle='#E8D8A0';ctx.fillRect(px+4,py-2+bob,w-8,4); // wide brim
    ctx.fillRect(px+12,py-8+bob,w-24,8); // hat top
    ctx.fillStyle='#FF6688';ctx.fillRect(px+w-16,py-6+bob,6,6); // flower on hat
    ctx.fillStyle='#FFDD44';ctx.fillRect(px+w-14,py-4+bob,2,2); // flower center
    // Eyes
    ctx.fillStyle=C.white;ctx.fillRect(px+16+eyeOff,py+10+bob,6,5);ctx.fillRect(px+w-22+eyeOff,py+10+bob,6,5);
    ctx.fillStyle='#228844';ctx.fillRect(px+18+eyeOff,py+11+bob,3,3);ctx.fillRect(px+w-20+eyeOff,py+11+bob,3,3); // green eyes
    ctx.fillStyle='#D09070';ctx.fillRect(px+20,py+16+bob,w-40,2);
  }
  else {
    // Default NPC (fallback)
    ctx.fillStyle='#3A4A6A';ctx.fillRect(px+12+lo,py+h-20,10,16);ctx.fillRect(px+w-22-lo,py+h-20,10,16);
    ctx.fillStyle='#4A3018';ctx.fillRect(px+10+lo,py+h-6,14,6);ctx.fillRect(px+w-24-lo,py+h-6,14,6);
    ctx.fillStyle=n.col;ctx.fillRect(px+8,py+18+bob,w-16,h-38);
    ctx.fillStyle=n.col;ctx.fillRect(px+1,py+18+bob-as,10,12);ctx.fillRect(px+w-11,py+18+bob+as,10,12);
    ctx.fillStyle=C.skin;ctx.fillRect(px+2,py+28+bob-as,8,8);ctx.fillRect(px+w-10,py+28+bob+as,8,8);
    ctx.fillStyle=C.skin;ctx.fillRect(px+12,py+4+bob,w-24,16);ctx.fillRect(px+14,py+18+bob,w-28,4);
    ctx.fillStyle=n.hair;ctx.fillRect(px+10,py+bob,w-20,8);
    ctx.fillStyle=C.white;ctx.fillRect(px+16+eyeOff,py+10+bob,6,5);ctx.fillRect(px+w-22+eyeOff,py+10+bob,6,5);
    ctx.fillStyle=C.black;ctx.fillRect(px+18+eyeOff,py+11+bob,3,3);ctx.fillRect(px+w-20+eyeOff,py+11+bob,3,3);
    ctx.fillStyle='#D09070';ctx.fillRect(px+20,py+16+bob,w-40,2);
  }
  // Quest markers
  initRelationships();
  const rel=relationships[n.name];
  if(rel){
    const t=performance.now()/1000;
    const bob=Math.sin(t*2.5)*4; // bobbing animation
    const markerY=py-22+bob;
    if(rel.hearts>=10){
      // Max hearts — green heart
      ctx.fillStyle='#44FF88';ctx.font=`bold 18px serif`;ctx.textAlign='center';
      ctx.fillText('♥',sx,markerY);
    } else if(n.name==='The Hermit'&&foundWords.length<5){
      // Seed fragment hint — orange puzzle
      ctx.font=`16px serif`;ctx.textAlign='center';
      ctx.fillText('🧩',sx,markerY);
    } else if(rel.talked===false){
      // Hasn't talked today — yellow !
      ctx.fillStyle='#FFD700';
      ctx.shadowColor='rgba(0,0,0,0.8)';ctx.shadowBlur=3;
      ctx.font=`bold 20px ${FONT}`;ctx.textAlign='center';
      ctx.fillText('!',sx,markerY);
      ctx.shadowBlur=0;
    }
  }
  const dist=Math.hypot(n.x-player.x,n.y-player.y);
  if(dist<48){
    ctx.fillStyle=C.white;ctx.font=`bold 13px ${FONT}`;ctx.textAlign='center';ctx.fillText(n.name,sx,py-8);
    ctx.fillStyle=C.gray;ctx.font=`12px ${FONT}`;
    ctx.fillText(n.role==='shop'||n.role==='seeds'?'[E] Talk  [B] Shop':n.role==='market'?'[E] Talk  [B] Sell Crops':'[E] Talk',sx,py-20);
  }
}

function drawRig(r){
  const sx=r.x*SCALE-cam.x,sy=r.y*SCALE-cam.y;
  const w=ST+8,h=ST+4,rx=sx-w/2,ry=sy-h/2;
  if(sx>canvas.width+w||sy>canvas.height+h||sx<-w||sy<-h)return;
  
  const t = performance.now()/1000;
  const active = r.powered && r.dur > 0 && !r.oh;
  
  // Heat glow
  if(r.temp>60){const i=(r.temp-60)/40;ctx.fillStyle=`rgba(255,${Math.floor(80-i*80)},0,${i*.25})`;
    ctx.beginPath();ctx.ellipse(sx,sy,w*.8,h*.7,0,0,Math.PI*2);ctx.fill();}
  
  // Shadow
  ctx.fillStyle='rgba(0,0,0,0.2)';ctx.beginPath();ctx.ellipse(sx,sy+h/2+3,w*.4,5,0,0,Math.PI*2);ctx.fill();
  
  if(r.tier===0){
    // CPU MINER — looks like a desktop tower
    ctx.fillStyle='#4A4A50';ctx.fillRect(rx+4,ry+4,w-8,h-8); // body
    ctx.fillStyle='#3A3A40';ctx.fillRect(rx+4,ry+4,w-8,6); // top
    ctx.fillStyle='#555560';ctx.fillRect(rx+6,ry+12,w-12,2); // seam
    // Vent holes
    ctx.fillStyle='#333338';
    for(let i=0;i<5;i++) ctx.fillRect(rx+10+i*7,ry+18,4,16);
    // Power supply
    ctx.fillStyle='#2A2A30';ctx.fillRect(rx+6,ry+h-14,18,8);
    // Front panel
    ctx.fillStyle='#555';ctx.fillRect(rx+w-16,ry+14,8,20);
    // LED
    ctx.fillStyle=active?(r.af%2?'#0F0':'#0C0'):'#300';
    ctx.fillRect(rx+w-14,ry+16,4,3);
    // Orange power LED
    ctx.fillStyle=r.powered?C.orange:'#330';ctx.fillRect(rx+w-14,ry+22,4,3);
  }
  else if(r.tier===1){
    // GPU RIG — open frame with multiple cards
    // Frame
    ctx.fillStyle='#444450';ctx.fillRect(rx+2,ry+h-10,w-4,8); // base
    ctx.fillStyle='#3A3A44';ctx.fillRect(rx+4,ry+4,4,h-14); // left post
    ctx.fillStyle='#3A3A44';ctx.fillRect(rx+w-8,ry+4,4,h-14); // right post
    ctx.fillStyle='#3A3A44';ctx.fillRect(rx+2,ry+2,w-4,4); // top bar
    // GPU cards (vertical)
    const cardColors = ['#556688','#558866','#665588','#886655'];
    for(let i=0;i<4;i++){
      const cx=rx+10+i*10;
      ctx.fillStyle=cardColors[i];ctx.fillRect(cx,ry+8,8,h-20);
      // Fan on card
      ctx.fillStyle='#333';ctx.beginPath();ctx.arc(cx+4,ry+20,3,0,Math.PI*2);ctx.fill();
      if(active){ctx.strokeStyle='#555';ctx.lineWidth=1;ctx.beginPath();
        ctx.arc(cx+4,ry+20,3,t*8+i,t*8+i+2);ctx.stroke();}
    }
    // LEDs
    ctx.fillStyle=active?'#0F0':'#300';ctx.fillRect(rx+6,ry+6,3,3);
    ctx.fillStyle=r.oh?'#F00':(r.powered?C.orange:'#330');ctx.fillRect(rx+w-10,ry+6,3,3);
  }
  else{
    // ASIC S21 — sleek black box with front/back fans
    ctx.fillStyle='#1A1A1E';ctx.fillRect(rx+2,ry+4,w-4,h-8); // main body
    ctx.fillStyle='#222226';ctx.fillRect(rx+2,ry+4,w-4,5); // top lip
    // Gold accent stripe (Bitcoin orange)
    ctx.fillStyle=C.orange;ctx.fillRect(rx+2,ry+h/2-1,w-4,3);
    // Front fan grille
    ctx.fillStyle='#111';ctx.fillRect(rx+4,ry+10,14,h-22);
    if(active){
      ctx.strokeStyle='#333';ctx.lineWidth=1;
      ctx.beginPath();ctx.arc(rx+11,ry+h/2-2,6,t*12,t*12+4);ctx.stroke();
      ctx.beginPath();ctx.arc(rx+11,ry+h/2-2,6,t*12+2,t*12+6);ctx.stroke();
    }
    // Back fan grille
    ctx.fillStyle='#111';ctx.fillRect(rx+w-18,ry+10,14,h-22);
    if(active){
      ctx.strokeStyle='#333';ctx.lineWidth=1;
      ctx.beginPath();ctx.arc(rx+w-11,ry+h/2-2,6,t*10,t*10+4);ctx.stroke();
    }
    // Hash board indicators
    for(let i=0;i<3;i++){
      ctx.fillStyle=active?(i<2?'#0A0':'#0F0'):'#200';
      ctx.fillRect(rx+22+i*6,ry+8,4,3);
    }
    // Model text
    ctx.fillStyle='#444';ctx.font=`bold 8px ${FONT}`;ctx.textAlign='center';
    ctx.fillText('S21',sx,ry+h-6);
    // Power connectors
    ctx.fillStyle='#333';ctx.fillRect(rx+w-8,ry+h-12,6,4);ctx.fillRect(rx+w-8,ry+h-18,6,4);
  }
  
  // Mining particles when active
  if(active && Math.random()<0.05){
    ctx.fillStyle=`rgba(247,147,26,${0.3+Math.random()*0.3})`;
    ctx.beginPath();ctx.arc(sx-8+Math.random()*16,ry-2-Math.random()*8,1+Math.random()*2,0,Math.PI*2);ctx.fill();
  }
  
  // Tier label
  ctx.fillStyle=C.white;ctx.font=`bold 12px ${FONT}`;ctx.textAlign='center';
  ctx.fillText(['CPU','GPU','ASIC'][r.tier],sx,ry-6);
  
  // Status
  ctx.fillStyle=r.statusCol();ctx.font=`bold 13px ${FONT}`;
  ctx.fillText(r.status(),sx,ry-20);
  
  // Proximity details
  const dist=Math.hypot(r.x-player.x,r.y-player.y);
  if(dist<48){
    // Temp bar
    const bw=w-4,pct=(r.temp-15)/85;
    ctx.fillStyle='#1A1A1A';ctx.fillRect(rx+2,ry+h+4,bw,5);
    ctx.fillStyle=pct>.8?C.red:pct>.5?C.ledOrange:C.green;
    ctx.fillRect(rx+2,ry+h+4,bw*pct,5);
    ctx.fillStyle='#888';ctx.font=`11px ${FONT}`;
    ctx.fillText(`${r.temp.toFixed(0)}°C`,sx,ry+h+16);
    // Action prompt
    ctx.fillStyle=C.gray;ctx.font=`13px ${FONT}`;
    ctx.fillText(hasItem('wrench')&&r.dur<100?'[E] Repair':'[E] Toggle',sx,ry-32);
  }
}

// ============================================================
// HUD
// ============================================================
function drawHUD(){
  const p=14;
  // Main panel
  panel(p,p,290,256);
  let y=p+18;
  // Sats counter with earning indicator
  const isEarning = rigs.some(r=>r.powered&&!r.oh&&r.dur>0);
  const pulse = isEarning ? 1 + Math.sin(performance.now()/200)*0.08 : 1;
  ctx.fillStyle=C.hud;ctx.font=`bold ${Math.floor(18*pulse)}px ${FONT}`;ctx.textAlign='left';
  ctx.fillText(`₿ ${fmt(player.wallet)} sats`,p+12,y);
  if(isEarning){ctx.fillStyle=C.green;ctx.font=`bold 13px ${FONT}`;ctx.fillText(' ⛏️ MINING',p+12+ctx.measureText(`₿ ${fmt(player.wallet)} sats`).width+8,y);}
  y+=22;
  ctx.font=`15px ${FONT}`;ctx.fillStyle='#CCC';
  ctx.fillText(`${getTimeStr()}${time.spd>1?' ⏩':''}`,p+12,y);y+=16;
  ctx.fillText(`Day ${time.day} — ${getPeriod()}`,p+12,y);y+=16;
  const weatherEmoji = {sunny:'☀️',cloudy:'☁️',rain:'🌧️',storm:'⛈️'}[weather.current];
  ctx.fillText(weatherEmoji + ' ' + weather.current.charAt(0).toUpperCase() + weather.current.slice(1), p+12, y); y+=18;
  const th=rigs.reduce((s,r)=>s+(r.powered&&!r.oh&&r.dur>0?r.hr:0),0);
  ctx.fillText(`⚡ ${th.toFixed(1)} TH/s | Diff ${econ.diff.toFixed(1)}`,p+12,y);y+=16;
  ctx.fillStyle=pwr.gen>=pwr.use?C.green:C.red;
  ctx.fillText(`Power: ${pwr.gen.toFixed(1)}/${pwr.use.toFixed(1)} kW`,p+12,y);
  if(pwr.maxStore>0){ctx.fillStyle='#CCC';ctx.fillText(`🔋${pwr.stored.toFixed(0)}/${pwr.maxStore}`,p+160,y);}y+=18;
  ctx.fillStyle=C.phaseCol[econ.phase];ctx.font=`bold 15px ${FONT}`;ctx.fillText(econ.phaseN[econ.phase],p+12,y);y+=14;
  ctx.fillStyle=C.gray;ctx.font=`13px ${FONT}`;
  ctx.fillText(`Day ${econ.pd+1}/28 | Cycle ${econ.cycle+1} | ₿${econ.halvings}`,p+12,y);y+=14;
  ctx.fillText(`Rigs: ${rigs.length} | Earned: ${fmt(player.totalEarned)}`,p+12,y);y+=14;
  // Citadel tier display
  const ct=CITADEL_TIERS[citadelTier];
  ctx.fillStyle=C.orange;ctx.font=`bold 13px ${FONT}`;
  ctx.fillText(`${ct.icon} ${ct.name} Lv${citadelTier+1}`,p+12,y);
  if(isNearHome()){ctx.fillStyle=C.gray;ctx.font=`11px ${FONT}`;ctx.fillText('[C] Citadel Menu',p+12,y+12);}
  // Interior building label
  if(interior){
    const iName={home:'🏠 Home',shop:"🏪 Ruby's Shop",tavern:'🍺 Hodl Tavern',shed:'⛏️ Mining Shed',hall:'🏛️ Town Hall'};
    ctx.fillStyle=C.hud;ctx.font=`bold 14px ${FONT}`;ctx.textAlign='left';
    ctx.fillText(iName[interior.type]||interior.type, p+12, y+28);
    // Exit prompt at bottom of screen
    ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(canvas.width/2-80,canvas.height-90,160,24);
    ctx.fillStyle=C.orange;ctx.font=`bold 13px ${FONT}`;ctx.textAlign='center';
    ctx.fillText('↓ Walk south to exit ↓',canvas.width/2,canvas.height-73);
  }
  
  // Hotbar
  const hbW=44,hbH=44,hbGap=4,hbN=10;
  const hbTW=hbN*(hbW+hbGap);const hbX=(canvas.width-hbTW)/2,hbY=canvas.height-hbH-20;
  ctx.fillStyle='rgba(8,8,12,0.7)';rr(hbX-4,hbY-4,hbTW+8,hbH+8,6);
  for(let i=0;i<hbN;i++){
    const x=hbX+i*(hbW+hbGap);
    ctx.fillStyle=i===selSlot?'rgba(247,147,26,.25)':'rgba(20,20,25,.8)';ctx.fillRect(x,hbY,hbW,hbH);
    ctx.strokeStyle=i===selSlot?C.hud:'#333';ctx.lineWidth=i===selSlot?2:1;ctx.strokeRect(x,hbY,hbW,hbH);
    ctx.fillStyle='#444';ctx.font=`11px ${FONT}`;ctx.textAlign='left';ctx.fillText(`${(i+1)%10}`,x+3,hbY+10);
    const sl=inv[i];if(sl&&ITEMS[sl.id]){
      const sprName = ITEM_SPRITES[sl.id];
      if(sprName && SpriteCache[sprName]){drawSprite(sprName,x+6,hbY+6,2);}
      else{ctx.font='20px serif';ctx.textAlign='center';ctx.fillText(ITEMS[sl.id].icon,x+hbW/2,hbY+hbH/2+6);}
      if(sl.qty>1){ctx.fillStyle=C.white;ctx.font=`bold 12px ${FONT}`;ctx.fillText(sl.qty,x+hbW-8,hbY+hbH-4);}}
  }
  
  // Controls hint
  // Controls bar (always visible, readable)
  const cbY = canvas.height - 18;
  ctx.fillStyle='rgba(0,0,0,0.6)';ctx.fillRect(0,cbY-4,canvas.width,22);
  ctx.fillStyle='#999';ctx.font=`bold 12px ${FONT}`;ctx.textAlign='center';
  ctx.fillText('WASD:Move  E:Interact  R:Use/Plant  T:Craft  H:Harvest  I:Inventory  B:Shop  C:Citadel  O:Quests  K:Skills  M:Music  ?:Help  P:Save',canvas.width/2,cbY+8);
  
  // Energy
  const ebW=100,ebX=canvas.width-ebW-p-10,ebY=hbY-18;
  ctx.fillStyle='#1A1A20';ctx.fillRect(ebX,ebY,ebW,8);ctx.fillStyle=player.energy>30?C.green:C.red;
  ctx.fillRect(ebX,ebY,ebW*(player.energy/player.maxEnergy),8);
  ctx.fillStyle='#AAA';ctx.font=`11px ${FONT}`;ctx.textAlign='right';ctx.fillText(`Energy: ${Math.floor(player.energy)}`,ebX+ebW,ebY-2);
  
  // Rig detail
  let nr=null,nd=60;for(const r of rigs){const d=Math.hypot(r.x-player.x,r.y-player.y);if(d<nd){nr=r;nd=d;}}
  if(nr){const rw=220,rh=110,rx=canvas.width-rw-p;panel(rx,p,rw,rh);
    ctx.fillStyle=C.hud;ctx.font=`bold 15px ${FONT}`;ctx.textAlign='left';ctx.fillText(Rig.N[nr.tier],rx+10,p+18);
    ctx.font=`13px ${FONT}`;ctx.fillStyle='#CCC';
    ctx.fillText(`Temp: ${nr.temp.toFixed(0)}°C`,rx+10,p+36);ctx.fillText(`Hash: ${nr.hr.toFixed(1)} TH/s`,rx+10,p+52);
    ctx.fillText(`Durability: ${nr.dur.toFixed(0)}%`,rx+10,p+68);ctx.fillText(`Mined: ${fmt(nr.mined)} sats`,rx+10,p+84);
    ctx.fillStyle=nr.statusCol();ctx.fillText(`Status: ${nr.status()}`,rx+10,p+100);}
  
  // Tutorial
  if(!tutorialDone&&tutorialStep<TUTORIAL_STEPS.length){
    const tut = TUTORIAL_STEPS[tutorialStep];
    const tw=Math.min(650,canvas.width-60),th=58;
    const tx=(canvas.width-tw)/2,ty=canvas.height*0.14;
    
    // Tutorial box
    panel(tx,ty,tw,th);
    
    // Progress dots
    for(let i=0;i<TUTORIAL_STEPS.length;i++){
      ctx.fillStyle=i<tutorialStep?C.orange:i===tutorialStep?C.gold:'#333';
      ctx.beginPath();ctx.arc(tx+16+i*10,ty+8,3,0,Math.PI*2);ctx.fill();
    }
    
    // Message
    ctx.fillStyle=C.white;ctx.font=`bold 14px ${FONT}`;ctx.textAlign='center';
    wrapText(tut.msg,canvas.width/2,ty+32,tw-60,18);
    
    // Step counter
    ctx.fillStyle=C.gray;ctx.font=`12px ${FONT}`;ctx.textAlign='right';
    ctx.fillText(`${tutorialStep+1}/${TUTORIAL_STEPS.length}`,tx+tw-12,ty+th-6);

    // Skip tutorial button
    const skipW=100,skipH=24;
    const skipX=tx+tw-skipW-8,skipY=ty+th+4;
    ctx.fillStyle='rgba(80,20,20,0.7)';rr(skipX,skipY,skipW,skipH,4);
    ctx.fillStyle='#CC6666';ctx.font=`bold 12px ${FONT}`;ctx.textAlign='center';
    ctx.fillText('Skip Tutorial',skipX+skipW/2,skipY+16);

    // Visual guide arrows
    const sx2=player.x*SCALE-cam.x,sy2=player.y*SCALE-cam.y;
    if(tut.highlight==='arrow_west'){drawTutArrow(sx2-70,sy2,'left');}
    else if(tut.highlight==='arrow_south'){drawTutArrow(sx2,sy2+70,'down');}
    else if(tut.highlight==='key_e'||tut.highlight==='key_i'||tut.highlight==='key_b'||tut.highlight==='key_1'){
      const key=tut.highlight.replace('key_','').toUpperCase();
      const pulse=0.5+Math.sin(performance.now()/300)*0.3;
      ctx.fillStyle=`rgba(247,147,26,${pulse})`;ctx.font=`bold 28px ${FONT}`;ctx.textAlign='center';
      ctx.fillText(`[ ${key} ]`,canvas.width/2,ty+th+30);
    }
    else if(tut.highlight==='hotbar'){
      ctx.strokeStyle=`rgba(247,147,26,${0.5+Math.sin(performance.now()/300)*0.3})`;ctx.lineWidth=3;
      const hbX2=(canvas.width-10*48)/2;ctx.strokeRect(hbX2-6,canvas.height-68,10*48+12,56);
    }
    else if(tut.highlight==='hud_sats'){
      ctx.strokeStyle=`rgba(247,147,26,${0.5+Math.sin(performance.now()/300)*0.3})`;ctx.lineWidth=3;
      ctx.strokeRect(p-2,p-2,294,30);
    }
    else if(tut.highlight==='controls'){
      ctx.fillStyle=`rgba(0,0,0,0.6)`;ctx.fillRect(canvas.width-200,canvas.height-220,190,200);
      ctx.fillStyle=C.orange;ctx.font=`bold 14px ${FONT}`;ctx.textAlign='left';
      ctx.fillText('🎮 CONTROLS',canvas.width-190,canvas.height-198);
      ctx.fillStyle=C.white;ctx.font=`13px ${FONT}`;
      ['WASD — Move','E — Interact','R — Use item','I — Inventory','B — Shop','O — Objectives','H — Harvest','K — Skills','? — All controls'].forEach((c,i)=>ctx.fillText(c,canvas.width-190,canvas.height-175+i*20));
    }
  }
  
  // Dialogue
  if(dlg){
    const dw=Math.min(600,canvas.width-60),dh=110;
    const dx=(canvas.width-dw)/2,dy=hbY-dh-24;
    panel(dx,dy,dw,dh);
    ctx.fillStyle=C.hud;ctx.font=`bold 16px ${FONT}`;ctx.textAlign='left';
    ctx.fillText(dlg.name,dx+16,dy+26);
    ctx.fillStyle=C.white;ctx.font=`14px ${FONT}`;ctx.textAlign='left';
    wrapText(dlg.fullText.substring(0,dlg.displayedChars),dx+16,dy+48,dw-40,18);
    ctx.fillStyle=C.gray;ctx.font=`12px ${FONT}`;ctx.textAlign='right';
    ctx.fillText(dlg.done?'[E/Click] Continue':'[E/Click] Skip',dx+dw-16,dy+dh-10);
  }
  
  // Objectives panel
  if(showObjectives){
    let lineCount = objectives.length;
    objectives.forEach(o=>{if(o.chapter)lineCount++;});
    const ow=400,oh=50+lineCount*24+230,ox=(canvas.width-ow)/2,oy=(canvas.height-oh)/2;
    panel(ox,oy,ow,oh);ctx.fillStyle=C.hud;ctx.font=`bold 18px ${FONT}`;ctx.textAlign='center';
    ctx.fillText('📋 Quest Log',canvas.width/2,oy+26);

    // Progress
    const done = objectives.filter(o=>o.done).length;
    ctx.fillStyle=C.gray;ctx.font=`13px ${FONT}`;
    ctx.fillText(`${done}/${objectives.length} complete`,canvas.width/2,oy+42);

    let cy = oy + 58;
    objectives.forEach((o)=>{
      if(o.chapter){
        ctx.fillStyle=C.orange;ctx.font=`bold 14px ${FONT}`;ctx.textAlign='left';
        ctx.fillText(o.chapter,ox+16,cy);cy+=22;
      }
      ctx.fillStyle=o.done?'#5A8A5A':'#CCC';ctx.font=`13px ${FONT}`;ctx.textAlign='left';
      ctx.fillText(`${o.done?'✅':'⬜'} ${o.text}`,ox+28,cy);cy+=22;
    });
    // Seed phrase progress
    cy+=10;
    ctx.fillStyle=C.hud;ctx.font=`bold 14px ${FONT}`;ctx.textAlign='left';
    ctx.fillText('🧩 Seed Phrase ('+foundWords.length+'/24)',ox+16,cy);cy+=20;
    const col2Start=cy;
    for(let i=0;i<24;i++){
      const found=foundWords.includes(i);
      ctx.fillStyle=found?C.orange:'#444';ctx.font=`12px ${FONT}`;ctx.textAlign='left';
      const colX=ox+16+(i>=12?180:0);
      const rowY=i>=12?col2Start+(i-12)*16:cy+i*16;
      ctx.fillText((i+1)+'. '+(found?SEED_WORDS[i].word:'???'),colX,rowY);
    }
    ctx.fillStyle=C.gray;ctx.font=`12px ${FONT}`;ctx.textAlign='center';ctx.fillText('[O] or [Esc] to close',canvas.width/2,oy+oh-10);
  }
  
  // Shop
  if(shopOpen) drawShop();
  if(craftOpen) drawCraftMenu();
  if(citadelMenuOpen) drawCitadelMenu();
  if(invOpen) drawInv();
  if(chestOpen) drawChest();
  if(showSkills) drawSkillsPanel();
  if(showControls) drawControlsPanel();
  if(showDaySummary && daySummary) drawDaySummary();
  if(pauseOpen) drawPauseMenu();

  // Minimap
  if(minimapOpen && !interior){
    const mmW=160, mmH=120, mmX=canvas.width-mmW-12, mmY=12;
    const scaleX=mmW/MAP_W, scaleY=mmH/MAP_H;

    // Background
    ctx.fillStyle='rgba(8,8,12,0.85)';rr(mmX-4,mmY-4,mmW+8,mmH+8,4);
    ctx.strokeStyle='#444';ctx.lineWidth=1;ctx.strokeRect(mmX-4,mmY-4,mmW+8,mmH+8);

    // Terrain (sample every 2 tiles for performance)
    for(let y=0;y<MAP_H;y+=2)for(let x=0;x<MAP_W;x+=2){
      const tile=map[y][x];
      if(tile===T.WATER||tile===T.DEEP) ctx.fillStyle='#2855A0';
      else if(tile===T.STONE||tile===T.CLIFF) ctx.fillStyle='#666';
      else if(tile===T.SAND) ctx.fillStyle='#C4A44A';
      else if(tile===T.PATH||tile===T.BRIDGE) ctx.fillStyle='#8A7A5A';
      else if(tile===T.WALL||tile===T.FLOOR||tile===T.SHOP) ctx.fillStyle='#7A5A30';
      else if(tile===T.DIRT) ctx.fillStyle='#6A5030';
      else ctx.fillStyle='#2A5A1A'; // grass/tallgrass/flowers
      ctx.fillRect(mmX+x*scaleX,mmY+y*scaleY,scaleX*2+1,scaleY*2+1);
    }

    // Buildings (larger colored dots)
    const buildings=[
      {x:homeX,y:homeY,col:'#F7931A',label:'Home'},
      {x:homeX-15,y:homeY-4,col:'#888',label:'Shed'},
      {x:homeX+8,y:homeY+19,col:'#CC4444',label:'Shop'},
      {x:homeX+23,y:homeY+15,col:'#6A3A1A',label:'Tavern'},
      {x:homeX+16,y:homeY-7,col:'#4A4A6A',label:'Hall'},
    ];
    for(const b of buildings){
      ctx.fillStyle=b.col;
      ctx.fillRect(mmX+b.x*scaleX-2,mmY+b.y*scaleY-2,5,5);
    }

    // NPCs (tiny colored dots)
    for(const n of npcs){
      const nx=n.x/TILE, ny=n.y/TILE;
      ctx.fillStyle=n.role==='shop'?'#CC4444':n.role==='market'?'#228822':'#AAA';
      ctx.fillRect(mmX+nx*scaleX-1,mmY+ny*scaleY-1,3,3);
    }

    // Animals (tiny dots)
    for(const a of animals){
      const ax=a.x/TILE, ay=a.y/TILE;
      ctx.fillStyle='#90EE90';
      ctx.fillRect(mmX+ax*scaleX-1,mmY+ay*scaleY-1,2,2);
    }

    // Player (bright orange blinking dot)
    const px=player.x/TILE, py=player.y/TILE;
    const blink=Math.sin(performance.now()/300)>0;
    if(blink){
      ctx.fillStyle='#F7931A';
      ctx.beginPath();ctx.arc(mmX+px*scaleX,mmY+py*scaleY,3,0,Math.PI*2);ctx.fill();
    }
    ctx.fillStyle='#FFF';
    ctx.fillRect(mmX+px*scaleX-1,mmY+py*scaleY-1,2,2);

    // Camera view rectangle
    const cvx=(cam.x/SCALE)/TILE, cvy=(cam.y/SCALE)/TILE;
    const cvw=(canvas.width/SCALE)/TILE, cvh=(canvas.height/SCALE)/TILE;
    ctx.strokeStyle='rgba(247,147,26,0.4)';ctx.lineWidth=1;
    ctx.strokeRect(mmX+cvx*scaleX,mmY+cvy*scaleY,cvw*scaleX,cvh*scaleY);

    // Label
    ctx.fillStyle='#888';ctx.font='9px '+FONT;ctx.textAlign='right';
    ctx.fillText('[N] Map',mmX+mmW,mmY+mmH+10);
  }

  // Notifications
  ctx.textAlign='center';
  for(let i=0;i<notifs.length;i++){const n=notifs[i],a=Math.min(1,n.t);
    ctx.fillStyle=n.big?`rgba(255,215,0,${a})`:`rgba(247,147,26,${a})`;
    ctx.font=`bold ${n.big?18:14}px ${FONT}`;ctx.fillText(n.text,canvas.width/2,hbY-30-i*24);}
  
  // Click-to-move indicator
  if(clickIndicator && !interior){
    const ci=clickIndicator,sx=ci.x*SCALE-cam.x,sy=ci.y*SCALE-cam.y;
    const a=ci.life;
    ctx.strokeStyle=`rgba(247,147,26,${a})`;ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(sx,sy,6+4*(1-a),0,Math.PI*2);ctx.stroke();
    ctx.strokeStyle=`rgba(247,147,26,${a*0.4})`;ctx.lineWidth=1;
    ctx.beginPath();ctx.arc(sx,sy,10+6*(1-a),0,Math.PI*2);ctx.stroke();
  }

  // Particles
  for(const pt of particles){
    const a=Math.min(1,pt.life);
    ctx.fillStyle=`rgba(0,0,0,${a*0.4})`;ctx.font=`bold ${pt.size||13}px ${FONT}`;ctx.textAlign='center';
    ctx.fillText(pt.text,pt.x-cam.x+1,pt.y-cam.y+1); // shadow
    ctx.fillStyle=`rgba(247,147,26,${a})`;
    ctx.fillText(pt.text,pt.x-cam.x,pt.y-cam.y);
  }
  ctx.textAlign='left';
}

function drawCitadelMenu(){
  const w=480,h=360,x=(canvas.width-w)/2,y=(canvas.height-h)/2;
  panel(x,y,w,h);
  ctx.fillStyle=C.hud;ctx.font=`bold 20px ${FONT}`;ctx.textAlign='center';
  ctx.fillText('🏰 Citadel Upgrade',x+w/2,y+30);
  
  const cur=CITADEL_TIERS[citadelTier];
  ctx.fillStyle='#CCC';ctx.font=`14px ${FONT}`;
  ctx.fillText(`Current: ${cur.icon} ${cur.name} (Tier ${citadelTier})  — ${cur.rooms} room${cur.rooms>1?'s':''}`,x+w/2,y+54);
  
  // Tier list
  CITADEL_TIERS.forEach((t,i)=>{
    const ty=y+80+i*48;
    const isCur=i===citadelTier;const isNext=i===citadelTier+1;const isDone=i<=citadelTier;
    ctx.fillStyle=isCur?'rgba(247,147,26,.2)':isNext?'rgba(247,147,26,.08)':'rgba(20,20,25,.6)';
    rr(x+12,ty,w-24,40,4);
    ctx.strokeStyle=isCur?C.hud:isNext?'rgba(247,147,26,.4)':'#333';ctx.lineWidth=isCur?2:1;ctx.stroke();
    // Icon + name
    ctx.fillStyle=isDone?C.green:isNext?C.white:'#666';ctx.font=`bold 15px ${FONT}`;ctx.textAlign='left';
    ctx.fillText(`${t.icon} ${t.name}`,x+20,ty+26);
    // Rooms info
    ctx.fillStyle='#999';ctx.font=`12px ${FONT}`;
    ctx.fillText(t.desc,x+140,ty+26);
    // Cost / status
    ctx.textAlign='right';
    if(i===0||isDone){ctx.fillStyle=C.green;ctx.font=`bold 13px ${FONT}`;ctx.fillText(i===0?'✅ Free':isCur?'✅ Current':'✅ Done',x+w-20,ty+26);}
    else{const canAfford=player.wallet>=t.cost;ctx.fillStyle=canAfford?C.green:C.red;ctx.font=`bold 13px ${FONT}`;ctx.fillText(`${fmt(t.cost)} sats`,x+w-20,ty+26);}
    ctx.textAlign='left';
  });
  
  // Action prompt
  const nextTier = citadelTier < CITADEL_TIERS.length-1 ? CITADEL_TIERS[citadelTier+1] : null;
  const sy=y+h-40;
  if(nextTier){
    const canAfford=player.wallet>=nextTier.cost;
    ctx.fillStyle=canAfford?C.gold:C.red;ctx.font=`bold 14px ${FONT}`;ctx.textAlign='center';
    ctx.fillText(canAfford?`[Enter/E] Upgrade to ${nextTier.icon} ${nextTier.name} for ${fmt(nextTier.cost)} sats`:`Need ${fmt(nextTier.cost-player.wallet)} more sats to upgrade`,x+w/2,sy+6);
  } else {
    ctx.fillStyle=C.gold;ctx.font=`bold 14px ${FONT}`;ctx.textAlign='center';
    ctx.fillText('🗼 Maximum tier reached! You are a Citadel lord.',x+w/2,sy+6);
  }
  ctx.fillStyle=C.gray;ctx.font=`12px ${FONT}`;ctx.textAlign='center';
  ctx.fillText('[C] or [Esc] Close',x+w/2,y+h-10);
}

function drawCraftMenu(){
  const w=580,h=480,x=(canvas.width-w)/2,y=(canvas.height-h)/2;
  panel(x,y,w,h);
  ctx.fillStyle=C.hud;ctx.font=`bold 20px ${FONT}`;ctx.textAlign='center';
  ctx.fillText('🔨 Workbench',x+w/2,y+30);
  ctx.fillStyle=C.gray;ctx.font=`12px ${FONT}`;
  ctx.fillText('T: Toggle | ↑↓ Navigate | E/Enter: Craft | Esc: Close',x+w/2,y+50);

  // Balance
  ctx.fillStyle=C.hud;ctx.font=`bold 13px ${FONT}`;ctx.textAlign='right';
  ctx.fillText(`₿ ${fmt(player.wallet)} sats`,x+w-14,y+50);
  ctx.textAlign='left';

  const ly=y+68,rowH=46;
  // Clipping
  ctx.save();ctx.beginPath();ctx.rect(x+4,ly-4,w-8,h-80);ctx.clip();

  RECIPES.forEach((recipe,i)=>{
    const iy=ly+i*rowH;
    const it=ITEMS[recipe.result.id];
    const canDo=canCraft(recipe);

    // Selection bg
    if(i===craftCur){ctx.fillStyle='rgba(247,147,26,0.15)';ctx.fillRect(x+8,iy-2,w-16,rowH-4);}
    else{ctx.fillStyle='rgba(20,20,25,0.4)';ctx.fillRect(x+8,iy-2,w-16,rowH-4);}

    // Result icon + name
    ctx.font='22px serif';ctx.fillStyle=C.white;ctx.textAlign='left';
    ctx.fillText(it.icon,x+16,iy+22);
    ctx.font=`bold 13px ${FONT}`;ctx.fillStyle=i===craftCur?C.hud:C.white;
    ctx.fillText(it.name,x+46,iy+14);

    // Ingredients
    const ingStr=recipe.ingredients.map(ing=>{
      const iit=ITEMS[ing.id];
      const have=inv.find(s=>s&&s.id===ing.id);
      const qty=have?have.qty:0;
      return `${ing.qty}x${iit?iit.icon:'?'}(${qty})`;
    }).join(' + ');
    ctx.font=`11px ${FONT}`;ctx.fillStyle=canDo?'#4F4':'#888';
    ctx.fillText(ingStr,x+46,iy+30);

    // Sell value hint
    if(it.sell>0){ctx.fillStyle='#777';ctx.font=`10px ${FONT}`;ctx.fillText(`Sell: ${fmt(it.sell)}`,x+46,iy+42);}

    // Status badge
    ctx.textAlign='right';
    if(canDo){ctx.fillStyle=i===craftCur?C.gold:C.green;ctx.font=`bold 13px ${FONT}`;ctx.fillText('[CRAFT]',x+w-14,iy+14);}
    else{
      const missing=recipe.ingredients.filter(ing=>!inv.some(s=>s&&s.id===ing.id&&s.qty>=ing.qty));
      const missTxt=missing.map(m=>`${m.qty}x${ITEMS[m.id]?ITEMS[m.id].icon:'?'}`).join(', ');
      ctx.fillStyle='#666';ctx.font=`11px ${FONT}`;ctx.fillText(`Need: ${missTxt}`,x+w-14,iy+14);
    }
    ctx.textAlign='left';
  });
  ctx.restore();

  // Footer hint
  ctx.fillStyle=C.gray;ctx.font=`11px ${FONT}`;ctx.textAlign='center';
  ctx.fillText('Craft items to earn Engineering XP',x+w/2,y+h-10);
}

function drawShop(){
  const w=560,h=460,x=(canvas.width-w)/2,y=(canvas.height-h)/2;panel(x,y,w,h);
  ctx.fillStyle=C.hud;ctx.font=`bold 18px ${FONT}`;ctx.textAlign='center';
  ctx.fillText(shopNpcRole==='market'?"🌾 Farmer Pete's Market":shopNpcRole==='seeds'?"🌱 Seed Sally's Garden Shop":"⛏️ Ruby's Hardware Shop",x+w/2,y+28);
  const activeList=shopNpcRole==='seeds'?SEED_SHOP_LIST:SHOP_LIST;
  
  // Tabs
  const tw=w/2-20;
  ctx.fillStyle=shopMode==='buy'?'rgba(247,147,26,.15)':'rgba(30,30,30,.5)';ctx.fillRect(x+10,y+40,tw,26);
  ctx.fillStyle=shopMode==='sell'?'rgba(247,147,26,.15)':'rgba(30,30,30,.5)';ctx.fillRect(x+w/2+10,y+40,tw,26);
  ctx.fillStyle=shopMode==='buy'?C.hud:C.gray;ctx.font=`bold 14px ${FONT}`;ctx.textAlign='center';
  ctx.fillText('BUY (←→)',x+10+tw/2,y+57);
  ctx.fillStyle=shopMode==='sell'?C.hud:C.gray;
  ctx.fillText('SELL (←→)',x+w/2+10+tw/2,y+57);
  
  // Balance & market
  ctx.fillStyle=C.hud;ctx.font=`bold 14px ${FONT}`;
  ctx.fillText(`₿ ${fmt(player.wallet)} sats`,x+w/2,y+82);
  const mult=marketMult();
  ctx.fillStyle=mult>1?C.red:C.green;ctx.font=`12px ${FONT}`;
  ctx.fillText(`Market: ${mult>1?'▲':'▼'} ${Math.round(mult*100)}%`,x+w/2,y+96);
  
  // Item list
  ctx.textAlign='left';
  const ly=y+112;
  const rowH=32; // taller rows
  
  const visRows=Math.floor((h-112-35)/rowH);
  if(shopMode==='buy'){
    // Auto-scroll to keep selection visible
    if(shopCur<shopScroll)shopScroll=shopCur;
    if(shopCur>=shopScroll+visRows)shopScroll=shopCur-visRows+1;
    ctx.save();ctx.beginPath();ctx.rect(x,ly-6,w,h-112-25);ctx.clip();
    activeList.forEach((id,i)=>{
      const it=ITEMS[id];if(!it)return;
      const pr=Math.ceil(it.buy*mult);
      const iy=ly+(i-shopScroll)*rowH;
      if(iy<ly-rowH||iy>y+h-35)return;

      // Selection highlight
      if(i===shopCur){ctx.fillStyle='rgba(247,147,26,.12)';ctx.fillRect(x+8,iy-4,w-16,rowH-2);}

      // Icon
      ctx.font='18px serif';ctx.fillStyle=C.white;ctx.fillText(it.icon,x+14,iy+14);

      // Name + short desc
      ctx.font=`bold 13px ${FONT}`;ctx.fillStyle=i===shopCur?C.hud:C.white;
      ctx.fillText(it.name,x+42,iy+10);

      // Description (truncated to fit)
      ctx.fillStyle='#777';ctx.font=`11px ${FONT}`;
      let desc=it.desc;
      while(ctx.measureText(desc).width>w-200 && desc.length>10) desc=desc.slice(0,-4)+'...';
      ctx.fillText(desc,x+42,iy+24);

      // Price (right aligned)
      ctx.fillStyle=player.wallet>=pr?C.green:C.red;
      ctx.font=`bold 13px ${FONT}`;ctx.textAlign='right';
      ctx.fillText(`${fmt(pr)} sats`,x+w-14,iy+14);
      ctx.textAlign='left';
    });
    ctx.restore();
    // Scroll indicator
    if(activeList.length>visRows){
      ctx.fillStyle=C.gray;ctx.font=`11px ${FONT}`;ctx.textAlign='right';
      ctx.fillText(`${shopCur+1}/${activeList.length}`,x+w-14,y+100);
      if(shopScroll>0){ctx.fillStyle=C.hud;ctx.font=`12px ${FONT}`;ctx.textAlign='center';ctx.fillText('▲',x+w/2,ly-2);}
      if(shopScroll+visRows<activeList.length){ctx.fillStyle=C.hud;ctx.textAlign='center';ctx.fillText('▼',x+w/2,y+h-22);}
    }
  } else {
    if(shopCur<shopScroll)shopScroll=shopCur;
    const sl=inv.filter(s=>s&&ITEMS[s.id].sell>0);
    if(shopCur>=shopScroll+visRows)shopScroll=shopCur-visRows+1;
    if(!sl.length){ctx.fillStyle=C.gray;ctx.font=`14px ${FONT}`;ctx.textAlign='center';ctx.fillText('Nothing to sell!',x+w/2,ly+30);ctx.textAlign='left';}
    ctx.save();ctx.beginPath();ctx.rect(x,ly-6,w,h-112-25);ctx.clip();
    sl.forEach((s,i)=>{
      const it=ITEMS[s.id],pr=Math.ceil(it.sell*mult);
      const iy=ly+(i-shopScroll)*rowH;if(iy<ly-rowH||iy>y+h-35)return;
      if(i===shopCur){ctx.fillStyle='rgba(247,147,26,.12)';ctx.fillRect(x+8,iy-4,w-16,rowH-2);}
      ctx.font='18px serif';ctx.fillStyle=C.white;ctx.fillText(it.icon,x+14,iy+14);
      ctx.font=`bold 13px ${FONT}`;ctx.fillStyle=i===shopCur?C.hud:C.white;
      ctx.fillText(`${it.name} x${s.qty}`,x+42,iy+14);
      ctx.fillStyle=C.green;ctx.font=`bold 13px ${FONT}`;ctx.textAlign='right';
      ctx.fillText(`+${fmt(pr)} sats`,x+w-14,iy+14);ctx.textAlign='left';
    });
    ctx.restore();
  }
  
  // Footer
  ctx.fillStyle=C.gray;ctx.font=`12px ${FONT}`;ctx.textAlign='center';
  ctx.fillText('↑↓ Navigate | Click:Select | Enter/E:Buy/Sell | ←→:Tab | B/Esc:Close',x+w/2,y+h-12);
}

function drawInv(){
  const cols=5,rows=4,ss=56,gap=6;const w=cols*(ss+gap)+gap+180,h=rows*(ss+gap)+gap+60;
  const x=(canvas.width-w)/2,y=(canvas.height-h)/2;panel(x,y,w,h);
  ctx.fillStyle=C.hud;ctx.font=`bold 18px ${FONT}`;ctx.textAlign='center';ctx.fillText('📦 Inventory',x+w/2,y+24);
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
    const i=r*cols+c,sx=x+gap+c*(ss+gap),sy=y+36+r*(ss+gap);
    ctx.fillStyle=i===selSlot?'rgba(247,147,26,.2)':'rgba(20,20,25,.8)';ctx.fillRect(sx,sy,ss,ss);
    ctx.strokeStyle=i===selSlot?C.hud:'#333';ctx.lineWidth=i===selSlot?2:1;ctx.strokeRect(sx,sy,ss,ss);
    ctx.fillStyle='#444';ctx.font=`11px ${FONT}`;ctx.textAlign='left';ctx.fillText(i<10?`${(i+1)%10}`:'',sx+3,sy+11);
    const sl=inv[i];if(sl&&ITEMS[sl.id]){ctx.font='28px serif';ctx.textAlign='center';ctx.fillText(ITEMS[sl.id].icon,sx+ss/2,sy+ss/2+8);
      if(sl.qty>1){ctx.fillStyle=C.white;ctx.font=`bold 13px ${FONT}`;ctx.fillText(sl.qty,sx+ss-10,sy+ss-6);}}}
  const sel=inv[selSlot],dx=x+cols*(ss+gap)+gap+10,dy=y+36;
  if(sel){const it=ITEMS[sel.id];ctx.fillStyle=C.hud;ctx.font=`bold 14px ${FONT}`;ctx.textAlign='left';
    ctx.fillText(`${it.icon} ${it.name}`,dx,dy+16);ctx.fillStyle='#CCC';ctx.font=`12px ${FONT}`;ctx.textAlign='left';wrapText(it.desc,dx,dy+36,155,15);
    ctx.fillStyle=C.gray;if(it.buy>0)ctx.fillText(`Buy: ${fmt(it.buy)}`,dx,dy+80);if(it.sell>0)ctx.fillText(`Sell: ${fmt(it.sell)}`,dx,dy+94);ctx.fillText(`Qty: ${sel.qty}`,dx,dy+108);}
  ctx.fillStyle=C.gray;ctx.font=`12px ${FONT}`;ctx.textAlign='center';ctx.fillText('1-9,0:Select | Click:Select | I/Tab/Esc:Close',x+w/2,y+h-10);
}

function drawChest(){
  const cols=5,rows=4,ss=56,gap=6;
  const totalW=cols*(ss+gap)+gap;
  const w=totalW*2+40,h=rows*(ss+gap)+gap+60;
  const x=(canvas.width-w)/2,y=(canvas.height-h)/2;
  panel(x,y,w,h);
  ctx.fillStyle=C.hud;ctx.font='bold 18px '+FONT;ctx.textAlign='center';
  ctx.fillText('📦 Storage Chest',x+w/2,y+24);
  ctx.fillStyle=C.gray;ctx.font='bold 13px '+FONT;ctx.textAlign='center';
  ctx.fillText('Your Inventory',x+totalW/2+10,y+42);
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
    const i=r*cols+c,sx2=x+gap+c*(ss+gap)+10,sy2=y+50+r*(ss+gap);
    ctx.fillStyle=i===selSlot?'rgba(247,147,26,.2)':'rgba(20,20,25,.8)';ctx.fillRect(sx2,sy2,ss,ss);
    ctx.strokeStyle=i===selSlot?C.hud:'#333';ctx.lineWidth=i===selSlot?2:1;ctx.strokeRect(sx2,sy2,ss,ss);
    const sl=inv[i];if(sl){ctx.font='28px serif';ctx.textAlign='center';ctx.fillText(ITEMS[sl.id].icon,sx2+ss/2,sy2+ss/2+8);
      if(sl.qty>1){ctx.fillStyle=C.white;ctx.font='bold 13px '+FONT;ctx.fillText(sl.qty,sx2+ss-10,sy2+ss-6);}}
  }
  ctx.fillStyle=C.gray;ctx.font='bold 13px '+FONT;ctx.textAlign='center';
  ctx.fillText('Chest',x+totalW+totalW/2+30,y+42);
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
    const i=r*cols+c,sx2=x+totalW+30+gap+c*(ss+gap),sy2=y+50+r*(ss+gap);
    ctx.fillStyle='rgba(40,30,20,.8)';ctx.fillRect(sx2,sy2,ss,ss);
    ctx.strokeStyle='#554430';ctx.lineWidth=1;ctx.strokeRect(sx2,sy2,ss,ss);
    const sl=chestInv[i];if(sl){ctx.font='28px serif';ctx.textAlign='center';ctx.fillText(ITEMS[sl.id].icon,sx2+ss/2,sy2+ss/2+8);
      if(sl.qty>1){ctx.fillStyle=C.white;ctx.font='bold 13px '+FONT;ctx.fillText(sl.qty,sx2+ss-10,sy2+ss-6);}}
  }
  ctx.fillStyle=C.gray;ctx.font='12px '+FONT;ctx.textAlign='center';
  ctx.fillText('Click items to transfer | Esc to close',x+w/2,y+h-10);
}

function panel(x,y,w,h){ctx.fillStyle=C.hudBg;rr(x,y,w,h,6);ctx.strokeStyle=C.hudBorder;ctx.lineWidth=1.5;ctx.stroke();}
function drawTutArrow(x,y,dir){
  const t=performance.now()/1000;const pulse=Math.sin(t*4)*6;
  ctx.fillStyle=C.orange;ctx.beginPath();
  if(dir==='left'){ctx.moveTo(x-pulse,y);ctx.lineTo(x+16,y-10);ctx.lineTo(x+16,y+10);}
  else if(dir==='down'){ctx.moveTo(x,y+pulse);ctx.lineTo(x-10,y-16);ctx.lineTo(x+10,y-16);}
  else if(dir==='right'){ctx.moveTo(x+pulse,y);ctx.lineTo(x-16,y-10);ctx.lineTo(x-16,y+10);}
  else{ctx.moveTo(x,y-pulse);ctx.lineTo(x-10,y+16);ctx.lineTo(x+10,y+16);}
  ctx.closePath();ctx.fill();
}
function wrapText(text,x,y,mw,lh){
  // Respects current textAlign (left or center)
  const align = ctx.textAlign;
  const words=text.split(' ');let line='';
  for(const word of words){
    const test=line+word+' ';
    if(ctx.measureText(test).width>mw && line){
      ctx.fillText(line.trim(),x,y);
      line=word+' ';y+=lh;
    } else { line=test; }
  }
  if(line.trim()) ctx.fillText(line.trim(),x,y);
}
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

// ---- Pause Menu ----
function drawPauseMenu() {
  // Dark overlay
  ctx.fillStyle='rgba(0,0,0,0.65)';ctx.fillRect(0,0,canvas.width,canvas.height);
  const pw=320,ph=60+PAUSE_ITEMS.length*50;
  const px=(canvas.width-pw)/2,py=(canvas.height-ph)/2;
  panel(px,py,pw,ph);
  ctx.fillStyle=C.hud;ctx.font=`bold 20px ${FONT}`;ctx.textAlign='center';
  ctx.fillText('⏸ PAUSED',canvas.width/2,py+30);
  PAUSE_ITEMS.forEach((item,i)=>{
    const iy=py+50+i*50;
    const isSel=i===pauseCur;
    ctx.fillStyle=isSel?'rgba(247,147,26,0.2)':'rgba(20,20,25,0.6)';
    rr(px+20,iy,pw-40,40,5);
    ctx.strokeStyle=isSel?C.hud:'#333';ctx.lineWidth=isSel?2:1;ctx.stroke();
    let label=item;
    if(item==='Music') label='Music: '+(musicOn?'ON ♪':'OFF ✕');
    ctx.fillStyle=isSel?C.gold:C.white;ctx.font=`bold 16px ${FONT}`;ctx.textAlign='center';
    ctx.fillText(label,canvas.width/2,iy+26);
  });
  ctx.fillStyle=C.gray;ctx.font=`11px ${FONT}`;ctx.textAlign='center';
  ctx.fillText('↑↓ Navigate  |  Enter: Select  |  Esc: Resume',canvas.width/2,py+ph-12);
}

// ---- NPC hearts in HUD near NPC ----
function drawInteriorNPC(n) {
  const sx=n.x*SCALE-cam.x, sy=n.y*SCALE-cam.y;
  const w=ST, h=ST+8, px=sx-w/2, py=sy-h/2;
  // Shadow
  ctx.fillStyle='rgba(0,0,0,.15)';ctx.beginPath();ctx.ellipse(sx,sy+h/2,12,4,0,0,Math.PI*2);ctx.fill();
  // Body
  ctx.fillStyle=n.col;ctx.fillRect(px+8,py+14,w-16,h-28);
  // Head
  ctx.fillStyle=C.skin;ctx.fillRect(px+12,py+2,w-24,16);
  // Hair
  ctx.fillStyle=n.hair;ctx.fillRect(px+10,py-2,w-20,8);
  // Eyes
  ctx.fillStyle=C.black;ctx.fillRect(px+16,py+8,3,3);ctx.fillRect(px+w-19,py+8,3,3);
  // Name + prompt
  const dist=Math.hypot(n.x-player.x, n.y-player.y);
  if(dist<64){
    ctx.fillStyle=C.white;ctx.font=`bold 13px ${FONT}`;ctx.textAlign='center';
    ctx.fillText(n.name,sx,py-10);
    ctx.fillStyle=C.gray;ctx.font=`12px ${FONT}`;
    ctx.fillText('[E] Talk',sx,py-24);
  }
}

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
  // Reset render state at frame start (#67 globalAlpha leak, #68 shadowBlur leak)
  ctx.globalAlpha=1;ctx.shadowBlur=0;ctx.shadowColor='transparent';
  if(gameState==='intro'){drawIntro();ctx.globalAlpha=1;ctx.shadowBlur=0;return;}
  
  ctx.fillStyle='#0a0a0a';ctx.fillRect(0,0,canvas.width,canvas.height);
  
  const activeMap = interior ? interior.map : map;
  const mapW = interior ? interior.w : MAP_W;
  const mapH = interior ? interior.h : MAP_H;

  let sX,sY,eX,eY;
  if(interior){
    // Render all interior tiles (small rooms, just draw everything)
    sX=0;sY=0;eX=mapW;eY=mapH;
  }else{
    sX=Math.max(0,Math.floor(cam.x/ST)-1);sY=Math.max(0,Math.floor(cam.y/ST)-1);
    eX=Math.min(mapW,sX+Math.ceil(canvas.width/ST)+3);eY=Math.min(mapH,sY+Math.ceil(canvas.height/ST)+3);
  }

  // Tiles
  for(let y=sY;y<eY;y++)for(let x=sX;x<eX;x++){if(activeMap[y]&&activeMap[y][x]!=null)drawTile(x,y,activeMap[y][x]);}

  // Sort all entities by Y for depth
  const entities = [];
  if (!interior) {
    for(const d of decor){
      // Roofs draw last (highest Y) so they cover floor tiles and entities inside
      const sortY = d.type==='roof' ? (d.y+d.bh+2)*TILE : d.y*TILE+TILE;
      entities.push({y:sortY, draw:()=>drawDecor(d)});
    }
    for(const i of placed)entities.push({y:i.y,draw:()=>drawPlaced(i)});
    for(const f of fences)entities.push({y:f.y*TILE+TILE,draw:()=>drawFence(f)});
    for(const r of rigs){ if(!r.interior) entities.push({y:r.y,draw:()=>drawRig(r)}); }
    for(const n of npcs)entities.push({y:n.y,draw:()=>drawNPC(n)});
    for(const a of animals)entities.push({y:a.y,draw:()=>drawAnimal(a)});
  } else {
    for(const f of interior.furniture) {
      entities.push({y:f.y*TILE+TILE, draw:()=>drawDecor({type:'furniture',item:f.item,x:f.x,y:f.y})});
    }
    for(const r of rigs){ if(r.interior===interior.type) entities.push({y:r.y,draw:()=>drawRig(r)}); }
    // Interior NPCs
    for(const n of interiorNPCs) entities.push({y:n.y,draw:()=>drawInteriorNPC(n)});
  }
  entities.push({y:player.y,draw:drawPlayer});
  entities.sort((a,b)=>a.y-b.y);
  // Draw crops
  for(const crop of crops) drawCrop(crop);
  for(const e of entities)e.draw();
  // NPC hearts
  for(const npc of npcs) drawNPCHearts(npc);
  
  // Citadel door hint
  if(isNearHome()&&!citadelMenuOpen){
    const t=CITADEL_TIERS[citadelTier];
    const doorSx=homeX*ST-cam.x+ST/2, doorSy=(homeY+Math.floor(t.h/2)+1)*ST-cam.y-ST*.6;
    ctx.fillStyle='rgba(247,147,26,0.85)';ctx.font=`bold 13px ${FONT}`;ctx.textAlign='center';
    ctx.fillText('[C] Citadel Upgrade Menu',doorSx,doorSy);
  }
  
  // Day/night
  const dn=getDayOv();
  if(dn.a>0){ctx.fillStyle=`rgba(${dn.r},${dn.g},${dn.b},${dn.a})`;ctx.fillRect(0,0,canvas.width,canvas.height);}

  // Weather overlay (outdoors only)
  if(!interior){
  const wInfo = WEATHER_TYPES[weather.current];
  if (wInfo.overlay) { ctx.fillStyle = wInfo.overlay; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  // Lightning flash
  if (weather.lightning > 0) { ctx.fillStyle = 'rgba(255,255,255,' + (weather.lightning * 0.6) + ')'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  // Rain drops
  if (weather.current === 'rain' || weather.current === 'storm') {
    ctx.strokeStyle = weather.current === 'storm' ? 'rgba(180,200,255,0.5)' : 'rgba(160,190,255,0.35)';
    ctx.lineWidth = weather.current === 'storm' ? 2 : 1;
    ctx.beginPath();
    for (const p of weather.particles) {
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + p.vx * 0.015, p.y + p.len);
    }
    ctx.stroke();
  }

  // Ambient particles
  for (const p of ambient) {
    const a = Math.min(1, p.life / (p.maxLife * 0.3), (p.maxLife - (p.maxLife - p.life)) / p.maxLife);
    const alpha = Math.min(1, Math.max(0.05, a));
    if (p.type === 'butterfly') {
      const wing = Math.sin(p.phase * 6) * 4;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha * 0.8;
      ctx.fillRect(p.x - wing, p.y - 1, wing * 2, 3);
      ctx.fillRect(p.x - 1, p.y - 2, 2, 4);
      ctx.globalAlpha = 1;
    } else if (p.type === 'firefly') {
      const glow = 0.3 + Math.sin(p.phase * 3) * 0.4;
      ctx.fillStyle = 'rgba(200,255,100,' + (glow * alpha) + ')';
      ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(220,255,130,' + (glow * alpha * 0.5) + ')';
      ctx.beginPath(); ctx.arc(p.x, p.y, 8, 0, Math.PI * 2); ctx.fill();
    } else if (p.type === 'leaf') {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.phase);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha * 0.7;
      ctx.fillRect(-p.size/2, -p.size/4, p.size, p.size/2);
      ctx.globalAlpha = 1;
      ctx.restore();
    } else { // dust
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha * 0.4;
      ctx.fillRect(p.x, p.y, p.size, p.size);
      ctx.globalAlpha = 1;
    }
  }
  } // end !interior weather/ambient block

  drawHUD();

  // Transition fade overlay (drawn last, on top of everything)
  if (transition) {
    const progress = transition.timer / transition.duration;
    const alpha = transition.type === 'fadeOut' ? progress : 1 - progress;
    ctx.fillStyle = 'rgba(0,0,0,' + Math.min(1, alpha) + ')';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

// ============================================================
// GAME LOOP
// ============================================================
function gameLoop(now){
  try{
    const dt=Math.min(.1,(now-lastTime)/1000);lastTime=now;
    update(dt);draw();
  }catch(e){
    ctx.fillStyle='#F00';ctx.font='16px Courier New';ctx.textAlign='left';
    ctx.fillText('ERROR: '+e.message,20,30);
    ctx.fillText('Stack: '+e.stack.split('\n')[1],20,50);
    console.error('GAME ERROR:',e);
    return; // stop loop
  }
  requestAnimationFrame(gameLoop);
}
requestAnimationFrame(gameLoop);
