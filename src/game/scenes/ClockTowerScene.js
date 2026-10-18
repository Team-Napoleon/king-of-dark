import { BlendModes, Scene } from 'phaser';
import BeatRunner from '../story/BeatRunner';
import Player from '../entities/Player';
import PlayerHud from '../ui/PlayerHud';
import WorldBubble from '../ui/WorldBubble';
import { ACT3_PACING, ACT3_SPEAKERS } from '../config/actThreeData';
import { MINA_SHEETS } from '../config/actTwoData';
import { HERO_PHYSICS, HERO_STAND_PX } from '../config/animationData';
import {
    ART,
    OUTSIDE,
    TIME_ASSETS,
    TIME_FLOW,
    TOWER_BEATS,
    WORLD,
} from '../config/timeData';

const WIDTH = 1280;
const HEIGHT = 720;
const SPEAKERS = {
    ...ACT3_SPEAKERS,
    MINA: { color: 0x6fe0d0, anchor: 'mina' },
};

function ensureOrbProgress(registry) {
    if (registry.get('orbs') == null) registry.set('orbs', ['fear']);
}

export default class ClockTowerScene extends Scene {
    constructor() {
        super(TIME_FLOW.tower);
    }

    create() {
        ensureOrbProgress(this.registry);
        this.cameras.main.resetFX();
        this.cameras.main.setBackgroundColor('#080b15');
        this.cameras.main.setBounds(0, 0, WORLD.width, WORLD.height);
        this.physics.world.setBounds(0, 0, WORLD.width, WORLD.height);
        this.floorY = OUTSIDE.floorFeetY * ART.scale;
        this.transitionStarted = false;
        this.fxState = null;
        this.elapsed = 0;
        this.createBackground();
        this.createFloor();
        this.createActors();
        this.createLighting();
        this.createUi();
        this.runner = new BeatRunner(this, TOWER_BEATS, this.createHandlers()).start();
        this.events.once('shutdown', () => this.cleanup());
    }

