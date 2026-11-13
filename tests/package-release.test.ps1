param([Parameter(Mandatory = $true)][string]$PackagePath)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$projectRoot = Split-Path -Parent $PSScriptRoot
function Hash-Stream([IO.Stream]$Stream) {
    $sha = [Security.Cryptography.SHA256]::Create()
    try { return ([BitConverter]::ToString($sha.ComputeHash($Stream))).Replace('-', '').ToLowerInvariant() }
    finally { $sha.Dispose() }
}
function Assert-EntryMatchesSource($Entry, [string]$Source) {
    $archived = $Entry.Open()
    $original = [IO.File]::OpenRead($Source)
    try { if ((Hash-Stream $archived) -ne (Hash-Stream $original)) { throw ('Archive/source mismatch: ' + $Entry.FullName) } }
    finally { $archived.Dispose(); $original.Dispose() }
}
$zipPath = (Resolve-Path -LiteralPath $PackagePath).Path
$archive = [IO.Compression.ZipFile]::OpenRead($zipPath)
try {
    $entries = @{}
    foreach ($entry in $archive.Entries) {
        $name = $entry.FullName.Replace('\', '/')
        if ([IO.Path]::IsPathRooted($name) -or $name -match '(^|/)\.\.(/|$)' -or $entries.ContainsKey($name)) { throw "Unsafe or duplicate ZIP entry: $name" }
        $entries[$name] = $entry
    }
    foreach ($required in @('lib/index.js', 'lib/client.js', 'package.json', 'install.bat', 'installer/install.ps1', 'uninstall.bat', 'LICENSE', 'ASSETS_LICENSE.md', 'docs/THIRD_PARTY_NOTICES.md')) {
        if (-not $entries.ContainsKey($required)) { throw "Missing installation file: $required" }
    }
    if ($entries.ContainsKey('install.ps1')) { throw 'Helper must be inside installer/, not another root installation entry point' }
    $expected = @{}
    foreach ($name in @('package.json','cordis.yml','install.bat','uninstall.bat','README.md','CHANGELOG.md','ASSETS_LICENSE.md','CONTRIBUTING.md','LICENSE')) { $expected[$name] = Join-Path $projectRoot $name }
    foreach ($directory in @('lib','installer','docs')) {
        foreach ($source in Get-ChildItem -LiteralPath (Join-Path $projectRoot $directory) -Recurse -File) {
            $name = $source.FullName.Substring($projectRoot.Length + 1).Replace('\', '/')
            if ($name -match '^docs/handover/' -or $name -like '*_REVIEW_IMPLEMENTATION.md') { continue }
            $expected[$name] = $source.FullName
        }
    }
    $actualNames = @($archive.Entries | Where-Object { $_.Name } | ForEach-Object { $_.FullName.Replace('\', '/') })
    if (@(Compare-Object @($expected.Keys | Sort-Object) @($actualNames | Sort-Object)).Count) { throw 'Archive file inventory differs from approved runtime/documentation manifest' }
    foreach ($name in $actualNames) { Assert-EntryMatchesSource $entries[$name] $expected[$name] }
    Write-Output ('PASS: every archived file matches approved source/build bytes (' + $actualNames.Count + ' files), with no missing, extra, duplicate or traversal entry')
    if (@($entries.Keys | Where-Object { $_ -match '^(assets/|lib/assets/|docs/handover/)' -or $_ -match '\.moc3$' }).Count) {
        throw 'Archive contains redundant source artwork, internal notes or user model data'
    }
    foreach ($launcher in @('install.bat', 'uninstall.bat')) {
        $reader = [IO.StreamReader]::new($entries[$launcher].Open())
        try { $text = $reader.ReadToEnd() } finally { $reader.Dispose() }
        if ($text -match '(?<!\r)\n') { throw "Windows launcher has LF-only lines: $launcher" }
    }
    $stream = $entries['installer/install.ps1'].Open()
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
    $reader = [IO.StreamReader]::new($entries['package.json'].Open())
    try { $archivePackage = $reader.ReadToEnd() | ConvertFrom-Json } finally { $reader.Dispose() }
    $sourceVersion = (Get-Content -LiteralPath (Join-Path $projectRoot 'package.json') -Raw | ConvertFrom-Json).version
    if ($archivePackage.version -ne $sourceVersion -or -not $entries.ContainsKey('docs/releases/v' + $sourceVersion + '.md')) { throw 'Version or release notes mismatch' }
} finally { $archive.Dispose() }
$fixture = Join-Path ([IO.Path]::GetTempPath()) ('dsh-package-smoke-' + [Guid]::NewGuid().ToString('N'))
$extracted = Join-Path $fixture 'plugin'
[IO.Compression.ZipFile]::ExtractToDirectory($zipPath, $extracted)
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $extracted 'installer/install.ps1') -PluginDirectory $extracted -ProfileDirectory (Join-Path $fixture 'profile')
if ($LASTEXITCODE -ne 0) { throw 'Extracted installation failed' }
$patch = [IO.File]::ReadAllText((Join-Path $fixture 'profile/cordis.patch.yml'))
$expectedUri = ([Uri]::new((Join-Path $extracted 'lib/index.js'))).AbsoluteUri
if (-not $patch.Contains($expectedUri)) { throw 'Installation points outside the extracted package' }
& node --check (Join-Path $extracted 'lib/client.js')
if ($LASTEXITCODE -ne 0) { throw 'Extracted browser bundle has invalid syntax' }
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $extracted 'installer/install.ps1') -PluginDirectory $extracted -Uninstall -ProfileDirectory (Join-Path $fixture 'profile')
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
    $repairFiles = @($repairArchive.Entries | Where-Object { $_.Name })
    $names = @($repairFiles | ForEach-Object { $_.FullName.Replace('\', '/') } | Sort-Object)
    if ($names.Count -ne 4 -or @(Compare-Object $names @('INSTALLATION_RECOVERY.md', 'install.bat', 'installer/install.ps1', 'uninstall.bat')).Count) { throw 'Installer repair ZIP must contain only the two launchers, nested helper and instructions' }
    foreach ($entry in $repairFiles) {
        $name = $entry.FullName.Replace('\', '/')
        $source = if ($name -eq 'INSTALLATION_RECOVERY.md') { Join-Path $projectRoot 'docs/INSTALLATION_RECOVERY.md' } else { Join-Path $projectRoot $name }
        Assert-EntryMatchesSource $entry $source
    }
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

# Check complete-package entry points from the difficult paths used by real downloads.
$modern = Join-Path $fixture "完整新版 & (中文) % ! '"
$moved = Join-Path $fixture "移动后 & (中文) % ! '"
[IO.Compression.ZipFile]::ExtractToDirectory($zipPath, $modern)
[IO.Compression.ZipFile]::ExtractToDirectory($zipPath, $moved)
$modernUser = Join-Path $fixture 'modern-user'
$modernProfile = Join-Path $modernUser '.dsh/profiles/desktop'
New-Item -ItemType Directory -Path $modernProfile -Force | Out-Null
$modernPatch = Join-Path $modernProfile 'cordis.patch.yml'
[IO.File]::WriteAllText($modernPatch, "# preserve`n- id: sibling`n  name: keep-sibling`n")
# A stale old helper may remain after an upgrade; the new launcher must prefer installer/.
[IO.File]::WriteAllText((Join-Path $modern 'install.ps1'), 'exit 99')
Invoke-ArchiveLauncher $modern $modernUser 'install.bat'
$installed = [IO.File]::ReadAllText($modernPatch)
$modernUri = ([Uri]::new((Join-Path $modern 'lib/index.js'))).AbsoluteUri
if (-not $installed.Contains($modernUri) -or -not $installed.Contains('keep-sibling')) { throw 'Modern archive did not install from a complex path or altered sibling settings' }
$backups = @(Get-ChildItem -LiteralPath $modernProfile -Filter '*.backup-*').Count
Invoke-ArchiveLauncher $modern $modernUser 'install.bat'
if ([IO.File]::ReadAllText($modernPatch) -cne $installed -or @(Get-ChildItem -LiteralPath $modernProfile -Filter '*.backup-*').Count -ne $backups) { throw 'Archived repeated installation is not idempotent' }
Invoke-ArchiveLauncher $moved $modernUser 'install.bat'
$movedUri = ([Uri]::new((Join-Path $moved 'lib/index.js'))).AbsoluteUri
$updated = [IO.File]::ReadAllText($modernPatch)
if (-not $updated.Contains($movedUri) -or $updated.Contains($modernUri) -or -not $updated.Contains('keep-sibling')) { throw 'Archive upgrade failed to register the moved directory safely' }
if (-not @(Get-ChildItem -LiteralPath $modernProfile -Filter '*.backup-*' | Where-Object { [IO.File]::ReadAllText($_.FullName) -ceq $installed }).Count) { throw 'Upgrade did not back up the exact previous profile' }
Invoke-ArchiveLauncher $moved $modernUser 'uninstall.bat'
if ([IO.File]::ReadAllText($modernPatch).Contains('dsh-whale-pet') -or -not [IO.File]::ReadAllText($modernPatch).Contains('keep-sibling')) { throw 'Archive uninstall altered unrelated configuration' }
Write-Output 'PASS: complete ZIP in Chinese/special-character paths, preferred nested helper, repeated install, moved-directory upgrade, exact backup and sibling-preserving uninstall'
