// Window Controls
document.getElementById('btn-close').addEventListener('click', () => {
  window.api.close()
})

// Controls
let isQueueMode = false

document.getElementById('btn-prev').addEventListener('click', () => window.api.prevSong())
document.getElementById('btn-next').addEventListener('click', () => window.api.nextSong())

document.getElementById('btn-queue').addEventListener('click', () => {
  isQueueMode = !isQueueMode
  const btn = document.getElementById('btn-queue')
  if (isQueueMode) {
    btn.style.color = 'var(--accent)'
    btn.title = 'Queue Mode: ON'
  } else {
    btn.style.color = 'var(--text-muted)'
    btn.title = 'Queue Mode: OFF'
  }
})

document.getElementById('btn-queue-sidebar').addEventListener('click', (e) => {
  e.stopPropagation()
  const sidebar = document.getElementById('queue-sidebar')
  if (sidebar.style.left === '0px') {
    sidebar.style.left = '-280px'
  } else {
    sidebar.style.left = '0px'
    document.getElementById('tracks-sidebar').style.right = '-280px' // close songs
    renderQueue()
  }
})

document.getElementById('btn-close-queue').addEventListener('click', (e) => {
  e.stopPropagation()
  document.getElementById('queue-sidebar').style.left = '-280px'
})

document.getElementById('btn-clear-queue').addEventListener('click', async () => {
  await window.api.clearQueue()
  renderQueue()
})



// Drag and drop logic for Queue
let dragSrcEl = null

async function renderQueue() {
  const queue = await window.api.getQueue()
  const container = document.getElementById('queue-tracks')
  container.innerHTML = ''
  
  if (queue.length === 0) {
    container.innerHTML = '<div style="padding: 12px; color: var(--text-muted); font-size: 12px; text-align: center;">Queue is empty</div>'
    return
  }
  
  queue.forEach((q, i) => {
    const d = document.createElement('div')
    d.className = 'track-item'
    d.style.display = 'flex'
    d.style.alignItems = 'center'
    d.draggable = true
    
    const handle = document.createElement('span')
    handle.className = 'drag-handle'
    handle.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M3 15h18v-2H3v2zm0 4h18v-2H3v2zm0-8h18V9H3v2zm0-6v2h18V5H3z"/></svg>'
    
    const textContainer = document.createElement('div')
    textContainer.style.flex = '1'
    textContainer.style.whiteSpace = 'nowrap'
    textContainer.style.overflow = 'hidden'
    textContainer.style.textOverflow = 'ellipsis'
    textContainer.innerText = `${i+1}. ${q}`
    
    const removeIconBtn = document.createElement('button')
    removeIconBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>'
    removeIconBtn.className = 'queue-remove-btn'
    removeIconBtn.style.background = 'transparent'
    removeIconBtn.style.border = 'none'
    removeIconBtn.style.color = 'var(--text-muted)'
    removeIconBtn.style.cursor = 'pointer'
    removeIconBtn.style.marginLeft = '8px'
    removeIconBtn.style.padding = '4px'
    removeIconBtn.style.display = 'none'
    removeIconBtn.onmouseover = () => removeIconBtn.style.color = '#ff5f56'
    removeIconBtn.onmouseout = () => removeIconBtn.style.color = 'var(--text-muted)'
    
    removeIconBtn.onclick = (e) => {
      e.stopPropagation()
      window.api.spliceQueue(i, 1).then(renderQueue)
    }
    
    d.appendChild(handle)
    d.appendChild(textContainer)
    d.appendChild(removeIconBtn)
    
    d.ondblclick = async (ev) => {
      ev.preventDefault()
    }
    d.onclick = async () => {
      window.api.searchSong(q)
      await window.api.spliceQueue(0, i + 1)
      renderQueue()
    }
    
    d.addEventListener('dragstart', function(e) {
      dragSrcEl = this;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/html', this.innerHTML);
      this.style.opacity = '0.4';
    })
    
    d.addEventListener('dragover', function(e) {
      if (e.preventDefault) { e.preventDefault() }
      e.dataTransfer.dropEffect = 'move'
      return false;
    })
    
    d.addEventListener('dragenter', function(e) {
      this.style.background = 'rgba(255,255,255,0.1)'
    })
    
    d.addEventListener('dragleave', function(e) {
      this.style.background = ''
    })
    
    d.addEventListener('drop', async function(e) {
      if (e.stopPropagation) { e.stopPropagation() }
      this.style.background = ''
      if (dragSrcEl !== this) {
        const children = Array.from(container.children)
        const oldIndex = children.indexOf(dragSrcEl)
        const newIndex = children.indexOf(this)
        await window.api.reorderQueue(oldIndex, newIndex)
        renderQueue()
      }
      return false
    })
    
    d.addEventListener('dragend', function(e) {
      this.style.opacity = '1'
    })
    
    container.appendChild(d)
  })
}

