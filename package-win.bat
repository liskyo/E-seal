@echo off
setlocal

rem Run from script directory
cd /d "%~dp0"

echo Installing dependencies...
npm install || goto :error

echo Packaging app...
npx electron-packager . E-seal --platform=win32 --arch=x64 --out=dist --overwrite --asar || goto :error

echo.
echo Done. Find build at dist\E-seal-win32-x64
goto :eof

:error
echo Failed. Please check the error log above.
exit /b 1
