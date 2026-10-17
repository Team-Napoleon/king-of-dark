import { BlendModes, Math as PhaserMath } from 'phaser';
import { ENEMY_TYPES, GLOAM, GLOAM_SHEETS, HERO_PHYSICS, HERO_STAND_PX, SHADOW, TEMPLE_WAVE, frameAt, showFrame } from '../config/animationData';

export default class Enemy {
    constructor(scene, x, y, type = 'gloam') {
        this.scene = scene;
        this.type = type;
        this.config = ENEMY_TYPES[type];
        this.maxHealth = this.config.hp;
        this.health = this.maxHealth;
        this.speedMultiplier = 1;
        this.movementSpeed = this.config.speed;
        this.biteDamageAdd = 0;
        this.biteDamage = GLOAM.bite.damage;
        this.renderedHeight = type === 'gloam' ? HERO_STAND_PX * GLOAM.heightRatio : this.config.height;
        this.width = type === 'gloam' ? this.renderedHeight * GLOAM_SHEETS['gloam-run'].frameWidth / GLOAM_SHEETS['gloam-run'].figureHeight : this.config.width;
        this.height = type === 'gloam' ? this.renderedHeight : this.config.height;
        this.bodyWidth = type === 'gloam' ? this.width * GLOAM.bodyWidthRatio : this.width;
        this.bodyHeight = type === 'gloam' ? this.height * GLOAM.bodyHeightRatio : this.height;
        this.hitHalfWidth = type === 'gloam' ? this.width * GLOAM.hitHalfWidthRatio : this.config.hitHalfWidth;
        this.hitHalfHeight = type === 'gloam' ? this.height * GLOAM.hitHalfHeightRatio : this.config.hitHalfHeight;
        this.isDefeated = false;
        this.untargetable = true;
        this.inUse = false;
        this.state = 'inactive';
        this.stateTimer = 0;
        this.castTimer = 0;
        this.castTelegraphTimer = 0;
        this.meleeTimer = 0;
        this.meleeCooldown = 0;
        this.stunTimer = 0;
        this.flashTimer = 0;
        this.defeatTimer = 0;
        this.elapsed = 0;
        this.visualAlpha = 0;
        this.facing = -1;
        this.clip = 'idle';
        this.clipElapsed = 0;
        this.snatchElapsed = 0;
        this.snatchFrame = 0;
        this.previousSnatchFrame = 0;
        this.biteCooldown = 0;
        this.biteStrikeTriggered = false;
        this.biteMarkElapsed = 0;
        this.positionStallTimer = 0;
        this.spawnId = 0;
        this.snatchFrameOptions = { loop: false, speed: GLOAM.snatch.speed };
        this.gloamFrameOptions = { from: 0, to: 17, loop: true, pingpong: true, speed: 1 };
        this.patrolOrigin = x;
        this.gloamScale = this.type === 'gloam' ? HERO_STAND_PX * GLOAM.heightRatio / GLOAM_SHEETS['gloam-run'].figureHeight : 1;

        this.sprite = scene.add.rectangle(x, y, this.bodyWidth, this.bodyHeight, 0, 0).setVisible(false);
        scene.physics.add.existing(this.sprite);
        this.sprite.body.setSize(this.bodyWidth, this.bodyHeight);
        this.sprite.body.setAllowGravity(true);
        this.sprite.body.setImmovable(false);
        this.sprite.body.setCollideWorldBounds(false);
        this.sprite.body.setMaxVelocity(this.config.speed, 950);
        this.sprite.body.enable = false;

        this.aura = scene.add.graphics().setDepth(4).setBlendMode(BlendModes.ADD).setVisible(false);
        this.visual = type === 'gloam'
            ? scene.add.sprite(x, y, 'gloam-run', 0).setDepth(5).setVisible(false)
            : scene.add.graphics().setDepth(5).setVisible(false);
        this.readable = scene.add.graphics().setDepth(52).setVisible(false);
        this.biteMark = scene.add.graphics().setDepth(52).setVisible(false);
        this.castBurst = scene.add.ellipse(0, 0, 56, 56, 0x000000, 0)
            .setStrokeStyle(4, 0xc084ff, 1)
            .setDepth(52)
            .setVisible(false);
        this.castBurstTimer = 0;
        this.meleeFlash = scene.add.rectangle(0, 0, (this.config.melee?.range ?? 0) * 2, 14, 0xffe066, 0.9)
            .setDepth(52)
            .setVisible(false);
        this.healthBack = scene.add.rectangle(0, 0, this.width + 16, 6, 0x170d12, 0.95)
            .setDepth(7)
            .setVisible(false);
        this.healthBar = scene.add.rectangle(0, 0, this.width + 12, 4, 0x78e495)
            .setOrigin(0, 0.5)
            .setDepth(8)
            .setVisible(false);

        this.leftHornPoints = Array.from({ length: 7 }, () => new PhaserMath.Vector2());
        this.rightHornPoints = Array.from({ length: 7 }, () => new PhaserMath.Vector2());
        this.leftSpikePoints = Array.from({ length: 3 }, () => new PhaserMath.Vector2());
        this.rightSpikePoints = Array.from({ length: 3 }, () => new PhaserMath.Vector2());
    }

