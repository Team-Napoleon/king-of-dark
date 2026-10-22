// KING OF DARK - ORB 4 = ORB OF TRUTH (Scenes 16, 17, 18) + the FOUR-ORB change for the whole game.
// Copy to: src/game/config/actTruthData.js
// Source: "King of Dark: Full Script (Readable English)" (the 4-orb version; Orb of Souls and its scenes are REMOVED).
// Wording = script wording. Times are SECONDS. Distances: H = hero standing height px, S = hero RUN speed px/s, k = game height / art height.
// Scenes: TruthOutsideScene (data { part: 'before' } = Scene 16, { part: 'reveal' } = Scene 18) and TruthCaveScene (Scene 17, the boss).

// ---------------------------------------------------------------------------------------------------------------
// FOUR ORBS (single source for the whole game: HUD, banners, registry). Use these everywhere instead of hard-coded 5 / 'Souls'.
// ---------------------------------------------------------------------------------------------------------------
export const ORB_ORDER = ['fear', 'time', 'life', 'truth'];
export const ORB_TOTAL = 4;
export const ORB_NAMES = { fear: 'ORB OF FEAR', time: 'ORB OF TIME', life: 'ORB OF LIFE', truth: 'ORB OF TRUTH' };
export const orbHudText = (count) => `ORBS ${count} / ${ORB_TOTAL}`;           // count = registry orbs length

// Script lines that CHANGED with the four-orb script (replace the old text wherever it appears in the project):
export const FOUR_ORB_TEXT_CHANGES = [
    // Scene 6 (actTwoData.js ACT2_VILLAGE_BEATS, id 'm3')
    { was: 'Five orbs can seal it. Fear, Time, Life, Souls and Truth.', now: 'Four orbs can seal it. Fear, Time, Life and Truth.' },
    // Scene 8 / 11 / 14 banners: "ORBS n / 5" -> orbHudText(n); the orb banners keep their names.
    // Scene 15 (Mina after Life) now ends at Truth: Souls is gone.
    { was: 'Both. Souls is next. Follow the road to the graveyard gate.', now: 'Both. Only Truth remains, and it\'s the hardest. Go to the black plains and look for the ring.' },
    { was: 'FIND THE ORB OF SOULS', now: 'FIND THE ORB OF TRUTH' },
];
// Scene 15 -> next scene: the old hand-off to 'SoulsOutsideScene' becomes 'TruthOutsideScene' with data { part: 'before' }.
// Delete or disable every Souls scene key, route, asset load and registry flag ('souls').

// ---------------------------------------------------------------------------------------------------------------
// ASSETS (copy into the project)
//   public/assets/Backgrounds/truth_outside.png   (1344x664, the Buried Crown on the black plains)
//   public/assets/Backgrounds/truth_cave.png      (1344x594, the crimson cave; the altar cradle is EMPTY, the orb is drawn by the game)
//   public/assets/Orbs/truth_orb_crimson_sheet.png (16 frames of 206x222 in one row = the ORB OF TRUTH, crimson fire orb)
//   public/assets/Truth/many_remembered_{idle,swipe,slam,drain}_sheet.png, walk_cycle.png, monster_cutout.png
// ---------------------------------------------------------------------------------------------------------------
export const TRUTH_BG = {
    outside: { key: 'truth-outside', file: 'assets/Backgrounds/truth_outside.png', w: 1344, h: 664,
        floorFeetY: 585,                       // art px: the grey plain the hero walks on (above the red lava edge)
        crownOpening: { x: 673, y: 437 },      // centre of the black circular opening of the Buried Crown
        moon: { x: 395, y: 235 },              // the blood moon (pulses during the scene)
        heroStartX: 150, minaDx: 170,
        doorTriggerBeforeH: 0.7 },
    cave: { key: 'truth-cave', file: 'assets/Backgrounds/truth_cave.png', w: 1344, h: 594,
        floorFeetY: 515,                       // art px: the dark red stone floor in front of the altar steps
        cradle: { x: 665, y: 285 },            // empty altar cradle: the Orb of Truth forms here
        altarX: 672, heroStartX: 170,
        torchless: true },
};