document.getElementById('btn-loop').addEventListener('click', async () => {
  const looping = await window.api.toggleLoop()
  document.getElementById('btn-loop').style.color = looping ? 'var(--accent)' : 'var(--text-muted)'
})

document.getElementById('btn-shuffle').addEventListener('click', async () => {
  const shuffling = await window.api.toggleShuffle()
  document.getElementById('btn-shuffle').style.color = shuffling ? 'var(--accent)' : 'var(--text-muted)'
})

// Open Settings
document.getElementById('btn-settings').addEventListener('click', () => {
  document.getElementById('settings-panel').classList.add('open')
})

// Close Settings
document.getElementById('btn-close-settings').addEventListener('click', () => {
  document.getElementById('settings-panel').classList.remove('open')
})

// Playlist Dropdown
document.getElementById('btn-playlist').addEventListener('click', async (e) => {
  const menu = document.getElementById('playlist-menu')
  if (menu.style.display === 'block') {
    menu.style.display = 'none'
    return
  }
  
  menu.innerHTML = '<div style="padding: 8px; color: var(--text-muted); font-size: 12px;">Loading...</div>'
  menu.style.display = 'block'
  
  const res = await window.api.getPlaylists()
  menu.innerHTML = ''
  
  if (res.status === 'not_connected') {
    menu.innerHTML = '<div style="padding: 8px; color: var(--text-muted); font-size: 12px;">Not connected to Spotify</div>'
  } else if (res.status === 'no_playlists') {
    menu.innerHTML = '<div style="padding: 8px; color: var(--text-muted); font-size: 12px;">No playlists found</div>'
  } else if (res.status === 'success') {
      menu.innerHTML = ''
      
      const searchInput = document.createElement('input')
      searchInput.type = 'text'
      searchInput.placeholder = 'Search playlists...'
      searchInput.style.width = '100%'
      searchInput.style.background = 'transparent'
      searchInput.style.border = '1px solid rgba(255,255,255,0.2)'
      searchInput.style.color = 'white'
      searchInput.style.padding = '4px'
      searchInput.style.fontSize = '11px'
      searchInput.style.borderRadius = '4px'
      searchInput.style.marginBottom = '8px'
      searchInput.style.outline = 'none'
      
      searchInput.addEventListener('input', (ev) => {
        const query = ev.target.value.toLowerCase()
        const items = menu.querySelectorAll('.playlist-item')
        items.forEach(item => {
          item.style.display = item.innerText.toLowerCase().includes(query) ? 'block' : 'none'
        })
      })
      menu.appendChild(searchInput)
  
      const urlBtn = document.createElement('a')
      urlBtn.href = '#'
      urlBtn.className = 'track-item'
      urlBtn.style.display = 'block'
      urlBtn.style.color = '#39ff14'
      urlBtn.style.textDecoration = 'none'
      urlBtn.style.borderRadius = '4px'
      urlBtn.style.marginBottom = '4px'
      urlBtn.innerText = '+ Add Playlist URL'
    
    urlBtn.onclick = async (ev) => {
      ev.preventDefault()
      const existingInput = document.getElementById('playlist-url-input')
      if (existingInput) return
      
      const inputDiv = document.createElement('div')
      inputDiv.id = 'playlist-url-input'
      inputDiv.style.display = 'flex'
      inputDiv.style.gap = '4px'
      inputDiv.style.marginBottom = '8px'
      
      const input = document.createElement('input')
      input.type = 'text'
      input.placeholder = 'https://open.spotify.com/playlist/...'
      input.style.flex = '1'
      input.style.background = 'transparent'
      input.style.border = '1px solid rgba(255,255,255,0.2)'
      input.style.color = 'white'
      input.style.padding = '4px'
      input.style.fontSize = '11px'
      input.style.borderRadius = '4px'
      
      const btn = document.createElement('button')
      btn.innerText = 'Go'
      btn.style.background = 'var(--accent)'
      btn.style.color = 'black'
      btn.style.border = 'none'
      btn.style.borderRadius = '4px'
      btn.style.cursor = 'pointer'
      btn.style.padding = '0 8px'
      
      btn.onclick = async () => {
        if (!input.value) return
        btn.innerText = '...'
        const data = await window.api.fetchPlaylistUrl(input.value)
        if (data.status === 'success') {
          openPlaylistSidebar('custom-url', 'Custom URL', data.tracks)
          inputDiv.remove()
        } else {
          btn.innerText = 'Err'
        }
      }
      
      inputDiv.appendChild(input)
      inputDiv.appendChild(btn)
      menu.insertBefore(inputDiv, urlBtn.nextSibling)
    }
    menu.appendChild(urlBtn)

    res.playlists.forEach(pl => {
      const a = document.createElement('a')
      a.href = '#'
      a.className = 'track-item playlist-item'
      a.style.display = 'block'
      a.style.textDecoration = 'none'
      a.style.borderRadius = '4px'
      a.innerText = pl.name
      a.dataset.name = pl.name
      
      a.onclick = (ev) => {
        ev.preventDefault()
        menu.style.display = 'none'
        const apn = document.getElementById('active-playlist-name')
        apn.innerText = a.dataset.name
        apn.title = a.dataset.name
        apn.style.display = 'inline-block'
        openPlaylistSidebar(pl.id, pl.name)
      }
      menu.appendChild(a)
    })
  } else {
    menu.innerHTML = `<div style="padding: 8px; color: #ff5f56; font-size: 12px;">Error: ${res.message}</div>`
  }
})

