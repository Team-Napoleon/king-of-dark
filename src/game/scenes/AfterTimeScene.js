import { BlendModes, Scene } from 'phaser';
import BeatRunner from '../story/BeatRunner';
import Player from '../entities/Player';
import PlayerHud from '../ui/PlayerHud';
import WorldBubble from '../ui/WorldBubble';
import { ACT2_FX, MINA_SHEETS } from '../config/actTwoData';
import { ACT3_PACING, ACT3_SPEAKERS } from '../config/actThreeData';
import { HERO_PHYSICS, HERO_STAND_PX } from '../config/animationData';
import {
    ART,
    AFTER_TIME_BEATS,
    OUTSIDE,
    TIME_ASSETS,
    TIME_FLOW,
    WORLD,
} from '../config/timeData';

const WIDTH = 1280;
const HEIGHT = 720;
const SPEAKERS = {
    ...ACT3_SPEAKERS,
    MINA: { color: 0x6fe0d0, anchor: 'mina' },
};

function ensureOrbProgress(registry) {
    if (registry.get('orbs') == null) registry.set('orbs', ['fear', 'time']);
}

export default class AfterTimeScene extends Scene {
    constructor() {
        super(TIME_FLOW.after);
    }

    create() {
        ensureOrbProgress(this.registry);
        this.cameras.main.resetFX();
        this.cameras.main.setBackgroundColor('#080b15');
        this.cameras.main.setBounds(0, 0, WORLD.width, WORLD.height);
        this.floorY = OUTSIDE.floorFeetY * ART.scale;
        this.elapsed = 0;
        this.transitionStarted = false;
        this.fadeElapsed = -1;
        this.objectiveElapsed = -1;
        this.walkElapsed = -1;
        this.createBackground();
        this.createFloor();
        this.createActors();
        this.createEffects();
        this.createUi();
        this.runner = new BeatRunner(this, AFTER_TIME_BEATS, this.createHandlers()).start();
        this.events.once('shutdown', () => this.cleanup());
    }

    createBackground() {
        if (this.textures.exists(OUTSIDE.image)) {
            this.background = this.add.image(0, 0, OUTSIDE.image)
                .setOrigin(0, 0).setScale(ART.scale).setDepth(-20);
        } else {
            console.warn('[AfterTimeScene] Tower background missing; drawing a placeholder.');
            this.add.rectangle(WORLD.width / 2, WORLD.height / 2, WORLD.width, WORLD.height, 0x10182a)
                .setDepth(-20);
            const tower = this.add.graphics().setDepth(-10);
            tower.fillStyle(0x252f4a, 1).fillRect(460 * ART.scale, 160 * ART.scale, 424 * ART.scale, 468 * ART.scale);
            tower.fillStyle(0x080c16, 1).fillRoundedRect(600 * ART.scale, 360 * ART.scale, 144 * ART.scale, 268 * ART.scale, 65);
        }
    }

    createFloor() {
        this.floor = this.add.rectangle(WORLD.width / 2, this.floorY + 28 * ART.scale,
            WORLD.width, 56 * ART.scale, 0x000000, 0).setVisible(false);
        this.physics.add.existing(this.floor, true);
    }

    createActors() {
        const heroX = OUTSIDE.heroStartX * ART.scale;
        this.player = new Player(this, heroX, this.floorY - 50 * ART.scale);
        this.player.moveSpeed = HERO_PHYSICS.moveSpeed;
        this.player.controlsLocked = true;
        this.player.facing = 1;
        this.player.sprite.body.setCollideWorldBounds(false);
        this.physics.add.collider(this.player.sprite, this.floor);

        const minaX = OUTSIDE.minaX * ART.scale;
        const minaHeight = HERO_STAND_PX * MINA_SHEETS.heightVsHero;
        const key = 'mina-float-left';
        const hasMina = this.textures.exists(key);
        this.mina = {
            x: minaX,
            height: minaHeight,
            sprite: hasMina
                ? this.add.sprite(minaX, this.floorY - MINA_SHEETS.hoverPx, key, 0)
                    .setOrigin(MINA_SHEETS.originX, MINA_SHEETS.originY)
                    .setScale(minaHeight / MINA_SHEETS.bodyPx)
                    .setDepth(6)
                : this.add.ellipse(minaX, this.floorY - minaHeight / 2, 50, minaHeight, 0x6fe0d0, 0.8).setDepth(6),
        };
        if (hasMina && this.anims.exists(key)) this.mina.sprite.play(key);
        if (!hasMina) console.warn('[AfterTimeScene] Mina spritesheet missing; showing a placeholder.');
    }

