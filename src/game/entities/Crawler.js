import { BlendModes } from 'phaser';
import { CRAWLER, LIFE_ASSETS, SETTLEMENT } from '../config/lifeData';
import {
    HERO_MOVES,
    HERO_PHYSICS,
    HERO_STAND_PX,
    NEW_HERO_MOVES,
    SHADOW,
} from '../config/animationData';

const DAMAGE_MOVES = [
    ['punch', HERO_MOVES.punch.damage],
    ['punch', HERO_MOVES.combo.damage],
    ['kick', NEW_HERO_MOVES.kick.damage],
    ['sword', NEW_HERO_MOVES.sword.damage],
    ['fire', NEW_HERO_MOVES.fire.projectile.damage],
];

function moveForDamage(amount) {
    let bestName = 'punch';
    let bestDifference = Number.POSITIVE_INFINITY;
    for (const [name, rawDamage] of DAMAGE_MOVES) {
        const normalDifference = Math.abs(amount - rawDamage);
        const shadowDifference = Math.abs(amount - Math.round(rawDamage * SHADOW.damageMult));
        if (normalDifference < bestDifference) {
            bestDifference = normalDifference;
            bestName = name;
        }
        if (shadowDifference < bestDifference) {
            bestDifference = shadowDifference;
            bestName = name;
        }
    }
    return bestName;
}

export default class Crawler {
    constructor(scene, id) {
        this.scene = scene;
        this.id = id;
        this.length = CRAWLER.lengthVsHero * HERO_STAND_PX;
        this.scale = this.length / LIFE_ASSETS.crawler.bodyW;
        this.bodyHeight = LIFE_ASSETS.crawler.bodyH * this.scale;
        this.hitHalfWidth = this.length / 2;
        this.hitHalfHeight = this.bodyHeight / 2;
        this.sprite = scene.add.rectangle(0, 0, this.length, this.bodyHeight, 0, 0).setVisible(false);
        scene.physics.add.existing(this.sprite);
        this.sprite.body.setAllowGravity(false);
        this.sprite.body.setImmovable(true);
        this.sprite.body.setSize(this.length, this.bodyHeight);
        this.sprite.body.enable = false;
        this.visual = scene.textures.exists(LIFE_ASSETS.crawler.chaseRight.key)
            ? scene.add.sprite(0, 0, LIFE_ASSETS.crawler.chaseRight.key, 0)
                .setOrigin(0.5, LIFE_ASSETS.crawler.feetY / LIFE_ASSETS.crawler.frameHeight)
                .setScale(this.scale)
                .setBlendMode(BlendModes.NORMAL)
                .setDepth(6)
                .setVisible(false)
            : scene.add.rectangle(0, 0, this.length, this.bodyHeight, 0x372b3c)
                .setOrigin(0.5, 1)
                .setDepth(6)
                .setVisible(false);
        if (!scene.textures.exists(LIFE_ASSETS.crawler.chaseRight.key)) {
            console.warn('[SettlementScene] Crawler art missing; using placeholder.');
        }
        this.x = 0;
        this.facing = 1;
        this.state = 'inactive';
        this.stateElapsed = 0;
        this.attackCooldown = 0;
        this.attackFrame = -1;
        this.attackDidHit = false;
        this.health = 1;
        this.isDefeated = true;
        this.untargetable = true;
        this.inUse = false;
        this.currentAnimation = '';
        this.baseScale = this.scale;
    }

    spawn(x, facing) {
        if (this.inUse) return false;
        this.x = x;
        this.facing = facing < 0 ? -1 : 1;
        this.state = 'spawning';
        this.stateElapsed = 0;
        this.attackCooldown = 0;
        this.attackFrame = -1;
        this.attackDidHit = false;
        this.health = 1;
        this.isDefeated = false;
        this.untargetable = true;
        this.inUse = true;
        this.scale = this.baseScale;
        this.sprite.body.enable = true;
        this.positionCarrier();
        this.visual.setVisible(true).setAlpha(0).setScale(this.baseScale);
        this.setDirectionTexture('chase');
        this.visual.setFrame(0);
        this.currentAnimation = '';
        return true;
    }

    reset() {
        this.inUse = false;
        this.isDefeated = true;
        this.untargetable = true;
        this.state = 'inactive';
        this.stateElapsed = 0;
        this.sprite.body.enable = false;
        this.sprite.setVisible(false);
        this.visual.setVisible(false).setAlpha(1).setScale(this.baseScale);
        this.currentAnimation = '';
    }

    setX(x) {
        this.x = x;
        this.positionCarrier();
        this.visual.setX(x);
    }

    positionCarrier() {
        const centerY = this.scene.floorY - this.bodyHeight / 2;
        this.sprite.setPosition(this.x, centerY);
        this.sprite.body.reset(this.x, centerY);
    }

    setDirectionTexture(action) {
        if (this.visual.type !== 'Sprite') return;
        const direction = this.facing > 0 ? 'right' : 'left';
        const key = action === 'attack'
            ? LIFE_ASSETS.crawler[`attack${direction[0].toUpperCase()}${direction.slice(1)}`].key
            : LIFE_ASSETS.crawler[`chase${direction[0].toUpperCase()}${direction.slice(1)}`].key;
        if (this.visual.texture.key !== key) this.visual.setTexture(key, 0);
    }

