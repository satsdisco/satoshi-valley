// ============================================================
// SATOSHI VALLEY — THE MINES
// Extracted from game.js during Sprint 17 modularization
// Loaded as a classic script BEFORE game.js — shares global scope
// ============================================================

// ============================================================
// THE MINES — Abandoned Data Center Dungeon
// ============================================================
let mineFloor = null; // null=overworld, or {map, w, h, enemies, loot, stairsUp, stairsDown}
let mineLevel = 0;
let combat = null; // null or {enemy, enemyHp, enemyMaxHp, playerHp, playerMaxHp, log, turn}
let mineReturnX = 0, mineReturnY = 0;
let playerSwing = 0; // attack animation timer
let screenShake = 0;
// ---- Sprint 20: Combat Feel ----
let hitstop = 0; // freeze-frame timer on impact (everything except shake/render pauses)
let attackReadyFlash = 0; // brief white flash when attackCooldown returns to 0
let _attackCooldownPrev = 0; // for edge detection on cooldown→0
let playerLungeX = 0, playerLungeY = 0; // visual lunge offset during swing
let damageNumbers = []; // {x, y, text, life, color}
let projectiles = []; // {x, y, vx, vy, life, type, dmg}
let mineAutoAttackTarget = null; // auto-approach and attack
let deathParticles = []; // {x, y, vx, vy, life, color, size}

function mineAttackEnemy(en){
  // Attack cooldown check
  if(attackCooldown>0)return;
  attackCooldown=0.4;
  playerSwing=0.3;
  const info=MINE_ENEMIES[en.type];
  const pAtk=10+skills.mining.level*3+(hasItem('pickaxe')?8:0);
  let rawDmg=pAtk+Math.floor(Math.random()*6);
  // Apply enemy armor
  let finalDmg=Math.max(1,rawDmg-(info.armor||0));
  // Critical hit scales with mining level
  const critChance=Math.min(0.20,0.05+skills.mining.level*0.01);
  const isCrit=Math.random()<critChance;
  if(isCrit)finalDmg*=2;
  // Combo system
  comboSystem.hits++;comboSystem.timer=1.5;
  let isCombo=false;
  if(comboSystem.hits>=3){
    finalDmg*=3;isCombo=true;comboSystem.hits=0;
  }
  finalDmg=Math.floor(finalDmg);
  en.hp-=finalDmg;en._hitFlash=0.25;
  // Knockback — bigger (3 tiles) and animated via _lungeX/Y decay
  const dx=en.x*TILE-player.x, dy=en.y*TILE-player.y;
  const dist=Math.hypot(dx,dy)||1;
  const kbStrength=isCombo?5:isCrit?4:3;
  en._lungeX=(dx/dist)*kbStrength;
  en._lungeY=(dy/dist)*kbStrength;
  // Snap-to-grid component (so AI pathing still respects the new pos)
  const kbx=Math.sign(dx),kby=Math.sign(dy);
  const nkx=en.x+kbx,nky=en.y+kby;
  if(nkx>=1&&nkx<MINE_W-1&&nky>=1&&nky<MINE_H-1&&mineFloor.map[nky]&&mineFloor.map[nky][nkx]!==T.CLIFF){en.x=nkx;en.y=nky;}
  // Player lunges toward target — visual commitment to the swing
  playerLungeX=(dx/dist)*4;
  playerLungeY=(dy/dist)*4;
  // Damage number — bigger for bigger hits, scales with damage
  const dmgText=isCombo?'COMBO! -'+finalDmg:(isCrit?'CRIT! -':'-')+finalDmg;
  const dmgColor=isCombo?'#FF00FF':(isCrit?'#FF4444':'#FFDD44');
  const dmgSize=14+Math.min(18,finalDmg*0.4)+(isCrit?4:0)+(isCombo?8:0);
  damageNumbers.push({x:en.x*ST+ST/2,y:en.y*ST,text:dmgText,life:isCombo?2.0:(isCrit?1.5:1.0),color:dmgColor,size:dmgSize,vy:-30,vx:(Math.random()-0.5)*20});
  // Layered hit SFX — punchy thud + smack + tick. Way louder than before.
  if(isCombo){
    tone(80,.10,'sawtooth',.18); // deep thud
    tone(180,.08,'square',.14);  // body smack
    tone(900,.04,'square',.10);  // high tick
    tone(1400,.06,'triangle',.08); // sparkle
  } else if(isCrit){
    tone(120,.08,'sawtooth',.14);
    tone(280,.06,'square',.12);
    tone(1100,.04,'square',.10);
  } else {
    tone(140,.07,'sawtooth',.12); // thud
    tone(320,.05,'square',.10);   // smack
    tone(800,.03,'square',.07);   // tick
  }
  // Hitstop — the single biggest game-feel upgrade. Freezes everything for
  // a few frames so the hit lands with weight.
  hitstop=isCombo?0.12:isCrit?0.08:0.04;
  // Bigger screen shake
  screenShake=isCombo?0.45:isCrit?0.30:0.18;
  if(en.hp<=0){
    en.alive=false;
    const info2=MINE_ENEMIES[en.type];
    for(let i=0;i<12;i++){
      const angle=Math.random()*Math.PI*2;const spd2=60+Math.random()*80;
      deathParticles.push({x:en.x*ST+ST/2,y:en.y*ST+ST/2,vx:Math.cos(angle)*spd2,vy:Math.sin(angle)*spd2,life:0.6+Math.random()*0.4,color:info2.boss?'#FFD700':'#FF6644',size:3+Math.random()*3});
    }
    if(info2.loot){
      addItem(info2.loot);
      for(let i=0;i<6;i++){
        deathParticles.push({x:en.x*ST+ST/2,y:en.y*ST+ST/2,vx:(Math.random()-0.5)*40,vy:-40-Math.random()*60,life:0.8+Math.random()*0.3,color:C.orange,size:2+Math.random()*2});
      }
    }
    addXP('mining',info2.xp);
    notify('💥 '+info2.name+' destroyed! +'+info2.xp+' XP',2,info2.boss);
    const satReward=info2.xp*2+(info2.boss?500:0);
    player.wallet+=satReward;player.totalEarned+=satReward;
    satPart(en.x*TILE,en.y*TILE,satReward);
    sfx.block();
    screenShake=0.2;
    mineAutoAttackTarget=null;
  }
}
function mineAttackCrate(tx,ty){
  if(attackCooldown>0)return false;
  const ci=mineCrates.findIndex(c=>c.x===tx&&c.y===ty);
  if(ci===-1)return false;
  attackCooldown=0.4;playerSwing=0.3;
  const crate=mineCrates[ci];
  crate.hp--;
  damageNumbers.push({x:tx*ST+ST/2,y:ty*ST,text:'-1',life:0.8,color:'#DDAA44'});
  tone(300,.05,'square',.04);screenShake=0.05;
  if(crate.hp<=0){
    if(crate.loot&&addItem(crate.loot)){
      const it=ITEMS[crate.loot];
      notify('📦 Crate dropped '+it.icon+' '+it.name+'!',2);sfx.coin();
    }
    for(let i=0;i<8;i++){
      deathParticles.push({x:tx*ST+ST/2,y:ty*ST+ST/2,vx:(Math.random()-0.5)*60,vy:(Math.random()-0.5)*60,life:0.5,color:'#AA8844',size:2+Math.random()*2});
    }
    mineCrates.splice(ci,1);
  }
  return true;
}
let skillCooldowns = {orangePill:0, lightning:0, hashAttack:0};

