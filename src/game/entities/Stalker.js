import { BlendModes } from 'phaser';
import { FEAR, STALKER, STALKER_SHEETS } from '../config/actThreeData';
import { HERO_STAND_PX } from '../config/animationData';

export default class Stalker {
    constructor(scene, x, feetY) {
        this.scene = scene;
        this.x = x;
        this.feetY = feetY;
        this.scale = HERO_STAND_PX * STALKER_SHEETS.heightVsHero / STALKER_SHEETS.bodyPx;
        this.hitHalfWidth = 328 * this.scale / 2;
        this.hitHalfHeight = 150 * this.scale / 2;
        this.facing = 1;
        this.state = 'hidden';
        this.chaseElapsed = 0;
        this.nextSurge = STALKER.surge.firstAt;
        this.surgeRemaining = 0;
        this.warningRemaining = 0;
        this.staggerRemaining = 0;
        this.staggerImmunity = 0;
        this.recoilRemaining = 0;
        this.catchCooldown = 0;
        this.animationKey = null;
        this.currentSpeed = 0;

        const carrier = scene.add.rectangle(x, feetY, this.hitHalfWidth * 2, this.hitHalfHeight * 1.5, 0, 0)
            .setVisible(false);
        scene.physics.add.existing(carrier);
        carrier.body.setAllowGravity(false).setImmovable(true);
        this.sprite = carrier;
        this.visual = scene.add.sprite(x, feetY, 'stalker-right')
            .setOrigin(STALKER_SHEETS.originX, STALKER_SHEETS.originY)
            .setScale(this.scale)
            .setDepth(12)
            .setVisible(false);
        this.eyeGlow = scene.add.graphics()
            .setBlendMode(BlendModes.ADD)
            .setDepth(55)
            .setVisible(false);
        this.puffs = Array.from({ length: STALKER.flameBurst.puffs }, () => {
            const puff = scene.add.circle(0, 0, 7, 0x9e5cff, 0.8)
                .setDepth(54)
                .setVisible(false);
            puff.life = 0;
            puff.phase = 0;
            return puff;
        });
    }

    appear(x) {
        this.x = x;
        this.state = 'standing';
        this.facing = 1;
        this.chaseElapsed = 0;
        this.nextSurge = STALKER.surge.firstAt;
        this.surgeRemaining = 0;
        this.warningRemaining = 0;
        this.staggerRemaining = 0;
        this.staggerImmunity = 0;
        this.recoilRemaining = 0;
        this.catchCooldown = 0;
        this.sprite.body.reset(x, this.feetY - this.hitHalfHeight * 0.15);
        this.sprite.body.setVelocity(0, 0);
        this.visual.setPosition(x, this.feetY).setVisible(true);
        this.eyeGlow.setVisible(true);
        this.setFacing(1);
        this.pauseAtFirstFrame();
    }

    startChasing() {
        if (this.state === 'hidden') return;
        this.state = 'chasing';
        this.setFacing(1);
        this.playChase();
    }

    setFacing(direction) {
        const facing = direction < 0 ? -1 : 1;
        if (this.facing === facing && this.animationKey) return;
        this.facing = facing;
        this.animationKey = null;
        if (this.state === 'standing') {
            this.pauseAtFirstFrame();
        } else {
            this.playChase();
        }
    }

    pauseAtFirstFrame() {
        const key = `stalker-chase-${this.facing > 0 ? 'right' : 'left'}`;
        if (this.scene.anims.exists(key)) {
            this.visual.play(key);
            this.visual.anims.stop();
            this.visual.setFrame(0);
            this.animationKey = key;
        }
    }

    playChase() {
        const key = `stalker-chase-${this.facing > 0 ? 'right' : 'left'}`;
        if (!this.scene.anims.exists(key)) return;
        if (this.animationKey !== key || !this.visual.anims.isPlaying) {
            this.animationKey = key;
            this.visual.play(key);
        }
    }

    applyDamage() {
        if (this.state !== 'chasing' || this.staggerImmunity > 0) return;
        const fromFireball = this.scene.player.fireballs.some((ball) => ball.active && ball.hitSet.has(this));
        const moveName = this.scene.player.attack?.moveName || (fromFireball ? 'fire' : null);
        const duration = STALKER.stagger[moveName];
        if (!duration) return;
        this.state = 'staggered';
        this.staggerRemaining = duration;
        this.staggerImmunity = STALKER.staggerImmuneAfter;
        this.currentSpeed = 0;
        this.sprite.body.setVelocityX(0);
        this.visual.anims.pause();
        this.scene.emitStalkerPuffs(this.x, this.feetY - this.hitHalfHeight * 0.55);
    }

    recoil() {
        this.state = 'recoil';
        this.recoilRemaining = STALKER.catch.recoilSeconds;
        this.catchCooldown = STALKER.catch.recoilSeconds;
        this.currentSpeed = 0;
        this.sprite.body.setVelocityX(0);
        this.visual.anims.pause();
    }