// Sidebar Logic
let currentPlaylistTracks = []

async function openPlaylistSidebar(id, name, preloadedTracks = null) {
  const sidebar = document.getElementById('tracks-sidebar')
  const tracksContainer = document.getElementById('sidebar-tracks')
  
  document.getElementById('sidebar-title').innerText = 'Songs'
  document.getElementById('btn-toggle-sidebar').style.display = 'inline-block'
  
  sidebar.style.right = '0px'
  document.getElementById('queue-sidebar').style.left = '-280px' // close queue
  
  if (preloadedTracks) {
    renderSidebarTracks(preloadedTracks)
    return
  }
  
  tracksContainer.innerHTML = '<div style="padding: 12px; color: var(--text-muted); font-size: 12px; text-align: center;">Loading tracks...</div>'
  
  const res = await window.api.getPlaylistTracks(id)
  
  if (res.status === 'success') {
    renderSidebarTracks(res.tracks)
  } else {
    tracksContainer.innerHTML = `<div style="padding: 12px; color: #ff5f56; font-size: 12px;">Error: ${res.message}</div>`
  }
}

function renderSidebarTracks(tracks) {
  const tracksContainer = document.getElementById('sidebar-tracks')
  tracksContainer.innerHTML = ''
  currentPlaylistTracks = tracks
  
  if (tracks.length === 0) {
    tracksContainer.innerHTML = '<div style="padding: 12px; color: var(--text-muted); font-size: 12px; text-align: center;">Playlist is empty</div>'
    return
  }
  
  tracks.forEach((t, i) => {
    const d = document.createElement('div')
    d.className = 'track-item'
    d.style.display = 'flex'
    d.style.alignItems = 'center'
    d.style.justifyContent = 'space-between'
    
    const infoContainer = document.createElement('div')
    infoContainer.style.flex = '1'
    infoContainer.style.overflow = 'hidden'
    
    const title = document.createElement('div')
    title.innerText = `${i+1}. ${t.name}`
    title.style.color = 'var(--text-main)'
    title.style.marginBottom = '4px'
    title.style.whiteSpace = 'nowrap'
    title.style.overflow = 'hidden'
    title.style.textOverflow = 'ellipsis'
    
    const artist = document.createElement('div')
    artist.innerText = t.artist
    artist.style.color = 'var(--text-muted)'
    artist.style.fontSize = '10px'
    artist.style.whiteSpace = 'nowrap'
    artist.style.overflow = 'hidden'
    artist.style.textOverflow = 'ellipsis'
    
    infoContainer.appendChild(title)
    infoContainer.appendChild(artist)
    
    const addBtn = document.createElement('button')
    addBtn.innerText = '+'
    addBtn.style.padding = '4px 8px'
    addBtn.style.marginLeft = '8px'
    addBtn.style.background = 'transparent'
    addBtn.style.color = 'var(--text-muted)'
    addBtn.style.border = '1px solid rgba(255,255,255,0.2)'
    addBtn.style.borderRadius = '4px'
    addBtn.style.cursor = 'pointer'
    addBtn.style.fontSize = '14px'
    addBtn.style.transition = 'all 0.2s'
    
    addBtn.onmouseover = () => {
      addBtn.style.background = 'rgba(255,255,255,0.1)'
      addBtn.style.color = 'var(--text-main)'
    }
    addBtn.onmouseout = () => {
      addBtn.style.background = 'transparent'
      addBtn.style.color = 'var(--text-muted)'
    }
    
    addBtn.onclick = (ev) => {
      ev.stopPropagation()
      const query = `${t.name} ${t.artist}`
      window.api.addQueue(query)
      document.getElementById('track-artist').innerText = `Queued: ${query}`
      renderQueue()
    }
    
    d.appendChild(infoContainer)
    d.appendChild(addBtn)
    
    d.onclick = () => {
      // Single Click: UI Selection/Highlighting only
      const allTracks = document.querySelectorAll('#sidebar-tracks .track-item');
      allTracks.forEach(el => {
        el.style.background = 'transparent';
      });
      d.style.background = 'rgba(255,255,255,0.1)';
    }
    
    d.ondblclick = (ev) => {
      ev.preventDefault();
      
      const query = `${t.name} ${t.artist}`;
      window.api.searchSong(query);
      
      if (!isQueueMode) {
        // isQueueMode === FALSE: Play track, clear queue
        window.api.clearQueue().then(renderQueue);
      } else {
        // isQueueMode === TRUE: Play track, queue subsequent
        const newQueueItems = [];
        for(let j = i + 1; j < tracks.length; j++) {
          const nextTrack = tracks[j];
          newQueueItems.push(`${nextTrack.name} ${nextTrack.artist}`);
        }
        window.api.setQueue(newQueueItems).then(renderQueue);
      }
    }
      
    tracksContainer.appendChild(d)
  })
}

