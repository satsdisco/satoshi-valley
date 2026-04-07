// ============================================================
// SATOSHI VALLEY — QUESTS / STORY / TUTORIAL
// Extracted from game.js during Sprint 17 modularization
// Loaded as a classic script BEFORE game.js — shares global scope
// ============================================================

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
  { msg: '🪵 Chop trees with the axe to get WOOD. Craft FENCE POSTS (2 wood each) at the bench. Place fences with R or Shift+Click!', trigger: 'press' },
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
// NPC QUEST SYSTEM — Multi-step quest chains
// ============================================================
const NPC_QUESTS = {
  'Ruby': [
    { id:'ruby_1', title:'Keeping the Lights On', task:'Place a mining rig',
      intro:'"Your uncle\'s old rigs are barely holding together. Tell you what — place a new one and I\'ll throw in some copper. I owe Toshi that much."',
      check:()=>objectives.find(o=>o.id==='place_rig')?.done,
      reward:{sats:500,items:[{id:'copper_ore',qty:3}]},
      dialogue:'"That hum... I haven\'t heard a new rig spin up since Toshi was here. He\'d be smiling right now. Here — copper from his last order."',
      lore:'Ruby was your uncle\'s first friend in the valley. She sold him his first CPU miner in 2019.' },
    { id:'ruby_2', title:'Off the Grid', task:'Place a solar panel',
      intro:'"Listen, grid power costs are killing everyone. Your uncle always dreamed of going fully off-grid. Solar panels — that\'s the way. I\'ve got one ready for you."',
      check:()=>objectives.find(o=>o.id==='place_solar')?.done,
      reward:{sats:1000,items:[{id:'battery',qty:1}]},
      dialogue:'"Off-grid mining! That\'s REAL proof of work. Your uncle tried for years — never quite got there. Take this battery. Finish what he started."',
      lore:'Ruby believes in energy independence. She\'s been solar-powered since before it was cool.' },
    { id:'ruby_3', title:'Serious Mining', task:'Buy a GPU rig',
      intro:'"CPU mining was fine when this valley was young. But if you want to actually stack sats, you need real hashrate. A GPU rig. I\'ve got the parts."',
      check:()=>objectives.find(o=>o.id==='buy_gpu')?.done,
      reward:{sats:3000},
      dialogue:'"Now you\'re playing with real fire. Your uncle\'s last words to me were: \'Make sure whoever inherits this place upgrades the hashrate.\' Done."',
      lore:'The first GPU rig in the valley was built by Ruby herself — cobbled together from parts she found in the abandoned data center.' },
    { id:'ruby_4', title:'The Beast Awakens', task:'Place an ASIC S21',
      intro:'"There\'s one more level. The ASIC. Industrial grade. Your uncle ordered one before he... well. It arrived last week. Want to finish what he started?"',
      check:()=>rigs.some(r=>r.tier===2),
      reward:{sats:10000,items:[{id:'advanced_rig_part',qty:2}]},
      dialogue:'"That sound. That beautiful, terrifying sound. You\'re now running more hashrate than this entire valley did three years ago. Toshi would weep."' },
  ],
  'Hodl Hannah': [
    { id:'hannah_1', title:'Seeds of the Future', task:'Plant 3 crops',
      intro:'"Your uncle\'s garden was the envy of the valley. He said farming and Bitcoin were the same thing — plant seeds, be patient, reap rewards. Let\'s start with 3 crops."',
      check:()=>crops.length>=3||skills.farming.level>=2,
      reward:{sats:300,items:[{id:'corn_seed',qty:5}]},
      dialogue:'"See? Patience. The soil doesn\'t care about your timeline. It grows when it grows. Just like sats. Here — corn seeds. Toshi\'s favorite."',
      lore:'Hannah learned to garden from your uncle. He told her it was the best metaphor for low time preference.' },
    { id:'hannah_2', title:'Harvest Moon', task:'Reach farming level 3',
      intro:'"Growing things is one thing. Understanding the CYCLE is another. Tend your garden through at least one full season. Feel the rhythm."',
      check:()=>skills.farming.level>=3,
      reward:{sats:800,items:[{id:'pumpkin_seed',qty:3}]},
      dialogue:'"You felt it, didn\'t you? The rhythm. Plant, tend, harvest, rest, repeat. It\'s the same cycle as the market. Same cycle as life. Here — pumpkin seeds. Save them for Capitulation phase."',
      lore:'Hannah only plants during Accumulation. She says the soil "feels different" during bear markets.' },
    { id:'hannah_3', title:'Diamond Hands', task:'Hold 10,000 sats',
      intro:'"Anyone can earn sats. The real test is holding them. When the market crashes, when the FUD hits, when Larry tells you to trade — can you hold? Stack to 10K and DON\'T spend."',
      check:()=>player.wallet>=10000,
      reward:{sats:2000},
      dialogue:'"You held. Through the noise, through the fear, you held. Your uncle did the same in 2018. Lost 80% of his stack\'s dollar value. Never sold a single sat. That\'s who you come from."',
      lore:'Hannah has never sold a sat. Not once. Not even when bread cost 500 FiatBucks.' },
    { id:'hannah_4', title:'The Toshi Way', task:'Own a cow, goat, and grow crops',
      intro:'"Your uncle believed in total self-sufficiency. Food. Power. Money. All sovereign. Build a real homestead — animals AND crops. The full Toshi way."',
      check:()=>animals.some(a=>a.type==='cow')&&animals.some(a=>a.type==='goat')&&crops.length>=5,
      reward:{sats:5000,items:[{id:'feed',qty:30}]},
      dialogue:'"Look at this place. Animals, gardens, rigs humming. Your uncle drew this exact picture on a napkin once. Said \'someday.\' You built his someday."' },
  ],
  'The Hermit': [
    { id:'hermit_1', title:'The First Word', task:'Find 3 seed phrase words',
      intro:'"So you found one of Toshi\'s words. He hid 24 across this valley. Each one is a piece of history — not just his history, but Bitcoin\'s. Find 3 more. Start in the forest."',
      check:()=>foundWords.length>=3,
      reward:{sats:2000,items:[{id:'silicon',qty:5}]},
      dialogue:'"Three words. Three moments in time. The genesis, the first transaction, the first purchase. You\'re walking through history. Here — silicon. You\'ll need it later."',
      lore:'The Hermit claims he was present for the first Bitcoin transaction. He won\'t say more.' },
    { id:'hermit_2', title:'Deeper Truth', task:'Find 10 seed phrase words',
      intro:'"You\'re deep enough now to hear the real story. The forks, the wars, the betrayals. Bitcoin survived them all. Find 10 words total."',
      check:()=>foundWords.length>=10,
      reward:{sats:10000},
      dialogue:'"Mt. Gox. The DAO. The Block Size Wars. Each crisis made Bitcoin stronger. Each word you find is a scar that healed into armor. Your uncle understood this."',
      lore:'During the Block Size Wars, the Hermit ran a UASF node from this very forest.' },
    { id:'hermit_3', title:'The Complete Seed', task:'Find all 24 seed phrase words',
      intro:'"You\'re close. The final words are hidden in the hardest places — the mountain peaks, the deep forest, the forgotten corners. Your uncle put them there because only someone truly committed would find them all."',
      check:()=>foundWords.length>=24,
      reward:{sats:100000},
      dialogue:'"You did it. 24 words. A complete seed. But it doesn\'t unlock a wallet full of Bitcoin. It unlocks something more valuable — understanding. Your uncle\'s gift wasn\'t money. It was knowledge. The knowledge that sound money changes everything."',
      lore:'The complete seed phrase spells out a message from Uncle Toshi. Read the first letter of each word.' },
  ],
  'Leverage Larry': [
    { id:'larry_1', title:'Baby Steps', task:'Have 5,000 sats',
      intro:'"Hey, newbie. You know what separates the winners from the losers? Having a stack. You don\'t even have 5K yet? That\'s embarrassing. Stack up."',
      check:()=>player.wallet>=5000,
      reward:{sats:500},
      dialogue:'"5K! That\'s... that\'s actually more than I have right now. Don\'t tell anyone. Here\'s 500 sats — I\'ll get it back on my next trade. Probably."',
      lore:'Larry has been liquidated 47 times. He keeps a tally on his wall.' },
    { id:'larry_2', title:'Hash Rate Hero', task:'Place an ASIC S21',
      intro:'"Bro. BRRROOO. You need an ASIC. The S21. Once you feel that hashrate, you\'ll understand why I took out a loan to buy three. Well, before I got liquidated."',
      check:()=>rigs.some(r=>r.tier===2),
      reward:{sats:5000},
      dialogue:'"THAT\'S what I\'m talking about! Feel that power! 50 TH/s! I had three of these once. For about 4 hours. Then the margin call came. But YOU — you BOUGHT yours. Respect."' },
    { id:'larry_3', title:'To the Moon', task:'Earn 100,000 total sats',
      intro:'"OK real talk. I need to know something. Can you actually make it? Not trade it, not leverage it — MAKE it. Earn 100K total. Prove this farming thing works."',
      check:()=>player.totalEarned>=100000,
      reward:{sats:15000},
      dialogue:'"100K earned. Not borrowed. Not leveraged. Earned. You know what, maybe... maybe your uncle was right. Maybe slow and steady actually works. Don\'t quote me on that."',
      lore:'This is the first time Larry has admitted that maybe HODLing beats trading.' },
  ],
  'Mayor Keynesian': [
    { id:'mayor_1', title:'Civic Duty', task:'Upgrade citadel to Cabin',
      intro:'"Ah, the new homesteader. Listen, this village needs strong properties. Upgrade that shack of yours and I\'ll consider it... a civic contribution. There may be a stimulus in it for you."',
      check:()=>citadelTier>=1,
      reward:{sats:1000},
      dialogue:'"A proper cabin! See, government incentives work. Here\'s your stimulus payment. Please don\'t think too hard about where the money comes from."',
      lore:'The Mayor prints FiatBucks from his office printer. He calls it "quantitative easing."' },
    { id:'mayor_2', title:'Pillar of the Community', task:'Upgrade to Compound',
      intro:'"Your homestead is becoming quite impressive. A Compound would really anchor this end of the village. I\'ll authorize a... substantial grant."',
      check:()=>citadelTier>=3,
      reward:{sats:10000},
      dialogue:'"Magnificent! A true compound. Between you and me — the village finances are... flexible. But your growth justifies the expenditure. Probably."',
      lore:'The Mayor\'s budget has been running a deficit since 2020. He funds it by taxing newcomers.' },
    { id:'mayor_3', title:'The Bitcoin Question', task:'Earn 50,000 sats',
      intro:'"I\'ve been watching your... Bitcoin operation. I have questions. Show me it actually works. Earn 50,000 sats and maybe I\'ll reconsider my position on digital currencies."',
      check:()=>player.totalEarned>=50000,
      reward:{sats:8000},
      dialogue:'"50,000 sats. No bailouts. No stimulus. No printer. Just... work. Hmm. That\'s troubling. For my worldview, I mean. Don\'t tell anyone I said this, but — maybe the hermit isn\'t completely crazy."',
      lore:'This is the beginning of the Mayor\'s redemption arc. He\'s starting to question fiat.' },
  ],
  'Farmer Pete': [
    { id:'pete_1', title:'First Sale', task:'Reach farming level 2',
      intro:'"Nothing better than fresh produce grown with honest work. Sell some crops at my market — I\'ll pay fair price. In sats, of course."',
      check:()=>skills.farming.level>=2,
      reward:{sats:200,items:[{id:'tomato_seed',qty:5}]},
      dialogue:'"Farm to table, no middlemen, paid in sound money. That\'s how your uncle wanted it. Here — tomato seeds. His secret variety."',
      lore:'Pete and Toshi built the farmer\'s market together. Pete still saves Toshi\'s stall spot.' },
    { id:'pete_2', title:'The Rancher\'s Way', task:'Own 3 animals',
      intro:'"A real homestead needs animals. Chickens for eggs. Goats for milk. Cows for... well, you know. Get 3 animals going."',
      check:()=>animals.length>=3,
      reward:{sats:1500,items:[{id:'feed',qty:20}]},
      dialogue:'"Now THAT\'S a proper ranch. Your uncle always said: \'Beef, not seed oils.\' He was ahead of his time on a lot of things."',
      lore:'Pete is a carnivore. He hasn\'t eaten a seed oil in 6 years.' },
    { id:'pete_3', title:'The Circular Economy', task:'Craft cheese and sell it',
      intro:'"Here\'s the beautiful thing about this valley. The goat gives milk. You craft cheese. You sell it at my market. The sats go back into the valley. Circular economy, no fiat needed."',
      check:()=>skills.engineering.level>=2&&skills.farming.level>=4,
      reward:{sats:3000,items:[{id:'corn_seed',qty:10}]},
      dialogue:'"Milk to cheese to sats to seeds to crops to feed to milk. The circle is complete. Your uncle drew this exact diagram. Said it was better than any economics textbook."' },
  ],
  'Saylor': [
    { id:'saylor_1', title:'Corporate Strategy', task:'Own 5 mining rigs',
      intro:'"In my previous life, I ran a company. We put every dollar into Bitcoin. They called us crazy. Now I\'m here, and I\'ll tell you the same thing: stack hash rate."',
      check:()=>rigs.filter(r=>!r.interior).length+rigs.filter(r=>r.interior).length>=5,
      reward:{sats:5000},
      dialogue:'"Five rigs. That\'s a mining operation. Not a hobby — an OPERATION. This is how nations are built. One hash at a time."' },
    { id:'saylor_2', title:'Conviction', task:'Survive 3 market cycles',
      intro:'"Anyone can mine during a bull market. The real test is mining through Capitulation. When everyone says it\'s dead. When the hashrate drops. Do you keep mining?"',
      check:()=>econ.cycle>=3,
      reward:{sats:20000},
      dialogue:'"Three cycles. You mined through crashes, through FUD, through China banning Bitcoin again. That\'s not strategy — that\'s conviction. There is no second best."' },
  ],
  'Pizza Pete': [
    { id:'pizza_1', title:'The Pizza Legacy', task:'Catch a fish',
      intro:'"Everyone knows me for the pizza thing. But you know what no one talks about? I was also a pretty good fisherman. Go catch something. I\'ll tell you a story."',
      check:()=>hasItem('salmon')||hasItem('trout')||hasItem('bitcoin_fish'),
      reward:{sats:1000},
      dialogue:'"Nice catch! OK here\'s my story. The night I bought those pizzas, I almost went fishing instead. If I had... history would be different. Sometimes the path not taken matters most."',
      lore:'Pizza Pete still orders two pizzas every May 22nd. He pays in sats now.' },
    { id:'pizza_2', title:'Pizza Day', task:'Earn 10,000 sats on a single day',
      intro:'"May 22nd. That\'s the day. 10,000 BTC for two pizzas. Everyone laughs. But you know what? That transaction PROVED Bitcoin had real-world value. Without it, maybe none of this exists."',
      check:()=>player.totalEarned>=10000,
      reward:{sats:2222,items:[{id:'bread',qty:10}]},
      dialogue:'"You earned 10K in a day. I spent 10K on lunch. We are not the same. But seriously — every sat spent in the real economy makes Bitcoin stronger. I proved that. With pepperoni."',
      lore:'May 22, 2010: Laszlo Hanyecz paid 10,000 BTC for two Papa John\'s pizzas. It was the first known commercial Bitcoin transaction. Those pizzas are now worth billions.' },
    { id:'pizza_3', title:'The Regret Question', task:'Own a Bitcoin Academy',
      intro:'"People always ask: do you regret it? The pizzas. 10,000 Bitcoin. Here\'s what I tell them..."',
      check:()=>placed.some(p=>p.type==='bitcoin_academy'),
      reward:{sats:10000},
      dialogue:'"Do I regret it? No. Because if nobody ever SPENT Bitcoin, it would just be numbers on a screen. I gave it value. I gave it PURPOSE. That\'s what this academy teaches. That Bitcoin is for USING, not just holding. Both matter."',
      lore:'The eternal debate: spend or hold? The answer is both. Bitcoin needs spenders AND savers to function as money. Pizza Pete proved spending works. Hannah proves saving works. Both are right.' },
  ],
  'Seed Sally': [
    { id:'sally_1', title:'The Seed Bank', task:'Plant one of each crop type',
      intro:'"Seeds are like Bitcoin — small, easily dismissed, but given time and care, they become something incredible. Plant one of each type I sell."',
      check:()=>{const types=new Set(crops.map(c=>c.type));return types.has('potato')&&types.has('tomato')&&types.has('corn');},
      reward:{sats:500,items:[{id:'pumpkin_seed',qty:5}]},
      dialogue:'"A diverse garden is a resilient garden. Just like a diverse skill set. Your uncle grew everything — even things nobody thought would survive in this climate. Here, try pumpkins."',
      lore:'Sally was a botanist in Fiatropolis before the inflation got too bad. She moved to the valley after your uncle showed her you could live entirely off the land and Bitcoin.' },
    { id:'sally_2', title:'Food Sovereignty', task:'Have 5 crops growing at once',
      intro:'"In Fiatropolis, people depend on the government for food subsidies. Here, we grow our own. That\'s real sovereignty. Show me a garden with 5 crops going."',
      check:()=>crops.length>=5,
      reward:{sats:1500},
      dialogue:'"Five crops! You\'re more self-sufficient than most families in Fiatropolis. They line up for government bread. You GROW your own. Your uncle said food sovereignty and monetary sovereignty go hand in hand. He was right."',
      lore:'Food in Fiatropolis costs 10x what it did a decade ago. The Mayor blames "supply chain issues." Sally blames money printing.' },
    { id:'sally_3', title:'The Carnivore\'s Garden', task:'Own a cow AND have crops growing',
      intro:'"Your uncle had a theory. He called it the \'Complete Homestead.\' Animals AND plants. Meat AND vegetables. Bitcoin AND real skills. Can you build it?"',
      check:()=>animals.some(a=>a.type==='cow')&&crops.length>=3,
      reward:{sats:3000,items:[{id:'feed',qty:25}]},
      dialogue:'"The Complete Homestead. Beef from your cows, vegetables from your garden, sats from your rigs, power from your panels. No dependence on anyone. Your uncle drew this on his wall. It\'s still there if you look closely in your cabin."',
      lore:'Uncle Toshi believed the ideal life combined three things: sound money (Bitcoin), real food (animal-based + garden), and clean energy (solar). He called it the "sovereign triangle."' },
  ],
};

