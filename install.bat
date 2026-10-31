@echo off
chcp 65001 >nul
echo ====================================================
echo        大肥鱼 DSH 桌宠插件 - 一键安装
echo        大肥鱼 DSH companion - one-click install
echo ====================================================
echo.

set "TARGET_DIR=%~dp0"
set "TARGET_FILE=%TARGET_DIR%lib\index.js"

if not exist "%TARGET_FILE%" (
    echo [错误] 未在当前文件夹找到 lib\index.js
    echo [Error] lib\index.js was not found in this folder.
    echo 请确认您已将整个压缩包完整解压到本地文件夹，而不是直接在压缩包内双击！
    echo Extract the whole ZIP into a folder first - do not run it from inside the ZIP.
    echo.
    pause
    exit /b 1
)

set "PROFILE_DIR=%USERPROFILE%\.dsh\profiles\desktop"
set "PATCH_FILE=%PROFILE_DIR%\cordis.patch.yml"

if not exist "%PROFILE_DIR%" (
    echo [提示] 正在初始化 DSH 配置目录 / Creating the DSH profile folder: %PROFILE_DIR% ...
    mkdir "%PROFILE_DIR%" 2>nul
)

:: 将 Windows 反斜杠路径转换为 file:/// URI 格式（正斜杠）
set "CONVERTED_PATH=%TARGET_FILE:\=/%"
set "FILE_URI=file:///%CONVERTED_PATH%"

echo [信息] 插件加载路径 / Plugin path: %FILE_URI%
echo.

if not exist "%PATCH_FILE%" (
    (
        echo - insert:
        echo     - id: dsh-whale-pet
        echo       name: "%FILE_URI%"
    ) > "%PATCH_FILE%"
    echo [成功] 已创建配置文件并注册大肥鱼插件！
    echo [OK] Created the profile file and registered the plugin.
) else (
    findstr /C:"dsh-whale-pet" "%PATCH_FILE%" >nul 2>&1
    if %errorlevel% equ 0 (
        echo [提示] 检测到已有大肥鱼配置，正在更新为当前路径...
        echo [Info] Existing registration found - updating it to this folder...
        powershell -NoProfile -Command "$f='%PATCH_FILE%'; $c=Get-Content -Raw -Encoding UTF8 $f; $c=$c -replace 'name:\s*\"file:///[^\"]*dsh-whale-pet[^\"]*\"', ('name: \"%FILE_URI%\"'); Set-Content -Path $f -Value $c -Encoding UTF8"
        echo [成功] 插件路径已更新！
        echo [OK] Plugin path updated.
    ) else (
        (
            echo.
            echo - insert:
            echo     - id: dsh-whale-pet
            echo       name: "%FILE_URI%"
        ) >> "%PATCH_FILE%"
        echo [成功] 已向 cordis.patch.yml 注册大肥鱼插件！
        echo [OK] Registered the plugin in cordis.patch.yml.
    )
)

echo.
echo ====================================================
echo  安装成功！ / Installed!
echo.
echo  1. DeepSeek Harness 已打开：在窗口中按 Ctrl + R 刷新。
echo     If DeepSeek Harness is open: press Ctrl + R in its window.
echo  2. DeepSeek Harness 未打开：正常启动即可在右下角看到大肥鱼。
echo     If it is closed: start it and find 大肥鱼 at the bottom right.
echo ====================================================
echo.
pause
