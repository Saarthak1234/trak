import YTDlpWrapModule from 'yt-dlp-wrap'
const YTDlpWrap = YTDlpWrapModule.default || YTDlpWrapModule
import chalk from 'chalk'
import ora from 'ora'
import { playStream } from './player.js'
import { tui } from './tui.js'

const ytDlp = new YTDlpWrap()

const inFlightRequests = new Map();

export async function getStreamData(query) {
  if (inFlightRequests.has(query)) {
    return inFlightRequests.get(query);
  }

  const promise = (async () => {
    let searchQuery = query;
    let targetDurationMs = 0;
    if (query.includes('|DURATION:')) {
      const parts = query.split('|DURATION:');
      searchQuery = parts[0].trim();
      targetDurationMs = parseInt(parts[1], 10);
    }
    
    console.log(`YouTube Search Query: ${searchQuery} (Target: ${targetDurationMs}ms)`)
    const output = await ytDlp.execPromise([
      `ytsearch5:${searchQuery}`,
      '--get-title',
      '--get-url',
      '--get-duration',
      '-f', 'bestaudio/best',
      '--no-playlist',
      '--no-warnings',
      '--match-filter', 'duration < 600',
    ])
    const lines = output.trim().split('\n')
    if (lines.length < 3 || !lines[1]) {
      throw new Error('No stream found matching criteria')
    }
    
    const results = [];
    for (let i = 0; i < lines.length; i += 3) {
      if (lines[i] && lines[i+1]) {
        const title = lines[i];
        const streamUrl = lines[i+1];
        const durationStr = lines[i+2] || '0:00';
        
        let durationSeconds = 0;
        const tparts = durationStr.split(':').map(Number);
        if (tparts.length === 3) durationSeconds = tparts[0]*3600 + tparts[1]*60 + tparts[2];
        else if (tparts.length === 2) durationSeconds = tparts[0]*60 + tparts[1];
        else if (tparts.length === 1) durationSeconds = tparts[0];
        
        results.push({ title, streamUrl, durationStr, durationSeconds });
      }
    }
    
    let bestResult = results[0];
    if (targetDurationMs > 0 && results.length > 1) {
      const targetSec = targetDurationMs / 1000;
      let minDiff = Infinity;
      for (const r of results) {
        const diff = Math.abs(r.durationSeconds - targetSec);
        if (diff < minDiff) {
          minDiff = diff;
          bestResult = r;
        }
      }
      console.log(`Matched closest stream: ${bestResult.title} (${bestResult.durationStr}) with target ${targetDurationMs}ms`);
    }
    
    return { title: bestResult.title, streamUrl: bestResult.streamUrl, durationStr: bestResult.durationStr }
  })();

  inFlightRequests.set(query, promise);
  try {
    const result = await promise;
    // Keep it cached in memory for 10 seconds to protect against UI double-clicks or rapidly advancing queue
    setTimeout(() => inFlightRequests.delete(query), 10000);
    return result;
  } catch (err) {
    inFlightRequests.delete(query);
    throw err;
  }
}

export async function searchAndPlay(query, isStandalone = false) {
  let spinner;
  if (!isStandalone) {
    // Playlist mode: just set title
    tui.updateState({ title: 'Searching YouTube...', artist: '' })
    tui.render()
  } else {
    // Single search mode: use standard CLI spinner
    spinner = ora('  Finding on YouTube...').start()
  }

  const searchQuery = query

  try {
    const output = await ytDlp.execPromise([
      `ytsearch1:${searchQuery}`,   
      '--get-title',
      '--get-url',
      '--get-duration',       
      '-f', 'bestaudio/best', 
      '--no-playlist',
      '--no-warnings',
    ])

    const lines     = output.trim().split('\n')
    const title     = lines[0]
    const streamUrl = lines[1]
    const durationStr = lines[2]

    let durationInSeconds = 0
    if (durationStr) {
      const parts = durationStr.split(':').map(Number)
      if (parts.length === 3) {
        durationInSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2]
      } else if (parts.length === 2) {
        durationInSeconds = parts[0] * 60 + parts[1]
      } else if (parts.length === 1) {
        durationInSeconds = parts[0]
      }
    }

    if (!streamUrl) {
      if (spinner) spinner.fail(chalk.red('  No stream found'))
      return
    }

    if (spinner) spinner.stop()
    
    if (!isStandalone) {
      tui.updateState({ title, artist: '' })
      tui.render()
    } else {
      console.log(chalk.green(`\n  Playing: `) + chalk.white(`${title}\n`))
    }

    await playStream(streamUrl, durationInSeconds)
  } catch (err) {
    if (spinner) {
      spinner.fail(chalk.red(`  YouTube error: ${err.message}`))
    } else {
      tui.updateState({ title: `Error: ${err.message}`, artist: '' })
      tui.render()
    }
  }
}

import readline from 'readline'
import { stopCurrentStream, pauseCurrentStream, resumeCurrentStream, toggleLoop, getIsLooping } from './player.js'