    spawnAt(x, y, hpMult = 1, speedMult = 1, biteDamageAdd = 0) {
        if (!this.sprite || !this.sprite.active || this.inUse) {
            return false;
        }
        this.sprite.body.enable = true;
        this.sprite.body.reset(x, y);
        this.sprite.body.setVelocity(0, 0);
        this.speedMultiplier = speedMult;
        this.movementSpeed = this.config.speed * speedMult;
        this.biteDamageAdd = biteDamageAdd;
        this.biteDamage = GLOAM.bite.damage + biteDamageAdd;
        this.maxHealth = this.config.hp * hpMult;
        this.health = this.maxHealth;
        this.sprite.body.setMaxVelocity(this.movementSpeed, 950);
        this.isDefeated = false;
        this.untargetable = true;
        this.inUse = true;
        this.state = 'materialize';
        this.stateTimer = TEMPLE_WAVE.spawn.materialize;
        this.castTelegraphTimer = 0;
        this.meleeTimer = 0;
        this.meleeCooldown = 0;
        this.stunTimer = 0;
        this.flashTimer = 0;
        this.defeatTimer = 0;
        this.elapsed = 0;
        this.visualAlpha = 0;
        this.castBurstTimer = 0;
        this.castBurst.setVisible(false);
        this.biteMark.clear();
        this.biteMark.setVisible(false);
        this.counted = false;
        this.castTimer = 0;
        this.clip = 'idle';
        this.clipElapsed = 0;
        this.snatchElapsed = 0;
        this.snatchFrame = 0;
        this.previousSnatchFrame = 0;
        this.biteCooldown = 0;
        this.biteStrikeTriggered = false;
        this.biteMarkElapsed = 0;
        this.positionStallTimer = 0;
        this.patrolOrigin = x;
        this.gloamScale = this.type === 'gloam' ? HERO_STAND_PX * GLOAM.heightRatio / GLOAM_SHEETS['gloam-run'].figureHeight : 1;
        [this.aura, this.visual, this.readable, this.healthBack, this.healthBar].forEach((object) => object.setVisible(true));
        this.biteMark.setVisible(false);
        this.meleeFlash.setVisible(false);
        this.redrawGraphics(null);
        return true;
    }

    jitter(amount) {
        return (Math.random() * 2 - 1) * amount;
    }

