import { Math as PMath } from 'phaser';
import { INTRO_ACTORS } from '../config/introActors';
import {
    createRevealSchedule,
    layoutBubbleText,
    sliceWrappedText,
} from './SpeechBubble';

const HERO_BUBBLE_DEPTH = 104;

function toCssColor(color, fallback = '#f5d58a') {
    if (typeof color === 'string') {
        return color.startsWith('#') ? color : `#${color}`;
    }
    return Number.isFinite(color) ? `#${color.toString(16).padStart(6, '0')}` : fallback;
}

export default class WorldBubble {
    constructor(scene, { speakers, pacing, voiceStyle }) {
        this.scene = scene;
        this.speakers = speakers;
        this.pacing = pacing;
        this.voiceStyle = voiceStyle;
        this.anchors = new Map();
        this.safeTop = 0;
        this.safeBottom = 0;
        this.destroyed = false;
        this.slots = Array.from({ length: 2 }, () => this.createSlot());
        this.onShutdown = () => this.destroy();
        scene.events.once('shutdown', this.onShutdown);
    }

    createSlot() {
        const container = this.scene.add.container(0, 0)
            .setScrollFactor(0)
            .setDepth(HERO_BUBBLE_DEPTH)
            .setVisible(false);
        const graphics = this.scene.add.graphics();
        const text = this.scene.add.text(0, 0, '', {
            fontFamily: 'Arial, sans-serif',
            fontSize: `${INTRO_ACTORS.bubble.fontSize}px`,
            color: INTRO_ACTORS.bubble.textColor,
            stroke: '#000000',
            strokeThickness: 3,
            lineSpacing: 2,
        }).setResolution(2);
        container.add([graphics, text]);
        return { container, graphics, text, line: null };
    }

    setAnchor(name, provider) {
        if (provider === null) {
            this.anchors.delete(name);
            return;
        }
        if (typeof provider !== 'function') {
            throw new TypeError(`WorldBubble anchor "${name}" must be a provider function or null.`);
        }
        this.anchors.set(name, provider);
    }

    setSafeInsets(top, bottom) {
        this.safeTop = Math.max(0, top);
        this.safeBottom = Math.max(0, bottom);
    }

    get isBusy() {
        return this.slots.some((slot) => slot.line && !slot.line.done);
    }

    say({ who, text, pacing = this.pacing, onStart, onDone }) {
        if (this.destroyed) {
            throw new Error('Cannot show a line with a destroyed WorldBubble.');
        }
        const speaker = this.speakers[who];
        if (!speaker) {
            throw new Error(`WorldBubble has no speaker configuration for "${who}".`);
        }
        if (typeof text !== 'string' || text.length === 0) {
            throw new TypeError('WorldBubble lines require non-empty text.');
        }
        const anchorType = speaker.anchor;
        const isVoice = anchorType === 'voice';
        const isScreen = anchorType === 'screen';
        const isFloatingText = isVoice || isScreen;
        const anchorProvider = isFloatingText ? null : this.anchors.get(anchorType);
        if (!isFloatingText && !anchorProvider) {
            throw new Error(`WorldBubble has no anchor provider registered for "${anchorType}".`);
        }

        const slot = this.slots.find((candidate) => !candidate.line || candidate.line.done);
        if (!slot) {
            throw new Error('WorldBubble has no free slot; both pooled bubbles are active.');
        }
        const style = INTRO_ACTORS.bubble;
        const fontSize = style.fontSize;
        const textLayout = layoutBubbleText(text, {
            fontSize,
            padding: style.padding,
            maxWidth: isVoice
                ? this.voiceStyle.maxWidth
                : isScreen
                    ? Math.min(this.scene.scale.width - style.safeMargin * 2, 900)
                    : style.maxWidth,
        });
        const schedule = createRevealSchedule(text, pacing, { pauseAfterLast: false });
        const handle = { done: false, cancelled: false };
        slot.line = {
            who,
            text,
            speaker,
            anchorType,
            anchorProvider,
            isVoice,
            isScreen,
            style,
            pacing,
            layout: textLayout,
            revealTimes: schedule.revealTimes,
            typingDuration: schedule.totalDuration,
            elapsed: 0,
            started: false,
            onStart,
            onDone,
            handle,
        };
        slot.text
            .setText('')
            .setColor(isVoice ? this.voiceStyle.textColor : toCssColor(speaker.color))
            .setFontStyle(isVoice ? this.voiceStyle.fontStyle || 'italic' : 'normal')
            .setOrigin(isFloatingText ? 0.5 : 0, isFloatingText ? 0.5 : 0)
            .setShadow(
                0,
                0,
                isVoice ? toCssColor(this.voiceStyle.glowColor, '#7a3cff') : '#000000',
                isVoice ? 12 : 0,
                false,
                true
            );
        slot.container.setScale(1).setAlpha(0).setVisible(true);
        this.renderSlot(slot);
        return handle;
    }

