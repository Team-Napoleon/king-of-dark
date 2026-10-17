import { Input } from 'phaser';
import { NEW_HERO_MOVES, SHADOW } from '../config/animationData';

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
        this.fireText = scene.add.text(28, 98, 'FIRE', {
            fontFamily: 'Arial',
            fontSize: '10px',
            color: '#ffc078',
            stroke: '#000000',
            strokeThickness: 2,
        }).setScrollFactor(0).setDepth(100);
        this.fireBack = scene.add.rectangle(64, 103, 108, 5, 0x321c17, 0.9)
            .setOrigin(0, 0.5)
            .setScrollFactor(0)
            .setDepth(100);
        this.fireBar = scene.add.rectangle(64, 103, 108, 3, 0xff8737)
            .setOrigin(0, 0.5)
            .setScrollFactor(0)
            .setDepth(101);

        const savedControlsOpen = scene.registry.get('controlsOpen');
        this.controlsOpen = typeof savedControlsOpen === 'boolean' ? savedControlsOpen : showControls;
        this.autoCollapse = showControls && typeof savedControlsOpen !== 'boolean';
        this.controlsElapsed = 0;
        this.controlsKey = scene.input.keyboard.addKey('H');
        this.controlsPanel = scene.add.rectangle(952, 78, 300, 132, 0x11151c, 0.75)
            .setOrigin(0, 0)
            .setScrollFactor(0)
            .setDepth(95)
            .setVisible(false);
        this.controlsLeft = scene.add.text(968, 90, 'MOVE A/D\nJ Punch\nU Kick\nO Fireball\nR Restart', {
            fontFamily: 'Arial',
            fontSize: '13px',
            color: '#e7d9c0',
            lineSpacing: 5,
        }).setScrollFactor(0).setDepth(96).setVisible(false);
        this.controlsRight = scene.add.text(1104, 90, 'JUMP Space\nK Combo\nI Sword\nE Portal\nH Hide', {
            fontFamily: 'Arial',
            fontSize: '13px',
            color: '#e7d9c0',
            lineSpacing: 5,
        }).setScrollFactor(0).setDepth(96).setVisible(false);
        this.controlsChipBack = scene.add.rectangle(1110, 78, 142, 28, 0x11151c, 0.75)
            .setOrigin(0, 0)
            .setScrollFactor(0)
            .setDepth(95)
            .setVisible(false);
        this.controlsChip = scene.add.text(1120, 84, '[H] Controls', {
            fontFamily: 'Arial',
            fontSize: '13px',
            color: '#e7d9c0',
        }).setScrollFactor(0).setDepth(96).setVisible(false);

        this.update();
    }

    update(delta = this.scene.game.loop.delta) {
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
            this.shadowText.setText('SHADOWED - MASH J / K');
            const progress = Math.max(0, Math.min(1, this.player.shadowMeter / SHADOW.breakThreshold));
            this.shadowMeter.setSize(180 * progress, 4);
        }
        if (this.showKills) {
            this.killsText.setText(`SHADOWS SLAIN ${this.kills}/${this.killsTotal}`);
        }
        const cooldown = NEW_HERO_MOVES.fire.cooldown;
        const ready = 1 - Math.max(0, Math.min(1, this.player.fireCooldown / cooldown));
        this.fireBar.setSize(108 * ready, 3);

        if (Input.Keyboard.JustDown(this.controlsKey)) {
            this.controlsOpen = !this.controlsOpen;
            this.autoCollapse = false;
            this.scene.registry.set('controlsOpen', this.controlsOpen);
        }
        if (this.autoCollapse) {
            this.controlsElapsed += delta / 1000;
            if (this.controlsElapsed >= 6) {
                this.controlsOpen = false;
                this.autoCollapse = false;
                this.scene.registry.set('controlsOpen', false);
            }
        }
        const blocked = this.player.controlsLocked || Boolean(this.scene.dialogueBox?.isShowing) || Boolean(this.scene.introActive);
        this.controlsPanel.setVisible(!blocked && this.controlsOpen);
        this.controlsLeft.setVisible(!blocked && this.controlsOpen);
        this.controlsRight.setVisible(!blocked && this.controlsOpen);
        this.controlsChipBack.setVisible(!blocked && !this.controlsOpen);
        this.controlsChip.setVisible(!blocked && !this.controlsOpen);
    }

    setKills(kills, total = this.killsTotal) {
        this.kills = kills;
        this.killsTotal = total;
        if (this.killsText && this.killsText.active) {
            this.killsText.setText(`SHADOWS SLAIN ${kills}/${total}`);
        }
    }

    destroy() {
        [this.healthBackground, this.healthBar, this.healthText, this.shadowText, this.shadowMeterBack, this.shadowMeter, this.killsText, this.fireText, this.fireBack, this.fireBar, this.controlsPanel, this.controlsLeft, this.controlsRight, this.controlsChipBack, this.controlsChip]
            .forEach((object) => {
                if (object && object.active) {
                    object.destroy();
                }
            });
    }
}