// King of Dark - animation sheets + gameplay tuning in ONE place.
// Copy to: src/game/config/animationData.js
// Sheet numbers were measured from the real art; do not edit them unless the art changes.
// Gameplay numbers (damage, speed, timing) are safe to tweak.

export const DEBUG_KEYS = true; // dev cheats (F2..F7). Set to false before submitting.

export const SIZE_SCALE = { hero: 2, king: 2 };
export const HERO_STAND_PX = 118 * 0.72 * SIZE_SCALE.hero;

export const NEW_HERO_SHEETS = {
    'hero-kick':  { file: 'assets/Hero/hero-kick.png',  frameWidth: 450, frameHeight: 450, frames: 20, fps: 12.5, nativeFacing: -1, anchorX: 215.5, anchorY: 330, figureHeight: 211 },
    'hero-sword': { file: 'assets/Hero/hero-sword.png', frameWidth: 450, frameHeight: 450, frames: 25, fps: 12.5, nativeFacing: -1, anchorX: 211.5, anchorY: 330, figureHeight: 211 },
    'hero-fire':  { file: 'assets/Hero/hero-fire.png',  frameWidth: 510, frameHeight: 298, frames: 23, fps: 12.5, nativeFacing: -1, anchorX: 239, anchorY: 263, figureHeight: 219 },
};

export const NEW_HERO_MOVES = {
    kick:  { key: 'U', sheet: 'hero-kick',  dirMode: 'facing', speed: 1.5, damage: 22, knockback: 420, stun: 0.5, activeStart: 8, activeEnd: 13, cancelFrom: 16, endLag: 0.08, reachSrc: 125, verticalSrc: 80, moveMult: 0.2 },
    sword: { key: 'I', sheet: 'hero-sword', dirMode: 'facing', speed: 1.5, damage: 30, knockback: 300, stun: 0.4, activeStart: 9, activeEnd: 14, cancelFrom: 18, endLag: 0.10, reachSrc: 155, verticalSrc: 100, moveMult: 0.3 },
    fire:  { key: 'O', sheet: 'hero-fire',  dirMode: 'facing', speed: 1.2, cooldown: 4.0, moveMult: 0, releaseFrame: 14, cancelFrom: 20, endLag: 0,
             projectile: { spawnFrame: 14, visibleFromFrame: 16, muzzleSrc: 124, speedSrc: 700, rangeSrc: 1100, radiusSrc: 45, damage: 45, knockback: 350, stun: 0.5, pierce: true } },
};

export const GLOAM_SHEETS = {
    'gloam-run':    { file: 'assets/Gloamgnaw/gloam-run.png',    frameWidth: 352, frameHeight: 218, frames: 45, fps: 12, nativeFacing: -1, anchorX: 173, anchorY: 208, figureHeight: 199,
                      clips: { idle: { from: 0, to: 17, mode: 'pingpong' }, run: { from: 18, to: 44, mode: 'loop' } } },
    'gloam-chase':  { file: 'assets/Gloamgnaw/gloam-chase.png',  frameWidth: 352, frameHeight: 218, frames: 21, fps: 12, nativeFacing: -1, anchorX: 173, anchorY: 208, figureHeight: 199,
                      clips: { chase: { from: 0, to: 20, mode: 'loop' } } },
    'gloam-snatch': { file: 'assets/Gloamgnaw/gloam-snatch.png', frameWidth: 352, frameHeight: 218, frames: 33, fps: 12, nativeFacing: -1, anchorX: 173, anchorY: 208, figureHeight: 199,
                      clips: { snatch: { from: 0, to: 32, mode: 'once' } } },
};

export const GLOAM = {
    heightRatio: 0.55,
    health: 70,
    speedMult: { patrol: 0.30, run: 0.55, chase: 0.75 },
    aggroRangeH: 3.0,
    castRangeH: 2.2,
    snatchReachH: 1.6,
    closeRangeH: 0.9,
    hitHalfWidthRatio: 0.38,
    hitHalfHeightRatio: 0.45,
    bodyWidthRatio: 0.70,
    bodyHeightRatio: 0.80,
    snatch: { speed: 1.15, strikeFrame: 16, vulnerableFrom: 17, lastFrame: 32, closeDamage: 14,
              first: 2.5, interval: 4.5, jitter: 1.2, postponeIfShadowed: 1.5, interruptRestart: 3.0 },
    materialize: 0.6,
};

