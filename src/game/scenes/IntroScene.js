import { BlendModes, Scene } from 'phaser';
import {
    IMG_SCALE,
    WORLD,
    toWorld,
    SHOTS,
    INTRO_FLOW,
    INTRO_DEBUG,
    DIALOGUE,
    SPEAKER_COLORS,
    TYPE_MS_PER_CHAR,
    EFFECTS,
} from '../config/introData';
import { INTRO_ACTORS } from '../config/introActors';
import Letterbox from '../ui/Letterbox';
import DialogueBox from '../ui/DialogueBox';
import SpeechBubble from '../ui/SpeechBubble';

function easeSineInOut(p) {
    const clamped = Math.max(0, Math.min(1, p));
    return 0.5 * (1 - Math.cos(Math.PI * clamped));
}

export default class IntroScene extends Scene {
    constructor() {
        super(INTRO_FLOW.sceneKey || 'IntroScene');
    }

    create() {
        this.t = 0;
        this.isFinishing = false;

        this.cameras.main.setBackgroundColor('#000000');
        this.cameras.main.setBounds(0, 0, WORLD.width, WORLD.height);

        // Create images for all 3 shots at (0, 0) with scale IMG_SCALE
        this.shotImages = {};
        SHOTS.forEach((shot, index) => {
            const img = this.add.image(0, 0, shot.image)
                .setOrigin(0, 0)
                .setScale(IMG_SCALE)
                .setDepth(index + 1)
                .setAlpha(0)
                .setVisible(false);
            this.shotImages[shot.id] = img;
        });
        this.createSwingRig();

        this.heroShadow = this.add.graphics()
            .setDepth(9)
            .setVisible(false);

        const initialHeroEntry = INTRO_ACTORS.hero.byImage['intro-2'];
        this.heroPicture = this.add.image(0, 0, initialHeroEntry.texture)
            .setOrigin(initialHeroEntry.feetAnchorFracX, 1)
            .setDepth(10)
            .setVisible(false);

        this.heroEyeGlow = this.add.graphics()
            .setDepth(11)
            .setBlendMode(BlendModes.ADD)
            .setVisible(false);

        // Letterbox bars helper
        this.letterbox = new Letterbox(this);
        this.letterbox.setTimelineProgress('in', 0);

        // Timed DialogueBox fallback (for unanchored lines like Narrator)
        this.dialogueBox = new DialogueBox(this);
        this.activeDialogueCue = null;

        // Precompute all speech bubble cues (pacing, wrapping, sizing)
        this.precomputedCues = {};
        this.spedUpCues = [];
        DIALOGUE.forEach((cue) => {
            const pre = SpeechBubble.precomputeCue(cue, INTRO_ACTORS.bubble, INTRO_ACTORS.pacing);
            this.precomputedCues[cue.id] = pre;
            if (pre.wasSpedUp) {
                this.spedUpCues.push({
                    id: cue.id,
                    speaker: cue.speaker,
                    scaleFactor: Number(pre.scaleFactor.toFixed(4)),
                    typingDuration: Number(pre.totalDuration.toFixed(3)),
                    cueDuration: Number((cue.end - cue.start).toFixed(2)),
                });
            }
        });
        this.loggedBubbleCueIds = new Set();
        this.finalDialogueCue = DIALOGUE[DIALOGUE.length - 1];
        this.finalDialogueCompleteAt = this.finalDialogueCue
            ? this.finalDialogueCue.start + this.precomputedCues[this.finalDialogueCue.id].totalDuration
            : INTRO_FLOW.totalDuration;

        // Speech bubble pool
        const poolSize = INTRO_ACTORS.bubble.pool || 2;
        this.bubblePool = Array.from({ length: poolSize }, () => new SpeechBubble(this));

        // Set initial camera focus and zoom at t = 0
        this.updateCamera(0);
        this.updatePictures(0);
        this.updateSwing(0);
        this.updateHero(0);

        // SKIP button container (top-right screen position)
        this.skipContainer = this.add.container(1205, 36)
            .setDepth(200)
            .setScrollFactor(0)
            .setVisible(false);

        const skipBg = this.add.rectangle(0, 0, 110, 36, 0x111018, 0.75)
            .setStrokeStyle(1.5, 0xf5d58a, 0.7);

        const skipLabel = INTRO_FLOW.skip?.buttonLabel || 'SKIP  >';
        const skipText = this.add.text(0, 0, skipLabel, {
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: '15px',
            color: '#f8efdf',
        }).setOrigin(0.5);

        skipBg.setInteractive({ useHandCursor: true });
        skipBg.on('pointerover', () => {
            if (!this.skipContainer || !this.skipContainer.active) {
                return;
            }
            skipBg.setFillStyle(0x3a2135, 0.9);
            skipBg.setStrokeStyle(2, 0xf5d58a, 1.0);
        });
        skipBg.on('pointerout', () => {
            if (!this.skipContainer || !this.skipContainer.active) {
                return;
            }
            skipBg.setFillStyle(0x111018, 0.75);
            skipBg.setStrokeStyle(1.5, 0xf5d58a, 0.7);
        });
        skipBg.on('pointerdown', () => this.finish());

        this.skipContainer.add([skipBg, skipText]);

        // ENTER key listener
        const skipKeyName = INTRO_FLOW.skip?.key || 'ENTER';
        this.enterKey = this.input.keyboard.addKey(skipKeyName);
        this.enterKey.on('down', () => this.finish());

        // F9 debug seek listener
        if (INTRO_DEBUG.enabled) {
            const seekKeyName = INTRO_DEBUG.seekKey || 'F9';
            this.seekKey = this.input.keyboard.addKey(seekKeyName);
            this.seekKey.on('down', () => {
                this.t += INTRO_DEBUG.seekStep || 5;
            });

            // Hero Placement Tool & Bubble Scale Controls
            this.bubbleScaleMultiplier = 1.0;
            this.placementToolActive = false;
            this.onPlacementKeyDown = (event) => {
                if (event.key === '-' || event.code === 'Minus' || event.code === 'NumpadSubtract') {
                    this.bubbleScaleMultiplier = Math.max(0.2, Number((this.bubbleScaleMultiplier - 0.05).toFixed(2)));
                    console.log(`[Bubble Scale Multiplier] ${this.bubbleScaleMultiplier}`);
                    return;
                }
                if (event.key === '=' || event.key === '+' || event.code === 'Equal' || event.code === 'NumpadAdd') {
                    this.bubbleScaleMultiplier = Math.min(3.0, Number((this.bubbleScaleMultiplier + 0.05).toFixed(2)));
                    console.log(`[Bubble Scale Multiplier] ${this.bubbleScaleMultiplier}`);
                    return;
                }
                if (event.code === 'KeyH') {
                    this.placementToolActive = !this.placementToolActive;
                    if (!this.placementToolActive) {
                        this.placementFacingOverride = null;
                    }
                    console.log(`[Hero Placement Tool] ${this.placementToolActive ? 'ENABLED' : 'DISABLED'}`);
                    return;
                }
                if (!this.placementToolActive) return;

                const pictureKey = this.getCurrentPictureKey();
                const entry = INTRO_ACTORS.hero.byImage[pictureKey];
                if (!entry) return;

                const step = event.shiftKey ? 5 : 1;
                if (event.code === 'ArrowLeft') {
                    entry.feetX -= step;
                    this.updateHero(this.t);
                } else if (event.code === 'ArrowRight') {
                    entry.feetX += step;
                    this.updateHero(this.t);
                } else if (event.code === 'ArrowUp') {
                    entry.feetY -= step;
                    this.updateHero(this.t);
                } else if (event.code === 'ArrowDown') {
                    entry.feetY += step;
                    this.updateHero(this.t);
                } else if (event.key === '[') {
                    entry.heightSrc = Math.max(10, Math.round(entry.heightSrc * 0.98));
                    this.updateHero(this.t);
                } else if (event.key === ']') {
                    entry.heightSrc = Math.round(entry.heightSrc * 1.02);
                    this.updateHero(this.t);
                } else if (event.code === 'KeyF') {
                    const currentFacing = this.getHeroFacing(this.t, pictureKey);
                    this.placementFacingOverride = currentFacing === 'left' ? 'right' : 'left';
                    this.updateHero(this.t);
                } else if (event.code === 'KeyP') {
                    console.log(`[Hero Placement: ${pictureKey}]`, {
                        feetX: entry.feetX,
                        feetY: entry.feetY,
                        heightSrc: entry.heightSrc,
                        facing: this.currentHeroFacing || entry.facing,
                        bubbleScaleMultiplier: this.bubbleScaleMultiplier,
                    });
                }
            };
            this.input.keyboard.on('keydown', this.onPlacementKeyDown);
        }

        if (INTRO_DEBUG.enabled && import.meta.env.DEV && this.spedUpCues.length > 0) {
            console.warn('[bubble] cues requiring pacing scale:', this.spedUpCues);
        }

        // Clean up on shutdown
        this.events.once('shutdown', this.cleanup, this);
    }

