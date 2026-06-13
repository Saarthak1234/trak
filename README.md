# muStream

muStream is a beautiful, modern Electron Desktop Application that allows you to stream your Spotify playlists completely free by sourcing the official audio directly from YouTube. Say goodbye to Spotify ads and premium limitations.

Featuring a sleek Glassmorphism UI, muStream gives you total control of your playback securely and privately.

## Features

- **Beautiful Desktop Interface:** A modern, premium UI featuring dark mode aesthetics, smooth glassmorphism effects, dynamic layout, and fluid animations.
- **Spotify Integration:** Connect your own Spotify Developer App to securely fetch, browse, and play your private playlists directly from your library.
- **Zero-Setup Playback Backend:** muStream uses `yt-dlp` and `node-mpv` under the hood to stream high-quality audio silently, handling network reconnects and throttling automatically.
- **Advanced Queue Management:**
  - Drag-and-drop your "Up Next" queue to easily reorder upcoming tracks.
  - Remove tracks, clear the queue, or seamlessly append new playlists.
  - Dedicated "Queue Mode" lets you seamlessly modify double-click behaviors for advanced queue control.
- **Expandable Search:** Instantly search for any custom song and start streaming it immediately.
- **Robust Audio Controls:** Real-time synchronized playback tracking, volume slider, next/previous skip controls, and play/pause functionality.

## Installation & Setup

Ensure you have [Node.js](https://nodejs.org) (v18+) and [npm](https://npmjs.com) installed.

### Dependencies
muStream requires `yt-dlp` and `mpv` to be installed on your system to process the audio streams.

**Mac:**
```bash
brew install yt-dlp mpv
```

**Linux (Debian/Ubuntu):**
```bash
sudo apt-get install yt-dlp mpv
```

**Windows:**
Install via [Scoop](https://scoop.sh/) or download them directly and add them to your PATH.
```powershell
scoop install yt-dlp mpv
```

### Install Application
```bash
git clone https://github.com/Saarthak1234/muStream.git
cd muStream
npm install
npm run start:electron
```

## How to Connect Spotify

To fetch your playlists, you must connect your own Spotify Developer App.

1. Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
2. Log in with your Spotify account and click **Create app**.
3. Fill in the required fields (App Name, Description).
4. For **Redirect URI**, you MUST enter exactly: `http://127.0.0.1:8888/callback` (Make sure to click "Add").
5. Check the box for "Web API", accept the terms, and click **Save**.
6. On your app's dashboard, click **Settings**.
7. Copy your **Client ID** and **Client Secret**.
8. Launch muStream, and upon loading the app, you will be prompted to connect to Spotify. muStream securely handles the OAuth 2.0 authentication process locally.

## UI Navigation

- **Playlist Sidebar:** Open the side menu to view all your Spotify playlists. Double-click any playlist to load its tracks.
- **Track List:** 
  - *Single Click:* Highlight a track.
  - *Double Click:* Immediately play the track and queue all subsequent songs.
  - *Add Button (+):* Click the plus button on any track row to silently add it to the end of your queue.
- **Queue Sidebar:** View your "Up Next" list, reorder songs by dragging the handles, or remove songs you don't want to hear.
- **Search Bar:** Click the search icon in the bottom right to dynamically expand the search field and find individual songs.

## How It Works
1. muStream uses the official Spotify API via your developer credentials to fetch your library and extract track names.
2. It passes the track titles and artist names to `yt-dlp`, which does a fast query for the official audio stream URL on YouTube.
3. `mpv` via the `node-mpv` IPC interface streams the audio URL silently in the background.
4. muStream's Electron frontend communicates with the Node.js backend using secure IPC messages to maintain a perfectly synchronized UI.

## License
MIT License.
