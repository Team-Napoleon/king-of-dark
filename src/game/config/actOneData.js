// KING OF DARK - ACT I (Scenes 2-5) script + timing data. Single source of truth for Act I.
// Copy to: src/game/config/actOneData.js
// Source script: "King of Dark: Full Script (Readable English)". Wording below is the script's wording: do not edit text in code.
// The scenes read this file through a small BeatRunner (see the Antigravity prompts). Times are SECONDS.

// ---------------------------------------------------------------------------------------------------------------
// DELIVERY (gameplay + boss + narration). Typing time of a line = chars * msPerChar + comma/stop pauses.
// The bubble stays fully visible for `hold` seconds after typing ends, then fades out (fadeOut), then `gap` passes
// before the next beat. The intro cutscene keeps its own pacing in introActors.js.
// ---------------------------------------------------------------------------------------------------------------
export const ACT1_PACING = {
    msPerChar: 38, pauseComma: 160, pauseStop: 300,
    hold: 0.9, fadeIn: 0.25, fadeOut: 0.35, gap: 0.2,
};

// Who speaks and where the bubble sits.
//  anchor 'hero'  : above the hero's head (follows him)       anchor 'king' : above the Dark King's head (follows him)
//  anchor 'voice' : no body. Centered near the top of the screen (voiceY), no tail, italic violet text, soft glow.
export const ACT1_SPEAKERS = {
    HERO:        { color: 0xf5d58a, anchor: 'hero' },
    KING:        { color: 0xb48cff, anchor: 'king' },
    KING_VOICE:  { color: 0xb48cff, anchor: 'voice', style: 'voice' },
    NARRATOR:    { color: 0xb9bbcf, anchor: 'screen' },
};
export const VOICE_STYLE = { y: 150, maxWidth: 420, fontStyle: 'italic', textColor: '#d9c8ff', glowColor: 0x7a3cff, panel: false };

// ---------------------------------------------------------------------------------------------------------------
// SCENE 2 + 3 : TEMPLE CORRIDOR AND GATE (TempleScene)
// Beat types: line, wait, fx, inscription, wave, arrow, waitForX, lockControls, goto
// A `line` never blocks the player's movement unless the previous beat locked controls.
// ---------------------------------------------------------------------------------------------------------------
export const WAVES = {
    wave1: { count: 4, mods: { hpMult: 1.0, speedMult: 1.0, biteDamageAdd: 0 } },
    // "the second, tougher wave": the remaining 6 of the existing 10, stronger and faster, brutes allowed.
    wave2: { count: 6, mods: { hpMult: 1.4, speedMult: 1.1, biteDamageAdd: 2 } },
};

export const TEMPLE_FX = {
    fadeIn: 0.8,
    doorsSlam: { shake: { duration: 0.4, intensity: 0.012 }, dustCount: 14, flash: 0.15 },
    inscription: { text: 'HE WHO SEEKS THE CROWN SHALL INHERIT ITS CURSE', y: 170, fadeIn: 0.7, hold: 2.4, fadeOut: 0.8, color: '#c9b8e8', glow: 0x6a3cff },
    torchesPurple: { duration: 1.8, tint: 0x7a3cff, alpha: 0.28, shake: { duration: 0.25, intensity: 0.004 } },
    eyesRed: { duration: 0.5, color: 0xff2a2a, radius: 5, atLineOffset: 1.0 },       // relative to the start of the line it is attached to
    arrow: { text: '>>', color: '#f5d58a', pulseSeconds: 1.0, marginRight: 40, y: 360 },
    gate: { openSeconds: 2.4, glowColor: 0x8a4cff, slamShake: { duration: 0.45, intensity: 0.014 }, walkInSeconds: 2.0, triggerBeforeX: 420 },
    toArena: { fadeOut: 0.6 },
};

export const TEMPLE_BEATS = [
    // --- SCENE 2: TEMPLE CORRIDOR --------------------------------------------------------------------------------
    { id: 'fadein',   type: 'fx',   name: 'fadeIn' },
    { id: 'slam',     type: 'fx',   name: 'doorsSlam' },
    { id: 't1', type: 'line', who: 'HERO', text: 'The doors sealed behind me. Good. No turning back.' },
    { id: 'ins',      type: 'inscription' },
    { id: 't2', type: 'line', who: 'HERO', text: 'Curses are for the weak. I came for the crown.' },
    { id: 't3', type: 'line', who: 'HERO', text: 'Whatever power is hidden here, it will be mine.' },      // (he grips his sword)
    { id: 'w1',       type: 'wave', wave: 'wave1' },                                                  // [Gameplay] first wave
    { id: 't4', type: 'line', who: 'HERO', text: 'Is that all this place has to throw at me?' },
    { id: 'purple',   type: 'fx',   name: 'torchesPurple' },                                          // torches flare purple, a whisper rises
    { id: 'k1', type: 'line', who: 'KING_VOICE', text: 'You are not the first to walk this hall.' },
    { id: 't5', type: 'line', who: 'HERO', text: 'Then I will be the last.' },
    { id: 'w2',       type: 'wave', wave: 'wave2' },                                                  // [Gameplay] second, tougher wave
    { id: 't6', type: 'line', who: 'HERO', text: 'The deeper I go, the stronger I feel.' },
    { id: 'k2', type: 'line', who: 'KING_VOICE', text: 'That is not strength. That is hunger.' },
    { id: 't7', type: 'line', who: 'HERO', text: "Then let it feed. I won't stop.", fx: 'eyesRed' },
    { id: 'arrow',    type: 'arrow' },                                                                 // arrow points right: corridor opens to the gate
    { id: 'walk',     type: 'waitForX', x: 'GATE_TRIGGER' },                                           // player walks to the gate (gate.x - triggerBeforeX)
    // --- SCENE 3: TEMPLE GATE --------------------------------------------------------------------------------
    { id: 'lock',     type: 'lockControls', value: true },
    { id: 'g1', type: 'line', who: 'HERO', text: 'The throne room. Everything I want is behind this door.' },
    { id: 'open',     type: 'fx',   name: 'gateOpen' },                                                 // doors open slowly, purple light spills out
    { id: 'k3', type: 'line', who: 'KING_VOICE', text: 'Another thief, come for what he cannot hold.' },
    { id: 'g2', type: 'line', who: 'HERO', text: "I'm no thief. I take what the strong deserve." },
    { id: 'in',       type: 'fx',   name: 'heroWalksIn' },
    { id: 'shut',     type: 'fx',   name: 'gateSlam' },                                                 // the gate slams shut behind him
    { id: 'go',       type: 'goto', scene: 'ArenaScene' },
];

