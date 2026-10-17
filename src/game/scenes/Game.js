import { Input, Scene } from 'phaser';
import Enemy from '../entities/Enemy';
import HealthOrb from '../entities/HealthOrb';
import Player from '../entities/Player';
import DarknessOverlay from '../fx/DarknessOverlay';
import PlayerHud from '../ui/PlayerHud';
import { DEBUG_KEYS, HEALTH_ORB, PORTAL, TEMPLE_WAVE } from '../config/animationData';

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
        this.physics.add.existing(floor, true);
        this.floor = floor;
        this.leftWall = this.add.rectangle(-16, 360, 32, 720, 0x000000, 0).setVisible(false);
        this.rightWall = this.add.rectangle(worldWidth + 16, 360, 32, 720, 0x000000, 0).setVisible(false);
        this.physics.add.existing(this.leftWall, true);
        this.physics.add.existing(this.rightWall, true);

        this.player = new Player(this, 180, 610);
        this.darkness = new DarknessOverlay(this, this.player, {
            alpha: 0.9,
            lightScale: 1.35,
            fogWorldWidth: worldWidth,
            fogScrollFactor: 0.6,
            fogAlpha: 0.16,
        });
        this.darknessEnabled = true;
        this.darknessKey = this.input.keyboard.addKey('F2');
        this.restartKey = this.input.keyboard.addKey('R');
        this.physics.add.collider(this.player.sprite, this.floor);
        this.physics.add.collider(this.player.sprite, this.leftWall);
        this.physics.add.collider(this.player.sprite, this.rightWall);

        this.createPortal();

        this.enemies = [];
        this.defeatingEnemies = [];
        this.enemyPool = TEMPLE_WAVE.sequence.map((type) => new Enemy(this, 0, 0, type));
        this.enemyPool.forEach((enemy) => {
            this.physics.add.collider(enemy.sprite, this.floor);
        });
        this.spawnIndex = 0;
        this.kills = 0;
        this.healthOrbs = Array.from({ length: TEMPLE_WAVE.sequence.length }, () => new HealthOrb(this, 660));
        this.healTexts = Array.from({ length: 8 }, () => {
            const text = this.add.text(0, 0, '', {
                fontFamily: 'Arial Black',
                fontSize: '18px',
                color: '#a6ffbb',
                stroke: '#06100a',
                strokeThickness: 4,
            }).setDepth(52).setVisible(false);
            text.life = 0;
            text.baseY = 0;
            return text;
        });

        this.cameras.main.startFollow(this.player.sprite, true, 0.08, 0.08);
        this.cameras.main.setDeadzone(120, 80);

        this.hud = new PlayerHud(this, this.player, { showControls: true, showKills: true });
        this.hud.setKills(this.kills, TEMPLE_WAVE.sequence.length);
        this.debugGraphics = this.add.graphics().setDepth(200).setVisible(false);
        this.debugEnabled = false;
        if (DEBUG_KEYS) {
            this.input.keyboard.addCapture('F3,F4,F5,F6');
            this.debugKeys = this.input.keyboard.addKeys({
                toggle: 'F3',
                spawn: 'F4',
                unlock: 'F5',
                teleport: 'F6',
            });
        }

        this.events.once('shutdown', () => {
            if (this.hud) {
                this.hud.destroy();
            }
        });
        this.events.once('shutdown', () => {
            const firstOrb = this.healthOrbs && this.healthOrbs[0];
            if (!firstOrb || !firstOrb.circle || !firstOrb.circle.active) {
                return;
            }
            this.healthOrbs.forEach((orb) => orb.destroy());
            this.healTexts.forEach((text) => {
                if (text && text.active) {
                    text.destroy();
                }
            });
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
        const enemy = this.enemyPool[this.spawnIndex];
        if (!enemy || enemy.type !== type || !enemy.spawnAt(x, y)) {
            return null;
        }
        this.enemies.push(enemy);
        this.spawnIndex += 1;
        return enemy;
    }

    updateWave() {
        if (this.spawnIndex >= TEMPLE_WAVE.sequence.length || this.enemies.length >= TEMPLE_WAVE.maxAlive) {
            return;
        }
        const triggerX = TEMPLE_WAVE.firstTriggerX + this.spawnIndex * TEMPLE_WAVE.triggerSpacing;
        if (this.player.sprite.x < triggerX) {
            return;
        }
        const spawnX = Math.min(this.player.sprite.x + TEMPLE_WAVE.spawnAhead, TEMPLE_WAVE.maxSpawnX);
        this.createEnemy(TEMPLE_WAVE.sequence[this.spawnIndex], spawnX, 600);
    }

    spawnNextEnemyNow() {
        if (this.enemies.length >= TEMPLE_WAVE.maxAlive || this.spawnIndex >= TEMPLE_WAVE.sequence.length) {
            return;
        }
        const x = Math.min(this.player.sprite.x + TEMPLE_WAVE.spawnAhead, TEMPLE_WAVE.maxSpawnX);
        this.createEnemy(TEMPLE_WAVE.sequence[this.spawnIndex], x, 600);
    }

    onEnemyDefeated(enemy) {
        if (!enemy || enemy.counted) {
            return;
        }
        enemy.counted = true;
        const liveIndex = this.enemies.indexOf(enemy);
        if (liveIndex !== -1) {
            this.enemies.splice(liveIndex, 1);
        }
        this.defeatingEnemies.push(enemy);
        this.kills += 1;
        this.hud.setKills(this.kills, TEMPLE_WAVE.sequence.length);
        if (Math.random() <= enemy.config.dropChance) {
            this.dropHealthOrb(enemy.sprite.x, enemy.sprite.y);
        }
    }

    dropHealthOrb(x, y) {
        const orb = this.healthOrbs.find((candidate) => !candidate.inUse);
        if (orb) {
            orb.drop(x, y);
        }
    }

    collectHealthOrb(orb) {
        if (!orb || !orb.circle || !orb.circle.active || !orb.collect()) {
            return;
        }
        this.player.heal(HEALTH_ORB.heal);
        const text = this.healTexts.find((candidate) => candidate.life <= 0);
        if (text && text.active) {
            text.setText(`+${HEALTH_ORB.heal}`);
            text.setPosition(orb.x, orb.y - 18);
            text.baseY = text.y;
            text.life = 0.8;
            text.setAlpha(1).setVisible(true);
        }
    }

    updateHealthOrbs(delta) {
        const heroX = this.player.sprite.body.center.x;
        const heroY = this.player.sprite.body.center.y;
        this.healthOrbs.forEach((orb) => {
            if (!orb || !orb.inUse || !orb.circle || !orb.circle.active) {
                return;
            }
            orb.update(delta);
            if (orb.isWithin(heroX, heroY)) {
                this.collectHealthOrb(orb);
            }
        });
        this.healTexts.forEach((text) => {
            if (!text || !text.active || text.life <= 0) {
                return;
            }
            text.life = Math.max(0, text.life - delta / 1000);
            text.y = text.baseY - (0.8 - text.life) * 18;
            text.setAlpha(text.life / 0.8);
            if (text.life === 0) {
                text.setVisible(false);
            }
        });
    }

    createPortal() {
        this.portalGlow = this.add.ellipse(PORTAL.x, PORTAL.worldY, 190, 220, 0x68708c, 0.08).setDepth(18);
        this.portalRings = [
            this.add.ellipse(PORTAL.x, PORTAL.worldY, 142, 194, 0x000000, 0)
                .setStrokeStyle(5, 0x69728d, 0.85).setDepth(20),
            this.add.ellipse(PORTAL.x, PORTAL.worldY, 118, 170, 0x000000, 0)
                .setStrokeStyle(3, 0x59627c, 0.8).setDepth(20),
            this.add.ellipse(PORTAL.x, PORTAL.worldY, 94, 144, 0x000000, 0)
                .setStrokeStyle(2, 0x4b536a, 0.8).setDepth(20),
        ];
        this.portalCore = this.add.ellipse(PORTAL.x, PORTAL.worldY, 84, 132, 0x111522, 0.96).setDepth(19);
        this.portalBurst = this.add.ellipse(PORTAL.x, PORTAL.worldY, 96, 148, 0x000000, 0)
            .setStrokeStyle(8, 0xc084ff, 1)
            .setDepth(52)
            .setVisible(false);
        this.portalPrompt = this.add.text(PORTAL.x, PORTAL.worldY - 100, 'Press E to enter', {
            fontFamily: 'Arial Black',
            fontSize: '18px',
            color: '#e7c8ff',
            stroke: '#160d24',
            strokeThickness: 5,
        }).setOrigin(0.5).setDepth(52).setVisible(false);
        this.portalBanner = this.add.container(640, -100).setScrollFactor(0).setDepth(120).setVisible(false);
        const panel = this.add.rectangle(0, 0, 940, 120, 0x111018, 0.95)
            .setStrokeStyle(2, 0x7e5a40);
        this.portalBannerTitle = this.add.text(0, -35, '', {
            fontFamily: 'Arial Black',
            fontSize: '22px',
            color: '#ff4949',
            stroke: '#000000',
            strokeThickness: 5,
        }).setOrigin(0.5);
        this.portalBannerLine1 = this.add.text(0, 0, '', {
            fontFamily: 'Arial',
            fontSize: '18px',
            color: '#f2e8ff',
            stroke: '#000000',
            strokeThickness: 4,
        }).setOrigin(0.5);
        this.portalBannerLine2 = this.add.text(0, 30, '', {
            fontFamily: 'Arial',
            fontSize: '16px',
            color: '#e4d9f2',
            stroke: '#000000',
            strokeThickness: 4,
        }).setOrigin(0.5);
        this.portalBanner.add([panel, this.portalBannerTitle, this.portalBannerLine1, this.portalBannerLine2]);
        this.portalUnlocked = false;
        this.portalRotation = 0;
        this.portalBurstTimer = 0;
        this.portalTransitioning = false;
        this.portalTransitionTimer = 0;
        this.portalSceneStarted = false;
        this.portalWall = this.add.rectangle(PORTAL.wallX, 540, 24, 240, 0x000000, 0).setVisible(false);
        this.physics.add.existing(this.portalWall, true);
        this.physics.add.collider(this.player.sprite, this.portalWall);
    }

    updatePortal(delta) {
        const seconds = delta / 1000;
        this.portalRotation += seconds;
        this.portalRings.forEach((ring, index) => {
            ring.rotation = this.portalRotation * (index === 1 ? -0.7 : 1 + index * 0.2);
        });

        if (!this.portalUnlocked && this.kills >= TEMPLE_WAVE.sequence.length) {
            this.portalUnlocked = true;
            this.portalBurstTimer = 0.7;
        }
        if (this.portalUnlocked) {
            const glow = 0.18 + (Math.sin(this.portalRotation * 5) + 1) * 0.08;
            this.portalGlow.setFillStyle(0x914bff, glow);
            this.portalCore.setFillStyle(0x2a1045, 0.96);
            this.portalRings[0].setStrokeStyle(5, 0xb66cff, 0.95);
            this.portalRings[1].setStrokeStyle(3, 0x813ee0, 0.9);
            this.portalRings[2].setStrokeStyle(2, 0xd09aff, 0.9);
        } else {
            this.portalGlow.setFillStyle(0x68708c, 0.08);
            this.portalCore.setFillStyle(0x111522, 0.96);
            this.portalRings[0].setStrokeStyle(5, 0x69728d, 0.85);
            this.portalRings[1].setStrokeStyle(3, 0x59627c, 0.8);
            this.portalRings[2].setStrokeStyle(2, 0x4b536a, 0.8);
        }

        if (this.portalBurstTimer > 0) {
            this.portalBurstTimer = Math.max(0, this.portalBurstTimer - seconds);
            this.portalBurst.setVisible(true);
            this.portalBurst.setAlpha(this.portalBurstTimer / 0.7);
        } else {
            this.portalBurst.setVisible(false);
        }

        const distance = Math.abs(this.player.sprite.body.center.x - PORTAL.x);
        const bannerNear = distance <= PORTAL.bannerRange;
        if (bannerNear) {
            this.portalBanner.setVisible(true);
            const targetY = this.portalUnlocked ? PORTAL.bannerOpenY : PORTAL.bannerSealedY;
            this.portalBanner.y = Math.min(targetY, this.portalBanner.y + seconds * 520);
            this.portalBannerTitle.setAlpha(0.82 + (Math.sin(this.portalRotation * 4) + 1) * 0.09);
            const mode = this.portalUnlocked ? 'open' : `sealed-${this.kills}`;
            if (this.portalBannerMode !== mode) {
                this.portalBannerMode = mode;
                if (this.portalUnlocked) {
                    this.portalBannerTitle.setText('▲ WARNING ▲').setColor('#ff4949');
                    this.portalBannerLine1.setText('THE DARK KING AWAITS BEYOND THIS PORTAL');
                    this.portalBannerLine2.setText('Heal up. There is no way back.');
                } else {
                    this.portalBannerTitle.setText(`THE PORTAL IS SEALED - SLAY THE SHADOWS (${this.kills}/10)`)
                        .setColor('#b5bfd4');
                    this.portalBannerLine1.setText('');
                    this.portalBannerLine2.setText('');
                }
            }
        } else {
            this.portalBanner.y = Math.max(-100, this.portalBanner.y - seconds * 520);
            if (this.portalBanner.y <= -99) {
                this.portalBanner.setVisible(false);
            }
            this.portalBannerMode = null;
        }

        const canEnter = this.portalUnlocked && distance <= PORTAL.enterRange && !this.portalTransitioning;
        this.portalPrompt.setVisible(canEnter);
        if (canEnter && Input.Keyboard.JustDown(this.player.keys.portalEnter)) {
            this.portalTransitioning = true;
            this.portalTransitionTimer = PORTAL.transition;
            this.player.controlsLocked = true;
            this.player.forcedWalkDirection = Math.sign(PORTAL.x - this.player.sprite.body.center.x);
            this.player.forcedWalkSpeed = PORTAL.walkSpeed;
        }

        if (!this.portalTransitioning || this.portalSceneStarted) {
            return;
        }
        this.portalTransitionTimer = Math.max(0, this.portalTransitionTimer - seconds);
        const progress = 1 - this.portalTransitionTimer / PORTAL.transition;
        this.cameras.main.setZoom(1 + (PORTAL.zoom - 1) * progress);
        this.portalGlow.setFillStyle(0xd58cff, 0.24 + progress * 0.65);
        this.portalCore.setFillStyle(0x9d41ff, 0.96);
        if (this.portalTransitionTimer <= PORTAL.fadeTime) {
            this.player.visual.setAlpha(Math.max(0, this.portalTransitionTimer / PORTAL.fadeTime));
        }
        if (this.portalTransitionTimer <= PORTAL.fadeOutTime && !this.portalFadeStarted) {
            this.portalFadeStarted = true;
            this.cameras.main.once('camerafadeoutcomplete', () => {
                if (!this.portalWall || !this.portalWall.active || !this.sys.isActive() || this.portalSceneStarted) {
                    return;
                }
                this.portalSceneStarted = true;
                this.registry.set('reachedArena', true);
                this.scene.start('ArenaScene');
            });
            this.cameras.main.fadeOut(PORTAL.fadeOutTime * 1000, 0, 0, 0);
        }
    }

    update(time, delta) {
        this.tileBackground.tilePositionX = this.cameras.main.scrollX * 0.5;
        this.darkness.update(delta);
        this.player.update(delta);

        this.updateWave();
        for (let index = 0; index < this.enemies.length; index += 1) {
            this.enemies[index].update(this.player, delta);
        }
        for (let index = this.defeatingEnemies.length - 1; index >= 0; index -= 1) {
            if (this.defeatingEnemies[index].updateDefeat(delta)) {
                this.defeatingEnemies.splice(index, 1);
            }
        }
        this.updateHealthOrbs(delta);

        if (DEBUG_KEYS) {
            if (Input.Keyboard.JustDown(this.darknessKey)) {
                this.darknessEnabled = !this.darknessEnabled;
                this.darkness.setDarkness(this.darknessEnabled ? 0.9 : 0, 1, 250);
            }
            if (Input.Keyboard.JustDown(this.debugKeys.toggle)) {
                this.debugEnabled = !this.debugEnabled;
                this.debugGraphics.setVisible(this.debugEnabled);
            }
            if (Input.Keyboard.JustDown(this.debugKeys.spawn)) {
                this.spawnNextEnemyNow();
            }
            if (Input.Keyboard.JustDown(this.debugKeys.unlock)) {
                this.kills = TEMPLE_WAVE.sequence.length;
                this.hud.setKills(this.kills, TEMPLE_WAVE.sequence.length);
                this.portalUnlocked = true;
                this.portalBurstTimer = 0.7;
            }
            if (Input.Keyboard.JustDown(this.debugKeys.teleport)) {
                this.player.sprite.setPosition(5300, this.player.sprite.y);
                this.player.sprite.body.reset(5300, this.player.sprite.y);
            }
        }
        if (this.debugEnabled) {
            this.drawDebug();
        }

        this.updatePortal(delta);

        this.hud.update();

        if (this.player.isGameOver && !this.gameOverShown) {
            this.triggerGameOver();
        }
        if (this.gameOverText && this.gameOverText.active && Input.Keyboard.JustDown(this.restartKey)) {
            this.scene.restart();
        }

    }

    drawDebugRect(x, y, width, height, color) {
        const graphics = this.debugGraphics;
        graphics.lineStyle(2, color, 1);
        graphics.beginPath();
        graphics.moveTo(x, y);
        graphics.lineTo(x + width, y);
        graphics.lineTo(x + width, y + height);
        graphics.lineTo(x, y + height);
        graphics.lineTo(x, y);
        graphics.strokePath();
    }

    drawDebug() {
        const graphics = this.debugGraphics;
        graphics.clear();
        const body = this.player.sprite.body;
        this.drawDebugRect(body.x, body.y, body.width, body.height, 0x36ff70);
        if (this.player.hitBoxActive) {
            this.drawDebugRect(
                this.player.hitBoxX,
                this.player.hitBoxY - this.player.hitBoxHeight / 2,
                this.player.hitBoxWidth,
                this.player.hitBoxHeight,
                0xffe336,
            );
        }
        this.player.fireballs.forEach((ball) => {
            if (!ball.active) {
                return;
            }
            this.debugGraphics.lineStyle(2, 0xff9b32, 1);
            this.debugGraphics.beginPath();
            this.debugGraphics.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
            this.debugGraphics.strokePath();
        });
        graphics.fillStyle(0xffffff, 1);
        graphics.fillEllipse(body.center.x, body.bottom, 4, 4);
        this.enemies.forEach((enemy) => {
            if (!enemy || !enemy.sprite || !enemy.sprite.active) {
                return;
            }
            this.drawDebugRect(
                enemy.sprite.x - enemy.hitHalfWidth,
                enemy.sprite.body.center.y - enemy.hitHalfHeight,
                enemy.hitHalfWidth * 2,
                enemy.hitHalfHeight * 2,
                0xff3030,
            );
            graphics.fillStyle(0xffffff, 1);
            graphics.fillEllipse(enemy.sprite.body.center.x, enemy.sprite.body.bottom, 4, 4);
        });
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