// ============================================================
// COMBAT SKILLS — Bitcoin-themed abilities
// ============================================================
const COMBAT_SKILLS = {
  orangePill: {
    name:'Orange Pill',key:'1 (mine)',desc:'Throw a glowing orange pill that damages and converts enemies.',
    cooldown:2, dmg:15, range:6, color:'#F7931A', icon:'💊',
    unlockLevel:1, // mining level needed
    projectile:true,
  },
  lightning: {
    name:'Lightning Strike',key:'2 (mine)',desc:'Chain lightning zaps nearby enemies. Scales with engineering.',
    cooldown:5, dmg:25, range:4, color:'#FFDD44', icon:'⚡',
    unlockLevel:3,
    aoe:true, // hits all enemies in range
  },
  hashAttack: {
    name:'51% Attack',key:'3 (mine)',desc:'Massive AOE blast. The nuclear option.',
    cooldown:12, dmg:50, range:3, color:'#FF4444', icon:'💥',
    unlockLevel:5,
    aoe:true,
  },
};

// Mine dimensions — bigger for regular floors, even bigger for boss
const MINE_W_NORMAL = 50, MINE_H_NORMAL = 40;
const MINE_W_BOSS = 60, MINE_H_BOSS = 50;
let MINE_W = MINE_W_NORMAL, MINE_H = MINE_H_NORMAL;

// New tile types for dungeon hazards
const T_LAVA = 100, T_ELECTRIC = 101, T_CRATE = 102, T_FIREWALL = 103;

// Danger state and combat systems
let dangerState = null; // {timer:2, active:true} when HP below 15%
let dodgeRoll = {active:false, timer:0, dir:{x:0,y:0}, cooldown:0}; // dodge roll state
let comboSystem = {hits:0, timer:0}; // combo tracker
let attackCooldown = 0; // 0.4s melee cooldown
let lastTapDir = {key:'',time:0}; // for double-tap dodge detection
let mineParticles = []; // ambient dungeon particles
let enemyProjectiles = []; // projectiles from enemies (script_kiddie, boss)
let mineCrates = []; // destructible crates {x,y,hp,loot}
let mineFirewalls = []; // temporary wall tiles {x,y,timer}

const MINE_ENEMIES = {
  malware_bot: {name:'Malware Bot',hp:30,atk:6,armor:1,icon:'🤖',xp:10,loot:'copper_ore',desc:'A corrupted maintenance bot.',moveSpeed:0.7,aggroRange:6},
  phishing_worm: {name:'Phishing Worm',hp:22,atk:4,armor:0,icon:'🪱',xp:8,loot:'fiber_optic',desc:'Fast and erratic. Annoying.',moveSpeed:0.3,aggroRange:7},
  script_kiddie: {name:'Script Kiddie',hp:45,atk:8,armor:2,icon:'👾',xp:15,loot:'silicon',desc:'Keeps distance. Throws code.',moveSpeed:0.6,aggroRange:8},
  cryptojacker: {name:'Cryptojacker',hp:60,atk:14,armor:3,icon:'⛏️',xp:20,loot:'silicon',desc:'Charges and grabs you.',moveSpeed:0.5,aggroRange:7},
  ransomware: {name:'Ransomware',hp:90,atk:16,armor:5,icon:'💀',xp:25,loot:'old_gpu',desc:'Slow. Tanky. Traps you.',moveSpeed:1.2,aggroRange:6},
  fiat_printer: {name:'Fiat Printer',hp:75,atk:8,armor:2,icon:'🖨️',xp:30,loot:'server_rack',desc:'Spawns minions. Runs away.',special:'spawn',moveSpeed:0.8,aggroRange:8},
  zero_day: {name:'Zero Day Exploit',hp:120,atk:22,armor:3,icon:'🕷️',xp:40,loot:'rare_chip',desc:'Invisible. Backstabs. Deadly.',special:'stealth',moveSpeed:0.6,aggroRange:5},
  pool_operator: {name:'The Pool Operator',hp:225,atk:24,armor:6,icon:'👹',xp:100,loot:'rare_chip',boss:true,desc:'Controls 51% of the hashrate.',moveSpeed:0.9,aggroRange:12},
};

const MINE_LOOT_TABLES = [
  ['copper_ore','copper_ore','silicon','fiber_optic','server_rack'], // level 1
  ['copper_ore','silicon','fiber_optic','server_rack','cooling_unit'], // level 2
  ['silicon','server_rack','cooling_unit','old_gpu','fiber_optic'], // level 3
  ['old_gpu','cooling_unit','circuit_board','server_rack'], // level 4
  ['old_gpu','rare_chip','advanced_rig_part','cooling_unit'], // level 5 (boss)
];

