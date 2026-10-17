import { Input, TintModes } from 'phaser';
import { frameAt, HERO_FEEDBACK, HERO_KEYS, HERO_MOVES, HERO_PHYSICS, HERO_PUNCH, SHADOW, showFrame } from '../config/animationData';

export default class Player {
    constructor(scene, x, y) {
        this.scene = scene;
        this.sprite = scene.add.sprite(x, y, 'hero-walk', 0);
        this.sprite.setScale(0.72);
        this.sprite.setOrigin(0.5, 0.7);
        this.sprite.setVisible(false);

        scene.physics.add.existing(this.sprite);
        const body = this.sprite.body;
        body.setAllowGravity(true);
        body.setCollideWorldBounds(false);
        body.setSize(HERO_PHYSICS.bodyWidth, HERO_PHYSICS.bodyHeight);
        body.setOffset(HERO_PHYSICS.bodyOffsetX, HERO_PHYSICS.bodyOffsetY);
        body.setMaxVelocity(HERO_PHYSICS.maxVelocityX, HERO_PHYSICS.maxVelocityY);
        body.setDragX(HERO_PHYSICS.dragX);
        body.setBounce(0);

        this.visual = scene.add.sprite(x, y, 'hero-walk', 0).setDepth(5);
        this.shadowAura = scene.add.ellipse(x, y, 66, 24, 0x7d36c8, 0.32)
            .setDepth(4)
            .setVisible(false);

        this.facing = 1;
        this.moveSpeed = HERO_PHYSICS.moveSpeed;
        this.jumpVelocity = HERO_PHYSICS.jumpVelocity;
        this.maxHealth = HERO_PHYSICS.maxHealth;
        this.health = this.maxHealth;
        this.invulnerableTimer = 0;
        this.flashTimer = 0;
        this.isGameOver = false;
        this.controlsLocked = false;
        this.forcedWalkDirection = 0;
        this.forcedWalkSpeed = 0;
        this.attack = null;
        this.attackEndLag = 0;
        this.bufferedMove = null;
        this.bufferTimer = 0;
        this.currentClip = null;
        this.clipElapsed = 0;
        this.shadowTimer = 0;
        this.shadowMeter = 0;
        this.shadowBreakThreshold = SHADOW.breakThreshold;
        this.hitBoxX = 0;
        this.hitBoxY = 0;
        this.hitBoxDir = 0;
        this.hitBoxActive = false;
        this.isGrounded = false;

        this.keys = scene.input.keyboard.addKeys({
            left: 'A',
            right: 'D',
            jump: 'SPACE',
            up: 'UP',
            punchLeft: HERO_KEYS.punchLeft,
            punchRight: HERO_KEYS.punchRight,
            combo: HERO_KEYS.combo,
            portalEnter: HERO_KEYS.portalEnter,
        });
        this.cursors = scene.input.keyboard.createCursorKeys();

        this.hitSparks = Array.from({ length: 8 }, () => {
            const spark = scene.add.circle(0, 0, 8, 0xffffff, 0)
                .setStrokeStyle(2, 0xffffff, 1)
                .setDepth(52)
                .setVisible(false);
            spark.life = 0;
            return spark;
        });
        this.curseBreakRing = scene.add.circle(0, 0, 24, 0xffffff, 0)
            .setStrokeStyle(3, 0xffffff, 1)
            .setDepth(52)
            .setVisible(false);
        this.curseBreakRing.life = 0;

        scene.events.once('shutdown', () => {
            if (!this.visual || !this.visual.active) {
                return;
            }
            this.destroy();
        });
    }

    get isShadowed() {
        return this.shadowTimer > 0;
    }

