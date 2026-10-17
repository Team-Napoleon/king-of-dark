// KING OF DARK - ACT II (Scene 6 dark village) + ACT III opening (Scene 7 outside the Haunted Corridor).
// Copy to: src/game/config/actTwoData.js
// Source script: "King of Dark: Full Script (Readable English)". Wording = script wording. Times are SECONDS, positions are
// FRACTIONS of the background width/height so the art can be swapped without touching code.
// Read through BeatRunner (Run 3A). Scene class: DarkWorldScene, started with scene.start('DarkWorldScene', { part: 'village' }).

// ---------------------------------------------------------------------------------------------------------------
// ASSETS (copy these files into the project first)
//   public/assets/Backgrounds/outbackground.jpeg   (the uploaded outbackgraound.jpeg, 1344x768)
//   public/assets/Mina/mina_*_sheet.png  (6 sheets from the zip)
// The jpeg has BLACK BARS baked in: real art is y 82..688 (606 px tall). Crop to that area, scale to the game height,
// world width = scaled width (camera follows the hero, bounds = world).
// ---------------------------------------------------------------------------------------------------------------
export const DARKWORLD_BG = {
    key: 'dark-outside', file: 'assets/backgrounds/outbackgraound.jpeg',
    cropY: 82, cropH: 606, srcW: 1344,
    floorFrac: 0.870,          // feet line = cropY-relative fraction of the cropped height (stone path top ~ y 610 of 768)
    archXFrac: 0.500,          // the stone archway = the Haunted Corridor doorway
    archDoorHalfFrac: 0.045,   // half width of the dark opening
    spawnHeroFrac: 0.66,       // scene 6: hero wakes here
    swingXFrac: 0.17,          // scene 6: procedural swing is drawn here (left, near the dead tree)
};

// Mina: 6 sheets, 352x218 frames, 8 columns, 62 frames each, 12 fps, loop. Right sheets face right, left sheets face left.
// Body occupies about x 28..200, y 17..198 of each frame (about 181 px tall including the ghost tail).
export const MINA_SHEETS = {
    frameWidth: 352, frameHeight: 218, columns: 8, frameCount: 62, fps: 12,
    // key -> file
    textures: {
        'mina-float-right': 'assets/mina_float_right_sheet.png', 'mina-float-left': 'assets/mina_float_left_sheet.png',
        'mina-glide-right': 'assets/mina_glide_right_sheet.png', 'mina-glide-left': 'assets/mina_glide_left_sheet.png',
        'mina-guide-right': 'assets/mina_guide_right_sheet.png', 'mina-guide-left': 'assets/mina_guide_left_sheet.png',
    },
    // clips: idle = float (talking default), move = glide (travelling), point = guide (she gestures and spirits drift out)
    clips: { idle: 'float', move: 'glide', point: 'guide' },
    originX: 0.33, originY: 0.91,        // body-centre x, tail-tip y inside the frame (feet line)
    bodyPx: 181,                          // visible body height in the source frame
    heightVsHero: 0.92,                   // Mina's body height = this x hero standing height
    hoverPx: 16,                          // floats this many px above the floor line
    bobPx: 4, bobSeconds: 2.4,            // extra gentle sine bob (from a timer)
    shadow: { alpha: 0.28, widthPx: 70 },
};

// ---------------------------------------------------------------------------------------------------------------
// DELIVERY + SPEAKERS (same bubble style as Act I, WorldBubble)
// anchor 'mina' = above Mina's head (follows her). Add it to WorldBubble as another named anchor (same code path as 'hero').
// ---------------------------------------------------------------------------------------------------------------
export const ACT2_PACING = { msPerChar: 38, pauseComma: 160, pauseStop: 300, hold: 1.0, fadeIn: 0.25, fadeOut: 0.35, gap: 0.25 };
export const ACT2_SPEAKERS = {
    HERO: { color: 0xf5d58a, anchor: 'hero' },
    MINA: { color: 0x6fe0d0, anchor: 'mina' },
};

export const ACT2_FX = {
    title: { text: 'ACT II', sub: 'THE DARK WORLD', color: '#c9b8e8', subColor: '#8f86a8', fadeIn: 1.0, hold: 2.0, fadeOut: 1.0 },
    fadeIn: 1.2,
    // hero wakes: lies on the path (visual rotated -90 deg around the feet), then rises to standing over `seconds` (angle from a timer)
    heroWake: { lieSeconds: 1.4, riseSeconds: 1.1 },
    swing: { swayDegMax: 7, swaySeconds: 2.6, stopSeconds: 0.9, ropePx: 120, seatW: 34, color: 0x3a2c3f, ropeColor: 0x6e5a52 },
    shoes: { dxFromSwing: 14, color: 0x6b4a3a, size: 9 },                    // a small pair of shoes on the ground under the swing
    swingTriggerDx: 110,                                                     // hero within this many px of swingX completes the walk
    minaDrop: { shadowFlicker: 0.7, dropSeconds: 0.55, fromAbovePx: 360, landDust: 8, landShake: { duration: 0.15, intensity: 0.004 },
                landOffsetFromHero: 150, side: 'right' },                    // she lands this far to the hero's right, then both face each other
    minaLeads: { seconds: 2.6, dir: 1, speedPx: 140, fadeOutAfter: 1.4 },    // Mina glides east, hero is released, then fade to scene 7
    objective: { color: '#f5d58a', fontSize: 18, x: 24, y: 24, fadeIn: 0.5, hold: 4.0, fadeOut: 0.8, pulse: 0.6 },
    orbHud: { x: -24, y: 24, total: 5, color: '#b9bbcf', fontSize: 16 },     // top-right "ORBS 0/5", registry orbs[]
    arrowLeft: { text: '<<', color: '#f5d58a', pulseSeconds: 1.0, marginLeft: 40, y: 360 },
    arrowRight: { text: '>>', color: '#f5d58a', pulseSeconds: 1.0, marginRight: 40, y: 360 },
    // scene 7
    sceneStart: { heroXFrac: 0.20, minaDxFromHero: 170 },                    // hero + Mina start left of the arch, facing each other
    doorTriggerBeforeX: 140,                                                 // hero within this many px of the arch centre = enters
    heroWalksIn: { seconds: 1.8, fadeLast: 0.6 },
    darken: { seconds: 1.4 },                                                // screen fades to black (beat "The screen darkens")
    next: 'HauntedCorridorScene',                                            // not built yet: if scene key is missing, go to 'MainMenuScene' and console.warn
};