    getCurrentPictureKey() {
        const s1 = SHOTS[1]?.start ?? 8.8;
        const s2 = SHOTS[2]?.start ?? 45.0;
        if (this.t < s1) return 'intro-1';
        if (this.t < s2) return 'intro-2';
        return 'intro-3';
    }

    createSwingRig() {
        const swing = EFFECTS.swing;
        if (!swing) {
            return;
        }

        const textureKey = 'intro-swing-rig';
        if (!this.textures.exists(textureKey)) {
            const source = this.textures.get(swing.image).getSourceImage();
            const { x, y, w, h } = swing.crop;
            const texture = this.textures.createCanvas(textureKey, w, h);
            if (!texture) {
                throw new Error(`Unable to create intro swing texture: ${textureKey}`);
            }
            texture.getContext().drawImage(source, x, y, w, h, 0, 0, w, h);
            texture.refresh();
        }

        const { x, y, w, h } = swing.crop;
        const pivot = toWorld(swing.pivot.x, swing.pivot.y);
        this.swingSprite = this.add.image(pivot.x, pivot.y, textureKey)
            .setOrigin((swing.pivot.x - x) / w, (swing.pivot.y - y) / h)
            .setScale(IMG_SCALE)
            .setDepth(4)
            .setVisible(false);
    }

