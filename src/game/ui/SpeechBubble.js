import { Math as PMath } from 'phaser';
import { INTRO_ACTORS } from '../config/introActors';
import { EFFECTS, SPEAKER_COLORS } from '../config/introData';

export function layoutBubbleText(text, { fontSize = 14, padding = 10, maxWidth = 210 } = {}) {
    const words = text.split(' ');
    const lines = [];
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) {
        throw new Error('Unable to create a text measurement context for speech bubbles.');
    }
    context.font = `${fontSize}px Arial`;

    let currentLine = '';
    for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        if (context.measureText(testLine).width > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine = testLine;
        }
    }
    if (currentLine) {
        lines.push(currentLine);
    }

    const wrappedText = lines.join('\n');
    const maxLineWidth = lines.reduce(
        (width, line) => Math.max(width, context.measureText(line).width),
        0
    );
    const bodyWidth = Math.ceil(maxLineWidth);
    const lineHeight = Math.ceil(fontSize * 1.35);
    const bodyHeight = Math.ceil(lines.length * lineHeight);

    return {
        wrappedText,
        pw: Math.ceil(bodyWidth + padding * 2 + 6),
        ph: Math.ceil(bodyHeight + padding * 2 + 2),
    };
}

export function createRevealSchedule(text, pacing, { pauseAfterLast = true } = {}) {
    let accumulated = 0;
    const revealTimes = [];
    const msPerChar = (pacing.msPerChar ?? 75) / 1000;
    const pauseComma = (pacing.pauseComma ?? 180) / 1000;
    const pauseStop = (pacing.pauseStop ?? 350) / 1000;

    for (let index = 0; index < text.length; index += 1) {
        let cost = msPerChar;
        const character = text[index];
        const canPause = pauseAfterLast || index < text.length - 1;
        if (canPause && character === ',') {
            cost += pauseComma;
        } else if (canPause && (character === '?' || character === '!')) {
            cost += pauseStop;
        } else if (canPause && character === '.' && (index === text.length - 1 || text[index + 1] !== '.')) {
            cost += pauseStop;
        }
        accumulated += cost;
        revealTimes.push(accumulated);
    }
    return { revealTimes, totalDuration: accumulated };
}

export function sliceWrappedText(wrappedText, visibleCount) {
    let characterIndex = 0;
    let stringIndex = 0;
    while (stringIndex < wrappedText.length && characterIndex < visibleCount) {
        if (wrappedText[stringIndex] !== '\n') {
            characterIndex += 1;
        }
        stringIndex += 1;
    }
    return wrappedText.slice(0, stringIndex);
}

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
            fontSize: `${style.fontSize ?? 14}px`,
            color: style.textColor || '#f2ecff',
            stroke: '#000000',
            strokeThickness: 3,
            lineSpacing: 2,
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
        const fontSize = bubbleStyle.fontSize ?? 14;
        const padding = bubbleStyle.padding ?? 10;
        const maxTextWidth = bubbleStyle.maxWidth ?? 210;
        const layout = layoutBubbleText(text, { fontSize, padding, maxWidth: maxTextWidth });

        // Precompute character reveal times with calm pacing
        const cueDuration = cue.end - cue.start;
        const fadeOut = bubbleStyle.fadeOut ?? 0.35;
        // Guarantee line finishes typing before fade-out phase begins
        const maxAllowed = Math.min(
            cueDuration * (pacing.maxFractionOfCue ?? 0.85),
            cueDuration - fadeOut - 0.2
        );

        const schedule = createRevealSchedule(text, pacing);
        const totalUnscaled = schedule.totalDuration;
        let scaleFactor = 1.0;
        let revealTimes = schedule.revealTimes;
        if (totalUnscaled > maxAllowed) {
            scaleFactor = maxAllowed / totalUnscaled;
            revealTimes = rawTimes.map((t) => t * scaleFactor);
        }

        return {
            ...layout,
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

    update(t, anchorScreenX, anchorScreenY, cameraZoom = this.scene.cameras.main.zoom) {
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
        this.bodyText.setText(sliceWrappedText(fullWrapped, visibleCount));

        // Container scale follows the configured camera zoom range.
        const cam = this.scene.cameras.main;
        const zoom = cameraZoom;
        const zoomScale = style.zoomScale || { ref: 1.0, min: 0.8, max: 1.15 };
        let s = PMath.Clamp(zoom / zoomScale.ref, zoomScale.min, zoomScale.max);

        // Optional debug multiplier
        if (typeof this.scene.bubbleScaleMultiplier === 'number') {
            s *= this.scene.bubbleScaleMultiplier;
        }

        // Cap bubble dimensions to the configured screen fractions.
        const screenW = this.scene.scale.width;
        const screenH = this.scene.scale.height;
        const maxW = (style.fit?.maxWidthFrac ?? 0.25) * screenW;
        const maxH = (style.fit?.maxHeightFrac ?? 0.20) * screenH;

        const pw = this.precomputed.pw;
        const ph = this.precomputed.ph;
        const tailPx = style.tailPx ?? 9;

        let w = pw * s;
        let h = ph * s;

        if (w > maxW || h > maxH) {
            const reduceFactor = Math.min(maxW / w, maxH / h);
            s *= reduceFactor;
            const minScale = (style.fit?.minFontPx ?? 10) / (style.fontSize ?? 14);
            s = Math.max(minScale, s);
            w = pw * s;
            h = ph * s;
        }

        const scaledTail = tailPx * s;
        const safeMargin = style.safeMargin ?? 20;

        // Panels stay inside the clear area between letterbox bars.
        const minX = safeMargin;
        const maxX = screenW - safeMargin - w;
        const letterboxHeight = EFFECTS.letterbox?.heightPx ?? 90;
        const minY = letterboxHeight;
        const maxY = screenH - letterboxHeight - h;

        const sx = anchorScreenX;
        const sy = anchorScreenY;

        const wantedPanelScreenX = sx - w / 2;
        const panelScreenX = PMath.Clamp(wantedPanelScreenX, minX, maxX);
        let clamped = panelScreenX !== wantedPanelScreenX;

        // Vertical positioning: above head if fits, otherwise FLIP below head
        let panelScreenY = 0;
        let flippedBelow = false;

        if (sy - scaledTail - h >= minY) {
            // Normal placement above head
            const wantedPanelScreenY = sy - scaledTail - h;
            panelScreenY = Math.min(maxY, Math.max(minY, wantedPanelScreenY));
            clamped ||= panelScreenY !== wantedPanelScreenY;
            flippedBelow = false;
        } else {
            // Flipped below character's head with tail pointing UP
            const wantedPanelScreenY = sy + scaledTail;
            panelScreenY = Math.max(minY, Math.min(maxY, wantedPanelScreenY));
            clamped ||= panelScreenY !== wantedPanelScreenY;
            flippedBelow = true;
        }

        const containerX = Math.round(panelScreenX);
        const containerY = Math.round(panelScreenY);

        this.container.setPosition(containerX, containerY);
        this.container.setScale(s);

        // In local coordinates of container
        const localSx = (sx - containerX) / s;
        const localSy = (sy - containerY) / s;

        const padding = style.padding ?? 10;
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

        return { scale: s, width: w, height: h, clamped, flipped: flippedBelow };
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
