import { TintModes } from 'phaser';
import {
    HERO_MOVES,
    HERO_PHYSICS,
    HERO_STAND_PX,
    KING,
    NEW_HERO_MOVES,
    SHADOW,
} from '../config/animationData';
import { TRUTH_CAVE_FX, TRUTH_MONSTER, TRUTH_PHASES } from '../config/actTruthData';

const ATTACK_KEYS = {
    swipe: 'truth-swipe',
    drain: 'truth-drain',
    slam: 'truth-slam',
};

export default class TruthMonster {
    constructor(scene, x, floorY) {
        this.scene = scene;
        this.floorY = floorY;
        this.height = TRUTH_MONSTER.heightH * HERO_STAND_PX;
        this.scale = this.height / TRUTH_MONSTER.bodyPx['truth-idle'];
        this.hitHalfWidth = HERO_STAND_PX * 0.85;
        this.hitHalfHeight = this.height * 0.5;
        this.maxHealth = KING.hp * TRUTH_MONSTER.hpMult;
        this.health = this.maxHealth;
        this.x = x;
        this.state = 'hidden';
        this.stateElapsed = 0;
        this.currentTexture = '';
        this.currentFrame = 0;
        this.facing = -1;
        this.phaseTwo = false;
        this.phaseBreakPlayed = false;
        this.isDefeated = false;
        this.untargetable = true;
        this.vulnerable = false;
        this.actionCooldown = 0;
        this.lastAction = '';
        this.comboSlamQueued = false;
        this.actionHit = false;
        this.hitFlashTimer = 0;
        this.memoryFlashTimer = 0;
        this.memoryCooldown = 0;
        this.damageWindowElapsed = 0;
        this.windowDamage = 0;
        this.heroPullElapsed = -1;
        this.heroLockTimer = 0;
        this.pullTargetX = 0;
        this.pullStartX = 0;
        this.emergeElapsed = 0;
        this.emergeDuration = TRUTH_CAVE_FX.emerge.seconds;

        this.carrier = scene.add.rectangle(x, floorY - this.hitHalfHeight,
            this.hitHalfWidth * 2, this.hitHalfHeight * 2, 0, 0).setVisible(false);
        scene.physics.add.existing(this.carrier);
        this.carrier.body.setAllowGravity(false);
        this.carrier.body.setImmovable(true);
        this.carrier.body.setSize(this.hitHalfWidth * 2, this.hitHalfHeight * 2);
        this.carrier.body.enable = false;
        this.sprite = this.carrier;

        this.visual = scene.textures.exists('truth-idle')
            ? scene.add.sprite(x, floorY, 'truth-idle', 0).setDepth(6)
            : scene.add.rectangle(x, floorY, HERO_STAND_PX * 0.9, this.height, 0x15101c)
                .setOrigin(0.5, 1).setDepth(6);
        this.shadow = scene.add.ellipse(x, floorY + 2, HERO_STAND_PX * TRUTH_MONSTER.shadow.widthH,
            20, 0x05030a, TRUTH_MONSTER.shadow.alpha).setDepth(4);
        this.attackMark = scene.add.graphics().setDepth(74).setVisible(false);
        this.tether = scene.add.graphics().setDepth(75).setVisible(false);
        this.positionCarrier();
        this.setTexture('truth-idle');
        this.setFacing(-1);
        this.visual.setVisible(false);
        this.shadow.setVisible(false);
    }

    get hatX() {
        return this.x;
    }

    get hatY() {
        return this.floorY - this.height;
    }

    positionCarrier() {
        this.carrier.setPosition(this.x, this.floorY - this.hitHalfHeight);
        this.carrier.body.reset(this.x, this.floorY - this.hitHalfHeight);
    }

    setX(x) {
        this.x = x;
        this.positionCarrier();
        this.visual.setX(x);
        this.shadow.setX(x);
    }

    setFacing(direction) {
        this.facing = direction < 0 ? -1 : 1;
        if (this.visual.type === 'Sprite') this.visual.setFlipX(this.facing > 0);
    }

    setTexture(key) {
        if (this.visual.type !== 'Sprite' || !this.scene.textures.exists(key)) return false;
        if (this.currentTexture !== key) {
            this.currentTexture = key;
            const origin = TRUTH_MONSTER.origin[key];
            this.visual.setTexture(key, 0)
                .setOrigin(origin[0], origin[1])
                .setScale(TRUTH_MONSTER.heightH * HERO_STAND_PX / TRUTH_MONSTER.bodyPx[key]);
        }
        this.visual.setFlipX(this.facing > 0);
        return true;
    }