    updateSwing(t) {
        if (!this.swingSprite || !this.swingSprite.active) {
            return;
        }

        const swing = EFFECTS.swing;
        const marketEnd = SHOTS.find((shot) => shot.id === 'market')?.end ?? swing.keepSwingingUntil;
        const visible = t >= swing.startAt && t < marketEnd;
        this.swingSprite.setVisible(visible);
        if (!visible) {
            return;
        }

        const released = t >= (swing.afterLetGo?.at ?? Number.POSITIVE_INFINITY);
        const amplitude = released ? swing.afterLetGo.amplitudeDeg : swing.amplitudeDeg;
        const phase = ((t - swing.startAt) / swing.periodSec) * Math.PI * 2;
        this.swingSprite
            .setAlpha(this.shotImages.market.alpha)
            .setRotation(Math.sin(phase) * amplitude * (Math.PI / 180));
    }

    getHeroFacing(t, pictureKey) {
        const entry = INTRO_ACTORS.hero.byImage[pictureKey];
        if (!entry) return 'left';

        if (pictureKey !== 'intro-2') {
            return entry.initialFacing || 'left';
        }
        let facing = entry.initialFacing || 'left';
        for (const cue of DIALOGUE) {
            if (cue.shot !== 'market' || cue.start > t) {
                continue;
            }
            const speaker = (cue.speaker || '').toUpperCase().trim();
            const mappedFacing = entry.facingBySpeaker?.[speaker];
            if (mappedFacing) {
                facing = mappedFacing;
            }
        }
        return facing;
    }

