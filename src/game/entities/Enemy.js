const ENEMY_TYPES = {
    grunt: {
        health: 60,
        width: 44,
        height: 56,
        color: 0xd47467,
        speed: 90,
        damage: 15,
        range: 70,
        dropChance: 0.6,
    },
    brute: {
        health: 120,
        width: 62,
        height: 80,
        color: 0x8c3b3b,
        speed: 55,
        damage: 28,
        range: 90,
        dropChance: 1,
    },
};

export default class Enemy {
    constructor(scene, x, y, type = 'grunt') {
        this.scene = scene;
        this.type = ENEMY_TYPES[type] ? type : 'grunt';
        this.config = ENEMY_TYPES[this.type];
        this.maxHealth = this.config.health;
        this.health = this.maxHealth;
        this.speed = this.config.speed;
        this.damage = this.config.damage;
        this.range = this.config.range;
        this.hitHalfWidth = 30;
        this.hitHalfHeight = 26;
        this.spawnX = x;
        this.patrolDirection = 1;
        this.facing = 1;
        this.attackCooldown = 0;
        this.telegraphTimer = 0;
        this.stunTimer = 0;
        this.flashTimer = 0;
        this.isDefeated = false;

        this.sprite = scene.add.rectangle(x, y, this.config.width, this.config.height, this.config.color);
        this.sprite.setStrokeStyle(3, 0x2a1a17).setDepth(5);
        scene.physics.add.existing(this.sprite);
        this.sprite.body.setAllowGravity(true);
        this.sprite.body.setImmovable(false);
        this.sprite.body.setCollideWorldBounds(true);
        this.sprite.body.setMaxVelocity(220, 950);
        this.sprite.body.setDragX(700);
        this.sprite.body.setBounce(0);

        const barY = y - this.config.height / 2 - 17;
        this.healthBarBack = scene.add.rectangle(x, barY, 50, 6, 0x170d12).setDepth(6);
        this.healthBar = scene.add.rectangle(x - 24, barY, 46, 4, 0xe75f5f)
            .setOrigin(0, 0.5)
            .setDepth(7);
        this.eyeTop = scene.add.rectangle(x + 5, y - 8, 7, 4, 0xffcf6a).setDepth(52);
        this.eyeBottom = scene.add.rectangle(x + 5, y - 2, 7, 4, 0xffcf6a).setDepth(52);
        this.telegraph = scene.add.rectangle(x, y, this.config.width + 38, 7, 0xffe066, 0.9)
            .setDepth(52)
            .setVisible(false);

        this.healthOrb = scene.add.circle(x, y, 10, 0x73e58c, 1).setDepth(52).setVisible(false);
        scene.physics.add.existing(this.healthOrb);
        this.healthOrb.body.setAllowGravity(false);
        this.healthOrb.body.setImmovable(true);
        this.healthOrb.body.enable = false;
        this.orbTween = scene.tweens.add({
            targets: this.healthOrb,
            y: y - 12,
            duration: 450,
            yoyo: true,
            repeat: -1,
            paused: true,
        });
        this.defeatTween = scene.tweens.add({
            targets: this.sprite,
            alpha: 0,
            scaleY: 0.2,
            duration: 250,
            paused: true,
            persist: true,
            onComplete: () => {
                if (this.sprite && this.sprite.active) {
                    this.sprite.destroy();
                }
                this.destroyVisuals();
            },
        });

        this.scene.events.once('shutdown', () => {
            if (!this.scene) {
                return;
            }
            this.orbTween.stop();
            this.defeatTween.stop();
        });
    }

