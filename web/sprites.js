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


  // ---- MINE ENEMIES ----
  
  createSprite('enemy_malware_bot', S*2, (cx, s) => {
    // Robot body
    cx.fillStyle='#556';cx.fillRect(6,10,20,18);
    cx.fillStyle='#445';cx.fillRect(6,10,20,6);
    // Red scanning eye
    cx.fillStyle='#F33';cx.fillRect(13,14,6,4);
    cx.fillStyle='#F66';cx.fillRect(14,15,4,2);
    // Legs
    cx.fillStyle='#667';cx.fillRect(8,28,5,6);cx.fillRect(19,28,5,6);
    // Antenna
    cx.fillStyle='#778';cx.fillRect(15,4,2,8);
    cx.fillStyle='#F33';cx.fillRect(14,2,4,4);
  });

  createSprite('enemy_script_kiddie', S*2, (cx, s) => {
    // Hoodie
    cx.fillStyle='#424';cx.fillRect(6,14,20,16);
    cx.fillStyle='#535';cx.fillRect(8,8,16,10);
    // Face glow (screen reflection)
    cx.fillStyle='#0F0';cx.fillRect(10,14,12,6);
    cx.fillStyle='#0A0';cx.fillRect(11,15,10,4);
    // Legs
    cx.fillStyle='#313';cx.fillRect(8,30,6,4);cx.fillRect(18,30,6,4);
    // Laptop
    cx.fillStyle='#333';cx.fillRect(4,22,10,6);
    cx.fillStyle='#0F0';cx.fillRect(5,23,8,4);
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
