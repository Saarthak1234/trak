import YTDlpWrapModule from 'yt-dlp-wrap'
const YTDlpWrap = YTDlpWrapModule.default || YTDlpWrapModule
const ytDlp = new YTDlpWrap()

async function test() {
  try {
    const output = await ytDlp.execPromise([
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
    console.log("SUCCESS:", output)
  } catch (err) {
    console.log("ERROR CATCHED. stdout:", err.stdout)
    console.log("stderr:", err.stderr)
    console.log("message:", err.message)
  }
}
test()
