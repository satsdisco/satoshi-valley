// ============================================================
// SATOSHI VALLEY — Sprite Generator
// Creates pixel-perfect 16x16 sprites on offscreen canvases
// These replace the runtime ctx.fillRect drawing for key items
// ============================================================

const SpriteCache = {};

function createSprite(name, size, drawFn) {
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const cx = c.getContext('2d');
  cx.imageSmoothingEnabled = false;
  drawFn(cx, size);
  SpriteCache[name] = c;
  return c;
}

function initSprites() {
  const S = 16; // Base sprite size
  
  // ---- ITEMS ----
  
  createSprite('item_wrench', S, (cx, s) => {
    // Wrench
    cx.fillStyle = '#888';
    cx.fillRect(6, 1, 4, 10);
    cx.fillStyle = '#AAA';
    cx.fillRect(5, 0, 6, 3); // head
    cx.fillRect(4, 0, 2, 4);
    cx.fillRect(10, 0, 2, 4);
    cx.fillStyle = '#664';
    cx.fillRect(6, 10, 4, 5); // handle
    cx.fillStyle = '#775';
    cx.fillRect(7, 11, 2, 3);
  });
  
  createSprite('item_pickaxe', S, (cx, s) => {
    cx.fillStyle = '#664';
    cx.fillRect(7, 4, 2, 12); // handle
    cx.fillStyle = '#888';
    cx.fillRect(2, 1, 12, 3); // head
    cx.fillStyle = '#AAA';
    cx.fillRect(2, 1, 3, 4); // left point
    cx.fillRect(11, 1, 3, 4); // right point
    cx.fillStyle = '#666';
    cx.fillRect(6, 1, 4, 4); // binding
  });
  
  createSprite('item_cpu', S, (cx, s) => {
    cx.fillStyle = '#4A4A50';
    cx.fillRect(2, 2, 12, 12);
    cx.fillStyle = '#3A3A40';
    cx.fillRect(2, 2, 12, 3);
    cx.fillStyle = '#333';
    for (let i = 0; i < 3; i++) cx.fillRect(4, 7 + i * 3, 8, 1);
    cx.fillStyle = '#0F0';
    cx.fillRect(3, 3, 2, 1);
    cx.fillStyle = '#F70';
    cx.fillRect(11, 3, 2, 1);
  });
  
  createSprite('item_gpu', S, (cx, s) => {
    cx.fillStyle = '#445';
    cx.fillRect(1, 12, 14, 3); // base
    cx.fillRect(2, 2, 2, 10); // left post
    cx.fillRect(12, 2, 2, 10);
    cx.fillStyle = '#568';
    cx.fillRect(4, 3, 3, 9); // card 1
    cx.fillStyle = '#586';
    cx.fillRect(8, 3, 3, 9); // card 2
    cx.fillStyle = '#0F0';
    cx.fillRect(3, 2, 2, 1);
  });
  
  createSprite('item_asic', S, (cx, s) => {
    cx.fillStyle = '#1A1A20';
    cx.fillRect(1, 3, 14, 10);
    cx.fillStyle = '#F7931A';
    cx.fillRect(1, 7, 14, 2); // orange stripe
    cx.fillStyle = '#111';
    cx.fillRect(2, 4, 4, 8); // front fan
    cx.fillRect(10, 4, 4, 8); // back fan
    cx.fillStyle = '#0A0';
    cx.fillRect(6, 4, 2, 1);
    cx.fillRect(6, 6, 2, 1);
  });
  
  createSprite('item_solar', S, (cx, s) => {
    cx.fillStyle = '#2244AA';
    cx.fillRect(1, 1, 14, 14);
    cx.fillStyle = '#3366CC';
    cx.fillRect(2, 2, 12, 12);
    cx.fillStyle = '#4477DD';
    cx.fillRect(2, 2, 6, 6);
    cx.fillRect(8, 8, 6, 6);
    cx.fillStyle = '#88AAEE';
    cx.fillRect(5, 5, 2, 2); // sun glint
  });
  
  createSprite('item_battery', S, (cx, s) => {
    cx.fillStyle = '#333';
    cx.fillRect(3, 3, 10, 12);
    cx.fillStyle = '#444';
    cx.fillRect(4, 4, 8, 10);
    cx.fillStyle = '#666';
    cx.fillRect(5, 1, 6, 3); // terminal
    cx.fillStyle = '#4F4';
    cx.fillRect(5, 11, 6, 2); // charge indicator
    cx.fillStyle = '#FFF';
    cx.fillRect(7, 6, 1, 4); // + symbol
    cx.fillRect(6, 7, 3, 1);
  });
  
  createSprite('item_fan', S, (cx, s) => {
    cx.fillStyle = '#445566';
    cx.fillRect(2, 2, 12, 12);
    cx.fillStyle = '#334455';
    cx.fillRect(3, 3, 10, 10);
    // Fan blades
    cx.fillStyle = '#778899';
    cx.fillRect(7, 3, 2, 5);
    cx.fillRect(7, 8, 2, 5);
    cx.fillRect(3, 7, 5, 2);
    cx.fillRect(8, 7, 5, 2);
    // Center
    cx.fillStyle = '#556677';
    cx.fillRect(7, 7, 2, 2);
  });
  
  // ---- BITCOIN CULTURE ITEMS ----
  
  createSprite('item_node', S, (cx, s) => {
    // Bitcoin node (small server)
    cx.fillStyle = '#2A2A30';
    cx.fillRect(2, 1, 12, 14);
    cx.fillStyle = '#3A3A44';
    cx.fillRect(3, 2, 10, 12);
    // Hard drive bays
    cx.fillStyle = '#222';
    cx.fillRect(4, 3, 8, 3);
    cx.fillRect(4, 7, 8, 3);
    // LEDs
    cx.fillStyle = '#F7931A'; // Bitcoin orange
    cx.fillRect(4, 12, 2, 1);
    cx.fillStyle = '#0F0';
    cx.fillRect(7, 12, 2, 1);
    cx.fillStyle = '#00F';
    cx.fillRect(10, 12, 2, 1);
  });
  
  createSprite('item_ledger', S, (cx, s) => {
    // Hardware wallet
    cx.fillStyle = '#222';
    cx.fillRect(4, 1, 8, 14);
    cx.fillStyle = '#333';
    cx.fillRect(5, 2, 6, 10);
    // Screen
    cx.fillStyle = '#115511';
    cx.fillRect(5, 3, 6, 5);
    cx.fillStyle = '#33AA33';
    cx.fillRect(6, 4, 4, 3);
    // Buttons
    cx.fillStyle = '#444';
    cx.fillRect(5, 12, 3, 2);
    cx.fillRect(9, 12, 3, 2);
  });
  
  createSprite('item_sats', S, (cx, s) => {
    // Stack of sats (coins)
    cx.fillStyle = '#C47415';
    cx.beginPath(); cx.ellipse(8, 12, 6, 3, 0, 0, Math.PI * 2); cx.fill();
    cx.fillStyle = '#F7931A';
    cx.beginPath(); cx.ellipse(8, 10, 6, 3, 0, 0, Math.PI * 2); cx.fill();
    cx.fillStyle = '#C47415';
    cx.beginPath(); cx.ellipse(8, 8, 6, 3, 0, 0, Math.PI * 2); cx.fill();
    cx.fillStyle = '#F7931A';
    cx.beginPath(); cx.ellipse(8, 6, 6, 3, 0, 0, Math.PI * 2); cx.fill();
    // ₿ symbol
    cx.fillStyle = '#FFF';
    cx.fillRect(7, 4, 2, 4);
    cx.fillRect(6, 5, 1, 2);
    cx.fillRect(9, 5, 1, 2);
  });
  
  // ---- FOOD ----
  
  createSprite('item_steak', S, (cx, s) => {
    // Beef steak
    cx.fillStyle = '#8B2020';
    cx.beginPath(); cx.ellipse(8, 9, 6, 5, 0.2, 0, Math.PI * 2); cx.fill();
    cx.fillStyle = '#AA3030';
    cx.beginPath(); cx.ellipse(8, 8, 5, 4, 0.2, 0, Math.PI * 2); cx.fill();
    // Fat marbling
    cx.fillStyle = '#CC8888';
    cx.fillRect(5, 7, 2, 1);
    cx.fillRect(9, 8, 2, 1);
    cx.fillRect(7, 6, 1, 2);
  });
  
  createSprite('item_honey', S, (cx, s) => {
    // Honey jar
    cx.fillStyle = '#886622';
    cx.fillRect(4, 4, 8, 10);
    cx.fillStyle = '#DDAA22';
    cx.fillRect(5, 5, 6, 8);
    // Lid
    cx.fillStyle = '#AA8844';
    cx.fillRect(4, 2, 8, 3);
    cx.fillStyle = '#CC9944';
    cx.fillRect(5, 3, 6, 1);
    // Label
    cx.fillStyle = '#FFF';
    cx.fillRect(6, 8, 4, 3);
    cx.fillStyle = '#DDAA22';
    cx.fillRect(7, 9, 2, 1);
  });
  
  // ---- BUILDING DECORATIONS ----

  createSprite('building_door', S, (cx, s) => {
    // Wooden door with handle
    cx.fillStyle = '#6B3A2A'; // dark wood frame
    cx.fillRect(3, 2, 10, 13);
    cx.fillStyle = '#8B4E2E'; // lighter wood panels
    cx.fillRect(4, 3, 8, 5);
    cx.fillRect(4, 9, 8, 5);
    cx.fillStyle = '#A0622F'; // wood grain
    cx.fillRect(5, 4, 6, 3);
    cx.fillRect(5, 10, 6, 3);
    // Door handle
    cx.fillStyle = '#C8A020'; // brass handle
    cx.fillRect(10, 8, 2, 3);
    cx.fillRect(10, 10, 3, 1);
    // Door frame
    cx.fillStyle = '#4A2518';
    cx.fillRect(3, 2, 1, 13);
    cx.fillRect(12, 2, 1, 13);
    cx.fillRect(3, 2, 10, 1);
  });

  createSprite('building_window', S, (cx, s) => {
    // Window with shutters
    cx.fillStyle = '#7A5C3A'; // wood frame
    cx.fillRect(2, 3, 12, 10);
    // Shutters
    cx.fillStyle = '#8B6B3A';
    cx.fillRect(2, 3, 4, 10); // left shutter
    cx.fillRect(10, 3, 4, 10); // right shutter
    // Shutter lines
    cx.fillStyle = '#6A4E28';
    cx.fillRect(3, 5, 2, 1);
    cx.fillRect(3, 7, 2, 1);
    cx.fillRect(3, 9, 2, 1);
    cx.fillRect(3, 11, 2, 1);
    cx.fillRect(11, 5, 2, 1);
    cx.fillRect(11, 7, 2, 1);
    cx.fillRect(11, 9, 2, 1);
    cx.fillRect(11, 11, 2, 1);
    // Glass panes
    cx.fillStyle = '#AACCEE'; // light blue glass
    cx.fillRect(6, 4, 4, 4);
    cx.fillRect(6, 9, 4, 3);
    // Pane dividers
    cx.fillStyle = '#7A5C3A';
    cx.fillRect(7, 4, 1, 4);
    cx.fillRect(6, 7, 4, 1);
  });

  createSprite('building_chimney', S, (cx, s) => {
    // Chimney with bricks
    cx.fillStyle = '#7A3A2A'; // brick red base
    cx.fillRect(4, 1, 8, 15);
    // Brick pattern
    cx.fillStyle = '#903C28';
    cx.fillRect(4, 1, 3, 2);
    cx.fillRect(8, 1, 4, 2);
    cx.fillRect(5, 4, 4, 2);
    cx.fillRect(4, 7, 3, 2);
    cx.fillRect(8, 7, 4, 2);
    cx.fillRect(5, 10, 4, 2);
    cx.fillRect(4, 13, 3, 2);
    // Mortar lines (darker)
    cx.fillStyle = '#5E2E1E';
    cx.fillRect(4, 3, 8, 1);
    cx.fillRect(4, 6, 8, 1);
    cx.fillRect(4, 9, 8, 1);
    cx.fillRect(4, 12, 8, 1);
    // Chimney cap
    cx.fillStyle = '#5A2A1A';
    cx.fillRect(3, 0, 10, 2);
    // Smoke puff
    cx.fillStyle = 'rgba(180,180,180,0.7)';
    cx.fillRect(6, 0, 4, 1);
  });

  createSprite('building_sign_shop', S, (cx, s) => {
    // Hanging shop sign with ₿
    // Hanging hooks/chains
    cx.fillStyle = '#888';
    cx.fillRect(5, 0, 1, 3);
    cx.fillRect(10, 0, 1, 3);
    // Sign board
    cx.fillStyle = '#8B5A2B'; // wood
    cx.fillRect(2, 3, 12, 9);
    cx.fillStyle = '#A06830'; // lighter wood face
    cx.fillRect(3, 4, 10, 7);
    // ₿ symbol in orange
    cx.fillStyle = '#F7931A';
    cx.fillRect(7, 5, 2, 5);   // vertical bar
    cx.fillRect(6, 6, 1, 3);   // left bump x
    cx.fillRect(6, 5, 3, 1);   // top cap
    cx.fillRect(6, 7, 3, 1);   // mid cap
    cx.fillRect(6, 9, 3, 1);   // bottom cap
    cx.fillRect(9, 6, 1, 1);   // right bump top
    cx.fillRect(9, 8, 1, 1);   // right bump bot
    // Sign border
    cx.fillStyle = '#5E3A1A';
    cx.fillRect(2, 3, 12, 1);
    cx.fillRect(2, 11, 12, 1);
    cx.fillRect(2, 3, 1, 9);
    cx.fillRect(13, 3, 1, 9);
    // Bottom fringe
    cx.fillStyle = '#D4AA50';
    for (let i = 0; i < 6; i++) cx.fillRect(3 + i * 2, 12, 1, 2);
  });

  createSprite('building_sign_tavern', S, (cx, s) => {
    // Hanging tavern sign with mug
    cx.fillStyle = '#888';
    cx.fillRect(5, 0, 1, 3);
    cx.fillRect(10, 0, 1, 3);
    // Sign board
    cx.fillStyle = '#6B3A1A'; // dark wood
    cx.fillRect(2, 3, 12, 9);
    cx.fillStyle = '#7D4A25';
    cx.fillRect(3, 4, 10, 7);
    // Mug shape (tan/cream)
    cx.fillStyle = '#D4B870';
    cx.fillRect(5, 5, 5, 5);  // mug body
    cx.fillRect(10, 6, 2, 3); // handle
    // Beer foam
    cx.fillStyle = '#F5F0D0';
    cx.fillRect(5, 4, 5, 2);
    // Mug shading
    cx.fillStyle = '#B89040';
    cx.fillRect(5, 9, 5, 1);
    // Sign border
    cx.fillStyle = '#4A2510';
    cx.fillRect(2, 3, 12, 1);
    cx.fillRect(2, 11, 12, 1);
    cx.fillRect(2, 3, 1, 9);
    cx.fillRect(13, 3, 1, 9);
  });

  // ---- NATURE DECORATIONS ----

  createSprite('nature_rock_large', S, (cx, s) => {
    // Large boulder
    cx.fillStyle = '#7A7468'; // base stone
    cx.fillRect(2, 6, 12, 8);
    cx.fillRect(4, 4, 8, 10);
    cx.fillRect(5, 3, 6, 11);
    // Highlight
    cx.fillStyle = '#9A9488';
    cx.fillRect(5, 4, 5, 4);
    cx.fillRect(4, 6, 3, 3);
    // Shadow
    cx.fillStyle = '#5A5448';
    cx.fillRect(8, 10, 5, 3);
    cx.fillRect(9, 8, 3, 5);
    // Dark cracks
    cx.fillStyle = '#4A4438';
    cx.fillRect(7, 5, 1, 4);
    cx.fillRect(5, 9, 3, 1);
  });

  createSprite('nature_stump', S, (cx, s) => {
    // Tree stump
    // Roots
    cx.fillStyle = '#6B4A2A';
    cx.fillRect(1, 12, 3, 3);
    cx.fillRect(12, 12, 3, 3);
    cx.fillRect(5, 13, 2, 2);
    cx.fillRect(9, 13, 2, 2);
    // Stump body
    cx.fillStyle = '#7A5530';
    cx.fillRect(3, 7, 10, 8);
    // Bark texture
    cx.fillStyle = '#6A4825';
    cx.fillRect(4, 8, 1, 6);
    cx.fillRect(7, 9, 1, 5);
    cx.fillRect(10, 8, 1, 6);
    // Top face (rings)
    cx.fillStyle = '#8B6238';
    cx.fillRect(3, 5, 10, 3);
    cx.fillStyle = '#C89A60'; // light wood
    cx.fillRect(4, 5, 8, 3);
    // Annual rings
    cx.fillStyle = '#A07840';
    cx.fillRect(5, 6, 6, 1);
    cx.fillRect(6, 5, 4, 1);
    cx.fillStyle = '#8A6430';
    cx.fillRect(7, 6, 2, 1);
  });

  createSprite('nature_log', S, (cx, s) => {
    // Fallen log (horizontal)
    // Shadow
    cx.fillStyle = '#4A3A1A';
    cx.fillRect(2, 12, 12, 2);
    // Log body
    cx.fillStyle = '#7A5530';
    cx.fillRect(1, 8, 14, 5);
    // Bark
    cx.fillStyle = '#6A4820';
    cx.fillRect(1, 8, 14, 1);
    cx.fillRect(1, 12, 14, 1);
    // Bark texture lines
    cx.fillStyle = '#5A3C18';
    cx.fillRect(4, 9, 1, 3);
    cx.fillRect(8, 9, 1, 3);
    cx.fillRect(12, 9, 1, 3);
    // End grain (left)
    cx.fillStyle = '#C89A60';
    cx.fillRect(0, 8, 2, 5);
    cx.fillStyle = '#A07840';
    cx.fillRect(0, 9, 2, 3);
    cx.fillStyle = '#8A6430';
    cx.fillRect(0, 10, 2, 1);
    // End grain (right)
    cx.fillStyle = '#C89A60';
    cx.fillRect(14, 8, 2, 5);
    cx.fillStyle = '#A07840';
    cx.fillRect(14, 9, 2, 3);
    // Moss patch
    cx.fillStyle = '#5A8A3A';
    cx.fillRect(6, 8, 3, 1);
    cx.fillRect(7, 7, 2, 1);
  });

  createSprite('nature_well', S, (cx, s) => {
    // Stone well
    // Well base (stone cylinder)
    cx.fillStyle = '#8A8070';
    cx.fillRect(3, 8, 10, 7);
    // Stone pattern
    cx.fillStyle = '#7A7060';
    cx.fillRect(3, 9, 4, 2);
    cx.fillRect(8, 9, 5, 2);
    cx.fillRect(3, 12, 5, 2);
    cx.fillRect(9, 12, 4, 2);
    // Mortar
    cx.fillStyle = '#6A6050';
    cx.fillRect(3, 8, 10, 1);
    cx.fillRect(3, 11, 10, 1);
    cx.fillRect(3, 14, 10, 1);
    // Well top rim
    cx.fillStyle = '#6A6050';
    cx.fillRect(2, 7, 12, 2);
    // Water inside
    cx.fillStyle = '#2255AA';
    cx.fillRect(4, 8, 8, 1);
    cx.fillStyle = '#3366BB';
    cx.fillRect(5, 8, 6, 1);
    // Roof posts
    cx.fillStyle = '#7A5530';
    cx.fillRect(3, 2, 2, 6);
    cx.fillRect(11, 2, 2, 6);
    // Roof
    cx.fillStyle = '#6B3A1A';
    cx.fillRect(1, 1, 14, 3);
    cx.fillStyle = '#8B4E25';
    cx.fillRect(2, 1, 12, 2);
    // Rope
    cx.fillStyle = '#C8A838';
    cx.fillRect(7, 2, 2, 5);
    // Bucket
    cx.fillStyle = '#888';
    cx.fillRect(6, 6, 4, 3);
    cx.fillStyle = '#666';
    cx.fillRect(7, 6, 2, 3);
  });

  // ---- BITCOIN-THEMED WORLD OBJECTS ----

  // btc_node_tower is 16x32 (taller sprite)
  {
    const c = document.createElement('canvas');
    c.width = 16; c.height = 32;
    const cx = c.getContext('2d');
    cx.imageSmoothingEnabled = false;
    // Tower base platform
    cx.fillStyle = '#555';
    cx.fillRect(3, 27, 10, 5);
    cx.fillStyle = '#444';
    cx.fillRect(4, 28, 8, 3);
    // Tower legs
    cx.fillStyle = '#888';
    cx.fillRect(4, 12, 2, 16);
    cx.fillRect(10, 12, 2, 16);
    // Cross braces
    cx.fillStyle = '#777';
    cx.fillRect(4, 15, 8, 1);
    cx.fillRect(4, 20, 8, 1);
    cx.fillRect(4, 24, 8, 1);
    // Tower body (narrowing up)
    cx.fillStyle = '#999';
    cx.fillRect(5, 7, 6, 6);
    cx.fillRect(6, 3, 4, 5);
    // Antenna mast
    cx.fillStyle = '#AAA';
    cx.fillRect(7, 0, 2, 4);
    // Bitcoin node indicator — orange LED
    cx.fillStyle = '#F7931A';
    cx.fillRect(5, 8, 2, 1);
    cx.fillRect(9, 10, 2, 1);
    // Signal rings
    cx.fillStyle = 'rgba(247,147,26,0.5)';
    cx.fillRect(3, 1, 2, 1);
    cx.fillRect(11, 1, 2, 1);
    cx.fillRect(2, 3, 2, 1);
    cx.fillRect(12, 3, 2, 1);
    SpriteCache['btc_node_tower'] = c;
  }

  createSprite('btc_satellite_dish', S, (cx, s) => {
    // Satellite dish
    // Mount/pole
    cx.fillStyle = '#777';
    cx.fillRect(7, 10, 2, 6);
    cx.fillRect(5, 14, 6, 2);
    // Dish (arc shape using rects)
    cx.fillStyle = '#C0C0C0';
    cx.fillRect(2, 3, 12, 2);  // top of dish
    cx.fillRect(1, 4, 14, 1);
    cx.fillRect(2, 5, 12, 1);
    cx.fillRect(3, 6, 10, 1);
    cx.fillRect(4, 7, 8, 1);
    cx.fillRect(5, 8, 6, 2);
    cx.fillRect(6, 9, 4, 1);
    // Dish face (orange tint for BTC)
    cx.fillStyle = 'rgba(247,147,26,0.25)';
    cx.fillRect(2, 3, 12, 8);
    // Feed arm
    cx.fillStyle = '#888';
    cx.fillRect(8, 4, 1, 7);
    // LNB at tip
    cx.fillStyle = '#F7931A';
    cx.fillRect(7, 3, 3, 3);
    // Dish rim highlight
    cx.fillStyle = '#E0E0E0';
    cx.fillRect(2, 3, 12, 1);
  });

  createSprite('btc_flag', S, (cx, s) => {
    // Orange Bitcoin flag on pole
    // Pole
    cx.fillStyle = '#888';
    cx.fillRect(3, 1, 2, 14);
    cx.fillStyle = '#AAA';
    cx.fillRect(4, 1, 1, 14);
    // Flag body
    cx.fillStyle = '#F7931A'; // Bitcoin orange
    cx.fillRect(5, 1, 9, 6);
    // Flag shading
    cx.fillStyle = '#E07818';
    cx.fillRect(5, 5, 9, 2);
    cx.fillRect(12, 1, 2, 6);
    // ₿ on flag (white, small)
    cx.fillStyle = '#FFF';
    cx.fillRect(8, 2, 1, 4);  // vertical
    cx.fillRect(7, 3, 1, 2);  // left side
    cx.fillRect(7, 2, 2, 1);  // top cap
    cx.fillRect(7, 3, 2, 1);  // mid cap
    cx.fillRect(7, 5, 2, 1);  // bot cap
    cx.fillRect(9, 3, 1, 1);  // right bump top
    cx.fillRect(9, 4, 1, 1);  // right bump bot
    // Flag edge (waviness hint)
    cx.fillStyle = '#F7931A';
    cx.fillRect(14, 2, 1, 2);
    cx.fillRect(14, 5, 1, 2);
    // Pole base
    cx.fillStyle = '#666';
    cx.fillRect(2, 14, 4, 2);
  });

  createSprite('btc_memorial', S, (cx, s) => {
    // Stone memorial/monument with ₿
    // Base steps
    cx.fillStyle = '#9A9080';
    cx.fillRect(1, 13, 14, 3);
    cx.fillStyle = '#8A8070';
    cx.fillRect(2, 10, 12, 4);
    // Monument body
    cx.fillStyle = '#B0A898';
    cx.fillRect(4, 2, 8, 9);
    // Stone highlights
    cx.fillStyle = '#C4BCB0';
    cx.fillRect(4, 2, 8, 1);
    cx.fillRect(4, 2, 1, 9);
    // Stone shadow
    cx.fillStyle = '#7A7268';
    cx.fillRect(11, 2, 1, 9);
    cx.fillRect(4, 10, 8, 1);
    // Monument top (pointed)
    cx.fillStyle = '#B0A898';
    cx.fillRect(5, 1, 6, 2);
    cx.fillRect(6, 0, 4, 2);
    // ₿ carving (orange/gold)
    cx.fillStyle = '#F7931A';
    cx.fillRect(7, 3, 2, 6);   // vertical bar
    cx.fillRect(6, 4, 1, 4);   // left side
    cx.fillRect(6, 3, 3, 1);   // top cap
    cx.fillRect(6, 5, 3, 1);   // mid cap
    cx.fillRect(6, 8, 3, 1);   // bottom cap
    cx.fillRect(9, 4, 1, 1);   // right bump top
    cx.fillRect(9, 6, 1, 1);   // right bump mid
    cx.fillRect(9, 7, 1, 1);   // right bump bot
    // Inscription line
    cx.fillStyle = '#8A8070';
    cx.fillRect(5, 11, 6, 1);
  });

  // ---- ANIMAL SPRITES ----

  createSprite('animal_cow', S, (cx, s) => {
    // Simple pixel cow (side view)
    // Body
    cx.fillStyle = '#F0EDE0'; // off-white
    cx.fillRect(2, 6, 10, 7);
    // Black patches
    cx.fillStyle = '#222';
    cx.fillRect(4, 6, 3, 3);
    cx.fillRect(9, 8, 3, 3);
    // Head
    cx.fillStyle = '#F0EDE0';
    cx.fillRect(10, 4, 5, 5);
    // Nose/snout
    cx.fillStyle = '#E8A0A0';
    cx.fillRect(13, 6, 3, 3);
    // Nostrils
    cx.fillStyle = '#B06060';
    cx.fillRect(14, 7, 1, 1);
    cx.fillRect(14, 8, 1, 1);
    // Eye
    cx.fillStyle = '#222';
    cx.fillRect(11, 5, 1, 1);
    // Ear
    cx.fillStyle = '#E8C8B0';
    cx.fillRect(10, 3, 2, 2);
    // Horn
    cx.fillStyle = '#D4B060';
    cx.fillRect(12, 3, 1, 2);
    // Legs
    cx.fillStyle = '#D8D4C0';
    cx.fillRect(3, 12, 2, 4);
    cx.fillRect(6, 12, 2, 4);
    cx.fillRect(9, 12, 2, 3);
    // Hooves
    cx.fillStyle = '#555';
    cx.fillRect(3, 14, 2, 2);
    cx.fillRect(6, 14, 2, 2);
    cx.fillRect(9, 13, 2, 2);
    // Tail
    cx.fillStyle = '#D8D4C0';
    cx.fillRect(1, 6, 2, 4);
    cx.fillRect(0, 9, 2, 2);
    // Udder
    cx.fillStyle = '#F0C0C0';
    cx.fillRect(5, 12, 4, 2);
  });

  createSprite('animal_goat', S, (cx, s) => {
    // Pixel goat (side view)
    // Body
    cx.fillStyle = '#D4C8A8';
    cx.fillRect(2, 6, 9, 6);
    // Head
    cx.fillStyle = '#C8BC9C';
    cx.fillRect(9, 3, 5, 5);
    // Beard
    cx.fillStyle = '#B8AC8C';
    cx.fillRect(13, 7, 2, 3);
    // Snout
    cx.fillStyle = '#E8C8A8';
    cx.fillRect(12, 5, 3, 3);
    // Eye
    cx.fillStyle = '#222';
    cx.fillRect(10, 4, 1, 1);
    // Ear
    cx.fillStyle = '#E8C8A8';
    cx.fillRect(9, 2, 2, 2);
    // Horns (curved style using rects)
    cx.fillStyle = '#8A7A5A';
    cx.fillRect(10, 1, 1, 3);
    cx.fillRect(11, 0, 1, 2);
    cx.fillRect(12, 1, 1, 1);
    // Legs
    cx.fillStyle = '#B8AC8C';
    cx.fillRect(3, 11, 2, 5);
    cx.fillRect(6, 11, 2, 5);
    cx.fillRect(8, 11, 2, 4);
    // Hooves
    cx.fillStyle = '#555';
    cx.fillRect(3, 14, 2, 2);
    cx.fillRect(6, 14, 2, 2);
    cx.fillRect(8, 13, 2, 2);
    // Tail (upright)
    cx.fillStyle = '#D4C8A8';
    cx.fillRect(1, 4, 2, 4);
    // Markings
    cx.fillStyle = '#A89878';
    cx.fillRect(4, 6, 2, 3);
  });

  createSprite('animal_chicken', S, (cx, s) => {
    // Pixel chicken
    // Body
    cx.fillStyle = '#F0EDE0';
    cx.fillRect(4, 7, 8, 7);
    // Wing
    cx.fillStyle = '#D8D4C0';
    cx.fillRect(5, 8, 5, 4);
    // Head
    cx.fillStyle = '#F0EDE0';
    cx.fillRect(9, 4, 5, 5);
    // Comb (red)
    cx.fillStyle = '#CC2222';
    cx.fillRect(10, 2, 2, 3);
    cx.fillRect(12, 3, 1, 2);
    // Wattle
    cx.fillRect(13, 6, 2, 2);
    // Beak
    cx.fillStyle = '#DDAA20';
    cx.fillRect(13, 6, 3, 2);
    // Eye
    cx.fillStyle = '#222';
    cx.fillRect(11, 5, 1, 1);
    // Legs
    cx.fillStyle = '#DDAA20';
    cx.fillRect(6, 13, 2, 3);
    cx.fillRect(9, 13, 2, 3);
    // Feet
    cx.fillRect(5, 15, 4, 1);
    cx.fillRect(8, 15, 4, 1);
    // Tail feathers
    cx.fillStyle = '#D0C8A8';
    cx.fillRect(2, 6, 3, 4);
    cx.fillRect(1, 7, 2, 3);
  });

  createSprite('animal_bee', S, (cx, s) => {
    // Tiny bee (small, centered)
    // Wings (translucent)
    cx.fillStyle = 'rgba(200,230,255,0.7)';
    cx.fillRect(4, 4, 4, 3);  // left wing
    cx.fillRect(8, 4, 4, 3);  // right wing
    // Body (yellow/black stripes)
    cx.fillStyle = '#F5C020';
    cx.fillRect(5, 7, 6, 5);
    // Black stripes
    cx.fillStyle = '#222';
    cx.fillRect(5, 8, 6, 1);
    cx.fillRect(5, 10, 6, 1);
    // Head
    cx.fillStyle = '#333';
    cx.fillRect(6, 6, 4, 3);
    // Eyes
    cx.fillStyle = '#FFF';
    cx.fillRect(6, 6, 1, 1);
    cx.fillRect(9, 6, 1, 1);
    // Antennae
    cx.fillStyle = '#222';
    cx.fillRect(7, 4, 1, 3);
    cx.fillRect(9, 4, 1, 3);
    cx.fillRect(6, 3, 2, 1);
    cx.fillRect(10, 3, 2, 1);
    // Stinger
    cx.fillStyle = '#AA8800';
    cx.fillRect(7, 11, 2, 2);
    cx.fillRect(8, 13, 1, 1);
  });


  // ---- MINE ENEMIES (detailed pixel art) ----
  
  // MALWARE BOT — Chunky robot, antenna twitches, red LED eye
  createSprite('enemy_malware_bot', S*2, (cx, s) => {
    // Feet/treads
    cx.fillStyle='#444';cx.fillRect(6,28,6,4);cx.fillRect(20,28,6,4);
    cx.fillStyle='#555';cx.fillRect(7,28,4,3);cx.fillRect(21,28,4,3);
    // Legs
    cx.fillStyle='#667';cx.fillRect(8,24,5,5);cx.fillRect(19,24,5,5);
    // Body — chunky box
    cx.fillStyle='#556';cx.fillRect(5,10,22,15);
    cx.fillStyle='#667';cx.fillRect(6,11,20,13);
    // Chest plate detail
    cx.fillStyle='#445';cx.fillRect(6,10,20,4);
    cx.fillStyle='#4A4A55';cx.fillRect(8,14,16,2);
    // Rivets
    cx.fillStyle='#889';cx.fillRect(7,12,2,2);cx.fillRect(23,12,2,2);cx.fillRect(7,22,2,2);cx.fillRect(23,22,2,2);
    // Red scanning eye (big)
    cx.fillStyle='#A00';cx.fillRect(10,16,12,5);
    cx.fillStyle='#F33';cx.fillRect(11,17,10,3);
    cx.fillStyle='#F66';cx.fillRect(13,17,6,3);
    cx.fillStyle='#FCC';cx.fillRect(15,18,2,1);
    // Mouth grille
    cx.fillStyle='#333';cx.fillRect(11,22,10,2);
    cx.fillStyle='#444';cx.fillRect(12,22,2,1);cx.fillRect(16,22,2,1);cx.fillRect(20,22,1,1);
    // Arms
    cx.fillStyle='#556';cx.fillRect(2,14,4,8);cx.fillRect(26,14,4,8);
    cx.fillStyle='#667';cx.fillRect(3,22,3,3);cx.fillRect(26,22,3,3);
    // Antenna base
    cx.fillStyle='#778';cx.fillRect(15,6,2,5);
    // Antenna top — LED blinks
    cx.fillStyle='#F33';cx.fillRect(14,4,4,3);
    cx.fillStyle='#F66';cx.fillRect(15,5,2,1);
    // Shoulder bolts
    cx.fillStyle='#889';cx.fillRect(5,13,2,2);cx.fillRect(25,13,2,2);
  });
  createSprite('enemy_malware_bot_atk', S*2, (cx, s) => {
    // Attack frame: eye bright, sparks
    cx.fillStyle='#444';cx.fillRect(6,28,6,4);cx.fillRect(20,28,6,4);
    cx.fillStyle='#667';cx.fillRect(8,24,5,5);cx.fillRect(19,24,5,5);
    cx.fillStyle='#556';cx.fillRect(5,10,22,15);
    cx.fillStyle='#667';cx.fillRect(6,11,20,13);
    cx.fillStyle='#445';cx.fillRect(6,10,20,4);
    cx.fillStyle='#F33';cx.fillRect(10,16,12,5);
    cx.fillStyle='#FF6';cx.fillRect(11,17,10,3);
    cx.fillStyle='#FFF';cx.fillRect(13,17,6,3);
    cx.fillStyle='#778';cx.fillRect(15,6,2,5);
    cx.fillStyle='#FF0';cx.fillRect(14,3,4,4);
    // Spark effects
    cx.fillStyle='#FF0';cx.fillRect(2,10,2,2);cx.fillRect(28,10,2,2);
    cx.fillStyle='#F80';cx.fillRect(0,14,2,1);cx.fillRect(30,14,2,1);
    cx.fillStyle='#556';cx.fillRect(2,14,4,8);cx.fillRect(26,14,4,8);
  });

  // PHISHING WORM — Segmented body, undulating
  createSprite('enemy_phishing_worm', S*2, (cx, s) => {
    // Segments (5 body parts, different green shades)
    const greens = ['#5F5','#4E4','#3D3','#4C4','#3B3'];
    for(let i=0;i<5;i++){
      cx.fillStyle=greens[i];
      cx.beginPath();cx.arc(16+Math.sin(i*0.7)*4,8+i*5,4-i*0.3,0,Math.PI*2);cx.fill();
      cx.fillStyle='#2A2';cx.fillRect(14+Math.sin(i*0.7)*4,8+i*5,1,1);
    }
    // Head (bigger)
    cx.fillStyle='#6F6';cx.beginPath();cx.arc(16,6,5,0,Math.PI*2);cx.fill();
    // Eyes
    cx.fillStyle='#F00';cx.fillRect(13,4,2,2);cx.fillRect(17,4,2,2);
    // Mouth (closed)
    cx.fillStyle='#2A2';cx.fillRect(14,8,4,1);
    // Tail
    cx.fillStyle='#2A2';cx.fillRect(15,28,2,3);
  });

  // SCRIPT KIDDIE — Hoodie figure with laptop, matrix code
  createSprite('enemy_script_kiddie', S*2, (cx, s) => {
    // Legs
    cx.fillStyle='#313';cx.fillRect(9,27,5,5);cx.fillRect(18,27,5,5);
    // Shoes
    cx.fillStyle='#222';cx.fillRect(8,30,6,2);cx.fillRect(17,30,6,2);
    // Body (hoodie)
    cx.fillStyle='#424';cx.fillRect(7,15,18,13);
    cx.fillStyle='#535';cx.fillRect(8,16,16,11);
    // Hoodie pouch
    cx.fillStyle='#3A3';cx.fillRect(11,22,10,4);
    // Arms
    cx.fillStyle='#424';cx.fillRect(4,16,4,10);cx.fillRect(24,16,4,10);
    // Hands on laptop
    cx.fillStyle='#FFD5A0';cx.fillRect(4,25,4,2);cx.fillRect(24,25,4,2);
    // Hood
    cx.fillStyle='#535';cx.fillRect(8,8,16,9);
    cx.fillStyle='#646';cx.fillRect(9,6,14,5);
    // Hood peak
    cx.fillStyle='#535';cx.fillRect(12,5,8,3);
    // Face glow (screen reflection)
    cx.fillStyle='#0F0';cx.fillRect(11,12,10,5);
    cx.fillStyle='#0A0';cx.fillRect(12,13,8,3);
    // Eyes (glowing green)
    cx.fillStyle='#0F0';cx.fillRect(12,13,3,2);cx.fillRect(17,13,3,2);
    cx.fillStyle='#AFA';cx.fillRect(13,13,1,1);cx.fillRect(18,13,1,1);
    // Laptop
    cx.fillStyle='#222';cx.fillRect(3,25,12,5);
    cx.fillStyle='#333';cx.fillRect(4,25,10,4);
    // Screen glow
    cx.fillStyle='#0F0';cx.fillRect(5,26,8,2);
    // Matrix code drips
    cx.fillStyle='rgba(0,255,0,0.5)';
    cx.fillRect(10,1,1,4);cx.fillRect(15,2,1,3);cx.fillRect(20,0,1,5);cx.fillRect(7,3,1,2);
  });

  // CRYPTOJACKER — Dark hooded figure with glowing orange pickaxe
  createSprite('enemy_cryptojacker', S*2, (cx, s) => {
    // Feet
    cx.fillStyle='#1A0A00';cx.fillRect(9,28,5,4);cx.fillRect(18,28,5,4);
    // Legs
    cx.fillStyle='#2A1A0A';cx.fillRect(10,24,4,5);cx.fillRect(18,24,4,5);
    // Body (dark cloak)
    cx.fillStyle='#2A1A0A';cx.fillRect(7,12,18,14);
    cx.fillStyle='#3A2A1A';cx.fillRect(8,13,16,12);
    // Cloak trim
    cx.fillStyle='#F7931A';cx.fillRect(7,25,18,1);
    // Hood
    cx.fillStyle='#3A2A1A';cx.fillRect(9,6,14,9);
    cx.fillStyle='#2A1A0A';cx.fillRect(10,4,12,5);
    cx.fillStyle='#1A0A00';cx.fillRect(12,3,8,3);
    // Face shadow
    cx.fillStyle='#0A0500';cx.fillRect(11,10,10,4);
    // Orange glowing eyes
    cx.fillStyle='#F7931A';cx.fillRect(12,11,3,2);cx.fillRect(17,11,3,2);
    cx.fillStyle='#FFB84D';cx.fillRect(13,11,1,1);cx.fillRect(18,11,1,1);
    // Right arm with pickaxe
    cx.fillStyle='#2A1A0A';cx.fillRect(24,12,4,10);
    // Pickaxe handle
    cx.fillStyle='#664';cx.fillRect(27,8,2,14);
    // Pickaxe head (orange glow)
    cx.fillStyle='#F7931A';cx.fillRect(24,6,8,3);
    cx.fillStyle='#FFB84D';cx.fillRect(25,7,6,1);
    // Left arm
    cx.fillStyle='#2A1A0A';cx.fillRect(4,12,4,10);
    // Mining particles
    cx.fillStyle='rgba(247,147,26,0.6)';cx.fillRect(6,8,2,2);cx.fillRect(22,4,2,2);cx.fillRect(14,2,2,2);
  });

  // RANSOMWARE — Floating skull with lock symbol, chain links
  createSprite('enemy_ransomware', S*2, (cx, s) => {
    // Red aura circle
    cx.fillStyle='rgba(255,0,0,0.1)';cx.beginPath();cx.arc(16,16,14,0,Math.PI*2);cx.fill();
    // Skull base
    cx.fillStyle='#622';cx.beginPath();cx.arc(16,14,10,0,Math.PI*2);cx.fill();
    cx.fillStyle='#733';cx.beginPath();cx.arc(16,14,8,0,Math.PI*2);cx.fill();
    // Jaw
    cx.fillStyle='#622';cx.fillRect(9,20,14,6);
    cx.fillStyle='#511';cx.fillRect(10,21,12,4);
    // Teeth
    cx.fillStyle='#FFF';for(let i=0;i<5;i++)cx.fillRect(11+i*2,21,1,2);
    // Eye sockets (glowing)
    cx.fillStyle='#000';cx.fillRect(10,11,5,5);cx.fillRect(17,11,5,5);
    cx.fillStyle='#F44';cx.fillRect(11,12,3,3);cx.fillRect(18,12,3,3);
    cx.fillStyle='#F88';cx.fillRect(12,12,1,1);cx.fillRect(19,12,1,1);
    // Lock symbol on forehead
    cx.fillStyle='#FF0';cx.fillRect(14,7,4,4);
    cx.fillStyle='#CC0';cx.fillRect(14,5,4,3);
    cx.fillStyle='#622';cx.fillRect(15,6,2,2);
    // Chain links (orbiting)
    cx.fillStyle='#888';
    cx.fillRect(2,12,3,2);cx.fillRect(4,14,2,3);
    cx.fillRect(27,12,3,2);cx.fillRect(26,14,2,3);
    cx.fillRect(14,28,4,2);cx.fillRect(12,26,2,3);cx.fillRect(18,26,2,3);
  });

  // FIAT PRINTER — Mechanical box on legs with money flying out
  createSprite('enemy_fiat_printer', S*2, (cx, s) => {
    // Legs (mechanical)
    cx.fillStyle='#666';cx.fillRect(8,26,4,6);cx.fillRect(20,26,4,6);
    cx.fillStyle='#555';cx.fillRect(7,30,6,2);cx.fillRect(19,30,6,2);
    // Body (industrial printer box)
    cx.fillStyle='#555';cx.fillRect(5,12,22,15);
    cx.fillStyle='#666';cx.fillRect(6,13,20,13);
    // Top panel
    cx.fillStyle='#777';cx.fillRect(5,10,22,4);
    // Paper slot (output)
    cx.fillStyle='#444';cx.fillRect(8,14,16,3);
    cx.fillStyle='#333';cx.fillRect(9,14,14,2);
    // Control panel
    cx.fillStyle='#333';cx.fillRect(8,20,16,4);
    // Buttons
    cx.fillStyle='#F00';cx.fillRect(9,21,2,2);
    cx.fillStyle='#0F0';cx.fillRect(12,21,2,2);
    cx.fillStyle='#FF0';cx.fillRect(15,21,2,2);
    // Warning lights
    cx.fillStyle='#F00';cx.fillRect(20,21,2,2);
    // Exhaust pipe
    cx.fillStyle='#444';cx.fillRect(24,14,4,6);
    cx.fillStyle='#333';cx.fillRect(25,14,2,5);
    // Money flying out
    cx.fillStyle='#6C6';cx.fillRect(10,8,8,4);
    cx.fillStyle='#4A4';cx.fillRect(11,9,6,2);
    cx.fillStyle='#6C6';cx.fillRect(6,4,6,3);
    cx.fillStyle='#4A4';cx.fillRect(7,5,4,1);
    cx.fillStyle='#6C6';cx.fillRect(18,2,7,3);
    // Dollar signs
    cx.fillStyle='#060';cx.font='6px sans-serif';cx.textAlign='center';
    cx.fillText('$',14,11);cx.fillText('$',9,6);cx.fillText('$',21,4);
    // Smoke from exhaust
    cx.fillStyle='rgba(150,150,150,0.3)';cx.beginPath();cx.arc(27,12,3,0,Math.PI*2);cx.fill();
    cx.fillStyle='rgba(150,150,150,0.2)';cx.beginPath();cx.arc(29,8,4,0,Math.PI*2);cx.fill();
  });

  // ZERO DAY — Spider-like with 8 legs, purple/dark, glitch effect
  createSprite('enemy_zero_day', S*2, (cx, s) => {
    // Body (dark purple/black)
    cx.fillStyle='#1A0A1A';cx.beginPath();cx.arc(16,16,7,0,Math.PI*2);cx.fill();
    cx.fillStyle='#2A1A2A';cx.beginPath();cx.arc(16,16,5,0,Math.PI*2);cx.fill();
    // Abdomen
    cx.fillStyle='#1A0A1A';cx.beginPath();cx.arc(16,22,5,0,Math.PI*2);cx.fill();
    // 8 legs
    cx.strokeStyle='#3A2A3A';cx.lineWidth=1.5;
    for(let leg=0;leg<8;leg++){
      const side=leg<4?-1:1;const idx=leg%4;
      const angles=[0.3,0.8,1.3,1.8];
      const angle=angles[idx]*side;
      cx.beginPath();
      cx.moveTo(16+Math.cos(angle)*5,16+Math.sin(angle)*3);
      cx.lineTo(16+Math.cos(angle)*14,16+Math.sin(angle)*12);
      cx.stroke();
      // Leg joints
      cx.fillStyle='#4A3A4A';
      cx.fillRect(15+Math.cos(angle)*10,15+Math.sin(angle)*8,2,2);
    }
    // Eyes (multiple, spider-like, red)
    cx.fillStyle='#F00';
    cx.fillRect(13,13,2,2);cx.fillRect(17,13,2,2);
    cx.fillRect(12,15,2,1);cx.fillRect(18,15,2,1);
    // Fangs
    cx.fillStyle='#806';cx.fillRect(14,17,2,3);cx.fillRect(16,17,2,3);
    // Digital glitch marks
    cx.fillStyle='rgba(128,0,255,0.3)';
    cx.fillRect(4,10,3,1);cx.fillRect(24,8,4,1);cx.fillRect(8,24,5,1);
    cx.fillRect(20,22,3,1);cx.fillRect(2,16,2,1);
  });

  // POOL OPERATOR (BOSS) — Tall imposing figure, golden crown, cape
  createSprite('enemy_pool_operator', S*2, (cx, s) => {
    // Cape (billowing)
    cx.fillStyle='#400';cx.fillRect(4,14,24,16);
    cx.fillStyle='#500';cx.fillRect(5,15,22,14);
    cx.fillStyle='#300';cx.fillRect(3,18,2,10);cx.fillRect(27,18,2,10);
    // Boots
    cx.fillStyle='#222';cx.fillRect(9,28,5,4);cx.fillRect(18,28,5,4);
    // Body (dark armor)
    cx.fillStyle='#222';cx.fillRect(8,14,16,15);
    cx.fillStyle='#333';cx.fillRect(9,15,14,13);
    // Armor details
    cx.fillStyle='#FFD700';cx.fillRect(14,16,4,2); // chest emblem
    cx.fillStyle='#444';cx.fillRect(10,20,12,1);
    cx.fillStyle='#444';cx.fillRect(10,24,12,1);
    // Shoulders (pauldrons)
    cx.fillStyle='#444';cx.fillRect(5,13,6,4);cx.fillRect(21,13,6,4);
    cx.fillStyle='#555';cx.fillRect(6,14,4,2);cx.fillRect(22,14,4,2);
    // Arms
    cx.fillStyle='#333';cx.fillRect(4,16,4,10);cx.fillRect(24,16,4,10);
    // Gauntlets
    cx.fillStyle='#FFD700';cx.fillRect(4,24,4,3);cx.fillRect(24,24,4,3);
    // Head
    cx.fillStyle='#1A1A1A';cx.fillRect(10,6,12,9);
    cx.fillStyle='#222';cx.fillRect(11,7,10,7);
    // Face
    cx.fillStyle='#F70';cx.fillRect(12,9,3,3);cx.fillRect(17,9,3,3); // orange eyes
    cx.fillStyle='#FFA500';cx.fillRect(13,10,1,1);cx.fillRect(18,10,1,1); // eye highlight
    cx.fillStyle='#F00';cx.fillRect(13,13,6,1); // mouth
    // Crown (golden)
    cx.fillStyle='#FFD700';cx.fillRect(9,3,14,4);
    cx.fillStyle='#FFC800';cx.fillRect(10,4,12,2);
    // Crown points
    cx.fillStyle='#FFD700';
    cx.fillRect(10,1,3,4);cx.fillRect(15,0,3,5);cx.fillRect(20,1,3,4);
    // Crown gems
    cx.fillStyle='#F00';cx.fillRect(11,2,1,1);cx.fillRect(16,1,1,1);cx.fillRect(21,2,1,1);
    // Golden aura
    cx.fillStyle='rgba(255,215,0,0.08)';cx.beginPath();cx.arc(16,16,15,0,Math.PI*2);cx.fill();
  });
  createSprite('enemy_pool_operator_p2', S*2, (cx, s) => {
    // Phase 2: enraged — red crown, fire eyes, cracked ground
    // Cape (red, billowing wider)
    cx.fillStyle='#800';cx.fillRect(2,14,28,16);
    cx.fillStyle='#A00';cx.fillRect(3,15,26,14);
    // Boots
    cx.fillStyle='#222';cx.fillRect(9,28,5,4);cx.fillRect(18,28,5,4);
    // Body
    cx.fillStyle='#222';cx.fillRect(8,14,16,15);
    cx.fillStyle='#333';cx.fillRect(9,15,14,13);
    cx.fillStyle='#F00';cx.fillRect(14,16,4,2); // red chest
    cx.fillStyle='#444';cx.fillRect(10,20,12,1);
    // Shoulders
    cx.fillStyle='#444';cx.fillRect(5,13,6,4);cx.fillRect(21,13,6,4);
    // Arms
    cx.fillStyle='#333';cx.fillRect(4,16,4,10);cx.fillRect(24,16,4,10);
    cx.fillStyle='#F00';cx.fillRect(4,24,4,3);cx.fillRect(24,24,4,3);
    // Head
    cx.fillStyle='#1A1A1A';cx.fillRect(10,6,12,9);
    cx.fillStyle='#222';cx.fillRect(11,7,10,7);
    // Fire eyes
    cx.fillStyle='#F00';cx.fillRect(12,9,3,3);cx.fillRect(17,9,3,3);
    cx.fillStyle='#FF0';cx.fillRect(13,9,1,2);cx.fillRect(18,9,1,2);
    cx.fillStyle='#F00';cx.fillRect(12,7,3,2);cx.fillRect(17,7,3,2); // fire above eyes
    cx.fillStyle='#F00';cx.fillRect(13,13,6,1);
    // Red Crown
    cx.fillStyle='#F00';cx.fillRect(9,3,14,4);
    cx.fillStyle='#D00';cx.fillRect(10,4,12,2);
    cx.fillStyle='#F00';cx.fillRect(10,1,3,4);cx.fillRect(15,0,3,5);cx.fillRect(20,1,3,4);
    cx.fillStyle='#FF0';cx.fillRect(11,2,1,1);cx.fillRect(16,1,1,1);cx.fillRect(21,2,1,1);
    // Red aura
    cx.fillStyle='rgba(255,0,0,0.12)';cx.beginPath();cx.arc(16,16,16,0,Math.PI*2);cx.fill();
    // Ground cracks
    cx.fillStyle='#F40';cx.fillRect(6,30,2,2);cx.fillRect(12,31,3,1);cx.fillRect(22,30,2,2);
  });

  // ---- DUNGEON DECORATIONS ----
  
  createSprite('deco_server_rack', S*2, (cx, s) => {
    cx.fillStyle='#2A2A30';cx.fillRect(4,2,24,28);
    cx.fillStyle='#3A3A44';cx.fillRect(5,3,22,26);
    // Drive bays
    for(let i=0;i<5;i++){
      cx.fillStyle='#222';cx.fillRect(6,4+i*5,20,4);
      cx.fillStyle='#333';cx.fillRect(7,5+i*5,18,2);
      // LEDs
      cx.fillStyle=i%2?'#0F0':'#F7931A';cx.fillRect(22,5+i*5,2,1);
    }
    cx.fillStyle='#444';cx.fillRect(4,2,24,2);cx.fillRect(4,28,24,2);
  });
  
  createSprite('deco_broken_monitor', S*2, (cx, s) => {
    cx.fillStyle='#333';cx.fillRect(4,6,24,18);
    cx.fillStyle='#444';cx.fillRect(5,7,22,16);
    // Cracked screen (dark with crack lines)
    cx.fillStyle='#111';cx.fillRect(6,8,20,14);
    cx.fillStyle='#0A0A20';cx.fillRect(7,9,18,12);
    // Cracks
    cx.fillStyle='#444';cx.fillRect(10,9,1,6);cx.fillRect(10,14,5,1);cx.fillRect(15,12,1,4);cx.fillRect(15,12,4,1);
    // Sparks
    cx.fillStyle='#FF0';cx.fillRect(16,10,2,1);
    // Stand
    cx.fillStyle='#555';cx.fillRect(12,24,8,4);cx.fillRect(10,27,12,2);
  });
  
  createSprite('deco_cables', S, (cx, s) => {
    cx.strokeStyle='#445';cx.lineWidth=2;
    cx.beginPath();cx.moveTo(0,4);cx.quadraticCurveTo(8,10,16,6);cx.stroke();
    cx.strokeStyle='#F7931A';cx.lineWidth=1;
    cx.beginPath();cx.moveTo(0,10);cx.quadraticCurveTo(8,14,16,8);cx.stroke();
    cx.strokeStyle='#344';cx.lineWidth=1.5;
    cx.beginPath();cx.moveTo(2,14);cx.quadraticCurveTo(10,8,14,14);cx.stroke();
  });
  
  createSprite('deco_vent_grate', S, (cx, s) => {
    cx.fillStyle='#3A3A40';cx.fillRect(1,1,14,14);
    cx.fillStyle='#2A2A30';
    for(let i=0;i<5;i++)cx.fillRect(2,2+i*3,12,1);
  });

  createSprite('deco_loot_chest', S*2, (cx, s) => {
    // Chest body
    cx.fillStyle='#6A4A2A';cx.fillRect(4,12,24,14);
    cx.fillStyle='#8A6A3A';cx.fillRect(5,13,22,12);
    // Lid
    cx.fillStyle='#7A5A30';cx.fillRect(3,8,26,6);
    cx.fillStyle='#9A7A48';cx.fillRect(4,9,24,4);
    // Metal bands
    cx.fillStyle='#888';cx.fillRect(4,8,24,2);cx.fillRect(4,20,24,2);
    // Lock
    cx.fillStyle='#FFD700';cx.fillRect(14,13,4,4);
    cx.fillStyle='#CCA000';cx.fillRect(15,11,2,3);
    cx.fillStyle='#6A4A2A';cx.fillRect(15,12,2,1);
    // Gems
    cx.fillStyle='#F44';cx.fillRect(8,15,2,2);
    cx.fillStyle='#44F';cx.fillRect(22,15,2,2);
  });
  
  createSprite('deco_crate', S*2, (cx, s) => {
    cx.fillStyle='#6A5A3A';cx.fillRect(4,4,24,24);
    cx.fillStyle='#8A7A5A';cx.fillRect(5,5,22,22);
    // Cross boards
    cx.fillStyle='#5A4A2A';
    cx.fillRect(4,15,24,2);cx.fillRect(15,4,2,24);
    // Nails
    cx.fillStyle='#AAA';cx.fillRect(6,16,1,1);cx.fillRect(25,16,1,1);cx.fillRect(16,6,1,1);cx.fillRect(16,25,1,1);
  });

  // ---- OVERWORLD DECORATIONS ----

  createSprite('deco_well', S*2, (cx, s) => {
    // Stone well base
    cx.fillStyle='#7A7A80';cx.fillRect(4,16,24,12);
    cx.fillStyle='#6A6A70';cx.fillRect(6,14,20,4);
    // Water inside
    cx.fillStyle='#4488CC';cx.fillRect(8,18,16,8);
    cx.fillStyle='#66AADD';cx.fillRect(10,20,12,4);
    // Roof posts
    cx.fillStyle='#664';cx.fillRect(6,4,3,14);cx.fillRect(23,4,3,14);
    // Roof
    cx.fillStyle='#8B4020';cx.fillRect(4,2,24,4);
    cx.fillStyle='#6A3018';cx.fillRect(2,0,28,3);
    // Rope
    cx.fillStyle='#AA8844';cx.fillRect(15,4,2,14);
    // Bucket
    cx.fillStyle='#8A7A60';cx.fillRect(13,16,6,5);
  });

  createSprite('deco_signpost', S*2, (cx, s) => {
    // Post
    cx.fillStyle='#664';cx.fillRect(14,8,4,24);
    // Sign board
    cx.fillStyle='#8A6A40';cx.fillRect(4,4,24,10);
    cx.fillStyle='#7A5A30';cx.fillRect(5,5,22,8);
    // Bitcoin symbol
    cx.fillStyle='#F7931A';
    cx.font='bold 9px sans-serif';cx.textAlign='center';
    cx.fillText('\u20bf VALLEY',16,12);
  });

  createSprite('deco_campfire', S*2, (cx, s) => {
    // Stone ring
    cx.fillStyle='#666';
    cx.fillRect(6,22,4,4);cx.fillRect(10,24,4,4);cx.fillRect(16,24,4,4);
    cx.fillRect(20,22,4,4);cx.fillRect(8,18,4,4);cx.fillRect(18,18,4,4);
    // Logs
    cx.fillStyle='#553';cx.fillRect(10,20,12,4);
    cx.fillStyle='#442';cx.fillRect(8,18,6,3);cx.fillRect(16,19,8,3);
    // Flames
    cx.fillStyle='#F80';cx.fillRect(12,12,8,10);
    cx.fillStyle='#FF0';cx.fillRect(13,8,6,8);
    cx.fillStyle='#FFA';cx.fillRect(14,6,4,6);
  });

  console.log(`✅ ${Object.keys(SpriteCache).length} sprites generated`);
}

// Helper to draw a cached sprite scaled up
function drawSprite(name, x, y, scale = 3) {
  const spr = SpriteCache[name];
  if (!spr) return;
  ctx.drawImage(spr, x, y, spr.width * scale, spr.height * scale);
}

window.SpriteCache = SpriteCache;
window.createSprite = createSprite;
window.initSprites = initSprites;
window.drawSprite = drawSprite;
