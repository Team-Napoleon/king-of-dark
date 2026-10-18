import StartGame from './game/main';

import { DIALOGUE_FONT_NAME, LOCAL_FONT_NAME } from './game/config/fonts';

// Make sure the dialogue font is ready before the first text is drawn (give up after 2s -> fallback font).
const fontsReady = () => {
    if (!document.fonts || !document.fonts.load) {
        return Promise.resolve();
    }
    const loading = Promise.allSettled([
        document.fonts.load(`20px "${LOCAL_FONT_NAME}"`),
        document.fonts.load(`bold 20px "${LOCAL_FONT_NAME}"`),
        document.fonts.load(`20px "${DIALOGUE_FONT_NAME}"`),
        document.fonts.load(`bold 20px "${DIALOGUE_FONT_NAME}"`),
    ]);
    return Promise.race([loading, new Promise((resolve) => setTimeout(resolve, 2000))]);
};

document.addEventListener('DOMContentLoaded', () => {
    fontsReady().then(() => StartGame('game-container'));
});