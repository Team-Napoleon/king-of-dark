import { Scene } from 'phaser';

export default class MainMenuScene extends Scene {
    constructor() {
        super('MainMenuScene');
    }

    create() {
        const { width, height } = this.scale;

        this.cameras.main.setBackgroundColor('#090b11');

        this.add.rectangle(width / 2, height / 2, width, height, 0x0d1118);

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
            this.scene.start('TempleScene');
        };

        buttonBg.on('pointerover', () => {
            buttonBg.setFillStyle(0x4a2a3d);
        });

        buttonBg.on('pointerout', () => {
            buttonBg.setFillStyle(0x3a2135);
        });

        buttonBg.on('pointerdown', handlePlay);
    }
}