export const TRUTH_PACING = { msPerChar: 34, pauseComma: 140, pauseStop: 260, hold: 0.9, fadeIn: 0.2, fadeOut: 0.3, gap: 0.15 };
export const TRUTH_SPEAKERS = {
    HERO:           { color: 0xf5d58a, anchor: 'hero' },
    MINA:           { color: 0x6fe0d0, anchor: 'mina' },
    TRUTH_MONSTER:  { color: 0xff7a6a, anchor: 'truth' },        // named anchor 'truth' = above the monster's head (hat), follows it
};

// ---------------------------------------------------------------------------------------------------------------
// THE TRUTH MONSTER ("Many Remembered": a scarecrow of masks; every mask is a memory)
// Sheets (all frames face LEFT natively, effects go to the LEFT of the body; flip for a right-facing monster, origin = body centre):
//   idle   640x460, 5 cols, 12 frames, 12.5 fps loop
//   swipe  640x460, 5 cols, 14 frames, 12.5 fps  (HERO memory: pale mask, cyan arc)  strike frames 8-11
//   slam   640x460, 5 cols, 16 frames, 12.5 fps  (KING memory: red mask, floor spikes) strike frames 10-13
//   drain  640x460, 5 cols, 16 frames, 12.5 fps  (FUTURE memory: purple tether)        pull at frame 9
//   walk   431x514, 8 cols, 24 frames, 12 fps loop (the front view with orbiting masks)
//   cutout 696x830 static (used for the death dissolve)
// ---------------------------------------------------------------------------------------------------------------
export const TRUTH_MONSTER = {
    textures: {
        'truth-idle':  { file: 'assets/Truth/many_remembered_idle_sheet.png',  fw: 640, fh: 460, cols: 5, frames: 12, fps: 12.5, loop: true },
        'truth-swipe': { file: 'assets/Truth/many_remembered_swipe_sheet.png', fw: 640, fh: 460, cols: 5, frames: 14, fps: 12.5, loop: false },
        'truth-slam':  { file: 'assets/Truth/many_remembered_slam_sheet.png',  fw: 640, fh: 460, cols: 5, frames: 16, fps: 12.5, loop: false },
        'truth-drain': { file: 'assets/Truth/many_remembered_drain_sheet.png', fw: 640, fh: 460, cols: 5, frames: 16, fps: 12.5, loop: false },
        'truth-walk':  { file: 'assets/Truth/walk_cycle.png',                  fw: 431, fh: 514, cols: 8, frames: 24, fps: 12,   loop: true },
        'truth-cutout':{ file: 'assets/Truth/monster_cutout.png' },
    },
    // origin = (body centre x, feet y) as fractions of the frame; bodyPx = hat-top to feet height inside the frame (for scale matching)
    origin: { 'truth-idle': [0.764, 0.904], 'truth-swipe': [0.764, 0.904], 'truth-slam': [0.764, 0.904], 'truth-drain': [0.764, 0.904],
              'truth-walk': [0.476, 0.961], 'truth-cutout': [0.504, 0.954] },
    bodyPx: { 'truth-idle': 385, 'truth-swipe': 385, 'truth-slam': 385, 'truth-drain': 385, 'truth-walk': 476, 'truth-cutout': 770 },
    heightH: 1.9,                          // displayed body height = this x H (a tall boss); scale each sheet by heightH*H / bodyPx[sheet]
    nativeFacing: 'left',                  // flipX when the hero is on its RIGHT; set at the start of each action (never tweened)
    shadow: { alpha: 0.35, widthH: 1.1 },
    hpMult: 0.9,                           // max HP = this x the King of Dark's max HP; take damage from the hero with the SAME model as the King fight
    hitFlash: 0.08,                        // seconds of white tint on a hit (timer)
    superArmor: true,                      // hits never interrupt its attacks, except the DRAIN (see drain.interruptedBy)

    walk:   { speedMult: 0.50, stopWithinH: 1.15 },                       // x S; phase multipliers below scale it
    idleBetween: 0.35,

    // ATTACKS. Frame numbers are 0-based clip frames. t = frame / fps.
    swipe:  { triggerRangeH: 1.7, telegraphTo: 7, strikeFrom: 8, strikeTo: 11, reachH: 1.35, verticalH: 0.95, damage: 12, knockbackPx: 70, cooldown: 1.7, jitter: 0.3,
              telegraph: { color: 0x7fe8ff, alpha: 0.4 } },               // faint cyan floor mark in front during frames 0-7
    drain:  { triggerFromH: 1.8, triggerToH: 3.4, pullAtFrame: 9, tetherFrom: 5, tetherTo: 12, damage: 8, pullToH: 0.95, pullSeconds: 0.35, heroStun: 0.3,
              healFrac: 0.015, healSkippedIfDodged: true, jumpDodgeH: 0.45, interruptedBy: ['sword', 'fire'], cooldown: 3.8, jitter: 0.5,
              tetherColor: 0xb26bff, tetherGlow: 0xe0b8ff },              // the tether line is drawn (Graphics) from the monster's hand to the hero for tetherFrom..tetherTo
    slam:   { phaseMin: 2, triggerRangeH: 3.0, telegraphTo: 8, strikeFrom: 10, strikeTo: 13, reachH: 1.9, damage: 18, jumpDodgeH: 0.5, knockbackPx: 90,
              cooldown: 2.8, jitter: 0.4, telegraph: { color: 0xff3a3a, alpha: 0.45 } },   // red floor line along the spike path during frames 0-8
    combo:  { swipeThenSlamChance: 0.35 },                                // phase 2 only
    // Memory break: heavy burst damage stuns it for a moment (free hits), with a cooldown so it cannot be chained.
    memoryBreak: { burstFrac: 0.12, windowSeconds: 2.5, stunSeconds: 1.1, cooldown: 8, flashColor: 0xffe0b0 },
};

