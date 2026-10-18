# ORB OF TIME: SCENES 10, 11, 12 (spec)

Data, text, coordinates and puzzle rules live in `src/game/config/timeData.js` (do not change its numbers or wording; if something cannot be done as written, report it).
Script source: "King of Dark Full Script (Readable English)", Scenes 9-13, and the "Orb Missions" document (Orb of Time = puzzle + time loop).

## 1. Numbering correction (important)
- The settlement / Orb of Life work already built (SettlementScene, lifeData.js, Crawler.js, `public/assets/Life/*`) is script **Scene 13**. Keep it exactly as it is.
- Correct order: Scene 9 (Mina after Fear, outside) -> **Scene 10** ClockTowerScene -> **Scene 11** EndlessRoomScene (room + chamber) -> **Scene 12** AfterTimeScene -> **Scene 13** SettlementScene (existing).
- Scene 9's last lines must be the script's (see `SCENE9_TIME_LINES`: "Next is Time. Look for the tower where the clock stopped.", objective FIND THE ORB OF TIME). The text that pointed to the settlement belongs to Scene 12.
- ORBS HUD counts collected orbs from the registry (`orbs` array: fear, time, life ...). After Time it reads 2/5, after Life 3/5. Each orb is added once only.

## 2. Pictures (public/assets/Time/)
| Key | File | Use |
| --- | --- | --- |
| time-outside | outside_tower.jpg (1344x768) | Scenes 10 and 12 (static camera). Black bands are part of the art. |
| time-chamber-a / b | chamber-a.jpg, chamber-b.jpg (each 8 frames of 1344x768, 2 columns x 4 rows) | hidden chamber, 16-frame loop at 12.5 fps (use `chamberAt(t)`) |
| time-orb | time_orb_sheet.png (16 frames 200x220, 4x4) | the Orb of Time, 80 ms per frame, loop |
| time-endless | endless_room.jpg (OPTIONAL, not supplied yet) | Endless Room background. If missing, draw the room with Graphics (`ROOM.procedural`). |

All pictures are drawn at world (0,0) with scale `ART.scale` (1280/1344). Art px coordinates in the data are multiplied by it. Camera bounds = WORLD, static camera, nearest or linear filtering as the other scenes do.

## 3. Scene 10: ClockTowerScene (outside the tower, Hero and Mina)
- Picture `time-outside`. Feet line y = `OUTSIDE.floorFeetY`. Mina is already standing at `minaX` (facing the hero). The hero walks in from the left to `heroX` (controls locked for the whole scene).
- Beats: `TOWER_BEATS` through BeatRunner + WorldBubble (HERO and MINA bubbles above their heads). The line "Hours only climb. Remember that." is an ADDED clue (flag `added`): keep it, the player needs it.
- FX: fadeIn; subtle additive flicker glows on the two painted torches; `towerDoorsOpen` = a blue-white additive light widens from the door crack over the door area (`OUTSIDE.doorsOpen`), timer driven; `heroWalksIn` = hero walks to the door centre and his visual fades in the last 0.5 s (timer driven); then camera fadeOut and start EndlessRoomScene.

## 4. Scene 11: EndlessRoomScene (the loop puzzle)
Hero alone. No monster. Static camera. Hero enters at `ROOM.heroStartX`; walk on the floor line `ROOM.floorFeetY`; invisible walls at wallLeft/wallRight. Controls: move normally. Interact with a door: stand within `ROOM.interactRange` of its centre and press **E** (a small "E" prompt above the door while in range; never auto-enter).

State machine (all timers from delta, no tweens on the hero):
1. `room`: free movement. Doors show an hour (number inside a clock ring above each door, drawn once, text updated on reset). Spent doors are dim (`colors.spent`), lit doors glow (`colors.lit`). HUD: "LOOP n" (top centre, small) and three hourglass pips (lit = correct doors done).
2. E on a door -> `entering` (`timing.enterWalk`): hero walks into the door and fades.
3. Correct pick (`isCorrectPick(hours, progress, door)`): progress+1; door goes dim; blue ripple (`correctRipple`), small shake; hero fades back in at the entrance (`respawnFade`); the OTHER doors keep their hours (no reshuffle).
4. Wrong pick: red-white flash + shake (`wrongFlash`), then `rewind` (clock hands spin backwards, flash, "LOOP" increments), progress = 0, all doors lit again, new hours from `makeLayout(loopIndex, prevOrderKey)`, hero reappears at the entrance (`respawnFade`).
5. Third correct door (progress == `doorsToPass`) -> `dissolve`: all doors dissolve into blue light (`dissolve`), camera fade (`toChamberFade`), switch to the chamber layer.
- Fairness rules: the rule is "hours only climb": lowest hour first. Mina gave the clue in Scene 10. Fail-soft hints: after `hint.pulseAfterResets` resets the next correct door's clock pulses; after `hint.ruleAfterResets` the wall shows `hint.ruleText`. The player must never get stuck.
- Lines (`ROOM_LINES`, hero bubble above the hero): `start` at the first loop (after the fade-in); `reset1` after the first wrong door; `changed` after the second reset, or at the first correct door once a reset has happened, only once; `solved` in the chamber. Never repeat a line on later resets. If the puzzle is solved with no resets, skip reset1 and changed.
- The first loop is rigged so the MIDDLE door ("I'll take the middle one") is wrong (layout 1). All logic functions (`correctOrder`, `nextCorrectDoor`, `isCorrectPick`, `makeLayout`, `orderKey`) are in timeData.js and already tested: use them, do not re-implement.
- R restarts the scene cleanly (progress, loop, lines reset), no stacked effects.

