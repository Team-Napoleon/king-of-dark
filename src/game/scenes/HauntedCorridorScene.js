import { BlendModes, Input, Scene } from 'phaser';
import BeatRunner from '../story/BeatRunner';
import CorridorObstacle from '../entities/CorridorObstacle';
import Player from '../entities/Player';
import Stalker from '../entities/Stalker';
import PlayerHud from '../ui/PlayerHud';
import WorldBubble from '../ui/WorldBubble';
import { ACT2_FX } from '../config/actTwoData';
import {
    ACT3_CORRIDOR_BEATS,
    ACT3_PACING,
    ACT3_SPEAKERS,
    CHASE_COURSE,
    CORRIDOR,
    DARKNESS,
    FEAR,
    FAIL,
    ORB_FEAR,
    SHRINE,
    STALKER,
    STALKER_SHEETS,
} from '../config/actThreeData';
import { DEBUG_KEYS, HERO_PHYSICS, HERO_STAND_PX } from '../config/animationData';
import { ORB_NAMES, ORB_ORDER, orbHudText } from '../config/actTruthData';

const WIDTH = 1280;
const HEIGHT = 720;
const MASK_TEXTURE = 'corridor-darkness-mask';
const VIGNETTE_TEXTURE = 'corridor-fear-vignette';

export default class HauntedCorridorScene extends Scene {
    constructor() {
        super('HauntedCorridorScene');
    }

    init(data = {}) {
        this.chaseStartRequested = data.chaseStart === true;
    }

    create() {
        const k = HEIGHT / CORRIDOR.tile.h;
        const heroHeight = HERO_STAND_PX;
        const speed = HERO_PHYSICS.moveSpeed;
        const endWidth = CORRIDOR.endRoom.w * k;
        this.scaleFactor = k;
        this.floorY = CORRIDOR.floorFeetY * k;
        this.startPadX = CORRIDOR.startPadH * heroHeight;
        this.blackoutX = this.startPadX + CORRIDOR.blackoutAtSeconds * speed;
        this.tileCount = Math.ceil(
            (CORRIDOR.startPadH * heroHeight +
                CORRIDOR.blackoutAtSeconds * speed +
                CORRIDOR.chaseSeconds * speed -
                CORRIDOR.sealFrac * endWidth) /
                (CORRIDOR.tile.w * k)
        );
        this.endRoomStart = this.tileCount * CORRIDOR.tile.w * k;
        this.worldWidth = this.endRoomStart + endWidth;
        this.exitX = this.endRoomStart + CORRIDOR.shrineFinishFrac * endWidth;
        this.sealX = this.endRoomStart + CORRIDOR.sealFrac * endWidth;
        this.cameras.main.resetFX();
        this.cameras.main.setRoundPixels(true);
        this.cameras.main.setBounds(0, 0, this.worldWidth, HEIGHT);
        this.cameras.main.setBackgroundColor('#030207');
        this.physics.world.setBounds(0, 0, this.worldWidth, HEIGHT);

        this.createBackground();
        this.createFloor();
        this.createLighting();
        this.createActors();
        this.createCourse();
        this.createFinaleObjects();
        this.createHud();
        this.createDirector();

        this.cameras.main.startFollow(this.player.sprite, true, 0.12, 0.08);
        this.cameras.main.setDeadzone(140, 70);
        this.restartKey = this.input.keyboard.addKey('R');
        if (DEBUG_KEYS) {
            this.input.keyboard.addCapture('F5');
            this.skipKey = this.input.keyboard.addKey('F5');
        }
        this.elapsed = 0;
        this.arrowElapsed = 0;
        this.heartbeatElapsed = 0;
        this.heartbeatPeriod = 60 / FEAR.bpm.far;
        this.ambientAlpha = DARKNESS.ambientAlpha;
        this.stumbleTimer = 0;
        this.heroStunTimer = 0;
        this.catchCount = 0;
        this.chaseActive = false;
        this.chaseFailed = false;
        this.transitionStarted = false;
        this.sealProgress = 0;
        this.dissolveElapsed = 0;
        this.runesElapsed = 0;
        this.crownRiseElapsed = 0;
        this.crownFloatElapsed = 0;
        this.absorbElapsed = 0;
        this.followThroughRemaining = 0;
        this.brazierHintShown = false;
        this.gameOverText.setVisible(false);
        this.events.once('shutdown', () => this.cleanup());

        if (this.chaseStartRequested) {
            this.resetHeroAt(this.blackoutX + 24);
            this.stalker.appear(this.player.sprite.body.center.x - STALKER.behindGapH * heroHeight);
            this.stalker.startChasing();
            this.chaseActive = true;
            this.chaseStarted = true;
            this.runner.jumpToId('chase');
        }
    }

    createBackground() {
        if (this.textures.exists(CORRIDOR.tile.key)) {
            this.background = this.add.tileSprite(
                0, 0,
                this.tileCount * CORRIDOR.tile.w * this.scaleFactor,
                HEIGHT,
                CORRIDOR.tile.key
            ).setOrigin(0, 0).setTileScale(this.scaleFactor, this.scaleFactor).setDepth(-10);
        } else {
            console.warn(`[HauntedCorridorScene] Missing "${CORRIDOR.tile.key}"; drawing placeholder corridor.`);
            this.background = this.add.rectangle(
                this.tileCount * CORRIDOR.tile.w * this.scaleFactor / 2,
                HEIGHT / 2,
                this.tileCount * CORRIDOR.tile.w * this.scaleFactor,
                HEIGHT,
                0x17131c
            ).setDepth(-10);
        }
        if (this.textures.exists(CORRIDOR.endRoom.key)) {
            this.endRoomImage = this.add.image(this.endRoomStart, 0, CORRIDOR.endRoom.key)
                .setOrigin(0, 0)
                .setScale(this.scaleFactor)
                .setDepth(-9);
        } else {
            console.warn(`[HauntedCorridorScene] Missing "${CORRIDOR.endRoom.key}"; drawing placeholder shrine.`);
            this.endRoomImage = this.add.rectangle(
                this.endRoomStart + CORRIDOR.endRoom.w * this.scaleFactor / 2,
                HEIGHT / 2,
                CORRIDOR.endRoom.w * this.scaleFactor,
                HEIGHT,
                0x21141a
            ).setDepth(-9);
        }
        this.door = this.add.graphics().setDepth(2);
        const doorWidth = HERO_STAND_PX * 1.2;
        this.door.fillStyle(0x15131a, 1);
        this.door.fillRect(0, 74, doorWidth, this.floorY - 74);
        this.door.lineStyle(8, 0x514c55, 1);
        this.door.strokeRect(0, 74, doorWidth, this.floorY - 74);
        this.door.lineStyle(3, 0x837773, 0.85);
        for (let y = 110; y < this.floorY - 10; y += 34) {
            this.door.lineBetween(0, y, doorWidth, y);
        }
    }