    update(player, delta) {
        if (!this.inUse || this.isDefeated || !this.sprite || !this.sprite.active || !player || !player.sprite || !player.sprite.active) {
            return;
        }
        if (this.type === 'gloam') {
            this.updateGloam(player, delta);
            return;
        }
        const seconds = delta / 1000;
        this.elapsed += seconds;
        this.flashTimer = Math.max(0, this.flashTimer - seconds);
        if (this.castBurstTimer > 0) {
            this.castBurstTimer = Math.max(0, this.castBurstTimer - seconds);
            this.castBurst.setAlpha(this.castBurstTimer / this.config.cast.burst);
            if (this.castBurstTimer === 0) {
                this.castBurst.setVisible(false);
            }
        }

        if (this.state === 'materialize') {
            this.stateTimer = Math.max(0, this.stateTimer - seconds);
            this.untargetable = true;
            const progress = 1 - this.stateTimer / TEMPLE_WAVE.spawn.materialize;
            this.visualAlpha = progress;
            if (this.stateTimer === 0) {
                this.state = 'chase';
                this.untargetable = false;
                this.visualAlpha = 1;
                if (this.config.cast) {
                    this.castTimer = this.config.cast.first + this.jitter(this.config.cast.jitter);
                }
            }
            this.redrawGraphics(player);
            return;
        }

        if (this.stunTimer > 0) {
            this.stunTimer = Math.max(0, this.stunTimer - seconds);
            this.sprite.body.setVelocityX(this.sprite.body.velocity.x * 0.92);
            this.redrawGraphics(player);
            return;
        }

        const dx = player.sprite.body.center.x - this.sprite.body.center.x;
        const dy = Math.abs(player.sprite.body.center.y - this.sprite.body.center.y);
        const distance = Math.abs(dx);
        this.facing = dx < 0 ? -1 : 1;
        this.meleeCooldown = Math.max(0, this.meleeCooldown - seconds);

        if (this.meleeTimer > 0) {
            this.meleeTimer = Math.max(0, this.meleeTimer - seconds);
            this.sprite.body.setVelocityX(0);
            this.meleeFlash.setPosition(this.sprite.x + this.facing * (this.config.melee.range / 2), this.sprite.body.bottom - 8);
            this.meleeFlash.setAlpha(0.5 + Math.sin(this.elapsed * 28) * 0.35);
            if (this.meleeTimer === 0) {
                this.meleeFlash.setVisible(false);
                if (distance <= this.config.melee.range && dy < this.hitHalfHeight + 38) {
                    player.takeDamage(this.config.melee.damage, this.sprite.x, this.config.knockback);
                }
                this.meleeCooldown = this.config.melee.cooldown;
                this.state = 'chase';
            }
            this.redrawGraphics(player);
            return;
        }

        if (this.castTelegraphTimer > 0) {
            this.castTelegraphTimer = Math.max(0, this.castTelegraphTimer - seconds);
            this.sprite.body.setVelocityX(0);
            if (this.castTelegraphTimer === 0) {
                const stillInRange = distance <= this.config.cast.range * 1.15;
                if (stillInRange && !player.isShadowed) {
                    player.applyShadowCurse(SHADOW.duration);
                    this.castBurst.setPosition(player.sprite.body.center.x, player.sprite.body.center.y);
                    this.castBurst.setAlpha(1).setVisible(true);
                    this.castBurstTimer = this.config.cast.burst;
                }
                this.castTimer = this.config.cast.interval + this.jitter(this.config.cast.jitter);
                this.state = 'chase';
            }
            this.redrawGraphics(player);
            return;
        }

        this.state = 'chase';
        if (distance <= this.config.melee.range && dy < this.hitHalfHeight + 38 && this.meleeCooldown === 0) {
            this.meleeTimer = this.config.melee.telegraph;
            this.state = 'melee-telegraph';
            this.sprite.body.setVelocityX(0);
            this.meleeFlash.setVisible(true);
            this.redrawGraphics(player);
            return;
        }

        if (distance > this.config.melee.range) {
            this.sprite.body.setVelocityX(Math.sign(dx || this.facing) * this.movementSpeed);
        } else {
            this.sprite.body.setVelocityX(0);
        }

        if (this.config.cast) {
            this.castTimer -= seconds;
            if (this.castTimer <= 0 && distance <= this.config.cast.range) {
                if (player.isShadowed) {
                    this.castTimer = 1.5;
                } else {
                    this.castTelegraphTimer = this.config.cast.telegraph;
                    this.state = 'cast-telegraph';
                    this.sprite.body.setVelocityX(0);
                }
            }
        }
        this.redrawGraphics(player);
    }

