import { BlendModes, Input, Scene } from 'phaser';
import BeatRunner from '../story/BeatRunner';
import TruthMonster from '../entities/TruthMonster';
import Player from '../entities/Player';
import PlayerHud from '../ui/PlayerHud';
import WorldBubble from '../ui/WorldBubble';
import { ACT2_FX } from '../config/actTwoData';
import { ACT3_PACING } from '../config/actThreeData';
import { DEBUG_KEYS, HERO_PHYSICS, HERO_STAND_PX } from '../config/animationData';
import {
    ORB_ORDER,
    ORB_NAMES,
    orbHudText,
    ORB_TRUTH,
    TRUTH_BG,
    TRUTH_CAVE_BEATS,
    TRUTH_CAVE_FX,
    TRUTH_MONSTER,
    TRUTH_PACING,
    TRUTH_PHASES,
    TRUTH_SPEAKERS,
} from '../config/actTruthData';

const WIDTH = 1280;
const HEIGHT = 720;
const MASK_KEY = 'truth-cave-darkness';

export default class TruthCaveScene extends Scene {
    constructor() {
        super('TruthCaveScene');
    }

    init(data = {}) {
        this.startBoss = data.startBoss === true;
        this.retryPhase = data.retryPhase === 2 ? 2 : 1;
    }

    create() {
        this.scaleFactor = HEIGHT / TRUTH_BG.cave.h;
        this.worldWidth = TRUTH_BG.cave.w * this.scaleFactor;
        this.worldHeight = TRUTH_BG.cave.h * this.scaleFactor;
        this.floorY = TRUTH_BG.cave.floorFeetY * this.scaleFactor;
        this.cradleX = TRUTH_BG.cave.cradle.x * this.scaleFactor;
        this.cradleY = TRUTH_BG.cave.cradle.y * this.scaleFactor;
        this.altarX = TRUTH_BG.cave.altarX * this.scaleFactor;
        this.elapsed = 0;
        this.emberElapsed = 0;
        this.transitionStarted = false;
        this.handoffStarted = false;
        this.orbCollected = false;
        this.retryElapsed = -1;
        this.retryFadingIn = false;
        this.phaseFlashElapsed = -1;
        this.dissolveActive = false;
        this.orbMode = 'hidden';
        this.orbElapsed = 0;
        this.absorbFlashElapsed = -1;
        this.restartKey = this.input.keyboard.addKey('R');
        if (import.meta.env.DEV && DEBUG_KEYS) {
            this.input.keyboard.addCapture('F5,F7,F8');
            this.debugKeys = this.input.keyboard.addKeys({ skip: 'F5', phase: 'F7', nearDeath: 'F8' });
        }
        if (!Array.isArray(this.registry.get('orbs'))) this.registry.set('orbs', ORB_ORDER.slice(0, 3));

        this.cameras.main.resetFX();
        this.cameras.main.setRoundPixels(true);
        this.cameras.main.setBackgroundColor('#090309');
        this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
        this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);
        if (this.textures.exists(TRUTH_BG.cave.key)) {
            this.add.image(0, 0, TRUTH_BG.cave.key)
                .setOrigin(0, 0).setScale(this.scaleFactor).setDepth(-20);
        } else {
            console.warn('[TruthCaveScene] Cave background is missing.');
            this.add.rectangle(this.worldWidth / 2, this.worldHeight / 2,
                this.worldWidth, this.worldHeight, 0x15070e).setDepth(-20);
        }
        this.floor = this.add.rectangle(this.worldWidth / 2, this.floorY + HERO_STAND_PX * 0.25,
            this.worldWidth, HERO_STAND_PX * 0.5, 0x000000, 0).setVisible(false);
        this.physics.add.existing(this.floor, true);
        this.leftWall = this.add.rectangle(-20, this.floorY - 100, 40, 250, 0, 0).setVisible(false);
        this.rightWall = this.add.rectangle(this.worldWidth + 20, this.floorY - 100, 40, 250, 0, 0).setVisible(false);
        this.physics.add.existing(this.leftWall, true);
        this.physics.add.existing(this.rightWall, true);

