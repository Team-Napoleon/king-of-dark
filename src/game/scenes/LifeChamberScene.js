import { BlendModes, Input, Scene } from 'phaser';
import BeatRunner from '../story/BeatRunner';
import Crawler from '../entities/Crawler';
import Player from '../entities/Player';
import PlayerHud from '../ui/PlayerHud';
import WorldBubble from '../ui/WorldBubble';
import { ACT3_PACING, ACT3_SPEAKERS } from '../config/actThreeData';
import { CHAMBER, CHAMBER_BEATS, CRAWLER, LIFE_ASSETS, LIFE_FAIL, WAVES } from '../config/lifeData';
import { DEBUG_KEYS, HERO_MOVES, HERO_PHYSICS, HERO_STAND_PX } from '../config/animationData';
import { LIFE_FLOW } from '../config/lifeAfterData';
import { TIME_DEBUG } from '../config/timeData';
import { ORB_NAMES, ORB_ORDER, orbHudText } from '../config/actTruthData';

const WIDTH = 1280;
const HEIGHT = 720;
const MASK_KEY = 'life-chamber-darkness';

function normalizeBeats(beats) {
    return beats.map((beat, index) => ({
        ...beat,
        id: beat.t === 'wave' ? 'wave' : `life-chamber-${index}`,
        type: beat.t,
    }));
}

export default class LifeChamberScene extends Scene {
    constructor() {
        super(CHAMBER.scene);
    }

    init(data = {}) {
        this.waveOnly = data.waveOnly === true;
    }

    create() {
        this.bgScale = Math.max(HEIGHT / LIFE_ASSETS.insideBg.h, HERO_STAND_PX / 85);
        this.worldWidth = LIFE_ASSETS.insideBg.w * this.bgScale;
        this.worldHeight = LIFE_ASSETS.insideBg.h * this.bgScale;
        this.floorY = CHAMBER.floorFeetY * this.bgScale;
        this.transitionStarted = false;
        this.handoffStarted = false;
        this.sceneElapsed = 0;
        this.waveElapsed = 0;
        this.waveKills = 0;
        this.waveSpawnIndex = 0;
        this.waveRunning = false;
        this.waveFinished = false;
        this.waveFailElapsed = -1;
        this.waveFailFadingIn = false;
        this.lightElapsed = 0;
        this.ringGlowLevel = CHAMBER.ringGlow.levelStart;
        this.orbCount = -1;
        this.hudOrbPulse = -1;
        this.absorbFlashElapsed = -1;
        this.lifeHudColor = `#${LIFE_ASSETS.orb.hudColor.toString(16).padStart(6, '0')}`;
        this.debugKeysEnabled = import.meta.env.DEV && (TIME_DEBUG || DEBUG_KEYS);
        this.debugGrid = import.meta.env.DEV && typeof window !== 'undefined' &&
            new URLSearchParams(window.location.search).get('debug') === 'grid';

        this.cameras.main.resetFX();
        this.cameras.main.setRoundPixels(true);
        this.cameras.main.setBackgroundColor('#100d14');
        this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
        this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);

        if (this.textures.exists(LIFE_ASSETS.insideBg.key)) {
            this.background = this.add.image(0, 0, LIFE_ASSETS.insideBg.key)
                .setOrigin(0, 0)
                .setScale(this.bgScale)
                .setDepth(-20);
        } else {
            console.warn(`[LifeChamberScene] Missing "${LIFE_ASSETS.insideBg.key}"; using placeholder background.`);
            this.background = this.add.rectangle(
                this.worldWidth / 2,
                this.worldHeight / 2,
                this.worldWidth,
                this.worldHeight,
                0x211c26
            ).setDepth(-20);
        }

        this.floor = this.add.rectangle(
            this.worldWidth / 2,
            this.floorY + HERO_STAND_PX * 0.25,
            this.worldWidth,
            HERO_STAND_PX * 0.5,
            0x000000,
            0
        ).setVisible(false);
        this.physics.add.existing(this.floor, true);

