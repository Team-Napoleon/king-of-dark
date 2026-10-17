// Intro cutscene: live hero sprite + speech-bubble anchors.
// All coordinates are SOURCE PIXELS of the 1344x768 intro pictures (same space as introData.js).
// Convert with the existing toWorld(x, y). Keys 'intro-2' / 'intro-3' are the texture keys of the pictures
// (intro-1 = far village, intro-2 = street with swing and market stall, intro-3 = temple hill path).

export const INTRO_ACTORS = {
  hero: {
    byImage: {
      // STREET SCENE ('intro-2'): the hero is the hand-drawn chibi picture (assets/intro/hero-intro2.png, 124x256, natively
      // facing LEFT, feet at the bottom edge, feet anchor at 45% of the width). Facing right = flipX about the feet point.
      // Camera is static on the full picture, so these are fixed screen-ish sizes: feet on the cobblestone path in the centre.
      'intro-2': {
        kind: 'image', texture: 'hero-intro2', file: 'assets/intro/hero-intro2.png',
        nativeFacing: 'left', feetAnchorFracX: 0.449,
        feetX: 725, feetY: 650, heightSrc: 124,
        initialFacing: 'right',
        // Facing is decided by WHO IS SPEAKING, changing instantly (no tween) at the cue start. HERO cues keep the current facing.
        facingBySpeaker: { CUSTOMER: 'right', SHOPKEEPER: 'right', MOTHER: 'left' },
        tint: 0xffe2c4, shadow: { alpha: 0.35, widthRatio: 0.55, heightRatio: 0.12 },
        eyes: { dx: 0.061, dy: 0.702, count: 1 },    // single visible eye (side view): fraction of height; dx toward facing
      },
      // TEMPLE HILL ('intro-3'): unchanged, the gameplay sprite standing on the path below the castle.
      'intro-3': { kind: 'sprite', feetX: 843, feetY: 440, heightSrc: 62, facing: 'right', tint: 0xe9c9b8, shadow: { alpha: 0.30, widthRatio: 0.55, heightRatio: 0.12 } },
    },
    fadeWithPicture: true,      // hero alpha = alpha of that shot's picture (crossfades together)
    breathe: { px: 1, period: 3.2 },   // vertical idle sway driven by the master clock (not a tween)
    headTopOffsetSrc: 8,        // bubble tail points this far above the head top
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
    showName: false,   // no speaker-name heading: just the bubble on the character
    // Base layout (designed for zoom = zoomScale.ref). The whole bubble (panel + text + tail) is built ONCE per cue at this
    // base size and then scaled as one unit every frame by the camera zoom, so wrapping never changes while zooming.
    fontSize: 12, padding: 7, maxWidth: 170, tailPx: 7, borderPx: 2,
    panelColor: 0x120f1a, panelAlpha: 0.9, textColor: '#f2ecff',
    // scale = clamp(cameraZoom / ref, min, max): zoomed out -> smaller bubble, zoomed in -> grows only up to max.
    zoomScale: { ref: 1.0, min: 0.8, max: 1.15 },
    // Hard fit rules in screen space (applied after the zoom scale): the scaled panel must never exceed these
    // fractions of the screen; if it would, reduce the scale further (never below minFontPx effective font size).
    fit: { maxWidthFrac: 0.18, maxHeightFrac: 0.13, minFontPx: 10 },
    fadeIn: 0.30, fadeOut: 0.35, safeMargin: 24, pool: 2,
  },

  // NOTE: the street-scene camera is STATIC on the full picture (see introData.js SHOTS[market].camera).
  // There is no cue-based camera scheduler. Every bubble sits on its speaker's head in the full view.

  // Slow, calm delivery. introData.js cues are sized for this pacing (typing <= ~80% of each cue), so no line
  // should need scaling. If one does, report it instead of silently speeding it up.
  pacing: { msPerChar: 55, pauseComma: 200, pauseStop: 400, maxFractionOfCue: 0.88 },
};
