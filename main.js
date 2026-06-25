import { app, BrowserWindow, ipcMain, globalShortcut, dialog, shell, Tray, nativeImage, Menu } from 'electron'

// Set app name for macOS menu bar
app.setName('Trak')

import fixPath from 'fix-path'

// Fix the $PATH on macOS when run from a GUI app so it can find Homebrew bins like mpv
fixPath()
import path from 'path'
import fs from 'fs'
import { execSync, exec } from 'child_process'
import { fileURLToPath } from 'url'
import { searchCommand } from './src/youtube.js'
import mpvAPI from 'node-mpv'
import spotifyUrlInfo from 'spotify-url-info'
import nodeFetch from 'node-fetch'
import SpotifyWebApi from 'spotify-web-api-node'
import 'dotenv/config'

const customFetch = (url, options = {}) => {
  options.headers = {
    ...options.headers,
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  }
  return nodeFetch(url, options)
}

const { getTracks } = spotifyUrlInfo(customFetch)
import { isLoggedIn, getTokens, isTokenExpired, saveTokens, saveAppCredentials, getAppCredentials, hardReset } from './src/config.js'
import { getSpotifyClient, electronAuthCommand } from './src/auth.js'

// mpv is initialized lazily after the dependency check (see app.whenReady)
let mpv = null

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let mainWindow
let credsWindow = null
let gifWindow = null
let settingsWindow = null
let tray = null

// ─── Playlist Cache ──────────────────────────────────────────────────────────
let playlistCache = null
let playlistCacheTime = 0
const PLAYLIST_CACHE_TTL = 5 * 60 * 1000 // 5 minutes
// ─────────────────────────────────────────────────────────────────────────────

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 500,
    height: 350,
    transparent: true,
    frame: false,
    resizable: true,
    minWidth: 400,
    minHeight: 250,
    title: 'Trak',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false
    }
  })

  mainWindow.on('close', (event) => {
    if (!app.isQuiting) {
      event.preventDefault()
      mainWindow.hide()
    }
    return false
  })

  // We rely on CSS backdrop-filter for the glass effect so the opacity slider works!
  mainWindow.loadFile(path.join(__dirname, 'ui', 'index.html'))
}

// ─── Dependency Management ─────────────────────────────────────────────────

function isCmdAvailable(cmd) {
  try { execSync(`${cmd} --version`, { stdio: 'ignore' }); return true } catch { return false }
}

function runInstallCmd(cmd, usePS = false) {
  return new Promise((resolve) => {
    const options = usePS ? { shell: 'powershell.exe' } : { shell: true }
    exec(cmd, options, (err) => {
      if (err) console.error('Install failed:', err.message)
      resolve(!err)
    })
  })
}

// On Windows: add bundled vendor binaries (mpv.exe, yt-dlp.exe) to PATH
// These are included inside the installer via electron-builder extraResources
function addVendoredBinariesToPath() {
  if (process.platform !== 'win32') return
  const vendorPath = app.isPackaged
    ? path.join(process.resourcesPath, 'vendor')
    : path.join(__dirname, 'vendor', 'win')
  if (fs.existsSync(vendorPath)) {
    process.env.PATH = vendorPath + path.delimiter + process.env.PATH
    console.log('Using bundled binaries from:', vendorPath)
  }
}