    update(delta = this.scene.game.loop.delta) {
        if (!this.sprite || !this.sprite.active || !this.visual || !this.visual.active) {
            return;
        }

        const step = delta / 1000;
        const body = this.sprite.body;
        const left = this.keys.left.isDown || this.cursors.left.isDown;
        const right = this.keys.right.isDown || this.cursors.right.isDown;
        const jumpPressed = Input.Keyboard.JustDown(this.keys.jump) || Input.Keyboard.JustDown(this.cursors.up);
        const leftPressed = Input.Keyboard.JustDown(this.keys.punchLeft);
        const rightPressed = Input.Keyboard.JustDown(this.keys.punchRight);
        const comboPressed = Input.Keyboard.JustDown(this.keys.combo);

        this.invulnerableTimer = Math.max(0, this.invulnerableTimer - step);
        this.flashTimer = Math.max(0, this.flashTimer - step);
        this.attackEndLag = Math.max(0, this.attackEndLag - step);
        if (this.bufferTimer > 0) {
            this.bufferTimer = Math.max(0, this.bufferTimer - step);
            if (this.bufferTimer === 0) {
                this.bufferedMove = null;
            }
        }
        if (this.shadowTimer > 0) {
            this.shadowTimer = Math.max(0, this.shadowTimer - step);
            this.shadowMeter = Math.max(0, this.shadowMeter - SHADOW.breakDecayPerSec * step);
            if (this.shadowTimer === 0) {
                this.shadowMeter = 0;
            }
        }

        if (leftPressed || rightPressed || comboPressed) {
            if (this.isShadowed) {
                const pressCount = Number(leftPressed) + Number(rightPressed) + Number(comboPressed);
                this.shadowMeter = Math.min(
                    SHADOW.breakThreshold,
                    this.shadowMeter + SHADOW.breakPerPress * pressCount,
                );
                if (this.shadowMeter >= SHADOW.breakThreshold) {
                    this.breakShadowCurse();
                }
            }
            if (!this.controlsLocked && !this.isGameOver) {
                const moveName = comboPressed ? 'combo' : rightPressed ? 'punchRight' : 'punchLeft';
                this.bufferedMove = moveName;
                this.bufferTimer = 0.25;
            }
        }

        if (this.controlsLocked || this.isGameOver) {
            body.setVelocityX(this.controlsLocked ? this.forcedWalkDirection * this.forcedWalkSpeed : 0);
            body.setVelocityY(0);
            this.hitBoxActive = false;
            this.updateEffects(step);
            this.poseVisual(step);
            return;
        }

        this.updateAttack(step);
        const activeDir = this.attack ? this.attack.move.steps[this.attack.stepIndex] : 0;
        const axis = left === right ? 0 : left ? -1 : 1;
        const speed = this.moveSpeed * (this.attack ? 0.4 : 1) * (this.isShadowed ? SHADOW.speedMult : 1);
        body.setVelocityX(axis * speed);
        if (activeDir) {
            this.facing = activeDir;
        } else if (axis !== 0) {
            this.facing = axis;
        }

        if (jumpPressed && (body.blocked.down || body.touching.down)) {
            body.setVelocityY(this.jumpVelocity);
            this.isGrounded = false;
        }
        this.isGrounded = Boolean(body.blocked.down || body.touching.down);
        this.updateEffects(step);
        this.poseVisual(step);
    }

    startAttack(moveName) {
        const move = HERO_MOVES[moveName];
        if (!move || this.controlsLocked || this.isGameOver) {
            return false;
        }
        this.attack = { moveName, move, stepIndex: 0, t: 0, hitSet: new Set() };
        this.facing = move.steps[0];
        this.currentClip = 'hero-punch';
        this.clipElapsed = 0;
        this.hitBoxActive = false;
        return true;
    }