    beginEmergence() {
        this.state = 'emerging';
        this.stateElapsed = 0;
        this.emergeElapsed = 0;
        this.untargetable = true;
        this.combatStarted = false;
        this.isDefeated = false;
        this.visual.setVisible(true).setAlpha(1);
        this.shadow.setVisible(true);
        this.setTexture('truth-idle');
        this.setFacing(this.scene.player.sprite.body.center.x < this.x ? -1 : 1);
        this.applyTint(TRUTH_CAVE_FX.emerge.silhouetteTint);
        this.scene.cameras.main.shake(TRUTH_CAVE_FX.emerge.shake.duration * 1000,
            TRUTH_CAVE_FX.emerge.shake.intensity);
    }

    startFight() {
        if (this.isDefeated) return;
        this.combatStarted = true;
        this.untargetable = false;
        this.state = 'idle';
        this.stateElapsed = 0;
        this.actionCooldown = TRUTH_MONSTER.idleBetween;
        this.vulnerable = true;
        this.carrier.body.enable = true;
        this.setTexture('truth-idle');
    }

    startAction(action) {
        if (this.isDefeated || this.state === 'phaseBreak') return;
        const heroX = this.scene.player.sprite.body.center.x;
        this.setFacing(heroX < this.x ? -1 : 1);
        this.state = action;
        this.stateElapsed = 0;
        this.actionHit = false;
        this.currentFrame = -1;
        this.vulnerable = false;
        this.lastAction = action;
        this.setTexture(ATTACK_KEYS[action]);
        this.actionCooldown = 0;
    }

    update(deltaSeconds, player) {
        if (!this.carrier || !this.carrier.active || !this.visual || !this.visual.active) return;
        const seconds = Math.max(0, deltaSeconds);
        this.hitFlashTimer = Math.max(0, this.hitFlashTimer - seconds);
        this.memoryFlashTimer = Math.max(0, this.memoryFlashTimer - seconds);
        this.memoryCooldown = Math.max(0, this.memoryCooldown - seconds);
        this.actionCooldown = Math.max(0, this.actionCooldown - seconds);
        this.damageWindowElapsed += seconds;
        if (this.damageWindowElapsed >= TRUTH_MONSTER.memoryBreak.windowSeconds) {
            this.damageWindowElapsed = 0;
            this.windowDamage = 0;
        }
        if (this.heroLockTimer > 0) {
            this.heroLockTimer = Math.max(0, this.heroLockTimer - seconds);
            if (this.heroLockTimer === 0 && player && player.sprite.active && !player.isGameOver) {
                player.controlsLocked = false;
                player.forcedWalkDirection = 0;
                player.forcedWalkSpeed = 0;
            }
        }
        if (this.heroPullElapsed >= 0) this.updatePull(seconds, player);

        if (this.state === 'hidden' || this.state === 'dead') return;
        if (this.state === 'emerging') {
            this.updateEmergence(seconds);
            this.updateVisualFeedback(seconds);
            return;
        }
        if (this.state === 'memoryBreakStun') {
            this.stateElapsed += seconds;
            this.vulnerable = true;
            if (this.stateElapsed >= TRUTH_MONSTER.memoryBreak.stunSeconds) this.finishAction();
            this.updateAnimation(seconds);
            this.updateVisualFeedback(seconds);
            return;
        }
        if (this.state === 'phaseBreak') {
            if (this.phaseBreakDone) this.finishPhaseBreak();
            this.updateVisualFeedback(seconds);
            return;
        }
        if (this.state === 'dissolving') {
            this.updateDissolve(seconds);
            return;
        }
        if (!this.combatStarted || !player || !player.sprite.active || this.isDefeated) {
            this.updateVisualFeedback(seconds);
            return;
        }

        if (this.state === 'swipe' || this.state === 'drain' || this.state === 'slam') {
            this.updateAttack(seconds, player);
        } else {
            this.updateDirector(seconds, player);
        }
        this.updateVisualFeedback(seconds);
    }

