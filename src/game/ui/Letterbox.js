export default class Letterbox {
    constructor(scene) {
        this.scene = scene;
        this.progress = { value: 0 };
        this.mode = 'in';
        this.onComplete = null;
        this.top = scene.add.rectangle(640, -90, 1280, 90, 0x000000)
            .setScrollFactor(0)
            .setDepth(105);
        this.bottom = scene.add.rectangle(640, 810, 1280, 90, 0x000000)
            .setScrollFactor(0)
            .setDepth(105);
        this.tween = scene.tweens.add({
            targets: this.progress,
            value: 1,
            duration: 400,
            paused: true,
            persist: true,
            onUpdate: () => this.applyProgress(),
            onComplete: () => {
                if (!this.scene || !this.scene.sys.isActive()) {
                    return;
                }
                const callback = this.onComplete;
                this.onComplete = null;
                if (callback) {
                    callback();
                }
            },
        });
        scene.events.once('shutdown', () => {
            if (!this.top || !this.top.active) {
                return;
            }
            this.destroy();
        });
    }

    playIn(onComplete) {
        if (!this.top || !this.top.active || !this.bottom || !this.bottom.active) {
            return;
        }
        this.mode = 'in';
        this.progress.value = 0;
        this.top.setY(-90);
        this.bottom.setY(810);
        this.onComplete = onComplete || null;
        this.tween.restart();
    }

    playOut(onComplete) {
        if (!this.top || !this.top.active || !this.bottom || !this.bottom.active) {
            return;
        }
        this.mode = 'out';
        this.progress.value = 0;
        this.top.setY(45);
        this.bottom.setY(675);
        this.onComplete = onComplete || null;
        this.tween.restart();
    }

    setTimelineProgress(mode, value) {
        if (!this.top || !this.top.active || !this.bottom || !this.bottom.active) {
            return;
        }
        this.mode = mode;
        this.progress.value = Math.max(0, Math.min(1, value));
        this.applyProgress();
    }

    applyProgress() {
        if (!this.top || !this.top.active || !this.bottom || !this.bottom.active) {
            return;
        }
        const progress = this.progress.value;
        if (this.mode === 'in') {
            this.top.setY(-90 + 135 * progress);
            this.bottom.setY(765 - 90 * progress);
        } else {
            this.top.setY(45 - 135 * progress);
            this.bottom.setY(675 + 90 * progress);
        }
    }

    destroy() {
        if (this.tween) {
            this.tween.stop();
        }
        this.onComplete = null;
        [this.top, this.bottom].forEach((object) => {
            if (object && object.active) {
                object.destroy();
            }
        });
    }
}