async function checkAndInstallDeps() {
  // Windows: binaries are bundled — nothing to install
  if (process.platform === 'win32') return

  const missing = []
  if (!isCmdAvailable('mpv'))    missing.push('mpv')
  if (!isCmdAvailable('yt-dlp')) missing.push('yt-dlp')
  if (missing.length === 0) return

  const names = missing.join(' and ')
  let installCmd = null
  let managerName = null

  if (process.platform === 'darwin') {
    if (isCmdAvailable('brew')) {
      installCmd = `brew install ${missing.join(' ')}`
      managerName = 'Homebrew'
    }
  } else if (process.platform === 'linux') {
    if (isCmdAvailable('apt-get')) {
      installCmd = `pkexec apt-get install -y ${missing.join(' ')}`
      managerName = 'apt'
    } else if (isCmdAvailable('dnf')) {
      installCmd = `pkexec dnf install -y ${missing.join(' ')}`
      managerName = 'dnf'
    } else if (isCmdAvailable('pacman')) {
      installCmd = `pkexec pacman -S --noconfirm ${missing.join(' ')}`
      managerName = 'pacman'
    }
  }

  if (installCmd && managerName) {
    const { response } = await dialog.showMessageBox({
      type: 'warning',
      title: 'Missing Dependencies',
      message: `Trak needs ${names} to play audio.`,
      detail: `Click "Install Now" to automatically install ${names} using ${managerName}.`,
      buttons: ['Install Now', "Skip (I'll do it manually)"],
      defaultId: 0,
      cancelId: 1
    })

    if (response === 0) {
      const progressDialog = new BrowserWindow({
        width: 400, height: 150,
        frame: false, transparent: true,
        alwaysOnTop: true, resizable: false,
        webPreferences: { contextIsolation: true }
      })
      progressDialog.loadURL(`data:text/html;charset=utf-8,<!DOCTYPE html><html><head><meta charset="UTF-8"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:sans-serif;background:rgba(15,15,15,0.97);color:white;display:flex;align-items:center;justify-content:center;height:100vh;overflow:hidden;border-radius:12px;border:1px solid rgba(255,255,255,0.1);}p{text-align:center;line-height:1.6;}small{opacity:0.5;font-size:12px;}</style></head><body><p>Installing ${names}...<br><small>This may take a minute.</small></p></body></html>`)

      const success = await runInstallCmd(installCmd)
      progressDialog.close()

      if (success) {
        await dialog.showMessageBox({ type: 'info', title: 'Done!', message: `${names} installed successfully.`, buttons: ['OK'] })
      } else {
        const { response: r } = await dialog.showMessageBox({
          type: 'error', title: 'Installation Failed',
          message: `Could not install ${names} automatically.`,
          detail: `Please install manually and restart Trak.\nSee: https://github.com/Saarthak1234/Trak#dependencies`,
          buttons: ['Open Docs', 'Continue Anyway'], defaultId: 0
        })
        if (r === 0) shell.openExternal('https://github.com/Saarthak1234/Trak#dependencies')
      }
    }
  } else {
    const { response } = await dialog.showMessageBox({
      type: 'warning', title: 'Missing Dependencies',
      message: `Trak needs ${names} to play audio.`,
      detail: `Please install ${names} manually and restart.\nSee: https://github.com/Saarthak1234/Trak#dependencies`,
      buttons: ['Open Docs', 'Continue Anyway'], defaultId: 0
    })
    if (response === 0) shell.openExternal('https://github.com/Saarthak1234/Trak#dependencies')
  }
}
// ──────────────────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  // Step 1: Add bundled binaries to PATH (Windows: mpv.exe + yt-dlp.exe are inside the installer)
  addVendoredBinariesToPath()

  // Step 2: On Mac/Linux, offer to install missing deps via package manager
  try {
    await checkAndInstallDeps()
  } catch (e) {
    console.error('Dependency check error (non-fatal):', e.message)
  }

  // Step 3: Initialize mpv (now that PATH includes vendored binaries)
  try {
    mpv = new mpvAPI({ audio_only: true, debug: false })
  } catch (e) {
    console.warn('mpv could not be initialized:', e.message)
  }

  const iconPath = path.join(__dirname, 'icon.png')
  if (fs.existsSync(iconPath)) {
    if (process.platform === 'darwin') {
      app.dock.setIcon(iconPath)
    }
  }

  const trayIconPath = path.join(__dirname, 'trayTemplate.png')
  if (fs.existsSync(trayIconPath)) {
    tray = new Tray(nativeImage.createFromPath(trayIconPath))
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Show App', click: () => { if(mainWindow) { mainWindow.show(); mainWindow.focus(); } else { createWindow(); } } },
      { label: 'Hide App', click: () => { if(mainWindow) mainWindow.hide(); } },
      { type: 'separator' },
      { label: 'Play/Pause', click: async () => { try { await mpv.togglePause() } catch(e) {} } },
      { label: 'Next Track', click: () => { isManualStop = true; try { mpv.stop() } catch(e){}; handleNextSong(); } },
      { type: 'separator' },
      { label: 'Quit', click: () => { app.quit() } }
    ])
    tray.setToolTip('Trak')
    tray.setContextMenu(contextMenu)
  }

  createWindow()

  let currentGlobalShortcut = null;
  ipcMain.handle('update-global-shortcut', (event, newShortcut) => {
    if (currentGlobalShortcut) {
      globalShortcut.unregister(currentGlobalShortcut);
    }
    currentGlobalShortcut = newShortcut;
    if (newShortcut) {
      try {
        globalShortcut.register(newShortcut, () => {
          if (mainWindow) {
            if (mainWindow.isVisible() && mainWindow.isFocused()) {
              mainWindow.minimize()
            } else {
              mainWindow.show()
              mainWindow.focus()
            }
          } else {
            createWindow()
          }
        })
      } catch(e) {}
    }
  });

  ipcMain.handle('register-global-shortcuts', (event, shortcuts) => {
    globalShortcut.unregisterAll();
    
    const normalizeShortcut = (shortcutStr) => {
      if (!shortcutStr) return null;
      return shortcutStr
        .replace(/\bArrowRight\b/g, 'Right')
        .replace(/\bArrowLeft\b/g, 'Left')
        .replace(/\bArrowUp\b/g, 'Up')
        .replace(/\bArrowDown\b/g, 'Down')
        .replace(/\+\s$/, '+Space')
        .replace(/\+Spacebar$/, '+Space');
    };

    const normalizedGlobalToggle = normalizeShortcut(shortcuts.globalToggle);
    if (normalizedGlobalToggle) {
      try {
        globalShortcut.register(normalizedGlobalToggle, () => {
          if (mainWindow) {
            if (mainWindow.isVisible() && mainWindow.isFocused()) {
              mainWindow.minimize()
            } else {
              mainWindow.show()
              mainWindow.focus()
            }
          } else {
            createWindow()
          }
        })
      } catch(e) {}
    }

    const mapAction = (key, actionName) => {
      const normalized = normalizeShortcut(shortcuts[key]);
      if (normalized) {
        try {
          globalShortcut.register(normalized, () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              if (['search', 'settings', 'gifPicker'].includes(actionName)) {
                mainWindow.show()
                mainWindow.focus()
              }
              mainWindow.webContents.send('global-action', actionName)
            }
          })
        } catch(e) {}
      }
    }

    mapAction('playPause', 'playPause')
    mapAction('nextSong', 'nextSong')
    mapAction('prevSong', 'prevSong')
    mapAction('loop', 'loop')
    mapAction('shuffle', 'shuffle')
    mapAction('search', 'search')
    mapAction('gifPicker', 'gifPicker')
    mapAction('settings', 'settings')
  });

  // Debug: Listen to MPV's native timeposition event (this often fails for streams)
  mpv.on('timeposition', (time) => {
    // console.log('DEBUG [main.js]: mpv.on(timeposition) fired:', time)
    if (mainWindow && !mainWindow.isDestroyed() && currentTrack) {
      mainWindow.webContents.send('playback-time', time)
    }
  })

  // Debug: Manual polling fallback (guaranteed to work for streams)
  setInterval(async () => {
    try {
      const pos = await mpv.getProperty('time-pos')
      if (pos !== undefined && pos !== null) {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('playback-time', pos)
        }
      }
      
      const isPaused = await mpv.getProperty('pause')
      if (isPaused !== undefined && isPaused !== null) {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('playback-state-update', isPaused)
        }
      }
    } catch(e){}
  }, 1000)

  mpv.on('stopped', () => {
    console.log(`[MPV EVENT] 'stopped' fired! app.isQuiting=${app.isQuiting}, isManualStop=${isManualStop}`);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('playback-stopped')
    }
    // Only proceed to next song naturally if we aren't manually stopping/loading
    if (!app.isQuiting && !isManualStop) {
      console.log(`[MPV EVENT] Natural stop detected, calling handleNextSong()`);
      handleNextSong()
    } else {
      console.log(`[MPV EVENT] Ignored stopped event due to isManualStop=${isManualStop}`);
    }
  })

  app.on('activate', () => {
    if (mainWindow) {
      mainWindow.show()
    } else {
      createWindow()
    }
  })
})

