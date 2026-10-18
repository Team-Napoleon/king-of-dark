import { Scene } from 'phaser';
import Player from '../entities/Player';
import PlayerHud from '../ui/PlayerHud';
import WorldBubble from '../ui/WorldBubble';
import { ACT3_PACING, ACT3_SPEAKERS } from '../config/actThreeData';
import { MINA_SHEETS } from '../config/actTwoData';
import { HERO_PHYSICS, HERO_STAND_PX } from '../config/animationData';
import { TIME_ASSETS, TIME_SCENE_KEYS, MINA_AFTER_TIME_CONFIG } from '../config/timeData';
import { ORB_ORDER } from '../config/actTruthData';

const WIDTH = 1280;
const HEIGHT = 720;

function ensureOrbProgress(registry) {
    if (registry.get('orbs') == null) registry.set('orbs', ORB_ORDER.slice(0, 2));
}

export default class MinaAfterTimeScene extends Scene {
    constructor() {
        super(TIME_SCENE_KEYS.MINA_AFTER_TIME);
    }

    create() {
        ensureOrbProgress(this.registry);
        this.cameras.main.resetFX();
        this.cameras.main.setBackgroundColor('#080b17');
        this.floorY = MINA_AFTER_TIME_CONFIG.heroSpawn.yRel * HEIGHT;
        if (this.textures.exists(TIME_ASSETS.BG_IMAGE.key)) {
            this.add.image(WIDTH / 2, HEIGHT / 2, TIME_ASSETS.BG_IMAGE.key)
                .setDisplaySize(WIDTH, HEIGHT).setDepth(-10);
        } else {
            console.warn(`[MinaAfterTimeScene] Missing "${TIME_ASSETS.BG_IMAGE.key}"; using a drawn backdrop.`);
            this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x0d1322).setDepth(-10);
        }
        const chamber = this.add.graphics().setDepth(-5);
        chamber.fillStyle(0x202a43, 0.9);
        chamber.fillRect(0, this.floorY - 90, WIDTH, 90);
        chamber.fillStyle(0x526a96, 0.7);
        chamber.fillRect(0, this.floorY, WIDTH, 5);
        this.floor = this.add.rectangle(WIDTH / 2, this.floorY + 28, WIDTH, 56, 0x000000, 0)
            .setVisible(false);
        this.physics.add.existing(this.floor, true);
        this.player = new Player(this, MINA_AFTER_TIME_CONFIG.heroSpawn.x, this.floorY - 50);
        this.player.moveSpeed = HERO_PHYSICS.moveSpeed;
        this.player.controlsLocked = true;
        this.player.sprite.body.setCollideWorldBounds(true);
        this.physics.add.collider(this.player.sprite, this.floor);
        this.cameras.main.setBounds(0, 0, WIDTH, HEIGHT);
        this.cameras.main.startFollow(this.player.sprite, true, 0.08, 0.08);

        this.mina = this.createMina();
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
            y: this.player.sprite.body.bottom - HERO_STAND_PX - 10,
        }));
        this.bubble.setAnchor('mina', () => ({
            x: this.mina.x,
            y: this.floorY - this.mina.height - 12,
        }));
        this.lineIndex = 0;
        this.lineElapsed = 0;
        this.lineDone = false;
        this.transitionElapsed = -1;
        this.transitionStarted = false;
        this.startNextLine();
        this.events.once('shutdown', () => this.cleanup());
    }

    createMina() {
        const x = MINA_AFTER_TIME_CONFIG.minaSpawn.x;
        const height = HERO_STAND_PX * MINA_SHEETS.heightVsHero;
        const key = 'mina-float-left';
        const hasTexture = this.textures.exists(key);
        const visual = hasTexture
            ? this.add.sprite(x, this.floorY, key, 0)
                .setOrigin(MINA_SHEETS.originX, MINA_SHEETS.originY)
                .setScale(height / MINA_SHEETS.bodyPx)
                .setDepth(6)
            : this.add.ellipse(x, this.floorY - height / 2, 52, height, 0x6fe0d0, 0.75).setDepth(6);
        if (hasTexture && this.anims.exists(key)) visual.play(key);
        if (!hasTexture) console.warn('[MinaAfterTimeScene] Mina art missing; showing a placeholder.');
        return { x, height, visual, elapsed: 0 };
    }

    startNextLine() {
        const beat = MINA_AFTER_TIME_CONFIG.beats[this.lineIndex];
        if (!beat) return;
        this.lineDone = false;
        this.lineElapsed = 0;
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
        this.mina.elapsed += seconds;
        this.mina.x = MINA_AFTER_TIME_CONFIG.minaSpawn.x;
        this.mina.visual.setPosition(
            this.mina.x,
            this.floorY + MINA_SHEETS.bobPx * Math.sin(this.mina.elapsed * Math.PI * 2 / MINA_SHEETS.bobSeconds)
        );

        if (this.transitionElapsed >= 0) {
            this.transitionElapsed += delta;
            this.fade.setAlpha(Math.min(1, this.transitionElapsed / 900));
            if (this.transitionElapsed >= 900) {
                this.transitionStarted = true;
                if (this.game.scene.keys.SettlementScene) {
                    this.scene.start('SettlementScene');
                } else {
                    console.warn('[MinaAfterTimeScene] SettlementScene is not registered; returning to MainMenuScene.');
                    this.scene.start('MainMenuScene');
                }
            }
            return;
        }

        const beat = MINA_AFTER_TIME_CONFIG.beats[this.lineIndex];
        this.lineElapsed += delta;
        if (this.lineDone && this.lineElapsed >= beat.duration) {
            this.lineIndex += 1;
            if (this.lineIndex < MINA_AFTER_TIME_CONFIG.beats.length) {
                this.startNextLine();
            } else {
                this.fade = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x000000, 0)
                    .setScrollFactor(0).setDepth(180);
                this.transitionElapsed = 0;
            }
        }
    }

    cleanup() {
        if (this.bubble) this.bubble.destroy();
        if (this.hud) this.hud.destroy();
    }
}
