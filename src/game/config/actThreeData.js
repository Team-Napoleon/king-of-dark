// KING OF DARK - ACT III: Scene 8 (The Haunted Corridor, playable, Orb of Fear) + Scene 9 (Mina after Fear).
// Copy to: src/game/config/actThreeData.js
// Sources: "King of Dark: Full Script (Readable English)" scenes 8-9 (wording = script wording) and "Orbs Missions" (Fear: horror + chase,
// "run, jump over obstacles, escape through a doorway, the monster disappears, leaving the Orb of Fear").
// Times are SECONDS. Distances are in H = hero standing height (px) or S = hero RUN speed (px/s) so nothing depends on screen size.
// Scene class: HauntedCorridorScene. Scene 9 reuses DarkWorldScene with part 'afterFear'.

// ---------------------------------------------------------------------------------------------------------------
// ASSETS (copy into the project):
//   public/assets/Backgrounds/corridor_tile.png       (240x270, seamless when repeated horizontally: the courtyard wall with torches)
//   public/assets/Backgrounds/corridor_end_room.png   (480x270, the shrine: stone altar + ring, flanked by torches; ends the corridor)
//   public/assets/Orbs/crown_orb_beacon_spritesheet.png  (16 frames of 200x180 in one row = the ORB OF FEAR, a dark crown with a red glow)
//   public/assets/Stalker/hollow_stalker_chase_{right,left}_sheet.png (352x218 frames, 8 cols, 62 frames, 12 fps, loop).
// The Stalker has ONE clip (a crawling chase loop). "Standing still" = the clip PAUSED on frame 0. No attack clip: the catch is a lunge
// (movement + screen effect), no new art. Body in frame: x 11..339, y 52..202 (about 328 x 150 px, feet line y 202 of 218).
// ---------------------------------------------------------------------------------------------------------------
export const STALKER_SHEETS = {
    frameWidth: 352, frameHeight: 218, columns: 8, frameCount: 62, fps: 12,
    textures: { 'stalker-right': 'assets/Stalker/hollow_stalker_chase_right_sheet.png', 'stalker-left': 'assets/Stalker/hollow_stalker_chase_left_sheet.png' },
    originX: 0.5, originY: 0.927, bodyPx: 150, heightVsHero: 0.95,
    eyeGlow: { color: 0xbfe8ff, radiusPx: 5, alpha: 0.9 },       // small additive glow on the head so it is visible in the dark
    hoverPx: 0,
};

export const ACT3_PACING = { msPerChar: 34, pauseComma: 140, pauseStop: 260, hold: 0.8, fadeIn: 0.2, fadeOut: 0.3, gap: 0.15 };
export const ACT3_SPEAKERS = {
    HERO: { color: 0xf5d58a, anchor: 'hero' },
    MINA: { color: 0x6fe0d0, anchor: 'mina' },
};

// ---------------------------------------------------------------------------------------------------------------
// THE CORRIDOR (procedural by default; a real background can replace it)
// If public/assets/Backgrounds/haunted-corridor.png exists, tile it horizontally behind the gameplay (tileSprite); else draw the procedural
// corridor: dark brick wall (Graphics tiles built once), arched alcoves, floor strip, ceiling beam, carved torch sconces every torchEveryH.
// ---------------------------------------------------------------------------------------------------------------
export const CORRIDOR = {
    // BACKGROUND = the "courtyard" art cut from the cutscene plate. All art coordinates below are in SOURCE pixels (the art is 270 tall);
    // displayScale k = game height / 270 (nearest-neighbour, keep pixel art crisp). Never stretch non-uniformly.
    tile:    { key: 'corridor-tile',     file: 'assets/Backgrounds/corridor_tile.png',     w: 240, h: 270 },   // tileSprite, repeats seamlessly
    endRoom: { key: 'corridor-end-room', file: 'assets/Backgrounds/corridor_end_room.png', w: 480, h: 270 },   // placed at the end of the last tile
    // art landmarks (source px)
    floorFeetY: 232,                       // the hero/Stalker feet line (brick path), jumps are measured from here
    torchesInTile: [{ x: 80, y: 138 }, { x: 160, y: 138 }],      // flame positions inside EACH 240px tile (mirrored pair)
    torchesInEndRoom: [{ x: 80, y: 138 }, { x: 400, y: 138 }],
    socket: { x: 240, y: 67 },             // centre of the altar ring in the end room (the crown sits here)
    sealFrac: 0.12,                        // the red seal curtain stands this fraction into the end room (just inside it)
    shrineFinishFrac: 0.20,                // chase completes when the hero passes this fraction of the end room
    // layout in seconds of running from the start (x = startPad + seconds * S)
    startPadH: 3,
    walkSeconds: 13,
    sightAheadScreens: 0.85,
    blackoutAtSeconds: 9,
    chaseSeconds: 27,                      // from the blackout point to the seal; endRoomStart is rounded UP to a whole number of tiles
    torchFlicker: 0.25, torchColor: 0xff9a3c, torchLightRadiusH: 2.4,
};
// World length = tileCount * (tile.w*k) + (endRoom.w*k), tileCount = ceil((startPad + blackout + chase run - sealFrac*endRoomW) / (tile.w*k)).
// Entrance (x = 0): a closed iron door slab drawn procedurally over the first tile (decoration only).

