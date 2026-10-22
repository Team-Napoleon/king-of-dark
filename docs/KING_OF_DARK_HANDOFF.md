# KING OF DARK — Handoff for GitHub Copilot

Read this whole file before touching code. It is a summary of everything done so far, the current state of the project, and the rules for continuing.

> **Honesty note.** This was reconstructed from the project chat history and from Copilot's last final report. It is not a fresh inspection of the files. **Inspect the real code before relying on any detail**, especially exact numbers (they live in `src/game/config/animationData.js`).

---

## 0. Paste this first (kickoff message for Copilot Agent mode)

```text
Read docs/HANDOFF.md fully. Then inspect the repo (src/game, public/assets) and confirm back to me, in under 15 lines: the scene list, the entity files, the config file, and anything in the handoff that does not match the real code. Do not change any code yet. After that I will give you tasks one at a time.

Standing rules for every task: targeted edits only, no new dependencies, import from 'phaser' (never the global Phaser namespace), confirm any Phaser API against node_modules/phaser before using it (this is Phaser 4, not 3), run `npm run build-nolog` after each phase, never leave the build broken, and finish by listing the changed files plus a manual test checklist.
```

---

## 1. Project facts

| Item | Value |
|---|---|
| Game | **King of Dark** — 2D dark-fantasy action platformer / story game |
| Engine | Phaser **4.0.0**, plain JavaScript (ES modules) |
| Build | Vite 6 |
| Folder | `E:\nascon26-game\nascon26-game` (always run npm commands from this **inner** folder) |
| Build check | `npm run build-nolog` (the only expected warning is Vite's large-chunk warning) |
| Dev server | `npm run dev-nolog` |
| Resolution | 1280×720, `Scale.FIT`, Arcade physics, gravity y = 1200 |
| Shell | Windows PowerShell. It does **not** accept `&&`. Run commands one per line. |
| Context | Built for a hackathon (Nascon26) with a short deadline. Competition is judged on playable game + a short trailer. |

### Git state (as last known)
- `c94c5b4` — "before big update" (checkpoint before the first big prompt)
- `28f7bb9` — tag `v0.2-boss-fight` (first big pass: enemy AI, shadow overlay, ArenaScene, King boss, intro cutscene, backgrounds)
- The latest work (Phases 0–6 below: new combat, sprite King, 10-monster temple, portal) is **not recorded as committed**. Commit it before starting anything new:
  ```powershell
  cd E:\nascon26-game\nascon26-game
  git add -A
  git commit -m "Phases 0-6: punch combat, shadow curse, 10-monster temple, portal, sprite Dark King"
  git tag v0.3-combat-rework
  ```
- Nothing has been pushed. There is no remote. To work from a friend's machine, either copy the folder (skip `node_modules` and `dist`, then run `npm install`) or push to a **private** GitHub repo and clone it.

---

## 2. Story (needed for any cutscene/dialogue work)

The hero hungers for power and enters an ancient temple to take the crown of the King of Dark. He kills the King, who says he knows nothing of the throne he seeks. A shadow erupts and consumes the world. The hero wakes in a corrupted world, meets **Mina** (a mysterious survivor who knows too much), and must collect **four orbs** to undo it. Each orb reveals he is repeating the cycle. He finally becomes the next King of Dark and fights his younger self (the "past hero"). Two endings (A first, B only if time).

Orbs and their missions:
1. **Fear** — Haunted Corridor, shadow stalker chase.
2. **Time** — Endless Room, three-door looping puzzle.
3. **Life** — Ruined Settlement, defeat 2–3 shadow creatures.
4. **Truth** — Buried Crown, face the Many Remembered and the truth of the cycle.

Tone rules: Mina speaks short and cryptic. The King speaks short and weary. Keep the loop twist unexplained until late.

---

## 3. Architecture

```
public/assets/
  Hero/            hero-walk/run/jump sheets, hero-punch.png, charcoal-cloak.png   (capital H!)
  King/            king-idle/walk/run/sword/tendril/void .png
  backgrounds/     menu.jpg, temple.jpg, arena.jpg   (1344x768 each)
src/
  main.js          waits for DOM, calls StartGame once
  game/
    main.js        Phaser config + scene registration
    config/animationData.js   SOURCE OF TRUTH for sheet sizes, frame timing, anchors, all tuning
    scenes/        BootScene, MainMenuScene, Game.js (class TempleScene), ArenaScene
    entities/      Player.js, Enemy.js, HealthOrb.js, KingOfDark.js
    ui/            DialogueBox.js, Letterbox.js, PlayerHud.js
    fx/            DarknessOverlay.js
docs/PROJECT_MAP.md
```

- **Scene keys:** `BootScene` → `MainMenuScene` → `TempleScene` (file `Game.js`) → `ArenaScene`.
- **Registry flags:** `reachedArena`, `bossIntroSeen`, `bossDefeated` (reset when PLAY is pressed).
- **Asset loading** all happens in `BootScene.preload`, using `preloadSheets(this)` from `animationData.js`. Texture keys: `hero-walk`, `hero-run`, `hero-jump`, `hero-punch`, `king-idle`, `king-walk`, `king-run`, `king-sword`, `king-tendril`, `king-void`, `bg-menu`, `bg-temple`, `bg-arena`.
- **Backgrounds:** temple uses a mirrored 2688×768 canvas texture as a parallax tileSprite; menu and arena are cover-scaled.
- **Darkness:** `DarknessOverlay` is a radial-gradient mask following the hero (flickering), plus drifting fog. Things the player must read (enemy eyes, telegraphs, markers) draw above it at depth 52. HUD is depth 100+.

### Critical design patterns (do not break these)
1. **Carrier + visual split.** For the hero, enemies and the King, a *physics carrier* (invisible Rectangle with the body) is separate from a *visual* Sprite/Graphics. `player.sprite` is the carrier. Camera follow, enemy AI and the overlay all use `player.sprite.x/y`. Never flip, tint, scale or tween the carrier.
2. **Never tween the hero's or King's visual scale, alpha or flip** for gameplay feedback. Blinks and flashes are computed from timers inside `update()`. Stacked tweens were the cause of the "hero disappears when pressing J" bug.
3. **Frame-driven animation.** Hero and King clips are not Phaser animations. They are driven by `frameAt()` and `showFrame()` from `animationData.js`, using delta-time accumulators. The hero art natively faces left, and `showFrame` handles flip and the mirrored anchor.
4. **Shapes have no tint methods** (Rectangle/Ellipse). Flash with `setFillStyle` and restore only if the object is still active.
5. **No allocation in `update()`.** No objects, textures, tweens or colliders created per frame. Hit sparks, "+15" text and curse bursts come from small pools made in `create()`.
6. **Guard every callback** with `if (!obj || !obj.active) return`, and clean up pools, timers and overlays on the scene's `shutdown` so pressing R never stacks effects.

---

## 4. Current gameplay (what exists now)

### Controls
| Key | Action |
|---|---|
| A / D or arrows | Move |
| Space / Up | Jump |
| **J** | Left punch |
| **L** | Right punch |
| **K** | Combo (right punch, then left punch) |
| **E** | Enter the portal |
| R | Restart (temple, or arena) |
| F2 | Toggle darkness overlay (debug) |
| F3 | Debug hitboxes + anchor dots |
| F4 | Spawn next monster (temple) |
| F5 | Set kills to 10 and unlock portal (temple) |
| F6 | Teleport hero to x = 5300 (temple) |
| F7 / F8 | Boss HP to 101 / 1 (arena) |

Debug keys are gated by `DEBUG_KEYS` in `animationData.js`. **Set it to `false` before submitting.** Note: Copilot's embedded browser could not test F5/F6 because the browser reserves them. If you hit this in a real browser, rebind to other keys.

### Hero
- Carrier: scale 0.72, origin 0.5/0.7, body 34×52, offset 60,88. 100 HP, 1.0 s invulnerability after a hit.
- Attacks are timer-driven state machines (`attack = { move, stepIndex, t, hitSet }`). Damage lands only in the impact frames, once per target per step. Recovery cancel and a 0.25 s input buffer are implemented. Movement speed ×0.4 while attacking.
- `takeDamage(amount, fromX, knockback)`, `heal(amount)` (clamped), `controlsLocked` (used by cutscenes).
- The punch art is about 3× the pixel size of the run art, so it is scaled down to match.

### Shadow curse (the small monsters' main power)
Imps cast a telegraphed curse. While shadowed the hero's power and speed are reduced (`SHADOW.damageMult`, `SHADOW.speedMult`). Mashing J/K/L fills a break meter (`SHADOW.breakThreshold`, `breakPerPress`, `breakDecayPerSec`). Hitting an imp during its telegraph interrupts the cast. The HUD shows "SHADOWED - MASH J / K / L" with a meter.

### Temple (`TempleScene`)
- 6600 px wide, flat floor top at y = 660. **All floating platforms were removed.**
- **10 monsters** in sequence (types `imp` and `brute`), max 2 alive at once, spawned ahead of the hero as he advances (`TEMPLE_WAVE`). They materialize (untargetable fade-in), chase, telegraph a melee hit, then damage only if the hero is still in range. No touch damage. Brutes never cast.
- Monsters are currently **drawn with Graphics** (placeholder art, replaceable by sprites). Final monster sprites are still being generated.
- Health orbs drop from monsters (+15 HP). They have **no physics body**; pickup is a distance check; they bob visually only.
- HUD shows "SHADOWS SLAIN n/10".
- **Portal** sits at `PORTAL.x`. It is sealed until 10 kills. A fixed-screen WARNING banner appears when near ("THE DARK KING AWAITS BEYOND THIS PORTAL / Heal up. There is no way back."), or a sealed message while locked. Entry needs **E**. The transition is timer-driven (walk in, fade, zoom 1.3, fadeOut) and starts `ArenaScene` exactly once.

### Arena (`ArenaScene`) and the Dark King
- Fixed 1280×720 screen, floor top y = 630, invisible walls at x = 70 and x = 1210, hero spawns at x ≈ 260, throne about (645, 340), dais about (640, 430).
- **Intro cutscene** (plays once per session, Enter skips, controls locked): letterbox + camera zoom 1.15, King: "You came for power." / Hero: "I came to end you." / King: "Everyone says that. Come then." Then violet eye flash, shake, bars out, the King starts with the sword strike.
- **King of Dark** uses the supplied sprite art. 200 HP, boss bar at top-centre.
  - **Sword = Shadow Step strike:** violet floor marker, becomes untargetable, teleports behind the hero at `teleportFrame`, then strikes. 5 s cooldown.
  - **Tendril:** red ring on the floor (radius 150), jumping does not avoid it.
  - **Void:** growing violet ring (radius up to 180).
  - Picks attacks by distance and weights, never repeats the same attack if another is available, approaches when far (walk/run sheets).
  - Full damage taken only while vulnerable (idle or recovery frames); otherwise `KING.chipDamage`.
  - **Phase 2** at `KING.phase2At` (about 100 HP): shake, darker overlay, faster speed.
  - **Death:** freeze 0.4 s, white flash and shake, expanding black circle, then "THE DARKNESS SPREADS..." and `bossDefeated = true`. **The game currently stops there.**
- R in the arena restarts the arena and skips the intro.

---

## 5. History (what was done, in order)

**Stage 1: early prototype (before the big prompts)**
- Started from the default Phaser/Vite template. Copilot built the menu, temple scene, box-character hero, jump tuning, health HUD, an enemy and a restart flow.
- Fixed a crash from using the global `Phaser.Math.Clamp` instead of the ES import.
- Fixed the Play button using scene-level pointer input.
- **Freeze bug root cause:** the enemy was a Rectangle, and `setTint` does not exist on Shapes, so pressing J near it threw an error that stopped the game loop.
- Fixed reversed facing (art natively faces left, flip condition inverted) and swapped hero sheet keys (idle/run/walk loaded the wrong files).

**Stage 2: first big one-go pass** (7 phases: assets and scenes, backgrounds, temple enemies, shadow atmosphere, boss gate and `ArenaScene` and a shape-based King, dialogue + intro cutscene, boss death). Result: committed as `28f7bb9`. Backgrounds were generated in Leonardo AI at 1344×768 to match the temple art.

**Stage 3: tester feedback.** Six issues were reported after playing:
1. Health orbs bounced on top of the hero instead of being collected.
2. Pressing J made the hero vanish, and mashing J glitched.
3. Remove jumping obstacles from the temple.
4. Monsters were boring and weak. They need a shadow-casting power that reduces the hero's strength, and the hero must press J repeatedly to break it. Multiple monsters, moderate difficulty, slightly faster.
5. Portal entry was not smooth. Needs a warning banner about the Dark King.
6. Exactly 10 monsters in the temple, arriving one after another.

New assets were supplied: hero combat sheets (left punch, right punch, combo), Dark King animations (idle, walk, run, sword, tendril, void). GIFs were converted to spritesheets with measured feet anchors, and `animationData.js` was created.

**Stage 4: second big one-go pass** (Phases 0–6 in the order: assets, hero visual and combat, health orbs, temple cleanup and monsters, portal, sprite Dark King, debug tools and self-review). **Copilot reported all phases complete**, `npm run build-nolog` passing after each phase and on the final tree. Its final code-review checklist was all pass. Late fixes it made: reset of pooled enemy state on reuse, removal of enemy-vs-wall colliders (monsters collide with the floor only), and the portal fade event ordering (arena starts once, after the final fade).

---

## 6. Verification status

**Verified by Copilot (code review + build):** build passes; menu to temple loads without console errors; F3/F4 work; no leftover retired code (old attack code, platforms, global `Phaser`); no tweens on hero/King visuals.

**NOT verified, needs a manual playthrough:**
- Portal to arena to boss sequence end to end.
- F5/F6 debug keys (browser-reserved in Copilot's embedded browser).
- Full boss combat, phase 2, and boss death.
- Restarting with R several times without stacking effects.
- Feet alignment when facing right (press F3; the white anchor dot must sit between the feet in idle, run, jump and both punches, both facings). If the figure shifts on turn, the fix is a one-line anchor change in `animationData.js`.

The owner has said they will send **more change requests after testing**. Do not start new features until they do.

---

## 7. Planned next work (not started)

Priority order, with the tech each needs. Full scene and mission designs are in the owner's two docs (*Scenes for game to make it more interesting*, *Scenes or missions for getting orbs*).

1. **Cutscene system.** Build a reusable `CutsceneManager`: takes a list of steps `{ image, camera move (zoom/pan), lines, sfx, shake, fade }`. Illustrated stills (1344×768 from Leonardo) with slow Ken Burns motion, letterbox, Enter to skip, plays once. Reuses `DialogueBox` and `Letterbox`.
2. **`DialogueBox` portraits.** Add a portrait (about 180 px) on the left, speaker name, and typewriter text. Used for Mina, survivors, the King, the past hero.
3. **Opening cinematic** (3 stills, about 25 s) and the **King's last words + shadow engulfs the temple** scene after the boss dies. Then a `DarknessScene` transition.
4. **Corrupted world** scene (Familiar Street), Mina's introduction, and a shared `gameProgress` state: `{ fear, time, life, truth: false, currentObjective: 0 }`.
5. **One reusable orb-mission system**, with a different encounter per orb (chase, door puzzle, enemy wave, memory boss). Reusable **orb-acquired sequence** (about 6 s): freeze, orb floats to the hero, coloured flash, title card "ORB OF X — n/4", then Mina's line.
6. Mirror foreshadow scene, transformation into King, past-hero portal scene, final fight (player is the King vs. past hero AI), endings A/B.
7. Sprite art for temple monsters (currently Graphics placeholders) and audio.

Orb colours: Fear violet, Time blue, Life pink, Truth crimson.

**Art pipeline:** Leonardo AI (Lucid Origin), 1344×768 for backgrounds and cutscene stills, 1024×1024 portraits on plain dark backgrounds, style/character reference images for consistency. No text inside generated images; all text is drawn in Phaser. Palette: deep navy shadows, near-black stone with pale blue rim light, amber torchlight as the only warm colour, violet for the King's power.

**Audio (free sources):** jsfxr, Kenney.nl (CC0), Freesound (CC0 filter), Pixabay Music, OpenGameArt, incompetech (credit required). Credit anything that needs it.

---

## 8. Working agreement for any new task

- Inspect the real files first. Do not re-create files that already exist.
- Targeted edits; keep behaviour that already works.
- One system per prompt where possible. Run `npm run build-nolog` after each phase.
- If you run out of room, finish the current phase cleanly and say exactly which phase you reached. The owner will say "Continue from Phase N."
- Anything touching hero or King feedback follows pattern #2 above (timers, never tweens on the visual).
- Do not change the sheet numbers in `animationData.js`; add new tuning values next to them.
- Final reply format: changed/new files, what you could not verify, and a manual test checklist.