export const BOSS_INTRO = {
    totalSeconds: 10.0,
    barsIn: { at: 0.0, dur: 0.4 },
    zoom: { at: 0.0, dur: 0.8, to: 1.15 },
    dialogueStart: 0.8,
    lines: [
        { speaker: 'KING', text: 'Another soul climbs my stairs, hungry for power.', charMs: 24, hold: 300 },
        { speaker: 'HERO', text: "I'm not here for power. I'm here to end you.", charMs: 24, hold: 300 },
        { speaker: 'KING', text: 'They all say that. Right before they sit where I sit.', charMs: 24, hold: 450 },
        { speaker: 'HERO', text: 'Then this throne dies with you.', charMs: 24, hold: 250 },
        { speaker: 'KING', text: 'Kill me, and the dark will need a new master.', charMs: 24, hold: 400 },
        { speaker: 'HERO', text: 'Then let it choose.', charMs: 24, hold: 200 },
    ],
    eyeFlash: { at: 8.5, dur: 0.5 },
    shake: { at: 8.5, dur: 0.3 },
    barsOut: { at: 9.5, dur: 0.5 },
    zoomBack: { at: 9.4, dur: 0.6 },
    unlockAt: 10.0,
};

// ---------------------------------------------------------------------------
// SPRITESHEETS
//  - frameWidth/frameHeight: size of ONE frame in the PNG (grid, no margin/spacing)
//  - anchorX/anchorY: pixel in the frame where the FEET touch the ground
//  - nativeFacing: direction the art faces unflipped (-1 = screen-left, +1 = screen-right)
//  - scale: display scale (keeps characters at the right on-screen size)
//  - fps: playback speed used by frameAt()
// ---------------------------------------------------------------------------
export const SHEETS = {
    // ---- hero (existing locomotion sheets, art faces LEFT) ----
    'hero-walk':  { file: 'assets/Hero/Idle_v3_walking_south_spritesheet.png',  frameWidth: 168, frameHeight: 168, frames: 8,  anchorX: 77,    anchorY: 142, nativeFacing: -1, scale: 0.72,  figureHeight: 118, fps: 8 },
    'hero-run':   { file: 'assets/Hero/Idle_v3_running_south_spritesheet.png',  frameWidth: 168, frameHeight: 168, frames: 8,  anchorX: 77,    anchorY: 144, nativeFacing: -1, scale: 0.72,  figureHeight: 121, fps: 14 },
    'hero-jump':  { file: 'assets/Hero/Idle_running-jump_south_spritesheet.png', frameWidth: 176, frameHeight: 176, frames: 8,  anchorX: 80,    anchorY: 134, nativeFacing: -1, scale: 0.72,  figureHeight: 92, fps: 8 },
    // ---- hero punch (new; art faces LEFT; the right punch is this sheet flipped) ----
    'hero-punch': { file: 'assets/Hero/hero-punch.png', frameWidth: 346, frameHeight: 353, frames: 12, anchorX: 92.6,  anchorY: 353, nativeFacing: -1, scale: 0.247, figureHeight: 351, fps: 24 },
    // ---- Dark King (new). Walk/run/sword face RIGHT. Idle, tendril, void are symmetric. ----
    'king-idle':    { file: 'assets/King/king-idle.png',    frameWidth: 256, frameHeight: 253, frames: 24, anchorX: 118.4, anchorY: 249, nativeFacing: 1, scale: 0.6, fps: 12.5 },
    'king-walk':    { file: 'assets/King/king-walk.png',    frameWidth: 180, frameHeight: 201, frames: 16, anchorX: 99.0,  anchorY: 199, nativeFacing: 1, scale: 0.6, fps: 14.3 },
    'king-run':     { file: 'assets/King/king-run.png',     frameWidth: 207, frameHeight: 205, frames: 12, anchorX: 128.0, anchorY: 203, nativeFacing: 1, scale: 0.6, fps: 20 },
    'king-sword':   { file: 'assets/King/king-sword.png',   frameWidth: 297, frameHeight: 250, frames: 36, anchorX: 119.5, anchorY: 236, nativeFacing: 1, scale: 0.6, fps: 12.5 },
    'king-tendril': { file: 'assets/King/king-tendril.png', frameWidth: 446, frameHeight: 284, frames: 36, anchorX: 225.1, anchorY: 272, nativeFacing: 1, scale: 0.6, fps: 12.5 },
    'king-void':    { file: 'assets/King/king-void.png',    frameWidth: 634, frameHeight: 386, frames: 36, anchorX: 313.6, anchorY: 319, nativeFacing: 1, scale: 0.6, fps: 12.5 },
};

