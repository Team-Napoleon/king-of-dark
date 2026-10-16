import { AUTO, Game, Scale } from 'phaser';
import BootScene from './scenes/BootScene';
import MainMenuScene from './scenes/MainMenuScene';
import TempleScene from './scenes/Game';

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
        TempleScene,
    ],
};

const StartGame = (parent) => {
    return new Game({ ...config, parent });
};

export default StartGame;