    rescueAt(x, floorSurface) {
        if (!this.inUse || this.isDefeated || !this.sprite || !this.sprite.active) {
            return false;
        }
        const body = this.sprite.body;
        const y = floorSurface - body.height / 2;
        this.sprite.setPosition(x, y);
        body.reset(x, y);
        body.setVelocity(0, 0);
        this.positionStallTimer = 0;
        this.patrolOrigin = x;
        this.forceChase();
        return true;
    }

    forceChase() {
        if (!this.inUse || this.isDefeated || !this.sprite || !this.sprite.active) {
            return;
        }
        this.state = 'chase';
        this.stateTimer = 0;
        this.stunTimer = 0;
        this.untargetable = false;
        this.visualAlpha = 1;
        this.meleeTimer = 0;
        this.castTelegraphTimer = 0;
        this.castTimer = this.config.cast ? this.config.cast.interval : 0;
        this.biteMark.clear();
        this.biteMark.setVisible(false);
        this.biteStrikeTriggered = false;
        this.snatchElapsed = 0;
        this.snatchFrame = 0;
        this.previousSnatchFrame = 0;
        this.biteCooldown = 0;
        this.clip = 'idle';
        this.clipElapsed = 0;
        this.sprite.body.setVelocityX(0);
        this.meleeFlash.setVisible(false);
        this.redrawGraphics(null);
    }

    updateGloam(player, delta) {
        const seconds = delta / 1000;
        const body = this.sprite.body;
        const heroBody = player.sprite.body;
        const dx = heroBody.center.x - body.center.x;
        const distance = Math.abs(dx);
        const aggroRange = GLOAM.aggroRangeH * HERO_STAND_PX;
        const triggerRange = GLOAM.bite.triggerRangeH * HERO_STAND_PX;
        const bite = GLOAM.bite;
        this.elapsed += seconds;
        this.flashTimer = Math.max(0, this.flashTimer - seconds);
        this.facing = dx < 0 ? -1 : 1;

        if (this.state === 'materialize') {
            this.stateTimer = Math.max(0, this.stateTimer - seconds);
            this.visualAlpha = 1 - this.stateTimer / TEMPLE_WAVE.spawn.materialize;
            if (this.stateTimer === 0) {
                this.state = 'prowl';
                this.untargetable = false;
                this.visualAlpha = 1;
            }
            this.setGloamClip('idle', seconds, 1);
            this.redrawGraphics(player);
            return;
        }

        this.biteCooldown = Math.max(0, this.biteCooldown - seconds);
        if (this.stunTimer > 0) {
            this.stunTimer = Math.max(0, this.stunTimer - seconds);
            body.setVelocityX(body.velocity.x * Math.pow(0.08, seconds));
            this.state = 'stunned';
            this.biteMark.clear();
            this.biteMark.setVisible(false);
            this.setGloamClip('idle', seconds, 1);
            this.redrawGraphics(player);
            return;
        }

        if (this.state === 'bite') {
            this.snatchElapsed += seconds;
            this.previousSnatchFrame = this.snatchFrame;
            this.snatchFrame = frameAt('gloam-snatch', this.snatchElapsed, this.snatchFrameOptions);
            body.setVelocityX(0);
            this.biteMarkElapsed += seconds;
            if (this.snatchFrame < bite.strikeFrame) {
                this.updateBiteMark();
            } else {
                this.biteMark.clear();
                this.biteMark.setVisible(false);
            }
            if (!this.biteStrikeTriggered &&
                this.previousSnatchFrame < bite.strikeFrame &&
                this.snatchFrame >= bite.strikeFrame) {
                this.biteStrikeTriggered = true;
                const carrierX = body.center.x;
                const strikePointX = carrierX + this.facing * bite.reachH * HERO_STAND_PX;
                const floorSurface = this.scene.floor
                    ? this.scene.floor.y - this.scene.floor.height / 2
                    : heroBody.bottom;
                const feetAboveFloor = floorSurface - heroBody.bottom;
                if (Math.abs(heroBody.center.x - strikePointX) <= this.width / 2 &&
                    feetAboveFloor <= bite.verticalH * HERO_STAND_PX) {
                    player.takeDamage(this.biteDamage, carrierX, this.config.knockback);
                }
                this.biteCooldown = bite.cooldown + this.jitter(bite.jitter);
            }
            if (this.snatchFrame >= bite.lastFrame) {
                this.state = 'chase';
                this.snatchElapsed = 0;
                this.snatchFrame = 0;
                this.biteStrikeTriggered = false;
            }
            this.redrawGraphics(player);
            return;
        }

        if (distance > aggroRange) {
            const patrolOffset = Math.sin(this.elapsed * 0.8) * 120;
            const patrolTarget = this.patrolOrigin + patrolOffset;
            const patrolDir = Math.sign(patrolTarget - body.center.x);
            body.setVelocityX(patrolDir * HERO_PHYSICS.moveSpeed * GLOAM.speedMult.patrol * this.speedMultiplier);
            this.state = 'prowl';
            this.setGloamClip('run', seconds, GLOAM.speedMult.patrol * this.speedMultiplier);
        } else if (distance <= triggerRange && this.biteCooldown === 0) {
            this.state = 'bite';
            this.snatchFrameOptions.speed = bite.speed;
            this.snatchElapsed = bite.startFrame /
                (GLOAM_SHEETS['gloam-snatch'].fps * this.snatchFrameOptions.speed);
            this.snatchFrame = bite.startFrame;
            this.previousSnatchFrame = bite.startFrame;
            this.biteStrikeTriggered = false;
            this.biteMarkElapsed = 0;
            body.setVelocityX(0);
            this.updateBiteMark();
        } else {
            const speedMult = distance > aggroRange / 2 ? GLOAM.speedMult.chase : GLOAM.speedMult.run;
            body.setVelocityX(this.facing * HERO_PHYSICS.moveSpeed * speedMult * this.speedMultiplier);
            this.state = 'chase';
            this.setGloamClip(
                speedMult === GLOAM.speedMult.chase ? 'chase' : 'run',
                seconds,
                speedMult * this.speedMultiplier
            );
        }
        this.redrawGraphics(player);
    }