    updateAttack(delta) {
        if (!this.attack) {
            if (this.bufferedMove && this.bufferTimer > 0 && this.attackEndLag === 0) {
                const moveName = this.bufferedMove;
                this.bufferedMove = null;
                this.bufferTimer = 0;
                this.startAttack(moveName);
            }
            return;
        }

        this.attack.t += delta;
        const frame = frameAt('hero-punch', this.attack.t, { loop: false });
        this.hitBoxActive = frame >= HERO_PUNCH.activeStart && frame <= HERO_PUNCH.activeEnd;
        if (this.hitBoxActive) {
            this.applyPunchHits(this.attack, this.attack.move.steps[this.attack.stepIndex]);
        }

        const isLastStep = this.attack.stepIndex === this.attack.move.steps.length - 1;
        if (isLastStep && frame >= HERO_PUNCH.cancelFrom && this.bufferedMove && this.bufferTimer > 0) {
            const moveName = this.bufferedMove;
            this.bufferedMove = null;
            this.bufferTimer = 0;
            this.startAttack(moveName);
            return;
        }

        if (this.attack.t >= HERO_PUNCH.frames / HERO_PUNCH.fps) {
            if (!isLastStep) {
                this.attack.stepIndex += 1;
                this.attack.t = 0;
                this.attack.hitSet.clear();
                this.facing = this.attack.move.steps[this.attack.stepIndex];
            } else {
                this.attackEndLag = this.attack.move.endLag ?? 0;
                this.attack = null;
                this.hitBoxActive = false;
            }
        }
    }

    applyPunchHits(attack, dir) {
        if (!attack || !this.sprite || !this.sprite.active) {
            return;
        }
        const enemies = this.scene.enemies || [];
        const heroX = this.sprite.body.center.x;
        const heroY = this.sprite.body.center.y;
        this.hitBoxX = heroX + dir * (HERO_PUNCH.reach * 0.5);
        this.hitBoxY = heroY;
        this.hitBoxDir = dir;

        enemies.forEach((enemy) => {
            if (!enemy || enemy.isDefeated || enemy.untargetable || !enemy.sprite || !enemy.sprite.active || attack.hitSet.has(enemy)) {
                return;
            }
            const dx = enemy.sprite.x - this.sprite.x;
            const enemyY = enemy.sprite.body ? enemy.sprite.body.center.y : enemy.sprite.y;
            const reachesNearEdge = dx * dir > -10 && dx * dir - (enemy.hitHalfWidth ?? 30) <= HERO_PUNCH.reach;
            const verticalOverlap = Math.abs(enemyY - heroY) <= HERO_PUNCH.vertical + (enemy.hitHalfHeight ?? 26);
            if (reachesNearEdge && verticalOverlap) {
                attack.hitSet.add(enemy);
                const damage = Math.round(attack.move.damage * (this.isShadowed ? SHADOW.damageMult : 1));
                enemy.applyDamage(damage, this.sprite.x);
                this.spawnHitSpark(enemy.sprite.x, enemyY, this.isShadowed ? 0xc084ff : 0xffffff);
            }
        });
    }

    spawnHitSpark(x, y, color) {
        const spark = this.hitSparks.find((effect) => effect.life <= 0);
        if (!spark || !spark.active) {
            return;
        }
        spark.setPosition(x, y);
        spark.setStrokeStyle(2, color, 1);
        spark.setAlpha(1);
        spark.setVisible(true);
        spark.life = 0.18;
    }

    spawnCurseBreakRing(x, y) {
        if (!this.curseBreakRing || !this.curseBreakRing.active) {
            return;
        }
        this.curseBreakRing.setPosition(x, y);
        this.curseBreakRing.setStrokeStyle(3, 0xffffff, 1);
        this.curseBreakRing.setAlpha(1);
        this.curseBreakRing.setVisible(true);
        this.curseBreakRing.life = 0.4;
    }

    updateEffects(delta) {
        this.hitSparks.forEach((spark) => {
            if (!spark || !spark.active || spark.life <= 0) {
                return;
            }
            spark.life = Math.max(0, spark.life - delta);
            spark.setAlpha(spark.life / 0.18);
            if (spark.life === 0) {
                spark.setVisible(false);
            }
        });
        if (this.curseBreakRing && this.curseBreakRing.active && this.curseBreakRing.life > 0) {
            this.curseBreakRing.life = Math.max(0, this.curseBreakRing.life - delta);
            this.curseBreakRing.setAlpha(this.curseBreakRing.life / 0.4);
            if (this.curseBreakRing.life === 0) {
                this.curseBreakRing.setVisible(false);
            }
        }
    }

