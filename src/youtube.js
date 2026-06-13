import YTDlpWrapModule from 'yt-dlp-wrap'
const YTDlpWrap = YTDlpWrapModule.default || YTDlpWrapModule
import chalk from 'chalk'
import ora from 'ora'
import { playStream } from './player.js'
import { tui } from './tui.js'

const ytDlp = new YTDlpWrap()

export async function getStreamData(query) {
  const output = await ytDlp.execPromise([
    `ytsearch1:${query}`,   
    '--get-title',
    '--get-url',
    '--get-duration',       
    '-f', 'bestaudio/best', 
    '--no-playlist',
    '--no-warnings',
  ])
  const lines = output.trim().split('\n')
  const title = lines[0]
  const streamUrl = lines[1]
  const durationStr = lines[2]
  return { title, streamUrl, durationStr }
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