// Darkness: full-screen dark overlay with a light circle around the hero (reuse DarknessOverlay.js if its API fits, else a small RenderTexture or
// a Graphics mask). Torches add small lights. Fear squeezes the light.
export const DARKNESS = {
    ambientAlpha: 0.82, heroLightRadiusH: 5.0, heroLightFlicker: 0.06,
    torchLightRadiusH: 2.4,
    fearSqueeze: { startGapH: 6, minRadiusFrac: 0.55 },     // light radius shrinks toward 55% as the Stalker closes in
    blackout: { seconds: 1.8, flickerPattern: [0.25, 0.12, 0.18, 0.1, 0.35, 0.08, 0.3] },   // on/off durations, then fully dark, then lights return
};

// Fear feedback: heartbeat (screen pulse always; sound only if an audio key exists) speeds up as the Stalker closes in.
export const FEAR = {
    bpm: { far: 62, near: 150 }, gapHFar: 8, gapHNear: 1.5,
    vignette: { color: 0x2a0030, maxAlpha: 0.55, pulse: 0.35 },
    surgeWarning: 0.5,
};

// ---------------------------------------------------------------------------------------------------------------
// THE STALKER (never speaks, cannot be killed)
// ---------------------------------------------------------------------------------------------------------------
export const STALKER = {
    standSeconds: 3.2,               // stands frozen at the far end before the blackout can trigger (heartbeat only)
    behindGapH: 4.5,                 // after the blackout it is this far behind the hero (visible at the left edge)
    speedMult: 0.80,                 // x S: slower than a perfect runner, so stumbles/fights are what let it catch up
    surge: { everySeconds: 7, seconds: 1.2, mult: 1.14, firstAt: 6 },    // short telegraphed burst (eyes flash, small shake)
    catchDistH: 0.65,                // gap <= this = caught
    catch: { damage: 30, heroStun: 0.5, knockbackPx: 60, recoilSeconds: 1.0, respawnGapH: 5.5, invuln: 1.2 },
    // Hero powers vs Stalker: it takes NO damage. Any hero attack that connects STAGGERS it (stops, clip paused). Fire is the best answer.
    stagger: { punch: 0.20, kick: 0.30, sword: 0.45, fire: 1.30 },      // seconds frozen per hit type
    staggerImmuneAfter: 2.5,         // cannot be stagger-chained: after a stagger it ignores new staggers for this long
    lightSlow: { mult: 0.55 },       // inside a lit brazier's light it runs at this x speed
    flameBurst: { puffs: 6 },        // cosmetic purple smoke when staggered (pool)
};