export async function searchCommand(query) {

  let isPaused = false
  let isQuit = false
  let isCommandMode = false
  let commandBuffer = ''
  let currentQuery = query
  let nextQuery = null
  let userQueue = []
  let history = []

  readline.emitKeypressEvents(process.stdin)
  if (process.stdin.isTTY) process.stdin.setRawMode(true)
  process.stdin.resume()

  const handleInput = (str, key) => {
    if (!key) return

    if (isCommandMode) {
      if (key.name === 'return' || key.name === 'enter') {
        isCommandMode = false
        const val = commandBuffer.trim()
        
        if (val.length > 0) {
          if (val.startsWith('+')) {
            const queueItem = val.slice(1).trim()
            if (queueItem) userQueue.push(queueItem)
            tui.updateState({ userQueue: [...userQueue], commandInput: `Queued: ${queueItem}` })
            setTimeout(() => {
              if (!isCommandMode) {
                tui.updateState({ commandInput: undefined })
                tui.render()
              }
            }, 1500)
          } else if (val.startsWith('-')) {
            const queueItem = val.slice(1).trim()
            if (!queueItem) {
              userQueue.pop()
            } else {
              const num = parseInt(queueItem, 10)
              if (!isNaN(num) && num > 0 && num <= userQueue.length && num.toString() === queueItem) {
                userQueue.splice(num - 1, 1)
              } else {
                const lower = queueItem.toLowerCase()
                const idx = userQueue.findIndex(q => q.toLowerCase().includes(lower))
                if (idx !== -1) {
                  userQueue.splice(idx, 1)
                }
              }
            }
            tui.updateState({ userQueue: [...userQueue], commandInput: undefined })
          } else {
            tui.updateState({ commandInput: undefined })
            nextQuery = val
            stopCurrentStream(true)
          }
        } else {
          tui.updateState({ commandInput: undefined })
        }
        tui.render()
      } else if (key.name === 'escape') {
        isCommandMode = false
        tui.updateState({ commandInput: undefined })
        tui.render()
      } else if (key.name === 'backspace') {
        commandBuffer = commandBuffer.slice(0, -1)
        tui.updateState({ commandInput: commandBuffer })
        tui.render()
      } else if (str && str.length === 1) {
        commandBuffer += str
        tui.updateState({ commandInput: commandBuffer })
        tui.render()
      }
      return
    }

    if ((key.ctrl && key.name === 'c') || key.name === 'q') {
      isQuit = true
      stopCurrentStream()
      tui.leaveAlternateScreen()
      process.exit(0)
    } else if (key.name === 'n' || key.name === 'right') {
      stopCurrentStream()
    } else if (key.name === 'p' || key.name === 'left') {
      if (!getIsLooping()) {
        if (history.length > 0) {
          userQueue.unshift(currentQuery)
          nextQuery = history.pop()
          tui.updateState({ userQueue: [...userQueue] })
        } else {
          nextQuery = currentQuery
        }
      }
      stopCurrentStream()
    } else if (key.name === 's' || key.name === 'space') {
      if (isPaused) {
        resumeCurrentStream()
        isPaused = false
        tui.updateState({ isPaused: false })
        tui.render()
      } else {
        pauseCurrentStream()
        isPaused = true
        tui.updateState({ isPaused: true })
        tui.render()
      }
    } else if (key.name === 'c') {
      tui.cycleAnimation()
      tui.render()
    } else if (key.name === 'v') {
      tui.cycleColor()
      tui.render()
    } else if (str === '+' || str === '=') {
      tui.increaseSpeed()
      tui.render()
    } else if (str === '-' || str === '_') {
      tui.decreaseSpeed()
      tui.render()
    } else if (key.name === 'l') {
      toggleLoop()
    } else if (str === '/' || key.name === '/') {
      isCommandMode = true
      commandBuffer = ''
      tui.updateState({ commandInput: commandBuffer })
      tui.render()
    }
  }

  process.stdin.on('keypress', handleInput)

  tui.enterAlternateScreen()

  while (currentQuery && !isQuit) {
    const finalQuery = `${currentQuery} lyric video`
    tui.updateState({ title: `Searching: ${currentQuery}`, artist: '', nextTrack: 'None' })
    tui.render()

    await searchAndPlay(finalQuery, false)

    if (nextQuery) {
      if (nextQuery !== currentQuery) history.push(currentQuery)
      currentQuery = nextQuery
      nextQuery = null
    } else if (userQueue.length > 0) {
      history.push(currentQuery)
      currentQuery = userQueue.shift()
      tui.updateState({ userQueue: [...userQueue] })
    } else {
      break
    }
  }

  tui.leaveAlternateScreen()
  
  process.stdin.off('keypress', handleInput)
  if (process.stdin.isTTY) process.stdin.setRawMode(false)
  process.stdin.pause()
  console.log(chalk.green('\n  [Success] Finished!\n'))
}