function generateMineFloor(level) {
  const isBoss = level >= 4;
  const w = isBoss ? MINE_W_BOSS : MINE_W_NORMAL;
  const h = isBoss ? MINE_H_BOSS : MINE_H_NORMAL;
  MINE_W = w; MINE_H = h;
  
  const m=[];
  for(let y=0;y<h;y++){m[y]=[];for(let x=0;x<w;x++)m[y][x]=T.CLIFF;}
  
  const rooms=[];
  const torches=[];
  const decorations=[]; // {x,y,type} for server racks, monitors, etc.
  const roomCount = 8 + Math.floor(Math.random()*5) + (isBoss?2:0); // 8-12 rooms
  
  // Room type generator: arena, corridor, treasure, ambush, normal
  const roomTypes = ['normal','normal','normal','arena','corridor','treasure','ambush'];
  
  for(let i=0;i<roomCount;i++){
    const rtype = i===0 ? 'normal' : (i===roomCount-1 && isBoss ? 'arena' : roomTypes[Math.floor(Math.random()*roomTypes.length)]);
    let rw, rh;
    if(rtype==='arena'){rw=10+Math.floor(Math.random()*5);rh=8+Math.floor(Math.random()*4);}
    else if(rtype==='corridor'){rw=Math.random()<0.5?2+Math.floor(Math.random()*2):8+Math.floor(Math.random()*6);rh=rw<4?8+Math.floor(Math.random()*6):2+Math.floor(Math.random()*2);}
    else if(rtype==='treasure'){rw=4+Math.floor(Math.random()*2);rh=4+Math.floor(Math.random()*2);}
    else if(rtype==='ambush'){rw=6+Math.floor(Math.random()*3);rh=6+Math.floor(Math.random()*3);}
    else{rw=5+Math.floor(Math.random()*5);rh=4+Math.floor(Math.random()*4);}
    
    const rx=2+Math.floor(Math.random()*(w-rw-4));
    const ry=2+Math.floor(Math.random()*(h-rh-4));
    
    // Check overlap (allow some overlap for connected feel)
    let overlap=false;
    for(const r of rooms){
      if(Math.abs(rx+rw/2-(r.x))< (rw/2+r.w/2+1) && Math.abs(ry+rh/2-(r.y))< (rh/2+r.h/2+1)){overlap=true;break;}
    }
    if(overlap && rooms.length > 3) continue;
    
    for(let y=ry;y<ry+rh&&y<h-1;y++)for(let x=rx;x<rx+rw&&x<w-1;x++)m[y][x]=T.STONE;
    rooms.push({x:rx+Math.floor(rw/2),y:ry+Math.floor(rh/2),w:rw,h:rh,type:rtype,rx,ry});
    
    // Torches at room corners
    torches.push({x:rx,y:ry+1});
    torches.push({x:rx+rw-1,y:ry+1});
    if(rw>5){torches.push({x:rx+Math.floor(rw/2),y:ry});}
    if(rh>5){torches.push({x:rx,y:ry+rh-1});torches.push({x:rx+rw-1,y:ry+rh-1});}
    
    // Add decorations based on room type
    if(rtype==='normal'||rtype==='arena'){
      if(Math.random()<0.5)decorations.push({x:rx+1,y:ry+1,type:'server_rack'});
      if(Math.random()<0.3)decorations.push({x:rx+rw-2,y:ry+1,type:'broken_monitor'});
    }
  }
  
  if(rooms.length < 4) {
    // Fallback: ensure minimum rooms
    for(let i=rooms.length;i<6;i++){
      const rw=5+Math.floor(Math.random()*4);
      const rh=4+Math.floor(Math.random()*3);
      const rx=2+Math.floor(Math.random()*(w-rw-4));
      const ry=2+Math.floor(Math.random()*(h-rh-4));
      for(let y=ry;y<ry+rh&&y<h-1;y++)for(let x=rx;x<rx+rw&&x<w-1;x++)m[y][x]=T.STONE;
      rooms.push({x:rx+Math.floor(rw/2),y:ry+Math.floor(rh/2),w:rw,h:rh,type:'normal',rx,ry});
      torches.push({x:rx,y:ry+1});torches.push({x:rx+rw-1,y:ry+1});
    }
  }
  
  // Connect rooms with corridors (L-shaped connections)
  for(let i=1;i<rooms.length;i++){
    let cx2=rooms[i-1].x, cy2=rooms[i-1].y;
    const tx2=rooms[i].x, ty2=rooms[i].y;
    while(cx2!==tx2){m[cy2][cx2]=T.STONE;cx2+=cx2<tx2?1:-1;}
    while(cy2!==ty2){m[cy2][cx2]=T.STONE;cy2+=cy2<ty2?1:-1;}
    // Widen corridors slightly
    if(Math.abs(rooms[i-1].x-rooms[i].x)>8||Math.abs(rooms[i-1].y-rooms[i].y)>8){
      let cx3=rooms[i-1].x, cy3=rooms[i-1].y+1;
      while(cx3!==tx2){if(m[cy3])m[cy3][cx3]=T.STONE;cx3+=cx3<tx2?1:-1;}
    }
  }
  // Extra connections for loops (makes dungeon less linear)
  if(rooms.length>4){
    const r1=rooms[0],r2=rooms[Math.floor(rooms.length/2)];
    let cx2=r1.x,cy2=r1.y;
    while(cx2!==r2.x){m[cy2][cx2]=T.STONE;cx2+=cx2<r2.x?1:-1;}
    while(cy2!==r2.y){m[cy2][cx2]=T.STONE;cy2+=cy2<r2.y?1:-1;}
  }
  
  // Add environmental hazards
  const hazardRooms = rooms.filter(r=>r.type==='ambush'||r.type==='arena');
  for(const hr of hazardRooms){
    const hazardType = level < 3 ? T_ELECTRIC : T_LAVA;
    const count = 3+Math.floor(Math.random()*4);
    for(let j=0;j<count;j++){
      const hx=hr.rx+1+Math.floor(Math.random()*(hr.w-2));
      const hy=hr.ry+1+Math.floor(Math.random()*(hr.h-2));
      if(m[hy]&&m[hy][hx]===T.STONE)m[hy][hx]=hazardType;
    }
  }
  
  // Place destructible crates
  const crates=[];
  const lootTable=MINE_LOOT_TABLES[Math.min(level, MINE_LOOT_TABLES.length-1)];
  for(const r of rooms){
    if(r.type==='treasure'){
      // Treasure rooms get lots of crates
      for(let j=0;j<3+Math.floor(Math.random()*3);j++){
        const cx2=r.rx+1+Math.floor(Math.random()*(r.w-2));
        const cy2=r.ry+1+Math.floor(Math.random()*(r.h-2));
        if(m[cy2]&&m[cy2][cx2]===T.STONE)crates.push({x:cx2,y:cy2,hp:3,loot:lootTable[Math.floor(Math.random()*lootTable.length)]});
      }
    } else if(Math.random()<0.3){
      const cx2=r.rx+1+Math.floor(Math.random()*Math.max(1,r.w-2));
      const cy2=r.ry+1+Math.floor(Math.random()*Math.max(1,r.h-2));
      if(m[cy2]&&m[cy2][cx2]===T.STONE)crates.push({x:cx2,y:cy2,hp:3,loot:lootTable[Math.floor(Math.random()*lootTable.length)]});
    }
  }
  
  // Stairs
  const stairsUp={x:rooms[0].x, y:rooms[0].y};
  const stairsDown=level<4?{x:rooms[rooms.length-1].x, y:rooms[rooms.length-1].y}:null;
  
  // Loot
  const loot=[];
  const lootCount=3+Math.floor(Math.random()*4)+level;
  for(let i=0;i<lootCount;i++){
    const room=rooms[1+Math.floor(Math.random()*(rooms.length-1))];
    const lx=room.x+Math.floor(Math.random()*3)-1;
    const ly=room.y+Math.floor(Math.random()*2)-1;
    if(m[ly]&&m[ly][lx]===T.STONE){
      loot.push({x:lx,y:ly,id:lootTable[Math.floor(Math.random()*lootTable.length)]});
    }
  }
  
  // Enemies — more enemies, placed in rooms
  const enemies=[];
  const enemyCount=5+level*3+Math.floor(Math.random()*4);
  const enemyTypes=level<1?['malware_bot','phishing_worm']:level<2?['malware_bot','phishing_worm','script_kiddie']:level<3?['script_kiddie','cryptojacker','ransomware']:level<4?['cryptojacker','ransomware','fiat_printer']:['ransomware','fiat_printer','zero_day'];
  for(let i=0;i<enemyCount;i++){
    const room=rooms[1+Math.floor(Math.random()*(rooms.length-1))];
    const ex=room.rx+1+Math.floor(Math.random()*Math.max(1,room.w-2));
    const ey=room.ry+1+Math.floor(Math.random()*Math.max(1,room.h-2));
    if(m[ey]&&m[ey][ex]===T.STONE){
      const type=enemyTypes[Math.floor(Math.random()*enemyTypes.length)];
      const info=MINE_ENEMIES[type];
      enemies.push({x:ex,y:ey,type,hp:info.hp,maxHp:info.hp,alive:true,
        _mt:0,_atkCd:0,_hitFlash:0,_lungeX:0,_lungeY:0,_telegraphing:0,
        _patrolDir:Math.random()<0.5?1:-1,_spawnTimer:0,_visible:type!=='zero_day',
        _grabbed:false,_phase:1,_shockwaveTimer:0,_zigzag:0});
    }
  }
  // Ambush rooms get extra enemies
  for(const r of rooms){
    if(r.type==='ambush'){
      for(let j=0;j<2+Math.floor(Math.random()*2);j++){
        const ex=r.rx+1+Math.floor(Math.random()*Math.max(1,r.w-2));
        const ey=r.ry+1+Math.floor(Math.random()*Math.max(1,r.h-2));
        if(m[ey]&&m[ey][ex]===T.STONE){
          const type=enemyTypes[Math.floor(Math.random()*enemyTypes.length)];
          enemies.push({x:ex,y:ey,type,hp:MINE_ENEMIES[type].hp,maxHp:MINE_ENEMIES[type].hp,alive:true,
            _mt:0,_atkCd:0,_hitFlash:0,_lungeX:0,_lungeY:0,_telegraphing:0,
            _patrolDir:Math.random()<0.5?1:-1,_spawnTimer:0,_visible:type!=='zero_day',
            _grabbed:false,_phase:1,_shockwaveTimer:0,_zigzag:0});
        }
      }
    }
  }
  // Boss on level 5
  if(level>=4&&rooms.length>2){
    const bossRoom=rooms[rooms.length-1];
    enemies.push({x:bossRoom.x,y:bossRoom.y,type:'pool_operator',hp:MINE_ENEMIES.pool_operator.hp,maxHp:MINE_ENEMIES.pool_operator.hp,alive:true,
      _mt:0,_atkCd:0,_hitFlash:0,_lungeX:0,_lungeY:0,_telegraphing:0,
      _patrolDir:1,_spawnTimer:0,_visible:true,_grabbed:false,_phase:1,_shockwaveTimer:0,_zigzag:0});
  }
  
  // Reset combat state for new floor
  mineCrates=crates;
  mineFirewalls=[];
  mineParticles=[];
  enemyProjectiles=[];
  dangerState=null;
  
  return {map:m,w,h,enemies,loot,stairsUp,stairsDown,rooms,torches,decorations,crates};
}

