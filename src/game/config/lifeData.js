// KING OF DARK: ORB OF LIFE (Scenes 10, 11, and the data for 12). DATA ONLY: no Phaser imports.
// Art space = 960x540 pixels ("art px"). Convert to the game with k = gameHeight / 540 (1280x720 -> k = 4/3).
// Landmarks below are measured from the pictures by eye: APPROXIMATE. Verify with the debug grid (?debug=grid)
// and correct the numbers here, not in the scene code.
// Units in this file: H = hero standing height in game px, S = hero RUN speed in px/s (read both from the existing code).
// Beat vocabulary = the one used by actThreeData.js (fx, line, wait, arrow, waitForX, lockControls, goto) plus the new
// beats marked NEW. Match the exact object shape of ACT3_CORRIDOR_BEATS when you implement the runner.

export const LIFE_ORDER_NOTE = 'Story order now: Fear -> Life. (Time is built later; the script lines for Time are untouched.)';

// ---------- ASSETS (public/assets/Life/) ----------
export const LIFE_ASSETS = {
  outsideBg:  { key: 'life-outside-bg',  path: 'assets/Life/outside_bg.png',  w: 960, h: 540 },
  insideBg:   { key: 'life-inside-bg',   path: 'assets/Life/inside_bg.png',   w: 960, h: 540 },
  npc:        { key: 'life-npc',   path: 'assets/Life/npc_sheet.png',   frameWidth: 64, frameHeight: 64, cols: 5, rows: 5,
                rows_order: ['guard', 'elder', 'kid', 'mother', 'hooded'],
                cols_order: ['idle_a', 'idle_b', 'crouch', 'cheer', 'look'], idleFps: 2, footAnchor: [32, 60],
                // visible figure height inside the 64 px frame (feet at y 60)
                bodyH: { guard: 44, elder: 52, kid: 32, mother: 44, hooded: 44 } },
  crawler:    { chaseRight: { key: 'crawler-chase-right',  path: 'assets/Life/crawler_chase_right_sheet.png' },
                chaseLeft:  { key: 'crawler-chase-left',   path: 'assets/Life/crawler_chase_left_sheet.png' },
                attackRight:{ key: 'crawler-attack-right', path: 'assets/Life/crawler_attack_right_sheet.png' },
                attackLeft: { key: 'crawler-attack-left',  path: 'assets/Life/crawler_attack_left_sheet.png' },
                frameWidth: 352, frameHeight: 218, frames: 8, chaseFps: 8, attackFps: 12,
                feetY: 200,                 // feet row inside the frame
                bodyW: 320, bodyH: 100,     // visible body (facing right: x 0..320; facing left: x 32..352)
                attackHitFrames: [3, 5],    // frames where the bite connects
                eyeGlow: { color: 0xff3b3b, alpha: 0.7 } },
  reveal:     { key: 'life-reveal', path: 'assets/Life/reveal_sheet.png', frameWidth: 400, frameHeight: 300, cols: 8, rows: 3, frames: 24,
                fps: 10, hatchFrames: [0, 9], orbRiseFrames: [10, 23], bodyBox: [40, 108, 364, 244] },  // ring+fire+hatch art, feet of the ring at y ~244
  plaza:      { key: 'life-plaza',  path: 'assets/Life/plaza_idle_sheet.png', frameWidth: 400, frameHeight: 300, frames: 6, fps: 8 },
  altar:      { key: 'life-altar',  path: 'assets/Life/altar_sheet.png', frameWidth: 448, frameHeight: 272, frames: 8, fps: 8 }, // OPTIONAL polish only
  orb:        { key: 'life-orb', anim: 'life-orb-pulse', path: 'assets/Life/life_orb_beacon_sheet.png', frameWidth: 200, frameHeight: 200, frames: 16, frameMs: 80,
                bodyDiameter: 194, hudColor: 0xff4fb0, glow: { color: 0xff4fb0, pulseSeconds: 1.4, radiusH: 1.4 } },
};

