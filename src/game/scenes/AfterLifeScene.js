import { BlendModes, Input, Scene } from 'phaser';
import BeatRunner from '../story/BeatRunner';
import Player from '../entities/Player';
import PlayerHud from '../ui/PlayerHud';
import WorldBubble from '../ui/WorldBubble';
import { ACT2_FX, MINA_SHEETS } from '../config/actTwoData';
import { ACT3_PACING, ACT3_SPEAKERS } from '../config/actThreeData';
import { HERO_PHYSICS, HERO_STAND_PX } from '../config/animationData';
import { COUNT_WORD, LIFE_ASSETS, LIFE_SPEAKERS, SETTLEMENT } from '../config/lifeData';
import { AFTER_LIFE, AFTER_LIFE_SCENE_BEATS, LIFE_FLOW } from '../config/lifeAfterData';

const WIDTH = 1280;
const HEIGHT = 720;
const MASK_KEY = 'life-after-darkness';

function normalizeBeats(beats) {
    return beats.map((beat, index) => ({
        ...beat,
        id: `after-life-${index}`,
        type: beat.t,
    }));
}

export default class AfterLifeScene extends Scene {
    constructor() {
        super(LIFE_FLOW.after);
    }

    create() {
        this.bgScale = Math.max(HEIGHT / LIFE_ASSETS.outsideBg.h, HERO_STAND_PX / 85);
        this.worldWidth = LIFE_ASSETS.outsideBg.w * this.bgScale;
        this.worldHeight = LIFE_ASSETS.outsideBg.h * this.bgScale;
        this.floorY = AFTER_LIFE.floorFeetY * this.bgScale;
        this.fireX = AFTER_LIFE.fire.x * this.bgScale;
        this.fireBaseY = AFTER_LIFE.fire.baseY * this.bgScale;
        this.fireLevel = AFTER_LIFE.fire.level;
        this.fireElapsed = 0;
        this.sparkElapsed = 0;
        this.transitionStarted = false;
        this.handoffStarted = false;
        this.objectiveElapsed = -1;
        this.restartKey = this.input.keyboard.addKey('R');

        this.cameras.main.resetFX();
        this.cameras.main.setRoundPixels(true);
        this.cameras.main.setBackgroundColor('#100d14');
        this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
        this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);

