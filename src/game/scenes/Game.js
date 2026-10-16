import { Input, Scene } from 'phaser';
import Enemy from '../entities/Enemy';
import Player from '../entities/Player';
import DarknessOverlay from '../fx/DarknessOverlay';
import PlayerHud from '../ui/PlayerHud';

export default class TempleScene extends Scene {
    constructor() {
        super('TempleScene');
        this.backgroundWidth = 6600;
    }

    createTempleTile() {
        if (this.textures.exists('bg-temple-tile')) {
            return;
        }

        const texture = this.textures.createCanvas('bg-temple-tile', 2688, 768);
        const context = texture.getContext();
        const source = this.textures.get('bg-temple').getSourceImage();

        context.drawImage(source, 0, 0, 1344, 768);
        context.save();
        context.translate(2688, 0);
        context.scale(-1, 1);
        context.drawImage(source, 0, 0, 1344, 768);
        context.restore();
        texture.refresh();
    }

    create() {
        const worldWidth = this.backgroundWidth;
        const groundY = 690;

        this.createTempleTile();
        this.cameras.main.setBackgroundColor('#000000');
        this.cameras.main.setBounds(0, 0, worldWidth, 720);
        this.physics.world.setBounds(0, 0, worldWidth, 720);

        this.tileBackground = this.add.tileSprite(0, 0, 1280, 720, 'bg-temple-tile')
            .setOrigin(0, 0)
            .setScrollFactor(0)
            .setDepth(-10);
        this.tileBackground.tilePositionY = -77;

        const floor = this.add.rectangle(worldWidth / 2, groundY, worldWidth, 60, 0x0b1020);
        this.add.rectangle(worldWidth / 2, groundY - 29, worldWidth, 2, 0x2d4a7a);
        const platforms = [
            this.add.rectangle(520, 560, 260, 28, 0x141b33),
            this.add.rectangle(1380, 500, 240, 28, 0x141b33),
            this.add.rectangle(2240, 560, 250, 28, 0x141b33),
            this.add.rectangle(3350, 450, 300, 28, 0x141b33),
            this.add.rectangle(4700, 540, 280, 28, 0x141b33),
            this.add.rectangle(5800, 470, 250, 28, 0x141b33),
        ];

        this.physics.add.existing(floor, true);
        this.floor = floor;
        this.platforms = platforms;
        platforms.forEach((platform) => {
            this.physics.add.existing(platform, true);
            this.add.rectangle(
                platform.x,
                platform.y - platform.height / 2 + 1,
                platform.width,
                2,
                0x3a5a9a,
            );
        });

        this.player = new Player(this, 180, 610);
        this.darkness = new DarknessOverlay(this, this.player, {
            alpha: 0.9,
            lightScale: 1,
            fogWorldWidth: worldWidth,
            fogScrollFactor: 0.6,
            fogAlpha: 0.16,
        });
        this.darknessEnabled = true;
        this.darknessKey = this.input.keyboard.addKey('L');
        this.physics.add.collider(this.player.sprite, floor);
        this.physics.add.collider(this.player.sprite, platforms);

        this.createGate();

        this.enemies = [
            this.createEnemy('grunt', 1100, 600),
            this.createEnemy('grunt', 2000, 600),
            this.createEnemy('grunt', 2900, 600),
            this.createEnemy('grunt', 3800, 600),
            this.createEnemy('brute', 4600, 600),
        ];

        this.cameras.main.startFollow(this.player.sprite, true, 0.08, 0.08);
        this.cameras.main.setDeadzone(120, 80);

        this.hud = new PlayerHud(this, this.player, { showControls: true });

        this.input.keyboard.once('keydown-R', () => this.scene.restart());
        this.events.once('shutdown', () => {
            if (this.hud) {
                this.hud.destroy();
            }
        });
        this.gameOverShown = false;
        this.gameOverText = this.add.text(this.scale.width / 2, this.scale.height / 2, 'GAME OVER\nPress R to restart', {
            fontFamily: 'Arial Black',
            fontSize: '42px',
            color: '#f5d7a1',
            stroke: '#000000',
            strokeThickness: 8,
            align: 'center',
        }).setOrigin(0.5).setScrollFactor(0).setDepth(110).setVisible(false);
    }

    createEnemy(type, x, y) {
        const enemy = new Enemy(this, x, y, type);
        this.physics.add.collider(enemy.sprite, this.floor);
        this.physics.add.collider(enemy.sprite, this.platforms);
        this.physics.add.overlap(this.player.sprite, enemy.healthOrb, () => {
            if (!enemy.healthOrb || !enemy.healthOrb.active || !enemy.healthOrb.body.enable) {
                return;
            }
            enemy.healthOrb.body.enable = false;
            enemy.healthOrb.setVisible(false);
            enemy.orbTween.stop();
            this.player.heal(15);
        });
        return enemy;
    }

    createGate() {
        this.gatePillarLeft = this.add.rectangle(5545, 583, 42, 154, 0x11101c).setDepth(20);
        this.gatePillarRight = this.add.rectangle(5660, 583, 42, 154, 0x11101c).setDepth(20);
        this.gateDoor = this.add.rectangle(5602, 583, 70, 132, 0x803bdb, 0.48)
            .setStrokeStyle(3, 0xc08cff)
            .setDepth(20);
        this.physics.add.existing(this.gatePillarLeft, true);
        this.physics.add.existing(this.gatePillarRight, true);
        this.gateWall = this.add.rectangle(5750, 540, 24, 240, 0x000000, 0).setVisible(false);
        this.physics.add.existing(this.gateWall, true);
        this.physics.add.collider(this.player.sprite, [this.gatePillarLeft, this.gatePillarRight, this.gateWall]);
        this.gateTriggered = false;
    }

    update(time, delta) {
        this.tileBackground.tilePositionX = this.cameras.main.scrollX * 0.5;
        this.darkness.update(delta);
        if (Input.Keyboard.JustDown(this.darknessKey)) {
            this.darknessEnabled = !this.darknessEnabled;
            this.darkness.setDarkness(this.darknessEnabled ? 0.9 : 0, 1, 250);
        }
        this.player.update(delta);

        this.enemies.forEach((enemy) => {
            if (enemy) {
                enemy.update(this.player, delta);
            }
        });

        if (!this.gateTriggered && this.player.sprite.x >= 5600) {
            this.gateTriggered = true;
            this.player.controlsLocked = true;
            this.player.sprite.body.setVelocity(0, 0);
            this.registry.set('reachedArena', true);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                if (!this.sys.isActive() || !this.gateTriggered) {
                    return;
                }
                this.scene.start('ArenaScene');
            });
            this.cameras.main.fadeOut(500, 0, 0, 0);
        }

        this.hud.update();

        if (this.player.isGameOver && !this.gameOverShown) {
            this.triggerGameOver();
        }

    }

    triggerGameOver() {
        if (this.gameOverShown || !this.gameOverText || !this.gameOverText.active) {
            return;
        }
        this.gameOverShown = true;
        this.cameras.main.stopFollow();
        this.gameOverText.setVisible(true);
    }
}
