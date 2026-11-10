$ErrorActionPreference = 'Stop'
$source = Split-Path -Parent $PSScriptRoot
$root = Join-Path ([IO.Path]::GetTempPath()) ('安装测试 & (中文) % ! '' ' + [Guid]::NewGuid().ToString('N'))
$project = Join-Path $root 'project'
$profile = Join-Path $root 'user'
New-Item -ItemType Directory -Path (Join-Path $project 'lib') -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $source 'install.bat'),(Join-Path $source 'install.ps1'),(Join-Path $source 'uninstall.bat') -Destination $project
[IO.File]::WriteAllText((Join-Path $project 'lib\index.js'), 'export {}')
[IO.File]::WriteAllText((Join-Path $project 'lib\client.js'), 'export {}')
function Invoke-Installer {
    param([string]$ScriptName = 'install.bat')
    $start = [Diagnostics.ProcessStartInfo]::new()
    $start.FileName = $env:ComSpec
    $start.Arguments = '/d /c ""' + (Join-Path $project $ScriptName) + '" --no-pause"'
    $start.UseShellExecute = $false
    $start.RedirectStandardInput = $true
    $start.RedirectStandardOutput = $true
    $start.RedirectStandardError = $true
    $start.EnvironmentVariables['USERPROFILE'] = $profile
    $process = [Diagnostics.Process]::Start($start)
    $process.StandardInput.Close()
    $outTask = $process.StandardOutput.ReadToEndAsync()
    $errTask = $process.StandardError.ReadToEndAsync()
    $process.WaitForExit()
    if ($process.ExitCode -ne $script:expectedExit) { throw ('Unexpected exit ' + $process.ExitCode + ': ' + $outTask.Result + $errTask.Result) }
}
function Assert($condition, $message) { if (-not $condition) { throw $message }; Write-Output ('PASS: ' + $message) }
$expectedExit = 0
Invoke-Installer
$patch = Join-Path $profile '.dsh\profiles\desktop\cordis.patch.yml'
$content = [IO.File]::ReadAllText($patch)
$uri = ([Uri]::new((Join-Path $project 'lib\index.js'))).AbsoluteUri
Assert ($content.Contains($uri)) 'Double-click launcher installs from Chinese and special-character paths'
Invoke-Installer
Assert ([IO.File]::ReadAllText($patch) -ceq $content) 'Repeated installation is idempotent'
Assert (@(Get-ChildItem -LiteralPath (Split-Path $patch) -Filter '*.backup-*').Count -eq 0) 'Unchanged installation creates no backup'
$hostConfig = "# preserved`r`n- id: host-plugin`r`n  name: host-package`r`n  config:`r`n    enabled: true`r`n"
$old = $hostConfig + "- insert:`r`n    - id: dsh-whale-pet`r`n      name: 'file:///C:/old-folder/lib/index.js'`r`n    - id: other-plugin`r`n      name: other-package`r`n"
[IO.File]::WriteAllText($patch, $old)
Invoke-Installer
$content = [IO.File]::ReadAllText($patch)
Assert ($content.StartsWith($hostConfig) -and $content.Contains('name: other-package')) 'Updating a moved plugin preserves surrounding DSH configuration'
Assert ($content.Contains($uri) -and -not $content.Contains('old-folder')) 'Existing single-quoted registration updates even without project name in old path'
$backups = @(Get-ChildItem -LiteralPath (Split-Path $patch) -Filter '*.backup-*')
Assert ($backups.Count -eq 1 -and [IO.File]::ReadAllText($backups[0].FullName) -ceq $old) 'Backup contains the exact previous configuration'
[IO.File]::WriteAllText($patch, $hostConfig)
Invoke-Installer
Assert ([IO.File]::ReadAllText($patch).StartsWith($hostConfig)) 'First registration preserves existing host settings'
[IO.File]::WriteAllText($patch, '[]')
Invoke-Installer
Assert (-not [IO.File]::ReadAllText($patch).Contains('[]')) 'Empty YAML array becomes a valid registration list'
[IO.File]::WriteAllText($patch, "- insert:`n    - id: dsh-whale-pet`n      unexpected: value`n")
$before = [IO.File]::ReadAllText($patch)
$expectedExit = 1
Invoke-Installer
Assert ([IO.File]::ReadAllText($patch) -ceq $before) 'Unrecognized existing registration fails without changing configuration'
Move-Item -LiteralPath (Join-Path $project 'lib\client.js') -Destination (Join-Path $project 'lib\client.js.saved')
Invoke-Installer
Assert ([IO.File]::ReadAllText($patch) -ceq $before) 'Missing bundle propagates failure through launcher without changing configuration'
Write-Output ('Fixtures: ' + $root)

