import { Input } from 'phaser';

export default class Player {
    constructor(scene, x, y) {
        this.scene = scene;
        this.ensureHeroAnimations();

        this.sprite = scene.add.sprite(x, y, 'hero-walk');
        this.sprite.setScale(0.72);
        this.sprite.setOrigin(0.5, 0.7);
        this.sprite.setDepth(5);

        scene.physics.add.existing(this.sprite);

        const body = this.sprite.body;
        body.setAllowGravity(true);
        body.setCollideWorldBounds(false);
        body.setSize(34, 52);
        body.setOffset(60, 88);
        body.setMaxVelocity(320, 950);
        body.setDragX(1200);
        body.setBounce(0);

        this.facing = 1;
        this.moveSpeed = 260;
        this.jumpVelocity = -600;
        this.maxHealth = 100;
        this.health = this.maxHealth;
        this.attackCooldown = 0;
        this.invulnerableTimer = 0;
        this.attackDamage = 35;
        this.attackRange = 90;
        this.attackHitboxSize = 70;
        this.isGameOver = false;

        this.keys = scene.input.keyboard.addKeys({
            left: 'A',
            right: 'D',
            jump: 'SPACE',
            up: 'UP',
            attack: 'J',
        });
        this.cursors = scene.input.keyboard.createCursorKeys();
        this.isGrounded = false;
        this.attackFlash = null;

        this.playAnimation('hero-idle');
    }

    ensureHeroAnimations() {
        if (!this.scene.anims || this.scene.anims.exists('hero-idle')) {
            return;
        }

        this.scene.anims.create({
            key: 'hero-idle',
            frames: this.scene.anims.generateFrameNumbers('hero-walk', { start: 0, end: 0 }),
            frameRate: 1,
            repeat: 0,
        });

        this.scene.anims.create({
            key: 'hero-run',
            frames: this.scene.anims.generateFrameNumbers('hero-run', { start: 0, end: 7 }),
            frameRate: 14,
            repeat: -1,
        });

        this.scene.anims.create({
            key: 'hero-jump',
            frames: this.scene.anims.generateFrameNumbers('hero-jump', { start: 0, end: 7 }),
            frameRate: 8,
            repeat: -1,
        });
    }

    playAnimation(animationKey) {
        if (!this.sprite || !this.sprite.anims) {
            return;
        }

        const current = this.sprite.anims.currentAnim;
        if (!current || current.key !== animationKey) {
            this.sprite.anims.play(animationKey, true);
        }
    }

    update() {
        const body = this.sprite.body;

        if (!body || this.isGameOver) {
            return;
        }

        const left = this.keys.left.isDown || this.cursors.left.isDown;
        const right = this.keys.right.isDown || this.cursors.right.isDown;
        const jumpPressed = Input.Keyboard.JustDown(this.keys.jump) || Input.Keyboard.JustDown(this.cursors.up);
        const attackPressed = Input.Keyboard.JustDown(this.keys.attack);

        this.attackCooldown = Math.max(0, this.attackCooldown - this.scene.game.loop.delta / 1000);
        this.invulnerableTimer = Math.max(0, this.invulnerableTimer - this.scene.game.loop.delta / 1000);

        body.setAccelerationX(0);

        if (left) {
            body.setVelocityX(-this.moveSpeed);
            this.facing = -1;
        } else if (right) {
            body.setVelocityX(this.moveSpeed);
            this.facing = 1;
        } else {
            body.setVelocityX(0);
        }

        if (body.blocked.down || body.touching.down) {
            if (Math.abs(body.velocity.x) > 8) {
                this.playAnimation('hero-run');
            } else {
                this.playAnimation('hero-idle');
            }
        } else {
            this.playAnimation('hero-jump');
        }

        if (jumpPressed && (body.blocked.down || body.touching.down)) {
            body.setVelocityY(this.jumpVelocity);
            this.isGrounded = false;
        }

        if (attackPressed) {
            this.performAttack();
        }

        this.sprite.setFlipX(this.facing > 0);
        this.isGrounded = Boolean(body.blocked.down || body.touching.down);

        if (this.invulnerableTimer > 0) {
            const blinkAlpha = 0.45 + (Math.sin(this.scene.time.now / 80) + 1) * 0.3;
            this.sprite.setAlpha(blinkAlpha);
        } else {
            this.sprite.setAlpha(1);
        }
    }

    performAttack() {
        if (this.attackCooldown > 0 || this.isGameOver) {
            return;
        }

        this.attackCooldown = 0.28;

        const attackCenterX = this.sprite.x + this.facing * (this.attackRange * 0.7);
        const attackBox = {
            x: attackCenterX,
            y: this.sprite.y,
            width: this.attackRange,
            height: this.attackHitboxSize,
        };

        const enemies = this.scene.enemies || [];
        enemies.forEach((enemy) => {
            if (!enemy || enemy.isDefeated || !enemy.sprite || !enemy.sprite.active) {
                return;
            }

            const xOverlap = Math.abs(enemy.sprite.x - attackBox.x) < attackBox.width * 0.5 + 30;
            const yOverlap = Math.abs(enemy.sprite.y - attackBox.y) < attackBox.height * 0.5 + 26;
            const facingCheck = this.facing === 1 ? enemy.sprite.x >= this.sprite.x : enemy.sprite.x <= this.sprite.x;

            if (xOverlap && yOverlap && facingCheck) {
                enemy.applyDamage(this.attackDamage, this.sprite.x);
            }
        });

        this.sprite.body.setVelocityX(this.facing * 160);
        this.scene.tweens.add({
            targets: this.sprite,
            scaleX: 0.8,
            duration: 60,
            yoyo: true,
        });

        const slash = this.scene.add.graphics({
            x: attackCenterX,
            y: this.sprite.y,
        });
        const startAngle = this.facing > 0 ? -Math.PI / 2 : Math.PI / 2;
        const endAngle = this.facing > 0 ? Math.PI / 2 : Math.PI * 1.5;
        slash.lineStyle(6, 0xfff0b3, 0.9);
        slash.beginPath();
        slash.arc(0, 0, 30, startAngle, endAngle, false);
        slash.strokePath();
        slash.setDepth(10);

        this.scene.tweens.add({
            targets: slash,
            alpha: 0,
            scaleX: 1.4,
            scaleY: 1.4,
            duration: 140,
            onComplete: () => slash.destroy(),
        });
    }

    takeDamage(amount) {
        if (this.isGameOver || this.invulnerableTimer > 0) {
            return;
        }

        this.health = Math.max(0, this.health - amount);
        this.invulnerableTimer = 1.0;
        this.sprite.setTint(0xff6b6b);
        this.scene.time.delayedCall(90, () => {
            if (this.sprite && this.sprite.active) {
                this.sprite.clearTint();
            }
        });

        if (this.health <= 0) {
            this.isGameOver = true;
            this.scene.triggerGameOver();
        } else {
            this.sprite.body.setVelocityX(-this.facing * 220);
            this.sprite.body.setVelocityY(-220);
        }
    }

    destroy() {
        if (this.sprite) {
            this.sprite.destroy();
        }
    }
}
