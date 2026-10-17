import { Input, Scene } from 'phaser';
import DarknessOverlay from '../fx/DarknessOverlay';
import KingOfDark from '../entities/KingOfDark';
import Player from '../entities/Player';
import DialogueBox from '../ui/DialogueBox';
import Letterbox from '../ui/Letterbox';
import PlayerHud from '../ui/PlayerHud';
import WorldBubble from '../ui/WorldBubble';
import { ARENA_DEFEAT, ACT1_PACING, ACT1_SPEAKERS } from '../config/actOneData';
import { BOSS_INTRO, DEBUG_KEYS, HERO_STAND_PX, KING, KING_ATTACKS } from '../config/animationData';
import { createRevealSchedule } from '../ui/SpeechBubble';

export default class ArenaScene extends Scene {
    constructor() {
        super('ArenaScene');
    }

    create() {
        this.cameras.main.setBackgroundColor('#000000');
        this.cameras.main.fadeIn(500);
        this.physics.world.setBounds(0, 0, 1280, 720);

        this.background = this.add.image(640, 360, 'bg-arena')
            .setScale(Math.max(1280 / 1344, 720 / 768))
            .setDepth(-10);
        this.floor = this.add.rectangle(640, 685, 1280, 110, 0x070a14, 0.85);
        this.floorRim = this.add.rectangle(640, 630, 1280, 2, 0x2d4a7a, 0.6);
        this.physics.add.existing(this.floor, true);

        this.leftWall = this.add.rectangle(70, 510, 24, 240, 0x000000, 0).setVisible(false);
        this.rightWall = this.add.rectangle(1210, 510, 24, 240, 0x000000, 0).setVisible(false);
        this.physics.add.existing(this.leftWall, true);
        this.physics.add.existing(this.rightWall, true);

        this.player = new Player(this, 260, 570);
        this.darkness = new DarknessOverlay(this, this.player, {
            alpha: 0.8,
            lightScale: 1.89,
            fogWorldWidth: 1280,
            fogScrollFactor: 0,
            fogAlpha: 0.14,
        });
        this.darknessEnabled = true;
        this.darknessKey = this.input.keyboard.addKey('F2');
        this.restartKey = this.input.keyboard.addKey('R');
        this.physics.add.collider(this.player.sprite, this.floor);
        this.enemies = [];
        this.hud = new PlayerHud(this, this.player, { showControls: false });
        this.physics.add.collider(this.player.sprite, this.leftWall);
        this.physics.add.collider(this.player.sprite, this.rightWall);

        this.boss = new KingOfDark(this);
        this.enemies.push(this.boss);
        this.debugGraphics = this.add.graphics().setDepth(200).setVisible(false);
        this.debugEnabled = false;
        if (DEBUG_KEYS) {
            this.input.keyboard.addCapture('F3,F7,F8,F11');
            this.debugKeys = this.input.keyboard.addKeys({
                toggle: 'F3',
                bossPhaseOne: 'F7',
                bossPhaseTwo: 'F8',
                defeat: 'F11',
            });
        }
        this.physics.add.collider(this.boss.sprite, this.floor);
        this.physics.add.collider(this.player.sprite, this.boss.sprite);

        this.createBossHud();
        this.gameOverShown = false;
        this.gameOverText = this.add.text(640, 360, 'GAME OVER\nPress R to restart', {
            fontFamily: 'Arial Black',
            fontSize: '42px',
            color: '#f5d7a1',
            stroke: '#000000',
            strokeThickness: 8,
            align: 'center',
        }).setOrigin(0.5).setScrollFactor(0).setDepth(110).setVisible(false);
        this.defeatOverlay = this.add.rectangle(640, 360, 1280, 720, 0x000000, 1)
            .setScrollFactor(0)
            .setDepth(140)
            .setVisible(false);
        this.defeatSmoke = Array.from({ length: ARENA_DEFEAT.smoke.puffCount }, () =>
            this.add.circle(0, 0, 8, ARENA_DEFEAT.smoke.color, 0).setDepth(125).setVisible(false)
        );
        this.defeatBubble = new WorldBubble(this, {
            speakers: ACT1_SPEAKERS,
            pacing: ACT1_PACING,
            voiceStyle: { y: 150, maxWidth: 420, fontStyle: 'italic', textColor: '#d9c8ff', glowColor: 0x7a3cff },
        });
        this.defeatBubble.setAnchor('hero', () => ({
            x: this.player.sprite.body.center.x,
            y: this.player.sprite.body.bottom - HERO_STAND_PX - 10,
        }));
        this.defeatBubble.setAnchor('king', () => ({
            x: this.boss.visual.x,
            y: this.boss.visual.y - KING.body.height * 0.62,
        }));
        const lineDuration = (line) => {
            const schedule = createRevealSchedule(line.text, ACT1_PACING, { pauseAfterLast: false });
            return schedule.totalDuration + ACT1_PACING.hold + ACT1_PACING.fadeOut + ACT1_PACING.gap;
        };
        this.defeatKingLineDuration = lineDuration(ARENA_DEFEAT.kingLine);
        this.defeatHeroLineDuration = lineDuration(ARENA_DEFEAT.heroLine);
        this.defeatTimeout = ARENA_DEFEAT.kneel.seconds +
            this.defeatKingLineDuration +
            ARENA_DEFEAT.smoke.erupt + ARENA_DEFEAT.smoke.floodSeconds +
            ARENA_DEFEAT.heroStagger.seconds +
            this.defeatHeroLineDuration +
            ARENA_DEFEAT.swallow.seconds + ARENA_DEFEAT.holdBlack + 5;
        this.bossDefeatedSequence = false;
        this.defeatTransitionStarted = false;
        this.defeatElapsed = 0;
        this.defeatStep = -1;
        this.defeatStepElapsed = 0;
        this.defeatLine = null;
        this.defeatSmokeElapsed = 0;
        this.defeatHeroBaseX = 0;
        this.defeatHeroBaseY = 0;
        this.defeatKingBaseRotation = 0;
        this.events.once('boss-defeated', () => {
            if (!this.sys.isActive()) {
                return;
            }
            this.handleBossDefeated();
        });
        this.dialogueBox = new DialogueBox(this);
        this.letterbox = new Letterbox(this);
        this.enterKey = this.input.keyboard.addKey('ENTER');
        this.introActive = false;
        this.introElapsed = 0;
        this.introDialogueStarted = false;
        this.introEyesFlashed = false;
        this.introShakeStarted = false;
        this.introZoomBackStarted = false;
        this.introBarsOutStarted = false;
        this.cameraZoomInTween = this.tweens.add({
            targets: this.cameras.main,
            zoom: BOSS_INTRO.zoom.to,
            duration: BOSS_INTRO.zoom.dur * 1000,
            paused: true,
            persist: true,
        });
        this.cameraZoomOutTween = this.tweens.add({
            targets: this.cameras.main,
            zoom: 1,
            duration: BOSS_INTRO.zoomBack.dur * 1000,
            paused: true,
            persist: true,
        });
        this.cameraPanBackTween = this.tweens.add({
            targets: this.cameras.main,
            scrollX: 0,
            scrollY: 0,
            duration: BOSS_INTRO.zoomBack.dur * 1000,
            paused: true,
            persist: true,
        });
        if (this.registry.get('bossIntroSeen')) {
            this.boss.startFight(980);
            this.setBossHudVisible(true);
        } else {
            this.startIntro();
        }
        const forceDefeat = import.meta.env.DEV &&
            new URLSearchParams(window.location.search).get('scene') === 'ArenaDefeat';
        if (forceDefeat) {
            this.time.delayedCall(0, () => {
                if (this.sys.isActive() && this.boss && this.boss.sprite.active) {
                    this.boss.defeat();
                }
            });
        }

        this.events.once('shutdown', () => {
            if (this.hud) {
                this.hud.destroy();
            }
            if (this.defeatBubble) {
                this.defeatBubble.destroy();
            }
        });
        this.events.once('shutdown', () => {
            if (this.darkness) {
                this.darkness.destroy();
            }
        });
        this.events.once('shutdown', () => {
            if (this.cameraZoomInTween) {
                this.cameraZoomInTween.stop();
            }
            if (this.cameraZoomOutTween) {
                this.cameraZoomOutTween.stop();
            }
            if (this.cameraPanBackTween) {
                this.cameraPanBackTween.stop();
            }
        });
    }

