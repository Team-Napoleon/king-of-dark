import { BlendModes, Input, Scene } from 'phaser';
import BeatRunner from '../story/BeatRunner';
import Player from '../entities/Player';
import PlayerHud from '../ui/PlayerHud';
import WorldBubble from '../ui/WorldBubble';
import { ACT2_FX, MINA_SHEETS } from '../config/actTwoData';
import { ACT3_SPEAKERS } from '../config/actThreeData';
import { DEBUG_KEYS, HERO_PHYSICS, HERO_STAND_PX } from '../config/animationData';
import {
    ORB_ORDER,
    orbHudText,
    TRUTH_BG,
    TRUTH_OUTSIDE_BEATS,
    TRUTH_OUTSIDE_FX,
    TRUTH_PACING,
    TRUTH_REVEAL_BEATS,
    TRUTH_SPEAKERS,
} from '../config/actTruthData';

const WIDTH = 1280;
const HEIGHT = 720;

export default class TruthOutsideScene extends Scene {
    constructor() {
        super('TruthOutsideScene');
    }

    init(data = {}) {
        this.part = data.part === 'reveal' ? 'reveal' : 'before';
    }

    create() {
        this.scaleFactor = HEIGHT / TRUTH_BG.outside.h;
        this.worldWidth = TRUTH_BG.outside.w * this.scaleFactor;
        this.worldHeight = TRUTH_BG.outside.h * this.scaleFactor;
        this.floorY = TRUTH_BG.outside.floorFeetY * this.scaleFactor;
        this.openingX = TRUTH_BG.outside.crownOpening.x * this.scaleFactor;
        this.openingY = TRUTH_BG.outside.crownOpening.y * this.scaleFactor;
        this.elapsed = 0;
        this.arrowElapsed = 0;
        this.objectiveElapsed = -1;
        this.transitionStarted = false;
        this.handoffStarted = false;
        this.restartKey = this.input.keyboard.addKey('R');
        if (import.meta.env.DEV && DEBUG_KEYS) {
            this.input.keyboard.addCapture('F5');
            this.skipKey = this.input.keyboard.addKey('F5');
        }
        const registryOrbs = this.registry.get('orbs');
        if (!Array.isArray(registryOrbs)) this.registry.set('orbs', ORB_ORDER.slice(0, 3));

        this.cameras.main.resetFX();
        this.cameras.main.setRoundPixels(true);
        this.cameras.main.setBackgroundColor('#090309');
        this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
        this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);
        if (this.textures.exists(TRUTH_BG.outside.key)) {
            this.add.image(0, 0, TRUTH_BG.outside.key)
                .setOrigin(0, 0).setScale(this.scaleFactor).setDepth(-20);
        } else {
            console.warn('[TruthOutsideScene] Outside background is missing.');
            this.add.rectangle(this.worldWidth / 2, this.worldHeight / 2,
                this.worldWidth, this.worldHeight, 0x160b13).setDepth(-20);
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
        this.player = new Player(this, TRUTH_BG.outside.heroStartX * this.scaleFactor,
            this.floorY - 50 * this.scaleFactor);
        this.player.moveSpeed = HERO_PHYSICS.moveSpeed;
        this.player.facing = 1;
        this.physics.add.collider(this.player.sprite, this.floor);
        this.createMina();
        this.createLighting();
        this.createUi();
        this.fadeOverlay = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x000000, 1)
            .setScrollFactor(0).setDepth(180);
        const desiredScrollY = this.floorY - HEIGHT * 0.78;
        const cameraY = Math.max(0, Math.min(this.worldHeight - HEIGHT, desiredScrollY));
        this.cameraTarget = this.add.zone(this.player.sprite.body.center.x, cameraY + HEIGHT / 2, 1, 1);
        this.cameras.main.startFollow(this.cameraTarget, true, 0.12, 0);
        this.runner = new BeatRunner(
            this,
            this.part === 'before' ? TRUTH_OUTSIDE_BEATS : TRUTH_REVEAL_BEATS,
            this.createHandlers()
        ).start();
        this.events.once('shutdown', () => this.cleanup());
    }

    createMina() {
        const x = (TRUTH_BG.outside.heroStartX + TRUTH_BG.outside.minaDx) * this.scaleFactor;
        const height = HERO_STAND_PX * MINA_SHEETS.heightVsHero;
        const key = 'mina-float-left';
        const hasSheet = this.textures.exists(key);
        const sprite = hasSheet
            ? this.add.sprite(x, this.floorY - MINA_SHEETS.hoverPx, key, 0)
                .setOrigin(MINA_SHEETS.originX, MINA_SHEETS.originY)
                .setScale(height / MINA_SHEETS.bodyPx)
                .setDepth(6)
            : this.add.ellipse(x, this.floorY - height / 2, height * 0.45, height,
                0x6fe0d0, 0.8).setDepth(6);
        if (hasSheet && this.anims.exists(key)) sprite.play(key);
        this.mina = { x, height, elapsed: 0, facing: -1, clip: 'idle', hasSheet, sprite };
        if (!hasSheet) console.warn('[TruthOutsideScene] Mina spritesheet missing; showing a placeholder.');
        this.faceEachOther();
    }

    createLighting() {
        this.moonGlow = this.add.graphics().setBlendMode(BlendModes.ADD).setDepth(2);
        this.openingGlow = this.add.graphics().setBlendMode(BlendModes.ADD).setDepth(5);
        this.vignette = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT,
            TRUTH_OUTSIDE_FX.enter.swell.vignette, 0)
            .setScrollFactor(0).setDepth(170);
        this.drawLighting();
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
        this.objectiveText = this.add.text(TRUTH_OUTSIDE_FX.objective.x, TRUTH_OUTSIDE_FX.objective.y, '', {
            fontFamily: 'Arial Black', fontSize: `${TRUTH_OUTSIDE_FX.objective.fontSize}px`,
            color: TRUTH_OUTSIDE_FX.objective.color, stroke: '#08070d', strokeThickness: 4,
        }).setScrollFactor(0).setDepth(110).setAlpha(0).setVisible(false);
        this.arrowText = this.add.text(WIDTH - TRUTH_OUTSIDE_FX.arrowRight.marginRight,
            TRUTH_OUTSIDE_FX.arrowRight.y, TRUTH_OUTSIDE_FX.arrowRight.text, {
                fontFamily: 'Arial Black', fontSize: '36px', color: TRUTH_OUTSIDE_FX.arrowRight.color,
                stroke: '#08070d', strokeThickness: 6,
            }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(112).setVisible(false);
        this.bubble = new WorldBubble(this, {
            speakers: { ...ACT3_SPEAKERS, ...TRUTH_SPEAKERS },
            pacing: TRUTH_PACING,
        });
        this.bubble.setAnchor('hero', () => ({
            x: this.player.sprite.body.center.x,
            y: this.player.sprite.body.bottom - HERO_STAND_PX - 10,
        }));
        this.bubble.setAnchor('mina', () => ({
            x: this.mina.x,
            y: this.floorY - MINA_SHEETS.hoverPx - this.mina.height - 10,
        }));
    }

    createHandlers() {
        return {
            fx: {
                start: (beat) => this.startFx(beat.name, beat),
                update: (dt, state) => this.updateFx(dt, state),
            },
            line: {
                start: (beat) => {
                    const state = { done: false, gesture: beat.gesture === 'point' };
                    if (state.gesture) this.setMinaClip('point');
                    this.bubble.say({
                        who: beat.who,
                        text: beat.text,
                        onDone: () => {
                            if (!this.sys.isActive()) return;
                            if (state.gesture) this.setMinaClip('idle');
                            state.done = true;
                        },
                    });
                    return state;
                },
                update: (_dt, state) => state.done,
            },
            faceEachOther: {
                start: () => { this.faceEachOther(); return {}; },
                update: () => true,
            },
            objective: {
                start: (beat) => {
                    this.objectiveText.setText(beat.text).setAlpha(0).setVisible(true);
                    this.objectiveElapsed = 0;
                    return {};
                },
                update: (dt) => this.updateObjective(dt),
            },
            arrow: {
                start: () => {
                    this.arrowText.setVisible(true);
                    this.player.controlsLocked = false;
                    return {};
                },
                update: () => true,
            },
            waitForX: {
                start: (beat) => ({ targetX: this.getTriggerX(beat.x) }),
                update: (_dt, state) => {
                    if (this.player.sprite.body.center.x < state.targetX) return false;
                    this.arrowText.setVisible(false);
                    return true;
                },
            },
            lockControls: {
                start: (beat) => {
                    this.player.controlsLocked = Boolean(beat.value);
                    this.player.forcedWalkDirection = 0;
                    this.player.forcedWalkSpeed = 0;
                    return {};
                },
                update: () => true,
            },
            goto: {
                start: (beat) => {
                    if (this.handoffStarted) return { done: true };
                    this.handoffStarted = true;
                    this.transitionStarted = true;
                    this.bubble.clear();
                    const configured = TRUTH_OUTSIDE_FX.sceneNext;
                    const next = beat.scene === 'MECHANISM' ? configured.scene : beat.scene || 'TruthCaveScene';
                    const fallback = configured.fallback || 'MainMenuScene';
                    if (this.game.scene.keys[next]) this.scene.start(next, beat.data);
                    else {
                        console.warn(`[TruthOutsideScene] Scene "${next}" is not registered; returning to ${fallback}.`);
                        this.scene.start(fallback);
                    }
                    return { done: true };
                },
                update: (_dt, state) => state.done,
            },
        };
    }

    getTriggerX(name) {
        if (name !== 'OPENING_TRIGGER') throw new Error(`Unknown Truth opening trigger "${name}".`);
        return this.openingX - TRUTH_BG.outside.doorTriggerBeforeH * HERO_STAND_PX;
    }

    startFx(name, beat) {
        if (name === 'fadeIn') {
            this.fadeOverlay.setAlpha(1).setVisible(true);
            return { name, elapsed: 0, duration: TRUTH_OUTSIDE_FX.fadeIn };
        }
        if (name === 'heroEnters') {
            const startX = this.player.sprite.body.center.x;
            const distance = Math.max(0, this.openingX - startX);
            this.player.controlsLocked = true;
            this.player.facing = 1;
            this.player.forcedWalkDirection = 1;
            this.player.forcedWalkSpeed = distance / TRUTH_OUTSIDE_FX.enter.walkSeconds;
            return {
                name, elapsed: 0, startX, distance,
                duration: TRUTH_OUTSIDE_FX.enter.walkSeconds +
                    TRUTH_OUTSIDE_FX.enter.swell.seconds + TRUTH_OUTSIDE_FX.enter.toBlack,
            };
        }
        if (name === 'heroExits') {
            const startX = this.openingX;
            const targetX = this.openingX + TRUTH_OUTSIDE_FX.exit.stopXFromOpeningH * HERO_STAND_PX;
            this.setHeroPosition(startX);
            this.player.visual.setVisible(true).setAlpha(0);
            this.player.controlsLocked = true;
            this.player.forcedWalkDirection = 1;
            this.player.forcedWalkSpeed = (targetX - startX) / TRUTH_OUTSIDE_FX.exit.walkSeconds;
            return { name, elapsed: 0, startX, targetX, duration: TRUTH_OUTSIDE_FX.exit.walkSeconds };
        }
        if (name === 'minaLeads') {
            this.mina.startX = this.mina.x;
            this.setMinaClip('move');
            this.setMinaFacing(ACT2_FX.minaLeads.dir);
            this.player.controlsLocked = false;
            return { name, elapsed: 0, duration: ACT2_FX.minaLeads.seconds };
        }
        throw new Error(`TruthOutsideScene has no FX named "${name}".`);
    }

    updateFx(dt, state) {
        state.elapsed += dt;
        if (state.name === 'fadeIn') {
            this.fadeOverlay.setAlpha(Math.max(0, 1 - state.elapsed / state.duration));
            if (state.elapsed < state.duration) return false;
            this.fadeOverlay.setVisible(false);
            return true;
        }
        if (state.name === 'heroEnters') {
            const fx = TRUTH_OUTSIDE_FX.enter;
            const walkProgress = Math.min(1, state.elapsed / fx.walkSeconds);
            const fadeStart = fx.walkSeconds - fx.fadeLast;
            this.player.visual.setAlpha(1 - Math.max(0, Math.min(1, (state.elapsed - fadeStart) / fx.fadeLast)));
            if (state.elapsed < fx.walkSeconds) {
                this.drawOpeningGlow(1);
                return false;
            }
            if (!state.walkStopped) {
                state.walkStopped = true;
                this.setHeroPosition(this.openingX);
                this.player.forcedWalkDirection = 0;
                this.player.forcedWalkSpeed = 0;
            }
            const swellElapsed = state.elapsed - fx.walkSeconds;
            const swellProgress = Math.min(1, swellElapsed / fx.swell.seconds);
            this.drawOpeningGlow(1 + swellProgress);
            this.vignette.setAlpha(0.78 * swellProgress);
            if (swellElapsed < fx.swell.seconds) return false;
            const blackProgress = Math.min(1, (swellElapsed - fx.swell.seconds) / fx.toBlack);
            this.vignette.setAlpha(0.78 + 0.22 * blackProgress);
            this.fadeOverlay.setVisible(true).setAlpha(blackProgress);
            return state.elapsed >= state.duration;
        }
        if (state.name === 'heroExits') {
            const progress = Math.min(1, state.elapsed / state.duration);
            const x = state.startX + (state.targetX - state.startX) * progress;
            this.setHeroPosition(x);
            this.player.visual.setAlpha(Math.min(1, state.elapsed / 0.8));
            if (state.elapsed < state.duration) return false;
            this.setHeroPosition(state.targetX);
            this.player.visual.setAlpha(1);
            this.player.forcedWalkDirection = 0;
            this.player.forcedWalkSpeed = 0;
            this.faceEachOther();
            this.fadeOverlay.setVisible(false).setAlpha(0);
            this.vignette.setAlpha(0);
            return true;
        }
        if (state.name === 'minaLeads') {
            const fx = ACT2_FX.minaLeads;
            this.mina.x = Math.min(this.worldWidth - 80,
                this.mina.startX + fx.dir * fx.speedPx * Math.min(state.elapsed, fx.seconds));
            this.mina.sprite.setX(this.mina.x);
            const fadeAt = fx.seconds - fx.fadeOutAfter;
            if (state.elapsed >= fadeAt) {
                this.fadeOverlay.setVisible(true).setAlpha(Math.min(1, (state.elapsed - fadeAt) / fx.fadeOutAfter));
            }
            return state.elapsed >= fx.seconds;
        }
        return false;
    }

    updateObjective(dt) {
        if (this.objectiveElapsed < 0) return true;
        this.objectiveElapsed += dt;
        const fx = TRUTH_OUTSIDE_FX.objective;
        const total = fx.fadeIn + fx.hold + fx.fadeOut;
        const alpha = this.objectiveElapsed < fx.fadeIn
            ? this.objectiveElapsed / fx.fadeIn
            : this.objectiveElapsed < fx.fadeIn + fx.hold
                ? 0.92 + Math.sin(this.objectiveElapsed * Math.PI * 2 / ACT2_FX.objective.pulse) * 0.08
                : Math.max(0, 1 - (this.objectiveElapsed - fx.fadeIn - fx.hold) / fx.fadeOut);
        this.objectiveText.setAlpha(alpha);
        if (this.objectiveElapsed < total) return false;
        this.objectiveText.setVisible(false);
        this.objectiveElapsed = -1;
        return true;
    }

    faceEachOther() {
        const heroX = this.player.sprite.body.center.x;
        const direction = this.mina.x >= heroX ? 1 : -1;
        this.player.controlsLocked = true;
        this.player.forcedWalkDirection = 0;
        this.player.forcedWalkSpeed = 0;
        this.player.facing = direction;
        this.setMinaFacing(-direction);
        this.setMinaClip('idle');
    }

    setMinaFacing(direction) {
        this.mina.facing = direction < 0 ? -1 : 1;
        this.applyMinaAnimation();
    }

    setMinaClip(clip) {
        this.mina.clip = clip;
        this.applyMinaAnimation();
    }

    applyMinaAnimation() {
        if (!this.mina.hasSheet) return;
        const source = MINA_SHEETS.clips[this.mina.clip];
        const key = `mina-${source}-${this.mina.facing > 0 ? 'right' : 'left'}`;
        if (this.mina.currentAnimation !== key && this.textures.exists(key) && this.anims.exists(key)) {
            this.mina.currentAnimation = key;
            this.mina.sprite.play(key);
        }
    }

    setHeroPosition(x) {
        const y = this.player.sprite.y;
        this.player.sprite.setPosition(x, y);
        this.player.sprite.body.reset(x, y);
        this.player.visual.setPosition(this.player.sprite.body.center.x, this.player.sprite.body.bottom);
    }

    drawOpeningGlow(swell = 0) {
        const distanceH = Math.abs(this.player.sprite.body.center.x - this.openingX) / HERO_STAND_PX;
        const proximity = Math.max(0, Math.min(1, 1 - distanceH / TRUTH_OUTSIDE_FX.glow.startDistanceH));
        const intensity = Math.max(proximity, Math.min(1, swell));
        const pulse = 0.82 + 0.18 * Math.sin(this.elapsed * Math.PI * 2 / TRUTH_OUTSIDE_FX.moonPulse.seconds);
        this.openingGlow.clear();
        for (let ring = 5; ring >= 1; ring -= 1) {
            this.openingGlow.fillStyle(TRUTH_OUTSIDE_FX.glow.color,
                TRUTH_OUTSIDE_FX.glow.maxAlpha * intensity * pulse * (0.055 + ring * 0.012));
            this.openingGlow.fillCircle(this.openingX, this.openingY,
                HERO_STAND_PX * TRUTH_OUTSIDE_FX.glow.radiusH * intensity * ring / 5);
        }
    }

    drawLighting() {
        const pulse = 0.82 + 0.18 * Math.sin(this.elapsed * Math.PI * 2 / TRUTH_OUTSIDE_FX.moonPulse.seconds);
        this.moonGlow.clear();
        const moonX = TRUTH_BG.outside.moon.x * this.scaleFactor;
        const moonY = TRUTH_BG.outside.moon.y * this.scaleFactor;
        for (let ring = 5; ring >= 1; ring -= 1) {
            this.moonGlow.fillStyle(0xc51c37,
                TRUTH_OUTSIDE_FX.moonPulse.alpha * pulse * (0.04 + ring * 0.012));
            this.moonGlow.fillCircle(moonX, moonY, HERO_STAND_PX * (1.2 + ring * 0.25));
        }
        this.drawOpeningGlow();
    }

    updateOrbHud() {
        const orbs = this.registry.get('orbs');
        const count = Array.isArray(orbs) ? orbs.length : 0;
        this.orbText.setText(orbHudText(count));
    }

    update(_time, delta) {
        if (this.transitionStarted || !this.player || !this.player.sprite.active) return;
        const seconds = delta / 1000;
        this.elapsed += seconds;
        this.player.update(delta);
        this.mina.elapsed += seconds;
        const bob = MINA_SHEETS.bobPx * Math.sin(
            this.mina.elapsed * Math.PI * 2 / MINA_SHEETS.bobSeconds
        );
        this.mina.sprite.setY(this.floorY - MINA_SHEETS.hoverPx + bob);
        this.drawLighting();
        this.hud.update(delta);
        this.updateOrbHud();
        this.bubble.update(seconds);
        this.cameraTarget.setX(this.player.sprite.body.center.x);
        if (this.arrowText.visible) {
            this.arrowElapsed += seconds;
            this.arrowText.setAlpha(0.55 + 0.45 * Math.sin(this.arrowElapsed * Math.PI * 2 /
                TRUTH_OUTSIDE_FX.arrowRight.pulseSeconds));
        }
        if (Input.Keyboard.JustDown(this.restartKey)) {
            this.scene.restart({ part: this.part });
            return;
        }
        if (this.skipKey && Input.Keyboard.JustDown(this.skipKey)) {
            this.arrowText.setVisible(false);
            this.runner.jumpToId(this.part === 'before' ? 'arrow' : 'lead');
        }
        this.runner.update(seconds);
    }

    cleanup() {
        if (this.runner) this.runner.destroy();
        if (this.bubble) this.bubble.destroy();
        if (this.hud) this.hud.destroy();
    }
}