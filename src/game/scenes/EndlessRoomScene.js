import { BlendModes, Input, Scene } from 'phaser';
import BeatRunner from '../story/BeatRunner';
import Player from '../entities/Player';
import PlayerHud from '../ui/PlayerHud';
import WorldBubble from '../ui/WorldBubble';
import { ACT3_PACING, ACT3_SPEAKERS } from '../config/actThreeData';
import { HERO_PHYSICS, HERO_STAND_PX } from '../config/animationData';
import {
    ART,
    CHAMBER,
    CHAMBER_BEATS,
    chamberAt,
    isCorrectPick,
    makeLayout,
    nextCorrectDoor,
    ORB_TIME,
    orderKey,
    PUZZLE,
    ROOM,
    ROOM_LINES,
    TIME_ASSETS,
    TIME_DEBUG,
    TIME_FLOW,
    WORLD,
} from '../config/timeData';

const WIDTH = 1280;
const HEIGHT = 720;
const VOID_TEXTURE = 'time-chamber-orb-void';

function ensureOrbProgress(registry) {
    if (registry.get('orbs') == null) registry.set('orbs', ['fear']);
}

function tintCss(color) {
    return `#${color.toString(16).padStart(6, '0')}`;
}

export default class EndlessRoomScene extends Scene {
    constructor() {
        super(TIME_FLOW.room);
    }

    init(data = {}) {
        this.startChamberRequested = data.startChamber === true;
    }

    create() {
        ensureOrbProgress(this.registry);
        this.cameras.main.resetFX();
        this.cameras.main.setBackgroundColor('#000000');
        this.cameras.main.setBounds(0, 0, WORLD.width, WORLD.height);
        this.physics.world.setBounds(0, 0, WORLD.width, WORLD.height);
        this.scaleFactor = ART.scale;
        this.floorY = ROOM.floorFeetY * this.scaleFactor;
        this.loopIndex = 0;
        this.resetCount = 0;
        this.progress = 0;
        this.hours = makeLayout(0);
        this.previousOrderKey = orderKey(this.hours);
        this.spentDoors = [false, false, false];
        this.lineShown = new Set();
        this.changedLineQueued = false;
        this.forceWrongNext = false;
        this.elapsed = 0;
        this.state = 'fadeIn';
        this.stateElapsed = 0;
        this.stateDuration = CHAMBER.fadeIn;
        this.selectedDoor = -1;
        this.pendingPickCorrect = false;
        this.correctDoor = -1;
        this.chamberElapsed = 0;
        this.chamberFrame = -1;
        this.orbCollected = false;
        this.bannerElapsed = -1;
        this.hudOrbPulse = -1;
        this.chamberLayerReady = false;
        this.chamberFadeElapsed = -1;
        this.transitionStarted = false;
        this.createRoom();
        this.createHero();
        this.createDoorObjects();
        this.createChamberObjects();
        this.createUi();
        this.createInput();
        this.events.once('shutdown', () => this.cleanup());

        if (this.startChamberRequested) {
            this.beginChamber(true);
        } else {
            this.fade.setAlpha(1).setVisible(true);
        }
    }

    createRoom() {
        this.roomLayer = this.add.container(0, 0).setDepth(-10);
        if (this.textures.exists(ROOM.bgKey)) {
            this.roomBackground = this.add.image(0, 0, ROOM.bgKey)
                .setOrigin(0, 0).setScale(this.scaleFactor);
            this.roomLayer.add(this.roomBackground);
        } else {
            console.warn('[EndlessRoomScene] Optional time-endless art is missing; drawing the configured room.');
            this.drawProceduralRoom();
        }
        this.floor = this.add.rectangle(WORLD.width / 2, this.floorY + 28 * this.scaleFactor,
            WORLD.width, 56 * this.scaleFactor, 0x000000, 0).setVisible(false);
        this.physics.add.existing(this.floor, true);

        this.wallLeft = this.add.rectangle(ROOM.wallLeft * this.scaleFactor - 8,
            this.floorY - 180 * this.scaleFactor, 16 * this.scaleFactor, 420 * this.scaleFactor, 0, 0)
            .setVisible(false);
        this.wallRight = this.add.rectangle(ROOM.wallRight * this.scaleFactor + 8,
            this.floorY - 180 * this.scaleFactor, 16 * this.scaleFactor, 420 * this.scaleFactor, 0, 0)
            .setVisible(false);
        this.physics.add.existing(this.wallLeft, true);
        this.physics.add.existing(this.wallRight, true);
    }

