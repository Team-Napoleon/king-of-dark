import { Scene } from 'phaser';

export default class BootScene extends Scene {
    constructor() {
        super('BootScene');
    }

    create() {
        this.cameras.main.setBackgroundColor('#090b10');
        this.add.text(this.scale.width / 2, this.scale.height / 2, 'LOADING...', {
            fontFamily: 'Arial',
            fontSize: '28px',
            color: '#f5d7a1',
            stroke: '#000000',
            strokeThickness: 6,
        }).setOrigin(0.5);

        this.time.delayedCall(250, () => {
            this.scene.start('MainMenuScene');
        });
    }
}