    createBossHud() {
        this.bossHealthBack = this.add.rectangle(640, 48, 600, 22, 0x150d20, 0.92)
            .setScrollFactor(0)
            .setDepth(100);
        this.bossHealthBar = this.add.rectangle(344, 48, 584, 12, 0x9b55ff)
            .setOrigin(0, 0.5)
            .setScrollFactor(0)
            .setDepth(100);
        this.bossName = this.add.text(640, 16, 'KING OF DARK', {
            fontFamily: 'Arial Black',
            fontSize: '18px',
            color: '#d8b5ff',
            stroke: '#000000',
            strokeThickness: 4,
        }).setOrigin(0.5).setScrollFactor(0).setDepth(100);
        this.setBossHudVisible(false);
    }

    setBossHudVisible(visible) {
        [this.bossHealthBack, this.bossHealthBar, this.bossName].forEach((object) => {
            if (object && object.active) {
                object.setVisible(visible);
            }
        });
    }

    startIntro() {
        this.introActive = true;
        this.introElapsed = 0;
        this.introDialogueStarted = false;
        this.introEyesFlashed = false;
        this.introShakeStarted = false;
        this.introZoomBackStarted = false;
        this.introBarsOutStarted = false;
        this.player.controlsLocked = true;
        this.player.sprite.body.setVelocity(0, 0);
        this.player.poseVisual(0);
        this.cameras.main.setZoom(1);
        this.cameras.main.centerOn(KING.throneX, KING.throneY);
        this.letterbox.setTimelineProgress('in', 0);
        this.cameraZoomInTween.restart();
    }