        this.player = new Player(
            this,
            CHAMBER.heroEnterFromX * this.bgScale,
            this.floorY - 50 * this.bgScale
        );
        this.player.moveSpeed = HERO_PHYSICS.moveSpeed;
        this.physics.add.collider(this.player.sprite, this.floor);
        this.wavePool = Array.from({ length: WAVES.chamber.total }, (_unused, index) =>
            new Crawler(this, index)
        );
        this.enemies = this.wavePool;
        this.fireX = CHAMBER.landmarks.ring.x * this.bgScale;
        this.fireLevel = CHAMBER.ringGlow.levelStart;
        this.fireLevelTarget = this.fireLevel;
        this.hud = new PlayerHud(this, this.player, { showControls: false, showKills: false });
        this.hud.controlsChipBack.setVisible(false);
        this.hud.controlsChip.setVisible(false);

        this.walkTargetX = CHAMBER.heroStopX * this.bgScale;
        this.walkingIn = !this.waveOnly;
        if (this.waveOnly) {
            this.setHeroPosition(this.walkTargetX);
            this.player.controlsLocked = false;
        } else {
            this.player.controlsLocked = true;
            this.player.forcedWalkDirection = 1;
            this.player.forcedWalkSpeed = HERO_PHYSICS.moveSpeed;
        }
        this.fadeElapsed = 0;
        this.fadeDuration = 1;
        this.fadeOverlay = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x000000, 1)
            .setScrollFactor(0)
            .setDepth(150);
        if (this.waveOnly) this.fadeOverlay.setAlpha(0).setVisible(false);
        this.ringX = CHAMBER.landmarks.ring.x * this.bgScale;
        this.ringY = CHAMBER.landmarks.ring.y * this.bgScale;
        this.createChamberLighting();
        this.createOrbEffects();
        this.restartKey = this.input.keyboard.addKey('R');
        if (this.debugKeysEnabled) {
            this.input.keyboard.addCapture('F5');
            this.killWaveKey = this.input.keyboard.addKey('F5');
        }
        this.createBubble();
        const desiredScrollY = this.floorY - HEIGHT * 0.78;
        const cameraScrollY = Math.max(0, Math.min(this.worldHeight - HEIGHT, desiredScrollY));
        this.cameraTarget = this.add.zone(
            this.player.sprite.body.center.x,
            cameraScrollY + HEIGHT / 2,
            1,
            1
        );
        this.cameras.main.startFollow(this.cameraTarget, true, 0.12, 0);

        const beats = this.waveOnly
            ? [{ id: 'wave', type: 'wave', idData: 'chamber' }]
            : normalizeBeats(CHAMBER_BEATS);
        this.runner = new BeatRunner(this, beats, this.createHandlers()).start();
        this.crawlerPuffs = Array.from({ length: WAVES.chamber.total * 2 }, () =>
            this.add.circle(0, 0, 16, 0x57253f, 0.8)
                .setBlendMode(BlendModes.ADD)
                .setDepth(9)
                .setVisible(false)
        );
        this.crawlerPuffs.forEach((puff) => { puff.life = 0; });
        if (this.debugGrid) this.createGrid();
        this.events.once('shutdown', () => this.cleanup());
    }

    update(_time, delta) {
        if (this.transitionStarted || !this.player || !this.player.sprite.active) return;

        this.sceneElapsed += delta / 1000;
        this.player.update(delta);
        this.cameraTarget.setX(this.player.sprite.body.center.x);
        this.updateChamberLighting(delta);
        this.updateWave(delta);
        this.updateCrawlerPuffs(delta);
        if (this.waveFailElapsed >= 0) this.updateWaveFailure(delta);
        this.updateRingLevel(delta);
        this.hud.update(delta);
        this.updateOrbHud();
        this.updateOrbEffects(delta);
        this.bubble.update(delta / 1000);

        if (this.walkingIn) {
            const body = this.player.sprite.body;
            const distance = this.walkTargetX - body.center.x;
            if (distance <= 1) {
                body.setVelocityX(0);
                this.player.forcedWalkDirection = 0;
                this.player.controlsLocked = false;
                this.walkingIn = false;
            }
        }

        if (this.fadeElapsed < this.fadeDuration) {
            this.fadeElapsed += delta / 1000;
            this.fadeOverlay.setAlpha(Math.max(0, 1 - this.fadeElapsed / this.fadeDuration));
            if (this.fadeElapsed >= this.fadeDuration) this.fadeOverlay.setVisible(false);
        }

        if (Input.Keyboard.JustDown(this.restartKey)) {
            this.scene.restart({ waveOnly: this.waveOnly });
            return;
        }
        if (this.killWaveKey && Input.Keyboard.JustDown(this.killWaveKey)) {
            for (const crawler of this.wavePool) {
                if (!crawler.inUse || crawler.state === 'dying') continue;
                crawler.untargetable = false;
                for (let hit = 0; hit < CRAWLER.hitsToKill.punch; hit += 1) {
                    crawler.applyDamage(HERO_MOVES.punch.damage, this.player.sprite.body.center.x);
                }
            }
        }
        this.runner.update(delta / 1000);
    }

    createBubble() {
        this.bubble = new WorldBubble(this, {
            speakers: ACT3_SPEAKERS,
            pacing: ACT3_PACING,
        });
        this.bubble.setAnchor('hero', () => ({
            x: this.player.sprite.body.center.x,
            y: this.floorY - HERO_STAND_PX - 12,
        }));
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
                    this.bubble.say({
                        who: beat.who,
                        text: beat.text,
                        onDone: () => { state.done = true; },
                    });
                    return state;
                },
                update: (_dt, state) => state.done,
            },
            wait: {
                start: (beat) => ({ elapsed: 0, duration: beat.seconds }),
                update: (dt, state) => {
                    state.elapsed += dt;
                    return state.elapsed >= state.duration;
                },
            },
            wave: {
                start: () => {
                    this.beginWave();
                    return {};
                },
                update: () => !this.waveRunning && this.waveFinished,
            },
            goto: {
                start: (beat) => {
                    if (this.handoffStarted) return { done: true };
                    this.handoffStarted = true;
                    this.transitionStarted = true;
                    this.bubble.clear();
                    const sceneKey = beat.scene || LIFE_FLOW.after;
                    if (this.game.scene.keys[sceneKey]) this.scene.start(sceneKey);
                    else {
                        console.warn(`[LifeChamberScene] Scene "${sceneKey}" is not registered; returning to MainMenuScene.`);
                        this.scene.start(LIFE_FLOW.nextFallback);
                    }
                    return { done: true };
                },
                update: (_dt, state) => state.done,
            },
        };
    }

    startFx(name, beat) {
        if (name === 'fadeIn') return { name, elapsed: 0, duration: beat.seconds || 1 };
        if (name === 'heroWalksIn') {
            const distance = this.walkTargetX - this.player.sprite.body.center.x;
            return { name, elapsed: 0, duration: Math.max(0, distance / HERO_PHYSICS.moveSpeed) };
        }
        if (name === 'orbRises') {
            this.ringGlowLevel = CHAMBER.ringGlow.levelEnd;
            this.fireLevelTarget = CHAMBER.ringGlow.levelEnd;
            this.orb.setPosition(this.ringX, this.ringY).setVisible(true).setAlpha(1).setScale(this.orbBaseScale);
            this.orbGlow.setPosition(this.ringX, this.ringY).setScale(1).setAlpha(0.3).setVisible(true);
            if (this.textures.exists(LIFE_ASSETS.orb.key) && this.anims.exists(LIFE_ASSETS.orb.anim)) {
                this.orb.play(LIFE_ASSETS.orb.anim, true);
            }
            this.cameras.main.shake(180, 0.0035);
            return { name, elapsed: 0, duration: CHAMBER.orbRise.riseSeconds };
        }
        if (name === 'orbToHero') {
            this.orbStartX = this.orb.x;
            this.orbStartY = this.orb.y;
            this.orbStartScale = this.orb.scaleX;
            return { name, elapsed: 0, duration: CHAMBER.orbRise.floatToHeroSeconds };
        }
        if (name === 'bannerOrb') {
            this.bannerTitle.setText(ORB_NAMES[LIFE_FLOW.orbId]);
            this.bannerSub.setText(beat.sub || 'Life holds on.');
            this.bannerBack.setVisible(true).setAlpha(0);
            this.bannerTitle.setVisible(true).setAlpha(0);
            this.bannerSub.setVisible(true).setAlpha(0);
            return { name, elapsed: 0, duration: 2.2 };
        }
        if (name === 'orbCollected') {
            const current = this.registry.get('orbs');
            const orbs = Array.isArray(current) ? current : [];
            const orbId = beat.orb || LIFE_FLOW.orbId;
            if (ORB_ORDER.includes(orbId) && !orbs.includes(orbId)) {
                this.registry.set('orbs', [...orbs, orbId]);
            }
            this.updateOrbHud(true);
            this.hudOrbPulse = 0;
            return { name, elapsed: 0, duration: 0.4 };
        }
        if (name === 'fadeOut') {
            this.player.controlsLocked = true;
            this.fadeOverlay.setVisible(true).setAlpha(0);
            return { name, elapsed: 0, duration: beat.seconds || 1 };
        }
        return { name, elapsed: 0, duration: 0 };
    }

    updateFx(name, dt, state) {
        state.elapsed += dt;
        if (name === 'fadeIn') {
            this.fadeOverlay.setAlpha(Math.max(0, 1 - state.elapsed / state.duration));
            if (state.elapsed < state.duration) return false;
            this.fadeOverlay.setVisible(false);
            return true;
        }
        if (name === 'heroWalksIn') {
            if (state.elapsed < state.duration) return false;
            this.positionHeroAtStop();
            this.walkingIn = false;
            return true;
        }
        if (name === 'orbRises') {
            const progress = Math.min(1, state.elapsed / state.duration);
            const rise = CHAMBER.orbRise.riseArt * this.bgScale * progress;
            const pulse = 0.78 + 0.22 * Math.sin(this.sceneElapsed * Math.PI * 2 / LIFE_ASSETS.orb.glow.pulseSeconds);
            this.orb.setPosition(this.ringX, this.ringY - rise);
            this.orbGlow.setPosition(this.orb.x, this.orb.y).setAlpha(0.24 + 0.12 * pulse);
            return state.elapsed >= state.duration;
        }
        if (name === 'orbToHero') {
            const progress = Math.min(1, state.elapsed / state.duration);
            const heroX = this.player.sprite.body.center.x;
            const heroY = this.player.sprite.body.bottom - HERO_STAND_PX * 0.55;
            const targetScale = this.orbHeldScale;
            const bob = Math.sin(state.elapsed * Math.PI * 2 * CHAMBER.orbRise.bobHz) *
                CHAMBER.orbRise.bobArt * this.bgScale * (1 - progress);
            this.orb.setPosition(
                this.orbStartX + (heroX - this.orbStartX) * progress,
                this.orbStartY + (heroY - this.orbStartY) * progress + bob
            ).setScale(this.orbStartScale + (targetScale - this.orbStartScale) * progress);
            this.orbGlow.setPosition(this.orb.x, this.orb.y).setScale(1 - progress * 0.55);
            if (progress >= 1) {
                this.orb.setVisible(false);
                this.orbGlow.setVisible(false);
                this.orbFlash.setAlpha(0.85);
                this.absorbFlashElapsed = 0;
                return true;
            }
            return false;
        }
        if (name === 'bannerOrb') {
            const alpha = Math.min(1, state.elapsed / 0.35);
            this.bannerBack.setAlpha(alpha);
            this.bannerTitle.setAlpha(alpha);
            this.bannerSub.setAlpha(alpha);
            if (state.elapsed >= state.duration) {
                this.bannerBack.setVisible(false);
                this.bannerTitle.setVisible(false);
                this.bannerSub.setVisible(false);
                return true;
            }
            return false;
        }
        if (name === 'orbCollected') return state.elapsed >= state.duration;
        if (name === 'fadeOut') {
            this.fadeOverlay.setAlpha(Math.min(1, state.elapsed / state.duration));
            return state.elapsed >= state.duration;
        }
        return true;
    }

    positionHeroAtStop() {
        const body = this.player.sprite.body;
        this.player.sprite.setX(this.walkTargetX);
        body.reset(this.walkTargetX, this.player.sprite.y);
        this.player.visual.setX(this.walkTargetX);
        this.player.controlsLocked = false;
        this.player.forcedWalkDirection = 0;
        this.player.forcedWalkSpeed = 0;
    }

    setHeroPosition(x) {
        this.player.sprite.setX(x);
        this.player.sprite.body.reset(x, this.player.sprite.y);
        this.player.visual.setX(x);
    }

    beginWave() {
        if (this.waveRunning) return;
        this.waveRunning = true;
        this.waveFinished = false;
        this.waveElapsed = 0;
        this.waveSpawnIndex = 0;
        this.waveKills = 0;
        this.ringGlowLevel = CHAMBER.ringGlow.levelStart;
        this.fireLevel = this.ringGlowLevel;
        this.fireLevelTarget = this.ringGlowLevel;
        this.player.controlsLocked = false;
        this.player.isGameOver = false;
    }

    updateWave(delta) {
        if (!this.waveRunning || this.waveFailElapsed >= 0) return;
        const seconds = delta / 1000;
        this.waveElapsed += seconds;
        const wave = WAVES.chamber;
        if (this.waveSpawnIndex < wave.spawns.length &&
            this.waveElapsed >= wave.spawns[this.waveSpawnIndex].t) {
            let alive = 0;
            let available = null;
            for (const crawler of this.wavePool) {
                if (crawler.inUse && !crawler.isDefeated) alive += 1;
                if (!available && !crawler.inUse) available = crawler;
            }
            if (alive < wave.maxAlive && available) {
                const spawn = wave.spawns[this.waveSpawnIndex];
                const rawX = wave.spawnX[spawn.side] * this.bgScale;
                const spawnX = Math.max(
                    available.length / 2,
                    Math.min(this.worldWidth - available.length / 2, rawX)
                );
                if (available.spawn(spawnX, spawn.side === 'left' ? 1 : -1)) {
                    this.waveSpawnIndex += 1;
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
        this.fireLevelTarget = CHAMBER.ringGlow.levelStart +
            (CHAMBER.ringGlow.levelEnd - CHAMBER.ringGlow.levelStart) *
            (this.waveKills / wave.total);
        if (this.waveSpawnIndex >= wave.total && alive === 0) {
            this.waveRunning = false;
            this.waveFinished = true;
        }
        if (this.player.health <= 0 && this.waveFailElapsed < 0) this.beginWaveFailure();
    }

    separateCrawlers() {
        for (let leftIndex = 0; leftIndex < this.wavePool.length; leftIndex += 1) {
            const left = this.wavePool[leftIndex];
            if (!left.inUse || left.isDefeated) continue;
            for (let rightIndex = leftIndex + 1; rightIndex < this.wavePool.length; rightIndex += 1) {
                const right = this.wavePool[rightIndex];
                if (!right.inUse || right.isDefeated) continue;
                const gap = CRAWLER.separation * Math.min(left.length, right.length);
                const dx = right.x - left.x;
                if (Math.abs(dx) < gap) {
                    const push = (gap - Math.abs(dx)) / 2;
                    left.setX(left.x - Math.sign(dx || 1) * push);
                    right.setX(right.x + Math.sign(dx || 1) * push);
                }
            }
        }
    }

    onCrawlerKilled() {
        this.waveKills = Math.min(WAVES.chamber.total, this.waveKills + 1);
    }

    emitCrawlerPuff(x, y) {
        const puff = this.crawlerPuffs.find((candidate) => candidate.life <= 0);
        if (!puff) return;
        puff.life = 0.45;
        puff.setPosition(x, y).setAlpha(0.8).setVisible(true);
    }

    updateCrawlerPuffs(delta) {
        const seconds = delta / 1000;
        for (const puff of this.crawlerPuffs || []) {
            if (puff.life <= 0) continue;
            puff.life = Math.max(0, puff.life - seconds);
            puff.setAlpha(puff.life / 0.45);
            puff.setScale(1 + (0.45 - puff.life) * 1.6);
            if (puff.life === 0) puff.setVisible(false);
        }
    }

    updateRingLevel(delta) {
        this.ringGlowLevel += (this.fireLevelTarget - this.ringGlowLevel) * Math.min(1, delta / 1000);
        this.fireLevel = this.ringGlowLevel;
    }

    beginWaveFailure() {
        if (this.waveFailElapsed >= 0 || !this.waveRunning) return;
        this.waveFailElapsed = 0;
        this.waveFailFadingIn = false;
        this.player.controlsLocked = true;
        this.player.forcedWalkDirection = 0;
        this.fadeOverlay.setVisible(true).setAlpha(0);
        this.failText = this.add.text(WIDTH / 2, HEIGHT / 2, 'THE CHAMBER CLAIMED YOU\nThe wave begins again', {
            fontFamily: 'Arial Black',
            fontSize: '30px',
            color: '#f5d7e7',
            stroke: '#000000',
            strokeThickness: 7,
            align: 'center',
        }).setOrigin(0.5).setScrollFactor(0).setDepth(151);
    }

    updateWaveFailure(delta) {
        const seconds = delta / 1000;
        this.waveFailElapsed += seconds;
        if (!this.waveFailFadingIn) {
            this.fadeOverlay.setAlpha(Math.min(1, this.waveFailElapsed / LIFE_FAIL.fadeOut));
            if (this.waveFailElapsed < LIFE_FAIL.fadeOut) return;
            for (const crawler of this.wavePool) crawler.reset();
            this.waveSpawnIndex = 0;
            this.waveKills = 0;
            this.waveElapsed = 0;
            this.waveRunning = true;
            this.waveFinished = false;
            this.ringGlowLevel = CHAMBER.ringGlow.levelStart;
            this.fireLevelTarget = this.ringGlowLevel;
            this.setHeroPosition(CHAMBER.heroStopX * this.bgScale);
            this.player.health = this.player.maxHealth * LIFE_FAIL.healthRestore;
            this.player.isGameOver = false;
            this.player.invulnerableTimer = 0;
            this.player.visual.setAlpha(1);
            this.player.controlsLocked = false;
            this.waveFailElapsed = 0;
            this.waveFailFadingIn = true;
            return;
        }
        this.fadeOverlay.setAlpha(Math.max(0, 1 - this.waveFailElapsed / LIFE_FAIL.fadeOut));
        if (this.waveFailElapsed >= LIFE_FAIL.fadeOut) {
            this.waveFailElapsed = -1;
            this.fadeOverlay.setVisible(false);
            if (this.failText) this.failText.destroy();
            this.failText = null;
        }
    }

    updateOrbHud(force = false) {
        const orbs = this.registry.get('orbs');
        const count = Array.isArray(orbs) ? orbs.length : 0;
        if (force || count !== this.orbCount) {
            this.orbCount = count;
            this.orbText.setText(orbHudText(count));
        }
        if (this.hudOrbPulse < 0) this.orbText.setColor(this.lifeHudColor).setAlpha(1);
    }

    updateOrbEffects(delta) {
        if (this.absorbFlashElapsed >= 0) {
            this.absorbFlashElapsed += delta / 1000;
            this.orbFlash.setAlpha(0.85 * Math.max(0,
                1 - this.absorbFlashElapsed / CHAMBER.orbRise.absorbFlashSeconds));
            if (this.absorbFlashElapsed >= CHAMBER.orbRise.absorbFlashSeconds) {
                this.absorbFlashElapsed = -1;
                this.orbFlash.setAlpha(0);
            }
        }
        if (this.hudOrbPulse >= 0) {
            this.hudOrbPulse += delta / 1000;
            this.orbText.setColor(this.lifeHudColor)
                .setAlpha(0.6 + 0.4 * Math.max(0, 1 - this.hudOrbPulse / 1.2));
            if (this.hudOrbPulse >= 1.2) this.hudOrbPulse = -1;
        }
    }

    createGrid() {
        this.gridGraphics = this.add.graphics().setDepth(130);
        this.gridGraphics.lineStyle(1, 0x7bffce, 0.4);
        for (let x = 0; x <= LIFE_ASSETS.insideBg.w; x += 60) {
            this.gridGraphics.lineBetween(x * this.bgScale, 0, x * this.bgScale, this.worldHeight);
        }
        for (let y = 0; y <= LIFE_ASSETS.insideBg.h; y += 60) {
            this.gridGraphics.lineBetween(0, y * this.bgScale, this.worldWidth, y * this.bgScale);
            for (let x = 0; x <= LIFE_ASSETS.insideBg.w; x += 60) {
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

    createChamberLighting() {
        this.torchGlows = CHAMBER.landmarks.torches.map((torch) => ({
            x: torch.x * this.bgScale,
            y: torch.flameY * this.bgScale,
            graphics: this.add.graphics().setBlendMode(BlendModes.ADD).setDepth(3),
        }));
        this.ringGlow = this.add.graphics()
            .setBlendMode(BlendModes.ADD)
            .setDepth(4);

        if (this.textures.exists(MASK_KEY)) this.textures.remove(MASK_KEY);
        this.maskTexture = this.textures.createCanvas(MASK_KEY, WIDTH, HEIGHT);
        this.maskContext = this.maskTexture.getContext();
        this.darknessImage = this.add.image(0, 0, MASK_KEY)
            .setOrigin(0, 0)
            .setScrollFactor(0)
            .setDepth(80);
        this.orbText = this.add.text(WIDTH - 24, 24, '', {
            fontFamily: 'Arial Black',
            fontSize: '22px',
            color: `#${LIFE_ASSETS.orb.hudColor.toString(16).padStart(6, '0')}`,
            stroke: '#08070d',
            strokeThickness: 4,
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(110);
        this.updateOrbHud();
        this.updateChamberLighting(0);
    }

    createOrbEffects() {
        const displayDiameter = HERO_STAND_PX * 0.45;
        this.lifeHudColor = `#${LIFE_ASSETS.orb.hudColor.toString(16).padStart(6, '0')}`;
        this.orb = this.textures.exists(LIFE_ASSETS.orb.key)
            ? this.add.sprite(0, 0, LIFE_ASSETS.orb.key, 0)
                .setOrigin(0.5)
                .setScale(displayDiameter / LIFE_ASSETS.orb.bodyDiameter)
            : this.add.ellipse(0, 0, displayDiameter, displayDiameter, LIFE_ASSETS.orb.hudColor, 0.95);
        if (!this.textures.exists(LIFE_ASSETS.orb.key)) {
            console.warn('[LifeChamberScene] Orb sprite is missing; using a pink placeholder.');
        }
        this.orb.setDepth(12).setVisible(false);
        this.orbBaseScale = this.orb.scaleX;
        this.orbHeldScale = this.orb.type === 'Sprite'
            ? HERO_STAND_PX * CHAMBER.orbRise.heldWidthH / LIFE_ASSETS.orb.bodyDiameter
            : CHAMBER.orbRise.heldWidthH / 0.45;
        this.orbGlow = this.add.circle(
            0,
            0,
            HERO_STAND_PX * LIFE_ASSETS.orb.glow.radiusH,
            LIFE_ASSETS.orb.glow.color,
            0.3
        ).setBlendMode(BlendModes.ADD).setDepth(11).setVisible(false);
        this.orbFlash = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, LIFE_ASSETS.orb.glow.color, 0)
            .setBlendMode(BlendModes.ADD).setScrollFactor(0).setDepth(145);
        this.bannerBack = this.add.rectangle(WIDTH / 2, HEIGHT / 2, 690, 150, 0x100914, 0.94)
            .setStrokeStyle(3, LIFE_ASSETS.orb.hudColor, 0.95)
            .setScrollFactor(0).setDepth(152).setVisible(false);
        this.bannerTitle = this.add.text(WIDTH / 2, HEIGHT / 2 - 24, 'ORB OF LIFE', {
            fontFamily: 'Arial Black', fontSize: '36px', color: this.lifeHudColor,
            stroke: '#030710', strokeThickness: 7,
        }).setOrigin(0.5).setScrollFactor(0).setDepth(153).setVisible(false);
        this.bannerSub = this.add.text(WIDTH / 2, HEIGHT / 2 + 28, 'Life holds on.', {
            fontFamily: 'Arial', fontSize: '22px', color: '#fff0f7',
            stroke: '#030710', strokeThickness: 5,
        }).setOrigin(0.5).setScrollFactor(0).setDepth(153).setVisible(false);
    }

    updateChamberLighting(delta) {
        this.lightElapsed += delta / 1000;
        for (let index = 0; index < this.torchGlows.length; index += 1) {
            const torch = this.torchGlows[index];
            const pulse = 0.86 + 0.14 * Math.sin(this.lightElapsed * 5.4 + index * 1.9);
            torch.graphics.clear();
            torch.graphics.fillStyle(0xff8bbc, 0.12 * pulse);
            torch.graphics.fillCircle(torch.x, torch.y, HERO_STAND_PX * 0.68 * pulse);
            torch.graphics.fillStyle(0xffc7df, 0.16 * pulse);
            torch.graphics.fillCircle(torch.x, torch.y, HERO_STAND_PX * 0.3 * pulse);
        }

        const ringPulse = 0.84 + 0.16 * Math.sin(this.lightElapsed * Math.PI * 2 / LIFE_ASSETS.orb.glow.pulseSeconds);
        const ringRadius = HERO_STAND_PX * CHAMBER.darkness.ringGlowRadiusH;
        this.ringGlow.clear();
        this.ringGlow.fillStyle(CHAMBER.ringGlow.color, 0.11 * this.ringGlowLevel * ringPulse);
        this.ringGlow.fillEllipse(this.ringX, this.ringY, ringRadius * 2, ringRadius * 0.74);
        this.ringGlow.lineStyle(8 * this.bgScale, CHAMBER.ringGlow.color, 0.45 * this.ringGlowLevel * ringPulse);
        this.ringGlow.strokeEllipse(this.ringX, this.ringY, HERO_STAND_PX * 1.5, HERO_STAND_PX * 0.52);

        const context = this.maskContext;
        context.clearRect(0, 0, WIDTH, HEIGHT);
        context.globalCompositeOperation = 'source-over';
        context.fillStyle = `rgba(0,0,0,${CHAMBER.darkness.ambientAlpha})`;
        context.fillRect(0, 0, WIDTH, HEIGHT);
        context.globalCompositeOperation = 'destination-out';
        const camera = this.cameras.main;
        const heroX = this.player.sprite.body.center.x - camera.scrollX;
        const heroY = this.floorY - camera.scrollY - HERO_STAND_PX * 0.42;
        this.cutLight(heroX, heroY, HERO_STAND_PX * CHAMBER.darkness.heroLightRadiusH);
        for (const torch of this.torchGlows) {
            this.cutLight(
                torch.x - camera.scrollX,
                torch.y - camera.scrollY,
                HERO_STAND_PX * CHAMBER.darkness.torchLightRadiusH
            );
        }
        this.cutLight(
            this.ringX - camera.scrollX,
            this.ringY - camera.scrollY,
            ringRadius * Math.max(0.25, this.ringGlowLevel)
        );
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