# The uninstall entry point must preserve host settings and other plugins, even in one insert group.
$expectedExit = 0
[IO.File]::WriteAllText($patch, $old)
Invoke-Installer -ScriptName 'uninstall.bat'
$content = [IO.File]::ReadAllText($patch)
Assert ($content.StartsWith($hostConfig) -and $content.Contains('    - id: other-plugin')) 'Uninstall preserves host settings and sibling plugins in the same insert group'
Assert (-not $content.Contains('id: dsh-whale-pet')) 'Uninstall removes only our registration'
Invoke-Installer -ScriptName 'uninstall.bat'
Assert ([IO.File]::ReadAllText($patch) -ceq $content) 'Repeated uninstall is idempotent'
[IO.File]::WriteAllText($patch, "# keep this comment\n- insert:\n    - id: dsh-whale-pet\n      name: 'file:///old/lib/index.js'\n".Replace('\n', [Environment]::NewLine))
Invoke-Installer -ScriptName 'uninstall.bat'
$content = [IO.File]::ReadAllText($patch)
Assert ($content.Contains('# keep this comment') -and $content.Contains('[]') -and -not $content.Contains('insert:')) 'Uninstall leaves a valid empty YAML array and preserves comments'
# The missing bundle above must not prevent uninstall; restore it only for reinstallation.
Move-Item -LiteralPath (Join-Path $project 'lib\client.js.saved') -Destination (Join-Path $project 'lib\client.js')
Invoke-Installer
$content = [IO.File]::ReadAllText($patch)
Assert ($content.Contains('# keep this comment') -and $content.Contains('id: dsh-whale-pet') -and -not $content.Contains('[]')) 'Reinstall after uninstall preserves comments and produces one YAML list'


# A missing profile must stay missing on uninstall; it must never create a registration.
$emptyProfile = Join-Path $root 'empty-user'
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $project 'install.ps1') -Uninstall -ProfileDirectory $emptyProfile
Assert ($LASTEXITCODE -eq 0 -and -not (Test-Path -LiteralPath $emptyProfile)) 'Uninstall without a profile succeeds without creating files'

# An uninstall backs up the exact original even when the last item is removed.
$beforeUninstall = [IO.File]::ReadAllText($patch)
Invoke-Installer -ScriptName 'uninstall.bat'
$matchingBackup = @(Get-ChildItem -LiteralPath (Split-Path $patch) -Filter '*.backup-*' | Where-Object { [IO.File]::ReadAllText($_.FullName) -ceq $beforeUninstall })
Assert ($matchingBackup.Count -ge 1) 'Uninstall backs up the exact registration before removing it'

# Quoted ids, inline comments, nested options and siblings are real supported profile shapes.
$quoted = "# host comment`n- insert:`n    - id: 'dsh-whale-pet' # pet`n      name: old-pet`n      config:`n        enabled: true`n    - id: sibling`n      name: keep-me`n- id: after-group`n  name: after`n"
[IO.File]::WriteAllText($patch, $quoted)
Invoke-Installer
Assert ([IO.File]::ReadAllText($patch).Contains('name: keep-me') -and [IO.File]::ReadAllText($patch).Contains($uri)) 'Quoted pet id updates without altering nested settings or sibling registrations'
Invoke-Installer -ScriptName 'uninstall.bat'
$content = [IO.File]::ReadAllText($patch)
Assert ($content.Contains('name: keep-me') -and $content.Contains('name: after') -and -not $content.Contains('enabled: true')) 'Uninstall removes the pet block including nested config and preserves both sibling levels'
