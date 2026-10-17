// KING OF DARK: story scenes as DATA. No Phaser imports here.
// Times are in seconds. Line fields:
//   who    speaker id (see SPEAKERS)
//   text   what is typed on screen
//   at     seconds after the shot/scene starts when typing begins
//   charMs milliseconds per typed character (TYPE.fast / normal / slow)
//   hold   milliseconds the finished line stays on screen
// A shot lasts until its last line ends plus TAIL seconds, unless `dur` is set.
// A scene lasts as long as its shots added together (use sceneDuration()).

export const TYPE = { fast: 28, normal: 40, slow: 55 };
export const TAIL = 0.8;

// Pictures. Save files into public/assets/story/ with these exact names.
// 'must' = needed for the demo, 'should' = nice to have. A missing picture must
// never crash the game: the manager draws a dark placeholder with the scene title.
export const STORY_IMAGES = {
  'cs-peace':   { path: 'assets/story/cs-peace.jpg',   priority: 'must',   note: 'peaceful kingdom, warm daylight' },
  'cs-hill':    { path: 'assets/story/cs-hill.jpg',    priority: 'must',   note: 'hero on hill looking at the temple' },
  'cs-throne':  { path: 'assets/story/cs-throne.jpg',  priority: 'must',   note: 'vision: hero on throne, dark crown' },
  'cs-shadow':  { path: 'assets/story/cs-shadow.jpg',  priority: 'must',   note: 'black shadow erupting from the King and consuming the temple' },
  'cs-street':  { path: 'assets/story/cs-street.jpg',  priority: 'should', note: 'corrupted familiar street, broken sign, wooden toy' },
  'cs-mirror':  { path: 'assets/story/cs-mirror.jpg',  priority: 'should', note: 'mirror, reflection wearing the King crown' },
  'cs-portal':  { path: 'assets/story/cs-portal.jpg',  priority: 'should', note: 'portal with the younger hero on the other side' },
  'cs-endingA': { path: 'assets/story/cs-endingA.jpg', priority: 'should', note: 'shadow spreads again, cycle restarts' },
  'cs-endingB': { path: 'assets/story/cs-endingB.jpg', priority: 'should', note: 'King alone on the throne, world sealed' },
  'pt-hero':    { path: 'assets/story/pt-hero.png',    priority: 'must',   note: 'portrait, transparent background, about 512x512' },
  'pt-mina':    { path: 'assets/story/pt-mina.png',    priority: 'must',   note: 'portrait' },
  'pt-king':    { path: 'assets/story/pt-king.png',    priority: 'must',   note: 'portrait' },
  'pt-elder':   { path: 'assets/story/pt-elder.png',   priority: 'should', note: 'portrait' },
  'pt-young':   { path: 'assets/story/pt-young.png',   priority: 'should', note: 'portrait' },
  'pt-past':    { path: 'assets/story/pt-past.png',    priority: 'should', note: 'portrait of the younger hero (can reuse pt-hero)' },
};

// who -> look of the dialogue box. portrait null = no portrait (text only).
export const SPEAKERS = {
  HERO:        { name: 'HERO',        portrait: 'pt-hero',  side: 'left',   color: '#cfe8ff' },
  MINA:        { name: 'MINA',        portrait: 'pt-mina',  side: 'right',  color: '#ff9aa8' },
  KING:        { name: 'KING OF DARK', portrait: 'pt-king', side: 'right',  color: '#c79bff' },
  ELDER:       { name: 'ELDER',       portrait: 'pt-elder', side: 'right',  color: '#e8d9b0' },
  YOUNG:       { name: 'SURVIVOR',    portrait: 'pt-young', side: 'left',   color: '#b8e8c8' },
  PAST_HERO:   { name: 'YOUNG HERO',  portrait: 'pt-past',  side: 'left',   color: '#cfe8ff' },
  NARRATOR:    { name: '',            portrait: null,       side: 'center', color: '#d9d9d9', italic: true },
  INSCRIPTION: { name: '',            portrait: null,       side: 'center', color: '#e0c46a', carved: true },
  MECHANISM:   { name: '',            portrait: null,       side: 'center', color: '#9ad7ff', carved: true },
  SOULS:       { name: '',            portrait: null,       side: 'center', color: '#bfeee6', italic: true },
};

