export default class Enemy {
    constructor(scene, x, y) {
        this.scene = scene;
        this.maxHealth = 60;
        this.health = this.maxHealth;
        this.contactDamage = 18;
        this.contactCooldown = 0;
        this.isDefeated = false;

        this.sprite = scene.add.rectangle(x, y, 44, 56, 0xd47467);
        this.sprite.setStrokeStyle(3, 0x2a1a17);

        scene.physics.add.existing(this.sprite);
        const body = this.sprite.body;
        body.setAllowGravity(false);
        body.setImmovable(true);
        body.setCollideWorldBounds(false);
        body.setBounce(0);

        this.healthLabel = scene.add.text(x, y - 42, `Enemy ${this.health}/${this.maxHealth}`, {
            fontFamily: 'Arial',
            fontSize: '15px',
            color: '#fdd0bf',
            stroke: '#000000',
            strokeThickness: 4,
        }).setOrigin(0.5);
    }

    update(player) {
        if (!this.sprite || !this.sprite.active) {
            return;
        }

        if (this.isDefeated || !player || !player.sprite || !this.healthLabel || !this.healthLabel.active) {
            return;
        }

        const dx = Math.abs(player.sprite.x - this.sprite.x);
        const dy = Math.abs(player.sprite.y - this.sprite.y);

        if (this.contactCooldown > 0) {
            this.contactCooldown = Math.max(0, this.contactCooldown - this.scene.game.loop.delta / 1000);
        }

        if (dx < 38 && dy < 58 && this.contactCooldown <= 0) {
            player.takeDamage(this.contactDamage);
            this.contactCooldown = 0.75;
        }

        this.healthLabel.setPosition(this.sprite.x, this.sprite.y - 42);
        this.healthLabel.setText(`Enemy ${this.health}/${this.maxHealth}`);
    }

    applyDamage(amount, fromX) {
        if (!this.sprite || !this.sprite.active) {
            return;
        }

        if (this.isDefeated) {
            return;
        }

        this.health = Math.max(0, this.health - amount);
        this.sprite.setFillStyle(0xffffff);
        this.scene.time.delayedCall(90, () => {
            if (!this.isDefeated && this.sprite && this.sprite.active) {
                this.sprite.setFillStyle(0xd47467);
            }
        });

        this.scene.tweens.add({
            targets: this.sprite,
            x: this.sprite.x + (fromX <= this.sprite.x ? 24 : -24),
            duration: 120,
        });

        if (this.health <= 0) {
            this.defeat();
        }
    }

    defeat() {
        if (!this.sprite || !this.sprite.active) {
            return;
        }

        if (this.isDefeated) {
            return;
        }

        this.isDefeated = true;
        if (this.sprite.body) {
            this.sprite.body.enable = false;
        }

        this.scene.tweens.add({
            targets: this.sprite,
            alpha: 0,
            scaleY: 0.2,
            duration: 250,
            onComplete: () => {
                if (this.sprite && this.sprite.active) {
                    this.sprite.destroy();
                }
                if (this.healthLabel && this.healthLabel.active) {
                    this.healthLabel.destroy();
                }
            },
        });
    }
}
