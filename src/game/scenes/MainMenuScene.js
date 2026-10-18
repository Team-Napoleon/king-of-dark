import { Input, Scene } from 'phaser';
import { DEBUG_KEYS } from '../config/animationData';
import { DIALOGUE_FONT } from '../config/fonts';
import { addDiamond, addDivider, addEmbers, addVignette } from '../ui/MenuFx';

const GOLD = '#f7d7a5';
const GOLD_HEX = 0xf5d58a;
const PURPLE_HEX = 0x5a2d8f;

const CONTROLS = [
    ['A / D', 'Move'],
    ['SPACE / UP', 'Jump'],
    ['J', 'Punch'],
    ['K', 'Combo'],
    ['U', 'Kick'],
    ['I', 'Sword'],
    ['O', 'Fire'],
    ['E', 'Enter portal'],
];

export default class MainMenuScene extends Scene {
    constructor() {
        super('MainMenuScene');
    }

    create() {
        const { width, height } = this.scale;
        this.isStarting = false;
        this.controlsOpen = false;
        this.selected = 0;

        if (DEBUG_KEYS) {
            this.debugDarkWorld = this.input.keyboard.addKey('F2');
            this.debugDarkness = this.input.keyboard.addKey('F3');
            this.input.keyboard.addCapture('F2,F3');
        }

        this.cameras.main.setBackgroundColor('#090b11');
        this.cameras.main.fadeIn(700, 0, 0, 0);

        // ---- animated background + atmosphere ----
        this.add.sprite(width / 2, height / 2, 'bg-menu-anim')
            .setScale(Math.max(width / 672, height / 384))
            .setDepth(-10)
            .play('bg-menu-anim');
        // darken the middle a little so the title and buttons always read well
        this.add.rectangle(width / 2, height / 2, width, height, 0x05060b, 0.22).setDepth(-9);
        addEmbers(this, { count: 46, depth: 5 });
        addVignette(this, { depth: 40, alpha: 0.07 });

        this.buildTitle(width);
        this.buildMenu(width);
        this.buildFooter(width, height);
        this.buildControlsPanel(width, height);
        this.bindKeys();
        this.refreshSelection(true);
    }

    buildTitle(width) {
        const titleStyle = {
            fontFamily: DIALOGUE_FONT,
            fontSize: '84px',
            fontStyle: 'bold',
            color: GOLD,
            letterSpacing: 6,
        };

        const topRune = addDiamond(this, width / 2, 92, 12, GOLD_HEX, false).setAlpha(0);

        // purple glow copy that slowly breathes behind the title
        this.titleGlow = this.add.text(width / 2, 170, 'KING OF DARK', {
            ...titleStyle,
            color: '#a76bff',
            shadow: { offsetX: 0, offsetY: 0, color: '#a76bff', blur: 36, stroke: true, fill: true },
        }).setOrigin(0.5).setAlpha(0).setDepth(10);

        this.title = this.add.text(width / 2, 170, 'KING OF DARK', {
            ...titleStyle,
            shadow: { offsetX: 4, offsetY: 4, color: '#000000', blur: 0, stroke: false, fill: true },
        }).setOrigin(0.5).setAlpha(0).setDepth(11);

        this.subtitle = this.add.text(width / 2, 244, 'AWAKEN THE TEMPLE.  SURVIVE THE MEMORY.', {
            fontFamily: DIALOGUE_FONT,
            fontSize: '20px',
            color: '#c9c3e0',
            letterSpacing: 4,
            shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 0, stroke: false, fill: true },
        }).setOrigin(0.5).setAlpha(0).setDepth(11);

        const divider = addDivider(this, width / 2, 284, 460);
        divider.forEach((piece) => piece.setAlpha(0).setDepth(11));

