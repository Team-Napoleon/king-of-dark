// KING OF DARK: ORB OF LIFE, finishing Scene 13 and adding Scenes 14 and 15. DATA ONLY: no Phaser imports.
// Copy to: src/game/config/lifeAfterData.js   (lifeData.js stays exactly as it is.)
// Script numbering: Scene 13 = SettlementScene (built), Scene 14 = LifeChamberScene, Scene 15 = AfterLifeScene.
// Art space = 960x540 px, same as lifeData.js (multiply by the scene's bgScale). Text is the user's script: edit it here, never in code.
// OBSOLETE in lifeData.js (do not use, do not delete the exports): LIFE_ORDER_NOTE and AFTER_FEAR_TO_LIFE. Scene 9 now goes to ClockTowerScene.

export const LIFE_FLOW = {
  settlement: 'SettlementScene',     // Scene 13 (built)
  chamber:    'LifeChamberScene',    // Scene 14 (CHAMBER_BEATS in lifeData.js)
  after:      'AfterLifeScene',      // Scene 15 (AFTER_LIFE_BEATS below)
  next:       'SoulsOutsideScene',   // Scene 16 (built later). If it is not registered: console.warn, then start MainMenuScene.
  nextFallback: 'MainMenuScene',
  orbId: 'life',                     // pushed ONCE into registry 'orbs'. Order now: fear, time, life.
  expectedOrbCountAfterLife: 3,      // the ORBS HUD must read 3/5 (always derive it from the registry, never use this as a constant in code)
  objectiveSouls: 'FIND THE ORB OF SOULS',
  devRoutes: { LifeChamber: 'LifeChamberScene', LifeChamberWave: 'LifeChamberScene', MinaAfterLife: 'AfterLifeScene' },  // ?scene=...
};

// Scene 15: outside the settlement, same picture as Scene 13 (life-outside-bg), static layout, fire at full level.
// Hero comes back up out of the fire pit, the elder thanks him, Mina points to Souls.
export const AFTER_LIFE = {
  bg: 'life-outside-bg',
  floorFeetY: 392,                      // same feet line as SETTLEMENT
  fire: { x: 598, baseY: 330, level: 1.0 },   // reuse the Scene 13 fire drawing, held at full level (no kills, no hatch)
  heroEmergeFromX: 598,                 // hero appears at the fire (fades in 0.6 s) then walks to heroX over 1.0 s
  heroX: 520, minaX: 650, elderX: 400,  // elder is the existing NPC elder (stands, faces right toward the hero)
  heroEmerge: { fadeInSeconds: 0.6, walkSeconds: 1.0 },
  kid: { x: 705, pose: 'cheer' },       // optional dressing: kid and hooded stay on screen, idle
  hooded: { x: 760 },
  exitX: 1020,                          // Mina walks east off screen, the hero follows
  exitWalkSeconds: 2.4,
  fadeIn: 1.0, fadeOut: 0.8,
  darkness: { ambientAlpha: 0.30, heroLightRadiusH: 1.6, fireLightRadiusH: 3.0 },
};

export const AFTER_LIFE_SCENE_BEATS = [   // same shape as lifeData.js beats (t: line | fx | goto). {COUNT} = COUNT_WORD[orbs.length] -> "Three"
  { t: 'fx', name: 'fadeIn', seconds: 1.0 },
  { t: 'fx', name: 'heroEmergesFromFire' },
  { t: 'line', who: 'ELDER', text: 'Take it with our thanks. May it outlive us.' },
  { t: 'line', who: 'MINA', text: "{COUNT}. You're closer than you think." },
  { t: 'line', who: 'HERO', text: 'Closer to the end, or to what I did?' },
  { t: 'line', who: 'MINA', text: 'Both. Souls is next. Follow the road to the graveyard gate.' },
  { t: 'fx', name: 'objective', text: 'FIND THE ORB OF SOULS' },
  { t: 'fx', name: 'minaWalksEastHeroFollows' },
  { t: 'fx', name: 'fadeOut', seconds: 0.8 },
  { t: 'goto', scene: 'SoulsOutsideScene' },
];
