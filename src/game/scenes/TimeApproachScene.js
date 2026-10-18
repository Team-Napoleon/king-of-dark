import { Scene } from 'phaser';
import Player from '../entities/Player';
import PlayerHud from '../ui/PlayerHud';
import WorldBubble from '../ui/WorldBubble';
import { ACT3_PACING, ACT3_SPEAKERS } from '../config/actThreeData';
import { HERO_PHYSICS, HERO_STAND_PX } from '../config/animationData';
import { TIME_APPROACH_CONFIG, TIME_ASSETS, TIME_SCENE_KEYS } from '../config/timeData';

const WIDTH = 1280;
const HEIGHT = 720;

function ensureOrbProgress(registry) {
    if (registry.get('orbs') == null) registry.set('orbs', ['fear']);
}

export default class TimeApproachScene extends Scene {
    constructor() {
        super(TIME_SCENE_KEYS.TIME_APPROACH);
    }

    create() {
        ensureOrbProgress(this.registry);
        this.cameras.main.resetFX();
        this.cameras.main.setBackgroundColor('#090b16');
        this.floorY = TIME_APPROACH_CONFIG.heroStart.yRel * HEIGHT;
        this.createBackground();
        this.createFloor();
        this.player = new Player(this, TIME_APPROACH_CONFIG.heroStart.x, this.floorY - 50);
        this.player.moveSpeed = HERO_PHYSICS.moveSpeed;
        this.player.controlsLocked = true;
        this.player.forcedWalkDirection = 1;
        this.player.forcedWalkSpeed = TIME_APPROACH_CONFIG.forcedWalkSpeed;
        this.player.facing = 1;
        this.player.sprite.body.setCollideWorldBounds(true);
        this.physics.add.collider(this.player.sprite, this.floor);
        this.cameras.main.setBounds(0, 0, WIDTH, HEIGHT);
        this.cameras.main.startFollow(this.player.sprite, true, 0.08, 0.08);
        this.hud = new PlayerHud(this, this.player, { showControls: false, showKills: false });
        this.hud.controlsChipBack.setVisible(false);
        this.hud.controlsChip.setVisible(false);
        this.bubble = new WorldBubble(this, {
            speakers: ACT3_SPEAKERS,
            pacing: ACT3_PACING,
            voiceStyle: { y: 150, maxWidth: 420, textColor: '#d9c8ff', glowColor: 0x7a3cff },
        });
        this.bubble.setAnchor('hero', () => ({
            x: this.player.sprite.body.center.x,
            y: this.player.sprite.body.bottom - HERO_STAND_PX - 10,
        }));
        this.fade = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x000000, 0)
            .setScrollFactor(0).setDepth(180);
        this.lineIndex = 0;
        this.lineElapsed = 0;
        this.lineDone = false;
        this.transitionElapsed = -1;
        this.transitionStarted = false;
        this.startNextLine();
        this.events.once('shutdown', () => this.cleanup());
    }

    createBackground() {
        if (this.textures.exists(TIME_ASSETS.BG_IMAGE.key)) {
            this.add.image(WIDTH / 2, HEIGHT / 2, TIME_ASSETS.BG_IMAGE.key)
                .setDisplaySize(WIDTH, HEIGHT)
                .setDepth(-10);
        } else {
            console.warn(`[TimeApproachScene] Missing "${TIME_ASSETS.BG_IMAGE.key}"; using a drawn backdrop.`);
            this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x101427).setDepth(-10);
            const stonework = this.add.graphics().setDepth(-9);
            stonework.fillStyle(0x25263a, 1);
            for (let index = 0; index < 9; index += 1) {
                const x = 90 + index * 145;
                stonework.fillRect(x, 105, 68, 450);
                stonework.fillTriangle(x - 26, 120, x + 34, 38, x + 94, 120);
            }
            stonework.fillStyle(0x5c729b, 0.15).fillRect(0, this.floorY - 170, WIDTH, 3);
        }
    }

    createFloor() {
        this.floor = this.add.rectangle(WIDTH / 2, this.floorY + 28, WIDTH, 56, 0x000000, 0)
            .setVisible(false);
        this.physics.add.existing(this.floor, true);
    }

    startNextLine() {
        const beat = TIME_APPROACH_CONFIG.beats[this.lineIndex];
        if (!beat) return;
        this.lineElapsed = 0;
        this.lineDone = false;
        this.bubble.say({
            who: beat.speaker,
            text: beat.text,
            onDone: () => {
                if (this.sys.isActive()) this.lineDone = true;
            },
        });
    }

    update(_time, delta) {
        if (this.transitionStarted) return;
        const seconds = delta / 1000;
        this.player.update(delta);
        this.bubble.update(seconds);
        this.hud.update(delta);

        if (this.transitionElapsed >= 0) {
            this.transitionElapsed += delta;
            this.fade.setAlpha(Math.min(1, this.transitionElapsed / 900));
            if (this.transitionElapsed >= 900) {
                this.transitionStarted = true;
                this.scene.start(TIME_SCENE_KEYS.TIME_CHAMBER);
            }
            return;
        }

        const beat = TIME_APPROACH_CONFIG.beats[this.lineIndex];
        if (beat) {
            this.lineElapsed += delta;
            if (this.lineDone && this.lineElapsed >= beat.duration) {
                this.lineIndex += 1;
                if (this.lineIndex < TIME_APPROACH_CONFIG.beats.length) this.startNextLine();
            }
        }
        if (this.lineIndex >= TIME_APPROACH_CONFIG.beats.length &&
            this.player.sprite.body.center.x >= TIME_APPROACH_CONFIG.heroTarget.x) {
            this.player.forcedWalkDirection = 0;
            this.player.forcedWalkSpeed = 0;
            this.player.controlsLocked = true;
            this.transitionElapsed = 0;
        }
    }

    cleanup() {
        if (this.bubble) this.bubble.destroy();
        if (this.hud) this.hud.destroy();
    }
}
