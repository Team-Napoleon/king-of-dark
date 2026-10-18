// One place for the font used by all character talking (dialogue box + speech bubbles).
// "Pixelify Sans" is loaded from Google Fonts in index.html; the rest is the offline fallback.
export const DIALOGUE_FONT_NAME = 'Pixelify Sans';
export const LOCAL_FONT_NAME = 'Pixelify Local'; // bundled file: public/assets/fonts/PixelifySans.ttf (see README.txt there)
export const DIALOGUE_FONT = `"${LOCAL_FONT_NAME}", "${DIALOGUE_FONT_NAME}", "Trebuchet MS", Verdana, sans-serif`;

// Classic game text look: crisp pixel letters + hard 2px drop shadow (no blurry outline).
export const DIALOGUE_SHADOW = { offsetX: 2, offsetY: 2, color: '#000000', blur: 0, stroke: false, fill: true };
