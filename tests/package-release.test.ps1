param([Parameter(Mandatory = $true)][string]$PackagePath)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$projectRoot = Split-Path -Parent $PSScriptRoot
$zipPath = (Resolve-Path -LiteralPath $PackagePath).Path
$archive = [IO.Compression.ZipFile]::OpenRead($zipPath)
try {
    $entries = @{}
    foreach ($entry in $archive.Entries) { $entries[$entry.FullName.Replace('\', '/')] = $entry }
    foreach ($required in @('lib/index.js', 'lib/client.js', 'package.json', 'install.bat', 'install.ps1', 'uninstall.bat', 'LICENSE', 'ASSETS_LICENSE.md', 'docs/THIRD_PARTY_NOTICES.md')) {
        if (-not $entries.ContainsKey($required)) { throw "Missing installation file: $required" }
    }
    if (@($entries.Keys | Where-Object { $_ -match '^(assets/|lib/assets/|docs/handover/)' -or $_ -match '\.moc3$' }).Count) {
        throw 'Archive contains redundant source artwork, internal notes or user model data'
    }
    foreach ($launcher in @('install.bat', 'uninstall.bat')) {
        $reader = [IO.StreamReader]::new($entries[$launcher].Open())
        try { $text = $reader.ReadToEnd() } finally { $reader.Dispose() }
        if ($text -match '(?<!\r)\n') { throw "Windows launcher has LF-only lines: $launcher" }
    }
    $stream = $entries['install.ps1'].Open()
    try { $prefix = @($stream.ReadByte(), $stream.ReadByte(), $stream.ReadByte()) } finally { $stream.Dispose() }
    if (($prefix -join ',') -ne '239,187,191') { throw 'Windows PowerShell script needs UTF-8 BOM' }
    $reader = [IO.StreamReader]::new($entries['lib/client.js'].Open())
    try { $bundle = $reader.ReadToEnd() } finally { $reader.Dispose() }
    if ([regex]::Matches($bundle, 'data:image/(?:webp|png);base64,').Count -ne 20) { throw 'Embedded illustration fallback is incomplete' }
    if ((Test-Path -LiteralPath (Join-Path $projectRoot 'vendor/live2d/Core/live2dcubismcore.min.js')) -and -not $bundle.Contains('function __dshLoadCubismCore()')) { throw 'Live2D runtime is missing' }
    $hasher = [Security.Cryptography.SHA256]::Create()
    $stream = [IO.File]::OpenRead($zipPath)
    try { $hash = ([BitConverter]::ToString($hasher.ComputeHash($stream))).Replace('-', '').ToLowerInvariant() }
    finally { $stream.Dispose(); $hasher.Dispose() }
    if (-not [IO.File]::ReadAllText($zipPath + '.sha256').StartsWith($hash + '  ')) { throw 'Checksum does not match' }
} finally { $archive.Dispose() }
$fixture = Join-Path ([IO.Path]::GetTempPath()) ('dsh-package-smoke-' + [Guid]::NewGuid().ToString('N'))
$extracted = Join-Path $fixture 'plugin'
[IO.Compression.ZipFile]::ExtractToDirectory($zipPath, $extracted)
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $extracted 'install.ps1') -ProfileDirectory (Join-Path $fixture 'profile')
if ($LASTEXITCODE -ne 0) { throw 'Extracted installation failed' }
$patch = [IO.File]::ReadAllText((Join-Path $fixture 'profile/cordis.patch.yml'))
$expectedUri = ([Uri]::new((Join-Path $extracted 'lib/index.js'))).AbsoluteUri
if (-not $patch.Contains($expectedUri)) { throw 'Installation points outside the extracted package' }
& node --check (Join-Path $extracted 'lib/client.js')
if ($LASTEXITCODE -ne 0) { throw 'Extracted browser bundle has invalid syntax' }
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $extracted 'install.ps1') -Uninstall -ProfileDirectory (Join-Path $fixture 'profile')
if ($LASTEXITCODE -ne 0) { throw 'Extracted uninstallation failed' }
$remaining = [IO.File]::ReadAllText((Join-Path $fixture 'profile/cordis.patch.yml'))
if ($remaining.Contains('id: dsh-whale-pet') -or $remaining.Trim() -ne '[]') { throw 'Uninstall did not leave an empty profile list' }
Write-Output 'PASS: runtime files, 20 embedded illustrations, optional Live2D runtime, exclusions, checksum and isolated install/uninstall'
Write-Output ('Smoke fixture: ' + $fixture)


# Check the actual BAT files from the ZIP, not only direct invocation of their PowerShell helper.
function Invoke-ArchiveLauncher([string]$Directory, [string]$UserDirectory, [string]$Launcher, [int]$ExpectedExit = 0) {
    $start = [Diagnostics.ProcessStartInfo]::new()
    $start.FileName = $env:ComSpec
    $start.Arguments = '/d /c ""' + (Join-Path $Directory $Launcher) + '" --no-pause"'
    $start.UseShellExecute = $false
    $start.RedirectStandardInput = $true
    $start.RedirectStandardOutput = $true
    $start.RedirectStandardError = $true
    $start.EnvironmentVariables['USERPROFILE'] = $UserDirectory
    $process = [Diagnostics.Process]::Start($start)
    $process.StandardInput.Close()
    $outTask = $process.StandardOutput.ReadToEndAsync()
    $errTask = $process.StandardError.ReadToEndAsync()
    $process.WaitForExit()
    if ($process.ExitCode -ne $ExpectedExit) { throw ('Archive launcher failed: ' + $outTask.Result + $errTask.Result) }
}
$launcherUser = Join-Path $fixture 'bat-user'
Invoke-ArchiveLauncher $extracted $launcherUser 'install.bat'
$launcherPatch = Join-Path $launcherUser '.dsh/profiles/desktop/cordis.patch.yml'
if (-not [IO.File]::ReadAllText($launcherPatch).Contains($expectedUri)) { throw 'Archive BAT registered the wrong folder' }
Invoke-ArchiveLauncher $extracted $launcherUser 'uninstall.bat'
if ([IO.File]::ReadAllText($launcherPatch).Trim() -ne '[]') { throw 'Archive BAT did not uninstall' }

$version = (Get-Content -LiteralPath (Join-Path $extracted 'package.json') -Raw | ConvertFrom-Json).version
$repairZip = Join-Path (Split-Path $zipPath) ('dsh-whale-pet-installer-fix-v' + $version + '.zip')
$repairArchive = [IO.Compression.ZipFile]::OpenRead($repairZip)
try {
    $names = @($repairArchive.Entries | ForEach-Object { $_.FullName.Replace('\', '/') } | Sort-Object)
    if ($names.Count -ne 4 -or @(Compare-Object $names @('INSTALLATION_RECOVERY.md', 'install.bat', 'install.ps1', 'uninstall.bat')).Count) { throw 'Installer repair ZIP must contain only the three launchers and instructions' }
} finally { $repairArchive.Dispose() }
$hasher = [Security.Cryptography.SHA256]::Create()
$stream = [IO.File]::OpenRead($repairZip)
try { $repairHash = ([BitConverter]::ToString($hasher.ComputeHash($stream))).Replace('-', '').ToLowerInvariant() }
finally { $stream.Dispose(); $hasher.Dispose() }
if (-not [IO.File]::ReadAllText($repairZip + '.sha256').StartsWith($repairHash + '  ')) { throw 'Repair ZIP checksum does not match' }

$legacy = Join-Path $fixture '旧版本 & (保留) ! %'
[IO.Compression.ZipFile]::ExtractToDirectory($repairZip, $legacy)
$repairUser = Join-Path $fixture 'repair-user'
Invoke-ArchiveLauncher $legacy $repairUser 'install.bat' 1
if (Test-Path -LiteralPath (Join-Path $repairUser '.dsh/profiles/desktop/cordis.patch.yml')) { throw 'Repair ZIP cannot register without an existing lib folder' }
New-Item -ItemType Directory -Path (Join-Path $legacy 'lib') | Out-Null
[IO.File]::WriteAllText((Join-Path $legacy 'lib/index.js'), 'old host entry')
[IO.File]::WriteAllText((Join-Path $legacy 'lib/client.js'), 'old browser runtime')
Invoke-ArchiveLauncher $legacy $repairUser 'install.bat'
Invoke-ArchiveLauncher $legacy $repairUser 'uninstall.bat'
if ([IO.File]::ReadAllText((Join-Path $legacy 'lib/client.js')) -cne 'old browser runtime' -or [IO.File]::ReadAllText((Join-Path $legacy 'lib/index.js')) -cne 'old host entry') { throw 'Installer repair changed the old runtime' }
Write-Output 'PASS: actual archived BAT entry points, CRLF/BOM, installer-only ZIP checksum, standalone rejection and old-runtime preservation'