function enterMine(){
  mineReturnX=player.x;mineReturnY=player.y;
  mineLevel=0;
  startTransition('fadeOut',0.5,()=>{
    mineFloor=generateMineFloor(mineLevel);
    player.x=mineFloor.stairsUp.x*TILE+8;
    player.y=mineFloor.stairsUp.y*TILE+8;
    cam.x=player.x*SCALE-canvas.width/2;
    cam.y=player.y*SCALE-canvas.height/2;
    startTransition('fadeIn',0.5,null);
    notify('⛏️ Entered the Abandoned Data Center — Level '+(mineLevel+1),3);
  });
}

function exitMine(){
  startTransition('fadeOut',0.4,()=>{
    mineFloor=null;combat=null;
    // Place player south of mine entrance (not behind walls)
    player.x=50*TILE+8;player.y=8*TILE+8;
    cam.x=player.x*SCALE-canvas.width/2;
    cam.y=player.y*SCALE-canvas.height/2;
    startTransition('fadeIn',0.4,null);
    notify('Exited the mines.',2);
  });
}

function goDeeper(){
  mineLevel++;
  startTransition('fadeOut',0.3,()=>{
    mineFloor=generateMineFloor(mineLevel);
    player.x=mineFloor.stairsUp.x*TILE+8;
    player.y=mineFloor.stairsUp.y*TILE+8;
    cam.x=player.x*SCALE-canvas.width/2;
    cam.y=player.y*SCALE-canvas.height/2;
    startTransition('fadeIn',0.3,null);
    notify('⛏️ Descended to Level '+(mineLevel+1)+(mineLevel>=4?' — THE BOSS AWAITS':''),3);
  });
}

// Old turn-based combat removed — using real-time action combat instead
function startCombat(enemy){/* deprecated — no-op */}
function playerAttack(){/* deprecated — no-op */}

