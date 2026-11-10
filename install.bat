@echo off
rem Installs Saturne for the current user: copies Saturne.exe to %LOCALAPPDATA%\Programs\Saturne
rem and creates Start Menu and Desktop shortcuts. No administrator rights needed.
setlocal
cd /d "%~dp0"

set "SRC=%~dp0Saturne.exe"
if not exist "%SRC%" set "SRC=%~dp0target\release\saturne.exe"
if not exist "%SRC%" (
  echo Saturne.exe not found. Build it first: cargo build --release
  pause
  exit /b 1
)

set "DEST=%LOCALAPPDATA%\Programs\Saturne"
mkdir "%DEST%" 2>nul
taskkill /F /IM Saturne.exe >nul 2>&1
copy /Y "%SRC%" "%DEST%\Saturne.exe" >nul
if errorlevel 1 (
  echo Could not copy Saturne.exe to %DEST%
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$s = New-Object -ComObject WScript.Shell;" ^
  "foreach ($p in @([Environment]::GetFolderPath('Programs'), [Environment]::GetFolderPath('Desktop'))) {" ^
  "  $l = $s.CreateShortcut((Join-Path $p 'Saturne.lnk'));" ^
  "  $l.TargetPath = '%DEST%\Saturne.exe'; $l.WorkingDirectory = '%DEST%'; $l.IconLocation = '%DEST%\Saturne.exe,0'; $l.Description = 'Saturne';" ^
  "  $l.Save() }"

echo.
echo Saturne is installed. Launch it from the Start Menu or the Desktop shortcut.
start "" "%DEST%\Saturne.exe"
endlocal