app.on('before-quit', () => {
  app.isQuiting = true
  try { mpv.quit() } catch(e) {}
})

app.on('window-all-closed', () => {
  // On Linux/Windows: fully quit so mpv is killed cleanly
  if (process.platform !== 'darwin') {
    app.isQuiting = true
    try { mpv.quit() } catch(e) {}
    app.quit()
  }
})

// IPC Handlers
ipcMain.handle('close-app', () => {
  if (process.platform === 'darwin') {
    // macOS: hide to tray (re-open via global shortcut)
    if (mainWindow) mainWindow.hide()
  } else {
    // Linux/Windows: fully quit and kill mpv
    app.isQuiting = true
    try { mpv.quit() } catch(e) {}
    app.quit()
  }
})
ipcMain.handle('minimize-app', () => {
  if (mainWindow) mainWindow.minimize()
})

ipcMain.handle('open-external', (event, url) => {
  if (url) {
    shell.openExternal(url);
  }
})

ipcMain.handle('open-credentials-window', () => {
  if (credsWindow) {
    credsWindow.focus()
    return
  }
  credsWindow = new BrowserWindow({
    width: 400,
    height: 320,
    frame: false,
    transparent: true,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })
  credsWindow.loadFile(path.join(__dirname, 'ui', 'credentials.html'))
  credsWindow.on('closed', () => { credsWindow = null })
})

