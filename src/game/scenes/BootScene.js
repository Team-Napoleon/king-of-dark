import { Scene, Textures } from 'phaser';
import { DIALOGUE_FONT } from '../config/fonts';
import { addDiamond, addDivider, addEmbers, addVignette } from '../ui/MenuFx';
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
        this.bootStartedAt = performance.now();
        this.buildLoadingScreen();

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
        this.load.spritesheet('bg-menu-anim', 'assets/backgrounds/menu_animated_sheet.png', {
            frameWidth: 672,
            frameHeight: 384,
            startFrame: 0,
            endFrame: 11,
        });
        this.load.spritesheet('bg-arena-anim', 'assets/backgrounds/arena_animated_sheet.png', {
            frameWidth: 672,
            frameHeight: 384,
            startFrame: 0,
            endFrame: 11,
        });
    }

    buildLoadingScreen() {
        const { width, height } = this.scale;
        const centerX = width / 2;
        const barW = 520;
        const barH = 16;
        const barY = height / 2 + 120;

        this.cameras.main.setBackgroundColor('#07080d');
        this.add.rectangle(centerX, height / 2, width, height, 0x0d0a16, 1).setDepth(-10);
        for (let i = 0; i < 10; i += 1) {
            // stacked translucent discs = soft purple glow behind the title
            this.add.circle(centerX, height / 2 - 40, 340 - i * 30, 0x4a2380, 0.035).setDepth(-9);
        }
        addEmbers(this, { count: 26, depth: 2 });
        addVignette(this, { depth: 40 });

        // spinning rune above the title
        const runeOuter = addDiamond(this, centerX, 214, 34, 0xf5d58a, false);
        const runeInner = addDiamond(this, centerX, 214, 16, 0xb57cff, true);
        this.tweens.add({ targets: runeOuter, angle: 405, duration: 5200, repeat: -1 });
        this.tweens.add({ targets: runeInner, angle: -315, duration: 3200, repeat: -1 });
        this.tweens.add({
            targets: runeInner,
            alpha: { from: 0.4, to: 1 },
            duration: 900,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });

        const titleStyle = {
            fontFamily: DIALOGUE_FONT,
            fontSize: '64px',
            fontStyle: 'bold',
            letterSpacing: 6,
        };
        this.add.text(centerX, 290, 'KING OF DARK', {
            ...titleStyle,
            color: '#a76bff',
            shadow: { offsetX: 0, offsetY: 0, color: '#a76bff', blur: 30, stroke: true, fill: true },
        }).setOrigin(0.5).setAlpha(0.55);
        this.add.text(centerX, 290, 'KING OF DARK', {
            ...titleStyle,
            color: '#f7d7a5',
            shadow: { offsetX: 4, offsetY: 4, color: '#000000', blur: 0, stroke: false, fill: true },
        }).setOrigin(0.5);
        addDivider(this, centerX, 336, 400);

        // progress bar: dark track, gold frame, glowing purple-gold fill
        this.add.rectangle(centerX, barY, barW + 12, barH + 12, 0x000000, 0.7)
            .setStrokeStyle(2, 0xf5d58a, 0.9);
        this.add.rectangle(centerX, barY, barW + 22, barH + 22, 0x000000, 0)
            .setStrokeStyle(1, 0xf5d58a, 0.3);
        this.add.rectangle(centerX, barY, barW, barH, 0x1a1426, 1);
        const fill = this.add.rectangle(centerX - barW / 2, barY, 0, barH, 0xb57cff, 1).setOrigin(0, 0.5);
        const shine = this.add.rectangle(centerX - barW / 2, barY, 0, 4, 0xfff0c8, 0.65)
            .setOrigin(0, 0.5)
            .setY(barY - 3);
        const spark = this.add.circle(centerX - barW / 2, barY, 9, 0xffd98a, 0.9);
        const percentText = this.add.text(centerX, barY + 40, 'LOADING  0%', {
            fontFamily: DIALOGUE_FONT,
            fontSize: '22px',
            fontStyle: 'bold',
            color: '#f5d7a1',
            letterSpacing: 4,
            shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 0, stroke: false, fill: true },
        }).setOrigin(0.5);

        const tips = [
            'The dark remembers every soul that climbs the stairs.',
            'Armored foes shrug off chip damage. Wait for the opening.',
            'Keep moving. The King punishes the hesitant.',
            'Not every orb is a gift.',
        ];
        const tipText = this.add.text(centerX, height - 84, tips[0], {
            fontFamily: DIALOGUE_FONT,
            fontSize: '18px',
            color: '#9d97b8',
            letterSpacing: 1,
        }).setOrigin(0.5);
        let tipIndex = 0;
        this.time.addEvent({
            delay: 2600,
            loop: true,
            callback: () => {
                tipIndex = (tipIndex + 1) % tips.length;
                this.tweens.add({
                    targets: tipText,
                    alpha: 0,
                    duration: 250,
                    onComplete: () => {
                        tipText.setText(tips[tipIndex]);
                        this.tweens.add({ targets: tipText, alpha: 1, duration: 250 });
                    },
                });
            },
        });

        // smooth the bar towards the real load progress
        const shown = { value: 0 };
        const apply = () => {
            const w = Math.max(0, barW * shown.value);
            fill.width = w;
            shine.width = Math.max(0, w - 4);
            spark.x = centerX - barW / 2 + w;
            spark.setVisible(w > 2);
            percentText.setText(`LOADING  ${Math.round(shown.value * 100)}%`);
        };
        this.load.on('progress', (value) => {
            this.tweens.add({ targets: shown, value, duration: 220, ease: 'Sine.easeOut', onUpdate: apply });
        });
        this.tweens.add({
            targets: spark,
            scale: { from: 0.7, to: 1.3 },
            alpha: { from: 0.5, to: 1 },
            duration: 420,
            yoyo: true,
            repeat: -1,
        });
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
        ['bg-menu-anim', 'bg-arena-anim'].forEach((textureKey) => {
            if (this.textures.exists(textureKey)) {
                this.textures.get(textureKey).setFilter(Textures.FilterMode.NEAREST);
            }
            if (!this.anims.exists(textureKey)) {
                this.anims.create({
                    key: textureKey,
                    frames: this.anims.generateFrameNumbers(textureKey, { start: 0, end: 11 }),
                    frameRate: 11,
                    repeat: -1,
                });
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
        if (import.meta.env.DEV && requestedScene === 'MinaAfterLife') {
            const currentOrbs = this.registry.get('orbs');
            if (!Array.isArray(currentOrbs) || currentOrbs.length < 3) {
                this.registry.set('orbs', ['fear', 'time', 'life']);
            }
            this.scene.start('AfterLifeScene');
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
        const minimumMs = 1800;
        const wait = Math.max(0, minimumMs - (performance.now() - (this.bootStartedAt || 0)));
        this.time.delayedCall(wait + 250, () => {
            this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('MainMenuScene'));
            this.cameras.main.fadeOut(450, 0, 0, 0);
        });
    }
}
