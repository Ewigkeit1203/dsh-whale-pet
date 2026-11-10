@echo off
setlocal DisableDelayedExpansion
chcp 65001 >nul
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1"
set "INSTALL_EXIT=%ERRORLEVEL%"
if "%INSTALL_EXIT%"=="0" goto :finish
echo.
echo [ERROR] Installation failed. See the message above.
:finish
echo.
if /i "%~1"=="--no-pause" goto :done
pause
:done
exit /b %INSTALL_EXIT%