ipcMain.handle('save-spotify-creds', async (event, id, secret) => {
  saveAppCredentials({ clientId: id, clientSecret: secret })
  if (credsWindow) credsWindow.close()
  try {
    await electronAuthCommand((url) => shell.openExternal(url))
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.reload()
    }
    if (settingsWindow && !settingsWindow.isDestroyed()) {
      settingsWindow.reload()
    }
  } catch (err) {
    console.error("Auth failed:", err)
  }
})

ipcMain.handle('save-custom-theme', (event, theme) => {
  const themesPath = path.join(app.getPath('userData'), 'user-themes.json')
  let themes = []
  if (fs.existsSync(themesPath)) {
    try { themes = JSON.parse(fs.readFileSync(themesPath, 'utf8')) } catch(e){}
  }
  themes.push(theme)
  fs.writeFileSync(themesPath, JSON.stringify(themes))
  return true
})

ipcMain.handle('delete-custom-theme', (event, themeName) => {
  const themesPath = path.join(app.getPath('userData'), 'user-themes.json')
  let themes = []
  if (fs.existsSync(themesPath)) {
    try { themes = JSON.parse(fs.readFileSync(themesPath, 'utf8')) } catch(e){}
  }
  themes = themes.filter(t => t.name !== themeName)
  fs.writeFileSync(themesPath, JSON.stringify(themes))
  return true
})

ipcMain.handle('load-custom-themes', () => {
  const themesPath = path.join(app.getPath('userData'), 'user-themes.json')
  if (fs.existsSync(themesPath)) {
    try { return JSON.parse(fs.readFileSync(themesPath, 'utf8')) } catch(e){}
  }
  return []
})

ipcMain.handle('get-spotify-creds', () => getAppCredentials())
ipcMain.handle('close-credentials-window', () => {
  if (credsWindow) credsWindow.close()
})

ipcMain.handle('open-gif-window', () => {
  if (gifWindow) {
    gifWindow.focus()
    return
  }
  gifWindow = new BrowserWindow({
    width: 440,
    height: 480,
    frame: false,
    transparent: true,
    ...(process.platform === 'darwin' ? { vibrancy: 'fullscreen-ui' } : {}),
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })
  gifWindow.loadFile(path.join(__dirname, 'ui/gif-picker.html'))
  gifWindow.on('closed', () => gifWindow = null)
})

ipcMain.handle('open-settings', () => {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus()
    return
  }
  settingsWindow = new BrowserWindow({
    width: 900,
    height: 700,
    frame: false,
    transparent: true,
    resizable: false,
    ...(process.platform === 'darwin' ? { vibrancy: 'fullscreen-ui' } : {}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false
    }
  })
  settingsWindow.loadFile(path.join(__dirname, 'ui', 'settings.html'))
  settingsWindow.on('closed', () => { settingsWindow = null })
})

ipcMain.handle('close-settings', () => {
  if (settingsWindow && !settingsWindow.isDestroyed()) settingsWindow.close()
})

ipcMain.handle('sync-settings', (event, settings) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('settings-synced', settings)
  }
})

ipcMain.handle('select-gif', (event, url, name) => {
  if (mainWindow) {
    mainWindow.webContents.send('gif-selected', { url, name })
  }
})


ipcMain.handle('is-logged-in', () => {
  return isLoggedIn()
})

ipcMain.handle('logout-spotify', () => {
  hardReset()
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.reload()
  if (settingsWindow && !settingsWindow.isDestroyed()) settingsWindow.reload()
})

import { getStreamData } from './src/youtube.js'

