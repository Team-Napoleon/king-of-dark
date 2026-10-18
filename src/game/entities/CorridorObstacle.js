export default class CorridorObstacle {
    constructor(scene, { x, floorY, kind, height, hits = 0 }) {
        this.scene = scene;
        this.x = x;
        this.floorY = floorY;
        this.kind = kind;
        this.height = height;
        this.width = kind === 'barricade' ? height * 0.72 : height * 0.9;
        this.maxHits = hits;
        this.hits = hits;
        this.broken = false;
        this.stumbleTriggered = false;
        this.litTimer = 0;
        this.litSeconds = 0;
        this.radius = 0;
        this.graphics = scene.add.graphics().setDepth(kind === 'brazier' ? 10 : 8);
        this.glow = scene.add.graphics().setDepth(11);
        this.draw();
    }

    draw() {
        const graphic = this.graphics;
        graphic.clear();
        if (this.kind === 'rubble') {
            graphic.fillStyle(0x39343d, 1);
            graphic.fillPoints([
                { x: this.x - this.width * 0.52, y: this.floorY },
                { x: this.x - this.width * 0.42, y: this.floorY - this.height * 0.55 },
                { x: this.x - this.width * 0.08, y: this.floorY - this.height },
                { x: this.x + this.width * 0.12, y: this.floorY - this.height * 0.72 },
                { x: this.x + this.width * 0.48, y: this.floorY },
            ], true);
            graphic.fillStyle(0x5b515b, 1);
            graphic.fillTriangle(this.x - 10, this.floorY - this.height * 0.65,
                this.x + 1, this.floorY - this.height * 0.88,
                this.x + 16, this.floorY - this.height * 0.45);
        } else if (this.kind === 'coffin') {
            graphic.fillStyle(0x332520, 1);
            graphic.fillPoints([
                { x: this.x - this.width / 2, y: this.floorY },
                { x: this.x - this.width * 0.39, y: this.floorY - this.height * 0.72 },
                { x: this.x, y: this.floorY - this.height },
                { x: this.x + this.width * 0.39, y: this.floorY - this.height * 0.72 },
                { x: this.x + this.width / 2, y: this.floorY },
            ], true);
            graphic.lineStyle(4, 0x84604a, 0.9);
            graphic.lineBetween(this.x, this.floorY - this.height * 0.86, this.x, this.floorY - 5);
        } else if (this.kind === 'barricade') {
            graphic.fillStyle(0x37221a, 1);
            graphic.fillRect(this.x - this.width / 2, this.floorY - this.height, this.width, this.height);
            graphic.fillStyle(0x785039, 1);
            for (let board = 0; board < 4; board += 1) {
                graphic.fillRect(this.x - this.width / 2, this.floorY - this.height + board * this.height / 4,
                    this.width, this.height * 0.12);
            }
            graphic.lineStyle(6, 0x24150f, 1);
            graphic.lineBetween(this.x - this.width / 2, this.floorY, this.x + this.width / 2, this.floorY - this.height);
            graphic.lineBetween(this.x + this.width / 2, this.floorY, this.x - this.width / 2, this.floorY - this.height);
        } else if (this.kind === 'brazier') {
            graphic.fillStyle(0x524a48, 1);
            graphic.fillPoints([
                { x: this.x - this.width / 2, y: this.floorY },
                { x: this.x - this.width * 0.38, y: this.floorY - this.height * 0.48 },
                { x: this.x + this.width * 0.38, y: this.floorY - this.height * 0.48 },
                { x: this.x + this.width / 2, y: this.floorY },
            ], true);
            graphic.lineStyle(4, 0x93847c, 1);
            graphic.lineBetween(this.x - this.width / 2, this.floorY - this.height * 0.48,
                this.x + this.width / 2, this.floorY - this.height * 0.48);
        } else if (this.kind === 'wisp') {
            graphic.fillStyle(0xb26aff, 0.8);
            graphic.fillCircle(this.x, this.floorY - this.height / 2, this.height / 2);
            graphic.fillStyle(0xe6c8ff, 0.9);
            graphic.fillCircle(this.x, this.floorY - this.height / 2, this.height / 5);
        }
    }

    light(seconds, radius) {
        this.litTimer = seconds;
        this.litSeconds = seconds;
        this.radius = radius;
        this.drawGlow(1);
    }

    drawGlow(alpha) {
        this.glow.clear();
        if (alpha <= 0) return;
        this.glow.fillStyle(0xff8b32, alpha * 0.18);
        this.glow.fillCircle(this.x, this.floorY - this.height * 0.6, this.radius);
        this.glow.fillStyle(0xffb14a, alpha * 0.55);
        this.glow.fillCircle(this.x, this.floorY - this.height * 0.92, this.height * 0.2);
    }

    update(delta) {
        if (this.litTimer <= 0) return;
        this.litTimer = Math.max(0, this.litTimer - delta / 1000);
        const alpha = this.litSeconds > 0 ? this.litTimer / this.litSeconds : 0;
        this.drawGlow(alpha);
        if (this.litTimer === 0) this.glow.clear();
    }

    hit() {
        if (this.kind !== 'barricade' || this.broken) return false;
        this.hits -= 1;
        if (this.hits <= 0) {
            this.broken = true;
            this.graphics.setVisible(false);
            return true;
        }
        return false;
    }

    reset() {
        this.hits = this.maxHits;
        this.broken = false;
        this.stumbleTriggered = false;
        this.litTimer = 0;
        this.graphics.setVisible(true);
        this.glow.clear();
        this.draw();
    }
}