    createFloor() {
        this.floorLine = this.add.rectangle(this.worldWidth / 2, this.floorY + 42, this.worldWidth, 84, 0x17151b)
            .setDepth(1);
        this.add.rectangle(this.worldWidth / 2, this.floorY + 1, this.worldWidth, 4, 0x766d70, 0.9).setDepth(2);
        this.floor = this.add.rectangle(this.worldWidth / 2, this.floorY + 42, this.worldWidth, 84, 0x000000, 0)
            .setVisible(false);
        this.physics.add.existing(this.floor, true);
        this.leftWall = this.add.rectangle(-20, this.floorY - 100, 40, 250, 0, 0).setVisible(false);
        this.rightWall = this.add.rectangle(this.worldWidth + 20, this.floorY - 100, 40, 250, 0, 0).setVisible(false);
        this.physics.add.existing(this.leftWall, true);
        this.physics.add.existing(this.rightWall, true);
    }

    createLighting() {
        if (this.textures.exists(MASK_TEXTURE)) this.textures.remove(MASK_TEXTURE);
        if (this.textures.exists(VIGNETTE_TEXTURE)) this.textures.remove(VIGNETTE_TEXTURE);
        this.maskTexture = this.textures.createCanvas(MASK_TEXTURE, WIDTH, HEIGHT);
        this.maskContext = this.maskTexture.getContext();
        this.maskImage = this.add.image(0, 0, MASK_TEXTURE).setOrigin(0, 0).setScrollFactor(0).setDepth(40);

        this.vignetteTexture = this.textures.createCanvas(VIGNETTE_TEXTURE, WIDTH, HEIGHT);
        const vignetteContext = this.vignetteTexture.getContext();
        const gradient = vignetteContext.createRadialGradient(WIDTH / 2, HEIGHT / 2, HEIGHT * 0.2, WIDTH / 2, HEIGHT / 2, WIDTH * 0.7);
        gradient.addColorStop(0, 'rgba(42,0,48,0)');
        gradient.addColorStop(0.58, 'rgba(42,0,48,0.08)');
        gradient.addColorStop(1, 'rgba(42,0,48,1)');
        vignetteContext.fillStyle = gradient;
        vignetteContext.fillRect(0, 0, WIDTH, HEIGHT);
        this.vignetteTexture.refresh();
        this.vignette = this.add.image(0, 0, VIGNETTE_TEXTURE).setOrigin(0, 0)
            .setScrollFactor(0).setDepth(60).setAlpha(0);

        this.torchPoints = [];
        for (let tile = 0; tile < this.tileCount; tile += 1) {
            for (const torch of CORRIDOR.torchesInTile) {
                this.torchPoints.push({
                    x: (tile * CORRIDOR.tile.w + torch.x) * this.scaleFactor,
                    y: torch.y * this.scaleFactor,
                    phase: this.torchPoints.length * 1.27,
                });
            }
        }
        for (const torch of CORRIDOR.torchesInEndRoom) {
            this.torchPoints.push({
                x: this.endRoomStart + torch.x * this.scaleFactor,
                y: torch.y * this.scaleFactor,
                phase: this.torchPoints.length * 1.27,
            });
        }
        this.torchGlows = [];
        for (const torch of this.torchPoints) {
            const glow = this.add.graphics().setBlendMode(BlendModes.ADD).setDepth(41);
            glow.fillStyle(CORRIDOR.torchColor, 0.12);
            glow.fillCircle(torch.x, torch.y, DARKNESS.torchLightRadiusH * HERO_STAND_PX * 0.28);
            this.torchGlows.push(glow);
        }
        this.lightGlow = this.add.graphics().setBlendMode(BlendModes.ADD).setDepth(42);
        this.heartbeatKey = this.cache.audio.exists('heartbeat') ? 'heartbeat' : null;
        this.heartbeatSound = this.heartbeatKey ? this.sound.add(this.heartbeatKey, { volume: 0.3 }) : null;
    }

    createActors() {
        const heroX = this.chaseStartRequested ? this.blackoutX + 24 : this.startPadX;
        this.player = new Player(this, heroX, this.floorY - 48);
        this.player.moveSpeed = HERO_PHYSICS.moveSpeed;
        this.physics.add.collider(this.player.sprite, this.floor);
        this.physics.add.collider(this.player.sprite, this.leftWall);
        this.physics.add.collider(this.player.sprite, this.rightWall);
        this.player.sprite.body.setCollideWorldBounds(true);
        this.player.controlsLocked = false;
        this.player.enemies = undefined;
        this.enemies = [];
        this.stalker = new Stalker(this, -500, this.floorY);
        this.enemies.push(this.stalker);
        this.player.scene.enemies = this.enemies;
        this.orb = this.textures.exists(ORB_FEAR.texture)
            ? this.add.sprite(
                this.endRoomStart + CORRIDOR.socket.x * this.scaleFactor,
                CORRIDOR.socket.y * this.scaleFactor,
                ORB_FEAR.texture
            ).setOrigin(ORB_FEAR.originX, ORB_FEAR.originY)
                .setScale(ORB_FEAR.restWidthH * HERO_STAND_PX / 153)
                .setBlendMode(BlendModes.ADD)
                .setDepth(15)
            : this.add.rectangle(
                this.endRoomStart + CORRIDOR.socket.x * this.scaleFactor,
                CORRIDOR.socket.y * this.scaleFactor,
                HERO_STAND_PX * ORB_FEAR.restWidthH,
                HERO_STAND_PX * 0.65,
                ORB_FEAR.glow.color
            ).setDepth(15);
        if (this.orb.type === 'Sprite' && this.anims.exists('orb-fear-pulse')) {
            this.orb.play('orb-fear-pulse');
        }
        this.orbHomeX = this.orb.x;
        this.orbHomeY = this.orb.y;
        this.orbGlow = this.add.graphics().setBlendMode(BlendModes.ADD).setDepth(14);
        this.ringDecal = this.add.graphics().setDepth(4);
        this.ringDecal.lineStyle(5, SHRINE.ringDecal.color, 0.9);
        this.ringDecal.strokeEllipse(
            this.endRoomStart + CORRIDOR.socket.x * this.scaleFactor,
            this.floorY - (CORRIDOR.floorFeetY - SHRINE.ringDecal.y) * this.scaleFactor,
            SHRINE.ringDecal.rx * this.scaleFactor,
            SHRINE.ringDecal.ry * this.scaleFactor
        );
        this.runeGlow = this.add.graphics().setBlendMode(BlendModes.ADD).setDepth(13);
    }

