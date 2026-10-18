// KING OF DARK - ORB OF TIME (script Scenes 10, 11, 12). Single source of truth.
// Copy to: src/game/config/timeData.js
// Script wording is the user's script: do not edit text in code, edit it here.
// Art coordinates are in SOURCE PIXELS of the 1344x768 pictures; multiply by ART.scale for the game world.
// NOTE: the Orb of Life settlement already built (SettlementScene, lifeData.js, Crawler.js) is script SCENE 13.
// It stays untouched. Flow: Scene 9 -> ClockTowerScene (10) -> EndlessRoomScene (11) -> AfterTimeScene (12) -> SettlementScene (13).
import { ORB_NAMES } from './actTruthData';

export const TIME_DEBUG = true; // dev keys + routes. Set false before submitting.

export const ART = { width: 1344, height: 768, scale: 1280 / 1344 };      // pictures drawn at world (0,0), scale ART.scale -> 1280 x 731
export const WORLD = { width: 1280, height: Math.round(768 * (1280 / 1344)) };
export const toWorld = (x, y) => ({ x: x * ART.scale, y: y * ART.scale });

export const TIME_FLOW = {
    // scene keys
    tower: 'ClockTowerScene',          // Scene 10
    room: 'EndlessRoomScene',          // Scene 11 (room + hidden hourglass chamber in ONE scene)
    after: 'AfterTimeScene',           // Scene 12
    next: 'SettlementScene',           // Scene 13 (already built, do not change its gameplay)
    // registry
    orbId: 'time',                     // pushed once into registry 'orbs'. After Time the HUD reads 2 / 4, after Life 3 / 4.
    objectiveTime: 'FIND THE ORB OF TIME',
    objectiveLife: 'FIND THE ORB OF LIFE',
    devRoutes: { ClockTower: 'ClockTowerScene', EndlessRoom: 'EndlessRoomScene', TimeChamber: 'EndlessRoomScene', MinaAfterTime: 'AfterTimeScene' }, // ?scene=...
};

// ---------------------------------------------------------------------------------------------------------------
// ASSETS (public/assets/Time/)
// ---------------------------------------------------------------------------------------------------------------
export const TIME_ASSETS = {
    images: {
        'time-outside': 'assets/Time/outside_tower.jpg',                 // 1344x768, tower exterior (scenes 10 and 12)
    },
    optionalImages: {
        'time-endless': 'assets/Time/endless_room.jpg',                  // 1344x768 Endless Room background. If missing, the scene draws the room with Graphics.
    },
    // Hidden chamber: 16 frames of 1344x768 baked animation (orb on pedestal), stored as two sheets of 8 (2 columns x 4 rows).
    chamberSheets: [
        { key: 'time-chamber-a', file: 'assets/Time/chamber-a.jpg', frameWidth: 1344, frameHeight: 768, frames: 8 },
        { key: 'time-chamber-b', file: 'assets/Time/chamber-b.jpg', frameWidth: 1344, frameHeight: 768, frames: 8 },
    ],
    chamberFps: 12.5,
    chamberFrames: 16,
    orb: { key: 'time-orb', file: 'assets/Time/time_orb_sheet.png', frameWidth: 200, frameHeight: 220, frames: 16, frameMs: 80, anchorX: 96, anchorY: 100 },
};

// Call once from BootScene.preload. A missing optional image must NOT break loading (guard with a 'loaderror' handler).
export function preloadTimeAssets(scene) {
    Object.entries(TIME_ASSETS.images).forEach(([k, f]) => scene.load.image(k, f));
    Object.entries(TIME_ASSETS.optionalImages).forEach(([k, f]) => scene.load.image(k, f));
    TIME_ASSETS.chamberSheets.forEach((s) => scene.load.spritesheet(s.key, s.file, { frameWidth: s.frameWidth, frameHeight: s.frameHeight, startFrame: 0, endFrame: s.frames - 1 }));
    const o = TIME_ASSETS.orb;
    scene.load.spritesheet(o.key, o.file, { frameWidth: o.frameWidth, frameHeight: o.frameHeight, startFrame: 0, endFrame: o.frames - 1 });
}

