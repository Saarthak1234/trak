# Trak

Trak is a beautiful, modern Electron Desktop Application that allows you to stream music completely free by sourcing the official audio directly from YouTube. Say goodbye to ads and premium limitations.

**Note: Trak is currently only available for macOS.**

Featuring a sleek Glassmorphism UI, Trak gives you total control of your playback securely and privately, with or without a Spotify account.

---

## Demo

<a href="https://www.loom.com/share/eb22f38109514806aca9f4ad90e88c86">
  <img src="https://www.loom.com/v1/videos/eb22f38109514806aca9f4ad90e88c86/thumbnail.gif" alt="Trak demo video" width="100%">
</a>

▶️ **[Watch the full demo on Loom](https://www.loom.com/share/eb22f38109514806aca9f4ad90e88c86)**

---

## Installation

### macOS (Recommended: Homebrew)
Apple's Gatekeeper often blocks indie apps from opening. To **completely bypass** the "Damaged App" error and install all required dependencies automatically, use Homebrew:
```bash
brew install saarthak1234/trak/trak
```

### macOS (Manual Download)
1. Download the latest `.zip` release from the [Releases page](https://github.com/Saarthak1234/trak/releases). *(Use the `.zip` instead of `.dmg` to avoid Gatekeeper extraction bugs).*
2. Unzip and drag `Trak.app` to your Applications folder.
3. **Important:** Do not double-click! **Right-Click** (or Control+Click) `Trak.app` and select **Open**. Click "Open Anyway" to bypass Apple's security warning.

---

## Core Features (No Login Required)
Trak works out of the box immediately. You don't need to sign in to anything to use these core features:

- **Universal Search & Play:** Click the Search icon at the bottom to find and instantly play any song, album, or artist directly from YouTube.
- **Global Keyboard Shortcuts:** Control your music from *anywhere*.
  - Use shortcuts (like `Cmd+Shift+Right`) to skip tracks, pause, or toggle shuffle while using other apps.
  - Press `Cmd+Shift+M` to instantly pop up the Trak window over any other application.
  - *Note: Global shortcut capture can be easily toggled off in the Settings menu if you prefer in-app only shortcuts.*
- **Stunning UI Customization:** Make Trak yours.
  - **Glassmorphism:** A modern, frosted-glass UI that blurs what's behind it.
  - **Custom Themes & Colors:** Use the built-in color picker to set dynamic accent colors.
  - **Animated Backgrounds:** Upload custom animated GIFs to play dynamically behind the frosted glass.
  - **Opacity Sliders:** Dial in the exact transparency and blur of the window background.

---

## Spotify Integration
Want to bring your existing library over? Trak can securely connect to your Spotify account to fetch your playlists.

- **Import Playlists:** Browse and load your private and public Spotify playlists directly in the sidebar.
- **Advanced Queue Management:** Drag-and-drop your "Up Next" queue, seamlessly append new playlists, or clear the queue on the fly.
- **Secure Local Auth:** Authentication happens entirely on your local machine using your own Developer API keys.

---

## How to Connect Spotify

To fetch your playlists, you must connect your own Spotify Developer App.

1. Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
2. Log in with your Spotify account and click **Create app**.
3. Fill in the required fields (App Name, Description).
4. For **Redirect URI**, you MUST enter exactly: `http://127.0.0.1:8888/callback` (Make sure to click "Add").
5. Check the box for "Web API", accept the terms, and click **Save**.
6. On your app's dashboard, click **Settings**.
7. Copy your **Client ID** and **Client Secret**.
8. Open the **Settings** menu in Trak, click "Login to Spotify", and enter your keys (or click "Get Credentials?" in the app to open the dashboard directly).

---

## Dependencies

Trak relies on `mpv` and `yt-dlp` to fetch and stream audio without ads. 
**Trak will automatically prompt you to install these on first launch** using your system's package manager (Homebrew, apt, Scoop).

If the auto-install fails, you can install them manually:
- **macOS:** `brew install yt-dlp mpv`

---

## Build From Source

Ensure you have [Node.js](https://nodejs.org) (v18+) and [npm](https://npmjs.com) installed.

```bash
git clone https://github.com/Saarthak1234/trak.git
cd trak
npm install
npm run start:electron
```

## Credits & Attribution

Trak was designed and solely developed as a passion project by **Saarthak Agarwal**. 

This project is completely open-source and free for anyone to use, learn from, or fork! If you do use pieces of this codebase for your own projects, a small shoutout or link back to this repository would be greatly appreciated.

---

## License
MIT License.
