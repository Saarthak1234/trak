// Helper to safely add event listeners
function safeOn(id, event, handler) {
  const el = document.getElementById(id);
  if (el) el.addEventListener(event, handler);
}

// Window Controls
safeOn('btn-close', 'click', () => {
  window.api.close();
});

// Controls
let isQueueMode = false;

safeOn('btn-prev', 'click', () => window.api.prevSong());
safeOn('btn-next', 'click', () => window.api.nextSong());

safeOn('btn-queue', 'click', () => {
  isQueueMode = !isQueueMode;
  const btn = document.getElementById('btn-queue');
  if (btn) {
    if (isQueueMode) {
      btn.style.color = 'var(--accent)';
      btn.title = 'Queue Mode: ON';
    } else {
      btn.style.color = 'var(--text-muted)';
      btn.title = 'Queue Mode: OFF';
    }
  }
});

safeOn('btn-queue-sidebar', 'click', (e) => {
  e.stopPropagation();
  const sidebar = document.getElementById('queue-sidebar');
  const tracksSidebar = document.getElementById('tracks-sidebar');
  if (sidebar) {
    if (sidebar.style.left === '0px') {
      sidebar.style.left = '-280px';
    } else {
      sidebar.style.left = '0px';
      if (tracksSidebar) tracksSidebar.style.right = '-280px'; // close songs
      renderQueue();
    }
  }
});

safeOn('btn-close-queue', 'click', (e) => {
  e.stopPropagation();
  const sidebar = document.getElementById('queue-sidebar');
  if (sidebar) sidebar.style.left = '-280px';
});

safeOn('btn-clear-queue', 'click', async () => {
  if (window.api && window.api.clearQueue) {
    await window.api.clearQueue();
    renderQueue();
  }
});



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

safeOn('btn-loop', 'click', async () => {
  if (!window.api || !window.api.toggleLoop) return;
  const looping = await window.api.toggleLoop();
  const btn = document.getElementById('btn-loop');
  if (btn) btn.style.color = looping ? 'var(--accent)' : 'var(--text-muted)';
});

safeOn('btn-shuffle', 'click', async () => {
  if (!window.api || !window.api.toggleShuffle) return;
  const shuffling = await window.api.toggleShuffle();
  const btn = document.getElementById('btn-shuffle');
  if (btn) btn.style.color = shuffling ? 'var(--accent)' : 'var(--text-muted)';
  renderQueue();
});

// Open Settings — separate window
safeOn('btn-settings', 'click', () => {
  if (window.api && window.api.openSettings) window.api.openSettings();
});

// Close Settings (legacy panel, keep for safety)
safeOn('btn-close-settings', 'click', () => {
  const panel = document.getElementById('settings-panel');
  if (panel) panel.classList.remove('open');
});

// Playlist Dropdown
safeOn('btn-playlist', 'click', async (e) => {
  const menu = document.getElementById('playlist-menu');
  if (!menu) return;
  
  if (menu.style.display === 'block') {
    menu.style.display = 'none';
    return;
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
      searchInput.style.border = '1px solid var(--border-color)'
      searchInput.style.color = 'var(--text-main)'
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
      urlBtn.style.color = 'var(--accent)'
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
      input.style.border = '1px solid var(--border-color)'
      input.style.color = 'var(--text-main)'
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
        menu.classList.remove('open')
        const apn = document.getElementById('active-playlist-name')
        apn.innerText = a.dataset.name
        apn.title = a.dataset.name
        apn.style.display = 'inline-block'
        // Auto-open the songs sidebar when a playlist is selected
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
  
  if (!isQueueMode) {
    isQueueMode = true
    const btn = document.getElementById('btn-queue')
    if (btn) {
      btn.style.color = 'var(--accent)'
      btn.title = 'Queue Mode: ON'
    }
  }
  
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
      const query = `${t.name} by ${t.artist}`
      window.api.addQueue(query)
      document.getElementById('track-artist').innerText = `Queued: ${t.name}`
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
      
      const query = `${t.name} by ${t.artist}`;
      console.log(query)
      window.api.searchSong(query);
      
      if (!isQueueMode) {
        // isQueueMode === FALSE: Play track, clear queue
        window.api.clearQueue().then(renderQueue);
      } else {
        // isQueueMode === TRUE: Play track, queue subsequent
        const newQueueItems = [];
        for(let j = i + 1; j < tracks.length; j++) {
          const nextTrack = tracks[j];
          newQueueItems.push(`${nextTrack.name} by ${nextTrack.artist}`);
        }
        window.api.setQueue(newQueueItems).then(renderQueue);
      }
    }
      
    tracksContainer.appendChild(d)
  })
}

safeOn('btn-toggle-sidebar', 'click', () => {
  const sidebar = document.getElementById('tracks-sidebar')
  if (sidebar.style.right === '0px') {
    sidebar.style.right = '-280px'
  } else {
    sidebar.style.right = '0px'
    document.getElementById('queue-sidebar').style.left = '-280px' // close queue
  }
})

safeOn('btn-close-sidebar', 'click', (e) => {
  e.stopPropagation()
  document.getElementById('tracks-sidebar').style.right = '-280px'
})