    updateEmergence(seconds) {
        this.emergeElapsed += seconds;
        const progress = Math.min(1, this.emergeElapsed / this.emergeDuration);
        const tint = this.mixTint(TRUTH_MONSTER.silhouetteTint, 0xffffff, progress);
        if (progress >= 1) this.clearTint();
        else this.applyTint(tint);
        if (this.emergeElapsed >= this.emergeDuration) {
            this.clearTint();
            this.state = 'idle';
            this.stateElapsed = 0;
            this.untargetable = true;
            this.vulnerable = false;
        }
    }

    updateDirector(seconds, player) {
        this.stateElapsed += seconds;
        if (this.state === 'walking') {
            const dx = player.sprite.body.center.x - this.x;
            const stopDistance = TRUTH_MONSTER.walk.stopWithinH * HERO_STAND_PX;
            if (Math.abs(dx) <= stopDistance) {
                this.setX(player.sprite.body.center.x - this.facing * stopDistance);
                this.state = 'idle';
                this.stateElapsed = 0;
                this.actionCooldown = TRUTH_MONSTER.idleBetween;
                this.setTexture('truth-idle');
            } else {
                const speed = TRUTH_MONSTER.walk.speedMult * HERO_PHYSICS.moveSpeed *
                    (this.phaseTwo ? TRUTH_PHASES[0].speedMult : 1);
                this.setX(this.x + this.facing * speed * seconds);
                this.updateAnimation(seconds);
            }
            return;
        }
        this.vulnerable = true;
        this.setTexture('truth-idle');
        this.updateAnimation(seconds);
        if (this.stateElapsed < TRUTH_MONSTER.idleBetween || this.actionCooldown > 0) return;
        const dx = player.sprite.body.center.x - this.x;
        const distanceH = Math.abs(dx) / HERO_STAND_PX;
        this.setFacing(dx < 0 ? -1 : 1);
        if (this.comboSlamQueued && this.phaseTwo) {
            this.comboSlamQueued = false;
            this.startAction('slam');
            return;
        }
        if (distanceH <= TRUTH_MONSTER.swipe.triggerRangeH) {
            this.comboSlamQueued = this.phaseTwo && Math.random() < TRUTH_MONSTER.combo.swipeThenSlamChance;
            this.startAction('swipe');
        } else if (this.phaseTwo && distanceH <= TRUTH_MONSTER.slam.triggerRangeH && this.lastAction !== 'slam') {
            this.startAction('slam');
        } else if (distanceH >= TRUTH_MONSTER.drain.triggerFromH &&
            distanceH <= TRUTH_MONSTER.drain.triggerToH) {
            this.startAction('drain');
        } else if (distanceH > TRUTH_MONSTER.walk.stopWithinH) {
            this.state = 'walking';
            this.stateElapsed = 0;
            this.vulnerable = false;
            this.setTexture('truth-walk');
        } else {
            this.actionCooldown = TRUTH_MONSTER.idleBetween;
        }
    }

    updateAttack(seconds, player) {
        this.stateElapsed += seconds;
        const action = this.state;
        const config = TRUTH_MONSTER[action];
        const fps = TRUTH_MONSTER.textures[ATTACK_KEYS[action]].fps;
        const speed = this.phaseTwo ? TRUTH_PHASES[0].speedMult : 1;
        const frame = Math.min(TRUTH_MONSTER.textures[ATTACK_KEYS[action]].frames - 1,
            Math.floor(this.stateElapsed * fps * speed));
        if (frame !== this.currentFrame) {
            this.currentFrame = frame;
            if (this.visual.type === 'Sprite') this.visual.setFrame(frame);
        }
        this.updateTelegraph(action, frame, player);
        if (action === 'swipe' && frame >= config.strikeFrom && frame <= config.strikeTo && !this.actionHit) {
            this.actionHit = true;
            this.trySwipe(player, config);
        } else if (action === 'slam' && frame >= config.strikeFrom && frame <= config.strikeTo && !this.actionHit) {
            this.actionHit = true;
            this.trySlam(player, config);
        } else if (action === 'drain' && frame === config.pullAtFrame && !this.actionHit) {
            this.actionHit = true;
            this.tryDrain(player, config);
        }
        const duration = TRUTH_MONSTER.textures[ATTACK_KEYS[action]].frames / fps / speed;
        if (this.stateElapsed >= duration) this.finishAction();
    }

