import { Math as PMath } from 'phaser';
import { INTRO_ACTORS } from '../config/introActors';
import { SPEAKER_COLORS } from '../config/introData';

export default class SpeechBubble {
    constructor(scene) {
        this.scene = scene;
        this.cue = null;
        this.precomputed = null;
        this.borderColor = 0x7e5a40;

        const style = INTRO_ACTORS.bubble;

        this.container = scene.add.container(0, 0)
            .setScrollFactor(0)
            .setDepth(150)
            .setVisible(false);

        this.graphics = scene.add.graphics();

        this.bodyText = scene.add.text(0, 0, '', {
            fontFamily: 'Arial, sans-serif',
            fontSize: `${style.fontSize || 14}px`,
            color: style.textColor || '#f2ecff',
            stroke: '#000000',
            strokeThickness: 3,
        });

        // Crisp rendering at scale
        this.bodyText.setResolution(2);

        // Single container for graphics and text
        this.container.add([this.graphics, this.bodyText]);
    }

    /**
     * Precompute text wrapping, base dimensions and calm character reveal times ONCE per cue.
     */
    static precomputeCue(cue, bubbleStyle, pacing) {
        const text = cue.text;
        const fontSize = bubbleStyle.fontSize || 14;
        const padding = bubbleStyle.padding || 10;
        const maxTextWidth = bubbleStyle.maxWidth || 210;

        // Wrap full text at base font size so wrapping never reflows
        const words = text.split(' ');
        let currentLine = '';
        const lines = [];

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        context.font = `${fontSize}px Arial`;

        for (let i = 0; i < words.length; i++) {
            const testLine = currentLine.length > 0 ? `${currentLine} ${words[i]}` : words[i];
            const testWidth = context.measureText(testLine).width;
            if (testWidth > maxTextWidth && currentLine.length > 0) {
                lines.push(currentLine);
                currentLine = words[i];
            } else {
                currentLine = testLine;
            }
        }
        if (currentLine.length > 0) {
            lines.push(currentLine);
        }

        const wrappedText = lines.join('\n');

        // Measure base panel width and height
        let maxLineWidth = 0;
        for (const line of lines) {
            const w = context.measureText(line).width;
            if (w > maxLineWidth) {
                maxLineWidth = w;
            }
        }

        const bodyWidth = Math.ceil(maxLineWidth);
        const lineHeight = fontSize * 1.25;
        const bodyHeight = Math.ceil(lines.length * lineHeight);

        const pw = Math.ceil(bodyWidth + padding * 2);
        const ph = Math.ceil(bodyHeight + padding * 2);

        // Precompute character reveal times with calm pacing
        const cueDuration = cue.end - cue.start;
        const fadeOut = bubbleStyle.fadeOut ?? 0.35;
        // Guarantee line finishes typing before fade-out phase begins
        const maxAllowed = Math.min(
            cueDuration * (pacing.maxFractionOfCue ?? 0.85),
            cueDuration - fadeOut - 0.2
        );

        let accumulated = 0;
        const rawTimes = [];
        const msPerChar = (pacing.msPerChar ?? 75) / 1000;
        const pauseComma = (pacing.pauseComma ?? 180) / 1000;
        const pauseStop = (pacing.pauseStop ?? 350) / 1000;

        for (let i = 0; i < text.length; i++) {
            let cost = msPerChar;
            const ch = text[i];
            if (ch === ',') {
                cost += pauseComma;
            } else if (ch === '?' || ch === '!') {
                cost += pauseStop;
            } else if (ch === '.') {
                if (i === text.length - 1 || text[i + 1] !== '.') {
                    cost += pauseStop;
                }
            }
            accumulated += cost;
            rawTimes.push(accumulated);
        }

        const totalUnscaled = accumulated;
        let scaleFactor = 1.0;
        let revealTimes = rawTimes;
        if (totalUnscaled > maxAllowed) {
            scaleFactor = maxAllowed / totalUnscaled;
            revealTimes = rawTimes.map((t) => t * scaleFactor);
        }

        return {
            wrappedText,
            pw,
            ph,
            revealTimes,
            totalDuration: totalUnscaled > maxAllowed ? maxAllowed : totalUnscaled,
            scaleFactor,
            wasSpedUp: totalUnscaled > maxAllowed,
        };
    }

    start(cue, precomputed) {
        this.cue = cue;
        this.precomputed = precomputed;
        this.container.setVisible(true);

        const rawColor = SPEAKER_COLORS[cue.speaker] ?? 0xf5d58a;
        this.borderColor = typeof rawColor === 'number'
            ? rawColor
            : parseInt(rawColor.replace('#', '0x'), 16);

        this.bodyText.setText('');
    }