    playChase() {
        if (this.visual.type !== 'Sprite') return;
        const direction = this.facing > 0 ? 'right' : 'left';
        const key = `life-crawler-chase-${direction}`;
        this.setDirectionTexture('chase');
        if (this.currentAnimation !== key && this.scene.anims.exists(key)) {
            this.currentAnimation = key;
            this.visual.play(key);
        }
    }

    update(seconds, player) {
        if (!this.inUse || this.isDefeated || !player || !player.sprite.active) return;
        this.stateElapsed += seconds;
        if (this.attackCooldown > 0) this.attackCooldown = Math.max(0, this.attackCooldown - seconds);
        const heroBody = player.sprite.body;
        const heroX = heroBody.center.x;
        const distance = heroX - this.x;

        if (this.state === 'spawning') {
            const progress = Math.min(1, this.stateElapsed / CRAWLER.contact.windupSeconds);
            this.visual.setAlpha(progress);
            if (progress >= 1) {
                this.state = 'chasing';
                this.stateElapsed = 0;
                this.untargetable = false;
            }
        } else if (this.state === 'hurt') {
            if (this.stateElapsed >= CRAWLER.hurtStaggerSeconds) {
                this.state = 'chasing';
                this.stateElapsed = 0;
                this.visual.clearTint();
            }
        } else if (this.state === 'dying') {
            const progress = Math.min(1, this.stateElapsed / CRAWLER.dyingSeconds);
            this.visual.setScale(this.baseScale * (1 - progress)).setAlpha(1 - progress);
            if (progress >= 1) this.reset();
        } else if (this.state === 'windup') {
            if (this.stateElapsed >= CRAWLER.contact.windupSeconds) {
                this.state = 'attacking';
                this.stateElapsed = 0;
                this.attackFrame = -1;
                this.attackDidHit = false;
                this.currentAnimation = '';
                this.playAttack();
            }
        } else if (this.state === 'attacking') {
            const frame = Math.min(
                LIFE_ASSETS.crawler.frames - 1,
                Math.floor(this.stateElapsed * LIFE_ASSETS.crawler.attackFps)
            );
            if (frame !== this.attackFrame) {
                this.attackFrame = frame;
                if (this.visual.type === 'Sprite') this.visual.setFrame(frame);
                if (!this.attackDidHit && LIFE_ASSETS.crawler.attackHitFrames.includes(frame)) {
                    if (Math.abs(heroX - this.x) <= CRAWLER.contact.range * HERO_STAND_PX) {
                        this.attackDidHit = true;
                        player.takeDamage(
                            Math.round(player.maxHealth * CRAWLER.contact.damageFracOfMaxHealth),
                            this.x,
                            CRAWLER.contact.knockbackH * HERO_STAND_PX
                        );
                    }
                }
            }
            if (this.stateElapsed >= LIFE_ASSETS.crawler.frames / LIFE_ASSETS.crawler.attackFps) {
                this.state = 'chasing';
                this.stateElapsed = 0;
                this.currentAnimation = '';
            }
        } else if (this.state === 'chasing') {
            this.facing = distance >= 0 ? 1 : -1;
            if (Math.abs(distance) <= CRAWLER.contact.range * HERO_STAND_PX && this.attackCooldown <= 0) {
                this.state = 'windup';
                this.stateElapsed = 0;
                this.attackCooldown = CRAWLER.contact.cooldownSeconds;
                this.playAttack();
            } else {
                let speed = CRAWLER.speedMult * HERO_PHYSICS.moveSpeed;
                const fireDistance = Math.abs(this.x - this.scene.fireX);
                const lightRadius = HERO_STAND_PX * (
                    SETTLEMENT.darkness.fireLightMinRadiusH +
                    (SETTLEMENT.darkness.fireLightMaxRadiusH - SETTLEMENT.darkness.fireLightMinRadiusH) * this.scene.fireLevel
                );
                if (fireDistance <= lightRadius) speed *= CRAWLER.lightSlow.insideFireLight;
                this.setX(this.x + this.facing * speed * seconds);
                this.playChase();
            }
        }
        this.positionCarrier();
        this.visual.setPosition(this.x, this.scene.floorY);
    }

    playAttack() {
        if (this.visual.type !== 'Sprite') return;
        const direction = this.facing > 0 ? 'right' : 'left';
        const key = `life-crawler-attack-${direction}`;
        this.setDirectionTexture('attack');
        this.visual.setFrame(0);
        if (this.scene.anims.exists(key)) this.visual.play(key);
        this.currentAnimation = key;
    }

    applyDamage(amount, fromX) {
        if (!this.inUse || this.isDefeated || this.untargetable) return;
        const move = moveForDamage(amount);
        this.health = Math.max(0, this.health - 1 / CRAWLER.hitsToKill[move]);
        if (this.health <= 0) {
            this.isDefeated = true;
            this.untargetable = true;
            this.state = 'dying';
            this.stateElapsed = 0;
            this.scene.emitCrawlerPuff(this.x, this.scene.floorY - this.bodyHeight / 2);
            this.scene.onCrawlerKilled(this);
            return;
        }
        this.state = 'hurt';
        this.stateElapsed = 0;
        this.facing = this.x >= fromX ? 1 : -1;
        this.visual.setTint(0xffffff);
        this.currentAnimation = '';
    }
}
