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
        const showName = style.showName ?? false;

        this.container = scene.add.container(0, 0)
            .setScrollFactor(0)
            .setDepth(150)
            .setVisible(false);

        this.graphics = scene.add.graphics();

        if (showName) {
            this.nameText = scene.add.text(0, 0, '', {
                fontFamily: 'Arial Black, Arial, sans-serif',
                fontSize: `${style.namePx}px`,
                stroke: '#000000',
                strokeThickness: 3,
            });
            this.container.add([this.graphics, this.nameText]);
        } else {
            this.nameText = null;
            this.container.add([this.graphics]);
        }

        this.bodyText = scene.add.text(0, 0, '', {
            fontFamily: 'Arial, sans-serif',
            fontSize: `${style.fontSize}px`,
            color: style.textColor || '#f2ecff',
            stroke: '#000000',
            strokeThickness: 3,
        });

        this.container.add([this.bodyText]);
    }

    /**
     * Precompute wrapping, sizing and typing reveal times for a cue
     */
    static precomputeCue(cue, bubbleStyle, pacing) {
        const text = cue.text;
        const maxTextWidth = bubbleStyle.maxWidth - bubbleStyle.padding * 2;
        const showName = bubbleStyle.showName ?? false;

        // Wrap full text using standard word wrap
        const words = text.split(' ');
        let currentLine = '';
        const lines = [];

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        context.font = `${bubbleStyle.fontSize}px Arial`;

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

        // Measure full width and height
        let maxLineWidth = 0;
        for (const line of lines) {
            const w = context.measureText(line).width;
            if (w > maxLineWidth) {
                maxLineWidth = w;
            }
        }

        const bodyWidth = Math.ceil(maxLineWidth);
        const lineHeight = bubbleStyle.fontSize * 1.25;
        const bodyHeight = Math.ceil(lines.length * lineHeight);

        let pw = 0;
        let ph = 0;
        let nameHeight = 0;

        if (showName) {
            context.font = `bold ${bubbleStyle.namePx}px "Arial Black", Arial`;
            const nameWidth = context.measureText(cue.speaker || '').width;
            nameHeight = Math.ceil(bubbleStyle.namePx * 1.2);
            const innerWidth = Math.max(nameWidth, bodyWidth);
            pw = Math.ceil(innerWidth + bubbleStyle.padding * 2);
            ph = Math.ceil(bubbleStyle.padding * 2 + nameHeight + 4 + bodyHeight);
        } else {
            pw = Math.ceil(bodyWidth + bubbleStyle.padding * 2);
            ph = Math.ceil(bubbleStyle.padding * 2 + bodyHeight);
        }

        // Precompute character reveal times with pacing
        const cueDuration = cue.end - cue.start;
        const maxAllowed = Math.min(
            cueDuration * (pacing.maxFractionOfCue ?? 0.75),
            cueDuration - (bubbleStyle.fadeOut ?? 0.35)
        );

        let accumulated = 0;
        const rawTimes = [];
        for (let i = 0; i < text.length; i++) {
            let cost = (pacing.msPerChar ?? 52) / 1000;
            const ch = text[i];
            if (ch === ',') {
                cost += (pacing.pauseComma ?? 160) / 1000;
            } else if (ch === '?' || ch === '!') {
                cost += (pacing.pauseStop ?? 320) / 1000;
            } else if (ch === '.') {
                if (i === text.length - 1 || text[i + 1] !== '.') {
                    cost += (pacing.pauseStop ?? 320) / 1000;
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
            nameHeight,
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

        if (this.nameText) {
            const hexColor = typeof rawColor === 'number'
                ? `#${rawColor.toString(16).padStart(6, '0')}`
                : rawColor;
            this.nameText.setText(cue.speaker || '').setColor(hexColor);
        }

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

        // Calculate alpha based purely on t
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

        // Map visibleCount to the pre-wrapped text preserving fixed newlines
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

        // Layout panel in screen coordinates
        const pw = this.precomputed.pw;
        const ph = this.precomputed.ph;
        const tailPx = style.tailPx || 12;
        const safeMargin = style.safeMargin || 24;

        // Safe bounds inside screen, below top letterbox (90px) and above bottom letterbox (630px)
        const minX = safeMargin;
        const maxX = 1280 - safeMargin - pw;
        const minY = 90 + 8;
        const maxY = 720 - 90 - 8 - ph;

        const sx = anchorScreenX;
        const sy = anchorScreenY;

        let panelX = PMath.Clamp(sx - pw / 2, minX, maxX);
        let panelY = PMath.Clamp(sy - tailPx - ph, minY, maxY);

        // Clamp tail base along panel bottom
        const tailBaseCenterX = PMath.Clamp(sx, panelX + 18, panelX + pw - 18);
        const tailBaseY = panelY + ph;

        // Draw graphics panel and tail with speaker-colored border
        this.graphics.clear();

        const panelColor = style.panelColor || 0x120f1a;
        const panelAlpha = (style.panelAlpha || 0.9) * alpha;

        this.graphics.fillStyle(panelColor, panelAlpha);
        this.graphics.lineStyle(style.borderPx || 2, this.borderColor || 0x7e5a40, alpha * 0.95);

        // Rounded panel
        this.graphics.fillRoundedRect(panelX, panelY, pw, ph, 8);
        this.graphics.strokeRoundedRect(panelX, panelY, pw, ph, 8);

        // Tail triangle pointing at (sx, sy)
        this.graphics.beginPath();
        this.graphics.moveTo(tailBaseCenterX - 8, tailBaseY - 1);
        this.graphics.lineTo(sx, sy);
        this.graphics.lineTo(tailBaseCenterX + 8, tailBaseY - 1);
        this.graphics.closePath();
        this.graphics.fillPath();

        // Stroke tail sides with speaker border color
        this.graphics.beginPath();
        this.graphics.moveTo(tailBaseCenterX - 8, tailBaseY);
        this.graphics.lineTo(sx, sy);
        this.graphics.lineTo(tailBaseCenterX + 8, tailBaseY);
        this.graphics.strokePath();

        // Text positioning and alpha
        const padding = style.padding || 14;
        if (this.nameText) {
            this.nameText.setPosition(panelX + padding, panelY + padding);
            this.nameText.setAlpha(alpha);
            this.bodyText.setPosition(panelX + padding, panelY + padding + this.precomputed.nameHeight + 4);
        } else {
            this.bodyText.setPosition(panelX + padding, panelY + padding);
        }

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
