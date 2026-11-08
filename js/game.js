import { RaceScene } from './scene.js?v=remote-audio-3';
import { CarAudio } from './audio.js?v=remote-audio-3';
import { Leaderboard } from './leaderboard.js?v=remote-audio-3';

(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const canvas = $('track');
  const audio = new CarAudio();
  const leaderboard = new Leaderboard();
  let runDriver = leaderboard.driver;
  let scene;
  try { scene = new RaceScene(canvas); }
  catch (error) {
    $('start').textContent = '3D COULD NOT START';
    $('load-status').textContent = 'Enable WebGL / hardware acceleration in your browser, then reload.';
    console.error(error); return;
  }
  const W = 800;
  const FINISH_SCORE = 1_000_000;
  const ROAD_LEFT = 224, ROAD_RIGHT = 576, LANE = (ROAD_RIGHT - ROAD_LEFT) / 3;
  const CAR_W = 52, CAR_H = 99;
  const CAR_DEPTH = 6;
  const PLAYER_Y = 430;
  const keys = new Set();
  const touch = { left: false, right: false };
  const trafficColors = ['#d7dce3', '#e6ba59', '#5ba3b7', '#9390c3', '#6f9279'];
  let state = 'loading', playerX = W / 2, traffic = [], particles = [];
  let smoke = [], smokeTimer = 0;
  let distance = 0, score = 0, speed = 0, roadOffset = 0, spawnTimer = 0;
  let countdown = 0, crashTime = 0, crashAge = 0, previousTime = 0, best = 0;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  try { best = Math.max(0, Number(localStorage.getItem('gavin-racing-best')) || 0); } catch (_) { /* Storage is optional. */ }
  const format = n => String(Math.floor(n)).padStart(6, '0');
  function updateBest() { $('sidebar-best').textContent = format(best); }
  updateBest();

  // Flood-fill only the outer light background. White racing stripes remain intact.
  function prepareCar(image) {
    const off = document.createElement('canvas');
    off.width = image.naturalWidth; off.height = image.naturalHeight;
    const c = off.getContext('2d', { willReadFrequently: true });
    c.drawImage(image, 0, 0);
    const pixels = c.getImageData(0, 0, off.width, off.height);
    const data = pixels.data, width = off.width, height = off.height;
    const seen = new Uint8Array(width * height);
    const queue = new Int32Array(width * height);
    let head = 0, tail = 0;
    function visit(p) {
      if (p < 0 || p >= seen.length || seen[p]) return;
      seen[p] = 1;
      const i = p * 4, r = data[i], g = data[i + 1], b = data[i + 2];
      if (data[i + 3] === 0 || (Math.min(r, g, b) > 195 && Math.max(r, g, b) - Math.min(r, g, b) < 24)) {
        data[i + 3] = 0; queue[tail++] = p;
      }
    }
    for (let x = 0; x < width; x++) { visit(x); visit((height - 1) * width + x); }
    for (let y = 0; y < height; y++) { visit(y * width); visit(y * width + width - 1); }
    while (head < tail) {
      const p = queue[head++], x = p % width;
      if (x > 0) visit(p - 1);
      if (x < width - 1) visit(p + 1);
      visit(p - width); visit(p + width);
    }
    c.putImageData(pixels, 0, 0);
    let left = width, right = 0, top = height, bottom = 0;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 30) {
        left = Math.min(left, x); right = Math.max(right, x);
        top = Math.min(top, y); bottom = Math.max(bottom, y);
      }
    }
    return { image: off, x: left, y: top, w: right - left + 1, h: bottom - top + 1 };
  }

  function showPanel(name) {
    $('overlay').hidden = !name;
    for (const panel of ['menu', 'pause', 'finish']) $(panel + '-panel').hidden = panel !== name;
    $('pause').disabled = name !== null || state !== 'racing';
  }
  function clearInput() {
    keys.clear(); touch.left = touch.right = false;
    $('left').classList.remove('held'); $('right').classList.remove('held');
  }
  function start() {
    audio.unlock();
    runDriver = leaderboard.driver;
    clearInput(); playerX = W / 2; traffic = []; particles = [];
    smoke = []; smokeTimer = 0;
    distance = score = roadOffset = 0; speed = 290; spawnTimer = 1;
    crashAge = 0; countdown = 3; state = 'countdown';
    $('crash-message').hidden = true;
    showPanel(null); $('countdown').hidden = false; $('countdown').textContent = '3';
    updateHUD();
    if (document.hidden || $('race').getBoundingClientRect().bottom < window.innerHeight * .6) pause();
  }
  function pause() {
    if (state !== 'racing' && state !== 'countdown') return;
    state = 'paused'; clearInput(); $('countdown').hidden = true;
    audio.silence();
    showPanel('pause'); $('resume').focus();
  }
  function resume() {
    if (state !== 'paused') return;
    audio.unlock();
    countdown = 3; state = 'countdown'; showPanel(null);
    $('countdown').hidden = false; $('countdown').textContent = '3';
  }
  function menu() {
    state = 'menu'; traffic = []; particles = []; speed = 0; clearInput();
    smoke = []; smokeTimer = 0;
    $('countdown').hidden = true; showPanel('menu'); updateHUD(); $('start').focus();
  }
  function endRace() {
    state = 'finished'; speed = 0;
    leaderboard.record(runDriver, score, distance);
    best = Math.max(best, Math.floor(score)); updateBest();
    try { localStorage.setItem('gavin-racing-best', String(best)); } catch (_) { /* Play without saving. */ }
    start();
  }
  function finishRace() {
    state = 'won'; score = FINISH_SCORE; speed = 0; clearInput();
    leaderboard.record(runDriver, score, distance);
    best = Math.max(best, score); updateBest();
    try { localStorage.setItem('gavin-racing-best', String(best)); } catch (_) { /* Play without saving. */ }
    $('finish-distance').textContent = `${Math.floor(distance).toLocaleString()} m`;
    $('countdown').hidden = true;
    updateHUD(); audio.silence(); showPanel('finish'); $('finish-restart').focus();
  }
  function crash(otherCar) {
    state = 'crashed'; crashTime = 1.8; crashAge = 0; clearInput(); $('pause').disabled = true;
    otherCar.exploded = true;
    scene.explode([{ x: playerX, y: PLAYER_Y, color: '#ef251e' }, otherCar]);
    $('crash-message').hidden = false;
    audio.crash();
    for (let i = 0; i < 25; i++) particles.push({
      x: playerX, y: PLAYER_Y - 35, vx: (Math.random() - .5) * 350,
      vy: (Math.random() - .5) * 350, life: .4 + Math.random() * .4
    });
  }
  function updateHUD() {
    $('score').textContent = format(score); $('distance').textContent = Math.floor(distance);
    $('speed').textContent = state === 'racing' || state === 'countdown' ? Math.round(speed * .36) : 0;
    $('finish-progress').value = Math.min(FINISH_SCORE, score);
    $('finish-percent').textContent = `${(Math.floor(Math.min(FINISH_SCORE, score) / FINISH_SCORE * 1000) / 10).toFixed(1)}%`;
  }

  function spawnTraffic() {
    // Each row has at most two occupied lanes. Row spacing always gives time to steer.
    const lanes = [0, 1, 2].sort(() => Math.random() - .5);
    const count = distance > 500 && Math.random() < .46 ? 2 : 1;
    const rowSpeed = speed * (.40 + Math.random() * .08);
    for (let i = 0; i < count; i++) traffic.push({
      x: ROAD_LEFT + LANE * (lanes[i] + .5), y: -115,
      speed: rowSpeed, color: trafficColors[Math.floor(Math.random() * trafficColors.length)], passed: false
    });
  }

  function updateSmoke(dt, steer) {
    for (const puff of smoke) {
      puff.x += puff.vx * dt; puff.y += puff.vy * dt;
      puff.radius += dt * 16; puff.life -= dt;
    }
    smoke = smoke.filter(puff => puff.life > 0);
    if (state !== 'racing') return;
    smokeTimer -= dt;
    const interval = reducedMotion ? .16 : .055;
    while (smokeTimer <= 0) {
      smokeTimer += interval;
      const lifetime = reducedMotion ? .4 : .65 + Math.random() * .2;
      // Twin exhaust pipes sit at the center of the rear bumper.
      for (const side of [-1, 1]) smoke.push({
        x: playerX + side * 5,
        y: PLAYER_Y + CAR_H / 2 + CAR_DEPTH - 2,
        vx: side * 7 + (Math.random() - .5) * 14,
        vy: 65 + speed * .17, radius: 4 + Math.random() * 3,
        life: lifetime, maxLife: lifetime, opacity: reducedMotion ? .12 : .24
      });
      if (steer && !reducedMotion) for (const side of [-1, 1]) smoke.push({
        x: playerX + side * (CAR_W / 2 - 4),
        y: PLAYER_Y + CAR_H / 2 - 15 + CAR_DEPTH,
        vx: -steer * 30 + (Math.random() - .5) * 18,
        vy: 85 + speed * .2, radius: 5,
        life: .55, maxLife: .55, opacity: .18
      });
    }
  }

  function update(dt) {
    if (state === 'menu' || state === 'loading') roadOffset += dt * 55;
    if (state === 'countdown') {
      countdown -= dt;
      $('countdown').textContent = Math.max(1, Math.ceil(countdown));
      if (countdown <= 0) { state = 'racing'; $('countdown').hidden = true; $('pause').disabled = false; }
    }
    if (state === 'racing') {
      speed = Math.min(610, 290 + distance * .105);
      roadOffset += speed * dt; distance += speed * dt * .075; score += speed * dt * .15;
      const steer = Number(keys.has('ArrowRight') || keys.has('d') || touch.right) - Number(keys.has('ArrowLeft') || keys.has('a') || touch.left);
      playerX = Math.max(ROAD_LEFT + CAR_W / 2 + 7, Math.min(ROAD_RIGHT - CAR_W / 2 - 7, playerX + steer * 310 * dt));
      updateSmoke(dt, steer);
      spawnTimer -= dt;
      if (spawnTimer <= 0) { spawnTraffic(); spawnTimer = 1.65 + Math.random() * .45; }
      for (const car of traffic) {
        car.y += (speed - car.speed) * dt;
        if (!car.passed && car.y > PLAYER_Y + CAR_H) { car.passed = true; score += 75; }
        if (Math.abs(car.x - playerX) < CAR_W - 11 && Math.abs(car.y - PLAYER_Y) < CAR_H - 20) { crash(car); break; }
      }
      traffic = traffic.filter(car => car.y < PLAYER_Y + 400);
      if (state === 'racing' && score >= FINISH_SCORE) finishRace();
      updateHUD();
    }
    if (state === 'crashed') {
      crashTime -= dt;
      crashAge += dt;
      updateSmoke(dt, 0);
      for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
      if (crashTime <= 0) endRace();
    }
  }

  function render() {
    const steer = Number(keys.has('ArrowRight') || keys.has('d') || touch.right) - Number(keys.has('ArrowLeft') || keys.has('a') || touch.left);
    scene.render({ playerX, traffic, smoke, particles, roadOffset, state, steer, reducedMotion, crashAge, finishRemaining: Math.max(0, FINISH_SCORE - score) });
    audio.update(state, speed, steer);
  }
  function frame(time) {
    const dt = previousTime ? Math.min((time - previousTime) / 1000, .05) : 0;
    previousTime = time; update(dt); render(); requestAnimationFrame(frame);
  }
  function resize() {
    scene.resize();
  }

  // Delegate screen controls so removing or replacing a button never leaves a
  // listener attached through a null DOM lookup.
  const screenActions = new Map([['start', start], ['pause', pause], ['resume', resume], ['pause-menu', menu], ['finish-restart', start], ['finish-menu', menu]]);
  document.addEventListener('click', event => {
    const button = event.target.closest?.('button');
    if (button && !button.disabled) screenActions.get(button.id)?.();
  });
  const soundButton = $('sound');
  soundButton.hidden = !audio.supported;
  $('test-sound').hidden = !audio.supported;
  function updateSoundButton() {
    const running = audio.context?.state === 'running';
    const enable = audio.muted || audio.failed || !running;
    soundButton.textContent = enable ? '♪̸' : '♪';
    soundButton.setAttribute('aria-label', enable ? 'Enable car sounds' : 'Mute car sounds');
    soundButton.setAttribute('aria-pressed', String(audio.muted));
    soundButton.title = enable ? 'Enable car sounds' : 'Mute car sounds';
    const status = $('audio-status');
    status.textContent = audio.muted ? 'Sound is muted — tap ♪ to enable.'
      : audio.loading ? 'Loading engine recording…'
      : audio.failed ? 'Sound could not load or start — tap ♪ to retry.'
      : audio.context && !running ? 'Audio paused by browser — tap ♪ to enable.' : '';
    status.hidden = !status.textContent;
  }
  audio.onStateChange = updateSoundButton;
  soundButton.addEventListener('click', () => {
    if (audio.muted || audio.failed || audio.context?.state !== 'running') {
      audio.setMuted(false); audio.unlock();
    } else audio.setMuted(true);
  });
  $('test-sound').addEventListener('click', () => audio.test());
  // Retry on a fresh gesture if the browser interrupted or blocked the first start.
  const recoverAudio = event => {
    if (event.target.closest?.('#sound, #test-sound')) return;
    if (!audio.muted && ['racing', 'countdown'].includes(state) && audio.context?.state !== 'running') audio.unlock();
  };
  document.addEventListener('pointerdown', recoverAudio);
  document.addEventListener('keydown', recoverAudio);
  updateSoundButton();
  const fullscreenButton = $('fullscreen');
  fullscreenButton.hidden = !document.fullscreenEnabled;
  fullscreenButton.addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch (_) {
      fullscreenButton.title = 'Fullscreen is unavailable. The game already fills this window.';
    }
  });
  document.addEventListener('fullscreenchange', () => {
    const label = document.fullscreenElement ? 'Exit fullscreen' : 'Enter fullscreen';
    fullscreenButton.setAttribute('aria-label', label); fullscreenButton.title = label;
    resize();
  });
  document.addEventListener('keydown', event => {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (['ArrowLeft', 'ArrowRight', 'a', 'd'].includes(key)) {
      if (['racing', 'countdown'].includes(state)) event.preventDefault();
      keys.add(key);
    }
    if ((key === 'p' || key === 'Escape') && !event.repeat) {
      if (state === 'paused') resume(); else pause();
    }
  });
  document.addEventListener('keyup', event => keys.delete(event.key.length === 1 ? event.key.toLowerCase() : event.key));
  for (const direction of ['left', 'right']) {
    const button = $(direction);
    button.addEventListener('pointerdown', event => {
      event.preventDefault(); button.setPointerCapture(event.pointerId);
      touch[direction] = true; button.classList.add('held');
    });
    const release = () => { touch[direction] = false; button.classList.remove('held'); };
    button.addEventListener('pointerup', release); button.addEventListener('pointercancel', release); button.addEventListener('lostpointercapture', release);
  }
  window.addEventListener('blur', () => { clearInput(); pause(); audio.silence(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { clearInput(); pause(); audio.silence(); } });
  window.addEventListener('resize', resize);
  const raceSection = $('race');
  const pauseWhenScrolledAway = () => {
    if (raceSection.getBoundingClientRect().bottom < window.innerHeight * .6) pause();
  };
  window.addEventListener('scroll', pauseWhenScrolledAway, { passive: true });
  // Native keyboard editing/navigation should not steer the car or toggle pause.
  $('driver-name').addEventListener('keydown', event => event.stopPropagation());
  resize(); requestAnimationFrame(frame);

  const car = new Image();
  car.onload = () => {
    try {
      scene.setCarArtwork(prepareCar(car)); state = 'menu'; $('start').disabled = false;
      $('start').innerHTML = 'START YOUR ENGINE <span>↗</span>';
      $('load-status').textContent = 'THE MILLION-POINT CHALLENGE';
    } catch (error) {
      $('load-status').textContent = 'Please serve this folder with a local web server to load the car.';
      $('start').textContent = 'CAR COULD NOT LOAD'; console.error(error);
    }
  };
  car.onerror = () => {
    $('start').textContent = 'CAR COULD NOT LOAD';
    $('load-status').textContent = 'Check assets/player/car1.png and reload the page.';
  };
  car.src = new URL('../assets/player/car1.png', import.meta.url).href;
})();
