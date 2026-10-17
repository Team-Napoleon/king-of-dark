import { SHADOW } from '../config/animationData';

export default class PlayerHud {
    constructor(scene, player, { showControls = true, showKills = showControls } = {}) {
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

        this.shadowText = scene.add.text(28, 58, '', {
            fontFamily: 'Arial',
            fontSize: '13px',
            color: '#d8b5ff',
            stroke: '#000000',
            strokeThickness: 3,
        }).setScrollFactor(0).setDepth(100).setVisible(false);
        this.shadowMeterBack = scene.add.rectangle(28, 76, 180, 6, 0x21152c, 0.9)
            .setOrigin(0, 0.5)
            .setScrollFactor(0)
            .setDepth(100)
            .setVisible(false);
        this.shadowMeter = scene.add.rectangle(28, 76, 0, 4, 0xb06bff)
            .setOrigin(0, 0.5)
            .setScrollFactor(0)
            .setDepth(101)
            .setVisible(false);
        this.showKills = showKills;
        this.kills = 0;
        this.killsTotal = 10;
        this.killsText = scene.add.text(28, 90, 'SHADOWS SLAIN 0/10', {
            fontFamily: 'Arial',
            fontSize: '13px',
            color: '#f5d58a',
            stroke: '#000000',
            strokeThickness: 3,
        }).setScrollFactor(0).setDepth(100).setVisible(showKills);

        this.controlsPanel = null;
        this.controlsText = null;
        if (showControls) {
            this.controlsText = scene.add.text(40, 124, 'TEMPLE TRIAL\nMove A/D or arrows\nJump Space/Up\nJ Punch left\nL Punch right\nK Combo\nE Enter portal\nR Restart', {
                fontFamily: 'Arial',
                fontSize: '16px',
                color: '#e7d9c0',
                stroke: '#000000',
                strokeThickness: 4,
                lineSpacing: 6,
            }).setScrollFactor(0).setDepth(100);
            this.controlsPanel = scene.add.rectangle(
                24,
                112,
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
        const shadowed = Boolean(this.player.isShadowed);
        this.shadowText.setVisible(shadowed);
        this.shadowMeterBack.setVisible(shadowed);
        this.shadowMeter.setVisible(shadowed);
        if (shadowed) {
            this.shadowText.setText('SHADOWED - MASH J / K / L');
            const progress = Math.max(0, Math.min(1, this.player.shadowMeter / SHADOW.breakThreshold));
            this.shadowMeter.setSize(180 * progress, 4);
        }
        if (this.showKills) {
            this.killsText.setText(`SHADOWS SLAIN ${this.kills}/${this.killsTotal}`);
        }
    }

    setKills(kills, total = this.killsTotal) {
        this.kills = kills;
        this.killsTotal = total;
        if (this.killsText && this.killsText.active) {
            this.killsText.setText(`SHADOWS SLAIN ${kills}/${total}`);
        }
    }

    destroy() {
        [this.healthBackground, this.healthBar, this.healthText, this.shadowText, this.shadowMeterBack, this.shadowMeter, this.killsText, this.controlsPanel, this.controlsText]
            .forEach((object) => {
                if (object && object.active) {
                    object.destroy();
                }
            });
    }
}