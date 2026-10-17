export default class BeatRunner {
    constructor(scene, beats, handlers) {
        this.scene = scene;
        this.beats = beats;
        this.handlers = handlers;
        this.index = -1;
        this.state = null;
        this.started = false;
        this.destroyed = false;
        this.done = beats.length === 0;
    }

    get currentId() {
        return this.index >= 0 && this.index < this.beats.length
            ? this.beats[this.index].id
            : null;
    }

    get isDone() {
        return this.done;
    }

    start() {
        if (this.destroyed) {
            throw new Error('Cannot start a destroyed BeatRunner.');
        }
        this.started = true;
        if (this.beats.length > 0) {
            this.activate(0);
        }
        return this;
    }

    update(dt) {
        if (!this.started || this.destroyed || this.done) {
            return;
        }

        const beat = this.beats[this.index];
        const handler = this.getHandler(beat.type);
        const context = { scene: this.scene, runner: this, beat };
        if (handler.update(dt, this.state, context) === true) {
            const nextIndex = this.index + 1;
            if (nextIndex >= this.beats.length) {
                this.state = null;
                this.done = true;
            } else {
                this.activate(nextIndex);
            }
        }
    }

    jumpToId(id) {
        if (this.destroyed) {
            throw new Error('Cannot jump a destroyed BeatRunner.');
        }
        const index = this.beats.findIndex((beat) => beat.id === id);
        if (index < 0) {
            throw new Error(`BeatRunner cannot find beat with id "${id}".`);
        }
        this.started = true;
        this.activate(index);
        return this;
    }

    activate(index) {
        this.index = index;
        this.done = false;
        const beat = this.beats[index];
        const handler = this.getHandler(beat.type);
        this.state = handler.start(beat, { scene: this.scene, runner: this, beat });
    }

    getHandler(type) {
        const handler = this.handlers[type];
        if (!handler || typeof handler.start !== 'function' || typeof handler.update !== 'function') {
            const environment = import.meta.env?.DEV ? ' in development' : '';
            throw new Error(`BeatRunner has no valid handler for beat type "${type}"${environment}.`);
        }
        return handler;
    }

    destroy() {
        this.destroyed = true;
        this.state = null;
        this.scene = null;
        this.beats = [];
        this.handlers = {};
        this.index = -1;
        this.done = true;
    }
}
