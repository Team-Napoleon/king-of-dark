export default class DarknessOverlay {
    constructor(scene, player, {
        alpha = 0.9,
        lightScale = 1,
        fogWorldWidth = 1280,
        fogScrollFactor = 0.6,
        fogAlpha = 0.16,
    } = {}) {
        this.scene = scene;
        this.player = player;
        this.alpha = alpha;
        this.lightScale = lightScale;
        this.targetAlpha = alpha;
        this.targetScale = lightScale;
        this.transitionStartAlpha = alpha;
        this.transitionStartScale = lightScale;
        this.transitionDuration = 0;
        this.transitionElapsed = 0;
        this.flicker = { value: 1 };
        this.fogTweens = [];

        this.createTextures();
        this.image = scene.add.image(0, 0, 'darkness-mask')
            .setScrollFactor(0)
            .setDepth(50)
            .setAlpha(alpha)
            .setScale(lightScale);
        this.flickerTween = scene.tweens.add({
            targets: this.flicker,
            value: 1.03,
            duration: 900,
            yoyo: true,
            repeat: -1,
        });

        this.fog = [];
        for (let index = 0; index < 6; index += 1) {
            const x = 120 + ((fogWorldWidth - 240) * index) / 5;
            const y = 430 + (index % 3) * 62;
            const fog = scene.add.image(x, y, 'fog-soft')
                .setScrollFactor(fogScrollFactor)
                .setDepth(49)
                .setAlpha(fogAlpha);
            this.fog.push(fog);
            this.fogTweens.push(scene.tweens.add({
                targets: fog,
                x: x + (index % 2 === 0 ? 150 : -250),
                duration: 9000 + index * 1000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.InOut',
            }));
        }

        scene.events.once('shutdown', () => {
            if (!this.image || !this.image.active) {
                return;
            }
            this.destroy();
        });
    }

    createTextures() {
        if (!this.scene.textures.exists('darkness-mask')) {
            const texture = this.scene.textures.createCanvas('darkness-mask', 2560, 1440);
            const context = texture.getContext();
            const gradient = context.createRadialGradient(1280, 720, 0, 1280, 720, 380);
            gradient.addColorStop(0, 'rgba(5,3,14,0)');
            gradient.addColorStop(0.45, 'rgba(5,3,14,0.25)');
            gradient.addColorStop(1, 'rgba(5,3,14,0.92)');
            context.fillStyle = gradient;
            context.fillRect(0, 0, 2560, 1440);
            texture.refresh();
        }

        if (!this.scene.textures.exists('fog-soft')) {
            const texture = this.scene.textures.createCanvas('fog-soft', 520, 120);
            const context = texture.getContext();
            context.save();
            context.scale(1, 0.23);
            const gradient = context.createRadialGradient(260, 260, 0, 260, 260, 260);
            gradient.addColorStop(0, 'rgba(26,18,48,0.16)');
            gradient.addColorStop(1, 'rgba(26,18,48,0)');
            context.fillStyle = gradient;
            context.fillRect(0, 0, 520, 520);
            context.restore();
            texture.refresh();
        }
    }

    update(delta) {
        if (!this.image || !this.image.active || !this.player || !this.player.sprite || !this.player.sprite.active) {
            return;
        }

        const camera = this.scene.cameras.main;
        this.image.setPosition(
            this.player.sprite.x - camera.scrollX,
            this.player.sprite.y - camera.scrollY,
        );
        this.image.setScale(this.lightScale * this.flicker.value);

        if (this.transitionDuration > 0) {
            this.transitionElapsed = Math.min(this.transitionDuration, this.transitionElapsed + delta);
            const progress = this.transitionElapsed / this.transitionDuration;
            this.alpha = this.transitionStartAlpha + (this.targetAlpha - this.transitionStartAlpha) * progress;
            this.lightScale = this.transitionStartScale + (this.targetScale - this.transitionStartScale) * progress;
            this.image.setAlpha(this.alpha);
            if (progress >= 1) {
                this.transitionDuration = 0;
            }
        }
    }

    setDarkness(alpha, lightScale, duration = 400) {
        if (!this.image || !this.image.active) {
            return;
        }

        this.transitionStartAlpha = this.alpha;
        this.transitionStartScale = this.lightScale;
        this.targetAlpha = alpha;
        this.targetScale = lightScale;
        this.transitionDuration = Math.max(0, duration);
        this.transitionElapsed = 0;
        if (this.transitionDuration === 0) {
            this.alpha = alpha;
            this.lightScale = lightScale;
            this.image.setAlpha(alpha);
            this.image.setScale(lightScale * this.flicker.value);
        }
    }

    destroy() {
        if (this.flickerTween) {
            this.flickerTween.stop();
        }
        this.fogTweens.forEach((tween) => tween.stop());
        [this.image, ...this.fog].forEach((object) => {
            if (object && object.active) {
                object.destroy();
            }
        });
    }
}