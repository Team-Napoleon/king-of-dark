import { Input, Scene } from 'phaser';
import BeatRunner from '../story/BeatRunner';
import Player from '../entities/Player';
import PlayerHud from '../ui/PlayerHud';
import WorldBubble from '../ui/WorldBubble';
import { HERO_STAND_PX, DEBUG_KEYS } from '../config/animationData';
import {
    ACT2_FEAR_OUTSIDE_BEATS,
    ACT2_PACING,
    ACT2_SPEAKERS,
    ACT2_VILLAGE_BEATS,
    ACT2_FX,
    DARKWORLD_BG,
    MINA_SHEETS,
} from '../config/actTwoData';

const WIDTH = 1280;
const HEIGHT = 720;

export default class DarkWorldScene extends Scene {
    constructor() {
        super('DarkWorldScene');
    }

    init(data = {}) {
        this.part = data.part === 'fearOutside' ? 'fearOutside' : 'village';
        if (import.meta.env.DEV) console.log(`[flow] DarkWorldScene init part=${this.part}`);
    }

    create() {
        this.createScene();
    }

    createScene() {
        this.cameras.main.resetFX();
        if (this.registry.get('orbs') === undefined) {
            this.registry.set('orbs', []);
        }
        this.cameras.main.setBackgroundColor('#000000');
        this.sourceScale = HEIGHT / DARKWORLD_BG.cropH;
        this.worldWidth = DARKWORLD_BG.srcW * this.sourceScale;
        this.floorY = DARKWORLD_BG.floorFrac * HEIGHT;
        this.archX = DARKWORLD_BG.archXFrac * this.worldWidth;
        this.swingX = DARKWORLD_BG.swingXFrac * this.worldWidth;

        if (this.textures.exists(DARKWORLD_BG.key)) {
            this.background = this.add.image(this.worldWidth / 2, HEIGHT / 2, DARKWORLD_BG.key)
                .setCrop(0, DARKWORLD_BG.cropY, DARKWORLD_BG.srcW, DARKWORLD_BG.cropH)
                .setScale(this.sourceScale)
                .setDepth(-10);
        } else {
            console.warn(`[DarkWorldScene] Missing background texture "${DARKWORLD_BG.key}"; using placeholder.`);
            this.background = this.add.rectangle(this.worldWidth / 2, HEIGHT / 2, this.worldWidth, HEIGHT, 0x15131d)
                .setDepth(-10);
        }
        this.cameras.main.setBounds(0, 0, this.worldWidth, HEIGHT);
        this.physics.world.setBounds(0, 0, this.worldWidth, HEIGHT);

        this.floor = this.add.rectangle(this.worldWidth / 2, this.floorY + 40, this.worldWidth, 80, 0x000000, 0)
            .setVisible(false);
        this.physics.add.existing(this.floor, true);

        const startX = this.part === 'village'
            ? DARKWORLD_BG.spawnHeroFrac * this.worldWidth
            : ACT2_FX.sceneStart.heroXFrac * this.worldWidth;
        this.player = new Player(this, startX, this.floorY - 50);
        this.player.controlsLocked = true;
        this.physics.add.collider(this.player.sprite, this.floor);
        this.cameras.main.startFollow(this.player.sprite, true, 0.08, 0.08);

        this.createSwing();
        this.createMina();
        this.createOverlays();
        this.hud = new PlayerHud(this, this.player, { showControls: false, showKills: false });
        this.hud.controlsChipBack.setVisible(false);
        this.hud.controlsChip.setVisible(false);
        this.createOrbHud();
        this.bubble = new WorldBubble(this, {
            speakers: ACT2_SPEAKERS,
            pacing: ACT2_PACING,
            voiceStyle: { y: 150, maxWidth: 420, textColor: '#d9c8ff', glowColor: 0x7a3cff },
        });
        this.bubble.setAnchor('hero', () => ({
            x: this.player.sprite.body.center.x,
            y: this.player.sprite.body.bottom - HERO_STAND_PX - 10,
        }));
        this.bubble.setAnchor('mina', () => ({
            x: this.mina.x,
            y: this.mina.y +
                MINA_SHEETS.bobPx * Math.sin(this.mina.elapsed * Math.PI * 2 / MINA_SHEETS.bobSeconds) -
                this.mina.bodyHeight - 12,
        }));

        this.restartKey = this.input.keyboard.addKey('R');
        if (DEBUG_KEYS) {
            this.input.keyboard.addCapture('F5,F6');
            this.debugKeys = this.input.keyboard.addKeys({ skip: 'F5', teleport: 'F6' });
        }

        if (this.part === 'village') {
            this.player.visual.setRotation(-Math.PI / 2);
            this.wakeElapsed = 0;
            this.mina.visible = false;
            this.swingTimer = 0;
        } else {
            this.player.controlsLocked = true;
            this.player.facing = 1;
            this.mina.x = startX + ACT2_FX.sceneStart.minaDxFromHero;
            this.mina.visible = true;
            this.setMinaFacing(-1);
        }

        this.runner = new BeatRunner(
            this,
            this.part === 'village' ? ACT2_VILLAGE_BEATS : ACT2_FEAR_OUTSIDE_BEATS,
            this.createHandlers()
        ).start();
        this.elapsed = 0;
        this.transitionStarted = false;
        this.events.once('shutdown', () => this.cleanup());
    }

