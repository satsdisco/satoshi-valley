// ============================================================
// SATOSHI VALLEY — v0.5 "The Daily Loop Update"
// ============================================================

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// ---- WORLD SCALE (mutable so we can zoom out on small screens) ----
const TILE = 16;
let SCALE = 3;
let ST = TILE * SCALE;
// Flag flipped to true once player + cam are initialized. Lets resize()
// safely decide whether to recenter the camera without doing
// `typeof player`, which throws ReferenceError in the TDZ for `let`/`const`
// declarations on strict engines (iOS Safari). This bug was crashing the
// entire script on mobile since Sprint 19.2.
let _gameStateReady = false;

// ---- TRUE FULLSCREEN (no DPR scaling — keeps text readable) ----
let isLandscape = true, isSmallScreen = false, isPortrait = false;
function resize() {
  // Some in-app webviews (Telegram, WhatsApp, etc.) report innerWidth/innerHeight
  // of 0 when the script first runs, before layout settles. Falling back to
  // document.documentElement or screen dims prevents a zero-sized canvas =
  // pure-black screen on mobile.
  let w = window.innerWidth || document.documentElement.clientWidth || (window.screen && window.screen.width) || 800;
  let h = window.innerHeight || document.documentElement.clientHeight || (window.screen && window.screen.height) || 600;
  if (w < 200) w = 800;
  if (h < 200) h = 600;
  canvas.width = w;
  canvas.height = h;
  isLandscape = canvas.width >= canvas.height;
  isPortrait = !isLandscape;
  // "Small" = either dimension under 900w or 500h — phones, mostly.
  isSmallScreen = canvas.width < 900 || canvas.height < 500;
  // Dynamic world scale: zoom out on small screens so more of the map is visible
  const newScale = isSmallScreen ? 2 : 3;
  if (newScale !== SCALE) {
    SCALE = newScale;
    ST = TILE * SCALE;
    // Recenter camera on player if the game is already running.
    // Use the _gameStateReady flag instead of `typeof player` — the latter
    // throws ReferenceError when `player`/`cam` are TDZ-banned `const`
    // declarations later in the file (iOS Safari).
    if (_gameStateReady) {
      cam.x = player.x * SCALE - canvas.width / 2;
      cam.y = player.y * SCALE - canvas.height / 2;
    }
  }
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 100));
resize();
// One gentle retry after the window load event catches late layout in
// in-app webviews. No spammy setTimeouts / visualViewport listeners — those
// were resizing the canvas mid-frame and tearing the render.
window.addEventListener('load', () => setTimeout(resize, 50));

// ---- CONSTANTS ----
// TILE/SCALE/ST declared above the resize() function since it mutates them.
const MAP_W = 120, MAP_H = 90; // MUCH bigger world
const FONT = '"Courier New", monospace';

// ---- MOBILE DETECTION & TOUCH CONTROLS ----
// Declared BEFORE hudMinimized below — that init block reads isMobile, and a
// `let` reference before declaration is a TDZ crash (black screen on desktop).
// `let` so ?mobile=1 URL param or a runtime toggle can override for testing.
let isMobile = /Android|iPhone|iPad|iPod|webOS/i.test(navigator.userAgent) || ('ontouchstart' in window);
if (typeof location !== 'undefined' && location.search.indexOf('mobile=1') !== -1) isMobile = true;
// ?reset=1 nukes all persisted state (save, HUD prefs, etc.) so we can get a
// clean first-time load on mobile for debugging. Runs before anything reads
// localStorage.
if (typeof location !== 'undefined' && location.search.indexOf('reset=1') !== -1) {
  try { localStorage.clear(); console.log('[sv] reset=1 → localStorage cleared'); } catch (e) {}
}

// ---- HUD VISIBILITY (toggleable, persisted) ----
let hudMinimized = (() => {
  try {
    const v = localStorage.getItem('sv_hud_min');
    if (v !== null) return v === '1';
  } catch (e) {}
  // Default: minimized on mobile/small screens to keep the game world clear of clutter
  return isMobile || isSmallScreen;
})();
function setHudMinimized(v) {
  hudMinimized = !!v;
  try { localStorage.setItem('sv_hud_min', hudMinimized ? '1' : '0'); } catch (e) {}
}
function toggleHud() { setHudMinimized(!hudMinimized); }
const touch = {
  // Virtual joystick state
  joyActive: false, joyStartX: 0, joyStartY: 0, joyX: 0, joyY: 0, joyDx: 0, joyDy: 0,
  // Action buttons
  btnAttack: false, btnInteract: false, btnSkill1: false, btnSkill2: false, btnSkill3: false,
  btnInventory: false, btnPause: false,
  // Touch ID tracking
  joyTouchId: null, actionTouchId: null,
};
const JOYSTICK_RADIUS = 50;
const JOYSTICK_DEAD = 10;

if (isMobile) {
  // ── Unified mobile touch router ─────────────────────────────────────
  // Clean priority order:
  //   1. If ANY modal/menu is open → route to click handler (unchanged)
  //   2. Tutorial skip button → click handler
  //   3. Top bar buttons (pause/inv/hamburger) → fire immediate action
  //   4. Floating UI buttons (HUD toggle, context button, rotate nudge)
  //   5. Hotbar grid → click handler (which handles slot selection)
  //   6. Big USE button (right side, fixed circle)
  //   7. Combat skill buttons (in mines only)
  //   8. Left-side SAFE joystick zone → start joystick
  //   9. Anything else → click handler (tap-to-move)
  //
  // The key invariant: UI buttons are ALWAYS hit-tested before zones,
  // so the joystick can never swallow a button tap.
  function _topBarButtonHit(x, y) {
    if (y >= 50) return null;
    const w = canvas.width;
    if (x > w - 55 && x < w - 10) return 'pause';
    if (x > w - 110 && x < w - 60) return 'inventory';
    if (x > w - 170 && x < w - 120) return 'menu';
    return null;
  }
  function _hotbarHit(x, y) {
    const hb = _hotbarRect;
    if (!hb || hb.w <= 0) return false;
    const pad = 6;
    return x >= hb.x - pad && x <= hb.x + hb.w + pad &&
           y >= hb.y - pad && y <= hb.y + hb.h + pad;
  }
  function _tutorialSkipHit(x, y) {
    if (tutorialDone || tutorialStep >= TUTORIAL_STEPS.length) return false;
    const tw2 = Math.min(650, canvas.width - 60), th2 = 58;
    const tx2 = (canvas.width - tw2)/2, ty2 = canvas.height * 0.14;
    const skipX2 = tx2 + tw2 - 108, skipY2 = ty2 + th2 + 4;
    return x >= skipX2 - 4 && x <= skipX2 + 104 && y >= skipY2 - 4 && y <= skipY2 + 28;
  }
  function _useButtonCenter() {
    // Anchored relative to hotbar top so it never overlaps
    const hb = _hotbarRect;
    const hbTop = (hb && hb.y) ? hb.y : canvas.height - 150;
    return { x: canvas.width - 70, y: hbTop - 60 };
  }
  function _dispatchClick(t) {
    mouseX = t.clientX; mouseY = t.clientY;
    canvas.dispatchEvent(new MouseEvent('click', { clientX: t.clientX, clientY: t.clientY }));
  }

  canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    // Modal/menu states: everything goes through click handler
    if (gameState !== 'playing' || dlg || pauseOpen || shopOpen || invOpen || chestOpen || craftOpen || citadelMenuOpen || mobileMenuOpen) {
      const t0 = e.changedTouches[0];
      if (t0) _dispatchClick(t0);
      return;
    }

    for (const t of e.changedTouches) {
      const cx = t.clientX, cy = t.clientY;

      // 1. Rotate nudge (can appear anywhere mid-screen)
      if (rotateNudgeHit(cx, cy)) { dismissRotateNudge(); return; }

      // 2. Tutorial skip button — MUST be reachable before anything else
      if (_tutorialSkipHit(cx, cy)) { _dispatchClick(t); return; }

      // 3. Top bar buttons
      const topBtn = _topBarButtonHit(cx, cy);
      if (topBtn === 'pause')     { jp['escape'] = true; sfx.menuOpen(); return; }
      if (topBtn === 'inventory') { jp['i'] = true; sfx.menuOpen(); return; }
      if (topBtn === 'menu')      { mobileMenuOpen = true; sfx.menuOpen(); return; }

      // 4. HUD toggle + context button
      if (hudToggleHit(cx, cy)) { toggleHud(); return; }
      if (ctxBtnHit(cx, cy)) {
        const ctxInfo = getInteractContext();
        if (ctxInfo) { jp[ctxInfo.key] = true; }
        return;
      }

      // 5. Hotbar — delegate to click handler for slot logic
      if (_hotbarHit(cx, cy)) { _dispatchClick(t); return; }

      // 6. Big USE button (right side circle)
      const ub = _useButtonCenter();
      if (Math.hypot(cx - ub.x, cy - ub.y) < 42) {
        touch.btnAttack = true;
        touch.actionTouchId = t.identifier;
        if (mineFloor) { jp['e'] = true; }
        else { jp['r'] = true; jp['e'] = true; }
        return;
      }

      // 7. Combat skill buttons (mines only)
      if (mineFloor) {
        if (Math.hypot(cx - (ub.x - 70), cy - (ub.y + 20)) < 32) { touch.btnSkill1 = true; jp['1'] = true; return; }
        if (Math.hypot(cx - (ub.x + 10), cy - (ub.y - 70)) < 32) { touch.btnSkill2 = true; jp['2'] = true; return; }
        if (Math.hypot(cx - (ub.x + 70), cy - (ub.y + 20)) < 32) { touch.btnSkill3 = true; jp['3'] = true; return; }
      }

      // 8. Joystick zone — LEFT HALF, BELOW TOP BAR, ABOVE HOTBAR
      const hb = _hotbarRect;
      const hotbarTop = (hb && hb.y) ? hb.y - 10 : canvas.height - 160;
      const joystickZoneOK = (cy > 55 && cy < hotbarTop && cx < canvas.width * 0.5);
      if (joystickZoneOK && !touch.joyActive) {
        touch.joyActive = true;
        touch.joyStartX = cx; touch.joyStartY = cy;
        touch.joyX = cx; touch.joyY = cy;
        touch.joyTouchId = t.identifier;
        return;
      }

      // 9. Fallback → tap-to-move
      _dispatchClick(t);
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.identifier === touch.joyTouchId) {
        touch.joyX = t.clientX; touch.joyY = t.clientY;
        const dx = touch.joyX - touch.joyStartX, dy = touch.joyY - touch.joyStartY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > JOYSTICK_DEAD) {
          touch.joyDx = dx / dist; touch.joyDy = dy / dist;
        } else {
          touch.joyDx = 0; touch.joyDy = 0;
        }
      }
      if (t.identifier === touch.actionTouchId) {
        mouseX = t.clientX; mouseY = t.clientY;
      }
    }
  }, { passive: false });

  canvas.addEventListener('touchend', e => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.identifier === touch.joyTouchId) {
        touch.joyActive = false; touch.joyDx = 0; touch.joyDy = 0; touch.joyTouchId = null;
      }
      if (t.identifier === touch.actionTouchId) {
        touch.actionTouchId = null;
        touch.btnAttack = false; touch.btnSkill1 = false; touch.btnSkill2 = false; touch.btnSkill3 = false;
      }
    }
  }, { passive: false });
}

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

// Prevent right-click menu on canvas
canvas.addEventListener('contextmenu', e => {
  e.preventDefault();
  // Right-click = Orange Pill skill in mines
  if(mineFloor&&gameState==='playing'&&!shopOpen&&!invOpen&&!dlg){
    if(skills.mining.level>=COMBAT_SKILLS.orangePill.unlockLevel&&skillCooldowns.orangePill<=0){
      skillCooldowns.orangePill=COMBAT_SKILLS.orangePill.cooldown;
      const wx=(e.clientX+cam.x)/SCALE,wy=(e.clientY+cam.y)/SCALE;
      const aimX=wx-player.x,aimY=wy-player.y;
      const aimD=Math.sqrt(aimX*aimX+aimY*aimY)||1;
      const spd=5;
      projectiles.push({x:player.x,y:player.y,vx:(aimX/aimD)*spd*TILE,vy:(aimY/aimD)*spd*TILE,life:1.2,type:'orangePill',dmg:COMBAT_SKILLS.orangePill.dmg+skills.mining.level*2,trail:[]});
      tone(440,.1,'sine',.04);tone(660,.15,'sine',.03);
      playerSwing=0.2;
    } else if(skillCooldowns.orangePill>0){
      notify('💊 Cooling down: '+skillCooldowns.orangePill.toFixed(1)+'s',1);
    }
  }
});

// Shift+Click to place selected item at mouse position
canvas.addEventListener('click', e => {
  if(!e.shiftKey)return; // Only handle shift+click here; normal clicks handled below
  if(gameState!=='playing'||interior||shopOpen||invOpen||craftOpen||chestOpen||dlg||pauseOpen)return;
  const sel=getSelected();if(!sel)return;
  const it=ITEMS[sel.id];if(!it)return;
  const wx=(e.clientX+cam.x)/SCALE,wy=(e.clientY+cam.y)/SCALE;
  const ptx=Math.round(wx/TILE)*TILE+8,pty=Math.round(wy/TILE)*TILE+8;
  const tx=Math.floor(ptx/TILE),ty=Math.floor(pty/TILE);
  if(sel.id==='fence_post'){
    if(!isSolid(tx,ty)&&!fenceSet.has(tx+','+ty)){
      removeItem('fence_post');addFence(tx,ty);sfx.place();notify('🪵 Fence placed!',1.5);
    }else{sfx.error();notify("Can't place fence here!",1.5);}
  }else if(it.type==='rig'){
    if(!isSolid(tx,ty)&&!rigs.some(r=>Math.abs(r.x-ptx)<TILE&&Math.abs(r.y-pty)<TILE)){
      removeItem(sel.id);rigs.push(new Rig(ptx,pty,it.tier));sfx.place();notify(`⛏️ ${it.name} placed!`,2);completeObjective('place_rig');
    }else{sfx.error();notify("Can't place here!",1.5);}
  }else if(sel.id==='solar_panel'||sel.id==='battery'||sel.id==='cooling_fan'||sel.id==='chest'||sel.id==='flower_pot'||sel.id==='torch_item'||sel.id==='bitcoin_sign'||sel.id==='immersion_tank'||sel.id==='mesh_antenna'||sel.id==='satellite_node'||sel.id==='freedom_monument'||sel.id==='bitcoin_academy'||sel.id==='rocket_to_moon'){
    if(!isSolid(tx,ty)&&!placed.some(i=>Math.abs(i.x-ptx)<TILE&&Math.abs(i.y-pty)<TILE)){
      removeItem(sel.id);placed.push({x:ptx,y:pty,type:sel.id});
      if(sel.id==='solar_panel')pwr.panels.push({x:ptx,y:pty});
      if(sel.id==='battery')pwr.batts.push({x:ptx,y:pty});
      sfx.place();notify(`${it.icon} Placed!`,1.5);
      if(sel.id==='solar_panel')completeObjective('place_solar');
    }else{sfx.error();notify("Can't place here!",1.5);}
  }else if(it.type==='animal'){
    const animalType=sel.id==='bee_hive'?'bee':sel.id;
    if(!isSolid(tx,ty)){
      removeItem(sel.id);animals.push(new Animal(ptx,pty,animalType));sfx.place();
      notify(ANIMAL_TYPES[animalType].icon+' '+ANIMAL_TYPES[animalType].name+' placed!',2);addXP('farming',10);
    }else{sfx.error();notify("Can't place here!",1.5);}
  }else if(sel.id==='potato_seed'||sel.id==='tomato_seed'||sel.id==='corn_seed'||sel.id==='pumpkin_seed'){
    if(map[ty]&&map[ty][tx]===T.DIRT&&!crops.some(c=>c.x===tx&&c.y===ty)){
      const cropType=sel.id.replace('_seed','');
      removeItem(sel.id);plantCrop(tx,ty,cropType);sfx.place();
      notify(`🌱 Planted ${CROP_TYPES[cropType].name}!`,2);addXP('farming',5);completeObjective('plant_crop');
    }else{notify("Plant on empty dirt tiles!",1.5);sfx.error();}
  }
});

