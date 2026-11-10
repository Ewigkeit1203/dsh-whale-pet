param(
    [string]$ProfileDirectory = (Join-Path $env:USERPROFILE '.dsh\profiles\desktop'),
    [switch]$Uninstall
)

$ErrorActionPreference = 'Stop'
try {
    Write-Host $(if ($Uninstall) { '大肥鱼 — 卸载 / Uninstall' } else { '大肥鱼 — 安装 / Install' })
    $entry = Join-Path $PSScriptRoot 'lib\index.js'
    $client = Join-Path $PSScriptRoot 'lib\client.js'
    foreach ($file in @($entry, $client)) {
        if (-not $Uninstall -and -not (Test-Path -LiteralPath $file -PathType Leaf)) {
            throw "缺少文件 / Missing file: $file. 请先完整解压安装包 / Extract the entire ZIP first."
        }
    }
    $uri = ([Uri]::new([IO.Path]::GetFullPath($entry))).AbsoluteUri
    $patch = Join-Path $ProfileDirectory 'cordis.patch.yml'
    $encoding = [Text.UTF8Encoding]::new($false)
    $original = if (Test-Path -LiteralPath $patch) { [IO.File]::ReadAllText($patch) } else { '' }
    $newline = if ($original.Contains("`r`n")) { "`r`n" } else { "`n" }
    $lines = [Collections.Generic.List[string]]::new()
    foreach ($line in [regex]::Split($original, '\r?\n')) { $lines.Add($line) }
    $found = $false
    $idPattern = '^(?<indent>[ ]*)-[ ]+id:[ ]*(?:dsh-whale-pet|"dsh-whale-pet"|''dsh-whale-pet'')[ ]*(?:#.*)?$'
    for ($i = 0; $i -lt $lines.Count; $i++) {
        $match = [regex]::Match($lines[$i], $idPattern)
        if (-not $match.Success) { continue }
        $indent = $match.Groups['indent'].Value.Length
        $nameIndex = -1
        for ($j = $i + 1; $j -lt $lines.Count; $j++) {
            if ($lines[$j] -match '^\s*(?:#.*)?$') { continue }
            $lineIndent = [regex]::Match($lines[$j], '^ *').Length
            if ($lineIndent -le $indent) { break }
            if ($lines[$j] -match '^ *name:') { $nameIndex = $j; break }
        }
        if ($nameIndex -lt 0) {
            throw '已有大肥鱼配置格式无法安全更新，配置未修改 / Cannot safely update the existing pet registration; configuration unchanged.'
        }
        if ($Uninstall) {
            $end = $i + 1
            while ($end -lt $lines.Count) {
                if ($lines[$end] -notmatch '^\s*(?:#.*)?$' -and [regex]::Match($lines[$end], '^ *').Length -le $indent) { break }
                $end++
            }
            $lines.RemoveRange($i, $end - $i)
            $i--
            $found = $true
            continue
        }
        $leading = [regex]::Match($lines[$nameIndex], '^ *').Value
        $lines[$nameIndex] = $leading + 'name: "' + $uri + '"'
        $found = $true
    }
    if ($Uninstall) {
        if (-not $found) { Write-Host '[OK] 未找到插件配置 / Nothing to remove.'; exit 0 }
        # Remove only insert containers left empty by removing our item; keep sibling plugins.
        for ($i = $lines.Count - 1; $i -ge 0; $i--) {
            if ($lines[$i] -notmatch '^-[ ]+insert:[ ]*(?:#.*)?$') { continue }
            $next = $i + 1
            while ($next -lt $lines.Count -and $lines[$next] -match '^\s*(?:#.*)?$') { $next++ }
            if ($next -eq $lines.Count -or $lines[$next] -match '^\S') { $lines.RemoveAt($i) }
        }
        if (-not @($lines | Where-Object { $_ -notmatch '^\s*(?:#.*)?$' }).Count) { $lines.Add('[]') }
        $updated = [string]::Join($newline, $lines)
    } elseif ($found) {
        $updated = [string]::Join($newline, $lines)
    } else {
        $prefix = [regex]::Replace($original, '(?m)^\[\][ \t]*\r?$', '')
        if ($prefix.Length -gt 0 -and -not $prefix.EndsWith("`n")) { $prefix += $newline }
        $updated = $prefix + '- insert:' + $newline + '    - id: dsh-whale-pet' + $newline + '      name: "' + $uri + '"' + $newline
    }
    if ($updated -cne $original) {
        New-Item -ItemType Directory -Path $ProfileDirectory -Force | Out-Null
        if (Test-Path -LiteralPath $patch) {
            $backup = $patch + '.backup-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '-' + [Guid]::NewGuid().ToString('N').Substring(0, 8)
            Copy-Item -LiteralPath $patch -Destination $backup
            Write-Host "配置备份 / Backup: $backup"
        }
        [IO.File]::WriteAllText($patch, $updated, $encoding)
    }
    if (-not $Uninstall) { Write-Host "插件路径 / Plugin: $uri" }
    Write-Host "配置文件 / Profile: $patch"
    Write-Host $(if ($Uninstall) { '[成功 / OK] 已移除插件配置，偏好保留 / Plugin registration removed; preferences retained.' } else { '[成功 / OK] 已注册插件 / Plugin registered.' })
    Write-Host '请启动 DSH，或在 DSH 窗口按 Ctrl + R 刷新 / Start DSH or press Ctrl + R in its window.'
    exit 0
} catch {
    Write-Host ('[错误 / ERROR] ' + $_.Exception.Message) -ForegroundColor Red
    exit 1
}
