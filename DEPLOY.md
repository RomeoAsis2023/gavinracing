# Play on other devices

## Temporary public link

You can expose the production game over HTTPS with a Cloudflare quick tunnel. Keep the serving PC awake and online; stopping the preview/tunnel or restarting the PC ends the session. The leaderboard remains local to each visitor's browser.

To create a session, use two terminals in this project folder:

```powershell
# Terminal 1
npm run build
npm run preview -- --port 4173 --strictPort
```

```powershell
# Terminal 2
npx cloudflared tunnel --url http://127.0.0.1:4173 --protocol http2
```

Open and share the HTTPS URL printed in terminal 2. Each new quick tunnel normally gets a different URL. Stop both foreground commands with Ctrl+C when finished.

## Your local Wi-Fi

1. Run `npm run dev` in this folder.
2. Keep the terminal open. Vite prints a **Network** URL (normally port 5173).
3. Open that Network URL on a phone or computer connected to the same Wi-Fi.
4. If Windows asks, allow Node.js access on your private network.

Use the actual Network URL printed by Vite. The address and port can change when you reconnect to Wi-Fi or when port 5173 is busy.

This local-network URL is available while the PC and server are running. It is not an internet-wide public URL.

## Your website / internet-wide access

1. Run `npm run package:site`.
2. Find **gavins-car-racing-site.zip** in this project folder.
3. Extract the ZIP's contents into a folder on your web host, for example your site's `/racing/` folder. `index.html` must be directly inside that folder, alongside `assets/`.
4. Open `https://your-domain.example/racing/`.

The ZIP is self-contained: JavaScript, Three.js, fonts, images, and the MP3 are included. Visitors need a modern WebGL2 browser, not Node.js. Relative asset paths support subfolders. A standard static web server is enough; no backend is needed. Host `.js` as JavaScript and `.mp3` as `audio/mpeg`, as most hosts do by default.

Do not upload the source `index.html` on its own: use the ZIP contents or the contents of **dist/**. The source version needs Vite to resolve its dependencies. When updating the website, replace `index.html` and upload the new content-hashed assets together.

The ZIP can also be uploaded to a static hosting service such as Netlify Drop after signing into that service. A permanent public link requires a host; quick tunnels are temporary.

## Sound

Tap **Enable / Test Sound** or start a race to allow browser audio. The original recording is `assets/sound/carsound.mp3`; the game trims its quiet opening/ending in memory, normalizes the audible section, and crossfades the loop. The source MP3 remains unchanged. The audio is loaded from the same website as the game, never from a Windows file path.

If the on-screen sound message says muted, tap **♪** to unmute. Your browser/device's own volume and site-mute settings also apply. Scores and names are local to each browser, not shared between players.
