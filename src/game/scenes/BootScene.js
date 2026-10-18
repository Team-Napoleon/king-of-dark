import { Scene, Textures } from 'phaser';
import { preloadSheets } from '../config/animationData';
import { INTRO_ACTORS } from '../config/introActors';
import { preloadIntroImages } from '../config/introData';
import { DARKWORLD_BG, MINA_SHEETS } from '../config/actTwoData';
import { CORRIDOR, ORB_FEAR, STALKER_SHEETS } from '../config/actThreeData';
import { CRAWLER as LIFE_CRAWLER, LIFE_ASSETS } from '../config/lifeData';
import {
    preloadTimeAssets,
    TIME_ASSETS,
    TIME_DEBUG,
    TIME_FLOW,
} from '../config/timeData';

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
        this.load.image(CORRIDOR.tile.key, CORRIDOR.tile.file.replace('Backgrounds/', 'backgrounds/'));
        this.load.image(CORRIDOR.endRoom.key, CORRIDOR.endRoom.file.replace('Backgrounds/', 'backgrounds/'));
        this.load.spritesheet(ORB_FEAR.texture, ORB_FEAR.file, {
            frameWidth: ORB_FEAR.frameWidth,
            frameHeight: ORB_FEAR.frameHeight,
            startFrame: 0,
            endFrame: ORB_FEAR.frames - 1,
        });
        Object.entries(STALKER_SHEETS.textures).forEach(([key, file]) => {
            this.load.spritesheet(key, file, {
                frameWidth: STALKER_SHEETS.frameWidth,
                frameHeight: STALKER_SHEETS.frameHeight,
                startFrame: 0,
                endFrame: STALKER_SHEETS.frameCount - 1,
            });
        });
        this.load.image(LIFE_ASSETS.outsideBg.key, LIFE_ASSETS.outsideBg.path);
        this.load.image(LIFE_ASSETS.insideBg.key, LIFE_ASSETS.insideBg.path);
        this.load.spritesheet(LIFE_ASSETS.npc.key, LIFE_ASSETS.npc.path, {
            frameWidth: LIFE_ASSETS.npc.frameWidth,
            frameHeight: LIFE_ASSETS.npc.frameHeight,
        });
        [
            LIFE_ASSETS.crawler.chaseRight,
            LIFE_ASSETS.crawler.chaseLeft,
            LIFE_ASSETS.crawler.attackRight,
            LIFE_ASSETS.crawler.attackLeft,
        ].forEach((sheet) => {
            this.load.spritesheet(sheet.key, sheet.path, {
                frameWidth: LIFE_ASSETS.crawler.frameWidth,
                frameHeight: LIFE_ASSETS.crawler.frameHeight,
                startFrame: 0,
                endFrame: LIFE_ASSETS.crawler.frames - 1,
            });
        });
        this.load.spritesheet(LIFE_ASSETS.reveal.key, LIFE_ASSETS.reveal.path, {
            frameWidth: LIFE_ASSETS.reveal.frameWidth,
            frameHeight: LIFE_ASSETS.reveal.frameHeight,
            startFrame: 0,
            endFrame: LIFE_ASSETS.reveal.frames - 1,
        });
        this.load.spritesheet(LIFE_ASSETS.orb.key, LIFE_ASSETS.orb.path, {
            frameWidth: LIFE_ASSETS.orb.frameWidth,
            frameHeight: LIFE_ASSETS.orb.frameHeight,
            startFrame: 0,
            endFrame: LIFE_ASSETS.orb.frames - 1,
        });
        this.timeEndlessAvailable = true;
        const onTimeAssetError = (file) => {
            if (file && file.key === 'time-endless') {
                this.timeEndlessAvailable = false;
                console.warn('[BootScene] Optional Time room art is missing; EndlessRoomScene will draw it.');
            }
        };
        this.load.on('loaderror', onTimeAssetError);
        this.load.once('complete', () => this.load.off('loaderror', onTimeAssetError));
        preloadTimeAssets(this);
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
        [
            CORRIDOR.tile.key,
            CORRIDOR.endRoom.key,
            ORB_FEAR.texture,
            ...Object.keys(STALKER_SHEETS.textures),
            LIFE_ASSETS.outsideBg.key,
            LIFE_ASSETS.insideBg.key,
            LIFE_ASSETS.npc.key,
            LIFE_ASSETS.crawler.chaseRight.key,
            LIFE_ASSETS.crawler.chaseLeft.key,
            LIFE_ASSETS.crawler.attackRight.key,
            LIFE_ASSETS.crawler.attackLeft.key,
            LIFE_ASSETS.reveal.key,
            LIFE_ASSETS.orb.key,
            ...Object.keys(TIME_ASSETS.images),
            ...Object.keys(TIME_ASSETS.optionalImages),
            ...TIME_ASSETS.chamberSheets.map((sheet) => sheet.key),
            TIME_ASSETS.orb.key,
        ].forEach((textureKey) => {
            if (this.textures.exists(textureKey)) {
                this.textures.get(textureKey).setFilter(Textures.FilterMode.NEAREST);
            }
        });
        if (!this.anims.exists('orb-fear-pulse')) {
            this.anims.create({
                key: 'orb-fear-pulse',
                frames: this.anims.generateFrameNumbers(ORB_FEAR.texture, {
                    start: 0,
                    end: ORB_FEAR.frames - 1,
                }),
                frameRate: 1000 / ORB_FEAR.frameMs,
                repeat: -1,
            });
        }
        Object.entries(STALKER_SHEETS.textures).forEach(([textureKey, file]) => {
            const direction = textureKey === 'stalker-right' ? 'right' : 'left';
            const animationKey = `stalker-chase-${direction}`;
            if (this.textures.exists(textureKey)) {
                this.textures.get(textureKey).setFilter(1);
            }
            if (!this.anims.exists(animationKey)) {
                this.anims.create({
                    key: animationKey,
                    frames: this.anims.generateFrameNumbers(textureKey, {
                        start: 0,
                        end: STALKER_SHEETS.frameCount - 1,
                    }),
                    frameRate: STALKER_SHEETS.fps,
                    repeat: -1,
                });
            }
        });
        LIFE_ASSETS.npc.rows_order.forEach((row, rowIndex) => {
            const key = `life-npc-${row}-idle`;
            if (!this.anims.exists(key)) {
                this.anims.create({
                    key,
                    frames: [
                        { key: LIFE_ASSETS.npc.key, frame: rowIndex * LIFE_ASSETS.npc.cols },
                        { key: LIFE_ASSETS.npc.key, frame: rowIndex * LIFE_ASSETS.npc.cols + 1 },
                    ],
                    frameRate: LIFE_ASSETS.npc.idleFps,
                    repeat: -1,
                });
            }
        });
        [
            [LIFE_ASSETS.crawler.chaseRight.key, 'chase-right', LIFE_CRAWLER.chaseFps],
            [LIFE_ASSETS.crawler.chaseLeft.key, 'chase-left', LIFE_CRAWLER.chaseFps],
            [LIFE_ASSETS.crawler.attackRight.key, 'attack-right', LIFE_CRAWLER.attackFps],
            [LIFE_ASSETS.crawler.attackLeft.key, 'attack-left', LIFE_CRAWLER.attackFps],
        ].forEach(([textureKey, suffix, frameRate]) => {
            const key = `life-crawler-${suffix}`;
            if (!this.anims.exists(key)) {
                this.anims.create({
                    key,
                    frames: this.anims.generateFrameNumbers(textureKey, {
                        start: 0,
                        end: LIFE_ASSETS.crawler.frames - 1,
                    }),
                    frameRate,
                    repeat: suffix.startsWith('attack') ? 0 : -1,
                });
            }
        });
        if (!this.anims.exists('life-hatch')) {
            this.anims.create({
                key: 'life-hatch',
                frames: this.anims.generateFrameNumbers(LIFE_ASSETS.reveal.key, {
                    start: LIFE_ASSETS.reveal.hatchFrames[0],
                    end: LIFE_ASSETS.reveal.hatchFrames[1],
                }),
                frameRate: LIFE_ASSETS.reveal.fps,
                repeat: 0,
            });
        }
        if (this.textures.exists(LIFE_ASSETS.orb.key) &&
            !this.anims.exists(LIFE_ASSETS.orb.anim)) {
            this.anims.create({
                key: LIFE_ASSETS.orb.anim,
                frames: this.anims.generateFrameNumbers(LIFE_ASSETS.orb.key, {
                    start: 0,
                    end: LIFE_ASSETS.orb.frames - 1,
                }),
                frameRate: 1000 / LIFE_ASSETS.orb.frameMs,
                repeat: -1,
            });
        }
        if (this.textures.exists('time-orb') && !this.anims.exists('time-orb-pulse')) {
            this.anims.create({
                key: 'time-orb-pulse',
                frames: this.anims.generateFrameNumbers('time-orb', {
                    start: 0,
                    end: 15,
                }),
                frameRate: 1000 / 80,
                repeat: -1,
            });
        }
        const requestedScene = typeof window !== 'undefined'
            ? new URLSearchParams(window.location.search).get('scene')
            : null;
        const debugGrid = typeof window !== 'undefined' &&
            new URLSearchParams(window.location.search).get('debug') === 'grid';
        if (import.meta.env.DEV &&
            (requestedScene === 'LifeChamber' || requestedScene === 'LifeChamberWave' || debugGrid)) {
            if (this.registry.get('orbs') === undefined) this.registry.set('orbs', ['fear', 'time']);
            this.scene.start('LifeChamberScene', {
                waveOnly: requestedScene === 'LifeChamberWave',
            });
            return;
        }
        if (import.meta.env.DEV && TIME_DEBUG && TIME_FLOW.devRoutes[requestedScene]) {
            if (this.registry.get('orbs') == null) this.registry.set('orbs', ['fear']);
            this.scene.start(
                TIME_FLOW.devRoutes[requestedScene],
                { startChamber: requestedScene === 'TimeChamber' }
            );
            return;
        }
        if (import.meta.env.DEV &&
            (requestedScene === 'Settlement' || requestedScene === 'SettlementWave' || debugGrid)) {
            if (this.registry.get('orbs') === undefined) this.registry.set('orbs', []);
            this.scene.start('SettlementScene', { waveOnly: requestedScene === 'SettlementWave' });
            return;
        }
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
        if (import.meta.env.DEV && (requestedScene === 'Corridor' || requestedScene === 'CorridorChase')) {
            if (this.registry.get('orbs') === undefined) {
                this.registry.set('orbs', []);
            }
            this.scene.start('HauntedCorridorScene', {
                chaseStart: requestedScene === 'CorridorChase',
            });
            return;
        }
        this.scene.start('MainMenuScene');
    }
}