        this.createBackground();
        this.createFloor();
        this.createActors();
        this.createFire();
        this.createDarkness();
        this.createUi();
        this.fadeOverlay = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x000000, 1)
            .setScrollFactor(0).setDepth(180);
        const desiredScrollY = this.floorY - HEIGHT * 0.78;
        const cameraScrollY = Math.max(0, Math.min(this.worldHeight - HEIGHT, desiredScrollY));
        this.cameraTarget = this.add.zone(
            this.player.sprite.body.center.x,
            cameraScrollY + HEIGHT / 2,
            1,
            1
        );
        this.cameras.main.startFollow(this.cameraTarget, true, 0.12, 0.12);
        this.runner = new BeatRunner(this, normalizeBeats(AFTER_LIFE_SCENE_BEATS), this.createHandlers()).start();
        this.events.once('shutdown', () => this.cleanup());
    }

    createBackground() {
        if (this.textures.exists(AFTER_LIFE.bg)) {
            this.add.image(0, 0, AFTER_LIFE.bg)
                .setOrigin(0, 0).setScale(this.bgScale).setDepth(-20);
        } else {
            console.warn(`[AfterLifeScene] Missing "${AFTER_LIFE.bg}"; using placeholder background.`);
            this.add.rectangle(this.worldWidth / 2, this.worldHeight / 2, this.worldWidth, this.worldHeight, 0x211c26)
                .setDepth(-20);
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

    createActors() {
        this.player = new Player(this, this.fireX, this.floorY - 50 * this.bgScale);
        this.player.moveSpeed = HERO_PHYSICS.moveSpeed;
        this.player.controlsLocked = true;
        this.player.facing = -1;
        this.player.sprite.body.setCollideWorldBounds(false);
        this.player.visual.setVisible(false);
        this.physics.add.collider(this.player.sprite, this.floor);

        this.mina = this.createMina();
        this.npcs = {};
        const npcs = {
            elder: { row: 'elder', x: AFTER_LIFE.elderX, faces: 'right', heightVsHero: 0.9, pose: 'idle' },
            kid: { row: 'kid', x: AFTER_LIFE.kid.x, faces: 'left', heightVsHero: 0.6, pose: AFTER_LIFE.kid.pose },
            hooded: { row: 'hooded', x: AFTER_LIFE.hooded.x, faces: 'left', heightVsHero: 0.92, pose: 'idle' },
        };
        for (const [name, spec] of Object.entries(npcs)) {
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
                    .setOrigin(
                        LIFE_ASSETS.npc.footAnchor[0] / LIFE_ASSETS.npc.frameWidth,
                        LIFE_ASSETS.npc.footAnchor[1] / LIFE_ASSETS.npc.frameHeight
                    )
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
            const npc = { name, spec, rowIndex, x: spec.x * this.bgScale, displayHeight, sprite };
            this.npcs[name] = npc;
            if (this.textures.exists(LIFE_ASSETS.npc.key)) {
                if (spec.pose === 'cheer') {
                    sprite.setFrame(rowIndex * LIFE_ASSETS.npc.cols + 3);
                } else {
                    const animation = `life-npc-${spec.row}-idle`;
                    if (this.anims.exists(animation)) sprite.play(animation);
                }
            }
        }
    }

    createMina() {
        const x = AFTER_LIFE.minaX * this.bgScale;
        const height = HERO_STAND_PX * MINA_SHEETS.heightVsHero;
        const key = 'mina-float-left';
        const hasSheet = this.textures.exists(key);
        const sprite = hasSheet
            ? this.add.sprite(x, this.floorY - MINA_SHEETS.hoverPx, key, 0)
                .setOrigin(MINA_SHEETS.originX, MINA_SHEETS.originY)
                .setScale(height / MINA_SHEETS.bodyPx)
                .setDepth(6)
            : this.add.ellipse(x, this.floorY - height / 2, height * 0.45, height, 0x6fe0d0, 0.8).setDepth(6);
        if (hasSheet && this.anims.exists(key)) sprite.play(key);
        if (!hasSheet) console.warn('[AfterLifeScene] Mina spritesheet missing; showing a placeholder.');
        return { x, elapsed: 0, height, hasSheet, sprite };
    }

    createFire() {
        this.fireGlow = this.add.graphics().setBlendMode(BlendModes.ADD).setDepth(2);
        this.flames = this.add.graphics().setBlendMode(BlendModes.ADD).setDepth(7);
        this.fireSparks = Array.from({ length: SETTLEMENT.fire.sparkPool }, () => {
            const spark = this.add.circle(0, 0, 3, SETTLEMENT.fire.glowColor, 0)
                .setBlendMode(BlendModes.ADD).setDepth(8).setVisible(false);
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
            .setOrigin(0, 0).setScrollFactor(0).setDepth(80);
        this.updateDarkness();
    }

    createUi() {
        this.hud = new PlayerHud(this, this.player, { showControls: false, showKills: false });
        this.hud.controlsChipBack.setVisible(false);
        this.hud.controlsChip.setVisible(false);
        this.orbText = this.add.text(WIDTH - 24, 24, '', {
            fontFamily: 'Arial Black',
            fontSize: `${ACT2_FX.orbHud.fontSize}px`,
            color: `#${LIFE_ASSETS.orb.hudColor.toString(16).padStart(6, '0')}`,
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

        const speakers = { ...ACT3_SPEAKERS };
        for (const [key, speaker] of Object.entries(LIFE_SPEAKERS)) {
            speakers[key] = { ...speaker, anchor: key.toLowerCase() };
        }
        this.bubble = new WorldBubble(this, { speakers, pacing: ACT3_PACING });
        this.bubble.setAnchor('hero', () => ({
            x: this.player.sprite.body.center.x,
            y: this.player.sprite.body.bottom - HERO_STAND_PX - 10,
        }));
        this.bubble.setAnchor('mina', () => ({
            x: this.mina.x,
            y: this.floorY - MINA_SHEETS.hoverPx - this.mina.height - 8,
        }));
        for (const npc of Object.values(this.npcs)) {
            this.bubble.setAnchor(npc.name, () => ({
                x: npc.x,
                y: this.floorY - npc.displayHeight - 12,
            }));
        }
    }

    createHandlers() {
        return {
            fx: {
                start: (beat) => this.startFx(beat.name, beat),
                update: (dt, state) => this.updateFx(dt, state),
            },
            line: {
                start: (beat) => {
                    const count = this.orbCountWord();
                    const state = { done: false };
                    this.bubble.say({
                        who: beat.who,
                        text: beat.text.replace('{COUNT}', count),
                        onDone: () => { if (this.sys.isActive()) state.done = true; },
                    });
                    return state;
                },
                update: (_dt, state) => state.done,
            },
            goto: {
                start: (beat) => {
                    if (this.handoffStarted) return { done: true };
                    this.handoffStarted = true;
                    this.transitionStarted = true;
                    this.bubble.clear();
                    const sceneKey = beat.scene || LIFE_FLOW.next;
                    if (this.game.scene.keys[sceneKey]) this.scene.start(sceneKey);
                    else {
                        console.warn(`[AfterLifeScene] Scene "${sceneKey}" is not registered; returning to MainMenuScene.`);
                        this.scene.start(LIFE_FLOW.nextFallback);
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
            return { name, elapsed: 0, duration: beat.seconds || AFTER_LIFE.fadeIn };
        }
        if (name === 'heroEmergesFromFire') {
            const startX = AFTER_LIFE.heroEmergeFromX * this.bgScale;
            const targetX = AFTER_LIFE.heroX * this.bgScale;
            this.setHeroPosition(startX);
            this.player.visual.setVisible(true).setAlpha(0);
            this.player.controlsLocked = true;
            this.player.forcedWalkDirection = Math.sign(targetX - startX);
            this.player.forcedWalkSpeed = Math.abs(targetX - startX) / AFTER_LIFE.heroEmerge.walkSeconds;
            return {
                name,
                elapsed: 0,
                duration: Math.max(AFTER_LIFE.heroEmerge.fadeInSeconds, AFTER_LIFE.heroEmerge.walkSeconds),
                startX,
                targetX,
            };
        }
        if (name === 'objective') {
            this.objectiveText.setText(beat.text).setAlpha(0).setVisible(true);
            this.objectiveElapsed = 0;
            return { name, elapsed: 0 };
        }
        if (name === 'minaWalksEastHeroFollows') {
            const heroStartX = this.player.sprite.body.center.x;
            const minaStartX = this.mina.x;
            const heroTargetX = AFTER_LIFE.exitX * this.bgScale;
            const minaTargetX = AFTER_LIFE.exitX * this.bgScale;
            this.player.controlsLocked = true;
            this.player.forcedWalkDirection = 1;
            this.player.forcedWalkSpeed = (heroTargetX - heroStartX) / AFTER_LIFE.exitWalkSeconds;
            this.playMinaMove();
            return {
                name,
                elapsed: 0,
                duration: AFTER_LIFE.exitWalkSeconds,
                heroStartX,
                minaStartX,
                heroTargetX,
                minaTargetX,
            };
        }
        if (name === 'fadeOut') {
            this.player.controlsLocked = true;
            this.fadeOverlay.setVisible(true).setAlpha(0);
            return { name, elapsed: 0, duration: beat.seconds || AFTER_LIFE.fadeOut };
        }
        throw new Error(`AfterLifeScene has no FX named "${name}".`);
    }

    updateFx(dt, state) {
        state.elapsed += dt;
        if (state.name === 'fadeIn') {
            this.fadeOverlay.setAlpha(Math.max(0, 1 - state.elapsed / state.duration));
            if (state.elapsed < state.duration) return false;
            this.fadeOverlay.setVisible(false);
            return true;
        }
        if (state.name === 'heroEmergesFromFire') {
            const progress = Math.min(1, state.elapsed / state.duration);
            const fadeProgress = Math.min(1, state.elapsed / AFTER_LIFE.heroEmerge.fadeInSeconds);
            const x = state.startX + (state.targetX - state.startX) * progress;
            this.setHeroPosition(x);
            this.player.visual.setAlpha(fadeProgress);
            if (state.elapsed < state.duration) return false;
            this.player.visual.setAlpha(1);
            this.player.forcedWalkDirection = 0;
            this.player.forcedWalkSpeed = 0;
            return true;
        }
        if (state.name === 'objective') {
            const cfg = ACT2_FX.objective;
            const total = cfg.fadeIn + cfg.hold + cfg.fadeOut;
            const alpha = state.elapsed < cfg.fadeIn
                ? state.elapsed / cfg.fadeIn
                : state.elapsed < cfg.fadeIn + cfg.hold
                    ? 0.92 + Math.sin(state.elapsed * Math.PI * 2 / cfg.pulse) * 0.08
                    : Math.max(0, 1 - (state.elapsed - cfg.fadeIn - cfg.hold) / cfg.fadeOut);
            this.objectiveText.setAlpha(alpha);
            if (state.elapsed < total) return false;
            this.objectiveText.setVisible(false);
            this.objectiveElapsed = -1;
            return true;
        }
        if (state.name === 'minaWalksEastHeroFollows') {
            const progress = Math.min(1, state.elapsed / state.duration);
            const heroX = state.heroStartX + (state.heroTargetX - state.heroStartX) * progress;
            const minaX = state.minaStartX + (state.minaTargetX - state.minaStartX) * progress;
            this.setHeroPosition(heroX);
            this.mina.x = minaX;
            this.mina.sprite.setX(minaX);
            if (state.elapsed < state.duration) return false;
            this.player.forcedWalkDirection = 0;
            this.player.forcedWalkSpeed = 0;
            return true;
        }
        if (state.name === 'fadeOut') {
            this.fadeOverlay.setAlpha(Math.min(1, state.elapsed / state.duration));
            return state.elapsed >= state.duration;
        }
        return false;
    }

    setHeroPosition(x) {
        this.player.sprite.setX(x);
        this.player.sprite.body.reset(x, this.player.sprite.y);
        this.player.visual.setPosition(this.player.sprite.body.center.x, this.player.sprite.body.bottom);
    }

    playMinaMove() {
        if (!this.mina.hasSheet || !this.textures.exists('mina-glide-right')) return;
        const animation = 'mina-glide-right';
        if (this.anims.exists(animation)) this.mina.sprite.play(animation, true);
    }

    orbCountWord() {
        const orbs = this.registry.get('orbs');
        const count = Array.isArray(orbs) ? orbs.length : 0;
        return COUNT_WORD[Math.min(count, COUNT_WORD.length - 1)];
    }

    updateOrbHud() {
        const orbs = this.registry.get('orbs');
        const count = Array.isArray(orbs) ? orbs.length : 0;
        this.orbText.setText(`ORBS ${count}/5`);
    }

    updateFire(delta) {
        const seconds = delta / 1000;
        this.fireElapsed += seconds;
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
        const pulse = 0.92 + 0.08 * Math.sin(
            this.fireElapsed * Math.PI * 2 * SETTLEMENT.fire.flickerHz
        );
        const flameHeight = (SETTLEMENT.landmarks.fire.baseY - SETTLEMENT.landmarks.fire.flameTopY) *
            this.bgScale * pulse;
        const radius = HERO_STAND_PX * AFTER_LIFE.darkness.fireLightRadiusH;
        this.fireGlow.clear();
        this.fireGlow.fillStyle(SETTLEMENT.fire.glowColor, 0.28);
        this.fireGlow.fillCircle(this.fireX, this.fireBaseY - flameHeight * 0.35, radius * 0.72);
        this.flames.clear();
        const flameW = 18 * this.bgScale;
        for (let index = 0; index < 4; index += 1) {
            const phase = this.fireElapsed * Math.PI * 2 * SETTLEMENT.fire.flickerHz + index * 1.7;
            const height = flameHeight * (0.64 + 0.36 * Math.sin(phase));
            const x = this.fireX + (index - 1.5) * flameW * 0.6;
            this.flames.fillStyle(index % 2 ? 0xff4a19 : 0xffa33c, 0.9);
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
        context.fillStyle = `rgba(0,0,0,${AFTER_LIFE.darkness.ambientAlpha})`;
        context.fillRect(0, 0, WIDTH, HEIGHT);
        context.globalCompositeOperation = 'destination-out';
        const camera = this.cameras.main;
        this.cutLight(
            this.player.sprite.body.center.x - camera.scrollX,
            this.floorY - camera.scrollY - HERO_STAND_PX * 0.42,
            HERO_STAND_PX * AFTER_LIFE.darkness.heroLightRadiusH
        );
        this.cutLight(
            this.fireX - camera.scrollX,
            this.fireBaseY - camera.scrollY,
            HERO_STAND_PX * AFTER_LIFE.darkness.fireLightRadiusH
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

    update(_time, delta) {
        if (this.transitionStarted || !this.player || !this.player.sprite.active) return;
        this.player.update(delta);
        this.mina.elapsed += delta / 1000;
        if (this.mina.hasSheet && this.mina.sprite.active && this.mina.sprite.anims.currentAnim?.key === 'mina-float-left') {
            const bob = MINA_SHEETS.bobPx * Math.sin(
                this.mina.elapsed * Math.PI * 2 / MINA_SHEETS.bobSeconds
            );
            this.mina.sprite.setY(this.floorY - MINA_SHEETS.hoverPx + bob);
        }
        this.updateFire(delta);
        this.updateDarkness();
        this.hud.update(delta);
        this.updateOrbHud();
        this.bubble.update(delta / 1000);
        this.cameraTarget.setX(this.player.sprite.body.center.x);
        if (Input.Keyboard.JustDown(this.restartKey)) {
            this.scene.restart();
            return;
        }
        this.runner.update(delta / 1000);
    }

    cleanup() {
        if (this.runner) this.runner.destroy();
        if (this.bubble) this.bubble.destroy();
        if (this.hud) this.hud.destroy();
        if (this.maskTexture && this.textures.exists(MASK_KEY)) this.textures.remove(MASK_KEY);
    }
}