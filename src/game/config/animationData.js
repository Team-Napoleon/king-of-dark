// King of Dark - animation sheets + gameplay tuning in ONE place.
// Copy to: src/game/config/animationData.js
// Sheet numbers were measured from the real art; do not edit them unless the art changes.
// Gameplay numbers (damage, speed, timing) are safe to tweak.

export const DEBUG_KEYS = true; // dev cheats (F2..F7). Set to false before submitting.

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
    'hero-walk':  { file: 'assets/Hero/Idle_v3_walking_south_spritesheet.png',  frameWidth: 168, frameHeight: 168, frames: 8,  anchorX: 77,    anchorY: 142, nativeFacing: -1, scale: 0.72,  fps: 8 },
    'hero-run':   { file: 'assets/Hero/Idle_v3_running_south_spritesheet.png',  frameWidth: 168, frameHeight: 168, frames: 8,  anchorX: 77,    anchorY: 144, nativeFacing: -1, scale: 0.72,  fps: 14 },
    'hero-jump':  { file: 'assets/Hero/Idle_running-jump_south_spritesheet.png', frameWidth: 176, frameHeight: 176, frames: 8,  anchorX: 80,    anchorY: 134, nativeFacing: -1, scale: 0.72,  fps: 8 },
    // ---- hero punch (new; art faces LEFT; the right punch is this sheet flipped) ----
    'hero-punch': { file: 'assets/Hero/hero-punch.png', frameWidth: 346, frameHeight: 353, frames: 12, anchorX: 92.6,  anchorY: 353, nativeFacing: -1, scale: 0.247, fps: 24 },
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
    Object.entries(SHEETS).forEach(([key, s]) => {
        scene.load.spritesheet(key, s.file, {
            frameWidth: s.frameWidth,
            frameHeight: s.frameHeight,
            startFrame: 0,
            endFrame: s.frames - 1,
        });
    });
}

// Frame index for a clip at `seconds` since it started (speed multiplies fps).
export function frameAt(key, seconds, { loop = true, speed = 1 } = {}) {
    const s = SHEETS[key];
    const f = Math.floor(Math.max(0, seconds) * s.fps * speed);
    return loop ? f % s.frames : Math.min(f, s.frames - 1);
}

// Show one frame of a sheet on a visual sprite, feet-anchored and facing-aware.
// Phaser mirrors the frame about its own centre when flipX is on, so the feet
// anchor must be mirrored too: originX = 1 - anchorX/frameWidth when flipped.
export function showFrame(sprite, key, frame, facing) {
    const s = SHEETS[key];
    if (sprite.texture.key !== key) {
        sprite.setTexture(key, frame);
    } else if (sprite.frame.name !== frame && sprite.frame.name !== String(frame)) {
        sprite.setFrame(frame);
    }
    const flip = facing !== s.nativeFacing;
    sprite.setFlipX(flip);
    const ox = s.anchorX / s.frameWidth;
    sprite.setOrigin(flip ? 1 - ox : ox, s.anchorY / s.frameHeight);
    sprite.setScale(s.scale);
}

// ---------------------------------------------------------------------------
// HERO COMBAT  (keys are the only place to change controls)
// punch sheet: 12 frames @ 24fps = 0.5s. Windup 0-5, impact 6-8, recovery 9-11.
// ---------------------------------------------------------------------------
export const HERO_KEYS = {
    punchLeft: 'J',
    punchRight: 'L',
    combo: 'K',
    portalEnter: 'E',
};

export const HERO_PUNCH = {
    frames: 12,
    fps: 24,
    activeStart: 6,   // first damaging frame
    activeEnd: 8,     // last damaging frame
    cancelFrom: 9,    // after impact the next attack may start (recovery cancel)
    reach: 80,        // px from hero centre to the target's NEAR edge
    vertical: 70,     // vertical tolerance added to target's hitHalfHeight
};

