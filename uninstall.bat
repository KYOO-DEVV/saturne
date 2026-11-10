@echo off
rem Uninstalls Saturne (program and shortcuts). Your accounts and playlists in %APPDATA%\Saturne are NOT deleted.
setlocal
taskkill /F /IM Saturne.exe >nul 2>&1
ping -n 3 127.0.0.1 >nul
rmdir /S /Q "%LOCALAPPDATA%\Programs\Saturne" 2>nul
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "foreach ($p in @([Environment]::GetFolderPath('Programs'), [Environment]::GetFolderPath('Desktop'))) { Remove-Item (Join-Path $p 'Saturne.lnk') -ErrorAction SilentlyContinue }"
echo Saturne is uninstalled. Your data is kept in %APPDATA%\Saturne.
pause
endlocal
