// Intro cutscene: live hero sprite + speech-bubble anchors.
// All coordinates are SOURCE PIXELS of the 1344x768 intro pictures (same space as introData.js).
// Convert with the existing toWorld(x, y). Keys 'intro-2' / 'intro-3' are the texture keys of the pictures
// (intro-1 = far village, intro-2 = street with swing and market stall, intro-3 = temple hill path).

export const INTRO_ACTORS = {
  hero: {
    // Pose: use the SAME standing/idle pose the Player shows (read Player.js, do not edit it), via showFrame().
    byImage: {
      // Street scene: cobblestone path, centre foreground. Painted boy beside him is ~90 px tall, so an adult is ~128 px.
      'intro-2': { feetX: 725, feetY: 664, heightSrc: 128, facing: 'left',  tint: 0xffe2c4, shadow: { alpha: 0.35, widthRatio: 0.55, heightRatio: 0.12 } },
      // Temple hill: on the winding path below the castle gate (path is ~75 px wide here, castle base ~y320).
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
    showName: false,   // no speaker-name heading: just the bubble on the character
    maxWidth: 340, fontSize: 20, padding: 14, tailPx: 12, borderPx: 2,
    panelColor: 0x120f1a, panelAlpha: 0.9, textColor: '#f2ecff',
    fadeIn: 0.30, fadeOut: 0.35, safeMargin: 24, pool: 2,
  },

  // Street scene camera plan (replaces the old shot-2 focus segments; cue times/lines/entry+exit blends unchanged).
  // Frame A holds hero + customer + shopkeeper; frame B holds mother + hero. Focus = source px, zoom = camera zoom.
  // Hero lines keep whichever frame is active (both contain him). Pan only when the speaker group changes
  // between { MOTHER } and { CUSTOMER, SHOPKEEPER }: sine-ease over moveSeconds, arriving no later than
  // arriveAfterCueStart seconds after the new cue starts.
  cameraFrames: {
    'intro-2': {
      A: { x: 905, y: 565, zoom: 2.0 },   // x 570..1240 visible: hero (725), customer (1030), shopkeeper (1085)
      B: { x: 440, y: 590, zoom: 1.8 },   // x 66..813 visible: mother (158) and hero (725)
      moveSeconds: 1.2, arriveAfterCueStart: 0.2, startFrame: 'A',
    },
  },

  // Slow, calm delivery. Per-character reveal times are precomputed per cue; the whole line must finish
  // typing by maxFractionOfCue of the cue length (scale the times down uniformly if it would not).
  pacing: { msPerChar: 52, pauseComma: 160, pauseStop: 320, maxFractionOfCue: 0.75 },
};
