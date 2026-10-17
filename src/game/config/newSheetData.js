// New sheet + tuning data for the v2 pass (hero kick/sword/fire, Gloamgnaw creature, intro timing).
// Copilot: MERGE this into src/game/config/animationData.js using the SAME entry structure the existing
// 'hero-punch' / 'king-*' entries use (field names may differ: map them, do not invent new helpers).
// Frame indices below refer to the TRIMMED sheets in this pack. All "Src" values are source-pixels
// inside one frame; convert to screen pixels with the sheet's render scale
//   scale = (heroStandPx / figureHeight)   for hero sheets (heroStandPx already includes SIZE_SCALE.hero)
//   scale = (heroStandPx * CREATURE.heightRatio / figureHeight) for Gloamgnaw sheets.

export const SIZE_SCALE = { hero: 2, king: 2 };

export const NEW_HERO_SHEETS = {
  'hero-kick':  { file: 'assets/Hero/hero-kick.png',  frameWidth: 450, frameHeight: 450, frames: 20, columns: 6, fps: 12.5, nativeFacing: 'left', anchorX: 215.5, footY: 330, figureHeight: 211 },
  'hero-sword': { file: 'assets/Hero/hero-sword.png', frameWidth: 450, frameHeight: 450, frames: 25, columns: 6, fps: 12.5, nativeFacing: 'left', anchorX: 211.5, footY: 330, figureHeight: 211 },
  'hero-fire':  { file: 'assets/Hero/hero-fire.png',  frameWidth: 510, frameHeight: 298, frames: 23, columns: 6, fps: 12.5, nativeFacing: 'left', anchorX: 239,   footY: 263, figureHeight: 219 },
};

// New moves. dirMode 'facing' = attack goes the way the hero faces when it starts (facing locked during the move).
export const NEW_HERO_MOVES = {
  kick:  { key: 'U', sheet: 'hero-kick',  dirMode: 'facing', speed: 1.5, damage: 22, knockback: 420, stun: 0.5, activeStart: 8, activeEnd: 13, cancelFrom: 16, endLag: 0.08, reachSrc: 125, verticalSrc: 80,  moveMult: 0.2 },
  sword: { key: 'I', sheet: 'hero-sword', dirMode: 'facing', speed: 1.5, damage: 30, knockback: 300, stun: 0.4, activeStart: 9, activeEnd: 14, cancelFrom: 18, endLag: 0.10, reachSrc: 155, verticalSrc: 100, moveMult: 0.3 },
  fire:  { key: 'O', sheet: 'hero-fire',  dirMode: 'facing', speed: 1.2, cooldown: 4.0, moveMult: 0, releaseFrame: 14, cancelFrom: 20, endLag: 0,
           projectile: { spawnFrame: 14, visibleFromFrame: 16, muzzleSrc: 124, speedSrc: 700, rangeSrc: 1100, radiusSrc: 45, damage: 45, knockback: 350, stun: 0.5, pierce: true } },
};
// Existing moves: punch (J) now uses dirMode 'facing'. Combo (K) = [facing, -facing] (two-sided). L is unused.

export const GLOAM_SHEETS = {
  'gloam-run':    { file: 'assets/Gloamgnaw/gloam-run.png',    frameWidth: 352, frameHeight: 218, frames: 45, columns: 8, fps: 12, nativeFacing: 'left', anchorX: 173, footY: 208, figureHeight: 199,
                    clips: { idle: { from: 0, to: 17, mode: 'pingpong' }, run: { from: 18, to: 44, mode: 'loop' } } },
  'gloam-chase':  { file: 'assets/Gloamgnaw/gloam-chase.png',  frameWidth: 352, frameHeight: 218, frames: 21, columns: 8, fps: 12, nativeFacing: 'left', anchorX: 173, footY: 208, figureHeight: 199,
                    clips: { chase: { from: 0, to: 20, mode: 'loop' } } },
  'gloam-snatch': { file: 'assets/Gloamgnaw/gloam-snatch.png', frameWidth: 352, frameHeight: 218, frames: 33, columns: 8, fps: 12, nativeFacing: 'left', anchorX: 173, footY: 208, figureHeight: 199,
                    clips: { snatch: { from: 0, to: 32, mode: 'once' } } },
};

export const GLOAM = {
  heightRatio: 0.55,            // rendered body height = 0.55 x hero standing height
  health: 70,
  speedMult: { patrol: 0.30, run: 0.55, chase: 0.75 },  // x hero run speed
  aggroRangeH: 3.0, castRangeH: 2.2, snatchReachH: 1.6, closeRangeH: 0.9,  // multiples of hero standing height
  hitHalfWidthRatio: 0.38, hitHalfHeightRatio: 0.45,    // of rendered length / height
  bodyWidthRatio: 0.70, bodyHeightRatio: 0.80,          // physics carrier
  snatch: { speed: 1.15, strikeFrame: 16, vulnerableFrom: 17, lastFrame: 32, closeDamage: 14,
            first: 2.5, interval: 4.5, jitter: 1.2, postponeIfShadowed: 1.5, interruptRestart: 3.0 },
  materialize: 0.6,
};

// Intro cutscene: total 10.0 s. Times are seconds from the moment controls lock.
export const BOSS_INTRO = {
  totalSeconds: 10.0,
  barsIn: { at: 0.0, dur: 0.4 }, zoom: { at: 0.0, dur: 0.8, to: 1.15 },
  dialogueStart: 0.8,
  lines: [
    { speaker: 'KING', text: 'Another soul climbs my stairs, hungry for power.',          charMs: 24, hold: 300 },
    { speaker: 'HERO', text: "I'm not here for power. I'm here to end you.",              charMs: 24, hold: 300 },
    { speaker: 'KING', text: 'They all say that. Right before they sit where I sit.',     charMs: 24, hold: 450 },
    { speaker: 'HERO', text: 'Then this throne dies with you.',                           charMs: 24, hold: 250 },
    { speaker: 'KING', text: 'Kill me, and the dark will need a new master.',             charMs: 24, hold: 400 },
    { speaker: 'HERO', text: 'Then let it choose.',                                       charMs: 24, hold: 200 },
  ],
  eyeFlash: { at: 8.5, dur: 0.5 }, shake: { at: 8.5, dur: 0.3 },
  barsOut: { at: 9.5, dur: 0.5 }, zoomBack: { at: 9.4, dur: 0.6 },
  unlockAt: 10.0,
};