// ---- MINE RENDERING (Phase 2: moved from game.js) ----
function drawMine(){
  if(!mineFloor)return;
  const f=mineFloor;
  // Screen shake — bigger now, scales with shake intensity
  if(screenShake>0){
    const shakeMag=Math.min(1,screenShake)*16;
    cam.x+=(Math.random()-0.5)*shakeMag;cam.y+=(Math.random()-0.5)*shakeMag;
  }
  // Draw floor tiles
  for(let y=0;y<f.h;y++)for(let x=0;x<f.w;x++){
    const sx=x*ST-cam.x,sy=y*ST-cam.y;
    if(sx>canvas.width+ST||sy>canvas.height+ST||sx<-ST||sy<-ST)continue;
    if(f.map[y][x]===T.CLIFF){
      // Dark concrete walls
      ctx.fillStyle='#18181E';ctx.fillRect(sx,sy,ST,ST);
      ctx.fillStyle='#1E1E26';ctx.fillRect(sx+2,sy+2,ST-4,ST-4);
      // Random cracks
      const cs=(x*17+y*31)%13;
      if(cs<3){ctx.fillStyle='#141418';ctx.fillRect(sx+8+cs*6,sy+4,1,ST-8);}
      if(cs>9){ctx.fillStyle='#141418';ctx.fillRect(sx+4,sy+10+cs%4*6,ST-8,1);}
    }else{
      // Data center floor — industrial tiles
      ctx.fillStyle='#34343E';ctx.fillRect(sx,sy,ST,ST);
      // Floor tile grid
      ctx.fillStyle='#2E2E38';ctx.fillRect(sx,sy,ST,1);ctx.fillRect(sx,sy,1,ST);
      // Random floor detail (cables, debris)
      const fs=(x*23+y*7)%19;
      if(fs<2){ctx.fillStyle='#44444E';ctx.fillRect(sx+6,sy+ST/2-1,ST-12,2);} // cable
      if(fs===5){ctx.fillStyle='#2A2A34';ctx.beginPath();ctx.arc(sx+ST/2,sy+ST/2,4,0,Math.PI*2);ctx.fill();} // floor vent
      if(fs===10){ctx.fillStyle='#404048';ctx.fillRect(sx+10,sy+10,8,6);} // debris
    }
    // Hazard tiles
    if(f.map[y][x]===T_LAVA){
      ctx.fillStyle='#34343E';ctx.fillRect(sx,sy,ST,ST);
      const lavaGlow=0.5+Math.sin(_now/300+x*2+y*3)*0.3;
      ctx.fillStyle=`rgba(255,80,20,${0.4+lavaGlow*0.3})`;ctx.fillRect(sx+2,sy+2,ST-4,ST-4);
      ctx.fillStyle=`rgba(255,160,40,${0.2+lavaGlow*0.2})`;ctx.fillRect(sx+8,sy+8,ST-16,ST-16);
      ctx.fillStyle=`rgba(255,200,60,${lavaGlow*0.15})`;ctx.beginPath();ctx.arc(sx+ST/2,sy+ST/2,ST*0.6,0,Math.PI*2);ctx.fill();
    }
    if(f.map[y][x]===T_ELECTRIC){
      ctx.fillStyle='#34343E';ctx.fillRect(sx,sy,ST,ST);
      const elecGlow=Math.random()>0.85?0.8:0.2;
      ctx.fillStyle=`rgba(80,180,255,${elecGlow})`;ctx.fillRect(sx+4,sy+4,ST-8,ST-8);
      if(elecGlow>0.5){ctx.strokeStyle='rgba(150,220,255,0.8)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(sx+ST/2,sy+4);
        ctx.lineTo(sx+ST/2+Math.random()*10-5,sy+ST/2);ctx.lineTo(sx+ST/2,sy+ST-4);ctx.stroke();}
    }
  }
  // Draw firewall tiles
  for(const fw of mineFirewalls){
    const fsx=fw.x*ST-cam.x,fsy=fw.y*ST-cam.y;
    if(fsx>canvas.width+ST||fsy>canvas.height+ST||fsx<-ST||fsy<-ST)continue;
    const fwAlpha=Math.min(1,fw.timer/2);
    ctx.fillStyle=`rgba(200,40,40,${0.4*fwAlpha})`;ctx.fillRect(fsx,fsy,ST,ST);
    ctx.strokeStyle=`rgba(255,100,100,${0.6*fwAlpha})`;ctx.lineWidth=2;ctx.strokeRect(fsx+2,fsy+2,ST-4,ST-4);
    ctx.fillStyle=`rgba(255,60,60,${0.2+Math.sin(_now/200)*0.1})`;ctx.font='14px serif';ctx.textAlign='center';ctx.fillText('🔥',fsx+ST/2,fsy+ST/2+5);
  }
  // Draw crates
  for(const cr of mineCrates){
    const csx=cr.x*ST-cam.x,csy=cr.y*ST-cam.y;
    if(csx>canvas.width+ST||csy>canvas.height+ST||csx<-ST||csy<-ST)continue;
    ctx.fillStyle='#6B4E2A';ctx.fillRect(csx+6,csy+8,ST-12,ST-12);
    ctx.fillStyle='#8B6E3A';ctx.fillRect(csx+8,csy+10,ST-16,ST-16);
    ctx.strokeStyle='#4A3520';ctx.lineWidth=1;ctx.strokeRect(csx+6,csy+8,ST-12,ST-12);
    ctx.fillStyle='#FFD700';ctx.fillRect(csx+ST/2-3,csy+ST/2-1,6,4);
    // Show HP dots
    for(let ch=0;ch<cr.hp;ch++){ctx.fillStyle='#4F4';ctx.fillRect(csx+10+ch*8,csy+ST-6,4,3);}
  }
  // Draw stairs
  if(f.stairsUp){const sx=f.stairsUp.x*ST-cam.x,sy=f.stairsUp.y*ST-cam.y;
    ctx.fillStyle='#4A4A55';ctx.fillRect(sx+4,sy+4,ST-8,ST-8);
    ctx.fillStyle=C.green;ctx.font=`bold 16px ${FONT}`;ctx.textAlign='center';ctx.fillText('⬆️',sx+ST/2,sy+ST/2+5);
    ctx.fillStyle='#AAA';ctx.font=`10px ${FONT}`;ctx.fillText(mineLevel===0?'[X] EXIT':'[X] UP',sx+ST/2,sy+ST-4);
  }
  if(f.stairsDown){const sx=f.stairsDown.x*ST-cam.x,sy=f.stairsDown.y*ST-cam.y;
    ctx.fillStyle='#2A2A35';ctx.fillRect(sx+4,sy+4,ST-8,ST-8);
    ctx.fillStyle=C.orange;ctx.font=`bold 16px ${FONT}`;ctx.textAlign='center';ctx.fillText('⬇️',sx+ST/2,sy+ST/2+5);
    ctx.fillStyle='#AAA';ctx.font=`10px ${FONT}`;ctx.fillText('[X] DEEPER',sx+ST/2,sy+ST-4);
  }
  // Draw loot
  for(const l of f.loot){
    const sx=l.x*ST-cam.x,sy=l.y*ST-cam.y;
    const glow=0.5+Math.sin(_now/400)*0.3;
    ctx.fillStyle=`rgba(247,147,26,${glow*0.15})`;ctx.beginPath();ctx.arc(sx+ST/2,sy+ST/2,14,0,Math.PI*2);ctx.fill();
    const it=ITEMS[l.id];
    ctx.font='18px serif';ctx.textAlign='center';ctx.fillText(it?it.icon:'?',sx+ST/2,sy+ST/2+6);
  }
  // Draw enemies — styled pixel art
  for(const en of f.enemies){
    if(!en.alive)continue;
    const sx=en.x*ST-cam.x,sy=en.y*ST-cam.y;
    const info=MINE_ENEMIES[en.type];
    const t=_t;
    const bob=Math.sin(t*3+en.x+en.y)*2;
    // Apply lunge offset
    const lx=(en._lungeX||0)*SCALE, ly=(en._lungeY||0)*SCALE;
    const esx=sx+lx, esy=sy+ly;
    // Hit flash — draw white overlay
    const hitFlash=(en._hitFlash||0)>0;
    
    // Shadow
    ctx.fillStyle='rgba(0,0,0,0.3)';ctx.beginPath();ctx.ellipse(esx+ST/2,esy+ST-2,12,4,0,0,Math.PI*2);ctx.fill();
    
    if(en.type==='malware_bot'){
      // Small robot — grey box with red eye
      ctx.fillStyle='#556';ctx.fillRect(sx+10,sy+14+bob,ST-20,ST-18);
      ctx.fillStyle='#445';ctx.fillRect(sx+10,sy+14+bob,ST-20,6);
      ctx.fillStyle='#F33';ctx.fillRect(sx+ST/2-3,sy+18+bob,6,4); // red eye
      ctx.fillStyle='#667';ctx.fillRect(sx+12,sy+ST-8,4,6); // leg
      ctx.fillRect(sx+ST-16,sy+ST-8,4,6);
      // Antenna
      ctx.fillStyle='#778';ctx.fillRect(sx+ST/2-1,sy+10+bob,2,6);
      ctx.fillStyle='#F33';ctx.fillRect(sx+ST/2-2,sy+8+bob,4,4);
    } else if(en.type==='script_kiddie'){
      // Hoodie figure — dark purple
      ctx.fillStyle='#424';ctx.fillRect(sx+8,sy+16+bob,ST-16,ST-20); // body
      ctx.fillStyle='#535';ctx.fillRect(sx+10,sy+12+bob,ST-20,8); // hood
      ctx.fillStyle='#0F0';ctx.fillRect(sx+14,sy+18+bob,ST-28,6); // green screen glow on face
      ctx.fillStyle='#313';ctx.fillRect(sx+12,sy+ST-8,5,6); ctx.fillRect(sx+ST-17,sy+ST-8,5,6); // legs
    } else if(en.type==='ransomware'){
      // Skull-shaped threat — dark red
      ctx.fillStyle='#622';ctx.beginPath();ctx.arc(sx+ST/2,sy+ST/2+bob,14,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#411';ctx.fillRect(sx+12,sy+ST/2+4+bob,ST-24,10); // jaw
      ctx.fillStyle='#F44';ctx.fillRect(sx+14,sy+ST/2-4+bob,5,5); // left eye
      ctx.fillRect(sx+ST-19,sy+ST/2-4+bob,5,5);
      // Lock symbol
      ctx.fillStyle='#FF0';ctx.fillRect(sx+ST/2-3,sy+ST/2+6+bob,6,5);
      ctx.fillRect(sx+ST/2-2,sy+ST/2+2+bob,4,5);
    } else if(en.type==='pool_operator'){
      // Big boss — tall dark figure with golden crown
      ctx.fillStyle='#222';ctx.fillRect(sx+6,sy+10+bob,ST-12,ST-12); // body
      ctx.fillStyle='#333';ctx.fillRect(sx+8,sy+12+bob,ST-16,ST-16);
      // Face
      ctx.fillStyle='#F70';ctx.fillRect(sx+12,sy+16+bob,6,4); // left eye
      ctx.fillRect(sx+ST-18,sy+16+bob,6,4);
      ctx.fillStyle='#F00';ctx.fillRect(sx+14,sy+24+bob,ST-28,3); // mouth
      // Crown
      ctx.fillStyle='#FFD700';
      ctx.fillRect(sx+8,sy+6+bob,ST-16,5);
      ctx.fillRect(sx+10,sy+2+bob,4,6);ctx.fillRect(sx+ST/2-2,sy+1+bob,4,7);ctx.fillRect(sx+ST-14,sy+2+bob,4,6);
      // Glow
      ctx.fillStyle=`rgba(255,215,0,${0.1+Math.sin(t*2)*0.05})`;
      ctx.beginPath();ctx.arc(sx+ST/2,sy+ST/2+bob,24,0,Math.PI*2);ctx.fill();
    } else if(en.type==='phishing_worm'){
      // Segmented worm — green, slinky movement
      const wPhase=t*4+en.x*2;
      for(let seg=0;seg<5;seg++){
        const segX=esx+ST/2-2+Math.sin(wPhase+seg*0.8)*6;
        const segY=esy+10+seg*7+bob;
        const segSize=seg===0?8:seg===4?4:6;
        ctx.fillStyle=seg===0?'#5F5':'#4A4';
        ctx.beginPath();ctx.arc(segX,segY,segSize/2,0,Math.PI*2);ctx.fill();
      }
      // Eyes on head
      ctx.fillStyle='#F00';ctx.fillRect(esx+ST/2-4,esy+10+bob,2,2);ctx.fillRect(esx+ST/2+2,esy+10+bob,2,2);
    } else if(en.type==='cryptojacker'){
      // Hooded figure with pickaxe — dark with orange glow
      ctx.fillStyle='#2A1A0A';ctx.fillRect(esx+8,esy+12+bob,ST-16,ST-16); // body
      ctx.fillStyle='#3A2A1A';ctx.fillRect(esx+10,esy+8+bob,ST-20,10); // hood
      ctx.fillStyle='#F7931A';ctx.fillRect(esx+14,esy+14+bob,3,3);ctx.fillRect(esx+ST-17,esy+14+bob,3,3); // orange eyes
      // Mini pickaxe
      ctx.fillStyle='#888';ctx.fillRect(esx+ST-12,esy+20+bob,8,2);
      ctx.fillStyle='#664';ctx.fillRect(esx+ST-8,esy+20+bob,2,8);
      // Stolen hash particles
      ctx.fillStyle=`rgba(247,147,26,${0.3+Math.sin(t*4)*0.2})`;
      ctx.font='8px serif';ctx.textAlign='center';ctx.fillText('₿',esx+ST/2+Math.sin(t*3)*8,esy+4+bob);
    } else if(en.type==='fiat_printer'){
      // Boxy printer machine — grey with green money spewing
      ctx.fillStyle='#555';ctx.fillRect(esx+6,esy+14+bob,ST-12,ST-18); // body
      ctx.fillStyle='#666';ctx.fillRect(esx+8,esy+12+bob,ST-16,4); // top
      ctx.fillStyle='#777';ctx.fillRect(esx+10,esy+16+bob,ST-20,8); // paper slot
      // Spewing fiat bills
      const billPhase=t*5;
      for(let b=0;b<3;b++){
        const bx=esx+ST/2+Math.sin(billPhase+b*2.1)*12;
        const by=esy+8-b*8+Math.sin(billPhase+b)*4+bob;
        ctx.fillStyle=`rgba(100,200,100,${0.7-b*0.2})`;ctx.fillRect(bx-4,by,8,5);
        ctx.fillStyle='#060';ctx.font='6px sans-serif';ctx.textAlign='center';ctx.fillText('$',bx,by+5);
      }
      // Red warning light
      ctx.fillStyle=`rgba(255,0,0,${0.5+Math.sin(t*6)*0.4})`;ctx.fillRect(esx+ST/2-2,esy+12+bob,4,3);
    } else if(en.type==='zero_day'){
      // Spider-like, dark, partially invisible
      const stealth=0.4+Math.sin(t*2)*0.3; // flickers in and out
      ctx.globalAlpha=stealth;
      // Body
      ctx.fillStyle='#1A0A1A';ctx.beginPath();ctx.arc(esx+ST/2,esy+ST/2+bob,10,0,Math.PI*2);ctx.fill();
      // 8 legs
      ctx.strokeStyle='#2A1A2A';ctx.lineWidth=1.5;
      for(let leg=0;leg<8;leg++){
        const angle=leg*Math.PI/4+Math.sin(t*3+leg)*0.2;
        const legLen=12+Math.sin(t*2+leg*1.5)*3;
        ctx.beginPath();
        ctx.moveTo(esx+ST/2+Math.cos(angle)*6,esy+ST/2+bob+Math.sin(angle)*6);
        ctx.lineTo(esx+ST/2+Math.cos(angle)*legLen,esy+ST/2+bob+Math.sin(angle)*legLen);
        ctx.stroke();
      }
      // Glowing red eyes
      ctx.fillStyle='#F00';
      ctx.fillRect(esx+ST/2-5,esy+ST/2-2+bob,3,3);ctx.fillRect(esx+ST/2+2,esy+ST/2-2+bob,3,3);
      // Small secondary eyes
      ctx.fillRect(esx+ST/2-7,esy+ST/2+bob,2,2);ctx.fillRect(esx+ST/2+5,esy+ST/2+bob,2,2);
      ctx.globalAlpha=1;
    }
    
    // Hit flash overlay
    if(hitFlash){ctx.fillStyle='rgba(255,255,255,0.6)';ctx.fillRect(sx+6,sy+8,ST-12,ST-10);}
    
    // HP bar
    const hpPct=en.hp/info.hp;
    ctx.fillStyle='#111';ctx.fillRect(sx+4,sy-2,ST-8,6);
    ctx.fillStyle=hpPct>0.5?'#4F4':hpPct>0.25?C.orange:C.red;
    ctx.fillRect(sx+5,sy-1,(ST-10)*hpPct,4);
    // Name
    ctx.fillStyle=info.boss?C.gold:'#AAA';ctx.font=`bold ${info.boss?12:10}px ${FONT}`;ctx.textAlign='center';
    ctx.fillText(info.name,sx+ST/2,sy-6);
    if(info.boss){ctx.fillStyle=C.gold;ctx.fillText('⚠️ BOSS',sx+ST/2,sy-18);}
  }
  // ---- Sprint 20: Target reticle on auto-attack target ----
  if(mineAutoAttackTarget && mineAutoAttackTarget.alive){
    const tEn=mineAutoAttackTarget;
    const tsx=tEn.x*ST-cam.x+ST/2, tsy=tEn.y*ST-cam.y+ST/2;
    const pulse=0.6+Math.sin(_now/120)*0.4;
    const r=ST*0.7+Math.sin(_now/180)*2;
    ctx.strokeStyle=`rgba(255,160,40,${pulse})`;
    ctx.lineWidth=2;
    // Four corner brackets
    const br=r, bl=8;
    ctx.beginPath();
    // Top-left
    ctx.moveTo(tsx-br,tsy-br+bl); ctx.lineTo(tsx-br,tsy-br); ctx.lineTo(tsx-br+bl,tsy-br);
    // Top-right
    ctx.moveTo(tsx+br-bl,tsy-br); ctx.lineTo(tsx+br,tsy-br); ctx.lineTo(tsx+br,tsy-br+bl);
    // Bottom-right
    ctx.moveTo(tsx+br,tsy+br-bl); ctx.lineTo(tsx+br,tsy+br); ctx.lineTo(tsx+br-bl,tsy+br);
    // Bottom-left
    ctx.moveTo(tsx-br+bl,tsy+br); ctx.lineTo(tsx-br,tsy+br); ctx.lineTo(tsx-br,tsy+br-bl);
    ctx.stroke();
    // Center dot
    ctx.fillStyle=`rgba(255,200,80,${pulse*0.8})`;
    ctx.beginPath();ctx.arc(tsx,tsy,2,0,Math.PI*2);ctx.fill();
  }

  // ---- Sprint 20: Attack-ready / cooldown ring around player feet ----
  {
    const psx=player.x*SCALE-cam.x, psy=player.y*SCALE-cam.y+ST/2-2;
    if (attackCooldown>0) {
      // Cooldown: arc fills as cooldown decreases
      const prog=1-(attackCooldown/0.4);
      ctx.strokeStyle='rgba(120,160,200,0.55)';
      ctx.lineWidth=2.5;
      ctx.beginPath();ctx.arc(psx,psy,14,-Math.PI/2,-Math.PI/2+prog*Math.PI*2);ctx.stroke();
    } else if (attackReadyFlash>0) {
      // Brief white flash when ready again
      const a=attackReadyFlash/0.18;
      ctx.strokeStyle=`rgba(255,255,255,${a*0.85})`;
      ctx.lineWidth=3;
      ctx.beginPath();ctx.arc(psx,psy,14+(1-a)*6,0,Math.PI*2);ctx.stroke();
    }
  }

  // ---- Sprint 20: Player lunge offset during swing ----
  // Hack player.x/y temporarily so drawPlayer renders shifted toward target.
  const _px0=player.x, _py0=player.y;
  if (playerLungeX !== 0 || playerLungeY !== 0) {
    player.x += playerLungeX;
    player.y += playerLungeY;
  }
  // Draw player
  drawPlayer();
  // Restore
  player.x=_px0; player.y=_py0;
  
  // Weapon swing animation
  if(playerSwing>0){
    const px2=player.x*SCALE-cam.x,py2=player.y*SCALE-cam.y;
    const swProg=1-playerSwing/0.3;
    const swAngle=swProg*Math.PI*1.5-Math.PI*0.75;
    const swR=32;
    ctx.save();ctx.translate(px2,py2);ctx.rotate(swAngle);
    // Swing trail
    ctx.strokeStyle=`rgba(255,220,100,${0.6*(1-swProg)})`;ctx.lineWidth=4;
    ctx.beginPath();ctx.arc(0,0,swR,-0.4,0.4);ctx.stroke();
    // Pickaxe head
    ctx.fillStyle='#AAA';ctx.fillRect(swR-6,-5,10,10);
    ctx.fillStyle='#8B6340';ctx.fillRect(0,-2,swR-6,4); // handle
    ctx.restore();
  }
  
  // Projectiles & skill effects
  for(const p of projectiles){
    if(p.type==='orangePill'){
      const psx=p.x*SCALE-cam.x,psy=p.y*SCALE-cam.y;
      // Trail
      if(p.trail){for(const t of p.trail){
        ctx.fillStyle=`rgba(247,147,26,${t.life})`;
        ctx.beginPath();ctx.arc(t.x-cam.x,t.y-cam.y,4+t.life*6,0,Math.PI*2);ctx.fill();
      }}
      // Pill
      ctx.fillStyle=C.orange;ctx.beginPath();ctx.arc(psx,psy,8,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#FFF';ctx.font=`bold 10px ${FONT}`;ctx.textAlign='center';ctx.fillText('₿',psx,psy+3);
      // Glow
      ctx.fillStyle='rgba(247,147,26,0.15)';ctx.beginPath();ctx.arc(psx,psy,18,0,Math.PI*2);ctx.fill();
    }
    else if(p.type==='lightning'){
      const lx=player.x*SCALE-cam.x,ly=player.y*SCALE-cam.y;
      const prog=1-p.life/0.5;
      ctx.strokeStyle=`rgba(255,221,68,${(1-prog)*0.6})`;ctx.lineWidth=2;
      // Lightning bolts to each enemy
      if(mineFloor){for(const en of mineFloor.enemies){
        if(!en.alive)continue;
        const ex=en.x*ST+ST/2-cam.x,ey=en.y*ST+ST/2-cam.y;
        if(Math.hypot(ex-lx,ey-ly)<p.radius){
          ctx.beginPath();ctx.moveTo(lx,ly);
          // Jagged line
          const segs=5;
          for(let s=1;s<=segs;s++){
            const t2=s/segs;
            ctx.lineTo(lx+(ex-lx)*t2+(Math.random()-0.5)*30,ly+(ey-ly)*t2+(Math.random()-0.5)*30);
          }
          ctx.stroke();
        }
      }}
      // Central flash
      ctx.fillStyle=`rgba(255,255,200,${(1-prog)*0.2})`;ctx.beginPath();ctx.arc(lx,ly,p.radius*(0.5+prog*0.5),0,Math.PI*2);ctx.fill();
    }
    else if(p.type==='hashAttack'){
      const hx=player.x*SCALE-cam.x,hy=player.y*SCALE-cam.y;
      const prog=1-p.life/0.8;
      const r=p.radius*prog;
      // Expanding red ring
      ctx.strokeStyle=`rgba(255,68,68,${(1-prog)*0.7})`;ctx.lineWidth=4;
      ctx.beginPath();ctx.arc(hx,hy,r,0,Math.PI*2);ctx.stroke();
      // Inner glow
      ctx.fillStyle=`rgba(255,100,50,${(1-prog)*0.15})`;ctx.beginPath();ctx.arc(hx,hy,r*0.7,0,Math.PI*2);ctx.fill();
      // Hash symbols flying outward
      ctx.fillStyle=`rgba(255,68,68,${(1-prog)*0.8})`;ctx.font=`bold 14px ${FONT}`;ctx.textAlign='center';
      for(let a=0;a<6;a++){
        const angle=a*Math.PI/3+prog*2;
        ctx.fillText('#',hx+Math.cos(angle)*r*0.6,hy+Math.sin(angle)*r*0.6);
      }
    }
  }
  
  // Death particles (explosion + loot sparkle)
  for(const dp of deathParticles){
    ctx.globalAlpha=Math.min(1,dp.life*2);
    ctx.fillStyle=dp.color;
    ctx.beginPath();ctx.arc(dp.x-cam.x,dp.y-cam.y,dp.size*dp.life,0,Math.PI*2);ctx.fill();
  }
  ctx.globalAlpha=1;
  
  // Enemy projectiles
  for(const ep of enemyProjectiles){
    const epx=ep.x*SCALE-cam.x,epy=ep.y*SCALE-cam.y;
    if(ep.type==='code_snippet'){
      ctx.fillStyle='#0F0';ctx.font=`bold 10px ${FONT}`;ctx.textAlign='center';
      ctx.fillText('</>', epx, epy);
      ctx.fillStyle='rgba(0,255,0,0.15)';ctx.beginPath();ctx.arc(epx,epy,8,0,Math.PI*2);ctx.fill();
    } else if(ep.type==='boss_orb'){
      ctx.fillStyle='rgba(255,100,0,0.8)';ctx.beginPath();ctx.arc(epx,epy,10,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='rgba(255,200,50,0.4)';ctx.beginPath();ctx.arc(epx,epy,16,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#FFF';ctx.font=`bold 8px ${FONT}`;ctx.textAlign='center';ctx.fillText('51%',epx,epy+3);
    }
  }
  // Damage numbers — bigger, popping, with arc trajectory
  for(const dn of damageNumbers){
    const dnx=dn.x-cam.x,dny=dn.y-cam.y;
    const a=Math.min(1,dn.life*2);
    const size=dn.size||18;
    // Pop scale on spawn (first 0.15s)
    const initialLife=(dn.text&&dn.text.indexOf('COMBO')>=0)?2.0:(dn.text&&dn.text.indexOf('CRIT')>=0?1.5:1.0);
    const popT=Math.max(0,1-(initialLife-dn.life)/0.15);
    const popScale=1+popT*0.5;
    const drawSize=Math.floor(size*popScale);
    ctx.globalAlpha=a;
    ctx.fillStyle='#000';ctx.font=`bold ${drawSize}px ${FONT}`;ctx.textAlign='center';
    ctx.fillText(dn.text,dnx+2,dny+2);
    ctx.fillStyle=dn.color;
    ctx.fillText(dn.text,dnx,dny);
    ctx.globalAlpha=1;
  }

  // ---- Sprint 20: Combo counter HUD ----
  if (comboSystem.hits > 0) {
    const psx=player.x*SCALE-cam.x, psy=player.y*SCALE-cam.y;
    const cx=psx, cy=psy-ST-12;
    // Background pill
    const txt=comboSystem.hits+' / 3 HITS';
    ctx.font=`bold 14px ${FONT}`;ctx.textAlign='center';
    const tw=ctx.measureText(txt).width+16;
    const th=20;
    const pulse=comboSystem.hits>=2?0.6+Math.sin(_now/100)*0.4:0.8;
    ctx.fillStyle=`rgba(0,0,0,0.65)`;
    ctx.fillRect(cx-tw/2,cy-th/2,tw,th);
    ctx.fillStyle=comboSystem.hits>=2?`rgba(255,80,200,${pulse})`:'rgba(255,200,60,0.95)';
    ctx.fillText(txt,cx,cy+5);
    // Combo timer bar underneath
    const barW=tw-4, barH=2;
    ctx.fillStyle='rgba(255,255,255,0.18)';
    ctx.fillRect(cx-barW/2,cy+th/2,barW,barH);
    ctx.fillStyle=comboSystem.hits>=2?'#FF4FC8':'#FFCC44';
    ctx.fillRect(cx-barW/2,cy+th/2,barW*(comboSystem.timer/1.5),barH);
  }
  // Danger state warning overlay
  if(dangerState&&dangerState.active){
    const dangerPulse=Math.sin(_now/150)*0.15+0.15;
    ctx.fillStyle=`rgba(255,0,0,${dangerPulse})`;ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle='#FF0000';ctx.font=`bold 28px ${FONT}`;ctx.textAlign='center';
    ctx.fillText('⚠️ DANGER ⚠️',canvas.width/2,60);
    ctx.fillStyle='#FFF';ctx.font=`14px ${FONT}`;
    ctx.fillText('Get to safety! '+dangerState.timer.toFixed(1)+'s',canvas.width/2,85);
  }
  // Dodge roll trail
  if(dodgeRoll.active){
    ctx.fillStyle='rgba(247,147,26,0.2)';
    ctx.beginPath();ctx.arc(player.x*SCALE-cam.x,player.y*SCALE-cam.y,24,0,Math.PI*2);ctx.fill();
  }
  
  // Wall torches — drawn on top with warm glow
  if(f.torches){
    for(const tc of f.torches){
      const tsx=tc.x*ST-cam.x,tsy=tc.y*ST-cam.y;
      ctx.fillStyle='#5A3A1A';ctx.fillRect(tsx+ST/2-2,tsy+4,4,12);
      const flicker=Math.sin(_now/200+tc.x*3+tc.y*7)*3;
      ctx.fillStyle='#FF8830';ctx.fillRect(tsx+ST/2-3+flicker,tsy,6,6);
      ctx.fillStyle='#FFCC40';ctx.fillRect(tsx+ST/2-2+flicker,tsy+1,4,3);
      // Warm light pool
      ctx.fillStyle='rgba(255,170,60,0.06)';
      ctx.beginPath();ctx.arc(tsx+ST/2,tsy+ST,80,0,Math.PI*2);ctx.fill();
    }
  }
  
  // Subtle ambient shadow at edges (no black halo — just gentle vignette)
  const px=player.x*SCALE-cam.x,py=player.y*SCALE-cam.y;
  const vigGrad=ctx.createRadialGradient(px,py,canvas.width*0.3,px,py,canvas.width*0.7);
  vigGrad.addColorStop(0,'rgba(0,0,0,0)');
  vigGrad.addColorStop(1,'rgba(0,0,0,0.4)');
  ctx.fillStyle=vigGrad;
  ctx.fillRect(0,0,canvas.width,canvas.height);
  
  // Warm glow around player (subtle)
  ctx.fillStyle='rgba(255,180,80,0.03)';ctx.beginPath();ctx.arc(px,py,150,0,Math.PI*2);ctx.fill();
  
  // Crosshair reticle at mouse position
  ctx.strokeStyle='rgba(247,147,26,0.5)';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.arc(mouseX,mouseY,10,0,Math.PI*2);ctx.stroke();
  ctx.beginPath();ctx.moveTo(mouseX-15,mouseY);ctx.lineTo(mouseX-6,mouseY);ctx.stroke();
  ctx.beginPath();ctx.moveTo(mouseX+6,mouseY);ctx.lineTo(mouseX+15,mouseY);ctx.stroke();
  ctx.beginPath();ctx.moveTo(mouseX,mouseY-15);ctx.lineTo(mouseX,mouseY-6);ctx.stroke();
  ctx.beginPath();ctx.moveTo(mouseX,mouseY+6);ctx.lineTo(mouseX,mouseY+15);ctx.stroke();
  ctx.fillStyle=C.orange;ctx.beginPath();ctx.arc(mouseX,mouseY,2,0,Math.PI*2);ctx.fill();
  // Aim line from player to cursor
  ctx.strokeStyle='rgba(247,147,26,0.12)';ctx.lineWidth=1;ctx.setLineDash([4,4]);
  ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(mouseX,mouseY);ctx.stroke();
  ctx.setLineDash([]);
  
  // Level indicator
  // Mine HUD
  ctx.fillStyle='rgba(0,0,0,0.6)';ctx.fillRect(8,8,220,70);
  ctx.fillStyle=C.orange;ctx.font=`bold 16px ${FONT}`;ctx.textAlign='left';
  ctx.fillText(`⛏️ Data Center — Level ${mineLevel+1}/5`,16,28);
  ctx.fillStyle='#CCC';ctx.font=`13px ${FONT}`;
  ctx.fillText(`Enemies: ${f.enemies.filter(e=>e.alive).length} | Loot: ${f.loot.length}`,16,46);
  // Energy as HP in mines
  ctx.fillStyle='#333';ctx.fillRect(16,54,180,10);
  ctx.fillStyle=player.energy>30?C.green:player.energy>10?C.orange:C.red;
  ctx.fillRect(16,54,180*(player.energy/player.maxEnergy),10);
  ctx.fillStyle=C.white;ctx.font=`bold 10px ${FONT}`;
  ctx.fillText(`HP: ${Math.floor(player.energy)}/${player.maxEnergy}`,16,63);
  // Skill bar
  const skillBarY=canvas.height-70;
  ctx.fillStyle='rgba(0,0,0,0.6)';ctx.fillRect(canvas.width/2-180,skillBarY-4,360,34);
  const skillList=[
    {key:'E',name:'Melee',cd:0,ready:true,color:'#AAA',icon:'⛏️'},
    {key:'1',name:'Orange Pill',cd:skillCooldowns.orangePill,max:COMBAT_SKILLS.orangePill.cooldown,ready:skills.mining.level>=1,color:C.orange,icon:'💊',unlock:1},
    {key:'2',name:'Lightning',cd:skillCooldowns.lightning,max:COMBAT_SKILLS.lightning.cooldown,ready:skills.engineering.level>=3,color:'#FFDD44',icon:'⚡',unlock:3},
    {key:'3',name:'51% Attack',cd:skillCooldowns.hashAttack,max:COMBAT_SKILLS.hashAttack.cooldown,ready:skills.mining.level>=5,color:'#FF4444',icon:'💥',unlock:5},
  ];
  skillList.forEach((sk,i)=>{
    const sx2=canvas.width/2-170+i*88;
    ctx.fillStyle=sk.ready?(sk.cd>0?'rgba(60,60,60,0.8)':'rgba(40,40,50,0.8)'):'rgba(30,30,30,0.5)';
    ctx.fillRect(sx2,skillBarY,80,26);
    ctx.strokeStyle=sk.ready?(sk.cd<=0?sk.color:'#555'):'#333';ctx.lineWidth=1.5;ctx.strokeRect(sx2,skillBarY,80,26);
    // Icon + key
    ctx.font='14px serif';ctx.textAlign='center';ctx.fillText(sk.icon,sx2+16,skillBarY+18);
    ctx.fillStyle=sk.ready?'#FFF':'#555';ctx.font=`bold 10px ${FONT}`;
    ctx.fillText(`[${sk.key}]`,sx2+40,skillBarY+12);
    ctx.font=`9px ${FONT}`;ctx.fillText(sk.name,sx2+52,skillBarY+22);
    // Cooldown overlay
    if(sk.cd>0&&sk.max){const pct=sk.cd/sk.max;ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(sx2,skillBarY,80*pct,26);
      ctx.fillStyle='#FFF';ctx.font=`bold 12px ${FONT}`;ctx.textAlign='center';ctx.fillText(sk.cd.toFixed(1)+'s',sx2+40,skillBarY+18);}
    if(!sk.ready&&sk.unlock){ctx.fillStyle='#666';ctx.font=`9px ${FONT}`;ctx.textAlign='center';ctx.fillText('Lv'+sk.unlock,sx2+40,skillBarY+18);}
  });
  
  // Controls
  ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(0,canvas.height-22,canvas.width,22);
  ctx.fillStyle='#AAA';ctx.font=`12px ${FONT}`;ctx.textAlign='center';
  ctx.fillText('WASD: Move | E: Melee | 1-3: Skills | X: Stairs | Esc: Flee',canvas.width/2,canvas.height-7);
}
