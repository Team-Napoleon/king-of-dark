import { Input, Scene } from 'phaser';
import { DARKNESS_SCENE } from '../config/actOneData';
import { createRevealSchedule } from '../ui/SpeechBubble';

const WIDTH = 1280;
const HEIGHT = 720;
const MASTER_TIMEOUT = 40;

export default class DarknessScene extends Scene {
    constructor() {
        super('DarknessScene');
    }

    create() {
        this.createScene();
    }

    createScene() {
        this.cameras.main.resetFX();
        this.cameras.main.setBackgroundColor('#000000');
        this.background = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x000000)
            .setScrollFactor(0)
            .setDepth(0);
        this.narration = this.add.text(WIDTH / 2, DARKNESS_SCENE.y, '', {
            fontFamily: 'Georgia, serif',
            fontSize: `${DARKNESS_SCENE.fontSize}px`,
            color: DARKNESS_SCENE.textColor,
            align: 'center',
            wordWrap: { width: WIDTH - 160, useAdvancedWrap: true },
            lineSpacing: 8,
        }).setOrigin(0.5).setScrollFactor(0).setDepth(2).setAlpha(0);
        this.enterKey = this.input.keyboard.addKey('ENTER');
        this.lineStates = DARKNESS_SCENE.lines.map((line) => {
            const schedule = createRevealSchedule(line.text, DARKNESS_SCENE.pacing, { pauseAfterLast: false });
            return {
                text: line.text,
                prefixes: Array.from({ length: line.text.length + 1 }, (_unused, index) => line.text.slice(0, index)),
                revealTimes: schedule.revealTimes,
                typingDuration: schedule.totalDuration,
                elapsed: 0,
                duration: schedule.totalDuration +
                    DARKNESS_SCENE.pacing.hold +
                    DARKNESS_SCENE.pacing.fadeOut +
                    DARKNESS_SCENE.pacing.gap,
            };
        });
        this.lineIndex = 0;
        this.masterElapsed = 0;
        this.transitionStarted = false;
        this.events.once('shutdown', () => {
            this.narration = null;
            this.lineStates = [];
        });
        this.showLine(0);
    }

    showLine(index) {
        this.lineIndex = index;
        const line = this.lineStates[index];
        line.elapsed = 0;
        this.narration.setText('').setAlpha(0);
    }

    update(_time, delta) {
        this.updateScene(delta);
    }

    updateScene(delta) {
        if (this.transitionStarted) {
            return;
        }
        const seconds = Math.max(0, delta / 1000);
        this.masterElapsed += seconds;
        if (Input.Keyboard.JustDown(this.enterKey) || this.masterElapsed >= MASTER_TIMEOUT) {
            this.startNextScene();
            return;
        }

        if (this.lineIndex >= this.lineStates.length) {
            this.startNextScene();
            return;
        }

        const line = this.lineStates[this.lineIndex];
        line.elapsed += seconds;
        let visibleCount = 0;
        while (visibleCount < line.revealTimes.length && line.revealTimes[visibleCount] <= line.elapsed) {
            visibleCount += 1;
        }
        this.narration.setText(line.prefixes[visibleCount]);

        const pacing = DARKNESS_SCENE.pacing;
        const fadeOutStart = line.typingDuration + pacing.hold;
        let alpha = pacing.fadeIn > 0 ? Math.min(1, line.elapsed / pacing.fadeIn) : 1;
        if (line.elapsed >= fadeOutStart) {
            alpha = pacing.fadeOut > 0
                ? Math.max(0, 1 - (line.elapsed - fadeOutStart) / pacing.fadeOut)
                : 0;
        }
        this.narration.setAlpha(alpha);
        if (line.elapsed >= line.duration) {
            const nextIndex = this.lineIndex + 1;
            if (nextIndex >= this.lineStates.length) {
                this.startNextScene();
            } else {
                this.showLine(nextIndex);
            }
        }
    }

    startNextScene() {
        if (this.transitionStarted || !this.sys.isActive()) {
            return;
        }
        this.transitionStarted = true;
        this.registry.set(DARKNESS_SCENE.registryFlag, true);
        const next = DARKNESS_SCENE.next;
        if (this.game.scene.keys[next]) {
            if (import.meta.env.DEV) console.log('[flow] DarknessScene -> DarkWorldScene');
            this.scene.start(next, { part: 'village' });
        } else {
            console.warn(`[DarknessScene] Scene "${next}" is not registered; returning to MainMenuScene.`);
            this.scene.start('MainMenuScene');
        }
    }
}
