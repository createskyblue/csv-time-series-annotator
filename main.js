const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "CSV时间序列标注工具",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    }
  });

  // 加载你的 index.html
  win.loadFile('index.html');
  
  // 隐藏菜单栏（可选）
  win.setMenuBarVisibility(false);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});