async function safeGetSpotifyClient() {
  if (!isLoggedIn()) return null
  
  const spotify = getSpotifyClient()
  const { accessToken, refreshToken } = getTokens()
  
  spotify.setAccessToken(accessToken)
  spotify.setRefreshToken(refreshToken)

  if (isTokenExpired()) {
    try {
      const data = await spotify.refreshAccessToken()
      spotify.setAccessToken(data.body.access_token)
      saveTokens({
        accessToken:  data.body.access_token,
        refreshToken: data.body.refresh_token || refreshToken,
        expiresIn:    data.body.expires_in,
      })
    } catch (err) {
      return null
    }
  }
  return spotify
}

ipcMain.handle('get-playlists', async () => {
  if (!isLoggedIn()) return { status: 'not_connected' }

  // Return cache immediately if fresh, then refresh in background
  const now = Date.now()
  const cacheValid = playlistCache && (now - playlistCacheTime) < PLAYLIST_CACHE_TTL

  async function fetchFresh() {
    const spotify = await safeGetSpotifyClient()
    if (!spotify) return { status: 'not_connected' }
    try {
      const data = await spotify.getUserPlaylists({ limit: 50 })
      const playlists = [
        { id: 'liked_songs', name: '❤️  Liked Songs' },
        ...data.body.items.map(p => ({ id: p.id, name: p.name }))
      ]
      const result = { status: 'success', playlists }
      playlistCache = result
      playlistCacheTime = Date.now()
      // Notify renderer of updated data so it can refresh seamlessly
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('playlists-updated', result)
      }
      return result
    } catch (err) {
      return { status: 'error', message: err.message }
    }
  }

  if (cacheValid) {
    // Return cache immediately, refresh silently in background
    fetchFresh().catch(console.error)
    return playlistCache
  }

  // No valid cache — fetch and wait
  return await fetchFresh()
})




ipcMain.handle('get-playlist-tracks', async (event, playlistId) => {
  const spotify = await safeGetSpotifyClient()
  if (!spotify) return { status: 'error', message: 'Not connected' }
  const token = spotify.getAccessToken()
  const tracks = []
  let offset = 0
  const limit = playlistId === 'liked_songs' ? 50 : 100
  
  try {
    while (true) {
      let url = playlistId === 'liked_songs' 
        ? `https://api.spotify.com/v1/me/tracks?limit=${limit}&offset=${offset}`
        : `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=${limit}&offset=${offset}`
        
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      
      if (data.error) {
        if (data.error.status === 403) {
          // Spotify API blocks algorithmic playlists (like Daily Mixes) via API. Fallback to public web scraping!
          try {
            const publicUrl = `https://open.spotify.com/playlist/${playlistId}`
            const rawTracks = await getTracks(publicUrl)
            if (rawTracks && rawTracks.length > 0) {
              const mapped = rawTracks.map(t => ({
                name: t.name,
                artist: t.artists ? t.artists.map(a => a.name).join(', ') : (t.artist || 'Unknown'),
                duration_ms: t.duration || t.duration_ms || 0
              }))
              return { status: 'success', tracks: mapped }
            }
          } catch (scrapeErr) {
            return { status: 'error', message: 'Spotify blocks third-party apps from reading this algorithmic playlist (e.g. Daily Mix/Blend).' }
          }
        }
        console.error('Spotify API Error:', data.error)
        return { status: 'error', message: data.error.message }
      }
      
      const items = data.items
      if (!items || items.length === 0) break

      items.forEach(obj => {
        const trackObj = obj.track || obj.item
        if (trackObj && !trackObj.is_local && trackObj.name) {
          tracks.push({
            name: trackObj.name,
            artist: trackObj.artists?.[0]?.name ?? 'Unknown',
            album: trackObj.album?.name ?? '',
            duration_ms: trackObj.duration_ms || 0
          })
        }
      })
      
      if (items.length < limit || tracks.length >= (data.total || 0)) {
        break
      }
      offset += limit
    }
    
    return { status: 'success', tracks }
  } catch (err) {
    console.error('get-playlist-tracks error:', err)
    return { status: 'error', message: err.message }
  }
})

