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
    const hr = _hour;
    const isNight = _isNight;
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

      // Warm light pools from windows onto ground at night
      if(isNight){
        const glowPulse=0.06+Math.sin(_t*1.5)*0.02;
        ctx.fillStyle=`rgba(255,200,100,${glowPulse})`;
        ctx.beginPath();ctx.ellipse(wx1+ww/2,ry+bh+8,ww*1.5,10,0,0,Math.PI*2);ctx.fill();
        if(d.w>=6){const wx2b=rx+rw-ST*0.6-ww;ctx.beginPath();ctx.ellipse(wx2b+ww/2,ry+bh+8,ww*1.5,10,0,0,Math.PI*2);ctx.fill();}
        // Door light pool
        ctx.fillStyle=`rgba(255,180,80,${glowPulse*0.8})`;
        ctx.beginPath();ctx.ellipse(doorX+doorW/2,ry+bh+8,doorW*1.2,12,0,0,Math.PI*2);ctx.fill();
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
        // Tavern ground light pool
        ctx.fillStyle=`rgba(255,180,60,${0.06+Math.sin(_t*1.2)*0.02})`;
        ctx.beginPath();ctx.ellipse(lwx+ww3/2,ry+bh+8,ww3*1.5,10,0,0,Math.PI*2);ctx.fill();
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
      const ledOn=Math.floor(_now/500)%2===0;
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
      ctx.fillText('♥',sx,markerY);
    } else if(n.name==='The Hermit'&&foundWords.length<5){
      // Seed fragment hint — orange puzzle
      ctx.font=`16px serif`;ctx.textAlign='center';
      ctx.fillText('🧩',sx,markerY);
    } else if(NPC_QUESTS[n.name]){
      // Has active quest — orange quest marker
      const aq=getActiveQuest(n.name);
      if(aq){const qReady=aq.check();
      ctx.fillStyle=qReady?'#44FF44':'#FF8800'; // green=ready, orange=in progress
      ctx.shadowColor='rgba(0,0,0,0.8)';ctx.shadowBlur=3;
      ctx.font=`bold 18px ${FONT}`;ctx.textAlign='center';
      ctx.fillText(qReady?'✅':'❗',sx,markerY);
      ctx.shadowBlur=0;
    }} else if(rel.talked===false){
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