// ---------------------------------------------------------------------------------------------------------------
// CHASE COURSE: obstacles and braziers, placed in run-seconds AFTER the blackout point (x = blackoutX + t * S)
//   rubble / coffin = jump over (height hH x H). Hitting one = stumble (no damage): hero speed x stumbleMult for stumbleSeconds.
//   barricade       = too tall to jump (1.3 H). Break it with any melee attack (hits needed) or it blocks. It costs time = the risk.
//   brazier         = UNLIT stone bowl. The hero's FIRE attack lights it for litSeconds; light radius slows the Stalker (STALKER.lightSlow).
// ---------------------------------------------------------------------------------------------------------------
export const CHASE_COURSE = {
    stumble: { mult: 0.45, seconds: 0.7, knockbackPx: 25 },
    obstacles: [
        { t: 2.5,  kind: 'rubble',    hH: 0.30 },
        { t: 5.5,  kind: 'coffin',    hH: 0.40 },
        { t: 8.5,  kind: 'rubble',    hH: 0.30 },
        { t: 11.0, kind: 'coffin',    hH: 0.40 },
        { t: 12.6, kind: 'rubble',    hH: 0.30 },                 // pair with the previous one: jump, land, jump
        { t: 15.5, kind: 'barricade', hH: 1.30, hits: 2 },
        { t: 19.0, kind: 'rubble',    hH: 0.30 },
        { t: 21.5, kind: 'coffin',    hH: 0.40 },
        { t: 24.0, kind: 'rubble',    hH: 0.30 },
    ],
    braziers: [
        { t: 4.0,  litSeconds: 7, radiusH: 3.0 },
        { t: 13.8, litSeconds: 7, radiusH: 3.0 },
        { t: 22.5, litSeconds: 7, radiusH: 3.0 },
    ],
    // a few purple Fear wisps on the floor give +10 health (optional pickup, same code as HealthOrb if reusable)
    wisps: [{ t: 7.0 }, { t: 17.5 }],
    wispHeal: 10,
};

// SHRINE (the exit). The chase ends when the hero passes shrineFinishFrac of the end room. Then the altar's seal fires: a curtain of red light
// drops at the seal x between the hero and the Stalker, the Stalker hits it and dissolves, the ring runes flare, and the crown rises.
export const SHRINE = {
    litRadiusH: 6.5,                                  // the crown/shrine light: the Stalker is slowed (STALKER.lightSlow) inside it
    sealClose: { seconds: 0.45, shake: { duration: 0.5, intensity: 0.014 }, curtainColor: 0xff3a3a, curtainGlow: 0xffa0a0, widthH: 0.5 },
    stalkerDissolve: { seconds: 1.4, puffs: 18, color: 0x120a1e, glow: 0xb02030 },
    runesFlare: { seconds: 1.0, color: 0xff4040, alpha: 0.5 },     // additive pulse over the pillar runes and the altar strips (timer alpha)
    heroFollowThrough: { walkSeconds: 1.2 },
    ringDecal: { rx: 78, ry: 16, y: 205, color: 0xff4a4a, alpha: 0.35 },   // floor ellipse in source px, Graphics, pulsing slowly
};

// ORB OF FEAR = the CROWN. Sprite sheet: 16 frames of 200x180 in one row, 12.5 fps (80 ms), loops. Visible body about 153x131 inside the frame.
// It sits in the altar ring (CORRIDOR.socket) from the start of the scene, always animated; the corridor is dark so it is only seen when near.
export const ORB_FEAR = {
    key: 'fear', texture: 'orb-fear-crown', file: 'assets/Orbs/crown_orb_beacon_spritesheet.png',
    frameWidth: 200, frameHeight: 180, frames: 16, frameMs: 80, originX: 0.5, originY: 0.52,
    restWidthH: 0.9,                  // displayed body width at rest in the ring (x H)
    heldWidthH: 0.45,                 // displayed body width while it floats to the hero
    glow: { color: 0xff3a2a, radiusH: 4.0, alpha: 0.45, pulseSeconds: 1.0 },       // additive light pool (also brightens the dark mask around it)
    rises: { seconds: 1.4, riseH: 1.1 }, floatToHero: { seconds: 1.8, bobPx: 6 }, absorbFlash: { seconds: 0.5, color: 0xffc0b0 },
    hud: { text: 'ORB OF FEAR', sub: 'ORBS 1 / 5', hold: 2.4 },
    beaconHint: { startScreens: 2.0, color: 0xff4a3a, alpha: 0.5 },                // red glow on the right screen edge pulses when the crown is within this many screens ahead
};

