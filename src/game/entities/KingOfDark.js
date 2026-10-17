import { Math as PhaserMath, TintModes } from 'phaser';
import { frameAt, KING, KING_ATTACKS, SHEETS, showFrame } from '../config/animationData';

export default class KingOfDark {
    constructor(scene, x = KING.throneX, y = KING.throneY) {
        this.scene = scene;
        this.maxHealth = KING.hp;
        this.health = this.maxHealth;
        this.hitHalfWidth = KING.hitHalfWidth;
        this.hitHalfHeight = KING.hitHalfHeight;
        this.isDefeated = false;
        this.untargetable = true;
        this.visualHidden = false;
        this.vulnerable = false;
        this.phaseTwo = false;
        this.combatStarted = false;
        this.state = 'throne';
        this.stateTimer = 0;
        this.approachTimer = 0;
        this.pendingAttack = null;
        this.currentAttackName = null;
        this.currentAttack = null;
        this.attackElapsed = 0;
        this.attackFrame = 0;
        this.attackFrameOptions = { loop: false, speed: 1 };
        this.loopFrameOptions = { speed: 1 };
        this.attackDir = 1;
        this.attackLandX = 0;
        this.attackTeleported = false;
        this.visualHidden = false;
        this.hitLanded = false;
        this.lastAttack = null;
        this.swordCooldown = 0;
        this.flashTimer = 0;
        this.eyeFlashTimer = 0;
        this.elapsed = 0;
        this.deathStage = null;
        this.deathTimer = 0;

        this.sprite = scene.add.rectangle(x, y, KING.body.width, KING.body.height, 0x000000, 0).setVisible(false);
        scene.physics.add.existing(this.sprite);
        this.sprite.body.setSize(KING.body.width, KING.body.height);
        this.sprite.body.setAllowGravity(false);
        this.sprite.body.setImmovable(true);
        this.sprite.body.setCollideWorldBounds(true);

        this.visual = scene.add.sprite(x, y + KING.body.height / 2, 'king-idle', 0).setDepth(6);
        this.aura = scene.add.ellipse(x, y, 260, 340, 0x6126a8, 0.2).setDepth(4);
        this.eyeLeft = scene.add.ellipse(x - 30, y + 40, 24, 12, 0xa76bff, 0.9).setDepth(52);
        this.eyeRight = scene.add.ellipse(x + 30, y + 40, 24, 12, 0xa76bff, 0.9).setDepth(52);
        this.attackMarker = scene.add.graphics().setDepth(52).setVisible(false);
        this.deathCircle = scene.add.circle(x, y, 1, 0x000000, 1)
            .setDepth(120)
            .setVisible(false)
            .setScale(0);
        this.deathTween = scene.tweens.add({
            targets: this.deathCircle,
            scaleX: 1400,
            scaleY: 1400,
            duration: KING.deathExpand * 1000,
            paused: true,
            persist: true,
            onComplete: () => {
                if (!this.deathCircle || !this.deathCircle.active || !this.scene || !this.scene.sys.isActive()) {
                    return;
                }
                this.scene.events.emit('boss-defeated', this);
            },
        });

        scene.events.once('shutdown', () => {
            if (!this.deathCircle || !this.deathCircle.active) {
                return;
            }
            if (this.deathTween) {
                this.deathTween.stop();
            }
            if (this.deathStage === 'freeze' && this.scene && this.scene.physics) {
                this.scene.physics.world.resume();
            }
        });
        this.poseVisual(0);
    }

    get x() {
        return this.sprite.x;
    }

    get y() {
        return this.sprite.y;
    }

    beginCombat() {
        if (!this.sprite || !this.sprite.active || this.isDefeated) {
            return;
        }
        this.combatStarted = true;
        this.sprite.body.setAllowGravity(false);
        this.sprite.body.setImmovable(true);
        this.untargetable = false;
        this.startAttack('sword');
    }

    startFight(fightX = 980) {
        if (!this.sprite || !this.sprite.active || this.isDefeated) {
            return;
        }
        const centerY = KING.floorY - KING.body.height / 2;
        this.sprite.body.reset(fightX, centerY);
        this.sprite.body.setAllowGravity(true);
        this.sprite.body.setImmovable(false);
        this.combatStarted = true;
        this.untargetable = false;
        this.state = 'idle';
        this.stateTimer = KING.idleTime;
        this.vulnerable = true;
        this.startAttack('sword');
    }

