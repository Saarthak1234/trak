import { app, BrowserWindow } from 'electron';
import fs from 'fs';

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, width: 44, height: 44, transparent: true, frame: false });

  // Here is the SVG that generates the icon!
  // The viewBox is 24x24.
  // The <rect> draws the outer squircle.
  // The <g> transforms (scales/moves) the music note path.
  // The <mask> punches the music note out of the squircle to make it transparent.
  const html = `
    <html>
      <body style="margin: 0; padding: 0; background: transparent; overflow: hidden; display: flex; align-items: center; justify-content: center; height: 100vh;">
        <svg width="38" height="38" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <mask id="hole">
              <rect width="24" height="24" fill="white"/>
              
              <!-- Tweak translate(X, Y) and scale(X) below to move and resize the note inside the squircle -->
              <g transform="translate(4.85, 5.325) scale(0.65)">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" fill="black"/>
              </g>
            </mask>
          </defs>
          
          <!-- Tweak width, height, and rx (corner radius) below to change the outer squircle -->
          <rect x="3" y="3" width="18" height="18" rx="4" fill="black" mask="url(#hole)"/>
        </svg>
      </body>
    </html>
  `;

  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

  // Wait a moment for render, then save to PNG
  setTimeout(async () => {
    const image = await win.webContents.capturePage({ x: 0, y: 0, width: 44, height: 44 });
    const buffer = image.toPNG();
    fs.writeFileSync('trayTemplate@2x.png', buffer); // High-res for retina displays

    // Scale down for 1x
    const image1x = image.resize({ width: 22, height: 22 });
    fs.writeFileSync('trayTemplate.png', image1x.toPNG()); // Standard res

    console.log('Successfully regenerated Tray Icons!');
    app.quit();
  }, 1000);
});
