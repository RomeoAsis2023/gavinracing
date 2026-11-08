# Gavin’s Car Racing

A responsive HTML5 / WebGL arcade racer made with Three.js, CSS, and JavaScript. Features your original logo, a modeled red sports car, an endless scrolling highway, traffic, increasing difficulty, keyboard and touch steering, pause/resume, and locally saved best scores.

The real 3D scene uses an elevated perspective camera, modeled cars with wheels and windows, low-poly trees, guardrails, sunlight, soft shadows, atmospheric fog, and billboard smoke particles. The player car matches your red-and-white artwork, with the original image used as a hood decal.

The game fills the browser window with floating score and steering controls. Use the **⛶** button to enter or exit browser fullscreen on supported browsers; **Escape** also exits browser fullscreen. The camera adapts to the window proportions without stretching the artwork.

## Run

With Node.js installed, run:

```sh
npm install
npm run dev
```

Open the local URL printed in the terminal (normally **http://localhost:5173**), or its **Network** URL from another device on your Wi-Fi. A WebGL2-capable browser is required. Run through the development server rather than opening `index.html` directly.

Run `npm run check` for JavaScript syntax checks. To publish, run `npm run build` and upload the generated **dist/** folder to a static host. Relative build URLs support hosting in a subfolder. `npm run preview` serves the production build locally. Three.js and fonts are bundled locally; there are no runtime CDN or Google Fonts requests. Development and preview responses disable caching, and production assets use content-hashed filenames.

`npm run package:site` creates a ready-to-upload **gavins-car-racing-site.zip**. See **DEPLOY.md** for local-network access and hosting on your own website.

## Play

- Click **Start Your Engine** and wait for the three-second countdown.
- Steer using **← / →**, **A / D**, or the touch buttons.
- Forward movement is automatic. Dodge traffic and stay on the road.
- Earn points for distance and **75 bonus points** per vehicle passed.
- Reach **1,000,000 points** to win. A progress bar tracks the target, and a checkered finish line and overhead banner approach as you get close. Crossing it saves your million-point run and opens the victory screen; choose **Race Again** for a fresh attempt.
- **P**, **Escape**, or the pause button pauses the race. Switching tabs automatically pauses too.
- A collision explodes both cars into fire, smoke, and flying debris. The run is saved, then the car returns to its starting position for a new three-second countdown. Scrolling away or switching tabs keeps the next race paused until you return and resume.
- Best scores are saved in browser storage when available.
- Scroll down (or choose **Leaderboard ↓**) for the top 10 runs saved on this device. Enter your driver name there before your next race. Completed runs are ranked by score, then distance, and survive reloads when browser storage is available. Scrolling away from the race automatically pauses it; use **Back to the Race** and resume to continue.
- Car sounds start after clicking Start. Your **`assets/sound/carsound.mp3`** recording loops as the engine sound; its playback speed increases as the car accelerates. Road hiss, steering tire squeal, and collision impact are synthesized with the Web Audio API. Use the **♪** button to mute/unmute; the preference is saved. Audio fades out when paused or in the background.
- The recording's quiet opening/ending is trimmed in memory, its level is normalized, and the loop boundary is crossfaded so sound begins audibly without changing your original MP3.
- Use **Enable / Test Sound** on the menu to unmute and preview the actual MP3. If the browser interrupts audio, tap **♪** to reconnect it. A message below the score shows when audio is muted or could not start.

## Files

- `index.html` — interface, menu, and race overlays.
- `css/styles.css` — responsive layout and visual theme.
- `js/game.js` — game loop, input, traffic, collisions, asset processing, and storage.
- `js/scene.js` — Three.js scene, camera, modeled cars, trees, lighting, and effects.
- `js/audio.js` — recorded engine playback and procedural tire, road, and collision audio.
- `js/leaderboard.js` — named local top-ten scores and leaderboard rendering.
- `package.json` — dependencies and development/build commands.
- `vite.config.js` — static production build configuration.
- `assets/logo/logo.png` — original game logo.
- `assets/player/car1.png` — original player car.
- `assets/sound/carsound.mp3` — looping engine recording.

The car’s outer light background is removed in memory with an edge-connected flood fill; the original artwork and white racing stripes are preserved.