// FOUR "PHASES" = two for this boss (script: "Continues when the monster is at half health"). Same break mechanic as the King:
// at atHpFrac the monster stops attacking, cannot be damaged, its mask turns red (tint flash), the line plays, then it resumes faster.
export const TRUTH_PHASES = [
    { phase: 2, atHpFrac: 0.50, speedMult: 1.25, cooldownMult: 0.80, enableSlam: true, maskFlash: { color: 0xff3a3a, seconds: 0.8 },
      shake: { duration: 0.35, intensity: 0.008 },
      lines: [{ who: 'TRUTH_MONSTER', text: 'Fight harder. I once fought just like you.' }] },
];

// ---------------------------------------------------------------------------------------------------------------
// CAVE FX (Scene 17)
// ---------------------------------------------------------------------------------------------------------------
export const TRUTH_CAVE_FX = {
    fadeIn: 1.0,
    ambient: { darkAlpha: 0.30, heroLightRadiusH: 5.5, altarGlow: { color: 0xff3a2a, radiusH: 3.5, alpha: 0.25, pulseSeconds: 2.2 } },
    embers: { count: 40, color: 0xff6a4a, alpha: 0.6 },                  // drifting red specks (pool of small Graphics), purely visual
    // the monster steps out of the dark in front of the altar: starts as a black silhouette (flat dark tint) 1.3 H behind the altar glow,
    // eyes/mask flash, then the tint is cleared over `emerge.seconds` (timer) and it faces the hero.
    emerge: { seconds: 2.0, silhouetteTint: 0x07040d, shake: { duration: 0.25, intensity: 0.006 } },
    // defeat: the monster freezes, its body (cutout) dissolves from the feet up into smoke that streams into the altar cradle
    dissolve: { seconds: 2.6, puffs: 40, smokeColor: 0x120a1e, glow: 0xff3a2a, streamSeconds: 2.2 },
    toastNoDamageDuringBreaks: true,
};