    createEffects() {
        this.torchGlow = this.add.graphics().setBlendMode(BlendModes.ADD).setDepth(2);
        this.drawTorches(0);
        this.doorCrack = this.add.graphics().setBlendMode(BlendModes.ADD).setDepth(3);
        this.doorCrack.fillStyle(0x75caff, 0.6);
        this.doorCrack.fillRect(
            OUTSIDE.doorX * ART.scale - 3,
            (OUTSIDE.doorTopY + OUTSIDE.doorBottomY) * 0.5 * ART.scale,
            6,
            34 * ART.scale
        );
        this.fade = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x000000, 1)
            .setScrollFactor(0).setDepth(180);
    }

    drawTorches(timeSeconds) {
        this.torchGlow.clear();
        const pulse = 0.78 + 0.22 * Math.sin(timeSeconds * 5);
        for (const torch of OUTSIDE.torches) {
            this.torchGlow.fillStyle(0xffb457, 0.12 * pulse);
            this.torchGlow.fillCircle(torch.x * ART.scale, torch.y * ART.scale, 46 * ART.scale);
            this.torchGlow.fillStyle(0xffd08a, 0.18 * pulse);
            this.torchGlow.fillCircle(torch.x * ART.scale, torch.y * ART.scale, 20 * ART.scale);
        }
    }

    createUi() {
        this.hud = new PlayerHud(this, this.player, { showControls: false, showKills: false });
        this.hud.controlsChipBack.setVisible(false);
        this.hud.controlsChip.setVisible(false);
        this.orbText = this.add.text(WIDTH - 24, 24, '', {
            fontFamily: 'Arial Black', fontSize: '16px', color: '#b9bbcf',
            stroke: '#08070d', strokeThickness: 4,
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(110);
        this.updateOrbHud();
        this.objectiveText = this.add.text(ACT2_FX.objective.x, ACT2_FX.objective.y, '', {
            fontFamily: 'Arial Black',
            fontSize: `${ACT2_FX.objective.fontSize}px`,
            color: ACT2_FX.objective.color,
            stroke: '#08070d',
            strokeThickness: 4,
        }).setScrollFactor(0).setDepth(110).setAlpha(0).setVisible(false);
        this.bubble = new WorldBubble(this, {
            speakers: SPEAKERS,
            pacing: ACT3_PACING,
            voiceStyle: { y: 150, maxWidth: 460, textColor: '#d9c8ff', glowColor: 0x7a3cff },
        });
        this.bubble.setAnchor('hero', () => ({
            x: this.player.sprite.body.center.x,
            y: this.player.sprite.body.bottom - HERO_STAND_PX - 12,
        }));
        this.bubble.setAnchor('mina', () => ({
            x: this.mina.x,
            y: this.floorY - this.mina.height - 18,
        }));
    }

    updateOrbHud() {
        const orbs = this.registry.get('orbs');
        const count = Array.isArray(orbs) ? orbs.length : 0;
        this.orbText.setText(`ORBS ${count}/5`);
    }

    createHandlers() {
        return {
            fx: {
                start: (beat) => this.startFx(beat.name),
                update: (dt, state) => this.updateFx(dt, state),
            },
            line: {
                start: (beat) => {
                    const state = { done: false };
                    this.bubble.say({
                        who: beat.who,
                        text: beat.text,
                        onDone: () => { if (this.sys.isActive()) state.done = true; },
                    });
                    return state;
                },
                update: (_dt, state) => state.done,
            },
            objective: {
                start: (beat) => {
                    this.objectiveText.setText(beat.text).setAlpha(0).setVisible(true);
                    return { elapsed: 0 };
                },
                update: (dt, state) => {
                    state.elapsed += dt;
                    const objective = ACT2_FX.objective;
                    const total = objective.fadeIn + objective.hold + objective.fadeOut;
                    const alpha = state.elapsed < objective.fadeIn
                        ? state.elapsed / objective.fadeIn
                        : state.elapsed < objective.fadeIn + objective.hold
                            ? 0.92 + Math.sin(state.elapsed * Math.PI * 2 / objective.pulse) * 0.08
                            : Math.max(0, 1 - (state.elapsed - objective.fadeIn - objective.hold) / objective.fadeOut);
                    this.objectiveText.setAlpha(alpha);
                    if (state.elapsed < total) return false;
                    this.objectiveText.setVisible(false);
                    return true;
                },
            },
            goto: {
                start: () => {
                    if (this.transitionStarted) return { elapsed: OUTSIDE.toNextFade, done: true };
                    this.transitionStarted = true;
                    this.bubble.clear();
                    this.cameras.main.fadeOut(OUTSIDE.toNextFade * 1000, 0, 0, 0);
                    return { elapsed: 0, done: false };
                },
                update: (dt, state) => {
                    if (state.done) return true;
                    state.elapsed += dt;
                    if (state.elapsed < OUTSIDE.toNextFade) return false;
                    if (this.game.scene.keys[TIME_FLOW.next]) this.scene.start(TIME_FLOW.next);
                    else {
                        console.warn(`[AfterTimeScene] "${TIME_FLOW.next}" is not registered; returning to MainMenuScene.`);
                        this.scene.start('MainMenuScene');
                    }
                    state.done = true;
                    return true;
                },
            },
        };
    }

    startFx(name) {
        if (name === 'fadeIn') {
            this.fade.setAlpha(1).setVisible(true);
            return { name, elapsed: 0, duration: OUTSIDE.fadeIn };
        }
        if (name === 'heroWalksToMark') {
            return this.beginHeroWalk(OUTSIDE.heroX, Math.max(0.1,
                Math.abs(OUTSIDE.heroX - OUTSIDE.heroStartX) * ART.scale / HERO_PHYSICS.moveSpeed), name);
        }
        if (name === 'minaWalksEastHeroFollows') {
            this.walkElapsed = 0;
            this.walkStartHeroX = this.player.sprite.body.center.x;
            this.walkStartMinaX = this.mina.x;
            this.player.controlsLocked = true;
            const duration = Math.max(
                (WORLD.width - this.walkStartHeroX) / HERO_PHYSICS.moveSpeed,
                (WORLD.width - this.walkStartMinaX) / HERO_PHYSICS.moveSpeed
            );
            this.player.forcedWalkDirection = 1;
            this.player.forcedWalkSpeed = HERO_PHYSICS.moveSpeed;
            this.walkStartHeroAlpha = 1;
            return { name, elapsed: 0, duration };
        }
        throw new Error(`AfterTimeScene has no FX named "${name}".`);
    }

    beginHeroWalk(targetArtX, duration, name) {
        const startX = this.player.sprite.body.center.x;
        const targetX = targetArtX * ART.scale;
        this.player.controlsLocked = true;
        this.player.forcedWalkDirection = Math.sign(targetX - startX);
        this.player.forcedWalkSpeed = Math.abs(targetX - startX) / duration;
        return { name, elapsed: 0, duration, startX, targetX };
    }

    updateFx(dt, state) {
        state.elapsed += dt;
        if (state.name === 'fadeIn') {
            this.fade.setAlpha(Math.max(0, 1 - state.elapsed / state.duration));
            if (state.elapsed >= state.duration) {
                this.fade.setVisible(false);
                return true;
            }
            return false;
        }
        if (state.name === 'heroWalksToMark') {
            if (state.elapsed < state.duration) return false;
            this.player.forcedWalkDirection = 0;
            this.player.forcedWalkSpeed = 0;
            this.player.controlsLocked = true;
            return true;
        }
        if (state.name === 'minaWalksEastHeroFollows') {
            this.mina.x = this.walkStartMinaX + HERO_PHYSICS.moveSpeed * state.elapsed;
            this.mina.sprite.setX(this.mina.x);
            const heroX = this.walkStartHeroX + HERO_PHYSICS.moveSpeed * state.elapsed;
            this.player.sprite.setX(heroX);
            this.player.sprite.body.reset(this.player.sprite.x, this.player.sprite.y);
            const fadeStart = state.duration * 0.8;
            const alpha = Math.max(0, 1 - Math.max(0, state.elapsed - fadeStart) / (state.duration - fadeStart));
            this.player.visual.setAlpha(alpha);
            if (state.elapsed >= state.duration) {
                this.player.forcedWalkDirection = 0;
                this.player.forcedWalkSpeed = 0;
                this.player.visual.setAlpha(1);
                return true;
            }
            return false;
        }
        return false;
    }

    update(_time, delta) {
        if (this.transitionStarted) return;
        const seconds = delta / 1000;
        this.elapsed += seconds;
        this.player.update(delta);
        this.hud.update(delta);
        this.bubble.update(seconds);
        this.drawTorches(this.elapsed);
        this.updateOrbHud();
        this.runner.update(seconds);
    }

    cleanup() {
        if (this.runner) this.runner.destroy();
        if (this.bubble) this.bubble.destroy();
        if (this.hud) this.hud.destroy();
    }
}
