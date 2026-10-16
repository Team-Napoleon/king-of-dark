export default class KingOfDark {
    constructor(scene, x = 645, y = 340) {
        this.scene = scene;
        this.maxHealth = 200;
        this.health = this.maxHealth;
        this.hitHalfWidth = 45;
        this.hitHalfHeight = 65;
        this.floorTop = 630;
        this.baseColor = 0x1b1030;
        this.isDefeated = false;
        this.vulnerable = false;
        this.combatStarted = false;
        this.phaseTwo = false;
        this.state = 'idle';
        this.stateTimer = 0.8;
        this.currentAttack = null;
        this.lastAttack = null;
        this.shadowStepCooldown = 0;
        this.voidRainCooldown = 0;
        this.hitFlashTimer = 0;
        this.eyeFlashTimer = 0;
        this.introStepStage = null;
        this.introStepTimer = 0;
        this.introStepTargetX = 980;
        this.introStepCallback = null;
        this.slashTimer = 0;
        this.voidRainX = [];

        this.createVisuals(x, y);
        this.auraTween = scene.tweens.add({
            targets: this.aura,
            alpha: 0.28,
            scaleX: 1.12,
            scaleY: 1.12,
            duration: 700,
            yoyo: true,
            repeat: -1,
        });
        this.deathTween = scene.tweens.add({
            targets: this.deathCircle,
            scaleX: 1400,
            scaleY: 1400,
            duration: 2000,
            paused: true,
            persist: true,
            onComplete: () => {
                if (!this.scene || !this.scene.sys.isActive() || !this.deathCircle || !this.deathCircle.active) {
                    return;
                }
                this.scene.events.emit('boss-defeated', this);
            },
        });
        this.scene.events.once('shutdown', () => this.destroyEffects());
    }

    createVisuals(x, y) {
        this.aura = this.scene.add.ellipse(x, y + 12, 150, 176, 0x5422a8, 0.16).setDepth(4);
        this.sprite = this.scene.add.rectangle(x, y, 90, 130, this.baseColor)
            .setStrokeStyle(3, 0x7a3cff)
            .setDepth(5);
        this.scene.physics.add.existing(this.sprite);
        this.sprite.body.setAllowGravity(false);
        this.sprite.body.setImmovable(true);
        this.sprite.body.setCollideWorldBounds(true);
        this.sprite.body.setSize(90, 130);

        this.eyeLeft = this.scene.add.rectangle(x - 15, y - 18, 10, 5, 0xc18bff).setDepth(52);
        this.eyeRight = this.scene.add.rectangle(x + 15, y - 18, 10, 5, 0xc18bff).setDepth(52);
        this.telegraph = this.scene.add.rectangle(x, y - 84, 150, 8, 0xff3737, 0.9)
            .setDepth(52)
            .setVisible(false);
        this.stepMarker = this.scene.add.rectangle(0, this.floorTop - 4, 46, 6, 0x9b55ff, 0.95)
            .setDepth(52)
            .setVisible(false);
        this.slashVisual = this.scene.add.graphics().setDepth(52).setVisible(false);
        this.deathCircle = this.scene.add.circle(x, y, 1, 0x000000, 1)
            .setDepth(120)
            .setVisible(false)
            .setScale(0);

        this.waveProjectiles = [];
        for (let index = 0; index < 3; index += 1) {
            const wave = this.scene.add.rectangle(0, 0, 40, 30, 0x5c36d6, 0.95)
                .setStrokeStyle(2, 0xb28bff)
                .setDepth(52)
                .setVisible(false);
            this.scene.physics.add.existing(wave);
            wave.body.setAllowGravity(false);
            wave.body.setImmovable(true);
            wave.body.setCollideWorldBounds(true);
            wave.body.enable = false;
            wave.life = 0;
            this.waveProjectiles.push(wave);
        }

        this.voidMarkers = [];
        this.voidOrbs = [];
        for (let index = 0; index < 5; index += 1) {
            this.voidMarkers.push(
                this.scene.add.rectangle(0, this.floorTop - 3, 42, 6, 0xff3030, 0.95)
                    .setDepth(52)
                    .setVisible(false),
            );
            const orb = this.scene.add.circle(0, -40, 14, 0x2b0710, 1)
                .setStrokeStyle(3, 0xff3030)
                .setDepth(52)
                .setVisible(false);
            this.scene.physics.add.existing(orb);
            orb.body.setAllowGravity(false);
            orb.body.setImmovable(false);
            orb.body.setCollideWorldBounds(false);
            orb.body.enable = false;
            orb.life = 0;
            this.voidOrbs.push(orb);
        }
    }

    startFight(fightX = 980) {
        if (!this.sprite || !this.sprite.active || this.isDefeated) {
            return;
        }
        this.sprite.setPosition(fightX, this.floorTop - 65);
        this.sprite.body.reset(fightX, this.floorTop - 65);
        this.aura.setPosition(fightX, this.floorTop - 53);
        this.combatStarted = true;
        this.state = 'idle';
        this.stateTimer = 0.8;
        this.vulnerable = false;
        this.updateVisuals();
    }

    flashEyes() {
        if (!this.eyeLeft || !this.eyeLeft.active || !this.eyeRight || !this.eyeRight.active) {
            return;
        }
        this.eyeFlashTimer = 0.3;
        this.eyeLeft.setFillStyle(0xf4e9ff);
        this.eyeRight.setFillStyle(0xf4e9ff);
    }

    beginIntroStep(fightX, onComplete) {
        if (!this.sprite || !this.sprite.active || this.isDefeated) {
            return;
        }
        this.introStepTargetX = Math.max(120, Math.min(1160, fightX));
        this.stepMarker.setPosition(this.introStepTargetX, this.floorTop - 4);
        this.stepMarker.setVisible(true);
        this.sprite.setAlpha(1);
        this.introStepStage = 'fade';
        this.introStepTimer = 0.3;
        this.introStepCallback = typeof onComplete === 'function' ? onComplete : null;
    }

    updateIntroStep(step) {
        this.introStepTimer = Math.max(0, this.introStepTimer - step);
        if (this.introStepStage === 'fade') {
            this.sprite.setAlpha(Math.max(0, this.introStepTimer / 0.3));
            if (this.introStepTimer === 0) {
                this.sprite.setAlpha(0);
                this.introStepStage = 'marker';
                this.introStepTimer = 0.7;
            }
            return;
        }
        if (this.introStepStage === 'marker' && this.introStepTimer === 0) {
            this.stepMarker.setVisible(false);
            this.sprite.setPosition(this.introStepTargetX, this.floorTop - 65);
            this.sprite.body.reset(this.introStepTargetX, this.floorTop - 65);
            this.sprite.setAlpha(1);
            this.introStepStage = null;
            const callback = this.introStepCallback;
            this.introStepCallback = null;
            if (callback && this.scene && this.scene.sys.isActive()) {
                callback();
            }
        }
    }

    update(player, delta) {
        if (!this.sprite || !this.sprite.active) {
            return;
        }

        const step = delta / 1000;
        if (this.deathStage) {
            this.updateDeath(step);
            return;
        }
        if (this.isDefeated) {
            return;
        }
        this.updateProjectiles(step);
        this.shadowStepCooldown = Math.max(0, this.shadowStepCooldown - step);
        this.voidRainCooldown = Math.max(0, this.voidRainCooldown - step);
        this.hitFlashTimer = Math.max(0, this.hitFlashTimer - step);
        this.eyeFlashTimer = Math.max(0, this.eyeFlashTimer - step);
        if (this.eyeFlashTimer === 0) {
            this.eyeLeft.setFillStyle(0xc18bff);
            this.eyeRight.setFillStyle(0xc18bff);
        }
        this.slashTimer = Math.max(0, this.slashTimer - step);
        if (this.slashTimer === 0) {
            this.slashVisual.setVisible(false);
        }
        if (this.hitFlashTimer === 0 && this.state !== 'windup') {
            this.sprite.setFillStyle(this.baseColor);
        }
        if (this.introStepStage) {
            this.updateIntroStep(step);
            this.updateVisuals();
            return;
        }
        if (!this.combatStarted || !player || !player.sprite || !player.sprite.active) {
            this.updateVisuals();
            return;
        }

        if (!this.phaseTwo && this.health <= 100) {
            this.phaseTwo = true;
            this.baseColor = 0x100821;
            this.sprite.setFillStyle(this.baseColor);
            this.scene.cameras.main.shake(400, 0.01);
            if (this.scene.darkness) {
                this.scene.darkness.setDarkness(1, 1.2, 500);
            }
        }

        this.stateTimer = Math.max(0, this.stateTimer - step);
        if (this.state === 'idle' && this.stateTimer === 0) {
            this.chooseAttack();
        } else if (this.state === 'windup' && this.stateTimer === 0) {
            this.telegraph.setVisible(false);
            this.executeAttack(player);
        } else if (this.state === 'recover' && this.stateTimer === 0) {
            this.vulnerable = false;
            this.state = 'idle';
            this.stateTimer = 0.8;
        } else if (this.state === 'step-fade' && this.stateTimer === 0) {
            this.sprite.setAlpha(0);
            this.state = 'step-marker';
            this.stateTimer = 0.7;
        } else if (this.state === 'step-marker' && this.stateTimer === 0) {
            this.completeShadowStep(player);
        } else if (this.state === 'void-rain' && this.stateTimer === 0) {
            this.launchVoidOrbs();
            this.beginRecovery(this.phaseTwo ? 0.9 : 1.2);
        }

        if (this.state === 'step-fade') {
            this.sprite.setAlpha(Math.max(0, this.stateTimer / 0.3));
        }
        this.facePlayer(player);
        this.updateVisuals();
    }

    chooseAttack() {
        const options = ['dark-slash', 'shadow-wave'];
        if (this.shadowStepCooldown <= 0) {
            options.push('shadow-step');
        }
        if (this.phaseTwo && this.voidRainCooldown <= 0) {
            options.push('void-rain');
        }
        const choices = options.filter((attack) => attack !== this.lastAttack);
        const pool = choices.length > 0 ? choices : options;
        this.currentAttack = pool[Math.floor(Math.random() * pool.length)];
        this.lastAttack = this.currentAttack;
        this.state = 'windup';
        this.stateTimer = 0.6 * (this.phaseTwo ? 0.7 : 1);
        this.vulnerable = false;
        this.sprite.setFillStyle(0x8c1d36);
        this.telegraph.setVisible(true);
    }

    executeAttack(player) {
        if (this.currentAttack === 'dark-slash') {
            this.darkSlash(player);
            this.beginRecovery(this.phaseTwo ? 0.9 : 1.2);
        } else if (this.currentAttack === 'shadow-wave') {
            this.spawnWave(player);
            this.beginRecovery(this.phaseTwo ? 0.9 : 1.2);
        } else if (this.currentAttack === 'shadow-step') {
            this.beginShadowStep(player);
        } else if (this.currentAttack === 'void-rain') {
            this.beginVoidRain(player);
        }
    }

    darkSlash(player) {
        const facing = player.sprite.x < this.sprite.x ? -1 : 1;
        this.facing = facing;
        this.slashVisual.clear();
        this.slashVisual.setPosition(this.sprite.x + facing * 58, this.sprite.y);
        this.slashVisual.lineStyle(8, 0xd8b5ff, 0.95);
        this.slashVisual.beginPath();
        this.slashVisual.arc(0, 0, 65, facing > 0 ? -Math.PI / 2 : Math.PI / 2, facing > 0 ? Math.PI / 2 : Math.PI * 1.5, false);
        this.slashVisual.strokePath();
        this.slashVisual.setVisible(true);
        this.slashTimer = 0.28;

        const dx = player.sprite.x - this.sprite.x;
        if (Math.abs(dx) <= 130 && Math.abs(player.sprite.y - this.sprite.y) <= 110 && Math.sign(dx) === facing) {
            player.takeDamage(20);
        }
    }

    spawnWave(player) {
        const wave = this.waveProjectiles.find((projectile) => !projectile.body.enable);
        if (!wave) {
            return;
        }
        const facing = player.sprite.x < this.sprite.x ? -1 : 1;
        this.facing = facing;
        wave.setPosition(this.sprite.x + facing * 62, this.floorTop - 15);
        wave.setVisible(true);
        wave.body.enable = true;
        wave.life = 3;
        wave.body.setVelocity(facing * 380, 0);
    }

    beginShadowStep(player) {
        this.shadowStepCooldown = 6;
        const facing = player.facing || 1;
        this.shadowStepX = Math.max(120, Math.min(1160, player.sprite.x - facing * 110));
        this.stepMarker.setPosition(this.shadowStepX, this.floorTop - 4);
        this.stepMarker.setVisible(true);
        this.sprite.setAlpha(1);
        this.state = 'step-fade';
        this.stateTimer = 0.3;
        this.vulnerable = false;
    }

    completeShadowStep(player) {
        this.stepMarker.setVisible(false);
        this.sprite.setPosition(this.shadowStepX, this.floorTop - 65);
        this.sprite.body.reset(this.shadowStepX, this.floorTop - 65);
        this.sprite.setAlpha(1);
        if (Math.abs(player.sprite.x - this.sprite.x) <= 120 && Math.abs(player.sprite.y - this.sprite.y) <= 130) {
            player.takeDamage(25);
        }
        this.beginRecovery(1.4);
    }

    beginVoidRain(player) {
        this.voidRainCooldown = 9;
        this.voidRainX = [-160, -80, 0, 80, 160].map((offset) => Math.max(120, Math.min(1160, player.sprite.x + offset)));
        this.voidMarkers.forEach((marker, index) => {
            marker.setPosition(this.voidRainX[index], this.floorTop - 3);
            marker.setVisible(true);
        });
        this.state = 'void-rain';
        this.stateTimer = 0.8;
    }

    launchVoidOrbs() {
        this.voidMarkers.forEach((marker) => marker.setVisible(false));
        this.voidOrbs.forEach((orb, index) => {
            if (orb.body.enable) {
                return;
            }
            orb.setPosition(this.voidRainX[index], 55);
            orb.setVisible(true);
            orb.body.enable = true;
            orb.body.setAllowGravity(true);
            orb.body.reset(this.voidRainX[index], 55);
            orb.body.setVelocity(0, 0);
            orb.life = 3;
        });
    }

    beginRecovery(duration) {
        this.telegraph.setVisible(false);
        this.state = 'recover';
        this.stateTimer = duration;
        this.vulnerable = true;
    }

    facePlayer(player) {
        this.facing = player.sprite.x < this.sprite.x ? -1 : 1;
    }

    updateVisuals() {
        if (!this.sprite || !this.sprite.active) {
            return;
        }
        const x = this.sprite.x;
        const y = this.sprite.y;
        this.aura.setPosition(x, y + 12);
        this.eyeLeft.setPosition(x - 15, y - 18);
        this.eyeRight.setPosition(x + 15, y - 18);
        this.telegraph.setPosition(x, y - 84);
    }

    updateProjectiles(step) {
        this.waveProjectiles.forEach((wave) => {
            if (!wave || !wave.active || !wave.body.enable) {
                return;
            }
            wave.life = Math.max(0, wave.life - step);
            if (wave.life === 0) {
                this.deactivateHazard(wave);
            }
        });
        this.voidOrbs.forEach((orb) => {
            if (!orb || !orb.active || !orb.body.enable) {
                return;
            }
            orb.life = Math.max(0, orb.life - step);
            if (orb.life === 0) {
                this.deactivateHazard(orb);
            }
        });
    }

    deactivateHazard(hazard) {
        if (!hazard || !hazard.active) {
            return;
        }
        hazard.body.enable = false;
        hazard.body.setVelocity(0, 0);
        hazard.setVisible(false);
    }

    applyDamage(amount, fromX) {
        if (!this.sprite || !this.sprite.active || this.isDefeated) {
            return;
        }
        const damage = this.vulnerable ? amount : Math.max(1, Math.round(amount * 0.1));
        this.health = Math.max(0, this.health - damage);
        this.hitFlashTimer = 0.09;
        this.sprite.setFillStyle(0xffffff);
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
        this.sprite.body.enable = false;
        this.auraTween.stop();
        this.scene.physics.world.pause();
        this.playerLock();
        this.deathStage = 'freeze';
        this.deathTimer = 0.4;
    }

    playerLock() {
        const player = this.scene.player;
        if (!player || !player.sprite || !player.sprite.active) {
            return;
        }
        player.controlsLocked = true;
        player.sprite.body.setVelocity(0, 0);
    }

    updateDeath(step) {
        if (this.deathStage !== 'freeze') {
            return;
        }
        this.deathTimer = Math.max(0, this.deathTimer - step);
        if (this.deathTimer > 0) {
            return;
        }
        this.scene.physics.world.resume();
        this.scene.cameras.main.flash(350, 255, 255, 255);
        this.scene.cameras.main.shake(350, 0.012);
        this.deathCircle.setPosition(this.sprite.x, this.sprite.y);
        this.deathCircle.setScale(0);
        this.deathCircle.setVisible(true);
        this.deathStage = 'expand';
        this.deathTween.restart();
    }

    destroyEffects() {
        if (this.auraTween) {
            this.auraTween.stop();
        }
        if (this.deathTween) {
            this.deathTween.stop();
        }
        if (this.deathStage === 'freeze' && this.scene && this.scene.physics) {
            this.scene.physics.world.resume();
        }
    }
}