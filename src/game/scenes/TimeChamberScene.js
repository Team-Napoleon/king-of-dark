import { BlendModes, Input, Scene } from 'phaser';
import Player from '../entities/Player';
import PlayerHud from '../ui/PlayerHud';
import WorldBubble from '../ui/WorldBubble';
import { ACT3_PACING, ACT3_SPEAKERS } from '../config/actThreeData';
import { LIFE_ASSETS } from '../config/lifeData';
import { HERO_PHYSICS, HERO_STAND_PX } from '../config/animationData';
import { TIME_ASSETS, TIME_CHAMBER_CONFIG, TIME_SCENE_KEYS } from '../config/timeData';
import { ORB_NAMES, ORB_ORDER, orbHudText } from '../config/actTruthData';

const WIDTH = 1280;
const HEIGHT = 720;
const FLOOR_REL = TIME_CHAMBER_CONFIG.heroSpawn.yRel;

function ensureOrbProgress(registry) {
    if (registry.get('orbs') == null) registry.set('orbs', ORB_ORDER.slice(0, 1));
}

export default class TimeChamberScene extends Scene {
    constructor() {
        super(TIME_SCENE_KEYS.TIME_CHAMBER);
    }

    create() {
        ensureOrbProgress(this.registry);
        this.cameras.main.resetFX();
        this.cameras.main.setBackgroundColor('#050711');
        this.floorY = FLOOR_REL * HEIGHT;
        this.elapsed = 0;
        this.phase = 'intro';
        this.lineDone = false;
        this.lineElapsed = 0;
        this.spawnElapsed = 0;
        this.spawnCount = 0;
        this.killCount = 0;
        this.failElapsed = -1;
        this.transitionElapsed = -1;
        this.orbElapsed = 0;
        this.orbState = 'sealed';
        this.flashElapsed = -1;
        this.bannerElapsed = -1;
        this.transitionStarted = false;
        this.restartKey = this.input.keyboard.addKey('R');

        this.createBackground();
        this.createRoomArt();
        this.createFloor();
        this.createHero();
        this.createOrb();
        this.createEnemyPool();
        this.createUi();
        this.startLine(TIME_CHAMBER_CONFIG.introBeats[0]);
        this.events.once('shutdown', () => this.cleanup());
    }