    drawProceduralRoom() {
        const cfg = ROOM.procedural;
        const art = this.add.graphics();
        art.fillStyle(cfg.wall, 1).fillRect(0, 0, WORLD.width, WORLD.height);
        art.fillStyle(0x0a1123, 1).fillRect(0, 0, WORLD.width, cfg.bandTop * this.scaleFactor);
        art.fillRect(0, cfg.bandBottomFrom * this.scaleFactor, WORLD.width, WORLD.height);
        art.fillStyle(cfg.wallBrick, 0.8);
        const brickH = 42 * this.scaleFactor;
        const brickW = 120 * this.scaleFactor;
        for (let row = 1; row < 12; row += 1) {
            const y = row * brickH;
            art.lineStyle(2, cfg.wallBrick, 0.7);
            art.lineBetween(0, y, WORLD.width, y);
            for (let x = (row % 2) * brickW / 2; x < WORLD.width; x += brickW) {
                art.lineBetween(x, y - brickH, x, y);
            }
        }
        for (const center of ROOM.doorCenters) {
            const x = center * this.scaleFactor;
            const left = (center - ROOM.doorHalfWidth) * this.scaleFactor;
            const top = ROOM.doorTopY * this.scaleFactor;
            const width = ROOM.doorHalfWidth * 2 * this.scaleFactor;
            const height = (ROOM.doorBottomY - ROOM.doorTopY) * this.scaleFactor;
            art.fillStyle(cfg.doorGlow, 0.09);
            art.fillEllipse(x, ROOM.doorBottomY * this.scaleFactor + 4, width * 1.3, 30 * this.scaleFactor);
            art.fillStyle(cfg.door, 1).fillRect(left, top + 25 * this.scaleFactor, width, height - 25 * this.scaleFactor);
            art.fillTriangle(left, top + 28 * this.scaleFactor, x, top - 28 * this.scaleFactor,
                left + width, top + 28 * this.scaleFactor);
            art.lineStyle(12 * this.scaleFactor, cfg.doorFrame, 1);
            art.strokeRoundedRect(left, top, width, height, 48 * this.scaleFactor);
            art.lineStyle(3, 0x161821, 1);
            art.lineBetween(x, top + 34 * this.scaleFactor, x, ROOM.doorBottomY * this.scaleFactor);
        }
        art.fillStyle(cfg.floor, 1).fillRect(0, this.floorY, WORLD.width, WORLD.height - this.floorY);
        art.fillStyle(cfg.floorLine, 1).fillRect(0, this.floorY, WORLD.width, 5 * this.scaleFactor);
        this.roomArt = art;
        this.roomLayer.add(art);

        this.cogs = this.add.graphics().setDepth(-8);
        this.cogs.lineStyle(4, 0x34415d, 0.65);
        this.cogs.strokeCircle(60 * this.scaleFactor, 130 * this.scaleFactor, 42 * this.scaleFactor);
        this.cogs.strokeCircle((ART.width - 60) * this.scaleFactor, 145 * this.scaleFactor, 54 * this.scaleFactor);
        this.cogs.lineStyle(3, 0x34415d, 0.5);
        for (let tooth = 0; tooth < 12; tooth += 1) {
            const angle = tooth * Math.PI / 6;
            this.cogs.lineBetween(
                (60 + Math.cos(angle) * 43) * this.scaleFactor,
                (130 + Math.sin(angle) * 43) * this.scaleFactor,
                (60 + Math.cos(angle) * 52) * this.scaleFactor,
                (130 + Math.sin(angle) * 52) * this.scaleFactor
            );
        }
    }

    createHero() {
        this.player = new Player(this, ROOM.heroStartX * this.scaleFactor, this.floorY - 50 * this.scaleFactor);
        this.player.moveSpeed = HERO_PHYSICS.moveSpeed;
        this.player.sprite.body.setCollideWorldBounds(false);
        this.physics.add.collider(this.player.sprite, this.floor);
        this.physics.add.collider(this.player.sprite, this.wallLeft);
        this.physics.add.collider(this.player.sprite, this.wallRight);
        this.camera = this.cameras.main;
        this.camera.setScroll(0, 0);
    }

    createDoorObjects() {
        this.doors = [];
        for (let index = 0; index < ROOM.doorCenters.length; index += 1) {
            const x = ROOM.doorCenters[index] * this.scaleFactor;
            const clockY = ROOM.clockY * this.scaleFactor;
            const ring = this.add.graphics().setDepth(6);
            const hand = this.add.graphics().setDepth(7);
            const hour = this.add.text(x, clockY, '', {
                fontFamily: 'Arial Black', fontSize: `${24 * this.scaleFactor}px`,
                color: '#d7efff', stroke: '#06101d', strokeThickness: 4,
            }).setOrigin(0.5).setDepth(8);
            const prompt = this.add.text(x, ROOM.doorTopY * this.scaleFactor - 34, 'E', {
                fontFamily: 'Arial Black', fontSize: '24px', color: '#f5d58a',
                stroke: '#090710', strokeThickness: 5,
            }).setOrigin(0.5).setDepth(20).setVisible(false);
            const ripple = this.add.graphics().setDepth(15).setVisible(false);
            const door = {
                index, x, ring, hand, hour, prompt, ripple,
                pulseElapsed: 0,
                dissolveAlpha: 1,
            };
            this.doors.push(door);
            this.drawClock(door, this.hours[index], ROOM.colors.lit);
        }
        this.promptDoor = -1;
        this.roomGlow = this.add.graphics().setBlendMode(BlendModes.ADD).setDepth(5);
        this.rippleFlash = this.add.graphics().setBlendMode(BlendModes.ADD).setDepth(14);
        this.ruleText = this.add.text(WIDTH / 2, 116, PUZZLE.hint.ruleText, {
            fontFamily: 'Arial Black', fontSize: '24px', color: tintCss(ROOM.colors.rewind),
            stroke: '#040814', strokeThickness: 6, letterSpacing: '5px',
        }).setOrigin(0.5).setDepth(30).setVisible(false);
    }

