import YTDlpWrapModule from 'yt-dlp-wrap'
const YTDlpWrap = YTDlpWrapModule.default || YTDlpWrapModule
const ytDlp = new YTDlpWrap()

function test() {
  const ytDlpProcess = ytDlp.exec([
    `ytsearch5:Out of Body by Muse Petal audio`,
    '--get-title',
    '--get-url',
    '--get-duration',
    '-f', 'bestaudio/best',
    '--no-playlist',
    '--no-warnings',
    '--match-filter', 'duration < 600',
    '--max-downloads', '1'
  ])

  let stdout = ''
  ytDlpProcess.youtubeDlProcess.stdout.on('data', data => stdout += data.toString())
  ytDlpProcess.on('close', () => {
    console.log("CLOSED WITH STDOUT:", stdout)
  })
}
test()
