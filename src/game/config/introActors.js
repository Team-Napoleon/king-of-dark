// Intro cutscene: live hero sprite + speech-bubble anchors.
// All coordinates are SOURCE PIXELS of the 1344x768 intro pictures (same space as introData.js).
// Convert with the existing toWorld(x, y). Keys 'intro-2' / 'intro-3' are the texture keys of the pictures
// (intro-1 = far village, intro-2 = street with swing and market stall, intro-3 = temple hill path).

export const INTRO_ACTORS = {
  hero: {
    // Pose: use the SAME standing/idle pose the Player shows (read Player.js, do not edit it), via showFrame().
    byImage: {
      // Street scene: cobblestone path, centre foreground.
      'intro-2': { feetX: 725, feetY: 664, heightSrc: 128, facing: 'left',  tint: 0xffe2c4, shadow: { alpha: 0.35, widthRatio: 0.55, heightRatio: 0.12 } },
      // Temple hill: on the winding path below the castle gate.
      'intro-3': { feetX: 843, feetY: 440, heightSrc: 62,  facing: 'right', tint: 0xe9c9b8, shadow: { alpha: 0.30, widthRatio: 0.55, heightRatio: 0.12 } },
    },
    fadeWithPicture: true,      // hero alpha = alpha of that shot's picture (crossfades together)
    breathe: { px: 1, period: 3.2 },   // vertical idle sway driven by the master clock (not a tween)
    headTopOffsetSrc: 8,        // bubble tail points this far above the head top
    eyes: { dx: 0.07, dy: 0.86 },      // eye position as a fraction of height: dx toward facing, dy above feet
  },

  // Head-top points (where a bubble's tail points) for painted characters. HERO is computed from the sprite.
  bubbleAnchors: {
    'intro-2': {
      MOTHER:     { x: 158,  y: 535 },   // seated on the swing
      BOY:        { x: 236,  y: 568 },   // standing next to the swing
      CUSTOMER:   { x: 1030, y: 498 },   // red vest, left of the counter
      SHOPKEEPER: { x: 1085, y: 498 },   // behind the counter
    },
    'intro-3': {},
  },
  // If a cue's speaker string differs from the keys above, map it here (match case-insensitively).
  speakerAliases: { MOM: 'MOTHER', MA: 'MOTHER', SHOP: 'SHOPKEEPER', 'SHOP KEEPER': 'SHOPKEEPER', BUYER: 'CUSTOMER' },

  bubble: {
    showName: false,   // no speaker-name heading: only dialogue text inside the box
    fontSize: 14, padding: 10, maxWidth: 210, tailPx: 9, borderPx: 2,
    panelColor: 0x120f1a, panelAlpha: 0.9, textColor: '#f2ecff',
    // Scale container smoothly: zoomS = clamp(cam.zoom / 1.8, 0.65, 0.95)
    zoomScale: { ref: 1.8, min: 0.65, max: 0.95 },
    // Cap maximum bubble dimensions to 25% screen width and 20% screen height
    fit: { maxWidthFrac: 0.25, maxHeightFrac: 0.20, minFontPx: 10 },
    fadeIn: 0.30, fadeOut: 0.35, safeMargin: 20, pool: 2,
  },

  // Street scene camera plan: Frame A (905, 520, z: 1.95), Frame B (440, 535, z: 1.75).
  // Arrives 0.3s before Mother begins her line over 1.2s pan.
  cameraFrames: {
    'intro-2': {
      A: { x: 905, y: 520, zoom: 1.95 },
      B: { x: 440, y: 535, zoom: 1.75 },
      moveSeconds: 1.2, arriveBeforeCueStart: 0.3, startFrame: 'A',
    },
  },

  // Calm dialogue pacing: 75ms per character, 180ms on commas, 350ms on periods/exclamations
  pacing: { msPerChar: 75, pauseComma: 180, pauseStop: 350, maxFractionOfCue: 0.85 },
};