    createCourse() {
        this.obstacles = [];
        for (const spec of CHASE_COURSE.obstacles) {
            const obstacle = new CorridorObstacle(this, {
                x: this.blackoutX + spec.t * HERO_PHYSICS.moveSpeed,
                floorY: this.floorY,
                kind: spec.kind,
                height: spec.hH * HERO_STAND_PX,
                hits: spec.hits || 0,
            });
            obstacle.sourceSpec = spec;
            this.obstacles.push(obstacle);
        }
        this.braziers = [];
        for (const spec of CHASE_COURSE.braziers) {
            const brazier = new CorridorObstacle(this, {
                x: this.blackoutX + spec.t * HERO_PHYSICS.moveSpeed,
                floorY: this.floorY,
                kind: 'brazier',
                height: HERO_STAND_PX * 0.45,
            });
            brazier.sourceSpec = spec;
            this.braziers.push(brazier);
            brazier.glow.setBlendMode(BlendModes.ADD).setDepth(41);
        }
        this.wisps = [];
        for (const spec of CHASE_COURSE.wisps) {
            const wisp = new CorridorObstacle(this, {
                x: this.blackoutX + spec.t * HERO_PHYSICS.moveSpeed,
                floorY: this.floorY,
                kind: 'wisp',
                height: HERO_STAND_PX * 0.32,
            });
            wisp.sourceSpec = spec;
            this.wisps.push(wisp);
        }
        this.fireHint = this.add.text(WIDTH / 2, 130, 'FIRE  lights the braziers', {
            fontFamily: 'Arial Black',
            fontSize: '20px',
            color: '#ffc078',
            stroke: '#1a0802',
            strokeThickness: 5,
        }).setOrigin(0.5).setScrollFactor(0).setDepth(105).setAlpha(0).setVisible(false);
        this.fireHintElapsed = 0;
        this.obstacleDust = Array.from({ length: 12 }, () => {
            const dust = this.add.circle(0, 0, 5, 0x9b7964, 0.85).setDepth(54).setVisible(false);
            dust.life = 0;
            dust.vx = 0;
            dust.vy = 0;
            return dust;
        });
    }