    createBackground() {
        if (this.textures.exists(OUTSIDE.image)) {
            this.background = this.add.image(0, 0, OUTSIDE.image)
                .setOrigin(0, 0)
                .setScale(ART.scale)
                .setDepth(-20);
        } else {
            console.warn('[ClockTowerScene] Tower background missing; drawing a placeholder.');
            this.add.rectangle(WORLD.width / 2, WORLD.height / 2, WORLD.width, WORLD.height, 0x10182a)
                .setDepth(-20);
            const tower = this.add.graphics().setDepth(-10);
            tower.fillStyle(0x252f4a, 1).fillRect(460 * ART.scale, 160 * ART.scale, 424 * ART.scale, 468 * ART.scale);
            tower.fillStyle(0x080c16, 1).fillRoundedRect(600 * ART.scale, 360 * ART.scale, 144 * ART.scale, 268 * ART.scale, 65);
            tower.lineStyle(12, 0x556484, 1).strokeRoundedRect(600 * ART.scale, 360 * ART.scale, 144 * ART.scale, 268 * ART.scale, 65);
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
        this.player.controlsLocked = true;
        this.player.facing = 1;
        this.player.sprite.body.setCollideWorldBounds(false);
        this.physics.add.collider(this.player.sprite, this.floor);

        const minaX = OUTSIDE.minaX * ART.scale;
        const minaHeight = HERO_STAND_PX * MINA_SHEETS.heightVsHero;
        const minaKey = 'mina-float-left';
        const hasMina = this.textures.exists(minaKey);
        this.mina = {
            x: minaX,
            height: minaHeight,
            elapsed: 0,
            sprite: hasMina
                ? this.add.sprite(minaX, this.floorY - MINA_SHEETS.hoverPx, minaKey, 0)
                    .setOrigin(MINA_SHEETS.originX, MINA_SHEETS.originY)
                    .setScale(minaHeight / MINA_SHEETS.bodyPx)
                    .setDepth(6)
                : this.add.ellipse(minaX, this.floorY - minaHeight / 2, 50, minaHeight, 0x6fe0d0, 0.8).setDepth(6),
        };
        if (hasMina && this.anims.exists(minaKey)) this.mina.sprite.play(minaKey);
        if (!hasMina) console.warn('[ClockTowerScene] Mina spritesheet missing; showing a placeholder.');
    }

    createLighting() {
        this.torchGlow = this.add.graphics().setBlendMode(BlendModes.ADD).setDepth(2);
        this.doorGlow = this.add.graphics().setBlendMode(BlendModes.ADD).setDepth(3);
        this.fade = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x000000, 1)
            .setScrollFactor(0).setDepth(180);
        this.drawLighting(0);
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
        this.objective = this.add.text(24, 24, '', {
            fontFamily: 'Arial Black', fontSize: '18px', color: '#f5d58a',
            stroke: '#08070d', strokeThickness: 4,
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
        this.orbText.setText(`ORBS ${Array.isArray(orbs) ? orbs.length : 0}/5`);
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
            goto: {
                start: () => {
                    if (this.transitionStarted) return { done: true };
                    this.transitionStarted = true;
                    this.bubble.clear();
                    this.cameras.main.fadeOut(OUTSIDE.toRoomFade * 1000, 0, 0, 0);
                    this.transitionElapsed = 0;
                    return { done: false };
                },
                update: (_dt, state) => {
                    if (this.transitionElapsed < 0) return state.done;
                    this.transitionElapsed += _dt;
                    if (this.transitionElapsed >= OUTSIDE.toRoomFade) {
                        this.scene.start(TIME_FLOW.room);
                        state.done = true;
                    }
                    return state.done;
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
            return this.beginWalk(OUTSIDE.heroX);
        }
        if (name === 'towerDoorsOpen') {
            this.doorOpenElapsed = 0;
            return { name, elapsed: 0, duration: OUTSIDE.doorsOpen.seconds };
        }
        if (name === 'heroWalksIn') {
            return this.beginWalk(OUTSIDE.doorX, OUTSIDE.heroWalkIn.seconds);
        }
        throw new Error(`ClockTowerScene has no FX named "${name}".`);
    }

    beginWalk(targetArtX, duration) {
        const startX = this.player.sprite.body.center.x;
        const targetX = targetArtX * ART.scale;
        const seconds = Number.isFinite(duration)
            ? duration
            : Math.max(0.1, Math.abs(targetX - startX) / HERO_PHYSICS.moveSpeed);
        this.player.controlsLocked = true;
        this.player.forcedWalkDirection = Math.sign(targetX - startX);
        this.player.forcedWalkSpeed = Math.abs(targetX - startX) / seconds;
        return { name: Number.isFinite(duration) ? 'heroWalksIn' : 'heroWalksToMark',
            elapsed: 0, duration: seconds, startX, targetX };
    }

    updateFx(dt, state) {
        const seconds = dt;
        state.elapsed += seconds;
        if (state.name === 'fadeIn') {
            this.fade.setAlpha(Math.max(0, 1 - state.elapsed / state.duration));
            if (state.elapsed >= state.duration) this.fade.setVisible(false);
            return state.elapsed >= state.duration;
        }
        if (state.name === 'heroWalksToMark' || state.name === 'heroWalksIn') {
            const progress = Math.min(1, state.elapsed / state.duration);
            if (state.name === 'heroWalksIn') {
                const fadeProgress = Math.max(0, (progress - (1 - OUTSIDE.heroWalkIn.fadeLast / state.duration)) /
                    (OUTSIDE.heroWalkIn.fadeLast / state.duration));
                this.player.visual.setAlpha(1 - fadeProgress);
            }
            if (progress >= 1) {
                this.player.forcedWalkDirection = 0;
                this.player.forcedWalkSpeed = 0;
                this.player.visual.setAlpha(1);
                if (state.name === 'heroWalksIn') {
                    this.player.visual.setVisible(false);
                    this.player.sprite.setVisible(false);
                }
                return true;
            }
            return false;
        }
        if (state.name === 'towerDoorsOpen') {
            this.doorOpenElapsed = state.elapsed;
            this.drawLighting(state.elapsed / state.duration);
            return state.elapsed >= state.duration;
        }
        return true;
    }

    drawLighting(progress) {
        const pulse = 0.78 + 0.22 * Math.sin(this.elapsed * 5);
        this.torchGlow.clear();
        for (const torch of OUTSIDE.torches) {
            this.torchGlow.fillStyle(0xffb457, 0.12 * pulse);
            this.torchGlow.fillCircle(torch.x * ART.scale, torch.y * ART.scale, 46 * ART.scale);
            this.torchGlow.fillStyle(0xffd08a, 0.18 * pulse);
            this.torchGlow.fillCircle(torch.x * ART.scale, torch.y * ART.scale, 20 * ART.scale);
        }
        this.doorGlow.clear();
        if (progress <= 0) return;
        const cfg = OUTSIDE.doorsOpen;
        const width = Math.max(3, OUTSIDE.doorHalfWidth * 2 * ART.scale * progress);
        const height = (OUTSIDE.doorBottomY - OUTSIDE.doorTopY) * ART.scale;
        const alpha = 0.15 + 0.65 * progress;
        this.doorGlow.fillStyle(cfg.color, alpha * 0.35);
        this.doorGlow.fillEllipse(OUTSIDE.doorX * ART.scale, (OUTSIDE.doorTopY + OUTSIDE.doorBottomY / 2) * ART.scale,
            width * 1.2, height);
        this.doorGlow.fillStyle(cfg.color, alpha);
        this.doorGlow.fillRect(OUTSIDE.doorX * ART.scale - width / 2,
            OUTSIDE.doorTopY * ART.scale, width, height);
        this.doorGlow.fillStyle(0xeafaff, alpha);
        this.doorGlow.fillRect(OUTSIDE.doorX * ART.scale - Math.max(2, progress * 5),
            OUTSIDE.doorTopY * ART.scale, Math.max(4, progress * 10), height);
    }

    update(_time, delta) {
        const seconds = delta / 1000;
        this.elapsed += seconds;
        this.player.update(delta);
        this.bubble.update(seconds);
        this.hud.update(delta);
        this.drawLighting(this.doorOpenElapsed
            ? Math.min(1, this.doorOpenElapsed / OUTSIDE.doorsOpen.seconds)
            : 0);
        this.runner.update(seconds);
    }

    cleanup() {
        if (this.runner) this.runner.destroy();
        if (this.bubble) this.bubble.destroy();
        if (this.hud) this.hud.destroy();
    }
}