    updateHero(t) {
        const pictureKey = this.getCurrentPictureKey();
        const entry = INTRO_ACTORS.hero.byImage[pictureKey];
        if (!entry || entry.kind !== 'image') {
            this.heroPicture.setVisible(false);
            this.heroShadow.setVisible(false);
            return;
        }

        const shotId = pictureKey === 'intro-2' ? 'market' : 'temple';
        const pictureAlpha = this.shotImages[shotId]?.alpha ?? 0;

        if (pictureAlpha <= 0) {
            this.heroPicture.setVisible(false);
            this.heroShadow.setVisible(false);
            return;
        }

        this.heroShadow.setVisible(true);
        const facing = this.placementToolActive && this.placementFacingOverride
            ? this.placementFacingOverride
            : this.getHeroFacing(t, pictureKey);
        this.currentHeroFacing = facing;

        // Position feet at (feetX, feetY) with subtle breathing offset
        const feetWorld = toWorld(entry.feetX, entry.feetY);
        const breathe = INTRO_ACTORS.hero.breathe;
        const breatheOffset = breathe ? breathe.px * Math.sin((2 * Math.PI * t) / breathe.period) : 0;
        const displayedHeight = entry.heightSrc * IMG_SCALE;

        if (this.heroPicture.texture.key !== entry.texture) {
            this.heroPicture.setTexture(entry.texture);
        }
        this.heroPicture
            .setVisible(true)
            .setAlpha(pictureAlpha)
            .setOrigin(facing === 'right' ? 1 - entry.feetAnchorFracX : entry.feetAnchorFracX, 1)
            .setFlipX(facing === 'right')
            .setTint(entry.tint ?? 0xffffff)
            .setPosition(feetWorld.x, feetWorld.y + breatheOffset)
            .setScale(displayedHeight / this.heroPicture.height);

        // Soft shadow ellipse under feet
        this.heroShadow.clear();
        const shadowConfig = entry.shadow || { alpha: 0.35, widthRatio: 0.55, heightRatio: 0.12 };
        const shadowAlpha = shadowConfig.alpha * pictureAlpha;
        this.heroShadow.fillStyle(0x000000, shadowAlpha);
        const sw = displayedHeight * (shadowConfig.widthRatio || 0.55);
        const sh = displayedHeight * (shadowConfig.heightRatio || 0.12);
        this.heroShadow.fillEllipse(feetWorld.x, feetWorld.y, sw, sh);
    }

    updateHeroEyes(t) {
        const effect = EFFECTS.heroEyes;
        const entry = INTRO_ACTORS.hero.byImage['intro-2'];
        const active = effect && entry.eyes && t >= effect.at && t < effect.at + effect.duration &&
            this.heroPicture?.visible && this.heroPicture.alpha > 0 &&
            this.getCurrentPictureKey() === 'intro-2';
        if (!active) {
            this.heroEyeGlow.setVisible(false);
            return;
        }

        const displayedHeight = entry.heightSrc * IMG_SCALE;
        const feet = toWorld(entry.feetX, entry.feetY);
        const breathe = INTRO_ACTORS.hero.breathe;
        const breatheOffset = breathe ? breathe.px * Math.sin((2 * Math.PI * t) / breathe.period) : 0;
        const direction = this.currentHeroFacing === 'right' ? 1 : -1;
        const eyeX = feet.x + direction * entry.eyes.dx * displayedHeight;
        const eyeY = feet.y + breatheOffset - entry.eyes.dy * displayedHeight;
        const progress = (t - effect.at) / effect.duration;
        const alpha = Math.max(0, 1 - progress);

        this.heroEyeGlow.clear();
        this.heroEyeGlow.fillStyle(effect.color, alpha);
        this.heroEyeGlow.fillCircle(eyeX, eyeY, effect.radius * IMG_SCALE);
        this.heroEyeGlow.setVisible(true);
    }

    updatePictures(t) {
        const shot1 = SHOTS[0];
        const shot2 = SHOTS[1];
        const shot3 = SHOTS[2];

        // Shot 1: village
        const img1 = this.shotImages.village;
        if (img1) {
            if (t < 0.0) {
                img1.setVisible(false).setAlpha(0);
            } else if (t < (shot1.fadeInFromBlack || 0.9)) {
                img1.setVisible(true).setAlpha(t / (shot1.fadeInFromBlack || 0.9));
            } else if (t < shot2.start + (shot2.crossfadeIn || 0.6)) {
                img1.setVisible(true).setAlpha(1);
            } else {
                img1.setVisible(false).setAlpha(0);
            }
        }

        // Shot 2: market
        const img2 = this.shotImages.market;
        if (img2) {
            const s2In = shot2.crossfadeIn || 0.6;
            const s3In = shot3.crossfadeIn || 0.6;
            if (t < shot2.start) {
                img2.setVisible(false).setAlpha(0);
            } else if (t < shot2.start + s2In) {
                img2.setVisible(true).setAlpha((t - shot2.start) / s2In);
            } else if (t < shot3.start + s3In) {
                img2.setVisible(true).setAlpha(1);
            } else {
                img2.setVisible(false).setAlpha(0);
            }
        }

        // Shot 3: temple
        const img3 = this.shotImages.temple;
        if (img3) {
            const s3In = shot3.crossfadeIn || 0.6;
            if (t < shot3.start) {
                img3.setVisible(false).setAlpha(0);
            } else if (t < shot3.start + s3In) {
                img3.setVisible(true).setAlpha((t - shot3.start) / s3In);
            } else {
                img3.setVisible(true).setAlpha(1);
            }
        }
    }