ipcMain.handle('fetch-playlist-url', async (event, url) => {
  try {
    const creds = getAppCredentials()
    const clientId = creds.clientId || process.env.SPOTIFY_CLIENT_ID
    const clientSecret = creds.clientSecret || process.env.SPOTIFY_CLIENT_SECRET
    
    // Try Official API if we have a way to authenticate
    if (isLoggedIn() || (clientId && clientSecret)) {
      try {
        const spotify = new SpotifyWebApi({ clientId, clientSecret })
        
        if (isLoggedIn()) {
          const { accessToken } = getTokens()
          spotify.setAccessToken(accessToken)
        } else {
          const grant = await spotify.clientCredentialsGrant()
          spotify.setAccessToken(grant.body['access_token'])
        }
        
        const match = url.match(/playlist\/([a-zA-Z0-9]+)/)
        if (!match) throw new Error('Invalid Spotify Playlist URL')
        const playlistId = match[1]
        
        let tracks = []
        let offset = 0
        let limit = 100
        let total = 100
        
        const plInfo = await spotify.getPlaylist(playlistId)
        const playlistName = plInfo.body.name || 'Saved Playlist'
        
        while (offset < total) {
          const res = await spotify.getPlaylistTracks(playlistId, { offset, limit })
          total = res.body.total
          
          const chunk = res.body.items
            .filter(item => item && item.track)
            .map(item => ({
              name: item.track.name,
              artist: item.track.artists?.[0]?.name || 'Unknown',
              album: item.track.album?.name || '',
              duration_ms: item.track.duration_ms || 0
            }))
            
          tracks = tracks.concat(chunk)
          offset += limit
        }
        return { status: 'success', tracks, playlistName }
      } catch (apiErr) {
        console.error('Official API failed, falling back to scraper...', apiErr.message)
        // If API fails, silently fall through to scraper
      }
    }
    
    // Fallback: spotify-url-info scraper (using pure node-fetch)
    const spotifyUrlInfoAPI = spotifyUrlInfo(nodeFetch)
    const rawData = await spotifyUrlInfoAPI.getData(url).catch(() => null)
    const playlistName = rawData?.name || rawData?.title || 'Saved Playlist'
    
    const rawTracks = await spotifyUrlInfoAPI.getTracks(url)
    
    const tracks = rawTracks.map(t => ({
      name: t.name,
      artist: t.artists?.[0]?.name || t.artist || 'Unknown',
      album: t.album?.name || '',
      duration_ms: t.duration || t.duration_ms || t.durationMs || 0
    }))
    
    return { status: 'success', tracks, playlistName }
  } catch (err) {
    console.error('fetch-playlist-url error:', err)
    let msg = err.message
    if (msg.includes('Couldn\'t find any data')) {
      msg = 'Spotify blocked the request or the playlist is private. Please log in or add your API credentials in Settings.'
    }
    return { status: 'error', message: msg }
  }
})

let playQueue = []
let originalQueue = []
let playHistory = []
let isLooping = false
let isShuffling = false
let currentTrack = null
let isManualStop = false

let currentPlayToken = 0

// Background preloading logic
let preloadedNextTrack = null;
let preloadToken = 0;

async function preloadNext() {
  if (playQueue.length === 0) return;
  const nextQuery = playQueue[0];
  const myToken = ++preloadToken;
  try {
    const data = await getStreamData(nextQuery);
    if (myToken === preloadToken) {
      preloadedNextTrack = { query: nextQuery, data };
      console.log(`[Preload] Successfully cached next track: ${data.title}`);
    }
  } catch(e) {
    console.error('[Preload] Failed to preload next track:', e.message);
  }
}

async function playTrack(query) {
  const token = ++currentPlayToken
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('track-loading', query)
  try {
    let data;
    if (preloadedNextTrack && preloadedNextTrack.query === query) {
      console.log(`[playTrack] Cache HIT for '${query}'! Playing instantly.`);
      data = preloadedNextTrack.data;
      preloadedNextTrack = null;
    } else {
      console.log(`[playTrack] Cache MISS for '${query}'. Fetching...`);
      data = await getStreamData(query);
    }

    // Fire and forget preload for the new next song in queue
    preloadNext();

    // If the user clicked another song while this one was loading, abort!
    if (token !== currentPlayToken) {
      console.log(`[playTrack] Aborting playback of '${query}' because a newer track was requested.`)
      return
    }
    
    if (!data.streamUrl) throw new Error('No stream found')
    let durationSeconds = 0
    if (data.durationStr) {
      const parts = data.durationStr.split(':').map(Number)
      if (parts.length === 3) durationSeconds = parts[0]*3600 + parts[1]*60 + parts[2]
      else if (parts.length === 2) durationSeconds = parts[0]*60 + parts[1]
      else if (parts.length === 1) durationSeconds = parts[0]
    }
    
    currentTrack = { title: data.title, artist: 'YouTube', durationSeconds, durationStr: data.durationStr, query }

    isManualStop = true;
    await mpv.load(data.streamUrl, 'replace')
    if (isLooping) {
      try { mpv.loop('inf') } catch(e){}
    }
    await mpv.play()
    setTimeout(() => { isManualStop = false }, 1500)
    
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('track-started', currentTrack)
    }
  } catch (err) {
    if (token !== currentPlayToken) return // Suppress errors if aborted
    console.error('Playback error:', err)
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('track-error', err.message)
    setTimeout(handleNextSong, 2000)
  }
}