// Failure and retries: 3 catches (100 HP) = the hero falls; restart the CHASE from the blackout point (not the whole scene).
export const FAIL = {
    fadeOut: 0.6, fadeIn: 0.6, line: null,                  // no extra dialogue
    restartAt: 'CHASE_START',
};

// ---------------------------------------------------------------------------------------------------------------
// BEATS. Types: fx, line, wait, objective, arrow, waitForX, lockControls, chase, goto.
//   line  + parallel:true  = starts the bubble and the NEXT beat begins at once (needed for "Behind me!" so the chase is not blocked).
//   chase = gameplay segment: starts the Stalker, obstacles and surge timers; finishes when the hero reaches exitX.
//   fx names: fadeIn, stalkerAppears, blackout, sealClose, stalkerDissolve, runesFlare, crownRises, crownToHero
// ---------------------------------------------------------------------------------------------------------------
export const ACT3_CORRIDOR_BEATS = [
    { id: 'fadein',  type: 'fx', name: 'fadeIn' },
    { id: 'h1', type: 'line', who: 'HERO', text: 'Too quiet. Even the dark is holding its breath.' },
    { id: 'arrow',   type: 'arrow', dir: 'right' },                                    // [Gameplay] Walk forward.
    { id: 'sight',   type: 'waitForX', x: 'SIGHT_TRIGGER' },                           // = startPad + walkSeconds*S*0.55
    { id: 'appear',  type: 'fx', name: 'stalkerAppears' },                            // far end, standing completely still, heartbeat starts
    { id: 'h2', type: 'line', who: 'HERO', text: 'Something is standing at the end of the hall.' },
    { id: 'hold',    type: 'wait', seconds: 'STALKER.standSeconds' },
    { id: 'toblack', type: 'waitForX', x: 'BLACKOUT_TRIGGER' },                        // player keeps walking toward it
    { id: 'black',   type: 'fx', name: 'blackout' },                                   // lights flicker off, return: the Stalker is right behind the hero
    { id: 'h3', type: 'line', who: 'HERO', text: 'Behind me!', parallel: true },
    { id: 'chase',   type: 'chase' },                                                  // [Gameplay] Chase. Reach the exit before the Stalker catches you.
    { id: 'slam',    type: 'fx', name: 'sealClose' },
    { id: 'dissolve',type: 'fx', name: 'stalkerDissolve' },
    { id: 'h4', type: 'line', who: 'HERO', text: 'The fear fades... but I can still feel it watching.' },
    { id: 'flare',   type: 'fx', name: 'runesFlare' },
    { id: 'orb',     type: 'fx', name: 'crownRises' },
    { id: 'tohero',  type: 'fx', name: 'crownToHero' },                                  // orb counter 1 of 5, registry orbs gets 'fear' once
    { id: 'go',      type: 'goto', scene: 'DarkWorldScene', data: { part: 'afterFear' } },
];

// SCENE 9: Mina after Fear (DarkWorldScene part 'afterFear', same background as scene 7, hero + Mina facing each other, starts after a fadeIn)
export const ACT3_AFTER_FEAR_BEATS = [
    { id: 'fadein',  type: 'fx', name: 'fadeIn' },
    { id: 'face',    type: 'faceEachOther' },
    { id: 'm1', type: 'line', who: 'MINA', text: 'You found it. The darkness knows what you are doing now.' },
    { id: 'h1', type: 'line', who: 'HERO', text: 'Then let it come.' },
    { id: 'm2', type: 'line', who: 'MINA', text: 'Next is Time. Look for the tower where the clock stopped.', gesture: 'point' },
    { id: 'obj',     type: 'objective', text: 'FIND THE ORB OF TIME' },
    { id: 'lead',    type: 'fx', name: 'minaLeads' },
    { id: 'go',      type: 'goto', scene: 'CLOCK_TOWER_OUTSIDE' },                      // Scene 10 not built yet: fall back to MainMenuScene + console.warn
];
