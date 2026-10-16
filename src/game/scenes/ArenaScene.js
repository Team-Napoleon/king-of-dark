import { Input, Scene } from 'phaser';
import DarknessOverlay from '../fx/DarknessOverlay';
import KingOfDark from '../entities/KingOfDark';
import Player from '../entities/Player';
import DialogueBox from '../ui/DialogueBox';
import Letterbox from '../ui/Letterbox';
import PlayerHud from '../ui/PlayerHud';

export default class ArenaScene extends Scene {
    constructor() {
        super('ArenaScene');
    }

    create() {
        this.cameras.main.setBackgroundColor('#000000');
        this.cameras.main.fadeIn(500);
        this.physics.world.setBounds(0, 0, 1280, 720);

        this.background = this.add.image(640, 360, 'bg-arena')
            .setScale(Math.max(1280 / 1344, 720 / 768))
            .setDepth(-10);
        this.floor = this.add.rectangle(640, 685, 1280, 110, 0x070a14, 0.85);
        this.floorRim = this.add.rectangle(640, 630, 1280, 2, 0x2d4a7a, 0.6);
        this.physics.add.existing(this.floor, true);

        this.leftWall = this.add.rectangle(70, 510, 24, 240, 0x000000, 0).setVisible(false);
        this.rightWall = this.add.rectangle(1210, 510, 24, 240, 0x000000, 0).setVisible(false);
        this.physics.add.existing(this.leftWall, true);
        this.physics.add.existing(this.rightWall, true);

        this.player = new Player(this, 260, 570);
        this.darkness = new DarknessOverlay(this, this.player, {
            alpha: 0.8,
            lightScale: 1.4,
            fogWorldWidth: 1280,
            fogScrollFactor: 0,
            fogAlpha: 0.14,
        });
        this.darknessEnabled = true;
        this.darknessKey = this.input.keyboard.addKey('L');
        this.physics.add.collider(this.player.sprite, this.floor);
        this.enemies = [];
        this.hud = new PlayerHud(this, this.player, { showControls: false });
        this.physics.add.collider(this.player.sprite, this.leftWall);
        this.physics.add.collider(this.player.sprite, this.rightWall);

        this.boss = new KingOfDark(this, 645, 340);
        this.enemies.push(this.boss);
        this.physics.add.collider(this.player.sprite, this.boss.sprite);
        this.boss.waveProjectiles.forEach((wave) => {
            this.physics.add.overlap(this.player.sprite, wave, () => {
                if (!wave || !wave.active || !wave.body.enable || !this.player || !this.player.sprite.active) {
                    return;
                }
                this.boss.deactivateHazard(wave);
                this.player.takeDamage(18);
            });
        });
        this.boss.voidOrbs.forEach((orb) => {
            this.physics.add.overlap(this.player.sprite, orb, () => {
                if (!orb || !orb.active || !orb.body.enable || !this.player || !this.player.sprite.active) {
                    return;
                }
                this.boss.deactivateHazard(orb);
                this.player.takeDamage(15);
            });
            this.physics.add.collider(orb, this.floor, () => {
                if (!orb || !orb.active || !orb.body.enable) {
                    return;
                }
                this.boss.deactivateHazard(orb);
            });
        });

        this.createBossHud();
        this.gameOverShown = false;
        this.gameOverText = this.add.text(640, 360, 'GAME OVER\nPress R to restart', {
            fontFamily: 'Arial Black',
            fontSize: '42px',
            color: '#f5d7a1',
            stroke: '#000000',
            strokeThickness: 8,
            align: 'center',
        }).setOrigin(0.5).setScrollFactor(0).setDepth(110).setVisible(false);
        this.victoryText = this.add.text(640, 360, 'THE DARKNESS SPREADS...', {
            fontFamily: 'Arial Black',
            fontSize: '36px',
            color: '#f5d7a1',
            stroke: '#000000',
            strokeThickness: 8,
            align: 'center',
        }).setOrigin(0.5).setScrollFactor(0).setDepth(130).setVisible(false);
        this.bossDefeatedSequence = false;
        this.events.once('boss-defeated', () => this.handleBossDefeated());
        this.dialogueBox = new DialogueBox(this);
        this.letterbox = new Letterbox(this);
        this.enterKey = this.input.keyboard.addKey('ENTER');
        this.introActive = false;
        this.introOutroStarted = false;
        this.cameraZoomInTween = this.tweens.add({
            targets: this.cameras.main,
            zoom: 1.15,
            duration: 600,
            paused: true,
            persist: true,
            onComplete: () => {
                if (!this.sys.isActive() || !this.introActive) {
                    return;
                }
                this.dialogueBox.show([
                    { speaker: 'KING', text: 'You came for power.' },
                    { speaker: 'HERO', text: 'I came to end you.' },
                    { speaker: 'KING', text: 'Everyone says that. Come then.' },
                ], { onComplete: () => this.finishIntroDialogue() });
            },
        });
        this.cameraZoomOutTween = this.tweens.add({
            targets: this.cameras.main,
            zoom: 1,
            duration: 600,
            paused: true,
            persist: true,
            onComplete: () => {
                if (!this.sys.isActive() || !this.introActive) {
                    return;
                }
                this.boss.beginIntroStep(980, () => this.finishIntroStep());
            },
        });
        if (this.registry.get('bossIntroSeen')) {
            this.boss.startFight(980);
            this.setBossHudVisible(true);
        } else {
            this.startIntro();
        }

        this.input.keyboard.once('keydown-R', () => {
            if (!this.sys.isActive()) {
                return;
            }
            this.scene.restart();
        });
        this.events.once('shutdown', () => {
            if (this.hud) {
                this.hud.destroy();
            }
        });
        this.events.once('shutdown', () => {
            if (this.darkness) {
                this.darkness.destroy();
            }
        });
        this.events.once('shutdown', () => {
            if (this.cameraZoomInTween) {
                this.cameraZoomInTween.stop();
            }
            if (this.cameraZoomOutTween) {
                this.cameraZoomOutTween.stop();
            }
        });
    }