document.getElementById('btn-toggle-sidebar').addEventListener('click', () => {
  const sidebar = document.getElementById('tracks-sidebar')
  if (sidebar.style.right === '0px') {
    sidebar.style.right = '-280px'
  } else {
    sidebar.style.right = '0px'
    document.getElementById('queue-sidebar').style.left = '-280px' // close queue
  }
})

document.getElementById('btn-close-sidebar').addEventListener('click', (e) => {
  e.stopPropagation()
  document.getElementById('tracks-sidebar').style.right = '-280px'
})

document.getElementById('search-queue').addEventListener('input', (ev) => {
  const query = ev.target.value.toLowerCase()
  const items = document.getElementById('queue-tracks').children
  for (let i = 0; i < items.length; i++) {
    const text = items[i].innerText.toLowerCase()
    items[i].style.display = text.includes(query) ? 'flex' : 'none'
  }
})

document.getElementById('search-tracks').addEventListener('input', (ev) => {
  const query = ev.target.value.toLowerCase()
  const items = document.getElementById('sidebar-tracks').children
  for (let i = 0; i < items.length; i++) {
    const text = items[i].innerText.toLowerCase()
    items[i].style.display = text.includes(query) ? 'flex' : 'none'
  }
})

document.addEventListener('click', (ev) => {
  const playlistMenu = document.getElementById('playlist-menu')
  const btnPlaylist = document.getElementById('btn-playlist')
  if (playlistMenu && playlistMenu.style.display === 'block') {
    if (!playlistMenu.contains(ev.target) && !btnPlaylist.contains(ev.target)) {
      playlistMenu.style.display = 'none'
    }
  }
  
  const queueSidebar = document.getElementById('queue-sidebar')
  const btnQueue = document.getElementById('btn-queue')
  const btnQueueSidebar = document.getElementById('btn-queue-sidebar')
  if (queueSidebar && queueSidebar.style.left === '0px') {
    if (!queueSidebar.contains(ev.target) && !btnQueue.contains(ev.target) && (!btnQueueSidebar || !btnQueueSidebar.contains(ev.target))) {
      queueSidebar.style.left = '-280px'
    }
  }
  
  const tracksSidebar = document.getElementById('tracks-sidebar')
  const btnToggleSidebar = document.getElementById('btn-toggle-sidebar')
  if (tracksSidebar && tracksSidebar.style.right === '0px') {
    if (!tracksSidebar.contains(ev.target) && !btnToggleSidebar.contains(ev.target) && !btnPlaylist.contains(ev.target)) {
      tracksSidebar.style.right = '-280px'
    }
  }
})