    updateBiteMark() {
        if (!this.biteMark || !this.biteMark.active || this.state !== 'bite') {
            return;
        }
        const bite = GLOAM.bite;
        const body = this.sprite.body;
        const floorY = this.scene.floor
            ? this.scene.floor.y - this.scene.floor.height / 2
            : body.bottom;
        const strikeX = body.center.x + this.facing * bite.reachH * HERO_STAND_PX;
        const telegraphSeconds = (bite.strikeFrame - bite.startFrame) /
            (GLOAM_SHEETS['gloam-snatch'].fps * bite.speed);
        const progress = Math.min(1, this.biteMarkElapsed / telegraphSeconds);
        const alpha = bite.markAlpha * (1 - progress * bite.markFade);
        this.biteMark.clear();
        this.biteMark.fillStyle(bite.markColor, alpha);
        this.biteMark.fillEllipse(strikeX, floorY - bite.markFloorOffset, bite.markWidth, bite.markHeight);
        this.biteMark.setVisible(true);
    }

    setGloamClip(clip, seconds, speed) {
        if (this.clip !== clip) {
            this.clip = clip;
            this.clipElapsed = 0;
        }
        this.clipElapsed += seconds;
        this.clipSpeed = Math.min(speed, GLOAM.maxClipSpeed);
    }

