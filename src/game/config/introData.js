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
    totalDuration: 63.0,        // extended for calm, unhurried dialogue pacing
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
// ---------------------------------------------------------------------------
export const SHOTS = [
    {
        id: 'village', image: 'intro-1', start: 0.0, end: 9.2,
        fadeInFromBlack: 0.9,
        camera: { from: { zoom: 1.0, x: 672, y: 384 }, to: { zoom: 1.18, x: 690, y: 470 }, ease: 'Sine.easeInOut' },
    },
    {
        id: 'market', image: 'intro-2', start: 8.8, end: 45.5,
        crossfadeIn: 0.6,
        camera: [
            { from: 8.8,  to: 10.4, zoom: 1.30, x: 1070, y: 520, ease: 'Sine.easeInOut' },
            { from: 10.4, to: 45.5, zoom: 1.30, x: 1070, y: 520, hold: true },
        ],
    },
    {
        id: 'temple', image: 'intro-3', start: 45.0, end: 63.0,
        crossfadeIn: 0.6,
        camera: { from: { zoom: 1.0, x: 672, y: 384 }, to: { zoom: 1.22, x: 860, y: 260 }, startAt: 45.0, endAt: 60.5, ease: 'Sine.easeInOut' },
    },
];

// ---------------------------------------------------------------------------
// DIALOGUE CUES (calm, extended windows so lines are never rushed)
// ---------------------------------------------------------------------------
export const SPEAKER_COLORS = {
    NARRATOR: 0xb9bbcf,
    CUSTOMER: 0xc9c9d6,
    SHOPKEEPER: 0xd9a066,
    HERO: 0xf5d58a,
    MOTHER: 0x8fd3c8,
};
export const TYPE_MS_PER_CHAR = 28;

export const DIALOGUE = [
    { id: 'n1', shot: 'village', start: 1.0,  end: 8.5,  speaker: 'NARRATOR',   text: 'In a world untouched by darkness, one man desired something no ordinary life could offer.' },
    { id: 'c1', shot: 'market',  start: 9.6,  end: 14.8, speaker: 'CUSTOMER',   text: 'They say the old temple hides a forbidden power.' },
    { id: 's1', shot: 'market',  start: 15.2, end: 20.5, speaker: 'SHOPKEEPER', text: 'Aye. And nobody who goes in ever comes back.' },
    { id: 'h1', shot: 'market',  start: 20.8, end: 25.3, speaker: 'HERO',       text: 'Because none of them were strong enough.', style: 'quiet' },
    { id: 'm1', shot: 'market',  start: 27.0, end: 32.8, speaker: 'MOTHER',     text: 'Stay, son. Power always takes more than it gives.' },
    { id: 'h2', shot: 'market',  start: 33.2, end: 39.5, speaker: 'HERO',       text: 'Why settle for bread, Mother, when I could have a kingdom?' },
    { id: 'h3', shot: 'market',  start: 39.8, end: 44.5, speaker: 'HERO',       text: "I'll be back before sunset. I promise." },
    { id: 'h4', shot: 'temple',  start: 46.0, end: 53.2, speaker: 'HERO',       text: 'Strength earns respect. Power commands it. And I will have both.' },
    { id: 'h5', shot: 'temple',  start: 54.0, end: 59.9, speaker: 'HERO',       text: 'They call it forbidden power. I call it my destiny.' },
];

// ---------------------------------------------------------------------------
// EFFECTS
// ---------------------------------------------------------------------------
export const EFFECTS = {
    swing: {
        image: 'intro-2',
        crop: { x: 104, y: 392, w: 72, h: 212 },
        pivot: { x: 140, y: 392 },
        startAt: 8.8,
        amplitudeDeg: 1.4, periodSec: 3.2,
        afterLetGo: { at: 44.5, amplitudeDeg: 2.2 },
        keepSwingingUntil: 63.0,
    },
    lantern: {
        image: 'intro-2',
        crop: { x: 34, y: 424, w: 36, h: 80 },
        pivot: { x: 52, y: 424 },
        startAt: 8.8, amplitudeDeg: 1.0, periodSec: 2.6,
    },
    heroEyes: {
        at: 38.0, duration: 0.4, radius: 5, color: 0xff2a2a, blend: 'ADD',
        positions: [{ x: 201, y: 554 }, { x: 209, y: 554 }],
    },
    tensionPush: { at: 20.8, until: 25.3, extraZoom: 0.05 },
    pathShadow: {
        image: 'intro-3',
        polygon: [[415, 768], [640, 768], [862, 335], [830, 330]],
        color: 0x000000, maxAlpha: 0.38,
        from: 47.0, to: 53.0,
    },
    crownFlash: {
        at: 53.5, hold: 0.5, fadeOut: 0.35,
        position: { x: 860, y: 105 }, widthPx: 130,
        color: 0xff2e3a, glowColor: 0xff5a64,
        redTint: { alpha: 0.35 },
        shake: { duration: 0.4, intensity: 0.012 },
        heartbeats: [53.5, 53.9],
    },
    letterbox: { in: 0.6, heightPx: 90 },
    finalFade: { from: 60.5, to: 62.0 },
};

// ---------------------------------------------------------------------------
// AUDIO
// ---------------------------------------------------------------------------
export const INTRO_AUDIO = {
    'intro-ambience': { file: 'assets/audio/intro/ambience-village.ogg', loop: true,  volume: 0.35, from: 0.0,  fadeOutAt: 45.0 },
    'intro-music':    { file: 'assets/audio/intro/music-intro.ogg',      loop: false, volume: 0.45, from: 0.0,  fadeOutAt: 60.5 },
    'intro-tension':  { file: 'assets/audio/intro/tension-drone.ogg',    loop: true,  volume: 0.30, from: 20.8, fadeOutAt: 60.5 },
    'intro-steps':    { file: 'assets/audio/intro/footsteps.ogg',        loop: false, volume: 0.50, from: 43.5 },
    'intro-heartbeat':{ file: 'assets/audio/intro/heartbeat.ogg',        loop: false, volume: 0.80, at: [53.5, 53.9] },
    'intro-sting':    { file: 'assets/audio/intro/crown-sting.ogg',      loop: false, volume: 0.60, at: [53.5] },
    'intro-blip':     { file: 'assets/audio/intro/dialogue-blip.ogg',    loop: false, volume: 0.15, perChars: 2 },
};
