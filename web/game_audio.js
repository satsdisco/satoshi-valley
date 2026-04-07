// ============================================================
// SATOSHI VALLEY — AUDIO
// Extracted from game.js during Sprint 17 modularization
// Loaded as a classic script BEFORE game.js — shares global scope
// ============================================================

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