    redrawGloam(player) {
        if (!this.inUse || !this.visual || !this.visual.active || !this.sprite || !this.sprite.active) {
            return;
        }
        const body = this.sprite.body;
        const centerX = body.center.x;
        const feetY = body.bottom;
        let key = 'gloam-run';
        let frame;
        let clip = GLOAM_SHEETS[key].clips[this.clip] || GLOAM_SHEETS[key].clips.idle;
        let speed = this.clipSpeed ?? 1;
        if (this.state === 'bite') {
            key = 'gloam-snatch';
            frame = this.snatchFrame;
        } else if (this.state === 'chase') {
            key = 'gloam-chase';
            clip = GLOAM_SHEETS[key].clips.chase;
        }
        if (frame === undefined) {
            this.gloamFrameOptions.from = clip.from;
            this.gloamFrameOptions.to = clip.to;
            this.gloamFrameOptions.loop = clip.mode !== 'once';
            this.gloamFrameOptions.pingpong = clip.mode === 'pingpong';
            this.gloamFrameOptions.speed = speed;
            frame = frameAt(key, this.clipElapsed, this.gloamFrameOptions);
        }
        showFrame(this.visual, key, frame, this.facing);
        this.visual.setPosition(centerX, feetY);
        this.visual.setAlpha(this.visualAlpha ?? 1);
        if (this.flashTimer > 0) {
            this.visual.setTint(0xffffff);
        } else {
            this.visual.clearTint();
        }

        this.aura.clear();
        this.aura.setPosition(centerX, feetY);
        this.aura.fillStyle(0x8739d1, 0.13 + (Math.sin(this.elapsed * 6) + 1) * 0.055);
        this.aura.fillEllipse(0, -this.height * 0.42, this.width * 1.2, this.height * 0.9);
        this.aura.setAlpha(this.visualAlpha ?? 1);

        this.healthBack.setPosition(centerX, feetY - this.height - 12);
        this.healthBar.setPosition(centerX - (this.width + 12) / 2, feetY - this.height - 12);
        this.healthBar.setSize((this.width + 12) * (this.health / this.maxHealth), 4);

        this.readable.clear();
        this.readable.setPosition(centerX, feetY);
        this.readable.setAlpha(this.visualAlpha ?? 1);
    }

    redrawGraphics(player) {
        if (!this.inUse || !this.sprite || !this.sprite.active) {
            return;
        }
        if (this.type === 'gloam') {
            this.redrawGloam(player);
            return;
        }
        const width = this.config.width;
        const height = this.config.height;
        const bodyColor = this.flashTimer > 0 ? 0xffffff : 0x8c3b3b;
        this.aura.clear();
        this.aura.setPosition(this.sprite.x, this.sprite.y);

        this.visual.clear();
        this.visual.setPosition(this.sprite.x, this.sprite.y);
        this.visual.fillStyle(bodyColor, 1);
        this.visual.fillEllipse(0, 0, width, height);
        this.visual.lineStyle(6, 0x30151b, 1);
        this.visual.strokeEllipse(0, 0, width, height);
        this.drawBruteSpikes(width, height);
        this.healthBack.setPosition(this.sprite.x, this.sprite.y - height / 2 - 12);
        this.healthBar.setPosition(this.sprite.x - (width + 12) / 2, this.sprite.y - height / 2 - 12);
        this.healthBar.setSize((width + 12) * (this.health / this.maxHealth), 4);

        this.readable.clear();
        this.readable.setPosition(this.sprite.x, this.sprite.y);
        this.readable.fillStyle(0xff633f, 1);
        this.readable.fillEllipse(-7, -4, 6, 4);
        this.readable.fillEllipse(7, -4, 6, 4);
        if (this.castTelegraphTimer > 0 && player && player.sprite && player.sprite.active) {
            const progress = 1 - this.castTelegraphTimer / this.config.cast.telegraph;
            const radius = 9 + progress * 27;
            this.readable.lineStyle(2, 0xb56bff, 0.95);
            this.readable.beginPath();
            this.readable.arc(0, -height / 2 - 14, radius, 0, Math.PI * 2);
            this.readable.strokePath();
            this.readable.lineStyle(1, 0x21112d, 0.8);
            this.readable.beginPath();
            this.readable.moveTo(0, -height / 2 - 14);
            this.readable.lineTo(player.sprite.x - this.sprite.x, player.sprite.y - this.sprite.y);
            this.readable.strokePath();
        }
        this.visual.setAlpha(this.visualAlpha ?? 1);
        this.readable.setAlpha(this.visualAlpha ?? 1);
        this.aura.setAlpha(this.visualAlpha ?? 1);
    }

    drawHorns(height) {
        for (let index = 0; index < this.leftHornPoints.length; index += 1) {
            const progress = index / (this.leftHornPoints.length - 1);
            this.leftHornPoints[index].set(-5 - progress * 14, -height / 2 + 4 - Math.sin(progress * Math.PI) * 12 - progress * 4);
            this.rightHornPoints[index].set(5 + progress * 14, -height / 2 + 4 - Math.sin(progress * Math.PI) * 12 - progress * 4);
        }
        this.visual.lineStyle(4, 0x171020, 1);
        this.visual.strokePoints(this.leftHornPoints, false, false);
        this.visual.strokePoints(this.rightHornPoints, false, false);
    }