function handleNextSong() {
  console.log(`[handleNextSong] Called. Current Queue Length: ${playQueue.length}`);
  if (currentTrack) playHistory.push(currentTrack.query)
  if (playQueue.length > 0) {
    let nextQuery = playQueue.shift()
    console.log(`[handleNextSong] Popped '${nextQuery}', playing...`);
    playTrack(nextQuery)
  } else {
    console.log(`[handleNextSong] Queue empty, stopping.`);
    currentTrack = null
  }
}

function handlePrevSong() {
  if (playHistory.length > 0) {
    if (currentTrack) playQueue.unshift(currentTrack.query)
    const prevQuery = playHistory.pop()
    playTrack(prevQuery)
  } else if (currentTrack) {
    mpv.goToPosition(0)
  }
}

ipcMain.handle('search-song', async (event, query) => {
  if (currentTrack && (!playHistory.length || playHistory[playHistory.length - 1] !== currentTrack.query)) {
    playHistory.push(currentTrack.query)
  }
  try { await mpv.pause() } catch(e) {}
  playTrack(query)

  return { success: true }
})

ipcMain.handle('add-queue', (event, query) => {
  playQueue.unshift(query)
  preloadNext()
  return playQueue
})

ipcMain.handle('get-queue', () => playQueue)

ipcMain.handle('clear-queue', () => {
  if (!playQueue.length) return playQueue;
  playQueue = []
  return playQueue
})

ipcMain.handle('reorder-queue', (e, oldIndex, newIndex) => {
  if (!playQueue.length) return playQueue;
  if (oldIndex >= 0 && oldIndex < playQueue.length && newIndex >= 0 && newIndex < playQueue.length) {
    const [item] = playQueue.splice(oldIndex, 1)
    playQueue.splice(newIndex, 0, item)
  }
  return playQueue
})

ipcMain.handle('splice-queue', (e, start, deleteCount) => {
  if (!playQueue.length) return playQueue;
  playQueue.splice(start, deleteCount)
  return playQueue
})

ipcMain.handle('set-queue', (event, newQueue) => {
  playQueue = Array.isArray(newQueue) ? newQueue : []
  if (isShuffling) {
    originalQueue = [...playQueue]
    for (let i = playQueue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [playQueue[i], playQueue[j]] = [playQueue[j], playQueue[i]];
    }
  }
  preloadNext()
  return playQueue
})

ipcMain.handle('next-song', async () => {
  console.log(`[IPC] 'next-song' received from UI!`);
  isManualStop = true
  try { await mpv.stop() } catch(e){}
  handleNextSong()
})

ipcMain.handle('prev-song', async () => {
  isManualStop = true
  try { await mpv.stop() } catch(e){}
  handlePrevSong()
})

ipcMain.handle('toggle-loop', () => {
  isLooping = !isLooping
  try {
    if (isLooping) mpv.loop('inf')
    else mpv.clearLoop()
  } catch(e) {}
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('loop-toggled', isLooping)
  return isLooping
})

ipcMain.handle('toggle-shuffle', () => {
  isShuffling = !isShuffling
  if (isShuffling) {
    originalQueue = [...playQueue]
    for (let i = playQueue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [playQueue[i], playQueue[j]] = [playQueue[j], playQueue[i]];
    }
  } else {
    const newlyAdded = playQueue.filter(track => !originalQueue.includes(track))
    playQueue = [...originalQueue.filter(track => playQueue.includes(track)), ...newlyAdded]
  }
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('shuffle-toggled', isShuffling)
  return isShuffling
})

ipcMain.handle('toggle-play', async () => {
  try { await mpv.togglePause() } catch(e) {}
})

ipcMain.handle('seek', async (event, seconds) => {
  try { await mpv.goToPosition(seconds) } catch(e) {}
})