// Chamber frame for a clock t (seconds): which sheet and which frame inside it.
export function chamberAt(t) {
    const f = Math.floor(Math.max(0, t) * TIME_ASSETS.chamberFps) % TIME_ASSETS.chamberFrames;
    return f < 8 ? { key: 'time-chamber-a', frame: f } : { key: 'time-chamber-b', frame: f - 8 };
}

// ---------------------------------------------------------------------------------------------------------------
// SCENES 10 and 12: OUTSIDE THE CLOCK TOWER (same picture, static camera)
// ---------------------------------------------------------------------------------------------------------------
export const OUTSIDE = {
    image: 'time-outside',
    floorFeetY: 628,                   // where the feet stand on the stone path (art px)
    heroStartX: -40,                   // enters from the left edge
    heroX: 500,                        // hero stands left of the doors
    minaX: 850,                        // Mina stands right of the doors
    doorX: 672, doorTopY: 318, doorBottomY: 600, doorHalfWidth: 115,
    torches: [{ x: 443, y: 415 }, { x: 899, y: 415 }],   // painted flames: add a subtle additive flicker glow here
    wallLeft: 20, wallRight: 1320,
    doorsOpen: { seconds: 1.8, color: 0x7fd8ff },        // blue light widens from the centre crack over the door area
    heroWalkIn: { seconds: 1.6, fadeLast: 0.5 },
    fadeIn: 0.8, toRoomFade: 0.5, toNextFade: 0.6,
};

// Script Scene 9 (Mina after Fear): the lines that must be in actThreeData.js. The settlement-pointing text moves to Scene 12.
export const SCENE9_TIME_LINES = [
    { who: 'MINA', text: "You found it. The darkness knows what you're doing now." },
    { who: 'HERO', text: 'Then let it come.' },
    { who: 'MINA', text: 'Next is Time. Look for the tower where the clock stopped.' },
];

export const TOWER_BEATS = [                 // Scene 10
    { id: 'fade',  type: 'fx',   name: 'fadeIn' },
    { id: 'walk',  type: 'fx',   name: 'heroWalksToMark' },
    { id: 'm1', type: 'line', who: 'MINA', text: 'The clock stopped the day the dark came. Time only repeats here.' },
    { id: 'h1', type: 'line', who: 'HERO', text: 'Repeats? How do I get through?' },
    { id: 'm2', type: 'line', who: 'MINA', text: 'Watch the doors. The room remembers what you choose.' },
    { id: 'm2b', type: 'line', who: 'MINA', text: 'Hours only climb. Remember that.', added: true },   // ADDED clue so the puzzle is fair (delete this beat to remove it)
    { id: 'm3', type: 'line', who: 'MINA', text: "I've walked those doors more times than I can count." },
    { id: 'h2', type: 'line', who: 'HERO', text: "You've been inside?" },
    { id: 'm4', type: 'line', who: 'MINA', text: '...Go. Before I say too much.' },
    { id: 'open',  type: 'fx',   name: 'towerDoorsOpen' },
    { id: 'in',    type: 'fx',   name: 'heroWalksIn' },
    { id: 'go',    type: 'goto', scene: 'EndlessRoomScene' },
];

export const AFTER_TIME_BEATS = [            // Scene 12 (outside again, doors closed, a small blue glow in the door crack)
    { id: 'fade',  type: 'fx',   name: 'fadeIn' },
    { id: 'walk',  type: 'fx',   name: 'heroWalksToMark' },
    { id: 'm1', type: 'line', who: 'MINA', text: 'Two orbs. The darkness grows louder.' },
    { id: 'h1', type: 'line', who: 'HERO', text: 'Where next?' },
    { id: 'm2', type: 'line', who: 'MINA', text: 'Life. A settlement still lives past the ruined fields.' },
    { id: 'obj',   type: 'objective', text: 'FIND THE ORB OF LIFE' },
    { id: 'leave', type: 'fx',   name: 'minaWalksEastHeroFollows' },
    { id: 'go',    type: 'goto', scene: 'SettlementScene' },
];

