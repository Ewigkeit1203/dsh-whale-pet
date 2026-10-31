@echo off
chcp 65001 >nul
echo ====================================================
echo        大肥鱼 DSH 桌宠插件 - 一键卸载
echo        大肥鱼 DSH companion - one-click uninstall
echo ====================================================
echo.

set "PATCH_FILE=%USERPROFILE%\.dsh\profiles\desktop\cordis.patch.yml"

if not exist "%PATCH_FILE%" (
    echo [提示] 未找到 DSH 插件配置文件，无需卸载。
    echo [Info] No DSH plugin profile was found - nothing to remove.
    pause
    exit /b 0
)

powershell -NoProfile -Command "$f='%PATCH_FILE%'; if (Test-Path $f) { $c=Get-Content -Raw -Encoding UTF8 $f; $c=$c -replace '(?ms)^[ \t]*-[ \t]*insert:\s*\r?\n\s*-[ \t]*id:\s*dsh-whale-pet\s*\r?\n\s*name:\s*\"[^\"]*\"\r?\n?', ''; Set-Content -Path $f -Value $c.Trim() -Encoding UTF8; Write-Host '[成功] 已从 cordis.patch.yml 中移除大肥鱼插件配置！'; Write-Host '[OK] Removed the plugin from cordis.patch.yml.' }"

echo.
echo ====================================================
echo  卸载完成！ / Uninstalled.
echo  在 DeepSeek Harness 窗口中按 Ctrl + R 刷新即可恢复原本界面。
echo  Press Ctrl + R in DeepSeek Harness to reload without the plugin.
echo  已保存的偏好会保留。 / Your saved preferences are kept.
echo ====================================================
echo.
pause
