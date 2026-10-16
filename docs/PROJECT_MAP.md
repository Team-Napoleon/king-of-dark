# King of Dark — Project Map

## Folder structure

- `index.html` — loads the Vite entry point and mounts the Phaser canvas into the page.
- `src/main.js` — app bootstrap that creates the Phaser game instance after the DOM is ready.
- `src/game/main.js` — central game configuration and scene registration.
- `src/game/scenes/BootScene.js` — startup scene that transitions immediately to the main menu.
- `src/game/scenes/MainMenuScene.js` — dark-fantasy title screen with the Play button.
- `src/game/scenes/Game.js` — playable temple test environment used as the Phase 1 prototype scene.
- `src/game/entities/Player.js` — reusable player state and input controller.
- `public/style.css` — global page styling and canvas framing.
- `public/assets/` — future art, music, fonts, and UI assets.

## Startup flow

The app bootstraps in `src/main.js` by waiting for `DOMContentLoaded`, then calling the game factory in `src/game/main.js`. That file creates a single Phaser game instance with a 1280x720 viewport and registers the scene flow: `BootScene -> MainMenuScene -> TempleScene`.

## Scene registration

The current scene registry lives in `src/game/main.js` and includes:

- `BootScene` for initial setup and quick transition
- `MainMenuScene` for the title and Play button
- `TempleScene` (via `Game.js`) for the prototype platforming test

This keeps the game start explicit and prevents multiple game instance registrations.

## Player behavior

The player controller is isolated in `src/game/entities/Player.js`. It handles:

- left/right movement with `A/D` and arrow keys
- jump checks with `Space` and `Up`
- one-jump-only behavior while grounded
- facing direction flips when moving left or right
- collision-ready physics body setup for future combat and enemy hooks

## Assets and future work

The repository is intentionally lightweight for Phase 1. Future art, sound, and scripting assets should be placed under `public/assets/` while gameplay systems still remain in `src/game/`.

## Run the game

```bash
npm install
npm run dev
```

Then open the local Vite URL shown in the terminal, defaulting to http://localhost:8080.

## Implemented vs. future

Implemented for Phase 1:

- startup flow
- title menu and Play button
- temple prototype level
- player controller with platforming
- keyboard restart shortcut
- dark-fantasy visual style

Future work:

- enemy AI and boss encounters
- health/combat systems
- collectibles and transformation sequence
- dialogue, sound, animation, and end states