    updateTelegraph(action, frame, player) {
        const config = TRUTH_MONSTER[action];
        if (action === 'swipe' && frame <= config.telegraphTo) {
            const start = this.x + this.facing * HERO_STAND_PX * 0.35;
            this.attackMark.clear().lineStyle(3, config.telegraph.color, config.telegraph.alpha);
            this.attackMark.lineBetween(start, this.floorY - 4,
                start + this.facing * config.reachH * HERO_STAND_PX, this.floorY - 4);
            this.attackMark.setVisible(true);
        } else if (action === 'slam' && frame <= config.telegraphTo) {
            const start = this.x + this.facing * HERO_STAND_PX * 0.3;
            this.attackMark.clear().lineStyle(5, config.telegraph.color, config.telegraph.alpha);
            this.attackMark.lineBetween(start, this.floorY - 4,
                start + this.facing * config.reachH * HERO_STAND_PX, this.floorY - 4);
            this.attackMark.setVisible(true);
        } else {
            this.attackMark.setVisible(false);
        }
        if (action === 'drain' && frame >= config.tetherFrom && frame <= config.tetherTo) {
            const hero = player.sprite.body;
            this.tether.clear().lineStyle(6, config.tetherGlow, 0.3);
            this.tether.lineBetween(this.x + this.facing * HERO_STAND_PX * 0.3,
                this.floorY - this.height * 0.58, hero.center.x, hero.center.y);
            this.tether.lineStyle(2, config.tetherColor, 0.9);
            this.tether.lineBetween(this.x + this.facing * HERO_STAND_PX * 0.3,
                this.floorY - this.height * 0.58, hero.center.x, hero.center.y);
            this.tether.setVisible(true);
        } else if (action !== 'drain') {
            this.tether.setVisible(false);
        }
    }

    trySwipe(player, config) {
        const heroX = player.sprite.body.center.x;
        const dx = (heroX - this.x) * this.facing;
        if (dx < 0 || dx > config.reachH * HERO_STAND_PX) return;
        player.takeDamage(config.damage, this.x, config.knockbackPx);
    }

    trySlam(player, config) {
        const hero = player.sprite.body;
        const dx = (hero.center.x - this.x) * this.facing;
        if (dx < 0 || dx > config.reachH * HERO_STAND_PX) return;
        const heightAboveFloor = this.scene.floorY - hero.bottom;
        if (heightAboveFloor > config.jumpDodgeH * HERO_STAND_PX) return;
        player.takeDamage(config.damage, this.x, config.knockbackPx);
    }

    tryDrain(player, config) {
        const hero = player.sprite.body;
        const dx = (hero.center.x - this.x) * this.facing;
        if (dx < config.triggerFromH * HERO_STAND_PX || dx > config.triggerToH * HERO_STAND_PX) return;
        const heightAboveFloor = this.scene.floorY - hero.bottom;
        if (heightAboveFloor > config.jumpDodgeH * HERO_STAND_PX) return;
        player.takeDamage(config.damage, this.x, 0);
        this.health = Math.min(this.maxHealth, this.health + this.maxHealth * config.healFrac);
        this.scene.updateBossHud();
        this.pullStartX = hero.center.x;
        this.pullTargetX = this.x + this.facing * config.pullToH * HERO_STAND_PX;
        this.heroPullElapsed = 0;
        this.heroLockTimer = config.pullSeconds + config.heroStun;
        player.controlsLocked = true;
        player.forcedWalkDirection = Math.sign(this.pullTargetX - this.pullStartX);
        player.forcedWalkSpeed = Math.abs(this.pullTargetX - this.pullStartX) / config.pullSeconds;
    }

    updatePull(seconds, player) {
        this.heroPullElapsed += seconds;
        if (this.heroPullElapsed < TRUTH_MONSTER.drain.pullSeconds) return;
        this.heroPullElapsed = -1;
        if (!player || !player.sprite.active || player.isGameOver) return;
        player.sprite.setX(this.pullTargetX);
        player.sprite.body.reset(this.pullTargetX, player.sprite.y);
        player.visual.setPosition(player.sprite.body.center.x, player.sprite.body.bottom);
        player.forcedWalkDirection = 0;
        player.forcedWalkSpeed = 0;
    }

