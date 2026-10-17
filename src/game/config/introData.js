// King of Dark - INTRO CUTSCENE data (single source of truth for the intro).
// Copy to: src/game/config/introData.js
// Time is in SECONDS on one master clock that starts when IntroScene starts.
// Image coordinates are in SOURCE PIXELS of the 1344x768 pictures; convert with toWorld().
// This file overrides the old storyData.js for everything in the intro.

export const INTRO_DEBUG = { enabled: true, seekKey: 'F9', seekStep: 5 }; // set enabled:false before submitting

export const IMG = { width: 1344, height: 768 };
// Pictures are placed at world (0,0) with this scale so they fill the 1280x720 view.
export const IMG_SCALE = 1280 / 1344;           // 0.9524 -> world size 1280 x 731.4
export const WORLD = { width: 1280, height: Math.round(768 * IMG_SCALE) }; // camera bounds = this rect
export const toWorld = (x, y) => ({ x: x * IMG_SCALE, y: y * IMG_SCALE });

export const INTRO_FLOW = {
    sceneKey: 'IntroScene',
    from: 'MainMenuScene',      // PLAY now starts IntroScene
    next: 'TempleScene',        // controls go to the player here
    totalDuration: 52.8,
    registryFlag: 'introSeen',  // set true when it ends or is skipped
    skip: { key: 'ENTER', buttonLabel: 'SKIP  >', showAfter: 1.0, fadeOut: 0.4 },
};

// ---------------------------------------------------------------------------
// PICTURES (loaded in BootScene; keys are the texture keys)
// ---------------------------------------------------------------------------
export const INTRO_IMAGES = {
    'intro-1': 'assets/intro/intro-1-village.jpg',   // far village, castle on the hill (aerial)
    'intro-2': 'assets/intro/intro-2-market.jpg',    // close-up: swing + market stall, temple behind
    'intro-3': 'assets/intro/intro-3-temple.jpg',    // hill path up to the temple
};

export function preloadIntroImages(scene) {
    Object.entries(INTRO_IMAGES).forEach(([key, file]) => scene.load.image(key, file));
}

// ---------------------------------------------------------------------------
// SHOTS: which picture is visible, and the camera move on it.
// camera.from / camera.to use image pixels for x,y. Camera bounds clamp the view,
// so zooms near an edge simply stop at the edge.
// ---------------------------------------------------------------------------
export const SHOTS = [
    {
        id: 'village', image: 'intro-1', start: 0.0, end: 8.5,
        fadeInFromBlack: 0.9,
        camera: { from: { zoom: 1.0, x: 672, y: 384 }, to: { zoom: 1.18, x: 690, y: 470 }, ease: 'Sine.easeInOut' },
    },
    {
        id: 'market', image: 'intro-2', start: 8.2, end: 39.0,
        crossfadeIn: 0.6,
        // STATIC camera on the FULL picture (no pan, no push-in on the people). The only motion is the short settle
        // during the crossfade from the village shot (8.2 -> 8.8); after that the camera never moves in this shot.
        camera: [
            { from: 8.2, to: 8.8,  zoom: 1.0, x: 672, y: 384, ease: 'Sine.easeInOut' },
            { from: 8.8, to: 39.0, zoom: 1.0, x: 672, y: 384, hold: true },
        ],
    },
    {
        id: 'temple', image: 'intro-3', start: 38.7, end: 52.8,
        crossfadeIn: 0.6,
        camera: { from: { zoom: 1.0, x: 672, y: 384 }, to: { zoom: 1.22, x: 860, y: 260 }, startAt: 38.7, endAt: 51.0, ease: 'Sine.easeInOut' },
    },
];

// ---------------------------------------------------------------------------
// DIALOGUE CUES (timed on the master clock; box shows from start to end)
// If typing is not finished at `end`, complete the text instantly, then hide.
// ---------------------------------------------------------------------------
export const SPEAKER_COLORS = {
    NARRATOR: 0xb9bbcf,
    CUSTOMER: 0xc9c9d6,
    SHOPKEEPER: 0xd9a066,
    HERO: 0xf5d58a,
    MOTHER: 0x8fd3c8,
};
export const TYPE_MS_PER_CHAR = 60;   // only used by the bottom-box fallback (narrator); bubbles use INTRO_ACTORS.pacing

