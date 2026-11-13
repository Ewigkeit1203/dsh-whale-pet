@echo off
setlocal DisableDelayedExpansion
chcp 65001 >nul
set "INSTALL_SCRIPT=%~dp0installer\install.ps1"
if not exist "%INSTALL_SCRIPT%" set "INSTALL_SCRIPT=%~dp0install.ps1"
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%INSTALL_SCRIPT%" -PluginDirectory "%~dp0." -Uninstall
set "INSTALL_EXIT=%ERRORLEVEL%"
if "%INSTALL_EXIT%"=="0" goto :finish
echo.
echo [ERROR] Uninstallation failed. See the message above.
:finish
echo.
if /i "%~1"=="--no-pause" goto :done
pause
:done
exit /b %INSTALL_EXIT%
