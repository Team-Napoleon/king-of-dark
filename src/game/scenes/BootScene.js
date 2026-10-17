import { Scene } from 'phaser';
import { preloadSheets } from '../config/animationData';
import { INTRO_ACTORS } from '../config/introActors';
import { preloadIntroImages } from '../config/introData';
import { DARKWORLD_BG, MINA_SHEETS } from '../config/actTwoData';

export default class BootScene extends Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;
        const progressBox = this.add.rectangle(centerX, centerY + 30, 320, 20, 0x211b27)
            .setStrokeStyle(2, 0x7e5a40);
        const progressBar = this.add.rectangle(centerX - 156, centerY + 30, 0, 12, 0xf5d58a)
            .setOrigin(0, 0.5);
        const loadingText = this.add.text(centerX, centerY - 12, 'LOADING...', {
            fontFamily: 'Arial',
            fontSize: '24px',
            color: '#f5d7a1',
            stroke: '#000000',
            strokeThickness: 5,
        }).setOrigin(0.5);

        this.load.on('progress', (value) => {
            if (!progressBar || !progressBar.active) {
                return;
            }
            progressBar.width = 312 * value;
        });
        this.load.once('complete', () => {
            if (progressBox && progressBox.active) {
                progressBox.destroy();
            }
            if (progressBar && progressBar.active) {
                progressBar.destroy();
            }
            if (loadingText && loadingText.active) {
                loadingText.destroy();
            }
        });

        preloadSheets(this);
        preloadIntroImages(this);
        const loadedHeroTextures = new Set();
        Object.values(INTRO_ACTORS.hero.byImage).forEach((entry) => {
            if (entry.kind === 'image' && !loadedHeroTextures.has(entry.texture)) {
                this.load.image(entry.texture, entry.file);
                loadedHeroTextures.add(entry.texture);
            }
        });
        this.load.image(DARKWORLD_BG.key, DARKWORLD_BG.file);
        Object.entries(MINA_SHEETS.textures).forEach(([key, file]) => {
            this.load.spritesheet(key, file, {
                frameWidth: MINA_SHEETS.frameWidth,
                frameHeight: MINA_SHEETS.frameHeight,
                startFrame: 0,
                endFrame: MINA_SHEETS.frameCount - 1,
            });
        });
        this.load.image('bg-menu', 'assets/backgrounds/menu.jpg');
        this.load.image('bg-temple', 'assets/backgrounds/temple.jpg');
        this.load.image('bg-arena', 'assets/backgrounds/arena.jpg');
    }

    create() {
        Object.entries(MINA_SHEETS.textures).forEach(([textureKey]) => {
            const animationKey = textureKey;
            if (!this.anims.exists(animationKey)) {
                this.anims.create({
                    key: animationKey,
                    frames: this.anims.generateFrameNumbers(textureKey, {
                        start: 0,
                        end: MINA_SHEETS.frameCount - 1,
                    }),
                    frameRate: MINA_SHEETS.fps,
                    repeat: -1,
                });
            }
        });
        const requestedScene = typeof window !== 'undefined'
            ? new URLSearchParams(window.location.search).get('scene')
            : null;
        if (import.meta.env.DEV && requestedScene === 'DarkWorld') {
            if (this.registry.get('orbs') === undefined) {
                this.registry.set('orbs', []);
            }
            this.scene.start('DarkWorldScene', { part: 'village' });
            return;
        }
        if (import.meta.env.DEV && requestedScene === 'Arena') {
            this.registry.set('bossIntroSeen', true);
            this.scene.start('ArenaScene');
            return;
        }
        if (import.meta.env.DEV && requestedScene === 'ArenaDefeat') {
            this.registry.set('bossIntroSeen', true);
            this.scene.start('ArenaScene');
            return;
        }
        if (import.meta.env.DEV && requestedScene === 'Darkness') {
            this.scene.start('DarknessScene');
            return;
        }
        this.scene.start('MainMenuScene');
    }
}