// Load every sheet (call once from BootScene.preload).
export function preloadSheets(scene) {
    Object.entries({ ...SHEETS, ...NEW_HERO_SHEETS, ...GLOAM_SHEETS }).forEach(([key, s]) => {
        scene.load.spritesheet(key, s.file, {
            frameWidth: s.frameWidth,
            frameHeight: s.frameHeight,
            startFrame: 0,
            endFrame: s.frames - 1,
        });
    });
}

// Frame index for a clip at `seconds` since it started (speed multiplies fps).
const DEFAULT_FRAME_OPTIONS = Object.freeze({});

export function frameAt(key, seconds, options = DEFAULT_FRAME_OPTIONS) {
    const { loop = true, speed = 1, from = 0, to = null, pingpong = false } = options;
    const s = SHEETS[key] || NEW_HERO_SHEETS[key] || GLOAM_SHEETS[key];
    const last = to ?? s.frames - 1;
    const count = last - from + 1;
    const frame = Math.floor(Math.max(0, seconds) * s.fps * speed);
    if (pingpong) {
        const cycle = Math.max(1, count * 2 - 2);
        const phase = frame % cycle;
        return from + (phase < count ? phase : cycle - phase);
    }
    return loop ? from + (frame % count) : from + Math.min(frame, count - 1);
}

// Show one frame of a sheet on a visual sprite, feet-anchored and facing-aware.
// Phaser mirrors the frame about its own centre when flipX is on, so the feet
// anchor must be mirrored too: originX = 1 - anchorX/frameWidth when flipped.
export function showFrame(sprite, key, frame, facing) {
    const s = SHEETS[key] || NEW_HERO_SHEETS[key] || GLOAM_SHEETS[key];
    if (sprite.texture.key !== key) {
        sprite.setTexture(key, frame);
    } else if (sprite.frame.name !== frame && sprite.frame.name !== String(frame)) {
        sprite.setFrame(frame);
    }
    const flip = facing !== s.nativeFacing;
    sprite.setFlipX(flip);
    const ox = s.anchorX / s.frameWidth;
    sprite.setOrigin(flip ? 1 - ox : ox, s.anchorY / s.frameHeight);
    const scale = key.startsWith('hero-') && s.figureHeight
        ? HERO_STAND_PX / s.figureHeight
        : key.startsWith('gloam-')
            ? HERO_STAND_PX * GLOAM.heightRatio / s.figureHeight
            : key.startsWith('king-') ? s.scale * SIZE_SCALE.king : s.scale;
    sprite.setScale(scale);
}

// ---------------------------------------------------------------------------
// HERO COMBAT  (keys are the only place to change controls)
// punch sheet: 12 frames @ 24fps = 0.5s. Windup 0-5, impact 6-8, recovery 9-11.
// ---------------------------------------------------------------------------
export const HERO_KEYS = {
    punch: 'J',
    combo: 'K',
    kick: 'U',
    sword: 'I',
    fire: 'O',
    portalEnter: 'E',
};

export const HERO_PUNCH = {
    frames: 12,
    fps: 24,
    activeStart: 6,   // first damaging frame
    activeEnd: 8,     // last damaging frame
    cancelFrom: 9,    // after impact the next attack may start (recovery cancel)
    reach: 160,       // px from hero centre to the target's NEAR edge
    vertical: 140,    // vertical tolerance added to target's hitHalfHeight
};

export const HERO_MOVES = {
    punch: { key: 'J', sheet: 'hero-punch', dirMode: 'facing', speed: 1, damage: 28, knockback: 280, stun: 0.25, activeStart: 6, activeEnd: 8, cancelFrom: 9 },
    combo: { key: 'K', sheet: 'hero-punch', dirMode: 'facing', speed: 1, damage: 24, knockback: 240, stun: 0.2, activeStart: 6, activeEnd: 8, cancelFrom: 9, endLag: 0.35 },
};

export const HERO_PHYSICS = {
    bodyWidth: 34,
    bodyHeight: 52,
    bodyOffsetX: 60,
    bodyOffsetY: 88,
    moveSpeed: 338,
    jumpVelocity: -600,
    maxHealth: 100,
    maxVelocityX: 416,
    maxVelocityY: 950,
    dragX: 1200,
};

export const HERO_FEEDBACK = {
    invulnerability: 1.0,
    hitFlash: 0.09,
    knockbackUp: 220,
    attackBuffer: 0.25,
    hitSparkLife: 0.18,
    curseBurstLife: 0.4,
};