const L = (who, text, at, charMs = TYPE.normal, hold = 1000) => ({ who, text, at, charMs, hold });
const cam = (z0, z1, x0 = 0.5, x1 = 0.5) => ({ zoom: [z0, z1], panX: [x0, x1] });

export const SCENES = {
  // ---------- OPENING (about 22.5 s) : picture-driven ----------
  intro: {
    type: 'cinematic', skip: true, music: 'music-intro', fadeIn: 0.8, fadeOut: 0.8, next: 'TempleScene',
    shots: [
      { image: 'cs-peace', dur: 8.0, cam: cam(1.0, 1.1, 0.4, 0.6), sfx: [{ at: 0, key: 'sfx-wind' }], lines: [
        L('NARRATOR', 'In a world untouched by darkness, one man desired something no ordinary life could offer.', 0.9, TYPE.normal, 1000) ] },
      { image: 'cs-hill', dur: 7.0, cam: cam(1.0, 1.12, 0.5, 0.5), lines: [
        L('HERO', 'Strength earns respect. Power commands it. And I will have both.', 0.8, TYPE.normal, 1200) ] },
      { image: 'cs-throne', dur: 7.5, cam: cam(1.15, 1.0), flash: { at: 0.0, color: 0x3a0f5a }, sfx: [{ at: 0, key: 'sfx-whoosh' }], lines: [
        L('HERO', 'They call it forbidden power. I call it my destiny.', 1.0, TYPE.slow, 1200) ] },
    ],
  },

  // ---------- TEMPLE ----------
  templeWarning: {
    type: 'event', skip: true, bg: 'current', next: 'continue',
    shots: [ { lines: [
      L('INSCRIPTION', 'HE WHO SEEKS THE CROWN SHALL INHERIT ITS CURSE.', 0.4, TYPE.normal, 1500),
      L('HERO', 'A warning written by the weak.', 4.2, TYPE.normal, 1200) ] } ],
  },
  kingLastWords: {
    type: 'dialogue', skip: true, bg: 'current', next: 'shadowRises',
    shots: [ { lines: [
      L('HERO', 'Your reign ends. Your power is mine.', 0.3, TYPE.normal, 700),
      L('KING', 'You know nothing of the throne you seek.', 3.0, TYPE.normal, 800),
      L('KING', 'It was never a crown. It was a debt.', 6.0, TYPE.slow, 1200) ] } ],
  },
  shadowRises: {
    type: 'cinematic', skip: true, music: 'music-darkness', fadeIn: 0.3, fadeOut: 1.2, next: 'DarkWorldScene',
    shots: [ { image: 'cs-shadow', cam: cam(1.0, 1.18), shake: { at: 0.2, dur: 2.2, amp: 0.012 }, sfx: [{ at: 0, key: 'sfx-rumble' }], dur: 5.5, lines: [
      L('NARRATOR', 'The king fell. But the darkness did not die with him.', 1.2, TYPE.normal, 1500) ] } ],
  },

  // ---------- DARK WORLD ----------
  awakening: {
    type: 'cinematic', skip: true, fadeIn: 1.0, fadeOut: 0.6, next: 'continue',
    shots: [ { image: 'cs-street', cam: cam(1.0, 1.08, 0.45, 0.55), sfx: [{ at: 0, key: 'sfx-wind' }], lines: [
      L('HERO', 'The market... I walked through here yesterday.', 1.0, TYPE.normal, 900),
      L('HERO', 'This was never supposed to happen.', 4.6, TYPE.slow, 1200) ] } ],
  },
  minaFirst: {
    type: 'dialogue', skip: true, bg: 'current', next: 'continue',
    shots: [ { lines: [
      L('MINA', 'You brought the darkness here.', 0.3, TYPE.fast, 500),
      L('HERO', 'How long have you been here?', 2.1, TYPE.fast, 500),
      L('MINA', 'Long enough.', 3.9, TYPE.fast, 700),
      L('HERO', 'You know about the orbs?', 5.0, TYPE.fast, 500),
      L('MINA', "I know what happens when they're gathered. Find all five. Then you'll understand.", 6.6, TYPE.fast, 1200) ] } ],
  },

  // Mina's clue before each mission (short; triggered by pressing E near her)
  clueFear:  { type: 'dialogue', skip: true, bg: 'current', next: 'continue', shots: [ { lines: [ L('MINA', "Something in the corridor hunts anyone who carries light. Don't stop running.", 0.3, TYPE.fast, 1000) ] } ] },
  clueTime:  { type: 'dialogue', skip: true, bg: 'current', next: 'continue', shots: [ { lines: [ L('MINA', 'There is a room where every door leads back to the start. Watch the walls. They change.', 0.3, TYPE.fast, 1000) ] } ] },
  clueLife:  { type: 'dialogue', skip: true, bg: 'current', next: 'continue', shots: [ { lines: [ L('MINA', 'A few of us still hide past the ruins. The darkness is circling their fire.', 0.3, TYPE.fast, 1000) ] } ] },
  clueSouls: { type: 'dialogue', skip: true, bg: 'current', next: 'continue', shots: [ { lines: [ L('MINA', 'The crypt keeps what the darkness takes. Break the seals. Free them.', 0.3, TYPE.fast, 1000) ] } ] },
  clueTruth: { type: 'dialogue', skip: true, bg: 'current', next: 'continue', shots: [ { lines: [ L('MINA', "The last chamber was the king's. Don't trust what looks back at you.", 0.3, TYPE.fast, 1000) ] } ] },

  // ---------- ORB MISSION MOMENTS ----------
  monsterScare: {
    type: 'event', skip: false, bg: 'current', next: 'continue',
    shots: [ { dur: 4.2, sfx: [{ at: 0.2, key: 'sfx-whisper' }, { at: 2.6, key: 'sfx-roar' }], flicker: { at: 1.2, dur: 1.2 }, lines: [] } ],
  },
  settlementOverheard: {
    type: 'dialogue', skip: true, bg: 'current', next: 'continue',
    shots: [ { lines: [
      L('ELDER', 'The fire is getting weaker.', 0.3, TYPE.fast, 500),
      L('YOUNG', 'Will the stranger come back?', 2.0, TYPE.fast, 500),
      L('ELDER', 'He opened the temple. He is the one who caused this.', 3.8, TYPE.fast, 600),
      L('YOUNG', 'Then why do you hope he returns?', 6.5, TYPE.fast, 500),
      L('ELDER', 'Because only he can close it.', 8.4, TYPE.normal, 1200) ] } ],
  },
  soulsWhisper: {
    type: 'event', skip: true, bg: 'current', next: 'continue',
    shots: [ { lines: [
      L('SOULS', 'He has returned...', 0.3, TYPE.slow, 700),
      L('SOULS', 'No... his crown is different.', 2.6, TYPE.slow, 700),
      L('SOULS', 'Not the King. Not yet.', 5.2, TYPE.slow, 1200) ] } ],
  },
  reflection: {
    type: 'cinematic', skip: true, fadeIn: 0.4, fadeOut: 0.5, next: 'continue',
    shots: [ { image: 'cs-mirror', cam: cam(1.0, 1.1), sfx: [{ at: 3.0, key: 'sfx-glass' }], shake: { at: 3.0, dur: 0.4, amp: 0.01 }, lines: [
      L('HERO', 'Who are you?', 1.2, TYPE.slow, 1500) ] } ],
  },
  truthVision: {
    type: 'cinematic', skip: true, fadeIn: 0.6, fadeOut: 0.8, next: 'continue',
    shots: [ { image: 'cs-throne', cam: cam(1.0, 1.15), flash: { at: 0, color: 0xd8b24a }, lines: [
      L('HERO', "That isn't a vision. It's a memory I haven't lived yet.", 1.0, TYPE.slow, 1500) ] } ],
  },

  // ---------- TRANSFORMATION AND FINAL ----------
  transformation: {
    type: 'event', skip: true, bg: 'current', music: 'music-transform', next: 'continue',
    shots: [ { shake: { at: 0.5, dur: 3.0, amp: 0.008 }, lines: [
      L('MECHANISM', 'THE SEAL DEMANDS A RULER.', 0.6, TYPE.normal, 1200),
      L('HERO', 'Then let it be me.', 3.4, TYPE.slow, 1000),
      L('HERO', 'If the world needs a monster, let it be the one who made it.', 6.0, TYPE.slow, 1500) ] } ],
  },
  pastHeroChoice: {
    type: 'cinematic', skip: true, fadeIn: 0.5, fadeOut: 0.5, next: 'continue',
    shots: [ { image: 'cs-portal', cam: cam(1.0, 1.08), lines: [
      L('PAST_HERO', 'Stand aside. I will end this darkness.', 0.5, TYPE.fast, 600),
      L('KING', 'I once spoke those same words.', 3.0, TYPE.fast, 600),
      L('PAST_HERO', 'Then you know why I must kill you.', 5.2, TYPE.fast, 700),
      L('KING', 'I know. That is why I cannot let you win.', 7.6, TYPE.normal, 1300) ] } ],
  },
  endingA: {
    type: 'cinematic', skip: false, music: 'music-ending-a', fadeIn: 0.8, fadeOut: 1.5, next: 'MainMenuScene',
    shots: [ { image: 'cs-endingA', cam: cam(1.0, 1.1), lines: [
      L('PAST_HERO', 'It is over. The world is safe.', 1.0, TYPE.normal, 1000),
      L('NARRATOR', 'And the cycle begins again.', 4.5, TYPE.slow, 2000) ] } ],
  },
  endingB: {
    type: 'cinematic', skip: false, music: 'music-ending-b', fadeIn: 0.8, fadeOut: 1.5, next: 'MainMenuScene',
    shots: [ { image: 'cs-endingB', cam: cam(1.1, 1.0), lines: [
      L('KING', 'The world is safe... as long as I remain the monster.', 1.2, TYPE.slow, 2500) ] } ],
  },
};

