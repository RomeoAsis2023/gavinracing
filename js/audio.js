// Recorded engine loop, mixed with procedural tire, road, and impact effects.
export class CarAudio {
  constructor() {
    this.context = null;
    this.onStateChange = () => {};
    this.failed = false;
    this.loading = false;
    this.previewUntil = 0;
    this.muted = false;
    this.supported = !!(window.AudioContext || window.webkitAudioContext);
    try { this.muted = localStorage.getItem('gavin-racing-muted') === 'true'; } catch (_) { /* Optional storage. */ }
  }

  async unlock() {
    if (!this.supported) return false;
    try {
      if (!this.context || this.context.state === 'closed') this.createGraph();
      // Safari can report "interrupted", not just "suspended", after app switching.
      const resume = this.context.state !== 'running' ? this.context.resume() : Promise.resolve();
      // Start a buffer inside the user gesture as well, for mobile audio unlocking.
      const unlockBuffer = this.context.createBufferSource();
      unlockBuffer.buffer = this.context.createBuffer(1, 1, this.context.sampleRate);
      unlockBuffer.connect(this.context.destination); unlockBuffer.start();
      unlockBuffer.onended = () => unlockBuffer.disconnect();
      await resume;
      await this.loadEngine();
      this.failed = this.context.state !== 'running';
    } catch (_) { this.failed = true; }
    this.onStateChange();
    return !this.failed;
  }

  createGraph() {
    const Context = window.AudioContext || window.webkitAudioContext;
    this.context = new Context();
    const c = this.context;
    c.onstatechange = () => this.onStateChange();
    this.master = c.createGain(); this.master.gain.value = this.muted ? 0 : .7;
    const limiter = c.createDynamicsCompressor();
    limiter.threshold.value = -14; limiter.ratio.value = 5;
    this.master.connect(limiter); limiter.connect(c.destination);
    this.engineGain = c.createGain(); this.engineGain.gain.value = 0;
    this.engineGain.connect(this.master);
    this.engine = c.createBufferSource(); this.engine.loop = true;
    this.engine.connect(this.engineGain);
    this.engineReady = null; this.engineStarted = false;
    // Shared noise supplies road hiss, friction, and the collision impact.
    this.noise = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const samples = this.noise.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
    const noise = c.createBufferSource(); noise.buffer = this.noise; noise.loop = true;
    const wind = c.createBiquadFilter(); wind.type = 'lowpass'; wind.frequency.value = 850;
    this.windGain = c.createGain(); this.windGain.gain.value = 0;
    noise.connect(wind); wind.connect(this.windGain); this.windGain.connect(this.master);
    const friction = c.createBiquadFilter(); friction.type = 'bandpass'; friction.frequency.value = 1600; friction.Q.value = 2.5;
    this.tireGain = c.createGain(); this.tireGain.gain.value = 0;
    noise.connect(friction); friction.connect(this.tireGain); this.tireGain.connect(this.master);
    this.squeal = c.createOscillator(); this.squeal.type = 'sine'; this.squeal.frequency.value = 670;
    const squealGain = c.createGain(); squealGain.gain.value = .14;
    this.squeal.connect(squealGain); squealGain.connect(this.tireGain); this.squeal.start(); noise.start();
    this.effectsGain = c.createGain(); this.effectsGain.gain.value = 0; this.effectsGain.connect(this.master);
  }

  async loadEngine() {
    if (!this.engineReady) {
      const context = this.context, engine = this.engine;
      this.loading = true; this.onStateChange();
      this.engineReady = (async () => {
        const response = await fetch(new URL('../assets/sound/carsound.mp3', import.meta.url));
        if (!response.ok) throw new Error('Engine recording could not load');
        const decoded = await context.decodeAudioData(await response.arrayBuffer());
        engine.buffer = this.prepareRecording(decoded, context);
        engine.loopStart = Math.min(.05, engine.buffer.duration / 4);
        engine.loopEnd = engine.buffer.duration;
      })();
    }
    try { await this.engineReady; }
    catch (error) { this.engineReady = null; throw error; }
    finally { this.loading = false; this.onStateChange(); }
    if (!this.engineStarted) { this.engine.start(0, this.engine.loopStart); this.engineStarted = true; }
  }

