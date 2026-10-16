import { Math as PhaserMath, Scene } from 'phaser';
import Enemy from '../entities/Enemy';
import Player from '../entities/Player';

export default class TempleScene extends Scene {
    constructor() {
        super('TempleScene');
        this.backgroundWidth = 6600;
    }

    preload() {
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
    }

    create() {
        const worldWidth = this.backgroundWidth;
        const groundY = 690;

        this.cameras.main.setBackgroundColor('#11141a');
        this.cameras.main.setBounds(0, 0, worldWidth, 720);
        this.physics.world.setBounds(0, 0, worldWidth, 720);

        this.add.rectangle(worldWidth / 2, 360, worldWidth, 720, 0x101820);

        const floor = this.add.rectangle(worldWidth / 2, groundY, worldWidth, 60, 0x241d1f);
        const platforms = [
            this.add.rectangle(520, 560, 260, 28, 0x2a293b),
            this.add.rectangle(1380, 500, 240, 28, 0x2a293b),
            this.add.rectangle(2240, 560, 250, 28, 0x2a293b),
            this.add.rectangle(3350, 450, 300, 28, 0x2a293b),
            this.add.rectangle(4700, 540, 280, 28, 0x2a293b),
            this.add.rectangle(5800, 470, 250, 28, 0x2a293b),
        ];

        this.physics.add.existing(floor, true);
        platforms.forEach((platform) => {
            this.physics.add.existing(platform, true);
        });

        this.player = new Player(this, 180, 610);
        this.physics.add.collider(this.player.sprite, floor);
        this.physics.add.collider(this.player.sprite, platforms);

        this.enemies = [new Enemy(this, 2600, 630)];
        this.physics.add.collider(this.enemies[0].sprite, floor);

        this.cameras.main.startFollow(this.player.sprite, true, 0.08, 0.08);
        this.cameras.main.setDeadzone(120, 80);

        this.healthBackground = this.add.rectangle(24, 36, 260, 28, 0x261f1c, 0.9)
            .setOrigin(0, 0.5)
            .setStrokeStyle(2, 0x7e5a40)
            .setScrollFactor(0)
            .setDepth(100);
        this.healthBar = this.add.rectangle(28, 36, 252, 20, 0x7ce57d)
            .setOrigin(0, 0.5)
            .setScrollFactor(0)
            .setDepth(100);
        this.healthText = this.add.text(154, 36, 'HP 100/100', {
            fontFamily: 'Arial',
            fontSize: '16px',
            color: '#f7ecd4',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center',
        }).setOrigin(0.5).setScrollFactor(0).setDepth(100);

        this.controlsText = this.add.text(40, 76, 'TEMPLE TRIAL\nA / D  or  Left / Right : Move\nSpace / Up : Jump\nJ : Attack\nR : Restart', {
            fontFamily: 'Arial',
            fontSize: '16px',
            color: '#e7d9c0',
            stroke: '#000000',
            strokeThickness: 4,
            lineSpacing: 6,
        }).setScrollFactor(0).setDepth(100);
        this.controlsPanel = this.add.rectangle(
            24,
            64,
            this.controlsText.width + 32,
            this.controlsText.height + 24,
            0x1a1b22,
            0.7,
        ).setOrigin(0, 0).setStrokeStyle(2, 0x7e5a40, 1).setScrollFactor(0).setDepth(99);

        this.input.keyboard.once('keydown-R', () => this.scene.restart());
        this.gameOverText = null;
        this.updateHud();
    }

    update() {
        this.player.update();

        this.enemies.forEach((enemy) => {
            if (enemy) {
                enemy.update(this.player);
            }
        });

        this.updateHud();

        if (this.player.isGameOver && !this.gameOverText) {
            this.triggerGameOver();
        }

    }

    updateHud() {
        const healthRatio = PhaserMath.Clamp(this.player.health / this.player.maxHealth, 0, 1);
        this.healthBar.setSize(252 * healthRatio, 20);
        this.healthText.setText(`HP ${Math.max(0, this.player.health)}/${this.player.maxHealth}`);

        const healthColor = healthRatio > 0.5 ? 0x7ce57d : healthRatio > 0.25 ? 0xf2c94c : 0xe75f5f;
        this.healthBar.setFillStyle(healthColor);
    }

    triggerGameOver() {
        this.cameras.main.stopFollow();
        this.gameOverText = this.add.text(this.scale.width / 2, this.scale.height / 2, 'GAME OVER\nPress R to restart', {
            fontFamily: 'Arial Black',
            fontSize: '42px',
            color: '#f5d7a1',
            stroke: '#000000',
            strokeThickness: 8,
            align: 'center',
        }).setOrigin(0.5).setScrollFactor(0);
    }
}