    update(delta, heroX, isInLight) {
        if (this.state === 'hidden') return;
        const seconds = delta / 1000;
        this.staggerImmunity = Math.max(0, this.staggerImmunity - seconds);
        this.catchCooldown = Math.max(0, this.catchCooldown - seconds);
        this.updatePuffs(seconds);
        this.visual.setPosition(this.x, this.feetY);
        this.sprite.body.reset(this.x, this.feetY - this.hitHalfHeight * 0.15);
        this.eyeGlow.clear();

        if (this.state === 'standing') {
            this.drawEyes(0.7);
            return;
        }
        if (this.state === 'staggered') {
            this.staggerRemaining = Math.max(0, this.staggerRemaining - seconds);
            this.drawEyes(1);
            if (this.staggerRemaining === 0) {
                this.state = 'chasing';
                this.playChase();
            }
            return;
        }
        if (this.state === 'recoil') {
            this.recoilRemaining = Math.max(0, this.recoilRemaining - seconds);
            if (this.recoilRemaining === 0) {
                this.x = heroX - STALKER.catch.respawnGapH * HERO_STAND_PX;
                this.state = 'chasing';
                this.playChase();
            }
            this.drawEyes(0.9);
            return;
        }
        if (this.state === 'dissolving') {
            this.drawEyes(0);
            return;
        }

        this.chaseElapsed += seconds;
        this.surgeRemaining = Math.max(0, this.surgeRemaining - seconds);
        this.warningRemaining = 0;
        if (this.surgeRemaining === 0 && this.chaseElapsed >= this.nextSurge - FEAR.surgeWarning) {
            this.warningRemaining = Math.min(FEAR.surgeWarning, this.nextSurge - this.chaseElapsed);
        }
        if (this.chaseElapsed >= this.nextSurge) {
            this.surgeRemaining = STALKER.surge.seconds;
            this.nextSurge += STALKER.surge.everySeconds;
            this.scene.cameras.main.shake(100, 0.0025);
        }

        const lightSlow = isInLight(this.x) ? STALKER.lightSlow.mult : 1;
        const surge = this.surgeRemaining > 0 ? STALKER.surge.mult : 1;
        this.currentSpeed = STALKER.speedMult * this.scene.player.moveSpeed * lightSlow * surge;
        this.x += this.currentSpeed * seconds;
        this.sprite.body.setVelocityX(this.currentSpeed);
        this.setFacing(heroX >= this.x ? 1 : -1);
        this.playChase();
        this.visual.anims.timeScale = Math.min(1.6, this.currentSpeed / this.scene.player.moveSpeed);
        this.visual.setPosition(this.x, this.feetY);
        this.sprite.body.reset(this.x, this.feetY - this.hitHalfHeight * 0.15);
        this.drawEyes(this.warningRemaining > 0
            ? 0.55 + 0.45 * Math.abs(Math.sin(this.chaseElapsed * 28))
            : 0.8);
    }

    drawEyes(alpha) {
        if (!this.eyeGlow.visible || alpha <= 0) return;
        const eyeX = this.x + this.facing * this.hitHalfWidth * 0.9;
        const eyeY = this.feetY - this.hitHalfHeight * 0.45;
        this.eyeGlow.fillStyle(STALKER_SHEETS.eyeGlow.color, STALKER_SHEETS.eyeGlow.alpha * alpha);
        this.eyeGlow.fillCircle(eyeX, eyeY, STALKER_SHEETS.eyeGlow.radiusPx);
        this.eyeGlow.fillCircle(eyeX + this.facing * 9, eyeY + 3, STALKER_SHEETS.eyeGlow.radiusPx * 0.7);
    }

    updatePuffs(seconds) {
        for (const puff of this.puffs) {
            if (puff.life <= 0) continue;
            puff.life = Math.max(0, puff.life - seconds);
            puff.phase += seconds;
            puff.y -= 22 * seconds;
            puff.x += Math.sin(puff.phase * 9) * 8 * seconds;
            puff.setAlpha(puff.life / 0.48);
            if (puff.life === 0) puff.setVisible(false);
        }
    }

    emitPuffs(x, y) {
        for (let index = 0; index < this.puffs.length; index += 1) {
            const puff = this.puffs[index];
            puff.setPosition(x + (index - this.puffs.length / 2) * 10, y);
            puff.life = 0.48;
            puff.phase = index * 0.4;
            puff.setAlpha(0.8).setVisible(true);
        }
    }

    dissolve() {
        this.state = 'dissolving';
        this.visual.setVisible(false);
        this.eyeGlow.setVisible(false);
    }

    reset(x, hidden = true) {
        this.x = x;
        this.state = hidden ? 'hidden' : 'standing';
        this.chaseElapsed = 0;
        this.nextSurge = STALKER.surge.firstAt;
        this.surgeRemaining = 0;
        this.warningRemaining = 0;
        this.staggerRemaining = 0;
        this.staggerImmunity = 0;
        this.catchCooldown = 0;
        this.currentSpeed = 0;
        this.sprite.body.reset(x, this.feetY - this.hitHalfHeight * 0.15);
        this.sprite.body.setVelocity(0, 0);
        this.visual.setVisible(!hidden);
        this.eyeGlow.setVisible(!hidden);
        for (const puff of this.puffs) {
            puff.life = 0;
            puff.setVisible(false);
        }
        if (!hidden) this.pauseAtFirstFrame();
    }
}