// Retimed for slow, peaceful delivery: each line = typing time (55 ms/char + comma/stop pauses) + ~1.3 s to
// finish reading and fade out. Pauses between lines: 0.4-0.9 s; 1.5 s before the mother so the camera can pan.
export const DIALOGUE = [
    { id: 'n1', shot: 'village', start: 1.2,  end: 7.7,  speaker: 'NARRATOR',   text: 'In a world untouched by darkness, one man desired something no ordinary life could offer.' },
    { id: 'c1', shot: 'market',  start: 8.7,  end: 12.7, speaker: 'CUSTOMER',   text: 'They say the old temple hides a forbidden power.' },
    { id: 's1', shot: 'market',  start: 13.1, end: 17.3, speaker: 'SHOPKEEPER', text: 'Aye. And nobody who goes in ever comes back.' },
    { id: 'h1', shot: 'market',  start: 18.2, end: 21.8, speaker: 'HERO',       text: 'Because none of them were strong enough.', style: 'quiet' },
    { id: 'm1', shot: 'market',  start: 23.3, end: 28.0, speaker: 'MOTHER',     text: 'Stay, son. Power always takes more than it gives.' },
    { id: 'h2', shot: 'market',  start: 28.6, end: 33.6, speaker: 'HERO',       text: 'Why settle for bread, Mother, when I could have a kingdom?' },
    { id: 'h3', shot: 'market',  start: 34.2, end: 38.1, speaker: 'HERO',       text: "I'll be back before sunset. I promise." },
    { id: 'h4', shot: 'temple',  start: 39.1, end: 44.8, speaker: 'HERO',       text: 'Strength earns respect. Power commands it. And I will have both.' },
    { id: 'h5', shot: 'temple',  start: 46.1, end: 50.7, speaker: 'HERO',       text: 'They call it forbidden power. I call it my destiny.' },
];

// ---------------------------------------------------------------------------
// EFFECTS (all procedural; no extra art needed). Times on the master clock.
// ---------------------------------------------------------------------------
export const EFFECTS = {
    // The swing group (ropes + seat + the mother) is cropped from picture 2 and rotated about its top.
    // Hide nothing underneath: the overlay sits exactly on top of the same pixels, so the sway is tiny.
    swing: {
        image: 'intro-2',
        crop: { x: 104, y: 392, w: 72, h: 212 },     // image pixels
        pivot: { x: 140, y: 392 },                   // top centre of the crop (rope anchor side)
        startAt: 8.2,
        amplitudeDeg: 1.4, periodSec: 3.2,
        afterLetGo: { at: 38.1, amplitudeDeg: 2.2 }, // after the last line it swings a bit more, then keeps going
        keepSwingingUntil: 52.8,
    },
    lantern: {                                         // ambient life, optional
        image: 'intro-2',
        crop: { x: 34, y: 424, w: 36, h: 80 },
        pivot: { x: 52, y: 424 },
        startAt: 8.2, amplitudeDeg: 1.0, periodSec: 2.6,
    },
    // Greed cue: the hero's eyes flash red on the word "kingdom" (line h2).
    heroEyes: {
        at: 31.7, duration: 0.5, radius: 5, color: 0xff2a2a, blend: 'ADD',
        positions: [{ x: 201, y: 554 }, { x: 209, y: 554 }],   // image pixels on picture 2
    },
    // Slow tension push while the hero keeps a hand on his sword (line h1): small extra zoom.
    tensionPush: { at: 18.2, until: 21.8, extraZoom: 0 },   // camera must not move on the people: disabled,
    // His shadow stretches up the path toward the temple (picture 3), drawn as a growing wedge.
    pathShadow: {
        image: 'intro-3',
        polygon: [[415, 768], [640, 768], [862, 335], [830, 330]],  // wide at the bottom, narrow at the temple
        color: 0x000000, maxAlpha: 0.38,
        from: 39.5, to: 44.8,                                       // grows from the bottom edge upward
    },
    // Dark crown flashes above the temple. Drawn with graphics (5-point crown), no new picture.
    crownFlash: {
        at: 44.8, hold: 0.5, fadeOut: 0.35,
        position: { x: 860, y: 105 }, widthPx: 130,
        color: 0xff2e3a, glowColor: 0xff5a64,
        redTint: { alpha: 0.35 },                      // full-screen red overlay during the flash
        shake: { duration: 0.4, intensity: 0.012 },
        heartbeats: [44.8, 45.2],                      // two thumps
    },
    letterbox: { in: 0.6, heightPx: 90 },              // use the existing Letterbox helper
    finalFade: { from: 51.0, to: 52.2 },               // fade to black, then hold black until 52.8
};

// ---------------------------------------------------------------------------
// AUDIO (all OPTIONAL: if a file is missing the cutscene must still play silently)
// Put files in public/assets/audio/intro/. Guard every play() with cache.audio.exists(key).
// ---------------------------------------------------------------------------
export const INTRO_AUDIO = {
    'intro-ambience': { file: 'assets/audio/intro/ambience-village.ogg', loop: true,  volume: 0.35, from: 0.0,  fadeOutAt: 38.7 },
    'intro-music':    { file: 'assets/audio/intro/music-intro.ogg',      loop: false, volume: 0.45, from: 0.0,  fadeOutAt: 51.0 },
    'intro-tension':  { file: 'assets/audio/intro/tension-drone.ogg',    loop: true,  volume: 0.30, from: 17.8, fadeOutAt: 51.0 },
    'intro-steps':    { file: 'assets/audio/intro/footsteps.ogg',        loop: false, volume: 0.50, from: 34.9 },
    'intro-heartbeat':{ file: 'assets/audio/intro/heartbeat.ogg',        loop: false, volume: 0.80, at: [44.8, 45.2] },
    'intro-sting':    { file: 'assets/audio/intro/crown-sting.ogg',      loop: false, volume: 0.60, at: [44.8] },
    'intro-blip':     { file: 'assets/audio/intro/dialogue-blip.ogg',    loop: false, volume: 0.15, perChars: 2 },
};