    createSwing() {
        const swing = ACT2_FX.swing;
        this.swingStatic = this.add.graphics().setDepth(2);
        const beamY = this.floorY - swing.ropePx - 18;
        const postX = this.swingX;
        this.swingStatic.lineStyle(7, swing.color, 1);
        this.swingStatic.lineBetween(postX - 24, this.floorY, postX - 24, beamY);
        this.swingStatic.lineBetween(postX + 24, this.floorY, postX + 24, beamY);
        this.swingStatic.lineBetween(postX - 48, beamY, postX + 48, beamY);

        this.swingPivot = this.add.container(postX, beamY).setDepth(3);
        this.swingMoving = this.add.graphics();
        this.swingMoving.lineStyle(3, swing.ropeColor, 1);
        this.swingMoving.lineBetween(-swing.seatW / 2, 0, -swing.seatW / 2, swing.ropePx);
        this.swingMoving.lineBetween(swing.seatW / 2, 0, swing.seatW / 2, swing.ropePx);
        this.swingMoving.fillStyle(swing.color, 1);
        this.swingMoving.fillRect(-swing.seatW / 2 - 5, swing.ropePx, swing.seatW + 10, 7);
        this.swingPivot.add(this.swingMoving);

        const shoe = ACT2_FX.shoes;
        this.shoes = this.add.graphics().setDepth(3);
        this.shoes.fillStyle(shoe.color, 1);
        this.shoes.fillEllipse(this.swingX + shoe.dxFromSwing - shoe.size, this.floorY - shoe.size / 2, shoe.size * 1.5, shoe.size);
        this.shoes.fillEllipse(this.swingX + shoe.dxFromSwing + shoe.size, this.floorY - shoe.size / 2, shoe.size * 1.5, shoe.size);
        this.swingStopped = false;
    }

    createMina() {
        this.mina = {
            x: 0,
            y: this.floorY - MINA_SHEETS.hoverPx,
            visible: true,
            facing: 1,
            clip: 'idle',
            bodyHeight: HERO_STAND_PX * MINA_SHEETS.heightVsHero,
            elapsed: 0,
            sprite: this.textures.exists('mina-float-right')
                ? this.add.sprite(0, 0, 'mina-float-right')
                    .setOrigin(MINA_SHEETS.originX, MINA_SHEETS.originY)
                    .setScale(HERO_STAND_PX * MINA_SHEETS.heightVsHero / MINA_SHEETS.bodyPx)
                    .setDepth(6)
                : this.add.rectangle(0, 0, 44, 100, 0x6fe0d0, 0.75)
                    .setOrigin(0.5, 1)
                    .setDepth(6),
            hasSheet: this.textures.exists('mina-float-right'),
            shadow: this.add.ellipse(0, this.floorY + 1, MINA_SHEETS.shadow.widthPx, 18, 0x05040a, MINA_SHEETS.shadow.alpha)
                .setDepth(4),
        };
        if (this.mina.hasSheet && this.anims.exists('mina-float-right')) {
            this.mina.sprite.play('mina-float-right');
        } else if (!this.mina.hasSheet) {
            console.warn('[DarkWorldScene] Missing Mina spritesheets; using placeholder.');
        }
        this.minaDust = Array.from({ length: ACT2_FX.minaDrop.landDust }, () => {
            const particle = this.add.circle(0, 0, 4, 0xbdb3c7, 0.8).setDepth(7).setVisible(false);
            particle.life = 0;
            particle.vx = 0;
            particle.vy = 0;
            return particle;
        });
    }