    finishAction() {
        this.attackMark.setVisible(false);
        this.tether.setVisible(false);
        this.state = 'idle';
        this.stateElapsed = 0;
        this.vulnerable = true;
        this.setTexture('truth-idle');
        const config = TRUTH_MONSTER[this.lastAction];
        if (config && config.cooldown) {
            const phaseScale = this.phaseTwo ? TRUTH_PHASES[0].cooldownMult : 1;
            this.actionCooldown = Math.max(0, config.cooldown * phaseScale +
                (Math.random() * 2 - 1) * config.jitter);
        } else {
            this.actionCooldown = TRUTH_MONSTER.idleBetween;
        }
        this.stateElapsed = 0;
    }

    applyDamage(amount, fromX) {
        if (this.isDefeated || this.untargetable || this.state === 'phaseBreak' || this.state === 'dissolving') return;
        const move = this.identifyMove(amount);
        if (this.state === 'drain' && this.stateElapsed *
            TRUTH_MONSTER.textures['truth-drain'].fps < TRUTH_MONSTER.drain.pullAtFrame &&
            TRUTH_MONSTER.drain.interruptedBy.includes(move)) {
            this.finishAction();
        }
        const hitDamage = this.state === 'memoryBreakStun' || this.vulnerable ? amount : KING.chipDamage;
        this.health = Math.max(0, this.health - hitDamage);
        this.hitFlashTimer = TRUTH_MONSTER.hitFlash;
        this.windowDamage += hitDamage;
        this.scene.updateBossHud();
        if (this.health <= 0) {
            this.defeat();
            return;
        }
        if (!this.phaseBreakPlayed && this.health <= this.maxHealth * TRUTH_PHASES[0].atHpFrac) {
            this.beginPhaseBreak();
            return;
        }
        if (this.memoryCooldown <= 0 && this.windowDamage >= this.maxHealth * TRUTH_MONSTER.memoryBreak.burstFrac) {
            this.beginMemoryBreak();
        }
    }

    identifyMove(amount) {
        if (amount === NEW_HERO_MOVES.sword.damage ||
            amount === Math.round(NEW_HERO_MOVES.sword.damage * SHADOW.damageMult)) return 'sword';
        if (amount === NEW_HERO_MOVES.fire.projectile.damage ||
            amount === Math.round(NEW_HERO_MOVES.fire.projectile.damage * SHADOW.damageMult)) return 'fire';
        if (amount === NEW_HERO_MOVES.kick.damage ||
            amount === Math.round(NEW_HERO_MOVES.kick.damage * SHADOW.damageMult)) return 'kick';
        if (amount === HERO_MOVES.punch.damage || amount === HERO_MOVES.combo.damage ||
            amount === Math.round(HERO_MOVES.punch.damage * SHADOW.damageMult) ||
            amount === Math.round(HERO_MOVES.combo.damage * SHADOW.damageMult)) return 'punch';
        return 'punch';
    }

    beginMemoryBreak() {
        this.state = 'memoryBreakStun';
        this.stateElapsed = 0;
        this.vulnerable = true;
        this.memoryFlashTimer = TRUTH_MONSTER.memoryBreak.stunSeconds;
        this.memoryCooldown = TRUTH_MONSTER.memoryBreak.cooldown;
        this.windowDamage = 0;
        this.damageWindowElapsed = 0;
        this.attackMark.setVisible(false);
        this.tether.setVisible(false);
        this.setTexture('truth-idle');
    }

    beginPhaseBreak() {
        this.phaseBreakPlayed = true;
        this.phaseBreakDone = false;
        this.state = 'phaseBreak';
        this.stateElapsed = 0;
        this.vulnerable = false;
        this.untargetable = true;
        this.attackMark.setVisible(false);
        this.tether.setVisible(false);
        this.setTexture('truth-idle');
        this.setFacing(this.scene.player.sprite.body.center.x < this.x ? -1 : 1);
        this.scene.startPhaseBreak(TRUTH_PHASES[0]);
    }

    finishPhaseBreak() {
        this.phaseBreakDone = false;
        this.phaseTwo = true;
        this.untargetable = false;
        this.vulnerable = true;
        this.state = 'idle';
        this.stateElapsed = 0;
        this.actionCooldown = TRUTH_MONSTER.idleBetween;
    }