export const HERO_MOVES = {
    punchLeft:  { damage: 28, steps: [-1] },        // faces and hits LEFT
    punchRight: { damage: 28, steps: [1] },         // faces and hits RIGHT
    combo:      { damage: 24, steps: [1, -1], endLag: 0.35 }, // right punch then left punch, hits both sides
};

export const HERO_PHYSICS = {
    bodyWidth: 34,
    bodyHeight: 52,
    bodyOffsetX: 60,
    bodyOffsetY: 88,
    moveSpeed: 260,
    jumpVelocity: -600,
    maxHealth: 100,
    maxVelocityX: 320,
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

// Shadow Curse (cast by imps). Mash J / K / L to break it.
export const SHADOW = {
    duration: 5.0,
    breakThreshold: 100,
    breakPerPress: 20,      // 5 presses break it
    breakDecayPerSec: 12,   // meter drains slowly, so you must keep pressing
    damageMult: 0.6,
    speedMult: 0.75,
};

// ---------------------------------------------------------------------------
// TEMPLE MONSTERS (shape placeholders until sheets exist)
// ---------------------------------------------------------------------------
export const ENEMY_TYPES = {
    imp: {
        hp: 50, speed: 120, width: 30, height: 40, hitHalfWidth: 18, hitHalfHeight: 22,
        melee: { damage: 10, range: 62, telegraph: 0.45, cooldown: 1.6 },
        cast: { first: 2.0, interval: 7.0, jitter: 1.0, range: 520, telegraph: 0.9, burst: 0.35 },
        dropChance: 0.5,
        stun: 0.25, flash: 0.09, knockback: 220, floatBob: 4, floatSpeed: 5,
    },
    brute: {
        hp: 140, speed: 75, width: 56, height: 76, hitHalfWidth: 32, hitHalfHeight: 40,
        melee: { damage: 26, range: 85, telegraph: 0.55, cooldown: 1.8 },
        cast: null,
        dropChance: 1.0,
        stun: 0.25, flash: 0.09, knockback: 220,
    },
};
export const HEALTH_ORB = {
    heal: 15,
    pickupRadiusX: 48,
    pickupRadiusY: 70,
    radius: 8,
    fallSpeed: 420,
    bobSpeed: 4,
    bobHeight: 3,
};

// 10 monsters, one after another. Max 2 alive. Next spawns once the hero passes its trigger x.
export const TEMPLE_WAVE = {
    sequence: ['imp', 'imp', 'imp', 'brute', 'imp', 'imp', 'brute', 'imp', 'imp', 'brute'],
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
    body: { width: 64, height: 132 },
    throneX: 640,
    throneY: 430,
    floorY: 630,
    hitHalfWidth: 50,
    hitHalfHeight: 66,
    walkSpeed: 110,
    runSpeed: 240,
    runBeyond: 420,       // run when farther than this
    approachUntil: 300,   // stop approaching at this distance
    idleTime: 0.8,        // phase 2: 0.5
    phase2At: 100,
    phase2Speed: 1.25,
    chipDamage: 10,       // damage taken while armored (windup/attack/walking)
    arenaMinX: 110,
    arenaMaxX: 1170,
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
        damage: 25, hitRange: 140, landDistance: 95, airSafeHeight: 110, knockback: 260,
    },
    tendril: {             // close-range sweep both sides
        sheet: 'king-tendril', weight: 1,
        markerEnd: 13,
        windupEnd: 7,          // telegraph ring on the floor during frames 0-13
        activeStart: 14, activeEnd: 20,
        recoverStart: 22,
        damage: 20, radius: 150, knockback: 300,
    },
    void: {                // big area burst
        sheet: 'king-void',
        markerEnd: 14,
        chargeEnd: 10,         // growing floor ring during frames 0-14
        activeStart: 15, activeEnd: 19,
        recoverStart: 24,
        damage: 30, radius: 180, knockback: 380,
    },
};
