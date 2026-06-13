import { execSync, exec } from 'child_process'
import { platform } from 'os'
import { promisify } from 'util'
import https from 'https'
import fs from 'fs'
import path from 'path'
import { createWriteStream, mkdirSync } from 'fs'
import chalk from 'chalk'
import ora from 'ora'
import inquirer from 'inquirer'
import { isSetupComplete, markSetupComplete, getAppCredentials, saveAppCredentials } from './config.js'

const execAsync = promisify(exec)
const OS = platform() // 'darwin', 'linux', 'win32'

function isInstalled(cmd) {
  try {
    execSync(`command -v ${cmd}`, { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

function getLocalBinDir() {
  // store binaries locally in user home to avoid needing sudo on Windows
  const home = process.env.HOME || process.env.USERPROFILE
  const dir = path.join(home, '.musync', 'bin')
  mkdirSync(dir, { recursive: true })
  return dir
}

function downloadFile(url, dest, spinner, depName = 'File') {
  return new Promise((resolve, reject) => {
    const request = (targetUrl) => {
      https.get(targetUrl, (res) => {
        // follow redirects
        if (res.statusCode === 301 || res.statusCode === 302) {
          return request(res.headers.location)
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} from ${targetUrl}`))
          return
        }

        const file = createWriteStream(dest)
        const totalBytes = parseInt(res.headers['content-length'], 10)
        let downloadedBytes = 0

        res.on('data', (chunk) => {
          downloadedBytes += chunk.length
          if (spinner && totalBytes) {
            const percent = ((downloadedBytes / totalBytes) * 100).toFixed(1)
            const mbTotal = (totalBytes / (1024 * 1024)).toFixed(1)
            const mbDone = (downloadedBytes / (1024 * 1024)).toFixed(1)
            spinner.text = `  Installing ${depName}... (${percent}% - ${mbDone}MB / ${mbTotal}MB)`
          }
        })

        res.pipe(file)
        file.on('finish', () => { file.close(); resolve() })
        file.on('error', reject)
      }).on('error', reject)
    }
    request(url)
  })
}

async function installYtDlp(spinner) {
  switch (OS) {
    case 'darwin':
      if (isInstalled('brew')) {
        if (spinner) spinner.stop()
        execSync('brew install yt-dlp', { stdio: 'inherit' })
        if (spinner) spinner.start()
      } else {
        if (spinner) spinner.stop()
        execSync(
          'curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && chmod a+rx /usr/local/bin/yt-dlp',
          { stdio: 'inherit' }
        )
        if (spinner) spinner.start()
      }
      break

    case 'linux':
      if (spinner) spinner.stop()
      execSync(
        'sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && sudo chmod a+rx /usr/local/bin/yt-dlp',
        { stdio: 'inherit' }
      )
      if (spinner) spinner.start()
      break

    case 'win32': {
      if (isInstalled('winget')) {
        try {
          if (spinner) spinner.stop()
          console.log(chalk.gray('  Starting winget installation for yt-dlp...'))
          execSync('winget install -e --id yt-dlp.yt-dlp --accept-source-agreements --accept-package-agreements', { stdio: 'inherit' })
          if (spinner) spinner.start()
          break
        } catch (e) {
          console.log(chalk.red(`  [Winget Error] ${e.message}`))
          if (spinner) spinner.start()
          // fallback
        }
      }
      const dir  = getLocalBinDir()
      const dest = path.join(dir, 'yt-dlp.exe')
      await downloadFile(
        'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe',
        dest,
        spinner,
        'yt-dlp'
      )
      // add to PATH for this session
      process.env.PATH = `${dir};${process.env.PATH}`
      if (spinner) spinner.text = `  Installing yt-dlp...`
      break
    }
  }
}

async function installFfmpeg(spinner) {
  switch (OS) {
    case 'darwin':
      if (isInstalled('brew')) {
        if (spinner) spinner.stop()
        execSync('brew install ffmpeg', { stdio: 'inherit' })
        if (spinner) spinner.start()
      } else {
        throw new Error('Please install ffmpeg manually: https://ffmpeg.org/download.html')
      }
      break

    case 'linux':
      if (spinner) spinner.stop()
      try {
        execSync('sudo apt-get install -y ffmpeg', { stdio: 'inherit' })
      } catch {
        try {
          execSync('sudo dnf install -y ffmpeg', { stdio: 'inherit' })
        } catch {
          if (spinner) spinner.start()
          throw new Error('Could not auto-install ffmpeg. Please run: sudo apt install ffmpeg')
        }
      }
      if (spinner) spinner.start()
      break

    case 'win32':
      if (isInstalled('winget')) {
        try {
          if (spinner) spinner.stop()
          console.log(chalk.gray('  Starting winget installation for ffmpeg...'))
          execSync('winget install -e --id Gyan.FFmpeg --accept-source-agreements --accept-package-agreements', { stdio: 'inherit' })
          if (spinner) spinner.start()
          break
        } catch (e) {
          console.log(chalk.red(`  [Winget Error] ${e.message}`))
          if (spinner) spinner.start()
          // fallback
        }
      }
      throw new Error(
        'ffmpeg on Windows needs manual install. Download from: https://www.gyan.dev/ffmpeg/builds/ Then add it to your PATH. (Or run: winget install Gyan.FFmpeg)'
      )
  }
}

export async function installTmux(spinner) {
  switch (OS) {
    case 'darwin':
      if (isInstalled('brew')) {
        if (spinner) spinner.stop()
        execSync('brew install tmux', { stdio: 'inherit' })
        if (spinner) spinner.start()
      } else {
        throw new Error('Please install Homebrew first (brew.sh) or install tmux manually.')
      }
      break

    case 'linux':
      if (spinner) spinner.stop()
      try {
        execSync('sudo apt-get install -y tmux', { stdio: 'inherit' })
      } catch {
        try {
          execSync('sudo dnf install -y tmux', { stdio: 'inherit' })
        } catch {
          if (spinner) spinner.start()
          throw new Error('Could not auto-install tmux. Please run: sudo apt install tmux')
        }
      }
      if (spinner) spinner.start()
      break

    case 'win32':
      throw new Error('tmux is not natively supported on Windows outside of WSL. Please use WSL or Git Bash.')
  }
}

export async function checkFirstRun() {
  // Self-installer feature for standalone binaries on Mac/Linux
  const isStandalone = !process.execPath.endsWith('node') && !process.execPath.endsWith('node.exe')
  const isGlobal = process.execPath.includes('/bin/') || process.execPath.includes('/opt/homebrew') || process.execPath.includes('\\AppData\\')
  
  if (isStandalone && !isGlobal && OS !== 'win32') {
    console.log(chalk.bold.green('\n  Welcome to Musync!\n'))
    const { installGlobal } = await inquirer.prompt([{
      type: 'confirm',
      name: 'installGlobal',
      message: 'Would you like to install musync globally so you can run it from anywhere by just typing "musync"?',
      default: true
    }])
    
    if (installGlobal) {
      try {
        console.log(chalk.gray('  Moving binary to /usr/local/bin/musync... (May ask for password)'))
        execSync(`sudo mv "${process.execPath}" /usr/local/bin/musync`, { stdio: 'inherit' })
        console.log(chalk.green('\n  [Success] Installed successfully! Please run "musync" from your terminal to start.\n'))
        process.exit(0)
      } catch (e) {
        console.log(chalk.red('\n  [Error] Failed to install globally. Continuing locally...\n'))
      }
    }
  }

  if (isSetupComplete()) return

  if (!isStandalone || isGlobal || OS === 'win32') {
    console.log(chalk.bold.green('\n  Welcome to Musync!\n'))
  }
  
  console.log(chalk.gray('  Checking for required dependencies...\n'))

  const missing = []
  if (!isInstalled('yt-dlp'))          missing.push('yt-dlp')
  if (!isInstalled('ffplay') && !isInstalled('ffmpeg')) missing.push('ffmpeg')
  if (!isInstalled('tmux') && OS !== 'win32') missing.push('tmux')

  if (missing.length === 0) {
    console.log(chalk.green('  [Success] All dependencies found!\n'))
    markSetupComplete()
    return
  }

  console.log(chalk.yellow(`  Missing: ${missing.join(', ')}\n`))

  const { confirm } = await inquirer.prompt([{
    type:    'confirm',
    name:    'confirm',
    message: `Install ${missing.join(' and ')} automatically?`,
    default: true,
  }])

  if (!confirm) {
    console.log(chalk.red('\n  Setup skipped. Some features may not work.\n'))
    markSetupComplete()
    return
  }

  for (const dep of missing) {
    const spinner = ora(`  Installing ${dep}...`).start()
    try {
      if (dep === 'yt-dlp')  await installYtDlp(spinner)
      if (dep === 'ffmpeg')  await installFfmpeg(spinner)
      if (dep === 'tmux')    await installTmux(spinner)
      spinner.succeed(chalk.green(`  ${dep} installed`))
    } catch (err) {
      spinner.fail(chalk.red(`  Failed to install ${dep}: ${err.message}`))
    }
  }

  // Spotify Auth Wizard
  await checkSpotifyCredentials()

  markSetupComplete()
  console.log()
}

export async function checkSpotifyCredentials() {
  const { clientId: existingId, clientSecret: existingSecret } = getAppCredentials();
  
  if (existingId && existingSecret) {
    return; // Already setup
  }

  console.log(chalk.bold.cyan('\n  Optional: Connect your Spotify Account\n'));
  console.log(chalk.white('  If you connect Spotify, you can browse and play your private playlists.'));
  console.log(chalk.white('  If you skip this, you can still play public playlist URLs directly! (e.g. musync play <url>)\n'));

  const { wantAuth } = await inquirer.prompt([{
    type: 'confirm',
    name: 'wantAuth',
    message: 'Do you want to connect your Spotify account? (Takes 2 minutes)',
    default: true
  }]);

  if (!wantAuth) {
    console.log(chalk.green('\n  [Success] Skipped Spotify login. You can still use: musync play <playlist_url>\n'));
    return;
  }

  console.log(chalk.bold('\n  Follow these exact steps to connect your account:\n'));
  console.log(chalk.gray('  1.') + ' Open your browser and go to: ' + chalk.cyan('https://developer.spotify.com/dashboard'));
  console.log(chalk.gray('  2.') + ' Log in with your normal Spotify account.');
  console.log(chalk.gray('  3.') + ' Click the ' + chalk.bold('"Create app"') + ' button on the top right.');
  console.log(chalk.gray('  4.') + ' Fill in the form:');
  console.log(chalk.gray('     - App Name: ') + chalk.white('Musync CLI'));
  console.log(chalk.gray('     - App Description: ') + chalk.white('Local music player'));
  console.log(chalk.gray('     - Redirect URI: ') + chalk.cyan.bold('http://127.0.0.1:8888/callback') + chalk.red(' (IMPORTANT: You must click "Add" after typing this!)'));
  console.log(chalk.gray('     - Which API is your app using?: ') + chalk.white('Check the box for "Web API"'));
  console.log(chalk.gray('  5.') + ' Scroll down, check the Terms of Service box, and click ' + chalk.bold('"Save"'));
  console.log(chalk.gray('  6.') + ' On the next page, click ' + chalk.bold('"Settings"') + ' (the gear icon near the top right).');
  console.log(chalk.gray('  7.') + ' You will now see your ' + chalk.cyan('Client ID') + ' and a link to view your ' + chalk.cyan('Client Secret') + '.\n');

  const { clientId, clientSecret } = await inquirer.prompt([
    {
      type: 'password',
      mask: '*',
      name: 'clientId',
      message: 'Paste your Client ID:',
      validate: i => i.length > 20 || 'Invalid Client ID'
    },
    {
      type: 'password',
      mask: '*',
      name: 'clientSecret',
      message: 'Paste your Client Secret:',
      validate: i => i.length > 20 || 'Invalid Client Secret'
    }
  ]);

  saveAppCredentials({
    clientId: clientId.trim(),
    clientSecret: clientSecret.trim()
  });
  console.log(chalk.green('\n  [Success] Credentials saved successfully!\n'));
}