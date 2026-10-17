import { HEALTH_ORB } from '../config/animationData';

export default class HealthOrb {
    constructor(scene, floorY) {
        this.scene = scene;
        this.floorY = floorY;
        this.radius = HEALTH_ORB.radius;
        this.inUse = false;
        this.collected = false;
        this.x = 0;
        this.y = 0;
        this.elapsed = 0;
        this.fallSpeed = HEALTH_ORB.fallSpeed;

        this.glow = scene.add.ellipse(0, 0, 30, 20, 0x55e58d, 0.2)
            .setDepth(51)
            .setVisible(false);
        this.circle = scene.add.circle(0, 0, this.radius, 0x79e69a, 1)
            .setStrokeStyle(2, 0xc2ffd1, 1)
            .setDepth(52)
            .setVisible(false);
    }

    drop(x, y) {
        if (!this.circle || !this.circle.active || !this.glow || !this.glow.active) {
            return false;
        }
        this.x = x;
        this.y = Math.min(y, this.floorY - this.radius);
        this.elapsed = 0;
        this.inUse = true;
        this.collected = false;
        this.circle.setAlpha(1).setVisible(true);
        this.glow.setAlpha(0.2).setVisible(true);
        this.updateVisuals();
        return true;
    }

    update(delta) {
        if (!this.inUse || this.collected || !this.circle || !this.circle.active) {
            return;
        }
        const seconds = delta / 1000;
        this.y = Math.min(this.floorY - this.radius, this.y + this.fallSpeed * seconds);
        this.elapsed += seconds;
        this.updateVisuals();
    }

    updateVisuals() {
        if (!this.circle || !this.circle.active || !this.glow || !this.glow.active) {
            return;
        }
        const settled = this.y >= this.floorY - this.radius;
        const bob = settled ? Math.sin(this.elapsed * HEALTH_ORB.bobSpeed) * HEALTH_ORB.bobHeight : 0;
        this.circle.setPosition(this.x, this.y + bob);
        this.glow.setPosition(this.x, this.y + bob + 2);
    }

    isWithin(x, y) {
        return this.inUse && !this.collected
            && Math.abs(this.x - x) <= HEALTH_ORB.pickupRadiusX
            && Math.abs(this.y - y) <= HEALTH_ORB.pickupRadiusY;
    }

    collect() {
        if (!this.inUse || this.collected || !this.circle || !this.circle.active) {
            return false;
        }
        this.collected = true;
        this.inUse = false;
        this.circle.setVisible(false);
        this.glow.setVisible(false);
        return true;
    }

    destroy() {
        [this.circle, this.glow].forEach((object) => {
            if (object && object.active) {
                object.destroy();
            }
        });
    }
}