    updateIntro(delta) {
        if (!this.introActive) {
            return;
        }
        this.introElapsed = Math.min(BOSS_INTRO.totalSeconds, this.introElapsed + delta / 1000);
        const elapsed = this.introElapsed;
        const barsInProgress = Math.max(0, Math.min(1, (elapsed - BOSS_INTRO.barsIn.at) / BOSS_INTRO.barsIn.dur));
        if (!this.introBarsOutStarted) {
            this.letterbox.setTimelineProgress('in', barsInProgress);
        }
        if (!this.introDialogueStarted && elapsed >= BOSS_INTRO.dialogueStart) {
            this.introDialogueStarted = true;
            this.dialogueBox.show(BOSS_INTRO.lines);
        }
        if (!this.introEyesFlashed && elapsed >= BOSS_INTRO.eyeFlash.at) {
            this.introEyesFlashed = true;
            this.boss.flashEyes(BOSS_INTRO.eyeFlash.dur);
        }
        if (!this.introShakeStarted && elapsed >= BOSS_INTRO.shake.at) {
            this.introShakeStarted = true;
            this.cameras.main.shake(BOSS_INTRO.shake.dur * 1000, 0.01);
        }
        if (!this.introZoomBackStarted && elapsed >= BOSS_INTRO.zoomBack.at) {
            this.introZoomBackStarted = true;
            this.cameraZoomOutTween.restart();
            this.cameraPanBackTween.restart();
        }
        if (!this.introBarsOutStarted && elapsed >= BOSS_INTRO.barsOut.at) {
            this.introBarsOutStarted = true;
        }
        if (this.introBarsOutStarted) {
            const progress = Math.max(0, Math.min(1, (elapsed - BOSS_INTRO.barsOut.at) / BOSS_INTRO.barsOut.dur));
            this.letterbox.setTimelineProgress('out', progress);
        }
        if (elapsed >= BOSS_INTRO.unlockAt) {
            this.finishIntroTimeline(false);
        }
    }

