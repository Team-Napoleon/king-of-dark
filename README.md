# King of Dark

> *Awaken the temple. Survive the memory.*

**King of Dark** is a 2D dark-fantasy action platformer with a story-driven structure, built with **Phaser 4** and **Vite**. A power-hungry hero enters an ancient temple to take the crown of the King of Dark. He kills the King, and the darkness he releases swallows the world. To undo it, he must collect four orbs, and each one reveals a little more about the cycle he has been caught in.

Built for a hackathon (Nascon26) as a playable game with cutscenes, boss fights, and a branching run of themed chapters.

<img width="998" height="517" alt="image" src="https://github.com/user-attachments/assets/737c9518-788c-42bf-8ea9-c0f0440a5664" />

## Story

The hero hungers for power and climbs into a temple to claim the crown of the King of Dark. He defeats the King, who insists he knows nothing of the throne the hero is chasing. A shadow erupts and consumes the world.

The hero wakes in the corrupted world and meets **Mina**, a mysterious survivor who seems to know more than she says. Together they set out to find four orbs that could undo the damage. Each orb is a trial, and each trial shows the hero something about himself.

| Orb | Trial |
|---|---|
| **Fear** | A haunted corridor and a relentless shadow stalker |
| **Time** | A clock tower and an endless looping room |
| **Life** | A ruined settlement overrun by shadow creatures |
| **Truth** | A buried crown and the final confrontation |

## Features

- **Melee combat** with punches, a combo, kicks, a sword, and a fire attack
- **Shadow curse** that slows and weakens you until you break free by mashing attack keys
- **Boss fight** against the King of Dark, with phases, telegraphed attacks, and a shadow-step strike
- **Story cutscenes** with dialogue boxes, speech bubbles, and letterboxing
- **Multiple chapters** with distinct environments, enemies, and mechanics
- **Atmosphere**: dynamic darkness overlay, drifting fog, embers, animated backgrounds, and pixel-art sprite sheets
- **Handcrafted pixel art** for the hero, the King, Mina, and the monsters

## Controls

| Key | Action |
|---|---|
| `A` / `D` or `←` / `→` | Move |
| `Space` / `↑` | Jump |
| `J` | Punch |
| `K` | Combo |
| `U` | Kick |
| `I` | Sword |
| `O` | Fire |
| `E` | Enter portal / interact |
| `Enter` | Skip cutscene |
| `R` | Restart the current scene |

## Getting started

### Requirements

- [Node.js](https://nodejs.org) (a current LTS release is recommended)

### Install and run

```bash
git clone https://github.com/qasim2k7/king-of-dark.git
cd king-of-dark
npm install
npm run dev-nolog
```

Open <http://localhost:8080> in your browser.

### Build for production

```bash
npm run build-nolog
```

The production build is written to the `dist` folder. Upload the entire contents of `dist` to any static web host to deploy the game.

### Available scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run dev-nolog` | Start the dev server without the template's anonymous usage ping |
| `npm run build` | Create a production build in `dist` |
| `npm run build-nolog` | Create a production build without the usage ping |

> **About `log.js`:** the Phaser Vite template includes a script that sends one anonymous request (template name, dev/prod, Phaser version) to a domain owned by Phaser Studio. Use the `-nolog` scripts to skip it, or delete `log.js` and remove it from the `scripts` section of `package.json`.

## Project structure

```
king-of-dark/
├── index.html
├── public/
│   ├── style.css
│   └── assets/          # sprite sheets, backgrounds, fonts, UI art
├── src/
│   ├── main.js          # bootstrap
│   └── game/
│       ├── main.js      # Phaser config and scene registration
│       ├── config/      # tuning, animation data, story and chapter data
│       ├── scenes/      # one file per scene
│       ├── entities/    # player, enemies, bosses, pickups
│       ├── ui/          # dialogue box, HUD, speech bubbles, menu effects
│       ├── fx/          # darkness overlay
│       └── story/       # cutscene beat runner
├── docs/                # specs and project notes
└── vite/                # Vite dev and production configs
```

### Scene flow

`BootScene` → `MainMenuScene` → `IntroScene` → `TempleScene` → `ArenaScene` → `DarkWorldScene` → `DarknessScene`, followed by the four orb chapters:

- **Fear:** `HauntedCorridorScene`
- **Time:** `ClockTowerScene`, `EndlessRoomScene`, `AfterTimeScene`
- **Life:** `SettlementScene`, `LifeChamberScene`, `AfterLifeScene`
- **Truth:** `TruthOutsideScene`, `TruthCaveScene`

Game tuning (frame timing, sizes, speeds, damage values) is centralized in `src/game/config/animationData.js`.

## Developer tools

When running the dev server, you can jump straight to a scene with a query string, which is handy for testing:

```
http://localhost:8080/?scene=Arena
```

Available shortcuts include `Arena`, `DarkWorld`, `Darkness`, `Corridor`, `CorridorChase`, `Settlement`, `SettlementWave`, `LifeChamber`, `LifeChamberWave`, `MinaAfterLife`, `TruthOutside`, `TruthReveal`, `TruthCave`, and `TruthBoss`.

Debug hotkeys (such as toggling the darkness overlay or showing hitboxes) are controlled by the `DEBUG_KEYS` flag in `src/game/config/animationData.js`. Set it to `false` before publishing a build.

## Tech stack

- [Phaser 4.0.0](https://phaser.io) for rendering, physics (Arcade), input, and audio
- [Vite 6](https://vitejs.dev) for dev server and bundling
- Plain JavaScript (ES modules)
- [Pixelify Sans](https://fonts.google.com/specimen/Pixelify+Sans) for in-game text, with a bundled local fallback

## License

Released under the [MIT License](LICENSE).
