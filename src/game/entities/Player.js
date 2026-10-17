import { BlendModes, Input, TintModes } from 'phaser';
import { frameAt, HERO_FEEDBACK, HERO_KEYS, HERO_MOVES, HERO_PHYSICS, HERO_PUNCH, HERO_STAND_PX, NEW_HERO_MOVES, NEW_HERO_SHEETS, SHADOW, SHEETS, showFrame } from '../config/animationData';

export default class Player {
    constructor(scene, x, y) {
        this.scene = scene;
        this.sprite = scene.add.sprite(x, y, 'hero-walk', 0);
        this.sprite.setScale(HERO_STAND_PX / 118);
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
        this.shadowAura = scene.add.ellipse(x, y, 132, 48, 0x7d36c8, 0.32)
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
        this.hitBoxWidth = 0;
        this.hitBoxHeight = 0;
        this.hitBoxActive = false;
        this.isGrounded = false;
        this.fireCooldown = 0;

        this.keys = scene.input.keyboard.addKeys({
            left: 'A',
            right: 'D',
            jump: 'SPACE',
            up: 'UP',
            punch: HERO_KEYS.punch,
            combo: HERO_KEYS.combo,
            kick: HERO_KEYS.kick,
            sword: HERO_KEYS.sword,
            fire: HERO_KEYS.fire,
            portalEnter: HERO_KEYS.portalEnter,
        });
        this.cursors = scene.input.keyboard.createCursorKeys();

        this.hitSparks = Array.from({ length: 8 }, () => {
            const spark = scene.add.circle(0, 0, 16, 0xffffff, 0)
                .setStrokeStyle(4, 0xffffff, 1)
                .setDepth(52)
                .setVisible(false);
            spark.life = 0;
            return spark;
        });
        this.curseBreakRing = scene.add.circle(0, 0, 48, 0xffffff, 0)
            .setStrokeStyle(6, 0xffffff, 1)
            .setDepth(52)
            .setVisible(false);
        this.curseBreakRing.life = 0;
        this.fireballs = Array.from({ length: 3 }, () => ({
            graphic: scene.add.graphics().setDepth(6).setBlendMode(BlendModes.ADD).setVisible(false),
            active: false,
            x: 0,
            y: 0,
            dir: 1,
            speed: 0,
            range: 0,
            travelled: 0,
            radius: 0,
            damage: 0,
            knockback: 0,
            stun: 0,
            pierce: true,
            visibleDelay: 0,
            hitSet: new Set(),
        }));

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
        const punchPressed = Input.Keyboard.JustDown(this.keys.punch);
        const comboPressed = Input.Keyboard.JustDown(this.keys.combo);
        const kickPressed = Input.Keyboard.JustDown(this.keys.kick);
        const swordPressed = Input.Keyboard.JustDown(this.keys.sword);
        const firePressed = Input.Keyboard.JustDown(this.keys.fire);
        const movePressCount = Number(punchPressed) + Number(comboPressed) + Number(kickPressed) + Number(swordPressed) + Number(firePressed);

        this.invulnerableTimer = Math.max(0, this.invulnerableTimer - step);
        this.flashTimer = Math.max(0, this.flashTimer - step);
        this.attackEndLag = Math.max(0, this.attackEndLag - step);
        this.fireCooldown = Math.max(0, this.fireCooldown - step);
        this.updateFireballs(step);
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

        if (movePressCount > 0) {
            const curseBreakPressCount = Number(punchPressed) + Number(comboPressed);
            if (this.isShadowed && curseBreakPressCount > 0) {
                this.shadowMeter = Math.min(
                    SHADOW.breakThreshold,
                    this.shadowMeter + SHADOW.breakPerPress * curseBreakPressCount,
                );
                if (this.shadowMeter >= SHADOW.breakThreshold) {
                    this.breakShadowCurse();
                }
            }
            if (!this.controlsLocked && !this.isGameOver) {
                const moveName = punchPressed ? 'punch'
                    : comboPressed ? 'combo'
                        : kickPressed ? 'kick'
                            : swordPressed ? 'sword' : 'fire';
                if (moveName !== 'fire' || this.fireCooldown === 0) {
                    this.bufferedMove = moveName;
                    this.bufferTimer = HERO_FEEDBACK.attackBuffer;
                }
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

        const axis = left === right ? 0 : left ? -1 : 1;
        if (!this.attack && axis !== 0) {
            this.facing = axis;
        }
        this.updateAttack(step);
        const speed = this.moveSpeed * (this.attack ? (this.attack.move.moveMult ?? 0.4) : 1) * (this.isShadowed ? SHADOW.speedMult : 1);
        body.setVelocityX(axis * speed);

        const jumpLocked = this.attack && ['kick', 'sword', 'fire'].includes(this.attack.moveName);
        if (jumpPressed && !jumpLocked && (body.blocked.down || body.touching.down)) {
            body.setVelocityY(this.jumpVelocity);
            this.isGrounded = false;
        }
        this.isGrounded = Boolean(body.blocked.down || body.touching.down);
        this.updateEffects(step);
        this.poseVisual(step);
    }

    startAttack(moveName) {
        const move = NEW_HERO_MOVES[moveName] || HERO_MOVES[moveName];
        if (!move || this.controlsLocked || this.isGameOver || (moveName === 'fire' && this.fireCooldown > 0)) {
            return false;
        }
        this.attack = {
            moveName,
            move,
            dir: this.facing,
            stepIndex: 0,
            t: 0,
            frame: 0,
            frameOptions: { loop: false, speed: move.speed ?? 1 },
            hitSet: new Set(),
            projectileSpawned: false,
        };
        this.currentClip = move.sheet;
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
        const attack = this.attack;
        attack.frameOptions.speed = attack.move.speed ?? 1;
        const frame = frameAt(attack.move.sheet, attack.t, attack.frameOptions);
        attack.frame = frame;
        const activeStart = attack.move.activeStart ?? HERO_PUNCH.activeStart;
        const activeEnd = attack.move.activeEnd ?? HERO_PUNCH.activeEnd;
        this.hitBoxActive = attack.moveName !== 'fire' && frame >= activeStart && frame <= activeEnd;
        if (this.hitBoxActive) {
            this.applyMoveHits(attack, this.attackDir(attack));
        }

        if (attack.moveName === 'fire' && !attack.projectileSpawned && frame >= attack.move.releaseFrame) {
            attack.projectileSpawned = true;
            this.spawnFireball(attack);
        }

        const isCombo = attack.moveName === 'combo';
        const isLastStep = !isCombo || attack.stepIndex >= 1;
        const cancelFrom = attack.move.cancelFrom ?? HERO_PUNCH.cancelFrom;
        if (isLastStep && frame >= cancelFrom && this.bufferedMove && this.bufferTimer > 0) {
            const moveName = this.bufferedMove;
            this.bufferedMove = null;
            this.bufferTimer = 0;
            if (this.startAttack(moveName)) {
                return;
            }
        }

        const sheet = SHEETS[attack.move.sheet] || NEW_HERO_SHEETS[attack.move.sheet];
        if (attack.t >= sheet.frames / sheet.fps / (attack.move.speed ?? 1)) {
            if (isCombo && !isLastStep) {
                attack.stepIndex = 1;
                attack.t = 0;
                attack.frame = 0;
                attack.hitSet.clear();
            } else {
                this.attackEndLag = attack.move.endLag ?? 0;
                this.attack = null;
                this.hitBoxActive = false;
            }
        }
    }

    attackDir(attack) {
        return attack.moveName === 'combo' && attack.stepIndex === 1 ? -attack.dir : attack.dir;
    }

    applyMoveHits(attack, dir) {
        if (!attack || !this.sprite || !this.sprite.active) {
            return;
        }
        const enemies = this.scene.enemies || [];
        const heroX = this.sprite.body.center.x;
        const heroY = this.sprite.body.center.y;
        const sheet = SHEETS[attack.move.sheet] || NEW_HERO_SHEETS[attack.move.sheet];
        const scale = attack.move.reachSrc ? HERO_STAND_PX / sheet.figureHeight : 1;
        const reach = attack.move.reachSrc ? attack.move.reachSrc * scale : HERO_PUNCH.reach;
        const vertical = attack.move.verticalSrc ? attack.move.verticalSrc * scale : HERO_PUNCH.vertical;
        const startInset = 10 * scale;
        this.hitBoxX = dir > 0 ? heroX - startInset : heroX - reach;
        this.hitBoxY = heroY;
        this.hitBoxDir = dir;
        this.hitBoxWidth = reach + startInset;
        this.hitBoxHeight = vertical * 2;

        for (let index = 0; index < enemies.length; index += 1) {
            const enemy = enemies[index];
            if (!enemy || enemy.isDefeated || enemy.untargetable || !enemy.sprite || !enemy.sprite.active || attack.hitSet.has(enemy)) {
                continue;
            }
            const enemyX = enemy.sprite.body ? enemy.sprite.body.center.x : enemy.sprite.x;
            const dx = enemyX - heroX;
            const enemyY = enemy.sprite.body ? enemy.sprite.body.center.y : enemy.sprite.y;
            const reachesNearEdge = dx * dir > -startInset && dx * dir - (enemy.hitHalfWidth ?? 30) <= reach;
            const verticalOverlap = Math.abs(enemyY - heroY) <= vertical + (enemy.hitHalfHeight ?? 26);
            if (reachesNearEdge && verticalOverlap) {
                attack.hitSet.add(enemy);
                const damage = Math.round(attack.move.damage * (this.isShadowed ? SHADOW.damageMult : 1));
                enemy.applyDamage(damage, this.sprite.x, attack.move.knockback, attack.move.stun);
                this.spawnHitSpark(enemyX, enemyY, this.isShadowed ? 0xc084ff : 0xffffff);
            }
        }
    }

    spawnFireball(attack) {
        const ball = this.fireballs.find((candidate) => !candidate.active);
        if (!ball || !ball.graphic || !ball.graphic.active) {
            return;
        }
        const config = attack.move.projectile;
        const scale = HERO_STAND_PX / NEW_HERO_SHEETS[attack.move.sheet].figureHeight;
        const body = this.sprite.body;
        ball.active = true;
        ball.dir = attack.dir;
        ball.x = body.center.x + attack.dir * config.muzzleSrc * scale;
        ball.y = body.bottom - HERO_STAND_PX * 0.42;
        ball.speed = config.speedSrc * scale;
        ball.range = config.rangeSrc * scale;
        ball.travelled = 0;
        ball.radius = config.radiusSrc * scale;
        ball.damage = config.damage;
        ball.knockback = config.knockback;
        ball.stun = config.stun;
        ball.pierce = config.pierce;
        ball.visibleDelay = Math.max(0, config.visibleFromFrame - config.spawnFrame) / (NEW_HERO_SHEETS[attack.move.sheet].fps * attack.move.speed);
        ball.hitSet.clear();
        this.fireCooldown = attack.move.cooldown;
        ball.graphic.setVisible(ball.visibleDelay === 0);
    }

    updateFireballs(delta) {
        for (let index = 0; index < this.fireballs.length; index += 1) {
            const ball = this.fireballs[index];
            if (!ball.active || !ball.graphic || !ball.graphic.active) {
                continue;
            }
            const distance = ball.speed * delta;
            ball.x += ball.dir * distance;
            ball.travelled += distance;
            ball.visibleDelay = Math.max(0, ball.visibleDelay - delta);
            ball.graphic.setVisible(ball.visibleDelay === 0);
            if (ball.visibleDelay === 0) {
                ball.graphic.clear();
                ball.graphic.lineStyle(Math.max(2, ball.radius * 0.35), 0xff6b22, 0.55);
                ball.graphic.beginPath();
                ball.graphic.moveTo(ball.x - ball.dir * ball.radius * 1.8, ball.y);
                ball.graphic.lineTo(ball.x, ball.y);
                ball.graphic.strokePath();
                ball.graphic.fillStyle(0xff9b32, 0.9);
                ball.graphic.fillCircle(ball.x, ball.y, ball.radius);
                ball.graphic.fillStyle(0xffe3a1, 0.95);
                ball.graphic.fillCircle(ball.x, ball.y, ball.radius * 0.45);
            }

            const enemies = this.scene.enemies || [];
            for (let enemyIndex = 0; enemyIndex < enemies.length; enemyIndex += 1) {
                const enemy = enemies[enemyIndex];
                if (!enemy || enemy.isDefeated || enemy.untargetable || !enemy.sprite || !enemy.sprite.active || ball.hitSet.has(enemy)) {
                    continue;
                }
                const targetX = enemy.sprite.body ? enemy.sprite.body.center.x : enemy.sprite.x;
                const targetY = enemy.sprite.body ? enemy.sprite.body.center.y : enemy.sprite.y;
                const halfWidth = enemy.hitHalfWidth ?? 0;
                const halfHeight = enemy.hitHalfHeight ?? 0;
                if (Math.abs(targetX - ball.x) > ball.radius + halfWidth || Math.abs(targetY - ball.y) > ball.radius + halfHeight) {
                    continue;
                }
                ball.hitSet.add(enemy);
                const damage = Math.round(ball.damage * (this.isShadowed ? SHADOW.damageMult : 1));
                enemy.applyDamage(damage, this.sprite.x, ball.knockback, ball.stun);
                this.spawnHitSpark(targetX, targetY, 0xff9b32);
                if (!ball.pierce) {
                    ball.travelled = ball.range;
                }
            }

            if (ball.travelled >= ball.range) {
                ball.active = false;
                ball.graphic.setVisible(false);
            }
        }
    }

    spawnHitSpark(x, y, color) {
        const spark = this.hitSparks.find((effect) => effect.life <= 0);
        if (!spark || !spark.active) {
            return;
        }
        spark.setPosition(x, y);
        spark.setStrokeStyle(4, color, 1);
        spark.setAlpha(1);
        spark.setVisible(true);
        spark.life = HERO_FEEDBACK.hitSparkLife;
    }

    spawnCurseBreakRing(x, y) {
        if (!this.curseBreakRing || !this.curseBreakRing.active) {
            return;
        }
        this.curseBreakRing.setPosition(x, y);
        this.curseBreakRing.setStrokeStyle(6, 0xffffff, 1);
        this.curseBreakRing.setAlpha(1);
        this.curseBreakRing.setVisible(true);
        this.curseBreakRing.life = 0.4;
    }

    updateEffects(delta) {
        for (let index = 0; index < this.hitSparks.length; index += 1) {
            const spark = this.hitSparks[index];
            if (!spark || !spark.active || spark.life <= 0) {
                continue;
            }
            spark.life = Math.max(0, spark.life - delta);
            spark.setAlpha(spark.life / 0.18);
            if (spark.life === 0) {
                spark.setVisible(false);
            }
        }
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
            key = this.attack.move.sheet;
            facing = this.attackDir(this.attack);
            frame = this.attack.frame;
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
        this.shadowAura.setPosition(body.center.x, body.bottom + 6);
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
        [this.sprite, this.visual, this.shadowAura, this.curseBreakRing, ...this.hitSparks, ...this.fireballs.map((ball) => ball.graphic)].forEach((object) => {
            if (object && object.active) {
                object.destroy();
            }
        });
    }
}
