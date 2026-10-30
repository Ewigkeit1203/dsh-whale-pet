@echo off
chcp 65001 >nul
echo ====================================================
echo        DeepSeek 小鲸女「大肥鱼」桌宠插件 - 一键卸载
echo ====================================================
echo.

set "PATCH_FILE=%USERPROFILE%\.dsh\profiles\desktop\cordis.patch.yml"

if not exist "%PATCH_FILE%" (
    echo [提示] 未找到 DSH 插件配置文件，无需卸载。
    pause
    exit /b 0
)

powershell -NoProfile -Command "$f='%PATCH_FILE%'; if (Test-Path $f) { $c=Get-Content -Raw -Encoding UTF8 $f; $c=$c -replace '(?ms)^[ \t]*-[ \t]*insert:\s*\r?\n\s*-[ \t]*id:\s*dsh-whale-pet\s*\r?\n\s*name:\s*\"[^\"]*\"\r?\n?', ''; Set-Content -Path $f -Value $c.Trim() -Encoding UTF8; Write-Host '[成功] 已从 cordis.patch.yml 中移除大肥鱼插件配置！' }"

echo.
echo ====================================================
echo  卸载完成！
echo  在 DeepSeek Harness 窗口中按 Ctrl + R 刷新即可恢复原本界面。
echo ====================================================
echo.
pause
