import { Scene } from 'phaser';

export default class BootScene extends Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;
        const progressBox = this.add.rectangle(centerX, centerY + 30, 320, 20, 0x211b27)
            .setStrokeStyle(2, 0x7e5a40);
        const progressBar = this.add.rectangle(centerX - 156, centerY + 30, 0, 12, 0xf5d58a)
            .setOrigin(0, 0.5);
        const loadingText = this.add.text(centerX, centerY - 12, 'LOADING...', {
            fontFamily: 'Arial',
            fontSize: '24px',
            color: '#f5d7a1',
            stroke: '#000000',
            strokeThickness: 5,
        }).setOrigin(0.5);

        this.load.on('progress', (value) => {
            if (!progressBar || !progressBar.active) {
                return;
            }
            progressBar.width = 312 * value;
        });
        this.load.once('complete', () => {
            if (progressBox && progressBox.active) {
                progressBox.destroy();
            }
            if (progressBar && progressBar.active) {
                progressBar.destroy();
            }
            if (loadingText && loadingText.active) {
                loadingText.destroy();
            }
        });

        this.load.spritesheet('hero-walk', 'assets/Hero/Idle_v3_walking_south_spritesheet.png', {
            frameWidth: 168,
            frameHeight: 168,
        });
        this.load.spritesheet('hero-run', 'assets/Hero/Idle_v3_running_south_spritesheet.png', {
            frameWidth: 168,
            frameHeight: 168,
        });
        this.load.spritesheet('hero-jump', 'assets/Hero/Idle_running-jump_south_spritesheet.png', {
            frameWidth: 176,
            frameHeight: 176,
        });
        this.load.image('bg-menu', 'assets/backgrounds/menu.jpg');
        this.load.image('bg-temple', 'assets/backgrounds/temple.jpg');
        this.load.image('bg-arena', 'assets/backgrounds/arena.jpg');
    }

    create() {
        this.scene.start('MainMenuScene');
    }
}