document.getElementById('btn-queue-all').addEventListener('click', async () => {
  if (currentPlaylistTracks.length > 0) {
    if (!isQueueMode) {
      isQueueMode = true
      document.getElementById('btn-queue').style.color = 'var(--accent)'
      document.getElementById('btn-queue').title = 'Queue Mode: ON'
    }
    
    // Auto-play first track if we are adding many
    const firstTrack = currentPlaylistTracks[0]
    const firstQuery = `${firstTrack.name} ${firstTrack.artist}`
    window.api.searchSong(firstQuery)
    
    // Queue the rest atomically by prepending to current queue
    const currentQueue = await window.api.getQueue()
    const newQueueItems = []
    for (let i = 1; i < currentPlaylistTracks.length; i++) {
      const t = currentPlaylistTracks[i]
      newQueueItems.push(`${t.name} ${t.artist}`)
    }
    await window.api.setQueue([...newQueueItems, ...currentQueue])
    
    document.getElementById('track-artist').innerText = `Queued ${currentPlaylistTracks.length - 1} tracks!`
    renderQueue()
  }
})

// Close menu when clicking outside
document.addEventListener('click', (e) => {
  const menu = document.getElementById('playlist-menu')
  const btn = document.getElementById('btn-playlist')
  if (menu && menu.style.display === 'block' && !menu.contains(e.target) && !btn.contains(e.target)) {
    menu.style.display = 'none'
  }
})

// Search Toggle
const searchBtn = document.getElementById('btn-search')
const searchInput = document.getElementById('search-input')
const searchContainer = document.getElementById('search-container')

function toggleSearch() {
  if (searchContainer.classList.contains('expanded')) {
    searchContainer.classList.remove('expanded')
    searchInput.blur()
  } else {
    searchContainer.classList.add('expanded')
    searchInput.focus()
  }
}

searchBtn.addEventListener('click', toggleSearch)

window.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
    toggleSearch()
  }
})

searchInput.addEventListener('keydown', async (e) => {
  if (e.key === 'Enter') {
    const query = e.target.value
    if (query) {
      e.target.value = ''
      searchInput.style.display = 'none'
      
      if (!isQueueMode) {
        window.api.addQueue(query)
        document.getElementById('track-artist').innerText = `Queued: ${query}`
      } else {
        window.api.searchSong(query)
      }
    }
  }
})

window.api.onTrackLoading((event, query) => {
  document.getElementById('track-title').innerText = 'Searching...'
  document.getElementById('track-artist').innerText = query
})


window.api.onPlaybackStateUpdate((event, isPaused) => {
  if (isPlaying === isPaused) {
    isPlaying = !isPaused
    updatePlayIcon()
  }
})

// Initialize connection button state
window.api.isLoggedIn().then(loggedIn => {
  const btn = document.getElementById('btn-auth-top')
  if (loggedIn) {
    btn.innerHTML = 'Connected <span style="display:inline-block; width:6px; height:6px; background:#000; border-radius:50%; margin-left:4px; vertical-align:middle;"></span>'
    btn.style.color = '#000'
    btn.style.background = 'var(--accent)'
    btn.style.border = 'none'
    btn.style.fontWeight = '600'
  }
})

window.api.onTrackStarted((event, track) => {
  document.getElementById('track-title').innerText = track.title
  document.getElementById('track-artist').innerText = track.artist
  currentDuration = track.durationSeconds || 0
  isPlaying = true
  updatePlayIcon()
  document.querySelector('.time-total').innerText = track.durationStr || '0:00'
})

window.api.onTrackError((event, errorMsg) => {
  document.getElementById('track-title').innerText = 'Search Failed'
  document.getElementById('track-artist').innerText = errorMsg
})

// Settings Logic
const root = document.documentElement
const opacitySlider = document.getElementById('opacity-slider')
const opacityValue = document.getElementById('opacity-value')

opacitySlider.addEventListener('input', (e) => {
  const val = e.target.value
  opacityValue.innerText = val + '%'
  root.style.setProperty('--bg-opacity', val / 100)
})