    updateCamera(t) {
        const state = this.getCameraState(t);
        this.cameras.main.setZoom(state.zoom);
        this.cameras.main.centerOn(state.centerX, state.centerY);
    }

    getCameraState(t) {
        const [village, market, temple] = SHOTS;
        let zoom;
        let camX;
        let camY;

        if (t < market.start) {
            const p = Math.max(0, Math.min(1, t / market.start));
            const ep = easeSineInOut(p);
            zoom = village.camera.from.zoom + (village.camera.to.zoom - village.camera.from.zoom) * ep;
            camX = village.camera.from.x + (village.camera.to.x - village.camera.from.x) * ep;
            camY = village.camera.from.y + (village.camera.to.y - village.camera.from.y) * ep;
        } else if (t < market.end) {
            const [settle, hold] = market.camera;
            if (t < settle.to) {
                const p = Math.max(0, Math.min(1, (t - settle.from) / (settle.to - settle.from)));
                const ep = easeSineInOut(p);
                zoom = village.camera.to.zoom + (settle.zoom - village.camera.to.zoom) * ep;
                camX = village.camera.to.x + (settle.x - village.camera.to.x) * ep;
                camY = village.camera.to.y + (settle.y - village.camera.to.y) * ep;
            } else {
                zoom = hold.zoom;
                camX = hold.x;
                camY = hold.y;
            }
        } else {
            const cam = temple.camera;
            if (t <= cam.startAt) {
                zoom = cam.from.zoom;
                camX = cam.from.x;
                camY = cam.from.y;
            } else if (t >= cam.endAt) {
                zoom = cam.to.zoom;
                camX = cam.to.x;
                camY = cam.to.y;
            } else {
                const p = Math.max(0, Math.min(1, (t - cam.startAt) / (cam.endAt - cam.startAt)));
                const ep = easeSineInOut(p);
                zoom = cam.from.zoom + (cam.to.zoom - cam.from.zoom) * ep;
                camX = cam.from.x + (cam.to.x - cam.from.x) * ep;
                camY = cam.from.y + (cam.to.y - cam.from.y) * ep;
            }
        }

        const center = toWorld(camX, camY);
        const viewWidth = this.cameras.main.width / zoom;
        const viewHeight = this.cameras.main.height / zoom;
        const centerX = Math.max(viewWidth / 2, Math.min(WORLD.width - viewWidth / 2, center.x));
        const centerY = Math.max(viewHeight / 2, Math.min(WORLD.height - viewHeight / 2, center.y));
        return {
            zoom,
            centerX,
            centerY,
            viewX: centerX - viewWidth / 2,
            viewY: centerY - viewHeight / 2,
        };
    }

    updateLetterbox(t) {
        if (!this.letterbox) {
            return;
        }
        const letterboxIn = EFFECTS.letterbox?.in || 0.6;
        const progress = Math.min(1, Math.max(0, t / letterboxIn));
        this.letterbox.setTimelineProgress('in', progress);
    }