// Orb of Truth = crimson fire orb. Sheet 16 frames of 206x222, 80 ms/frame, loop. Visible orb about 55 percent of the frame width.
export const ORB_TRUTH = {
    key: 'truth', texture: 'orb-truth', file: 'assets/Orbs/truth_orb_crimson_sheet.png', frameWidth: 206, frameHeight: 222, frames: 16, frameMs: 80,
    originX: 0.5, originY: 0.5,
    forms: { seconds: 1.8, frameWidthH: 1.5, startScale: 0.2 },          // grows in the cradle (scale/alpha from a timer), additive glow ring
    floatToHero: { seconds: 1.9, bobPx: 6, heldFrameWidthH: 0.9 },
    absorbFlash: { seconds: 0.5, color: 0xffc8a0 },
    glow: { color: 0xff3a2a, radiusH: 4.0, alpha: 0.5, pulseSeconds: 1.0 },
    hud: { text: 'ORB OF TRUTH', hold: 2.4 },                            // sub line = orbHudText(registry orbs length) = "ORBS 4 / 4"
};

// ---------------------------------------------------------------------------------------------------------------
// OUTSIDE FX (Scene 16 and 18)
// ---------------------------------------------------------------------------------------------------------------
export const TRUTH_OUTSIDE_FX = {
    fadeIn: 1.2,
    moonPulse: { seconds: 3.0, alpha: 0.12 },                           // slow additive pulse over the blood moon
    // "Red glow swells": a red additive radial at the crown opening whose alpha/radius follow the hero's distance to it (timer-free, from x),
    // plus a final swell over swell.seconds when the hero enters, then the screen goes dark red/black and the cave starts.
    glow: { color: 0xff2a1a, maxAlpha: 0.7, radiusH: 5.0, startDistanceH: 9 },
    enter: { walkSeconds: 1.6, fadeLast: 0.6, swell: { seconds: 1.4, vignette: 0x3a0008 }, toBlack: 0.9 },
    arrowRight: { text: '>>', color: '#f5d58a', pulseSeconds: 1.0, marginRight: 40, y: 360 },
    objective: { color: '#f5d58a', fontSize: 18, x: 24, y: 24, fadeIn: 0.5, hold: 4.0, fadeOut: 0.8 },
    // Scene 18: the hero walks OUT of the opening (starts inside it, alpha-in over 0.8 s) and stops beside Mina; both face each other.
    exit: { walkSeconds: 1.4, stopXFromOpeningH: 2.4 },
    sceneNext: { scene: 'MechanismScene', fallback: 'MainMenuScene' },     // Scene 19 is not built yet: fall back to the menu with a console.warn
};

// ---------------------------------------------------------------------------------------------------------------
// BEATS. Types: fx, line, wait, objective, arrow, waitForX, lockControls, faceEachOther, fight, goto
//   line + parallel:true = the next beat starts at once. fight = gameplay segment (monster active); finishes when the monster is defeated
//   (its phase break lines and the defeat lines are NOT beats: they come from TRUTH_PHASES and TRUTH_DEFEAT).
// ---------------------------------------------------------------------------------------------------------------
// SCENE 16 (TruthOutsideScene part 'before'): Outside the Buried Crown. Hero and Mina.
export const TRUTH_OUTSIDE_BEATS = [
    { id: 'fadein', type: 'fx', name: 'fadeIn' },
    { id: 'face',   type: 'faceEachOther' },
    { id: 'm1', type: 'line', who: 'MINA', text: 'The last orb is inside the crown. Everything ends there.', gesture: 'point' },
    { id: 'h1', type: 'line', who: 'HERO', text: "You sound like you've been here before." },
    { id: 'm2', type: 'line', who: 'MINA', text: 'Go. And whatever it says, remember you had a choice.' },
    { id: 'obj',    type: 'objective', text: 'ENTER THE BURIED CROWN' },
    { id: 'arrow',  type: 'arrow', dir: 'right' },
    { id: 'todoor', type: 'waitForX', x: 'OPENING_TRIGGER' },
    { id: 'lock',   type: 'lockControls', value: true },
    { id: 'enter',  type: 'fx', name: 'heroEnters' },                        // walks into the dark opening, red glow swells, screen goes dark red then black
    { id: 'go',     type: 'goto', scene: 'TruthCaveScene' },
];