    update(dt) {
        if (this.destroyed) {
            return;
        }
        for (const slot of this.slots) {
            const line = slot.line;
            if (!line || line.done) {
                continue;
            }
            if (!line.started) {
                line.started = true;
                if (line.onStart) {
                    line.onStart();
                }
            }
            if (this.destroyed || slot.line !== line || line.done) {
                continue;
            }
            line.elapsed += Math.max(0, dt);
            this.renderSlot(slot);

            const { fadeIn = 0, hold = 0, fadeOut = 0, gap = 0 } = line.pacing;
            const completeAt = line.typingDuration + hold + fadeOut + gap;
            if (line.elapsed >= completeAt) {
                line.done = true;
                line.handle.done = true;
                slot.container.setVisible(false);
                if (line.onDone) {
                    line.onDone();
                }
            }
        }
    }

    renderSlot(slot) {
        const line = slot.line;
        const style = line.style;
        const zoom = this.scene.cameras.main.zoom;
        const zoomScale = style.zoomScale || { ref: 1, min: 0.8, max: 1.15 };
        let scale = PMath.Clamp(zoom / zoomScale.ref, zoomScale.min, zoomScale.max);
        const { pw, ph, wrappedText } = line.layout;
        const panel = !line.isVoice && !line.isScreen;
        const screenWidth = this.scene.scale.width;
        const screenHeight = this.scene.scale.height;
        const fit = style.fit;
        if (panel && fit) {
            const maxWidth = fit.maxWidthFrac * screenWidth;
            const maxHeight = fit.maxHeightFrac * screenHeight;
            const fitScale = Math.min(1, maxWidth / (pw * scale), maxHeight / (ph * scale));
            scale = Math.max((fit.minFontPx || 1) / style.fontSize, scale * fitScale);
        }

        const visibleCount = line.revealTimes.reduce(
            (count, time) => count + (time <= line.elapsed ? 1 : 0),
            0
        );
        slot.text.setText(sliceWrappedText(wrappedText, visibleCount));

        const { fadeIn = 0, hold = 0, fadeOut = 0 } = line.pacing;
        const fadeOutStart = line.typingDuration + hold;
        let alpha = fadeIn > 0 ? Math.min(1, line.elapsed / fadeIn) : 1;
        if (line.elapsed >= fadeOutStart) {
            alpha = fadeOut > 0 ? Math.max(0, 1 - (line.elapsed - fadeOutStart) / fadeOut) : 0;
        }
        slot.container.setAlpha(alpha);

        if (line.isVoice || line.isScreen) {
            const centerX = screenWidth / 2;
            const centerY = line.isVoice
                ? this.voiceStyle.y
                : this.safeTop + (screenHeight - this.safeTop - this.safeBottom) / 2;
            slot.container.setPosition(centerX, centerY).setScale(scale);
            slot.graphics.clear();
            slot.text.setPosition(0, 0);
            return;
        }

        const anchor = line.anchorProvider();
        if (!anchor || !Number.isFinite(anchor.x) || !Number.isFinite(anchor.y)) {
            throw new Error(`WorldBubble anchor "${line.anchorType}" returned an invalid point.`);
        }
        const camera = this.scene.cameras.main;
        const screenX = (anchor.x - camera.worldView.x) * zoom;
        const screenY = (anchor.y - camera.worldView.y) * zoom;
        const width = pw * scale;
        const height = ph * scale;
        const tail = style.tailPx * scale;
        const safeMargin = style.safeMargin || 0;
        const minX = safeMargin;
        const maxX = screenWidth - safeMargin - width;
        const minY = this.safeTop + safeMargin;
        const maxY = screenHeight - this.safeBottom - safeMargin - height;
        const wantedX = screenX - width / 2;
        const panelX = PMath.Clamp(wantedX, minX, Math.max(minX, maxX));
        let panelY;
        let flipped = false;
        if (screenY - tail - height >= minY) {
            panelY = PMath.Clamp(screenY - tail - height, minY, Math.max(minY, maxY));
        } else {
            flipped = true;
            panelY = PMath.Clamp(screenY + tail, minY, Math.max(minY, maxY));
        }

        slot.container.setPosition(Math.round(panelX), Math.round(panelY)).setScale(scale);
        const localX = (screenX - panelX) / scale;
        const localY = (screenY - panelY) / scale;
        const padding = style.padding;
        const tailCenter = PMath.Clamp(localX, padding + 6, pw - padding - 6);
        const borderColor = line.speaker.color;
        const border = typeof borderColor === 'number'
            ? borderColor
            : Number.parseInt(toCssColor(borderColor).slice(1), 16);
        slot.graphics.clear();
        slot.graphics.fillStyle(style.panelColor, style.panelAlpha);
        slot.graphics.lineStyle(style.borderPx, border, 0.95);
        slot.graphics.fillRoundedRect(0, 0, pw, ph, 8);
        slot.graphics.strokeRoundedRect(0, 0, pw, ph, 8);
        slot.graphics.beginPath();
        if (flipped) {
            slot.graphics.moveTo(tailCenter - 7, 1);
            slot.graphics.lineTo(localX, localY);
            slot.graphics.lineTo(tailCenter + 7, 1);
        } else {
            slot.graphics.moveTo(tailCenter - 7, ph - 1);
            slot.graphics.lineTo(localX, localY);
            slot.graphics.lineTo(tailCenter + 7, ph - 1);
        }
        slot.graphics.closePath();
        slot.graphics.fillPath();
        slot.graphics.beginPath();
        if (flipped) {
            slot.graphics.moveTo(tailCenter - 7, 0);
            slot.graphics.lineTo(localX, localY);
            slot.graphics.lineTo(tailCenter + 7, 0);
        } else {
            slot.graphics.moveTo(tailCenter - 7, ph);
            slot.graphics.lineTo(localX, localY);
            slot.graphics.lineTo(tailCenter + 7, ph);
        }
        slot.graphics.strokePath();
        slot.text.setPosition(padding, padding);
    }

    clear() {
        for (const slot of this.slots) {
            if (slot.line) {
                slot.line.handle.cancelled = true;
                slot.line.handle.done = true;
                slot.line.done = true;
                slot.line = null;
            }
            slot.container.setVisible(false).setAlpha(0);
            slot.graphics.clear();
            slot.text.setText('');
        }
    }

    destroy() {
        if (this.destroyed) {
            return;
        }
        this.destroyed = true;
        this.scene.events.off('shutdown', this.onShutdown);
        this.clear();
        for (const slot of this.slots) {
            if (slot.container.active) {
                slot.container.destroy();
            }
        }
        this.anchors.clear();
        this.slots = [];
        this.scene = null;
    }
}
