// ============================================================
// SATOSHI VALLEY — WORLD RENDERING
// Extracted from game.js during Sprint 17 Phase 2 modularization
// drawTile, drawDecor, drawPlaced, drawFence, drawPlayer, drawAnimal,
// drawNPC, drawRig — all overworld rendering functions.
// Loaded as classic script BEFORE game.js (shares global scope).
// ============================================================

// ============================================================
// TILE DRAWING — Beautiful pixel art style
// ============================================================
// Deterministic pseudo-random (stable across frames) for placing props
function _svRand(x,y,salt){
  const s=Math.sin((x*374.1+y*291.7+salt*127.3))*43758.5453;
  return s-Math.floor(s);
}

// Draw warm/atmospheric surroundings for a building — paths, flowers, props,
// softer contact shadow. Called at the END of roof drawing so it layers on top
// of the ground beneath the building and just outside it.
function drawBuildingAmbience(d,rx,ry,rw,bh){
  const label=d.label||'';
  const baseY=ry+bh;        // ground contact line
  const cx=rx+rw/2;          // building center X
  // Multi-layer soft contact shadow (outer fade → inner dark)
  for(let i=0;i<3;i++){
    const t=i/2;
    ctx.fillStyle=`rgba(0,0,0,${0.08+(1-t)*0.12})`;
    ctx.beginPath();
    ctx.ellipse(cx,baseY+4+i*2,rw*(0.52+t*0.12),7+i*2.5,0,0,Math.PI*2);
    ctx.fill();
  }
  // Stone path leading from door outward (bottom). Seeded so stones are stable.
  const pathStones=Math.max(3,Math.floor(rw/18));
  for(let i=0;i<pathStones;i++){
    const sx2=cx-10+_svRand(d.x,d.y,i)*20;
    const sy2=baseY+10+i*9;
    const ssz=3+Math.floor(_svRand(d.x,d.y,i+7)*3);
    ctx.fillStyle='#7A6A58';
    ctx.beginPath();ctx.ellipse(sx2,sy2,ssz+1,ssz,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#9A8A70';
    ctx.beginPath();ctx.ellipse(sx2-0.5,sy2-0.5,ssz-0.5,ssz-1,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='rgba(0,0,0,0.25)';
    ctx.beginPath();ctx.ellipse(sx2+1,sy2+1.5,ssz,ssz*0.4,0,0,Math.PI*2);ctx.fill();
  }
  // Grass tufts around the base
  for(let i=0;i<8;i++){
    const side=i<4?-1:1;
    const gx=cx+side*(rw*0.4+2+_svRand(d.x,d.y,i+13)*18);
    const gy=baseY+2+_svRand(d.x,d.y,i+21)*6;
    ctx.fillStyle='#3A6028';
    ctx.fillRect(gx,gy,1,3);ctx.fillRect(gx+1,gy-1,1,4);ctx.fillRect(gx+2,gy,1,3);
    ctx.fillStyle='#558A30';
    ctx.fillRect(gx+1,gy-2,1,2);
  }
  // Flower clusters — building-type specific palette
  const flowerCount=label==='home'?6:label==='tavern'?3:label==='hall'?5:label==='shop'?3:1;
  const palettes={
    home:['#E04040','#F0C020','#E070A0','#FFFFFF'],
    tavern:['#C04040','#F08020','#883018'],
    hall:['#8040C0','#C0A0F0','#FFFFFF','#F0C020'],
    shop:['#F08020','#E04040','#FFFFFF'],
    shed:['#C0B020'],
  };
  const pal=palettes[label]||['#E04040','#F0C020'];
  for(let i=0;i<flowerCount;i++){
    const side=_svRand(d.x,d.y,i+31)<0.5?-1:1;
    const fx=cx+side*(rw*0.42+4+_svRand(d.x,d.y,i+41)*14);
    const fy=baseY+1+_svRand(d.x,d.y,i+51)*8;
    // stem
    ctx.fillStyle='#2A5018';ctx.fillRect(fx,fy-3,1,4);
    ctx.fillStyle='#3A7028';ctx.fillRect(fx-1,fy-1,1,2);ctx.fillRect(fx+1,fy-2,1,2);
    // petals
    const col=pal[Math.floor(_svRand(d.x,d.y,i+61)*pal.length)];
    ctx.fillStyle=col;
    ctx.fillRect(fx-1,fy-4,3,2);ctx.fillRect(fx,fy-5,1,1);
    // center dot
    ctx.fillStyle='#F8D040';ctx.fillRect(fx,fy-4,1,1);
  }
  // Per-building ambient prop on the unoccupied side
  if(label==='home'){
    // Stacked firewood pile — left side
    const wx=rx-14,wy=baseY-14;
    ctx.fillStyle='#5A3818';ctx.fillRect(wx,wy,14,12);
    ctx.fillStyle='#7A4828';
    for(let i=0;i<3;i++)for(let j=0;j<2;j++){
      ctx.fillRect(wx+1+i*5,wy+1+j*6,4,5);
      ctx.fillStyle='#D8B080';ctx.fillRect(wx+2+i*5,wy+2+j*6,2,2);
      ctx.fillStyle='#7A4828';
    }
    // shadow
    ctx.fillStyle='rgba(0,0,0,0.25)';
    ctx.beginPath();ctx.ellipse(wx+7,wy+14,10,3,0,0,Math.PI*2);ctx.fill();
  } else if(label==='shop'){
    // Crate + barrel on left
    const cxp=rx-18,cyp=baseY-14;
    // crate
    ctx.fillStyle='#6A4020';ctx.fillRect(cxp,cyp,12,12);
    ctx.fillStyle='#8A5830';ctx.fillRect(cxp+1,cyp+1,10,10);
    ctx.strokeStyle='#4A2810';ctx.lineWidth=1;
    ctx.strokeRect(cxp,cyp,12,12);
    ctx.beginPath();ctx.moveTo(cxp,cyp+6);ctx.lineTo(cxp+12,cyp+6);ctx.stroke();
    // barrel
    ctx.fillStyle='#5A3018';ctx.fillRect(cxp-13,cyp-2,11,14);
    ctx.fillStyle='#7A4020';ctx.fillRect(cxp-12,cyp-1,9,12);
    ctx.fillStyle='#888068';ctx.fillRect(cxp-13,cyp+1,11,2);ctx.fillRect(cxp-13,cyp+9,11,2);
    ctx.fillStyle='rgba(0,0,0,0.25)';
    ctx.beginPath();ctx.ellipse(cxp-3,cyp+14,20,3,0,0,Math.PI*2);ctx.fill();
  } else if(label==='tavern'){
    // Wooden stool + lantern post on right
    const stX=rx+rw+4,stY=baseY-10;
    ctx.fillStyle='#5A3018';ctx.fillRect(stX,stY,10,3); // seat
    ctx.fillStyle='#3A2010';ctx.fillRect(stX+1,stY+3,2,6);ctx.fillRect(stX+7,stY+3,2,6);
    // lantern post
    const lpX=stX+16,lpY=baseY-22;
    ctx.fillStyle='#4A3018';ctx.fillRect(lpX,lpY,2,20);
    ctx.fillStyle='#6A4828';ctx.fillRect(lpX-4,lpY-4,10,6);
    ctx.fillStyle='#F8B040';ctx.fillRect(lpX-3,lpY-3,8,4);
    if(typeof _isNight!=='undefined'&&_isNight){
      ctx.fillStyle='rgba(255,180,80,0.18)';
      ctx.beginPath();ctx.arc(lpX+1,lpY,14,0,Math.PI*2);ctx.fill();
    }
  } else if(label==='shed'){
    // Oil drum + tire
    const odX=rx+rw+4,odY=baseY-16;
    ctx.fillStyle='#3A3A38';ctx.fillRect(odX,odY,10,14);
    ctx.fillStyle='#4A4A48';ctx.fillRect(odX+1,odY+1,8,12);
    ctx.fillStyle='#C07010';ctx.fillRect(odX+1,odY+5,8,3); // orange stripe
    // tire
    ctx.fillStyle='#1A1A18';ctx.beginPath();ctx.arc(odX+16,odY+9,6,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#3A3A38';ctx.beginPath();ctx.arc(odX+16,odY+9,3,0,Math.PI*2);ctx.fill();
  } else if(label==='hall'){
    // Corner lamp posts flanking the path
    for(const side of [-1,1]){
      const lpX=cx+side*(rw*0.35)-1,lpY=baseY+4;
      ctx.fillStyle='#3A3A42';ctx.fillRect(lpX,lpY,2,22);
      ctx.fillStyle='#5A5A62';ctx.fillRect(lpX-3,lpY-2,8,5);
      ctx.fillStyle='#F8D060';ctx.fillRect(lpX-2,lpY-1,6,3);
      if(typeof _isNight!=='undefined'&&_isNight){
        ctx.fillStyle='rgba(255,220,100,0.15)';
        ctx.beginPath();ctx.arc(lpX+1,lpY,12,0,Math.PI*2);ctx.fill();
      }
    }
  }
}

// Tile neighbor helper for edge blending
function getTile(tx,ty){if(ty<0||ty>=MAP_H||tx<0||tx>=MAP_W)return T.CLIFF;return map[ty][tx];}
const TERRAIN_GRASS=new Set([T.GRASS,T.TALLGRASS,T.FLOWER,T.MUSHROOM]);
const TERRAIN_WATER_SET=new Set([T.WATER,T.DEEP]);

function drawTile(x,y,tile){
  const sx=x*ST-cam.x,sy=y*ST-cam.y;
  if(sx>canvas.width+ST||sy>canvas.height+ST||sx<-ST||sy<-ST)return;
  const v=(x*7+y*13)%3,t=_t;
  const v2=(x*11+y*3)%5;
  
  switch(tile){
    case T.GRASS:{
      // Use cached Perlin noise for smooth, organic color blending
      const gn=tileNoise1[y*MAP_W+x];
      const gn2=tileNoise2[y*MAP_W+x];
      // Seasonal color shift based on market phase
      const sR=[0,0,20,0][econ.phase]; // Euphoria adds warmth
      const sG=[0,10,-10,-20][econ.phase]; // Capitulation desaturates
      const sB=[0,0,0,10][econ.phase]; // Capitulation adds blue
      const baseR=Math.floor(30+gn*30+sR);const baseG=Math.floor(90+gn*50+gn2*20+sG);const baseB=Math.floor(15+gn*20+sB);
      ctx.fillStyle=`rgb(${Math.max(0,Math.min(255,baseR))},${Math.max(0,Math.min(255,baseG))},${Math.max(0,Math.min(255,baseB))})`;ctx.fillRect(sx,sy,ST,ST);
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
      // Same smooth Perlin base as regular grass (cached)
      const tgn=tileNoise1[y*MAP_W+x];
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
      const fgn=tileNoise1[y*MAP_W+x];
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
      const mgn=tileNoise1[y*MAP_W+x];
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
      const dn=tileNoise2[y*MAP_W+x];
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
      const stn=tileNoise1[y*MAP_W+x];
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
      const cln=tileNoise2[y*MAP_W+x];
      ctx.fillStyle=`rgb(${Math.floor(50+cln*15)},${Math.floor(50+cln*12)},${Math.floor(58+cln*15)})`;ctx.fillRect(sx,sy,ST,ST);
      // Horizontal strata layers
      ctx.fillStyle='rgba(35,35,42,0.3)';ctx.fillRect(sx,sy+ST*0.2,ST,3);ctx.fillRect(sx,sy+ST*0.55,ST,3);ctx.fillRect(sx,sy+ST*0.8,ST,2);
      // Lighter top edge (catching light)
      ctx.fillStyle='rgba(90,88,100,0.3)';ctx.fillRect(sx,sy,ST,4);
      // Shadow at base
      ctx.fillStyle='rgba(20,20,28,0.2)';ctx.fillRect(sx,sy+ST-5,ST,5);
      break;}
    case T.WATER:{
      // Smooth Perlin-based water — no checkerboard
      const wn=fbm(x*0.12+t*0.08,y*0.12+t*0.05,2);
      const wR=25+((wn*15)|0);const wG=80+((wn*30)|0);const wB=140+((wn*25)|0);
      ctx.fillStyle=`rgb(${wR},${wG},${wB})`;ctx.fillRect(sx,sy,ST,ST);
      // Cached trig — compute once per tile instead of ~12 Math.sin calls
      const wt=t*1.5+x*.5+y*.3;
      const sWt=Math.sin(wt);
      const sWt1=Math.sin(wt+1),cWt1=Math.cos(wt+1);
      const sWt2=Math.sin(wt+2),sWt13=Math.sin(wt*1.3),sWt_2=Math.sin(wt*2);
      // Animated shimmer layer
      ctx.fillStyle=`rgba(100,180,240,${0.06+sWt*0.04})`;ctx.fillRect(sx,sy,ST,ST);
      // Gentle caustic light patterns
      const cx1=sx+ST*0.3+Math.sin(wt*0.7+x)*6,cy1=sy+ST*0.4+Math.cos(wt*0.9+y)*5;
      const cx2=sx+ST*0.7+Math.sin(wt*0.5+x+2)*5,cy2=sy+ST*0.6+Math.cos(wt*0.8+y+1)*6;
      ctx.fillStyle=`rgba(150,210,255,${0.06+sWt13*0.03})`;
      ctx.beginPath();ctx.arc(cx1,cy1,6+sWt*2,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.arc(cx2,cy2,5+cWt1*2,0,Math.PI*2);ctx.fill();
      // Soft wave highlights
      ctx.strokeStyle=`rgba(160,210,255,${0.08+sWt1*0.04})`;ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(sx,sy+ST*0.35+sWt*3);ctx.quadraticCurveTo(sx+ST/2,sy+ST*0.3+sWt1*4,sx+ST,sy+ST*0.35+sWt2*3);ctx.stroke();
      // Shoreline foam where water meets land — early out if fully surrounded
      const wN=getTile(x,y-1),wS=getTile(x,y+1),wW=getTile(x-1,y),wE=getTile(x+1,y);
      const nW=TERRAIN_WATER_SET.has(wN),sW=TERRAIN_WATER_SET.has(wS),wW_=TERRAIN_WATER_SET.has(wW),eW=TERRAIN_WATER_SET.has(wE);
      if(!(nW&&sW&&wW_&&eW)){
        const foamA=0.3+sWt_2*0.12;
        const foamStr=`rgba(220,240,255,${foamA})`;
        const foamHi=`rgba(255,255,255,${foamA*0.5})`;
        if(!nW){
          ctx.fillStyle=foamStr;ctx.fillRect(sx,sy,ST,5+sWt*2);
          ctx.fillStyle=foamHi;ctx.fillRect(sx+4,sy,ST-8,2+sWt*1);
        }
        if(!sW){
          ctx.fillStyle=foamStr;ctx.fillRect(sx,sy+ST-5-sWt*2,ST,5+sWt*2);
          ctx.fillStyle=foamHi;ctx.fillRect(sx+4,sy+ST-2-sWt*1,ST-8,2);
        }
        if(!wW_){
          ctx.fillStyle=foamStr;ctx.fillRect(sx,sy,5+sWt1*2,ST);
          ctx.fillStyle=foamHi;ctx.fillRect(sx,sy+4,2+sWt1*1,ST-8);
        }
        if(!eW){
          ctx.fillStyle=foamStr;ctx.fillRect(sx+ST-5-sWt1*2,sy,5+sWt1*2,ST);
          ctx.fillStyle=foamHi;ctx.fillRect(sx+ST-2-sWt1*1,sy+4,2,ST-8);
        }
      }
      break;}
    case T.DEEP:{
      // Deep water — darker Perlin, subtle undercurrent
      const dwn=fbm(x*0.1+t*0.05,y*0.1+t*0.03,2);
      ctx.fillStyle=`rgb(${Math.floor(12+dwn*15)},${Math.floor(40+dwn*20)},${Math.floor(80+dwn*20)})`;ctx.fillRect(sx,sy,ST,ST);
      ctx.fillStyle=`rgba(20,60,120,${0.1+Math.sin(t*0.8+x+y)*0.06})`;ctx.fillRect(sx,sy,ST,ST);
      break;}
    case T.SAND:{
      const sn=tileNoise1[y*MAP_W+x];
      const sR=Math.floor(180+sn*20);const sG=Math.floor(155+sn*20);const sB=Math.floor(95+sn*15);
      ctx.fillStyle=`rgb(${sR},${sG},${sB})`;ctx.fillRect(sx,sy,ST,ST);
      // Subtle sand ripples
      if((x*13+y*7)%11<3){ctx.fillStyle='rgba(210,190,140,0.15)';ctx.fillRect(sx+4,sy+12,ST-8,2);ctx.fillRect(sx+8,sy+28,ST-16,2);}
      break;}
    case T.PATH:{
      // Smooth dirt path with subtle noise variation
      const pn=tileNoise2[y*MAP_W+x];
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
  const t = _t;
  
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
    // Back layer (darkest, largest) — seasonal colors (cached per frame)
    const sleaf=_seasonLeaf;
    const sleafL=_seasonLeafLight;
    ctx.fillStyle=sleaf[d.v%5];
    ctx.beginPath();ctx.ellipse(tcx+sway*0.5,tcy-2*sz,26*sz,20*sz,0,0,Math.PI*2);ctx.fill();
    // Mid layer clusters
    ctx.fillStyle=sleaf[(d.v+1)%5];
    ctx.beginPath();ctx.ellipse(tcx-10*sz+sway,tcy+4*sz,16*sz,14*sz,0,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.ellipse(tcx+10*sz+sway*0.8,tcy+2*sz,15*sz,13*sz,0,0,Math.PI*2);ctx.fill();
    // Front highlight layer (lightest, smaller)
    ctx.fillStyle=sleafL[d.v%3];
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
  else if(d.type==='lamp'){
    // Street lamp — warm glow at night
    const lampH=ST*1.2;
    ctx.fillStyle='#444';ctx.fillRect(sx+ST/2-2,sy+ST-lampH,4,lampH); // pole
    ctx.fillStyle='#555';ctx.fillRect(sx+ST/2-8,sy+ST-lampH-2,16,4); // arm
    ctx.fillStyle='#666';ctx.fillRect(sx+ST/2-6,sy+ST-lampH+2,12,6); // lamp housing
    // Light at night
    const isNight=_isNight;
    if(isNight){
      ctx.fillStyle='rgba(255,220,140,0.08)';ctx.beginPath();ctx.arc(sx+ST/2,sy+ST,40,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='rgba(255,230,160,0.15)';ctx.beginPath();ctx.arc(sx+ST/2,sy+ST,20,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#FFDD88';ctx.fillRect(sx+ST/2-4,sy+ST-lampH+4,8,4);
    } else {
      ctx.fillStyle='#AAA';ctx.fillRect(sx+ST/2-3,sy+ST-lampH+4,6,3);
    }
  }
  else if(d.type==='bench'){
    // Wooden park bench
    ctx.fillStyle='#5A3A1A';
    ctx.fillRect(sx+4,sy+ST/2+4,ST-8,4); // seat
    ctx.fillRect(sx+4,sy+ST/2+2,ST-8,3); // back
    ctx.fillRect(sx+6,sy+ST/2+6,4,10); // left leg
    ctx.fillRect(sx+ST-10,sy+ST/2+6,4,10); // right leg
    ctx.fillStyle='#7A5A30';
    ctx.fillRect(sx+6,sy+ST/2+4,ST-12,2); // seat highlight
  }
  else if(d.type==='well'){
    // Stone well
    ctx.fillStyle='#606068';ctx.fillRect(sx+4,sy+8,ST-8,ST-8); // base
    ctx.fillStyle='#707078';ctx.fillRect(sx+6,sy+10,ST-12,ST-12); // inner
    ctx.fillStyle='#2266AA';ctx.fillRect(sx+8,sy+14,ST-16,ST-18); // water
    // Roof
    ctx.fillStyle='#5A3A1A';ctx.fillRect(sx+2,sy+2,ST-4,8);
    ctx.fillStyle='#6A4A2A';ctx.fillRect(sx+ST/2-2,sy-6,4,10); // post
    ctx.fillStyle='#8A6A40';ctx.fillRect(sx,sy,ST,4); // roof top
    // Bucket
    ctx.fillStyle='#8A6A40';ctx.fillRect(sx+ST/2+4,sy+12,6,8);
  }
  else if(d.type==='market_stall'){
    // Market stall with displayed goods
    ctx.fillStyle='#7A5A30';ctx.fillRect(sx,sy+ST/2,ST,ST/2); // counter
    ctx.fillStyle='#8A6A40';ctx.fillRect(sx+2,sy+ST/2+2,ST-4,ST/2-4); // counter top
    // Striped awning
    for(let i=0;i<ST;i+=8){
      ctx.fillStyle=i%16<8?'#CC4444':'#EEEECC';
      ctx.fillRect(sx+i,sy+ST/2-8,8,10);
    }
    // Goods on counter
    if(d.goods){ctx.font='12px serif';ctx.textAlign='center';ctx.fillText(d.goods,sx+ST/2,sy+ST/2+ST/4+4);}
  }
  else if(d.type==='barrel'){
    ctx.fillStyle='#6A4A20';
    ctx.beginPath();ctx.ellipse(sx+ST/2,sy+ST/2+4,12,16,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#8A6A40';ctx.fillRect(sx+ST/2-10,sy+ST/2-4,20,3);ctx.fillRect(sx+ST/2-10,sy+ST/2+8,20,3);
    ctx.fillStyle='#5A3A10';ctx.fillRect(sx+ST/2-1,sy+ST/2-12,2,24);
  }
  else if(d.type==='notice_board'){
    // Village notice board
    ctx.fillStyle='#5A3A1A';ctx.fillRect(sx+ST/2-2,sy+ST/2,4,ST/2); // post
    ctx.fillStyle='#7A5A30';ctx.fillRect(sx+2,sy+2,ST-4,ST/2); // board
    ctx.fillStyle='#8A6A40';ctx.fillRect(sx+4,sy+4,ST-8,ST/2-4); // board face
    // Pinned notices
    ctx.fillStyle='#EEEECC';ctx.fillRect(sx+8,sy+8,12,10); // notice 1
    ctx.fillStyle='#EEDDBB';ctx.fillRect(sx+24,sy+6,12,12); // notice 2
    ctx.fillStyle='#FF4444';ctx.fillRect(sx+12,sy+7,3,3); // pin 1
    ctx.fillStyle='#4444FF';ctx.fillRect(sx+28,sy+5,3,3); // pin 2
    // ₿ on a notice
    ctx.fillStyle=C.orange;ctx.font='8px serif';ctx.textAlign='center';ctx.fillText('₿',sx+14,sy+16);
  }
  else if(d.type==='planter'){
    // Flower planter box
    ctx.fillStyle='#6A4A2A';ctx.fillRect(sx+4,sy+ST/2,ST-8,ST/2-2); // box
    ctx.fillStyle='#5A3A1A';ctx.fillRect(sx+4,sy+ST/2,ST-8,4); // rim
    // Flowers
    ctx.fillStyle='#3A7020';ctx.fillRect(sx+10,sy+ST/2-8,2,10);ctx.fillRect(sx+20,sy+ST/2-10,2,12);ctx.fillRect(sx+30,sy+ST/2-6,2,8);
    const flowerColors=['#FF6688','#FFCC44','#8888FF'];
    flowerColors.forEach((c,i)=>{ctx.fillStyle=c;ctx.beginPath();ctx.arc(sx+11+i*10,sy+ST/2-10+i*2,4,0,Math.PI*2);ctx.fill();});
  }
  else if(d.type==='btc_flag'){
    // Bitcoin flag on pole
    const flagWave=Math.sin(t*2+d.x)*3;
    ctx.fillStyle='#666';ctx.fillRect(sx+ST/2-1,sy-ST,3,ST*2); // pole
    ctx.fillStyle='#888';ctx.fillRect(sx+ST/2-3,sy-ST-2,7,4); // finial
    // Flag
    ctx.fillStyle=C.orange;
    ctx.beginPath();ctx.moveTo(sx+ST/2+2,sy-ST+4);ctx.lineTo(sx+ST/2+24+flagWave,sy-ST+10);ctx.lineTo(sx+ST/2+22+flagWave,sy-ST+22);ctx.lineTo(sx+ST/2+2,sy-ST+18);ctx.closePath();ctx.fill();
    // ₿ on flag
    ctx.fillStyle='#FFF';ctx.font='bold 10px serif';ctx.textAlign='center';ctx.fillText('₿',sx+ST/2+13+flagWave/2,sy-ST+15);
  }
  else if(d.type==='woodpile'){
    // Stack of logs
    ctx.fillStyle='#6A4A2A';
    for(let i=0;i<4;i++){ctx.beginPath();ctx.ellipse(sx+8+i*8,sy+ST-6,6,4,0,0,Math.PI*2);ctx.fill();}
    for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(sx+12+i*8,sy+ST-14,6,4,0,0,Math.PI*2);ctx.fill();}
    for(let i=0;i<2;i++){ctx.beginPath();ctx.ellipse(sx+16+i*8,sy+ST-22,6,4,0,0,Math.PI*2);ctx.fill();}
    // Log ends (lighter circles)
    ctx.fillStyle='#AA8855';
    for(let i=0;i<4;i++){ctx.beginPath();ctx.arc(sx+8+i*8,sy+ST-6,3,0,Math.PI*2);ctx.fill();}
  }
  else if(d.type==='hay_bale'){
    ctx.fillStyle='#CCAA44';ctx.fillRect(sx+4,sy+ST/2-2,ST-8,ST/2+2);
    ctx.fillStyle='#DDBB55';ctx.fillRect(sx+6,sy+ST/2,ST-12,ST/2-2);
    // Straw texture
    ctx.fillStyle='rgba(200,170,60,0.4)';
    for(let i=0;i<5;i++)ctx.fillRect(sx+6+i*7,sy+ST/2+2,1,ST/2-6);
    // Binding
    ctx.fillStyle='#886622';ctx.fillRect(sx+4,sy+ST/2+8,ST-8,3);
  }
  else if(d.type==='mine_entrance'){
    // Dark cave opening in the mountainside
    ctx.fillStyle='#1A1A20';ctx.fillRect(sx+4,sy+8,ST-8,ST-8); // dark opening
    ctx.fillStyle='#303038';ctx.fillRect(sx+2,sy+6,ST-4,4); // top arch
    ctx.fillStyle='#404048';
    ctx.fillRect(sx+2,sy+6,4,ST-6); // left pillar
    ctx.fillRect(sx+ST-6,sy+6,4,ST-6); // right pillar
    // Support beams
    ctx.fillStyle='#5A3A1A';ctx.fillRect(sx+4,sy+6,ST-8,3); // top beam
    ctx.fillRect(sx+5,sy+8,3,ST-10); ctx.fillRect(sx+ST-8,sy+8,3,ST-10);
    // Lantern
    ctx.fillStyle='#FFAA33';ctx.fillRect(sx+ST/2-2,sy+10,4,4);
    ctx.fillStyle=`rgba(255,170,50,${0.15+Math.sin(t*3)*0.05})`;
    ctx.beginPath();ctx.arc(sx+ST/2,sy+12,12,0,Math.PI*2);ctx.fill();
    // Enter prompt
    const pd=Math.hypot(d.x*TILE+8-player.x,d.y*TILE+8-player.y);
    if(pd<TILE*3&&!interior&&!mineFloor){
      ctx.fillStyle=C.orange;ctx.font=`bold 13px ${FONT}`;ctx.textAlign='center';
      ctx.fillText('[E] Enter the Mines',sx+ST/2,sy-4);
    }
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
      // Wooden bed frame
      ctx.fillStyle='#5A3A18';ctx.fillRect(fx+2,fy+4,ST-4,ST-6);
      // Headboard (darker, taller)
      ctx.fillStyle='#4A2A10';ctx.fillRect(fx+2,fy+2,ST-4,8);
      ctx.fillStyle='#3A1A08';ctx.fillRect(fx+4,fy+4,ST-8,4); // headboard detail
      // Mattress
      ctx.fillStyle='#DDDDEE';ctx.fillRect(fx+4,fy+10,ST-8,ST-18);
      // Cozy blanket (blue with pattern)
      ctx.fillStyle='#6070B0';ctx.fillRect(fx+4,fy+16,ST-8,ST-26);
      ctx.fillStyle='#5060A0';ctx.fillRect(fx+6,fy+18,ST-12,ST-30); // blanket fold
      // Orange ₿ on blanket
      ctx.fillStyle='#F7931A';ctx.font='bold 10px '+FONT;ctx.textAlign='center';
      ctx.fillText('₿',fx+ST/2,fy+ST-12);
      // Pillow (white, plump)
      ctx.fillStyle='#EEEEFF';ctx.beginPath();ctx.ellipse(fx+ST/2,fy+12,ST/2-6,5,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#DDDDEE';ctx.beginPath();ctx.ellipse(fx+ST/2,fy+12,ST/2-8,3,0,0,Math.PI*2);ctx.fill();
      // Sleep prompt when nearby and nighttime
      if(interior&&interior.type==='home'){
        const bdist=Math.hypot(d.x*TILE+8-player.x,d.y*TILE+8-player.y);
        const hr=getHour();
        if(bdist<TILE*3){
          ctx.fillStyle=(hr>=18||hr<6)?C.gold:'#888';
          ctx.font=`bold 11px ${FONT}`;ctx.textAlign='center';
          ctx.fillText((hr>=18||hr<6)?'[E] Sleep 💤':'Not tired yet',fx+ST/2,fy-4);
        }
      }
    }
    else if(d.item==='fireplace'){
      ctx.fillStyle='#555';ctx.fillRect(fx+6,fy+4,ST-12,ST-6); // stone surround
      ctx.fillStyle='#333';ctx.fillRect(fx+10,fy+10,ST-20,ST-14); // opening
      const ft=_now/200;
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
      // ── FARMER'S MARKET STALL — proper wooden structure w/ produce ──
      const stallIdx=(d.x*3+d.y*7)%4;
      const palettes=[
        {stripe1:'#C83838',stripe2:'#F0E4C8',sign:'#8A1010'}, // red/cream
        {stripe1:'#E8801C',stripe2:'#F0E4C8',sign:'#A04810'}, // orange/cream
        {stripe1:'#3A9030',stripe2:'#F0E4C8',sign:'#205818'}, // green/cream
        {stripe1:'#2868B0',stripe2:'#F0E4C8',sign:'#103858'}, // blue/cream
      ];
      const P=palettes[stallIdx];
      const woodD='#4A2810', wood='#7A4820', woodL='#9A6028', woodXL='#B87838';

      // Ground shadow
      ctx.fillStyle='rgba(0,0,0,0.28)';
      ctx.beginPath();
      ctx.ellipse(fx+ST/2,fy+ST+2,ST*0.48,4,0,0,Math.PI*2);
      ctx.fill();

      // ── Back posts (thin, behind the counter)
      ctx.fillStyle=woodD;
      ctx.fillRect(fx+3,fy-2,2,ST+4);
      ctx.fillRect(fx+ST-5,fy-2,2,ST+4);

      // ── Counter front frame (dark wood)
      ctx.fillStyle=woodD;
      ctx.fillRect(fx+2,fy+16,ST-4,ST-18);
      // Front planks
      ctx.fillStyle=wood;
      ctx.fillRect(fx+3,fy+17,ST-6,ST-20);
      // Vertical plank separators
      ctx.fillStyle=woodD;
      for(let pk=1;pk<4;pk++){
        ctx.fillRect(fx+3+pk*((ST-6)/4),fy+17,1,ST-20);
      }
      // Top plank highlight
      ctx.fillStyle=woodL;
      ctx.fillRect(fx+3,fy+17,ST-6,1);
      // Bottom shadow
      ctx.fillStyle='rgba(0,0,0,0.3)';
      ctx.fillRect(fx+3,fy+ST-4,ST-6,1);

      // ── Counter top (planked surface where produce sits)
      ctx.fillStyle=woodD;
      ctx.fillRect(fx+1,fy+14,ST-2,4);
      ctx.fillStyle=woodXL;
      ctx.fillRect(fx+1,fy+14,ST-2,1);
      ctx.fillStyle=woodL;
      ctx.fillRect(fx+1,fy+15,ST-2,2);

      // ── Cloth skirt hanging from counter (tablecloth)
      ctx.fillStyle=P.stripe1;
      ctx.fillRect(fx+2,fy+ST-3,ST-4,3);
      // Scalloped fringe on the skirt
      ctx.fillStyle=P.stripe2;
      for(let fi=0;fi<Math.ceil((ST-4)/4);fi++){
        ctx.beginPath();
        ctx.arc(fx+4+fi*4,fy+ST,1.5,0,Math.PI);
        ctx.fill();
      }

      // ── PRODUCE on the counter — varies per stall
      const pxC=fx+ST/2, pyC=fy+11;
      if(stallIdx===0){
        // APPLES — pile of red circles
        ctx.fillStyle='#902020';
        for(let ap=0;ap<5;ap++){
          const apX=fx+5+ap*5, apY=pyC+1;
          ctx.beginPath();ctx.arc(apX,apY,2.5,0,Math.PI*2);ctx.fill();
        }
        // Highlight on each apple
        ctx.fillStyle='#E04040';
        for(let ap=0;ap<5;ap++){
          const apX=fx+5+ap*5, apY=pyC+1;
          ctx.beginPath();ctx.arc(apX-0.5,apY-0.5,1,0,Math.PI*2);ctx.fill();
        }
        // Top apple
        ctx.fillStyle='#902020';
        ctx.beginPath();ctx.arc(fx+12,pyC-2,2.5,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#E04040';
        ctx.beginPath();ctx.arc(fx+11.5,pyC-2.5,1,0,Math.PI*2);ctx.fill();
        // Apple stems (dark)
        ctx.fillStyle='#4A2810';
        for(let ap=0;ap<5;ap++)ctx.fillRect(fx+5+ap*5,pyC-1,1,1);
      }
      else if(stallIdx===1){
        // CARROTS — orange triangles with green tops, standing up
        for(let ct=0;ct<5;ct++){
          const ctX=fx+5+ct*5;
          // Green top
          ctx.fillStyle='#2A6020';
          ctx.fillRect(ctX-1,pyC-3,1,2);
          ctx.fillRect(ctX,pyC-4,1,3);
          ctx.fillRect(ctX+1,pyC-3,1,2);
          // Orange body (carrot triangle)
          ctx.fillStyle='#E07018';
          ctx.beginPath();
          ctx.moveTo(ctX-1,pyC-1);ctx.lineTo(ctX+2,pyC-1);ctx.lineTo(ctX+0.5,pyC+3);
          ctx.closePath();ctx.fill();
          ctx.fillStyle='#F09028';
          ctx.fillRect(ctX-1,pyC-1,1,1);
        }
        // Wicker basket lines underneath
        ctx.fillStyle='#6A4020';
        ctx.fillRect(fx+3,pyC+2,ST-6,2);
        ctx.fillStyle='#8A5028';
        ctx.fillRect(fx+3,pyC+2,ST-6,1);
      }
      else if(stallIdx===2){
        // CABBAGES / lettuces — layered green circles
        for(let cb=0;cb<3;cb++){
          const cbX=fx+8+cb*8, cbY=pyC+1;
          ctx.fillStyle='#2A6020';
          ctx.beginPath();ctx.arc(cbX,cbY,3.5,0,Math.PI*2);ctx.fill();
          ctx.fillStyle='#3A8028';
          ctx.beginPath();ctx.arc(cbX,cbY,2.5,0,Math.PI*2);ctx.fill();
          ctx.fillStyle='#4AA038';
          ctx.beginPath();ctx.arc(cbX-0.5,cbY-0.5,1.5,0,Math.PI*2);ctx.fill();
          // Leaf crinkle lines
          ctx.fillStyle='rgba(0,0,0,0.25)';
          ctx.fillRect(cbX-2,cbY,4,1);
          ctx.fillRect(cbX,cbY-2,1,4);
        }
      }
      else{
        // BREAD + CHEESE
        // Loaf of bread (left)
        ctx.fillStyle='#8A5820';
        ctx.beginPath();
        ctx.ellipse(fx+8,pyC+1,5,2.5,0,0,Math.PI*2);
        ctx.fill();
        ctx.fillStyle='#B87838';
        ctx.beginPath();
        ctx.ellipse(fx+8,pyC,5,2,0,0,Math.PI*2);
        ctx.fill();
        // Crust slashes
        ctx.fillStyle='#6A4018';
        ctx.fillRect(fx+6,pyC-1,1,2);
        ctx.fillRect(fx+8,pyC-1,1,2);
        ctx.fillRect(fx+10,pyC-1,1,2);
        // Cheese wheel (center)
        ctx.fillStyle='#B88018';
        ctx.beginPath();
        ctx.ellipse(fx+18,pyC+1,4,3,0,0,Math.PI*2);
        ctx.fill();
        ctx.fillStyle='#E8B830';
        ctx.beginPath();
        ctx.ellipse(fx+18,pyC,4,2,0,0,Math.PI*2);
        ctx.fill();
        // Wedge cut out
        ctx.fillStyle='#F0C840';
        ctx.beginPath();
        ctx.moveTo(fx+18,pyC);
        ctx.lineTo(fx+22,pyC);
        ctx.lineTo(fx+20,pyC+2);
        ctx.closePath();ctx.fill();
        // Jar (right)
        ctx.fillStyle='#9AC0D8';
        ctx.fillRect(fx+25,pyC-2,4,6);
        ctx.fillStyle='#C8E0F0';
        ctx.fillRect(fx+25,pyC-2,1,6);
        // Jar lid
        ctx.fillStyle='#D03030';
        ctx.fillRect(fx+24,pyC-3,6,1);
      }

      // ── Striped awning (scalloped fabric draped between posts)
      const awY=fy+4, awH=8;
      ctx.fillStyle=P.stripe1;
      ctx.fillRect(fx+1,awY,ST-2,awH);
      // Stripes
      const stripeW=3;
      for(let si=0;si<Math.ceil((ST-2)/stripeW);si++){
        ctx.fillStyle=si%2===0?P.stripe1:P.stripe2;
        ctx.fillRect(fx+1+si*stripeW,awY,stripeW,awH);
      }
      // Top highlight
      ctx.fillStyle='rgba(255,255,255,0.25)';
      ctx.fillRect(fx+1,awY,ST-2,1);
      // Support beam (dark wood across the top of the awning)
      ctx.fillStyle=woodD;
      ctx.fillRect(fx+1,awY-2,ST-2,2);
      ctx.fillStyle=woodL;
      ctx.fillRect(fx+1,awY-2,ST-2,1);
      // Scalloped fringe along the bottom of the awning
      ctx.fillStyle=P.sign;
      for(let fi=0;fi<Math.ceil((ST-2)/4);fi++){
        ctx.beginPath();
        ctx.arc(fx+3+fi*4,awY+awH,2,0,Math.PI);
        ctx.fill();
      }
      // Little pennants hanging below the fringe
      for(let pn=0;pn<3;pn++){
        ctx.fillStyle=['#E04020','#F0C020','#2870C0'][pn];
        const pnX=fx+6+pn*10;
        ctx.beginPath();
        ctx.moveTo(pnX,awY+awH+2);
        ctx.lineTo(pnX+3,awY+awH+2);
        ctx.lineTo(pnX+1.5,awY+awH+5);
        ctx.closePath();ctx.fill();
      }

      // ── Chalkboard price sign hanging off the front
      const cbX=fx+ST-8, cbY=fy+18;
      ctx.fillStyle='#3A2A10';
      ctx.fillRect(cbX-1,cbY-1,8,7);
      ctx.fillStyle='#1A1A14';
      ctx.fillRect(cbX,cbY,6,5);
      ctx.fillStyle='#E8D8A0';
      ctx.fillRect(cbX+1,cbY+1,4,1);
      ctx.fillRect(cbX+1,cbY+3,3,1);
      // "Price" marks (dashes)
      ctx.fillStyle='#C08030';
      ctx.fillRect(cbX+3,cbY+1,1,1);

      // ── Hanging paper lantern from middle of awning
      const lnX=fx+ST/2, lnY=awY+awH+3;
      ctx.strokeStyle='#2A1808';ctx.lineWidth=1;
      ctx.beginPath();
      ctx.moveTo(lnX,awY+awH);ctx.lineTo(lnX,lnY);
      ctx.stroke();
      ctx.fillStyle='#E08030';
      ctx.beginPath();
      ctx.ellipse(lnX,lnY+2,2,2.5,0,0,Math.PI*2);
      ctx.fill();
      ctx.fillStyle='#F0C040';
      ctx.beginPath();
      ctx.ellipse(lnX-0.5,lnY+1.5,1,1.5,0,0,Math.PI*2);
      ctx.fill();
      // Lantern glow at night
      if(typeof _isNight!=='undefined'&&_isNight){
        ctx.fillStyle='rgba(255,180,80,0.2)';
        ctx.beginPath();ctx.arc(lnX,lnY+2,8,0,Math.PI*2);ctx.fill();
      }
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
    const hr = _hour;
    const isNight = _isNight;
    const winGlow = isNight ? 'rgba(255,210,100,0.45)' : 'rgba(200,225,255,0.28)';
    const winGlowAmber = isNight ? 'rgba(255,180,60,0.55)' : 'rgba(220,185,100,0.3)';
    // Ground shadow under building
    ctx.fillStyle='rgba(0,0,0,0.18)';
    ctx.beginPath();ctx.ellipse(rx+rw/2,ry+bh+4,rw*0.48,6,0,0,Math.PI*2);ctx.fill();

    // ── HOME (Uncle Toshi's Legendary Log Cabin) ────────────────────────
    if(d.label==='home'){
      const HMPAL={
        log:'#7A4A28', logL:'#A06838', logXL:'#C88848', logD:'#4A2810', logXD:'#2A1608',
        logEnd:'#6A3818', logEndL:'#B07840',
        stone:'#6A5E50', stoneL:'#8A7E70', stoneXL:'#A8A094', stoneD:'#3A3228', stoneXD:'#1A1410',
        shake:'#6A3018', shakeL:'#8A4020', shakeXL:'#AA5028', shakeD:'#3A1808',
        iron:'#2A2218', ironL:'#4A4238', ironXL:'#6A6258',
        brass:'#C8A030', brassL:'#F0C848',
        shutter:'#2A6030', shutterL:'#3A8038',
        fire:'rgba(255,150,40,0.75)',
        amberWin:'rgba(255,200,120,0.85)',
      };
      const wallTop=ry+ST;
      const wallBot=ry+bh-14;
      const wallH=wallBot-wallTop;

      // ── 1. STACKED FIELDSTONE FOUNDATION ─────────────────────────────
      const fndY=wallBot, fndH=14;
      ctx.fillStyle=HMPAL.stoneXD;
      ctx.fillRect(rx-4,fndY,rw+8,fndH);
      // Irregular stones
      for(let row=0;row<2;row++){
        const offset=row%2===0?0:7;
        for(let col=0;col<Math.ceil((rw+8)/14)+1;col++){
          const bx=rx-4+col*14+offset;
          if(bx>rx+rw+4)continue;
          const r=_svRand(d.x,d.y,row*11+col+300);
          const shade=r>0.66?HMPAL.stoneL:r>0.33?HMPAL.stone:HMPAL.stoneXL;
          ctx.fillStyle=shade;
          // Slightly irregular stone shapes
          ctx.fillRect(bx,fndY+row*7,12+Math.floor(r*2),6);
          ctx.fillStyle=HMPAL.stoneXD;
          ctx.fillRect(bx+12+Math.floor(r*2),fndY+row*7,1,6);
          // Highlight on top of each stone
          ctx.fillStyle='rgba(255,255,255,0.12)';
          ctx.fillRect(bx,fndY+row*7,12,1);
        }
      }
      ctx.fillStyle='rgba(0,0,0,0.35)';
      ctx.fillRect(rx-4,fndY+6,rw+8,1);
      ctx.fillRect(rx-4,fndY+13,rw+8,1);

      // ── 2. HAND-HEWN LOG WALLS (horizontal logs w/ notched corners) ──
      // Background
      ctx.fillStyle=HMPAL.logD;
      ctx.fillRect(rx,wallTop,rw,wallH);
      // Individual logs (stacked horizontally, ~9px each)
      const logH=9;
      const logCount=Math.ceil(wallH/logH);
      for(let i=0;i<logCount;i++){
        const ly=wallTop+i*logH;
        // Log body (rounded top curve simulated w/ highlight)
        ctx.fillStyle=HMPAL.log;
        ctx.fillRect(rx,ly,rw,logH-1);
        // Top highlight (catches the light on the round log surface)
        ctx.fillStyle=HMPAL.logL;
        ctx.fillRect(rx,ly,rw,2);
        ctx.fillStyle=HMPAL.logXL;
        ctx.fillRect(rx,ly,rw,1);
        // Bottom shadow (where the log meets the one below)
        ctx.fillStyle='rgba(0,0,0,0.4)';
        ctx.fillRect(rx,ly+logH-2,rw,2);
        // Darker mortar line between logs
        ctx.fillStyle=HMPAL.logXD;
        ctx.fillRect(rx,ly+logH-1,rw,1);
        // Wood grain — subtle horizontal streaks
        if(i%2===0){
          ctx.fillStyle='rgba(0,0,0,0.12)';
          ctx.fillRect(rx+rw*0.1,ly+3,rw*0.2,1);
          ctx.fillRect(rx+rw*0.45,ly+4,rw*0.15,1);
          ctx.fillRect(rx+rw*0.75,ly+3,rw*0.18,1);
        }
        // Occasional knot
        if(i%3===1){
          ctx.fillStyle=HMPAL.logXD;
          ctx.beginPath();
          ctx.ellipse(rx+rw*(0.2+(i*0.13)%0.7),ly+4,2,1.5,0,0,Math.PI*2);
          ctx.fill();
          ctx.fillStyle='rgba(0,0,0,0.3)';
          ctx.beginPath();
          ctx.ellipse(rx+rw*(0.2+(i*0.13)%0.7),ly+4.5,1,0.5,0,0,Math.PI*2);
          ctx.fill();
        }
      }

      // ── 3. NOTCHED CORNER LOG ENDS (classic log-cabin overlap) ───────
      // Each log end sticks out past the wall showing the round cut end
      for(let i=0;i<logCount;i++){
        const ly=wallTop+i*logH;
        const isEvenLog=i%2===0;
        // Log ends stick out ~5px past each corner
        // Left side
        ctx.fillStyle=HMPAL.logEnd;
        ctx.fillRect(rx-5,ly,6,logH-1);
        ctx.fillStyle=HMPAL.logEndL;
        ctx.fillRect(rx-5,ly,6,2);
        ctx.fillStyle='rgba(0,0,0,0.4)';
        ctx.fillRect(rx-5,ly+logH-2,6,2);
        // Round cut rings at the very tip
        if(isEvenLog){
          ctx.fillStyle=HMPAL.logEndL;
          ctx.beginPath();
          ctx.ellipse(rx-4,ly+logH/2-1,2,2.5,0,0,Math.PI*2);
          ctx.fill();
          ctx.fillStyle=HMPAL.logD;
          ctx.beginPath();
          ctx.ellipse(rx-4,ly+logH/2-1,1,1.5,0,0,Math.PI*2);
          ctx.fill();
          ctx.fillStyle=HMPAL.logEnd;
          ctx.fillRect(rx-4,ly+logH/2-2,1,1);
        }
        // Right side
        ctx.fillStyle=HMPAL.logEnd;
        ctx.fillRect(rx+rw-1,ly,6,logH-1);
        ctx.fillStyle=HMPAL.logEndL;
        ctx.fillRect(rx+rw-1,ly,6,2);
        ctx.fillStyle='rgba(0,0,0,0.4)';
        ctx.fillRect(rx+rw-1,ly+logH-2,6,2);
        if(isEvenLog){
          ctx.fillStyle=HMPAL.logEndL;
          ctx.beginPath();
          ctx.ellipse(rx+rw+3,ly+logH/2-1,2,2.5,0,0,Math.PI*2);
          ctx.fill();
          ctx.fillStyle=HMPAL.logD;
          ctx.beginPath();
          ctx.ellipse(rx+rw+3,ly+logH/2-1,1,1.5,0,0,Math.PI*2);
          ctx.fill();
          ctx.fillStyle=HMPAL.logEnd;
          ctx.fillRect(rx+rw+3,ly+logH/2-2,1,1);
        }
      }

      // ── 4. WINDOWS (2, w/ shutters + flower boxes + divided lights) ──
      const ww=ST-6, wh=ST-12;
      const wy=wallTop+8;
      const wx1=rx+rw*0.2-ww/2;
      const wx2=rx+rw*0.8-ww/2;

      function drawToshiWindow(wx, showCat){
        // Deep frame (recessed look)
        ctx.fillStyle=HMPAL.logXD;
        ctx.fillRect(wx-3,wy-3,ww+6,wh+6);
        ctx.fillStyle=HMPAL.logD;
        ctx.fillRect(wx-2,wy-2,ww+4,wh+4);
        ctx.fillStyle=HMPAL.logL;
        ctx.fillRect(wx-2,wy-2,ww+4,1);
        // Warm interior glow
        const flicker=0.88+Math.sin(t*2.5+wx)*0.08;
        ctx.fillStyle=`rgba(255,200,120,${flicker})`;
        ctx.fillRect(wx,wy,ww,wh);
        // Gradient for depth
        const wg=ctx.createLinearGradient(wx,wy,wx,wy+wh);
        wg.addColorStop(0,'rgba(120,80,30,0.4)');
        wg.addColorStop(0.5,'rgba(255,180,70,0)');
        wg.addColorStop(1,'rgba(100,60,20,0.35)');
        ctx.fillStyle=wg;ctx.fillRect(wx,wy,ww,wh);
        // 4-pane divided light (cross mullions)
        ctx.fillStyle=HMPAL.logXD;
        ctx.fillRect(wx+ww/2-1,wy,2,wh);
        ctx.fillRect(wx,wy+wh/2-1,ww,2);
        // Extra thin mullions (4 panes = 2x2)
        ctx.fillStyle=HMPAL.logD;
        ctx.fillRect(wx+ww/4-0.5,wy,1,wh);
        ctx.fillRect(wx+ww*0.75-0.5,wy,1,wh);
        // Glass glare
        ctx.fillStyle='rgba(255,255,255,0.16)';
        ctx.fillRect(wx+1,wy+1,ww*0.35,wh*0.35);
        // Cat silhouette in one window (uncle toshi had a cat!)
        if(showCat){
          const ctxF=wx+ww*0.35, ctyF=wy+wh*0.75;
          ctx.fillStyle='rgba(20,10,5,0.75)';
          // Cat body
          ctx.beginPath();
          ctx.ellipse(ctxF,ctyF,5,3,0,0,Math.PI*2);
          ctx.fill();
          // Head
          ctx.beginPath();
          ctx.arc(ctxF+4,ctyF-1,2,0,Math.PI*2);
          ctx.fill();
          // Ears
          ctx.beginPath();
          ctx.moveTo(ctxF+3,ctyF-3);ctx.lineTo(ctxF+4,ctyF-4);ctx.lineTo(ctxF+3.5,ctyF-2);
          ctx.closePath();ctx.fill();
          ctx.beginPath();
          ctx.moveTo(ctxF+5,ctyF-3);ctx.lineTo(ctxF+6,ctyF-4);ctx.lineTo(ctxF+4.5,ctyF-2);
          ctx.closePath();ctx.fill();
          // Tail curled up
          ctx.fillRect(ctxF-5,ctyF-2,1,1);
          ctx.fillRect(ctxF-5,ctyF-3,1,1);
          ctx.fillRect(ctxF-4,ctyF-4,1,1);
        }
        // Sill — protruding wooden shelf
        ctx.fillStyle=HMPAL.logXD;
        ctx.fillRect(wx-4,wy+wh+1,ww+8,3);
        ctx.fillStyle=HMPAL.log;
        ctx.fillRect(wx-4,wy+wh+1,ww+8,1);
        ctx.fillStyle='rgba(0,0,0,0.35)';
        ctx.fillRect(wx-4,wy+wh+4,ww+8,1);
        // Flower box
        ctx.fillStyle='#5A3018';
        ctx.fillRect(wx-3,wy+wh+4,ww+6,6);
        ctx.fillStyle='#7A4828';
        ctx.fillRect(wx-3,wy+wh+4,ww+6,1);
        ctx.fillStyle=HMPAL.logXD;
        ctx.fillRect(wx-3,wy+wh+9,ww+6,1);
        // Soil
        ctx.fillStyle='#2A5018';
        ctx.fillRect(wx-2,wy+wh+5,ww+4,3);
        // Flowers — varied
        const flCols=['#E03030','#F0C020','#E84080','#FFFFFF'];
        for(let fi=0;fi<6;fi++){
          // Stem
          ctx.fillStyle='#2A5018';
          ctx.fillRect(wx-1+fi*((ww+2)/6),wy+wh+3,1,3);
          // Bloom
          ctx.fillStyle=flCols[(fi+Math.floor(wx))%flCols.length];
          ctx.fillRect(wx-2+fi*((ww+2)/6),wy+wh+2,3,2);
          ctx.fillStyle='rgba(255,255,255,0.4)';
          ctx.fillRect(wx-1+fi*((ww+2)/6),wy+wh+2,1,1);
        }
        // Trailing vines
        ctx.fillStyle='#3A7028';
        ctx.fillRect(wx-3,wy+wh+10,1,3);
        ctx.fillRect(wx+ww+2,wy+wh+10,1,2);

        // ── Wooden shutters flanking (open, painted green)
        const shW=5, shH=wh+4;
        // Left shutter
        ctx.fillStyle=HMPAL.logXD;
        ctx.fillRect(wx-9,wy-2,shW,shH);
        ctx.fillStyle=HMPAL.shutter;
        ctx.fillRect(wx-8,wy-2,shW-1,shH);
        ctx.fillStyle=HMPAL.shutterL;
        ctx.fillRect(wx-8,wy-2,1,shH);
        // Shutter slats (horizontal louvers)
        ctx.fillStyle='rgba(0,0,0,0.3)';
        for(let sl=0;sl<6;sl++)ctx.fillRect(wx-8,wy+1+sl*((shH-2)/6),shW-1,1);
        // Cut-out heart/star in middle of each shutter
        ctx.fillStyle='rgba(255,200,100,0.4)';
        ctx.fillRect(wx-6,wy+wh/2-1,1,2);
        ctx.fillRect(wx-7,wy+wh/2,3,1);

        // Right shutter (mirrored)
        ctx.fillStyle=HMPAL.logXD;
        ctx.fillRect(wx+ww+4,wy-2,shW,shH);
        ctx.fillStyle=HMPAL.shutter;
        ctx.fillRect(wx+ww+4,wy-2,shW-1,shH);
        ctx.fillStyle=HMPAL.shutterL;
        ctx.fillRect(wx+ww+4,wy-2,1,shH);
        ctx.fillStyle='rgba(0,0,0,0.3)';
        for(let sl=0;sl<6;sl++)ctx.fillRect(wx+ww+4,wy+1+sl*((shH-2)/6),shW-1,1);
        ctx.fillStyle='rgba(255,200,100,0.4)';
        ctx.fillRect(wx+ww+6,wy+wh/2-1,1,2);
        ctx.fillRect(wx+ww+5,wy+wh/2,3,1);

        // Iron hinges
        ctx.fillStyle=HMPAL.iron;
        ctx.fillRect(wx-9,wy,3,1);ctx.fillRect(wx-9,wy+wh-1,3,1);
        ctx.fillRect(wx+ww+6,wy,3,1);ctx.fillRect(wx+ww+6,wy+wh-1,3,1);

        // Night glow pool
        if(isNight){
          const pulse=0.25+Math.sin(_t*1.5+wx)*0.08;
          ctx.fillStyle=`rgba(255,190,80,${pulse*0.4})`;
          ctx.beginPath();ctx.ellipse(wx+ww/2,wallBot+12,ww*1.6,14,0,0,Math.PI*2);ctx.fill();
          ctx.fillStyle=`rgba(255,220,120,${pulse*0.3})`;
          ctx.beginPath();ctx.ellipse(wx+ww/2,wallBot+10,ww,10,0,0,Math.PI*2);ctx.fill();
        }
      }

      drawToshiWindow(wx1, true);  // left window has the cat
      drawToshiWindow(wx2, false);

      // ── 5. COVERED FRONT PORCH ───────────────────────────────────────
      const porchTop=wallBot-ST*0.3;
      const porchFloorY=wallBot+4;
      const porchW=rw*0.55, porchX=rx+rw/2-porchW/2;
      // Porch floor (planks extending out)
      ctx.fillStyle=HMPAL.logXD;
      ctx.fillRect(porchX-2,porchFloorY,porchW+4,6);
      ctx.fillStyle=HMPAL.log;
      ctx.fillRect(porchX-2,porchFloorY,porchW+4,3);
      // Plank seams
      ctx.fillStyle=HMPAL.logD;
      for(let pl=0;pl<5;pl++){
        ctx.fillRect(porchX-2+pl*((porchW+4)/5),porchFloorY,1,5);
      }
      ctx.fillStyle='rgba(0,0,0,0.3)';
      ctx.fillRect(porchX-2,porchFloorY+5,porchW+4,1);

      // ── 6. MASSIVE DUTCH DOOR w/ iron hardware ───────────────────────
      const doorW=ST+2, doorH=ST+14;
      const doorX=rx+rw/2-doorW/2, doorY=wallBot-doorH;
      // Deep door frame
      ctx.fillStyle=HMPAL.logXD;
      ctx.fillRect(doorX-4,doorY-3,doorW+8,doorH+3);
      ctx.fillStyle=HMPAL.log;
      ctx.fillRect(doorX-3,doorY-2,doorW+6,doorH+2);
      ctx.fillStyle=HMPAL.logL;
      ctx.fillRect(doorX-3,doorY-2,doorW+6,1);
      // Door body
      ctx.fillStyle=HMPAL.logD;
      ctx.fillRect(doorX,doorY,doorW,doorH);
      // Vertical planks (5 planks)
      ctx.fillStyle='#5A3018';
      for(let pk=0;pk<5;pk++){
        ctx.fillRect(doorX+1+pk*((doorW-2)/5),doorY+1,((doorW-2)/5)-1,doorH-2);
      }
      // Plank highlights
      ctx.fillStyle='#7A4820';
      for(let pk=0;pk<5;pk++){
        ctx.fillRect(doorX+1+pk*((doorW-2)/5),doorY+1,1,doorH-2);
      }
      // Horizontal dutch-door split (top half/bottom half divide)
      const splitY=doorY+doorH*0.5;
      ctx.fillStyle=HMPAL.logXD;
      ctx.fillRect(doorX,splitY-1,doorW,3);
      ctx.fillStyle=HMPAL.logL;
      ctx.fillRect(doorX,splitY-1,doorW,1);
      // Iron cross-bands (top + bottom)
      for(const bandY of [doorY+4,doorY+doorH-8]){
        ctx.fillStyle=HMPAL.iron;
        ctx.fillRect(doorX-1,bandY,doorW+2,3);
        ctx.fillStyle=HMPAL.ironL;
        ctx.fillRect(doorX-1,bandY,doorW+2,1);
        // Rivets
        ctx.fillStyle=HMPAL.ironXL;
        for(let rv=0;rv<5;rv++){
          ctx.fillRect(doorX+2+rv*((doorW-4)/4),bandY+1,1,1);
        }
      }
      // Decorative iron strap hinges (fancy curled ends)
      for(const hgY of [doorY+4,splitY+4,doorY+doorH-8]){
        ctx.fillStyle=HMPAL.iron;
        ctx.fillRect(doorX-2,hgY-1,4,5);
        ctx.beginPath();
        ctx.arc(doorX-3,hgY+1,2,0,Math.PI*2);
        ctx.fill();
      }
      // Big iron ring handle (bottom half)
      const hdX=doorX+doorW-6, hdY=doorY+doorH*0.72;
      ctx.fillStyle=HMPAL.iron;
      ctx.fillRect(hdX-2,hdY-1,4,3);
      ctx.strokeStyle=HMPAL.ironXL;ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(hdX,hdY+4,3,0,Math.PI*2);ctx.stroke();
      // ₿ coin nailed to the middle (Uncle Toshi's signature)
      const coinX=doorX+doorW/2, coinY=doorY+doorH*0.3;
      ctx.fillStyle=HMPAL.brass;
      ctx.beginPath();ctx.arc(coinX,coinY,5,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=HMPAL.brassL;
      ctx.beginPath();ctx.arc(coinX,coinY,4,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#A08018';
      ctx.font='bold 7px '+FONT;ctx.textAlign='center';
      ctx.fillText('₿',coinX,coinY+3);
      // Tiny shadow on coin
      ctx.fillStyle='rgba(0,0,0,0.25)';
      ctx.fillRect(coinX+3,coinY-1,1,3);

      // ── 7. CARVED WOODEN "TOSHI'S" PLAQUE above the door ─────────────
      const plqW=56, plqH=14;
      const plqX=doorX+doorW/2-plqW/2, plqY=doorY-18;
      ctx.fillStyle=HMPAL.logXD;
      ctx.fillRect(plqX-1,plqY-1,plqW+2,plqH+2);
      // Plank body
      ctx.fillStyle=HMPAL.log;
      ctx.fillRect(plqX,plqY,plqW,plqH);
      ctx.fillStyle=HMPAL.logL;
      ctx.fillRect(plqX,plqY,plqW,1);
      ctx.fillStyle=HMPAL.logD;
      ctx.fillRect(plqX,plqY+plqH-1,plqW,1);
      // Rope hanging points
      ctx.strokeStyle=HMPAL.logXD;ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(plqX+4,plqY);ctx.lineTo(plqX+2,plqY-4);ctx.stroke();
      ctx.beginPath();ctx.moveTo(plqX+plqW-4,plqY);ctx.lineTo(plqX+plqW-2,plqY-4);ctx.stroke();
      // Carved text — "TOSHI'S" with burn-in effect
      ctx.fillStyle='rgba(20,10,0,0.85)';
      ctx.font='bold 9px '+FONT;ctx.textAlign='center';
      ctx.fillText("TOSHI'S",plqX+plqW/2,plqY+10);
      // Subtle glow highlight
      ctx.fillStyle='rgba(255,200,100,0.15)';
      ctx.fillText("TOSHI'S",plqX+plqW/2,plqY+9);
      // Tiny ₿ symbol carved on each end
      ctx.fillStyle='rgba(20,10,0,0.7)';
      ctx.font='bold 7px '+FONT;
      ctx.fillText('₿',plqX+6,plqY+10);
      ctx.fillText('₿',plqX+plqW-6,plqY+10);

      // ── 8. WELCOME MAT ───────────────────────────────────────────────
      ctx.fillStyle='#5A2818';
      ctx.fillRect(doorX-4,porchFloorY+6,doorW+8,5);
      ctx.fillStyle='#8A4828';
      ctx.fillRect(doorX-4,porchFloorY+6,doorW+8,1);
      // Woven pattern
      ctx.fillStyle='rgba(255,180,80,0.3)';
      for(let i=0;i<4;i++){ctx.fillRect(doorX-2+i*7,porchFloorY+7,5,3);}

      // ── 9. OLD ROCKING CHAIR on the porch (right side) ───────────────
      const rcX=rx+rw-18, rcY=wallBot-14;
      // Rockers (curved bottom)
      ctx.strokeStyle=HMPAL.logD;ctx.lineWidth=2;
      ctx.beginPath();
      ctx.moveTo(rcX-4,rcY+14);
      ctx.quadraticCurveTo(rcX+2,rcY+18,rcX+10,rcY+14);
      ctx.stroke();
      // Legs
      ctx.fillStyle=HMPAL.logD;
      ctx.fillRect(rcX-1,rcY+10,2,5);
      ctx.fillRect(rcX+7,rcY+10,2,5);
      // Seat
      ctx.fillStyle=HMPAL.log;
      ctx.fillRect(rcX-3,rcY+9,12,3);
      ctx.fillStyle=HMPAL.logL;
      ctx.fillRect(rcX-3,rcY+9,12,1);
      // Back (angled)
      ctx.fillStyle=HMPAL.logD;
      ctx.fillRect(rcX-2,rcY,2,10);
      ctx.fillRect(rcX+1,rcY-1,2,11);
      ctx.fillRect(rcX+4,rcY-2,2,12);
      ctx.fillStyle=HMPAL.log;
      ctx.fillRect(rcX-2,rcY,1,10);
      ctx.fillRect(rcX+1,rcY-1,1,11);
      ctx.fillRect(rcX+4,rcY-2,1,12);
      // Top bar
      ctx.fillStyle=HMPAL.logD;
      ctx.fillRect(rcX-3,rcY-3,10,2);
      // Folded blanket on seat
      ctx.fillStyle='#903020';
      ctx.fillRect(rcX,rcY+7,7,3);
      ctx.fillStyle='#B84030';
      ctx.fillRect(rcX,rcY+7,7,1);

      // ── 10. LANTERN POST on left of door (with warm glow) ────────────
      const lpX=doorX-14, lpY=doorY+doorH*0.3;
      // Post
      ctx.fillStyle=HMPAL.logD;
      ctx.fillRect(lpX,lpY,3,doorH*0.7);
      ctx.fillStyle=HMPAL.log;
      ctx.fillRect(lpX,lpY,1,doorH*0.7);
      // Crossbar
      ctx.fillStyle=HMPAL.logD;
      ctx.fillRect(lpX-3,lpY,9,2);
      // Hanging lantern
      const lnX=lpX+5, lnY=lpY+3;
      ctx.fillStyle=HMPAL.iron;
      ctx.fillRect(lnX-1,lnY-1,1,3); // chain
      ctx.fillStyle=HMPAL.iron;
      ctx.fillRect(lnX-3,lnY+2,7,2); // top cap
      // Glass body with warm light
      const lanPulse=0.9+Math.sin(t*3)*0.08;
      ctx.fillStyle=`rgba(255,200,90,${lanPulse})`;
      ctx.fillRect(lnX-2,lnY+4,5,7);
      // Iron frame bars
      ctx.fillStyle=HMPAL.iron;
      ctx.fillRect(lnX-2,lnY+4,1,7);ctx.fillRect(lnX+2,lnY+4,1,7);
      ctx.fillRect(lnX-2,lnY+7,5,1);
      // Bottom
      ctx.fillStyle=HMPAL.iron;
      ctx.fillRect(lnX-3,lnY+11,7,2);
      // Flame
      ctx.fillStyle='#FFE088';
      ctx.fillRect(lnX,lnY+6,1,3);
      // Night halo
      if(isNight){
        const lanGrad=ctx.createRadialGradient(lnX,lnY+7,2,lnX,lnY+7,24);
        lanGrad.addColorStop(0,'rgba(255,200,90,0.3)');
        lanGrad.addColorStop(1,'rgba(255,200,90,0)');
        ctx.fillStyle=lanGrad;
        ctx.beginPath();ctx.arc(lnX,lnY+7,24,0,Math.PI*2);ctx.fill();
      }

      // ── 11. OLD MINING PICKAXE leaning by the door (Uncle Toshi lore) ─
      const pkX=doorX+doorW+8, pkY=wallBot-4;
      // Handle (leaning)
      ctx.save();
      ctx.translate(pkX,pkY);
      ctx.rotate(-0.4);
      ctx.fillStyle='#5A3018';
      ctx.fillRect(-1,-20,2,20);
      ctx.fillStyle='#8A4820';
      ctx.fillRect(0,-20,1,20);
      // Head
      ctx.fillStyle=HMPAL.ironL;
      ctx.fillRect(-5,-22,10,3);
      ctx.fillStyle=HMPAL.iron;
      ctx.fillRect(-5,-21,10,2);
      ctx.fillStyle=HMPAL.ironXL;
      ctx.fillRect(-5,-22,10,1);
      // Point tip
      ctx.fillStyle=HMPAL.iron;
      ctx.fillRect(5,-21,3,1);
      ctx.restore();

      // ── 12. FIREWOOD STACK (left of cabin) ───────────────────────────
      const fwX=rx-18, fwY=wallBot-16;
      ctx.fillStyle=HMPAL.logXD;
      ctx.fillRect(fwX-1,fwY-1,18,18);
      // Stacked logs (3 rows of 3 logs each, end-on view)
      for(let fr=0;fr<3;fr++){
        for(let fc=0;fc<3;fc++){
          const flX=fwX+fc*5, flY=fwY+fr*5;
          ctx.fillStyle=HMPAL.logEnd;
          ctx.beginPath();ctx.arc(flX+2,flY+2,2.5,0,Math.PI*2);ctx.fill();
          ctx.fillStyle=HMPAL.logEndL;
          ctx.beginPath();ctx.arc(flX+2,flY+2,2,0,Math.PI*2);ctx.fill();
          // Ring in the center
          ctx.fillStyle=HMPAL.logD;
          ctx.beginPath();ctx.arc(flX+2,flY+2,1,0,Math.PI*2);ctx.fill();
        }
      }
      // Shadow under the stack
      ctx.fillStyle='rgba(0,0,0,0.3)';
      ctx.beginPath();ctx.ellipse(fwX+8,fwY+18,12,3,0,0,Math.PI*2);ctx.fill();

      // ── 13. MASSIVE STACKED FIELDSTONE CHIMNEY (right side, imposing) ─
      const chW=18, chH=wallH+ST*1.2;
      const chX=rx+rw-chW-4, chY=ry-ST*1.2;
      // Chimney base (wider at bottom)
      ctx.fillStyle=HMPAL.stoneXD;
      ctx.fillRect(chX-3,chY+chH-10,chW+6,14);
      ctx.fillStyle=HMPAL.stoneXD;
      ctx.fillRect(chX,chY,chW,chH);
      // Stacked fieldstones
      for(let cr=0;cr<Math.ceil(chH/8);cr++){
        const crY=chY+cr*8;
        const offs=cr%2*6;
        for(let cc=0;cc<3;cc++){
          const ccX=chX+cc*7+offs;
          if(ccX>=chX+chW-1)continue;
          const rnd=_svRand(d.x,d.y,cr*11+cc+777);
          const shade=rnd>0.66?HMPAL.stoneXL:rnd>0.33?HMPAL.stoneL:HMPAL.stone;
          ctx.fillStyle=shade;
          ctx.fillRect(ccX,crY,6+Math.floor(rnd*2),7);
          // Stone edge shadow
          ctx.fillStyle=HMPAL.stoneXD;
          ctx.fillRect(ccX+6+Math.floor(rnd*2),crY,1,7);
          // Highlight
          ctx.fillStyle='rgba(255,255,255,0.12)';
          ctx.fillRect(ccX,crY,6,1);
        }
        // Mortar line
        ctx.fillStyle='rgba(0,0,0,0.35)';
        ctx.fillRect(chX,crY+7,chW,1);
      }
      // Chimney cap (flared corbel)
      ctx.fillStyle=HMPAL.stoneXD;
      ctx.fillRect(chX-3,chY-4,chW+6,5);
      ctx.fillStyle=HMPAL.stoneL;
      ctx.fillRect(chX-3,chY-4,chW+6,2);
      ctx.fillStyle=HMPAL.stoneD;
      ctx.fillRect(chX-3,chY+1,chW+6,1);
      // Inner flue opening (dark hole)
      ctx.fillStyle='#0A0604';
      ctx.fillRect(chX+chW/2-3,chY-2,6,3);
      // Ember glow
      ctx.fillStyle='rgba(255,100,30,0.35)';
      ctx.fillRect(chX+chW/2-3,chY-3,6,1);

      // Thick layered smoke (Uncle Toshi keeps a good fire going)
      for(let sp=0;sp<5;sp++){
        const sa=0.4-sp*0.06+Math.sin(t*1.8+sp)*0.08;
        const smX=chX+chW/2+Math.sin(t*0.9+sp*1.3)*(3+sp);
        const smY=chY-6-sp*9-((t*8+sp*3)%8);
        ctx.fillStyle=`rgba(200,200,200,${sa})`;
        ctx.beginPath();ctx.arc(smX,smY,4+sp*1.2,0,Math.PI*2);ctx.fill();
        ctx.fillStyle=`rgba(240,240,245,${sa*0.5})`;
        ctx.beginPath();ctx.arc(smX-1,smY-1,3+sp*0.7,0,Math.PI*2);ctx.fill();
      }
      // Occasional embers floating up with the smoke (at night)
      if(isNight){
        for(let em=0;em<3;em++){
          const emPhase=(t*1.2+em*1.8)%3;
          const emX=chX+chW/2+Math.sin(t+em)*3;
          const emY=chY-4-emPhase*20;
          const emA=1-emPhase/3;
          ctx.fillStyle=`rgba(255,160,60,${emA*0.8})`;
          ctx.fillRect(emX,emY,1,1);
        }
      }

      // ── 14. STEEP CEDAR SHAKE ROOF w/ individual shingles ────────────
      const roofPeakY=ry-ST*0.9;
      const roofEaveY=wallTop;
      const roofOver=12;
      // Base fill (dark shadow)
      ctx.fillStyle=HMPAL.shakeD;
      ctx.beginPath();
      ctx.moveTo(rx-roofOver,roofEaveY+4);
      ctx.lineTo(rx+rw/2,roofPeakY);
      ctx.lineTo(rx+rw+roofOver,roofEaveY+4);
      ctx.closePath();ctx.fill();

      // LEFT slope shakes
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(rx-roofOver-2,roofEaveY+4);
      ctx.lineTo(rx+rw/2,roofPeakY);
      ctx.lineTo(rx+rw/2,roofEaveY+4);
      ctx.closePath();
      ctx.clip();
      const shakeH=5;
      for(let row=0;row<12;row++){
        const rowY=roofPeakY+row*shakeH;
        const shadeBase=row%2===0?HMPAL.shakeL:HMPAL.shake;
        // Draw individual shakes
        for(let col=0;col<Math.ceil((rw/2+roofOver)/7);col++){
          const shkR=_svRand(d.x,d.y,row*17+col+13);
          const shkX=rx+rw/2-col*7-(row%2)*3-7;
          ctx.fillStyle=shkR>0.5?shadeBase:(row%2===0?HMPAL.shakeXL:HMPAL.shakeL);
          ctx.fillRect(shkX,rowY,7,shakeH+1);
          // Bottom shadow edge
          ctx.fillStyle='rgba(0,0,0,0.35)';
          ctx.fillRect(shkX,rowY+shakeH,7,1);
          // Vertical gap between shakes
          ctx.fillStyle=HMPAL.shakeD;
          ctx.fillRect(shkX+6,rowY,1,shakeH);
        }
      }
      ctx.restore();

      // RIGHT slope shakes (slightly darker — sun comes from left)
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(rx+rw/2,roofPeakY);
      ctx.lineTo(rx+rw+roofOver+2,roofEaveY+4);
      ctx.lineTo(rx+rw/2,roofEaveY+4);
      ctx.closePath();
      ctx.clip();
      for(let row=0;row<12;row++){
        const rowY=roofPeakY+row*shakeH;
        const shadeBase=row%2===0?HMPAL.shake:HMPAL.shakeD;
        for(let col=0;col<Math.ceil((rw/2+roofOver)/7);col++){
          const shkR=_svRand(d.x,d.y,row*19+col+27);
          const shkX=rx+rw/2+col*7+(row%2)*3;
          ctx.fillStyle=shkR>0.5?shadeBase:HMPAL.shake;
          ctx.fillRect(shkX,rowY,7,shakeH+1);
          ctx.fillStyle='rgba(0,0,0,0.45)';
          ctx.fillRect(shkX,rowY+shakeH,7,1);
          ctx.fillStyle=HMPAL.shakeD;
          ctx.fillRect(shkX+6,rowY,1,shakeH);
        }
      }
      ctx.restore();

      // Ridge cap (darker bundled shakes along the peak)
      ctx.fillStyle=HMPAL.shakeD;
      ctx.fillRect(rx-roofOver-2,roofPeakY-2,rw+roofOver*2+4,4);
      ctx.fillStyle='#2A1208';
      for(let i=0;i<Math.ceil((rw+roofOver*2)/4);i++){
        ctx.fillRect(rx-roofOver+i*4,roofPeakY,1,1);
      }

      // Eave fascia board
      ctx.fillStyle=HMPAL.logXD;
      ctx.fillRect(rx-roofOver-2,roofEaveY+4,rw+roofOver*2+4,3);
      ctx.fillStyle=HMPAL.log;
      ctx.fillRect(rx-roofOver-2,roofEaveY+4,rw+roofOver*2+4,1);
      // Eave shadow
      ctx.fillStyle='rgba(0,0,0,0.3)';
      ctx.fillRect(rx-roofOver-2,roofEaveY+7,rw+roofOver*2+4,3);

      // ── 15. GABLE WINDOW (small loft window) ─────────────────────────
      const gvW=12, gvH=10;
      const gvX=rx+rw/2-gvW/2;
      const gvY=roofPeakY+(roofEaveY-roofPeakY)*0.4;
      ctx.fillStyle=HMPAL.logXD;
      ctx.fillRect(gvX-2,gvY-2,gvW+4,gvH+4);
      ctx.fillStyle=HMPAL.logD;
      ctx.fillRect(gvX-1,gvY-1,gvW+2,gvH+2);
      // Warm glow
      const gvFlick=0.85+Math.sin(t*3.5)*0.1;
      ctx.fillStyle=`rgba(255,200,100,${gvFlick})`;
      ctx.fillRect(gvX,gvY,gvW,gvH);
      // Cross mullion
      ctx.fillStyle=HMPAL.logXD;
      ctx.fillRect(gvX+gvW/2-0.5,gvY,1,gvH);
      ctx.fillRect(gvX,gvY+gvH/2-0.5,gvW,1);
      // Glare
      ctx.fillStyle='rgba(255,255,255,0.18)';
      ctx.fillRect(gvX+1,gvY+1,gvW*0.4,gvH*0.4);

      // ── 16. WEATHERVANE on the peak (spinning ₿ arrow) ───────────────
      const wvX=rx+rw/2, wvY=roofPeakY-10;
      ctx.fillStyle=HMPAL.iron;
      ctx.fillRect(wvX-0.5,wvY,1,10);
      // Cardinal bar
      ctx.fillRect(wvX-3,wvY+3,7,1);
      // N/S letters
      ctx.fillStyle=HMPAL.ironXL;
      ctx.fillRect(wvX-4,wvY+2,1,1);
      ctx.fillRect(wvX+4,wvY+2,1,1);
      // Finial ball
      ctx.fillStyle=HMPAL.brass;
      ctx.beginPath();ctx.arc(wvX,wvY-1,2,0,Math.PI*2);ctx.fill();
      // Rotating arrow (₿ shape)
      const wvAng=Math.sin(t*0.5)*0.5;
      ctx.save();
      ctx.translate(wvX,wvY-5);
      ctx.rotate(wvAng);
      ctx.fillStyle='#C85018';
      // Arrow body (pointer)
      ctx.beginPath();
      ctx.moveTo(-6,0);ctx.lineTo(4,-1);ctx.lineTo(4,-3);ctx.lineTo(8,0);ctx.lineTo(4,3);ctx.lineTo(4,1);
      ctx.closePath();ctx.fill();
      ctx.fillStyle=HMPAL.brassL;
      ctx.fillRect(-6,-0.5,14,0.5);
      ctx.restore();

      // ── 17. FIREFLIES at night around the cabin ──────────────────────
      if(isNight){
        for(let ff=0;ff<6;ff++){
          const ffPhase=t*0.6+ff*1.1;
          const ffX=rx+rw*0.5+Math.sin(ffPhase*1.3+ff)*rw*0.6;
          const ffY=wallBot-Math.abs(Math.sin(ffPhase*0.8+ff*1.7))*wallH*0.8;
          const ffBlink=Math.sin(t*4+ff*2)>0;
          if(ffBlink){
            ctx.fillStyle='rgba(180,255,120,0.95)';
            ctx.fillRect(ffX,ffY,1,1);
            ctx.fillStyle='rgba(180,255,120,0.3)';
            ctx.beginPath();ctx.arc(ffX,ffY,2,0,Math.PI*2);ctx.fill();
          }
        }
      }
    }

    // ── SHOP (Ruby's Hardware) ────────────────────────────────────────────
    else if(d.label==='shop'){
      // Palette
      const PAL={
        wall:'#6A3F18', wallL:'#8A5428', wallD:'#4A2A10', wallXD:'#2E1808',
        stone:'#6A645A', stoneL:'#8A847A', stoneD:'#3E3A32',
        trim:'#D87020', trimD:'#9A4810', trimL:'#F09840',
        roof:'#A8502A', roofL:'#C86838', roofD:'#6A2810', roofXD:'#3A1808',
        metal:'#707068', metalL:'#9A9A92', metalD:'#3A3A38',
        warmGlow:'rgba(255,200,90,0.85)', warmGlowD:'rgba(255,170,60,0.55)',
      };
      const wallTop=ry+ST;          // where wall meets roof eave
      const wallBot=ry+bh-12;       // where wall meets foundation
      const wallH=wallBot-wallTop;

      // ── 1. STONE FOUNDATION SKIRT (textured bricks w/ mortar) ────────
      const skirtY=wallBot, skirtH=12;
      ctx.fillStyle=PAL.stoneD;ctx.fillRect(rx-4,skirtY,rw+8,skirtH);
      // Stone blocks with slight tonal variation
      for(let row=0;row<2;row++){
        const offset=row%2===0?0:10;
        for(let col=0;col<Math.ceil((rw+8)/20)+1;col++){
          const bx=rx-4+col*20+offset;
          if(bx>rx+rw+4)continue;
          const shade=_svRand(d.x,d.y,row*7+col)>0.5?PAL.stone:PAL.stoneL;
          ctx.fillStyle=shade;
          ctx.fillRect(bx,skirtY+row*6,18,5);
        }
      }
      // Mortar shadows
      ctx.fillStyle='rgba(0,0,0,0.3)';
      ctx.fillRect(rx-4,skirtY+5,rw+8,1);
      ctx.fillRect(rx-4,skirtY+11,rw+8,1);

      // ── 2. MAIN WALL — clapboard siding (horizontal planks w/ shadows) ─
      ctx.fillStyle=PAL.wall;ctx.fillRect(rx,wallTop,rw,wallH);
      // Individual clapboards — each with a darker shadow under it
      const plankH=7;
      for(let i=0;i<Math.ceil(wallH/plankH);i++){
        const py=wallTop+i*plankH;
        // Light top of plank
        ctx.fillStyle=PAL.wallL;
        ctx.fillRect(rx,py,rw,2);
        // Shadow below plank (creates the lap effect)
        ctx.fillStyle='rgba(0,0,0,0.28)';
        ctx.fillRect(rx,py+plankH-2,rw,2);
        // Subtle wood grain streaks
        if(i%2===0){
          ctx.fillStyle='rgba(0,0,0,0.1)';
          ctx.fillRect(rx+rw*0.15,py+2,rw*0.2,1);
          ctx.fillRect(rx+rw*0.55,py+3,rw*0.15,1);
        }
      }
      // Weathering — paint streaks
      ctx.fillStyle='rgba(0,0,0,0.15)';
      ctx.fillRect(rx+rw*0.15,wallTop,1,wallH*0.4);
      ctx.fillRect(rx+rw*0.72,wallTop+wallH*0.2,1,wallH*0.35);

      // ── 3. CORNER PILASTERS (thick wood posts w/ metal bands) ────────
      const pilW=7;
      for(const px of [rx-1,rx+rw-pilW+1]){
        ctx.fillStyle=PAL.wallXD;ctx.fillRect(px,wallTop-2,pilW,wallH+4);
        ctx.fillStyle=PAL.wall;ctx.fillRect(px+1,wallTop-2,pilW-2,wallH+4);
        ctx.fillStyle=PAL.wallL;ctx.fillRect(px+1,wallTop-2,2,wallH+4); // left highlight
        // Metal strap bands
        ctx.fillStyle=PAL.metal;
        ctx.fillRect(px-1,wallTop+4,pilW+2,3);
        ctx.fillRect(px-1,wallBot-8,pilW+2,3);
        ctx.fillStyle=PAL.metalL;
        ctx.fillRect(px-1,wallTop+4,pilW+2,1);
        ctx.fillRect(px-1,wallBot-8,pilW+2,1);
        // Rivets
        ctx.fillStyle=PAL.metalD;
        ctx.fillRect(px+1,wallTop+5,1,1);ctx.fillRect(px+pilW-2,wallTop+5,1,1);
        ctx.fillRect(px+1,wallBot-7,1,1);ctx.fillRect(px+pilW-2,wallBot-7,1,1);
      }

      // ── 4. STOREFRONT DISPLAY WINDOW (divided-light, 6 panes) ────────
      // Dimensions — big, tall, proportional to the left half of the facade
      const winW=Math.floor(rw*0.44), winH=Math.floor(wallH*0.62);
      const winX=rx+12, winY=wallTop+14;
      const cols=3, rows=2;

      // Outer decorative wood header board (above the window)
      const hdrH=8;
      ctx.fillStyle=PAL.wallXD;
      ctx.fillRect(winX-5,winY-hdrH-4,winW+10,hdrH+2);
      ctx.fillStyle=PAL.trim;
      ctx.fillRect(winX-4,winY-hdrH-3,winW+8,hdrH);
      ctx.fillStyle=PAL.trimL;ctx.fillRect(winX-4,winY-hdrH-3,winW+8,1);
      ctx.fillStyle=PAL.trimD;ctx.fillRect(winX-4,winY-5,winW+8,2);
      // Decorative dentil blocks along the header
      ctx.fillStyle=PAL.wallXD;
      for(let i=0;i<Math.floor((winW+8)/6);i++){
        ctx.fillRect(winX-4+i*6+1,winY-5,3,2);
      }

      // Striped awning ABOVE the header — red & white
      const awY=winY-hdrH-14, awH=10;
      ctx.fillStyle=PAL.trimD;ctx.fillRect(winX-6,awY,winW+12,awH);
      const stripeW=6;
      for(let i=0;i<Math.ceil((winW+12)/stripeW);i++){
        ctx.fillStyle=i%2===0?'#E8E0D0':PAL.trim;
        ctx.fillRect(winX-6+i*stripeW,awY+1,stripeW,awH-1);
      }
      // Scalloped fringe bottom
      ctx.fillStyle=PAL.trimD;
      for(let i=0;i<Math.ceil((winW+12)/6);i++){
        ctx.beginPath();
        ctx.arc(winX-6+i*6+3,awY+awH,3,0,Math.PI);
        ctx.fill();
      }
      ctx.fillStyle='rgba(255,255,255,0.22)';ctx.fillRect(winX-6,awY,winW+12,1);

      // Thick wood window frame (outer)
      ctx.fillStyle=PAL.wallXD;ctx.fillRect(winX-3,winY-3,winW+6,winH+6);
      ctx.fillStyle=PAL.wallD;ctx.fillRect(winX-2,winY-2,winW+4,winH+4);
      // Inner frame highlight (light catches the top/left of the frame)
      ctx.fillStyle=PAL.wall;
      ctx.fillRect(winX-2,winY-2,winW+4,1);
      ctx.fillRect(winX-2,winY-2,1,winH+4);

      // Glass background — warm interior showing through (single fill, then mullions)
      const glassGrad=ctx.createLinearGradient(winX,winY,winX,winY+winH);
      glassGrad.addColorStop(0,'rgba(120,90,50,0.9)');     // shadowy ceiling
      glassGrad.addColorStop(0.5,'rgba(200,150,80,0.75)'); // warm middle
      glassGrad.addColorStop(1,'rgba(160,110,60,0.85)');   // shadowed floor
      ctx.fillStyle=glassGrad;
      ctx.fillRect(winX,winY,winW,winH);

      // Diagonal glare across the entire window
      ctx.fillStyle='rgba(255,255,255,0.08)';
      ctx.beginPath();
      ctx.moveTo(winX,winY);ctx.lineTo(winX+winW*0.4,winY);
      ctx.lineTo(winX,winY+winH*0.6);ctx.closePath();ctx.fill();

      // DISPLAY ITEMS — drawn on the glass before mullions so they sit inside the window
      // Back shelf line suggestion
      ctx.fillStyle='rgba(40,20,5,0.4)';
      ctx.fillRect(winX+2,winY+winH*0.58,winW-4,2);

      // Pickaxe — leaning in left third
      const pickX=winX+winW*0.18, pickY=winY+winH*0.25;
      ctx.save();ctx.translate(pickX,pickY);ctx.rotate(-0.25);
      ctx.fillStyle='#4A2810';ctx.fillRect(-1,0,2,winH*0.45); // handle
      ctx.fillStyle='#6A3818';ctx.fillRect(0,0,1,winH*0.45); // handle highlight
      // Head
      ctx.fillStyle=PAL.metalL;ctx.fillRect(-7,-3,14,3);
      ctx.fillStyle=PAL.metal;ctx.fillRect(-7,-1,14,2);
      ctx.fillStyle=PAL.metalD;ctx.fillRect(-7,0,5,1);
      ctx.restore();

      // Lantern — hanging in center, emits a tiny glow halo
      const lntX=winX+winW*0.5, lntY=winY+winH*0.32;
      // Glow halo
      ctx.fillStyle='rgba(255,210,120,0.35)';
      ctx.beginPath();ctx.arc(lntX,lntY+4,9,0,Math.PI*2);ctx.fill();
      // Hanging chain
      ctx.fillStyle=PAL.metalD;ctx.fillRect(lntX-0.5,winY+2,1,lntY-winY-2);
      // Top cap
      ctx.fillStyle=PAL.metal;ctx.fillRect(lntX-4,lntY-1,8,2);
      // Glass body
      ctx.fillStyle='rgba(255,220,140,0.95)';ctx.fillRect(lntX-3,lntY+1,6,6);
      ctx.fillStyle='#FFE080';ctx.fillRect(lntX-1,lntY+2,2,4); // flame
      // Base
      ctx.fillStyle=PAL.metalD;ctx.fillRect(lntX-4,lntY+7,8,2);

      // Coil of rope — sitting on the shelf in right third
      const ropX=winX+winW*0.82, ropY=winY+winH*0.52;
      ctx.fillStyle='#B89868';
      ctx.beginPath();ctx.ellipse(ropX,ropY,6,3,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#8A6838';
      ctx.beginPath();ctx.ellipse(ropX,ropY,4,2,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#B89868';
      ctx.beginPath();ctx.ellipse(ropX,ropY,2,1,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#6A4828';
      ctx.fillRect(ropX-5,ropY+1,10,1);

      // Shovel in back
      ctx.fillStyle='#4A2810';ctx.fillRect(winX+winW*0.3,winY+winH*0.15,1,winH*0.4);
      ctx.fillStyle=PAL.metal;ctx.fillRect(winX+winW*0.3-2,winY+winH*0.5,5,4);
      ctx.fillStyle=PAL.metalL;ctx.fillRect(winX+winW*0.3-2,winY+winH*0.5,5,1);

      // Small "SALE" tag hanging from top
      const tagX=winX+winW*0.68, tagY=winY+winH*0.18;
      ctx.fillStyle=PAL.metalD;ctx.fillRect(tagX,winY+2,1,tagY-winY-2);
      ctx.fillStyle='#E8D040';
      ctx.beginPath();
      ctx.moveTo(tagX-4,tagY);ctx.lineTo(tagX+4,tagY);ctx.lineTo(tagX+5,tagY+3);ctx.lineTo(tagX,tagY+7);ctx.lineTo(tagX-5,tagY+3);ctx.closePath();ctx.fill();
      ctx.fillStyle='#A88020';ctx.fillRect(tagX-1,tagY+2,2,1);

      // MULLIONS (6-pane grid) — drawn ON TOP so items look like they're behind glass
      ctx.fillStyle=PAL.wallXD;
      // Vertical mullions (2 dividers for 3 columns)
      for(let c=1;c<cols;c++){
        const mx=winX+(winW/cols)*c-1;
        ctx.fillRect(mx,winY,2,winH);
      }
      // Horizontal mullion (1 divider for 2 rows)
      const my=winY+winH/2-1;
      ctx.fillRect(winX,my,winW,2);
      // Mullion highlights (top-left edge of each)
      ctx.fillStyle='rgba(255,255,255,0.08)';
      for(let c=1;c<cols;c++){
        ctx.fillRect(winX+(winW/cols)*c-1,winY,1,winH);
      }
      ctx.fillRect(winX,my,winW,1);

      // Per-pane subtle glare (small triangles top-left of each pane)
      ctx.fillStyle='rgba(255,255,255,0.12)';
      for(let c=0;c<cols;c++){
        for(let r=0;r<rows;r++){
          const px=winX+(winW/cols)*c+2;
          const py=winY+(winH/rows)*r+2;
          const pw=(winW/cols)*0.35, ph=(winH/rows)*0.4;
          ctx.beginPath();
          ctx.moveTo(px,py);ctx.lineTo(px+pw,py);ctx.lineTo(px,py+ph);
          ctx.closePath();ctx.fill();
        }
      }

      // Deep wooden window sill underneath (protrudes, casts shadow)
      const sillH=5;
      ctx.fillStyle=PAL.wallXD;
      ctx.fillRect(winX-6,winY+winH+1,winW+12,sillH);
      ctx.fillStyle=PAL.trim;
      ctx.fillRect(winX-6,winY+winH+1,winW+12,2);
      ctx.fillStyle=PAL.trimL;
      ctx.fillRect(winX-6,winY+winH+1,winW+12,1);
      ctx.fillStyle='rgba(0,0,0,0.3)';
      ctx.fillRect(winX-6,winY+winH+sillH+1,winW+12,2);
      // Small flower pot on the sill
      const potX=winX+4, potY=winY+winH-2;
      ctx.fillStyle='#7A3A18';ctx.fillRect(potX,potY,6,4);
      ctx.fillStyle='#9A5028';ctx.fillRect(potX,potY,6,1);
      ctx.fillStyle='#3A6A28';ctx.fillRect(potX+1,potY-3,1,3);ctx.fillRect(potX+3,potY-4,1,4);ctx.fillRect(potX+4,potY-2,1,2);
      ctx.fillStyle='#E84050';ctx.fillRect(potX+3,potY-5,1,1);
      ctx.fillStyle='#F0C030';ctx.fillRect(potX+1,potY-4,1,1);

      // ── 5. COVERED PORCH / ENTRANCE ZONE (right half) ────────────────
      const porchX=rx+rw*0.52, porchY=wallTop+4;
      const porchW=rw*0.48, porchH=wallH-6;
      const doorW2=ST-2, doorH2=ST+10;
      const doorX2=porchX+porchW/2-doorW2/2, doorY2=wallBot-doorH2;

      // Porch step (2 steps)
      ctx.fillStyle=PAL.stoneD;ctx.fillRect(doorX2-10,wallBot-2,doorW2+20,8);
      ctx.fillStyle=PAL.stone;ctx.fillRect(doorX2-10,wallBot-2,doorW2+20,2);
      ctx.fillStyle=PAL.stoneD;ctx.fillRect(doorX2-6,wallBot+6,doorW2+12,6);
      ctx.fillStyle=PAL.stone;ctx.fillRect(doorX2-6,wallBot+6,doorW2+12,2);

      // Porch roof cover — small shingled overhang above door
      const prY=doorY2-14, prH=10;
      ctx.fillStyle=PAL.roofXD;ctx.fillRect(doorX2-14,prY,doorW2+28,prH);
      ctx.fillStyle=PAL.roofD;ctx.fillRect(doorX2-14,prY,doorW2+28,prH-2);
      // Shingle texture
      for(let i=0;i<Math.ceil((doorW2+28)/8);i++){
        ctx.fillStyle=i%2===0?PAL.roofL:PAL.roof;
        ctx.fillRect(doorX2-14+i*8,prY+1,7,prH-3);
      }
      // Porch support posts
      ctx.fillStyle=PAL.wallXD;ctx.fillRect(doorX2-14,prY+prH,3,wallBot-(prY+prH)+2);
      ctx.fillStyle=PAL.wall;ctx.fillRect(doorX2-13,prY+prH,2,wallBot-(prY+prH)+2);
      ctx.fillStyle=PAL.wallXD;ctx.fillRect(doorX2+doorW2+11,prY+prH,3,wallBot-(prY+prH)+2);
      ctx.fillStyle=PAL.wall;ctx.fillRect(doorX2+doorW2+12,prY+prH,2,wallBot-(prY+prH)+2);

      // Door frame
      ctx.fillStyle=PAL.trim;ctx.fillRect(doorX2-5,doorY2-1,doorW2+10,doorH2+1);
      ctx.fillStyle=PAL.trimL;ctx.fillRect(doorX2-5,doorY2-1,doorW2+10,2);
      ctx.fillStyle=PAL.trimD;ctx.fillRect(doorX2-5,doorY2+doorH2-1,doorW2+10,2);

      // Door — PROPPED OPEN showing warm interior light (major atmosphere)
      // Interior glow rectangle visible through the doorway
      ctx.fillStyle='rgba(80,40,15,1)';ctx.fillRect(doorX2,doorY2+2,doorW2,doorH2-2);
      // Warm light gradient from inside
      const intGrad=ctx.createLinearGradient(doorX2,doorY2+2,doorX2,doorY2+doorH2);
      intGrad.addColorStop(0,'rgba(255,220,130,0.6)');
      intGrad.addColorStop(1,'rgba(255,180,80,0.9)');
      ctx.fillStyle=intGrad;ctx.fillRect(doorX2+1,doorY2+3,doorW2-2,doorH2-4);
      // Silhouette suggestion of interior shelf
      ctx.fillStyle='rgba(40,20,5,0.5)';
      ctx.fillRect(doorX2+2,doorY2+doorH2*0.5,doorW2-4,2);
      ctx.fillRect(doorX2+2,doorY2+doorH2*0.7,doorW2-4,2);
      // Open door leaf (to the left, angled)
      ctx.fillStyle=PAL.wallD;ctx.fillRect(doorX2-6,doorY2+2,3,doorH2-4);
      ctx.fillStyle=PAL.wall;ctx.fillRect(doorX2-5,doorY2+3,2,doorH2-6);
      // Door handle
      ctx.fillStyle=PAL.trimL;ctx.fillRect(doorX2-5,doorY2+doorH2*0.55,1,2);

      // Warm light spill onto the porch floor
      const spillGrad=ctx.createRadialGradient(
        doorX2+doorW2/2,wallBot+2,2,
        doorX2+doorW2/2,wallBot+8,24
      );
      spillGrad.addColorStop(0,'rgba(255,210,120,0.55)');
      spillGrad.addColorStop(1,'rgba(255,180,80,0)');
      ctx.fillStyle=spillGrad;
      ctx.fillRect(doorX2-20,wallBot-2,doorW2+40,20);

      // Shop bell above door
      const bellX=doorX2+doorW2/2,bellY=doorY2-3;
      ctx.fillStyle=PAL.metalD;ctx.fillRect(bellX-1,bellY-4,2,4);
      ctx.fillStyle='#C8A030';
      ctx.beginPath();ctx.moveTo(bellX-4,bellY);ctx.lineTo(bellX+4,bellY);ctx.lineTo(bellX+3,bellY+4);ctx.lineTo(bellX-3,bellY+4);ctx.closePath();ctx.fill();
      ctx.fillStyle='#E8C048';
      ctx.beginPath();ctx.moveTo(bellX-3,bellY+1);ctx.lineTo(bellX+1,bellY+1);ctx.lineTo(bellX+0,bellY+3);ctx.lineTo(bellX-2,bellY+3);ctx.closePath();ctx.fill();
      ctx.fillStyle=PAL.metalD;ctx.fillRect(bellX,bellY+4,1,2); // clapper

      // "OPEN" hanging shingle under porch roof
      const opnW=24,opnH=9;
      const opnX=doorX2+doorW2+2,opnY=prY+prH+2;
      ctx.strokeStyle=PAL.metalD;ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(opnX+2,opnY);ctx.lineTo(opnX+2,prY+prH);ctx.stroke();
      ctx.beginPath();ctx.moveTo(opnX+opnW-2,opnY);ctx.lineTo(opnX+opnW-2,prY+prH);ctx.stroke();
      ctx.fillStyle='#2A6030';ctx.fillRect(opnX,opnY,opnW,opnH);
      ctx.fillStyle='#40A040';ctx.fillRect(opnX,opnY,opnW,2);
      ctx.fillStyle='#E8F0D0';ctx.font='bold 7px '+FONT;ctx.textAlign='center';
      ctx.fillText('OPEN',opnX+opnW/2,opnY+7);

      // ── 6. HANGING WARES on wall (left of bay) ───────────────────────
      // Coil of rope on a peg
      const rpX=rx+6,rpY=wallTop+wallH*0.15;
      ctx.fillStyle=PAL.metalD;ctx.fillRect(rpX+3,rpY-1,2,2);
      ctx.fillStyle='#B8A070';
      ctx.beginPath();ctx.arc(rpX+4,rpY+5,4,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#8A6840';
      ctx.beginPath();ctx.arc(rpX+4,rpY+5,2,0,Math.PI*2);ctx.fill();
      // Horseshoe for luck
      const hsX=rx+rw*0.33,hsY=wallTop+4;
      ctx.strokeStyle='#A8A090';ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(hsX,hsY+4,4,Math.PI,0,true);ctx.stroke();
      ctx.fillStyle=PAL.metalD;ctx.fillRect(hsX-5,hsY+3,1,1);ctx.fillRect(hsX+4,hsY+3,1,1);

      // Sandwich board sign OUT FRONT (on the ground in front of porch)
      const sbX=doorX2-28,sbY=ry+bh+2;
      // Left panel (angled)
      ctx.fillStyle=PAL.wallXD;
      ctx.beginPath();ctx.moveTo(sbX,sbY);ctx.lineTo(sbX+14,sbY+2);ctx.lineTo(sbX+14,sbY+18);ctx.lineTo(sbX-2,sbY+16);ctx.closePath();ctx.fill();
      ctx.fillStyle=PAL.wall;
      ctx.beginPath();ctx.moveTo(sbX+1,sbY+1);ctx.lineTo(sbX+13,sbY+3);ctx.lineTo(sbX+13,sbY+17);ctx.lineTo(sbX-1,sbY+15);ctx.closePath();ctx.fill();
      // Sign text
      ctx.save();
      ctx.translate(sbX+6,sbY+10);ctx.rotate(-0.08);
      ctx.fillStyle=PAL.trim;ctx.font='bold 6px '+FONT;ctx.textAlign='center';
      ctx.fillText('HARD',0,-1);ctx.fillText('WARE',0,5);
      ctx.restore();

      // ── 7. PITCHED GABLE ROOF ────────────────────────────────────────
      const roofOver=10;
      const roofTop=ry-ST*0.6;
      const roofEave=wallTop+2;
      // Roof base fill (triangle-ish from the two slopes)
      ctx.fillStyle=PAL.roofXD;
      ctx.beginPath();
      ctx.moveTo(rx-roofOver,roofEave);
      ctx.lineTo(rx+rw/2,roofTop);
      ctx.lineTo(rx+rw+roofOver,roofEave);
      ctx.lineTo(rx+rw+roofOver,roofEave+4);
      ctx.lineTo(rx-roofOver,roofEave+4);
      ctx.closePath();ctx.fill();
      // LEFT slope shingles
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(rx-roofOver,roofEave+3);
      ctx.lineTo(rx+rw/2,roofTop);
      ctx.lineTo(rx+rw/2,roofEave+3);
      ctx.closePath();
      ctx.clip();
      for(let row=0;row<10;row++){
        const rowY=roofTop+row*4;
        ctx.fillStyle=row%2===0?PAL.roofL:PAL.roof;
        ctx.fillRect(rx-roofOver-2,rowY,rw/2+roofOver+4,4);
        // Shingle edge shadow
        ctx.fillStyle='rgba(0,0,0,0.22)';
        ctx.fillRect(rx-roofOver-2,rowY+3,rw/2+roofOver+4,1);
      }
      ctx.restore();
      // RIGHT slope shingles (slightly darker for directional light)
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(rx+rw/2,roofTop);
      ctx.lineTo(rx+rw+roofOver,roofEave+3);
      ctx.lineTo(rx+rw/2,roofEave+3);
      ctx.closePath();
      ctx.clip();
      for(let row=0;row<10;row++){
        const rowY=roofTop+row*4;
        ctx.fillStyle=row%2===0?PAL.roof:PAL.roofD;
        ctx.fillRect(rx+rw/2-2,rowY,rw/2+roofOver+4,4);
        ctx.fillStyle='rgba(0,0,0,0.3)';
        ctx.fillRect(rx+rw/2-2,rowY+3,rw/2+roofOver+4,1);
      }
      ctx.restore();
      // Ridge cap (darker line down the peak)
      ctx.fillStyle=PAL.roofXD;
      ctx.fillRect(rx+rw/2-1,roofTop,2,roofEave-roofTop+3);
      // Eave fascia board
      ctx.fillStyle=PAL.wallXD;ctx.fillRect(rx-roofOver-2,roofEave+3,rw+roofOver*2+4,3);
      ctx.fillStyle=PAL.trim;ctx.fillRect(rx-roofOver-2,roofEave+3,rw+roofOver*2+4,1);
      // Decorative corbels under eaves (brackets)
      ctx.fillStyle=PAL.wallXD;
      for(let i=0;i<4;i++){
        const cbX=rx+(i+0.5)*(rw/4)-3;
        ctx.fillRect(cbX,roofEave+6,6,3);
        ctx.fillRect(cbX+1,roofEave+9,4,2);
      }
      // Gable oculus (round window in the peak)
      const ocX=rx+rw/2,ocY=roofTop+(roofEave-roofTop)*0.55;
      ctx.fillStyle=PAL.wallXD;
      ctx.beginPath();ctx.arc(ocX,ocY,5,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='rgba(255,210,130,0.5)';
      ctx.beginPath();ctx.arc(ocX,ocY,3.5,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=PAL.wallXD;
      ctx.fillRect(ocX-4,ocY-0.5,8,1);ctx.fillRect(ocX-0.5,ocY-4,1,8);
      // Weathervane on top — ₿ shape rotating very slowly
      const wvY=roofTop-12;
      ctx.fillStyle=PAL.metalD;ctx.fillRect(ocX-0.5,wvY,1,12);
      ctx.fillStyle=PAL.metalL;ctx.fillRect(ocX-0.5,wvY,1,2);
      // Cardinal bars
      ctx.fillStyle=PAL.metal;ctx.fillRect(ocX-3,wvY+4,7,1);ctx.fillRect(ocX,wvY+2,1,5);
      // Rotating arrow pointing
      const wvAng=Math.sin(t*0.2)*0.4;
      ctx.save();ctx.translate(ocX,wvY+1);ctx.rotate(wvAng);
      ctx.fillStyle=PAL.trim;
      ctx.beginPath();ctx.moveTo(-5,0);ctx.lineTo(4,0);ctx.lineTo(4,-2);ctx.lineTo(7,0);ctx.lineTo(4,2);ctx.lineTo(4,0);ctx.closePath();ctx.fill();
      ctx.restore();

      // ── 8. HANGING SIGNBOARD (above porch, decorative scrollwork) ────
      const sigW=60,sigH=16;
      const sigSway=Math.sin(t*1.1+d.x*0.3)*1.5;
      const sigX=porchX+porchW/2-sigW/2+sigSway, sigY=prY-12;
      // Iron scrollwork bracket (fixed to wall)
      ctx.strokeStyle=PAL.metalD;ctx.lineWidth=2;
      ctx.beginPath();
      ctx.moveTo(porchX+porchW/2,prY-4);
      ctx.quadraticCurveTo(porchX+porchW/2,sigY+2,porchX+porchW/2-10,sigY+2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(porchX+porchW/2,prY-4);
      ctx.quadraticCurveTo(porchX+porchW/2,sigY+2,porchX+porchW/2+10,sigY+2);
      ctx.stroke();
      // Sign chain
      ctx.lineWidth=1.5;ctx.strokeStyle='#4A4438';
      ctx.beginPath();ctx.moveTo(porchX+porchW/2-10,sigY+2);ctx.lineTo(sigX+8,sigY+3);ctx.stroke();
      ctx.beginPath();ctx.moveTo(porchX+porchW/2+10,sigY+2);ctx.lineTo(sigX+sigW-8,sigY+3);ctx.stroke();
      // Sign plaque w/ shadow
      ctx.fillStyle='rgba(0,0,0,0.35)';ctx.fillRect(sigX+1,sigY+2,sigW,sigH);
      ctx.fillStyle=PAL.trimD;ctx.fillRect(sigX,sigY,sigW,sigH);
      ctx.fillStyle=PAL.trim;ctx.fillRect(sigX+2,sigY+2,sigW-4,sigH-4);
      // Inner border
      ctx.strokeStyle=PAL.trimL;ctx.lineWidth=1;
      ctx.strokeRect(sigX+2,sigY+2,sigW-4,sigH-4);
      ctx.fillStyle='#2A1408';ctx.font='bold 10px '+FONT;ctx.textAlign='center';
      ctx.fillText("₿ RUBY'S",sigX+sigW/2,sigY+11);
      // Highlight sparkle
      ctx.fillStyle='rgba(255,255,255,0.5)';
      ctx.fillRect(sigX+4,sigY+3,6,1);

      // ── 9. ATMOSPHERE — dust motes in door light at night ────────────
      if(isNight){
        for(let i=0;i<5;i++){
          const dmX=doorX2+2+_svRand(d.x,d.y,i*3)*(doorW2-4);
          const dmY=wallBot+2+((_now/60+i*20)%20);
          ctx.fillStyle=`rgba(255,220,130,${0.5-((dmY-wallBot)/22)*0.5})`;
          ctx.fillRect(dmX,dmY,1,1);
        }
      }
    }

    // ── TAVERN (The Hodl Tavern) — Tudor-style half-timbered pub ─────────
    else if(d.label==='tavern'){
      const TPAL={
        stone:'#6A5E50', stoneL:'#8A7E70', stoneD:'#3A3228', stoneXD:'#201A14',
        plaster:'#D8C090', plasterL:'#E8D4A8', plasterD:'#A08858',
        beam:'#2A1808', beamD:'#120800', beamL:'#4A2810',
        thatchD:'#4A3818', thatch:'#7A5820', thatchL:'#A07828', thatchXL:'#C89838',
        iron:'#3A342A', ironL:'#5A544A', ironXL:'#7A7468',
        brass:'#B8881C', brassL:'#E8B040',
        amber:'rgba(255,180,60,0.85)', amberBright:'rgba(255,210,100,0.95)',
        fireGlow:'rgba(255,120,30,0.6)',
      };
      const wallTop=ry+ST;
      const wallBot=ry+bh-14;
      const wallH=wallBot-wallTop;
      // Split wall into lower stone (30%) + upper timber (70%)
      const stoneLowerH=Math.floor(wallH*0.3);
      const stoneLowerTop=wallBot-stoneLowerH;

      // ── 1. STONE FOUNDATION SKIRT ────────────────────────────────────
      const skY=wallBot, skH=14;
      ctx.fillStyle=TPAL.stoneXD;ctx.fillRect(rx-5,skY,rw+10,skH);
      // Irregular stone blocks
      for(let row=0;row<2;row++){
        const offset=row%2===0?0:8;
        for(let col=0;col<Math.ceil((rw+10)/16)+1;col++){
          const bx=rx-5+col*16+offset;
          if(bx>rx+rw+5)continue;
          const r=_svRand(d.x,d.y,row*13+col);
          const shade=r>0.66?TPAL.stoneL:r>0.33?TPAL.stone:TPAL.stoneD;
          ctx.fillStyle=shade;
          ctx.fillRect(bx,skY+row*7,14+Math.floor(r*2),6);
          ctx.fillStyle=TPAL.stoneXD;
          ctx.fillRect(bx+14+Math.floor(r*2),skY+row*7,1,6);
        }
      }
      ctx.fillStyle='rgba(0,0,0,0.4)';
      ctx.fillRect(rx-5,skY+6,rw+10,1);ctx.fillRect(rx-5,skY+13,rw+10,1);

      // ── 2. LOWER STONE WALL (weathered masonry below timber) ─────────
      ctx.fillStyle=TPAL.stoneD;ctx.fillRect(rx,stoneLowerTop,rw,stoneLowerH);
      for(let row=0;row<Math.ceil(stoneLowerH/9);row++){
        const offset=row%2===0?0:10;
        for(let col=0;col<Math.ceil(rw/20)+1;col++){
          const bx=rx+col*20+offset;
          if(bx>rx+rw)continue;
          const r=_svRand(d.x,d.y,row*17+col+100);
          ctx.fillStyle=r>0.5?TPAL.stoneL:TPAL.stone;
          ctx.fillRect(bx,stoneLowerTop+row*9,18,8);
          ctx.fillStyle=TPAL.stoneXD;
          ctx.fillRect(bx+18,stoneLowerTop+row*9,2,8);
        }
      }
      ctx.fillStyle='rgba(0,0,0,0.35)';
      for(let r=1;r<Math.ceil(stoneLowerH/9);r++){
        ctx.fillRect(rx,stoneLowerTop+r*9-1,rw,1);
      }
      // Thick beam separating stone from upper timber (jetty)
      ctx.fillStyle=TPAL.beam;ctx.fillRect(rx-4,stoneLowerTop-4,rw+8,5);
      ctx.fillStyle=TPAL.beamL;ctx.fillRect(rx-4,stoneLowerTop-4,rw+8,1);
      ctx.fillStyle=TPAL.beamD;ctx.fillRect(rx-4,stoneLowerTop,rw+8,1);

      // ── 3. UPPER HALF-TIMBERED WALL (plaster panels w/ dark beams) ───
      const upperTop=wallTop;
      const upperBot=stoneLowerTop-4;
      const upperH=upperBot-upperTop;
      // Plaster background
      ctx.fillStyle=TPAL.plaster;ctx.fillRect(rx,upperTop,rw,upperH);
      // Plaster dither noise for texture
      for(let i=0;i<120;i++){
        const nx=rx+_svRand(d.x,d.y,i)*rw;
        const ny=upperTop+_svRand(d.x,d.y,i+200)*upperH;
        const nc=_svRand(d.x,d.y,i+400);
        ctx.fillStyle=nc>0.66?TPAL.plasterL:nc>0.33?TPAL.plasterD:'rgba(0,0,0,0.08)';
        ctx.fillRect(Math.floor(nx),Math.floor(ny),1,1);
      }
      // Water stain / age
      ctx.fillStyle='rgba(100,80,40,0.15)';
      ctx.fillRect(rx+rw*0.2,upperTop,2,upperH*0.4);
      ctx.fillRect(rx+rw*0.78,upperTop+upperH*0.1,1,upperH*0.5);

      // Timber beams — the Tudor pattern
      // Top rail
      ctx.fillStyle=TPAL.beam;ctx.fillRect(rx-2,upperTop-2,rw+4,5);
      ctx.fillStyle=TPAL.beamL;ctx.fillRect(rx-2,upperTop-2,rw+4,1);
      // Bottom rail (already above the stone)
      ctx.fillStyle=TPAL.beam;ctx.fillRect(rx-2,upperBot-3,rw+4,4);
      // Vertical studs — corner posts
      ctx.fillStyle=TPAL.beam;
      ctx.fillRect(rx-1,upperTop,5,upperH);
      ctx.fillRect(rx+rw-4,upperTop,5,upperH);
      ctx.fillStyle=TPAL.beamL;
      ctx.fillRect(rx,upperTop,1,upperH);
      ctx.fillRect(rx+rw-4,upperTop,1,upperH);
      // Middle vertical stud (divider between left/right windows above door)
      ctx.fillStyle=TPAL.beam;
      ctx.fillRect(rx+rw/2-2,upperTop,4,upperH);
      // Diagonal cross braces in each panel (classic Tudor X)
      ctx.strokeStyle=TPAL.beam;ctx.lineWidth=3;
      // Left panel X
      ctx.beginPath();
      ctx.moveTo(rx+6,upperTop+2);ctx.lineTo(rx+rw/2-4,upperBot-4);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(rx+rw/2-4,upperTop+2);ctx.lineTo(rx+6,upperBot-4);
      ctx.stroke();
      // Right panel X
      ctx.beginPath();
      ctx.moveTo(rx+rw/2+4,upperTop+2);ctx.lineTo(rx+rw-6,upperBot-4);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(rx+rw-6,upperTop+2);ctx.lineTo(rx+rw/2+4,upperBot-4);
      ctx.stroke();
      ctx.lineWidth=1;

      // ── 4. LEADED DIAMOND-PANE WINDOWS (on stone wall, flanking door) ─
      const wiW=ST-6, wiH=stoneLowerH-6;
      const wiY=stoneLowerTop+3;
      const doorAreaW=ST+4;
      const winL_X=rx+rw*0.25-wiW/2;
      const winR_X=rx+rw*0.75-wiW/2;

      function drawTavernWindow(wx,wy,ww,wh){
        // Deep stone reveal (dark surround)
        ctx.fillStyle=TPAL.stoneXD;
        ctx.fillRect(wx-3,wy-3,ww+6,wh+6);
        // Heavy wood frame
        ctx.fillStyle=TPAL.beam;
        ctx.fillRect(wx-2,wy-2,ww+4,wh+4);
        ctx.fillStyle=TPAL.beamL;
        ctx.fillRect(wx-2,wy-2,ww+4,1);
        // Warm amber interior (candlelight that flickers)
        const flicker=0.88+Math.sin(t*3+d.x)*0.08+Math.sin(t*7.3)*0.04;
        ctx.fillStyle=`rgba(255,180,60,${flicker})`;
        ctx.fillRect(wx,wy,ww,wh);
        // Darker top/bottom (suggesting interior depth)
        const wgrad=ctx.createLinearGradient(wx,wy,wx,wy+wh);
        wgrad.addColorStop(0,'rgba(120,60,10,0.4)');
        wgrad.addColorStop(0.4,'rgba(255,160,40,0)');
        wgrad.addColorStop(0.6,'rgba(255,160,40,0)');
        wgrad.addColorStop(1,'rgba(100,40,5,0.5)');
        ctx.fillStyle=wgrad;ctx.fillRect(wx,wy,ww,wh);
        // Diamond lead lattice (criss-cross diagonals)
        ctx.strokeStyle=TPAL.iron;ctx.lineWidth=1;
        const step=5;
        for(let dx=-wh;dx<ww+wh;dx+=step){
          ctx.beginPath();
          ctx.moveTo(Math.max(wx,wx+dx),wy+Math.max(0,-dx));
          ctx.lineTo(Math.min(wx+ww,wx+dx+wh),wy+Math.min(wh,wh-dx+ww-ww));
          ctx.stroke();
        }
        // Actually simpler: just two sets of diagonal lines
        ctx.strokeStyle=TPAL.iron;ctx.lineWidth=1;
        ctx.save();
        ctx.beginPath();ctx.rect(wx,wy,ww,wh);ctx.clip();
        for(let off=-wh;off<ww;off+=4){
          ctx.beginPath();
          ctx.moveTo(wx+off,wy);ctx.lineTo(wx+off+wh,wy+wh);
          ctx.stroke();
        }
        for(let off=0;off<ww+wh;off+=4){
          ctx.beginPath();
          ctx.moveTo(wx+off,wy);ctx.lineTo(wx+off-wh,wy+wh);
          ctx.stroke();
        }
        ctx.restore();
        // Thick central vertical mullion
        ctx.fillStyle=TPAL.beam;
        ctx.fillRect(wx+ww/2-1,wy,2,wh);
        // Horizontal transom
        ctx.fillRect(wx,wy+wh*0.55-1,ww,2);
        // Small silhouette of a mug + figure inside (atmosphere)
        ctx.fillStyle='rgba(30,15,5,0.55)';
        ctx.fillRect(wx+ww*0.3,wy+wh*0.7,ww*0.15,wh*0.15); // mug shape
        ctx.fillRect(wx+ww*0.55,wy+wh*0.65,ww*0.12,wh*0.2);
        // Glare on glass
        ctx.fillStyle='rgba(255,255,255,0.12)';
        ctx.fillRect(wx+1,wy+1,ww*0.3,wh*0.3);
        // Window sill
        ctx.fillStyle=TPAL.beam;
        ctx.fillRect(wx-4,wy+wh+2,ww+8,3);
        ctx.fillStyle=TPAL.beamL;
        ctx.fillRect(wx-4,wy+wh+2,ww+8,1);
        // Flower box below
        ctx.fillStyle='#5A3818';ctx.fillRect(wx-3,wy+wh+5,ww+6,5);
        ctx.fillStyle='#7A4820';ctx.fillRect(wx-3,wy+wh+5,ww+6,1);
        ctx.fillStyle='#2A5018';
        for(let fi=0;fi<5;fi++)ctx.fillRect(wx-2+fi*((ww+4)/5),wy+wh+3,1,3);
        ctx.fillStyle='#C04020';ctx.fillRect(wx+2,wy+wh+2,2,2);
        ctx.fillStyle='#F0C020';ctx.fillRect(wx+ww-4,wy+wh+2,2,2);
        // Wooden shutters (open to the side)
        ctx.fillStyle=TPAL.beamL;
        ctx.fillRect(wx-5,wy-2,3,wh+4);
        ctx.fillRect(wx+ww+2,wy-2,3,wh+4);
        ctx.fillStyle=TPAL.beamD;
        ctx.fillRect(wx-5,wy-2,1,wh+4);
        ctx.fillRect(wx+ww+2,wy-2,1,wh+4);
        // Shutter hinge dots
        ctx.fillStyle=TPAL.iron;
        ctx.fillRect(wx-4,wy,1,1);ctx.fillRect(wx-4,wy+wh,1,1);
        ctx.fillRect(wx+ww+3,wy,1,1);ctx.fillRect(wx+ww+3,wy+wh,1,1);

        // Light pool on the ground at night
        if(isNight){
          const pulseI=0.25+Math.sin(_t*1.8+wx)*0.08;
          ctx.fillStyle=`rgba(255,170,60,${pulseI*0.4})`;
          ctx.beginPath();ctx.ellipse(wx+ww/2,wallBot+10,ww*1.4,12,0,0,Math.PI*2);ctx.fill();
          ctx.fillStyle=`rgba(255,200,100,${pulseI*0.3})`;
          ctx.beginPath();ctx.ellipse(wx+ww/2,wallBot+8,ww*0.9,8,0,0,Math.PI*2);ctx.fill();
        }
      }

      drawTavernWindow(winL_X,wiY,wiW,wiH);
      drawTavernWindow(winR_X,wiY,wiW,wiH);

      // ── 5. HEAVY DOUBLE DOOR AJAR ────────────────────────────────────
      const doorW3=ST+2, doorH3=stoneLowerH+6;
      const doorX3=rx+rw/2-doorW3/2, doorY3=wallBot-doorH3;
      // Stone arch above door (lintel)
      ctx.fillStyle=TPAL.stoneXD;
      ctx.fillRect(doorX3-6,doorY3-6,doorW3+12,7);
      ctx.fillStyle=TPAL.stone;
      ctx.fillRect(doorX3-5,doorY3-5,doorW3+10,5);
      // Keystone
      ctx.fillStyle=TPAL.stoneL;
      ctx.fillRect(doorX3+doorW3/2-3,doorY3-6,6,7);
      ctx.fillStyle=TPAL.stoneXD;
      ctx.fillRect(doorX3+doorW3/2-3,doorY3-6,1,7);
      ctx.fillRect(doorX3+doorW3/2+2,doorY3-6,1,7);
      // Stone step
      ctx.fillStyle=TPAL.stoneD;ctx.fillRect(doorX3-8,wallBot-2,doorW3+16,6);
      ctx.fillStyle=TPAL.stoneL;ctx.fillRect(doorX3-8,wallBot-2,doorW3+16,2);
      ctx.fillStyle=TPAL.stoneXD;ctx.fillRect(doorX3-8,wallBot+4,doorW3+16,1);
      // Doorway interior (dark room with fire glow)
      ctx.fillStyle='#1A0A04';ctx.fillRect(doorX3,doorY3,doorW3,doorH3);
      // Firelight gradient pouring out
      const fireGrad=ctx.createRadialGradient(
        doorX3+doorW3/2,doorY3+doorH3*0.65,3,
        doorX3+doorW3/2,doorY3+doorH3*0.65,doorH3*0.9
      );
      fireGrad.addColorStop(0,'rgba(255,180,60,0.95)');
      fireGrad.addColorStop(0.4,'rgba(255,120,30,0.7)');
      fireGrad.addColorStop(1,'rgba(80,20,5,0.1)');
      ctx.fillStyle=fireGrad;
      ctx.fillRect(doorX3+1,doorY3+2,doorW3-2,doorH3-2);
      // Silhouette of patron (seated figure) inside
      ctx.fillStyle='rgba(20,10,2,0.7)';
      ctx.fillRect(doorX3+doorW3*0.3,doorY3+doorH3*0.45,doorW3*0.4,doorH3*0.4);
      ctx.fillRect(doorX3+doorW3*0.35,doorY3+doorH3*0.3,doorW3*0.3,doorH3*0.2); // head

      // Left door (ajar — wider view of interior)
      const ldW=doorW3*0.38;
      ctx.fillStyle=TPAL.beamD;
      ctx.fillRect(doorX3-4,doorY3+2,3,doorH3-4);
      ctx.fillStyle=TPAL.beamL;
      ctx.fillRect(doorX3-3,doorY3+3,2,doorH3-6);
      // Iron bands on ajar door
      ctx.fillStyle=TPAL.iron;
      ctx.fillRect(doorX3-4,doorY3+8,3,2);
      ctx.fillRect(doorX3-4,doorY3+doorH3-12,3,2);

      // Right door (closed, heavy oak with iron bands)
      const rdX=doorX3+doorW3*0.42, rdW=doorW3*0.58;
      ctx.fillStyle=TPAL.beamD;
      ctx.fillRect(rdX,doorY3+1,rdW,doorH3-2);
      ctx.fillStyle='#5A3018';
      ctx.fillRect(rdX+1,doorY3+2,rdW-2,doorH3-4);
      // Vertical plank lines
      ctx.fillStyle=TPAL.beamD;
      for(let p=0;p<3;p++)ctx.fillRect(rdX+3+p*((rdW-6)/3),doorY3+3,1,doorH3-6);
      // Iron horizontal bands
      ctx.fillStyle=TPAL.iron;
      ctx.fillRect(rdX,doorY3+4,rdW,3);
      ctx.fillRect(rdX,doorY3+doorH3-8,rdW,3);
      ctx.fillStyle=TPAL.ironL;
      ctx.fillRect(rdX,doorY3+4,rdW,1);
      ctx.fillRect(rdX,doorY3+doorH3-8,rdW,1);
      // Rivets on bands
      ctx.fillStyle=TPAL.ironXL;
      for(let riv=0;riv<4;riv++){
        ctx.fillRect(rdX+3+riv*(rdW/4),doorY3+5,1,1);
        ctx.fillRect(rdX+3+riv*(rdW/4),doorY3+doorH3-7,1,1);
      }
      // Iron ring knocker
      const knX=rdX+rdW*0.7, knY=doorY3+doorH3*0.45;
      ctx.fillStyle=TPAL.iron;
      ctx.fillRect(knX-2,knY,4,3); // plate
      ctx.strokeStyle=TPAL.ironL;ctx.lineWidth=1.5;
      ctx.beginPath();ctx.arc(knX,knY+4,3,0,Math.PI*2);ctx.stroke();

      // Warm light spill onto the step
      const spillG=ctx.createRadialGradient(
        doorX3+doorW3*0.3,wallBot+2,2,
        doorX3+doorW3*0.3,wallBot+4,28
      );
      spillG.addColorStop(0,'rgba(255,170,50,0.55)');
      spillG.addColorStop(0.5,'rgba(255,130,30,0.2)');
      spillG.addColorStop(1,'rgba(255,100,20,0)');
      ctx.fillStyle=spillG;
      ctx.fillRect(doorX3-24,wallBot-4,doorW3+48,24);

      // ── 6. HANGING IRON LANTERN on bracket (right of door) ───────────
      const lnBrX=doorX3+doorW3+5, lnBrY=doorY3-4;
      // Wrought iron wall bracket
      ctx.strokeStyle=TPAL.iron;ctx.lineWidth=2;
      ctx.beginPath();
      ctx.moveTo(lnBrX,lnBrY);
      ctx.quadraticCurveTo(lnBrX+4,lnBrY-3,lnBrX+10,lnBrY+2);
      ctx.stroke();
      // Small scroll curl
      ctx.beginPath();ctx.arc(lnBrX+3,lnBrY-2,1.5,0,Math.PI*2);ctx.stroke();
      // Hanging chain
      ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(lnBrX+10,lnBrY+2);ctx.lineTo(lnBrX+10,lnBrY+8);ctx.stroke();
      // Lantern body
      const lnX=lnBrX+10, lnY=lnBrY+9;
      ctx.fillStyle=TPAL.iron;
      ctx.fillRect(lnX-4,lnY,8,2); // top cap
      ctx.fillRect(lnX-3,lnY+9,6,2); // bottom
      // Glass panels with warm amber
      const lnPulse=0.85+Math.sin(t*4)*0.12;
      ctx.fillStyle=`rgba(255,190,70,${lnPulse})`;
      ctx.fillRect(lnX-3,lnY+2,6,7);
      // Flame
      ctx.fillStyle='#FFE08A';ctx.fillRect(lnX-1,lnY+4,2,3);
      // Iron frame bars
      ctx.fillStyle=TPAL.iron;
      ctx.fillRect(lnX-3,lnY+2,1,7);ctx.fillRect(lnX+2,lnY+2,1,7);
      ctx.fillRect(lnX-3,lnY+5,6,1);
      // Lantern glow at night
      if(isNight){
        const glwG=ctx.createRadialGradient(lnX,lnY+5,2,lnX,lnY+5,24);
        glwG.addColorStop(0,`rgba(255,190,70,${lnPulse*0.4})`);
        glwG.addColorStop(1,'rgba(255,190,70,0)');
        ctx.fillStyle=glwG;
        ctx.beginPath();ctx.arc(lnX,lnY+5,24,0,Math.PI*2);ctx.fill();
      }

      // ── 7. OUTDOOR ATMOSPHERE PROPS ──────────────────────────────────
      // Beer barrel with tap (left of door)
      const brlX=doorX3-28,brlY=wallBot-18;
      ctx.fillStyle=TPAL.beamD;ctx.fillRect(brlX-1,brlY-1,17,20);
      ctx.fillStyle='#6A3818';ctx.fillRect(brlX,brlY,15,18);
      ctx.fillStyle='#8A4820';ctx.fillRect(brlX+1,brlY+1,13,16);
      // Stave lines
      ctx.fillStyle='rgba(0,0,0,0.25)';
      for(let s=0;s<4;s++)ctx.fillRect(brlX+2+s*3,brlY+1,1,16);
      // Iron hoops
      ctx.fillStyle=TPAL.iron;
      ctx.fillRect(brlX,brlY+2,15,2);
      ctx.fillRect(brlX,brlY+14,15,2);
      ctx.fillStyle=TPAL.ironL;
      ctx.fillRect(brlX,brlY+2,15,1);
      ctx.fillRect(brlX,brlY+14,15,1);
      // Brass tap
      ctx.fillStyle=TPAL.brass;ctx.fillRect(brlX+6,brlY+8,4,2);
      ctx.fillStyle=TPAL.brassL;ctx.fillRect(brlX+6,brlY+8,4,1);
      ctx.fillStyle=TPAL.brass;ctx.fillRect(brlX+9,brlY+10,2,3);
      // Wet patch under tap
      ctx.fillStyle='rgba(100,60,20,0.4)';
      ctx.beginPath();ctx.ellipse(brlX+10,brlY+19,6,2,0,0,Math.PI*2);ctx.fill();

      // Trestle table + bench (right of door)
      const tblX=doorX3+doorW3+26,tblY=wallBot-18;
      // Table top
      ctx.fillStyle=TPAL.beamD;ctx.fillRect(tblX-1,tblY-1,24,5);
      ctx.fillStyle='#7A4820';ctx.fillRect(tblX,tblY,22,4);
      ctx.fillStyle='rgba(0,0,0,0.2)';
      ctx.fillRect(tblX,tblY+2,22,1);
      // Legs
      ctx.fillStyle=TPAL.beam;
      ctx.fillRect(tblX+2,tblY+4,2,14);
      ctx.fillRect(tblX+18,tblY+4,2,14);
      // Cross brace
      ctx.fillRect(tblX+2,tblY+14,18,1);
      // Wooden mug on the table
      const mgX=tblX+8,mgY=tblY-5;
      ctx.fillStyle=TPAL.beamD;ctx.fillRect(mgX,mgY,5,5);
      ctx.fillStyle='#8A5820';ctx.fillRect(mgX+1,mgY+1,3,4);
      ctx.fillStyle='#E8D0A0';ctx.fillRect(mgX+1,mgY,3,1); // foam
      ctx.fillRect(mgX,mgY-1,5,1);
      // Mug handle
      ctx.fillStyle=TPAL.beam;ctx.fillRect(mgX+5,mgY+1,1,3);

      // ── 8. CHIMNEY (right side, stone) w/ active smoke ───────────────
      const tchx=rx+rw-20,tchy=ry-ST*0.8;
      const chH=ST*0.8+ST+4;
      ctx.fillStyle=TPAL.stoneXD;ctx.fillRect(tchx-1,tchy,14,chH);
      // Stone blocks
      for(let i=0;i<Math.ceil(chH/7);i++){
        const sh=_svRand(d.x,d.y,i+500)>0.5?TPAL.stoneL:TPAL.stone;
        ctx.fillStyle=sh;
        ctx.fillRect(tchx+(i%2)*2,tchy+i*7,12,6);
        ctx.fillStyle=TPAL.stoneXD;
        ctx.fillRect(tchx+(i%2)*2,tchy+i*7+6,12,1);
      }
      // Chimney cap
      ctx.fillStyle=TPAL.stoneD;ctx.fillRect(tchx-3,tchy-3,18,4);
      ctx.fillStyle=TPAL.stone;ctx.fillRect(tchx-3,tchy-3,18,1);
      // Inner dark hole
      ctx.fillStyle='#0A0604';ctx.fillRect(tchx+3,tchy-1,6,2);
      // Ember glow from chimney top
      ctx.fillStyle='rgba(255,100,20,0.3)';
      ctx.fillRect(tchx+3,tchy-2,6,1);

      // Thick warm smoke (multiple layers)
      for(let sp=0;sp<4;sp++){
        const sa=0.35-sp*0.07+Math.sin(t*1.5+sp)*0.08;
        const smX=tchx+6+Math.sin(t*0.8+sp*1.5)*(3+sp);
        const smY=tchy-10-sp*10-((t*8+sp*4)%8);
        ctx.fillStyle=`rgba(180,140,90,${sa})`;
        ctx.beginPath();ctx.arc(smX,smY,4+sp*1.5,0,Math.PI*2);ctx.fill();
        ctx.fillStyle=`rgba(220,170,110,${sa*0.5})`;
        ctx.beginPath();ctx.arc(smX-1,smY-1,3+sp,0,Math.PI*2);ctx.fill();
      }

      // ── 9. STEEP THATCHED ROOF ───────────────────────────────────────
      const roofOver=12;
      const roofPeakY=ry-ST*1.1;
      const roofEaveY=wallTop+3;
      // Roof silhouette (steep gable)
      ctx.fillStyle=TPAL.thatchD;
      ctx.beginPath();
      ctx.moveTo(rx-roofOver,roofEaveY+4);
      ctx.lineTo(rx+rw/2,roofPeakY);
      ctx.lineTo(rx+rw+roofOver,roofEaveY+4);
      ctx.closePath();ctx.fill();
      // Thatch layers — 5 horizontal bands, each with shaggy bottom edge
      const bandCount=6;
      for(let band=bandCount-1;band>=0;band--){
        const bandTopRatio=band/bandCount;
        const bandBotRatio=(band+1)/bandCount;
        // Interpolate roof width at each y
        const topY=roofPeakY+(roofEaveY+4-roofPeakY)*bandTopRatio;
        const botY=roofPeakY+(roofEaveY+4-roofPeakY)*bandBotRatio;
        const topHalfW=(rw/2+roofOver)*bandTopRatio;
        const botHalfW=(rw/2+roofOver)*bandBotRatio;
        // Thatch color varies per band
        const bc=band%2===0?TPAL.thatchL:TPAL.thatch;
        ctx.fillStyle=bc;
        ctx.beginPath();
        ctx.moveTo(rx+rw/2-topHalfW,topY);
        ctx.lineTo(rx+rw/2+topHalfW,topY);
        ctx.lineTo(rx+rw/2+botHalfW,botY+3);
        ctx.lineTo(rx+rw/2-botHalfW,botY+3);
        ctx.closePath();ctx.fill();
        // Shaggy bottom edge — draw triangular teeth along the bottom of each band
        ctx.fillStyle=TPAL.thatchD;
        const toothW=5;
        for(let tx2=-botHalfW;tx2<botHalfW;tx2+=toothW){
          const th=2+_svRand(d.x,d.y,band*23+Math.floor(tx2))*2;
          ctx.beginPath();
          ctx.moveTo(rx+rw/2+tx2,botY+3);
          ctx.lineTo(rx+rw/2+tx2+toothW/2,botY+3+th);
          ctx.lineTo(rx+rw/2+tx2+toothW,botY+3);
          ctx.closePath();ctx.fill();
        }
        // Straw texture — vertical strokes
        ctx.strokeStyle=TPAL.thatchXL;
        ctx.lineWidth=1;
        for(let i=0;i<12;i++){
          const sx2=rx+rw/2-botHalfW+_svRand(d.x,d.y,band*11+i)*(botHalfW*2);
          const sy2=topY+_svRand(d.x,d.y,band*19+i)*(botY-topY);
          ctx.beginPath();
          ctx.moveTo(sx2,sy2);
          ctx.lineTo(sx2+0.5,sy2+3);
          ctx.stroke();
        }
        // Darker streaks
        ctx.strokeStyle='rgba(0,0,0,0.3)';
        for(let i=0;i<8;i++){
          const sx2=rx+rw/2-botHalfW+_svRand(d.x,d.y,band*29+i+7)*(botHalfW*2);
          const sy2=topY+_svRand(d.x,d.y,band*31+i)*(botY-topY);
          ctx.beginPath();
          ctx.moveTo(sx2,sy2);
          ctx.lineTo(sx2,sy2+4);
          ctx.stroke();
        }
      }
      // Twisted rope ridge along the peak (darker bundled thatch)
      ctx.fillStyle=TPAL.thatchD;
      ctx.fillRect(rx-roofOver,roofPeakY-2,rw+roofOver*2,4);
      ctx.fillStyle='#2A1A08';
      for(let i=0;i<Math.ceil((rw+roofOver*2)/4);i++){
        ctx.fillRect(rx-roofOver+i*4+(i%2),roofPeakY-1,2,1);
      }
      // Eave shadow under roof
      ctx.fillStyle='rgba(0,0,0,0.3)';
      ctx.fillRect(rx-roofOver,roofEaveY+4,rw+roofOver*2,4);

      // ── 10. MASSIVE HANGING SIGN on wrought-iron bracket ─────────────
      // Big sign extends outward from the wall to the LEFT side
      const sigBrX=rx+4, sigBrY=upperTop+upperH*0.4;
      // Iron bracket arm extending out from wall
      ctx.strokeStyle=TPAL.iron;ctx.lineWidth=3;
      ctx.beginPath();
      ctx.moveTo(sigBrX,sigBrY);
      ctx.lineTo(sigBrX-14,sigBrY);
      ctx.stroke();
      ctx.lineWidth=2;
      // Diagonal support strut
      ctx.beginPath();
      ctx.moveTo(sigBrX,sigBrY+10);
      ctx.lineTo(sigBrX-12,sigBrY+2);
      ctx.stroke();
      // Decorative scroll curls
      ctx.lineWidth=1.5;
      ctx.beginPath();ctx.arc(sigBrX-4,sigBrY-2,2,0,Math.PI*2);ctx.stroke();
      ctx.beginPath();ctx.arc(sigBrX-10,sigBrY-3,1.5,0,Math.PI*2);ctx.stroke();

      // Hanging sign
      const sigW=44,sigH=28;
      const sigSway=Math.sin(t*0.9+d.x*0.5)*2.2;
      const sigX=sigBrX-18+sigSway, sigY=sigBrY+4;
      // Chains
      ctx.strokeStyle=TPAL.iron;ctx.lineWidth=1.5;
      ctx.beginPath();ctx.moveTo(sigBrX-14,sigBrY);ctx.lineTo(sigX+4,sigY);ctx.stroke();
      ctx.beginPath();ctx.moveTo(sigBrX-14,sigBrY);ctx.lineTo(sigX+sigW-4,sigY);ctx.stroke();
      // Sign frame (iron border + wood interior)
      ctx.fillStyle='rgba(0,0,0,0.4)';
      ctx.fillRect(sigX+2,sigY+3,sigW,sigH);
      ctx.fillStyle=TPAL.iron;
      ctx.fillRect(sigX,sigY,sigW,sigH);
      ctx.fillStyle=TPAL.beamD;
      ctx.fillRect(sigX+2,sigY+2,sigW-4,sigH-4);
      ctx.fillStyle='#5A3818';
      ctx.fillRect(sigX+3,sigY+3,sigW-6,sigH-6);
      // Inner beveled border
      ctx.strokeStyle='#7A4820';ctx.lineWidth=1;
      ctx.strokeRect(sigX+3,sigY+3,sigW-6,sigH-6);
      // Iron corner bolts
      ctx.fillStyle=TPAL.ironXL;
      ctx.fillRect(sigX+2,sigY+2,2,2);
      ctx.fillRect(sigX+sigW-4,sigY+2,2,2);
      ctx.fillRect(sigX+2,sigY+sigH-4,2,2);
      ctx.fillRect(sigX+sigW-4,sigY+sigH-4,2,2);
      // Painted foaming mug illustration
      const mgCX=sigX+sigW/2, mgCY=sigY+sigH*0.42;
      // Mug body
      ctx.fillStyle='#3A2010';ctx.fillRect(mgCX-5,mgCY-3,10,9);
      ctx.fillStyle='#7A4820';ctx.fillRect(mgCX-4,mgCY-2,8,7);
      ctx.fillStyle='#9A5820';ctx.fillRect(mgCX-4,mgCY-2,2,7); // highlight
      // Handle
      ctx.strokeStyle='#3A2010';ctx.lineWidth=1.5;
      ctx.beginPath();ctx.arc(mgCX+6,mgCY+1,3,-Math.PI/2,Math.PI/2);ctx.stroke();
      // Foam on top
      ctx.fillStyle='#F0E8D0';
      ctx.beginPath();ctx.arc(mgCX-3,mgCY-3,2,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.arc(mgCX,mgCY-4,2.5,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.arc(mgCX+3,mgCY-3,2,0,Math.PI*2);ctx.fill();
      // Text below mug
      ctx.fillStyle='#E8B040';ctx.font='bold 6px '+FONT;ctx.textAlign='center';
      ctx.fillText('THE HODL',sigX+sigW/2,sigY+sigH-6);
      ctx.fillText('TAVERN',sigX+sigW/2,sigY+sigH-1);

      // ── 11. DORMER WINDOW IN ROOF (upstairs room) ────────────────────
      const drmW=14, drmH=12;
      const drmX=rx+rw/2-drmW/2;
      const drmY=roofPeakY+(roofEaveY-roofPeakY)*0.55;
      // Dormer box
      ctx.fillStyle=TPAL.beamD;
      ctx.fillRect(drmX-2,drmY-2,drmW+4,drmH+4);
      ctx.fillStyle=TPAL.plaster;
      ctx.fillRect(drmX-1,drmY-1,drmW+2,drmH+2);
      // Little gable above dormer
      ctx.fillStyle=TPAL.thatch;
      ctx.beginPath();
      ctx.moveTo(drmX-3,drmY-1);
      ctx.lineTo(drmX+drmW/2,drmY-7);
      ctx.lineTo(drmX+drmW+3,drmY-1);
      ctx.closePath();ctx.fill();
      ctx.fillStyle=TPAL.thatchD;
      ctx.fillRect(drmX-3,drmY-1,drmW+6,1);
      // Diamond window
      ctx.fillStyle=TPAL.beam;
      ctx.fillRect(drmX+1,drmY+1,drmW-2,drmH-2);
      const drmFlicker=0.8+Math.sin(t*4+d.x+1)*0.15;
      ctx.fillStyle=`rgba(255,170,50,${drmFlicker})`;
      ctx.fillRect(drmX+2,drmY+2,drmW-4,drmH-4);
      // Diamond cross
      ctx.strokeStyle=TPAL.iron;ctx.lineWidth=1;
      ctx.beginPath();
      ctx.moveTo(drmX+drmW/2,drmY+2);ctx.lineTo(drmX+drmW-2,drmY+drmH/2);
      ctx.lineTo(drmX+drmW/2,drmY+drmH-2);ctx.lineTo(drmX+2,drmY+drmH/2);
      ctx.closePath();ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(drmX+drmW/2,drmY+2);ctx.lineTo(drmX+drmW/2,drmY+drmH-2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(drmX+2,drmY+drmH/2);ctx.lineTo(drmX+drmW-2,drmY+drmH/2);
      ctx.stroke();

      // ── 12. DUST MOTES + fire EMBERS rising from doorway at night ────
      if(isNight){
        for(let i=0;i<6;i++){
          const emX=doorX3+doorW3*0.3+_svRand(d.x,d.y,i*5)*doorW3*0.5;
          const emY=wallBot+2-((_now/40+i*30)%60);
          const em=1-((wallBot+2-emY)/60);
          ctx.fillStyle=`rgba(255,150,40,${em*0.7})`;
          ctx.fillRect(emX,emY,1,1);
        }
      }
    }

    // ── SHED (Mining Shed) — Industrial ASIC farm w/ grit ───────────────
    else if(d.label==='shed'){
      const SPAL={
        metal:'#5A5A62', metalL:'#7A7A82', metalXL:'#9A9AA2', metalD:'#2A2A32', metalXD:'#14141A',
        concrete:'#6A6A66', concreteL:'#8A8A86', concreteD:'#3A3A38',
        hazard:'#E8B020', hazardD:'#B07010',
        danger:'#C02020', dangerD:'#701010',
        orange:'#F7931A', orangeL:'#FFB040',
        led:'#20E040', ledD:'#083010',
        rust:'#8A4020', rustL:'#C06828',
        cable:'#1A1A1A',
        glass:'rgba(130,160,180,0.3)',
      };
      const wallTop=ry+ST;
      const wallBot=ry+bh-10;
      const wallH=wallBot-wallTop;

      // ── 1. CONCRETE FOUNDATION w/ HAZARD STRIPES ─────────────────────
      ctx.fillStyle=SPAL.concreteD;
      ctx.fillRect(rx-4,wallBot,rw+8,12);
      ctx.fillStyle=SPAL.concrete;
      ctx.fillRect(rx-4,wallBot,rw+8,5);
      ctx.fillStyle=SPAL.concreteL;
      ctx.fillRect(rx-4,wallBot,rw+8,1);
      // Yellow-black hazard stripe trim along the top of the foundation
      for(let i=0;i<Math.ceil((rw+8)/10);i++){
        ctx.fillStyle=i%2===0?SPAL.hazard:SPAL.metalXD;
        ctx.beginPath();
        ctx.moveTo(rx-4+i*10,wallBot+5);
        ctx.lineTo(rx-4+i*10+10,wallBot+5);
        ctx.lineTo(rx-4+i*10+6,wallBot+8);
        ctx.lineTo(rx-4+i*10-4,wallBot+8);
        ctx.closePath();ctx.fill();
      }
      // Oil stains on ground
      ctx.fillStyle='rgba(20,10,5,0.4)';
      ctx.beginPath();ctx.ellipse(rx+rw*0.3,wallBot+14,8,2,0,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.ellipse(rx+rw*0.7,wallBot+15,6,2,0,0,Math.PI*2);ctx.fill();

      // ── 2. CORRUGATED METAL WALL (proper ribbing) ────────────────────
      // Base wall
      ctx.fillStyle=SPAL.metal;
      ctx.fillRect(rx,wallTop,rw,wallH);
      // Vertical corrugation ribs — each rib is 4px wide with highlight+shadow
      const ribW=4;
      for(let i=0;i<Math.ceil(rw/ribW);i++){
        const rxi=rx+i*ribW;
        // Rib highlight (left edge)
        ctx.fillStyle=SPAL.metalL;
        ctx.fillRect(rxi,wallTop,1,wallH);
        // Rib shadow (right edge)
        ctx.fillStyle=SPAL.metalD;
        ctx.fillRect(rxi+ribW-1,wallTop,1,wallH);
        // Valley between ribs
        ctx.fillStyle='rgba(0,0,0,0.15)';
        ctx.fillRect(rxi+1,wallTop,1,wallH);
      }
      // Horizontal panel seam bands (2 horizontal lines of rivets)
      for(const seamY of [wallTop+wallH*0.35,wallTop+wallH*0.7]){
        ctx.fillStyle=SPAL.metalD;
        ctx.fillRect(rx,seamY,rw,2);
        ctx.fillStyle=SPAL.metalL;
        ctx.fillRect(rx,seamY,rw,1);
        // Rivets along the seam
        for(let rv=0;rv<Math.floor(rw/10);rv++){
          ctx.fillStyle=SPAL.metalXL;
          ctx.fillRect(rx+5+rv*10,seamY,1,1);
          ctx.fillStyle=SPAL.metalD;
          ctx.fillRect(rx+5+rv*10,seamY+1,1,1);
        }
      }
      // Rust streaks bleeding from rivets / seams
      for(let st=0;st<4;st++){
        const stX=rx+_svRand(d.x,d.y,st*11)*rw;
        const stY=wallTop+wallH*0.35+1;
        const stH=_svRand(d.x,d.y,st*13+5)*wallH*0.25;
        ctx.fillStyle=SPAL.rust;
        ctx.fillRect(stX,stY,1,stH);
        ctx.fillStyle=SPAL.rustL;
        ctx.fillRect(stX,stY,1,Math.min(2,stH));
      }

      // ── 3. CORNER I-BEAM REINFORCEMENTS ──────────────────────────────
      for(const bX of [rx-1,rx+rw-4]){
        ctx.fillStyle=SPAL.metalD;
        ctx.fillRect(bX,wallTop-2,5,wallH+4);
        ctx.fillStyle=SPAL.metal;
        ctx.fillRect(bX+1,wallTop-2,3,wallH+4);
        ctx.fillStyle=SPAL.metalL;
        ctx.fillRect(bX+1,wallTop-2,1,wallH+4);
        // Bolt heads along the beam
        for(let bi=0;bi<Math.floor(wallH/12);bi++){
          ctx.fillStyle=SPAL.metalXL;
          ctx.fillRect(bX+2,wallTop+4+bi*12,1,2);
        }
      }

      // ── 4. BIG INDUSTRIAL ROLL-UP GARAGE DOOR (visual, left-center) ──
      const ruW=rw*0.38, ruH=wallH*0.75;
      const ruX=rx+rw*0.08, ruY=wallBot-ruH;
      // Door frame
      ctx.fillStyle=SPAL.metalXD;
      ctx.fillRect(ruX-4,ruY-4,ruW+8,ruH+4);
      ctx.fillStyle=SPAL.hazard;
      ctx.fillRect(ruX-4,ruY-4,ruW+8,2); // yellow header
      // Door panels — horizontal slats (roll-up segments)
      const slatH=7;
      for(let sl=0;sl<Math.ceil(ruH/slatH);sl++){
        const slY=ruY+sl*slatH;
        ctx.fillStyle=sl%2===0?SPAL.metalL:SPAL.metal;
        ctx.fillRect(ruX,slY,ruW,slatH-1);
        ctx.fillStyle=SPAL.metalD;
        ctx.fillRect(ruX,slY+slatH-1,ruW,1);
        // Horizontal groove highlight
        ctx.fillStyle=SPAL.metalXL;
        ctx.fillRect(ruX,slY,ruW,1);
      }
      // Chain mechanism on the right side
      ctx.strokeStyle=SPAL.metalD;ctx.lineWidth=1;
      for(let ch=0;ch<8;ch++){
        ctx.beginPath();
        ctx.arc(ruX+ruW-3,ruY+ch*4+2,1,0,Math.PI*2);
        ctx.stroke();
      }
      // Door handle/lock
      ctx.fillStyle=SPAL.metalXL;
      ctx.fillRect(ruX+ruW/2-3,ruY+ruH-10,6,4);
      ctx.fillStyle=SPAL.metalD;
      ctx.fillRect(ruX+ruW/2-2,ruY+ruH-9,4,2);

      // Orange warning stripe across the bottom of the door
      for(let wi=0;wi<Math.ceil(ruW/6);wi++){
        ctx.fillStyle=wi%2===0?SPAL.hazard:SPAL.metalXD;
        ctx.fillRect(ruX+wi*6,ruY+ruH-4,6,3);
      }

      // ── 5. BARRED WINDOWS (2 small windows, top of wall) ─────────────
      const wiW=ST-16, wiH=10;
      for(let wi=0;wi<2;wi++){
        const wx=rx+rw*0.55+wi*(wiW+10);
        const wy=wallTop+6;
        // Frame
        ctx.fillStyle=SPAL.metalD;
        ctx.fillRect(wx-2,wy-2,wiW+4,wiH+4);
        ctx.fillStyle=SPAL.metal;
        ctx.fillRect(wx-1,wy-1,wiW+2,wiH+2);
        // Glass w/ faint blue interior light (server room)
        ctx.fillStyle=SPAL.glass;
        ctx.fillRect(wx,wy,wiW,wiH);
        // Subtle data-flow flicker
        const dataFlick=0.15+Math.sin(_now/150+wi*7)*0.1;
        ctx.fillStyle=`rgba(60,140,220,${dataFlick})`;
        ctx.fillRect(wx,wy,wiW,wiH);
        // Bars
        ctx.fillStyle=SPAL.metalXD;
        for(let b=0;b<3;b++)ctx.fillRect(wx+b*(wiW/3),wy,1,wiH);
        ctx.fillRect(wx,wy+wiH/2,wiW,1);
      }

      // ── 6. 'MINING' stencil + spray-painted ₿ graffiti ───────────────
      // Stenciled MINING (scuffed/weathered)
      ctx.fillStyle=SPAL.hazardD;
      ctx.font='bold 11px '+FONT;ctx.textAlign='center';
      ctx.fillText('MINING',rx+rw*0.5,wallTop+wallH*0.5);
      ctx.fillStyle=SPAL.hazard;
      ctx.fillText('MINING',rx+rw*0.5,wallTop+wallH*0.5-1);
      // Scuff marks
      ctx.fillStyle='rgba(0,0,0,0.3)';
      ctx.fillRect(rx+rw*0.5-20,wallTop+wallH*0.5-2,3,1);
      ctx.fillRect(rx+rw*0.5+15,wallTop+wallH*0.5-3,4,1);

      // Spray-paint ₿ graffiti (with drip)
      const grX=rx+rw*0.87, grY=wallTop+wallH*0.42;
      ctx.fillStyle=SPAL.orange;
      ctx.font='bold 14px '+FONT;ctx.textAlign='center';
      ctx.fillText('₿',grX,grY);
      ctx.fillStyle=SPAL.orangeL;
      ctx.fillText('₿',grX-1,grY-1);
      // Paint drip
      ctx.fillStyle=SPAL.orange;
      ctx.fillRect(grX-1,grY,1,6);
      ctx.fillStyle=SPAL.orangeL;
      ctx.fillRect(grX+3,grY-2,1,4);
      // Spray splatter dots
      for(let sp=0;sp<6;sp++){
        const spa=_svRand(d.x,d.y,sp*17);
        ctx.fillStyle=`rgba(247,147,26,${0.3+spa*0.4})`;
        ctx.fillRect(grX-6+spa*12,grY-6+_svRand(d.x,d.y,sp*19)*12,1,1);
      }

      // ── 7. WARNING SIGNS ─────────────────────────────────────────────
      // High voltage sign (triangle)
      const hvX=rx+rw*0.85, hvY=wallTop+wallH*0.15;
      ctx.fillStyle=SPAL.metalXD;
      ctx.beginPath();
      ctx.moveTo(hvX,hvY);ctx.lineTo(hvX+10,hvY+9);ctx.lineTo(hvX-10,hvY+9);
      ctx.closePath();ctx.fill();
      ctx.fillStyle=SPAL.hazard;
      ctx.beginPath();
      ctx.moveTo(hvX,hvY+1);ctx.lineTo(hvX+9,hvY+8);ctx.lineTo(hvX-9,hvY+8);
      ctx.closePath();ctx.fill();
      // Lightning bolt icon
      ctx.fillStyle=SPAL.metalXD;
      ctx.beginPath();
      ctx.moveTo(hvX+1,hvY+3);ctx.lineTo(hvX-2,hvY+5);ctx.lineTo(hvX,hvY+5);ctx.lineTo(hvX-1,hvY+7);ctx.lineTo(hvX+2,hvY+5);ctx.lineTo(hvX,hvY+5);
      ctx.closePath();ctx.fill();

      // ── 8. ELECTRICAL BREAKER BOX on wall (left side) ────────────────
      const ebX=rx+4, ebY=wallTop+wallH*0.2;
      ctx.fillStyle=SPAL.metalXD;
      ctx.fillRect(ebX-1,ebY-1,12,16);
      ctx.fillStyle=SPAL.metal;
      ctx.fillRect(ebX,ebY,10,14);
      ctx.fillStyle=SPAL.metalL;
      ctx.fillRect(ebX,ebY,10,1);
      // Lock
      ctx.fillStyle=SPAL.metalXL;
      ctx.fillRect(ebX+8,ebY+6,1,2);
      // Warning label
      ctx.fillStyle=SPAL.hazard;
      ctx.fillRect(ebX+1,ebY+2,8,3);
      ctx.fillStyle=SPAL.metalXD;
      ctx.fillRect(ebX+2,ebY+3,1,1);
      ctx.fillRect(ebX+4,ebY+3,2,1);
      ctx.fillRect(ebX+7,ebY+3,1,1);
      // Conduit pipe going up
      ctx.fillStyle=SPAL.metalD;
      ctx.fillRect(ebX+4,wallTop-2,2,ebY-wallTop+2);
      ctx.fillStyle=SPAL.metalL;
      ctx.fillRect(ebX+4,wallTop-2,1,ebY-wallTop+2);

      // ── 9. THICK CABLE BUNDLES from right wall snaking to the ground ─
      ctx.strokeStyle=SPAL.cable;ctx.lineWidth=4;
      for(let cbi=0;cbi<3;cbi++){
        const cbStartY=wallTop+wallH*0.4+cbi*6;
        ctx.beginPath();
        ctx.moveTo(rx+rw,cbStartY);
        ctx.quadraticCurveTo(rx+rw+8,cbStartY+15,rx+rw+18,wallBot+8+cbi*2);
        ctx.stroke();
      }
      ctx.strokeStyle='#3A3A3A';ctx.lineWidth=1.5;
      for(let cbi=0;cbi<3;cbi++){
        const cbStartY=wallTop+wallH*0.4+cbi*6+0.5;
        ctx.beginPath();
        ctx.moveTo(rx+rw,cbStartY);
        ctx.quadraticCurveTo(rx+rw+8,cbStartY+15,rx+rw+18,wallBot+8+cbi*2);
        ctx.stroke();
      }

      // ── 10. BIG INDUSTRIAL EXHAUST VENT w/ heavy heat shimmer ────────
      const evX=rx+rw-22, evY=wallTop+wallH*0.15;
      const evW=14, evH=14;
      ctx.fillStyle=SPAL.metalXD;
      ctx.fillRect(evX-2,evY-2,evW+4,evH+4);
      ctx.fillStyle=SPAL.metalD;
      ctx.fillRect(evX,evY,evW,evH);
      // Horizontal louver slats
      for(let lv=0;lv<4;lv++){
        ctx.fillStyle=SPAL.metal;
        ctx.fillRect(evX+1,evY+2+lv*3,evW-2,1);
        ctx.fillStyle=SPAL.metalL;
        ctx.fillRect(evX+1,evY+2+lv*3,evW-2,1);
      }
      // Heavy heat shimmer rising above
      for(let hs=0;hs<4;hs++){
        const hsA=0.12-hs*0.02+Math.sin(t*4+hs)*0.04;
        const hsY=evY-5-hs*4-((t*3+hs)%3);
        const hsXO=Math.sin(t*2+hs*1.2)*2;
        ctx.fillStyle=`rgba(255,200,140,${hsA})`;
        ctx.fillRect(evX+2+hsXO,hsY,evW-4,2);
      }

      // ── 11. HEAVY METAL PERSONNEL DOOR (keeps gameplay hitbox) ───────
      const dW4=ST,dH4=ST+12;
      const dX4=rx+Math.floor(rw/2)+ST/2;  // shifted right of garage door
      const dY4=wallBot-dH4;
      // Deep door frame
      ctx.fillStyle=SPAL.metalXD;
      ctx.fillRect(dX4-5,dY4-2,dW4+10,dH4+2);
      // Door body
      ctx.fillStyle=SPAL.metalD;
      ctx.fillRect(dX4-2,dY4,dW4+4,dH4);
      ctx.fillStyle=SPAL.metal;
      ctx.fillRect(dX4,dY4+2,dW4,dH4-2);
      // Orange hazard stripe across top of door
      for(let wi=0;wi<Math.ceil(dW4/5);wi++){
        ctx.fillStyle=wi%2===0?SPAL.hazard:SPAL.metalXD;
        ctx.fillRect(dX4+wi*5,dY4+2,5,3);
      }
      // Door observation window (small slit)
      ctx.fillStyle=SPAL.metalXD;
      ctx.fillRect(dX4+4,dY4+10,dW4-8,6);
      ctx.fillStyle=`rgba(60,140,220,${0.2+Math.sin(_now/200)*0.1})`;
      ctx.fillRect(dX4+5,dY4+11,dW4-10,4);
      // 3 bars across the observation slit
      ctx.fillStyle=SPAL.metalD;
      for(let sb=0;sb<3;sb++)ctx.fillRect(dX4+5+sb*((dW4-10)/3),dY4+11,1,4);
      // Door rivets/bolts around edges
      ctx.fillStyle=SPAL.metalL;
      for(let r=0;r<4;r++){
        ctx.fillRect(dX4+1,dY4+6+r*10,2,2);
        ctx.fillRect(dX4+dW4-3,dY4+6+r*10,2,2);
      }
      // Vertical bar handle
      ctx.fillStyle=SPAL.metalXD;
      ctx.fillRect(dX4+dW4-10,dY4+dH4/2-4,5,18);
      ctx.fillStyle=SPAL.metalXL;
      ctx.fillRect(dX4+dW4-9,dY4+dH4/2-3,3,16);
      ctx.fillStyle=SPAL.metalD;
      ctx.fillRect(dX4+dW4-9,dY4+dH4/2+10,3,1);
      // Door kick plate
      ctx.fillStyle=SPAL.metalXD;
      ctx.fillRect(dX4,dY4+dH4-6,dW4,4);
      ctx.fillStyle=SPAL.metal;
      ctx.fillRect(dX4,dY4+dH4-6,dW4,1);
      // Metal grate mat
      ctx.fillStyle=SPAL.metalD;
      ctx.fillRect(dX4-6,wallBot+2,dW4+12,6);
      ctx.fillStyle=SPAL.metalXD;
      for(let gi=0;gi<4;gi++){
        ctx.fillRect(dX4-6,wallBot+3+gi,dW4+12,1);
      }

      // ── 12. PALLET of shrink-wrapped ASICs (left of garage door) ─────
      const plX=rx-18, plY=wallBot-14;
      // Wooden pallet
      ctx.fillStyle='#6A4828';
      ctx.fillRect(plX,plY+10,18,4);
      ctx.fillStyle='#4A3018';
      ctx.fillRect(plX,plY+14,18,1);
      // Pallet gaps
      ctx.fillStyle='#3A2010';
      for(let pg=0;pg<3;pg++)ctx.fillRect(plX+2+pg*5,plY+11,1,3);
      // Shrink-wrapped box on top
      ctx.fillStyle='#8A8A90';
      ctx.fillRect(plX+1,plY,16,11);
      ctx.fillStyle='rgba(200,220,240,0.3)';
      ctx.fillRect(plX+2,plY+1,14,9); // plastic wrap sheen
      ctx.fillStyle='rgba(255,255,255,0.25)';
      ctx.fillRect(plX+2,plY+1,4,9); // highlight
      // Label on the box
      ctx.fillStyle=SPAL.orange;
      ctx.fillRect(plX+6,plY+3,6,3);
      ctx.fillStyle='#FFF';
      ctx.fillRect(plX+7,plY+4,1,1);
      // Box strapping
      ctx.fillStyle='#2A2A2A';
      ctx.fillRect(plX+1,plY+5,16,1);

      // ── 13. METAL ROOF w/ multiple industrial fixtures ───────────────
      const roofY=ry-5;
      const roofH=ST+8;
      // Base roof slab (slightly sloped look)
      ctx.fillStyle=SPAL.metalD;
      ctx.fillRect(rx-8,roofY,rw+16,roofH);
      ctx.fillStyle=SPAL.metal;
      ctx.fillRect(rx-8,roofY+1,rw+16,roofH-2);
      // Corrugated roof panels
      for(let p=0;p<Math.ceil((rw+16)/6);p++){
        ctx.fillStyle=p%2===0?SPAL.metalL:SPAL.metal;
        ctx.fillRect(rx-8+p*6,roofY+1,5,roofH-2);
        ctx.fillStyle=SPAL.metalD;
        ctx.fillRect(rx-8+p*6+5,roofY+1,1,roofH-2);
      }
      // Front eave
      ctx.fillStyle=SPAL.metalXD;
      ctx.fillRect(rx-10,roofY+roofH-2,rw+20,3);
      ctx.fillStyle=SPAL.metalXL;
      ctx.fillRect(rx-10,roofY+roofH-2,rw+20,1);
      // Eave shadow
      ctx.fillStyle='rgba(0,0,0,0.35)';
      ctx.fillRect(rx-10,roofY+roofH+1,rw+20,3);

      // ── 14. HVAC COOLING UNIT w/ spinning fan ────────────────────────
      const hvcX=rx+rw*0.15, hvcY=roofY-18;
      const hvcW=26, hvcH=18;
      // Unit housing
      ctx.fillStyle=SPAL.metalD;
      ctx.fillRect(hvcX-1,hvcY-1,hvcW+2,hvcH+2);
      ctx.fillStyle=SPAL.metal;
      ctx.fillRect(hvcX,hvcY,hvcW,hvcH);
      ctx.fillStyle=SPAL.metalL;
      ctx.fillRect(hvcX,hvcY,hvcW,1);
      // Louvered side panels
      ctx.fillStyle=SPAL.metalD;
      for(let lv=0;lv<5;lv++){
        ctx.fillRect(hvcX+2,hvcY+3+lv*2,6,1);
        ctx.fillRect(hvcX+hvcW-8,hvcY+3+lv*2,6,1);
      }
      // Spinning fan (center)
      const fanCX=hvcX+hvcW/2, fanCY=hvcY+hvcH/2;
      ctx.fillStyle=SPAL.metalXD;
      ctx.beginPath();ctx.arc(fanCX,fanCY,7,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=SPAL.metalD;
      ctx.beginPath();ctx.arc(fanCX,fanCY,6,0,Math.PI*2);ctx.fill();
      // Fan blades (rotating)
      const fanRot=_now/40;
      ctx.save();
      ctx.translate(fanCX,fanCY);
      ctx.rotate(fanRot);
      ctx.fillStyle=SPAL.metalL;
      for(let bl=0;bl<4;bl++){
        ctx.save();
        ctx.rotate(bl*Math.PI/2);
        ctx.beginPath();
        ctx.moveTo(0,0);
        ctx.lineTo(5,-1);ctx.lineTo(5,1);
        ctx.closePath();ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle=SPAL.metalXD;
      ctx.beginPath();ctx.arc(0,0,1.5,0,Math.PI*2);ctx.fill();
      ctx.restore();
      // Unit label (orange stripe)
      ctx.fillStyle=SPAL.orange;
      ctx.fillRect(hvcX,hvcY+hvcH-3,hvcW,2);

      // ── 15. SMOKE STACK / VENT PIPE w/ steam ─────────────────────────
      const vpX=rx+rw*0.45, vpY=roofY-20;
      ctx.fillStyle=SPAL.metalXD;
      ctx.fillRect(vpX-1,vpY,8,20);
      ctx.fillStyle=SPAL.metal;
      ctx.fillRect(vpX,vpY,6,20);
      ctx.fillStyle=SPAL.metalL;
      ctx.fillRect(vpX,vpY,1,20);
      // Cap
      ctx.fillStyle=SPAL.metalXD;
      ctx.fillRect(vpX-3,vpY-3,12,4);
      ctx.fillStyle=SPAL.metal;
      ctx.fillRect(vpX-3,vpY-3,12,1);
      // Animated steam
      for(let sm=0;sm<5;sm++){
        const smA=0.25-sm*0.04+Math.sin(t*2+sm)*0.06;
        const smY=vpY-6-sm*8-((t*10+sm*5)%10);
        const smXo=Math.sin(t+sm*1.3)*3;
        ctx.fillStyle=`rgba(220,220,230,${smA})`;
        ctx.beginPath();ctx.arc(vpX+3+smXo,smY,3+sm*0.8,0,Math.PI*2);ctx.fill();
        ctx.fillStyle=`rgba(255,255,255,${smA*0.4})`;
        ctx.beginPath();ctx.arc(vpX+3+smXo-1,smY-1,2,0,Math.PI*2);ctx.fill();
      }

      // ── 16. SATELLITE DISH ───────────────────────────────────────────
      const dshX=rx+rw*0.72, dshY=roofY-14;
      // Mast
      ctx.fillStyle=SPAL.metalXD;
      ctx.fillRect(dshX,dshY,2,14);
      ctx.fillStyle=SPAL.metalL;
      ctx.fillRect(dshX,dshY,1,14);
      // Dish (angled)
      ctx.fillStyle=SPAL.metalD;
      ctx.beginPath();
      ctx.ellipse(dshX-3,dshY,6,4,0,0,Math.PI*2);
      ctx.fill();
      ctx.fillStyle=SPAL.metal;
      ctx.beginPath();
      ctx.ellipse(dshX-3,dshY,5,3,0,0,Math.PI*2);
      ctx.fill();
      ctx.fillStyle=SPAL.metalL;
      ctx.beginPath();
      ctx.ellipse(dshX-4,dshY-1,3,1.5,0,0,Math.PI*2);
      ctx.fill();
      // LNB on front
      ctx.fillStyle=SPAL.metalXD;
      ctx.fillRect(dshX-5,dshY-1,4,2);

      // ── 17. ANTENNAE ARRAY (3 antennas, varying heights) ─────────────
      for(let an=0;an<3;an++){
        const anX=rx+rw*0.88+an*3;
        const anH=10+an*4;
        ctx.fillStyle=SPAL.metalXD;
        ctx.fillRect(anX,roofY-anH,1,anH);
        // Cross bars
        ctx.fillStyle=SPAL.metalL;
        ctx.fillRect(anX-1,roofY-anH+2,3,1);
        ctx.fillRect(anX-2,roofY-anH+5,5,1);
        // Blinking tip LED
        const tipOn=Math.floor(_now/700+an)%2===0;
        ctx.fillStyle=tipOn?'#FF4040':'#401010';
        ctx.fillRect(anX-0.5,roofY-anH-1,2,2);
        if(tipOn){
          ctx.fillStyle='rgba(255,60,60,0.3)';
          ctx.beginPath();ctx.arc(anX,roofY-anH,3,0,Math.PI*2);ctx.fill();
        }
      }

      // ── 18. SOLAR PANEL on roof (angled) ─────────────────────────────
      const spX=rx+rw*0.32, spY=roofY-10;
      ctx.fillStyle=SPAL.metalD;
      ctx.fillRect(spX-1,spY,20,10);
      ctx.fillStyle='#1A3050';
      ctx.fillRect(spX,spY+1,18,8);
      // Solar cells grid
      ctx.fillStyle='#2A4880';
      for(let sc=0;sc<4;sc++){
        for(let sr=0;sr<2;sr++){
          ctx.fillRect(spX+1+sc*4.5,spY+2+sr*4,4,3);
        }
      }
      // Sun glint
      if(_hour>=6&&_hour<=20){
        ctx.fillStyle='rgba(255,255,200,0.3)';
        ctx.fillRect(spX+2,spY+2,6,2);
      }
      // Support legs
      ctx.fillStyle=SPAL.metalXD;
      ctx.fillRect(spX+2,spY+10,1,3);
      ctx.fillRect(spX+17,spY+10,1,3);

      // ── 19. SECURITY CAMERA (swivel) ─────────────────────────────────
      const scX=rx+rw-4, scY=roofY+3;
      ctx.fillStyle=SPAL.metalXD;
      ctx.fillRect(scX-1,scY,3,3);
      ctx.fillStyle=SPAL.metalD;
      ctx.fillRect(scX-1,scY+3,3,4);
      // Camera lens body
      const camSwing=Math.sin(t*0.4)*2;
      ctx.fillStyle=SPAL.metalD;
      ctx.fillRect(scX-4+camSwing,scY+5,7,4);
      ctx.fillStyle=SPAL.metalXL;
      ctx.fillRect(scX-4+camSwing,scY+5,7,1);
      // Lens
      ctx.fillStyle='#1A1A1A';
      ctx.beginPath();ctx.arc(scX-3+camSwing,scY+7,1.5,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#E04040';
      ctx.fillRect(scX-4+camSwing,scY+5,1,1); // rec light

      // ── 20. Multi-LED strip along roof edge ──────────────────────────
      for(let ld=0;ld<Math.floor(rw/8);ld++){
        const ldX=rx+4+ld*8;
        const ldOn=(Math.floor(_now/(200+ld*30))+ld)%3===0;
        ctx.fillStyle=ldOn?SPAL.led:SPAL.ledD;
        ctx.fillRect(ldX,roofY+roofH-1,2,1);
      }
      // Old corner blinking red LED (kept for character)
      const ledOn=Math.floor(_now/500)%2===0;
      ctx.fillStyle=ledOn?'#FF2020':'#600000';
      ctx.beginPath();ctx.arc(rx+rw*0.08,roofY+3,3,0,Math.PI*2);ctx.fill();
      if(ledOn){
        ctx.fillStyle='rgba(255,0,0,0.35)';
        ctx.beginPath();ctx.arc(rx+rw*0.08,roofY+3,7,0,Math.PI*2);ctx.fill();
      }

      // ── 21. AMBIENT HEAT SHIMMER rising off the entire roof ──────────
      for(let sh=0;sh<6;sh++){
        const shX=rx+_svRand(d.x,d.y,sh*29)*rw;
        const shPhase=(t*2+sh*0.7)%4;
        const shY=roofY-4-shPhase*5;
        ctx.fillStyle=`rgba(255,180,100,${(1-shPhase/4)*0.1})`;
        ctx.fillRect(shX,shY,2,1);
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

    // ── HALL (Town Hall) — Grand civic stone building w/ columns ─────────
    else if(d.label==='hall'){
      const HPAL={
        stone:'#7A7A84', stoneL:'#9A9AA4', stoneXL:'#B4B4BE', stoneD:'#4A4A54', stoneXD:'#2A2A34',
        marble:'#D8D8E0', marbleL:'#F0F0F4', marbleD:'#A8A8B4',
        oak:'#2A1808', oakL:'#4A2810', oakXL:'#6A3818',
        brass:'#C8A020', brassL:'#F8D040', brassD:'#8A6810',
        slate:'#3A3A48', slateL:'#5A5A68', slateXL:'#7A7A88', slateD:'#1A1A24',
        fire:'rgba(255,140,40,0.85)', fireBright:'rgba(255,200,100,0.95)',
        winGlow2:'rgba(255,220,140,0.7)',
      };
      const wallTop=ry+ST;
      const wallBot=ry+bh-16;
      const wallH=wallBot-wallTop;

      // ── 1. MASSIVE STEPPED STONE FOUNDATION (plinth) ─────────────────
      const plY=wallBot;
      // Outer bottom step
      ctx.fillStyle=HPAL.stoneXD;
      ctx.fillRect(rx-8,plY+10,rw+16,8);
      ctx.fillStyle=HPAL.stone;
      ctx.fillRect(rx-8,plY+10,rw+16,2);
      ctx.fillStyle=HPAL.stoneD;
      ctx.fillRect(rx-8,plY+17,rw+16,1);
      // Middle step
      ctx.fillStyle=HPAL.stoneXD;
      ctx.fillRect(rx-5,plY+3,rw+10,10);
      ctx.fillStyle=HPAL.stoneL;
      ctx.fillRect(rx-5,plY+3,rw+10,2);
      ctx.fillStyle=HPAL.stoneD;
      ctx.fillRect(rx-5,plY+12,rw+10,1);
      // Base course
      ctx.fillStyle=HPAL.stoneXD;
      ctx.fillRect(rx-2,plY-2,rw+4,7);
      ctx.fillStyle=HPAL.stoneL;
      ctx.fillRect(rx-2,plY-2,rw+4,2);

      // ── 2. ASHLAR STONE WALL (big cut blocks) ────────────────────────
      ctx.fillStyle=HPAL.stoneD;ctx.fillRect(rx,wallTop,rw,wallH);
      const blockH=11;
      for(let row=0;row<Math.ceil(wallH/blockH);row++){
        const rowY=wallTop+row*blockH;
        const offset=row%2===0?0:12;
        for(let col=0;col<Math.ceil(rw/24)+1;col++){
          const bx=rx+col*24+offset;
          if(bx>rx+rw)continue;
          const r=_svRand(d.x,d.y,row*19+col+200);
          // Three shade variants for natural stone
          ctx.fillStyle=r>0.66?HPAL.stoneL:r>0.33?HPAL.stone:HPAL.stoneD;
          ctx.fillRect(bx,rowY,23,blockH-1);
          // Top-edge highlight
          ctx.fillStyle='rgba(255,255,255,0.09)';
          ctx.fillRect(bx,rowY,23,1);
          // Right-edge shadow (mortar)
          ctx.fillStyle=HPAL.stoneXD;
          ctx.fillRect(bx+23,rowY,1,blockH-1);
          // Tiny weathering dot
          if(r>0.8){
            ctx.fillStyle='rgba(0,0,0,0.18)';
            ctx.fillRect(bx+2+Math.floor(r*16),rowY+2+Math.floor(r*6),1,1);
          }
        }
        // Mortar line below the row
        ctx.fillStyle='rgba(0,0,0,0.3)';
        ctx.fillRect(rx,rowY+blockH-1,rw,1);
      }

      // ── 3. RUSTICATED CORNER QUOINS (bigger chunkier corner stones) ──
      const qW=9, qH=13;
      for(const qx of [rx-3,rx+rw-qW+3]){
        for(let qRow=0;qRow<Math.ceil(wallH/qH);qRow++){
          const qy=wallTop+qRow*qH;
          const shift=qRow%2===0?0:3;
          ctx.fillStyle=HPAL.stoneXD;
          ctx.fillRect(qx-1+shift,qy-1,qW+2,qH);
          ctx.fillStyle=HPAL.stoneL;
          ctx.fillRect(qx+shift,qy,qW,qH-2);
          // Top highlight
          ctx.fillStyle=HPAL.stoneXL;
          ctx.fillRect(qx+shift,qy,qW,2);
          // Right shadow
          ctx.fillStyle=HPAL.stoneD;
          ctx.fillRect(qx+qW-1+shift,qy,1,qH-2);
        }
      }

      // ── 4. TALL ARCHED WINDOWS (2 pairs, leaded glass) ───────────────
      const winCount=4;
      const winW=ST-10, winH=wallH*0.55;
      const winSpacing=rw/(winCount+1);
      for(let wi=0;wi<winCount;wi++){
        // Skip middle two (center is door area). Only draw at positions 0,1 & 2,3 but spread around middle
        const idx=wi<2?wi:wi+1; // skip position 2 for door
        const wx=rx+winSpacing*(idx+1)-winW/2;
        const wy=wallTop+wallH*0.2;

        // Deep stone sill
        ctx.fillStyle=HPAL.stoneXD;
        ctx.fillRect(wx-4,wy+winH+1,winW+8,3);
        ctx.fillStyle=HPAL.stoneL;
        ctx.fillRect(wx-4,wy+winH+1,winW+8,1);
        // Stone window surround (rectangular part)
        ctx.fillStyle=HPAL.stoneXD;
        ctx.fillRect(wx-3,wy,winW+6,winH+1);
        ctx.fillStyle=HPAL.stoneL;
        ctx.fillRect(wx-3,wy,1,winH+1);ctx.fillRect(wx-3,wy,winW+6,1);
        // Arch (top half-circle)
        ctx.fillStyle=HPAL.stoneXD;
        ctx.beginPath();ctx.arc(wx+winW/2,wy,winW/2+3,Math.PI,0);ctx.fill();
        ctx.fillStyle=HPAL.stoneL;
        ctx.beginPath();ctx.arc(wx+winW/2,wy,winW/2+3,Math.PI,Math.PI*1.3);ctx.stroke();
        // Keystone at top of arch
        ctx.fillStyle=HPAL.stoneXL;
        ctx.fillRect(wx+winW/2-2,wy-winW/2-4,4,5);
        ctx.fillStyle=HPAL.stoneD;
        ctx.fillRect(wx+winW/2-2,wy-winW/2-4,1,5);
        ctx.fillRect(wx+winW/2+1,wy-winW/2-4,1,5);

        // Glass - warm interior light (brighter when lit at night)
        const gGrad=ctx.createLinearGradient(wx,wy,wx,wy+winH);
        gGrad.addColorStop(0,'rgba(255,210,120,0.65)');
        gGrad.addColorStop(0.5,'rgba(255,180,70,0.8)');
        gGrad.addColorStop(1,'rgba(180,120,40,0.75)');
        ctx.fillStyle=gGrad;
        ctx.fillRect(wx,wy,winW,winH);
        // Arched glass top
        ctx.fillStyle=gGrad;
        ctx.beginPath();ctx.arc(wx+winW/2,wy,winW/2,Math.PI,0);ctx.fill();

        // Mullions — vertical center
        ctx.fillStyle=HPAL.oak;
        ctx.fillRect(wx+winW/2-1,wy,2,winH);
        // 3 horizontal transoms
        for(let tr=1;tr<4;tr++){
          ctx.fillRect(wx,wy+(winH/4)*tr-0.5,winW,1);
        }
        // Leaded diamond cross pattern
        ctx.strokeStyle=HPAL.stoneXD;ctx.lineWidth=1;
        ctx.save();
        ctx.beginPath();ctx.rect(wx,wy,winW,winH);ctx.clip();
        for(let off=-winH;off<winW;off+=5){
          ctx.beginPath();
          ctx.moveTo(wx+off,wy);ctx.lineTo(wx+off+winH,wy+winH);
          ctx.stroke();
        }
        for(let off=0;off<winW+winH;off+=5){
          ctx.beginPath();
          ctx.moveTo(wx+off,wy);ctx.lineTo(wx+off-winH,wy+winH);
          ctx.stroke();
        }
        ctx.restore();

        // Glare
        ctx.fillStyle='rgba(255,255,255,0.18)';
        ctx.fillRect(wx+1,wy+1,winW*0.35,winH*0.35);

        // Light pool at night
        if(isNight){
          const pulseI=0.2+Math.sin(_t*1.4+wx)*0.06;
          ctx.fillStyle=`rgba(255,200,100,${pulseI*0.4})`;
          ctx.beginPath();ctx.ellipse(wx+winW/2,wallBot+10,winW*1.4,12,0,0,Math.PI*2);ctx.fill();
        }
      }

      // ── 5. GRAND PORTICO — 4 FLUTED COLUMNS + PEDIMENT ───────────────
      const porT=wallBot-ST*1.7;  // portico top (where pediment sits)
      const porB=wallBot;          // portico bottom (column bases)
      const colCount=4;
      const porW=rw*0.6, porX=rx+rw*0.2;
      const colSpacing=porW/(colCount-1);

      // Back wall of portico (darker recessed area)
      ctx.fillStyle='rgba(0,0,0,0.3)';
      ctx.fillRect(porX,porT,porW,porB-porT);

      // Portico floor (marble slab)
      ctx.fillStyle=HPAL.marbleD;
      ctx.fillRect(porX-4,porB-2,porW+8,5);
      ctx.fillStyle=HPAL.marble;
      ctx.fillRect(porX-4,porB-2,porW+8,2);
      // Floor tile lines
      ctx.fillStyle=HPAL.marbleD;
      for(let i=0;i<5;i++)ctx.fillRect(porX-4+i*((porW+8)/5),porB-2,1,5);

      // Columns
      const colBaseH=4, colCapH=5, colShaftH=porB-porT-colBaseH-colCapH-2;
      for(let ci=0;ci<colCount;ci++){
        const cx2=porX+ci*colSpacing-3;
        const colY2=porT+2;
        // Base (wider plinth)
        ctx.fillStyle=HPAL.stoneXD;
        ctx.fillRect(cx2-2,colY2+colCapH+colShaftH,10,colBaseH);
        ctx.fillStyle=HPAL.marbleD;
        ctx.fillRect(cx2-2,colY2+colCapH+colShaftH,10,colBaseH-1);
        ctx.fillStyle=HPAL.marble;
        ctx.fillRect(cx2-2,colY2+colCapH+colShaftH,10,1);
        // Shaft (fluted — alternating light/dark stripes for flutes)
        ctx.fillStyle=HPAL.marbleD;
        ctx.fillRect(cx2,colY2+colCapH,6,colShaftH);
        // 3 flutes (vertical highlights)
        ctx.fillStyle=HPAL.marble;
        ctx.fillRect(cx2,colY2+colCapH,1,colShaftH);
        ctx.fillRect(cx2+2,colY2+colCapH,1,colShaftH);
        ctx.fillRect(cx2+4,colY2+colCapH,1,colShaftH);
        ctx.fillStyle=HPAL.marbleL;
        ctx.fillRect(cx2,colY2+colCapH,1,2); // top glint
        // Shadow on right
        ctx.fillStyle=HPAL.stoneD;
        ctx.fillRect(cx2+5,colY2+colCapH,1,colShaftH);
        // Capital (Doric-style flared top)
        ctx.fillStyle=HPAL.stoneXD;
        ctx.fillRect(cx2-3,colY2,12,colCapH);
        ctx.fillStyle=HPAL.marbleD;
        ctx.fillRect(cx2-3,colY2+1,12,colCapH-1);
        ctx.fillStyle=HPAL.marble;
        ctx.fillRect(cx2-3,colY2+1,12,1);
        // Abacus (top flat piece)
        ctx.fillStyle=HPAL.marbleL;
        ctx.fillRect(cx2-4,colY2,14,2);
        ctx.fillStyle=HPAL.stoneD;
        ctx.fillRect(cx2-4,colY2+1,14,1);
      }

      // ── 6. TRIANGULAR PEDIMENT (entablature + gable) ─────────────────
      // Architrave/frieze (horizontal band just above columns)
      const entY=porT-9;
      ctx.fillStyle=HPAL.stoneXD;
      ctx.fillRect(porX-8,entY,porW+16,9);
      ctx.fillStyle=HPAL.marbleD;
      ctx.fillRect(porX-8,entY+1,porW+16,7);
      ctx.fillStyle=HPAL.marble;
      ctx.fillRect(porX-8,entY+1,porW+16,1);
      ctx.fillStyle=HPAL.stoneD;
      ctx.fillRect(porX-8,entY+8,porW+16,1);
      // Triglyphs (decorative vertical notches along frieze)
      ctx.fillStyle=HPAL.stoneD;
      for(let tg=0;tg<Math.floor((porW+16)/12);tg++){
        const tgX=porX-8+tg*12+4;
        ctx.fillRect(tgX,entY+2,1,5);
        ctx.fillRect(tgX+2,entY+2,1,5);
        ctx.fillRect(tgX+4,entY+2,1,5);
      }

      // Pediment triangle
      const pedW=porW+20, pedX=porX-10;
      const pedPeakY=entY-ST*0.75;
      ctx.fillStyle=HPAL.stoneXD;
      ctx.beginPath();
      ctx.moveTo(pedX,entY);ctx.lineTo(pedX+pedW/2,pedPeakY);ctx.lineTo(pedX+pedW,entY);
      ctx.closePath();ctx.fill();
      // Inner pediment fill (slightly lighter)
      ctx.fillStyle=HPAL.marbleD;
      ctx.beginPath();
      ctx.moveTo(pedX+3,entY-1);ctx.lineTo(pedX+pedW/2,pedPeakY+3);ctx.lineTo(pedX+pedW-3,entY-1);
      ctx.closePath();ctx.fill();
      // Top highlight along left slope
      ctx.strokeStyle=HPAL.marble;ctx.lineWidth=1;
      ctx.beginPath();
      ctx.moveTo(pedX+4,entY-1);ctx.lineTo(pedX+pedW/2,pedPeakY+3);
      ctx.stroke();

      // Clock face in pediment (bigger, marble with brass details)
      const clkX=pedX+pedW/2,clkY=entY-ST*0.4;const clkR=ST*0.24;
      // Recessed dark background
      ctx.fillStyle=HPAL.stoneXD;
      ctx.beginPath();ctx.arc(clkX,clkY,clkR+3,0,Math.PI*2);ctx.fill();
      // Marble face
      ctx.fillStyle=HPAL.marbleL;
      ctx.beginPath();ctx.arc(clkX,clkY,clkR,0,Math.PI*2);ctx.fill();
      // Brass rim
      ctx.strokeStyle=HPAL.brass;ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(clkX,clkY,clkR,0,Math.PI*2);ctx.stroke();
      ctx.strokeStyle=HPAL.brassL;ctx.lineWidth=1;
      ctx.beginPath();ctx.arc(clkX,clkY,clkR-1,0,Math.PI*2);ctx.stroke();
      // Roman numeral ticks (longer at 12/3/6/9)
      for(let h=0;h<12;h++){
        const ang=h/12*Math.PI*2-Math.PI/2;
        ctx.fillStyle='#2A2030';
        const len=(h%3===0)?4:2;
        ctx.fillRect(clkX+Math.cos(ang)*(clkR-len)-1,clkY+Math.sin(ang)*(clkR-len)-1,2,2);
      }
      // Clock hands
      const clkHr=getHour()%12,clkMin=(getHour()-Math.floor(getHour()))*60;
      const hAng=(clkHr/12+clkMin/720)*Math.PI*2-Math.PI/2;
      const mAng=clkMin/60*Math.PI*2-Math.PI/2;
      ctx.strokeStyle='#2A2030';ctx.lineWidth=2;ctx.lineCap='round';
      ctx.beginPath();ctx.moveTo(clkX,clkY);ctx.lineTo(clkX+Math.cos(hAng)*(clkR-5),clkY+Math.sin(hAng)*(clkR-5));ctx.stroke();
      ctx.lineWidth=1.5;
      ctx.beginPath();ctx.moveTo(clkX,clkY);ctx.lineTo(clkX+Math.cos(mAng)*(clkR-2),clkY+Math.sin(mAng)*(clkR-2));ctx.stroke();
      ctx.lineCap='butt';
      // Center hub
      ctx.fillStyle=HPAL.brass;
      ctx.beginPath();ctx.arc(clkX,clkY,2,0,Math.PI*2);ctx.fill();

      // ── 7. GRAND DOUBLE DOORS (oak w/ brass studs) ───────────────────
      const gdW=ST+6, gdH=ST*1.3;
      const gdX=rx+rw/2-gdW/2, gdY=wallBot-gdH;
      // Stone lintel above door with 'TOWN HALL' carved inscription
      const lntY=gdY-14, lntH=14;
      ctx.fillStyle=HPAL.stoneXD;
      ctx.fillRect(gdX-10,lntY,gdW+20,lntH);
      ctx.fillStyle=HPAL.stoneL;
      ctx.fillRect(gdX-10,lntY,gdW+20,2);
      ctx.fillStyle=HPAL.stone;
      ctx.fillRect(gdX-10,lntY+2,gdW+20,10);
      ctx.fillStyle=HPAL.stoneD;
      ctx.fillRect(gdX-10,lntY+12,gdW+20,2);
      // Carved text (darker inset)
      ctx.fillStyle='rgba(30,25,40,0.85)';
      ctx.font='bold 8px '+FONT;ctx.textAlign='center';
      ctx.fillText('TOWN HALL',gdX+gdW/2,lntY+10);
      ctx.fillStyle='rgba(255,255,255,0.12)';
      ctx.fillText('TOWN HALL',gdX+gdW/2,lntY+9);

      // Door frame (stone reveal)
      ctx.fillStyle=HPAL.stoneXD;
      ctx.fillRect(gdX-4,gdY-2,gdW+8,gdH+2);
      ctx.fillStyle=HPAL.stone;
      ctx.fillRect(gdX-3,gdY-1,gdW+6,gdH+1);
      ctx.fillStyle=HPAL.stoneD;
      ctx.fillRect(gdX-2,gdY,gdW+4,2);

      // Double doors — dark oak with vertical planks
      ctx.fillStyle=HPAL.oak;ctx.fillRect(gdX,gdY+1,gdW,gdH-1);
      // Left door
      ctx.fillStyle='#3A2010';ctx.fillRect(gdX+1,gdY+2,gdW/2-1,gdH-3);
      // Right door
      ctx.fillStyle='#2E1808';ctx.fillRect(gdX+gdW/2+1,gdY+2,gdW/2-2,gdH-3);
      // Center seam
      ctx.fillStyle=HPAL.oak;
      ctx.fillRect(gdX+gdW/2-1,gdY+1,2,gdH-1);
      // Vertical plank lines on each door
      ctx.fillStyle='rgba(0,0,0,0.35)';
      for(let pk=0;pk<3;pk++){
        ctx.fillRect(gdX+2+pk*(gdW/6),gdY+3,1,gdH-5);
        ctx.fillRect(gdX+gdW/2+2+pk*(gdW/6),gdY+3,1,gdH-5);
      }
      // Recessed panels (4 per door — 2x2 grid)
      ctx.fillStyle='rgba(0,0,0,0.4)';
      const panelMargin=3;
      const panelW=gdW/2-panelMargin*2-1;
      for(const sideX of [gdX+panelMargin,gdX+gdW/2+panelMargin]){
        for(let pr=0;pr<2;pr++){
          const py2=gdY+5+pr*(gdH*0.45);
          ctx.fillRect(sideX,py2,panelW,gdH*0.3);
          ctx.fillStyle='rgba(255,230,180,0.08)';
          ctx.fillRect(sideX,py2,panelW,1);
          ctx.fillRect(sideX,py2,1,gdH*0.3);
          ctx.fillStyle='rgba(0,0,0,0.4)';
        }
      }
      // Brass stud rivets around the edges
      ctx.fillStyle=HPAL.brassL;
      for(let si=0;si<6;si++){
        const sy2=gdY+4+si*(gdH-8)/5;
        ctx.fillRect(gdX+1,sy2,2,2);
        ctx.fillRect(gdX+gdW-3,sy2,2,2);
        ctx.fillRect(gdX+gdW/2-3,sy2,2,2);
        ctx.fillRect(gdX+gdW/2+1,sy2,2,2);
      }
      // Big brass ring handles
      for(const hx of [gdX+gdW/2-7,gdX+gdW/2+4]){
        ctx.fillStyle=HPAL.brassD;
        ctx.fillRect(hx-1,gdY+gdH/2-1,4,4); // plate
        ctx.strokeStyle=HPAL.brass;ctx.lineWidth=2;
        ctx.beginPath();ctx.arc(hx+1,gdY+gdH/2+4,3,0,Math.PI*2);ctx.stroke();
        ctx.strokeStyle=HPAL.brassL;ctx.lineWidth=1;
        ctx.beginPath();ctx.arc(hx+1,gdY+gdH/2+4,3,-Math.PI*0.75,-Math.PI*0.25);ctx.stroke();
      }

      // Red carpet runner from door out to portico edge
      ctx.fillStyle='#6A1010';
      ctx.fillRect(gdX-3,wallBot+3,gdW+6,18);
      ctx.fillStyle='#8A2018';
      ctx.fillRect(gdX-3,wallBot+3,gdW+6,2);
      ctx.fillStyle='#4A0808';
      ctx.fillRect(gdX-3,wallBot+20,gdW+6,1);
      // Gold trim along carpet edges
      ctx.fillStyle=HPAL.brass;
      ctx.fillRect(gdX-3,wallBot+3,1,18);
      ctx.fillRect(gdX+gdW+2,wallBot+3,1,18);

      // ── 8. TORCH SCONCES flanking the door (fire glow) ───────────────
      for(const tsSide of [-1,1]){
        const tsX=gdX+(tsSide<0?-10:gdW+8);
        const tsY=gdY+gdH*0.45;
        // Wall bracket
        ctx.fillStyle=HPAL.oak;
        ctx.fillRect(tsX-1,tsY,3,10);
        ctx.fillStyle=HPAL.brassD;
        ctx.fillRect(tsX-2,tsY-2,5,3);
        // Torch body
        ctx.fillStyle=HPAL.oakL;
        ctx.fillRect(tsX,tsY-6,2,6);
        // Flame (animated)
        const flameFlick=Math.sin(t*8+tsSide)*1.5;
        ctx.fillStyle=HPAL.fire;
        ctx.beginPath();
        ctx.moveTo(tsX-3,tsY-4);
        ctx.quadraticCurveTo(tsX+1+flameFlick,tsY-14-Math.abs(flameFlick),tsX+5,tsY-4);
        ctx.closePath();ctx.fill();
        ctx.fillStyle=HPAL.fireBright;
        ctx.beginPath();
        ctx.moveTo(tsX-1,tsY-5);
        ctx.quadraticCurveTo(tsX+1+flameFlick*0.5,tsY-10,tsX+3,tsY-5);
        ctx.closePath();ctx.fill();
        // Glow halo
        const flGrad=ctx.createRadialGradient(tsX+1,tsY-8,1,tsX+1,tsY-8,30);
        flGrad.addColorStop(0,'rgba(255,150,50,0.35)');
        flGrad.addColorStop(1,'rgba(255,150,50,0)');
        ctx.fillStyle=flGrad;
        ctx.beginPath();ctx.arc(tsX+1,tsY-8,30,0,Math.PI*2);ctx.fill();
      }

      // Stone urns flanking the steps (planters)
      for(const urnSide of [-1,1]){
        const urnX=rx+rw/2+urnSide*(porW/2+6);
        const urnY=wallBot+6;
        // Urn body (curved)
        ctx.fillStyle=HPAL.stoneXD;
        ctx.fillRect(urnX-4,urnY,9,2); // top rim
        ctx.fillStyle=HPAL.stoneL;
        ctx.fillRect(urnX-4,urnY,9,1);
        ctx.fillStyle=HPAL.stone;
        ctx.fillRect(urnX-3,urnY+2,7,8); // main body
        ctx.fillStyle=HPAL.stoneD;
        ctx.fillRect(urnX+3,urnY+2,1,8);
        ctx.fillStyle=HPAL.stoneL;
        ctx.fillRect(urnX-3,urnY+2,1,8);
        // Base
        ctx.fillStyle=HPAL.stoneXD;
        ctx.fillRect(urnX-4,urnY+10,9,3);
        ctx.fillStyle=HPAL.stone;
        ctx.fillRect(urnX-4,urnY+10,9,1);
        // Plant coming out
        ctx.fillStyle='#3A6028';
        ctx.fillRect(urnX-1,urnY-4,1,4);
        ctx.fillRect(urnX+1,urnY-5,1,5);
        ctx.fillRect(urnX+3,urnY-3,1,3);
        ctx.fillStyle='#558A30';
        ctx.fillRect(urnX-2,urnY-3,1,2);
        // Flower
        ctx.fillStyle='#F0C020';
        ctx.fillRect(urnX+1,urnY-6,2,1);
      }

      // ── 9. SLATE ROOF (hipped) w/ tile detail ────────────────────────
      const roofPeakY=ry-ST*0.4;
      const roofEaveY=wallTop;
      const roofOver=10;
      // Base fill
      ctx.fillStyle=HPAL.slateD;
      ctx.beginPath();
      ctx.moveTo(rx-roofOver,roofEaveY);
      ctx.lineTo(rx+rw*0.15,roofPeakY);
      ctx.lineTo(rx+rw*0.85,roofPeakY);
      ctx.lineTo(rx+rw+roofOver,roofEaveY);
      ctx.closePath();ctx.fill();
      // Slate tiles — horizontal bands
      for(let row=0;row<8;row++){
        const ratio=row/8;
        const topY=roofPeakY+(roofEaveY-roofPeakY)*ratio;
        const topHalfW=(rw/2+roofOver)*ratio+rw*0.35*(1-ratio);
        const bandH=(roofEaveY-roofPeakY)/8;
        // Skip to keep hipped shape
        const tileC=row%2===0?HPAL.slate:HPAL.slateL;
        ctx.fillStyle=tileC;
        ctx.fillRect(rx+rw/2-topHalfW,topY,topHalfW*2,bandH+1);
        // Individual tile separators
        ctx.fillStyle='rgba(0,0,0,0.3)';
        for(let tc=0;tc<Math.ceil(topHalfW*2/9);tc++){
          ctx.fillRect(rx+rw/2-topHalfW+tc*9+(row%2)*4,topY,1,bandH);
        }
        // Tile shadow line
        ctx.fillRect(rx+rw/2-topHalfW,topY+bandH-1,topHalfW*2,1);
      }
      // Ridge cap
      ctx.fillStyle=HPAL.slateXL;
      ctx.fillRect(rx+rw*0.15-2,roofPeakY-2,rw*0.7+4,3);
      ctx.fillStyle=HPAL.slateD;
      ctx.fillRect(rx+rw*0.15-2,roofPeakY+1,rw*0.7+4,1);
      // Decorative iron cresting (little spikes)
      ctx.fillStyle='#2A2A34';
      for(let cr=0;cr<Math.floor(rw*0.7/6);cr++){
        const crX=rx+rw*0.15+cr*6;
        ctx.fillRect(crX,roofPeakY-5,2,4);
        ctx.fillRect(crX-1,roofPeakY-5,4,1);
      }
      // Eave fascia + shadow
      ctx.fillStyle=HPAL.stoneXD;
      ctx.fillRect(rx-roofOver-2,roofEaveY,rw+roofOver*2+4,3);
      ctx.fillStyle='rgba(0,0,0,0.3)';
      ctx.fillRect(rx-roofOver-2,roofEaveY+3,rw+roofOver*2+4,3);

      // ── 10. BELL TOWER / BELFRY on top center ────────────────────────
      const btW=28, btH=26;
      const btX=rx+rw/2-btW/2, btY=roofPeakY-btH-2;
      // Base platform
      ctx.fillStyle=HPAL.stoneXD;
      ctx.fillRect(btX-4,btY+btH,btW+8,5);
      ctx.fillStyle=HPAL.stone;
      ctx.fillRect(btX-4,btY+btH,btW+8,2);
      // Tower walls (stone)
      ctx.fillStyle=HPAL.stoneD;
      ctx.fillRect(btX,btY,btW,btH);
      // Stone block pattern
      for(let br=0;br<3;br++){
        const brY=btY+br*9;
        const offs=br%2*8;
        for(let bc=0;bc<4;bc++){
          const bcX=btX+bc*8+offs;
          if(bcX>=btX+btW-2)continue;
          const r=_svRand(d.x,d.y,br*5+bc+900);
          ctx.fillStyle=r>0.5?HPAL.stoneL:HPAL.stone;
          ctx.fillRect(bcX,brY,7,8);
          ctx.fillStyle=HPAL.stoneXD;
          ctx.fillRect(bcX+7,brY,1,8);
        }
      }
      // Belfry opening (big arched window showing bell)
      const bellArchX=btX+btW/2-8, bellArchY=btY+6;
      ctx.fillStyle=HPAL.stoneXD;
      ctx.fillRect(bellArchX-1,bellArchY,18,14);
      ctx.beginPath();ctx.arc(bellArchX+8,bellArchY,9,Math.PI,0);ctx.fill();
      // Interior dark
      ctx.fillStyle='#0A0810';
      ctx.fillRect(bellArchX+1,bellArchY+2,14,11);
      ctx.beginPath();ctx.arc(bellArchX+8,bellArchY,7,Math.PI,0);ctx.fill();
      // The bell
      const bellX=bellArchX+8, bellY=bellArchY+2;
      const bellSway=Math.sin(t*1.2)*0.8;
      ctx.save();ctx.translate(bellX,bellY);ctx.rotate(bellSway*0.05);
      // Bell mount
      ctx.fillStyle=HPAL.oak;
      ctx.fillRect(-8,-4,16,2);
      // Bell body
      ctx.fillStyle=HPAL.brassD;
      ctx.beginPath();
      ctx.moveTo(-5,-2);ctx.lineTo(5,-2);
      ctx.lineTo(6,8);ctx.lineTo(-6,8);
      ctx.closePath();ctx.fill();
      ctx.fillStyle=HPAL.brass;
      ctx.beginPath();
      ctx.moveTo(-4,-1);ctx.lineTo(3,-1);
      ctx.lineTo(4,7);ctx.lineTo(-5,7);
      ctx.closePath();ctx.fill();
      // Bell highlight
      ctx.fillStyle=HPAL.brassL;
      ctx.fillRect(-4,0,1,6);
      // Bell rim
      ctx.fillStyle=HPAL.brassD;
      ctx.fillRect(-6,8,12,1);
      // Clapper
      ctx.fillStyle='#2A2020';
      ctx.fillRect(-1,4,2,5);
      ctx.restore();

      // Bell tower arched keystone
      ctx.fillStyle=HPAL.stoneXL;
      ctx.fillRect(bellArchX+6,bellArchY-10,4,4);

      // Bell tower roof — small pointed cap
      ctx.fillStyle=HPAL.slateD;
      ctx.beginPath();
      ctx.moveTo(btX-3,btY);
      ctx.lineTo(btX+btW/2,btY-12);
      ctx.lineTo(btX+btW+3,btY);
      ctx.closePath();ctx.fill();
      ctx.fillStyle=HPAL.slate;
      ctx.beginPath();
      ctx.moveTo(btX-2,btY);
      ctx.lineTo(btX+btW/2,btY-11);
      ctx.lineTo(btX+btW/2,btY);
      ctx.closePath();ctx.fill();
      // Slate lines on cap
      ctx.strokeStyle='rgba(0,0,0,0.35)';ctx.lineWidth=1;
      for(let sl=0;sl<3;sl++){
        ctx.beginPath();
        ctx.moveTo(btX-3+sl*3,btY-sl*3);
        ctx.lineTo(btX+btW/2,btY-12+sl*3);
        ctx.stroke();
      }

      // ── 11. ORANGE ₿ FLAG on top of the belfry (waves) ───────────────
      const flagX=btX+btW/2-1, flagY=btY-24;
      // Pole
      ctx.fillStyle=HPAL.stoneXD;
      ctx.fillRect(flagX-1,flagY-2,3,12);
      ctx.fillStyle=HPAL.marbleD;
      ctx.fillRect(flagX,flagY-2,1,12);
      // Finial ball on top
      ctx.fillStyle=HPAL.brass;
      ctx.beginPath();ctx.arc(flagX,flagY-2,2,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=HPAL.brassL;
      ctx.fillRect(flagX-1,flagY-3,1,1);
      // Waving flag (sinusoidal edge)
      const flagW=18, flagH=11;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(flagX+1,flagY);
      for(let fi=0;fi<=flagW;fi+=2){
        const wavY=Math.sin(t*3+fi*0.3)*1.5;
        ctx.lineTo(flagX+1+fi,flagY+wavY);
      }
      for(let fi=flagW;fi>=0;fi-=2){
        const wavY=Math.sin(t*3+fi*0.3)*1.5;
        ctx.lineTo(flagX+1+fi,flagY+flagH+wavY);
      }
      ctx.closePath();
      ctx.fillStyle='#C05010';
      ctx.fill();
      ctx.clip();
      ctx.fillStyle='#E07020';
      ctx.fillRect(flagX,flagY,flagW+2,3);
      ctx.fillStyle='#F7931A';
      ctx.font='bold 8px '+FONT;ctx.textAlign='center';
      ctx.fillText('₿',flagX+flagW/2+1,flagY+flagH*0.75);
      ctx.restore();
      // Flag shadow stripes
      ctx.fillStyle='rgba(0,0,0,0.2)';
      ctx.fillRect(flagX+1,flagY+flagH-2,flagW,2);
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

    // Atmospheric surroundings — path, flowers, props, soft shadow
    drawBuildingAmbience(d,rx,ry,rw,bh);
    ctx.textAlign='left'; // restore default
    return;
  }
  else if(d.type==='seed_fragment'){
    const glow=.5+Math.sin(t*3)*.3;
    ctx.fillStyle=`rgba(247,147,26,${glow})`;ctx.beginPath();ctx.arc(sx+ST/2,sy+ST/2,10+Math.sin(t*2)*3,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=C.orange;ctx.font='16px serif';ctx.textAlign='center';ctx.fillText('🧩',sx+ST/2,sy+ST/2+5);
  }
  else if(d.type==='citadel_tower'){
    // GRAND CITADEL KEEP — stone fortress tower
    const CPAL={
      stone:'#6A6872', stoneL:'#8A8892', stoneXL:'#A8A6B0', stoneD:'#3A384A', stoneXD:'#1A1824',
      iron:'#2A2830', ironL:'#4A4854',
      brass:'#B8881C', brassL:'#E8B040',
      flame:'rgba(255,160,50,0.9)',
    };
    const tCX=sx+ST/2;
    const towerW=28, towerH=ST*2.6;
    const tX=tCX-towerW/2, tY=sy-towerH;

    // ── Ground shadow
    ctx.fillStyle='rgba(0,0,0,0.4)';
    ctx.beginPath();ctx.ellipse(tCX,sy+4,towerW*0.6,5,0,0,Math.PI*2);ctx.fill();

    // ── Stone base (wider bottom)
    ctx.fillStyle=CPAL.stoneXD;
    ctx.fillRect(tX-3,tY+towerH-8,towerW+6,10);
    ctx.fillStyle=CPAL.stoneL;
    ctx.fillRect(tX-3,tY+towerH-8,towerW+6,2);

    // ── Main tower shaft (stone blocks)
    ctx.fillStyle=CPAL.stoneD;
    ctx.fillRect(tX,tY,towerW,towerH);
    const brH=8;
    for(let row=0;row<Math.ceil(towerH/brH);row++){
      const rY=tY+row*brH;
      const offs=row%2*7;
      for(let col=0;col<5;col++){
        const bX=tX+col*7+offs;
        if(bX>=tX+towerW-1)continue;
        const r=(Math.sin(col*13+row*7)*0.5+0.5);
        ctx.fillStyle=r>0.5?CPAL.stoneL:CPAL.stone;
        ctx.fillRect(bX,rY,6,brH-1);
        ctx.fillStyle=CPAL.stoneXD;
        ctx.fillRect(bX+6,rY,1,brH-1);
      }
      ctx.fillStyle='rgba(0,0,0,0.3)';
      ctx.fillRect(tX,rY+brH-1,towerW,1);
    }

    // ── Arched doorway at the bottom
    const dW=10,dH=14;
    const dX=tCX-dW/2,dY=tY+towerH-dH-2;
    ctx.fillStyle=CPAL.stoneXD;
    ctx.fillRect(dX-1,dY,dW+2,dH);
    ctx.beginPath();ctx.arc(dX+dW/2,dY,dW/2+1,Math.PI,0);ctx.fill();
    ctx.fillStyle='#0A0610';
    ctx.fillRect(dX,dY+1,dW,dH-1);
    ctx.beginPath();ctx.arc(dX+dW/2,dY,dW/2,Math.PI,0);ctx.fill();
    // Iron portcullis grid
    ctx.strokeStyle=CPAL.iron;ctx.lineWidth=1;
    for(let bi=1;bi<4;bi++){
      ctx.beginPath();ctx.moveTo(dX+(dW/4)*bi,dY);ctx.lineTo(dX+(dW/4)*bi,dY+dH);ctx.stroke();
    }
    for(let bi=1;bi<3;bi++){
      ctx.beginPath();ctx.moveTo(dX,dY+(dH/3)*bi);ctx.lineTo(dX+dW,dY+(dH/3)*bi);ctx.stroke();
    }

    // ── Arrow-slit windows (3 levels)
    for(let lv=0;lv<3;lv++){
      const slY=tY+12+lv*22;
      for(const slSide of [-6,6]){
        const slX=tCX+slSide-1;
        ctx.fillStyle=CPAL.stoneXD;
        ctx.fillRect(slX-1,slY-1,4,10);
        // Cross-slit
        ctx.fillStyle='#1A1420';
        ctx.fillRect(slX,slY,2,8);
        ctx.fillRect(slX-1,slY+3,4,2);
        // Warm glow inside
        const glow=0.5+Math.sin(t*2+lv+slSide)*0.2;
        ctx.fillStyle=`rgba(255,160,50,${glow})`;
        ctx.fillRect(slX,slY+1,2,6);
      }
    }

    // ── Battlements (crenellations) at the top
    const batY=tY-6;
    ctx.fillStyle=CPAL.stoneD;
    ctx.fillRect(tX-3,batY+4,towerW+6,6);
    ctx.fillStyle=CPAL.stoneL;
    ctx.fillRect(tX-3,batY+4,towerW+6,1);
    // Individual merlons
    for(let m=0;m<5;m++){
      const mx=tX-3+m*((towerW+6)/5);
      ctx.fillStyle=CPAL.stone;
      ctx.fillRect(mx,batY-2,5,7);
      ctx.fillStyle=CPAL.stoneL;
      ctx.fillRect(mx,batY-2,5,1);
      ctx.fillStyle=CPAL.stoneXD;
      ctx.fillRect(mx+4,batY-2,1,7);
    }

    // ── Brazier/torch on top (animated fire)
    const brzX=tCX-3, brzY=batY-8;
    ctx.fillStyle=CPAL.iron;
    ctx.fillRect(brzX,brzY,6,4);
    ctx.fillStyle=CPAL.ironL;
    ctx.fillRect(brzX,brzY,6,1);
    // Fire
    const fireFlick=Math.sin(t*10)*1.2;
    ctx.fillStyle=CPAL.flame;
    ctx.beginPath();
    ctx.moveTo(brzX-1,brzY);
    ctx.quadraticCurveTo(brzX+3+fireFlick,brzY-12,brzX+7,brzY);
    ctx.closePath();ctx.fill();
    ctx.fillStyle='rgba(255,220,120,0.95)';
    ctx.beginPath();
    ctx.moveTo(brzX+1,brzY);
    ctx.quadraticCurveTo(brzX+3+fireFlick*0.5,brzY-8,brzX+5,brzY);
    ctx.closePath();ctx.fill();
    // Glow halo
    const bGrad=ctx.createRadialGradient(brzX+3,brzY-4,2,brzX+3,brzY-4,24);
    bGrad.addColorStop(0,'rgba(255,150,50,0.4)');
    bGrad.addColorStop(1,'rgba(255,150,50,0)');
    ctx.fillStyle=bGrad;
    ctx.beginPath();ctx.arc(brzX+3,brzY-4,24,0,Math.PI*2);ctx.fill();

    // ── Flagpole + waving orange banner from the top
    const fpX=tCX+10,fpY=batY-14;
    ctx.fillStyle=CPAL.iron;
    ctx.fillRect(fpX,fpY,1,18);
    ctx.fillStyle=CPAL.brass;
    ctx.beginPath();ctx.arc(fpX,fpY-1,1.5,0,Math.PI*2);ctx.fill();
    // Banner (vertical, tall and narrow)
    const bnW=8,bnH=14;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(fpX+1,fpY+2);
    for(let fi=0;fi<=bnH;fi+=2){
      const wvX=Math.sin(t*2.5+fi*0.4)*1.2;
      ctx.lineTo(fpX+1+bnW+wvX,fpY+2+fi);
    }
    ctx.lineTo(fpX+1,fpY+2+bnH);
    ctx.closePath();
    ctx.fillStyle='#C05010';
    ctx.fill();
    ctx.clip();
    ctx.fillStyle='#F7931A';
    ctx.font='bold 9px '+FONT;ctx.textAlign='center';
    ctx.fillText('₿',fpX+1+bnW/2,fpY+2+bnH/2+3);
    ctx.restore();

    // ── Faint upward magical particles (citadel energy)
    for(let pi=0;pi<3;pi++){
      const phase=(t*0.8+pi*2.1)%3;
      const paY=tY+towerH*0.5-phase*30;
      const paX=tCX-6+pi*6+Math.sin(t*2+pi)*2;
      const alpha=1-phase/3;
      ctx.fillStyle=`rgba(247,147,26,${alpha*0.6})`;
      ctx.fillRect(paX,paY,1,1);
    }
  }
}

function drawPlaced(item){
  const sx=item.x*SCALE-cam.x,sy=item.y*SCALE-cam.y;
  if(sx>canvas.width+ST||sy>canvas.height+ST||sx<-ST||sy<-ST)return;
  const w=ST*.8,h=ST*.6,rx=sx-w/2,ry=sy-h/2;
  if(item.type==='solar_panel'){ctx.fillStyle='#2244AA';ctx.fillRect(rx,ry,w,h);ctx.fillStyle='#3366CC';ctx.fillRect(rx+3,ry+3,w-6,h-6);
    const sun=_hour>=6&&_hour<=20?.3:0;if(sun>0){ctx.fillStyle=`rgba(255,255,200,${sun*(0.4+Math.sin(_now/300)*.2)})`;ctx.fillRect(rx+8,ry+4,10,6);}}
  else if(item.type==='battery'){ctx.fillStyle='#333';ctx.fillRect(rx,ry,w,h);const pct=pwr.maxStore>0?pwr.stored/pwr.maxStore:0;ctx.fillStyle=pct>.5?C.green:pct>.2?C.ledOrange:C.red;ctx.fillRect(rx+4,ry+h-8,(w-8)*pct,4);}
  else if(item.type==='cooling_fan'){ctx.fillStyle='#445566';ctx.fillRect(rx,ry,w,h);ctx.save();ctx.translate(sx,sy);const t=_now/150;for(let i=0;i<4;i++){ctx.rotate(Math.PI/2+t);ctx.fillStyle='#778899';ctx.fillRect(-2,-12,4,12);}ctx.restore();}
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
    const t=_t;
    const isNight=_isNight;
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
    const t=_t;
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
  // Reference sprite box: hardcoded offsets below assume a 52x64 box
  // (SCALE=3). On small screens SCALE=2 gives 36x48, which collapses
  // symmetric left/right body parts. Draw into a reference box via a
  // canvas transform so the art always renders correctly.
  const actualW=ST+4, actualH=ST+16;
  const actualPx=sx-actualW/2, actualPy=sy-actualH/2;
  const REF_W=52, REF_H=64;
  ctx.save();
  ctx.translate(actualPx, actualPy);
  if (actualW !== REF_W || actualH !== REF_H) ctx.scale(actualW/REF_W, actualH/REF_H);
  const w=REF_W, h=REF_H, px=0, py=0;
  const refSx=REF_W/2, refSy=REF_H/2;
  const bob=player.moving?Math.sin(player.wf*Math.PI/2)*2:0;
  const lo=player.moving?Math.sin(player.wf*Math.PI)*5:0;
  const as=player.moving?Math.sin(player.wf*Math.PI)*7:0;
  
  // Shadow
  ctx.fillStyle='rgba(0,0,0,.2)';ctx.beginPath();ctx.ellipse(refSx,refSy+h/2+3,16,6,0,0,Math.PI*2);ctx.fill();
  
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
  ctx.fillStyle='#DDD';ctx.fillRect(refSx-1,py+18+bob,2,h-38);
  
  // Bitcoin logo on chest
  ctx.fillStyle='#FFF';ctx.font=`bold 16px ${FONT}`;ctx.textAlign='center';
  ctx.fillText('₿',refSx,py+32+bob);
  
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
  ctx.fillStyle='#FFF';ctx.font=`bold 8px ${FONT}`;ctx.fillText('₿',refSx,py+3+bob);
  
  // Selected item in hand
  const sel=getSelected();
  if(sel){
    ctx.font='14px serif';
    ctx.fillText(ITEMS[sel.id].icon, refSx + (player.facing.x>0?18:-18), py+32+bob);
    // Item name above head
    ctx.fillStyle='rgba(0,0,0,.6)';ctx.font=`13px ${FONT}`;
    ctx.fillText(ITEMS[sel.id].name,refSx,py-12);
  }
  ctx.restore();
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
    const bounce=Math.sin(_now/300)*4;
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
  const actualW=ST+4, actualH=ST+16;
  if(sx>canvas.width+actualW||sy>canvas.height+actualH||sx<-actualW||sy<-actualH)return;
  // Reference-box transform — see drawPlayer for rationale.
  const actualPx=sx-actualW/2, actualPy=sy-actualH/2;
  const REF_W=52, REF_H=64;
  ctx.save();
  ctx.translate(actualPx, actualPy);
  if (actualW !== REF_W || actualH !== REF_H) ctx.scale(actualW/REF_W, actualH/REF_H);
  const w=REF_W, h=REF_H, px=0, py=0;
  const refSx=REF_W/2, refSy=REF_H/2;
  const bob=n.moving?Math.sin((n.wf||0)*Math.PI/2)*2:0;
  const lo=n.moving?Math.sin((n.wf||0)*Math.PI)*4:0;
  const as=n.moving?Math.sin((n.wf||0)*Math.PI)*5:0;
  const eyeOff=player?((n.x<player.x)?2:(n.x>player.x)?-2:0):0;
  
  // Shadow
  ctx.fillStyle='rgba(0,0,0,.18)';ctx.beginPath();ctx.ellipse(refSx,refSy+h/2+3,16,6,0,0,Math.PI*2);ctx.fill();

  // === PER-NPC UNIQUE DESIGNS ===
  if(n.name==='Hodl Hannah'){
    // Legs — dark leggings
    ctx.fillStyle='#2A2A3A';ctx.fillRect(px+12+lo,py+h-20,10,16);ctx.fillRect(px+w-22-lo,py+h-20,10,16);
    ctx.fillStyle='#C06080';ctx.fillRect(px+10+lo,py+h-6,14,6);ctx.fillRect(px+w-24-lo,py+h-6,14,6); // pink shoes
    // Body — pink top
    ctx.fillStyle='#FF69B4';ctx.fillRect(px+8,py+18+bob,w-16,h-38);
    ctx.fillStyle='#E05A9E';ctx.fillRect(px+14,py+34+bob,w-28,6); // belt line
    // ₿ necklace
    ctx.fillStyle='#FFD700';ctx.font='bold 10px '+FONT;ctx.textAlign='center';ctx.fillText('₿',refSx,py+28+bob);
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
    ctx.fillStyle='#DDD';ctx.fillRect(refSx-1,py+20+bob,2,h-40); // tie
    ctx.fillStyle='#FF4444';ctx.fillRect(refSx-2,py+22+bob,4,8); // red tie knot
    // Arms
    ctx.fillStyle='#4455FF';ctx.fillRect(px+1,py+18+bob-as,10,12);ctx.fillRect(px+w-11,py+18+bob+as,10,12);
    ctx.fillStyle=C.skin;ctx.fillRect(px+2,py+28+bob-as,8,8);ctx.fillRect(px+w-10,py+28+bob+as,8,8);
    // Head
    ctx.fillStyle=C.skin;ctx.fillRect(px+12,py+4+bob,w-24,16);ctx.fillRect(px+14,py+18+bob,w-28,4);
    ctx.fillStyle='#222';ctx.fillRect(px+10,py+bob,w-20,8); // dark slicked hair
    // Nervous sweat drop
    const st=_now/800;
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
    ctx.fillStyle='#333';ctx.fillRect(refSx-1,py+20+bob,2,h-40); // black tie
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
    ctx.fillStyle='#F7931A';ctx.fillRect(refSx-2,py+20+bob,4,h-42); // ORANGE tie (Bitcoin orange!)
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
    const lt=_now/200;
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
  const rel=relationships[n.name];
  if(rel){
    const t=_t;
    const bob=Math.sin(t*2.5)*4; // bobbing animation
    const markerY=py-22+bob;
    if(rel.hearts>=10){
      // Max hearts — green heart
      ctx.fillStyle='#44FF88';ctx.font=`bold 18px serif`;ctx.textAlign='center';
      ctx.fillText('♥',refSx,markerY);
    } else if(n.name==='The Hermit'&&foundWords.length<5){
      // Seed fragment hint — orange puzzle
      ctx.font=`16px serif`;ctx.textAlign='center';
      ctx.fillText('🧩',refSx,markerY);
    } else if(NPC_QUESTS[n.name]){
      // Has active quest — orange quest marker
      const aq=getActiveQuest(n.name);
      if(aq){const qReady=aq.check();
      ctx.fillStyle=qReady?'#44FF44':'#FF8800'; // green=ready, orange=in progress
      ctx.shadowColor='rgba(0,0,0,0.8)';ctx.shadowBlur=3;
      ctx.font=`bold 18px ${FONT}`;ctx.textAlign='center';
      ctx.fillText(qReady?'✅':'❗',refSx,markerY);
      ctx.shadowBlur=0;
    }} else if(rel.talked===false){
      // Hasn't talked today — yellow !
      ctx.fillStyle='#FFD700';
      ctx.shadowColor='rgba(0,0,0,0.8)';ctx.shadowBlur=3;
      ctx.font=`bold 20px ${FONT}`;ctx.textAlign='center';
      ctx.fillText('!',refSx,markerY);
      ctx.shadowBlur=0;
    }
  }
  const dist=Math.hypot(n.x-player.x,n.y-player.y);
  if(dist<48){
    ctx.fillStyle=C.white;ctx.font=`bold 13px ${FONT}`;ctx.textAlign='center';ctx.fillText(n.name,refSx,py-8);
    ctx.fillStyle=C.gray;ctx.font=`12px ${FONT}`;
    ctx.fillText(n.role==='shop'||n.role==='seeds'?'[E] Talk  [B] Shop':n.role==='market'?'[E] Talk  [B] Sell Crops':'[E] Talk',refSx,py-20);
  }
  ctx.restore();
}

function drawRig(r){
  const sx=r.x*SCALE-cam.x,sy=r.y*SCALE-cam.y;
  const w=ST+8,h=ST+4,rx=sx-w/2,ry=sy-h/2;
  if(sx>canvas.width+w||sy>canvas.height+h||sx<-w||sy<-h)return;
  
  const t = _t;
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
  
  // Mining particles — proper floating sparkles with lifetime (world coords)
  if(!r._particles) r._particles=[];
  if(active && Math.random()<0.4){
    r._particles.push({
      wx: r.x*SCALE - 10 + Math.random()*20,
      wy: r.y*SCALE - h/2 + 2,
      vx: (Math.random()-0.5)*8,
      vy: -15 - Math.random()*20,
      life: 0.6 + Math.random()*0.5,
      size: 1 + Math.random()*1.5,
      hot: r.temp > 70 && Math.random() < 0.3
    });
  }
  // Update + draw (dt approximated — could pull from global if needed)
  const pdt = 0.016;
  for(let i=r._particles.length-1; i>=0; i--){
    const p=r._particles[i];
    p.life -= pdt;
    if(p.life <= 0){r._particles.splice(i,1);continue;}
    p.wx += p.vx * pdt;
    p.wy += p.vy * pdt;
    p.vy += 15 * pdt;
    p.vx *= 0.98;
    const px = p.wx - cam.x, py = p.wy - cam.y;
    const a = Math.min(1, p.life * 2);
    ctx.globalAlpha = a * 0.3;
    ctx.fillStyle = p.hot ? '#FF5020' : '#F7931A';
    ctx.beginPath();ctx.arc(px, py, p.size*2.2, 0, Math.PI*2);ctx.fill();
    ctx.globalAlpha = a;
    ctx.fillStyle = p.hot ? '#FFD060' : '#FFE080';
    ctx.fillRect(px - p.size/2, py - p.size/2, p.size, p.size);
  }
  ctx.globalAlpha = 1;
  
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