        this.createPlayer();
        this.boss = new TruthMonster(this, this.altarX + HERO_STAND_PX * 1.3, this.floorY);
        this.enemies = [this.boss];
        this.player.scene.enemies = this.enemies;
        this.createLighting();
        this.createEmbers();
        this.createUi();
        this.createOrbEffects();
        this.createDissolvePuffs();
        this.fadeOverlay = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x000000, 1)
            .setScrollFactor(0).setDepth(180);
        const desiredScrollY = this.floorY - HEIGHT * 0.78;
        const cameraY = Math.max(0, Math.min(this.worldHeight - HEIGHT, desiredScrollY));
        this.cameraTarget = this.add.zone(this.player.sprite.body.center.x, cameraY + HEIGHT / 2, 1, 1);
        this.cameras.main.startFollow(this.cameraTarget, true, 0.12, 0);

        this.runner = new BeatRunner(this, TRUTH_CAVE_BEATS, this.createHandlers()).start();
        if (this.startBoss) {
            this.boss.beginEmergence();
            this.boss.emergeElapsed = this.boss.emergeDuration;
            this.boss.updateEmergence(0);
            this.fadeOverlay.setAlpha(0).setVisible(false);
            if (this.retryPhase === 2) this.boss.resetForPhase(true);
            this.runner.jumpToId('fight');
        }
        this.events.once('shutdown', () => this.cleanup());
    }

    createPlayer() {
        this.player = new Player(this, TRUTH_BG.cave.heroStartX * this.scaleFactor,
            this.floorY - 50 * this.scaleFactor);
        this.player.moveSpeed = HERO_PHYSICS.moveSpeed;
        this.player.facing = 1;
        this.player.sprite.body.setCollideWorldBounds(true);
        this.physics.add.collider(this.player.sprite, this.floor);
        this.physics.add.collider(this.player.sprite, this.leftWall);
        this.physics.add.collider(this.player.sprite, this.rightWall);
    }

    createLighting() {
        if (this.textures.exists(MASK_KEY)) this.textures.remove(MASK_KEY);
        this.maskTexture = this.textures.createCanvas(MASK_KEY, WIDTH, HEIGHT);
        this.maskContext = this.maskTexture.getContext();
        this.darknessImage = this.add.image(0, 0, MASK_KEY)
            .setOrigin(0, 0).setScrollFactor(0).setDepth(70);
        this.altarGlow = this.add.graphics().setBlendMode(BlendModes.ADD).setDepth(3);
        this.phaseFlash = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT,
            TRUTH_PHASES[0].maskFlash.color, 0)
            .setBlendMode(BlendModes.ADD).setScrollFactor(0).setDepth(145);
        this.drawAltarGlow();
        this.updateDarkness();
    }

    createEmbers() {
        this.embers = Array.from({ length: TRUTH_CAVE_FX.embers.count }, (_unused, index) => {
            const ember = this.add.circle(0, 0, index % 3 === 0 ? 3 : 2,
                TRUTH_CAVE_FX.embers.color, TRUTH_CAVE_FX.embers.alpha)
                .setBlendMode(BlendModes.ADD).setDepth(72).setVisible(false);
            ember.life = 0;
            ember.vx = 0;
            ember.vy = 0;
            return ember;
        });
    }

    createDissolvePuffs() {
        this.dissolvePuffs = Array.from({ length: TRUTH_CAVE_FX.dissolve.puffs }, (_unused, index) => {
            const puff = this.add.circle(0, 0, 4 + index % 4, TRUTH_CAVE_FX.dissolve.smokeColor, 0)
                .setBlendMode(BlendModes.ADD).setDepth(58).setVisible(false);
            puff.index = index;
            puff.elapsed = 0;
            return puff;
        });
    }

    createUi() {
        this.hud = new PlayerHud(this, this.player, { showControls: false, showKills: false });
        this.hud.controlsChipBack.setVisible(false);
        this.hud.controlsChip.setVisible(false);
        this.orbText = this.add.text(WIDTH - 24, 24, '', {
            fontFamily: 'Arial Black', fontSize: `${ACT2_FX.orbHud.fontSize}px`,
            color: `#${ACT2_FX.orbHud.color.toString(16).padStart(6, '0')}`,
            stroke: '#08070d', strokeThickness: 4,
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(110);
        this.updateOrbHud();
        this.bossHealthBack = this.add.rectangle(640, 48, 600, 22, 0x19070d, 0.92)
            .setScrollFactor(0).setDepth(100);
        this.bossHealthBar = this.add.rectangle(344, 48, 584, 12, 0xd33a49)
            .setOrigin(0, 0.5).setScrollFactor(0).setDepth(101);
        this.bossName = this.add.text(640, 16, 'TRUTH MONSTER', {
            fontFamily: 'Arial Black', fontSize: '18px', color: '#ff9889',
            stroke: '#000000', strokeThickness: 4,
        }).setOrigin(0.5).setScrollFactor(0).setDepth(101).setVisible(false);
        this.setBossHudVisible(false);
        this.bubble = new WorldBubble(this, { speakers: TRUTH_SPEAKERS, pacing: TRUTH_PACING });
        this.bubble.setAnchor('hero', () => ({
            x: this.player.sprite.body.center.x,
            y: this.player.sprite.body.bottom - HERO_STAND_PX - 10,
        }));
        this.bubble.setAnchor('truth', () => ({ x: this.boss.hatX, y: this.boss.hatY - 12 }));
    }

    createOrbEffects() {
        this.truthOrb = this.textures.exists(ORB_TRUTH.texture)
            ? this.add.sprite(this.cradleX, this.cradleY, ORB_TRUTH.texture, 0).setOrigin(ORB_TRUTH.originX, ORB_TRUTH.originY)
            : this.add.ellipse(this.cradleX, this.cradleY, HERO_STAND_PX, HERO_STAND_PX,
                ORB_TRUTH.glow.color, 0.9);
        if (!this.textures.exists(ORB_TRUTH.texture)) {
            console.warn('[TruthCaveScene] Orb sheet is missing; using a crimson placeholder.');
        }
        this.truthOrb.setVisible(false).setDepth(14);
        if (this.truthOrb.type === 'Sprite' && this.anims.exists('orb-truth-pulse')) {
            this.truthOrb.play('orb-truth-pulse');
        }
        this.truthOrbGlow = this.add.circle(this.cradleX, this.cradleY,
            HERO_STAND_PX * ORB_TRUTH.glow.radiusH, ORB_TRUTH.glow.color, ORB_TRUTH.glow.alpha)
            .setBlendMode(BlendModes.ADD).setDepth(13).setVisible(false);
        this.absorbFlash = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT,
            ORB_TRUTH.absorbFlash.color, 0)
            .setBlendMode(BlendModes.ADD).setScrollFactor(0).setDepth(150);
        this.bannerBack = this.add.rectangle(WIDTH / 2, HEIGHT / 2, 690, 150, 0x14080d, 0.95)
            .setStrokeStyle(3, ORB_TRUTH.glow.color, 0.95)
            .setScrollFactor(0).setDepth(152).setVisible(false);
        this.bannerTitle = this.add.text(WIDTH / 2, HEIGHT / 2 - 24, ORB_NAMES[ORB_TRUTH.key], {
            fontFamily: 'Arial Black', fontSize: '36px', color: '#ff604e',
            stroke: '#030710', strokeThickness: 7,
        }).setOrigin(0.5).setScrollFactor(0).setDepth(153).setVisible(false);
        this.bannerSub = this.add.text(WIDTH / 2, HEIGHT / 2 + 28, '', {
            fontFamily: 'Arial', fontSize: '22px', color: '#fff0e9',
            stroke: '#030710', strokeThickness: 5,
        }).setOrigin(0.5).setScrollFactor(0).setDepth(153).setVisible(false);
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
            fight: {
                start: () => {
                    this.boss.startFight();
                    this.player.controlsLocked = false;
                    this.setBossHudVisible(true);
                    return {};
                },
                update: () => this.boss.isDefeated,
            },
            goto: {
                start: (beat) => {
                    if (this.handoffStarted) return { elapsed: 0, done: true };
                    this.handoffStarted = true;
                    this.transitionStarted = true;
                    this.bubble.clear();
                    this.fadeElapsed = 0;
                    this.cameras.main.fadeOut(700, 0, 0, 0);
                    return { elapsed: 0, done: false, data: beat.data };
                },
                update: (dt, state) => {
                    if (state.done) return true;
                    state.elapsed += dt;
                    if (state.elapsed < 0.7) return false;
                    const next = 'TruthOutsideScene';
                    if (this.game.scene.keys[next]) this.scene.start(next, state.data || { part: 'reveal' });
                    else {
                        console.warn('[TruthCaveScene] TruthOutsideScene is not registered; returning to MainMenuScene.');
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
            this.fadeOverlay.setAlpha(1).setVisible(true);
            return { name, elapsed: 0, duration: TRUTH_CAVE_FX.fadeIn };
        }
        if (name === 'monsterEmerges') {
            this.boss.beginEmergence();
            this.setBossHudVisible(false);
            return { name, elapsed: 0, duration: TRUTH_CAVE_FX.emerge.seconds };
        }
        if (name === 'monsterDissolves') {
            this.boss.beginDissolve();
            return { name, elapsed: 0, duration: TRUTH_CAVE_FX.dissolve.seconds };
        }
        if (name === 'orbForms') {
            this.orbMode = 'forms';
            this.orbElapsed = 0;
            const fullScale = HERO_STAND_PX * ORB_TRUTH.forms.frameWidthH / ORB_TRUTH.frameWidth;
            this.truthOrb.setPosition(this.cradleX, this.cradleY)
                .setScale(fullScale * ORB_TRUTH.forms.startScale)
                .setAlpha(0).setVisible(true);
            this.truthOrbGlow.setPosition(this.cradleX, this.cradleY).setScale(0.4).setVisible(true);
            return { name, elapsed: 0, duration: ORB_TRUTH.forms.seconds };
        }
        if (name === 'orbToHero') {
            this.orbMode = 'float';
            this.orbElapsed = 0;
            this.orbStartX = this.truthOrb.x;
            this.orbStartY = this.truthOrb.y;
            this.orbStartScale = this.truthOrb.scaleX;
            this.player.controlsLocked = true;
            return {
                name,
                elapsed: 0,
                duration: ORB_TRUTH.floatToHero.seconds + ORB_TRUTH.hud.hold,
            };
        }
        throw new Error(`TruthCaveScene has no FX named "${name}".`);
    }

    updateFx(dt, state) {
        state.elapsed += dt;
        if (state.name === 'fadeIn') {
            this.fadeOverlay.setAlpha(Math.max(0, 1 - state.elapsed / state.duration));
            if (state.elapsed < state.duration) return false;
            this.fadeOverlay.setVisible(false);
            return true;
        }
        if (state.name === 'monsterEmerges') return this.boss.state !== 'emerging';
        if (state.name === 'monsterDissolves') {
            this.updateDissolvePuffs(0, Math.min(1, state.elapsed / state.duration));
            return state.elapsed >= state.duration;
        }
        if (state.name === 'orbForms') {
            const progress = Math.min(1, state.elapsed / state.duration);
            const fullScale = HERO_STAND_PX * ORB_TRUTH.forms.frameWidthH / ORB_TRUTH.frameWidth;
            const pulse = 0.82 + 0.18 * Math.sin(this.elapsed * Math.PI * 2 / ORB_TRUTH.glow.pulseSeconds);
            this.truthOrb.setScale(fullScale * (ORB_TRUTH.forms.startScale + (1 - ORB_TRUTH.forms.startScale) * progress))
                .setAlpha(progress);
            this.truthOrbGlow.setPosition(this.truthOrb.x, this.truthOrb.y)
                .setScale(0.7 + 0.3 * progress).setAlpha(ORB_TRUTH.glow.alpha * pulse);
            return state.elapsed >= state.duration;
        }
        if (state.name === 'orbToHero') return this.updateOrbToHero(state);
        return false;
    }

    updateOrbToHero(state) {
        const floatDuration = ORB_TRUTH.floatToHero.seconds;
        if (state.elapsed < floatDuration) {
            const progress = Math.min(1, state.elapsed / floatDuration);
            const heroX = this.player.sprite.body.center.x;
            const heroY = this.player.sprite.body.bottom - HERO_STAND_PX * 0.55;
            const heldScale = HERO_STAND_PX * ORB_TRUTH.floatToHero.heldFrameWidthH / ORB_TRUTH.frameWidth;
            const bob = Math.sin(state.elapsed * Math.PI * 2) * ORB_TRUTH.floatToHero.bobPx;
            this.truthOrb.setPosition(
                this.orbStartX + (heroX - this.orbStartX) * progress,
                this.orbStartY + (heroY - this.orbStartY) * progress + bob
            ).setScale(this.orbStartScale + (heldScale - this.orbStartScale) * progress);
            this.truthOrbGlow.setPosition(this.truthOrb.x, this.truthOrb.y).setScale(1 - progress * 0.55);
            return false;
        }
        if (!state.collected) {
            state.collected = true;
            this.truthOrb.setVisible(false);
            this.truthOrbGlow.setVisible(false);
            this.absorbFlashElapsed = 0;
            this.absorbFlash.setAlpha(0.85);
            if (!this.orbCollected) {
                const current = this.registry.get('orbs');
                const orbs = Array.isArray(current) ? current : [];
                if (ORB_ORDER.includes(ORB_TRUTH.key) && !orbs.includes(ORB_TRUTH.key)) {
                    this.registry.set('orbs', [...orbs, ORB_TRUTH.key]);
                }
                this.orbCollected = true;
                this.updateOrbHud();
                this.bannerSub.setText(orbHudText(this.orbCount));
                this.bannerBack.setVisible(true).setAlpha(1);
                this.bannerTitle.setVisible(true).setAlpha(1);
                this.bannerSub.setVisible(true).setAlpha(1);
            }
        }
        this.bannerBack.setAlpha(Math.max(0, 1 - (state.elapsed - floatDuration) / ORB_TRUTH.hud.hold));
        this.bannerTitle.setAlpha(this.bannerBack.alpha);
        this.bannerSub.setAlpha(this.bannerBack.alpha);
        if (state.elapsed >= state.duration) {
            this.bannerBack.setVisible(false);
            this.bannerTitle.setVisible(false);
            this.bannerSub.setVisible(false);
            this.player.controlsLocked = false;
            this.orbMode = 'collected';
            return true;
        }
        return false;
    }

    startPhaseBreak(phase) {
        this.phaseFlashElapsed = 0;
        this.cameras.main.shake(phase.shake.duration * 1000, phase.shake.intensity);
        const line = phase.lines[0];
        this.bubble.say({
            who: line.who,
            text: line.text,
            onDone: () => {
                if (this.sys.isActive() && this.boss && !this.boss.isDefeated) {
                    this.boss.phaseBreakDone = true;
                }
            },
        });
    }

    triggerGameOver() {
        if (this.retryElapsed >= 0 || this.transitionStarted) return;
        this.retryPhase = this.boss.phaseTwo ? 2 : 1;
        this.retryElapsed = 0;
        this.retryFadingIn = false;
        this.player.controlsLocked = true;
        this.player.forcedWalkDirection = 0;
        this.player.forcedWalkSpeed = 0;
        this.fadeOverlay.setVisible(true).setAlpha(0);
        this.bubble.clear();
    }

    updateRetry(delta) {
        const duration = TRUTH_CAVE_FX.fadeIn;
        this.retryElapsed += delta / 1000;
        if (!this.retryFadingIn) {
            this.fadeOverlay.setAlpha(Math.min(1, this.retryElapsed / duration));
            if (this.retryElapsed < duration) return;
            this.boss.resetForPhase(this.retryPhase === 2);
            this.setPlayerStart();
            this.player.health = this.player.maxHealth;
            this.player.isGameOver = false;
            this.player.invulnerableTimer = 0;
            this.player.visual.setAlpha(1);
            this.player.controlsLocked = true;
            this.retryElapsed = 0;
            this.retryFadingIn = true;
            this.updateBossHud();
            return;
        }
        this.fadeOverlay.setAlpha(Math.max(0, 1 - this.retryElapsed / duration));
        if (this.retryElapsed >= duration) {
            this.retryElapsed = -1;
            this.fadeOverlay.setVisible(false);
            this.player.controlsLocked = false;
        }
    }

    setPlayerStart() {
        const x = TRUTH_BG.cave.heroStartX * this.scaleFactor;
        this.player.sprite.setPosition(x, this.player.sprite.y);
        this.player.sprite.body.reset(x, this.player.sprite.y);
        this.player.visual.setPosition(this.player.sprite.body.center.x, this.player.sprite.body.bottom);
    }

    updateBossHud() {
        if (!this.bossHealthBar || !this.bossHealthBar.active) return;
        this.bossHealthBar.setSize(584 * Math.max(0, this.boss.health / this.boss.maxHealth), 12);
    }

    setBossHudVisible(visible) {
        this.bossHealthBack.setVisible(visible);
        this.bossHealthBar.setVisible(visible);
        this.bossName.setVisible(visible);
    }

    updateOrbHud() {
        const orbs = this.registry.get('orbs');
        this.orbCount = Array.isArray(orbs) ? orbs.length : 0;
        this.orbText.setText(orbHudText(this.orbCount));
    }

    startDissolvePuffs() {
        this.dissolveActive = true;
        for (const puff of this.dissolvePuffs) {
            puff.elapsed = 0;
            puff.setVisible(true).setAlpha(0);
        }
    }

    updateDissolvePuffs(deltaSeconds, progress) {
        if (!this.dissolveActive) return;
        const bossX = this.boss.x;
        const startY = this.floorY - this.boss.height * 0.55;
        const targetX = this.cradleX;
        const targetY = this.cradleY;
        const stream = TRUTH_CAVE_FX.dissolve.streamSeconds;
        for (const puff of this.dissolvePuffs) {
            puff.elapsed += deltaSeconds;
            const stagger = (puff.index / this.dissolvePuffs.length) * stream * 0.7;
            const t = Math.max(0, Math.min(1, (puff.elapsed - stagger) / stream));
            const controlX = (bossX + targetX) * 0.5;
            const controlY = Math.min(startY, targetY) - HERO_STAND_PX * (0.5 + (puff.index % 5) * 0.14);
            const inverse = 1 - t;
            const x = inverse * inverse * bossX + 2 * inverse * t * controlX + t * t * targetX;
            const y = inverse * inverse * startY + 2 * inverse * t * controlY + t * t * targetY;
            puff.setPosition(x, y).setAlpha(t > 0 && t < 1 ? (1 - t) * 0.8 : 0);
        }
        if (progress >= 1) this.finishDissolvePuffs();
    }

    finishDissolvePuffs() {
        this.dissolveActive = false;
        for (const puff of this.dissolvePuffs) puff.setVisible(false);
    }

    emitEmber() {
        const ember = this.embers.find((candidate) => candidate.life <= 0);
        if (!ember) return;
        ember.life = 1.4 + Math.random() * 1.4;
        ember.vx = (Math.random() - 0.5) * 30;
        ember.vy = -12 - Math.random() * 24;
        ember.setPosition(this.cradleX + (Math.random() - 0.5) * HERO_STAND_PX * 6,
            this.floorY - Math.random() * HERO_STAND_PX * 2).setVisible(true).setAlpha(0.7);
    }

    updateEmbers(seconds) {
        for (const ember of this.embers) {
            if (ember.life <= 0) continue;
            ember.life = Math.max(0, ember.life - seconds);
            ember.x += ember.vx * seconds;
            ember.y += ember.vy * seconds;
            ember.vy -= 2 * seconds;
            ember.setAlpha(TRUTH_CAVE_FX.embers.alpha * Math.min(1, ember.life));
            if (ember.life === 0) ember.setVisible(false);
        }
        this.emberElapsed += seconds;
        if (this.emberElapsed >= 0.08) {
            this.emberElapsed %= 0.08;
            this.emitEmber();
        }
    }

    drawAltarGlow() {
        const pulse = 0.82 + 0.18 * Math.sin(
            this.elapsed * Math.PI * 2 / TRUTH_CAVE_FX.ambient.altarGlow.pulseSeconds
        );
        const glow = TRUTH_CAVE_FX.ambient.altarGlow;
        this.altarGlow.clear();
        for (let ring = 5; ring >= 1; ring -= 1) {
            this.altarGlow.fillStyle(glow.color, glow.alpha * pulse * (0.035 + ring * 0.014));
            this.altarGlow.fillCircle(this.cradleX, this.cradleY,
                HERO_STAND_PX * glow.radiusH * ring / 5);
        }
    }

    updateDarkness() {
        const context = this.maskContext;
        context.clearRect(0, 0, WIDTH, HEIGHT);
        context.globalCompositeOperation = 'source-over';
        context.fillStyle = `rgba(0,0,0,${TRUTH_CAVE_FX.ambient.darkAlpha})`;
        context.fillRect(0, 0, WIDTH, HEIGHT);
        context.globalCompositeOperation = 'destination-out';
        const camera = this.cameras.main;
        const hero = this.player.sprite.body;
        this.cutLight(hero.center.x - camera.scrollX, hero.center.y - camera.scrollY,
            HERO_STAND_PX * TRUTH_CAVE_FX.ambient.heroLightRadiusH);
        this.cutLight(this.cradleX - camera.scrollX, this.cradleY - camera.scrollY,
            HERO_STAND_PX * TRUTH_CAVE_FX.ambient.altarGlow.radiusH * 1.4);
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

    update(_time, delta) {
        if (this.transitionStarted || !this.player || !this.player.sprite.active) return;
        const seconds = delta / 1000;
        this.elapsed += seconds;
        if (this.retryElapsed >= 0) {
            this.player.update(delta);
            this.boss.update(seconds, this.player);
            this.updateRetry(delta);
            this.hud.update(delta);
            this.updateEmbers(seconds);
            this.drawAltarGlow();
            this.updateDarkness();
            return;
        }

        this.player.update(delta);
        this.boss.update(seconds, this.player);
        this.cameraTarget.setX(this.player.sprite.body.center.x);
        this.hud.update(delta);
        this.updateBossHud();
        this.updateOrbHud();
        this.bubble.update(seconds);
        this.updateEmbers(seconds);
        this.drawAltarGlow();
        this.updateDarkness();
        this.updateOrbFx(seconds);
        if (this.phaseFlashElapsed >= 0) {
            this.phaseFlashElapsed += seconds;
            const duration = TRUTH_PHASES[0].maskFlash.seconds;
            this.phaseFlash.setAlpha(0.28 * Math.max(0, 1 - this.phaseFlashElapsed / duration));
            if (this.phaseFlashElapsed >= duration) {
                this.phaseFlashElapsed = -1;
                this.phaseFlash.setAlpha(0);
            }
        }
        if (this.absorbFlashElapsed >= 0) {
            this.absorbFlashElapsed += seconds;
            this.absorbFlash.setAlpha(0.85 * Math.max(0,
                1 - this.absorbFlashElapsed / ORB_TRUTH.absorbFlash.seconds));
            if (this.absorbFlashElapsed >= ORB_TRUTH.absorbFlash.seconds) {
                this.absorbFlashElapsed = -1;
                this.absorbFlash.setAlpha(0);
            }
        }
        if (this.debugKeys && DEBUG_KEYS) {
            if (Input.Keyboard.JustDown(this.debugKeys.skip) && this.runner.index < 5) {
                this.runner.jumpToId('fight');
            }
            if (Input.Keyboard.JustDown(this.debugKeys.phase) && this.boss.combatStarted) {
                this.boss.health = this.boss.maxHealth * 0.51;
                this.updateBossHud();
            }
            if (Input.Keyboard.JustDown(this.debugKeys.nearDeath) && this.boss.combatStarted) {
                this.boss.health = 1;
                this.updateBossHud();
            }
        }
        if (Input.Keyboard.JustDown(this.restartKey)) {
            this.scene.restart({ startBoss: this.startBoss, retryPhase: this.retryPhase });
            return;
        }
        this.runner.update(seconds);
    }

    updateOrbFx(seconds) {
        if (this.orbMode === 'forms' || this.orbMode === 'float') {
            const pulse = 0.82 + 0.18 * Math.sin(this.elapsed * Math.PI * 2 / ORB_TRUTH.glow.pulseSeconds);
            if (this.truthOrbGlow.visible) this.truthOrbGlow.setAlpha(ORB_TRUTH.glow.alpha * pulse);
        }
    }

    cleanup() {
        if (this.runner) this.runner.destroy();
        if (this.bubble) this.bubble.destroy();
        if (this.hud) this.hud.destroy();
        if (this.maskTexture && this.textures.exists(MASK_KEY)) this.textures.remove(MASK_KEY);
    }
}