// SCENE 17 (TruthCaveScene): The cave. Hero and the Truth Monster.
export const TRUTH_CAVE_BEATS = [
    { id: 'fadein', type: 'fx', name: 'fadeIn' },
    { id: 'emerge', type: 'fx', name: 'monsterEmerges' },                    // steps out of the dark in front of the altar
    { id: 't1', type: 'line', who: 'TRUTH_MONSTER', text: 'You walk like a king who forgot his crown.' },
    { id: 'h1', type: 'line', who: 'HERO', text: 'I wear no crown.' },
    { id: 't2', type: 'line', who: 'TRUTH_MONSTER', text: 'Not yet.' },
    { id: 'fight', type: 'fight' },                                          // [Gameplay] Boss fight. Phase break at half health (TRUTH_PHASES), until defeated.
    { id: 'd1', type: 'line', who: 'TRUTH_MONSTER', text: 'Now you will have the same destiny.' },
    { id: 'd2', type: 'line', who: 'TRUTH_MONSTER', text: 'You will become what you defeated.' },
    { id: 'd3', type: 'line', who: 'HERO', text: "No. That won't be me." },
    { id: 'dissolve', type: 'fx', name: 'monsterDissolves' },               // smoke drifts into the altar
    { id: 'orbforms',  type: 'fx', name: 'orbForms' },                       // the Orb of Truth (crimson) forms in the cradle
    { id: 'orbhero',   type: 'fx', name: 'orbToHero' },                      // floats to the hero, absorbed, banner, registry orbs gets 'truth' once, HUD "ORBS 4 / 4"
    { id: 'go', type: 'goto', scene: 'TruthOutsideScene', data: { part: 'reveal' } },
];

// SCENE 18 (TruthOutsideScene part 'reveal'): Outside the cave. Hero and Mina.
export const TRUTH_REVEAL_BEATS = [
    { id: 'fadein', type: 'fx', name: 'fadeIn' },
    { id: 'exit',   type: 'fx', name: 'heroExits' },                         // hero walks out of the opening, Mina waits; then faceEachOther
    { id: 'face',   type: 'faceEachOther' },
    { id: 'm1', type: 'line', who: 'MINA', text: 'You have all four. But the seal is not finished.' },
    { id: 'h1', type: 'line', who: 'HERO', text: "What's missing?" },
    { id: 'm2', type: 'line', who: 'MINA', text: 'A ruler. Only darkness can hold back darkness.' },
    { id: 'h2', type: 'line', who: 'HERO', text: "The monster said I'd become him." },
    { id: 'm3', type: 'line', who: 'MINA', text: "He told you the truth. It's the only way to save the world." },
    { id: 'h3', type: 'line', who: 'HERO', text: 'Then everything I did was the first step.' },
    { id: 'm4', type: 'line', who: 'MINA', text: 'I\'m sorry. I wish there was another way.' },
    { id: 'h4', type: 'line', who: 'HERO', text: 'If it saves them... I accept.' },
    { id: 'm5', type: 'line', who: 'MINA', text: 'Then go to the temple. The mechanism is waiting.', gesture: 'point' },
    { id: 'obj',    type: 'objective', text: 'RETURN TO THE TEMPLE' },
    { id: 'lead',   type: 'fx', name: 'minaLeads' },                          // Mina glides off, screen fades
    { id: 'go',     type: 'goto', scene: 'MECHANISM' },                        // = TRUTH_OUTSIDE_FX.sceneNext (fallback MainMenuScene + console.warn)
];

// Dev routes (DEBUG only): ?scene=TruthOutside (part before), ?scene=TruthReveal, ?scene=TruthCave, ?scene=TruthBoss (skips to the fight),
// F5 = skip to next gameplay beat, F7 = monster to 51 percent HP, F8 = monster to 1 HP.