// ============================================================
// WORLD EVENTS — Story events that trigger based on progress
// ============================================================
const STORY_EVENTS = [
  { id:'fiat_refugees', trigger:()=>citadelTier>=2&&econ.cycle>=2, fired:false,
    text:'🏃 Refugees from Fiatropolis are arriving at the valley! The inflation has gotten unbearable. Some are asking about Bitcoin.',
    effect:()=>{notify('🏃 Fiatropolis refugees arriving! Talk to the Mayor.',5,true);} },
  { id:'bank_wobble', trigger:()=>econ.phase===3&&econ.cycle>=3, fired:false,
    text:'🏦 The Fiat Bank is showing cracks. Withdrawals are being limited. The Mayor looks worried.',
    effect:()=>{notify('🏦 Fiat Bank in trouble! Check the notice board.',5,true);} },
  { id:'merchant_arrives', trigger:()=>player.totalEarned>=25000, fired:false,
    text:'🐪 A traveling merchant has arrived from the Eastern valleys! She trades in rare goods.',
    effect:()=>{notify('🐪 Traveling merchant spotted near the tavern!',5,true);} },
  { id:'lightning_network', trigger:()=>rigs.length>=5&&citadelTier>=2, fired:false,
    text:'⚡ The Lightning Network reaches Satoshi Valley! Instant payments are now possible between buildings.',
    effect:()=>{notify('⚡ Lightning Network activated! Fast travel coming soon.',5,true);} },
  { id:'nostr_social', trigger:()=>Object.values(questProgress).reduce((s,v)=>s+v,0)>=10, fired:false,
    text:'📱 The valley\'s Nostr relay is live! NPCs are posting notes about your achievements.',
    effect:()=>{notify('📱 Valley Nostr relay is live! Check the notice board.',5,true);} },
  { id:'first_conference', trigger:()=>citadelTier>=3&&animals.length>=3, fired:false,
    text:'🎤 The village is hosting its first Bitcoin Conference! All NPCs are gathering at the Town Hall.',
    effect:()=>{notify('🎤 Bitcoin Conference at Town Hall! Everyone\'s invited.',6,true);} },
  { id:'uncle_memory', trigger:()=>foundWords.length>=12, fired:false,
    text:'💭 As you collect more of Uncle Toshi\'s words, memories begin to surface. You remember visiting this valley as a child...',
    effect:()=>{notify('💭 A childhood memory surfaces... Find more seed words.',5,true);} },
  { id:'hyperbitcoinization_begins', trigger:()=>player.totalEarned>=500000&&citadelTier>=4, fired:false,
    text:'🌍 It\'s happening. Fiatropolis has officially collapsed. The world is looking to valleys like yours. Hyperbitcoinization has begun.',
    effect:()=>{notify('🌍 HYPERBITCOINIZATION HAS BEGUN. The world is changing.',8,true);sfx.block();} },
];

// Quest Journal — tracks completed quest stories
let questJournal = []; // [{id, npcName, title, lore, completedDay}]

let questProgress = {}; // {npcName: currentQuestIndex}

function getActiveQuest(npcName) {
  const chain = NPC_QUESTS[npcName];
  if (!chain) return null;
  const idx = questProgress[npcName] || 0;
  if (idx >= chain.length) return null; // all done
  return chain[idx];
}

function checkQuestCompletion(npcName) {
  const quest = getActiveQuest(npcName);
  if (!quest) return false;
  if (quest.check()) {
    // Complete quest — give rewards
    if (quest.reward.sats) { player.wallet += quest.reward.sats; player.totalEarned += quest.reward.sats; }
    if (quest.reward.items) { quest.reward.items.forEach(i => addItem(i.id, i.qty)); }
    // Record in journal
    questJournal.push({ id:quest.id, npcName, title:quest.title, lore:quest.lore||'', completedDay:time.day });
    questProgress[npcName] = (questProgress[npcName] || 0) + 1;
    notify(`🎉 Quest complete: ${quest.title}! +${fmt(quest.reward.sats||0)} sats`, 5, true);
    sfx.block();
    addXP('social', 15);
    return true;
  }
  return false;
}