    getScreenAnchor(cue, atTime = this.t) {
        const pictureKey = cue.shot === 'market' ? 'intro-2' : cue.shot === 'temple' ? 'intro-3' : 'intro-1';
        const speakerUpper = (cue.speaker || '').toUpperCase().trim();

        let canonical = speakerUpper;
        for (const [alias, target] of Object.entries(INTRO_ACTORS.speakerAliases || {})) {
            if (alias.toUpperCase() === speakerUpper) {
                canonical = target.toUpperCase();
                break;
            }
        }

        let anchorWorld = null;
        if (canonical === 'HERO') {
            const entry = INTRO_ACTORS.hero.byImage[pictureKey];
            if (!entry) return null;
            const headTopOffset = INTRO_ACTORS.hero.headTopOffsetSrc || 8;
            const breathe = INTRO_ACTORS.hero.breathe;
            const breatheOffset = breathe ? breathe.px * Math.sin((2 * Math.PI * atTime) / breathe.period) : 0;
            anchorWorld = toWorld(entry.feetX, entry.feetY - entry.heightSrc - headTopOffset);
            anchorWorld.y += breatheOffset;
        } else {
            const shotAnchors = INTRO_ACTORS.bubbleAnchors[pictureKey] || {};
            const anchorSrc = shotAnchors[canonical];
            if (!anchorSrc) return null;
            anchorWorld = toWorld(anchorSrc.x, anchorSrc.y);
        }

        const cameraState = this.getCameraState(atTime);

        return {
            x: (anchorWorld.x - cameraState.viewX) * cameraState.zoom,
            y: (anchorWorld.y - cameraState.viewY) * cameraState.zoom,
            zoom: cameraState.zoom,
        };
    }

    updateDialogueAndBubbles(t) {
        const activeCues = DIALOGUE.filter((cue) => t >= cue.start && t < cue.end);

        // Track cues being handled by speech bubbles
        const bubbleCues = [];
        let fallbackCue = null;

        for (const cue of activeCues) {
            const anchor = this.getScreenAnchor(cue);
            if (anchor) {
                bubbleCues.push({ cue, anchor });
            } else {
                fallbackCue = cue;
            }
        }

        // Update speech bubbles from pool
        this.bubblePool.forEach((bubble) => {
            if (bubble.cue) {
                const match = bubbleCues.find((b) => b.cue.id === bubble.cue.id);
                if (match) {
                    bubble.update(t, match.anchor.x, match.anchor.y);
                } else {
                    bubble.hide();
                }
            }
        });

        // Assign newly active bubble cues to available pool items
        bubbleCues.forEach(({ cue, anchor }) => {
            const existing = this.bubblePool.find((b) => b.cue && b.cue.id === cue.id);
            if (!existing) {
                const freeBubble = this.bubblePool.find((b) => !b.cue);
                if (freeBubble) {
                    freeBubble.start(cue, this.precomputedCues[cue.id]);
                    freeBubble.update(t, anchor.x, anchor.y);
                    if (INTRO_DEBUG.enabled && import.meta.env.DEV && !this.loggedBubbleCueIds.has(cue.id)) {
                        const startAnchor = this.getScreenAnchor(cue, cue.start);
                        const startLayout = startAnchor
                            ? freeBubble.update(cue.start, startAnchor.x, startAnchor.y, startAnchor.zoom)
                            : null;
                        if (startAnchor && startLayout) {
                            const facing = cue.shot === 'market'
                                ? this.getHeroFacing(cue.start, 'intro-2')
                                : this.getHeroFacing(cue.start, cue.shot === 'temple' ? 'intro-3' : 'intro-1');
                            console.log(
                                `[bubble] id=${cue.id} speaker=${cue.speaker} ` +
                                `anchorScreen=(${startAnchor.x.toFixed(1)},${startAnchor.y.toFixed(1)}) ` +
                                `zoom=${startAnchor.zoom.toFixed(2)} scale=${startLayout.scale.toFixed(2)} ` +
                                `panel=${startLayout.width.toFixed(1)}x${startLayout.height.toFixed(1)} ` +
                                `clamped=${startLayout.clamped} flipped=${startLayout.flipped} facing=${facing}`
                            );
                        }
                        this.loggedBubbleCueIds.add(cue.id);
                        freeBubble.update(t, anchor.x, anchor.y);
                    }
                }
            }
        });

        // Fallback bottom DialogueBox for unanchored cues (e.g., NARRATOR)
        if (fallbackCue) {
            const visibleChars = Math.floor((t - fallbackCue.start) * 1000 / TYPE_MS_PER_CHAR);
            const color = SPEAKER_COLORS[fallbackCue.speaker] ?? 0xf5d58a;
            this.dialogueBox.setLine(fallbackCue.speaker, fallbackCue.text, color, visibleChars);
            this.activeDialogueCue = fallbackCue;
        } else {
            if (this.activeDialogueCue) {
                const color = SPEAKER_COLORS[this.activeDialogueCue.speaker] ?? 0xf5d58a;
                this.dialogueBox.setLine(
                    this.activeDialogueCue.speaker,
                    this.activeDialogueCue.text,
                    color,
                    this.activeDialogueCue.text.length
                );
                this.dialogueBox.hide();
                this.activeDialogueCue = null;
            } else {
                this.dialogueBox.hide();
            }
        }
    }