    drawClock(door, hour, color, pulse = 1) {
        const radius = ROOM.clockRadius * this.scaleFactor;
        const centerY = ROOM.clockY * this.scaleFactor;
        door.ring.clear();
        door.ring.lineStyle(4 * this.scaleFactor, color, pulse);
        door.ring.strokeCircle(door.x, centerY, radius);
        door.ring.fillStyle(0x0b1120, 0.88).fillCircle(door.x, centerY, radius - 3);
        door.hand.clear();
        const hourAngle = ((hour % 12) / 12) * Math.PI * 2 - Math.PI / 2;
        door.hand.lineStyle(3, color, pulse);
        door.hand.lineBetween(door.x, centerY, door.x + Math.cos(hourAngle) * radius * 0.55,
            centerY + Math.sin(hourAngle) * radius * 0.55);
        door.hand.lineStyle(2, 0xddeeff, 0.95);
        door.hand.lineBetween(door.x, centerY, door.x + Math.cos(hourAngle * 2) * radius * 0.8,
            centerY + Math.sin(hourAngle * 2) * radius * 0.8);
        door.hour.setText(`${hour}`).setColor(tintCss(color));
        door.hour.setAlpha(pulse);
    }

    createChamberObjects() {
        const assetA = this.textures.exists('time-chamber-a');
        const assetB = this.textures.exists('time-chamber-b');
        this.hasChamberArt = assetA && assetB;
        if (!this.hasChamberArt) console.warn('[EndlessRoomScene] Chamber art is missing; using a procedural chamber placeholder.');
        this.chamberBackground = this.hasChamberArt
            ? this.add.image(0, 0, 'time-chamber-a', 0).setOrigin(0, 0).setScale(this.scaleFactor).setDepth(-20).setVisible(false)
            : this.add.rectangle(WORLD.width / 2, WORLD.height / 2, WORLD.width, WORLD.height, 0x080d1a).setDepth(-20).setVisible(false);
        this.chamberPlaceholder = this.add.graphics().setDepth(-10).setVisible(false);
        if (!this.hasChamberArt) this.drawChamberPlaceholder();

        this.chamberHeroStarted = false;
        this.orb = this.textures.exists(ORB_TIME.key)
            ? this.add.sprite(0, 0, ORB_TIME.key, 0).setVisible(false).setDepth(12)
            : this.add.ellipse(0, 0, 50, 58, ORB_TIME.glowColor, 0.9).setVisible(false).setDepth(12);
        if (!this.textures.exists(ORB_TIME.key)) console.warn('[EndlessRoomScene] Orb sprite missing; using a drawn orb.');
        this.createVoidTexture();
        this.voidImage = this.add.image(
            CHAMBER.void.x * this.scaleFactor,
            CHAMBER.void.y * this.scaleFactor,
            this.textures.exists(VOID_TEXTURE) ? VOID_TEXTURE : '__WHITE'
        ).setDisplaySize(CHAMBER.void.rx * 2 * this.scaleFactor, CHAMBER.void.ry * 2 * this.scaleFactor)
            .setAlpha(0).setDepth(11).setVisible(false);
        this.orbGlow = this.add.circle(0, 0, 52 * this.scaleFactor, ORB_TIME.glowColor, 0.3)
            .setBlendMode(BlendModes.ADD).setDepth(10).setVisible(false);
        this.orbFlash = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0xaadfff, 0)
            .setBlendMode(BlendModes.ADD).setScrollFactor(0).setDepth(145);
        this.bannerBack = this.add.rectangle(WIDTH / 2, HEIGHT / 2, 690, 150, 0x061020, 0.94)
            .setStrokeStyle(3, ORB_TIME.hudColor, 0.95).setScrollFactor(0).setDepth(152).setVisible(false);
        this.bannerTitle = this.add.text(WIDTH / 2, HEIGHT / 2 - 24, ORB_TIME.bannerTitle, {
            fontFamily: 'Arial Black', fontSize: '36px', color: tintCss(ORB_TIME.hudColor),
            stroke: '#030710', strokeThickness: 7,
        }).setOrigin(0.5).setScrollFactor(0).setDepth(153).setVisible(false);
        this.bannerSub = this.add.text(WIDTH / 2, HEIGHT / 2 + 28, ORB_TIME.bannerSub, {
            fontFamily: 'Arial', fontSize: '22px', color: '#eef5ff',
            stroke: '#030710', strokeThickness: 5,
        }).setOrigin(0.5).setScrollFactor(0).setDepth(153).setVisible(false);
    }

    drawChamberPlaceholder() {
        this.chamberPlaceholder.fillStyle(0x0a1224, 1).fillRect(0, 0, WORLD.width, WORLD.height);
        this.chamberPlaceholder.fillStyle(0x243551, 1).fillRect(120, 160, WORLD.width - 240, 460);
        this.chamberPlaceholder.fillStyle(0x111b30, 1).fillRect(0, this.floorY, WORLD.width, WORLD.height - this.floorY);
        this.chamberPlaceholder.fillStyle(0x416083, 1).fillEllipse(
            CHAMBER.pedestal.x * this.scaleFactor, CHAMBER.pedestal.topY * this.scaleFactor,
            230 * this.scaleFactor, 60 * this.scaleFactor
        );
        this.chamberPlaceholder.fillStyle(ORB_TIME.glowColor, 1).fillCircle(
            CHAMBER.orbAnchorArt.x * this.scaleFactor, CHAMBER.orbAnchorArt.y * this.scaleFactor, 28
        );
    }

    createVoidTexture() {
        if (this.textures.exists(VOID_TEXTURE)) return false;
        const canvasTexture = this.textures.createCanvas(VOID_TEXTURE, 128, 128);
        if (!canvasTexture) return false;
        const context = canvasTexture.getContext();
        const gradient = context.createRadialGradient(64, 64, 3, 64, 64, 62);
        gradient.addColorStop(0, '#02060f');
        gradient.addColorStop(0.68, '#030a13');
        gradient.addColorStop(0.9, '#123846');
        gradient.addColorStop(1, '#3ee0ff');
        context.clearRect(0, 0, 128, 128);
        context.fillStyle = gradient;
        context.fillRect(0, 0, 128, 128);
        canvasTexture.refresh();
        this.ownsVoidTexture = true;
        return true;
    }

    createUi() {
        this.hud = new PlayerHud(this, this.player, { showControls: false, showKills: false });
        this.hud.controlsChipBack.setVisible(false);
        this.hud.controlsChip.setVisible(false);
        this.bubble = new WorldBubble(this, {
            speakers: ACT3_SPEAKERS,
            pacing: ACT3_PACING,
            voiceStyle: { y: 150, maxWidth: 500, textColor: '#d9c8ff', glowColor: 0x7a3cff },
        });
        this.bubble.setAnchor('hero', () => ({
            x: this.player.sprite.body.center.x,
            y: this.player.sprite.body.bottom - HERO_STAND_PX - 12,
        }));
        this.loopText = this.add.text(WIDTH / 2, 26, 'LOOP 1', {
            fontFamily: 'Arial Black', fontSize: '18px', color: '#c8dcff',
            stroke: '#030710', strokeThickness: 5,
        }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(110);
        this.orbText = this.add.text(WIDTH - 24, 24, '', {
            fontFamily: 'Arial Black', fontSize: '16px', color: tintCss(ORB_TIME.hudColor),
            stroke: '#08070d', strokeThickness: 4,
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(110);
        this.pips = Array.from({ length: PUZZLE.doorsToPass }, (_unused, index) =>
            this.add.graphics().setScrollFactor(0).setDepth(110).setPosition(WIDTH / 2 - 36 + index * 36, 56)
        );
        this.fade = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x000000, 1)
            .setScrollFactor(0).setDepth(180);
        this.flash = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x000000, 0)
            .setScrollFactor(0).setDepth(140);
        this.debugArt = this.add.graphics().setDepth(100).setVisible(false);
        this.debugText = this.add.text(0, 0, '', {
            fontFamily: 'Arial', fontSize: '12px', color: '#9affdc',
            stroke: '#06120c', strokeThickness: 3,
        }).setDepth(101).setVisible(false);
        this.updatePuzzleHud();
    }

    createInput() {
        this.restartKey = this.input.keyboard.addKey('R');
        this.interactKey = this.input.keyboard.addKey(ROOM.interactKey);
        if (TIME_DEBUG) {
            this.input.keyboard.addCapture('F3,F5,F7');
            this.debugKeys = this.input.keyboard.addKeys({ grid: 'F3', solve: 'F5', wrong: 'F7' });
        }
    }

    updatePuzzleHud() {
        this.loopText.setText(`LOOP ${this.loopIndex + 1}`);
        for (let index = 0; index < this.pips.length; index += 1) {
            const pip = this.pips[index];
            pip.clear();
            pip.lineStyle(2, index < this.progress ? ROOM.colors.lit : 0x48516a, 0.95);
            pip.strokeEllipse(0, 0, 20, 28);
            pip.fillStyle(index < this.progress ? ROOM.colors.lit : 0x171e30, index < this.progress ? 0.95 : 0.8);
            pip.fillEllipse(0, 0, 12, 20);
            pip.lineStyle(2, 0x07101b, 0.85);
            pip.lineBetween(-3, -7, 3, 7);
        }
        this.ruleText.setVisible(this.resetCount >= PUZZLE.hint.ruleAfterResets);
    }

    startLine(name) {
        if (this.lineShown.has(name)) return;
        const line = ROOM_LINES[name];
        if (!line) return;
        this.lineShown.add(name);
        this.bubble.say({ who: line.who, text: line.text });
    }

    nearestDoor() {
        const heroX = this.player.sprite.body.center.x;
        const range = ROOM.interactRange * this.scaleFactor;
        let nearest = -1;
        let distance = range + 1;
        for (let index = 0; index < this.doors.length; index += 1) {
            const current = Math.abs(heroX - this.doors[index].x);
            if (current <= range && current < distance) {
                nearest = index;
                distance = current;
            }
        }
        return nearest;
    }

    enterDoor(index) {
        if (this.state !== 'room' || this.spentDoors[index]) return;
        this.selectedDoor = index;
        this.pendingPickCorrect = this.forceWrongNext
            ? false
            : isCorrectPick(this.hours, this.progress, index);
        this.forceWrongNext = false;
        this.state = 'entering';
        this.stateElapsed = 0;
        this.stateDuration = PUZZLE.timing.enterWalk;
        this.player.controlsLocked = true;
        this.player.forcedWalkDirection = Math.sign(this.doors[index].x - this.player.sprite.body.center.x);
        this.player.forcedWalkSpeed = Math.abs(this.doors[index].x - this.player.sprite.body.center.x) /
            Math.max(0.05, this.stateDuration);
    }

    beginWrongFlash() {
        this.state = 'wrongFlash';
        this.stateElapsed = 0;
        this.stateDuration = PUZZLE.timing.wrongFlash;
        this.player.forcedWalkDirection = 0;
        this.player.visual.setAlpha(0);
        this.flash.setFillStyle(ROOM.colors.wrong, 1).setAlpha(0.62);
        this.cameras.main.shake(PUZZLE.shake.wrong.duration * 1000, PUZZLE.shake.wrong.intensity);
    }

    beginCorrectPick() {
        this.state = 'correctRipple';
        this.stateElapsed = 0;
        this.stateDuration = PUZZLE.timing.correctRipple;
        this.correctDoor = this.selectedDoor;
        this.spentDoors[this.correctDoor] = true;
        this.progress += 1;
        this.drawDoorState(this.correctDoor);
        const door = this.doors[this.correctDoor];
        door.ripple.setVisible(true);
        this.cameras.main.shake(PUZZLE.shake.correct.duration * 1000, PUZZLE.shake.correct.intensity);
        this.rippleFlash.clear();
        this.rippleFlash.lineStyle(6, ROOM.colors.lit, 0.9).strokeCircle(
            door.x, ROOM.doorBottomY * this.scaleFactor - 50, 26 * this.scaleFactor
        );
        if (this.resetCount > 0 && !this.lineShown.has('changed')) this.startLine('changed');
        this.updatePuzzleHud();
    }

    drawDoorState(index) {
        const door = this.doors[index];
        const color = this.spentDoors[index] ? ROOM.colors.spent : ROOM.colors.lit;
        this.drawClock(door, this.hours[index], color);
    }

    finishWrongPick() {
        this.state = 'rewind';
        this.stateElapsed = 0;
        this.stateDuration = PUZZLE.timing.rewind;
        this.previousOrderKey = orderKey(this.hours);
        this.resetCount += 1;
        this.loopIndex += 1;
        this.progress = 0;
        this.spentDoors.fill(false);
        this.hours = makeLayout(this.loopIndex, this.previousOrderKey);
        this.updatePuzzleHud();
        for (let index = 0; index < this.doors.length; index += 1) this.drawDoorState(index);
        if (this.resetCount === 1) this.startLine('reset1');
        if (this.resetCount >= 2 && !this.lineShown.has('changed')) this.startLine('changed');
    }

    beginRespawn() {
        this.state = 'respawn';
        this.stateElapsed = 0;
        this.stateDuration = PUZZLE.timing.respawnFade;
        this.setHeroArtPosition(ROOM.heroStartX * this.scaleFactor, this.floorY);
        this.player.visual.setVisible(true).setAlpha(0);
        this.player.sprite.setVisible(true);
    }

    setHeroArtPosition(x, feetY) {
        this.player.sprite.setPosition(x, feetY - 50 * this.scaleFactor);
        this.player.sprite.body.reset(this.player.sprite.x, this.player.sprite.y);
        this.player.visual.setPosition(this.player.sprite.x, this.player.sprite.y);
    }

    beginDissolve() {
        this.state = 'chamberSequence';
        this.stateElapsed = 0;
        this.progress = PUZZLE.doorsToPass;
        this.updatePuzzleHud();
        this.startChamberRunner();
    }

    setupChamberLayer() {
        this.roomLayer.setVisible(false);
        this.cogs.setVisible(false);
        this.roomGlow.setVisible(false);
        this.ruleText.setVisible(false);
        this.debugArt.setVisible(false);
        this.debugText.setVisible(false);
        for (const door of this.doors) {
            door.ring.setVisible(false);
            door.hand.setVisible(false);
            door.hour.setVisible(false);
            door.prompt.setVisible(false);
            door.ripple.setVisible(false);
        }
        this.chamberBackground.setVisible(true);
        this.chamberPlaceholder.setVisible(true);
        this.floorY = CHAMBER.floorFeetY * this.scaleFactor;
        this.floor.setPosition(WORLD.width / 2, this.floorY + 28 * this.scaleFactor);
        this.player.sprite.body.setCollideWorldBounds(false);
        this.setHeroArtPosition(CHAMBER.heroStartX * this.scaleFactor, this.floorY);
        this.player.controlsLocked = true;
        this.player.forcedWalkDirection = 0;
        this.player.forcedWalkSpeed = 0;
        this.player.visual.setVisible(true).setAlpha(1);
        this.player.sprite.setVisible(true);
        this.chamberHeroStarted = true;
        this.chamberLayerReady = true;
        this.chamberElapsed = 0;
        this.chamberFrame = -1;
        this.voidImage.setVisible(false).setAlpha(0);
        this.orb.setVisible(false);
        this.orbGlow.setVisible(false);
        this.bubble.clear();
        this.camera.resetFX();
        this.camera.setScroll(0, 0);
        this.fade.setVisible(true).setAlpha(1);
        this.chamberFadeElapsed = 0;
    }

    beginChamber(direct = false) {
        this.roomLayer.setVisible(!direct);
        if (direct) {
            this.roomLayer.setVisible(false);
            this.cogs.setVisible(false);
            for (const door of this.doors) {
                door.ring.setVisible(false);
                door.hand.setVisible(false);
                door.hour.setVisible(false);
                door.prompt.setVisible(false);
            }
            this.setupChamberLayer();
            this.startChamberRunner();
            this.chamberRunner.jumpToId('walk');
        } else {
            this.startChamberRunner();
        }
    }

    startChamberRunner() {
        this.chamberRunner = new BeatRunner(this, CHAMBER_BEATS, this.createChamberHandlers()).start();
    }

    createChamberHandlers() {
        return {
            fx: {
                start: (beat) => this.startChamberFx(beat.name),
                update: (dt, state) => this.updateChamberFx(dt, state),
            },
            line: {
                start: (beat) => {
                    const state = { done: false };
                    const line = beat.id === 'h1' ? ROOM_LINES.solved : beat;
                    this.bubble.say({
                        who: line.who,
                        text: line.text,
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
                    return { elapsed: 0, done: false };
                },
                update: (dt, state) => {
                    state.elapsed += dt;
                    this.fade.setVisible(true).setAlpha(Math.min(1, state.elapsed / ORB_TIME.afterFade));
                    if (state.elapsed < ORB_TIME.afterFade) return false;
                    this.scene.start(TIME_FLOW.after);
                    return true;
                },
            },
        };
    }

    startChamberFx(name) {
        if (name === 'doorsDissolve') return { name, elapsed: 0, duration: PUZZLE.timing.dissolve };
        if (name === 'toChamber') return { name, elapsed: 0, duration: PUZZLE.timing.toChamberFade };
        if (name === 'heroWalksToPedestal') {
            this.player.forcedWalkDirection = 1;
            this.player.forcedWalkSpeed = (CHAMBER.heroStopX - CHAMBER.heroStartX) *
                this.scaleFactor / CHAMBER.heroWalkSeconds;
            return { name, elapsed: 0, duration: CHAMBER.heroWalkSeconds };
        }
        if (name === 'orbSwapAndRise') {
            this.orb.setVisible(true);
            this.orbElapsed = 0;
            this.voidImage.setVisible(true).setAlpha(0);
            this.orbGlow.setVisible(true);
            this.orb.setOrigin(TIME_ASSETS.orb.anchorX / TIME_ASSETS.orb.frameWidth,
                TIME_ASSETS.orb.anchorY / TIME_ASSETS.orb.frameHeight);
            this.orb.setPosition(CHAMBER.orbAnchorArt.x * this.scaleFactor,
                CHAMBER.orbAnchorArt.y * this.scaleFactor);
            this.orbBaseScale = CHAMBER.orbScaleArt * this.scaleFactor;
            this.orb.setScale(this.orbBaseScale);
            if (this.orb.type === 'Sprite' && this.anims.exists(ORB_TIME.animKey)) this.orb.play(ORB_TIME.animKey);
            return { name, elapsed: 0, duration: ORB_TIME.riseSeconds };
        }
        if (name === 'orbToHero') {
            this.orbStartX = this.orb.x;
            this.orbStartY = this.orb.y;
            this.orbStartScale = this.orb.scaleX;
            return { name, elapsed: 0, duration: ORB_TIME.floatToHeroSeconds };
        }
        if (name === 'bannerOrb') {
            this.bannerBack.setVisible(true).setAlpha(0);
            this.bannerTitle.setVisible(true).setAlpha(0);
            this.bannerSub.setVisible(true).setAlpha(0);
            return { name, elapsed: 0, duration: 2.2 };
        }
        if (name === 'orbCollected') {
            const orbs = this.registry.get('orbs');
            const list = Array.isArray(orbs) ? orbs : [];
            if (!list.includes(ORB_TIME.id)) this.registry.set('orbs', [...list, ORB_TIME.id]);
            this.orbCollected = true;
            this.updateOrbHud(true);
            this.hudOrbPulse = 0;
            return { name, elapsed: 0, duration: 0.4 };
        }
        throw new Error(`EndlessRoomScene has no chamber FX named "${name}".`);
    }

    updateChamberFx(dt, state) {
        state.elapsed += dt;
        if (state.name === 'doorsDissolve') {
            const progress = Math.min(1, state.elapsed / state.duration);
            for (const door of this.doors) {
                door.ring.setAlpha(1 - progress);
                door.hand.setAlpha(1 - progress);
                door.hour.setAlpha(1 - progress);
                door.ripple.setVisible(true).setAlpha(progress);
            }
            return state.elapsed >= state.duration;
        }
        if (state.name === 'toChamber') {
            this.fade.setVisible(true).setAlpha(Math.min(1, state.elapsed / state.duration));
            if (state.elapsed < state.duration) return false;
            this.setupChamberLayer();
            return true;
        }
        if (state.name === 'heroWalksToPedestal') {
            if (state.elapsed >= state.duration) {
                this.player.forcedWalkDirection = 0;
                this.player.forcedWalkSpeed = 0;
                this.player.controlsLocked = true;
                this.setHeroArtPosition(CHAMBER.heroStopX * this.scaleFactor, this.floorY);
                return true;
            }
            return false;
        }
        if (state.name === 'orbSwapAndRise') {
            const progress = Math.min(1, state.elapsed / state.duration);
            const risePx = ORB_TIME.riseArt * this.scaleFactor;
            const wobble = Math.sin(this.elapsed * 24) * 1.2 * progress;
            this.orb.setPosition(
                CHAMBER.orbAnchorArt.x * this.scaleFactor + wobble,
                CHAMBER.orbAnchorArt.y * this.scaleFactor - risePx * progress
            );
            this.orbGlow.setPosition(this.orb.x, this.orb.y).setAlpha(0.2 + 0.22 * Math.sin(this.elapsed * 5));
            this.voidImage.setAlpha(Math.min(CHAMBER.void.restAlpha,
                CHAMBER.void.restAlpha * state.elapsed / CHAMBER.void.fadeIn));
            return state.elapsed >= state.duration;
        }
        if (state.name === 'orbToHero') {
            const progress = Math.min(1, state.elapsed / state.duration);
            const heroX = this.player.sprite.body.center.x;
            const heroY = this.player.sprite.body.bottom - HERO_STAND_PX * 0.55;
            const targetScale = HERO_STAND_PX * ORB_TIME.heldDiameterH / TIME_ASSETS.orb.frameWidth;
            const bob = Math.sin(state.elapsed * Math.PI * 2) * ORB_TIME.bobPx;
            this.orb.setPosition(
                this.orbStartX + (heroX - this.orbStartX) * progress,
                this.orbStartY + (heroY - this.orbStartY) * progress + bob
            ).setScale(this.orbStartScale + (targetScale - this.orbStartScale) * progress);
            this.orbGlow.setPosition(this.orb.x, this.orb.y).setScale(1 - progress * 0.55);
            if (progress >= 1) {
                this.orb.setVisible(false);
                this.orbGlow.setVisible(false);
                this.orbFlash.setAlpha(0.85);
                this.flashElapsed = 0;
                return true;
            }
            return false;
        }
        if (state.name === 'bannerOrb') {
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
        if (state.name === 'orbCollected') return state.elapsed >= state.duration;
        return true;
    }

    updateOrbHud(force = false) {
        const orbs = this.registry.get('orbs');
        const count = Array.isArray(orbs) ? orbs.length : 0;
        if (force || count !== this.orbCount) {
            this.orbCount = count;
            this.orbText.setText(`ORBS ${count}/5`);
        }
    }

    updateDoors() {
        const heroX = this.player.sprite.body.center.x;
        const nearest = this.state === 'room' ? this.nearestDoor() : -1;
        this.promptDoor = nearest;
        for (let index = 0; index < this.doors.length; index += 1) {
            const door = this.doors[index];
            const spent = this.spentDoors[index];
            const pulse = !spent && this.resetCount >= PUZZLE.hint.pulseAfterResets &&
                index === nextCorrectDoor(this.hours, this.progress)
                ? 0.68 + 0.32 * (0.5 + 0.5 * Math.sin(this.elapsed * 5))
                : spent ? 0.5 : 1;
            this.drawClock(door, this.hours[index], spent ? ROOM.colors.spent : ROOM.colors.lit, pulse);
            door.prompt.setVisible(index === nearest && !spent && this.state === 'room');
            door.ripple.clear();
            if (door.ripple.visible && index === this.correctDoor) {
                const p = Math.min(1, this.stateElapsed / Math.max(0.01, PUZZLE.timing.correctRipple));
                door.ripple.lineStyle(6, ROOM.colors.lit, 1 - p);
                door.ripple.strokeCircle(door.x, ROOM.doorBottomY * this.scaleFactor - 52, 20 + p * 90);
            }
            door.ring.setAlpha(door.dissolveAlpha);
            door.hand.setAlpha(door.dissolveAlpha);
            door.hour.setAlpha(door.dissolveAlpha);
        }
        this.roomGlow.clear();
        for (const door of this.doors) {
            if (this.spentDoors[door.index]) continue;
            this.roomGlow.fillStyle(ROOM.colors.lit, 0.07 + 0.025 * Math.sin(this.elapsed * 2));
            this.roomGlow.fillEllipse(door.x, ROOM.doorBottomY * this.scaleFactor, 130 * this.scaleFactor, 32 * this.scaleFactor);
        }
        this.updateDebugGrid();
    }

    updateDebugGrid() {
        if (!this.debugGridEnabled) return;
        this.debugArt.clear();
        this.debugArt.lineStyle(1, 0x66ffbd, 0.35);
        for (let x = 0; x <= ART.width; x += 60) {
            this.debugArt.lineBetween(x * this.scaleFactor, 0, x * this.scaleFactor, WORLD.height);
        }
        for (let y = 0; y <= ART.height; y += 60) {
            this.debugArt.lineBetween(0, y * this.scaleFactor, WORLD.width, y * this.scaleFactor);
        }
        const heroX = this.player.sprite.body.center.x;
        this.debugText.setText(`hero ${Math.round(heroX / this.scaleFactor)} | door range ${ROOM.interactRange}`);
        this.debugText.setPosition(12, 130).setVisible(true);
    }

    updateRoomState(delta) {
        const seconds = delta / 1000;
        this.stateElapsed += seconds;
        if (this.state === 'fadeIn') {
            this.fade.setAlpha(Math.max(0, 1 - this.stateElapsed / this.stateDuration));
            if (this.stateElapsed >= this.stateDuration) {
                this.fade.setVisible(false);
                this.state = 'room';
                this.stateElapsed = 0;
                this.startLine('start');
            }
        } else if (this.state === 'entering') {
            this.player.visual.setAlpha(Math.max(0, 1 - this.stateElapsed / this.stateDuration));
            if (this.stateElapsed >= this.stateDuration) {
                this.player.forcedWalkDirection = 0;
                this.player.forcedWalkSpeed = 0;
                this.player.visual.setAlpha(0);
                if (this.pendingPickCorrect) this.beginCorrectPick();
                else this.beginWrongFlash();
            }
        } else if (this.state === 'correctRipple') {
            if (this.stateElapsed >= this.stateDuration) {
                this.doors[this.correctDoor].ripple.setVisible(false);
                if (this.progress >= PUZZLE.doorsToPass) this.beginDissolve();
                else this.beginRespawn();
            }
        } else if (this.state === 'wrongFlash') {
            this.flash.setAlpha(Math.max(0, 0.62 * (1 - this.stateElapsed / this.stateDuration)));
            if (this.stateElapsed >= this.stateDuration) {
                this.flash.setAlpha(0);
                this.finishWrongPick();
            }
        } else if (this.state === 'rewind') {
            this.flash.setFillStyle(ROOM.colors.rewind, 1)
                .setAlpha(0.18 + 0.3 * Math.sin(this.stateElapsed * 24));
            if (this.stateElapsed >= this.stateDuration) {
                this.flash.setAlpha(0);
                this.beginRespawn();
            }
        } else if (this.state === 'respawn') {
            this.player.visual.setAlpha(Math.min(1, this.stateElapsed / this.stateDuration));
            if (this.stateElapsed >= this.stateDuration) {
                this.player.visual.setAlpha(1);
                this.player.controlsLocked = false;
                this.state = 'room';
                this.stateElapsed = 0;
            }
        }
    }

    updateChamber(delta) {
        const seconds = delta / 1000;
        this.chamberElapsed += seconds;
        if (this.hasChamberArt) {
            const frame = chamberAt(this.chamberElapsed);
            if (frame.key !== this.chamberBackground.texture.key || frame.frame !== this.chamberFrame) {
                this.chamberBackground.setTexture(frame.key, frame.frame);
                this.chamberFrame = frame.frame;
            }
        }
        if (this.chamberRunner) this.chamberRunner.update(seconds);
        if (this.chamberLayerReady && this.chamberFadeElapsed >= 0) {
            this.chamberFadeElapsed += seconds;
            this.fade.setAlpha(Math.max(0, 1 - this.chamberFadeElapsed / CHAMBER.fadeIn));
            if (this.chamberFadeElapsed >= CHAMBER.fadeIn) {
                this.fade.setAlpha(0).setVisible(false);
                this.chamberFadeElapsed = -1;
            }
        }
        if (this.flashElapsed >= 0) {
            this.flashElapsed += seconds;
            const duration = ORB_TIME.absorbFlashSeconds;
            this.orbFlash.setAlpha(Math.max(0, 0.85 * (1 - this.flashElapsed / duration)));
            if (this.flashElapsed >= duration) {
                this.flashElapsed = -1;
                this.orbFlash.setAlpha(0);
            }
        }
        if (this.hudOrbPulse >= 0) {
            this.hudOrbPulse += seconds;
            const alpha = 0.6 + 0.4 * Math.max(0, 1 - this.hudOrbPulse / 1.2);
            this.orbText.setColor(tintCss(ORB_TIME.hudColor)).setAlpha(alpha);
            if (this.hudOrbPulse >= 1.2) this.hudOrbPulse = -1;
        }
    }

    toggleDebug() {
        this.debugGridEnabled = !this.debugGridEnabled;
        this.debugArt.setVisible(this.debugGridEnabled);
        this.debugText.setVisible(this.debugGridEnabled);
        if (!this.debugGridEnabled) {
            this.debugArt.clear();
            this.debugText.setText('');
        }
    }

    update(_time, delta) {
        if (this.transitionStarted) return;
        const seconds = delta / 1000;
        this.elapsed += seconds;
        this.player.update(delta);
        this.hud.update(delta);
        this.bubble.update(seconds);
        this.updateOrbHud();
        if (this.restartKey && Input.Keyboard.JustDown(this.restartKey)) {
            this.scene.restart({ startChamber: this.startChamberRequested });
            return;
        }
        if (TIME_DEBUG) {
            if (Input.Keyboard.JustDown(this.debugKeys.solve) && this.state === 'room') {
                this.progress = PUZZLE.doorsToPass;
                this.beginDissolve();
            }
            if (Input.Keyboard.JustDown(this.debugKeys.wrong) && this.state === 'room') this.forceWrongNext = true;
            if (Input.Keyboard.JustDown(this.debugKeys.grid)) this.toggleDebug();
        }

        if (this.state === 'room') {
            const nearest = this.nearestDoor();
            for (const door of this.doors) door.prompt.setVisible(door.index === nearest && !this.spentDoors[door.index]);
            if (nearest >= 0 && Input.Keyboard.JustDown(this.interactKey)) this.enterDoor(nearest);
        }
        this.updateDoors();
        if (this.chamberRunner) this.updateChamber(delta);
        else this.updateRoomState(delta);
    }

    cleanup() {
        if (this.chamberRunner) this.chamberRunner.destroy();
        if (this.bubble) this.bubble.destroy();
        if (this.hud) this.hud.destroy();
        if (this.ownsVoidTexture && this.textures.exists(VOID_TEXTURE)) this.textures.remove(VOID_TEXTURE);
    }
}
