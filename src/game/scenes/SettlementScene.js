import { BlendModes, Input, Scene } from 'phaser';
import BeatRunner from '../story/BeatRunner';
import Crawler from '../entities/Crawler';
import Player from '../entities/Player';
import PlayerHud from '../ui/PlayerHud';
import WorldBubble from '../ui/WorldBubble';
import {
    ACT3_PACING,
    ACT3_SPEAKERS,
} from '../config/actThreeData';
import { ACT2_FX, MINA_SHEETS } from '../config/actTwoData';
import {
    CRAWLER,
    LIFE_ASSETS,
    LIFE_FAIL,
    LIFE_SPEAKERS,
    SETTLEMENT,
    SETTLEMENT_BEATS,
    WAVES,
} from '../config/lifeData';
import { DEBUG_KEYS, HERO_PHYSICS, HERO_STAND_PX } from '../config/animationData';
import { orbHudText } from '../config/actTruthData';

const WIDTH = 1280;
const HEIGHT = 720;
const MASK_KEY = 'life-settlement-darkness';

function normalizeBeats(beats) {
    return beats.map((beat, index) => ({
        ...beat,
        id: beat.t === 'wave' ? 'wave' : `settlement-${index}`,
        type: beat.t,
    }));
}

export default class SettlementScene extends Scene {
    constructor() {
        super('SettlementScene');
    }

    init(data = {}) {
        this.waveOnly = data.waveOnly === true;
    }

    create() {
        this.bgScale = Math.max(HEIGHT / LIFE_ASSETS.outsideBg.h, HERO_STAND_PX / 85);
        this.worldWidth = LIFE_ASSETS.outsideBg.w * this.bgScale;
        this.worldHeight = LIFE_ASSETS.outsideBg.h * this.bgScale;
        this.floorY = SETTLEMENT.floorFeetY * this.bgScale;
        this.fireX = SETTLEMENT.landmarks.fire.x * this.bgScale;
        this.fireBaseY = SETTLEMENT.landmarks.fire.baseY * this.bgScale;
        this.fireLevel = SETTLEMENT.fire.levelStart;
        this.fireLevelTarget = this.fireLevel;
        this.fireElapsed = 0;
        this.sparkElapsed = 0;
        this.transitionStarted = false;
        this.restartKey = this.input.keyboard.addKey('R');
        this.cameras.main.resetFX();
        this.cameras.main.setRoundPixels(true);
        this.cameras.main.setBackgroundColor('#100d14');
        this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
        this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);

        this.createBackground();
        this.createFloor();
        this.createHeroAndMina();
        this.createNpcs();
        this.createFire();
        this.createHatchVisual();
        this.crawlerPuffs = Array.from({ length: WAVES.settlement.total * 2 }, () =>
            this.add.circle(0, 0, 16, 0x321e37, 0.8)
                .setBlendMode(BlendModes.ADD)
                .setDepth(9)
                .setVisible(false)
        );
        this.crawlerPuffs.forEach((puff) => { puff.life = 0; });
        this.createDarkness();
        this.createHud();
        this.createBubble();
        if (this.waveOnly) this.fadeOverlay.setAlpha(0).setVisible(false);
        if (this.debugGrid) this.createGrid();

        const desiredScrollY = this.floorY - HEIGHT * 0.78;
        this.cameraScrollY = Math.max(0, Math.min(this.worldHeight - HEIGHT, desiredScrollY));
        this.cameraTarget = this.add.zone(
            this.player.sprite.body.center.x,
            this.cameraScrollY + HEIGHT / 2,
            1,
            1
        );
        this.cameras.main.startFollow(this.cameraTarget, true, 0.12, 0.12);

        this.wavePool = Array.from({ length: WAVES.settlement.total }, (_unused, index) => {
            const crawler = new Crawler(this, index);
            this.enemies.push(crawler);
            return crawler;
        });
        this.waveSpawnIndex = 0;
        this.waveKills = 0;
        this.waveElapsed = 0;
        this.waveRunning = false;
        this.waveFailElapsed = -1;
        this.waveFailFadingIn = false;
        this.hatchElapsed = 0;
        this.hatchAlpha = 0;
        this.heroMove = null;