safeOn('search-queue', 'input', (ev) => {
  const query = ev.target.value.toLowerCase()
  const items = document.getElementById('queue-tracks').children
  for (let i = 0; i < items.length; i++) {
    const text = items[i].innerText.toLowerCase()
    items[i].style.display = text.includes(query) ? 'flex' : 'none'
  }
})

safeOn('search-tracks', 'input', (ev) => {
  const query = ev.target.value.toLowerCase()
  const items = document.getElementById('sidebar-tracks').children
  for (let i = 0; i < items.length; i++) {
    const text = items[i].innerText.toLowerCase()
    items[i].style.display = text.includes(query) ? 'flex' : 'none'
  }
})

if (document) document.addEventListener('click', (ev) => {
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
    if (!tracksSidebar.contains(ev.target) && !btnToggleSidebar.contains(ev.target) && !btnPlaylist.contains(ev.target) && (!playlistMenu || !playlistMenu.contains(ev.target))) {
      tracksSidebar.style.right = '-280px'
    }
  }
})

safeOn('btn-queue-all', 'click', async () => {
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
if (document) document.addEventListener('click', (e) => {
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

// Shortcuts Manager
let appShortcuts = JSON.parse(localStorage.getItem('appShortcuts')) || {
  globalToggle: 'CommandOrControl+Shift+M',
  search: 'CommandOrControl+F',
  gifPicker: 'CommandOrControl+G'
};

// Upgrade old single-letter shortcuts from previous version
if (appShortcuts.search === 'f' || appShortcuts.search === 'F') appShortcuts.search = 'CommandOrControl+F';
if (appShortcuts.gifPicker === 'g' || appShortcuts.gifPicker === 'G') appShortcuts.gifPicker = 'CommandOrControl+G';

window.api.updateGlobalShortcut(appShortcuts.globalToggle);

const inputs = {
  globalToggle: document.getElementById('shortcut-global'),
  search: document.getElementById('shortcut-search'),
  gifPicker: document.getElementById('shortcut-gif')
};

function formatDisplay(electronShortcut) {
  if (!electronShortcut) return '';
  const isMac = navigator.platform.toUpperCase().includes('MAC');
  if (isMac) {
    return electronShortcut
      .replace(/CommandOrControl/g, '⌘')
      .replace(/Command/g, '⌘')
      .replace(/Control/g, '⌃')
      .replace(/Shift/g, '⇧')
      .replace(/Alt/g, '⌥')
      .replace(/\+/g, '')
      .toUpperCase();
  } else {
    return electronShortcut
      .replace(/CommandOrControl/g, 'Ctrl')
      .replace(/Command/g, 'Ctrl')
      .replace(/Control/g, 'Ctrl')
      .replace(/Shift/g, 'Shift')
      .replace(/Alt/g, 'Alt')
      .replace(/\+/g, '+')
      .toUpperCase();
  }
}

function updateInputs() {
  if (inputs.globalToggle) inputs.globalToggle.value = formatDisplay(appShortcuts.globalToggle);
  if (inputs.search) inputs.search.value = formatDisplay(appShortcuts.search);
  if (inputs.gifPicker) inputs.gifPicker.value = formatDisplay(appShortcuts.gifPicker);
}
updateInputs();

function handleShortcutRecord(e, keyName) {
  e.preventDefault();
  if (e.key === 'Escape') {
    e.target.blur();
    return;
  }
  
  const keys = [];
  if (e.metaKey || e.ctrlKey) keys.push('CommandOrControl');
  if (e.shiftKey) keys.push('Shift');
  if (e.altKey) keys.push('Alt');
  
  const isModifier = ['Meta', 'Control', 'Shift', 'Alt'].includes(e.key);
  
  if (!isModifier) {
    keys.push(e.key.length === 1 ? e.key.toUpperCase() : e.key);
    const newShortcut = keys.join('+');
    appShortcuts[keyName] = newShortcut;
    localStorage.setItem('appShortcuts', JSON.stringify(appShortcuts));
    
    if (keyName === 'globalToggle') {
      window.api.updateGlobalShortcut(newShortcut);
    }
    
    updateInputs();
    e.target.blur();
  } else {
    e.target.value = formatDisplay(keys.join('+')) + '...';
  }
}

if (inputs.globalToggle) inputs.globalToggle.addEventListener('keydown', (e) => handleShortcutRecord(e, 'globalToggle'));
if (inputs.search) inputs.search.addEventListener('keydown', (e) => handleShortcutRecord(e, 'search'));
if (inputs.gifPicker) inputs.gifPicker.addEventListener('keydown', (e) => handleShortcutRecord(e, 'gifPicker'));

if (searchBtn) searchBtn.addEventListener('click', toggleSearch)

if (window) window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (document.getElementById('settings-modal').style.display === 'flex') {
      document.getElementById('settings-modal').style.display = 'none';
    } else if (searchContainer.classList.contains('expanded')) {
      toggleSearch();
    } else {
      window.api.close();
    }
  }

  // Don't fire playback shortcuts when user is typing in an input/textarea
  const isTyping = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable;

  if (!isTyping) {
    // ── Playback controls ──────────────────────────────────────────────
    if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'MediaPlayPause') {
      e.preventDefault(); // prevent page scroll on space
      window.api.togglePlay();
    } else if (e.key === 'ArrowRight' || e.key === 'MediaTrackNext') {
      e.preventDefault();
      window.api.nextSong();
    } else if (e.key === 'ArrowLeft' || e.key === 'MediaTrackPrevious') {
      e.preventDefault();
      window.api.prevSong();
    }
    // ──────────────────────────────────────────────────────────────────

    // Custom configurable shortcuts (search, gif picker, etc.)
    if (!e.target.classList.contains('shortcut-recorder')) {
      const pressedKey = e.key.toUpperCase();
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;

      const checkMatch = (shortcutConfig) => {
        if (!shortcutConfig) return false;
        const parts = shortcutConfig.split('+');
        const requiresCmd = parts.includes('CommandOrControl') || parts.includes('Command') || parts.includes('Control');
        const requiresShift = parts.includes('Shift');
        const requiresAlt = parts.includes('Alt');
        const letter = parts[parts.length - 1].toUpperCase();
        return (
          isCmdOrCtrl === requiresCmd &&
          e.shiftKey === requiresShift &&
          e.altKey === requiresAlt &&
          pressedKey === letter
        );
      };

      if (checkMatch(appShortcuts.search)) {
        e.preventDefault();
        toggleSearch();
      }
      if (checkMatch(appShortcuts.gifPicker)) {
        e.preventDefault();
        window.api.openGifWindow();
      }
    }
  }
})