// ---------------------------------------------------------------------------------------------------------------
// SCENE 11: THE ENDLESS ROOM (puzzle + time loop)
// MECHANIC "HOURS ONLY CLIMB": each door shows an hour (a number on a small clock). Enter the doors from the LOWEST hour to the
// HIGHEST. A correct door goes dim (progress 1/3, 2/3) and the hero is returned to the entrance; the remaining hours stay.
// A wrong door = full reset: progress 0, all doors lit again, the hours are reshuffled, the LOOP counter goes up.
// Three correct doors in a row dissolve the doors into blue light and open the hourglass chamber.
// ---------------------------------------------------------------------------------------------------------------
export const ROOM = {
    bgKey: 'time-endless',             // optional picture; when missing use the procedural room below
    floorFeetY: 628,
    heroStartX: 110,
    wallLeft: 40, wallRight: 1304,
    doorCenters: [336, 672, 1008],     // LEFT, MIDDLE, RIGHT (art px)
    doorHalfWidth: 85, doorTopY: 312, doorBottomY: 612,
    clockY: 262, clockRadius: 34,      // hour clock above each door
    interactRange: 120,                // art px from the door centre to show the E prompt
    interactKey: 'E',
    procedural: {                      // Graphics fallback (created once in create())
        wall: 0x10172b, wallBrick: 0x182142, floor: 0x0b1020, floorLine: 0x2d4a7a,
        door: 0x2a1c18, doorFrame: 0x6b5a46, doorGlow: 0x5fb4ff, band: 0x000000, bandTop: 66, bandBottomFrom: 665,
    },
    colors: { lit: 0x7fd8ff, spent: 0x2a3a55, wrong: 0xff5a5a, rewind: 0xbfe8ff },
};

export const PUZZLE = {
    doorsToPass: 3,
    // Fixed layouts for the first four loops (hours at LEFT, MIDDLE, RIGHT). Loop 1 is rigged so that the MIDDLE door
    // ("I'll take the middle one") is the highest hour, i.e. wrong. After loop 4 layouts are random.
    layouts: [
        [7, 11, 3],     // loop 1: order RIGHT(3) -> LEFT(7) -> MIDDLE(11)
        [2, 5, 9],      // loop 2: LEFT -> MIDDLE -> RIGHT
        [10, 4, 6],     // loop 3: MIDDLE(4) -> RIGHT(6) -> LEFT(10)
        [8, 1, 12],     // loop 4: MIDDLE(1) -> LEFT(8) -> RIGHT(12)
    ],
    randomMinGap: 2,            // random hours are distinct and at least this far apart (1..12)
    hint: { pulseAfterResets: 3, ruleAfterResets: 5, ruleText: 'HOURS ONLY CLIMB' },   // fail-soft: never let a player get stuck
    timing: {
        enterWalk: 0.5,         // hero walks into the door (fades, timer-driven)
        correctRipple: 0.7,     // blue ripple, door dims, hero returns
        wrongFlash: 0.5,        // red-white flash + shake
        rewind: 0.9,            // clocks spin backwards, LOOP counter changes, hours reshuffle
        respawnFade: 0.4,       // hero fades back in at the entrance
        dissolve: 2.0,          // doors dissolve into blue light after the 3rd correct door
        toChamberFade: 0.6,
    },
    shake: { wrong: { duration: 0.25, intensity: 0.01 }, correct: { duration: 0.12, intensity: 0.004 } },
};

export const ROOM_LINES = {                   // Scene 11 lines, event driven
    start:   { who: 'HERO', text: "Three doors. I'll take the middle one." },                  // when the first loop begins
    reset1:  { who: 'HERO', text: 'The same room. I walked straight back into it.' },           // after the first wrong door
    changed: { who: 'HERO', text: 'Each time the room changes. The order must matter.' },       // after the second reset, or at the first correct door once a reset has happened (only once)
    solved:  { who: 'HERO', text: 'The loop breaks. Time lets go of me.' },                     // in the chamber
};