// ---------- SCENE 10: THE SETTLEMENT (outside, playable) ----------
export const SETTLEMENT = {
  scene: 'SettlementScene',
  viewFit: 'one screen',          // 960x540 art fits 1280x720 at k=4/3: no scrolling unless the hero is too large (see prompt rule)
  floorFeetY: 392,                // feet line of hero, crawlers, NPCs (art px)
  walkX: [24, 936],               // walkable range
  heroEnterFromX: -40, heroStopX: 150, minaOffsetX: -70,
  landmarks: {                    // art px (approximate)
    fire:      { x: 598, baseY: 330, flameTopY: 296 },
    tree:      { x: 545, baseY: 342 },
    well:      { x: 478, baseY: 362 },
    leftHouse: { doorX: 150, stepsX: 190, stepsY: 356 },
    rightHouse:{ doorX: 838, stepsX: 800, stepsY: 356 },
    bodies:    [355, 514, 612],   // set dressing, keep
  },
  // NPC stand positions (feet x), facing resolved at runtime (flipX allowed for NPCs; use timers, not tweens)
  npcs: {
    guard:  { x: 300, row: 'guard',  faces: 'left',  heightVsHero: 0.95 },
    elder:  { x: 440, row: 'elder',  faces: 'left',  heightVsHero: 0.90 },
    kid:    { x: 650, row: 'kid',    faces: 'left',  heightVsHero: 0.60 },
    hooded: { x: 705, row: 'hooded', faces: 'left',  heightVsHero: 0.92 },
  },
  guardStepAsideX: 230,           // after "Let him in"
  heroConversationX: 420,         // hero walks here after the guard steps aside
  // darkness: ambient already dark in the art, so keep it light
  darkness: { ambientAlpha: 0.30, heroLightRadiusH: 1.6, fireLightMinRadiusH: 1.0, fireLightMaxRadiusH: 3.0 },
  fire: { levelStart: 0.35, levelEnd: 1.0, flickerHz: 7, sparkPool: 10, glowColor: 0xffa24a },
  hatch: { atFire: true, flareSeconds: 1.2, openSeconds: 1.0, revealSheetFrames: [0, 9], fadeInSeconds: 0.5, descendWalkSeconds: 1.2, fadeOutSeconds: 0.9 },
};

// ---------- SCENE 11: THE CHAMBER BENEATH THE FIRE (inside, playable) ----------
export const CHAMBER = {
  scene: 'LifeChamberScene',
  floorFeetY: 408,
  walkX: [24, 936],
  heroEnterFromX: -40, heroStopX: 190,
  landmarks: {
    ring:   { x: 479, y: 383 },                 // floor ring centre (orb rises here)
    torches:[{ x: 165, flameY: 236 }, { x: 803, flameY: 236 }],
  },
  darkness: { ambientAlpha: 0.42, heroLightRadiusH: 1.6, torchLightRadiusH: 1.8, ringGlowRadiusH: 2.2 },
  ringGlow: { levelStart: 0.25, levelEnd: 1.0, color: 0xff4fb0 },
  orbRise: { riseArt: 90, riseSeconds: 2.2, floatToHeroSeconds: 1.5, heldWidthH: 0.35, absorbFlashSeconds: 0.4, bobArt: 4, bobHz: 1.1 },
};

// ---------- CRAWLERS (Shadow Crawler, slow, contact damage) ----------
export const CRAWLER = {
  lengthVsHero: 0.95,            // displayed body length = 0.95 * H  (so body height ~0.3 H)
  speedMult: 0.50,               // x S  (slow; the hero always outruns it)
  hitsToKill: { punch: 3, kick: 2, sword: 2, fire: 1 },  // map to the hero's REAL attack names/damage
  contact: { windupSeconds: 0.35, cooldownSeconds: 1.3, damageFracOfMaxHealth: 0.08, knockbackH: 0.4, range: 0.55 }, // range x H
  hurtStaggerSeconds: 0.25,
  dyingSeconds: 0.6,             // timer-driven shrink/fade into smoke, pooled puff
  lightSlow: { insideFireLight: 0.70 },   // multiplier on speed when inside the fire's light
  separation: 0.35,              // x body length minimum gap between crawlers
};

export const WAVES = {
  settlement: { total: 3, maxAlive: 2, spawns: [{ t: 1.0, side: 'left' }, { t: 3.2, side: 'right' }, { t: 5.6, side: 'left' }], spawnX: { left: -60, right: 1020 } },
  chamber:    { total: 4, maxAlive: 3, spawns: [{ t: 0.8, side: 'right' }, { t: 2.4, side: 'left' }, { t: 4.2, side: 'right' }, { t: 5.8, side: 'left' }], spawnX: { left: -60, right: 1020 } },
};
export const LIFE_FAIL = { fadeOut: 0.6, restartWaveOnly: true, healthRestore: 1.0 };

// ---------- SPEAKERS (extend the ACT3_SPEAKERS shape: name, color, anchor) ----------
export const LIFE_SPEAKERS = {
  GUARD:  { name: 'GUARD',  color: '#d9c7a0' },
  ELDER:  { name: 'ELDER',  color: '#e8d9b0' },
  KID:    { name: 'KID',    color: '#b8e8c8' },
  HOODED: { name: 'HOODED', color: '#b0b0c8' },
  // MINA and HERO already exist in ACT3_SPEAKERS
};
export const COUNT_WORD = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five'];