    finishIntroTimeline(skipped) {
        if (!this.sys.isActive() || !this.introActive) {
            return;
        }
        if (skipped) {
            this.introElapsed = BOSS_INTRO.totalSeconds;
            this.cameraZoomInTween.stop();
            this.cameraZoomOutTween.stop();
            this.cameraPanBackTween.stop();
            this.cameras.main.setZoom(1);
            this.cameras.main.centerOn(640, 360);
            this.letterbox.setTimelineProgress('out', 1);
            if (this.dialogueBox.isShowing) {
                this.dialogueBox.skip();
            }
        }
        this.registry.set('bossIntroSeen', true);
        this.boss.beginCombat();
        this.player.controlsLocked = false;
        this.setBossHudVisible(true);
        this.introActive = false;
        if (DEBUG_KEYS) {
            console.log(`[intro] done at ${this.introElapsed.toFixed(1)} s`);
        }
    }

    handleBossDefeated() {
        if (this.bossDefeatedSequence || !this.sys.isActive()) {
            return;
        }
        this.bossDefeatedSequence = true;
        this.registry.set('bossDefeated', true);
        this.player.controlsLocked = true;
        this.player.sprite.body.setVelocity(0, 0);
        this.setBossHudVisible(false);
        this.defeatElapsed = 0;
        this.defeatStep = -1;
        this.advanceDefeatStep();
    }

    advanceDefeatStep() {
        this.defeatStep += 1;
        this.defeatStepElapsed = 0;
        this.defeatLine = null;
        switch (this.defeatStep) {
            case 0:
                this.defeatKingBaseRotation = this.boss.visual.rotation;
                this.defeatKingBaseY = this.boss.visual.y;
                break;
            case 1:
                this.defeatLine = this.defeatBubble.say(ARENA_DEFEAT.kingLine);
                break;
            case 2:
                this.defeatSmokeElapsed = 0;
                this.defeatSmokeStartX = this.boss.sprite.x;
                this.defeatSmokeStartY = this.boss.sprite.body.bottom - KING.body.height * 0.42;
                this.defeatSmokeEndX = this.player.sprite.body.center.x;
                this.defeatSmokeEndY = this.player.sprite.body.bottom - HERO_STAND_PX * 0.35;
                for (let index = 0; index < this.defeatSmoke.length; index += 1) {
                    this.defeatSmoke[index].setVisible(false).setAlpha(0);
                }
                break;
            case 3:
                this.defeatHeroBaseX = this.player.sprite.body.center.x;
                this.defeatHeroBaseY = this.player.sprite.body.bottom;
                break;
            case 4:
                this.defeatLine = this.defeatBubble.say(ARENA_DEFEAT.heroLine);
                break;
            case 5:
                this.defeatOverlay.setVisible(true).setAlpha(0);
                break;
            case 6:
                this.defeatOverlay.setAlpha(1).setVisible(true);
                break;
            default:
                this.startDarknessScene();
                break;
        }
    }

    updateDefeatSmoke() {
        const smoke = ARENA_DEFEAT.smoke;
        const elapsed = this.defeatStepElapsed;
        const emissionProgress = Math.min(1, elapsed / smoke.erupt);
        const visibleCount = Math.floor(this.defeatSmoke.length * emissionProgress);
        const floodProgress = Math.min(1, Math.max(0, (elapsed - smoke.erupt) / smoke.floodSeconds));
        for (let index = 0; index < this.defeatSmoke.length; index += 1) {
            const puff = this.defeatSmoke[index];
            if (index >= visibleCount) {
                continue;
            }
            const localProgress = Math.min(1, Math.max(0, (elapsed - (index / this.defeatSmoke.length) * smoke.erupt) / smoke.floodSeconds));
            const drift = localProgress * localProgress;
            const spread = Math.sin(index * 2.4) * 38;
            puff.setVisible(true);
            puff.setPosition(
                this.defeatSmokeStartX + (this.defeatSmokeEndX - this.defeatSmokeStartX) * drift + spread,
                this.defeatSmokeStartY + (this.defeatSmokeEndY - this.defeatSmokeStartY) * drift + Math.cos(index * 1.7) * (24 + floodProgress * 45)
            );
            puff.setRadius(8 + floodProgress * 42 + (index % 4) * 3);
            puff.setAlpha(Math.min(0.82, 0.25 + floodProgress * 0.57));
        }
    }