// ---------------------------------------------------------------------------------------------------------------
// HIDDEN HOURGLASS CHAMBER + ORB OF TIME (same scene, second layer)
// The chamber picture has the orb PAINTED on the pedestal in every frame. The real orb sprite (identical art, scale 0.95 of the
// painted one) is laid exactly over it. When the orb is taken, a dark "void" disc fades in over the painted orb so nothing is left behind.
// ---------------------------------------------------------------------------------------------------------------
export const CHAMBER = {
    floorFeetY: 585,
    heroStartX: 100,
    heroStopX: 440,
    wallLeft: 40, wallRight: 1304,
    pedestal: { x: 672, topY: 400 },
    orbAnchorArt: { x: 669, y: 326 },  // where the orb sprite's anchor (frame pixel 96,100) sits on the painted orb
    orbScaleArt: 0.95,                 // sprite scale relative to the picture (world scale = 0.95 * ART.scale)
    void: { x: 672, y: 322, rx: 92, ry: 85, inner: 0x02060f, rim: 0x3ee0ff, fadeIn: 0.4, restAlpha: 0.55 },
    fadeIn: 0.6,
    heroWalkSeconds: 2.2,
};

export const ORB_TIME = {
    id: 'time',
    key: 'time-orb',
    animKey: 'time-orb-pulse',          // create once in BootScene (guarded): frames 0-15, 80 ms each, loop
    glowColor: 0xb48cff,
    hudColor: 0x8fb4ff,
    swapAt: 0.0,                         // the sprite replaces the painted orb at this beat
    riseArt: 70, riseSeconds: 1.6,
    floatToHeroSeconds: 1.6, bobPx: 5,
    heldDiameterH: 0.4,                  // diameter relative to the hero's standing height when it reaches him
    absorbFlashSeconds: 0.5,
    bannerTitle: ORB_NAMES.time,
    bannerSub: 'The loop is broken.',
    afterFade: 0.7,                      // fade, then start AfterTimeScene
};

export const CHAMBER_BEATS = [           // after the puzzle is solved
    { id: 'dissolve', type: 'fx', name: 'doorsDissolve' },
    { id: 'enter',    type: 'fx', name: 'toChamber' },
    { id: 'walk',     type: 'fx', name: 'heroWalksToPedestal' },
    { id: 'h1', type: 'line', who: 'HERO', text: 'The loop breaks. Time lets go of me.' },
    { id: 'swap',     type: 'fx', name: 'orbSwapAndRise' },
    { id: 'float',    type: 'fx', name: 'orbToHero' },
    { id: 'banner',   type: 'fx', name: 'bannerOrb' },
    { id: 'collect',  type: 'fx', name: 'orbCollected' },
    { id: 'go',       type: 'goto', scene: 'AfterTimeScene' },
];

// ---------------------------------------------------------------------------------------------------------------
// PUZZLE LOGIC (pure functions: the scene only calls these)
// ---------------------------------------------------------------------------------------------------------------
// door positions: 0 = LEFT, 1 = MIDDLE, 2 = RIGHT
export function correctOrder(hours) {
    return [0, 1, 2].sort((a, b) => hours[a] - hours[b]);       // door positions from the lowest hour to the highest
}
export function nextCorrectDoor(hours, progress) {
    return correctOrder(hours)[Math.min(progress, hours.length - 1)];
}
export function isCorrectPick(hours, progress, doorIndex) {
    return nextCorrectDoor(hours, progress) === doorIndex;
}

// loopIndex starts at 0. prevOrderKey is the key of the previous loop's correct order (to avoid repeating it). rng defaults to Math.random.
export function makeLayout(loopIndex, prevOrderKey = '', rng = Math.random) {
    if (loopIndex < PUZZLE.layouts.length) return PUZZLE.layouts[loopIndex].slice();
    for (let tries = 0; tries < 200; tries++) {
        const pool = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
        const picks = [];
        while (picks.length < 3) {
            const h = pool.splice(Math.floor(rng() * pool.length), 1)[0];
            if (picks.every((p) => Math.abs(p - h) >= PUZZLE.randomMinGap)) picks.push(h);
            if (!pool.length) break;
        }
        if (picks.length < 3) continue;
        if (correctOrder(picks).join('') !== prevOrderKey) return picks;
    }
    return [2, 6, 10];
}
export const orderKey = (hours) => correctOrder(hours).join('');