    drawBruteSpikes(width, height) {
        this.leftSpikePoints[0].set(-width / 2 + 8, -height / 4);
        this.leftSpikePoints[1].set(-width / 2 - 28, -height / 2 + 8);
        this.leftSpikePoints[2].set(-width / 2 + 24, -height / 2 + 28);
        this.rightSpikePoints[0].set(width / 2 - 8, -height / 4);
        this.rightSpikePoints[1].set(width / 2 + 28, -height / 2 + 8);
        this.rightSpikePoints[2].set(width / 2 - 24, -height / 2 + 28);
        this.visual.fillStyle(0x501f2a, 1);
        this.visual.fillPoints(this.leftSpikePoints, true, false);
        this.visual.fillPoints(this.rightSpikePoints, true, false);
    }

    applyDamage(amount, fromX, knockback = null, stun = null) {
        if (!this.sprite || !this.sprite.active || this.isDefeated || this.untargetable) {
            return;
        }
        this.flashTimer = this.config.flash;
        let appliedDamage = amount;
        let appliedStun = stun ?? this.config.stun;
        if (this.type === 'gloam' && this.state === 'bite') {
            const vulnerable = this.snatchFrame >= GLOAM.bite.vulnerableFrom &&
                this.snatchFrame <= GLOAM.bite.lastFrame;
            if (vulnerable) {
                appliedStun = Math.max(appliedStun, GLOAM.bite.vulnerableStun);
            } else {
                appliedDamage = Math.round(appliedDamage * GLOAM.bite.interruptDamageMult);
            }
            if (this.snatchFrame < GLOAM.bite.strikeFrame) {
                this.biteCooldown = GLOAM.bite.interruptRestart;
                this.snatchElapsed = 0;
                this.snatchFrame = 0;
                this.biteStrikeTriggered = false;
                this.state = 'stunned';
                this.biteMark.clear();
                this.biteMark.setVisible(false);
            }
        }
        this.health = Math.max(0, this.health - appliedDamage);
        this.stunTimer = appliedStun;
        const push = knockback ?? this.config.knockback;
        this.sprite.body.setVelocityX(this.sprite.x >= fromX ? push : -push);
        if (this.type !== 'gloam' && this.castTelegraphTimer > 0) {
            this.castTelegraphTimer = 0;
            this.castTimer = 3;
            this.state = 'chase';
        }
        if (this.health <= 0) {
            this.defeat();
        }
    }

    defeat() {
        if (!this.sprite || !this.sprite.active || this.isDefeated) {
            return;
        }
        this.isDefeated = true;
        this.untargetable = true;
        this.state = 'defeated';
        this.defeatTimer = 0.25;
        this.sprite.body.enable = false;
        this.meleeFlash.setVisible(false);
        this.castBurst.setVisible(false);
        this.biteMark.clear();
        this.biteMark.setVisible(false);
        this.healthBack.setVisible(false);
        this.healthBar.setVisible(false);
        this.scene.onEnemyDefeated(this);
    }

    updateDefeat(delta) {
        if (!this.isDefeated || !this.inUse || !this.visual || !this.visual.active) {
            return true;
        }
        this.defeatTimer = Math.max(0, this.defeatTimer - delta / 1000);
        const alpha = this.defeatTimer / 0.25;
        this.visual.setAlpha(alpha);
        if (this.type === 'gloam') {
            this.visual.setScale(this.gloamScale * alpha);
        }
        this.readable.setAlpha(alpha);
        this.aura.setAlpha(alpha);
        if (this.defeatTimer === 0) {
            this.inUse = false;
            this.state = 'inactive';
            this.visual.setVisible(false);
            this.readable.setVisible(false);
            this.aura.setVisible(false);
            this.biteMark.setVisible(false);
            return true;
        }
        return false;
    }
}
