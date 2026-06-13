#!/usr/bin/env node

import { program } from 'commander'
import chalk from 'chalk'
import { checkFirstRun, installTmux } from '../src/setup.js'
import { authCommand, logoutCommand } from '../src/auth.js'
import { playCommand, listCommand, viewCommand } from '../src/spotify.js'
import { searchCommand } from '../src/youtube.js'
import { hardReset } from '../src/config.js'

// run setup check on every command
await checkFirstRun()

program
  .name('musync')
  .description(chalk.green('Stream your Spotify playlists for free'))
  .version('1.1.0')

program
  .command('auth')
  .description('Login with your Spotify account')
  .action(authCommand)

program
  .command('logout')
  .description('Log out and clear saved tokens')
  .action(logoutCommand)

program
  .command('reset')
  .description('Wipe all credentials, secrets, and setup flags completely')
  .action(() => {
    hardReset()
    console.log(chalk.green('\n  [Success] All credentials, Client IDs, and settings have been completely erased.'))
    console.log(chalk.gray('  Run "musync play" to trigger the First-Run Wizard again.\n'))
  })

program
  .command('list')
  .description('List all your Spotify playlists')
  .action(listCommand)

program
  .command('view <playlist...>')
  .description('View all tracks in a playlist without playing')
  .action((playlistArgs) => viewCommand(playlistArgs.join(' ')))

program
  .command('play <playlist...>')
  .description('Play a playlist by name or Spotify URL')
  .option('-s, --shuffle', 'Shuffle the playlist')
  .action((playlistArgs, options) => playCommand(playlistArgs.join(' '), options))

program
  .command('search <query...>')
  .description('Search and play a specific song')
  .action((query) => searchCommand(query.join(' ')))

import { execSync } from 'child_process'

program
  .command('dev <playlist...>')
  .description('Launch Musync in Dev Mode (Split-screen terminal)')
  .option('-s, --shuffle', 'Shuffle the playlist')
  .action(async (playlistArgs, options) => {
    try {
      execSync('tmux -V', { stdio: 'ignore' })
    } catch {
      console.log(chalk.yellow('\n  [Notice] tmux is required for Dev Mode. Installing it now...\n'))
      try {
        await installTmux()
      } catch (e) {
        console.log(chalk.red('\n  [Error] Failed to install tmux automatically: ' + e.message + '\n'))
        process.exit(1)
      }
    }

    const playlist = playlistArgs.join(' ')
    const shuffleFlag = options.shuffle ? '-s' : ''
    
    // Check if we are already inside our dev session
    if (process.env.MUSYNC_DEV_SESSION) {
      console.log(chalk.red('\n  [Error] Already running inside Musync Dev Mode!\n'))
      process.exit(1)
    }

    // Determine how musync was invoked (e.g. `node bin/musync.js` or `musync`)
    const isNode = process.argv[0].includes('node')
    const cmdStr = isNode 
      ? `MUSYNC_DEV_SESSION=1 node "${process.argv[1]}" play "${playlist}" ${shuffleFlag}`
      : `MUSYNC_DEV_SESSION=1 musync play "${playlist}" ${shuffleFlag}`
    
    const sessionName = `musync-dev-${Date.now()}`
    
    try {
      // Create detached session running musync
      execSync(`tmux new-session -d -s ${sessionName} '${cmdStr}'`)
      // Enable mouse support so users can just click the panes
      execSync(`tmux set-option -t ${sessionName} mouse on`)
      // Split the window (bottom pane 4 rows tall for shell)
      execSync(`tmux split-window -v -l 4 -t ${sessionName}`)
      // Attach to the session
      execSync(`tmux attach-session -t ${sessionName}`, { stdio: 'inherit' })
    } catch (e) {
      console.log(chalk.red('\n  [Error] Failed to start tmux session.\n'))
    }
  })

program
  .command('dev-search <query...>')
  .description('Launch Musync in Dev Mode and search a specific song')
  .action(async (queryArgs) => {
    try {
      execSync('tmux -V', { stdio: 'ignore' })
    } catch {
      console.log(chalk.yellow('\n  [Notice] tmux is required for Dev Mode. Installing it now...\n'))
      try {
        await installTmux()
      } catch (e) {
        console.log(chalk.red('\n  [Error] Failed to install tmux automatically: ' + e.message + '\n'))
        process.exit(1)
      }
    }

    const query = queryArgs.join(' ')
    
    if (process.env.MUSYNC_DEV_SESSION) {
      console.log(chalk.red('\n  [Error] Already running inside Musync Dev Mode!\n'))
      process.exit(1)
    }

    const isNode = process.argv[0].includes('node')
    const cmdStr = isNode 
      ? `MUSYNC_DEV_SESSION=1 node "${process.argv[1]}" search "${query}"`
      : `MUSYNC_DEV_SESSION=1 musync search "${query}"`
    
    const sessionName = `musync-dev-${Date.now()}`
    
    try {
      execSync(`tmux new-session -d -s ${sessionName} '${cmdStr}'`)
      execSync(`tmux set-option -t ${sessionName} mouse on`)
      execSync(`tmux split-window -v -l 4 -t ${sessionName}`)
      execSync(`tmux attach-session -t ${sessionName}`, { stdio: 'inherit' })
    } catch (e) {
      console.log(chalk.red('\n  [Error] Failed to start tmux session.\n'))
    }
  })

program.parse()