    update(t, anchorScreenX, anchorScreenY) {
        if (!this.cue || !this.precomputed) {
            return false;
        }

        const cue = this.cue;
        if (t < cue.start || t >= cue.end) {
            this.hide();
            return false;
        }

        const style = INTRO_ACTORS.bubble;
        const fadeIn = style.fadeIn || 0.30;
        const fadeOut = style.fadeOut || 0.35;

        // Calculate opacity from master clock t
        let alpha = 1.0;
        if (t < cue.start + fadeIn) {
            alpha = Math.max(0, Math.min(1, (t - cue.start) / fadeIn));
        } else if (t > cue.end - fadeOut) {
            alpha = Math.max(0, Math.min(1, (cue.end - t) / fadeOut));
        }

        // Calculate visibleChars
        const elapsed = t - cue.start;
        const revealTimes = this.precomputed.revealTimes;
        let visibleCount = 0;
        while (visibleCount < revealTimes.length && revealTimes[visibleCount] <= elapsed) {
            visibleCount++;
        }

        // Slice pre-wrapped text preserving fixed newlines
        const fullWrapped = this.precomputed.wrappedText;
        let charIndex = 0;
        let strIndex = 0;
        while (strIndex < fullWrapped.length && charIndex < visibleCount) {
            if (fullWrapped[strIndex] !== '\n') {
                charIndex++;
            }
            strIndex++;
        }
        this.bodyText.setText(fullWrapped.slice(0, strIndex));

        // Container scale from camera zoom: zoomS = clamp(cam.zoom / 1.8, 0.65, 0.95)
        const cam = this.scene.cameras.main;
        const zoom = cam.zoom;
        const zoomScale = style.zoomScale || { ref: 1.8, min: 0.65, max: 0.95 };
        let s = PMath.Clamp(zoom / zoomScale.ref, zoomScale.min, zoomScale.max);

        // Optional debug multiplier
        if (typeof this.scene.bubbleScaleMultiplier === 'number') {
            s *= this.scene.bubbleScaleMultiplier;
        }

        // Cap maximum bubble dimensions to 25% screen width and 20% screen height
        const screenW = this.scene.scale.width;
        const screenH = this.scene.scale.height;
        const maxW = (style.fit?.maxWidthFrac || 0.25) * screenW; // 320px
        const maxH = (style.fit?.maxHeightFrac || 0.20) * screenH; // 144px

        const pw = this.precomputed.pw;
        const ph = this.precomputed.ph;
        const tailPx = style.tailPx || 9;

        let w = pw * s;
        let h = ph * s;

        if (w > maxW || h > maxH) {
            const reduceFactor = Math.min(maxW / w, maxH / h);
            s *= reduceFactor;
            w = pw * s;
            h = ph * s;
        }

        const scaledTail = tailPx * s;
        const safeMargin = style.safeMargin || 20;

        // Screen boundaries between letterbox bars (90px top and bottom)
        const minX = safeMargin;
        const maxX = screenW - safeMargin - w;
        const minY = 90 + 4;
        const maxY = screenH - 90 - 4 - h;

        const sx = anchorScreenX;
        const sy = anchorScreenY;

        // Horizontal positioning: centered over anchor, clamped to screen bounds
        let panelScreenX = sx - w / 2;
        panelScreenX = PMath.Clamp(panelScreenX, minX, maxX);

        // Vertical positioning: above head if fits, otherwise FLIP below head
        let panelScreenY = 0;
        let flippedBelow = false;

        if (sy - scaledTail - h >= minY) {
            // Normal placement above head
            panelScreenY = Math.min(maxY, Math.max(minY, sy - scaledTail - h));
            flippedBelow = false;
        } else {
            // Flipped below character's head with tail pointing UP
            panelScreenY = Math.max(minY, Math.min(maxY, sy + scaledTail));
            flippedBelow = true;
        }

        const containerX = Math.round(panelScreenX);
        const containerY = Math.round(panelScreenY);

        this.container.setPosition(containerX, containerY);
        this.container.setScale(s);

        // In local coordinates of container
        const localSx = (sx - containerX) / s;
        const localSy = (sy - containerY) / s;

        const padding = style.padding || 10;
        const tailBaseCenterX = PMath.Clamp(localSx, padding + 6, pw - padding - 6);

        // Draw panel and tail with speaker-colored border
        this.graphics.clear();

        const panelColor = style.panelColor || 0x120f1a;
        const panelAlpha = (style.panelAlpha || 0.9) * alpha;

        this.graphics.fillStyle(panelColor, panelAlpha);
        this.graphics.lineStyle(style.borderPx || 2, this.borderColor || 0x7e5a40, alpha * 0.95);

        // Rounded panel
        this.graphics.fillRoundedRect(0, 0, pw, ph, 8);
        this.graphics.strokeRoundedRect(0, 0, pw, ph, 8);

        // Tail triangle pointing at anchor
        if (!flippedBelow) {
            // Points down from bottom edge (y = ph)
            this.graphics.beginPath();
            this.graphics.moveTo(tailBaseCenterX - 7, ph - 1);
            this.graphics.lineTo(localSx, localSy);
            this.graphics.lineTo(tailBaseCenterX + 7, ph - 1);
            this.graphics.closePath();
            this.graphics.fillPath();

            this.graphics.beginPath();
            this.graphics.moveTo(tailBaseCenterX - 7, ph);
            this.graphics.lineTo(localSx, localSy);
            this.graphics.lineTo(tailBaseCenterX + 7, ph);
            this.graphics.strokePath();
        } else {
            // Points up from top edge (y = 0)
            this.graphics.beginPath();
            this.graphics.moveTo(tailBaseCenterX - 7, 1);
            this.graphics.lineTo(localSx, localSy);
            this.graphics.lineTo(tailBaseCenterX + 7, 1);
            this.graphics.closePath();
            this.graphics.fillPath();

            this.graphics.beginPath();
            this.graphics.moveTo(tailBaseCenterX - 7, 0);
            this.graphics.lineTo(localSx, localSy);
            this.graphics.lineTo(tailBaseCenterX + 7, 0);
            this.graphics.strokePath();
        }

        // Text positioning inside container
        this.bodyText.setPosition(padding, padding);
        this.bodyText.setAlpha(alpha);

        return true;
    }

    hide() {
        this.container.setVisible(false);
        this.cue = null;
        this.precomputed = null;
    }

    destroy() {
        if (this.container && this.container.active) {
            this.container.destroy();
        }
    }
}
