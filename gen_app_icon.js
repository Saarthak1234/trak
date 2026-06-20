import { app, BrowserWindow } from 'electron';
import fs from 'fs';

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, width: 1024, height: 1024, transparent: true, frame: false });
  
  const html = `
    <html>
      <body style="margin: 0; padding: 0; background: transparent; overflow: hidden;">
        <svg width="1024" height="1024" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <!-- A perfect borderless squircle with standard macOS transparent padding (19x19 on a 24x24 canvas matches Apple's standard 824x824 inside 1024x1024) -->
          <rect x="2.5" y="2.5" width="19" height="19" rx="4.5" fill="#00C6FF"/>
          
          <!-- Perfectly sized and centered white music note -->
          <g transform="translate(3.3, 4.6) scale(0.7)">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" fill="white"/>
          </g>
        </svg>
      </body>
    </html>
  `;
  
  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  
  // Wait a moment for render
  setTimeout(async () => {
    const image = await win.webContents.capturePage({ x: 0, y: 0, width: 1024, height: 1024 });
    const buffer = image.toPNG();
    fs.writeFileSync('icon.png', buffer);
    
    console.log('High-res padded App Icon generated!');
    app.quit();
  }, 1000);
});