if (searchInput) searchInput.addEventListener('keydown', async (e) => {
  if (e.key === 'Enter') {
    const query = e.target.value.trim()
    if (query) {
      e.target.value = ''
      searchContainer.classList.remove('expanded')
      searchInput.blur()
      
      if (!isQueueMode) {
        window.api.searchSong(query)
      } else {
        window.api.addQueue(query)
        // Add silently to prevent overwriting the currently playing track info
      }
    }
  }
})

window.api.onTrackLoading((event, query) => {
  document.getElementById('track-title').innerText = query
  document.getElementById('track-artist').innerText = 'Searching...'
  
  const icon = document.getElementById('icon-play')
  if (icon) {
    icon.classList.add('spin-fast')
    icon.innerHTML = '<path d="M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8z"/>'
  }
})

// Seamlessly update playlist menu when background cache refresh completes
window.api.onPlaylistsUpdated((event, res) => {
  const menu = document.getElementById('playlist-menu')
  if (menu.style.display !== 'block') return // Only update if menu is open
  // Re-render the playlist items while keeping the menu open
  const items = menu.querySelectorAll('.playlist-item')
  items.forEach(el => el.remove())
  if (res.status === 'success') {
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
        apn.innerText = pl.name
        apn.title = pl.name
        apn.style.display = 'inline-block'
        openPlaylistSidebar(pl.id, pl.name)
      }
      menu.appendChild(a)
    })
  }
})


window.api.onPlaybackStateUpdate((event, isPaused) => {
  if (isPlaying === isPaused) {
    isPlaying = !isPaused
    updatePlayIcon()
  }
})