    updateDefeatSequence(delta) {
        if (!this.bossDefeatedSequence || this.defeatTransitionStarted) {
            return;
        }
        const seconds = Math.max(0, delta / 1000);
        this.defeatElapsed += seconds;
        this.defeatStepElapsed += seconds;
        if (this.defeatElapsed >= this.defeatTimeout) {
            this.startDarknessScene();
            return;
        }

        switch (this.defeatStep) {
            case 0: {
                const progress = Math.min(1, this.defeatStepElapsed / ARENA_DEFEAT.kneel.seconds);
                this.boss.visual.setRotation(this.defeatKingBaseRotation + progress * 0.72);
                this.boss.visual.y = this.defeatKingBaseY + progress * ARENA_DEFEAT.kneel.dropPx;
                if (progress >= 1) this.advanceDefeatStep();
                break;
            }
            case 1:
                if (this.defeatLine && this.defeatLine.done) {
                    this.advanceDefeatStep();
                } else if (this.defeatStepElapsed >= this.defeatKingLineDuration) {
                    this.defeatBubble.clear();
                    this.advanceDefeatStep();
                }
                break;
            case 2: {
                const total = ARENA_DEFEAT.smoke.erupt + ARENA_DEFEAT.smoke.floodSeconds;
                this.updateDefeatSmoke();
                if (this.defeatStepElapsed >= total) this.advanceDefeatStep();
                break;
            }
            case 3: {
                const fx = ARENA_DEFEAT.heroStagger;
                const progress = Math.min(1, this.defeatStepElapsed / fx.seconds);
                const sway = Math.sin(this.defeatStepElapsed * Math.PI * 9) * fx.swayPx * (1 - progress);
                this.player.visual.setPosition(this.defeatHeroBaseX + sway, this.defeatHeroBaseY);
                const red = Math.round(255 + ((fx.tintTo >> 16 & 255) - 255) * progress);
                const green = Math.round(255 + ((fx.tintTo >> 8 & 255) - 255) * progress);
                const blue = Math.round(255 + ((fx.tintTo & 255) - 255) * progress);
                this.player.visual.setTint(red << 16 | green << 8 | blue);
                if (progress >= 1) this.advanceDefeatStep();
                break;
            }
            case 4:
                if (this.defeatLine && this.defeatLine.done) {
                    this.advanceDefeatStep();
                } else if (this.defeatStepElapsed >= this.defeatHeroLineDuration) {
                    this.defeatBubble.clear();
                    this.advanceDefeatStep();
                }
                break;
            case 5: {
                const progress = Math.min(1, this.defeatStepElapsed / ARENA_DEFEAT.swallow.seconds);
                this.defeatOverlay.setAlpha(progress);
                if (progress >= 1) this.advanceDefeatStep();
                break;
            }
            case 6:
                if (this.defeatStepElapsed >= ARENA_DEFEAT.holdBlack) this.advanceDefeatStep();
                break;
            default:
                this.startDarknessScene();
                break;
        }
    }

    startDarknessScene() {
        if (this.defeatTransitionStarted || !this.sys.isActive()) {
            return;
        }
        this.defeatTransitionStarted = true;
        this.registry.set('bossDefeated', true);
        if (import.meta.env.DEV) console.log('[flow] ArenaScene -> DarknessScene');
        this.scene.start(ARENA_DEFEAT.next);
    }