canvas.addEventListener('click', e => {
  if(e.shiftKey)return; // Shift+click handled by placement handler above
  // ── Mobile quick-menu overlay — handle before anything else ──────
  if(mobileMenuOpen){
    const hit = mobileMenuHitTest(e.clientX, e.clientY);
    if(hit){
      // Close the menu first so the action doesn't re-open it
      mobileMenuOpen = false;
      sfx.menuClose();
      // Fire the appropriate action
      if(hit.key) jp[hit.key] = true;
      return;
    }
    // Tap outside tiles closes the menu
    mobileMenuOpen = false;
    sfx.menuClose();
    return;
  }
  // HUD toggle button — highest priority
  if(hudToggleHit(e.clientX, e.clientY) && !shopOpen && !invOpen && !chestOpen && !dlg && gameState==='playing'){
    toggleHud();
    sfx.menuClose && sfx.menuClose();
    return;
  }
  // Rotate nudge — tap dismisses
  if(rotateNudgeHit(e.clientX, e.clientY)){
    dismissRotateNudge();
    return;
  }
  // Contextual interact button (mobile) — fires the right key for the current context
  if(ctxBtnHit(e.clientX, e.clientY)){
    const ctxInfo = getInteractContext();
    if (ctxInfo) { jp[ctxInfo.key] = true; }
    return;
  }
  // Mine combat: LEFT-CLICK = melee attack (Diablo-style)
  if(mineFloor&&gameState==='playing'&&!shopOpen&&!invOpen&&!dlg){
    const wx=(e.clientX+cam.x)/SCALE, wy=(e.clientY+cam.y)/SCALE;
    // Find nearest enemy near click point (generous range)
    let closest=null,closestDist=TILE*5;
    for(const en of mineFloor.enemies){
      if(!en.alive)continue;
      const d=Math.hypot(en.x*TILE+8-wx,en.y*TILE+8-wy);
      if(d<closestDist){closest=en;closestDist=d;}
    }
    if(closest){
      const distToPlayer=Math.hypot(closest.x*TILE+8-player.x,closest.y*TILE+8-player.y);
      if(distToPlayer<TILE*2.5){
        // In melee range — ATTACK!
        mineAttackEnemy(closest);
      } else {
        // Out of range — walk toward enemy (auto-approach like Diablo)
        mouseTarget={x:closest.x*TILE+8,y:closest.y*TILE+8};
        mineAutoAttackTarget=closest; // will attack when in range
      }
    } else {
      // Clicked empty space — move there
      mouseTarget={x:wx,y:wy};
      clickIndicator={x:wx,y:wy,life:0.8};
      mineAutoAttackTarget=null;
    }
    return;
  }
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
    if (e.clientY>=sy+40&&e.clientY<=sy+66) { shopMode=e.clientX<sx+sw/2?'buy':'sell'; shopCur=0; shopScroll=0; lastShopClickTime=0; return; }
    const ly=sy+112, rowH=32;
    if (e.clientY>=ly) {
      const activeList=shopNpcRole==='seeds'?SEED_SHOP_LIST:shopNpcRole==='tavern'?TAVERN_SHOP_LIST:SHOP_LIST;
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
  // Hotbar (always visible) — use the live rect stored during drawHUD so we always
  // hit-test the REAL drawn slots. Supports N-col × M-row grids (mobile uses 5×2).
  const hb = _hotbarRect;
  const hbPad = isMobile ? 6 : 0;
  if (hb.w > 0 && e.clientY >= hb.y - hbPad && e.clientY <= hb.y + hb.h + hbPad &&
      e.clientX >= hb.x - hbPad && e.clientX <= hb.x + hb.w + hbPad) {
    const relX = e.clientX - hb.x;
    const relY = e.clientY - hb.y;
    const colStride = hb.slotW + hb.slotGap;
    const rowStride = (hb.slotH || hb.slotW) + hb.slotGap;
    const col = Math.floor((relX + hb.slotGap/2) / colStride);
    const row = Math.floor((relY + hb.slotGap/2) / rowStride);
    const cols = hb.cols || hb.n;
    const rows = hb.rows || 1;
    if (col >= 0 && col < cols && row >= 0 && row < rows) {
      const slot = row * cols + col;
      if (slot >= 0 && slot < hb.n) {
        if (isMobile && slot === selSlot) {
          const selItem = inv[selSlot];
          if (selItem) {
            jp['r'] = true;
            jp['g'] = true;
          }
        }
        selSlot = slot;
        sfx.interact();
        return;
      }
    }
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
// Seasonal palettes per market phase
const SEASON_PALETTES = {
  // Accumulation = Spring: fresh greens, flowers blooming
  0: {
    grass:['#1F4D0F','#2A5E18','#347020','#3E8228','#489430'],
    treeLeaf:['#1A4A10','#2A5A1A','#1E5014','#2E6020','#3A7028'],
    treeLeafLight:['#3A7028','#4A8035','#5A9040'],
    flower:['#E8C840','#D04040','#7070E0','#E870B0','#70D0A0','#F0A030'],
  },
  // Hype = Summer: bright, lush, vibrant
  1: {
    grass:['#1A5A08','#2A6A14','#3A7A20','#4A8A2C','#5A9A38'],
    treeLeaf:['#1A5A08','#2A6A14','#1E6010','#2E7020','#3A8028'],
    treeLeafLight:['#4A9030','#5AA040','#6AB050'],
    flower:['#FFD040','#FF5050','#8080FF','#FF80C0','#80E0B0','#FFB040'],
  },
  // Euphoria = Autumn: orange, gold, warm
  2: {
    grass:['#3A5A10','#4A6818','#5A7020','#6A7828','#7A8030'],
    treeLeaf:['#8A5A10','#9A6A18','#AA7A20','#6A4A08','#BA8A28'],
    treeLeafLight:['#CC8820','#DD9930','#EEAA40'],
    flower:['#DDA030','#CC5020','#AA6030','#DD7020','#BB6030','#EE8840'],
  },
  // Capitulation = Winter: muted, grey-blue, bare
  3: {
    grass:['#2A3A20','#3A4A28','#4A5A30','#3A4828','#4A5830'],
    treeLeaf:['#3A4A28','#4A5A30','#3A4828','#4A5830','#5A6838'],
    treeLeafLight:['#5A6838','#6A7848','#7A8858'],
    flower:['#887860','#786850','#AA9870','#988868','#887858','#998868'],
  },
};

function getSeasonalColor(key) {
  const sp = SEASON_PALETTES[econ.phase];
  return sp && sp[key] ? sp[key] : null;
}

const C = {
  // Greens (5 shades for depth) — base, overridden by season
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
  immersion_tank:{name:'Immersion Tank',desc:'Massive cooling boost. Rigs never overheat near this.',icon:'🛢️',type:'upgrade',buy:15000,sell:6000,stack:true},
  mesh_antenna:{name:'Mesh Antenna',desc:'+50% social XP. Spread the orange pill.',icon:'📡',type:'upgrade',buy:3000,sell:1200,stack:true},
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
  beer:{name:'Bitcoin Beer',desc:'Hodl Tavern house brew. Restores 20 energy. Don\'t overdo it!',icon:'🍺',type:'food',buy:80,sell:30,stack:true},
  stew:{name:'Hearty Stew',desc:'Warm beef stew. Restores 50 energy.',icon:'🍲',type:'food',buy:200,sell:80,stack:true},
  pie:{name:'Shepherd\'s Pie',desc:'Classic comfort food. Restores 40 energy + speed boost.',icon:'🥧',type:'food',buy:150,sell:60,stack:true},
  wine:{name:'Block Wine',desc:'Aged wine from the valley. Restores 30 energy.',icon:'🍷',type:'food',buy:300,sell:120,stack:true},
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
  fishing_rod:{name:'Fishing Rod',desc:'Cast into water. Press R facing water!',icon:'🎣',type:'tool',buy:500,sell:200,stack:true},
  // Mine loot
  old_gpu:{name:'Old GPU',desc:'Salvaged GPU card from the data center.',icon:'🖥️',type:'mat',buy:0,sell:800,stack:true},
  server_rack:{name:'Server Rack Part',desc:'Heavy duty rack mount hardware.',icon:'🗄️',type:'mat',buy:0,sell:400,stack:true},
  cooling_unit:{name:'Cooling Unit',desc:'Industrial cooler. Works better than fans.',icon:'❄️',type:'mat',buy:0,sell:600,stack:true},
  fiber_optic:{name:'Fiber Optic Cable',desc:'High-speed network cable.',icon:'🔌',type:'mat',buy:0,sell:300,stack:true},
  rare_chip:{name:'Rare Processor',desc:'Prototype chip from the Satoshi era. Extremely valuable!',icon:'💠',type:'mat',buy:0,sell:5000,stack:true},
  // Late-game sat sinks
  satellite_node:{name:'Satellite Node',desc:'+20% mining income. Broadcast sats from space!',icon:'🛰️',type:'deco',buy:500000,sell:200000,stack:false},
  freedom_monument:{name:'Freedom Monument',desc:'NPC happiness boost. A beacon of sovereignty.',icon:'🗽',type:'deco',buy:200000,sell:80000,stack:false},
  bitcoin_academy:{name:'Bitcoin Academy',desc:'+25% ALL XP gain. Knowledge is power.',icon:'🎓',type:'deco',buy:100000,sell:40000,stack:false},
  rocket_to_moon:{name:'Rocket to the Moon',desc:'+50% ALL income. WAGMI! 🚀',icon:'🚀',type:'deco',buy:1000000,sell:400000,stack:false},
  volcano_drill:{name:'Volcano Mining License',desc:'Unlock geothermal mining. Coming soon!',icon:'🌋',type:'quest',buy:250000,sell:0,stack:false},
  salmon:{name:'Salmon',desc:'Fresh-caught salmon. Sell or eat.',icon:'🐟',type:'food',buy:0,sell:300,stack:true},
  trout:{name:'Trout',desc:'Rainbow trout. Tasty.',icon:'🐠',type:'food',buy:0,sell:200,stack:true},
  bitcoin_fish:{name:'Bitcoin Fish',desc:'A legendary golden fish with a ₿ mark. Extremely rare!',icon:'🐡',type:'food',buy:0,sell:2000,stack:true},
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
// On mobile / small screens, skip the 40-second cinematic intro and jump
// straight to the title menu. Phone players don't want to read 9 timed slides
// before they can even tap a button.
let introStep = (isMobile || isSmallScreen) ? (typeof INTRO_SLIDES !== 'undefined' ? INTRO_SLIDES.length - 1 : 0) : 0;
let introTimer = 0;
let introFade = 1;
let titleMenuOpen = (isMobile || isSmallScreen); // open immediately on mobile
let tutorialStep = 0;
let tutorialDone = false;
let showObjectives = false;
let showSkills = false;
let showJournal = false;
let minimapOpen = true;
let interior = null; // null = overworld, or {type, map, w, h, furniture, doorX, returnX, returnY}
let doorCooldown = 0; // prevent instant re-entry after exiting
let transition = null; // {type:'fadeIn'|'fadeOut', timer, duration, callback}
// titleMenuOpen declared above (defaults open on mobile)
let titleCur = 0;
let titleTip = '';
let interiorNPCs = []; // NPCs present in current interior
let fishing = null; // null or {timer, barPos, barDir, catchZone, catchSize, fish, biting}

const INTERIOR_MAPS = {}; // generated once, keyed by building type


// ============================================================
// INVENTORY
// ============================================================
const INV_SIZE = 20;
const inv = [];
let selSlot = 0;
// Live hotbar rect, updated every frame in drawHUD — used for accurate click/tap hit-testing
let _hotbarRect = {x:0, y:0, w:0, h:0, slotW:44, slotGap:4, n:10};
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
// Cached Perlin noise values per tile (computed once at map gen, avoids ~200 fbm calls/frame)
const tileNoise1 = new Float32Array(MAP_W * MAP_H);
const tileNoise2 = new Float32Array(MAP_W * MAP_H);

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
  // Mine entrance in the mountains
  decor.push({ x: 50, y: 6, type: 'mine_entrance' });
  decor.push({ x: 50, y: 5, type: 'sign', text: '⛏️ Abandoned Data Center' });
  
  // ---- VILLAGE DETAILS — Make the world feel lived-in ----
  // Lamp posts along main road (skip homeX to keep door path clear)
  for(let lx=homeX-12;lx<=homeX+20;lx+=6){
    if(lx===homeX) continue;  // don't block homestead entrance
    decor.push({x:lx,y:homeY+2,type:'lamp'});
  }
  // Benches — on grass beside the path, not ON the path
  decor.push({x:homeX+2,y:homeY+1,type:'bench'});   // beside homestead, north of road
  decor.push({x:homeX+18,y:homeY+1,type:'bench'});   // near tavern area
  decor.push({x:homeX+13,y:homeY-6,type:'bench'});   // near town hall
  // Well — off the main road, in the village green
  decor.push({x:homeX+10,y:homeY+1,type:'well'});
  // Market stalls near Farmer Pete
  decor.push({x:homeX+4,y:homeY+9,type:'market_stall',goods:'🥔🍅🌽'});
  decor.push({x:homeX+7,y:homeY+9,type:'market_stall',goods:'🥩🧀🍯'});
  // Barrels near tavern
  decor.push({x:homeX+19,y:homeY+14,type:'barrel'});
  decor.push({x:homeX+19,y:homeY+15,type:'barrel'});
  // Notice board in village center  
  decor.push({x:homeX+6,y:homeY+3,type:'notice_board'});
  // Flower planters along shop front
  decor.push({x:homeX+4,y:homeY+15,type:'planter'});
  decor.push({x:homeX+11,y:homeY+15,type:'planter'});
  // Flag pole at town hall
  decor.push({x:homeX+16,y:homeY-11,type:'btc_flag'});
  // Woodpile near shed
  decor.push({x:homeX-19,y:homeY-3,type:'woodpile'});
  // Hay bale near garden
  decor.push({x:gardenX+9,y:gardenY+3,type:'hay_bale'});
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
    // Forest (west) — hidden among trees, reward exploration
    {x:15,y:20},{x:8,y:40},{x:20,y:55},{x:12,y:65},{x:6,y:30},
    // Mountains (north) — high altitude finds
    {x:40,y:8},{x:70,y:6},{x:90,y:12},
    // Lake & beaches (east) — shoreline discoveries
    {x:95,y:45},{x:100,y:60},{x:85,y:75},
    // Map edges & corners — reward deep exploration
    {x:5,y:80},{x:110,y:10},{x:105,y:80},{x:60,y:5},
    // Scattered across the valley
    {x:35,y:25},{x:75,y:35},{x:50,y:70},{x:30,y:50},{x:80,y:25},
    // Near buildings — some easier to find
    {x:homeX+25,y:homeY},{x:homeX-8,y:homeY+15},
    // Deep south and northeast
    {x:45,y:82},{x:108,y:30},
  ];
  for (const loc of fragLocations) {
    // Make sure fragment lands on walkable ground
    const fx = Math.max(2, Math.min(MAP_W-3, loc.x));
    const fy = Math.max(2, Math.min(MAP_H-3, loc.y));
    if (map[fy] && SOLID.has(map[fy][fx])) {
      // Move to nearest grass/path
      for (let r = 1; r < 5; r++) {
        for (const [dx,dy] of [[r,0],[-r,0],[0,r],[0,-r]]) {
          const nx=fx+dx, ny=fy+dy;
          if (ny>=0&&ny<MAP_H&&nx>=0&&nx<MAP_W && !SOLID.has(map[ny][nx])) {
            decor.push({ x: nx, y: ny, type: 'seed_fragment' });
            break;
          }
        }
        if (decor[decor.length-1]?.type === 'seed_fragment' && decor[decor.length-1]?.x !== fx) break;
      }
    } else {
      decor.push({ x: fx, y: fy, type: 'seed_fragment' });
    }
  }
  
  // Border
  for (let x = 0; x < MAP_W; x++) { map[0][x] = T.CLIFF; map[MAP_H-1][x] = T.CLIFF; }
  for (let y = 0; y < MAP_H; y++) { map[y][0] = T.CLIFF; map[y][MAP_W-1] = T.CLIFF; }
  // Cache Perlin noise for terrain rendering (avoids ~200 fbm() calls per frame)
  for(let y=0;y<MAP_H;y++)for(let x=0;x<MAP_W;x++){
    const idx=y*MAP_W+x;
    tileNoise1[idx]=fbm(x*0.15+0.5,y*0.15+0.5,2);
    tileNoise2[idx]=fbm(x*0.3+10,y*0.3+10,2);
  }
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
  let cost = next.cost;
  // Citadel materials discount
  if(hasItem('citadel_materials')){cost=Math.ceil(cost*0.75);removeItem('citadel_materials');notify('🏰 Citadel materials used! 25% discount!',2);}
  if (player.wallet < cost) { notify(`Need ${fmt(cost)} sats to upgrade!`, 2); sfx.error(); return; }
  player.wallet -= cost;
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
  // Mark furniture as solid (except walkable/decorative items)
  const walkable=new Set(['chair','rug','wall_sconce','bar_stool','stage_floor','town_seal','wall_clock','hall_carpet','chandelier']);
  for (const f of furniture) {
    if (!walkable.has(f.item)) tileMap[f.y][f.x] = T.WALL;
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
  INTERIOR_MAPS.tavern = createInterior('tavern', 14, 12, [
    // ═══ BACK WALL — bar shelves, fireplace, Bitcoin art ═══
    {x:1,y:1,item:'barrel'},{x:2,y:1,item:'barrel'},
    {x:3,y:1,item:'bottle_shelf'},{x:4,y:1,item:'bottle_shelf'},
    {x:5,y:1,item:'chalkboard'},
    {x:7,y:1,item:'fireplace'},
    {x:9,y:1,item:'btc_banner'},
    {x:11,y:1,item:'bottle_shelf'},{x:12,y:1,item:'barrel'},
    // ═══ BAR — L-shaped counter with taps, stools in front ═══
    {x:1,y:2,item:'counter'},{x:2,y:2,item:'counter'},
    {x:3,y:2,item:'counter'},{x:4,y:2,item:'beer_taps'},
    {x:2,y:3,item:'bar_stool'},{x:4,y:3,item:'bar_stool'},
    // ═══ STAGE — raised corner with band ═══
    {x:11,y:2,item:'stage_floor'},{x:12,y:2,item:'stage_floor'},
    {x:11,y:3,item:'musician_guitar'},{x:12,y:3,item:'musician_drums'},
    // ═══ DINING — spaced tables with chairs, big rug ═══
    {x:3,y:5,item:'tavern_table'},{x:2,y:5,item:'chair'},{x:4,y:5,item:'chair'},
    {x:8,y:5,item:'tavern_table'},{x:7,y:5,item:'chair'},{x:9,y:5,item:'chair'},
    {x:3,y:8,item:'tavern_table'},{x:2,y:8,item:'chair'},{x:4,y:8,item:'chair'},
    {x:8,y:8,item:'tavern_table'},{x:7,y:8,item:'chair'},{x:9,y:8,item:'chair'},
    // Central rug (2×4 block)
    {x:5,y:5,item:'rug'},{x:6,y:5,item:'rug'},
    {x:5,y:6,item:'rug'},{x:6,y:6,item:'rug'},
    {x:5,y:7,item:'rug'},{x:6,y:7,item:'rug'},
    {x:5,y:8,item:'rug'},{x:6,y:8,item:'rug'},
    // ═══ ATMOSPHERE — sconces, dartboard, corner details ═══
    {x:1,y:5,item:'wall_sconce'},{x:12,y:5,item:'wall_sconce'},
    {x:1,y:8,item:'wall_sconce'},{x:12,y:8,item:'wall_sconce'},
    {x:12,y:6,item:'dartboard'},
    {x:1,y:10,item:'barrel'},{x:12,y:10,item:'barrel'},
  ]);
  INTERIOR_MAPS.shed = createInterior('shed', 10, 8, [
    {x:1,y:1,item:'workbench'},{x:2,y:1,item:'workbench'},
    {x:5,y:1,item:'shelf'},{x:6,y:1,item:'shelf'},
    {x:8,y:1,item:'shelf'},
    {x:1,y:4,item:'crate'},{x:2,y:4,item:'crate'},
    {x:7,y:4,item:'workbench'},
  ]);
  INTERIOR_MAPS.hall = createInterior('hall', 14, 12, [
    // ═══ BACK WALL — stained glass centrepiece ═══
    {x:1,y:1,item:'bookshelf'},{x:2,y:1,item:'portrait_toshi'},
    {x:5,y:1,item:'stained_glass'},{x:6,y:1,item:'stained_glass'},
    {x:7,y:1,item:'stained_glass'},{x:8,y:1,item:'stained_glass'},
    {x:11,y:1,item:'whitepaper'},{x:12,y:1,item:'bookshelf'},
    // ═══ MAYOR'S DAIS — raised desk area ═══
    {x:5,y:2,item:'mayor_desk'},{x:6,y:2,item:'mayor_desk'},
    {x:7,y:2,item:'mayor_desk'},{x:8,y:2,item:'mayor_desk'},
    {x:7,y:3,item:'lectern'},
    // ═══ STONE COLUMNS — civic grandeur ═══
    {x:1,y:3,item:'column'},{x:12,y:3,item:'column'},
    {x:1,y:8,item:'column'},{x:12,y:8,item:'column'},
    // ═══ RED CARPET RUNNER — down the centre aisle ═══
    {x:6,y:4,item:'hall_carpet'},{x:7,y:4,item:'hall_carpet'},
    {x:6,y:5,item:'hall_carpet'},{x:7,y:5,item:'hall_carpet'},
    {x:6,y:6,item:'hall_carpet'},{x:7,y:6,item:'hall_carpet'},
    {x:6,y:7,item:'hall_carpet'},{x:7,y:7,item:'hall_carpet'},
    {x:6,y:8,item:'hall_carpet'},{x:7,y:8,item:'hall_carpet'},
    {x:6,y:9,item:'hall_carpet'},{x:7,y:9,item:'hall_carpet'},
    // ═══ COUNCIL PEWS — facing the desk ═══
    {x:3,y:5,item:'council_bench'},{x:4,y:5,item:'council_bench'},
    {x:9,y:5,item:'council_bench'},{x:10,y:5,item:'council_bench'},
    {x:3,y:7,item:'council_bench'},{x:4,y:7,item:'council_bench'},
    {x:9,y:7,item:'council_bench'},{x:10,y:7,item:'council_bench'},
    // ═══ ATMOSPHERE ═══
    {x:1,y:5,item:'wall_sconce'},{x:12,y:5,item:'wall_sconce'},
    {x:1,y:9,item:'wall_sconce'},{x:12,y:9,item:'wall_sconce'},
    // Chandelier glow in centre (walkable ceiling decoration)
    {x:6,y:6,item:'chandelier'},{x:7,y:6,item:'chandelier'},
    // Entrance area
    {x:1,y:10,item:'village_map'},{x:12,y:10,item:'ballot_box'},
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
  const m=mineFloor?mineFloor.map:interior?interior.map:map;
  const mw=mineFloor?mineFloor.w:interior?interior.w:MAP_W;
  const mh=mineFloor?mineFloor.h:interior?interior.h:MAP_H;
  if(tx<0||ty<0||tx>=mw||ty>=mh)return true;
  if(SOLID.has(m[ty][tx]))return true;
  if(!interior&&!mineFloor&&fenceSet.has(tx+','+ty))return true;
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
    for(const i of placed){
      if(i.type==='cooling_fan'&&Math.hypot(i.x-this.x,i.y-this.y)<TILE*3) cool+=.15;
      if(i.type==='immersion_tank'&&Math.hypot(i.x-this.x,i.y-this.y)<TILE*4) cool+=.5; // Immersion = massive cooling
    }
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
    wp:[{x:homeX+8,y:homeY},{x:homeX+11,y:homeY},{x:homeX+11,y:homeY+2},{x:homeX+8,y:homeY+2}],pi:0,mt:0,mi:3,
    schedule:{day:[{x:homeX+8,y:homeY},{x:homeX+11,y:homeY},{x:homeX+11,y:homeY+2}],evening:[{x:homeX+22,y:homeY+14},{x:homeX+24,y:homeY+14}],night:[{x:homeX+6,y:homeY-2},{x:homeX+7,y:homeY-2}]} },
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
    wp:[{x:homeX+21,y:homeY+15},{x:homeX+24,y:homeY+15},{x:homeX+24,y:homeY+17},{x:homeX+21,y:homeY+17}],pi:0,mt:0,mi:2,
    schedule:{day:[{x:homeX+18,y:homeY+8},{x:homeX+25,y:homeY+12},{x:homeX+20,y:homeY+15}],evening:[{x:homeX+22,y:homeY+14},{x:homeX+21,y:homeY+15}],night:[{x:homeX+22,y:homeY+14},{x:homeX+24,y:homeY+16}]} },
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
    wp:[{x:homeX+10,y:homeY-3},{x:homeX+13,y:homeY-3},{x:homeX+13,y:homeY-1},{x:homeX+10,y:homeY-1}],pi:0,mt:0,mi:4,
    schedule:{day:[{x:homeX+14,y:homeY-8},{x:homeX+17,y:homeY-8},{x:homeX+17,y:homeY-6}],evening:[{x:homeX+22,y:homeY+14},{x:homeX+23,y:homeY+15}],night:[{x:homeX+14,y:homeY-9},{x:homeX+15,y:homeY-9}]} },
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
const SHOP_LIST = ['wrench','pickaxe','axe','hoe','shovel','fishing_rod','cpu_miner','gpu_rig','asic_s21','solar_panel','battery','cooling_fan','bread','coffee','potato_seed','tomato_seed','corn_seed','pumpkin_seed','immersion_tank','mesh_antenna','bitcoin_sign','chest','goat','cow','bee_hive','chicken','feed','bitcoin_academy','freedom_monument','satellite_node','volcano_drill','rocket_to_moon'];
const SEED_SHOP_LIST = ['potato_seed','tomato_seed','corn_seed','pumpkin_seed','feed','bread'];
const TAVERN_SHOP_LIST = ['beer','stew','pie','wine','bread','coffee'];

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
const fenceSet=new Set(); // "x,y" strings for O(1) collision lookup
function addFence(x,y){fences.push({x,y});fenceSet.add(x+','+y);}
function removeFenceAt(x,y){const i=fences.findIndex(f=>f.x===x&&f.y===y);if(i>=0)fences.splice(i,1);fenceSet.delete(x+','+y);}
function rebuildFenceSet(){fenceSet.clear();for(const f of fences)fenceSet.add(f.x+','+f.y);}

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
  // Placed item bonuses
  if(placed.some(p=>p.type==='bitcoin_academy')) amount=Math.ceil(amount*1.25); // Academy: +25% all XP
  if(skill==='social'&&placed.some(p=>p.type==='mesh_antenna')) amount=Math.ceil(amount*1.5); // Mesh: +50% social XP
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
      // Harvest sparkle burst — 10 gold particles pop up
      const cropSx = crop.x*ST - cam.x + ST/2;
      const cropSy = crop.y*ST - cam.y + ST/2;
      for (let i=0; i<10; i++) {
        if (ambient.length >= 100) break;
        const ang = Math.random()*Math.PI*2;
        ambient.push({
          x: cropSx, y: cropSy, type: 'sparkle',
          vx: Math.cos(ang)*(15+Math.random()*20),
          vy: Math.sin(ang)*(10+Math.random()*15) - 20,
          life: 0.6+Math.random()*0.4, maxLife: 1,
          size: 2+Math.random()*2,
          color: Math.random()<0.4 ? '#F7931A' : '#FFE040'
        });
      }
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
// Mobile quick-action menu (craft, harvest, eat, map, etc.)
let mobileMenuOpen = false;
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
  ['G', 'Quick eat (eats best food in inventory)'],
  ['H', 'Harvest crop (near golden glowing crop)'],
  ['B', 'Open shop (near Ruby, or inside shop/tavern)'],
  ['T', 'Open Workbench (craft fence posts, cheese, circuits...)'],
  ['I / Tab', 'Open inventory'],
  ['1-9, 0', 'Select hotbar slot'],
  ['C', 'Citadel upgrade (near home)'],
  ['O', 'Quest log'],
  ['K', 'Skills overview'],
  ['N', 'Toggle minimap'],
  ['J', 'Quest journal'],
  ['Q', 'Sort inventory (when open)'],
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
  // Satire & Humor
  { text: '🥗 Mayor declares "Eat More Seed Oils" day. Village ignores him.', effect: 'none', phase: [0,1,2,3], chance: 0.04 },
  { text: '🤡 Shitcoin salesman spotted at village border. Guards turned him away.', effect: 'none', phase: [1,2], chance: 0.05 },
  { text: '📊 Larry made a chart showing he\'s "technically in profit." Nobody believes him.', effect: 'none', phase: [0,1,2,3], chance: 0.04 },
  { text: '🥩 Carnivore festival! All steak sells for double today.', effect: 'bull', phase: [0,1,2], chance: 0.03 },
  { text: '💊 WHO recommends 6-11 servings of grains daily. Village laughs.', effect: 'none', phase: [0,1,2,3], chance: 0.03 },
  { text: '🏦 Fiat Bank introduces negative interest rates. Savers lose money for saving.', effect: 'fud', phase: [2,3], chance: 0.04 },
  { text: '🧈 Butter prices hit ATH in Fiatropolis. Valley doesn\'t notice (we make our own).', effect: 'none', phase: [0,1,2,3], chance: 0.03 },
  { text: '📰 "Bitcoin is just a fad" — Fiatropolis Times, every year since 2011', effect: 'none', phase: [0,1,2,3], chance: 0.04 },
  { text: '🐐 Your goat ate Larry\'s trading journal. He says it\'s an improvement.', effect: 'none', phase: [0,1,2,3], chance: 0.03 },
  { text: '🌾 Mayor proposes taxing sunshine. Even he realizes that\'s too far.', effect: 'none', phase: [0,1,2,3], chance: 0.03 },
  { text: '🐝 Bees found mining sats. Biologists baffled. Bitcoiners unsurprised.', effect: 'none', phase: [0,1,2,3], chance: 0.02 },
  { text: '📱 Fiatropolis launches CBDC. Citizens required to scan face to buy bread.', effect: 'fud', phase: [2,3], chance: 0.04 },
  { text: '🍕 Pizza Pete argues with Hannah about whether the pizza was worth it. Again.', effect: 'none', phase: [0,1,2,3], chance: 0.04 },
  { text: '⚡ Larry tries to pay tavern tab with an IOU. Barkeep says "Bitcoin or leave."', effect: 'none', phase: [0,1,2,3], chance: 0.03 },
  { text: '🧠 "Fiat is just government shitcoin" — graffiti appears on Town Hall', effect: 'none', phase: [0,1,2,3], chance: 0.03 },
  { text: '🏃 Man runs through village screaming "IT\'S GOING TO ZERO!" Old-timers don\'t even look up.', effect: 'none', phase: [3], chance: 0.06 },
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
// player + cam are now declared — safe for resize() to recenter the camera.
_gameStateReady = true;

// ============================================================
// SAVE / LOAD
// ============================================================
function saveGame(){try{localStorage.setItem('sv_save',JSON.stringify({v:8,p:{x:player.x,y:player.y,w:player.wallet,te:player.totalEarned,e:player.energy},inv:inv.map(s=>s?{id:s.id,q:s.qty}:null),ss:selSlot,rigs:rigs.map(r=>({x:r.x,y:r.y,t:r.tier,p:r.powered,tp:r.temp,d:r.dur,m:r.mined,int:r.interior||null})),placed:placed.map(i=>({x:i.x,y:i.y,t:i.type})),fences:[...fences],econ:{...econ},time:{...time},pwr:{p:pwr.panels,b:pwr.batts},obj:objectives.map(o=>o.done),tut:tutorialDone,skills,crops:crops.map(c=>({x:c.x,y:c.y,type:c.type,dayAge:c.dayAge,stage:c.stage})),rels:relationships,citadelTier,animals:animals.map(a=>({x:a.x,y:a.y,t:a.type,hx:a.homeX,hy:a.homeY,hp:a.happiness,fed:a.fed,dsp:a.daysSinceProd,pr:a.prodReady,dir:a.dir})),weather:{c:weather.current},chest:chestInv.map(s=>s?{id:s.id,q:s.qty}:null),fw:foundWords,qp:questProgress,qj:questJournal,se:STORY_EVENTS.map(e=>e.fired),ml:mineLevel}));notify('💾 Saved!',2);sfx.buy();}catch(e){notify('❌ Save failed!',2);}}
function loadGame(){try{const d=JSON.parse(localStorage.getItem('sv_save'));if(!d)return notify('No save found!',2),false;player.x=d.p.x;player.y=d.p.y;player.wallet=d.p.w;player.totalEarned=d.p.te;player.energy=d.p.e||100;inv.length=0;d.inv.forEach(s=>inv.push(s?{id:s.id,qty:s.q}:null));selSlot=d.ss||0;rigs.length=0;d.rigs.forEach(r=>{const ri=new Rig(r.x,r.y,r.t);ri.powered=r.p;ri.temp=r.tp;ri.dur=r.d;ri.mined=r.m;ri.interior=r.int||null;rigs.push(ri);});placed.length=0;(d.placed||[]).forEach(i=>placed.push(i));Object.assign(econ,d.econ);Object.assign(time,d.time);pwr.panels=d.pwr?.p||[];pwr.batts=d.pwr?.b||[];if(d.obj)d.obj.forEach((done,i)=>{if(objectives[i])objectives[i].done=done;});tutorialDone=d.tut||false;
    if(d.skills)Object.assign(skills,d.skills);
    crops.length=0;if(d.crops)d.crops.forEach(c=>crops.push(c));
    if(d.rels)Object.assign(relationships,d.rels);
    if(d.citadelTier!=null){citadelTier=d.citadelTier;rebuildCitadel();}
    animals.length=0;(d.animals||[]).forEach(a=>{const an=new Animal(a.x,a.y,a.t);an.homeX=a.hx;an.homeY=a.hy;an.happiness=a.hp;an.fed=a.fed;an.daysSinceProd=a.dsp;an.prodReady=a.pr;an.dir=a.dir;animals.push(an);});
    if(d.weather)weather.current=d.weather.c;
    chestInv.length=0;(d.chest||[]).forEach(s=>chestInv.push(s?{id:s.id,qty:s.q}:null));
    foundWords=(d.fw||[]);
    questProgress=(d.qp||{});
    questJournal=(d.qj||[]);
    if(d.se)(d.se).forEach((f,i)=>{if(STORY_EVENTS[i])STORY_EVENTS[i].fired=f;});
    fences.length=0;(d.fences||[]).forEach(f=>fences.push(f));rebuildFenceSet();
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
  // On mobile / small screens, render the title screen at full alpha immediately
  // (no fade-in) so players never see a pure-black screen on first load.
  const isTitle = introStep === INTRO_SLIDES.length - 1;
  const alpha = (isTitle && (isMobile || isSmallScreen))
    ? 1
    : Math.min(1, introTimer * 2) * (isTitle ? 1 : Math.min(1, (slide.dur - introTimer) * 2));

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

  // ---- Sprint 20: Hitstop ----
  // Freeze frame on combat impact. Everything stops EXCEPT screen shake
  // (which already lives in the draw step) and the hitstop counter itself.
  // This is what gives every hit weight.
  if (hitstop > 0) {
    hitstop -= dt;
    // Tick attackReadyFlash so it doesn't stick during freeze
    if (attackReadyFlash > 0) attackReadyFlash -= dt;
    // Decay player lunge so it relaxes back even mid-freeze
    playerLungeX *= 0.85; playerLungeY *= 0.85;
    return;
  }
  // Decay player lunge each frame
  if (playerLungeX !== 0 || playerLungeY !== 0) {
    playerLungeX *= 0.82; playerLungeY *= 0.82;
    if (Math.abs(playerLungeX) < 0.1) playerLungeX = 0;
    if (Math.abs(playerLungeY) < 0.1) playerLungeY = 0;
  }
  // Edge-detect attack cooldown reaching zero → flash
  if (_attackCooldownPrev > 0 && attackCooldown <= 0) {
    attackReadyFlash = 0.18;
    // Tiny "ready" tick sfx
    tone(1200, .04, 'triangle', .04);
  }
  _attackCooldownPrev = attackCooldown;
  if (attackReadyFlash > 0) attackReadyFlash -= dt;

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
  
  // Screen shake decay (works in both overworld and mines)
  if(screenShake>0)screenShake-=dt;
  
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
        // Check inventory first, then chest (#65)
        let feedSlot=inv.find(s=>s&&s.id==='feed'&&s.qty>=info.feedCost);
        let fromChest=false;
        if(!feedSlot){feedSlot=chestInv.find(s=>s&&s.id==='feed'&&s.qty>=info.feedCost);fromChest=true;}
        if(feedSlot){
          feedSlot.qty-=info.feedCost;
          if(feedSlot.qty<=0){const arr=fromChest?chestInv:inv;const idx=arr.indexOf(feedSlot);arr[idx]=null;}
          a.fed=true;a.happiness=Math.min(100,a.happiness+5);
        }else{a.fed=false;a.happiness=Math.max(0,a.happiness-15);}
      }else{a.fed=true;}
      a.daysSinceProd++;
      if(a.fed&&a.daysSinceProd>=info.produceTime&&a.happiness>=30){a.prodReady=true;}
    }
    triggerRandomEvent(); // Bitcoin culture events
    // Check story events
    for(const ev of STORY_EVENTS){if(!ev.fired&&ev.trigger()){ev.fired=true;ev.effect();}}
    // Night passive energy drain is faster (#63)
    const nightHour=getHour();
    if(nightHour>=22||nightHour<5){player.energy=Math.max(0,player.energy-3);if(player.energy<15)notify('😴 You should sleep... it\'s late.',2);}
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
  
  // ---- PLACED ITEM EFFECTS ----
  // Mesh antenna: boosts social XP by 50%
  const hasMesh = placed.some(p=>p.type==='mesh_antenna');
  // Bitcoin academy: boosts ALL XP by 25%
  const hasAcademy = placed.some(p=>p.type==='bitcoin_academy');
  // Satellite node: mining income +20%
  const hasSatellite = placed.some(p=>p.type==='satellite_node');
  // Freedom monument: NPC happiness boost
  const hasMonument = placed.some(p=>p.type==='freedom_monument');
  // Rocket: ultimate flex, +50% ALL income
  const hasRocket = placed.some(p=>p.type==='rocket_to_moon');

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
  if(jp['j']) showJournal = !showJournal;
  if(jp['?']) showControls = !showControls;
  if(jp['n']) minimapOpen = !minimapOpen;
  if(jp['m']) toggleMusic();
  if(jp['t']){craftOpen=!craftOpen;craftOpen?sfx.menuOpen():sfx.menuClose();craftCur=0;}
  if(jp['c']){if(isNearHome()){citadelMenuOpen=!citadelMenuOpen;citadelMenuOpen?sfx.menuOpen():sfx.menuClose();}else{notify('Get near your home to open the Citadel menu [C]',2);sfx.error();}}
  // Combat skills in mines (1, 2, 3 keys)
  if(mineFloor){
    // Skill cooldown tick
    for(const k in skillCooldowns)if(skillCooldowns[k]>0)skillCooldowns[k]-=dt;
    
    // 1 = Orange Pill (projectile)
    if(jp['1']&&skills.mining.level>=COMBAT_SKILLS.orangePill.unlockLevel&&skillCooldowns.orangePill<=0){
      skillCooldowns.orangePill=COMBAT_SKILLS.orangePill.cooldown;
      const spd=5;
      // Aim toward mouse cursor
      const aimX2=(mouseX+cam.x)/SCALE-player.x, aimY2=(mouseY+cam.y)/SCALE-player.y;
      const aimD2=Math.sqrt(aimX2*aimX2+aimY2*aimY2)||1;
      projectiles.push({
        x:player.x,y:player.y,
        vx:(aimX2/aimD2)*spd*TILE,vy:(aimY2/aimD2)*spd*TILE,
        life:1.2,type:'orangePill',dmg:COMBAT_SKILLS.orangePill.dmg+skills.mining.level*2,
        trail:[],
      });
      tone(440,.1,'sine',.04);tone(660,.15,'sine',.03);
      notify('💊 Orange Pill!',1);
      playerSwing=0.2;
    }
    // 2 = Lightning Strike (AOE)
    if(jp['2']&&skills.engineering.level>=COMBAT_SKILLS.lightning.unlockLevel&&skillCooldowns.lightning<=0){
      skillCooldowns.lightning=COMBAT_SKILLS.lightning.cooldown;
      const ptx=Math.floor(player.x/TILE),pty=Math.floor(player.y/TILE);
      let hits=0;
      for(const en of mineFloor.enemies){
        if(en.alive&&Math.hypot(en.x-ptx,en.y-pty)<=COMBAT_SKILLS.lightning.range){
          const dmg=COMBAT_SKILLS.lightning.dmg+skills.engineering.level*3;
          en.hp-=dmg;en._hitFlash=0.3;
          damageNumbers.push({x:en.x*ST+ST/2,y:en.y*ST,text:'-'+dmg,life:1.2,color:'#FFDD44'});
          if(en.hp<=0){en.alive=false;const info=MINE_ENEMIES[en.type];if(info.loot)addItem(info.loot);addXP('mining',info.xp);notify('💥 '+info.name+' destroyed!',2);}
          hits++;
        }
      }
      // Lightning visual
      projectiles.push({x:player.x,y:player.y,vx:0,vy:0,life:0.5,type:'lightning',dmg:0,radius:COMBAT_SKILLS.lightning.range*ST});
      screenShake=0.2;
      [800,1000,1200].forEach((f,i)=>setTimeout(()=>tone(f,.06,'square',.04),i*50));
      notify(`⚡ Lightning Strike! ${hits} hit!`,2);
    }
    // 3 = 51% Attack (big AOE)
    if(jp['3']&&skills.mining.level>=COMBAT_SKILLS.hashAttack.unlockLevel&&skillCooldowns.hashAttack<=0){
      skillCooldowns.hashAttack=COMBAT_SKILLS.hashAttack.cooldown;
      const ptx=Math.floor(player.x/TILE),pty=Math.floor(player.y/TILE);
      let hits=0;
      for(const en of mineFloor.enemies){
        if(en.alive&&Math.hypot(en.x-ptx,en.y-pty)<=COMBAT_SKILLS.hashAttack.range){
          const dmg=COMBAT_SKILLS.hashAttack.dmg+skills.mining.level*5;
          en.hp-=dmg;en._hitFlash=0.4;
          damageNumbers.push({x:en.x*ST+ST/2,y:en.y*ST,text:'-'+dmg+'!',life:1.5,color:'#FF4444'});
          // Knockback
          en.x+=Math.sign(en.x-ptx)*2;en.y+=Math.sign(en.y-pty)*2;
          en.x=Math.max(1,Math.min(MINE_W-2,en.x));en.y=Math.max(1,Math.min(MINE_H-2,en.y));
          if(en.hp<=0){en.alive=false;const info=MINE_ENEMIES[en.type];if(info.loot)addItem(info.loot);addXP('mining',info.xp);notify('💥 '+info.name+' destroyed!',2,info.boss);}
          hits++;
        }
      }
      projectiles.push({x:player.x,y:player.y,vx:0,vy:0,life:0.8,type:'hashAttack',dmg:0,radius:COMBAT_SKILLS.hashAttack.range*ST});
      screenShake=0.35;
      sfx.block();
      notify(`💥 51% ATTACK! ${hits} hit!`,3,true);
    }
  }
  
  // Auto-attack: if walking toward a target enemy, attack when in range
  if(mineFloor&&mineAutoAttackTarget&&mineAutoAttackTarget.alive){
    const aDist=Math.hypot(mineAutoAttackTarget.x*TILE+8-player.x,mineAutoAttackTarget.y*TILE+8-player.y);
    if(aDist<TILE*2.5&&playerSwing<=0){mineAttackEnemy(mineAutoAttackTarget);mouseTarget=null;}
  } else { mineAutoAttackTarget=null; }
  
  // Update death particles
  for(let i=deathParticles.length-1;i>=0;i--){
    const dp=deathParticles[i];dp.life-=dt;dp.x+=dp.vx*dt;dp.y+=dp.vy*dt;dp.vy+=100*dt; // gravity
    if(dp.life<=0)deathParticles.splice(i,1);
  }
  
  // Update projectiles
  for(let i=projectiles.length-1;i>=0;i--){
    const p=projectiles[i];
    p.life-=dt;
    if(p.life<=0){projectiles.splice(i,1);continue;}
    if(p.type==='orangePill'){
      p.x+=p.vx*dt;p.y+=p.vy*dt;
      p.trail.push({x:p.x*SCALE,y:p.y*SCALE,life:0.3});
      // Hit check
      if(mineFloor){
        const ptx=Math.floor(p.x/TILE),pty=Math.floor(p.y/TILE);
        for(const en of mineFloor.enemies){
          if(en.alive&&Math.hypot(en.x-ptx,en.y-pty)<1.5){
            en.hp-=p.dmg;en._hitFlash=0.25;
            damageNumbers.push({x:en.x*ST+ST/2,y:en.y*ST,text:'-'+p.dmg,life:1,color:C.orange});
            tone(300,.08,'square',.04);
            if(en.hp<=0){en.alive=false;const info=MINE_ENEMIES[en.type];if(info.loot)addItem(info.loot);addXP('mining',info.xp);notify('💊 '+info.name+' orange pilled!',2);sfx.block();}
            p.life=0;break; // projectile consumed
          }
        }
        // Wall collision
        if(mineFloor.map[pty]&&mineFloor.map[pty][ptx]===T.CLIFF)p.life=0;
      }
    }
    // Decay trails
    if(p.trail){for(let j=p.trail.length-1;j>=0;j--){p.trail[j].life-=dt;if(p.trail[j].life<=0)p.trail.splice(j,1);}}
  }
  
  // X key: use stairs in mines / exit mine
  if(jp['x']&&mineFloor){
    const ptx=Math.floor(player.x/TILE),pty=Math.floor(player.y/TILE);
    if(mineFloor.stairsUp&&ptx===mineFloor.stairsUp.x&&pty===mineFloor.stairsUp.y){
      if(mineLevel===0){exitMine();}else{mineLevel--;startTransition('fadeOut',0.3,()=>{mineFloor=generateMineFloor(mineLevel);const sp=mineFloor.stairsDown||mineFloor.stairsUp;player.x=sp.x*TILE+8;player.y=sp.y*TILE+8;cam.x=player.x*SCALE-canvas.width/2;cam.y=player.y*SCALE-canvas.height/2;startTransition('fadeIn',0.3,null);notify('⬆️ Level '+(mineLevel+1),2);});}
    } else if(mineFloor.stairsDown&&ptx===mineFloor.stairsDown.x&&pty===mineFloor.stairsDown.y){
      goDeeper();
    } else { notify('Stand on stairs to use them [X]',1.5); }
  }
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
      else if(interior.type==='tavern')nr={role:'tavern',name:'Barkeep'};
    }
    if(nr&&!shopOpen){
      // Shops close at night (9pm-7am) except tavern (#63)
      const shopHour=getHour();
      if((shopHour>=21||shopHour<7)&&nr.role!=='tavern'){
        notify('🌙 Shop is closed! Come back after 7 AM.',2);sfx.error();
      }else{
        shopOpen=true;shopCur=0;
        shopMode=nr.role==='market'?'sell':'buy';
        shopNpcRole=nr.role;
        sfx.menuOpen();dlg=null;
      }
    }else if(shopOpen){shopOpen=false;sfx.menuClose();}
  }
  if(jp['i']||jp['tab']){if(!shopOpen){invOpen=!invOpen;invOpen?sfx.menuOpen():sfx.menuClose();}}
  // G = quick eat best food item
  if(jp['g']&&!invOpen&&!shopOpen&&!dlg&&!craftOpen&&!chestOpen){
    const foodEnergy={beef:60,stew:50,salmon:45,pie:40,cheese:40,honey:35,bread:30,wine:30,trout:30,milk:25,beer:20,egg:15,coffee:10};
    const bestFood=inv.filter(s=>s&&foodEnergy[s.id]).sort((a,b)=>(foodEnergy[b.id]||0)-(foodEnergy[a.id]||0))[0];
    if(bestFood&&player.energy<player.maxEnergy){
      // Simulate eating by triggering the same logic
      const restore=foodEnergy[bestFood.id]||0;
      removeItem(bestFood.id);player.energy=Math.min(player.maxEnergy,player.energy+restore);
      sfx.coin();notify(`${ITEMS[bestFood.id].icon} +${restore} energy`,1.5);
      if(bestFood.id==='coffee'){player.boost=30;}
      if(bestFood.id==='beef'){player.boost=45;}
      if(bestFood.id==='honey'){player.boost=20;}
      if(bestFood.id==='pie'){player.boost=25;}
      if(bestFood.id==='salmon'){player.boost=20;}
    } else if(!bestFood){notify('No food in inventory!',1.5);sfx.error();}
    else{notify('Already full energy!',1);sfx.error();}
  }
  // Q = sort inventory when open
  if(jp['q']&&invOpen){
    const typeOrder={tool:0,rig:1,power:2,upgrade:3,mat:4,crop:5,food:6,seed:7,supply:8,deco:9,quest:10,placeable:11,animal:12};
    const items=inv.filter(s=>s!=null);
    items.sort((a,b)=>{const ta=typeOrder[ITEMS[a.id]?.type]??99,tb=typeOrder[ITEMS[b.id]?.type]??99;return ta-tb||a.id.localeCompare(b.id);});
    inv.length=0;for(let i=0;i<INV_SIZE;i++)inv.push(items[i]||null);
    sfx.interact();notify('📦 Inventory sorted!',1.5);
  }
  if(jp['escape']){if(pauseOpen){pauseOpen=false;sfx.menuClose();}else if(craftOpen){craftOpen=false;sfx.menuClose();}else if(chestOpen){chestOpen=false;sfx.menuClose();}else if(shopOpen){shopOpen=false;sfx.menuClose();}else if(citadelMenuOpen){citadelMenuOpen=false;sfx.menuClose();}else if(invOpen){invOpen=false;sfx.menuClose();}else if(dlg){if(!dlg.done){dlg.displayedChars=dlg.fullText.length;dlg.done=true;}else{dlg=null;}}else if(showObjectives)showObjectives=false;else if(showControls)showControls=false;else if(showSkills)showSkills=false;else if(showJournal)showJournal=false;else{pauseOpen=true;pauseCur=0;sfx.menuOpen();}}
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
    const activeList=shopNpcRole==='seeds'?SEED_SHOP_LIST:shopNpcRole==='tavern'?TAVERN_SHOP_LIST:SHOP_LIST;
    if(jp['arrowup']||jp['w'])shopCur=Math.max(0,shopCur-1);
    if(jp['arrowdown']||jp['s'])shopCur=Math.min((shopMode==='buy'?activeList.length:inv.filter(s=>s).length)-1,shopCur+1);
    if(jp['enter']||jp['e']){
      if(shopMode==='buy'){const id=activeList[shopCur],it=ITEMS[id];if(!it){sfx.error();return;}const pr=Math.ceil(it.buy*marketMult());
        if(player.wallet>=pr){if(addItem(id)){player.wallet-=pr;sfx.buy();notify(`Bought ${it.icon} ${it.name} (${fmt(pr)})`,2);if(id==='gpu_rig')completeObjective('buy_gpu');}else{notify('Inventory full!',1.5);sfx.error();}}else{notify(`Need ${fmt(pr)} sats!`,1.5);sfx.error();}}
      else{const sell=inv.filter(s=>s&&ITEMS[s.id].sell>0);if(shopCur<sell.length){const s=sell[shopCur],it=ITEMS[s.id],pr=Math.ceil(it.sell*marketMult());removeItem(s.id);player.wallet+=pr;sfx.coin();notify(`Sold ${it.icon} ${it.name} (+${fmt(pr)})`,2);}}
    }
    if(jp['arrowleft']||jp['a']||jp['arrowright']||jp['d']){shopMode=shopMode==='buy'?'sell':'buy';shopCur=0;shopScroll=0;lastShopClickTime=0;}
    for(const k in jp)jp[k]=false;return;
  }
  
  // ---- MOVEMENT ----
  // Dodge roll cooldown tick
  if(dodgeRoll.cooldown>0)dodgeRoll.cooldown-=dt;
  // Attack cooldown tick
  if(attackCooldown>0)attackCooldown-=dt;
  // Combo timer tick
  if(comboSystem.timer>0){comboSystem.timer-=dt;if(comboSystem.timer<=0)comboSystem.hits=0;}
  
  // Dodge roll active: move player at 4x speed, invincible
  if(dodgeRoll.active){
    dodgeRoll.timer-=dt;
    const rollSpd=spd*4;
    const rnx=player.x+dodgeRoll.dir.x*rollSpd*dt,rny=player.y+dodgeRoll.dir.y*rollSpd*dt;
    const rr=5;
    if(!isSolid(Math.floor((rnx-rr)/TILE),Math.floor((player.y-rr)/TILE))&&!isSolid(Math.floor((rnx+rr)/TILE),Math.floor((player.y+rr)/TILE)))player.x=rnx;
    if(!isSolid(Math.floor((player.x-rr)/TILE),Math.floor((rny-rr)/TILE))&&!isSolid(Math.floor((player.x+rr)/TILE),Math.floor((rny+rr)/TILE)))player.y=rny;
    if(dodgeRoll.timer<=0){dodgeRoll.active=false;}
  }
  
  if(!dlg&&!invOpen&&!showObjectives&&!chestOpen){
    let dx=0,dy=0;
    if(keys['w']||keys['arrowup'])dy-=1;if(keys['s']||keys['arrowdown'])dy+=1;
    if(keys['a']||keys['arrowleft'])dx-=1;if(keys['d']||keys['arrowright'])dx+=1;
    
    // Double-tap dodge detection (mines only)
    if(mineFloor&&!dodgeRoll.active&&dodgeRoll.cooldown<=0){
      let tapKey='';
      if(jp['w']||jp['arrowup'])tapKey='w';
      else if(jp['s']||jp['arrowdown'])tapKey='s';
      else if(jp['a']||jp['arrowleft'])tapKey='a';
      else if(jp['d']||jp['arrowright'])tapKey='d';
      if(tapKey){
        const now=performance.now();
        if(lastTapDir.key===tapKey&&(now-lastTapDir.time)<300){
          const ddx=tapKey==='a'?-1:tapKey==='d'?1:0;
          const ddy=tapKey==='w'?-1:tapKey==='s'?1:0;
          dodgeRoll={active:true,timer:0.3,dir:{x:ddx,y:ddy},cooldown:0.8};
          lastTapDir={key:'',time:0};
          // Dodge roll particles
          for(let i=0;i<6;i++){deathParticles.push({x:player.x*SCALE,y:player.y*SCALE,vx:(Math.random()-0.5)*40,vy:(Math.random()-0.5)*40,life:0.3,color:'#88CCFF',size:2});}
        }else{
          lastTapDir={key:tapKey,time:now};
        }
      }
    }
    
    // Grabbed by cryptojacker — can't move, press E to break free
    if(mineFloor&&player._grabbed){
      player._grabbedTimer=(player._grabbedTimer||0)-dt;
      if(jp['e']){player._grabBreaks=(player._grabBreaks||0)+1;}
      if(player._grabBreaks>=3||player._grabbedTimer<=0){
        player._grabbed=false;player._grabBreaks=0;
        notify('💪 Broke free!',1.5);
      }
      dx=0;dy=0; // can't move while grabbed
    }
    
    // Mobile joystick input
    if(touch.joyActive){dx+=touch.joyDx;dy+=touch.joyDy;}
    if(dx!==0||dy!==0) mouseTarget=null; // keyboard cancels mouse target
    // Mouse click-to-move: inject direction from target if no keyboard input
    if(!dx&&!dy&&mouseTarget){
      const mdx=mouseTarget.x-player.x,mdy=mouseTarget.y-player.y;
      const md=Math.sqrt(mdx*mdx+mdy*mdy);
      if(md<4){mouseTarget=null;}
      else{dx=mdx/md;dy=mdy/md;}
    }
    // Don't move during active dodge roll
    if(dodgeRoll.active){dx=0;dy=0;}
    player.moving=dx!==0||dy!==0;
    // In mines: always face the mouse cursor for aiming
    if(mineFloor){
      const aimX=(mouseX+cam.x)/SCALE-player.x, aimY=(mouseY+cam.y)/SCALE-player.y;
      const aimDist=Math.sqrt(aimX*aimX+aimY*aimY);
      if(aimDist>2){player.facing={x:aimX/aimDist,y:aimY/aimDist};}
    }
    if(player.moving){
      const len=Math.sqrt(dx*dx+dy*dy);dx/=len;dy/=len;
      if(!mineFloor)player.facing={x:dx,y:dy}; // overworld: face movement direction
      const nx=player.x+dx*spd*dt,ny=player.y+dy*spd*dt;
      const r=5;
      if(!isSolid(Math.floor((nx-r)/TILE),Math.floor((player.y-r)/TILE))&&!isSolid(Math.floor((nx+r)/TILE),Math.floor((player.y+r)/TILE))&&!isSolid(Math.floor((nx-r)/TILE),Math.floor((player.y+r)/TILE))&&!isSolid(Math.floor((nx+r)/TILE),Math.floor((player.y-r)/TILE)))player.x=nx;
      if(!isSolid(Math.floor((player.x-r)/TILE),Math.floor((ny-r)/TILE))&&!isSolid(Math.floor((player.x+r)/TILE),Math.floor((ny+r)/TILE))&&!isSolid(Math.floor((player.x-r)/TILE),Math.floor((ny+r)/TILE))&&!isSolid(Math.floor((player.x+r)/TILE),Math.floor((ny-r)/TILE)))player.y=ny;
      player.wt+=dt;if(player.wt>.15){player.wt=0;player.wf=(player.wf+1)%4;}
      footT+=dt;if(footT>.35){footT=0;const _sm=interior?interior.map:map;const _stx=Math.floor(player.x/TILE),_sty=Math.floor(player.y/TILE);const _stile=(_sm[_sty]&&_sm[_sty][_stx]!=null)?_sm[_sty][_stx]:T.GRASS;sfx.step(_stile);}
      
      // Check seed fragments (overworld only — decor[] is overworld state,
      // and player.x/y in a mine/interior is in local coordinate space)
      if(!mineFloor&&!interior)for(let i=decor.length-1;i>=0;i--){
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
      // Mine: enemy AI + combat mechanics + loot pickup
      if(mineFloor){
        const ptx=Math.floor(player.x/TILE),pty=Math.floor(player.y/TILE);
        const mmap=mineFloor.map;
        
        // Helper: check if tile is walkable
        const canWalk=(tx,ty)=>tx>=0&&ty>=0&&tx<MINE_W&&ty<MINE_H&&mmap[ty]&&mmap[ty][tx]!==T.CLIFF&&!mineFirewalls.some(fw=>fw.x===tx&&fw.y===ty);
        
        // Helper: spawn a new enemy near a position
        const spawnMinion=(sx,sy,type)=>{
          const ox=sx+(Math.random()<0.5?1:-1),oy=sy+(Math.random()<0.5?1:-1);
          if(canWalk(ox,oy)){
            const minfo=MINE_ENEMIES[type];
            mineFloor.enemies.push({x:ox,y:oy,type,hp:minfo.hp,maxHp:minfo.hp,alive:true,
              _mt:0,_atkCd:0,_hitFlash:0,_lungeX:0,_lungeY:0,_telegraphing:0,
              _patrolDir:Math.random()<0.5?1:-1,_spawnTimer:0,_visible:type!=='zero_day',
              _grabbed:false,_phase:1,_shockwaveTimer:0,_zigzag:0});
            for(let i=0;i<4;i++){deathParticles.push({x:ox*ST+ST/2,y:oy*ST+ST/2,vx:(Math.random()-0.5)*50,vy:(Math.random()-0.5)*50,life:0.4,color:'#FF4444',size:2});}
          }
        };
        
        // --- Danger state system (replaces instant death) ---
        const maxE=player.maxEnergy;
        if(dangerState&&dangerState.active){
          dangerState.timer-=dt;
          player.energy=Math.min(maxE,player.energy+1*dt); // slow regen
          if(player.energy<=0){
            notify('💀 Defeated!',3,true);
            dangerState=null;
            setTimeout(()=>exitMine(),800);
            player.energy=15;
          }else if(dangerState.timer<=0){
            dangerState=null; // survived danger
          }
        }else if(player.energy>0&&player.energy<maxE*0.15&&!dangerState){
          dangerState={timer:3,active:true};
          notify('⚠️ DANGER! Energy critical!',2,true);
          screenShake=0.2;
        }
        
        // --- Hazard tile damage ---
        const pTile=mmap[pty]&&mmap[pty][ptx];
        if((pTile===T_LAVA||pTile===T_ELECTRIC)&&!dodgeRoll.active){
          player.energy=Math.max(0,player.energy-2*dt);
          if(Math.random()<0.1)damageNumbers.push({x:player.x*SCALE,y:player.y*SCALE-10,text:pTile===T_LAVA?'🔥':  '⚡',life:0.5,color:pTile===T_LAVA?'#FF4400':'#44DDFF'});
        }
        
        // --- Firewall tiles update ---
        for(let i=mineFirewalls.length-1;i>=0;i--){
          mineFirewalls[i].timer-=dt;
          if(mineFirewalls[i].timer<=0)mineFirewalls.splice(i,1);
        }
        
        // --- Enemy projectiles update ---
        for(let i=enemyProjectiles.length-1;i>=0;i--){
          const ep=enemyProjectiles[i];
          ep.x+=ep.vx*dt;ep.y+=ep.vy*dt;ep.life-=dt;
          if(ep.life<=0){enemyProjectiles.splice(i,1);continue;}
          // Check collision with player (pixel coords for projectile, pixel coords for player)
          const pdist=Math.hypot(ep.x-player.x,ep.y-player.y);
          if(pdist<TILE&&!dodgeRoll.active){
            const dmgP=ep.dmg||6;
            player.energy=Math.max(0,player.energy-dmgP);
            damageNumbers.push({x:player.x*SCALE,y:player.y*SCALE-20,text:'-'+dmgP,life:1.0,color:'#FF6644'});
            screenShake=0.08;sfx.error();
            enemyProjectiles.splice(i,1);
          }
        }
        
        // --- Enemy AI per type ---
        for(const en of mineFloor.enemies){
          if(!en.alive)continue;
          en._mt=(en._mt||0)+dt;
          en._atkCd=(en._atkCd||0)-dt;
          en._hitFlash=Math.max(0,(en._hitFlash||0)-dt);
          en._lungeX=(en._lungeX||0)*0.85;en._lungeY=(en._lungeY||0)*0.85;
          en._spawnTimer=(en._spawnTimer||0)+dt;
          en._shockwaveTimer=(en._shockwaveTimer||0)+dt;
          if(en._telegraphing>0)en._telegraphing-=dt;
          
          const dist=Math.hypot(en.x-ptx,en.y-pty);
          const info=MINE_ENEMIES[en.type];
          const aggroRange=info.aggroRange||6;
          const moveSpd=info.moveSpeed||0.7;
          
          // --- Type-specific AI ---
          switch(en.type){
            case 'malware_bot': {
              // Patrol randomly when far, chase when in range
              if(dist<aggroRange&&dist>1.2&&en._mt>moveSpd){
                en._mt=0;
                const sdx=Math.sign(ptx-en.x),sdy=Math.sign(pty-en.y);
                let mnx=en.x,mny=en.y;
                if(Math.random()<0.5){mnx+=sdx;}else{mny+=sdy;}
                if(canWalk(mnx,mny)){en.x=mnx;en.y=mny;}
              }else if(dist>=aggroRange&&en._mt>1.5){
                // Random patrol
                en._mt=0;
                const pd=Math.floor(Math.random()*4);
                const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
                const mnx=en.x+dirs[pd][0],mny=en.y+dirs[pd][1];
                if(canWalk(mnx,mny)){en.x=mnx;en.y=mny;}
              }
              break;
            }
            case 'phishing_worm': {
              // Fast zigzag: alternates horizontal then vertical
              if(dist<aggroRange&&dist>1.2&&en._mt>moveSpd){
                en._mt=0;
                en._zigzag=(en._zigzag||0)+1;
                const sdx=Math.sign(ptx-en.x),sdy=Math.sign(pty-en.y);
                let mnx=en.x,mny=en.y;
                if(en._zigzag%2===0){mnx+=sdx;}else{mny+=sdy;}
                if(canWalk(mnx,mny)){en.x=mnx;en.y=mny;}
              }
              break;
            }
            case 'script_kiddie': {
              // Maintain 3-4 tiles distance, fire projectiles
              if(dist<3&&en._mt>moveSpd){
                // Too close — run away
                en._mt=0;
                const sdx=Math.sign(en.x-ptx),sdy=Math.sign(en.y-pty);
                let mnx=en.x+sdx,mny=en.y+sdy;
                if(canWalk(mnx,mny)){en.x=mnx;en.y=mny;}
              }else if(dist>4&&dist<aggroRange&&en._mt>moveSpd){
                // Too far — get closer
                en._mt=0;
                const sdx=Math.sign(ptx-en.x),sdy=Math.sign(pty-en.y);
                let mnx=en.x,mny=en.y;
                if(Math.random()<0.5){mnx+=sdx;}else{mny+=sdy;}
                if(canWalk(mnx,mny)){en.x=mnx;en.y=mny;}
              }
              // Fire projectile every 2s
              if(dist<aggroRange&&en._atkCd<=0){
                en._atkCd=2;
                const angle=Math.atan2(pty-en.y,ptx-en.x);
                const pspd=80;
                enemyProjectiles.push({x:en.x*TILE+8,y:en.y*TILE+8,vx:Math.cos(angle)*pspd,vy:Math.sin(angle)*pspd,life:3,dmg:6,type:'code_snippet'});
              }
              break;
            }
            case 'cryptojacker': {
              // Charge straight at player
              if(dist<aggroRange&&dist>1.2&&en._mt>moveSpd){
                en._mt=0;
                const sdx=Math.sign(ptx-en.x),sdy=Math.sign(pty-en.y);
                // Prefer straight line: move in dominant direction
                let mnx=en.x,mny=en.y;
                if(Math.abs(ptx-en.x)>=Math.abs(pty-en.y)){mnx+=sdx;}else{mny+=sdy;}
                if(canWalk(mnx,mny)){en.x=mnx;en.y=mny;}
              }
              break;
            }
            case 'ransomware': {
              // Slow chase
              if(dist<aggroRange&&dist>1.2&&en._mt>moveSpd){
                en._mt=0;
                const sdx=Math.sign(ptx-en.x),sdy=Math.sign(pty-en.y);
                let mnx=en.x,mny=en.y;
                if(Math.random()<0.5){mnx+=sdx;}else{mny+=sdy;}
                if(canWalk(mnx,mny)){en.x=mnx;en.y=mny;}
              }
              // Create firewall tiles every 6s
              if(en._spawnTimer>=6){
                en._spawnTimer=0;
                const offsets=[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]];
                for(const o of offsets){
                  const fwx=en.x+o[0],fwy=en.y+o[1];
                  if(canWalk(fwx,fwy)&&!(fwx===ptx&&fwy===pty)){
                    mineFirewalls.push({x:fwx,y:fwy,timer:8});
                  }
                }
                notify('🔥 Ransomware deployed firewalls!',1.5);
              }
              break;
            }
            case 'fiat_printer': {
              // Run away when within 4 tiles
              if(dist<4&&en._mt>moveSpd){
                en._mt=0;
                const sdx=Math.sign(en.x-ptx),sdy=Math.sign(en.y-pty);
                let mnx=en.x+sdx,mny=en.y+sdy;
                if(canWalk(mnx,mny)){en.x=mnx;en.y=mny;}
              }
              // Spawn malware_bot every 5s
              if(en._spawnTimer>=5&&mineFloor.enemies.filter(e=>e.alive).length<10){
                en._spawnTimer=0;
                spawnMinion(en.x,en.y,'malware_bot');
                notify('🖨️ Fiat Printer spawned a Malware Bot!',1.5);
              }
              break;
            }
            case 'zero_day': {
              // Invisible until within 3 tiles
              if(!en._stealthCd)en._stealthCd=0;
              if(en._stealthCd>0)en._stealthCd-=dt;
              if(dist<=3){en._visible=true;}
              else if(en._stealthCd<=0){en._visible=false;}
              // Chase when visible
              if(en._visible&&dist>1.2&&dist<aggroRange&&en._mt>moveSpd){
                en._mt=0;
                const sdx=Math.sign(ptx-en.x),sdy=Math.sign(pty-en.y);
                let mnx=en.x,mny=en.y;
                if(Math.random()<0.5){mnx+=sdx;}else{mny+=sdy;}
                if(canWalk(mnx,mny)){en.x=mnx;en.y=mny;}
              }
              break;
            }
            case 'pool_operator': {
              // Boss: Phase 1 (hp > 50%) vs Phase 2 (hp <= 50%)
              const bossPhase=en.hp<=en.maxHp*0.5?2:1;
              if(bossPhase===2&&en._phase===1){
                en._phase=2;
                notify('👹 The Pool Operator enters Phase 2!',3,true);
                screenShake=0.3;
              }
              const bmoveSpd=bossPhase===1?0.9:0.4;
              // Chase
              if(dist>1.2&&dist<aggroRange&&en._mt>bmoveSpd){
                en._mt=0;
                const sdx=Math.sign(ptx-en.x),sdy=Math.sign(pty-en.y);
                let mnx=en.x,mny=en.y;
                if(Math.random()<0.5){mnx+=sdx;}else{mny+=sdy;}
                if(canWalk(mnx,mny)){en.x=mnx;en.y=mny;}
              }
              // Spawn minion every 8s (phase 1)
              if(bossPhase===1&&en._spawnTimer>=8&&mineFloor.enemies.filter(e=>e.alive).length<12){
                en._spawnTimer=0;
                const mtype=['malware_bot','script_kiddie'][Math.floor(Math.random()*2)];
                spawnMinion(en.x,en.y,mtype);
              }
              // Fire projectile every 3s
              if(en._atkCd<=0&&dist<aggroRange&&dist>1.5){
                en._atkCd=3;
                const angle=Math.atan2(pty-en.y,ptx-en.x);
                const pspd2=70;
                enemyProjectiles.push({x:en.x*TILE+8,y:en.y*TILE+8,vx:Math.cos(angle)*pspd2,vy:Math.sin(angle)*pspd2,life:4,dmg:bossPhase===2?18:12,type:'boss_orb'});
              }
              // Phase 2 shockwave every 4s
              if(bossPhase===2&&en._shockwaveTimer>=4&&dist<=5){
                en._shockwaveTimer=0;
                // Push player back 3 tiles
                const pushX=Math.sign(ptx-en.x)*3*TILE;
                const pushY=Math.sign(pty-en.y)*3*TILE;
                const pnx=player.x+pushX,pny=player.y+pushY;
                if(!isSolid(Math.floor(pnx/TILE),Math.floor(pny/TILE))){player.x=pnx;player.y=pny;}
                player.energy=Math.max(0,player.energy-8);
                damageNumbers.push({x:player.x*SCALE,y:player.y*SCALE-30,text:'SHOCKWAVE! -8',life:1.5,color:'#FF00FF'});
                screenShake=0.25;
                notify('👹 Shockwave!',1);
              }
              break;
            }
            default: {
              // Generic chase fallback
              if(dist<aggroRange&&dist>1.2&&en._mt>moveSpd){
                en._mt=0;
                const sdx=Math.sign(ptx-en.x),sdy=Math.sign(pty-en.y);
                let mnx=en.x,mny=en.y;
                if(Math.random()<0.5){mnx+=sdx;}else{mny+=sdy;}
                if(canWalk(mnx,mny)){en.x=mnx;en.y=mny;}
              }
            }
          }
          
          // --- Attack when adjacent (within 1.5 tiles) — with telegraph ---
          if(dist<=1.5&&en._atkCd<=0&&en._telegraphing<=0){
            // Skip attack for script_kiddie (ranged only) and fiat_printer (runs away)
            if(en.type!=='script_kiddie'&&en.type!=='fiat_printer'){
              // Start telegraph warning
              en._telegraphing=0.5;
              en._atkCd=info.boss?0.8:1.2;
            }
          }
          // Execute attack when telegraph expires
          if(en._telegraphing>0&&en._telegraphing-dt<=0&&dist<=2.5){
            en._telegraphing=0;
            // Skip damage if player is dodge rolling (invincible)
            if(!dodgeRoll.active){
              let atkDmg=info.atk+Math.floor(Math.random()*4);
              // Boss phase 2 damage boost
              if(en.type==='pool_operator'&&en._phase===2)atkDmg=Math.floor(atkDmg*1.5);
              player.energy=Math.max(0,player.energy-atkDmg);
              en._lungeX=Math.sign(ptx-en.x)*6;en._lungeY=Math.sign(pty-en.y)*6;
              damageNumbers.push({x:player.x*SCALE,y:player.y*SCALE-20,text:'-'+atkDmg,life:1.2,color:'#FF4444'});
              screenShake=0.15;sfx.error();
              tone(200+Math.random()*100,.1,'sawtooth',.04);
              
              // Cryptojacker grab mechanic
              if(en.type==='cryptojacker'&&Math.random()<0.3&&!player._grabbed){
                player._grabbed=true;player._grabbedTimer=1.5;player._grabBreaks=0;
                notify('⛏️ Cryptojacker grabbed you! Press E 3x to break free!',2,true);
              }
              
              // Zero-day: teleport after attacking
              if(en.type==='zero_day'){
                // Find random floor tile within 5 tiles
                const candidates=[];
                for(let oy=-5;oy<=5;oy++){for(let ox=-5;ox<=5;ox++){
                  const tx2=en.x+ox,ty2=en.y+oy;
                  if(Math.hypot(ox,oy)<=5&&canWalk(tx2,ty2))candidates.push({x:tx2,y:ty2});
                }}
                if(candidates.length>0){
                  const dest=candidates[Math.floor(Math.random()*candidates.length)];
                  en.x=dest.x;en.y=dest.y;
                }
                en._visible=false;en._stealthCd=2; // invisible for 2s
              }
            }
          }
        }
        
        // --- Danger state energy check (deferred death) ---
        if(player.energy<=0&&(!dangerState||!dangerState.active)){
          notify('💀 Defeated!',3,true);
          setTimeout(()=>exitMine(),800);
          player.energy=15;
        }
        
        // Update damage numbers
        for(let i=damageNumbers.length-1;i>=0;i--){
          const dn=damageNumbers[i]; dn.life-=dt;
          // New-style projectile arc (vx/vy with gravity) for combat numbers
          if(dn.vy!==undefined){ dn.x+=dn.vx*dt; dn.y+=dn.vy*dt; dn.vy+=80*dt; }
          else { dn.y-=40*dt; } // legacy fall-up behavior
          if(dn.life<=0)damageNumbers.splice(i,1);
        }
        // Update player swing
        if(playerSwing>0)playerSwing-=dt;
        // Update death particles
        for(let i=deathParticles.length-1;i>=0;i--){
          const dp=deathParticles[i];dp.x+=dp.vx*dt;dp.y+=dp.vy*dt;dp.life-=dt;
          if(dp.life<=0)deathParticles.splice(i,1);
        }
        // Hazard tile damage
        const pTileX2=Math.floor(player.x/TILE),pTileY2=Math.floor(player.y/TILE);
        if(mineFloor.map[pTileY2]&&(mineFloor.map[pTileY2][pTileX2]===T_LAVA||mineFloor.map[pTileY2][pTileX2]===T_ELECTRIC)){
          if(!dodgeRoll.active){player.energy=Math.max(0,player.energy-2*dt);
            if(Math.random()<0.1)damageNumbers.push({x:player.x*SCALE,y:player.y*SCALE-10,text:'-1',life:0.6,color:mineFloor.map[pTileY2][pTileX2]===T_LAVA?'#FF6622':'#44BBFF'});}
        }
        // Update firewall timers
        for(let i=mineFirewalls.length-1;i>=0;i--){mineFirewalls[i].timer-=dt;if(mineFirewalls[i].timer<=0)mineFirewalls.splice(i,1);}
        // Update enemy projectiles
        for(let i=enemyProjectiles.length-1;i>=0;i--){
          const ep=enemyProjectiles[i];ep.x+=ep.vx*dt;ep.y+=ep.vy*dt;ep.life-=dt;
          if(ep.life<=0){enemyProjectiles.splice(i,1);continue;}
          // Check wall collision
          const eptx=Math.floor(ep.x/TILE),epty=Math.floor(ep.y/TILE);
          if(eptx<0||epty<0||eptx>=MINE_W||epty>=MINE_H||mineFloor.map[epty][eptx]===T.CLIFF){enemyProjectiles.splice(i,1);continue;}
          // Check player collision
          if(!dodgeRoll.active&&Math.hypot(ep.x-player.x,ep.y-player.y)<12){
            player.energy=Math.max(0,player.energy-ep.dmg);
            damageNumbers.push({x:player.x*SCALE,y:player.y*SCALE-20,text:'-'+ep.dmg,life:1,color:'#FF4444'});
            screenShake=0.1;sfx.error();enemyProjectiles.splice(i,1);
          }
        }
        // Grabbed mechanic update
        if(player._grabbed){
          player._grabbedTimer-=dt;
          if(player._grabbedTimer<=0){player._grabbed=false;notify('Broke free!',1);}
        }
        // Loot pickup (proximity)
        for(let i=mineFloor.loot.length-1;i>=0;i--){
          const l=mineFloor.loot[i];
          if(Math.abs(l.x-ptx)<=1&&Math.abs(l.y-pty)<=1){
            if(addItem(l.id)){
              const it=ITEMS[l.id];
              notify(`Found ${it.icon} ${it.name}!`,2);sfx.coin();addXP('mining',5);
              mineFloor.loot.splice(i,1);
            }
          }
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
        // Tavern gets its own music
        if(music && buildingType==='tavern') music.setLocation('tavern');
        interiorNPCs = [];
        if (buildingType === 'shop') {
          interiorNPCs.push({ name:'Ruby', x:3*TILE+8, y:2*TILE+8, col:'#CC4444', hair:'#FF6644',
            dlg:['"Welcome to my shop! Take a look around."','"Everything priced in sats — no fiat accepted."','"Your uncle was my best customer."','"Need anything? I\'ve got CPUs to ASICs."'] });
        } else if (buildingType === 'tavern') {
          interiorNPCs.push({ name:'Barkeep', x:3*TILE+8, y:3*TILE+8, col:'#8B6340', hair:'#2A1A08',
            dlg:['"Welcome to the Hodl Tavern. What\'ll it be?"','"We only serve Bitcoin-branded beverages here."','"Your uncle used to sit right where you\'re standing."','"Lightning tips accepted and appreciated."'] });
        } else if (buildingType === 'hall') {
          interiorNPCs.push({ name:'Mayor Keynesian', x:6*TILE+8, y:4*TILE+8, col:'#555580', hair:'#AAA',
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
        if(music) music.setLocation('overworld');
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
    // Mine entrance check (only consume if actually near entrance)
    else if(!interior&&!mineFloor&&decor.find(d=>d.type==='mine_entrance'&&Math.hypot(d.x*TILE+8-player.x,d.y*TILE+8-player.y)<TILE*2)){
      enterMine();for(const k in jp)jp[k]=false;return;
    }
    // Mine: attack nearest enemy or crate in range (action combat — E key)
    else if(mineFloor){
      // First check enemies
      let attacked=false;
      for(const en of mineFloor.enemies){
        if(en.alive&&Math.hypot(en.x*TILE+8-player.x,en.y*TILE+8-player.y)<TILE*2.5){
          mineAttackEnemy(en);
          attacked=true;
          for(const k in jp)jp[k]=false;return;
        }
      }
      // Then check crates
      if(!attacked){
        const atkTx=Math.floor((player.x+player.facing.x*TILE)/TILE);
        const atkTy=Math.floor((player.y+player.facing.y*TILE)/TILE);
        if(mineAttackCrate(atkTx,atkTy)){for(const k in jp)jp[k]=false;return;}
      }
    }
    else if(interior && interior.type==='home'){
      // Sleep — must be near the bed (top-left area of home interior)
      const nearBed=player.y<4*TILE && player.x<5*TILE;
      if(!nearBed){notify('Walk to the bed to sleep 🛏️',2);sfx.error();for(const k in jp)jp[k]=false;return;}
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
          if(!chestOpen)for(const n of npcs){if(Math.hypot(n.x-ix,n.y-iy)<32){
            // Check for quest completion first
            if(checkQuestCompletion(n.name)){
              const q=NPC_QUESTS[n.name];const idx=(questProgress[n.name]||1)-1;
              const completedQ=q[idx];
              dlg={name:n.name,text:completedQ.dialogue,role:n.role,fullText:completedQ.dialogue,displayedChars:0,done:false};dlgCharTimer=0;sfx.interact();
            } else {
              const activeQ=getActiveQuest(n.name);
              let _nd2;
              if(activeQ){
                // Show intro or progress dialogue
                const isNew = !questJournal.some(j=>j.id===activeQ.id) && !(questProgress[n.name]>0 && NPC_QUESTS[n.name][(questProgress[n.name]||0)-1]?.id===activeQ.id);
                if(activeQ.intro && isNew){
                  _nd2 = activeQ.intro + '\n\n📜 Quest: ' + activeQ.title + '\nTask: ' + activeQ.task + '\nReward: ' + fmt(activeQ.reward.sats||0) + ' sats';
                } else {
                  _nd2 = '📜 ' + activeQ.title + ': ' + activeQ.task + (activeQ.check() ? '\n\n✅ Ready to complete!' : '\n\n⏳ In progress...');
                }
              } else {
                _nd2=n.dlg[Math.floor(Math.random()*n.dlg.length)];
              }
              dlg={name:n.name,text:_nd2,role:n.role,fullText:_nd2,displayedChars:0,done:false};dlgCharTimer=0;sfx.interact();
            }
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
      else if(sel.id==='beer'){
        removeItem('beer');player.energy=Math.min(player.maxEnergy,player.energy+20);
        player.beers=(player.beers||0)+1;sfx.coin();
        if(player.beers>=4){notify('🍺🤢 Too many beers! You feel sick...',3,true);player.energy=Math.max(5,player.energy-30);player.boost=-15;player.beers=0;}
        else if(player.beers>=2){notify('🍺😵 Feeling tipsy... '+player.beers+' beers deep!',2);player.boost=-5;}
        else{notify('🍺 Cheers! +20 energy',1.5);}
      }
      else if(sel.id==='stew'){removeItem('stew');player.energy=Math.min(player.maxEnergy,player.energy+50);sfx.coin();notify('🍲 Hearty stew! +50 energy',2);}
      else if(sel.id==='pie'){removeItem('pie');player.energy=Math.min(player.maxEnergy,player.energy+40);player.boost=25;sfx.coin();notify('🥧 Delicious pie! +40 energy, speed boost!',2);}
      else if(sel.id==='wine'){removeItem('wine');player.energy=Math.min(player.maxEnergy,player.energy+30);sfx.coin();notify('🍷 Sophisticated. +30 energy',2);}
      else if(sel.id==='cheese'){removeItem('cheese');player.energy=Math.min(player.maxEnergy,player.energy+40);sfx.coin();notify('🧀 Aged cheese! +40 energy. Carnivore approved.',1.5);}
      // Fish as food
      else if(sel.id==='salmon'){removeItem('salmon');player.energy=Math.min(player.maxEnergy,player.energy+45);player.boost=20;sfx.coin();notify('🐟 Wild salmon! +45 energy, omega boost! No seed oils here.',2);}
      else if(sel.id==='trout'){removeItem('trout');player.energy=Math.min(player.maxEnergy,player.energy+30);sfx.coin();notify('🐠 Fresh trout! +30 energy. Farm to table, lake to plate.',1.5);}
      else if(sel.id==='bitcoin_fish'){removeItem('bitcoin_fish');player.energy=player.maxEnergy;player.boost=60;sfx.block();notify('🐡 THE BITCOIN FISH! Full energy + 60s speed boost! Legendary!',4);addXP('foraging',20);}
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
            sfx.repair();notify('🪓 Chopped tree! +wood',2);addXP('foraging',8);screenShake=0.06;chopped=true;break;
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
        if(map[ty]&&(map[ty][tx]===T.GRASS||map[ty][tx]===T.TALLGRASS||map[ty][tx]===T.FLOWER)){
          map[ty][tx]=T.DIRT;
          sfx.place();notify('🌾 Tilled soil!',1.5);addXP('farming',2);screenShake=0.03;
        } else { notify("Can only till grass!",1.5);sfx.error(); }
      }
      // FISHING ROD — cast into water
      else if(sel.id==='fishing_rod'){
        if(!useEnergy(3))return;
        const tx=Math.floor((player.x+player.facing.x*20)/TILE),ty=Math.floor((player.y+player.facing.y*20)/TILE);
        if(map[ty]&&(map[ty][tx]===T.WATER||map[ty][tx]===T.DEEP)){
          // Start fishing minigame
          const skill=skills.foraging?skills.foraging.level:1;
          const catchSize=0.15+skill*0.02; // Higher skill = bigger catch zone
          fishing={timer:0,barPos:0.5,barDir:1,catchZone:0.3+Math.random()*0.4,catchSize,fish:null,biting:false,biteTimer:1+Math.random()*3,caught:false};
          notify('🎣 Casting... wait for a bite!',2);
          sfx.interact();
        } else { notify('Face water to fish!',1.5);sfx.error(); }
      }
      // SHOVEL — pick up placed items and rigs
      else if(sel.id==='shovel'){
        if(!useEnergy(2))return;
        // Search from both facing direction AND player position for easier pickup (#66)
        const ix=player.x+player.facing.x*20,iy=player.y+player.facing.y*20;
        const pickRange=36; // Increased from 24
        let picked=false;
        for(let i=placed.length-1;i>=0;i--){
          const pd=Math.min(Math.hypot(placed[i].x-ix,placed[i].y-iy),Math.hypot(placed[i].x-player.x,placed[i].y-player.y));
          if(pd<pickRange){
            const p=placed[i];
            const itemMap={solar_panel:'solar_panel',battery:'battery',cooling_fan:'cooling_fan',chest:'chest',flower_pot:'flower_pot',torch_item:'torch_item',bitcoin_sign:'bitcoin_sign',immersion_tank:'immersion_tank',mesh_antenna:'mesh_antenna',satellite_node:'satellite_node',freedom_monument:'freedom_monument',bitcoin_academy:'bitcoin_academy',rocket_to_moon:'rocket_to_moon'};
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
            if(Math.min(Math.hypot(rigs[i].x-ix,rigs[i].y-iy),Math.hypot(rigs[i].x-player.x,rigs[i].y-player.y))<pickRange){
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
            if(Math.min(Math.hypot(animals[i].x-ix,animals[i].y-iy),Math.hypot(animals[i].x-player.x,animals[i].y-player.y))<pickRange){
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
          if(fi>=0){removeFenceAt(ftx,fty);addItem('fence_post');sfx.repair();notify('⚒️ Picked up fence post',1.5);picked=true;}
        }
        if(!picked){notify('Nothing to pick up',1.5);sfx.error();}
      }
      // FENCE POST placement
      else if(sel.id==='fence_post'){
        const tx=Math.floor((player.x+player.facing.x*20)/TILE),ty=Math.floor((player.y+player.facing.y*20)/TILE);
        if(!isSolid(tx,ty)&&!fenceSet.has(tx+','+ty)){
          removeItem('fence_post');addFence(tx,ty);sfx.place();notify('🪵 Fence placed!',1.5);
        }else{sfx.error();notify("Can't place fence here!",1.5);}
      }
      // DECORATION placement (all placeable deco/upgrade items)
      else if(sel.id==='flower_pot'||sel.id==='torch_item'||sel.id==='bitcoin_sign'||sel.id==='immersion_tank'||sel.id==='mesh_antenna'||sel.id==='satellite_node'||sel.id==='freedom_monument'||sel.id==='bitcoin_academy'||sel.id==='rocket_to_moon'){
        if(!isSolid(ptx,pty)&&!placed.some(i=>Math.abs(i.x-px)<TILE&&Math.abs(i.y-py)<TILE)){
          removeItem(sel.id);placed.push({x:px,y:py,type:sel.id});sfx.place();notify(`${it.icon} ${it.name} placed!`,1.5);
        }else{sfx.error();notify("Can't place here!",1.5);}
      }
    } // end interior check
  } // end R-key use item
  }
  
  // NPCs
  // NPC schedules — swap waypoints based on time of day
  const npcHour = getHour();
  for(const n of npcs){
    // Schedule system: NPCs have optional schedule overrides
    if(n.schedule){
      let activeWP = n.wp; // default
      if(npcHour>=21||npcHour<6) activeWP = n.schedule.night || n.wp;
      else if(npcHour>=18) activeWP = n.schedule.evening || n.wp;
      else activeWP = n.schedule.day || n.wp;
      if(n._activeWP !== activeWP){n._activeWP=activeWP;n.pi=0;} // reset waypoint on schedule change
      n.mt+=dt;if(n.mt>=n.mi){n.mt=0;n.pi=(n.pi+1)%activeWP.length;}
      const t=activeWP[n.pi],tx=t.x*TILE+8,ty=t.y*TILE+8,s=30*dt;
      const nMoving=Math.abs(n.x-tx)>1||Math.abs(n.y-ty)>1;
      if(Math.abs(n.x-tx)>1)n.x+=Math.sign(tx-n.x)*s;if(Math.abs(n.y-ty)>1)n.y+=Math.sign(ty-n.y)*s;
      n.moving=nMoving;
      if(nMoving){n.wt=(n.wt||0)+dt;if(n.wt>0.15){n.wt=0;n.wf=((n.wf||0)+1)%4;}}else n.wt=0;
    } else {
      // Legacy: use fixed wp array
      n.mt+=dt;if(n.mt>=n.mi){n.mt=0;n.pi=(n.pi+1)%n.wp.length;}
      const t=n.wp[n.pi],tx=t.x*TILE+8,ty=t.y*TILE+8,s=30*dt;
      const nMoving=Math.abs(n.x-tx)>1||Math.abs(n.y-ty)>1;
      if(Math.abs(n.x-tx)>1)n.x+=Math.sign(tx-n.x)*s;if(Math.abs(n.y-ty)>1)n.y+=Math.sign(ty-n.y)*s;
      n.moving=nMoving;
      if(nMoving){n.wt=(n.wt||0)+dt;if(n.wt>0.15){n.wt=0;n.wf=((n.wf||0)+1)%4;}}else n.wt=0;
    }
  }
  
  // Rigs
  let th=0;for(const r of rigs){let e=r.update(dt);if(e>0){
    if(hasSatellite)e=Math.ceil(e*1.2); // Satellite: +20% mining
    if(hasRocket)e=Math.ceil(e*1.5); // Rocket: +50% ALL income
    player.wallet+=e;player.totalEarned+=e;
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
  // Leaves (windy/storm, or always during Euphoria = autumn)
  const leafChance = econ.phase===2 ? 0.03 : ((weather.current==='storm'||weather.windX>0.5) ? 0.01 : 0);
  if (leafChance > 0 && ambient.length < 100 && Math.random() < leafChance) {
    const autumnColors = econ.phase===2 ? ['#CC6620','#DD8830','#EE9940','#CC4410','#DDAA30'] : ['#8A6A20','#AA8830','#6A8A20','#CC8833'];
    ambient.push({x:-20,y:Math.random()*canvas.height,type:'leaf',vx:60+Math.random()*40,vy:20+Math.random()*30,life:6+Math.random()*4,maxLife:10,size:4,color:autumnColors[Math.floor(Math.random()*autumnColors.length)],phase:Math.random()*6});
  }
  // Snow particles during Capitulation (winter)
  if (econ.phase===3 && !interior && ambient.length<100 && Math.random()<0.04) {
    ambient.push({x:Math.random()*canvas.width,y:-10,type:'snow',vx:(Math.random()-0.5)*20+weather.windX*15,vy:30+Math.random()*20,life:6+Math.random()*4,maxLife:10,size:2+Math.random()*2,color:'#FFFFFF',phase:Math.random()*6});
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
    } else if (p.type === 'snow') {
      p.phase += dt * 1.5;
      p.x += (p.vx + Math.sin(p.phase) * 10) * dt; // gentle drift
      p.y += p.vy * dt;
    } else if (p.type === 'sparkle') {
      // Gravity-affected upward burst
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 80 * dt; // gravity pulls down
      p.vx *= 0.96; // slight drag
    } else {
      p.x += p.vx * dt; p.y += p.vy * dt;
    }
  }

  // ---- FISHING MINIGAME ----
  if(fishing){
    fishing.timer+=dt;
    if(!fishing.biting){
      // Waiting for bite
      fishing.biteTimer-=dt;
      if(fishing.biteTimer<=0){
        fishing.biting=true;
        // Determine fish type
        const roll=Math.random();
        if(roll<0.02) fishing.fish='bitcoin_fish';
        else if(roll<0.35) fishing.fish='salmon';
        else fishing.fish='trout';
        notify('🐟 Something\'s biting! Press E to reel in!',2);
        sfx.coin();
      }
    }else if(!fishing.caught){
      // Moving catch bar
      fishing.barPos+=fishing.barDir*dt*1.5;
      if(fishing.barPos>1){fishing.barPos=1;fishing.barDir=-1;}
      if(fishing.barPos<0){fishing.barPos=0;fishing.barDir=1;}
      
      // Press E to try catching
      if(jp['e']){
        const inZone=Math.abs(fishing.barPos-fishing.catchZone)<fishing.catchSize;
        if(inZone){
          fishing.caught=true;
          if(addItem(fishing.fish)){
            const fishItem=ITEMS[fishing.fish];
            notify(`🎣 Caught a ${fishItem.name}! (${fmt(fishItem.sell)} sats)`,3,true);
            sfx.block();addXP('foraging',fishing.fish==='bitcoin_fish'?25:10);
          }else{notify('Inventory full!',1.5);sfx.error();}
          fishing=null;
        }else{
          notify('Missed! Fish got away.',2);sfx.error();
          fishing=null;
        }
      }
      // Auto-fail after 3 seconds
      if(fishing&&fishing.timer>6){notify('Fish got bored and swam away.',2);fishing=null;}
    }
    // Cancel with Escape
    if(jp['escape']){fishing=null;notify('Stopped fishing.',1);}
  }

  for(const k in jp)jp[k]=false;
} // end update()

// ============================================================
// HUD
// ============================================================
// HUD toggle button — small circle in top-right (or right of strip on mobile)
// Returns its hit-rect for the click handler.
let _hudToggleRect = {x:0, y:0, r:0};
function drawHudToggleButton(){
  // Position: top-LEFT, just past the HUD strip / panel — avoids collision with
  // the mobile pause/inventory buttons in the top-right and the touch action zone.
  const r = isSmallScreen ? 18 : 16;
  let cx, cy;
  if (hudMinimized) {
    // Right edge of the minimal strip
    const stripW = Math.min(canvas.width - 60, 340);
    cx = 8 + stripW + r + 6;
    cy = 8 + 15;
  } else {
    // Just to the right of the 290px stat panel
    cx = 14 + 290 + r + 6;
    cy = 14 + r;
  }
  // Safety: don't fall off-screen on tiny widths
  if (cx > canvas.width - r - 6) cx = canvas.width - r - 6;
  _hudToggleRect = {x: cx, y: cy, r: r + 4}; // generous hitbox
  ctx.fillStyle = 'rgba(8,8,12,0.7)';
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = 'rgba(247,147,26,0.5)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.stroke();
  ctx.fillStyle = '#F7931A';
  ctx.font = `bold ${Math.floor(r*0.95)}px ${FONT}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(hudMinimized ? '☰' : '×', cx, cy + 1);
  ctx.textBaseline = 'alphabetic';
}
function hudToggleHit(x, y){
  const r = _hudToggleRect;
  if (!r.r) return false;
  const dx = x - r.x, dy = y - r.y;
  return (dx*dx + dy*dy) <= r.r*r.r;
}

// Contextual interact button for mobile — reads player context and shows the right action
// Returns {key, label} for the current interactable, or null.
function getInteractContext() {
  if (!isMobile) return null;
  if (shopOpen || invOpen || chestOpen || dlg || pauseOpen || craftOpen) return null;
  // In a shop interior → Shop (B)
  if (interior && (interior.type === 'shop' || interior.type === 'tavern')) {
    return { key: 'b', label: interior.type === 'tavern' ? 'Open Tavern' : "Open Shop" };
  }
  // In home interior → Sleep (E) — but only at night
  if (interior && interior.type === 'home') {
    const nearBed = player.y < 4*TILE && player.x < 5*TILE;
    if (nearBed) return { key: 'e', label: 'Sleep' };
  }
  // Near shop NPC in overworld
  for (const n of npcs) {
    if ((n.role==='shop'||n.role==='market'||n.role==='seeds') &&
        Math.hypot(n.x-player.x, n.y-player.y) < 60) {
      return { key: 'b', label: n.role==='seeds' ? 'Seed Shop' : (n.role==='market'?'Sell':'Shop') };
    }
  }
  // Near any NPC → Talk (E)
  for (const n of npcs) {
    if (Math.hypot(n.x-player.x, n.y-player.y) < 48) {
      return { key: 'e', label: `Talk: ${n.name}` };
    }
  }
  // Near mine entrance → Enter Mine (E)
  if (!mineFloor && !interior) {
    for (const d of decor) {
      if (d.type === 'mine_entrance' &&
          Math.hypot(d.x*TILE+8 - player.x, d.y*TILE+8 - player.y) < TILE*2) {
        return { key: 'e', label: 'Enter Mine' };
      }
    }
  }
  // Standing on mine stairs → Exit Mine / Go Up (X)
  if (mineFloor) {
    const ptx = Math.floor(player.x / TILE);
    const pty = Math.floor(player.y / TILE);
    if (mineFloor.stairsUp && ptx === mineFloor.stairsUp.x && pty === mineFloor.stairsUp.y) {
      return { key: 'x', label: mineLevel === 0 ? 'Exit Mine' : 'Go Up' };
    }
    if (mineFloor.stairsDown && ptx === mineFloor.stairsDown.x && pty === mineFloor.stairsDown.y) {
      return { key: 'x', label: 'Go Deeper' };
    }
  }
  // Near ready crop → Harvest (H)
  for (const c of crops) {
    const info = CROP_TYPES[c.type];
    if (c.dayAge >= info.grow) {
      const ix = player.x + player.facing.x * 16, iy = player.y + player.facing.y * 16;
      if (Math.hypot(c.x*TILE+8 - ix, c.y*TILE+8 - iy) < 28) {
        return { key: 'h', label: 'Harvest' };
      }
    }
  }
  // Near rig in current space → Toggle Rig (E)
  const currentInt = interior ? interior.type : null;
  for (const r of rigs) {
    const sameSpace = (currentInt && r.interior === currentInt) || (!currentInt && !r.interior);
    if (sameSpace && Math.hypot(r.x-player.x, r.y-player.y) < 32) {
      return { key: 'e', label: r.powered ? 'Turn Off Rig' : 'Turn On Rig' };
    }
  }
  // Near animal → Collect / Pet (E)
  for (const a of animals) {
    if (Math.hypot(a.x-player.x, a.y-player.y) < 28) {
      return { key: 'e', label: a.prodReady ? 'Collect' : 'Pet Animal' };
    }
  }
  return null;
}

// Draw contextual interact button — a big pill button above the hotbar
let _ctxBtnRect = {x:0, y:0, w:0, h:0, key:null};
function drawContextualInteractButton() {
  if (!isMobile) { _ctxBtnRect.w = 0; return; }
  const ctx2 = getInteractContext();
  if (!ctx2) { _ctxBtnRect.w = 0; return; }
  // Context pill: prefer center-between-joystick-and-USE on wide screens,
  // fall back to stacked-above-USE on narrow screens so it never overlaps
  const hb = _hotbarRect;
  const hbTop = (hb && hb.y) ? hb.y : canvas.height - 150;
  const h = 38;
  let w, x, y;
  const centeredW = Math.min(170, canvas.width - 260);
  if (centeredW >= 120) {
    w = centeredW;
    x = (canvas.width - w) / 2;
    y = hbTop - 60 - h/2; // centered on USE button's Y
  } else {
    // Narrow screen — stack the pill above the USE button
    w = 150;
    x = canvas.width - w - 12;
    y = hbTop - 60 - 36 - h - 6; // above USE button (radius 36) with 6px gap
  }
  _ctxBtnRect = { x, y, w, h, key: ctx2.key };
  // Pulsing glow
  const pulseA = 0.4 + Math.sin(_t * 3) * 0.15;
  ctx.fillStyle = `rgba(247,147,26,${pulseA * 0.3})`;
  rr(x - 3, y - 3, w + 6, h + 6, 24);
  ctx.fillStyle = 'rgba(20,12,4,0.9)';
  rr(x, y, w, h, 22);
  ctx.strokeStyle = '#F7931A'; ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  ctx.fillStyle = '#FFE080';
  ctx.font = `bold 16px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(ctx2.label, x + w/2, y + h/2 + 1);
  ctx.textBaseline = 'alphabetic';
}
function ctxBtnHit(px, py) {
  const r = _ctxBtnRect;
  if (!r.w) return false;
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

// Portrait rotation nudge — shows a dismissible banner on mobile when held in portrait
let _rotateNudgeDismissed = (() => { try { return localStorage.getItem('sv_rot_dismissed') === '1'; } catch(e){return false;} })();
let _rotateNudgeRect = {x:0, y:0, w:0, h:0};
function drawRotateNudge(){
  if (!isMobile || !isPortrait || _rotateNudgeDismissed) { _rotateNudgeRect.w = 0; return; }
  const w = Math.min(canvas.width - 20, 300);
  const h = 56;
  const x = (canvas.width - w)/2;
  const y = canvas.height - h - 120; // above touch controls
  _rotateNudgeRect = {x, y, w, h};
  ctx.fillStyle = 'rgba(8,8,12,0.85)';
  rr(x, y, w, h, 8);
  ctx.strokeStyle = 'rgba(247,147,26,0.7)'; ctx.lineWidth = 2;
  ctx.strokeRect(x+1, y+1, w-2, h-2);
  ctx.fillStyle = C.orange;
  ctx.font = `bold 14px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('📱 Rotate to landscape', x + w/2, y + 22);
  ctx.fillStyle = '#AAA';
  ctx.font = `11px ${FONT}`;
  ctx.fillText('(tap to dismiss)', x + w/2, y + 42);
}
function rotateNudgeHit(px, py){
  const r = _rotateNudgeRect;
  if (!r.w) return false;
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}
function dismissRotateNudge(){
  _rotateNudgeDismissed = true;
  try { localStorage.setItem('sv_rot_dismissed', '1'); } catch(e){}
}

function drawHUD(){
  const p=14;
  const isEarning = rigs.some(r=>r.powered&&!r.oh&&r.dur>0);
  const pulse = isEarning ? 1 + Math.sin(_now/200)*0.08 : 1;

  if (hudMinimized) {
    // ---- MINIMAL HUD: thin strip top-left, leaves the screen open ----
    const stripW = Math.min(canvas.width - 60, 340);
    ctx.fillStyle = 'rgba(8,8,12,0.7)';
    rr(8, 8, stripW, 30, 6);
    ctx.fillStyle = C.hud;
    ctx.font = `bold ${Math.floor(15*pulse)}px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(`₿ ${fmt(player.wallet)}`, 18, 28);
    ctx.fillStyle = '#CCC';
    ctx.font = `12px ${FONT}`;
    ctx.fillText(`${getTimeStr()} D${time.day}`, 130, 28);
    if (isEarning) {
      const sps = rigs.reduce((s,r)=>s+(r.powered&&!r.oh&&r.dur>0?(r.hr*1000/(econ.diff*60)):0),0);
      ctx.fillStyle = C.green;
      ctx.fillText(`⛏️ +${sps.toFixed(1)}/s`, 220, 28);
    }
  } else {
    // ---- FULL HUD: classic stat panel ----
    panel(p,p,290,256);
    let y=p+18;
    ctx.fillStyle=C.hud;ctx.font=`bold ${Math.floor(18*pulse)}px ${FONT}`;ctx.textAlign='left';
    ctx.fillText(`₿ ${fmt(player.wallet)} sats`,p+12,y);
    if(isEarning){
      ctx.fillStyle=C.green;ctx.font=`bold 13px ${FONT}`;
      const sps=rigs.reduce((s,r)=>s+(r.powered&&!r.oh&&r.dur>0?(r.hr*1000/(econ.diff*60)):0),0);
      ctx.fillText(` ⛏️ +${sps.toFixed(1)} sats/s`,p+12+ctx.measureText(`₿ ${fmt(player.wallet)} sats`).width+8,y);
    }
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
    const ct=CITADEL_TIERS[citadelTier];
    ctx.fillStyle=C.orange;ctx.font=`bold 13px ${FONT}`;
    ctx.fillText(`${ct.icon} ${ct.name} Lv${citadelTier+1}`,p+12,y);
    if(isNearHome()){ctx.fillStyle=C.gray;ctx.font=`11px ${FONT}`;ctx.fillText('[C] Citadel Menu',p+12,y+12);}
  }
  drawHudToggleButton();
  // Interior building label — placement depends on HUD mode
  if(interior){
    const iName={home:'🏠 Home',shop:"🏪 Ruby's Shop",tavern:'🍺 Hodl Tavern',shed:'⛏️ Mining Shed',hall:'🏛️ Town Hall'};
    ctx.fillStyle=C.hud;ctx.font=`bold 14px ${FONT}`;ctx.textAlign='left';
    // Minimized: tuck label just below the strip; Full: below the stat panel
    const labelY = hudMinimized ? 58 : (p + 250);
    ctx.fillText(iName[interior.type]||interior.type, p+12, labelY);
    // Exit prompt at bottom of screen
    ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(canvas.width/2-80,canvas.height-90,160,24);
    ctx.fillStyle=C.orange;ctx.font=`bold 13px ${FONT}`;ctx.textAlign='center';
    ctx.fillText('↓ Walk south to exit ↓',canvas.width/2,canvas.height-73);
  }
  
  // Hotbar — bigger, finger-friendly slots on mobile. 2 rows × 5 cols on mobile,
  // single row of 10 on desktop/small-screen. Lots more finger area per slot this way.
  const hbN=10;
  let hbW, hbGap, hbBottomMargin, hbCols, hbRows;
  if (isMobile) {
    hbCols = 5; hbRows = 2;
    hbGap = 4;
    // Each slot fits 5 across with room for margins; capped so 2 rows stay compact
    const maxHbW = Math.floor((canvas.width - 24 - (hbCols-1)*hbGap) / hbCols);
    hbW = Math.max(44, Math.min(56, maxHbW));
    hbBottomMargin = 12;
  } else if (isSmallScreen) {
    hbCols = 10; hbRows = 1;
    hbW = 38; hbGap = 3; hbBottomMargin = 8;
  } else {
    hbCols = 10; hbRows = 1;
    hbW = 44; hbGap = 4; hbBottomMargin = 20;
  }
  const hbH = hbW;
  const hbTW = hbCols*hbW + (hbCols-1)*hbGap;
  const hbTotalH = hbRows*hbH + (hbRows-1)*hbGap;
  const hbX=(canvas.width-hbTW)/2;
  const hbY=canvas.height-hbTotalH-hbBottomMargin;
  // Store globally so the click handler can hit-test the REAL rect
  _hotbarRect = {x:hbX, y:hbY, w:hbTW, h:hbTotalH, slotW:hbW, slotH:hbH, slotGap:hbGap, n:hbN, cols:hbCols, rows:hbRows};
  // Background wraps the whole grid
  ctx.fillStyle='rgba(8,8,12,0.82)';rr(hbX-6,hbY-6,hbTW+12,hbTotalH+12,8);
  for(let i=0;i<hbN;i++){
    const col = i % hbCols;
    const row = Math.floor(i / hbCols);
    const x=hbX+col*(hbW+hbGap);
    const rowY = hbY + row*(hbH+hbGap);
    // Brighter selection highlight for clarity on mobile
    if(i===selSlot){
      ctx.fillStyle='rgba(247,147,26,0.35)';ctx.fillRect(x,rowY,hbW,hbH);
      ctx.strokeStyle=C.hud;ctx.lineWidth=3;ctx.strokeRect(x,rowY,hbW,hbH);
      // Corner glow
      ctx.fillStyle='rgba(255,200,80,0.5)';
      ctx.fillRect(x,rowY,4,4);ctx.fillRect(x+hbW-4,rowY,4,4);
      ctx.fillRect(x,rowY+hbH-4,4,4);ctx.fillRect(x+hbW-4,rowY+hbH-4,4,4);
    } else {
      ctx.fillStyle='rgba(20,20,25,0.85)';ctx.fillRect(x,rowY,hbW,hbH);
      ctx.strokeStyle='#333';ctx.lineWidth=1;ctx.strokeRect(x,rowY,hbW,hbH);
    }
    // Slot number (smaller on mobile so it doesn't crowd the icon)
    ctx.fillStyle='#666';ctx.font=`${isMobile?10:11}px ${FONT}`;ctx.textAlign='left';
    ctx.fillText(`${(i+1)%10}`,x+4,rowY+12);
    const sl=inv[i];if(sl&&ITEMS[sl.id]){
      const sprName = ITEM_SPRITES[sl.id];
      if(sprName && SpriteCache[sprName]){
        const sScale=Math.max(2,Math.floor(hbW/18));
        drawSprite(sprName,x+(hbW-16*sScale/2)/2,rowY+(hbH-16*sScale/2)/2,sScale);
      } else{
        ctx.font=`${Math.floor(hbW*0.55)}px serif`;ctx.textAlign='center';
        ctx.fillText(ITEMS[sl.id].icon,x+hbW/2,rowY+hbH/2+hbW*0.2);
      }
      if(sl.qty>1){
        ctx.fillStyle='#000';ctx.font=`bold ${isMobile?12:12}px ${FONT}`;ctx.textAlign='right';
        ctx.fillText(sl.qty,x+hbW-3,rowY+hbH-3);
        ctx.fillStyle=C.white;ctx.fillText(sl.qty,x+hbW-4,rowY+hbH-4);
      }
    }
  }
  
  // Mobile touch controls overlay
  if(isMobile) drawTouchControls();
  // Contextual interact button (mobile) — appears when near something interactable
  drawContextualInteractButton();
  // Mobile quick-action menu overlay (if open)
  if(isMobile) drawMobileMenu();
  // Portrait rotation nudge
  drawRotateNudge();
  
  // Controls bar — desktop only and only when there's room (skip on small screens)
  if(!isMobile && !isSmallScreen) {
    const cbY = canvas.height - 18;
    ctx.fillStyle='rgba(0,0,0,0.6)';ctx.fillRect(0,cbY-4,canvas.width,22);
    ctx.fillStyle='#999';ctx.font=`bold 12px ${FONT}`;ctx.textAlign='center';
    ctx.fillText('WASD:Move  E:Interact  R:Use/Plant  G:Eat  T:Craft  H:Harvest  I:Inventory  B:Shop  C:Citadel  Q:Sort  ?:Help  P:Save',canvas.width/2,cbY+8);
  }
  
  // Energy bar — on mobile it sits centered above the hotbar so it doesn't collide
  // with the USE button. On desktop it stays in the top-right area above hotbar.
  const ebW = isMobile ? Math.min(160, canvas.width - 240) : (isSmallScreen ? 100 : 140);
  const ebX = isMobile ? (canvas.width - ebW)/2 : (canvas.width - ebW - p - 10);
  const ebY = isMobile ? (hbY - 18) : (hbY - 22);
  const ePct=player.energy/player.maxEnergy;
  ctx.fillStyle='rgba(10,10,15,0.7)';rr(ebX-4,ebY-14,ebW+8,28,4);
  ctx.fillStyle='#1A1A20';ctx.fillRect(ebX,ebY,ebW,10);
  ctx.fillStyle=ePct>0.5?'#4CAF50':ePct>0.25?'#FF9800':'#F44336';
  ctx.fillRect(ebX,ebY,ebW*ePct,10);
  if(ePct<0.2){ctx.fillStyle=`rgba(255,50,50,${0.15+Math.sin(_t*4)*0.1})`;ctx.fillRect(ebX,ebY,ebW*ePct,10);}
  ctx.fillStyle='#DDD';ctx.font=`bold ${isSmallScreen?10:12}px ${FONT}`;ctx.textAlign='center';
  ctx.fillText(`⚡ ${Math.floor(player.energy)}/${player.maxEnergy}`,ebX+ebW/2,ebY-2);
  
  // Rig detail panel — desktop only. On mobile it clutters the game view; use inventory.
  if (!hudMinimized && !isMobile) {
    let nr=null,nd=60;for(const r of rigs){const d=Math.hypot(r.x-player.x,r.y-player.y);if(d<nd){nr=r;nd=d;}}
    if(nr){const rw=220,rh=110,rx=canvas.width-rw-p;panel(rx,p,rw,rh);
      ctx.fillStyle=C.hud;ctx.font=`bold 15px ${FONT}`;ctx.textAlign='left';ctx.fillText(Rig.N[nr.tier],rx+10,p+18);
      ctx.font=`13px ${FONT}`;ctx.fillStyle='#CCC';
      ctx.fillText(`Temp: ${nr.temp.toFixed(0)}°C`,rx+10,p+36);ctx.fillText(`Hash: ${nr.hr.toFixed(1)} TH/s`,rx+10,p+52);
      ctx.fillText(`Durability: ${nr.dur.toFixed(0)}%`,rx+10,p+68);ctx.fillText(`Mined: ${fmt(nr.mined)} sats`,rx+10,p+84);
      ctx.fillStyle=nr.statusCol();ctx.fillText(`Status: ${nr.status()}`,rx+10,p+100);}
  }
  
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
      const pulse=0.5+Math.sin(_now/300)*0.3;
      ctx.fillStyle=`rgba(247,147,26,${pulse})`;ctx.font=`bold 28px ${FONT}`;ctx.textAlign='center';
      // On mobile, show the button name instead of a keyboard key
      const mobileLabel = {E:'→ USE button', I:'→ 📦 button', B:'→ USE button', '1':'→ slot 1'}[key] || `[${key}]`;
      ctx.fillText(isMobile ? mobileLabel : `[ ${key} ]`, canvas.width/2, ty+th+30);
    }
    else if(tut.highlight==='hotbar'){
      ctx.strokeStyle=`rgba(247,147,26,${0.5+Math.sin(_now/300)*0.3})`;ctx.lineWidth=3;
      const hb2=_hotbarRect;
      if(hb2.w>0) ctx.strokeRect(hb2.x-6,hb2.y-6,hb2.w+12,hb2.h+12);
    }
    else if(tut.highlight==='hud_sats'){
      ctx.strokeStyle=`rgba(247,147,26,${0.5+Math.sin(_now/300)*0.3})`;ctx.lineWidth=3;
      ctx.strokeRect(p-2,p-2,294,30);
    }
    else if(tut.highlight==='controls'){
      if (isMobile) {
        // Mobile: compact top banner, stays clear of touch controls
        const mw = Math.min(canvas.width - 40, 320), mh = 64;
        const mx = (canvas.width - mw)/2, my = 80;
        ctx.fillStyle='rgba(0,0,0,0.75)';rr(mx,my,mw,mh,8);
        ctx.strokeStyle=C.orange;ctx.lineWidth=1.5;ctx.strokeRect(mx+1,my+1,mw-2,mh-2);
        ctx.fillStyle=C.orange;ctx.font=`bold 13px ${FONT}`;ctx.textAlign='center';
        ctx.fillText('🎮 MOBILE CONTROLS', mx+mw/2, my+18);
        ctx.fillStyle='#DDD';ctx.font=`11px ${FONT}`;
        ctx.fillText('Joystick (left) — Move   •   USE button — Act', mx+mw/2, my+36);
        ctx.fillText('☰ Menu — craft/eat/map   •   📦 — Inventory', mx+mw/2, my+52);
      } else {
        ctx.fillStyle=`rgba(0,0,0,0.6)`;ctx.fillRect(canvas.width-200,canvas.height-220,190,200);
        ctx.fillStyle=C.orange;ctx.font=`bold 14px ${FONT}`;ctx.textAlign='left';
        ctx.fillText('🎮 CONTROLS',canvas.width-190,canvas.height-198);
        ctx.fillStyle=C.white;ctx.font=`13px ${FONT}`;
        ['WASD — Move','E — Interact','R — Use item','I — Inventory','B — Shop','O — Objectives','H — Harvest','K — Skills','? — All controls'].forEach((c,i)=>ctx.fillText(c,canvas.width-190,canvas.height-175+i*20));
      }
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
  if(showJournal) drawJournal();
  
  // Fishing minigame UI
  if(fishing&&fishing.biting&&!fishing.caught){
    const fw=200,fh=40;
    const fx=(canvas.width-fw)/2,fy=canvas.height*0.3;
    // Background bar
    panel(fx-4,fy-4,fw+8,fh+8);
    ctx.fillStyle='#1A3050';ctx.fillRect(fx,fy,fw,fh);
    // Catch zone (green)
    const zoneX=fx+fishing.catchZone*fw-fishing.catchSize*fw;
    const zoneW=fishing.catchSize*2*fw;
    ctx.fillStyle='rgba(68,255,68,0.3)';ctx.fillRect(Math.max(fx,zoneX),fy,Math.min(zoneW,fw),fh);
    // Moving bar (orange indicator)
    const barX=fx+fishing.barPos*fw;
    ctx.fillStyle=C.orange;ctx.fillRect(barX-3,fy-2,6,fh+4);
    // Label
    ctx.fillStyle=C.white;ctx.font=`bold 14px ${FONT}`;ctx.textAlign='center';
    ctx.fillText('🐟 Press E in the green zone!',canvas.width/2,fy-12);
    // Fish type hint
    ctx.fillStyle=C.gold;ctx.font=`12px ${FONT}`;
    ctx.fillText(fishing.fish==='bitcoin_fish'?'✨ LEGENDARY BITE! ✨':'Reel it in!',canvas.width/2,fy+fh+20);
  }else if(fishing&&!fishing.biting){
    ctx.fillStyle=C.gray;ctx.font=`bold 14px ${FONT}`;ctx.textAlign='center';
    ctx.fillText('🎣 Waiting for a bite...',canvas.width/2,canvas.height*0.3);
  }
  if(citadelMenuOpen) drawCitadelMenu();
  if(invOpen) drawInv();
  if(chestOpen) drawChest();
  if(showSkills) drawSkillsPanel();
  if(showControls) drawControlsPanel();
  if(showDaySummary && daySummary) drawDaySummary();
  if(pauseOpen) drawPauseMenu();

  // Minimap
  // Minimap: auto-hidden in portrait on mobile (it takes up too much room);
  // shrunk on landscape mobile
  if(minimapOpen && !interior && !(isMobile && isPortrait)){
    const mmW = isSmallScreen ? 110 : 160;
    const mmH = isSmallScreen ? 80 : 120;
    const mmX = canvas.width - mmW - 12;
    const mmY = isSmallScreen ? 48 : 12; // below the HUD strip on small screens
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

    // Mining rigs (orange dots)
    for(const r of rigs){
      if(!r.interior){
        const rx=r.x/TILE,ry=r.y/TILE;
        ctx.fillStyle=r.powered&&r.dur>0&&!r.oh?'#F7931A':'#663300';
        ctx.fillRect(mmX+rx*scaleX-1,mmY+ry*scaleY-1,3,3);
      }
    }

    // Crops (green dots)
    for(const cr of crops){
      ctx.fillStyle=cr.dayAge>=CROP_TYPES[cr.type].grow?'#FFD700':'#44CC44';
      ctx.fillRect(mmX+cr.x*scaleX,mmY+cr.y*scaleY,2,2);
    }

    // Placed items (yellow dots for solar, blue for battery)
    for(const p of placed){
      const px2=p.x/TILE/SCALE,py2=p.y/TILE/SCALE;
      if(p.type==='solar_panel')ctx.fillStyle='#FFCC00';
      else if(p.type==='battery')ctx.fillStyle='#4488FF';
      else if(p.type==='chest')ctx.fillStyle='#AA8844';
      else ctx.fillStyle='#888';
      ctx.fillRect(mmX+p.x/TILE*scaleX-1,mmY+p.y/TILE*scaleY-1,2,2);
    }

    // Seed fragments (pulsing gold)
    const sfGlow=0.5+Math.sin(_now/400)*0.5;
    for(const d of decor){
      if(d.type==='seed_fragment'){
        ctx.fillStyle=`rgba(255,215,0,${sfGlow})`;
        ctx.beginPath();ctx.arc(mmX+d.x*scaleX,mmY+d.y*scaleY,2,0,Math.PI*2);ctx.fill();
      }
    }

    // Animals (tiny dots)
    for(const a of animals){
      const ax=a.x/TILE, ay=a.y/TILE;
      ctx.fillStyle='#90EE90';
      ctx.fillRect(mmX+ax*scaleX-1,mmY+ay*scaleY-1,2,2);
    }

    // Player (bright orange blinking dot)
    const px=player.x/TILE, py=player.y/TILE;
    const blink=Math.sin(_now/300)>0;
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

  // Notifications — desktop: above hotbar, mobile: top-of-screen so they don't
  // collide with the USE/joystick/context buttons packed above the mobile hotbar
  ctx.textAlign='center';
  const notifY0 = isMobile ? 90 : (hbY - 30);
  const notifDir = isMobile ? 1 : -1;
  for(let i=0;i<notifs.length;i++){const n=notifs[i],a=Math.min(1,n.t);
    ctx.fillStyle=n.big?`rgba(255,215,0,${a})`:`rgba(247,147,26,${a})`;
    ctx.font=`bold ${n.big?18:14}px ${FONT}`;
    // Shadow so it reads over any background
    if(isMobile){ctx.fillStyle='rgba(0,0,0,0.7)';ctx.fillText(n.text,canvas.width/2+1,notifY0+notifDir*i*24+1);}
    ctx.fillStyle=n.big?`rgba(255,215,0,${a})`:`rgba(247,147,26,${a})`;
    ctx.fillText(n.text,canvas.width/2,notifY0+notifDir*i*24);}
  
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

function drawJournal(){
  const w=520,h=480,x=(canvas.width-w)/2,y=(canvas.height-h)/2;
  panel(x,y,w,h);
  ctx.fillStyle=C.hud;ctx.font=`bold 20px ${FONT}`;ctx.textAlign='center';
  ctx.fillText('📖 Quest Journal',x+w/2,y+28);
  
  // Active quests section
  ctx.fillStyle=C.orange;ctx.font=`bold 14px ${FONT}`;ctx.textAlign='left';
  ctx.fillText('Active Quests',x+16,y+52);
  let cy=y+68;
  let hasActive=false;
  for(const npcName in NPC_QUESTS){
    const q=getActiveQuest(npcName);
    if(q){
      hasActive=true;
      const ready=q.check();
      ctx.fillStyle=ready?C.green:'#CCC';ctx.font=`bold 13px ${FONT}`;ctx.textAlign='left';
      ctx.fillText(`${ready?'✅':'⏳'} ${q.title}`,x+24,cy);
      ctx.fillStyle='#999';ctx.font=`12px ${FONT}`;
      ctx.fillText(`${npcName} — ${q.task}`,x+24,cy+16);
      ctx.fillStyle=C.hud;ctx.font=`11px ${FONT}`;ctx.textAlign='right';
      ctx.fillText(`${fmt(q.reward.sats||0)} sats`,x+w-16,cy);
      ctx.textAlign='left';
      cy+=38;
      if(cy>y+h/2-20) break;
    }
  }
  if(!hasActive){ctx.fillStyle='#666';ctx.font=`13px ${FONT}`;ctx.fillText('No active quests — talk to villagers!',x+24,cy);cy+=24;}
  
  // Completed quests section
  cy+=10;
  ctx.fillStyle='#888';ctx.font=`bold 14px ${FONT}`;
  ctx.fillText(`Completed (${questJournal.length})`,x+16,cy);cy+=18;
  
  // Show last 6 completed
  const shown=questJournal.slice(-6).reverse();
  for(const j of shown){
    if(cy>y+h-40) break;
    ctx.fillStyle='#5A8A5A';ctx.font=`bold 12px ${FONT}`;ctx.textAlign='left';
    ctx.fillText(`✅ ${j.title}`,x+24,cy);
    ctx.fillStyle='#777';ctx.font=`11px ${FONT}`;
    ctx.fillText(`${j.npcName} — Day ${j.completedDay}`,x+24,cy+14);
    if(j.lore){
      ctx.fillStyle='#998866';ctx.font=`italic 11px ${FONT}`;
      wrapText(j.lore,x+24,cy+28,w-48,13);
      cy+=16;
    }
    cy+=34;
  }
  
  // Stats
  ctx.fillStyle=C.gray;ctx.font=`12px ${FONT}`;ctx.textAlign='center';
  const totalQuests=Object.values(NPC_QUESTS).reduce((s,q)=>s+q.length,0);
  ctx.fillText(`${questJournal.length}/${totalQuests} quests completed | J or Esc to close`,x+w/2,y+h-12);
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
  // Responsive: fit within the canvas with margin, cap at 560x460 on desktop
  const w=Math.min(560,canvas.width-20);
  const h=Math.min(460,canvas.height-40);
  const isNarrow=w<520;
  const x=(canvas.width-w)/2,y=(canvas.height-h)/2;panel(x,y,w,h);
  ctx.fillStyle=C.hud;ctx.font=`bold ${isNarrow?15:18}px ${FONT}`;ctx.textAlign='center';
  ctx.fillText(shopNpcRole==='market'?"🌾 Farmer Pete's Market":shopNpcRole==='seeds'?"🌱 Seed Sally's Garden Shop":shopNpcRole==='tavern'?"🍺 Hodl Tavern":"\u26cf\ufe0f Ruby's Hardware Shop",x+w/2,y+26);
  const activeList=shopNpcRole==='seeds'?SEED_SHOP_LIST:shopNpcRole==='tavern'?TAVERN_SHOP_LIST:SHOP_LIST;
  
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
    const sl=inv.filter(s=>s&&ITEMS[s.id]&&ITEMS[s.id].sell>0);
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
  const cols=5,rows=4;
  // Responsive slot size: shrink to fit on mobile
  const isNarrow=canvas.width<520;
  const ss=isNarrow?40:56,gap=isNarrow?4:6;
  const sidePanel=isNarrow?0:180; // hide side detail panel on narrow screens
  const w=Math.min(canvas.width-20,cols*(ss+gap)+gap+sidePanel);
  const h=rows*(ss+gap)+gap+(isNarrow?100:60);
  const x=(canvas.width-w)/2,y=(canvas.height-h)/2;panel(x,y,w,h);
  ctx.fillStyle=C.hud;ctx.font=`bold 18px ${FONT}`;ctx.textAlign='center';ctx.fillText('📦 Inventory',x+w/2,y+24);
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
    const i=r*cols+c,sx=x+gap+c*(ss+gap),sy=y+36+r*(ss+gap);
    ctx.fillStyle=i===selSlot?'rgba(247,147,26,.2)':'rgba(20,20,25,.8)';ctx.fillRect(sx,sy,ss,ss);
    ctx.strokeStyle=i===selSlot?C.hud:'#333';ctx.lineWidth=i===selSlot?2:1;ctx.strokeRect(sx,sy,ss,ss);
    ctx.fillStyle='#444';ctx.font=`11px ${FONT}`;ctx.textAlign='left';ctx.fillText(i<10?`${(i+1)%10}`:'',sx+3,sy+11);
    const sl=inv[i];if(sl&&ITEMS[sl.id]){ctx.font='28px serif';ctx.textAlign='center';ctx.fillText(ITEMS[sl.id].icon,sx+ss/2,sy+ss/2+8);
      if(sl.qty>1){ctx.fillStyle=C.white;ctx.font=`bold 13px ${FONT}`;ctx.fillText(sl.qty,sx+ss-10,sy+ss-6);}}}
  const sel=inv[selSlot];
  if(sel){
    const it=ITEMS[sel.id];
    if(isNarrow){
      // Narrow: show inline detail strip below the slots
      const dy=y+36+rows*(ss+gap)+gap+4;
      ctx.fillStyle=C.hud;ctx.font=`bold 13px ${FONT}`;ctx.textAlign='left';
      ctx.fillText(`${it.icon} ${it.name} x${sel.qty}`,x+8,dy+12);
      ctx.fillStyle='#BBB';ctx.font=`10px ${FONT}`;
      const descTrim=it.desc.length>60?it.desc.slice(0,58)+'…':it.desc;
      ctx.fillText(descTrim,x+8,dy+26);
      ctx.fillStyle=C.gray;ctx.font=`10px ${FONT}`;
      const priceLine=[];
      if(it.buy>0)priceLine.push(`Buy ${fmt(it.buy)}`);
      if(it.sell>0)priceLine.push(`Sell ${fmt(it.sell)}`);
      if(priceLine.length)ctx.fillText(priceLine.join(' | '),x+8,dy+40);
    } else {
      // Wide: side panel
      const dx=x+cols*(ss+gap)+gap+10,dy=y+36;
      ctx.fillStyle=C.hud;ctx.font=`bold 14px ${FONT}`;ctx.textAlign='left';
      ctx.fillText(`${it.icon} ${it.name}`,dx,dy+16);
      ctx.fillStyle='#CCC';ctx.font=`12px ${FONT}`;ctx.textAlign='left';
      wrapText(it.desc,dx,dy+36,155,15);
      ctx.fillStyle=C.gray;
      if(it.buy>0)ctx.fillText(`Buy: ${fmt(it.buy)}`,dx,dy+80);
      if(it.sell>0)ctx.fillText(`Sell: ${fmt(it.sell)}`,dx,dy+94);
      ctx.fillText(`Qty: ${sel.qty}`,dx,dy+108);
    }
  }
  ctx.fillStyle=C.gray;ctx.font=`${isNarrow?10:12}px ${FONT}`;ctx.textAlign='center';
  ctx.fillText(isNarrow?'Tap slot to select':'1-9,0:Select | Click:Select | I/Tab/Esc:Close',x+w/2,y+h-10);
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
    const sl=inv[i];if(sl&&ITEMS[sl.id]){ctx.font='28px serif';ctx.textAlign='center';ctx.fillText(ITEMS[sl.id].icon,sx2+ss/2,sy2+ss/2+8);
      if(sl.qty>1){ctx.fillStyle=C.white;ctx.font='bold 13px '+FONT;ctx.fillText(sl.qty,sx2+ss-10,sy2+ss-6);}}
  }
  ctx.fillStyle=C.gray;ctx.font='bold 13px '+FONT;ctx.textAlign='center';
  ctx.fillText('Chest',x+totalW+totalW/2+30,y+42);
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
    const i=r*cols+c,sx2=x+totalW+30+gap+c*(ss+gap),sy2=y+50+r*(ss+gap);
    ctx.fillStyle='rgba(40,30,20,.8)';ctx.fillRect(sx2,sy2,ss,ss);
    ctx.strokeStyle='#554430';ctx.lineWidth=1;ctx.strokeRect(sx2,sy2,ss,ss);
    const sl=chestInv[i];if(sl&&ITEMS[sl.id]){ctx.font='28px serif';ctx.textAlign='center';ctx.fillText(ITEMS[sl.id].icon,sx2+ss/2,sy2+ss/2+8);
      if(sl.qty>1){ctx.fillStyle=C.white;ctx.font='bold 13px '+FONT;ctx.fillText(sl.qty,sx2+ss-10,sy2+ss-6);}}
  }
  ctx.fillStyle=C.gray;ctx.font='12px '+FONT;ctx.textAlign='center';
  ctx.fillText('Click items to transfer | Esc to close',x+w/2,y+h-10);
}

function panel(x,y,w,h){ctx.fillStyle=C.hudBg;rr(x,y,w,h,6);ctx.strokeStyle=C.hudBorder;ctx.lineWidth=1.5;ctx.stroke();}
function drawTutArrow(x,y,dir){
  const t=_t;const pulse=Math.sin(t*4)*6;
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
    ctx.fillStyle = `rgba(247,147,26,${0.25 + _sinT2*0.12})`;
    ctx.beginPath(); ctx.arc(sx + ST/2, sy + ST/2, 22 + _sinT*2, 0, Math.PI*2); ctx.fill();
  }
  
  // Subtle sway — more pronounced for mature crops, phase-shifted by tile position
  const sway = Math.sin(_t*1.8 + crop.x*0.7 + crop.y*0.5) * (1 + crop.stage*0.5);
  const tilt = sway * 0.04;
  ctx.save();
  ctx.translate(sx + ST/2, sy + ST/2 + 8);
  ctx.rotate(tilt);
  ctx.font = `${16 + crop.stage * 4}px serif`; ctx.textAlign = 'center';
  ctx.fillText(icon, 0, 0);
  ctx.restore();
  
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
  ctx.globalAlpha = 0.5 + Math.sin(_now / 400) * 0.5;
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
  const actualW=ST, actualH=ST+8;
  const actualPx=sx-actualW/2, actualPy=sy-actualH/2;
  // Same reference-box transform trick as drawPlayer/drawNPC — keeps
  // hardcoded pixel offsets from collapsing on small screens.
  const REF_W=48, REF_H=56;
  ctx.save();
  ctx.translate(actualPx, actualPy);
  if (actualW !== REF_W || actualH !== REF_H) ctx.scale(actualW/REF_W, actualH/REF_H);
  const w=REF_W, h=REF_H, px=0, py=0;
  const refSx=REF_W/2, refSy=REF_H/2;
  // Shadow
  ctx.fillStyle='rgba(0,0,0,.15)';ctx.beginPath();ctx.ellipse(refSx,refSy+h/2,12,4,0,0,Math.PI*2);ctx.fill();
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
    ctx.fillText(n.name,refSx,py-10);
    ctx.fillStyle=C.gray;ctx.font=`12px ${FONT}`;
    ctx.fillText('[E] Talk',refSx,py-24);
  }
  ctx.restore();
}

function drawNPCHearts(npc) {
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

// ── MOBILE QUICK-ACTION MENU ──────────────────────────────────────
// Grid of big tappable tiles for every action that has a desktop hotkey.
// Opened via the ☰ button top-right, closed by tapping outside or picking a tile.
const MOBILE_MENU_ACTIONS = [
  { icon:'🔨', label:'Craft',    key:'t' },
  { icon:'🌾', label:'Harvest',  key:'h' },
  { icon:'🍞', label:'Eat',      key:'g' },
  { icon:'🗺️', label:'Map',      key:'n' },
  { icon:'🏰', label:'Citadel',  key:'c' },
  { icon:'📊', label:'Sort',     key:'q' },
  { icon:'💾', label:'Save',     key:'p' },
  { icon:'❓', label:'Help',     key:'?' },
];

function mobileMenuLayout(){
  // Grid size adapts to screen width
  const cols=4, rows=2;
  const maxW=Math.min(canvas.width-40,440);
  const tileW=Math.floor((maxW-20)/cols);
  const tileH=tileW; // square tiles
  const gridW=cols*tileW+(cols-1)*6;
  const gridH=rows*tileH+(rows-1)*6;
  const x=(canvas.width-gridW)/2;
  const y=(canvas.height-gridH)/2-20;
  return {x,y,gridW,gridH,tileW,tileH,cols,rows};
}

function mobileMenuHitTest(cx,cy){
  const L=mobileMenuLayout();
  for(let i=0;i<MOBILE_MENU_ACTIONS.length;i++){
    const col=i%L.cols, row=Math.floor(i/L.cols);
    const tx=L.x+col*(L.tileW+6);
    const ty=L.y+row*(L.tileH+6);
    if(cx>=tx && cx<=tx+L.tileW && cy>=ty && cy<=ty+L.tileH){
      return MOBILE_MENU_ACTIONS[i];
    }
  }
  return null;
}

function drawMobileMenu(){
  if(!mobileMenuOpen)return;
  // Darken the world
  ctx.fillStyle='rgba(0,0,0,0.72)';
  ctx.fillRect(0,0,canvas.width,canvas.height);
  // Title
  ctx.fillStyle=C.hud;ctx.font=`bold 22px ${FONT}`;ctx.textAlign='center';
  const L=mobileMenuLayout();
  ctx.fillText('Quick Actions',canvas.width/2,L.y-24);
  ctx.fillStyle='#888';ctx.font=`12px ${FONT}`;
  ctx.fillText('Tap a tile • Tap outside to close',canvas.width/2,L.y-6);
  // Draw tiles
  for(let i=0;i<MOBILE_MENU_ACTIONS.length;i++){
    const a=MOBILE_MENU_ACTIONS[i];
    const col=i%L.cols, row=Math.floor(i/L.cols);
    const tx=L.x+col*(L.tileW+6);
    const ty=L.y+row*(L.tileH+6);
    // Tile background
    ctx.fillStyle='rgba(20,20,28,0.9)';
    ctx.fillRect(tx,ty,L.tileW,L.tileH);
    // Orange border
    ctx.strokeStyle=C.hud;ctx.lineWidth=2;
    ctx.strokeRect(tx,ty,L.tileW,L.tileH);
    // Corner accents
    ctx.fillStyle='rgba(247,147,26,0.6)';
    ctx.fillRect(tx,ty,6,6);
    ctx.fillRect(tx+L.tileW-6,ty,6,6);
    ctx.fillRect(tx,ty+L.tileH-6,6,6);
    ctx.fillRect(tx+L.tileW-6,ty+L.tileH-6,6,6);
    // Icon
    ctx.font=`${Math.floor(L.tileW*0.45)}px serif`;ctx.textAlign='center';ctx.fillStyle='#FFF';
    ctx.fillText(a.icon,tx+L.tileW/2,ty+L.tileH*0.55);
    // Label
    ctx.font=`bold 13px ${FONT}`;ctx.fillStyle=C.hud;
    ctx.fillText(a.label,tx+L.tileW/2,ty+L.tileH-10);
  }
  // Close hint
  ctx.fillStyle='#666';ctx.font=`11px ${FONT}`;
  ctx.fillText('(inventory menu is the 📦 button top-right)',canvas.width/2,L.y+L.gridH+20);
}

function drawTouchControls(){
  if(!isMobile)return;
  ctx.globalAlpha=0.55;

  // Anchor all touch UI to the hotbar so nothing overlaps it regardless of screen size
  const hb = _hotbarRect;
  const hbTop = (hb && hb.y) ? hb.y : canvas.height - 150;

  // Virtual joystick (left side) — rests tucked into the lower-left corner
  const jxRest = 70;
  const jyRest = hbTop - 60; // same Y as USE button for symmetry
  const jx=touch.joyActive?touch.joyStartX:jxRest, jy=touch.joyActive?touch.joyStartY:jyRest;
  // Outer ring
  ctx.strokeStyle='rgba(247,147,26,0.45)';ctx.lineWidth=2;
  ctx.beginPath();ctx.arc(jx,jy,JOYSTICK_RADIUS,0,Math.PI*2);ctx.stroke();
  // Inner thumb
  const thumbX=jx+(touch.joyActive?touch.joyDx*JOYSTICK_RADIUS*0.6:0);
  const thumbY=jy+(touch.joyActive?touch.joyDy*JOYSTICK_RADIUS*0.6:0);
  ctx.fillStyle='rgba(247,147,26,0.55)';
  ctx.beginPath();ctx.arc(thumbX,thumbY,22,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='rgba(255,200,100,0.7)';ctx.lineWidth=2;
  ctx.beginPath();ctx.arc(thumbX,thumbY,22,0,Math.PI*2);ctx.stroke();

  // Action buttons (right side) — anchored above the hotbar
  const bx = canvas.width - 70;
  const by = hbTop - 60;
  const inMine = !!mineFloor;

  // Main action button — big, center
  ctx.fillStyle=touch.btnAttack?'rgba(247,147,26,0.7)':'rgba(247,147,26,0.3)';
  ctx.beginPath();ctx.arc(bx,by,36,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='rgba(247,147,26,0.8)';ctx.lineWidth=2.5;
  ctx.beginPath();ctx.arc(bx,by,36,0,Math.PI*2);ctx.stroke();
  ctx.fillStyle='#FFF';ctx.font=`bold 14px ${FONT}`;ctx.textAlign='center';
  if (inMine) {
    ctx.font='22px serif';ctx.fillText('⚔️',bx,by+2);
    ctx.font=`bold 11px ${FONT}`;ctx.fillText('ATK',bx,by+20);
  } else {
    const sel = inv[selSlot];
    const icon = (sel && ITEMS[sel.id]) ? ITEMS[sel.id].icon : '✋';
    ctx.font='22px serif';ctx.fillText(icon,bx,by+4);
    ctx.font=`bold 11px ${FONT}`;ctx.fillText('USE',bx,by+22);
  }

  // Combat skill buttons — only shown when in a dungeon
  if (inMine) {
    ctx.fillStyle=touch.btnSkill1?'rgba(247,147,26,0.6)':'rgba(100,60,20,0.35)';
    ctx.beginPath();ctx.arc(bx-70,by+20,26,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#F90';ctx.font='16px serif';ctx.fillText('💊',bx-70,by+24);

    ctx.fillStyle=touch.btnSkill2?'rgba(255,221,68,0.6)':'rgba(100,100,30,0.35)';
    ctx.beginPath();ctx.arc(bx+10,by-70,26,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#FF0';ctx.font='16px serif';ctx.fillText('⚡',bx+10,by-66);

    ctx.fillStyle=touch.btnSkill3?'rgba(255,68,68,0.6)':'rgba(100,30,30,0.35)';
    ctx.beginPath();ctx.arc(bx+70,by+20,26,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#F44';ctx.font='16px serif';ctx.fillText('💥',bx+70,by+24);
  }
  
  // Top-right quick buttons
  // Pause
  ctx.fillStyle='rgba(80,80,80,0.4)';ctx.fillRect(canvas.width-55,8,45,35);
  ctx.strokeStyle='rgba(247,147,26,0.3)';ctx.lineWidth=1;ctx.strokeRect(canvas.width-55,8,45,35);
  ctx.fillStyle='#DDD';ctx.font=`bold 11px ${FONT}`;ctx.textAlign='center';ctx.fillText('⏸',canvas.width-32,28);
  // Inventory
  ctx.fillStyle='rgba(80,80,80,0.4)';ctx.fillRect(canvas.width-110,8,50,35);
  ctx.strokeStyle='rgba(247,147,26,0.3)';ctx.strokeRect(canvas.width-110,8,50,35);
  ctx.fillStyle='#DDD';ctx.fillText('📦',canvas.width-85,28);
  // Menu (hamburger) — quick access to craft/harvest/eat/map/etc
  ctx.fillStyle='rgba(247,147,26,0.5)';ctx.fillRect(canvas.width-170,8,50,35);
  ctx.strokeStyle='rgba(247,147,26,0.7)';ctx.lineWidth=1.5;ctx.strokeRect(canvas.width-170,8,50,35);
  // Hamburger icon
  ctx.fillStyle='#FFF';
  ctx.fillRect(canvas.width-160,17,30,3);
  ctx.fillRect(canvas.width-160,24,30,3);
  ctx.fillRect(canvas.width-160,31,30,3);
  
  // Interact hint (bottom center)
  if(!mineFloor){
    ctx.fillStyle='rgba(0,0,0,0.4)';ctx.fillRect(canvas.width/2-40,canvas.height-55,80,30);
    ctx.fillStyle=C.orange;ctx.font=`bold 12px ${FONT}`;ctx.textAlign='center';
    ctx.fillText('TAP: Interact',canvas.width/2,canvas.height-36);
  }
  
  ctx.globalAlpha=1;
}
// ---- PER-FRAME CACHE (avoid redundant performance.now/trig in render) ----
let _t=0,_now=0,_hour=0,_isNight=false;
let _seasonLeaf=null,_seasonLeafLight=null;
let _sinT=0,_cosT=0,_sinT2=0,_sinT15=0,_sinT08=0;

function draw(){
  // Reset render state at frame start (#67 globalAlpha leak, #68 shadowBlur leak)
  ctx.globalAlpha=1;ctx.shadowBlur=0;ctx.shadowColor='transparent';
  if(gameState==='intro'){drawIntro();ctx.globalAlpha=1;ctx.shadowBlur=0;return;}
  
  // Frame cache — compute once, use everywhere
  _now=performance.now();_t=_now/1000;_hour=getHour();_isNight=_hour<6||_hour>20;
  _sinT=Math.sin(_t);_cosT=Math.cos(_t);_sinT2=Math.sin(_t*2);_sinT15=Math.sin(_t*1.5);_sinT08=Math.sin(_t*0.8);
  _seasonLeaf=getSeasonalColor('treeLeaf')||C.treeLeaf;
  _seasonLeafLight=getSeasonalColor('treeLeafLight')||C.treeLeafLight;
  
  ctx.fillStyle='#0a0a0a';ctx.fillRect(0,0,canvas.width,canvas.height);
  
  // ---- MINE RENDERING ----
  if(mineFloor){
    drawMine();
    drawHUD();
    if(transition){const p=transition.timer/transition.duration;const a=transition.type==='fadeOut'?p:1-p;ctx.fillStyle='rgba(0,0,0,'+Math.min(1,a)+')';ctx.fillRect(0,0,canvas.width,canvas.height);}
    return;
  }
  
  // Overworld screen shake
  if(screenShake>0&&!mineFloor){
    cam.x+=(Math.random()-0.5)*screenShake*80;
    cam.y+=(Math.random()-0.5)*screenShake*80;
  }
  
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
      // Floor-level items draw on the ground layer (y=0) so entities walk over them
      const groundItems=new Set(['rug','stage_floor','town_seal','hall_carpet','chandelier']);
      const fy=groundItems.has(f.item)?0:f.y*TILE+TILE;
      entities.push({y:fy, draw:()=>drawDecor({type:'furniture',item:f.item,x:f.x,y:f.y})});
    }
    for(const r of rigs){ if(r.interior===interior.type) entities.push({y:r.y,draw:()=>drawRig(r)}); }
    // Interior NPCs
    for(const n of interiorNPCs) entities.push({y:n.y,draw:()=>drawInteriorNPC(n)});
  }
  entities.push({y:player.y,draw:drawPlayer});
  // Sort crops into entity Y-sort so they occlude/get occluded correctly (#B7)
  for(const crop of crops) entities.push({y:crop.y*TILE+TILE-4, draw:()=>drawCrop(crop)});
  // Insertion sort — optimal for nearly-sorted arrays (entities barely move frame to frame)
  for(let i=1;i<entities.length;i++){const key=entities[i];let j=i-1;while(j>=0&&entities[j].y>key.y){entities[j+1]=entities[j];j--;}entities[j+1]=key;}
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
  
  // Star field at night (drawn before night overlay so stars peek through)
  if(!interior&&_isNight&&dn.a>0.15){
    const starRng=rng32(42);
    for(let i=0;i<100;i++){
      const sx2=starRng()*canvas.width,sy2=starRng()*canvas.height*0.65;
      const brightness=0.2+starRng()*0.8;
      const twinkle=Math.sin(_t*(1+starRng()*3)+i*2.7)*0.3;
      ctx.globalAlpha=Math.max(0,(brightness+twinkle)*Math.min(1,dn.a*2.5));
      ctx.fillStyle=starRng()<0.08?'#FFE8C0':'#FFF';
      const sz=starRng()<0.08?2:1;
      ctx.fillRect(sx2,sy2,sz,sz);
    }
    ctx.globalAlpha=1;
  }
  
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
    } else if (p.type === 'snow') {
      ctx.fillStyle = 'rgba(255,255,255,' + (alpha * 0.7) + ')';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      // Subtle sparkle
      ctx.fillStyle = 'rgba(220,240,255,' + (alpha * 0.3) + ')';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 1.5, 0, Math.PI * 2); ctx.fill();
    } else if (p.type === 'sparkle') {
      // Gold sparkle with glow halo
      ctx.globalAlpha = alpha * 0.35;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 2.2, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = alpha;
      ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
      ctx.globalAlpha = 1;
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
    ctx.fillText('Stack: '+(e.stack?e.stack.split('\n')[1]:''),20,50);
    console.error('GAME ERROR:',e);
    return; // stop loop
  }
  requestAnimationFrame(gameLoop);
}
requestAnimationFrame(gameLoop);
