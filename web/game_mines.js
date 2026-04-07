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
    screenShake=0.25;
  }
  finalDmg=Math.floor(finalDmg);
  en.hp-=finalDmg;en._hitFlash=0.2;
  // Knockback
  const kbx=Math.sign(en.x*TILE-player.x),kby=Math.sign(en.y*TILE-player.y);
  const nkx=en.x+kbx,nky=en.y+kby;
  if(nkx>=1&&nkx<MINE_W-1&&nky>=1&&nky<MINE_H-1&&mineFloor.map[nky]&&mineFloor.map[nky][nkx]!==T.CLIFF){en.x=nkx;en.y=nky;}
  // Damage number
  const dmgText=isCombo?'COMBO! -'+finalDmg:(isCrit?'CRIT! -':'-')+finalDmg;
  const dmgColor=isCombo?'#FF00FF':(isCrit?'#FF4444':'#FFDD44');
  damageNumbers.push({x:en.x*ST+ST/2,y:en.y*ST,text:dmgText,life:isCombo?2.0:(isCrit?1.5:1.0),color:dmgColor});
  // Hit sound
  tone(250+Math.random()*200,.06,'square',.05);tone(180,.04,'sawtooth',.03);
  if(!isCombo)screenShake=isCrit?0.15:0.08;
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