    defeat() {
        if (this.isDefeated) return;
        this.health = 0;
        this.isDefeated = true;
        this.untargetable = true;
        this.combatStarted = false;
        this.vulnerable = false;
        this.state = 'idle';
        this.stateElapsed = 0;
        this.carrier.body.enable = false;
        this.attackMark.setVisible(false);
        this.tether.setVisible(false);
        const player = this.scene.player;
        if (player && player.sprite.active && !player.isGameOver) {
            player.controlsLocked = true;
            player.forcedWalkDirection = 0;
            player.forcedWalkSpeed = 0;
            player.sprite.body.setVelocity(0, 0);
        }
    }

    beginDissolve() {
        if (!this.isDefeated) return;
        this.state = 'dissolving';
        this.stateElapsed = 0;
        this.untargetable = true;
        this.setTexture('truth-cutout');
        this.setFacing(this.scene.player.sprite.body.center.x < this.x ? -1 : 1);
        this.scene.startDissolvePuffs();
    }

    updateDissolve(seconds) {
        this.stateElapsed += seconds;
        const progress = Math.min(1, this.stateElapsed / TRUTH_CAVE_FX.dissolve.seconds);
        this.visual.setAlpha(1 - progress);
        this.scene.updateDissolvePuffs(seconds, progress);
        if (progress >= 1) {
            this.visual.setVisible(false);
            this.scene.finishDissolvePuffs();
        }
    }

    resetForPhase(phaseTwo) {
        this.health = phaseTwo ? this.maxHealth * TRUTH_PHASES[0].atHpFrac : this.maxHealth;
        this.phaseTwo = phaseTwo;
        this.phaseBreakPlayed = phaseTwo;
        this.isDefeated = false;
        this.untargetable = false;
        this.combatStarted = true;
        this.vulnerable = true;
        this.state = 'idle';
        this.stateElapsed = 0;
        this.actionCooldown = TRUTH_MONSTER.idleBetween;
        this.heroPullElapsed = -1;
        this.heroLockTimer = 0;
        this.windowDamage = 0;
        this.damageWindowElapsed = 0;
        this.comboSlamQueued = false;
        this.carrier.body.enable = true;
        this.visual.setVisible(true).setAlpha(1);
        this.clearTint();
        this.setTexture('truth-idle');
        this.setFacing(this.scene.player.sprite.body.center.x < this.x ? -1 : 1);
        this.scene.updateBossHud();
    }

    updateAnimation(seconds) {
        if (this.visual.type !== 'Sprite' || !this.currentTexture) return;
        const sheet = TRUTH_MONSTER.textures[this.currentTexture];
        if (!sheet) return;
        const speed = this.phaseTwo ? TRUTH_PHASES[0].speedMult : 1;
        const frame = Math.floor(this.stateElapsed * sheet.fps * speed) % sheet.frames;
        if (frame !== this.currentFrame) {
            this.currentFrame = frame;
            this.visual.setFrame(frame);
        }
    }

    updateVisualFeedback(seconds) {
        if (this.hitFlashTimer > 0) {
            const color = this.hitFlashTimer / TRUTH_MONSTER.hitFlash > 0.5 ? 0xffffff : 0xff9f8b;
            this.applyTint(color);
        } else if (this.memoryFlashTimer > 0) {
            this.applyTint(TRUTH_MONSTER.memoryBreak.flashColor);
        } else if (this.state !== 'emerging' && this.state !== 'phaseBreak') {
            this.clearTint();
        }
        if (this.visual.type === 'Sprite' && this.visual.alpha < 1 && this.state !== 'dissolving') {
            this.visual.setAlpha(Math.min(1, this.visual.alpha + seconds * 3));
        }
    }

    applyTint(color) {
        if (this.visual.type === 'Sprite') this.visual.setTint(color).setTintMode(TintModes.FILL);
        else if (this.visual.setFillStyle) this.visual.setFillStyle(color, 1);
    }

    clearTint() {
        if (this.visual.type === 'Sprite') this.visual.clearTint();
        else if (this.visual.setFillStyle) this.visual.setFillStyle(0x15101c, 1);
    }

    mixTint(from, to, progress) {
        const r = Math.round(((from >> 16) & 0xff) + (((to >> 16) & 0xff) - ((from >> 16) & 0xff)) * progress);
        const g = Math.round(((from >> 8) & 0xff) + (((to >> 8) & 0xff) - ((from >> 8) & 0xff)) * progress);
        const b = Math.round((from & 0xff) + ((to & 0xff) - (from & 0xff)) * progress);
        return (r << 16) | (g << 8) | b;
    }
}

