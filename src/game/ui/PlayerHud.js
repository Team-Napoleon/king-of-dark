export default class PlayerHud {
    constructor(scene, player, { showControls = true } = {}) {
        this.scene = scene;
        this.player = player;

        this.healthBackground = scene.add.rectangle(24, 36, 260, 28, 0x261f1c, 0.9)
            .setOrigin(0, 0.5)
            .setStrokeStyle(2, 0x7e5a40)
            .setScrollFactor(0)
            .setDepth(100);
        this.healthBar = scene.add.rectangle(28, 36, 252, 20, 0x7ce57d)
            .setOrigin(0, 0.5)
            .setScrollFactor(0)
            .setDepth(100);
        this.healthText = scene.add.text(154, 36, 'HP 100/100', {
            fontFamily: 'Arial',
            fontSize: '16px',
            color: '#f7ecd4',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center',
        }).setOrigin(0.5).setScrollFactor(0).setDepth(100);

        this.controlsPanel = null;
        this.controlsText = null;
        if (showControls) {
            this.controlsText = scene.add.text(40, 76, 'TEMPLE TRIAL\nA / D  or  Left / Right : Move\nSpace / Up : Jump\nJ : Attack\nR : Restart', {
                fontFamily: 'Arial',
                fontSize: '16px',
                color: '#e7d9c0',
                stroke: '#000000',
                strokeThickness: 4,
                lineSpacing: 6,
            }).setScrollFactor(0).setDepth(100);
            this.controlsPanel = scene.add.rectangle(
                24,
                64,
                this.controlsText.width + 32,
                this.controlsText.height + 24,
                0x1a1b22,
                0.7,
            ).setOrigin(0, 0).setStrokeStyle(2, 0x7e5a40, 1).setScrollFactor(0).setDepth(99);
        }

        this.update();
    }

    update() {
        if (!this.healthBar || !this.healthBar.active || !this.player) {
            return;
        }

        const ratio = Math.max(0, Math.min(1, this.player.health / this.player.maxHealth));
        this.healthBar.setSize(252 * ratio, 20);
        this.healthText.setText(`HP ${Math.max(0, this.player.health)}/${this.player.maxHealth}`);
        const color = ratio > 0.5 ? 0x7ce57d : ratio > 0.25 ? 0xf2c94c : 0xe75f5f;
        this.healthBar.setFillStyle(color);
    }

    destroy() {
        [this.healthBackground, this.healthBar, this.healthText, this.controlsPanel, this.controlsText]
            .forEach((object) => {
                if (object && object.active) {
                    object.destroy();
                }
            });
    }
}