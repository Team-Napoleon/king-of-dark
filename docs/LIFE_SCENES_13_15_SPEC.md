# ORB OF LIFE: SCENES 13, 14, 15 (spec)

Data: `src/game/config/lifeData.js` (existing, do not change) and `src/game/config/lifeAfterData.js` (new). Script source: "King of Dark Full Script (Readable English)", Scenes 13-15.

## 1. Numbering map (old name -> script scene)
| Built / planned | Script scene |
| --- | --- |
| SettlementScene ("Scene 10", Run 10A) | **13** (built, keep) |
| LifeChamberScene ("Scene 11", Run 10B) | **14** (to build) |
| AfterLifeScene ("Scene 12", planned) | **15** (to build) |

Flow: Scene 9 -> 10 ClockTower -> 11 EndlessRoom -> 12 AfterTime -> **13 Settlement -> 14 LifeChamber -> 15 AfterLife** -> 16 TruthOutsideScene -> 17 TruthCaveScene -> 18 TruthOutsideScene reveal.

## 2. Corrections to the old Life pack
- `AFTER_FEAR_TO_LIFE` and `LIFE_ORDER_NOTE` in lifeData.js are OBSOLETE (Scene 9 goes to the clock tower now). Do not use them; do not delete the exports.
- Orb count: Fear, Time, and Life are collected, so **3 / 4** after Life. Always derive it from the registry `orbs` array. Add `life` once only.
- Orb colour: the script says green; the art in the pack is a PINK heart orb (`life_orb_beacon_sheet.png`, hudColor 0xff4fb0, pink ring glow, pink crystals in the chamber). We keep PINK because all the art is pink. If you want green, the art must be regenerated.

## 3. Scene 14: LifeChamberScene (playable)
Exactly Run 10B in lifeData.js (`CHAMBER`, `WAVES.chamber`, `CHAMBER_BEATS`) with the corrections above. Background `life-inside-bg`, hero alone, wave of 4 Shadow Crawlers (max 3 alive), ring glow rises per kill, pink orb rises from the ring, floats to the hero, banner `ORB OF LIFE` / `Life holds on.`, registry `orbs` += `life`, HUD 3 / 4, fadeOut, goto `AfterLifeScene`.
Dev routes: `?scene=LifeChamber`, `?scene=LifeChamberWave`, `?debug=grid`.

## 4. Scene 15: AfterLifeScene (outside the settlement, Hero, Mina and Elder)
Data: `AFTER_LIFE`, `AFTER_LIFE_SCENE_BEATS`, `LIFE_FLOW` in lifeAfterData.js.
- Picture `life-outside-bg` (same scale and camera as SettlementScene), fire drawn at full level with the Scene 13 fire code, light darkness like Scene 13. No wave, no hatch, controls locked all scene.
- Elder NPC (existing npc sheet, `elder` row) stands at `elderX` facing right. Kid and hooded may stand idle at their x. The hero emerges from the fire pit: appears at `heroEmergeFromX`, visual fades in over `fadeInSeconds`, walks to `heroX`. Mina is at `minaX`. Speakers face each other.
- Lines through BeatRunner + WorldBubble (ELDER above the elder, MINA above Mina, HERO above the hero). `{COUNT}` = `COUNT_WORD[registry orbs length]` -> "Three".
- Objective FIND THE ORB OF TRUTH (existing objective UI). Then Mina walks east off screen to `exitX`, hero follows, fadeOut, start `TruthOutsideScene` (Scene 16, `part: 'before'`).
- Dev route: `?scene=MinaAfterLife`.

## 5. Acceptance checklist
- Settlement (13) still plays as before; after the hatch it starts LifeChamberScene (no menu fallback).
- Chamber: wave of 4 is fair; the ring glow rises per kill; the pink orb is the right size and pulses; banner; HUD reads 3 / 4; `life` added once; R never duplicates the orb.
- AfterLife: lines in order with the right bubbles, MINA says "Three.", objective shows, Mina walks east, hero follows, fade, Scene 16 or the menu fallback with a console warning.
- Scene 9 -> 10 -> 11 -> 12 -> 13 -> 14 -> 15 plays through; the ORBS HUD reads 1, 2, 3 in that order. No console errors.
