@echo off
chcp 65001 >nul
echo ====================================================
echo        DeepSeek 小鲸女「大肥鱼」桌宠插件 - 一键安装
echo ====================================================
echo.

set "TARGET_DIR=%~dp0"
set "TARGET_FILE=%TARGET_DIR%lib\index.js"

if not exist "%TARGET_FILE%" (
    echo [错误] 未在当前文件夹找到 lib\index.js
    echo 请确认您已将整个压缩包完整解压到本地文件夹，而不是直接在压缩包内双击！
    echo.
    pause
    exit /b 1
)

set "PROFILE_DIR=%USERPROFILE%\.dsh\profiles\desktop"
set "PATCH_FILE=%PROFILE_DIR%\cordis.patch.yml"

if not exist "%PROFILE_DIR%" (
    echo [提示] 正在初始化 DSH 配置目录：%PROFILE_DIR% ...
    mkdir "%PROFILE_DIR%" 2>nul
)

:: 将 Windows 反斜杠路径转换为 file:/// URI 格式（正斜杠）
set "CONVERTED_PATH=%TARGET_FILE:\=/%"
set "FILE_URI=file:///%CONVERTED_PATH%"

echo [信息] 插件加载路径: %FILE_URI%
echo.

if not exist "%PATCH_FILE%" (
    (
        echo - insert:
        echo     - id: dsh-whale-pet
        echo       name: "%FILE_URI%"
    ) > "%PATCH_FILE%"
    echo [成功] 已创建配置文件并注册大肥鱼插件！
) else (
    findstr /C:"dsh-whale-pet" "%PATCH_FILE%" >nul 2>&1
    if %errorlevel% equ 0 (
        echo [提示] 检测到已存在大肥鱼插件配置，正在更新为当前路径...
        powershell -NoProfile -Command "$f='%PATCH_FILE%'; $c=Get-Content -Raw -Encoding UTF8 $f; $c=$c -replace 'name:\s*\"file:///[^\"]*dsh-whale-pet[^\"]*\"', ('name: \"%FILE_URI%\"'); Set-Content -Path $f -Value $c -Encoding UTF8"
        echo [成功] 插件路径已成功更新！
    ) else (
        (
            echo.
            echo - insert:
            echo     - id: dsh-whale-pet
            echo       name: "%FILE_URI%"
        ) >> "%PATCH_FILE%"
        echo [成功] 已成功向 cordis.patch.yml 注册大肥鱼插件！
    )
)

echo.
echo ====================================================
echo  安装成功！
echo.
echo  使用方式：
echo  1. 如果 DeepSeek Harness 正在运行中：
echo     请直接在软件窗口中按下快捷键「Ctrl + R」刷新；
echo  2. 如果 DeepSeek Harness 未启动：
echo     直接正常启动软件即可在右下角看到大肥鱼！
echo ====================================================
echo.
pause
