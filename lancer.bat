@echo off
rem Launches Saturne. If the executable does not exist yet, it is built first (Rust required).
cd /d "%~dp0"
if exist Saturne.exe (
  start "" Saturne.exe
) else (
  echo Building Saturne, this can take a few minutes the first time...
  cargo build --release && copy /Y target\release\saturne.exe Saturne.exe >nul && start "" Saturne.exe
)