// Shadow Curse (cast by Gloamgnaw). Mash J / K to break it.
export const SHADOW = {
    duration: 5.0,
    breakThreshold: 100,
    breakPerPress: 20,      // 5 presses break it
    breakDecayPerSec: 12,   // meter drains slowly, so you must keep pressing
    damageMult: 0.6,
    speedMult: 0.75,
};

// ---------------------------------------------------------------------------
// TEMPLE MONSTERS
// ---------------------------------------------------------------------------
export const ENEMY_TYPES = {
    gloam: {
        hp: GLOAM.health, speed: HERO_PHYSICS.moveSpeed,
        dropChance: 0.5,
        stun: 0.5, flash: 0.09, knockback: 260,
    },
    brute: {
        hp: 140, speed: 75, width: 112, height: 152, hitHalfWidth: 64, hitHalfHeight: 80,
        melee: { damage: 26, range: 170, telegraph: 0.55, cooldown: 1.8 },
        cast: null,
        dropChance: 1.0,
        stun: 0.25, flash: 0.09, knockback: 220,
    },
};
export const HEALTH_ORB = {
    heal: 15,
    pickupRadiusX: 76.8,
    pickupRadiusY: 112,
    radius: 8,
    fallSpeed: 420,
    bobSpeed: 4,
    bobHeight: 3,
};

// 10 monsters, one after another. Max 2 alive. Next spawns once the hero passes its trigger x.
export const TEMPLE_WAVE = {
    sequence: ['gloam', 'gloam', 'gloam', 'brute', 'gloam', 'gloam', 'brute', 'gloam', 'gloam', 'brute'],
    maxAlive: 2,
    firstTriggerX: 500,
    triggerSpacing: 430,
    spawnAhead: 700,        // px ahead of the hero (off screen)
    maxSpawnX: 5450,
    materialize: 0.6,       // seconds fading in, untargetable
};

export const PORTAL = {
    x: 5600,
    wallX: 5750,
    bannerRange: 600,
    enterRange: 140,
    transition: 1.4,
    worldY: 570,
    walkSpeed: 160,
    fadeTime: 0.5,
    fadeOutTime: 0.2,
    zoom: 1.3,
    bannerOpenY: 94,
    bannerSealedY: 68,
};

// ---------------------------------------------------------------------------
// DARK KING
// Attack clips are driven FRAME BY FRAME from a timer (no Phaser animation events).
// frame = floor(elapsed * fps * speedMult). Phase 2 speedMult = 1.25.
// "left" source files slash toward screen-RIGHT, so nativeFacing = +1.
// ---------------------------------------------------------------------------
export const KING = {
    hp: 200,
    body: { width: 128, height: 264 },
    throneX: 640,
    throneY: 298,
    floorY: 630,
    hitHalfWidth: 100,
    hitHalfHeight: 132,
    walkSpeed: 165,
    runSpeed: 360,
    runBeyond: 840,
    approachUntil: 600,
    idleTime: 0.8,        // phase 2: 0.5
    phase2At: 100,
    phase2Speed: 1.25,
    chipDamage: 10,       // damage taken while armored (windup/attack/walking)
    wallLeft: 70,
    wallRight: 1210,
    eyeFlashDuration: 0.3,
    hitFlashDuration: 0.09,
    deathFreeze: 0.4,
    deathExpand: 2.0,
};

export const KING_ATTACKS = {
    sword: {               // Shadow Step strike (signature)
        sheet: 'king-sword', cooldown: 5.0,
        markerEnd: 10,
        telegraphEnd: 6,       // frames 0-6 shake + landing marker on the floor
        untargetableFrom: 7,   // dissolve begins
        teleportFrame: 9,      // invisible: move to the landing spot at the START of this frame
        reappearFrame: 11,
        untargetableTo: 10,
        activeStart: 16, activeEnd: 22,
        recoverStart: 23,      // frames 23-35 = vulnerable
        damage: 25, hitRange: 280, landDistance: 190, airSafeHeight: 220, knockback: 260,
    },
    tendril: {             // close-range sweep both sides
        sheet: 'king-tendril', weight: 1,
        markerEnd: 13,
        windupEnd: 7,          // telegraph ring on the floor during frames 0-13
        activeStart: 14, activeEnd: 20,
        recoverStart: 22,
        damage: 20, radius: 225, knockback: 300,
    },
    void: {                // big area burst
        sheet: 'king-void',
        markerEnd: 14,
        chargeEnd: 10,         // growing floor ring during frames 0-14
        activeStart: 15, activeEnd: 19,
        recoverStart: 24,
        damage: 30, radius: 270, knockback: 380,
    },
};
