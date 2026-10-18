import { AUTO, Game, Scale } from 'phaser';
import BootScene from './scenes/BootScene';
import MainMenuScene from './scenes/MainMenuScene';
import IntroScene from './scenes/IntroScene';
import TempleScene from './scenes/Game';
import ArenaScene from './scenes/ArenaScene';
import DarkWorldScene from './scenes/DarkWorldScene';
import DarknessScene from './scenes/DarknessScene';
import HauntedCorridorScene from './scenes/HauntedCorridorScene';
import SettlementScene from './scenes/SettlementScene';
import ClockTowerScene from './scenes/ClockTowerScene';
import EndlessRoomScene from './scenes/EndlessRoomScene';
import AfterTimeScene from './scenes/AfterTimeScene';

const config = {
    type: AUTO,
    width: 1280,
    height: 720,
    parent: 'game-container',
    backgroundColor: '#090b10',
    scale: {
        mode: Scale.FIT,
        autoCenter: Scale.CENTER_BOTH,
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 1200 },
            debug: false,
        },
    },
    scene: [
        BootScene,
        MainMenuScene,
        IntroScene,
        TempleScene,
        ArenaScene,
        DarkWorldScene,
        DarknessScene,
        HauntedCorridorScene,
        SettlementScene,
        ClockTowerScene,
        EndlessRoomScene,
        AfterTimeScene,
    ],
};

const StartGame = (parent) => {
    return new Game({ ...config, parent });
};

export default StartGame;