  prepareRecording(decoded, context) {
    // The supplied recording fades in from silence. Find its audible region so
    // every start and loop immediately sounds like a running engine.
    const windowSize = Math.max(1, Math.floor(decoded.sampleRate * .25));
    const levels = [];
    for (let offset = 0; offset < decoded.length; offset += windowSize) {
      let energy = 0, count = 0;
      for (let channel = 0; channel < decoded.numberOfChannels; channel++) {
        const samples = decoded.getChannelData(channel);
        for (let i = offset; i < Math.min(offset + windowSize, decoded.length); i++) { energy += samples[i] ** 2; count++; }
      }
      levels.push(Math.sqrt(energy / count));
    }
    const threshold = Math.max(.002, Math.max(...levels) * .2);
    let first = levels.findIndex(level => level >= threshold), last = levels.length - 1;
    if (first < 0) throw new Error('Engine recording contains no audible sound');
    while (last > first && levels[last] < threshold) last--;
    const start = first * windowSize, end = Math.min(decoded.length, (last + 1) * windowSize);
    const length = end - start;
    let peak = 0, energy = 0;
    for (let channel = 0; channel < decoded.numberOfChannels; channel++) {
      const samples = decoded.getChannelData(channel);
      for (let i = start; i < end; i++) { peak = Math.max(peak, Math.abs(samples[i])); energy += samples[i] ** 2; }
    }
    const rms = Math.sqrt(energy / (length * decoded.numberOfChannels));
    const gain = Math.min(4, .85 / Math.max(peak, .001), .14 / Math.max(rms, .001));
    const result = context.createBuffer(decoded.numberOfChannels, length, decoded.sampleRate);
    const fade = Math.min(Math.floor(decoded.sampleRate * .05), Math.floor(length / 4));
    for (let channel = 0; channel < decoded.numberOfChannels; channel++) {
      const output = result.getChannelData(channel), input = decoded.getChannelData(channel);
      for (let i = 0; i < length; i++) output[i] = input[start + i] * gain;
      for (let i = 0; i < fade; i++) {
        const mix = (i + 1) / fade;
        output[length - fade + i] = output[length - fade + i] * (1 - mix) + output[i] * mix;
      }
    }
    return result;
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.context && this.master) this.master.gain.setTargetAtTime(muted ? 0 : .7, this.context.currentTime, .025);
    try { localStorage.setItem('gavin-racing-muted', String(muted)); } catch (_) { /* Optional storage. */ }
    this.onStateChange();
  }

  async test() {
    this.setMuted(false);
    // Preview the actual MP3, using the same signal path as the race.
    this.previewUntil = Infinity;
    if (!await this.unlock()) { this.previewUntil = 0; return false; }
    this.previewUntil = performance.now() + 2200;
    return true;
  }

  silence() {
    if (!this.engineGain) return;
    for (const gain of [this.engineGain, this.windGain, this.tireGain, this.effectsGain]) {
      gain.gain.setTargetAtTime(0, this.context.currentTime, .02);
    }
    if (document.hidden) this.previewUntil = 0;
  }

  update(state, speed, steer) {
    if (!this.engineGain) return;
    if (state !== 'menu') this.previewUntil = 0;
    if (!document.hidden && state === 'menu' && performance.now() < this.previewUntil) {
      this.engine.playbackRate.setTargetAtTime(1, this.context.currentTime, .1);
      this.engineGain.gain.setTargetAtTime(.8, this.context.currentTime, .04);
      return;
    }
    if (document.hidden || !['racing', 'countdown', 'crashed'].includes(state)) { this.silence(); return; }
    const c = this.context, racing = state === 'racing', idling = state === 'countdown';
    const progress = Math.max(0, Math.min(1, (speed - 290) / 320));
    this.engine.playbackRate.setTargetAtTime(racing ? .95 + progress * .45 : .75, c.currentTime, .15);
    this.engineGain.gain.setTargetAtTime(racing ? .8 : idling ? .45 : 0, c.currentTime, .07);
    this.windGain.gain.setTargetAtTime(racing ? .035 + progress * .065 : 0, c.currentTime, .1);
    this.tireGain.gain.setTargetAtTime(racing && steer ? .06 + progress * .035 : 0, c.currentTime, .07);
    this.squeal.frequency.setTargetAtTime(650 + progress * 210, c.currentTime, .1);
    this.effectsGain.gain.setTargetAtTime(state === 'crashed' ? 1 : 0, c.currentTime, .02);
  }

  crash() {
    if (!this.effectsGain) return;
    const c = this.context, time = c.currentTime;
    this.effectsGain.gain.setTargetAtTime(document.hidden ? 0 : 1, time, .005);
    const noise = c.createBufferSource(), filter = c.createBiquadFilter(), envelope = c.createGain();
    noise.buffer = this.noise; filter.type = 'lowpass'; filter.frequency.setValueAtTime(2600, time);
    filter.frequency.exponentialRampToValueAtTime(160, time + .45);
    envelope.gain.setValueAtTime(.65, time); envelope.gain.exponentialRampToValueAtTime(.001, time + .55);
    noise.connect(filter); filter.connect(envelope); envelope.connect(this.effectsGain);
    noise.start(time); noise.stop(time + .6);
    noise.onended = () => { noise.disconnect(); filter.disconnect(); envelope.disconnect(); };
  }
}