// One entry per orb. title card text, colour, Mina's line after collecting it.
export const ORBS = {
  fear:  { order: 1, title: 'ORB OF FEAR',  color: 0x9b4dff, mina: 'Fear follows those who run from their past. The room beyond the ruins does not obey time.', clue: 'clueFear'  },
  time:  { order: 2, title: 'ORB OF TIME',  color: 0x4da3ff, mina: "You have walked this path before. Perhaps you simply don't remember.",                     clue: 'clueTime'  },
  life:  { order: 3, title: 'ORB OF LIFE',  color: 0x4dff88, mina: 'Look at what remains of this world. Every life you save is one more reason to keep going.', clue: 'clueLife'  },
  souls: { order: 4, title: 'ORB OF SOULS', color: 0xbff7ee, mina: 'Those souls were bound to the king... or to someone who came before him.',                 clue: 'clueSouls' },
  truth: { order: 5, title: 'ORB OF TRUTH', color: 0xffd24d, mina: "Now you understand. The final door isn't leading you to the king. It's leading you to yourself.", clue: 'clueTruth' },
};

export const GAME_PROGRESS_START = { fear: false, time: false, life: false, souls: false, truth: false, currentObjective: 0 };

// ---------- helpers (pure) ----------
export function lineEnd(line) { return line.at + (line.text.length * line.charMs) / 1000 + line.hold / 1000; }
export function shotDuration(shot) {
  if (shot.dur) return shot.dur;
  const end = shot.lines && shot.lines.length ? Math.max(...shot.lines.map(lineEnd)) : 0;
  return end + TAIL;
}
export function sceneDuration(scene) { return scene.shots.reduce((t, s) => t + shotDuration(s), 0); }
