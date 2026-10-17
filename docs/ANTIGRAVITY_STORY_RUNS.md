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
