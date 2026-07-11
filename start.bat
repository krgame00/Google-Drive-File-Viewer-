@echo off
chcp 65001 >nul 2>&1
title Google Drive File Viewer
echo.
echo  ╔══════════════════════════════════════════╗
echo  ║   Google Drive File Viewer - Local Server ║
echo  ╚══════════════════════════════════════════╝
echo.

:: ตรวจหา Python
where python >nul 2>&1
if %errorlevel%==0 (
    echo  [OK] ใช้ Python เปิดเซิร์ฟเวอร์...
    echo.
    echo  เปิดเบราว์เซอร์ไปที่ http://localhost:8000/google-drive-viewer.html
    echo  กด Ctrl+C เพื่อหยุดเซิร์ฟเวอร์
    echo.
    start http://localhost:8000/google-drive-viewer.html
    python -m http.server 8000
    pause
    exit /b
)

:: ลอง py (Python Launcher)
where py >nul 2>&1
if %errorlevel%==0 (
    echo  [OK] ใช้ Python เปิดเซิร์ฟเวอร์...
    echo.
    echo  เปิดเบราว์เซอร์ไปที่ http://localhost:8000/google-drive-viewer.html
    echo  กด Ctrl+C เพื่อหยุดเซิร์ฟเวอร์
    echo.
    start http://localhost:8000/google-drive-viewer.html
    py -m http.server 8000
    pause
    exit /b
)

:: ลอง Node.js
where node >nul 2>&1
if %errorlevel%==0 (
    echo  [OK] ใช้ Node.js เปิดเซิร์ฟเวอร์...
    echo.
    echo  เปิดเบราว์เซอร์ไปที่ http://localhost:8000/google-drive-viewer.html
    echo  กด Ctrl+C เพื่อหยุดเซิร์ฟเวอร์
    echo.
    start http://localhost:8000/google-drive-viewer.html
    node -e "require('http').createServer((req,res)=>{const fs=require('fs');const p='.'+(req.url==='/'?'/google-drive-viewer.html':req.url.split('?')[0]);try{const b=fs.readFileSync(p);res.writeHead(200,{'Content-Type':require('mime-types')?.lookup(p)||'text/html'});res.end(b)}catch(e){res.writeHead(404);res.end('Not Found')}}).listen(8000,()=>console.log('Server running at http://localhost:8000'))"
    pause
    exit /b
)

:: ไม่มีอะไรเลย
echo  [ERROR] ไม่พบ Python หรือ Node.js บนเครื่องนี้
echo.
echo  กรุณาติดตั้ง Python ก่อน:
echo  >>> https://www.python.org/downloads/
echo.
echo  หรือ Node.js:
echo  >>> https://nodejs.org/
echo.
pause
