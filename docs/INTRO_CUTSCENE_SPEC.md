# INTRO CUTSCENE SPEC (first cutscene, about 30 seconds)

Single source of truth for the game intro. All timings, lines, coordinates and effect settings live in
`src/game/config/introData.js`. This spec explains how they fit together. If this spec and the old
`ANTIGRAVITY_STORY_RUNS.md` / `src/game/config/storyData.js` disagree, THIS SPEC WINS for the intro.
Do not delete the old files and do not import `storyData.js` from the intro.

## 1. Scope and rules for the implementer
- Engine: Phaser 4 + Vite (existing project). Confirm any Phaser API against `node_modules/phaser` before using it.
- Allowed changes: add `src/game/scenes/IntroScene.js`; register it in `src/game/main.js`; preload the intro
  images (and optional audio) in `BootScene`; change the PLAY button in `MainMenuScene` to start `IntroScene`;
  small additive methods in `ui/DialogueBox.js` (for timed single lines) if needed.
- Do NOT touch: `Player.js`, `Enemy.js`, `KingOfDark.js`, `Game.js` (TempleScene) gameplay, `ArenaScene.js`,
  `animationData.js`, the darkness overlay, or the HUD.
- No new dependencies. No objects/tweens created every frame in `update()`. Clean up everything on scene `shutdown`.
- The intro must run with NO audio files present (silent) and with NO errors in the console.

## 2. Flow
`MainMenuScene (PLAY)` -> `IntroScene` (30 s, skippable) -> black -> `TempleScene` (player gets control).
Set registry `introSeen = true` when the intro ends or is skipped. R inside the temple restarts the temple only,
never the intro.

## 3. Pictures (all 1344x768, loaded as images)
| Key | File | Shot |
| --- | --- | --- |
| intro-1 | assets/intro/intro-1-village.jpg | far aerial village, temple on the hill, sunset |
| intro-2 | assets/intro/intro-2-market.jpg | close-up: swing and tree on the left (mother seated on the swing, hero standing beside it), market stall on the right (customer in the red vest, shopkeeper behind the counter), temple and smoke behind |
| intro-3 | assets/intro/intro-3-temple.jpg | grassy hill with a path leading up to the dark temple |

Placement: each picture sits at world (0,0) scaled by `IMG_SCALE` (1280/1344) so it fills the 1280x720 view.
Camera bounds = `WORLD` (1280 x 731). Camera focus points in `introData.js` are in SOURCE image pixels;
convert with `toWorld(x, y)`. Zoom near an edge is clamped by the bounds, which is intended.

## 4. Timeline (master clock in seconds)
| Time | Shot | What happens |
| --- | --- | --- |
| 0.0 - 6.3 | 1 village | Fade in from black (0.9 s). Slow zoom 1.0 -> 1.18 toward the village. Narration 0.9-5.7. |
| 6.0 - 21.3 | 2 market | Crossfade in (0.6 s). Camera on the stall (zoom 1.3) for the customer and shopkeeper lines, pans left to the swing at 11.0-12.4, then slow push-in to 1.5. Six dialogue lines (customer, shopkeeper, hero, mother, hero, hero). Swing sways from the start and keeps swaying. |
| 21.0 - 30.0 | 3 temple | Crossfade in. Slow push-in toward the temple. Hero line, shadow creeps up the path, crown flash at 24.0, hero line, fade to black 28.2-29.4, hold black to 30.0, then hand off to TempleScene. |

Letterbox bars (existing `Letterbox` helper, 90 px) slide in during the first 0.6 s and stay until the end.
Dialogue uses the existing `DialogueBox` look (bottom panel, typewriter, speaker name in the speaker's color),
but cues are scheduled by ABSOLUTE time from `DIALOGUE`, not by a chained `hold`. If typing is unfinished at a
cue's `end`, complete the text instantly and hide the box.

## 5. Effects (all procedural, no extra art)
1. Swing sway: crop the swing group from `intro-2` (rect in `EFFECTS.swing.crop`), place it exactly over the same
   pixels, set its origin to the pivot (top of the ropes) and rotate it with a sine of amplitude 1.4 degrees,
   period 3.2 s. After the last market line (20.5) increase to 2.2 degrees and keep swaying until the intro ends.
   Drive the angle from the clock (no stacked tweens).
2. Lantern sway (optional ambience): same technique, `EFFECTS.lantern`.
3. Hero eyes (greed cue): at 17.55 for 0.4 s two small red additive circles over the hero's eyes (`heroEyes`).
4. Tension push: during the hero's quiet line (11.4-13.7) add a small extra zoom (+0.05).
5. Path shadow (picture 3): a black wedge along the path (`pathShadow.polygon`) revealed from the bottom edge
   upward between 21.8 and 24.0, max alpha 0.38. It reads as the hero's shadow stretching toward the temple.
6. Crown flash at 24.0: a procedural 5-point crown above the temple (`crownFlash`), red with a soft glow, held 0.5 s,
   faded over 0.35 s, with a full-screen red tint (alpha 0.35), a camera shake (0.4 s, intensity 0.012) and two
   heartbeat thumps (24.0 and 24.4).
7. Skip: `ENTER` or the on-screen "SKIP >" button (top right, appears after 1.0 s). Skipping fades to black in
   0.4 s, sets `introSeen`, and starts TempleScene. Skipping twice or pressing skip during the final fade must not
   start TempleScene twice (guard flag).

## 6. Audio (optional)
Files go in `public/assets/audio/intro/` (names in `INTRO_AUDIO`). Load them in BootScene; when a file is missing the
loader only warns. Before every play call check `this.cache.audio.exists(key)`. Fade music/ambience out as listed.

## 7. Acceptance checklist
- PLAY fades into the intro; shot 1 fades in from black and zooms slowly.
- Narration appears and finishes typing before it hides.
- Shot 2 crossfades; camera starts on the stall, pans left to the swing right after the shopkeeper's line.
- The swing sways the whole time and keeps swaying after the last line; no visible duplicate/ghost edges.
- Hero's eyes flash red on "kingdom". Six timed boxes in shot 2, none overlapping or cut mid-word.
- Shot 3: shadow creeps up the path, crown flash with red tint, shake and heartbeat, second hero line, fade to black.
- At 30.0 the TempleScene starts with a short fade-in and the hero is controllable.
- ENTER and the SKIP button both work at any moment (also during crossfades), exactly once.
- Works with no audio files, no console errors or warnings, and restarting the game from the menu replays it cleanly.

## 8. Defaults chosen (change here if the story changes)
- Hero has no name yet (speaker label "HERO"). Narrator label "NARRATOR".
- The hero's exit in shot 2 is implied: the camera stays on the swing after his last line and the swing keeps swaying.
  There are no separate character sprites yet (the people are part of the painted picture).
- Mother = the seated figure on the swing. Hero = the boy standing beside it. Customer = red vest, shopkeeper = behind the counter.

## 9. Payoffs planned for later (do NOT implement now)
- Dark village: the hero says "I promised I'd be back before sunset."
- The swing is empty with the mother's shoes on it. The market stall is torn and abandoned with an empty cup.
- "Nobody who goes in ever comes back" becomes bitter when the village is empty.