    startAttack(name) {
        const attack = KING_ATTACKS[name];
        if (!attack || !this.sprite || !this.sprite.active) {
            return;
        }
        this.currentAttackName = name;
        this.currentAttack = attack;
        this.lastAttack = name;
        this.attackElapsed = 0;
        this.attackFrame = 0;
        this.hitLanded = false;
        this.attackTeleported = false;
        this.untargetable = false;
        this.vulnerable = false;
        this.state = 'attack';
        this.sprite.body.setVelocityX(0);
        if (name === 'sword') {
            const player = this.scene.player;
            const heroX = player && player.sprite && player.sprite.active ? player.sprite.x : this.sprite.x;
            const heroFacing = player ? player.facing : 1;
            const minLandX = KING.wallLeft + KING.body.width / 2;
            const maxLandX = KING.wallRight - KING.body.width / 2;
            this.attackLandX = PhaserMath.Clamp(heroX - heroFacing * attack.landDistance, minLandX, maxLandX);
            this.attackDir = Math.sign(heroX - this.attackLandX) || 1;
            this.swordCooldown = attack.cooldown;
        } else {
            this.attackDir = this.facing;
        }
    }

    update(player, delta) {
        if (!this.sprite || !this.sprite.active) {
            return;
        }
        const seconds = delta / 1000;
        this.elapsed += seconds;
        if (this.deathStage) {
            this.updateDeath(seconds);
            return;
        }
        if (this.isDefeated) {
            return;
        }
        this.swordCooldown = Math.max(0, this.swordCooldown - seconds);
        this.flashTimer = Math.max(0, this.flashTimer - seconds);
        this.eyeFlashTimer = Math.max(0, this.eyeFlashTimer - seconds);
        if (this.eyeFlashTimer === 0) {
            this.eyeLeft.setFillStyle(0xa76bff, 0.9);
            this.eyeRight.setFillStyle(0xa76bff, 0.9);
        }

        if (player && player.sprite && player.sprite.active) {
            this.facing = player.sprite.x < this.sprite.x ? -1 : 1;
        }
        if (!this.combatStarted || !player || !player.sprite || !player.sprite.active) {
            this.vulnerable = false;
            this.poseVisual(seconds);
            return;
        }

        if (!this.phaseTwo && this.health <= KING.phase2At) {
            this.phaseTwo = true;
            this.scene.cameras.main.shake(400, 0.01);
            if (this.scene.darkness) {
                this.scene.darkness.setDarkness(1, 1.2, 500);
            }
        }

        if (this.currentAttack) {
            this.updateAttack(player, seconds);
        } else if (this.state === 'approach') {
            this.updateApproach(player, seconds);
        } else {
            this.sprite.body.setVelocityX(0);
            this.state = 'idle';
            this.vulnerable = true;
            this.stateTimer = Math.max(0, this.stateTimer - seconds);
            if (this.stateTimer === 0) {
                this.chooseNextAttack(player);
            }
        }
        this.poseVisual(seconds);
    }

    chooseNextAttack(player) {
        const distance = Math.abs(player.sprite.x - this.sprite.x);
        const candidates = [];
        if (this.swordCooldown <= 0) {
            candidates.push({ name: 'sword', weight: distance > 180 ? 3 : 2 });
        }
        if (distance <= 200) {
            candidates.push({ name: 'tendril', weight: 3 });
        }
        candidates.push({ name: 'void', weight: (distance <= 260 ? 2 : 1) * (this.phaseTwo ? 1.5 : 1) });

        let choices = candidates.filter((candidate) => candidate.name !== this.lastAttack);
        if (choices.length === 0) {
            choices = candidates;
        }
        const totalWeight = choices.reduce((sum, candidate) => sum + candidate.weight, 0);
        let roll = Math.random() * totalWeight;
        let selected = choices[0];
        for (let index = 0; index < choices.length; index += 1) {
            roll -= choices[index].weight;
            if (roll <= 0) {
                selected = choices[index];
                break;
            }
        }

        if (distance > 420 && selected.name !== 'sword') {
            this.pendingAttack = selected.name;
            this.approachTimer = 0;
            this.state = 'approach';
            this.vulnerable = false;
            return;
        }
        this.startAttack(selected.name);
    }

