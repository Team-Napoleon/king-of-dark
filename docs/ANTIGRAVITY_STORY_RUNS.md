# King of Dark: story build runs for Antigravity (Phaser 4 + Vite)
Put `src/game/config/storyData.js` in the project first. It holds every scene, line and timing, so the code never contains dialogue text.

## Before you start (do not skip)
1. Copilot must be FINISHED with v2 and the result tested. Do NOT run Antigravity on the same files at the same time (DialogueBox, ArenaScene, Player, Enemy are being changed by v2). Anything that does not touch those files can start now.
2. Commit: `git add -A` then `git commit -m "v2 done"` and `git tag v0.4-v2`.
3. Model: Sonnet 4.6 (Thinking) for Runs S1, S2, S3. Gemini Flash (high) for small follow-ups. Opus only after two failed Sonnet tries. Quota will not refresh before the deadline, so use planning mode and read the plan before accepting.
4. After each run: play it, commit, tag. If a run goes wrong: `git reset --hard <last tag>`.

## Cut order if time runs out (decide now, cut from the bottom)
MUST: intro scene, temple warning, King's last words + shadow, dark world with Mina, orb sequence + 3 orbs (Time, Life, Fear), an ending card.
SHOULD: Souls and Truth orbs, awakening street, reflection, settlement overheard.
STRETCH: transformation, past-hero final fight with the player as the King, endings A and B as full scenes.

## How pictures and dialogue work (your part)
1. Save each picture into `public/assets/story/` with the exact name from `STORY_IMAGES` (for example `cs-peace.jpg`).
2. Send me the pictures. I look at each one and rewrite the lines in `storyData.js` so they match what is on screen, with timing.
3. Rule of thumb for timing: about 25 characters per second of typing, then the line stays 0.5 to 1.5 seconds. A picture with one line is 6 to 8 seconds, so a 3-picture opening is 20 to 25 seconds.
4. A missing picture shows a dark placeholder with the scene title, so you can test the flow before the art is ready.

---
## RUN S1: cutscene system, intro, temple scenes (Sonnet)
```text
Read AGENTS.md and docs/KING_OF_DARK_HANDOFF.md. Plan first, then implement. Phaser 4: confirm every Phaser API you have not already used in this repo against node_modules/phaser. Build must pass (`npm run build-nolog`) at the end of each numbered part.

src/game/config/storyData.js is supplied. Do not change its text or timings; all dialogue lives there. Use its helpers (shotDuration, sceneDuration).

1. CutsceneScene (src/game/scenes/CutsceneScene.js, key 'CutsceneScene', registered in main.js). Started with data { id, returnTo }. It plays SCENES[id]:
   - type 'cinematic': full-screen picture per shot (STORY_IMAGES key, loaded in BootScene; if the texture is missing draw a dark rectangle with the scene id so nothing crashes). Fit the picture to 1280x720 (cover). Camera push/pan from shot.cam by interpolating the picture's scale and x in update() using delta time (no chained delayedCalls). Letterbox bars (reuse Letterbox.js). fadeIn/fadeOut use camera fades.
   - type 'dialogue' and 'event': overlay on the CURRENT scene (bg 'current'): pause gameplay input (set a registry flag controlsLocked=true, restore afterwards), do not draw a picture.
   - Lines: typewriter through DialogueBox. Extend DialogueBox (keep old callers working) to take { who, text, charMs, hold } plus a SPEAKERS entry: name label, color, portrait on the left or right (about 180px, from STORY_IMAGES key; if the texture is missing show no portrait), 'italic' and 'carved' styles, side 'center' for no portrait. Each line starts at its `at` time from the scene timeline.
   - shot extras: flash { at, color } (camera flash), shake { at, dur, amp } (camera shake), flicker { at, dur } (scene lights off/on, only if DarknessOverlay exists), sfx [{ at, key }] (play if the audio key is loaded, otherwise ignore).
   - Skip: Enter jumps to the end of the scene. fadeOut then start/return: next 'continue' means resume the calling scene; any other value is a scene key to start.
   - Each scene plays once per session (registry flag seen_<id>) unless called with force:true.
   - Clean up everything on 'shutdown'. Nothing created per frame.
2. Wire the flow: MainMenu Play -> CutsceneScene 'intro' -> TempleScene. First entry to the Temple -> 'templeWarning' (type event). After the boss dies in ArenaScene: 'kingLastWords' then 'shadowRises', then start 'DarkWorldScene' (create a stub scene with a floor and a text "DARK WORLD" so the flow works; it is built in the next run). Keep the existing boss intro and endings working.
3. Progress state: in the registry keep gameProgress = GAME_PROGRESS_START (copy) and an orbCount. Add src/game/story/progress.js with completeOrb(scene, orbId) that sets the flag once, increments orbCount, advances currentObjective, and returns false if already collected.
4. orbAcquired sequence (src/game/story/orbSequence.js, function playOrbAcquired(scene, orbId, orbX, orbY)), about 6 s from ORBS[orbId]: lock controls, camera zoom 1.1, the orb (a Graphics circle with additive glow in ORBS color, created once and reused) floats to the hero and flashes, small camera shake, title card "ORB OF FEAR  1/5" (centered, fades via camera-independent text alpha driven in update), then Mina's line from ORBS[orbId].mina in the dialogue box with the Mina portrait, then unlock controls.
5. Debug keys (only when DEBUG_KEYS is on): F9 plays the intro, F10 plays kingLastWords+shadowRises, F11 plays playOrbAcquired('fear').
Finish with the list of changed files and a manual checklist.
```