    update(time, delta) {
        if (Input.Keyboard.JustDown(this.restartKey)) {
            this.defeatBubble.destroy();
            this.scene.restart();
            return;
        }
        if (this.bossDefeatedSequence) {
            this.defeatBubble.update(delta / 1000);
            this.updateDefeatSequence(delta);
            return;
        }
        this.darkness.update(delta);
        this.dialogueBox.update(delta);
        if (this.introActive && Input.Keyboard.JustDown(this.enterKey)) {
            this.finishIntroTimeline(true);
        }
        if (this.introActive) {
            this.updateIntro(delta);
        }
        if (DEBUG_KEYS) {
            if (Input.Keyboard.JustDown(this.darknessKey)) {
                this.darknessEnabled = !this.darknessEnabled;
                this.darkness.setDarkness(this.darknessEnabled ? 0.8 : 0, 1.4, 250);
            }
            if (Input.Keyboard.JustDown(this.debugKeys.toggle)) {
                this.debugEnabled = !this.debugEnabled;
                this.debugGraphics.setVisible(this.debugEnabled);
            }
            if (Input.Keyboard.JustDown(this.debugKeys.bossPhaseOne)) {
                this.boss.health = 101;
            }
            if (Input.Keyboard.JustDown(this.debugKeys.bossPhaseTwo)) {
                this.boss.health = 1;
            }
            if (Input.Keyboard.JustDown(this.debugKeys.defeat)) {
                this.boss.defeat();
            }
        }
        this.player.update(delta);
        this.boss.update(this.player, delta);
        if (this.debugEnabled) {
            this.drawDebug();
        }
        this.hud.update();
        if (this.bossHealthBar && this.bossHealthBar.active) {
            this.bossHealthBar.setSize(584 * (this.boss.health / this.boss.maxHealth), 12);
        }
        if (this.player.isGameOver && !this.gameOverShown) {
            this.triggerGameOver();
        }
    }

    triggerGameOver() {
        if (this.gameOverShown || !this.gameOverText || !this.gameOverText.active) {
            return;
        }
        this.gameOverShown = true;
        this.cameras.main.stopFollow();
        this.gameOverText.setVisible(true);
    }

    drawDebugRect(x, y, width, height, color) {
        const graphics = this.debugGraphics;
        graphics.lineStyle(2, color, 1);
        graphics.beginPath();
        graphics.moveTo(x, y);
        graphics.lineTo(x + width, y);
        graphics.lineTo(x + width, y + height);
        graphics.lineTo(x, y + height);
        graphics.lineTo(x, y);
        graphics.strokePath();
    }

    drawDebug() {
        const graphics = this.debugGraphics;
        graphics.clear();
        const playerBody = this.player.sprite.body;
        this.drawDebugRect(playerBody.x, playerBody.y, playerBody.width, playerBody.height, 0x36ff70);
        if (this.player.hitBoxActive) {
            this.drawDebugRect(
                this.player.hitBoxX,
                this.player.hitBoxY - this.player.hitBoxHeight / 2,
                this.player.hitBoxWidth,
                this.player.hitBoxHeight,
                0xffe336,
            );
        }
        for (let index = 0; index < this.player.fireballs.length; index += 1) {
            const ball = this.player.fireballs[index];
            if (!ball.active) {
                continue;
            }
            this.debugGraphics.lineStyle(2, 0xff9b32, 1);
            this.debugGraphics.beginPath();
            this.debugGraphics.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
            this.debugGraphics.strokePath();
        }
        this.drawDebugRect(
            this.boss.sprite.x - this.boss.hitHalfWidth,
            this.boss.sprite.body.center.y - this.boss.hitHalfHeight,
            this.boss.hitHalfWidth * 2,
            this.boss.hitHalfHeight * 2,
            0xff3030,
        );
        graphics.fillStyle(0xffffff, 1);
        graphics.fillEllipse(playerBody.center.x, playerBody.bottom, 4, 4);
        graphics.fillEllipse(this.boss.sprite.body.center.x, this.boss.sprite.body.bottom, 4, 4);
        if (this.boss.currentAttackName && this.boss.currentAttack) {
            const attack = KING_ATTACKS[this.boss.currentAttackName];
            const radius = attack.radius || attack.hitRange;
            graphics.lineStyle(2, 0xb36cff, 1);
            graphics.beginPath();
            graphics.arc(this.boss.sprite.x, this.boss.sprite.body.center.y, radius, 0, Math.PI * 2);
            graphics.strokePath();
        }
    }
}