    createBossHud() {
        this.bossHealthBack = this.add.rectangle(640, 48, 600, 22, 0x150d20, 0.92)
            .setScrollFactor(0)
            .setDepth(100);
        this.bossHealthBar = this.add.rectangle(344, 48, 584, 12, 0x9b55ff)
            .setOrigin(0, 0.5)
            .setScrollFactor(0)
            .setDepth(100);
        this.bossName = this.add.text(640, 16, 'KING OF DARK', {
            fontFamily: 'Arial Black',
            fontSize: '18px',
            color: '#d8b5ff',
            stroke: '#000000',
            strokeThickness: 4,
        }).setOrigin(0.5).setScrollFactor(0).setDepth(100);
        this.setBossHudVisible(false);
    }

    setBossHudVisible(visible) {
        [this.bossHealthBack, this.bossHealthBar, this.bossName].forEach((object) => {
            if (object && object.active) {
                object.setVisible(visible);
            }
        });
    }

    startIntro() {
        this.introActive = true;
        this.player.controlsLocked = true;
        this.player.sprite.body.setVelocity(0, 0);
        this.player.playAnimation('hero-idle');
        this.cameras.main.setZoom(1);
        this.letterbox.playIn(() => {
            if (!this.sys.isActive() || !this.introActive) {
                return;
            }
            this.cameraZoomInTween.restart();
        });
    }

    finishIntroDialogue() {
        if (!this.sys.isActive() || !this.introActive || this.introOutroStarted) {
            return;
        }
        this.introOutroStarted = true;
        this.cameraZoomInTween.stop();
        this.boss.flashEyes();
        this.cameras.main.shake(300, 0.01);
        this.letterbox.playOut();
        this.cameraZoomOutTween.restart();
    }

    finishIntroStep() {
        if (!this.sys.isActive() || !this.introActive) {
            return;
        }
        this.registry.set('bossIntroSeen', true);
        this.boss.startFight(980);
        this.player.controlsLocked = false;
        this.setBossHudVisible(true);
        this.introActive = false;
    }

    handleBossDefeated() {
        if (this.bossDefeatedSequence || !this.victoryText || !this.victoryText.active) {
            return;
        }
        this.bossDefeatedSequence = true;
        this.registry.set('bossDefeated', true);
        this.player.controlsLocked = true;
        this.setBossHudVisible(false);
        this.victoryText.setVisible(true);
        this.physics.world.pause();
    }

    update(time, delta) {
        if (this.bossDefeatedSequence) {
            return;
        }
        this.darkness.update(delta);
        this.dialogueBox.update(delta);
        if (this.introActive && Input.Keyboard.JustDown(this.enterKey)) {
            if (this.dialogueBox.isShowing) {
                this.dialogueBox.skip();
            } else {
                this.finishIntroDialogue();
            }
        }
        if (Input.Keyboard.JustDown(this.darknessKey)) {
            this.darknessEnabled = !this.darknessEnabled;
            this.darkness.setDarkness(this.darknessEnabled ? 0.8 : 0, 1.4, 250);
        }
        this.player.update(delta);
        this.boss.update(this.player, delta);
        this.hud.update();
        if (this.bossHealthBar && this.bossHealthBar.active) {
            this.bossHealthBar.setSize(584 * (this.boss.health / this.boss.maxHealth), 12);
        }
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