    update(player, delta) {
        if (!this.sprite || !this.sprite.active || this.isDefeated || !player || !player.sprite || !player.sprite.active) {
            return;
        }

        const step = delta / 1000;
        const body = this.sprite.body;
        const dx = player.sprite.x - this.sprite.x;
        const dy = Math.abs(player.sprite.y - this.sprite.y);
        const distance = Math.abs(dx);
        const canReach = distance <= this.range && dy < 90;

        this.attackCooldown = Math.max(0, this.attackCooldown - step);
        this.stunTimer = Math.max(0, this.stunTimer - step);
        this.flashTimer = Math.max(0, this.flashTimer - step);
        if (this.flashTimer === 0) {
            this.sprite.setFillStyle(this.config.color);
        }

        if (this.telegraphTimer > 0) {
            this.telegraphTimer = Math.max(0, this.telegraphTimer - step);
            body.setVelocityX(0);
            if (this.telegraphTimer === 0) {
                this.telegraph.setVisible(false);
                this.attackCooldown = 1.2;
                if (canReach) {
                    player.takeDamage(this.damage);
                }
            }
        } else if (this.stunTimer > 0) {
            body.setVelocityX(body.velocity.x * 0.92);
        } else if (distance <= 450) {
            this.facing = dx < 0 ? -1 : 1;
            if (canReach && this.attackCooldown <= 0) {
                body.setVelocityX(0);
                this.telegraphTimer = 0.4;
                this.telegraph.setVisible(true);
            } else if (!canReach) {
                body.setVelocityX(this.facing * this.speed);
            } else {
                body.setVelocityX(0);
            }
        } else {
            const leftLimit = this.spawnX - 120;
            const rightLimit = this.spawnX + 120;
            if (this.sprite.x <= leftLimit) {
                this.patrolDirection = 1;
            } else if (this.sprite.x >= rightLimit) {
                this.patrolDirection = -1;
            }
            this.facing = this.patrolDirection;
            body.setVelocityX(this.patrolDirection * this.speed * 0.55);
        }

        this.updateVisuals();
    }

    updateVisuals() {
        if (!this.sprite || !this.sprite.active) {
            return;
        }

        const x = this.sprite.x;
        const y = this.sprite.y;
        const height = this.config.height;
        const eyeX = x + this.facing * 7;
        this.healthBarBack.setPosition(x, y - height / 2 - 17);
        this.healthBar.setPosition(x - 24, y - height / 2 - 17);
        this.healthBar.setSize(46 * (this.health / this.maxHealth), 4);
        this.eyeTop.setPosition(eyeX, y - 8);
        this.eyeBottom.setPosition(eyeX, y - 2);
        this.telegraph.setPosition(x + this.facing * (this.config.width / 2 + 24), y + height / 2 - 8);
    }

    applyDamage(amount, fromX) {
        if (!this.sprite || !this.sprite.active || this.isDefeated) {
            return;
        }

        this.health = Math.max(0, this.health - amount);
        this.flashTimer = 0.09;
        this.stunTimer = 0.2;
        this.telegraphTimer = 0;
        this.telegraph.setVisible(false);
        this.sprite.setFillStyle(0xffffff);
        this.sprite.body.setVelocityX(this.sprite.x >= fromX ? 220 : -220);
        this.updateVisuals();

        if (this.health <= 0) {
            this.defeat();
        }
    }

    dropHealthOrb() {
        if (!this.healthOrb || !this.healthOrb.active) {
            return;
        }
        if (Math.random() > this.config.dropChance) {
            return;
        }

        this.healthOrb.setPosition(this.sprite.x, this.sprite.y - this.config.height / 2);
        this.healthOrb.setVisible(true);
        this.healthOrb.body.enable = true;
        this.orbTween.restart();
    }

    defeat() {
        if (!this.sprite || !this.sprite.active || this.isDefeated) {
            return;
        }

        this.isDefeated = true;
        this.sprite.body.enable = false;
        this.healthBarBack.setVisible(false);
        this.healthBar.setVisible(false);
        this.eyeTop.setVisible(false);
        this.eyeBottom.setVisible(false);
        this.telegraph.setVisible(false);
        this.dropHealthOrb();
        this.defeatTween.restart();
    }

    destroyVisuals() {
        [this.healthBarBack, this.healthBar, this.eyeTop, this.eyeBottom, this.telegraph]
            .forEach((object) => {
                if (object && object.active) {
                    object.destroy();
                }
            });
    }
}
