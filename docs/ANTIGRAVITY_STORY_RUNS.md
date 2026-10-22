# Antigravity Story Runs

## Act I, Run 3A — Picture Hero and Shared Story Systems

- Refactored both intro picture shots to use the configured `hero-intro2` image and removed the missing `hero-chibi` load/use.
- Added the sequential `BeatRunner` and pooled, world-anchored `WorldBubble`; added the DEBUG_KEYS-only F10 bubble test in TempleScene.
- Changed files: `src/game/scenes/BootScene.js`, `src/game/scenes/IntroScene.js`, `src/game/scenes/Game.js`, `src/game/ui/SpeechBubble.js`, `src/game/story/BeatRunner.js`, `src/game/ui/WorldBubble.js`.

## Act II, Run 4A — Dark Village and Haunted Corridor Exterior

- Added DarkWorldScene for the village and corridor exterior, including the scripted hero wake, swing, Mina actor/dialogue, objective/orb HUD, movement prompts, and transitions.
- Loaded the Mina spritesheets and animations, registered the scene, and added the `?scene=DarkWorld` development entry point.
- Used the existing generic WorldBubble named-anchor provider for Mina; no WorldBubble change was needed. The DarknessScene does not exist, so Act I transition data was left unchanged.
- Changed files: `src/game/scenes/BootScene.js`, `src/game/main.js`, `src/game/scenes/DarkWorldScene.js`.

## Act I to Act II — Boss Defeat and Darkness Transition

- Replaced the stalled King freeze/expanding-blackout event with the timer-driven `ARENA_DEFEAT` sequence, including King and hero WorldBubble lines, pooled smoke, stagger, swallow, and a guarded DarknessScene start with a master timeout.
- Added DarknessScene narration with delta-driven type/fade timing, Enter skip, a 40-second timeout, and guarded handoff to DarkWorldScene. Set the Act I end-card hold to zero and its next scene to DarkWorldScene.
- Changed files: `src/game/entities/KingOfDark.js`, `src/game/scenes/ArenaScene.js`, `src/game/scenes/DarknessScene.js`, `src/game/main.js`, `src/game/config/actOneData.js`.

## Act III, Run 5A — Haunted Corridor and Fear Finale

- Added the Haunted Corridor chase, Stalker and obstacle entities, Fear orb finale, Scene 9 return, asset loading, scene registration, and development routes.
- Corrected the corridor beat timing to treat BeatRunner deltas as seconds rather than converting them from milliseconds a second time. Removed temporary beat/catch console logging after the browser trace.
- Browser verification reached the opening narration, movement prompt, Stalker appearance, blackout, and chase with no console errors. Full obstacle, shrine/Fear, and Scene 9 completion were not observed; perform the manual checklist before considering the run fully validated.
- Changed files: `src/game/scenes/BootScene.js`, `src/game/main.js`, `src/game/scenes/DarkWorldScene.js`, `src/game/entities/Stalker.js`, `src/game/entities/CorridorObstacle.js`, `src/game/scenes/HauntedCorridorScene.js`.

## Act III, Run 10A — Settlement and Orb of Life Approach

- Added SettlementScene with scaled outside art, camera/floor placement, lighting mask, fire effects, survivors, Mina/hero movement, WorldBubble dialogue, wave retry flow, crawler pooling/combat, hatch reveal, and LifeChamberScene fallback.
- Loaded and registered settlement assets/animations and the scene, added `?scene=Settlement`, `?scene=SettlementWave`, and `?debug=grid`, and replaced DarkWorldScene's after-Fear dialogue data with `AFTER_FEAR_TO_LIFE` plus a Scene 9 fade-in.
- Crawler attacks use the existing hero damage path; required hit mapping: punch/combo = 3 hits, kick = 2, sword = 2, fire = 1.
- Browser verified SettlementWave and the dialogue sequence progressing to the Kid's line. Console had no errors on the tested routes. The full wave completion, hatch exit, Scene 11/menu handoff, and after-Fear transition were not observed live.
- Changed files: `src/game/scenes/BootScene.js`, `src/game/main.js`, `src/game/scenes/DarkWorldScene.js`, `src/game/scenes/SettlementScene.js`, `src/game/entities/Crawler.js`.

## Act III, Run 10B/10C — Life Chamber and After Life

- Completed Scene 14's timer-driven pink Orb of Life sequence, registry-deduplicated collection, HUD pulse/count, wave retry-safe cleanup, and guarded handoff to AfterLifeScene. Added the chamber grid route and debug-only F5 crawler clear.
- Added AfterLifeScene with the full-level settlement fire, darkness lighting, hero emergence, elder/Mina dialogue, orb-count substitution, Truth objective, exit walk, and guarded Scene 16/menu handoff. Registered the scene and `?scene=MinaAfterLife` route.
- Fixed a Crawler lifecycle issue: defeated crawlers were excluded from updates before their death timer could finish, leaving their pool slots permanently occupied. Killed crawlers now remain untargetable while their death animation completes and then reset into the pool.
- The production build passed after each implementation phase. Browser play was not available during this run, so visual placement and runtime transitions remain for manual testing.
- Changed files: `src/game/scenes/LifeChamberScene.js`, `src/game/scenes/AfterLifeScene.js`, `src/game/scenes/BootScene.js`, `src/game/main.js`, `src/game/entities/Crawler.js`.
