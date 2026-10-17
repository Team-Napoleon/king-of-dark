import { Input, Scene } from 'phaser';
import { DEBUG_KEYS } from '../config/animationData';

export default class MainMenuScene extends Scene {
    constructor() {
        super('MainMenuScene');
    }

    create() {
        const { width, height } = this.scale;
        if (DEBUG_KEYS) {
            this.debugDarkWorld = this.input.keyboard.addKey('F2');
            this.debugDarkness = this.input.keyboard.addKey('F3');
            this.input.keyboard.addCapture('F2,F3');
        }

        this.cameras.main.setBackgroundColor('#090b11');
        this.cameras.main.fadeIn(600);

        const background = this.add.image(width / 2, height / 2, 'bg-menu');
        background.setScale(Math.max(width / 1344, height / 768));
        background.setDepth(-10);

        const glow = this.add.rectangle(width / 2, 200, 640, 110, 0x1f2937, 0.24);
        glow.setStrokeStyle(2, 0xf4d29b, 0.7);

        this.add.text(width / 2, 200, 'KING OF DARK', {
            fontFamily: 'Georgia, serif',
            fontSize: '62px',
            color: '#f7d7a5',
            stroke: '#170f14',
            strokeThickness: 8,
        }).setOrigin(0.5);

        this.add.text(width / 2, 290, 'Awaken the temple. Survive the memory.', {
            fontFamily: 'Arial',
            fontSize: '18px',
            color: '#b9bbcf',
            letterSpacing: '1px',
        }).setOrigin(0.5);

        const button = this.add.container(width / 2, 420);
        const buttonBg = this.add.rectangle(0, 0, 220, 72, 0x3a2135).setStrokeStyle(4, 0xf5d58a);
        const buttonText = this.add.text(0, 0, 'PLAY', {
            fontFamily: 'Arial Black',
            fontSize: '28px',
            color: '#f8efdf',
        }).setOrigin(0.5);

        buttonBg.setInteractive({ useHandCursor: true });

        button.add([buttonBg, buttonText]);

        const handlePlay = () => {
            if (!buttonBg || !buttonBg.active || !this.sys.isActive() || this.isStarting) {
                return;
            }

            this.isStarting = true;
            this.registry.set('reachedArena', false);
            this.registry.set('bossIntroSeen', false);
            this.registry.set('bossDefeated', false);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                if (!this.sys.isActive()) {
                    return;
                }
                this.scene.start('IntroScene');
            });
            this.cameras.main.fadeOut(400, 0, 0, 0);
        };

        buttonBg.on('pointerover', () => {
            if (!buttonBg || !buttonBg.active) {
                return;
            }
            buttonBg.setFillStyle(0x4a2a3d);
        });

        buttonBg.on('pointerout', () => {
            if (!buttonBg || !buttonBg.active) {
                return;
            }
            buttonBg.setFillStyle(0x3a2135);
        });

        buttonBg.on('pointerdown', handlePlay);
    }

    update() {
        if (!DEBUG_KEYS || this.isStarting || !this.sys.isActive()) {
            return;
        }
        if (Input.Keyboard.JustDown(this.debugDarkWorld)) {
            this.isStarting = true;
            this.scene.start('DarkWorldScene', { part: 'village' });
        } else if (Input.Keyboard.JustDown(this.debugDarkness)) {
            this.isStarting = true;
            this.scene.start('DarknessScene');
        }
    }
}