document.querySelectorAll('.theme-card').forEach(card => {
  card.addEventListener('click', (e) => {
    document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('active'))
    const target = e.currentTarget
    target.classList.add('active')
    
    const rgb = target.getAttribute('data-color')
    if (rgb) {
      root.style.setProperty('--bg-color-rgb', rgb)
    }

    const accent = target.getAttribute('data-accent')
    if (accent) {
      root.style.setProperty('--accent', accent)
    }

    const border = target.getAttribute('data-border')
    if (border) {
      root.style.setProperty('--border-color', border)
    }

    const textRgb = target.getAttribute('data-text')
    if (textRgb) {
      root.style.setProperty('--text-main', `rgba(${textRgb}, 0.9)`)
      root.style.setProperty('--text-muted', `rgba(${textRgb}, 0.5)`)
    } else {
      root.style.setProperty('--text-main', `rgba(255, 255, 255, 0.9)`)
      root.style.setProperty('--text-muted', `rgba(255, 255, 255, 0.5)`)
    }
  })
})

// Tab Switching Logic
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', (e) => {
    document.querySelectorAll('.tab-pane').forEach(p => p.style.display = 'none')
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'))
    
    const target = e.currentTarget
    target.classList.add('active')
    const paneId = target.getAttribute('data-target')
    if (paneId) {
      document.getElementById(paneId).style.display = 'block'
    }
  })
})

// Mock Spotify Auth Logic
let isSpotifyConnected = false
const btnAuthTop = document.getElementById('btn-auth-top')
const btnAuthSettings = document.getElementById('btn-auth-settings')
const spotifyStatusText = document.getElementById('spotify-status-text')

function toggleSpotifyAuth() {
  window.api.openCredentialsWindow()
}

btnAuthTop.addEventListener('click', toggleSpotifyAuth)
btnAuthSettings.addEventListener('click', toggleSpotifyAuth)

// Playback State
let isPlaying = false
let currentDuration = 0
const playIcon = document.getElementById('icon-play')
const progressLine = document.querySelector('.progress')

function formatTime(sec) {
  if (isNaN(sec) || !isFinite(sec)) return "0:00"
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

window.api.onPlaybackTime((event, time) => {
  if (currentDuration > 0 && !isDraggingProgress) {
    const pct = (time / currentDuration) * 100
    progressLine.style.width = `${pct}%`
    document.querySelector('.time-elapsed').innerText = formatTime(time)
  } else if (!isDraggingProgress) {
    document.querySelector('.time-elapsed').innerText = formatTime(time)
  }
})

window.api.onPlaybackStopped(() => {
  isPlaying = false
  updatePlayIcon()
  progressLine.style.width = '0%'
  document.querySelector('.time-elapsed').innerText = '0:00'
})

function updatePlayIcon() {
  if (isPlaying) {
    playIcon.innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>'
  } else {
    playIcon.innerHTML = '<path d="M8 5v14l11-7z"/>'
  }
}

document.getElementById('btn-play').addEventListener('click', () => {
  window.api.togglePlay()
  isPlaying = !isPlaying
  updatePlayIcon()
})

const progressBarContainer = document.querySelector('.progress-bar')
let isDraggingProgress = false

function seekToEvent(e) {
  if (currentDuration > 0) {
    const rect = progressBarContainer.getBoundingClientRect()
    let clickX = e.clientX - rect.left
    if (clickX < 0) clickX = 0
    if (clickX > rect.width) clickX = rect.width
    const percent = clickX / rect.width
    const targetTime = percent * currentDuration
    
    console.log(`DEBUG [renderer.js]: Scrubbing to ${percent*100}% -> ${targetTime}s`)
    progressLine.style.width = `${percent * 100}%`
    document.querySelector('.time-elapsed').innerText = formatTime(targetTime)
    return targetTime
  }
  return -1
}

progressBarContainer.addEventListener('mousedown', (e) => {
  console.log('DEBUG [renderer.js]: Mouse Down on progress bar')
  isDraggingProgress = true
  seekToEvent(e)
})

window.addEventListener('mousemove', (e) => {
  if (isDraggingProgress) {
    seekToEvent(e)
  }
})

window.addEventListener('mouseup', (e) => {
  if (isDraggingProgress) {
    console.log('DEBUG [renderer.js]: Mouse Up -> Sending Seek IPC to backend')
    isDraggingProgress = false
    const targetTime = seekToEvent(e)
    if (targetTime >= 0) {
      window.api.seek(targetTime)
    }
  }
})
