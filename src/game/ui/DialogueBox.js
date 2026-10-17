export default class DialogueBox {
    constructor(scene) {
        this.scene = scene;
        this.lines = [];
        this.lineIndex = 0;
        this.characterIndex = 0;
        this.characterTimer = 0;
        this.holdTimer = 0;
        this.onComplete = null;
        this.isShowing = false;
        this.completed = false;

        this.panel = scene.add.rectangle(640, 650, 1000, 130, 0x111018, 0.96)
            .setStrokeStyle(2, 0x7e5a40)
            .setScrollFactor(0)
            .setDepth(110)
            .setVisible(false);
        this.speakerText = scene.add.text(160, 594, '', {
            fontFamily: 'Arial Black',
            fontSize: '18px',
            color: '#f5d58a',
            stroke: '#000000',
            strokeThickness: 4,
        }).setScrollFactor(0).setDepth(111).setVisible(false);
        this.lineText = scene.add.text(160, 626, '', {
            fontFamily: 'Arial',
            fontSize: '20px',
            color: '#f5ead8',
            stroke: '#000000',
            strokeThickness: 4,
            wordWrap: { width: 920 },
        }).setScrollFactor(0).setDepth(111).setVisible(false);

        scene.events.once('shutdown', () => {
            if (!this.panel || !this.panel.active) {
                return;
            }
            this.destroy();
        });
    }

    show(lines, { onComplete } = {}) {
        if (!this.panel || !this.panel.active) {
            return;
        }
        this.lines = Array.isArray(lines) ? lines : [];
        this.lineIndex = 0;
        this.characterIndex = 0;
        this.characterTimer = 0;
        this.holdTimer = 0;
        this.onComplete = typeof onComplete === 'function' ? onComplete : null;
        this.completed = false;
        this.isShowing = this.lines.length > 0;
        [this.panel, this.speakerText, this.lineText].forEach((object) => object.setVisible(this.isShowing));
        if (!this.isShowing) {
            this.complete();
            return;
        }
        this.renderLine();
    }

    update(delta) {
        if (!this.isShowing || !this.lineText || !this.lineText.active) {
            return;
        }
        if (this.holdTimer > 0) {
            this.holdTimer = Math.max(0, this.holdTimer - delta);
            if (this.holdTimer === 0) {
                this.lineIndex += 1;
                if (this.lineIndex >= this.lines.length) {
                    this.complete();
                } else {
                    this.characterIndex = 0;
                    this.characterTimer = 0;
                    this.renderLine();
                }
            }
            return;
        }

        const line = this.lines[this.lineIndex];
        if (!line) {
            this.complete();
            return;
        }
        const charMs = line.charMs ?? 30;
        this.characterTimer += delta;
        while (this.characterTimer >= charMs && this.characterIndex < line.text.length) {
            this.characterTimer -= charMs;
            this.characterIndex += 1;
            this.lineText.setText(line.text.slice(0, this.characterIndex));
        }
        if (this.characterIndex >= line.text.length) {
            this.holdTimer = line.hold ?? 1200;
        }
    }

    renderLine() {
        const line = this.lines[this.lineIndex];
        if (!line || !this.speakerText || !this.lineText) {
            return;
        }
        this.speakerText.setText(line.speaker || '');
        this.lineText.setText('');
    }

    skip() {
        if (!this.isShowing || this.completed) {
            return;
        }
        const lastLine = this.lines[this.lines.length - 1];
        if (lastLine && this.speakerText && this.lineText) {
            this.speakerText.setText(lastLine.speaker || '');
            this.lineText.setText(lastLine.text || '');
        }
        this.complete();
    }

    complete() {
        if (this.completed) {
            return;
        }
        this.completed = true;
        this.isShowing = false;
        [this.panel, this.speakerText, this.lineText].forEach((object) => {
            if (object && object.active) {
                object.setVisible(false);
            }
        });
        const callback = this.onComplete;
        this.onComplete = null;
        if (callback && this.scene && this.scene.sys.isActive()) {
            callback();
        }
    }

    setLine(speaker, text, color, visibleChars) {
        if (!this.panel || !this.panel.active) {
            return;
        }
        this.isShowing = true;
        this.completed = false;
        [this.panel, this.speakerText, this.lineText].forEach((object) => {
            if (object && object.active) {
                object.setVisible(true);
            }
        });
        if (this.speakerText && this.speakerText.active) {
            this.speakerText.setText(speaker || '');
            if (color !== undefined) {
                const hexColor = typeof color === 'number'
                    ? `#${color.toString(16).padStart(6, '0')}`
                    : color;
                this.speakerText.setColor(hexColor);
            }
        }
        if (this.lineText && this.lineText.active) {
            const str = text || '';
            const count = visibleChars !== undefined
                ? Math.max(0, Math.min(str.length, visibleChars))
                : str.length;
            this.lineText.setText(str.slice(0, count));
        }
    }

    hide() {
        this.isShowing = false;
        [this.panel, this.speakerText, this.lineText].forEach((object) => {
            if (object && object.active) {
                object.setVisible(false);
            }
        });
    }

    destroy() {
        this.isShowing = false;
        this.onComplete = null;
        [this.panel, this.speakerText, this.lineText].forEach((object) => {
            if (object && object.active) {
                object.destroy();
            }
        });
    }
}