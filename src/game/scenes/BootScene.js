import { Scene, Textures } from 'phaser';
import { DEBUG_KEYS, preloadSheets } from '../config/animationData';
import { INTRO_ACTORS } from '../config/introActors';
import { preloadIntroImages } from '../config/introData';
import { DARKWORLD_BG, MINA_SHEETS } from '../config/actTwoData';
import { CORRIDOR, ORB_FEAR, STALKER_SHEETS } from '../config/actThreeData';
import { CRAWLER as LIFE_CRAWLER, LIFE_ASSETS } from '../config/lifeData';
import { ORB_ORDER } from '../config/actTruthData';
import { ORB_TRUTH, TRUTH_BG, TRUTH_MONSTER } from '../config/actTruthData';
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
        this.load.image(DARKWORLD_BG.key, DARKWORLD_BG.file
            .replace('Backgrounds/', 'backgrounds/')
            .replace('outbackground.jpeg', 'outbackgraound.jpeg'));
        Object.entries(MINA_SHEETS.textures).forEach(([key, file]) => {
            this.load.spritesheet(key, file.replace('assets/Mina/', 'assets/'), {
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
        this.load.image(TRUTH_BG.outside.key, TRUTH_BG.outside.file.replace('Backgrounds/', 'backgrounds/'));
        this.load.image(TRUTH_BG.cave.key, TRUTH_BG.cave.file.replace('Backgrounds/', 'backgrounds/'));
        Object.values(TRUTH_MONSTER.textures).forEach((sheet) => {
            if (!sheet.fw) {
                this.load.image('truth-cutout', sheet.file);
                return;
            }
            this.load.spritesheet(sheet === TRUTH_MONSTER.textures['truth-idle']
                ? 'truth-idle'
                : Object.entries(TRUTH_MONSTER.textures).find(([, item]) => item === sheet)?.[0] || '', sheet.file, {
                frameWidth: sheet.fw,
                frameHeight: sheet.fh,
                startFrame: 0,
                endFrame: sheet.frames - 1,
            });
        });
        this.load.spritesheet(ORB_TRUTH.texture, ORB_TRUTH.file, {
            frameWidth: ORB_TRUTH.frameWidth,
            frameHeight: ORB_TRUTH.frameHeight,
            startFrame: 0,
            endFrame: ORB_TRUTH.frames - 1,
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
            TRUTH_BG.outside.key,
            TRUTH_BG.cave.key,
            ...Object.keys(TRUTH_MONSTER.textures),
            ORB_TRUTH.texture,
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
            if (this.textures.exists(LIFE_ASSETS.npc.key) && !this.anims.exists(key)) {
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
            if (this.textures.exists(textureKey) && !this.anims.exists(key)) {
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
        if (this.textures.exists(LIFE_ASSETS.reveal.key) && !this.anims.exists('life-hatch')) {
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
        Object.entries(TRUTH_MONSTER.textures).forEach(([textureKey, sheet]) => {
            if (!sheet.fw || !this.textures.exists(textureKey) || this.anims.exists(textureKey)) return;
            this.anims.create({
                key: textureKey,
                frames: this.anims.generateFrameNumbers(textureKey, {
                    start: 0,
                    end: sheet.frames - 1,
                }),
                frameRate: sheet.fps,
                repeat: sheet.loop ? -1 : 0,
            });
        });
        if (this.textures.exists(ORB_TRUTH.texture) && !this.anims.exists('orb-truth-pulse')) {
            this.anims.create({
                key: 'orb-truth-pulse',
                frames: this.anims.generateFrameNumbers(ORB_TRUTH.texture, {
                    start: 0,
                    end: ORB_TRUTH.frames - 1,
                }),
                frameRate: 1000 / ORB_TRUTH.frameMs,
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
            if (this.registry.get('orbs') === undefined) this.registry.set('orbs', ORB_ORDER.slice(0, 2));
            this.scene.start('LifeChamberScene', {
                waveOnly: requestedScene === 'LifeChamberWave',
            });
            return;
        }
        if (import.meta.env.DEV && requestedScene === 'MinaAfterLife') {
            const currentOrbs = this.registry.get('orbs');
            if (!Array.isArray(currentOrbs) || currentOrbs.length < 3) {
                this.registry.set('orbs', ORB_ORDER.slice(0, 3));
            }
            this.scene.start('AfterLifeScene');
            return;
        }
        if (import.meta.env.DEV && DEBUG_KEYS &&
            ['TruthOutside', 'TruthReveal', 'TruthCave', 'TruthBoss'].includes(requestedScene)) {
            if (this.registry.get('orbs') == null || this.registry.get('orbs').length < 3) {
                this.registry.set('orbs', ORB_ORDER.slice(0, 3));
            }
            if (requestedScene === 'TruthOutside' || requestedScene === 'TruthReveal') {
                this.scene.start('TruthOutsideScene', {
                    part: requestedScene === 'TruthReveal' ? 'reveal' : 'before',
                });
            } else {
                this.scene.start('TruthCaveScene', { startBoss: requestedScene === 'TruthBoss' });
            }
            return;
        }
        if (import.meta.env.DEV && TIME_DEBUG && TIME_FLOW.devRoutes[requestedScene]) {
            if (this.registry.get('orbs') == null) this.registry.set('orbs', ORB_ORDER.slice(0, 1));
            this.scene.start(
                TIME_FLOW.devRoutes[requestedScene],
                { startChamber: requestedScene === 'TimeChamber' }
            );
            return;
        }
        if (import.meta.env.DEV &&
            (requestedScene === 'Settlement' || requestedScene === 'SettlementWave' || debugGrid)) {
            if (this.registry.get('orbs') === undefined) this.registry.set('orbs', ORB_ORDER.slice(0, 0));
            this.scene.start('SettlementScene', { waveOnly: requestedScene === 'SettlementWave' });
            return;
        }
        if (import.meta.env.DEV && requestedScene === 'DarkWorld') {
            if (this.registry.get('orbs') === undefined) {
                this.registry.set('orbs', ORB_ORDER.slice(0, 0));
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
                this.registry.set('orbs', ORB_ORDER.slice(0, 0));
            }
            this.scene.start('HauntedCorridorScene', {
                chaseStart: requestedScene === 'CorridorChase',
            });
            return;
        }
        this.scene.start('MainMenuScene');
    }
}