    createFinaleObjects() {
        this.sealCurtain = this.add.graphics().setBlendMode(BlendModes.ADD).setDepth(22).setVisible(false);
        this.dissolvePuffs = Array.from({ length: SHRINE.stalkerDissolve.puffs }, (_unused, index) => {
            const puff = this.add.circle(0, 0, 10 + (index % 4) * 2, SHRINE.stalkerDissolve.color, 0)
                .setBlendMode(BlendModes.ADD).setDepth(24).setVisible(false);
            puff.life = 0;
            puff.vx = 0;
            puff.vy = 0;
            return puff;
        });
        this.absorbFlash = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, ORB_FEAR.absorbFlash.color, 0)
            .setScrollFactor(0).setDepth(150).setVisible(false);
        this.beaconGlow = this.add.graphics().setBlendMode(BlendModes.ADD).setScrollFactor(0).setDepth(102).setVisible(false);
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
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(106);
        this.updateOrbHud(true);
        this.objectiveText = this.add.text(24, 24, '', {
            fontFamily: 'Arial Black',
            fontSize: `${ACT2_FX.objective.fontSize}px`,
            color: ACT2_FX.objective.color,
            stroke: '#08070d',
            strokeThickness: 4,
        }).setScrollFactor(0).setDepth(106).setAlpha(0).setVisible(false);
        this.objectiveSub = this.add.text(WIDTH / 2, HEIGHT / 2 + 76, '', {
            fontFamily: 'Arial Black',
            fontSize: '22px',
            color: '#ffb4a3',
            stroke: '#170607',
            strokeThickness: 6,
            align: 'center',
        }).setOrigin(0.5).setScrollFactor(0).setDepth(151).setAlpha(0).setVisible(false);
        this.arrowText = this.add.text(WIDTH - ACT2_FX.arrowRight.marginRight, ACT2_FX.arrowRight.y, '>>', {
            fontFamily: 'Arial Black',
            fontSize: '42px',
            color: ACT2_FX.arrowRight.color,
            stroke: '#090710',
            strokeThickness: 6,
        }).setOrigin(0.5).setScrollFactor(0).setDepth(105).setVisible(false);
        this.gameOverText = this.add.text(WIDTH / 2, HEIGHT / 2, 'THE STALKER CAUGHT YOU\nThe chase begins again', {
            fontFamily: 'Arial Black',
            fontSize: '34px',
            color: '#f5d7a1',
            stroke: '#000000',
            strokeThickness: 7,
            align: 'center',
        }).setOrigin(0.5).setScrollFactor(0).setDepth(160).setVisible(false);
        this.fadeOverlay = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x000000, 0)
            .setScrollFactor(0).setDepth(145);
    }

    createDirector() {
        this.bubble = new WorldBubble(this, {
            speakers: ACT3_SPEAKERS,
            pacing: ACT3_PACING,
            voiceStyle: { y: 150, maxWidth: 420, textColor: '#d9c8ff', glowColor: 0x7a3cff },
        });
        this.bubble.setAnchor('hero', () => ({
            x: this.player.sprite.body.center.x,
            y: this.player.sprite.body.bottom - HERO_STAND_PX - 10,
        }));
        this.runner = new BeatRunner(this, ACT3_CORRIDOR_BEATS, this.createHandlers()).start();
    }

    createHandlers() {
        return {
            fx: {
                start: (beat) => this.startFx(beat.name),
                update: (delta, state) => this.updateFx(state.name, delta, state),
            },
            line: {
                start: (beat) => {
                    const state = { done: false, parallel: beat.parallel === true };
                    this.bubble.say({
                        who: beat.who,
                        text: beat.text,
                        onDone: () => { state.done = true; },
                    });
                    return state;
                },
                update: (_delta, state) => state.parallel || state.done,
            },
            wait: {
                start: (beat) => ({
                    remaining: beat.seconds === 'STALKER.standSeconds' ? STALKER.standSeconds : beat.seconds,
                }),
                update: (delta, state) => {
                    state.remaining -= delta;
                    return state.remaining <= 0;
                },
            },
            arrow: {
                start: () => {
                    this.arrowElapsed = 0;
                    this.arrowText.setVisible(true);
                    this.player.controlsLocked = false;
                    this.player.forcedWalkDirection = 0;
                    this.player.forcedWalkSpeed = 0;
                    return {};
                },
                update: () => true,
            },
            waitForX: {
                start: (beat) => ({ x: this.triggerX(beat.x) }),
                update: (_delta, state) => {
                    const crossed = this.player.sprite.body.center.x >= state.x;
                    if (crossed) this.arrowText.setVisible(false);
                    return crossed;
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
            chase: {
                start: () => {
                    this.beginChase();
                    return {};
                },
                update: () => this.player.sprite.body.center.x >= this.exitX,
            },
            goto: {
                start: () => {
                    this.transitionStarted = true;
                    this.scene.start('DarkWorldScene', { part: 'afterFear' });
                    return {};
                },
                update: () => true,
            },
        };
    }

    triggerX(name) {
        if (name === 'SIGHT_TRIGGER') {
            return this.startPadX + CORRIDOR.walkSeconds * HERO_PHYSICS.moveSpeed * 0.55;
        }
        if (name === 'BLACKOUT_TRIGGER') return this.blackoutX;
        throw new Error(`Unknown corridor trigger "${name}".`);
    }

    startFx(name) {
        if (name === 'fadeIn') {
            this.fadeOverlay.setAlpha(1).setVisible(true);
            return { name, elapsed: 0, duration: ACT2_FX.fadeIn };
        }
        if (name === 'stalkerAppears') {
            this.stalker.appear(this.player.sprite.body.center.x + WIDTH * CORRIDOR.sightAheadScreens);
            this.startHeartbeat();
            return { name, elapsed: 0, duration: 0 };
        }
        if (name === 'blackout') {
            this.blackoutElapsed = 0;
            this.blackoutPatternIndex = 0;
            this.blackoutPatternRemaining = DARKNESS.blackout.flickerPattern[0];
            this.fadeOverlay.setVisible(true).setAlpha(0);
            return { name, elapsed: 0, duration: DARKNESS.blackout.seconds };
        }
        if (name === 'sealClose') {
            this.sealProgress = 0;
            this.sealCurtain.setVisible(true);
            return { name, elapsed: 0, duration: SHRINE.sealClose.seconds };
        }
        if (name === 'stalkerDissolve') {
            this.dissolveElapsed = 0;
            this.spawnDissolvePuffs();
            return { name, elapsed: 0, duration: SHRINE.stalkerDissolve.seconds };
        }
        if (name === 'runesFlare') {
            this.runesElapsed = 0;
            return { name, elapsed: 0, duration: SHRINE.runesFlare.seconds };
        }
        if (name === 'crownRises') {
            this.crownRiseElapsed = 0;
            return { name, elapsed: 0, duration: ORB_FEAR.rises.seconds };
        }
        if (name === 'crownToHero') {
            this.crownFloatElapsed = 0;
            this.orbStartX = this.orb.x;
            this.orbStartY = this.orb.y;
            this.orbStartScale = ORB_FEAR.restWidthH * HERO_STAND_PX / 153;
            this.absorbElapsed = 0;
            this.player.controlsLocked = true;
            return { name, elapsed: 0, duration: ORB_FEAR.floatToHero.seconds };
        }
        throw new Error(`Unknown HauntedCorridorScene FX "${name}".`);
    }

    updateFx(name, delta, state) {
        state.elapsed += delta;
        if (name === 'fadeIn') {
            this.fadeOverlay.setAlpha(Math.max(0, 1 - state.elapsed / state.duration));
            if (state.elapsed >= state.duration) {
                this.fadeOverlay.setVisible(false);
                return true;
            }
            return false;
        }
        if (name === 'stalkerAppears') return true;
        if (name === 'blackout') {
            this.blackoutElapsed = state.elapsed;
            this.blackoutPatternRemaining -= delta;
            if (this.blackoutPatternRemaining <= 0 &&
                this.blackoutPatternIndex < DARKNESS.blackout.flickerPattern.length) {
                this.blackoutPatternIndex += 1;
                if (this.blackoutPatternIndex < DARKNESS.blackout.flickerPattern.length) {
                    this.blackoutPatternRemaining = DARKNESS.blackout.flickerPattern[this.blackoutPatternIndex];
                } else {
                    this.blackoutPatternRemaining = Math.max(0, state.duration - state.elapsed);
                }
            }
            const inDarkInterval = this.blackoutPatternIndex >= DARKNESS.blackout.flickerPattern.length;
            this.fadeOverlay.setAlpha(inDarkInterval
                ? 1
                : this.blackoutPatternIndex % 2 === 0 ? 0.88 : 0.05);
            if (state.elapsed < state.duration) return false;
            this.fadeOverlay.setAlpha(0).setVisible(false);
            const heroX = this.player.sprite.body.center.x;
            this.stalker.appear(heroX - STALKER.behindGapH * HERO_STAND_PX);
            this.startHeartbeat();
            return true;
        }
        if (name === 'sealClose') {
            this.sealProgress = Math.min(1, state.elapsed / state.duration);
            this.sealCurtain.clear();
            const curtainWidth = SHRINE.sealClose.widthH * HERO_STAND_PX;
            this.sealCurtain.fillStyle(SHRINE.sealClose.curtainGlow, 0.45);
            this.sealCurtain.fillRect(this.sealX - curtainWidth, 0, curtainWidth * 2, this.floorY * this.sealProgress);
            this.sealCurtain.fillStyle(SHRINE.sealClose.curtainColor, 0.9);
            this.sealCurtain.fillRect(this.sealX - curtainWidth * 0.3, 0, curtainWidth * 0.6, this.floorY * this.sealProgress);
            if (state.elapsed >= state.duration) {
                this.cameras.main.shake(
                    SHRINE.sealClose.shake.duration * 1000,
                    SHRINE.sealClose.shake.intensity
                );
                this.stalker.dissolve();
                return true;
            }
            return false;
        }
        if (name === 'stalkerDissolve') {
            this.dissolveElapsed = state.elapsed;
            this.updateDissolvePuffs();
            return state.elapsed >= state.duration;
        }
        if (name === 'runesFlare') {
            this.runesElapsed = state.elapsed;
            this.runeGlow.clear();
            const alpha = SHRINE.runesFlare.alpha * Math.max(0, Math.sin(Math.PI * state.elapsed / state.duration));
            this.runeGlow.fillStyle(SHRINE.runesFlare.color, alpha);
            this.runeGlow.fillRect(this.endRoomStart + 120 * this.scaleFactor, 110 * this.scaleFactor,
                20 * this.scaleFactor, 80 * this.scaleFactor);
            this.runeGlow.fillRect(this.endRoomStart + 330 * this.scaleFactor, 110 * this.scaleFactor,
                20 * this.scaleFactor, 80 * this.scaleFactor);
            this.runeGlow.fillRect(this.endRoomStart + 150 * this.scaleFactor, this.floorY - 100,
                180 * this.scaleFactor, 7 * this.scaleFactor);
            return state.elapsed >= state.duration;
        }
        if (name === 'crownRises') {
            this.crownRiseElapsed = state.elapsed;
            const progress = Math.min(1, state.elapsed / state.duration);
            this.orb.setPosition(this.orbHomeX, this.orbHomeY - progress * ORB_FEAR.rises.riseH * HERO_STAND_PX);
            return state.elapsed >= state.duration;
        }
        if (name === 'crownToHero') {
            const duration = ORB_FEAR.floatToHero.seconds;
            const progress = Math.min(1, state.elapsed / duration);
            const heroX = this.player.sprite.body.center.x;
            const heroY = this.player.sprite.body.bottom - HERO_STAND_PX * 0.55;
            this.orb.setPosition(
                this.orbStartX + (heroX - this.orbStartX) * progress,
                this.orbStartY + (heroY - this.orbStartY) * progress + Math.sin(state.elapsed * 5) * ORB_FEAR.floatToHero.bobPx
            );
            const scale = this.orbStartScale + (ORB_FEAR.heldWidthH * HERO_STAND_PX / 153 - this.orbStartScale) * progress;
            this.orb.setScale(scale);
            if (state.elapsed >= duration) {
                this.orb.setVisible(false);
                this.absorbFlash.setVisible(true);
                this.absorbElapsed = 0;
                if (!this.collectedFear) {
                    const orbs = this.registry.get('orbs');
                    const list = Array.isArray(orbs) ? orbs : [];
                    if (ORB_ORDER.includes(ORB_FEAR.key) && !list.includes(ORB_FEAR.key)) {
                        this.registry.set('orbs', [...list, ORB_FEAR.key]);
                    }
                    this.collectedFear = true;
                    this.updateOrbHud(true);
                }
                const orbs = this.registry.get('orbs');
                const count = Array.isArray(orbs) ? orbs.length : 0;
                this.objectiveText.setText(ORB_NAMES[ORB_FEAR.key]).setAlpha(1).setVisible(true);
                this.objectiveSub.setText(orbHudText(count)).setAlpha(1).setVisible(true);
                return true;
            }
            return false;
        }
        return false;
    }

    beginChase() {
        if (this.chaseStarted) return;
        this.chaseStarted = true;
        this.chaseActive = true;
        this.player.controlsLocked = false;
        this.player.forcedWalkDirection = 0;
        this.player.forcedWalkSpeed = 0;
        this.stalker.startChasing();
        this.startHeartbeat();
    }

    startHeartbeat() {
        if (this.heartbeatSound && !this.heartbeatSound.isPlaying) {
            this.heartbeatSound.play();
        }
    }

    emitStalkerPuffs(x, y) {
        this.stalker.emitPuffs(x, y);
    }

    spawnDissolvePuffs() {
        const x = this.stalker.x;
        const y = this.floorY - this.stalker.hitHalfHeight * 0.55;
        for (let index = 0; index < this.dissolvePuffs.length; index += 1) {
            const puff = this.dissolvePuffs[index];
            puff.setPosition(x, y);
            puff.life = SHRINE.stalkerDissolve.seconds;
            puff.vx = (index % 2 === 0 ? 1 : -1) * (24 + index * 8);
            puff.vy = -30 - (index % 4) * 12;
            puff.setFillStyle(index % 2 === 0 ? SHRINE.stalkerDissolve.color : SHRINE.stalkerDissolve.glow, 0.9)
                .setVisible(true);
        }
    }

    updateDissolvePuffs() {
        for (const puff of this.dissolvePuffs) {
            if (puff.life <= 0) continue;
            puff.life = Math.max(0, puff.life - this.deltaSeconds);
            puff.x += puff.vx * this.deltaSeconds;
            puff.y += puff.vy * this.deltaSeconds;
            puff.vy += 30 * this.deltaSeconds;
            puff.setAlpha(puff.life / SHRINE.stalkerDissolve.seconds);
            if (puff.life === 0) puff.setVisible(false);
        }
    }

    updateOrbHud(force = false) {
        const orbs = this.registry.get('orbs');
        const count = Array.isArray(orbs) ? orbs.length : 0;
        if (force || count !== this.orbCount) {
            this.orbCount = count;
            this.orbText.setText(orbHudText(count));
        }
    }

    update(_time, delta) {
        if (!this.player || !this.player.sprite.active || this.transitionStarted) return;
        this.deltaSeconds = delta / 1000;
        this.elapsed += this.deltaSeconds;
        this.player.update(delta);
        this.applyObstacleInteractions();
        this.updateObstacles(delta);
        this.updateStalker(delta);
        this.updateHeroEffects(delta);
        this.updateFear(delta);
        this.updateLightingMask();
        this.updateFinale(delta);
        this.updateArrow(delta);
        this.updateHud(delta);
        this.bubble.update(this.deltaSeconds);

        if (Input.Keyboard.JustDown(this.restartKey)) {
            this.scene.restart();
            return;
        }
        if (DEBUG_KEYS && Input.Keyboard.JustDown(this.skipKey)) {
            this.arrowText.setVisible(false);
            if (this.runner.index < 2) this.runner.jumpToId('arrow');
            else if (this.runner.index < 10) {
                this.resetHeroAt(this.blackoutX + 24);
                this.stalker.appear(this.player.sprite.body.center.x - STALKER.behindGapH * HERO_STAND_PX);
                this.runner.jumpToId('chase');
            } else this.runner.jumpToId('chase');
        }
        if (this.failFadeElapsed >= 0) {
            this.updateFailFade(delta);
            return;
        }
        this.runner.update(this.deltaSeconds);
        if (this.retryFadeElapsed >= 0) {
            this.retryFadeElapsed += this.deltaSeconds;
            this.fadeOverlay.setVisible(true)
                .setAlpha(Math.max(0, 1 - this.retryFadeElapsed / FAIL.fadeIn));
            if (this.retryFadeElapsed >= FAIL.fadeIn) {
                this.fadeOverlay.setVisible(false);
                this.retryFadeElapsed = -1;
            }
        }
    }

    updateStalker(delta) {
        if (this.stalker.state === 'hidden' || this.stalker.state === 'dissolving') return;
        const heroX = this.player.sprite.body.center.x;
        this.stalker.update(delta, heroX, (x) => this.isInsideLight(x));
        if (this.stalker.state === 'chasing' && this.stalker.catchCooldown === 0 &&
            Math.abs(heroX - this.stalker.x) <= STALKER.catchDistH * HERO_STAND_PX) {
            this.handleCatch();
        }
    }

    handleCatch() {
        this.catchCount += 1;
        this.player.takeDamage(STALKER.catch.damage, this.stalker.x, STALKER.catch.knockbackPx);
        this.stalker.recoil();
        this.player.controlsLocked = false;
        this.heroStunTimer = STALKER.catch.heroStun;
        if (this.catchCount >= 3) {
            this.player.health = 0;
            this.player.isGameOver = true;
            this.triggerGameOver();
        }
    }

    applyObstacleInteractions() {
        const heroBody = this.player.sprite.body;
        const heroX = heroBody.center.x;
        const heroBottom = heroBody.bottom;
        const attack = this.player.attack;
        const attackActive = Boolean(attack && (this.player.hitBoxActive || attack.moveName === 'fire'));
        for (const obstacle of this.obstacles) {
            if (obstacle.broken) continue;
            const overlapX = Math.abs(heroX - obstacle.x) <= obstacle.width / 2 + heroBody.width / 2;
            if (!overlapX) continue;
            if (obstacle.kind === 'barricade') {
                if (attackActive && attack.moveName !== 'fire' && this.attackHitsObstacle(obstacle)) {
                    if (!attack.hitSet.has(obstacle)) {
                        attack.hitSet.add(obstacle);
                        if (obstacle.hit()) this.emitObstacleDust(obstacle.x, this.floorY - obstacle.height / 2);
                    }
                }
                if (this.fireballHits(obstacle.x, this.floorY - obstacle.height / 2, obstacle.width / 2, obstacle.height / 2)) {
                    obstacle.hit();
                    this.emitObstacleDust(obstacle.x, this.floorY - obstacle.height / 2);
                }
                if (!obstacle.broken && heroX < obstacle.x) {
                    heroBody.reset(obstacle.x - obstacle.width / 2 - heroBody.width / 2 - 2, heroBody.y);
                    heroBody.setVelocityX(0);
                }
            } else if (heroBottom > this.floorY - obstacle.height + 8) {
                if (heroX < obstacle.x && heroBody.velocity.x > 0) {
                    heroBody.reset(obstacle.x - obstacle.width / 2 - heroBody.width / 2 - 2, heroBody.y);
                }
                if (!obstacle.stumbleTriggered) {
                    obstacle.stumbleTriggered = true;
                    this.stumbleTimer = CHASE_COURSE.stumble.seconds;
                    heroBody.setVelocityX(-CHASE_COURSE.stumble.knockbackPx);
                    this.player.flashTimer = Math.max(this.player.flashTimer, 0.14);
                }
            }
        }

        for (const brazier of this.braziers) {
            if (this.fireballHits(brazier.x, this.floorY - brazier.height / 2, brazier.width / 2, brazier.height)) {
                if (brazier.litTimer <= 0) {
                    brazier.light(brazier.sourceSpec.litSeconds, brazier.sourceSpec.radiusH * HERO_STAND_PX);
                    this.emitObstacleDust(brazier.x, this.floorY - brazier.height);
                }
            }
        }

        for (const wisp of this.wisps) {
            if (!wisp.graphics.visible) continue;
            if (Math.abs(heroX - wisp.x) < HERO_STAND_PX * 0.35 && Math.abs(heroBottom - this.floorY) < HERO_STAND_PX * 0.5) {
                wisp.graphics.setVisible(false);
                this.player.heal(CHASE_COURSE.wispHeal);
                this.emitObstacleDust(wisp.x, this.floorY - wisp.height);
            }
        }
        if (attackActive && attack.moveName === 'fire' && !this.brazierHintShown) {
            this.brazierHintShown = true;
        }
    }

    attackHitsObstacle(obstacle) {
        const attack = this.player.attack;
        if (!attack || !this.player.hitBoxActive) return false;
        const x = this.player.hitBoxX;
        const width = this.player.hitBoxWidth;
        const left = Math.min(x, x + width);
        const right = Math.max(x, x + width);
        return obstacle.x + obstacle.width / 2 >= left && obstacle.x - obstacle.width / 2 <= right;
    }

    fireballHits(x, y, halfWidth, halfHeight) {
        for (const ball of this.player.fireballs) {
            if (!ball.active || ball.hitSet.has(x)) continue;
            if (Math.abs(ball.x - x) <= ball.radius + halfWidth && Math.abs(ball.y - y) <= ball.radius + halfHeight) {
                ball.hitSet.add(x);
                return true;
            }
        }
        return false;
    }

    emitObstacleDust(x, y) {
        for (let index = 0; index < this.obstacleDust.length; index += 1) {
            const dust = this.obstacleDust[index];
            if (dust.life > 0) continue;
            dust.setPosition(x, y).setVisible(true).setAlpha(0.9);
            dust.life = 0.45;
            dust.vx = (index % 2 === 0 ? -1 : 1) * (20 + index * 5);
            dust.vy = -25 - (index % 4) * 9;
        }
    }

    updateObstacles(delta) {
        for (const obstacle of this.obstacles) obstacle.update(delta);
        for (const brazier of this.braziers) brazier.update(delta);
        for (const wisp of this.wisps) wisp.update(delta);
        for (const dust of this.obstacleDust) {
            if (dust.life <= 0) continue;
            dust.life = Math.max(0, dust.life - this.deltaSeconds);
            dust.x += dust.vx * this.deltaSeconds;
            dust.y += dust.vy * this.deltaSeconds;
            dust.vy += 60 * this.deltaSeconds;
            dust.setAlpha(dust.life / 0.45);
            if (dust.life === 0) dust.setVisible(false);
        }
        if (!this.brazierHintShown) {
            const first = this.braziers[0];
            if (Math.abs(this.player.sprite.body.center.x - first.x) < WIDTH * 1.8) {
                this.brazierHintShown = true;
                this.fireHintElapsed = 2.8;
                this.fireHint.setVisible(true).setAlpha(1);
            }
        }
    }

    updateHeroEffects(delta) {
        const seconds = delta / 1000;
        if (this.stumbleTimer > 0) {
            this.stumbleTimer = Math.max(0, this.stumbleTimer - seconds);
            if (this.stumbleTimer === 0) {
                for (const obstacle of this.obstacles) {
                    if (obstacle.kind !== 'barricade' && Math.abs(this.player.sprite.body.center.x - obstacle.x) > obstacle.width) {
                        obstacle.stumbleTriggered = false;
                    }
                }
            }
        }
        if (this.heroStunTimer > 0) {
            this.heroStunTimer = Math.max(0, this.heroStunTimer - seconds);
            this.player.sprite.body.setVelocityX(0);
            if (this.heroStunTimer === 0 && !this.chaseFailed) {
                this.player.controlsLocked = false;
                this.player.forcedWalkDirection = 0;
                this.player.forcedWalkSpeed = 0;
            }
        }
        if (this.followThroughRemaining > 0) {
            this.followThroughRemaining = Math.max(0, this.followThroughRemaining - seconds);
            this.player.controlsLocked = true;
            this.player.forcedWalkDirection = 1;
            this.player.forcedWalkSpeed = this.player.moveSpeed;
            if (this.followThroughRemaining === 0) this.player.forcedWalkSpeed = 0;
        }
    }

    updateFear(delta) {
        const seconds = delta / 1000;
        const gap = Math.max(0, this.player.sprite.body.center.x - this.stalker.x);
        const gapH = gap / HERO_STAND_PX;
        const nearFactor = Math.max(0, Math.min(1, (FEAR.gapHFar - gapH) / (FEAR.gapHFar - FEAR.gapHNear)));
        const bpm = FEAR.bpm.far + (FEAR.bpm.near - FEAR.bpm.far) * nearFactor;
        this.heartbeatPeriod = 60 / bpm;
        this.heartbeatElapsed += seconds;
        if (this.heartbeatElapsed >= this.heartbeatPeriod) {
            this.heartbeatElapsed -= this.heartbeatPeriod;
            if (this.heartbeatSound && this.chaseActive) this.heartbeatSound.play();
        }
        this.vignette.setAlpha(FEAR.vignette.maxAlpha * (0.35 + 0.65 *
            (Math.sin(this.elapsed * Math.PI * 2 / FEAR.vignette.pulse) + 1) / 2) * nearFactor);
        if (this.fireHintElapsed > 0) {
            this.fireHintElapsed = Math.max(0, this.fireHintElapsed - seconds);
            this.fireHint.setAlpha(Math.min(1, this.fireHintElapsed / 0.35));
            if (this.fireHintElapsed === 0) this.fireHint.setVisible(false);
        }
    }

    isInsideLight(x) {
        if (Math.abs(x - this.orbHomeX) <= SHRINE.litRadiusH * HERO_STAND_PX) return true;
        for (const brazier of this.braziers) {
            if (brazier.litTimer > 0 && Math.abs(x - brazier.x) <= brazier.sourceSpec.radiusH * HERO_STAND_PX) return true;
        }
        return false;
    }

    drawHole(context, x, y, radius) {
        if (radius <= 0 || x < -radius || x > WIDTH + radius || y < -radius || y > HEIGHT + radius) return;
        context.globalCompositeOperation = 'destination-out';
        for (let ring = 4; ring >= 1; ring -= 1) {
            const fraction = ring / 4;
            context.globalAlpha = ring === 4 ? 0.18 : 0.23;
            context.beginPath();
            context.arc(x, y, radius * fraction, 0, Math.PI * 2);
            context.fill();
        }
        context.globalAlpha = 1;
        context.globalCompositeOperation = 'source-over';
    }

    updateLightingMask() {
        const context = this.maskContext;
        context.clearRect(0, 0, WIDTH, HEIGHT);
        context.fillStyle = `rgba(3,2,10,${this.ambientAlpha})`;
        context.fillRect(0, 0, WIDTH, HEIGHT);
        const cameraX = this.cameras.main.scrollX;
        const cameraY = this.cameras.main.scrollY;
        const heroX = this.player.sprite.body.center.x;
        const gapH = Math.max(0, (heroX - this.stalker.x) / HERO_STAND_PX);
        const squeeze = gapH >= DARKNESS.fearSqueeze.startGapH
            ? 1
            : DARKNESS.fearSqueeze.minRadiusFrac +
                (1 - DARKNESS.fearSqueeze.minRadiusFrac) * gapH / DARKNESS.fearSqueeze.startGapH;
        const flicker = 1 + Math.sin(this.elapsed * 21) * DARKNESS.heroLightFlicker;
        this.drawHole(context, heroX - cameraX, this.player.sprite.body.center.y - cameraY,
            DARKNESS.heroLightRadiusH * HERO_STAND_PX * squeeze * flicker);
        for (const torch of this.torchPoints) {
            this.drawHole(context, torch.x - cameraX, torch.y - cameraY, DARKNESS.torchLightRadiusH * HERO_STAND_PX);
        }
        this.drawHole(context, this.orb.x - cameraX, this.orb.y - cameraY, ORB_FEAR.glow.radiusH * HERO_STAND_PX);
        for (const brazier of this.braziers) {
            if (brazier.litTimer > 0) {
                this.drawHole(context, brazier.x - cameraX, this.floorY - brazier.height - cameraY,
                    brazier.sourceSpec.radiusH * HERO_STAND_PX);
            }
        }
        this.maskTexture.refresh();

        this.lightGlow.clear();
        for (let index = 0; index < this.torchPoints.length; index += 1) {
            const torch = this.torchPoints[index];
            const glow = this.torchGlows[index];
            const alpha = CORRIDOR.torchFlicker * (0.65 + 0.35 * Math.sin(this.elapsed * 8 + torch.phase));
            glow.setAlpha(alpha);
        }
        const distance = Math.abs(this.orbHomeX - heroX);
        const orbAlpha = ORB_FEAR.glow.alpha * Math.max(0.16, 1 - distance / (WIDTH * 5)) *
            (0.75 + 0.25 * Math.sin(this.elapsed * Math.PI * 2 / ORB_FEAR.glow.pulseSeconds));
        this.lightGlow.fillStyle(ORB_FEAR.glow.color, orbAlpha);
        this.lightGlow.fillCircle(this.orb.x, this.orb.y, ORB_FEAR.glow.radiusH * HERO_STAND_PX * 0.55);
        this.orbGlow.clear();
        this.orbGlow.fillStyle(ORB_FEAR.glow.color, orbAlpha);
        this.orbGlow.fillCircle(this.orb.x, this.orb.y, ORB_FEAR.glow.radiusH * HERO_STAND_PX);
        const camRight = cameraX + WIDTH;
        const screensAhead = (this.orb.x - camRight) / WIDTH;
        if (screensAhead > 0 && screensAhead <= ORB_FEAR.beaconHint.startScreens) {
            this.beaconGlow.setVisible(true).clear();
            this.beaconGlow.fillStyle(ORB_FEAR.beaconHint.color,
                ORB_FEAR.beaconHint.alpha * (0.55 + 0.45 * Math.sin(this.elapsed * 5)));
            this.beaconGlow.fillCircle(WIDTH - 30, HEIGHT / 2, 27 + Math.sin(this.elapsed * 5) * 6);
        } else {
            this.beaconGlow.setVisible(false);
        }
    }

    updateFinale(delta) {
        for (const puff of this.dissolvePuffs) {
            if (puff.life > 0) {
                puff.life = Math.max(0, puff.life - this.deltaSeconds);
                puff.x += puff.vx * this.deltaSeconds;
                puff.y += puff.vy * this.deltaSeconds;
                puff.vy += 30 * this.deltaSeconds;
                puff.setAlpha(puff.life / SHRINE.stalkerDissolve.seconds);
                if (puff.life === 0) puff.setVisible(false);
            }
        }
        this.ringDecal.setAlpha(SHRINE.ringDecal.alpha *
            (0.75 + 0.25 * Math.sin(this.elapsed * Math.PI * 2 / 2)));
        if (this.absorbFlash.visible) {
            this.absorbElapsed += delta / 1000;
            const progress = Math.min(1, this.absorbElapsed / ORB_FEAR.absorbFlash.seconds);
            this.absorbFlash.setAlpha(Math.sin(progress * Math.PI) * 0.8);
            if (progress >= 1) this.absorbFlash.setVisible(false);
        }
        if (this.objectiveSub.visible && this.crownFloatElapsed >= ORB_FEAR.floatToHero.seconds + ORB_FEAR.hud.hold) {
            this.objectiveText.setVisible(false);
            this.objectiveSub.setVisible(false);
        }
    }

    updateArrow(delta) {
        if (!this.arrowText.visible) return;
        this.arrowElapsed += delta / 1000;
        this.arrowText.setAlpha(0.45 + 0.55 * (Math.sin(this.arrowElapsed * Math.PI * 2 / ACT2_FX.arrowRight.pulseSeconds) + 1) / 2);
    }

    updateHud(delta) {
        this.hud.update(delta);
        this.updateOrbHud();
        this.objectiveText.setAlpha(this.objectiveText.visible
            ? 0.8 + 0.2 * Math.sin(this.elapsed * 4)
            : 0);
    }

    triggerGameOver() {
        if (this.chaseFailed || !this.chaseActive || this.transitionStarted) return;
        this.chaseFailed = true;
        this.player.controlsLocked = true;
        this.player.forcedWalkDirection = 0;
        this.player.forcedWalkSpeed = 0;
        this.failFadeElapsed = 0;
        this.fadeOverlay.setVisible(true).setAlpha(0);
        this.gameOverText.setVisible(true);
    }

    updateFailFade(delta) {
        this.failFadeElapsed += delta / 1000;
        this.fadeOverlay.setAlpha(Math.min(1, this.failFadeElapsed / FAIL.fadeOut));
        if (this.failFadeElapsed < FAIL.fadeOut) return;
        this.resetChase();
    }

    resetChase() {
        this.player.health = this.player.maxHealth;
        this.player.isGameOver = false;
        this.player.invulnerableTimer = 0;
        this.player.flashTimer = 0;
        this.player.attack = null;
        this.player.bufferedMove = null;
        this.player.controlsLocked = true;
        this.player.forcedWalkDirection = 0;
        this.player.forcedWalkSpeed = 0;
        this.resetHeroAt(this.blackoutX + 24);
        this.player.sprite.body.setVelocity(0, 0);
        this.player.visual.setAlpha(1);
        this.catchCount = 0;
        this.stumbleTimer = 0;
        this.heroStunTimer = 0;
        this.chaseFailed = false;
        this.failFadeElapsed = -1;
        this.retryFadeElapsed = -1;
        this.gameOverText.setVisible(false);
        this.chaseActive = true;
        this.chaseStarted = true;
        this.stalker.reset(this.player.sprite.body.center.x - STALKER.behindGapH * HERO_STAND_PX, false);
        this.stalker.startChasing();
        for (const obstacle of this.obstacles) obstacle.reset();
        for (const brazier of this.braziers) brazier.reset();
        for (const wisp of this.wisps) wisp.reset();
        this.brazierHintShown = false;
        this.fireHintElapsed = 0;
        this.fireHint.setVisible(false);
        this.followThroughRemaining = 0;
        this.runner.jumpToId('chase');
        this.retryFadeElapsed = 0;
        this.fadeOverlay.setVisible(true).setAlpha(1);
    }

    cleanup() {
        if (this.heartbeatSound) {
            this.heartbeatSound.stop();
            this.heartbeatSound.destroy();
            this.heartbeatSound = null;
        }
        if (this.runner) this.runner.destroy();
        if (this.bubble) this.bubble.destroy();
        if (this.hud) this.hud.destroy();
        if (this.textures.exists(MASK_TEXTURE)) this.textures.remove(MASK_TEXTURE);
        if (this.textures.exists(VIGNETTE_TEXTURE)) this.textures.remove(VIGNETTE_TEXTURE);
    }

    resetHeroAt(x) {
        const y = this.floorY - 48;
        this.player.sprite.setPosition(x, y);
        this.player.sprite.body.reset(x, y);
    }
}