// Initialize connection button state
window.api.isLoggedIn().then(loggedIn => {
  const btnTop = document.getElementById('btn-auth-top')
  const btnSettings = document.getElementById('btn-auth-settings')
  const statusText = document.getElementById('spotify-status-text')
  
  if (loggedIn) {
    btnTop.innerHTML = 'Connected <span style="display:inline-block; width:6px; height:6px; background:rgb(var(--bg-color-rgb)); border-radius:50%; margin-left:4px; vertical-align:middle;"></span>'
    btnTop.style.color = 'rgb(var(--bg-color-rgb))'
    btnTop.style.background = 'var(--accent)'
    btnTop.style.border = 'none'
    btnTop.style.fontWeight = '600'
    
    // Disable top button action when connected
    btnTop.onclick = (e) => e.preventDefault()
    
    if (statusText) {
      statusText.textContent = 'Connected'
      statusText.style.color = 'var(--accent)'
    }
    
    if (btnSettings) {
      btnSettings.innerHTML = 'Disconnect Spotify'
      btnSettings.style.background = 'rgba(255,50,50,0.1)'
      btnSettings.style.color = '#ff6b6b'
      
      btnSettings.addEventListener('click', async () => {
        await window.api.logoutSpotify()
        location.reload()
      })
    }
  } else {
    btnTop.addEventListener('click', toggleSpotifyAuth)
    if (btnSettings) {
      btnSettings.addEventListener('click', toggleSpotifyAuth)
    }
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
const brightnessSlider = document.getElementById('brightness-slider')
const brightnessValue = document.getElementById('brightness-value')

// Load saved settings
const savedOpacity = Math.max(40, parseInt(localStorage.getItem('bgOpacity')) || 95)
const savedBrightness = Math.min(100, Math.max(0, parseInt(localStorage.getItem('bgBrightness')) || 80))

if (opacitySlider) {
  opacitySlider.value = savedOpacity
  opacityValue.innerText = savedOpacity + '%'
  opacitySlider.addEventListener('input', (e) => {
    const val = e.target.value
    opacityValue.innerText = val + '%'
    root.style.setProperty('--bg-opacity', val / 100)
    localStorage.setItem('bgOpacity', val)
  })
}
root.style.setProperty('--bg-opacity', savedOpacity / 100)

if (brightnessSlider) {
  brightnessSlider.value = savedBrightness
  brightnessValue.innerText = savedBrightness + '%'
  brightnessSlider.addEventListener('input', (e) => {
    const val = e.target.value
    brightnessValue.innerText = val + '%'
    root.style.setProperty('--bg-brightness', val / 100)
    localStorage.setItem('bgBrightness', val)
  })
}
root.style.setProperty('--bg-brightness', savedBrightness / 100)

// Storage listener to sync across windows instantly
if (window) window.addEventListener('storage', (e) => {
  if (e.key === 'bgOpacity') {
    const val = parseInt(e.newValue) || 95
    if (opacitySlider) opacitySlider.value = val
    if (opacityValue) opacityValue.innerText = val + '%'
    root.style.setProperty('--bg-opacity', val / 100)
  }
  if (e.key === 'bgBrightness') {
    const val = parseInt(e.newValue) || 80
    if (brightnessSlider) brightnessSlider.value = val
    if (brightnessValue) brightnessValue.innerText = val + '%'
    root.style.setProperty('--bg-brightness', val / 100)
  }
  if (e.key === 'themeVars') {
    try {
      const t = JSON.parse(e.newValue)
      if (t) {
        root.style.setProperty('--bg-color-rgb', t.bg)
        root.style.setProperty('--text-main', t.text)
        root.style.setProperty('--text-muted', t.muted)
        root.style.setProperty('--accent', t.accent)
        root.style.setProperty('--border-color', t.border)
      }
    } catch(err) {}
  }
  if (e.key === 'customGifSettings') {
    customGifSettings = JSON.parse(e.newValue)
    applyCustomGifSettings()
  }
})

// Function to load themes from local storage initially
function initThemeVars() {
  try {
    const t = JSON.parse(localStorage.getItem('themeVars'))
    if (t) {
      root.style.setProperty('--bg-color-rgb', t.bg)
      root.style.setProperty('--text-main', t.text)
      root.style.setProperty('--text-muted', t.muted)
      root.style.setProperty('--accent', t.accent)
      root.style.setProperty('--border-color', t.border)
    }
  } catch(err) {}
}
initThemeVars()

document.querySelectorAll('.theme-card').forEach(card => {
  card.addEventListener('click', (e) => {
    document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('active'))
    const target = e.currentTarget
    target.classList.add('active')
    
    // Disable GIF background when a theme card is clicked
    if (customGifSettings.showBackground) {
      customGifSettings.showBackground = false;
      localStorage.setItem('customGifSettings', JSON.stringify(customGifSettings));
      applyCustomGifSettings();
    }
    
    const rgb = target.getAttribute('data-color')
    if (rgb) root.style.setProperty('--bg-color-rgb', rgb)

    const accent = target.getAttribute('data-accent')
    if (accent) root.style.setProperty('--accent', accent)

    const border = target.getAttribute('data-border')
    if (border) root.style.setProperty('--border-color', border)

    const textRgb = target.getAttribute('data-text')
    if (textRgb) {
      root.style.setProperty('--text-main', `rgba(${textRgb}, 0.9)`)
      root.style.setProperty('--text-muted', `rgba(${textRgb}, 0.5)`)
    } else {
      root.style.setProperty('--text-main', `rgba(255, 255, 255, 0.9)`)
      root.style.setProperty('--text-muted', `rgba(255, 255, 255, 0.5)`)
    }

    if (typeof broadcastThemeVars === 'function') {
      broadcastThemeVars();
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
  const icon = document.getElementById('icon-play')
  if (!icon) return
  icon.classList.remove('spin-fast')
  if (isPlaying) {
    icon.innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>'
  } else {
    icon.innerHTML = '<path d="M8 5v14l11-7z"/>'
  }
}

safeOn('btn-play', 'click', () => {
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

if (progressBarContainer) progressBarContainer.addEventListener('mousedown', (e) => {
  console.log('DEBUG [renderer.js]: Mouse Down on progress bar')
  isDraggingProgress = true
  seekToEvent(e)
})

if (window) window.addEventListener('mousemove', (e) => {
  if (isDraggingProgress) {
    seekToEvent(e)
  }
})

if (window) window.addEventListener('mouseup', (e) => {
  if (isDraggingProgress) {
    console.log('DEBUG [renderer.js]: Mouse Up -> Sending Seek IPC to backend')
    isDraggingProgress = false
    const targetTime = seekToEvent(e)
    if (targetTime >= 0) {
      window.api.seek(targetTime)
    }
  }
})

// --- Custom Theme Builder Logic ---

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? 
    `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '25, 25, 25';
}

let currentThemeBg = '#0f0f0f'
let currentThemeText = '#ffffff'
let currentThemeAccent = '#39ff14'

let activeColorTarget = null;
const colorWheelPopover = document.getElementById('color-wheel-popover');
let colorPicker = null;

const themeName = document.getElementById('custom-theme-name')
const saveThemeBtn = document.getElementById('btn-save-theme')

function updateLivePreview() {
  const bgRgb = hexToRgb(currentThemeBg)
  const textRgb = hexToRgb(currentThemeText)
  
  document.documentElement.style.setProperty('--bg-color-rgb', bgRgb)
  document.documentElement.style.setProperty('--accent', currentThemeAccent)
  document.documentElement.style.setProperty('--text-main', `rgb(${textRgb})`)
}

document.querySelectorAll('.color-pill').forEach(pill => {
  pill.addEventListener('click', (e) => {
    e.stopPropagation();
    activeColorTarget = pill.getAttribute('data-target');
    
    let initialColor = '#ffffff';
    if (activeColorTarget === 'bg') initialColor = currentThemeBg;
    else if (activeColorTarget === 'text') initialColor = currentThemeText;
    else if (activeColorTarget === 'accent') initialColor = currentThemeAccent;
    
    colorWheelPopover.style.display = 'block';
    
    const rect = pill.getBoundingClientRect();
    const parentRect = pill.parentElement.getBoundingClientRect();
    colorWheelPopover.style.top = `${rect.bottom - parentRect.top + 8}px`;
    colorWheelPopover.style.left = `${rect.left - parentRect.left}px`;

    if (!colorPicker) {
      colorPicker = new iro.ColorPicker('#color-wheel-container', {
        width: 160,
        color: initialColor,
        borderWidth: 1,
        borderColor: "#333",
        layout: [
          { component: iro.ui.Wheel },
          { component: iro.ui.Slider, options: { sliderType: 'value' } }
        ]
      });
      
      colorPicker.on('color:change', function(color) {
        const hex = color.hexString;
        if (activeColorTarget === 'bg') {
          currentThemeBg = hex;
          document.getElementById('swatch-bg').style.background = hex;
        } else if (activeColorTarget === 'text') {
          currentThemeText = hex;
          document.getElementById('swatch-text').style.background = hex;
        } else if (activeColorTarget === 'accent') {
          currentThemeAccent = hex;
          document.getElementById('swatch-accent').style.background = hex;
        }
        updateLivePreview();
      });
    } else {
      colorPicker.color.hexString = initialColor;
    }
  });
});

if (document) document.addEventListener('click', (e) => {
  if (colorWheelPopover && colorWheelPopover.style.display === 'block') {
    if (!colorWheelPopover.contains(e.target)) {
      colorWheelPopover.style.display = 'none';
      activeColorTarget = null;
    }
  }
});

const btnShowBuilder = document.getElementById('btn-show-builder')
const btnCancelTheme = document.getElementById('btn-cancel-theme')
const themeBuilderEntry = document.getElementById('theme-builder-entry')
const themeBuilderForm = document.getElementById('theme-builder-form')

if (btnShowBuilder) btnShowBuilder.addEventListener('click', () => {
  themeBuilderEntry.style.display = 'none'
  themeBuilderForm.style.display = 'block'
})

if (btnCancelTheme) btnCancelTheme.addEventListener('click', () => {
  themeBuilderForm.style.display = 'none'
  themeBuilderEntry.style.display = 'flex'
})

function injectThemeCard(theme, isCustom = false) {
  const grid = document.querySelector('.theme-grid')
  const card = document.createElement('div')
  card.className = 'theme-card'
  card.setAttribute('data-color', theme.color)
  card.setAttribute('data-text', theme.text)
  card.setAttribute('data-accent', theme.accent)
  card.setAttribute('data-border', theme.border || 'rgba(255, 255, 255, 0.08)')
  
  let deleteBtnHtml = ''
  if (isCustom) {
    deleteBtnHtml = `<button class="delete-theme-btn" style="position: absolute; top: 4px; right: 4px; background: rgba(0,0,0,0.5); border: none; color: #ff5f56; border-radius: 50%; width: 24px; height: 24px; font-size: 14px; cursor: pointer; display: none;">&times;</button>`
  }
  
  card.innerHTML = `
    <div class="theme-preview" style="background: rgb(${theme.color});">
      ${deleteBtnHtml}
      <div class="p-dot" style="background: ${theme.accent};"></div><div class="p-line" style="background: rgba(${theme.text}, 0.3);"></div>
      <div class="p-line-long" style="background: rgba(${theme.text}, 0.1);"></div>
      <div class="p-line-med" style="background: rgba(${theme.text}, 0.1);"></div>
    </div>
    <div class="theme-info"><span>${theme.name}</span><span class="badge">USER</span></div>
  `
  
  if (isCustom) {
    card.addEventListener('mouseenter', () => {
      card.querySelector('.delete-theme-btn').style.display = 'block'
    })
    card.addEventListener('mouseleave', () => {
      card.querySelector('.delete-theme-btn').style.display = 'none'
    })
    card.querySelector('.delete-theme-btn').addEventListener('click', async (e) => {
      e.stopPropagation()
      await window.api.deleteCustomTheme(theme.name)
      card.remove()
      // If deleted theme was active, fallback to first theme
      if (card.classList.contains('active')) {
        document.querySelector('.theme-card').click()
      }
    })
  }
  
  card.addEventListener('click', () => {
    document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('active'))
    card.classList.add('active')
    document.documentElement.style.setProperty('--bg-color-rgb', theme.color)
    document.documentElement.style.setProperty('--accent', theme.accent)
    document.documentElement.style.setProperty('--text-main', `rgb(${theme.text})`)
    document.documentElement.style.setProperty('--text-muted', `rgba(${theme.text}, 0.5)`)
    document.documentElement.style.setProperty('--border-color', theme.border || 'rgba(255, 255, 255, 0.08)')
    localStorage.setItem('activeThemeName', theme.name)
    broadcastThemeVars()
    if (theme.name.startsWith('GIF Adaptive')) updateGifAdaptiveTheme();
  })
  
  grid.appendChild(card)
}

// Inject Adaptive Themes
injectThemeCard({
  name: 'GIF Adaptive (Dark)',
  color: '20, 20, 20',
  text: '255, 255, 255',
  accent: '#4ade80',
  border: 'rgba(255, 255, 255, 0.2)'
}, false)

injectThemeCard({
  name: 'GIF Adaptive (Light)',
  color: '240, 240, 240',
  text: '20, 20, 20',
  accent: '#4ade80',
  border: 'rgba(0, 0, 0, 0.1)'
}, false)

if (saveThemeBtn) saveThemeBtn.addEventListener('click', async () => {
  const name = themeName.value.trim() || 'Custom Theme'
  const newTheme = {
    name,
    color: hexToRgb(currentThemeBg),
    text: hexToRgb(currentThemeText),
    accent: currentThemeAccent,
    border: 'rgba(255, 255, 255, 0.08)'
  }
  
  await window.api.saveCustomTheme(newTheme)
  injectThemeCard(newTheme, true)
  
  themeName.value = ''
  themeBuilderForm.style.display = 'none'
  themeBuilderEntry.style.display = 'flex'
  
  // Auto select the new theme
  const allCards = document.querySelectorAll('.theme-card')
  if (allCards.length > 0) {
    allCards[allCards.length - 1].click()
  }
})

// Load saved custom themes on startup
window.api.loadCustomThemes().then(themes => {
  themes.forEach(theme => injectThemeCard(theme, true))
})

// Custom GIF Settings Logic
const toggleCustomGif = document.getElementById('toggle-custom-gif');
const toggleGifBg = document.getElementById('toggle-gif-bg');
const customGifUrlInput = document.getElementById('custom-gif-url');
const customGifImg = document.getElementById('custom-gif-img');

let customGifSettings = JSON.parse(localStorage.getItem('customGifSettings')) || {
  enabled: false,
  showBackground: false,
  url: 'https://media.tenor.com/3_L-B_yvLuwAAAAi/run-mario.gif'
};

const defaultCdSvg = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="%23181818" /><circle cx="50" cy="50" r="40" fill="none" stroke="%232a2a2a" stroke-width="2" /><circle cx="50" cy="50" r="32" fill="none" stroke="%232a2a2a" stroke-width="2" /><circle cx="50" cy="50" r="24" fill="none" stroke="%232a2a2a" stroke-width="2" /><circle cx="50" cy="50" r="16" fill="%23111" /><circle cx="50" cy="50" r="5" fill="%23333" /><path d="M50 2 A48 48 0 0 1 85 16 L50 50 Z" fill="rgba(255,255,255,0.05)" /><path d="M50 98 A48 48 0 0 1 15 84 L50 50 Z" fill="rgba(255,255,255,0.05)" /></svg>';

const customGifDetails = document.getElementById('custom-gif-details');
const customGifNameInput = document.getElementById('custom-gif-name');
const btnSaveGif = document.getElementById('btn-save-gif');

let savedCustomGifs = JSON.parse(localStorage.getItem('savedCustomGifs')) || [];

// Cleanup previously injected default GIFs
const defaultUrls = [
  'https://i.pinimg.com/originals/f6/75/cd/f675cd00632cd2ce6fc9526715f606a2.gif',
  'https://media.tenor.com/71G1f6Jb5S0AAAAC/cyberpunk-pixel-art.gif',
  'https://i.pinimg.com/originals/17/5c/49/175c4943dc4f3317dd4daab0e2bce430.gif',
  'https://i.pinimg.com/originals/5c/d5/43/5cd5432d665a399cebc57ed92fc63cf6.gif'
];
savedCustomGifs = savedCustomGifs.filter(gif => !defaultUrls.includes(gif.url));
localStorage.setItem('savedCustomGifs', JSON.stringify(savedCustomGifs));

function renderSavedGifsGrid() {
  const grid1 = document.getElementById('saved-gifs-grid');
  if (!grid1) return;
  grid1.innerHTML = '';
  
  savedCustomGifs.forEach((gif, index) => {
    const isActive = customGifSettings.url === gif.url;
    const card = document.createElement('div');
    card.className = `gif-card ${isActive ? 'active' : ''}`;
    card.innerHTML = `
      <div class="gif-preview">
        <img src="${gif.url}" style="width: 100%; height: auto; display: block;" />
        <div class="gif-select-box" style="position: absolute; top: 6px; left: 6px; width: 14px; height: 14px; border-radius: 3px; border: 2px solid ${isActive ? '#4ade80' : 'rgba(255,255,255,0.4)'}; background: ${isActive ? '#4ade80' : 'rgba(0,0,0,0.5)'}; display: flex; align-items: center; justify-content: center; transition: all 0.2s; z-index: 2;">
          ${isActive ? '<svg viewBox="0 0 24 24" width="10" height="10" fill="#000"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>' : ''}
        </div>
      </div>
      <div class="gif-info">
        <span style="font-weight: 500; color: var(--text-main);">${gif.name}</span>
        <button class="icon-btn delete-gif-btn" style="color: #e06c75; font-size: 10px; padding: 2px;">✕</button>
      </div>
    `;
    
    card.onclick = () => {
      customGifSettings.url = gif.url;
      localStorage.setItem('customGifSettings', JSON.stringify(customGifSettings));
      applyCustomGifSettings();
      renderSavedGifsGrid();
    };
    
    card.querySelector('.delete-gif-btn').onclick = (e) => {
      e.stopPropagation();
      savedCustomGifs.splice(index, 1);
      localStorage.setItem('savedCustomGifs', JSON.stringify(savedCustomGifs));
      renderSavedGifsGrid();
    };
    
    grid1.appendChild(card);
  });
}

const customGifOverlay = document.querySelector('.custom-gif-overlay');
const customGifWrapper = document.querySelector('.custom-gif-wrapper');

const btnOpenGifPicker = document.getElementById('btn-open-gif-picker');
if (btnOpenGifPicker) {
  btnOpenGifPicker.addEventListener('click', () => {
    window.api.openGifWindow();
  });
}

window.api.onGifSelected((_, gif) => {
  customGifSettings.url = gif.url;
  customGifSettings.enabled = true;
  if (toggleCustomGif) toggleCustomGif.checked = true;
  localStorage.setItem('customGifSettings', JSON.stringify(customGifSettings));
  
  // Refresh the saved gifs in case new ones were added in the external window
  savedCustomGifs = JSON.parse(localStorage.getItem('savedCustomGifs')) || [];
  
  applyCustomGifSettings();
  renderSavedGifsGrid();
});

function applyCustomGifSettings() {
  if (customGifImg) customGifImg.style.display = 'block';
  
  if (customGifSettings.enabled) {
    if (toggleCustomGif) toggleCustomGif.checked = true;
    if (toggleGifBg) toggleGifBg.checked = !!customGifSettings.showBackground;
    if (customGifDetails) customGifDetails.style.display = 'block';
    if (customGifUrlInput) customGifUrlInput.value = customGifSettings.url;
    if (customGifImg) {
      customGifImg.src = customGifSettings.url;
      customGifImg.classList.remove('spin-cd');
    }
    if (customGifOverlay) customGifOverlay.style.borderRadius = '8px';

    if (customGifSettings.showBackground) {
      document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('active'))
      document.body.style.backgroundImage = `url('${customGifSettings.url}')`;
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundPosition = 'center';
      root.style.setProperty('--bg-blur', '0px');
      const brightnessContainer = document.getElementById('brightness-setting-container');
      if (brightnessContainer) brightnessContainer.style.display = 'flex';
      
      if (opacitySlider) {
        opacitySlider.min = 70;
        if (parseInt(opacitySlider.value) < 70) {
          opacitySlider.value = 70;
          if (opacityValue) opacityValue.innerText = '70%';
          root.style.setProperty('--bg-opacity', 0.7);
          localStorage.setItem('bgOpacity', 70);
        }
      }
    } else {
      document.body.style.backgroundImage = 'none';
      root.style.setProperty('--bg-blur', '25px');
      root.style.setProperty('--bg-brightness', '1');
      const brightnessContainer = document.getElementById('brightness-setting-container');
      if (brightnessContainer) brightnessContainer.style.display = 'none';
      if (opacitySlider) opacitySlider.min = 40;
    }
  } else {
    if (toggleCustomGif) toggleCustomGif.checked = false;
    if (customGifDetails) customGifDetails.style.display = 'none';
    if (customGifImg) {
      customGifImg.src = defaultCdSvg;
      customGifImg.classList.add('spin-cd');
    }
    if (customGifOverlay) customGifOverlay.style.borderRadius = '50%';
    document.body.style.backgroundImage = 'none';
    root.style.setProperty('--bg-blur', '25px');
    root.style.setProperty('--bg-brightness', '1');
    const brightnessContainer = document.getElementById('brightness-setting-container');
    if (brightnessContainer) brightnessContainer.style.display = 'none';
    if (opacitySlider) opacitySlider.min = 40;
  }
  updateGifAdaptiveTheme();
}

if (toggleCustomGif) {
  toggleCustomGif.addEventListener('change', (e) => {
    customGifSettings.enabled = e.target.checked;
    if (!customGifSettings.url) customGifSettings.url = 'https://media.tenor.com/3_L-B_yvLuwAAAAi/run-mario.gif';
    localStorage.setItem('customGifSettings', JSON.stringify(customGifSettings));
    applyCustomGifSettings();
    if (customGifSettings.enabled) renderSavedGifsGrid();
  });
}

if (toggleGifBg) {
  toggleGifBg.addEventListener('change', (e) => {
    customGifSettings.showBackground = e.target.checked;
    localStorage.setItem('customGifSettings', JSON.stringify(customGifSettings));
    applyCustomGifSettings();
  });
}

if (customGifUrlInput) {
  customGifUrlInput.addEventListener('input', (e) => {
    customGifSettings.url = e.target.value.trim();
    localStorage.setItem('customGifSettings', JSON.stringify(customGifSettings));
    applyCustomGifSettings();
  });
}

function extractDominantColor(imgEl) {
  if (!imgEl) return;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = imgEl.naturalWidth || 50;
  canvas.height = imgEl.naturalHeight || 50;
  if(canvas.width === 0 || canvas.height === 0) return null;
  ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);
  try {
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let r = 0, g = 0, b = 0, count = 0;
    for (let i = 0; i < data.length; i += 16) {
      if (data[i+3] > 128) {
        r += data[i];
        g += data[i+1];
        b += data[i+2];
        count++;
      }
    }
    if (count === 0) return null;
    return { r: Math.floor(r/count), g: Math.floor(g/count), b: Math.floor(b/count) };
  } catch (e) {
    return null;
  }
}

function updateGifAdaptiveTheme() {
  const activeThemeName = localStorage.getItem('activeThemeName');
  if (!activeThemeName || !activeThemeName.startsWith('GIF Adaptive')) return;

  const color = extractDominantColor(customGifImg);
  if (!color) return;

  const { r, g, b } = color;
  
  if (activeThemeName === 'GIF Adaptive (Dark)') {
    const bgR = Math.floor(r * 0.15);
    const bgG = Math.floor(g * 0.15);
    const bgB = Math.floor(b * 0.15);
    
    document.documentElement.style.setProperty('--bg-color-rgb', `${bgR}, ${bgG}, ${bgB}`);
    document.documentElement.style.setProperty('--accent', `rgb(${r}, ${g}, ${b})`);
    document.documentElement.style.setProperty('--text-main', `rgb(255, 255, 255)`);
    document.documentElement.style.setProperty('--text-muted', `rgba(255, 255, 255, 0.5)`);
    document.documentElement.style.setProperty('--border-color', `rgba(${r}, ${g}, ${b}, 0.2)`);
  } else {
    // Light Mode
    const bgR = Math.floor(r + (255 - r) * 0.92);
    const bgG = Math.floor(g + (255 - g) * 0.92);
    const bgB = Math.floor(b + (255 - b) * 0.92);
    
    // Very dark text based on the dominant color
    const textR = Math.floor(r * 0.15);
    const textG = Math.floor(g * 0.15);
    const textB = Math.floor(b * 0.15);
    
    // Accent can be a slightly darkened version of the dominant color to ensure readability
    const accR = Math.floor(r * 0.8);
    const accG = Math.floor(g * 0.8);
    const accB = Math.floor(b * 0.8);

    document.documentElement.style.setProperty('--bg-color-rgb', `${bgR}, ${bgG}, ${bgB}`);
    document.documentElement.style.setProperty('--accent', `rgb(${accR}, ${accG}, ${accB})`);
    document.documentElement.style.setProperty('--text-main', `rgb(${textR}, ${textG}, ${textB})`);
    document.documentElement.style.setProperty('--text-muted', `rgba(${textR}, ${textG}, ${textB}, 0.6)`);
    document.documentElement.style.setProperty('--border-color', `rgba(${textR}, ${textG}, ${textB}, 0.15)`);
  }
  broadcastThemeVars()
}

function broadcastThemeVars() {
  const root = document.documentElement;
  localStorage.setItem('themeVars', JSON.stringify({
    bg: root.style.getPropertyValue('--bg-color-rgb') || '15, 15, 15',
    text: root.style.getPropertyValue('--text-main') || 'rgb(255, 255, 255)',
    muted: root.style.getPropertyValue('--text-muted') || 'rgba(255, 255, 255, 0.5)',
    accent: root.style.getPropertyValue('--accent') || '#39ff14',
    border: root.style.getPropertyValue('--border-color') || 'rgba(255,255,255,0.1)'
  }));
}

// Ensure customGifImg has listener only if it exists
if (customGifImg) {
  customGifImg.addEventListener('load', updateGifAdaptiveTheme);
}

if (btnSaveGif && customGifNameInput && customGifUrlInput) {
  btnSaveGif.addEventListener('click', () => {
    const name = customGifNameInput.value.trim() || 'My GIF';
    const url = customGifUrlInput.value.trim();
    if (url) {
      savedCustomGifs.push({ name, url });
      localStorage.setItem('savedCustomGifs', JSON.stringify(savedCustomGifs));
      
      customGifSettings.url = url;
      localStorage.setItem('customGifSettings', JSON.stringify(customGifSettings));
      
      customGifNameInput.value = '';
      customGifUrlInput.value = '';
      applyCustomGifSettings();
      renderSavedGifsGrid();
    }
  });
}

// Initial Render
applyCustomGifSettings();
if (customGifSettings.enabled) renderSavedGifsGrid();

// Cross-window localStorage sync using IPC
const originalSetItem = localStorage.setItem;
localStorage.setItem = function(key, value) {
  originalSetItem.apply(this, arguments);
  if (window.api && window.api.syncSettings) {
    window.api.syncSettings({ key, value });
  }
};

if (window.api && window.api.onSettingsSynced) {
  window.api.onSettingsSynced((event, { key, value }) => {
    originalSetItem.call(localStorage, key, value);
    // Manually dispatch storage event since it doesn't fire for same-window changes
    const ev = new StorageEvent('storage', {
      key: key,
      newValue: value
    });
    window.dispatchEvent(ev);
  });
}