    updateApproach(player, seconds) {
        const dx = player.sprite.x - this.sprite.x;
        const distance = Math.abs(dx);
        this.facing = dx < 0 ? -1 : 1;
        this.approachTimer += seconds;
        const speed = distance > KING.runBeyond ? KING.runSpeed : KING.walkSpeed;
        if (distance <= KING.approachUntil || this.approachTimer >= 3) {
            this.sprite.body.setVelocityX(0);
            const pending = this.pendingAttack || 'void';
            this.pendingAttack = null;
            this.startAttack(pending);
            return;
        }
        this.sprite.body.setVelocityX(this.facing * speed * (this.phaseTwo ? KING.phase2Speed : 1));
        this.vulnerable = false;
    }

    updateAttack(player, seconds) {
        const attack = this.currentAttack;
        const speed = this.phaseTwo ? KING.phase2Speed : 1;
        const oldFrame = this.attackFrame;
        this.attackElapsed += seconds;
        this.attackFrameOptions.speed = speed;
        this.attackFrame = frameAt(attack.sheet, this.attackElapsed, this.attackFrameOptions);

        if (this.currentAttackName === 'sword') {
            if (!this.attackTeleported && oldFrame < attack.teleportFrame && this.attackFrame >= attack.teleportFrame) {
                const centerY = KING.floorY - KING.body.height / 2;
                this.sprite.body.reset(this.attackLandX, centerY);
                this.sprite.body.setAllowGravity(true);
                this.sprite.body.setImmovable(false);
                this.attackTeleported = true;
            }
            this.untargetable = this.attackFrame >= attack.untargetableFrom && this.attackFrame <= attack.untargetableTo;
            this.visualHidden = this.untargetable;
            if (this.attackFrame >= attack.activeStart && this.attackFrame <= attack.activeEnd && !this.hitLanded) {
                const dx = (player.sprite.x - this.sprite.x) * this.attackDir;
                const feetAboveFloor = KING.floorY - player.sprite.body.bottom;
                if (dx >= 0 && dx <= attack.hitRange && feetAboveFloor <= attack.airSafeHeight) {
                    this.hitLanded = true;
                    player.takeDamage(attack.damage, this.sprite.x, attack.knockback);
                }
            }
        } else {
            this.untargetable = false;
            const active = this.attackFrame >= attack.activeStart && this.attackFrame <= attack.activeEnd;
            if (active && !this.hitLanded) {
                const distance = Math.abs(player.sprite.x - this.sprite.x);
                if (distance <= attack.radius) {
                    this.hitLanded = true;
                    player.takeDamage(attack.damage, this.sprite.x, attack.knockback);
                }
            }
        }

        this.vulnerable = this.attackFrame >= attack.recoverStart;
        this.updateAttackMarker();
        if (this.attackFrame >= SHEETS[attack.sheet].frames - 1) {
            this.currentAttack = null;
            this.currentAttackName = null;
            this.untargetable = false;
            this.visualHidden = false;
            this.vulnerable = true;
            this.state = 'idle';
            this.stateTimer = this.phaseTwo ? 0.5 : KING.idleTime;
            this.attackMarker.clear();
            this.attackMarker.setVisible(false);
        }
    }

    updateAttackMarker() {
        if (!this.currentAttack || !this.attackMarker || !this.attackMarker.active) {
            return;
        }
        const attack = this.currentAttack;
        const frame = this.attackFrame;
        this.attackMarker.clear();
        if (this.currentAttackName === 'sword' && frame <= attack.markerEnd) {
            this.attackMarker.setPosition(this.attackLandX, KING.floorY - 8);
            this.attackMarker.lineStyle(6, 0xb36cff, 0.8 + (Math.sin(this.elapsed * 16) + 1) * 0.1);
            this.attackMarker.beginPath();
            this.attackMarker.arc(0, 0, 48 + (frame < 7 ? Math.sin(this.elapsed * 18) * 8 : 0), 0, Math.PI * 2);
            this.attackMarker.strokePath();
            this.attackMarker.fillStyle(0x843bce, 0.12);
            this.attackMarker.fillEllipse(0, 0, 96, 16);
            this.attackMarker.setVisible(true);
        } else if (this.currentAttackName === 'tendril' && frame <= attack.markerEnd) {
            this.attackMarker.setPosition(this.sprite.x, KING.floorY - 4);
            this.attackMarker.lineStyle(4, 0xff4040, 0.8 + (Math.sin(this.elapsed * 16) + 1) * 0.1);
            this.attackMarker.beginPath();
            this.attackMarker.arc(0, 0, attack.radius, 0, Math.PI * 2);
            this.attackMarker.strokePath();
            this.attackMarker.setVisible(true);
        } else if (this.currentAttackName === 'void' && frame <= attack.markerEnd) {
            this.attackMarker.setPosition(this.sprite.x, KING.floorY - 4);
            const radius = attack.radius * Math.min(1, frame / 14);
            this.attackMarker.lineStyle(4, 0x9e5cff, 0.8);
            this.attackMarker.beginPath();
            this.attackMarker.arc(0, 0, radius, 0, Math.PI * 2);
            this.attackMarker.strokePath();
            this.attackMarker.setVisible(true);
        } else {
            this.attackMarker.setVisible(false);
        }
    }