## 5. The hidden chamber and the Orb of Time (same scene, second layer)
- After `dissolve` the room layer is hidden and the chamber layer is shown: a full-screen image playing `chamberAt(t)` (swap the texture key and frame each frame from the clock, no allocation). Hero appears at `CHAMBER.heroStartX` on `CHAMBER.floorFeetY` and auto-walks to `heroStopX` (walk clip, `heroWalkSeconds`). The painted orb is part of the chamber picture.
- `solved` line. Then `orbSwapAndRise`: the real orb sprite (`time-orb`, animation `time-orb-pulse`) is placed exactly over the painted orb: sprite pixel (anchorX, anchorY) = (96,100) at art point `CHAMBER.orbAnchorArt`, scale `CHAMBER.orbScaleArt * ART.scale`, plus an additive glow (`ORB_TIME.glowColor`). At the same moment a dark ellipse "void" (`CHAMBER.void`, one canvas texture created once with a radial gradient: dark centre, cyan rim) fades in over the painted orb so nothing is left behind, then rests at `void.restAlpha`. The orb rises `riseArt` over `riseSeconds` (timer driven), small shake.
- `orbToHero`: floats to the hero over `floatToHeroSeconds` with a small bob, shrinks to `heldDiameterH` x hero height, absorbed with a flash (`absorbFlashSeconds`). `bannerOrb`: banner `ORB OF TIME` + sub `ORB_TIME.bannerSub` using the existing orb banner code. `orbCollected`: add `time` to registry `orbs` once only; the ORBS HUD pulses and reads 2/5 (derive the count from the registry, never a constant). Orb colour in the HUD: `ORB_TIME.hudColor`.
- Finally fade (`afterFade`) and start AfterTimeScene.

## 6. Scene 12: AfterTimeScene (outside, Hero and Mina)
Same picture and positions as Scene 10; the tower doors are closed. Beats `AFTER_TIME_BEATS`: lines, objective FIND THE ORB OF LIFE (use the existing objective UI), Mina walks east off screen and the hero follows, fadeOut, start `SettlementScene` (Scene 13, existing).

## 7. Dev routes and keys (only when TIME_DEBUG)
Routes (same mechanism as ?scene=Settlement): `?scene=ClockTower`, `?scene=EndlessRoom`, `?scene=TimeChamber` (EndlessRoomScene starting directly in the chamber phase, hero at the start), `?scene=MinaAfterTime`. Keys: F5 solve the puzzle instantly (go to the dissolve), F7 make the next E a wrong pick, F3 show door ranges and the art grid.

## 8. Acceptance checklist
- Scene 9 ends with the script's Time lines and objective, then Scene 10 starts (no settlement jump).
- Scene 10: bubbles above the right heads, doors open with blue light, hero walks in, fade to the room.
- Scene 11: three doors with hours; E enters; a wrong door resets (flash, rewind, LOOP+1, new hours); a correct door dims and keeps progress; the first loop's middle door is wrong; three correct in a row dissolve the doors; hints appear after 3 and 5 resets; lines play once.
- Chamber: baked animation loops; the orb sprite sits exactly on the painted orb, rises, floats to the hero, is absorbed; the painted orb is hidden; banner; HUD 2/5; `time` added once.
- Scene 12 -> Scene 13 works and the ORBS HUD reads 3/5 after Life. R and replay never stack effects or duplicate the orb. No console errors.

## 9. Optional: art prompt for the Endless Room background (Leonardo, 1344x768, same look as the temple)
```
Dark fantasy pixel art, side view, 16-bit, a stone clock-tower interior room, three identical tall arched wooden doors with iron bands evenly spaced across the back wall (left, centre, right), plain stone wall space above every door left EMPTY for a clock, deep navy shadows, cool gray-blue stone, faint cyan-blue light leaking from under each door, a few small cogs and chains in the corners, flat stone floor strip about 82% down the image, solid black bands across the top and bottom edges about 9% of the height each, muted desaturated palette, crisp pixel edges, no characters, no text, no numbers, no clocks, no watermark
```
Save as `public/assets/Time/endless_room.jpg`. The three door centres must sit near art x = 336, 672, 1008 (edit `ROOM.doorCenters` and the door size to match the picture; F3 shows the ranges).