    applyShadowCurse(seconds = SHADOW.duration) {
        if (this.isShadowed) {
            return;
        }
        this.shadowTimer = seconds;
        this.shadowMeter = 0;
        this.shadowAura.setVisible(true);
    }

    breakShadowCurse() {
        if (!this.isShadowed) {
            return;
        }
        this.shadowTimer = 0;
        this.shadowMeter = 0;
        this.shadowAura.setVisible(false);
        this.spawnCurseBreakRing(this.sprite.body.center.x, this.sprite.body.bottom);
    }

    poseVisual(delta) {
        if (!this.visual || !this.visual.active || !this.sprite || !this.sprite.active) {
            return;
        }
        const body = this.sprite.body;
        let key = 'hero-walk';
        let frame = 0;
        let facing = this.facing;

        if (this.attack) {
            key = 'hero-punch';
            facing = this.attack.move.steps[this.attack.stepIndex];
            frame = frameAt(key, this.attack.t, { loop: false });
        } else if (this.forcedWalkDirection !== 0 && Math.abs(body.velocity.x) > 8) {
            key = 'hero-run';
            facing = this.forcedWalkDirection;
            this.advanceClip(key, delta);
            frame = frameAt(key, this.clipElapsed);
        } else if (!this.controlsLocked && !this.isGameOver && !(body.blocked.down || body.touching.down)) {
            key = 'hero-jump';
            this.advanceClip(key, delta);
            frame = frameAt(key, this.clipElapsed);
        } else if (!this.controlsLocked && !this.isGameOver && Math.abs(body.velocity.x) > 8) {
            key = 'hero-run';
            this.advanceClip(key, delta);
            frame = frameAt(key, this.clipElapsed);
        } else {
            this.currentClip = 'hero-walk';
            this.clipElapsed = 0;
        }

        showFrame(this.visual, key, frame, facing);
        this.visual.setPosition(body.center.x, body.bottom);
        this.shadowAura.setPosition(body.center.x, body.bottom + 3);
        this.shadowAura.setVisible(this.isShadowed);
        if (this.flashTimer > 0) {
            this.visual.setTint(0xff5b68).setTintMode(TintModes.FILL);
        } else if (this.isShadowed) {
            this.visual.setTint(0x9b63df).setTintMode(TintModes.FILL);
        } else {
            this.visual.clearTint();
        }
        if (this.invulnerableTimer > 0) {
            this.visual.setAlpha(0.5 + 0.35 * ((Math.sin(this.invulnerableTimer * 42) + 1) / 2));
        } else {
            this.visual.setAlpha(1);
        }
    }

    advanceClip(key, delta) {
        if (this.currentClip !== key) {
            this.currentClip = key;
            this.clipElapsed = 0;
        } else {
            this.clipElapsed += delta;
        }
    }

    takeDamage(amount, fromX = null, knockback = 0) {
        if (this.isGameOver || this.invulnerableTimer > 0) {
            return;
        }
        this.health = Math.max(0, this.health - amount);
        this.invulnerableTimer = 1.0;
        this.invulnerableTimer = HERO_FEEDBACK.invulnerability;
        this.flashTimer = HERO_FEEDBACK.hitFlash;
                    this.sprite.body.setVelocityY(-HERO_FEEDBACK.knockbackUp);
        if (this.health <= 0) {
            this.isGameOver = true;
            this.scene.triggerGameOver();
        } else if (knockback > 0) {
            const away = fromX === null ? -this.facing : this.sprite.body.center.x < fromX ? -1 : 1;
            this.sprite.body.setVelocityX(away * knockback);
            this.sprite.body.setVelocityY(-220);
        }
    }

    heal(amount) {
        if (!this.sprite || !this.sprite.active || this.isGameOver) {
            return;
        }
        this.health = Math.min(this.maxHealth, this.health + amount);
    }

    destroy() {
        [this.sprite, this.visual, this.shadowAura, this.curseBreakRing, ...this.hitSparks].forEach((object) => {
            if (object && object.active) {
                object.destroy();
            }
        });
    }
}
