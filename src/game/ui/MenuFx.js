import { BlendModes, Math as PMath } from 'phaser';

/**
 * Soft dark edges around the screen (stacked translucent strips, no textures needed).
 */
export function addVignette(scene, { depth = 50, steps = 16, band = 20, alpha = 0.09 } = {}) {
    const { width, height } = scene.scale;
    const objects = [];
    for (let i = 1; i <= steps; i += 1) {
        const size = i * band;
        objects.push(
            scene.add.rectangle(width / 2, size / 2, width, size, 0x000000, alpha),
            scene.add.rectangle(width / 2, height - size / 2, width, size, 0x000000, alpha),
            scene.add.rectangle(size / 2, height / 2, size, height, 0x000000, alpha),
            scene.add.rectangle(width - size / 2, height / 2, size, height, 0x000000, alpha),
        );
    }
    objects.forEach((object) => object.setDepth(depth).setScrollFactor(0));
    return objects;
}

/**
 * Glowing embers drifting upward (matches the torch fire in the backgrounds).
 */
export function addEmbers(scene, { count = 40, depth = 20, colors = [0xff9a3c, 0xffc36b, 0xb57cff] } = {}) {
    const { width, height } = scene.scale;
    for (let i = 0; i < count; i += 1) {
        const ember = scene.add.circle(0, 0, PMath.FloatBetween(1, 2.6), PMath.RND.pick(colors), 1)
            .setDepth(depth)
            .setBlendMode(BlendModes.ADD)
            .setAlpha(0);
        const launch = (first) => {
            const life = PMath.Between(5000, 11000);
            ember.setPosition(PMath.Between(0, width), first ? PMath.Between(0, height) : height + 10);
            ember.setScale(PMath.FloatBetween(0.7, 1.6));
            scene.tweens.add({
                targets: ember,
                y: ember.y - PMath.Between(260, 620),
                x: ember.x + PMath.Between(-110, 110),
                duration: life,
                ease: 'Sine.easeOut',
                onComplete: () => launch(false),
            });
            scene.tweens.add({
                targets: ember,
                alpha: PMath.FloatBetween(0.5, 0.95),
                duration: life / 2,
                yoyo: true,
                ease: 'Sine.easeInOut',
            });
        };
        launch(true);
    }
}

/**
 * Small diamond used as ornament / selector (outline or filled).
 */
export function addDiamond(scene, x, y, size, color, filled = true) {
    const diamond = scene.add.rectangle(x, y, size, size, color, filled ? 1 : 0).setAngle(45);
    if (!filled) {
        diamond.setStrokeStyle(2, color, 1);
    }
    return diamond;
}

/**
 * Thin ornamental divider: line - diamond - line.
 */
export function addDivider(scene, x, y, halfWidth, color = 0xf5d58a, alpha = 0.8) {
    const left = scene.add.rectangle(x - halfWidth / 2 - 12, y, halfWidth - 24, 2, color, alpha);
    const right = scene.add.rectangle(x + halfWidth / 2 + 12, y, halfWidth - 24, 2, color, alpha);
    const diamond = addDiamond(scene, x, y, 12, color, true);
    const sideLeft = addDiamond(scene, x - 26, y, 6, color, true).setAlpha(alpha);
    const sideRight = addDiamond(scene, x + 26, y, 6, color, true).setAlpha(alpha);
    return [left, right, diamond, sideLeft, sideRight];
}
