import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import { searchCommand } from './src/youtube.js'
import mpvAPI from 'node-mpv'
import spotifyUrlInfo from 'spotify-url-info'

const { getTracks } = spotifyUrlInfo(fetch)
import { isLoggedIn, getTokens, isTokenExpired, saveTokens, saveAppCredentials, getAppCredentials } from './src/config.js'
import { getSpotifyClient } from './src/auth.js'

const mpv = new mpvAPI({
  audio_only: true,
  debug: false
})

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 500,
    height: 350,
    transparent: true,
    frame: false,
    resizable: true,
    minWidth: 400,
    minHeight: 250,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
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

app.whenReady().then(() => {
  createWindow()

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
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('playback-stopped')
    }
    if (!app.isQuiting && !isManualStop) {
      handleNextSong()
    }
    isManualStop = false
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
  if (process.platform !== 'darwin') app.quit()
})

// IPC Handlers
ipcMain.handle('close-app', () => {
  if (mainWindow) mainWindow.hide()
})
ipcMain.handle('minimize-app', () => {
  if (mainWindow) mainWindow.minimize()
})

let credsWindow
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

ipcMain.handle('save-spotify-creds', (event, id, secret) => {
  saveAppCredentials({ clientId: id, clientSecret: secret })
  if (credsWindow) credsWindow.close()
})

ipcMain.handle('get-spotify-creds', () => getAppCredentials())
ipcMain.handle('close-credentials-window', () => { if (credsWindow) credsWindow.close() })
ipcMain.handle('is-logged-in', () => isLoggedIn())

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
  
  const spotify = await safeGetSpotifyClient()
  if (!spotify) return { status: 'not_connected' }
  
  try {
    const token = spotify.getAccessToken()
    const res = await fetch(`https://api.spotify.com/v1/me/playlists?limit=50`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    const data = await res.json()
    
    const likedRes = await fetch(`https://api.spotify.com/v1/me/tracks?limit=1`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    const likedData = await likedRes.json()
    
    const playlists = []
    if (likedData && likedData.total > 0) {
      playlists.push({ id: 'liked_songs', name: 'Liked Songs' })
    }
    if (data.items) {
      playlists.push(...data.items)
    }
    
    if (playlists.length === 0) return { status: 'no_playlists' }
    return { status: 'success', playlists: playlists.map(p => ({ id: p.id, name: p.name })) }
  } catch (err) {
    return { status: 'error', message: err.message }
  }
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
            album: trackObj.album?.name ?? ''
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
    const rawTracks = await getTracks(url)
    const tracks = rawTracks.map(t => ({
      name: t.name,
      artist: t.artists?.[0]?.name || t.artist || 'Unknown',
      album: t.album?.name || ''
    }))
    return { status: 'success', tracks }
  } catch (err) {
    return { status: 'error', message: err.message }
  }
})

let playQueue = []
let playHistory = []
let isLooping = false
let isShuffling = false
let currentTrack = null
let isManualStop = false

async function playTrack(query) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('track-loading', query)
  try {
    const data = await getStreamData(query)
    if (!data.streamUrl) throw new Error('No stream found')
    let durationSeconds = 0
    if (data.durationStr) {
      const parts = data.durationStr.split(':').map(Number)
      if (parts.length === 3) durationSeconds = parts[0]*3600 + parts[1]*60 + parts[2]
      else if (parts.length === 2) durationSeconds = parts[0]*60 + parts[1]
      else if (parts.length === 1) durationSeconds = parts[0]
    }
    
    currentTrack = { title: data.title, artist: 'YouTube', durationSeconds, durationStr: data.durationStr, query }

    await mpv.load(data.streamUrl, 'replace')
    await mpv.play()
    
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('track-started', currentTrack)
    }
  } catch (err) {
    console.error('Playback error:', err)
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('track-error', err.message)
    setTimeout(handleNextSong, 2000)
  }
}

function handleNextSong() {
  if (isLooping && currentTrack) {
    playTrack(currentTrack.query)
    return
  }
  if (currentTrack) playHistory.push(currentTrack.query)
  if (playQueue.length > 0) {
    let nextQuery;
    if (isShuffling) {
      const idx = Math.floor(Math.random() * playQueue.length)
      nextQuery = playQueue.splice(idx, 1)[0]
    } else {
      nextQuery = playQueue.shift()
    }
    playTrack(nextQuery)
  } else {
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
  if (currentTrack) playHistory.push(currentTrack.query)
  playTrack(query)
  return { success: true }
})

ipcMain.handle('add-queue', (event, query) => {
  playQueue.unshift(query)
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
  return playQueue
})

ipcMain.handle('next-song', async () => {
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
  return isLooping
})

ipcMain.handle('toggle-shuffle', () => {
  isShuffling = !isShuffling
  return isShuffling
})

ipcMain.handle('toggle-play', async () => {
  try { await mpv.togglePause() } catch(e) {}
})

ipcMain.handle('seek', async (event, seconds) => {
  try { await mpv.goToPosition(seconds) } catch(e) {}
})