// ---------- SCENE 9 PATCH (Mina after Fear now points to Life) ----------
export const AFTER_FEAR_TO_LIFE = [
  { t: 'line', who: 'MINA', text: "You found it. The darkness knows what you're doing now." },
  { t: 'line', who: 'HERO', text: 'Then let it come.' },
  { t: 'line', who: 'MINA', text: 'Next is Life. A settlement still lives past the ruined fields.' },
  { t: 'fx', name: 'objective', text: 'FIND THE ORB OF LIFE' },
  { t: 'goto', scene: 'SettlementScene' },
];

// ---------- SCENE 10 BEATS ----------
export const SETTLEMENT_BEATS = [
  { t: 'fx', name: 'fadeIn', seconds: 1.0 },
  { t: 'fx', name: 'heroAndMinaWalkIn' },                              // NEW: auto-walk hero to heroStopX, Mina follows
  { t: 'line', who: 'MINA', text: 'Survivors live here. Be gentle. They have lost more than you know.' },
  { t: 'line', who: 'HERO', text: "I'll be careful." },
  { t: 'line', who: 'GUARD', text: 'Halt! Nobody passes the gate after dark.' },
  { t: 'line', who: 'HERO', text: 'I am only passing through. I need what lies beneath the fire.' },
  { t: 'line', who: 'ELDER', text: 'Let him in. The fire sees what we cannot.' },
  { t: 'fx', name: 'guardStepsAside' },                                // NEW
  { t: 'fx', name: 'heroWalkTo', x: 'heroConversationX' },             // NEW
  { t: 'line', who: 'KID', text: 'Are you the one who broke the sky?' },
  { t: 'fx', name: 'heroLooksAway', seconds: 1.2 },                   // NEW: hero turns away from the kid
  { t: 'line', who: 'HERO', text: '...I am trying to fix it.' },
  { t: 'line', who: 'KID', text: 'Then please hurry.' },
  { t: 'line', who: 'HOODED', text: 'The orb sleeps below the fire. The Crawlers guard it.' },
  { t: 'line', who: 'ELDER', text: 'When the fire dims, they come. Keep it burning.' },
  { t: 'fx', name: 'npcsCrouch' },                                     // NEW
  { t: 'wave', id: 'settlement' },                                     // NEW: playable wave; fire brightens with each kill
  { t: 'fx', name: 'npcsCheer', seconds: 2.0 },                       // NEW
  { t: 'line', who: 'ELDER', text: 'You fought for us. The way below is open.' },
  { t: 'fx', name: 'fireFlare' },                                      // NEW
  { t: 'fx', name: 'hatchOpens' },                                    // NEW: reveal sheet frames 0-9 over the fire pit
  { t: 'fx', name: 'heroDescends' },                                  // NEW: auto-walk into the fire, fade out
  { t: 'goto', scene: 'LifeChamberScene' },
];

// ---------- SCENE 11 BEATS ----------
export const CHAMBER_BEATS = [
  { t: 'fx', name: 'fadeIn', seconds: 1.0 },
  { t: 'fx', name: 'heroWalksIn' },                                    // auto-walk to heroStopX
  { t: 'line', who: 'HERO', text: 'Something green still grows down here.' },
  { t: 'wait', seconds: 1.0 },
  { t: 'wave', id: 'chamber' },                                        // second, bigger wave; ring glow brightens per kill
  { t: 'line', who: 'HERO', text: 'Life holds on, even here.' },
  { t: 'fx', name: 'orbRises' },                                       // pink beacon rises from the ring
  { t: 'fx', name: 'orbToHero' },                                      // floats to the hero, absorbed, flash
  { t: 'fx', name: 'bannerOrb', text: 'ORB OF LIFE', sub: 'Life holds on.' },
  { t: 'fx', name: 'orbCollected', orb: 'life' },                      // registry orbs.life = true once, HUD count pulses
  { t: 'fx', name: 'fadeOut', seconds: 1.0 },
  { t: 'goto', scene: 'AfterLifeScene' },                             // Scene 12 is built later: warn + menu fallback if missing
];

// ---------- SCENE 12 (LATER): Mina after Life ----------
export const AFTER_LIFE_BEATS = [
  { t: 'line', who: 'ELDER', text: 'Take it with our thanks. May it outlive us.' },
  { t: 'line', who: 'MINA', text: "{COUNT}. You're closer than you think." },   // COUNT_WORD[orbCount]
  { t: 'line', who: 'HERO', text: 'Closer to the end, or to what I did?' },
  { t: 'line', who: 'MINA', text: "Both. Only Truth remains, and it's the hardest. Go to the black plains and look for the ring." },
  { t: 'fx', name: 'objective', text: 'FIND THE ORB OF TRUTH' },
];