    updateSkipButton(t) {
        if (!this.skipContainer || !this.skipContainer.active) {
            return;
        }

        const showAfter = INTRO_FLOW.skip?.showAfter ?? 1.0;
        if (t < showAfter) {
            this.skipContainer.setVisible(false);
            return;
        }

        this.skipContainer.setVisible(true);

        // Keep top-right position and 1:1 scale on screen regardless of camera zoom
        const zoom = this.cameras.main.zoom;
        const targetScreenX = 1205;
        const targetScreenY = 36;
        const cx = this.scale.width / 2;
        const cy = this.scale.height / 2;

        this.skipContainer.setPosition(
            (targetScreenX - cx) / zoom + cx,
            (targetScreenY - cy) / zoom + cy
        );
        this.skipContainer.setScale(1 / zoom);
    }

    update(time, delta) {
        if (this.isFinishing) {
            return;
        }

        const dt = delta / 1000;
        this.t += dt;

        if (this.t >= (INTRO_FLOW.totalDuration || 63.0)) {
            this.finish();
            return;
        }

        this.updatePictures(this.t);
        this.updateCamera(this.t);
        this.updateSwing(this.t);
        this.updateHero(this.t);
        this.updateHeroEyes(this.t);
        this.updateLetterbox(this.t);
        this.updateDialogueAndBubbles(this.t);
        this.updateSkipButton(this.t);

        if (this.finalDialogueCue && this.t >= this.finalDialogueCompleteAt) {
            this.finish(1.0);
        }
    }

    finish(fadeOutSeconds = INTRO_FLOW.skip?.fadeOut ?? 0.4) {
        if (this.isFinishing) {
            return;
        }
        this.isFinishing = true;

        this.sound.stopAll();

        if (this.dialogueBox) {
            this.dialogueBox.hide();
        }
        if (this.bubblePool) {
            this.bubblePool.forEach((b) => b.hide());
        }

        this.registry.set(INTRO_FLOW.registryFlag || 'introSeen', true);

        const fadeOutDuration = fadeOutSeconds * 1000;
        this.cameras.main.once('camerafadeoutcomplete', () => {
            if (!this.sys.isActive()) {
                return;
            }
            this.scene.start(INTRO_FLOW.next || 'TempleScene');
        });
        this.cameras.main.fadeOut(fadeOutDuration, 0, 0, 0);
    }

    cleanup() {
        if (this.enterKey) {
            this.enterKey.removeAllListeners();
        }
        if (this.seekKey) {
            this.seekKey.removeAllListeners();
        }
        if (this.onPlacementKeyDown) {
            this.input.keyboard.off('keydown', this.onPlacementKeyDown);
        }
        if (this.cameras?.main) {
            this.cameras.main.off('camerafadeoutcomplete');
        }
        if (this.dialogueBox) {
            this.dialogueBox.destroy();
        }
        if (this.letterbox) {
            this.letterbox.destroy();
        }
        if (this.bubblePool) {
            this.bubblePool.forEach((b) => b.destroy());
        }
        if (this.swingSprite && this.swingSprite.active) {
            this.swingSprite.destroy();
        }
        if (this.heroPicture && this.heroPicture.active) {
            this.heroPicture.destroy();
        }
        if (this.heroShadow && this.heroShadow.active) {
            this.heroShadow.destroy();
        }
        if (this.heroEyeGlow && this.heroEyeGlow.active) {
            this.heroEyeGlow.destroy();
        }
    }
}