        this.tweens.add({ targets: topRune, alpha: 1, angle: 225, duration: 1200, ease: 'Cubic.easeOut' });
        this.tweens.add({
            targets: [this.title, this.titleGlow],
            y: { from: 140, to: 170 },
            duration: 900,
            ease: 'Cubic.easeOut',
        });
        this.tweens.add({ targets: this.title, alpha: 1, duration: 900, ease: 'Sine.easeOut' });
        this.tweens.add({
            targets: this.titleGlow,
            alpha: { from: 0, to: 0.7 },
            duration: 1800,
            delay: 400,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });
        this.tweens.add({ targets: this.subtitle, alpha: 1, duration: 800, delay: 600 });
        divider.forEach((piece) => {
            const target = piece.fillAlpha > 0 ? 0.85 : 1;
            this.tweens.add({ targets: piece, alpha: target, duration: 700, delay: 800 });
        });
    }

    buildMenu(width) {
        const entries = [
            { label: 'PLAY', action: () => this.startGame() },
            { label: 'CONTROLS', action: () => this.toggleControls(true) },
        ];
        this.items = entries.map((entry, index) => {
            const y = 392 + index * 76;
            const bar = this.add.rectangle(width / 2, y, 380, 54, PURPLE_HEX, 0)
                .setStrokeStyle(2, GOLD_HEX, 0)
                .setDepth(11);
            const text = this.add.text(width / 2, y, entry.label, {
                fontFamily: DIALOGUE_FONT,
                fontSize: '38px',
                fontStyle: 'bold',
                color: '#b9b2cf',
                letterSpacing: 5,
                shadow: { offsetX: 3, offsetY: 3, color: '#000000', blur: 0, stroke: false, fill: true },
            }).setOrigin(0.5).setDepth(12);
            const markerLeft = addDiamond(this, width / 2 - 168, y, 12, GOLD_HEX, true).setDepth(12).setAlpha(0);
            const markerRight = addDiamond(this, width / 2 + 168, y, 12, GOLD_HEX, true).setDepth(12).setAlpha(0);

            [bar, text].forEach((object) => object.setAlpha(0));
            this.tweens.add({ targets: [text], alpha: 1, duration: 600, delay: 1000 + index * 160 });
            this.tweens.add({ targets: [bar], alpha: 1, duration: 600, delay: 1000 + index * 160 });

            bar.setInteractive({ useHandCursor: true });
            bar.on('pointerover', () => {
                if (this.controlsOpen || this.isStarting) {
                    return;
                }
                this.selected = index;
                this.refreshSelection();
            });
            bar.on('pointerdown', () => {
                if (this.controlsOpen || this.isStarting) {
                    return;
                }
                this.selected = index;
                this.refreshSelection();
                entry.action();
            });
            return { ...entry, bar, text, markerLeft, markerRight };
        });
    }

    buildFooter(width, height) {
        this.add.text(32, height - 30, "NASCON '26", {
            fontFamily: DIALOGUE_FONT,
            fontSize: '16px',
            color: '#7d7897',
            letterSpacing: 3,
        }).setOrigin(0, 0.5).setDepth(12);

        this.hint = this.add.text(width / 2, height - 30, 'W / S  or  UP / DOWN   -   ENTER to select', {
            fontFamily: DIALOGUE_FONT,
            fontSize: '16px',
            color: '#9d97b8',
            letterSpacing: 2,
        }).setOrigin(0.5).setDepth(12).setAlpha(0);
        this.tweens.add({
            targets: this.hint,
            alpha: { from: 0.25, to: 0.9 },
            duration: 1400,
            delay: 1400,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });
    }

    buildControlsPanel(width, height) {
        const panelW = 640;
        const panelH = 510;
        const dim = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.78)
            .setInteractive();
        const panel = this.add.rectangle(width / 2, height / 2, panelW, panelH, 0x0d0b14, 0.97)
            .setStrokeStyle(3, GOLD_HEX, 0.9);
        const inner = this.add.rectangle(width / 2, height / 2, panelW - 16, panelH - 16, 0x000000, 0)
            .setStrokeStyle(1, GOLD_HEX, 0.35);
        const heading = this.add.text(width / 2, height / 2 - panelH / 2 + 46, 'CONTROLS', {
            fontFamily: DIALOGUE_FONT,
            fontSize: '36px',
            fontStyle: 'bold',
            color: GOLD,
            letterSpacing: 6,
            shadow: { offsetX: 3, offsetY: 3, color: '#000000', blur: 0, stroke: false, fill: true },
        }).setOrigin(0.5);
        const divider = addDivider(this, width / 2, height / 2 - panelH / 2 + 82, 360);

        const parts = [dim, panel, inner, heading, ...divider];
        CONTROLS.forEach(([keys, label], index) => {
            const y = height / 2 - panelH / 2 + 134 + index * 38;
            parts.push(
                this.add.text(width / 2 - 36, y, keys, {
                    fontFamily: DIALOGUE_FONT,
                    fontSize: '24px',
                    fontStyle: 'bold',
                    color: '#f5d58a',
                }).setOrigin(1, 0.5),
                this.add.text(width / 2 + 36, y, label, {
                    fontFamily: DIALOGUE_FONT,
                    fontSize: '24px',
                    color: '#e8e3f5',
                }).setOrigin(0, 0.5),
            );
        });
        parts.push(
            this.add.text(width / 2, height / 2 + panelH / 2 - 34, 'ESC  or  click to close', {
                fontFamily: DIALOGUE_FONT,
                fontSize: '16px',
                color: '#9d97b8',
                letterSpacing: 2,
            }).setOrigin(0.5),
        );

        dim.on('pointerdown', () => this.toggleControls(false));
        this.controlsPanel = this.add.container(0, 0, parts).setDepth(100).setVisible(false).setAlpha(0);
    }

    bindKeys() {
        const keyboard = this.input.keyboard;
        this.keysNav = keyboard.addKeys({
            up: 'UP', down: 'DOWN', w: 'W', s: 'S',
            enter: 'ENTER', space: 'SPACE', esc: 'ESC',
        });
    }

    refreshSelection(instant = false) {
        this.items.forEach((item, index) => {
            const active = index === this.selected;
            item.text.setColor(active ? '#fff3d6' : '#b9b2cf');
            item.bar.setFillStyle(PURPLE_HEX, active ? 0.45 : 0);
            item.bar.setStrokeStyle(2, GOLD_HEX, active ? 0.75 : 0);
            this.tweens.add({
                targets: item.text,
                scale: active ? 1.12 : 1,
                duration: instant ? 0 : 140,
                ease: 'Back.easeOut',
            });
            this.tweens.add({
                targets: [item.markerLeft, item.markerRight],
                alpha: active ? 1 : 0,
                duration: instant ? 0 : 140,
            });
        });
    }

    moveSelection(step) {
        this.selected = (this.selected + step + this.items.length) % this.items.length;
        this.refreshSelection();
    }

    toggleControls(open) {
        if (this.isStarting) {
            return;
        }
        this.controlsOpen = open;
        if (open) {
            this.controlsPanel.setVisible(true);
        }
        this.tweens.add({
            targets: this.controlsPanel,
            alpha: open ? 1 : 0,
            duration: 160,
            onComplete: () => {
                if (!open && this.controlsPanel && this.controlsPanel.active) {
                    this.controlsPanel.setVisible(false);
                }
            },
        });
    }

    startGame() {
        if (this.isStarting || !this.sys.isActive()) {
            return;
        }
        this.isStarting = true;
        this.registry.set('reachedArena', false);
        this.registry.set('bossIntroSeen', false);
        this.registry.set('bossDefeated', false);
        this.cameras.main.flash(260, 255, 214, 150, true);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            if (!this.sys.isActive()) {
                return;
            }
            this.scene.start('IntroScene');
        });
        this.cameras.main.fadeOut(520, 0, 0, 0);
    }

    update() {
        if (this.isStarting || !this.sys.isActive()) {
            return;
        }
        const keys = this.keysNav;
        if (this.controlsOpen) {
            if (Input.Keyboard.JustDown(keys.esc) || Input.Keyboard.JustDown(keys.enter)) {
                this.toggleControls(false);
            }
            return;
        }
        if (Input.Keyboard.JustDown(keys.up) || Input.Keyboard.JustDown(keys.w)) {
            this.moveSelection(-1);
        } else if (Input.Keyboard.JustDown(keys.down) || Input.Keyboard.JustDown(keys.s)) {
            this.moveSelection(1);
        } else if (Input.Keyboard.JustDown(keys.enter) || Input.Keyboard.JustDown(keys.space)) {
            this.items[this.selected].action();
        }
        if (DEBUG_KEYS) {
            if (Input.Keyboard.JustDown(this.debugDarkWorld)) {
                this.isStarting = true;
                this.scene.start('DarkWorldScene', { part: 'village' });
            } else if (Input.Keyboard.JustDown(this.debugDarkness)) {
                this.isStarting = true;
                this.scene.start('DarknessScene');
            }
        }
    }
}