// ---------------------------------------------------------------------------------------------------------------
// BEATS. Types: title, fx, line, wait, lockControls, arrow, waitForX, objective, faceEachOther, goto
// part 'village' = Scene 6. part 'fearOutside' = Scene 7. Scene 6 ends with goto { part: 'fearOutside' } (scene.restart with data).
// ---------------------------------------------------------------------------------------------------------------
export const ACT2_VILLAGE_BEATS = [
    { id: 'title',   type: 'title' },
    { id: 'fadein',  type: 'fx', name: 'fadeIn' },
    { id: 'wake',    type: 'fx', name: 'heroWake' },
    { id: 'v1', type: 'line', who: 'HERO', text: "I promised I'd be back before sunset." },
    { id: 'arrow',   type: 'arrow', dir: 'left' },                                   // [Gameplay] the player walks to the swing
    { id: 'toswing', type: 'waitForX', x: 'SWING_TRIGGER' },
    { id: 'lock0',   type: 'lockControls', value: true },
    { id: 'stop',    type: 'fx', name: 'swingStops' },                               // the swing stops swaying. Silence.
    { id: 'silence', type: 'wait', seconds: 1.4 },
    { id: 'v2', type: 'line', who: 'HERO', text: "Those are Mother's shoes." },
    { id: 'v3', type: 'line', who: 'HERO', text: 'Mother? ...Mother?' },
    { id: 'quiet',   type: 'wait', seconds: 1.6 },                                  // no answer
    { id: 'v4', type: 'line', who: 'HERO', text: 'What have I done?' },
    { id: 'drop',    type: 'fx', name: 'minaDrop' },                                 // shadow on the rooftop, Mina jumps down beside him
    { id: 'face',    type: 'faceEachOther' },
    { id: 'm1', type: 'line', who: 'MINA', text: "You're alive... Then there may still be a way to stop this." },
    { id: 'v5', type: 'line', who: 'HERO', text: 'Who are you? What happened here?' },
    { id: 'm2', type: 'line', who: 'MINA', text: 'You opened the door, and the dark walked out.' },
    { id: 'v6', type: 'line', who: 'HERO', text: "Then I'll close it." },
    { id: 'm3', type: 'line', who: 'MINA', text: 'Five orbs can seal it. Fear, Time, Life, Souls and Truth.', gesture: 'point' },
    { id: 'v7', type: 'line', who: 'HERO', text: 'Why are you helping me?' },
    { id: 'm4', type: 'line', who: 'MINA', text: "Because I'm tired of watching this world end." },
    { id: 'm5', type: 'line', who: 'MINA', text: "Start with Fear. Take the east road, and don't trust the quiet.", gesture: 'point' },
    { id: 'obj',     type: 'objective', text: 'FIND THE ORB OF FEAR' },
    { id: 'lead',    type: 'fx', name: 'minaLeads' },                               // Mina walks east, hero follows (auto-walk), screen fades
    { id: 'go',      type: 'goto', part: 'fearOutside' },
];

export const ACT2_FEAR_OUTSIDE_BEATS = [
    { id: 'fadein',  type: 'fx', name: 'fadeIn' },
    { id: 'face',    type: 'faceEachOther' },
    { id: 'm1', type: 'line', who: 'MINA', text: 'This is the Haunted Corridor. Something walks it that was never alive.', gesture: 'point' },
    { id: 'h1', type: 'line', who: 'HERO', text: "I've faced a king. A corridor won't stop me." },
    { id: 'm2', type: 'line', who: 'MINA', text: 'The king fought you. This thing will hunt you.' },
    { id: 'm3', type: 'line', who: 'MINA', text: 'When it stands still, it is about to be behind you.' },
    { id: 'obj',     type: 'objective', text: 'ENTER THE HAUNTED CORRIDOR' },
    { id: 'arrow',   type: 'arrow', dir: 'right' },                                  // [Gameplay] the player walks to the doorway
    { id: 'todoor',  type: 'waitForX', x: 'DOOR_TRIGGER' },
    { id: 'lock',    type: 'lockControls', value: true },
    { id: 'enter',   type: 'fx', name: 'heroWalksIn' },                              // hero walks into the arch, picture fades with him
    { id: 'dark',    type: 'fx', name: 'darken' },                                   // the screen darkens
    { id: 'go',      type: 'goto', scene: 'HAUNTED_CORRIDOR' },                      // = ACT2_FX.next (fallback MainMenuScene)
];