    createBackground() {
        if (this.textures.exists(TIME_ASSETS.BG_IMAGE.key)) {
            this.add.image(WIDTH / 2, HEIGHT / 2, TIME_ASSETS.BG_IMAGE.key)
                .setDisplaySize(WIDTH, HEIGHT)
                .setDepth(-20);
        } else {
            console.warn(`[TimeChamberScene] Missing "${TIME_ASSETS.BG_IMAGE.key}"; using a drawn chamber.`);
            this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x0a0d1c).setDepth(-20);
        }
    }

    createRoomArt() {
        const room = this.add.graphics().setDepth(-10);
        room.fillStyle(0x11172a, 0.92).fillRect(0, 0, WIDTH, this.floorY);
        room.fillStyle(0x28314a, 1);
        for (let x = 60; x < WIDTH; x += 190) {
            room.fillRect(x, 90, 56, this.floorY - 90);
            room.fillTriangle(x - 20, 98, x + 28, 42, x + 76, 98);
        }
        room.fillStyle(0x52648f, 0.35);
        room.fillRect(0, this.floorY - 8, WIDTH, 8);
        room.lineStyle(2, 0x7587b4, 0.35);
        room.lineBetween(0, this.floorY - 70, WIDTH, this.floorY - 70);
    }

    createFloor() {
        this.floor = this.add.rectangle(WIDTH / 2, this.floorY + 28, WIDTH, 56, 0x000000, 0)
            .setVisible(false);
        this.physics.add.existing(this.floor, true);
    }

    createHero() {
        this.player = new Player(this, TIME_CHAMBER_CONFIG.heroSpawn.x, this.floorY - 50);
        this.player.moveSpeed = HERO_PHYSICS.moveSpeed;
        this.player.sprite.body.setCollideWorldBounds(true);
        this.physics.add.collider(this.player.sprite, this.floor);
        this.enemies = [];
        this.player.scene.enemies = this.enemies;
        this.cameras.main.setBounds(0, 0, WIDTH, HEIGHT);
        this.cameras.main.startFollow(this.player.sprite, true, 0.08, 0.08);
    }

    createOrb() {
        const { x, yRel } = TIME_CHAMBER_CONFIG.pedestalPos;
        this.pedestalX = x;
        this.pedestalY = yRel * HEIGHT;
        this.pedestal = this.add.graphics().setDepth(2);
        this.pedestal.fillStyle(0x333c58, 1).fillEllipse(x, this.floorY - 4, 220, 35);
        this.pedestal.fillStyle(0x7184b3, 1).fillEllipse(x, this.floorY - 17, 150, 28);
        this.pedestal.lineStyle(3, 0x6f9fd1, 0.8).strokeEllipse(x, this.floorY - 17, 150, 28);
        this.orb = this.textures.exists(TIME_ASSETS.HOURGLASS_STATIC.key)
            ? this.add.image(x, this.pedestalY, TIME_ASSETS.HOURGLASS_STATIC.key)
                .setScale(0.66)
                .setBlendMode(BlendModes.ADD)
                .setDepth(7)
            : this.add.graphics().setDepth(7);
        if (this.orb.type === 'Graphics') {
            this.orb.fillStyle(0x84d8ff, 0.92).fillCircle(0, 0, 38);
            this.orb.lineStyle(5, 0xe0f6ff, 0.9).strokeCircle(0, 0, 46);
        }
        this.orbBaseY = this.pedestalY;
        this.orb.setVisible(false);
        this.timeAura = this.add.circle(0, 0, HERO_STAND_PX * 0.8, 0x6cbfff, 0.25)
            .setBlendMode(BlendModes.ADD).setDepth(4).setVisible(false);
    }

    createEnemyPool() {
        const wave = TIME_CHAMBER_CONFIG.wave;
        this.enemyPool = Array.from({ length: wave.totalEnemies }, (_unused, index) => {
            const bodyW = HERO_STAND_PX * 0.9;
            const bodyH = HERO_STAND_PX * 0.3;
            const carrier = this.add.rectangle(0, 0, bodyW, bodyH, 0, 0).setVisible(false);
            this.physics.add.existing(carrier);
            carrier.body.setAllowGravity(false).setImmovable(true).setSize(bodyW, bodyH);
            carrier.body.enable = false;
            const visual = this.textures.exists(LIFE_ASSETS.crawler.chaseRight.key)
                ? this.add.sprite(0, this.floorY, LIFE_ASSETS.crawler.chaseRight.key, 0)
                    .setOrigin(0.5, LIFE_ASSETS.crawler.feetY / LIFE_ASSETS.crawler.frameHeight)
                    .setScale(bodyW / LIFE_ASSETS.crawler.bodyW)
                    .setDepth(7).setVisible(false)
                : this.add.rectangle(0, this.floorY, bodyW, bodyH, 0x283651)
                    .setOrigin(0.5, 1).setDepth(7).setVisible(false);
            const enemy = {
                id: index,
                sprite: carrier,
                visual,
                x: 0,
                health: wave.stats.health,
                inUse: false,
                isDefeated: true,
                untargetable: true,
                hitHalfWidth: bodyW / 2,
                hitHalfHeight: bodyH / 2,
                state: 'inactive',
                attackElapsed: 0,
                attackCooldown: 0,
                attackDidHit: false,
                animation: '',
            };
            enemy.applyDamage = (amount, fromX) => {
                if (!enemy.inUse || enemy.isDefeated || enemy.untargetable) return;
                enemy.health = Math.max(0, enemy.health - amount);
                if (enemy.health === 0) {
                    enemy.isDefeated = true;
                    enemy.inUse = false;
                    enemy.state = 'dead';
                    enemy.sprite.body.enable = false;
                    enemy.visual.setVisible(false);
                    this.killCount += 1;
                    return;
                }
                enemy.state = 'hurt';
                enemy.attackElapsed = 0;
                enemy.facing = enemy.x >= fromX ? 1 : -1;
                if (enemy.visual.type === 'Sprite') enemy.visual.setTint(0x9bdcff);
            };
            enemy.reset = () => {
                enemy.inUse = false;
                enemy.isDefeated = true;
                enemy.untargetable = true;
                enemy.state = 'inactive';
                enemy.sprite.body.enable = false;
                enemy.sprite.setVisible(false);
                enemy.visual.clearTint?.();
                enemy.visual.setVisible(false).setAlpha(1);
                enemy.health = wave.stats.health;
                enemy.animation = '';
            };
            this.enemies.push(enemy);
            return enemy;
        });
    }

    createUi() {
        this.hud = new PlayerHud(this, this.player, { showControls: false, showKills: false });
        this.hud.controlsChipBack.setVisible(false);
        this.hud.controlsChip.setVisible(false);
        this.bubble = new WorldBubble(this, {
            speakers: { ...ACT3_SPEAKERS, SYSTEM: { color: 0x9fd9ff, anchor: 'voice' } },
            pacing: ACT3_PACING,
            voiceStyle: { y: 150, maxWidth: 580, textColor: '#d9edff', glowColor: 0x70bfff },
        });
        this.bubble.setAnchor('hero', () => ({
            x: this.player.sprite.body.center.x,
            y: this.player.sprite.body.bottom - HERO_STAND_PX - 10,
        }));
        this.orbText = this.add.text(WIDTH - 24, 28, '', {
            fontFamily: 'Arial Black', fontSize: '16px', color: '#d6e9ff',
            stroke: '#050711', strokeThickness: 4,
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(110);
        this.updateOrbHud();
        this.killText = this.add.text(28, 112, '', {
            fontFamily: 'Arial Black', fontSize: '16px', color: '#c4d8ff',
            stroke: '#050711', strokeThickness: 4,
        }).setScrollFactor(0).setDepth(110);
        this.failText = this.add.text(WIDTH / 2, HEIGHT / 2, 'TIME FRACTURED\nPress R to retry the wave', {
            fontFamily: 'Arial Black', fontSize: '32px', color: '#b9ddff',
            stroke: '#050711', strokeThickness: 7, align: 'center',
        }).setOrigin(0.5).setScrollFactor(0).setDepth(160).setVisible(false);
        this.banner = this.add.container(WIDTH / 2, HEIGHT / 2).setScrollFactor(0).setDepth(150).setVisible(false);
        this.bannerBack = this.add.rectangle(0, 0, 690, 150, 0x071020, 0.94)
            .setStrokeStyle(3, 0x8bd3ff, 0.9);
        this.bannerTitle = this.add.text(0, -24, '', {
            fontFamily: 'Arial Black', fontSize: '34px', color: '#a9ddff',
            stroke: '#050711', strokeThickness: 6, align: 'center',
        }).setOrigin(0.5);
        this.bannerProgress = this.add.text(0, 26, '', {
            fontFamily: 'Arial', fontSize: '22px', color: '#f2f0e8',
            stroke: '#050711', strokeThickness: 5, align: 'center',
        }).setOrigin(0.5);
        this.banner.add([this.bannerBack, this.bannerTitle, this.bannerProgress]);
        this.flash = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x89cfff, 0)
            .setScrollFactor(0).setDepth(145).setBlendMode(BlendModes.ADD);
    }

    updateOrbHud() {
        const orbs = this.registry.get('orbs');
        const count = Array.isArray(orbs) ? orbs.length : 0;
        this.orbCount = count;
        this.orbText.setText(orbHudText(count));
    }

    startLine(beat) {
        this.lineDone = false;
        this.lineElapsed = 0;
        this.bubble.say({
            who: beat.speaker,
            text: beat.text,
            onDone: () => {
                if (this.sys.isActive()) this.lineDone = true;
            },
        });
    }

    beginWave() {
        this.phase = 'wave';
        this.spawnCount = 0;
        this.killCount = 0;
        this.spawnElapsed = 0;
        this.waveStarted = true;
        this.player.controlsLocked = false;
        this.player.isGameOver = false;
        for (const enemy of this.enemyPool) enemy.reset();
        this.spawnNextEnemy();
    }

    spawnNextEnemy() {
        const wave = TIME_CHAMBER_CONFIG.wave;
        if (this.spawnCount >= wave.totalEnemies) return false;
        const enemy = this.enemyPool.find((candidate) => !candidate.inUse);
        if (!enemy) return false;
        const rawX = wave.spawnXPositions[this.spawnCount % wave.spawnXPositions.length];
        enemy.x = Math.max(enemy.hitHalfWidth + 12, Math.min(WIDTH - enemy.hitHalfWidth - 12, rawX));
        enemy.health = wave.stats.health;
        enemy.inUse = true;
        enemy.isDefeated = false;
        enemy.untargetable = false;
        enemy.state = 'chase';
        enemy.attackCooldown = 0;
        enemy.attackElapsed = 0;
        enemy.attackDidHit = false;
        enemy.sprite.body.enable = true;
        enemy.sprite.setVisible(true);
        this.positionEnemy(enemy);
        enemy.visual.setVisible(true).setAlpha(1);
        enemy.animation = '';
        this.setEnemyClip(enemy, 'chase');
        this.spawnCount += 1;
        return true;
    }

    positionEnemy(enemy) {
        const bodyW = enemy.sprite.body.width;
        const bodyH = enemy.sprite.body.height;
        const centerY = this.floorY - bodyH / 2;
        enemy.sprite.setPosition(enemy.x, centerY);
        enemy.sprite.body.reset(enemy.x, centerY);
        enemy.visual.setPosition(enemy.x, this.floorY);
    }

    setEnemyClip(enemy, action) {
        if (enemy.visual.type !== 'Sprite') return;
        const direction = enemy.facing < 0 ? 'left' : 'right';
        const asset = action === 'attack'
            ? LIFE_ASSETS.crawler[`attack${direction[0].toUpperCase()}${direction.slice(1)}`]
            : LIFE_ASSETS.crawler[`chase${direction[0].toUpperCase()}${direction.slice(1)}`];
        const animation = `life-crawler-${action}-${direction}`;
        if (enemy.visual.texture.key !== asset.key) enemy.visual.setTexture(asset.key, 0);
        if (this.anims.exists(animation) && enemy.animation !== animation) {
            enemy.visual.play(animation);
            enemy.animation = animation;
        }
    }

    updateEnemies(seconds) {
        const wave = TIME_CHAMBER_CONFIG.wave;
        let alive = 0;
        const heroX = this.player.sprite.body.center.x;
        for (const enemy of this.enemyPool) {
            if (!enemy.inUse || enemy.isDefeated) continue;
            alive += 1;
            if (enemy.attackCooldown > 0) enemy.attackCooldown = Math.max(0, enemy.attackCooldown - seconds);
            const dx = heroX - enemy.x;
            enemy.facing = dx >= 0 ? 1 : -1;
            if (enemy.state === 'hurt') {
                enemy.attackElapsed += seconds;
                if (enemy.attackElapsed >= 0.25) {
                    enemy.state = 'chase';
                    enemy.attackElapsed = 0;
                    enemy.visual.clearTint?.();
                    enemy.animation = '';
                }
            } else if (enemy.state === 'attack') {
                enemy.attackElapsed += seconds;
                if (!enemy.attackDidHit && enemy.attackElapsed >= 0.42) {
                    enemy.attackDidHit = true;
                    if (Math.abs(dx) <= HERO_STAND_PX * 0.72) {
                        this.player.takeDamage(
                            wave.stats.damage,
                            enemy.x,
                            HERO_STAND_PX * 0.45
                        );
                    }
                }
                if (enemy.attackElapsed >= 0.9) {
                    enemy.state = 'chase';
                    enemy.attackElapsed = 0;
                    enemy.animation = '';
                }
            } else if (Math.abs(dx) <= HERO_STAND_PX * 0.72 && enemy.attackCooldown <= 0) {
                enemy.state = 'attack';
                enemy.attackElapsed = 0;
                enemy.attackCooldown = 1.7;
                enemy.attackDidHit = false;
                this.setEnemyClip(enemy, 'attack');
            } else {
                const speed = Math.min(wave.stats.speed, Math.abs(dx) / Math.max(seconds, 0.001));
                enemy.x += Math.sign(dx) * speed * seconds;
                enemy.animation = enemy.state === 'chase' ? enemy.animation : '';
                this.setEnemyClip(enemy, 'chase');
            }
            this.positionEnemy(enemy);
        }
        for (let i = 0; i < this.enemyPool.length; i += 1) {
            const first = this.enemyPool[i];
            if (!first.inUse || first.isDefeated) continue;
            for (let j = i + 1; j < this.enemyPool.length; j += 1) {
                const second = this.enemyPool[j];
                if (!second.inUse || second.isDefeated) continue;
                const minGap = (first.hitHalfWidth + second.hitHalfWidth) * 0.82;
                const dx = second.x - first.x;
                if (Math.abs(dx) < minGap) {
                    const push = (minGap - Math.abs(dx)) / 2;
                    first.x -= Math.sign(dx || 1) * push;
                    second.x += Math.sign(dx || 1) * push;
                    this.positionEnemy(first);
                    this.positionEnemy(second);
                }
            }
        }
        return alive;
    }

    startVictory() {
        this.phase = 'victory';
        this.victoryIndex = 0;
        this.orbState = 'rise';
        this.orbElapsed = 0;
        this.orb.setVisible(true).setPosition(this.pedestalX, this.orbBaseY);
        this.startLine(TIME_CHAMBER_CONFIG.victoryBeats[this.victoryIndex]);
    }

    updateVictory(seconds, delta) {
        const beat = TIME_CHAMBER_CONFIG.victoryBeats[this.victoryIndex];
        this.lineElapsed += delta;
        this.orbElapsed += seconds;
        if (this.orbState === 'rise') {
            const duration = TIME_CHAMBER_CONFIG.victoryBeats[0].duration / 1000;
            const progress = Math.min(1, this.orbElapsed / duration);
            this.orb.setPosition(this.pedestalX, this.orbBaseY - 116 * progress + Math.sin(this.elapsed * 3) * 3);
        } else if (this.orbState === 'collect') {
            const duration = TIME_CHAMBER_CONFIG.victoryBeats[1].duration / 1000;
            const progress = Math.min(1, this.orbElapsed / duration);
            const heroX = this.player.sprite.body.center.x;
            const heroY = this.player.sprite.body.bottom - HERO_STAND_PX * 0.55;
            const startX = this.orbStartX;
            const startY = this.orbStartY;
            this.orb.setPosition(
                startX + (heroX - startX) * progress,
                startY + (heroY - startY) * progress - Math.sin(progress * Math.PI) * 45
            );
            if (progress >= 1) {
                this.orbState = 'absorbed';
                this.orb.setVisible(false);
                this.registry.set('orbs', ORB_ORDER.slice(0, 2));
                this.updateOrbHud();
                this.flashElapsed = 0;
                this.timeAura.setVisible(true);
            }
        } else if (this.orbState === 'absorbed') {
            const flash = TIME_CHAMBER_CONFIG.orbBanner.bannerDuration > 0
                ? Math.max(0, 1 - this.flashElapsed / 0.4)
                : 0;
            this.flash.setAlpha(flash * 0.7);
            this.timeAura.setPosition(
                this.player.sprite.body.center.x,
                this.player.sprite.body.bottom - HERO_STAND_PX * 0.5
            ).setAlpha(0.28 + Math.sin(this.elapsed * 8) * 0.14);
            this.flashElapsed += seconds;
        }

        if (this.lineDone && this.lineElapsed >= beat.duration) {
            this.victoryIndex += 1;
            if (this.victoryIndex < TIME_CHAMBER_CONFIG.victoryBeats.length) {
                if (this.victoryIndex === 1) {
                    this.orbState = 'collect';
                    this.orbElapsed = 0;
                    this.orbStartX = this.orb.x;
                    this.orbStartY = this.orb.y;
                }
                this.startLine(TIME_CHAMBER_CONFIG.victoryBeats[this.victoryIndex]);
            } else if (this.orbState === 'absorbed') {
                this.phase = 'banner';
                this.bannerElapsed = 0;
                this.bannerTitle.setText(ORB_NAMES.time);
                this.bannerProgress.setText(orbHudText(this.orbCount));
                this.banner.setVisible(true);
            }
        }
    }

    resetWave() {
        for (const enemy of this.enemyPool) enemy.reset();
        this.killCount = 0;
        this.spawnCount = 0;
        this.spawnElapsed = 0;
        this.failElapsed = -1;
        this.failText.setVisible(false);
        this.player.health = this.player.maxHealth;
        this.player.isGameOver = false;
        this.player.invulnerableTimer = 0;
        this.player.visual.setAlpha(1);
        this.player.controlsLocked = false;
        this.player.sprite.body.reset(TIME_CHAMBER_CONFIG.heroSpawn.x, this.floorY - 50);
        this.phase = 'wave';
        this.waveStarted = true;
        this.spawnNextEnemy();
    }

    triggerGameOver() {
        if (this.phase !== 'wave') return;
        this.enterWaveFail();
    }

    enterWaveFail() {
        if (this.phase !== 'wave') return;
        this.phase = 'fail';
        this.failElapsed = 0;
        this.player.health = 0;
        this.player.controlsLocked = true;
        this.player.forcedWalkDirection = 0;
        for (const enemy of this.enemyPool) enemy.reset();
        this.failText.setVisible(true);
    }

    update(_time, delta) {
        if (this.transitionStarted) return;
        const seconds = delta / 1000;
        this.elapsed += seconds;
        this.player.update(delta);
        this.hud.update(delta);
        this.bubble.update(seconds);
        this.killText.setText(`STALKERS ${this.killCount}/${TIME_CHAMBER_CONFIG.wave.totalEnemies}`);

        if (this.phase === 'intro') {
            this.lineElapsed += delta;
            if (this.lineDone && this.lineElapsed >= TIME_CHAMBER_CONFIG.introBeats[0].duration) {
                this.beginWave();
            }
        } else if (this.phase === 'wave') {
            if (Input.Keyboard.JustDown(this.restartKey)) {
                this.resetWave();
                return;
            }
            this.spawnElapsed += delta;
            const wave = TIME_CHAMBER_CONFIG.wave;
            const aliveBeforeUpdate = this.updateEnemies(seconds);
            if (this.player.health <= 0) {
                this.enterWaveFail();
                return;
            }
            if (this.spawnCount < wave.totalEnemies && aliveBeforeUpdate < wave.maxConcurrent &&
                this.spawnElapsed >= wave.spawnIntervalMs) {
                this.spawnElapsed = 0;
                this.spawnNextEnemy();
            }
            if (this.spawnCount >= wave.totalEnemies && this.killCount >= wave.totalEnemies) {
                this.startVictory();
            }
        } else if (this.phase === 'fail') {
            this.failElapsed += delta;
            if (Input.Keyboard.JustDown(this.restartKey) || this.failElapsed >= 2400) {
                this.resetWave();
            }
        } else if (this.phase === 'victory') {
            this.updateVictory(seconds, delta);
        } else if (this.phase === 'banner') {
            this.bannerElapsed += delta;
            const duration = TIME_CHAMBER_CONFIG.orbBanner.bannerDuration;
            this.banner.setAlpha(this.bannerElapsed < 200 ? this.bannerElapsed / 200 : 1);
            if (this.bannerElapsed >= duration) {
                this.phase = 'transition';
                this.transitionElapsed = 0;
            }
        } else if (this.phase === 'transition') {
            this.transitionElapsed += delta;
            this.flash.setAlpha(Math.min(1, this.transitionElapsed / 900) * 0.9);
            if (this.transitionElapsed >= 900) {
                this.transitionStarted = true;
                this.scene.start(TIME_SCENE_KEYS.MINA_AFTER_TIME);
            }
        }
        if (this.flashElapsed >= 0 && this.flashElapsed < 0.4) {
            this.flash.setAlpha((1 - this.flashElapsed / 0.4) * 0.7);
        }
        if (Input.Keyboard.JustDown(this.restartKey) && this.phase === 'fail') this.resetWave();
    }

    cleanup() {
        if (this.bubble) this.bubble.destroy();
        if (this.hud) this.hud.destroy();
        for (const enemy of this.enemyPool || []) enemy.reset();
    }
}