## RUN S2: dark world hub, Mina, mission framework, Time and Life orbs (Sonnet)
```text
Read AGENTS.md and docs/KING_OF_DARK_HANDOFF.md. Plan first. Same rules as before (Phaser 4 API check, no tweening hero/king/monster visuals, no per-frame creation, cleanup on shutdown, build must pass).

1. DarkWorldScene (replace the stub): a side-view street, 1280x720 camera, wider world of about 3200 px with camera follow, flat floor, the existing Player and the existing darkness overlay (a small light around the hero). On first entry play 'awakening' then 'minaFirst'. Background: use the picture key 'bg-street' if it exists, else the Temple background tinted dark blue.
2. Mina: an NPC sprite (use 'mina-idle' if the texture exists, otherwise a colored Graphics figure). Pressing E near her shows "[E] Talk" and plays the clue scene for the NEXT uncollected orb (ORBS[order].clue). If all orbs are done, she says nothing new until the final door unlocks.
3. Mission doors: five glowing doors in order Fear, Time, Life, Souls, Truth along the street. Only the door for the current objective is open; others show a locked message. Entering starts the matching mission scene.
4. MissionBase (src/game/missions/MissionBase.js): a base Phaser.Scene class (import Scene from 'phaser') with: init({orbId}), create() builds floor, player, HUD hooks; complete() spawns the orb at a given point; collecting the orb calls completeOrb and playOrbAcquired, then returns to DarkWorldScene. Players can press R to restart the mission without stacking timers or objects.
5. TimeMission (key 'TimeMission'): a room with three doors and a glowing blue orb behind a hidden chamber. Wall symbols (three Graphics glyphs) change after each wrong door; correct order is door 2 then door 1 then door 3 (read from a constant). A wrong door resets the room (fade, symbols change). Correct sequence opens the hidden chamber and the orb appears.
6. LifeMission (key 'LifeMission'): a settlement with a campfire. Play 'settlementOverheard' on entry. Spawn 3 enemies one after another using the existing Gloamgnaw enemy type (max 2 alive). When all are dead the campfire grows brighter and the green orb appears.
7. HUD: top-left small objective text driven by currentObjective ("Find the Orb of Fear"), and orb icons 1-5 (filled when collected). Keep inside the existing PlayerHud pattern.
8. Debug (DEBUG_KEYS): F12 jumps to DarkWorldScene, and keys 1-5 start each mission.
Finish with the changed files and a manual checklist.
```

## RUN S3: Fear, Souls, Truth missions (Sonnet; small fixes with Flash)
```text
Read AGENTS.md and docs/KING_OF_DARK_HANDOFF.md. Add three missions extending MissionBase, same rules.

1. FearMission ('FearMission'): a long dark corridor, flickering torches (alpha driven by a timer in update), the purple orb at the far end. When the hero is near it, play 'monsterScare' (lights go out, a shadow creature appears behind the hero: use a Gloamgnaw carrier with a fixed chase speed slightly below the hero's run speed). The hero must run and jump over 3 obstacles to a doorway. The door closes behind him, the creature fades out, and the orb appears.
2. SoulsMission ('SoulsMission'): a crypt with three glowing cages and a central altar. A Soul Warden (stationary Graphics enemy) fires a slow projectile at the hero every 2.5 s (pool of 4 projectiles created in create(), no physics, distance hit-test). The hero destroys three seals (attack them: each has 3 HP, shows a flash and a soul rising from its cage). Play 'soulsWhisper' on entry. When all three seals are gone the warden fades and the orb appears above the altar.
3. TruthMission ('TruthMission'): a silent chamber with a giant mirror. On approaching the orb, a False Hero spawns: a mirrored dark copy of the hero (hero sprite sheets tinted dark violet, 120 HP) that copies the hero's horizontal movement with a delay and attacks when the hero is near it. Defeating it makes the orb appear. After the orb sequence play 'truthVision'. Before the fight play 'reflection'.
4. When all five orbs are collected, DarkWorldScene shows a final door (the last door opens, text "The Final Door"). The door starts ArenaScene's final fight path if it exists; otherwise show an ending card scene 'endingB'.
Finish with the changed files and a manual checklist.
```

## RUN S4 (stretch): transformation, final fight, endings
Only if the time plan below still works. I will write this prompt when S3 is done, because it depends on how the arena and hero code ended up after v2.

## Proposed time plan (confirm with the team)
The handbook deadline is Day 3 at 09:30. An 18:00 code freeze leaves too little time for the story. Proposed: soft freeze 20:00, hard freeze 21:00 with only bug fixes after 20:00. 21:00 to 23:00: record gameplay and edit the trailer (Abdul Rehman and Anfal start editing earlier with clips of the finished parts). Make the GitHub repo public and check it from a private browser window. Submit the trailer link and repo link before 08:45 on Day 3.