// ---------------------------------------------------------------------------------------------------------------
// SCENE 4 : THE KING OF DARK (ArenaScene)
// ---------------------------------------------------------------------------------------------------------------
export const ARENA_FX = {
    lightning: { flashes: [0.5, 1.2], flashDuration: 0.12, color: 0xffffff, shake: { duration: 0.2, intensity: 0.006 } },
    silhouetteTint: 0x07040d,                  // King shown as a flat black silhouette until the reveal
    letterbox: { in: 0.5, out: 0.5 },
    reveal: { eyeFlash: 0.5, shake: { duration: 0.3, intensity: 0.01 }, total: 0.9 },
    linesStartAt: 1.3,                         // seconds after the scene fades in: lightning, silhouette, then the first line
};

export const ARENA_INTRO_LINES = [
    { who: 'HERO', text: 'Power belongs to whoever is strong enough to take it.' },
    { who: 'KING', text: 'Strong enough to take it. Never strong enough to keep it.' },
    { who: 'KING', text: 'Tell me, what do you think waits on this throne?' },
    { who: 'HERO', text: 'A kingdom. A crown. A world on its knees.' },
    { who: 'KING', text: 'A cage, little thief, with a crown on it.' },
    { who: 'HERO', text: 'Then I will wear it.' },
];
// Arena intro uses a FASTER delivery than the gameplay pacing above (boss tension), skippable with Enter, plays once per run.
export const ARENA_INTRO_PACING = { msPerChar: 24, pauseComma: 90, pauseStop: 150, hold: 0.35, fadeIn: 0.15, fadeOut: 0.2, gap: 0.05 };

// Four phases. Phase breaks happen when the King's health fraction first drops to atHpFrac:
// the King stops attacking and cannot be hurt while the lines play (about 2-5 s), the hero keeps full control,
// then the next phase starts with a short shake/flash and the multipliers below (applied on top of the existing King data).
export const ARENA_PHASES = [
    { phase: 2, atHpFrac: 0.75, speedMult: 1.08, cooldownMult: 0.92,
      lines: [{ who: 'KING', text: 'You fight well. So did the last one.' }] },
    { phase: 3, atHpFrac: 0.50, speedMult: 1.16, cooldownMult: 0.85, darker: true,
      lines: [{ who: 'KING', text: 'Every challenger swears he is different.' }, { who: 'HERO', text: 'I am.' }] },
    { phase: 4, atHpFrac: 0.25, speedMult: 1.28, cooldownMult: 0.75, darker: true,
      lines: [{ who: 'KING', text: 'Look at your hands. You already hunger for the crown.' }, { who: 'HERO', text: 'Then give it to me!' }] },
];

// The King falls: he kneels, black smoke erupts and floods toward the hero, the hero staggers (shadow seeps into his hands),
// the smoke swallows the screen, fade to black, then DarknessScene.
export const ARENA_DEFEAT = {
    kneel: { seconds: 1.0, dropPx: 26 },                                                    // computed from a timer, not a tween
    kingLine: { who: 'KING', text: 'You know nothing of the throne you seek...' },
    smoke: { erupt: 2.2, puffCount: 36, floodSeconds: 2.4, color: 0x0a0612, glow: 0x5a2cc0 },
    heroStagger: { seconds: 1.6, swayPx: 6, tintTo: 0x2a1a44 },                              // hero tint darkens as the shadow seeps in
    heroLine: { who: 'HERO', text: 'What... what is happening?' },
    swallow: { seconds: 2.0 },                                                              // full-screen black
    holdBlack: 0.8,
    next: 'DarknessScene',
};

// ---------------------------------------------------------------------------------------------------------------
// SCENE 5 : DARKNESS SPREADS (DarknessScene, black screen, narration only)
// ---------------------------------------------------------------------------------------------------------------
export const DARKNESS_SCENE = {
    pacing: { msPerChar: 60, pauseComma: 250, pauseStop: 500, hold: 1.8, fadeIn: 0.8, fadeOut: 0.9, gap: 0.6 },
    lines: [
        { who: 'NARRATOR', text: 'The king fell. The darkness he guarded did not.' },
        { who: 'NARRATOR', text: 'And the world forgot the light.' },
    ],
    textColor: '#b9bbcf', fontSize: 26, y: 360,
    endCard: { text: 'END OF ACT I', sub: 'The dark world awaits...', hold: 0, fadeIn: 1.0, fadeOut: 1.0 },
    next: 'DarkWorldScene',
    registryFlag: 'actIComplete',
};