        this.runner = new BeatRunner(
            this,
            this.waveOnly
                ? [{ id: 'wave', type: 'wave', idData: 'settlement' }]
                : normalizeBeats(SETTLEMENT_BEATS),
            this.createHandlers()
        ).start();
        if (this.waveOnly) {
            this.setHeroPosition(SETTLEMENT.heroConversationX * this.bgScale);
            this.setAllNpcPose('crouch');
        }
        this.events.once('shutdown', () => this.cleanup());
    }

    createBackground() {
        const params = new URLSearchParams(window.location.search);
        this.debugGrid = import.meta.env.DEV && params.get('debug') === 'grid';
        if (this.textures.exists(LIFE_ASSETS.outsideBg.key)) {
            this.background = this.add.image(0, 0, LIFE_ASSETS.outsideBg.key)
                .setOrigin(0, 0)
                .setScale(this.bgScale)
                .setDepth(-20);
        } else {
            console.warn(`[SettlementScene] Missing "${LIFE_ASSETS.outsideBg.key}"; using placeholder background.`);
            this.background = this.add.rectangle(
                this.worldWidth / 2,
                this.worldHeight / 2,
                this.worldWidth,
                this.worldHeight,
                0x211c26
            ).setDepth(-20);
        }
    }

    createFloor() {
        this.floor = this.add.rectangle(
            this.worldWidth / 2,
            this.floorY + HERO_STAND_PX * 0.25,
            this.worldWidth,
            HERO_STAND_PX * 0.5,
            0x000000,
            0
        ).setVisible(false);
        this.physics.add.existing(this.floor, true);
    }

    createHeroAndMina() {
        const heroStart = SETTLEMENT.heroEnterFromX * this.bgScale;
        this.player = new Player(this, heroStart, this.floorY - 50 * this.bgScale);
        this.player.moveSpeed = HERO_PHYSICS.moveSpeed;
        this.player.controlsLocked = true;
        this.physics.add.collider(this.player.sprite, this.floor);
        this.player.scene.enemies = [];
        this.enemies = this.player.scene.enemies;

        const hasSheet = this.textures.exists('mina-float-right');
        this.mina = {
            x: this.player.sprite.body.center.x + SETTLEMENT.minaOffsetX * this.bgScale,
            y: this.floorY - MINA_SHEETS.hoverPx,
            elapsed: 0,
            facing: 1,
            clip: 'idle',
            bodyHeight: HERO_STAND_PX * MINA_SHEETS.heightVsHero,
            hasSheet,
            sprite: hasSheet
                ? this.add.sprite(0, 0, 'mina-float-right')
                    .setOrigin(MINA_SHEETS.originX, MINA_SHEETS.originY)
                    .setScale(HERO_STAND_PX * MINA_SHEETS.heightVsHero / MINA_SHEETS.bodyPx)
                    .setDepth(6)
                : this.add.rectangle(0, 0, 44, 100, 0x6fe0d0, 0.75).setOrigin(0.5, 1).setDepth(6),
            shadow: this.add.ellipse(0, this.floorY + 1, MINA_SHEETS.shadow.widthPx, 18, 0x05040a, MINA_SHEETS.shadow.alpha)
                .setDepth(4),
        };
        if (hasSheet && this.anims.exists('mina-float-right')) this.mina.sprite.play('mina-float-right');
        else if (!hasSheet) console.warn('[SettlementScene] Mina spritesheets missing; using placeholder.');
        this.updateMina(0);
    }

    createNpcs() {
        this.npcs = {};
        Object.entries(SETTLEMENT.npcs).forEach(([name, spec]) => {
            const rowIndex = LIFE_ASSETS.npc.rows_order.indexOf(spec.row);
            const bodyHeight = LIFE_ASSETS.npc.bodyH[spec.row];
            const displayHeight = spec.heightVsHero * HERO_STAND_PX;
            const sprite = this.textures.exists(LIFE_ASSETS.npc.key)
                ? this.add.sprite(
                    spec.x * this.bgScale,
                    this.floorY,
                    LIFE_ASSETS.npc.key,
                    rowIndex * LIFE_ASSETS.npc.cols
                )
                    .setOrigin(LIFE_ASSETS.npc.footAnchor[0] / LIFE_ASSETS.npc.frameWidth,
                        LIFE_ASSETS.npc.footAnchor[1] / LIFE_ASSETS.npc.frameHeight)
                    .setScale(displayHeight / bodyHeight)
                    .setDepth(5)
                : this.add.rectangle(
                    spec.x * this.bgScale,
                    this.floorY - displayHeight / 2,
                    displayHeight * 0.45,
                    displayHeight,
                    0x8a8178
                ).setDepth(5);
            sprite.setFlipX(spec.faces === 'left');
            const npc = {
                name,
                spec,
                rowIndex,
                x: spec.x * this.bgScale,
                targetX: spec.x * this.bgScale,
                displayHeight,
                sprite,
                pose: 'idle',
                poseTimer: 0,
                stepping: false,
            };
            if (this.textures.exists(LIFE_ASSETS.npc.key)) {
                const anim = `life-npc-${spec.row}-idle`;
                if (this.anims.exists(anim)) sprite.play(anim);
            }
            this.npcs[name] = npc;
        });
        this.npcList = Object.values(this.npcs);
    }

    createFire() {
        this.fireGlow = this.add.graphics().setBlendMode(BlendModes.ADD).setDepth(3);
        this.flames = this.add.graphics().setBlendMode(BlendModes.ADD).setDepth(7);
        this.fireSparks = Array.from({ length: SETTLEMENT.fire.sparkPool }, () => {
            const spark = this.add.circle(0, 0, 3, SETTLEMENT.fire.glowColor, 0)
                .setBlendMode(BlendModes.ADD)
                .setDepth(8)
                .setVisible(false);
            spark.life = 0;
            spark.vx = 0;
            spark.vy = 0;
            return spark;
        });
        this.drawFire();
    }

    createDarkness() {
        if (this.textures.exists(MASK_KEY)) this.textures.remove(MASK_KEY);
        this.maskTexture = this.textures.createCanvas(MASK_KEY, WIDTH, HEIGHT);
        this.maskContext = this.maskTexture.getContext();
        this.darknessImage = this.add.image(0, 0, MASK_KEY)
            .setOrigin(0, 0)
            .setScrollFactor(0)
            .setDepth(80);
        this.updateDarkness();
    }

    createHud() {
        this.hud = new PlayerHud(this, this.player, { showControls: false, showKills: false });
        this.hud.controlsChipBack.setVisible(false);
        this.hud.controlsChip.setVisible(false);
        this.orbText = this.add.text(WIDTH - 24, 24, '', {
            fontFamily: 'Arial Black',
            fontSize: `${ACT2_FX.orbHud.fontSize}px`,
            color: `#${ACT2_FX.orbHud.color.toString(16).padStart(6, '0')}`,
            stroke: '#08070d',
            strokeThickness: 4,
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(110);
        this.updateOrbHud();
        this.objectiveText = this.add.text(ACT2_FX.objective.x, ACT2_FX.objective.y, '', {
            fontFamily: 'Arial Black',
            fontSize: `${ACT2_FX.objective.fontSize}px`,
            color: ACT2_FX.objective.color,
            stroke: '#08070d',
            strokeThickness: 4,
        }).setScrollFactor(0).setDepth(110).setAlpha(0).setVisible(false);
        this.fadeOverlay = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x000000, 1)
            .setScrollFactor(0).setDepth(150);
        this.flareOverlay = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0xffd28a, 0)
            .setScrollFactor(0).setDepth(145).setBlendMode(BlendModes.ADD);
        this.failText = this.add.text(WIDTH / 2, HEIGHT / 2, 'THE SETTLEMENT FELL\nThe wave begins again', {
            fontFamily: 'Arial Black',
            fontSize: '32px',
            color: '#f5d7a1',
            stroke: '#000000',
            strokeThickness: 7,
            align: 'center',
        }).setOrigin(0.5).setScrollFactor(0).setDepth(151).setVisible(false);
    }

    createBubble() {
        const speakers = { ...ACT3_SPEAKERS };
        Object.entries(LIFE_SPEAKERS).forEach(([key, value]) => {
            speakers[key] = { ...value, anchor: key.toLowerCase() };
        });
        this.bubble = new WorldBubble(this, {
            speakers,
            pacing: ACT3_PACING,
            voiceStyle: { y: 150, maxWidth: 420, textColor: '#d9c8ff', glowColor: 0x7a3cff },
        });
        this.bubble.setAnchor('hero', () => ({
            x: this.player.sprite.body.center.x,
            y: this.player.sprite.body.bottom - HERO_STAND_PX - 10,
        }));
        for (const npc of this.npcList) {
            this.bubble.setAnchor(npc.name, () => ({
                x: npc.x,
                y: this.floorY - npc.displayHeight - 12,
            }));
        }
        this.bubble.setAnchor('mina', () => ({
            x: this.mina.x,
            y: this.mina.y +
                MINA_SHEETS.bobPx * Math.sin(this.mina.elapsed * Math.PI * 2 / MINA_SHEETS.bobSeconds) -
                this.mina.bodyHeight - 12,
        }));
    }

    createGrid() {
        this.gridGraphics = this.add.graphics().setDepth(130);
        this.gridGraphics.lineStyle(1, 0x7bffce, 0.4);
        for (let x = 0; x <= LIFE_ASSETS.outsideBg.w; x += 60) {
            this.gridGraphics.lineBetween(x * this.bgScale, 0, x * this.bgScale, this.worldHeight);
        }
        for (let y = 0; y <= LIFE_ASSETS.outsideBg.h; y += 60) {
            this.gridGraphics.lineBetween(0, y * this.bgScale, this.worldWidth, y * this.bgScale);
        }
        for (let x = 0; x <= LIFE_ASSETS.outsideBg.w; x += 60) {
            for (let y = 0; y <= LIFE_ASSETS.outsideBg.h; y += 60) {
                this.add.text(x * this.bgScale + 3, y * this.bgScale + 3, `${x},${y}`, {
                    fontFamily: 'Arial',
                    fontSize: '12px',
                    color: '#b7ffe9',
                    stroke: '#07120e',
                    strokeThickness: 3,
                }).setDepth(131);
            }
        }
    }

    createHandlers() {
        return {
            fx: {
                start: (beat) => this.startFx(beat.name, beat),
                update: (dt, state) => this.updateFx(state.name, dt, state),
            },
            line: {
                start: (beat) => {
                    const state = { done: false };
                    if (beat.who === 'HERO') this.poseNpcsForHeroLine();
                    this.bubble.say({
                        who: beat.who,
                        text: beat.text,
                        onDone: () => {
                            if (beat.who === 'HERO') this.restoreNpcPoses();
                            state.done = true;
                        },
                    });
                    return state;
                },
                update: (_dt, state) => state.done,
            },
            wave: {
                start: (beat) => {
                    this.beginWave(beat.idData || beat.id || 'settlement');
                    return {};
                },
                update: () => !this.waveRunning && this.waveFinished,
            },
            goto: {
                start: (beat) => {
                    if (this.transitionStarted) return { done: true };
                    this.transitionStarted = true;
                    this.bubble.clear();
                    const sceneKey = beat.scene || 'MainMenuScene';
                    if (this.game.scene.keys[sceneKey]) {
                        this.scene.start(sceneKey, beat.data);
                    } else {
                        console.warn(`[SettlementScene] Scene "${sceneKey}" is not registered; returning to MainMenuScene.`);
                        this.scene.start('MainMenuScene');
                    }
                    return { done: true };
                },
                update: (_dt, state) => state.done,
            },
        };
    }

    startFx(name, beat) {
        if (name === 'fadeIn') {
            this.fadeOverlay.setAlpha(1).setVisible(true);
            return { name, elapsed: 0, duration: 1 };
        }
        if (name === 'heroAndMinaWalkIn') {
            this.heroMove = {
                startX: this.player.sprite.body.center.x,
                targetX: SETTLEMENT.heroStopX * this.bgScale,
            };
            this.startHeroMove();
            return { name, elapsed: 0, duration: this.heroMove.duration };
        }
        if (name === 'guardStepsAside') {
            const guard = this.npcs.guard;
            guard.targetX = SETTLEMENT.guardStepAsideX * this.bgScale;
            guard.stepping = false;
            return { name, elapsed: 0, duration: Math.abs(guard.targetX - guard.x) / (HERO_PHYSICS.moveSpeed * 0.35) };
        }
        if (name === 'heroWalkTo') {
            this.heroMove = {
                startX: this.player.sprite.body.center.x,
                targetX: SETTLEMENT.heroConversationX * this.bgScale,
            };
            this.startHeroMove();
            return { name, elapsed: 0, duration: this.heroMove.duration };
        }
        if (name === 'heroLooksAway') {
            this.player.facing = -1;
            return { name, elapsed: 0, duration: beat.seconds };
        }
        if (name === 'npcsCrouch') {
            this.setAllNpcPose('crouch');
            return { name, elapsed: 0, duration: 0 };
        }
        if (name === 'npcsCheer') {
            this.setAllNpcPose('cheer', beat.seconds);
            return { name, elapsed: 0, duration: beat.seconds };
        }
        if (name === 'fireFlare') {
            this.fireLevelTarget = 1;
            this.cameras.main.shake(SETTLEMENT.hatch.flareSeconds * 1000, 0.004);
            return { name, elapsed: 0, duration: SETTLEMENT.hatch.flareSeconds };
        }
        if (name === 'hatchOpens') {
            this.openHatch();
            return { name, elapsed: 0, duration: SETTLEMENT.hatch.openSeconds };
        }
        if (name === 'heroDescends') {
            this.heroMove = {
                startX: this.player.sprite.body.center.x,
                targetX: this.fireX,
            };
            this.startHeroMove(SETTLEMENT.hatch.descendWalkSeconds);
            return { name, elapsed: 0, duration: SETTLEMENT.hatch.descendWalkSeconds + SETTLEMENT.hatch.fadeOutSeconds };
        }
        throw new Error(`Unknown SettlementScene FX "${name}".`);
    }

    updateFx(name, dt, state) {
        state.elapsed += dt;
        if (name === 'fadeIn') {
            this.fadeOverlay.setAlpha(Math.max(0, 1 - state.elapsed / state.duration));
            if (state.elapsed < state.duration) return false;
            this.fadeOverlay.setVisible(false);
            return true;
        }
        if (name === 'heroAndMinaWalkIn' || name === 'heroWalkTo') {
            this.updateHeroMove();
            if (state.elapsed < state.duration) return false;
            this.finishHeroMove();
            return true;
        }
        if (name === 'guardStepsAside') {
            const guard = this.npcs.guard;
            const dx = guard.targetX - guard.x;
            const step = Math.sign(dx) * HERO_PHYSICS.moveSpeed * 0.35 * dt;
            guard.x = Math.abs(dx) <= Math.abs(step) ? guard.targetX : guard.x + step;
            guard.sprite.setX(guard.x);
            return Math.abs(guard.x - guard.targetX) < 0.5;
        }
        if (name === 'heroLooksAway') {
            if (state.elapsed < state.duration) return false;
            this.player.facing = 1;
            return true;
        }
        if (name === 'npcsCrouch') return true;
        if (name === 'npcsCheer') {
            if (state.elapsed < state.duration) return false;
            this.setAllNpcPose('idle');
            return true;
        }
        if (name === 'fireFlare') {
            const progress = Math.min(1, state.elapsed / state.duration);
            this.flareOverlay.setAlpha(Math.sin(Math.PI * progress) * 0.72);
            if (state.elapsed < state.duration) return false;
            this.flareOverlay.setAlpha(0);
            return true;
        }
        if (name === 'hatchOpens') {
            this.hatchElapsed = state.elapsed;
            this.hatchAlpha = Math.min(1, state.elapsed / SETTLEMENT.hatch.fadeInSeconds);
            this.hatch.setAlpha(this.hatchAlpha);
            return state.elapsed >= state.duration;
        }
        if (name === 'heroDescends') {
            const walkSeconds = SETTLEMENT.hatch.descendWalkSeconds;
            if (state.elapsed <= walkSeconds) {
                this.updateHeroMove();
                if (state.elapsed >= walkSeconds) this.finishHeroMove();
                return false;
            }
            this.player.controlsLocked = true;
            this.player.forcedWalkDirection = 0;
            const fadeProgress = Math.min(1, (state.elapsed - walkSeconds) / SETTLEMENT.hatch.fadeOutSeconds);
            this.player.visual.setAlpha(1 - fadeProgress);
            this.fadeOverlay.setAlpha(fadeProgress).setVisible(true);
            return state.elapsed >= state.duration;
        }
        return false;
    }

    startHeroMove(durationOverride = null) {
        const distance = Math.abs(this.heroMove.targetX - this.heroMove.startX);
        this.heroMove.duration = durationOverride ?? Math.max(0.05, distance / HERO_PHYSICS.moveSpeed);
        this.heroMove.direction = Math.sign(this.heroMove.targetX - this.heroMove.startX);
        this.player.controlsLocked = true;
        this.player.forcedWalkDirection = this.heroMove.direction;
        this.player.forcedWalkSpeed = durationOverride ? distance / durationOverride : HERO_PHYSICS.moveSpeed;
    }

    updateHeroMove() {
        if (this.heroMove && this.heroMove.targetX === this.fireX) {
            this.mina.x = this.player.sprite.body.center.x + SETTLEMENT.minaOffsetX * this.bgScale;
        } else if (this.heroMove) {
            this.mina.x = this.player.sprite.body.center.x + SETTLEMENT.minaOffsetX * this.bgScale;
        }
    }

    finishHeroMove() {
        if (this.heroMove) this.setHeroPosition(this.heroMove.targetX);
        this.heroMove = null;
        this.player.controlsLocked = false;
        this.player.forcedWalkDirection = 0;
        this.player.forcedWalkSpeed = 0;
        this.mina.x = this.player.sprite.body.center.x + SETTLEMENT.minaOffsetX * this.bgScale;
    }

    openHatch() {
        this.hatch.setAlpha(0).setVisible(true);
        if (this.hatch.type === 'Sprite' && this.anims.exists('life-hatch')) {
            this.hatch.setFrame(LIFE_ASSETS.reveal.hatchFrames[0]).play('life-hatch');
        }
    }

    createHatchVisual() {
        if (!this.textures.exists(LIFE_ASSETS.reveal.key)) {
            console.warn('[SettlementScene] Hatch reveal art missing; using a drawn fire ring.');
            this.hatch = this.add.ellipse(
                this.fireX,
                this.fireBaseY,
                HERO_STAND_PX * 2.4,
                HERO_STAND_PX * 0.6,
                0xff8b34,
                0.55
            ).setStrokeStyle(8, 0xffcf78, 0.9).setDepth(10).setAlpha(0).setVisible(false);
            return;
        }
        const [left, top, right, bottom] = LIFE_ASSETS.reveal.bodyBox;
        const revealScale = HERO_STAND_PX * 2.4 / (right - left);
        this.hatch = this.add.sprite(this.fireX, this.fireBaseY, LIFE_ASSETS.reveal.key, 0)
            .setOrigin(
                (left + right) / (2 * LIFE_ASSETS.reveal.frameWidth),
                bottom / LIFE_ASSETS.reveal.frameHeight
            )
            .setScale(revealScale)
            .setDepth(10)
            .setAlpha(0)
            .setVisible(false);
    }

    setHeroPosition(x) {
        const y = this.player.sprite.y;
        this.player.sprite.setPosition(x, y);
        this.player.sprite.body.reset(x, y);
        this.player.visual.setPosition(x, y);
    }

    setAllNpcPose(pose, duration = 0) {
        for (const npc of this.npcList) this.setNpcPose(npc, pose, duration);
    }

    setNpcPose(npc, pose, duration = 0) {
        npc.pose = pose;
        npc.poseTimer = duration;
        if (!this.textures.exists(LIFE_ASSETS.npc.key)) return;
        const columns = { idle: 0, crouch: 2, cheer: 3, look: 4 };
        if (pose === 'idle') {
            const animation = `life-npc-${npc.spec.row}-idle`;
            if (this.anims.exists(animation)) npc.sprite.play(animation, true);
        } else {
            npc.sprite.stop();
            npc.sprite.setFrame(npc.rowIndex * LIFE_ASSETS.npc.cols + columns[pose]);
        }
    }

    poseNpcsForHeroLine() {
        for (const npc of this.npcList) this.setNpcPose(npc, 'look', 5);
    }

    restoreNpcPoses() {
        for (const npc of this.npcList) {
            if (npc.pose === 'look') this.setNpcPose(npc, 'idle');
        }
    }

    updateNpcs(dt) {
        const seconds = dt / 1000;
        for (const npc of this.npcList) {
            if (npc.stepping) {
                const dx = npc.targetX - npc.x;
                const step = Math.sign(dx) * HERO_PHYSICS.moveSpeed * 0.35 * seconds;
                npc.x = Math.abs(dx) <= Math.abs(step) ? npc.targetX : npc.x + step;
                npc.sprite.setX(npc.x);
                if (npc.x === npc.targetX) npc.stepping = false;
            }
            if (npc.poseTimer > 0) {
                npc.poseTimer = Math.max(0, npc.poseTimer - seconds);
                if (npc.poseTimer === 0 && npc.pose === 'cheer') this.setNpcPose(npc, 'idle');
            }
        }
    }

    setMinaClip(clip) {
        if (!this.mina.hasSheet) return;
        this.mina.clip = clip;
        const source = MINA_SHEETS.clips[clip];
        const animation = `mina-${source}-${this.mina.facing > 0 ? 'right' : 'left'}`;
        if (this.anims.exists(animation)) this.mina.sprite.play(animation, true);
    }

    updateMina(delta) {
        if (!this.mina) return;
        this.mina.elapsed += delta / 1000;
        if (!this.heroMove || this.heroMove.targetX !== this.fireX) {
            this.mina.x = this.player.sprite.body.center.x + SETTLEMENT.minaOffsetX * this.bgScale;
        }
        const bob = MINA_SHEETS.bobPx * Math.sin(this.mina.elapsed * Math.PI * 2 / MINA_SHEETS.bobSeconds);
        this.mina.sprite.setPosition(this.mina.x, this.mina.y + bob);
        this.mina.shadow.setPosition(this.mina.x, this.floorY + 1);
    }

    updateOrbHud() {
        const orbs = this.registry.get('orbs');
        const count = Array.isArray(orbs) ? orbs.length : 0;
            this.orbText.setText(orbHudText(count));
    }

    beginWave() {
        if (this.waveRunning) return;
        this.waveRunning = true;
        this.waveFinished = false;
        this.waveElapsed = 0;
        this.waveSpawnIndex = 0;
        this.waveKills = 0;
        this.fireLevel = SETTLEMENT.fire.levelStart;
        this.fireLevelTarget = this.fireLevel;
        this.objectiveText.setText('FIND THE ORB OF LIFE').setAlpha(0).setVisible(true);
        this.objectiveElapsed = 0;
        this.player.controlsLocked = false;
        this.player.isGameOver = false;
    }

    updateWave(_dt) {
        if (!this.waveRunning) return;
        const seconds = _dt / 1000;
        this.waveElapsed += seconds;
        const wave = WAVES.settlement;
        if (this.waveSpawnIndex < wave.spawns.length &&
            this.waveElapsed >= wave.spawns[this.waveSpawnIndex].t) {
            let alive = 0;
            let poolCrawler = null;
            for (const crawler of this.wavePool) {
                if (crawler.inUse && !crawler.isDefeated) alive += 1;
                if (!poolCrawler && !crawler.inUse) poolCrawler = crawler;
            }
            if (alive < wave.maxAlive) {
                const spec = wave.spawns[this.waveSpawnIndex];
                if (poolCrawler) {
                    const spawnX = Math.max(
                        poolCrawler.length / 2,
                        Math.min(this.worldWidth - poolCrawler.length / 2, wave.spawnX[spec.side] * this.bgScale)
                    );
                    if (poolCrawler.spawn(spawnX, spec.side === 'left' ? 1 : -1)) {
                        this.waveSpawnIndex += 1;
                    }
                }
            }
        }
        let alive = 0;
        for (const crawler of this.wavePool) {
            if (crawler.inUse && !crawler.isDefeated) {
                alive += 1;
                crawler.update(seconds, this.player);
            }
        }
        this.separateCrawlers();
        const fireProgress = wave.total > 0 ? this.waveKills / wave.total : 0;
        this.fireLevelTarget = SETTLEMENT.fire.levelStart +
            (SETTLEMENT.fire.levelEnd - SETTLEMENT.fire.levelStart) * fireProgress;
        if (this.waveSpawnIndex >= wave.total && alive === 0) {
            this.waveRunning = false;
            this.waveFinished = true;
        }
        if (this.player.health <= 0 && this.waveFailElapsed < 0) this.beginWaveFailure();
    }

    beginWaveFailure() {
        if (this.waveFailElapsed >= 0 || !this.waveRunning) return;
        this.waveFailElapsed = 0;
        this.waveFailFadingIn = false;
        this.player.controlsLocked = true;
        this.fadeOverlay.setVisible(true).setAlpha(0);
        this.failText.setVisible(true);
    }

    updateWaveFailure(dt) {
        const seconds = dt / 1000;
        if (!this.waveFailFadingIn) {
            this.waveFailElapsed += seconds;
            this.fadeOverlay.setAlpha(Math.min(1, this.waveFailElapsed / LIFE_FAIL.fadeOut));
            if (this.waveFailElapsed < LIFE_FAIL.fadeOut) return;
            this.resetWave();
            this.waveFailElapsed = 0;
            this.waveFailFadingIn = true;
            return;
        }
        this.waveFailElapsed += seconds;
        this.fadeOverlay.setAlpha(Math.max(0, 1 - this.waveFailElapsed / LIFE_FAIL.fadeOut));
        if (this.waveFailElapsed >= LIFE_FAIL.fadeOut) {
            this.waveFailElapsed = -1;
            this.fadeOverlay.setVisible(false);
            this.failText.setVisible(false);
        }
    }

    resetWave() {
        for (const crawler of this.wavePool) crawler.reset();
        this.waveSpawnIndex = 0;
        this.waveKills = 0;
        this.waveElapsed = 0;
        this.waveRunning = true;
        this.waveFinished = false;
        this.fireLevel = SETTLEMENT.fire.levelStart;
        this.fireLevelTarget = this.fireLevel;
        this.setAllNpcPose('crouch');
        this.setHeroPosition(SETTLEMENT.heroConversationX * this.bgScale);
        this.player.health = this.player.maxHealth * LIFE_FAIL.healthRestore;
        this.player.isGameOver = false;
        this.player.invulnerableTimer = 0;
        this.player.visual.setAlpha(1);
        this.player.controlsLocked = false;
    }

    separateCrawlers() {
        for (let leftIndex = 0; leftIndex < this.wavePool.length; leftIndex += 1) {
            const left = this.wavePool[leftIndex];
            if (!left.inUse || left.isDefeated) continue;
            for (let rightIndex = leftIndex + 1; rightIndex < this.wavePool.length; rightIndex += 1) {
                const right = this.wavePool[rightIndex];
                if (!right.inUse || right.isDefeated) continue;
                const minimumGap = CRAWLER.separation * Math.min(left.length, right.length);
                const dx = right.x - left.x;
                if (Math.abs(dx) < minimumGap) {
                    const push = (minimumGap - Math.abs(dx)) / 2;
                    left.setX(left.x - Math.sign(dx || 1) * push);
                    right.setX(right.x + Math.sign(dx || 1) * push);
                }
            }
        }
    }

    onCrawlerKilled() {
        this.waveKills = Math.min(WAVES.settlement.total, this.waveKills + 1);
    }

    emitCrawlerPuff(x, y) {
        let puff = null;
        for (const candidate of this.crawlerPuffs) {
            if (candidate.life <= 0) {
                puff = candidate;
                break;
            }
        }
        if (!puff) return;
        puff.life = 0.45;
        puff.setPosition(x, y).setAlpha(0.8).setVisible(true);
    }

    updateCrawlerPuffs(dt) {
        const seconds = dt / 1000;
        for (const puff of this.crawlerPuffs) {
            if (puff.life <= 0) continue;
            puff.life = Math.max(0, puff.life - seconds);
            puff.setAlpha(puff.life / 0.45);
            puff.setScale(1 + (0.45 - puff.life) * 1.6);
            if (puff.life === 0) puff.setVisible(false);
        }
    }

    updateFire(dt) {
        const seconds = dt / 1000;
        this.fireElapsed += seconds;
        this.fireLevel += (this.fireLevelTarget - this.fireLevel) * Math.min(1, seconds);
        const interval = 1 / SETTLEMENT.fire.flickerHz;
        this.sparkElapsed += seconds;
        if (this.sparkElapsed >= interval) {
            this.sparkElapsed %= interval;
            this.emitSpark();
        }
        for (const spark of this.fireSparks) {
            if (spark.life <= 0) continue;
            spark.life = Math.max(0, spark.life - seconds);
            spark.x += spark.vx * seconds;
            spark.y += spark.vy * seconds;
            spark.vy -= 26 * seconds;
            spark.setAlpha(spark.life / 0.55);
            if (spark.life === 0) spark.setVisible(false);
        }
        this.drawFire();
    }

    emitSpark() {
        let spark = null;
        for (const candidate of this.fireSparks) {
            if (candidate.life <= 0) {
                spark = candidate;
                break;
            }
        }
        if (!spark) return;
        spark.life = 0.55;
        spark.vx = (Math.random() - 0.5) * 50;
        spark.vy = -35 - Math.random() * 55;
        spark.setPosition(this.fireX + (Math.random() - 0.5) * 20, this.fireBaseY - 20)
            .setAlpha(1).setVisible(true);
    }

    drawFire() {
        const level = Math.max(0, Math.min(1, this.fireLevel));
        const pulse = 0.92 + 0.08 * Math.sin(this.fireElapsed * Math.PI * 2 * SETTLEMENT.fire.flickerHz);
        const flameHeight = (SETTLEMENT.landmarks.fire.baseY - SETTLEMENT.landmarks.fire.flameTopY) *
            this.bgScale * (0.65 + level * 0.35) * pulse;
        const radius = HERO_STAND_PX * (
            SETTLEMENT.darkness.fireLightMinRadiusH +
            (SETTLEMENT.darkness.fireLightMaxRadiusH - SETTLEMENT.darkness.fireLightMinRadiusH) * level
        );
        this.fireGlow.clear();
        this.fireGlow.fillStyle(SETTLEMENT.fire.glowColor, 0.08 + 0.2 * level);
        this.fireGlow.fillCircle(this.fireX, this.fireBaseY - flameHeight * 0.35, radius * 0.72);
        this.flames.clear();
        const flameW = 18 * this.bgScale;
        for (let index = 0; index < 4; index += 1) {
            const phase = this.fireElapsed * Math.PI * 2 * SETTLEMENT.fire.flickerHz + index * 1.7;
            const height = flameHeight * (0.64 + 0.36 * Math.sin(phase));
            const x = this.fireX + (index - 1.5) * flameW * 0.6;
            this.flames.fillStyle(index % 2 ? 0xff4a19 : 0xffa33c, 0.55 + 0.35 * level);
            this.flames.fillTriangle(
                x - flameW / 2, this.fireBaseY,
                x + flameW / 2, this.fireBaseY,
                x + Math.sin(phase) * flameW * 0.18, this.fireBaseY - height
            );
            this.flames.fillStyle(0xffe18a, 0.68);
            this.flames.fillTriangle(
                x - flameW * 0.22, this.fireBaseY,
                x + flameW * 0.22, this.fireBaseY,
                x + Math.sin(phase) * flameW * 0.1, this.fireBaseY - height * 0.58
            );
        }
    }

    updateDarkness() {
        const context = this.maskContext;
        context.clearRect(0, 0, WIDTH, HEIGHT);
        context.globalCompositeOperation = 'source-over';
        context.fillStyle = `rgba(0,0,0,${SETTLEMENT.darkness.ambientAlpha})`;
        context.fillRect(0, 0, WIDTH, HEIGHT);
        context.globalCompositeOperation = 'destination-out';
        const heroX = this.player.sprite.body.center.x - this.cameras.main.scrollX;
        const heroY = this.floorY - this.cameras.main.scrollY - HERO_STAND_PX * 0.42;
        this.cutLight(heroX, heroY, HERO_STAND_PX * SETTLEMENT.darkness.heroLightRadiusH);
        const fireRadius = HERO_STAND_PX * (
            SETTLEMENT.darkness.fireLightMinRadiusH +
            (SETTLEMENT.darkness.fireLightMaxRadiusH - SETTLEMENT.darkness.fireLightMinRadiusH) * this.fireLevel
        );
        this.cutLight(this.fireX - this.cameras.main.scrollX, this.fireBaseY - this.cameras.main.scrollY, fireRadius);
        context.globalCompositeOperation = 'source-over';
        this.maskTexture.refresh();
    }

    cutLight(x, y, radius) {
        const context = this.maskContext;
        context.globalCompositeOperation = 'destination-out';
        context.fillStyle = '#ffffff';
        for (let ring = 5; ring >= 1; ring -= 1) {
            context.globalAlpha = ring === 5 ? 0.18 : 0.23;
            context.beginPath();
            context.arc(x, y, radius * ring / 5, 0, Math.PI * 2);
            context.fill();
        }
        context.globalAlpha = 1;
        context.globalCompositeOperation = 'source-over';
    }

    update(time, delta) {
        if (!this.player || !this.player.sprite.active || this.transitionStarted) return;
        this.player.update(delta);
        this.updateNpcs(delta);
        this.updateMina(delta);
        this.updateFire(delta);
        this.updateWave(delta);
        this.updateCrawlerPuffs(delta);
        if (this.waveFailElapsed >= 0) this.updateWaveFailure(delta);
        this.updateDarkness();
        this.hud.update(delta);
        this.updateOrbHud();
        this.bubble.update(delta / 1000);
        this.cameraTarget.setX(this.player.sprite.body.center.x);
        if (this.objectiveText.visible) {
            this.objectiveElapsed = (this.objectiveElapsed || 0) + delta / 1000;
            const fx = ACT2_FX.objective;
            const alpha = this.objectiveElapsed < fx.fadeIn
                ? this.objectiveElapsed / fx.fadeIn
                : this.objectiveElapsed < fx.fadeIn + fx.hold
                    ? 0.92 + Math.sin(this.objectiveElapsed * 2 * Math.PI / fx.pulse) * 0.08
                    : Math.max(0, 1 - (this.objectiveElapsed - fx.fadeIn - fx.hold) / fx.fadeOut);
            this.objectiveText.setAlpha(alpha);
            if (this.objectiveElapsed >= fx.fadeIn + fx.hold + fx.fadeOut) this.objectiveText.setVisible(false);
        }
        if (Input.Keyboard.JustDown(this.restartKey)) {
            this.scene.restart({ waveOnly: this.waveOnly });
            return;
        }
        this.runner.update(delta / 1000);
    }

    triggerGameOver() {
        this.beginWaveFailure();
    }

    cleanup() {
        if (this.runner) this.runner.destroy();
        if (this.bubble) this.bubble.destroy();
        if (this.hud) this.hud.destroy();
        for (const crawler of this.wavePool || []) crawler.reset();
        if (this.maskTexture && this.textures.exists(MASK_KEY)) this.textures.remove(MASK_KEY);
    }
}