    poseVisual(delta) {
        if (!this.visual || !this.visual.active || !this.sprite || !this.sprite.active) {
            return;
        }
        let key = 'king-idle';
        let frame = 0;
        let elapsed = this.elapsed;
        let speed = 1;
        if (this.currentAttack) {
            key = this.currentAttack.sheet;
            frame = this.attackFrame;
            elapsed = this.attackElapsed;
            speed = this.phaseTwo ? KING.phase2Speed : 1;
        } else if (this.state === 'approach' && Math.abs(this.sprite.body.velocity.x) > 1) {
            const distance = this.scene.player ? Math.abs(this.scene.player.sprite.x - this.sprite.x) : 0;
            key = distance > KING.runBeyond ? 'king-run' : 'king-walk';
            this.loopFrameOptions.speed = this.phaseTwo ? KING.phase2Speed : 1;
            frame = frameAt(key, this.elapsed, this.loopFrameOptions);
        } else {
            frame = frameAt(key, elapsed);
        }

        if (this.currentAttack && this.currentAttack.sheet === key) {
            this.attackFrameOptions.speed = speed;
            frame = frameAt(key, elapsed, this.attackFrameOptions);
        }
        showFrame(this.visual, key, frame, this.facing);
        this.visual.setPosition(this.sprite.x, this.sprite.y + KING.body.height / 2);
        this.visual.setVisible(!this.visualHidden);
        this.aura.setPosition(this.sprite.x, this.sprite.y + 5);
        this.aura.setAlpha(0.14 + (Math.sin(this.elapsed * 4) + 1) * 0.06);
        this.eyeLeft.setPosition(this.sprite.x - 30, this.sprite.y + 40);
        this.eyeRight.setPosition(this.sprite.x + 30, this.sprite.y + 40);
        if (this.flashTimer > 0) {
            this.visual.setTint(0xffffff).setTintMode(TintModes.FILL);
        } else if (this.phaseTwo) {
            this.visual.setTint(0x7251aa);
        } else {
            this.visual.clearTint();
        }
    }

    flashEyes(duration = KING.eyeFlashDuration) {
        if (!this.eyeLeft || !this.eyeLeft.active || !this.eyeRight || !this.eyeRight.active) {
            return;
        }
        this.eyeFlashTimer = duration;
        this.eyeLeft.setFillStyle(0xf4e9ff, 1);
        this.eyeRight.setFillStyle(0xf4e9ff, 1);
    }

    applyDamage(amount, fromX) {
        if (!this.sprite || !this.sprite.active || this.isDefeated || this.untargetable) {
            return;
        }
        const damage = this.vulnerable ? amount : KING.chipDamage;
        this.health = Math.max(0, this.health - damage);
        this.flashTimer = KING.hitFlashDuration;
        if (this.health <= 0) {
            this.defeat();
        }
    }

    defeat() {
        if (!this.sprite || !this.sprite.active || this.isDefeated) {
            return;
        }
        this.isDefeated = true;
        this.combatStarted = false;
        this.untargetable = true;
        this.sprite.body.enable = false;
        this.scene.physics.world.pause();
        if (this.scene.player && this.scene.player.sprite && this.scene.player.sprite.active) {
            this.scene.player.controlsLocked = true;
            this.scene.player.sprite.body.setVelocity(0, 0);
        }
        this.deathStage = 'freeze';
        this.deathTimer = KING.deathFreeze;
    }

    updateDeath(seconds) {
        if (this.deathStage !== 'freeze') {
            return;
        }
        this.deathTimer = Math.max(0, this.deathTimer - seconds);
        if (this.deathTimer > 0) {
            return;
        }
        this.scene.physics.world.resume();
        this.scene.cameras.main.flash(350, 255, 255, 255);
        this.scene.cameras.main.shake(350, 0.012);
        this.deathCircle.setPosition(this.sprite.x, this.sprite.y + KING.body.height / 2);
        this.deathCircle.setScale(0);
        this.deathCircle.setVisible(true);
        this.deathStage = 'expand';
        this.deathTween.restart();
    }
}
