import { Scene } from 'phaser';
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
import { showFrame, SHEETS } from '../config/animationData';
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

        // Hero visual and shadow (single instance moved between shots)
        this.heroShadow = this.add.graphics()
            .setDepth(9)
            .setVisible(false);

        this.heroSprite = this.add.sprite(0, 0, 'hero-walk', 0)
            .setDepth(10)
            .setVisible(false);

        // Pose hero once with showFrame (standing still: 'hero-walk', frame 0, facing left: -1)
        showFrame(this.heroSprite, 'hero-walk', 0, -1);

        // Letterbox bars helper
        this.letterbox = new Letterbox(this);
        this.letterbox.setTimelineProgress('in', 0);

        // Timed DialogueBox fallback (for unanchored lines like Narrator)
        this.dialogueBox = new DialogueBox(this);
        this.activeDialogueCue = null;

        // Build Street Scene (Shot 2) camera schedule from cameraFrames and DIALOGUE cues
        this.initStreetCameraSchedule();

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

        // Speech bubble pool
        const poolSize = INTRO_ACTORS.bubble.pool || 2;
        this.bubblePool = Array.from({ length: poolSize }, () => new SpeechBubble(this));

        // Set initial camera focus and zoom at t = 0
        this.updateCamera(0);
        this.updatePictures(0);
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

            // Hero Placement Tool (H toggles, arrows move, [ / ] scale, F flips, P prints)
            this.placementToolActive = false;
            this.onPlacementKeyDown = (event) => {
                if (event.code === 'KeyH') {
                    this.placementToolActive = !this.placementToolActive;
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
                    entry.facing = entry.facing === 'left' ? 'right' : 'left';
                    this.updateHero(this.t);
                } else if (event.code === 'KeyP') {
                    console.log(`[Hero Placement: ${pictureKey}]`, {
                        feetX: entry.feetX,
                        feetY: entry.feetY,
                        heightSrc: entry.heightSrc,
                        facing: entry.facing,
                    });
                }
            };
            this.input.keyboard.on('keydown', this.onPlacementKeyDown);
        }

        // Clean up on shutdown
        this.events.once('shutdown', this.cleanup, this);
    }

    initStreetCameraSchedule() {
        const config = INTRO_ACTORS.cameraFrames?.['intro-2'];
        this.streetCameraMoves = [];
        this.streetCameraConfig = config;

        if (!config) {
            return;
        }

        const streetCues = DIALOGUE.filter((cue) => cue.shot === 'market');
        const getSpeakerTargetFrame = (speaker, current) => {
            const s = (speaker || '').toUpperCase().trim();
            if (s === 'MOTHER' || s === 'MOM' || s === 'MA') return 'B';
            if (s === 'CUSTOMER' || s === 'BUYER' || s === 'SHOPKEEPER' || s === 'SHOP' || s === 'SHOP KEEPER') return 'A';
            return current; // HERO keeps active frame
        };

        let currentFrame = config.startFrame || 'A';
        for (let i = 0; i < streetCues.length; i++) {
            const cue = streetCues[i];
            const targetFrame = getSpeakerTargetFrame(cue.speaker, currentFrame);
            if (targetFrame !== currentFrame) {
                const fromFrame = currentFrame;
                const toFrame = targetFrame;
                const targetArrive = cue.start + (config.arriveAfterCueStart ?? 0.2);
                const prevCueStart = i > 0 ? streetCues[i - 1].start : 6.0;

                let duration = config.moveSeconds ?? 1.2;
                let startTime = targetArrive - duration;
                let shortened = false;
                const originalDuration = duration;

                if (startTime < prevCueStart) {
                    duration = targetArrive - prevCueStart;
                    startTime = prevCueStart;
                    shortened = true;
                }

                this.streetCameraMoves.push({
                    fromFrame,
                    toFrame,
                    fromConfig: config[fromFrame],
                    toConfig: config[toFrame],
                    startTime,
                    endTime: targetArrive,
                    duration,
                    shortened,
                    originalDuration,
                    triggeredByCue: cue,
                });

                currentFrame = targetFrame;
            }
        }
    }

    getCurrentPictureKey() {
        if (this.t < 6.0) return 'intro-1';
        if (this.t < 21.0) return 'intro-2';
        return 'intro-3';
    }

    updateHero(t) {
        if (!this.heroSprite || !this.heroSprite.active) {
            return;
        }

        const pictureKey = this.getCurrentPictureKey();
        const entry = INTRO_ACTORS.hero.byImage[pictureKey];

        if (!entry) {
            this.heroSprite.setVisible(false);
            this.heroShadow.setVisible(false);
            return;
        }

        // Alpha from picture
        let pictureAlpha = 1.0;
        if (pictureKey === 'intro-2' && this.shotImages.market) {
            pictureAlpha = this.shotImages.market.alpha;
        } else if (pictureKey === 'intro-3' && this.shotImages.temple) {
            pictureAlpha = this.shotImages.temple.alpha;
        }

        if (pictureAlpha <= 0) {
            this.heroSprite.setVisible(false);
            this.heroShadow.setVisible(false);
            return;
        }

        this.heroSprite.setVisible(true);
        this.heroShadow.setVisible(true);
        this.heroSprite.setAlpha(pictureAlpha);

        // Facing and origin
        const sheet = SHEETS['hero-walk'];
        const isFacingRight = entry.facing === 'right';
        this.heroSprite.setFlipX(isFacingRight);

        const ox = sheet.anchorX / sheet.frameWidth;
        this.heroSprite.setOrigin(isFacingRight ? 1 - ox : ox, sheet.anchorY / sheet.frameHeight);

        // Scale: standing height is heightSrc * IMG_SCALE world pixels
        const standingHeightWorld = entry.heightSrc * IMG_SCALE;
        const scale = standingHeightWorld / sheet.figureHeight;
        this.heroSprite.setScale(scale);

        if (entry.tint !== undefined) {
            this.heroSprite.setTint(entry.tint);
        }

        // Feet position and idle breathing
        const feetWorld = toWorld(entry.feetX, entry.feetY);
        const breathe = INTRO_ACTORS.hero.breathe;
        const breatheOffset = breathe ? breathe.px * Math.sin((2 * Math.PI * t) / breathe.period) : 0;

        this.heroSprite.setPosition(feetWorld.x, feetWorld.y + breatheOffset);

        // Shadow ellipse
        this.heroShadow.clear();
        const shadowConfig = entry.shadow || { alpha: 0.35, widthRatio: 0.55, heightRatio: 0.12 };
        const shadowAlpha = shadowConfig.alpha * pictureAlpha;
        this.heroShadow.fillStyle(0x000000, shadowAlpha);
        const sw = standingHeightWorld * (shadowConfig.widthRatio || 0.55);
        const sh = standingHeightWorld * (shadowConfig.heightRatio || 0.12);
        this.heroShadow.fillEllipse(feetWorld.x, feetWorld.y, sw, sh);
    }

    updatePictures(t) {
        // Shot 1: village (0.0 to 6.3, fadeInFromBlack: 0.9)
        const img1 = this.shotImages.village;
        if (img1) {
            if (t < 0.0) {
                img1.setVisible(false).setAlpha(0);
            } else if (t < 0.9) {
                img1.setVisible(true).setAlpha(t / 0.9);
            } else if (t < 6.6) {
                img1.setVisible(true).setAlpha(1);
            } else {
                img1.setVisible(false).setAlpha(0);
            }
        }

        // Shot 2: market (6.0 to 21.3, crossfadeIn: 0.6)
        const img2 = this.shotImages.market;
        if (img2) {
            if (t < 6.0) {
                img2.setVisible(false).setAlpha(0);
            } else if (t < 6.6) {
                img2.setVisible(true).setAlpha((t - 6.0) / 0.6);
            } else if (t < 21.6) {
                img2.setVisible(true).setAlpha(1);
            } else {
                img2.setVisible(false).setAlpha(0);
            }
        }

        // Shot 3: temple (21.0 to 30.0, crossfadeIn: 0.6)
        const img3 = this.shotImages.temple;
        if (img3) {
            if (t < 21.0) {
                img3.setVisible(false).setAlpha(0);
            } else if (t < 21.6) {
                img3.setVisible(true).setAlpha((t - 21.0) / 0.6);
            } else {
                img3.setVisible(true).setAlpha(1);
            }
        }
    }

    updateCamera(t) {
        let zoom = 1.0;
        let camX = 672;
        let camY = 384;

        if (t < 6.0) {
            // Shot 1: village camera zoom/focus (unchanged)
            const shot = SHOTS[0];
            const p = Math.max(0, Math.min(1, t / 6.0));
            const ep = easeSineInOut(p);
            zoom = shot.camera.from.zoom + (shot.camera.to.zoom - shot.camera.from.zoom) * ep;
            camX = shot.camera.from.x + (shot.camera.to.x - shot.camera.from.x) * ep;
            camY = shot.camera.from.y + (shot.camera.to.y - shot.camera.from.y) * ep;
        } else if (t < 21.0) {
            // Shot 2: market street scene camera scheduled from cameraFrames['intro-2']
            const config = this.streetCameraConfig;
            if (config) {
                let currentZoom = config[config.startFrame || 'A'].zoom;
                let currentX = config[config.startFrame || 'A'].x;
                let currentY = config[config.startFrame || 'A'].y;

                for (const move of this.streetCameraMoves) {
                    if (t < move.startTime) {
                        currentZoom = move.fromConfig.zoom;
                        currentX = move.fromConfig.x;
                        currentY = move.fromConfig.y;
                        break;
                    } else if (t <= move.endTime) {
                        const p = (t - move.startTime) / move.duration;
                        const ep = easeSineInOut(p);
                        currentZoom = move.fromConfig.zoom + (move.toConfig.zoom - move.fromConfig.zoom) * ep;
                        currentX = move.fromConfig.x + (move.toConfig.x - move.fromConfig.x) * ep;
                        currentY = move.fromConfig.y + (move.toConfig.y - move.fromConfig.y) * ep;
                        break;
                    } else {
                        currentZoom = move.toConfig.zoom;
                        currentX = move.toConfig.x;
                        currentY = move.toConfig.y;
                    }
                }
                zoom = currentZoom;
                camX = currentX;
                camY = currentY;
            }
        } else {
            // Shot 3: temple camera (unchanged)
            const shot = SHOTS[2];
            const cam = shot.camera;
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

        const worldPos = toWorld(camX, camY);
        this.cameras.main.setZoom(zoom);
        this.cameras.main.centerOn(worldPos.x, worldPos.y);
    }

    updateLetterbox(t) {
        if (!this.letterbox) {
            return;
        }
        const letterboxIn = EFFECTS.letterbox?.in || 0.6;
        const progress = Math.min(1, Math.max(0, t / letterboxIn));
        this.letterbox.setTimelineProgress('in', progress);
    }

    getScreenAnchor(cue) {
        const pictureKey = this.getCurrentPictureKey();
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
            anchorWorld = toWorld(entry.feetX, entry.feetY - entry.heightSrc - headTopOffset);
        } else {
            const shotAnchors = INTRO_ACTORS.bubbleAnchors[pictureKey] || {};
            const anchorSrc = shotAnchors[canonical];
            if (!anchorSrc) return null;
            anchorWorld = toWorld(anchorSrc.x, anchorSrc.y);
        }

        const cam = this.cameras.main;
        const zoom = cam.zoom;
        const vwx = cam.worldView && cam.worldView.width > 0
            ? cam.worldView.x
            : (cam.midPoint.x - (cam.width / zoom) / 2);
        const vwy = cam.worldView && cam.worldView.height > 0
            ? cam.worldView.y
            : (cam.midPoint.y - (cam.height / zoom) / 2);

        return {
            x: (anchorWorld.x - vwx) * zoom,
            y: (anchorWorld.y - vwy) * zoom,
        };
    }

    updateDialogueAndBubbles(t) {
        // Find active and overlapping fading cues
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

        if (this.t >= (INTRO_FLOW.totalDuration || 30.0)) {
            this.finish();
            return;
        }

        this.updatePictures(this.t);
        this.updateHero(this.t);
        this.updateCamera(this.t);
        this.updateLetterbox(this.t);
        this.updateDialogueAndBubbles(this.t);
        this.updateSkipButton(this.t);
    }

    finish() {
        if (this.isFinishing) {
            return;
        }
        this.isFinishing = true;

        if (this.dialogueBox) {
            this.dialogueBox.hide();
        }
        if (this.bubblePool) {
            this.bubblePool.forEach((b) => b.hide());
        }

        this.registry.set(INTRO_FLOW.registryFlag || 'introSeen', true);

        const fadeOutDuration = (INTRO_FLOW.skip?.fadeOut || 0.4) * 1000;
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
        if (this.heroSprite && this.heroSprite.active) {
            this.heroSprite.destroy();
        }
        if (this.heroShadow && this.heroShadow.active) {
            this.heroShadow.destroy();
        }
    }
}