    createOverlays() {
        this.fadeOverlay = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x000000, 1)
            .setScrollFactor(0)
            .setDepth(150);
        this.titleMain = this.add.text(WIDTH / 2, HEIGHT / 2 - 22, ACT2_FX.title.text, {
            fontFamily: 'Georgia, serif',
            fontSize: '48px',
            color: ACT2_FX.title.color,
            stroke: '#090710',
            strokeThickness: 6,
            letterSpacing: '3px',
        }).setOrigin(0.5).setScrollFactor(0).setDepth(151).setAlpha(0).setVisible(false);
        this.titleSub = this.add.text(WIDTH / 2, HEIGHT / 2 + 36, ACT2_FX.title.sub, {
            fontFamily: 'Arial',
            fontSize: '20px',
            color: ACT2_FX.title.subColor,
            letterSpacing: '4px',
        }).setOrigin(0.5).setScrollFactor(0).setDepth(151).setAlpha(0).setVisible(false);
        this.topFlicker = this.add.rectangle(WIDTH / 2, 36, WIDTH, 72, 0x090611, 0)
            .setScrollFactor(0)
            .setDepth(145);
        this.objectiveText = this.add.text(ACT2_FX.objective.x, ACT2_FX.objective.y, '', {
            fontFamily: 'Arial Black',
            fontSize: `${ACT2_FX.objective.fontSize}px`,
            color: ACT2_FX.objective.color,
            stroke: '#08070d',
            strokeThickness: 4,
        }).setScrollFactor(0).setDepth(105).setAlpha(0).setVisible(false);
        this.arrowText = this.add.text(0, ACT2_FX.arrowLeft.y, '', {
            fontFamily: 'Arial Black',
            fontSize: '42px',
            color: ACT2_FX.arrowLeft.color,
            stroke: '#090710',
            strokeThickness: 6,
        }).setScrollFactor(0).setDepth(105).setOrigin(0.5).setVisible(false);
        this.orbText = this.add.text(WIDTH + ACT2_FX.orbHud.x, ACT2_FX.orbHud.y, '', {
            fontFamily: 'Arial Black',
            fontSize: `${ACT2_FX.orbHud.fontSize}px`,
            color: `#${ACT2_FX.orbHud.color.toString(16).padStart(6, '0')}`,
            stroke: '#08070d',
            strokeThickness: 4,
        }).setScrollFactor(0).setDepth(106).setOrigin(1, 0);
        this.gameOverText = this.add.text(WIDTH / 2, HEIGHT / 2, 'GAME OVER\nPress R to restart', {
            fontFamily: 'Arial Black',
            fontSize: '42px',
            color: '#f5d7a1',
            stroke: '#000000',
            strokeThickness: 8,
            align: 'center',
        }).setOrigin(0.5).setScrollFactor(0).setDepth(210).setVisible(false);
    }

    createOrbHud() {
        this.updateOrbHud(true);
    }

    updateOrbHud(force = false) {
        const orbs = this.registry.get('orbs');
        const count = Array.isArray(orbs) ? orbs.length : 0;
        if (force || count !== this.orbCount) {
            this.orbCount = count;
            this.orbText.setText(`ORBS ${count}/${ACT2_FX.orbHud.total}`);
        }
    }

    createHandlers() {
        return {
            title: {
                start: () => {
                    this.fadeOverlay.setAlpha(1).setVisible(true);
                    this.titleMain.setAlpha(0).setVisible(true);
                    this.titleSub.setAlpha(0).setVisible(true);
                    return { elapsed: 0 };
                },
                update: (dt, state) => {
                    state.elapsed += dt;
                    const fx = ACT2_FX.title;
                    const alpha = state.elapsed < fx.fadeIn
                        ? state.elapsed / fx.fadeIn
                        : state.elapsed < fx.fadeIn + fx.hold
                            ? 1
                            : Math.max(0, 1 - (state.elapsed - fx.fadeIn - fx.hold) / fx.fadeOut);
                    this.titleMain.setAlpha(alpha);
                    this.titleSub.setAlpha(alpha);
                    if (state.elapsed < fx.fadeIn + fx.hold + fx.fadeOut) {
                        return false;
                    }
                    this.titleMain.setVisible(false);
                    this.titleSub.setVisible(false);
                    return true;
                },
            },
            fx: {
                start: (beat) => this.startFx(beat.name),
                update: (dt, state) => this.updateFx(beatName(state), dt, state),
            },
            line: {
                start: (beat) => {
                    const state = { done: false, gesture: beat.gesture === 'point' };
                    if (state.gesture) {
                        this.setMinaClip('point');
                    }
                    this.bubble.say({
                        who: beat.who,
                        text: beat.text,
                        onDone: () => {
                            if (state.gesture && this.mina.visible) {
                                this.setMinaClip('idle');
                            }
                            state.done = true;
                        },
                    });
                    return state;
                },
                update: (_dt, state) => state.done,
            },
            wait: {
                start: (beat) => ({ remaining: beat.seconds }),
                update: (dt, state) => {
                    state.remaining -= dt;
                    return state.remaining <= 0;
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
            arrow: {
                start: (beat) => {
                    const style = beat.dir === 'left' ? ACT2_FX.arrowLeft : ACT2_FX.arrowRight;
                    this.arrowText.setText(style.text);
                    this.arrowText.setPosition(
                        beat.dir === 'left' ? style.marginLeft : WIDTH - style.marginRight,
                        style.y
                    );
                    this.arrowText.setVisible(true);
                    this.arrowElapsed = 0;
                    this.player.controlsLocked = false;
                    this.player.forcedWalkDirection = 0;
                    this.player.forcedWalkSpeed = 0;
                    return {};
                },
                update: () => true,
            },
            waitForX: {
                start: (beat) => ({ targetX: this.getTriggerX(beat.x) }),
                update: (_dt, state) => {
                    const crossed = this.part === 'village'
                        ? this.player.sprite.body.center.x <= state.targetX
                        : this.player.sprite.body.center.x >= state.targetX;
                    if (!crossed) {
                        return false;
                    }
                    this.arrowText.setVisible(false);
                    return true;
                },
            },
            objective: {
                start: (beat) => {
                    this.objectiveText.setText(beat.text).setAlpha(0).setVisible(true);
                    return { elapsed: 0 };
                },
                update: (dt, state) => {
                    state.elapsed += dt;
                    const fx = ACT2_FX.objective;
                    const total = fx.fadeIn + fx.hold + fx.fadeOut;
                    const alpha = state.elapsed < fx.fadeIn
                        ? state.elapsed / fx.fadeIn
                        : state.elapsed < fx.fadeIn + fx.hold
                            ? 0.92 + Math.sin(state.elapsed * 2 * Math.PI / fx.pulse) * 0.08
                            : Math.max(0, 1 - (state.elapsed - fx.fadeIn - fx.hold) / fx.fadeOut);
                    this.objectiveText.setAlpha(alpha);
                    if (state.elapsed < total) {
                        return false;
                    }
                    this.objectiveText.setVisible(false);
                    return true;
                },
            },
            faceEachOther: {
                start: () => {
                    this.faceEachOther();
                    return {};
                },
                update: () => true,
            },
            goto: {
                start: (beat) => {
                    if (this.transitionStarted) {
                        return { done: true };
                    }
                    this.transitionStarted = true;
                    if (this.part === 'village') {
                        this.bubble.destroy();
                        this.scene.restart({ part: beat.part || 'fearOutside' });
                    } else {
                        const next = ACT2_FX.next;
                        this.bubble.destroy();
                        if (this.game.scene.keys[next]) {
                            this.scene.start(next);
                        } else {
                            console.warn(`[DarkWorldScene] Scene "${next}" is not registered; returning to MainMenuScene.`);
                            this.scene.start('MainMenuScene');
                        }
                    }
                    return { done: true };
                },
                update: (_dt, state) => state.done,
            },
        };
    }

    getTriggerX(value) {
        if (value === 'SWING_TRIGGER') {
            return this.swingX + ACT2_FX.swingTriggerDx;
        }
        if (value === 'DOOR_TRIGGER') {
            return this.archX - ACT2_FX.doorTriggerBeforeX;
        }
        throw new Error(`Unknown DarkWorldScene waitForX trigger "${value}".`);
    }

    startFx(name) {
        switch (name) {
            case 'fadeIn':
                this.fadeOverlay.setAlpha(1).setVisible(true);
                return { name, elapsed: 0, duration: ACT2_FX.fadeIn };
            case 'heroWake':
                this.player.controlsLocked = true;
                this.player.forcedWalkDirection = 0;
                this.player.forcedWalkSpeed = 0;
                this.wakeElapsed = 0;
                return { name, elapsed: 0, duration: ACT2_FX.heroWake.lieSeconds + ACT2_FX.heroWake.riseSeconds };
            case 'swingStops':
                this.swingStopElapsed = 0;
                this.swingStopProgress = 1;
                this.swingStopped = false;
                return { name, elapsed: 0, duration: ACT2_FX.swing.stopSeconds };
            case 'minaDrop':
                this.mina.visible = true;
                this.mina.sprite.setVisible(true);
                this.mina.x = this.player.sprite.body.center.x + ACT2_FX.minaDrop.landOffsetFromHero;
                this.mina.startY = this.floorY - MINA_SHEETS.hoverPx - ACT2_FX.minaDrop.fromAbovePx;
                this.mina.targetY = this.floorY - MINA_SHEETS.hoverPx;
                this.mina.y = this.mina.startY;
                this.minaDropElapsed = 0;
                this.setMinaFacing(-1);
                return {
                    name,
                    elapsed: 0,
                    duration: ACT2_FX.minaDrop.shadowFlicker + ACT2_FX.minaDrop.dropSeconds,
                };
            case 'minaLeads':
                this.player.controlsLocked = false;
                this.player.forcedWalkDirection = 0;
                this.player.forcedWalkSpeed = 0;
                this.mina.startX = this.mina.x;
                this.setMinaClip('move');
                this.setMinaFacing(ACT2_FX.minaLeads.dir);
                return { name, elapsed: 0, duration: ACT2_FX.minaLeads.seconds };
            case 'heroWalksIn': {
                const fx = ACT2_FX.heroWalksIn;
                const remaining = Math.max(0, this.archX - this.player.sprite.body.center.x);
                this.player.controlsLocked = true;
                this.player.forcedWalkDirection = 1;
                this.player.forcedWalkSpeed = remaining / fx.seconds;
                this.walkInElapsed = 0;
                this.heroHiddenAtArch = false;
                return { name, elapsed: 0, duration: fx.seconds };
            }
            case 'darken':
                this.fadeOverlay.setVisible(true).setAlpha(0);
                return { name, elapsed: 0, duration: ACT2_FX.darken.seconds };
            default:
                throw new Error(`Unknown DarkWorldScene FX "${name}".`);
        }
    }

    updateFx(name, dt, state) {
        state.elapsed += dt;
        switch (name) {
            case 'fadeIn':
                this.fadeOverlay.setAlpha(Math.max(0, 1 - state.elapsed / state.duration));
                if (state.elapsed >= state.duration) {
                    this.fadeOverlay.setVisible(false);
                    return true;
                }
                return false;
            case 'heroWake': {
                const wake = ACT2_FX.heroWake;
                const riseProgress = Math.max(0, Math.min(1, (state.elapsed - wake.lieSeconds) / wake.riseSeconds));
                this.player.visual.setOrigin(0.5, 1);
                this.player.visual.setRotation(state.elapsed < wake.lieSeconds ? -Math.PI / 2 : -Math.PI / 2 * (1 - riseProgress));
                this.wakeElapsed = state.elapsed;
                if (state.elapsed >= state.duration) {
                    this.player.visual.setRotation(0);
                    this.player.controlsLocked = false;
                    return true;
                }
                return false;
            }
            case 'swingStops': {
                const progress = Math.min(1, state.elapsed / state.duration);
                this.swingStopProgress = 1 - progress;
                this.swingStopped = progress >= 1;
                return this.swingStopped;
            }
            case 'minaDrop': {
                const fx = ACT2_FX.minaDrop;
                const dropElapsed = Math.max(0, state.elapsed - fx.shadowFlicker);
                const progress = Math.min(1, dropElapsed / fx.dropSeconds);
                const eased = 1 - (1 - progress) * (1 - progress);
                this.mina.y = this.mina.startY + (this.mina.targetY - this.mina.startY) * eased;
                if (state.elapsed < fx.shadowFlicker) {
                    this.topFlicker.setAlpha(0.45 * (0.5 + 0.5 * Math.sin(state.elapsed * 75)));
                } else {
                    this.topFlicker.setAlpha(0);
                }
                if (progress >= 1 && !state.landed) {
                    state.landed = true;
                    this.topFlicker.setAlpha(0);
                    this.emitMinaDust();
                    this.cameras.main.shake(
                        fx.landShake.duration * 1000,
                        fx.landShake.intensity
                    );
                }
                return state.elapsed >= state.duration;
            }
            case 'minaLeads': {
                const fx = ACT2_FX.minaLeads;
                this.mina.x = Math.min(
                    this.worldWidth - 80,
                    this.mina.startX + fx.dir * fx.speedPx * Math.min(state.elapsed, fx.seconds)
                );
                if (state.elapsed >= fx.seconds - fx.fadeOutAfter) {
                    const progress = Math.min(1, (state.elapsed - (fx.seconds - fx.fadeOutAfter)) / fx.fadeOutAfter);
                    this.fadeOverlay.setVisible(true).setAlpha(progress);
                }
                return state.elapsed >= fx.seconds;
            }
            case 'heroWalksIn': {
                const fx = ACT2_FX.heroWalksIn;
                this.walkInElapsed = state.elapsed;
                const fadeProgress = Math.max(0, Math.min(1, (state.elapsed - (fx.seconds - fx.fadeLast)) / fx.fadeLast));
                this.player.visual.setAlpha(1 - fadeProgress);
                this.heroHiddenAtArch = fadeProgress >= 1;
                return state.elapsed >= fx.seconds;
            }
            case 'darken':
                this.fadeOverlay.setAlpha(Math.min(1, state.elapsed / state.duration));
                return state.elapsed >= state.duration;
            default:
                throw new Error(`Unknown DarkWorldScene FX update "${name}".`);
        }
    }

    faceEachOther() {
        const heroX = this.player.sprite.body.center.x;
        const heroDir = this.mina.x >= heroX ? 1 : -1;
        this.player.controlsLocked = true;
        this.player.forcedWalkDirection = 0;
        this.player.forcedWalkSpeed = 0;
        this.player.facing = heroDir;
        this.setMinaFacing(-heroDir);
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
        if (!this.mina.hasSheet) {
            return;
        }
        const animationClip = MINA_SHEETS.clips[this.mina.clip];
        const key = `mina-${animationClip}-${this.mina.facing > 0 ? 'right' : 'left'}`;
        if (this.mina.currentAnimation !== key && this.anims.exists(key)) {
            this.mina.currentAnimation = key;
            this.mina.sprite.play(key);
        }
    }

    emitMinaDust() {
        let emitted = 0;
        for (let index = 0; index < this.minaDust.length && emitted < ACT2_FX.minaDrop.landDust; index += 1) {
            const particle = this.minaDust[index];
            if (particle.life > 0) {
                continue;
            }
            particle.life = 0.4;
            particle.vx = (index % 2 === 0 ? -1 : 1) * (24 + index * 3);
            particle.vy = -25 - (index % 3) * 8;
            particle.setPosition(this.mina.x, this.floorY - 3).setAlpha(0.8).setVisible(true);
            emitted += 1;
        }
    }

    updateMina(delta) {
        if (!this.mina.visible) {
            this.mina.sprite.setVisible(false);
            this.mina.shadow.setVisible(false);
            return;
        }
        this.mina.elapsed += delta / 1000;
        const bob = MINA_SHEETS.bobPx * Math.sin(this.mina.elapsed * Math.PI * 2 / MINA_SHEETS.bobSeconds);
        const visualY = this.mina.y + bob;
        this.mina.sprite.setPosition(this.mina.x, visualY).setVisible(true);
        this.mina.shadow.setPosition(this.mina.x, this.floorY + 1).setVisible(true);
    }

    updateSwing(delta) {
        if (this.swingStopped) {
            this.swingAngle = 0;
            this.swingPivot.setRotation(0);
            return;
        }
        this.swingTimer += delta / 1000;
        const cycle = ACT2_FX.swing.swaySeconds;
        const stopProgress = this.swingStopProgress === undefined ? 1 : this.swingStopProgress;
        this.swingAngle = Math.sin(this.swingTimer * Math.PI * 2 / cycle) *
            ACT2_FX.swing.swayDegMax * Math.PI / 180 * stopProgress;
        this.swingPivot.setRotation(this.swingAngle);
    }

    updateDust(delta) {
        const seconds = delta / 1000;
        for (let index = 0; index < this.minaDust.length; index += 1) {
            const particle = this.minaDust[index];
            if (particle.life <= 0) {
                continue;
            }
            particle.life = Math.max(0, particle.life - seconds);
            particle.x += particle.vx * seconds;
            particle.y += particle.vy * seconds;
            particle.vy += 70 * seconds;
            particle.setAlpha(particle.life / 0.4);
            if (particle.life === 0) {
                particle.setVisible(false);
            }
        }
    }

    updateArrow(delta) {
        if (!this.arrowText.visible) {
            return;
        }
        this.arrowElapsed += delta / 1000;
        const period = ACT2_FX.arrowLeft.pulseSeconds;
        this.arrowText.setAlpha(0.45 + 0.55 * (Math.sin(this.arrowElapsed * Math.PI * 2 / period) + 1) / 2);
    }

    update(time, delta) {
        if (!this.player || !this.player.sprite.active) {
            return;
        }
        this.elapsed += delta / 1000;
        this.player.update(delta);
        if (this.heroHiddenAtArch) {
            this.player.visual.setAlpha(0);
        }
        if (this.part === 'village' && this.wakeElapsed < ACT2_FX.heroWake.lieSeconds + ACT2_FX.heroWake.riseSeconds) {
            this.player.visual.setOrigin(0.5, 1);
            const riseProgress = Math.max(0, Math.min(1,
                (this.wakeElapsed - ACT2_FX.heroWake.lieSeconds) / ACT2_FX.heroWake.riseSeconds));
            this.player.visual.setRotation(this.wakeElapsed < ACT2_FX.heroWake.lieSeconds
                ? -Math.PI / 2
                : -Math.PI / 2 * (1 - riseProgress));
        }
        this.updateSwing(delta);
        this.updateMina(delta);
        this.updateDust(delta);
        this.updateArrow(delta);
        this.updateOrbHud();
        this.hud.update(delta);
        this.bubble.update(delta / 1000);

        if (Input.Keyboard.JustDown(this.restartKey)) {
            this.bubble.destroy();
            this.scene.restart({ part: this.part });
            return;
        }
        if (DEBUG_KEYS) {
            if (Input.Keyboard.JustDown(this.debugKeys.skip)) {
                this.bubble.clear();
                this.arrowText.setVisible(false);
                this.runner.jumpToId('arrow');
            }
            if (Input.Keyboard.JustDown(this.debugKeys.teleport)) {
                const beat = this.runner.beats[this.runner.index];
                if (beat && beat.type === 'waitForX') {
                    const x = this.getTriggerX(beat.x);
                    this.player.sprite.body.reset(x, this.player.sprite.y);
                    this.player.sprite.setX(x);
                }
            }
        }
        this.runner.update(delta / 1000);
    }

    cleanup() {
        if (this.runner) {
            this.runner.destroy();
        }
        if (this.bubble) {
            this.bubble.destroy();
        }
    }

    triggerGameOver() {
        this.player.controlsLocked = true;
        this.player.forcedWalkDirection = 0;
        this.player.forcedWalkSpeed = 0;
        this.gameOverText.setVisible(true);
    }
}

function beatName(state) {
    return state.name;
}
