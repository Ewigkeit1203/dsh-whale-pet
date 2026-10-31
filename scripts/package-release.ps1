param([string]$OutputDirectory = 'dist')
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$package = Get-Content -LiteralPath (Join-Path $projectRoot 'package.json') -Raw | ConvertFrom-Json
$version = $package.version
$distRoot = Join-Path $projectRoot $OutputDirectory
New-Item -ItemType Directory -Path $distRoot -Force | Out-Null
$stage = Join-Path $distRoot ('stage-' + $version + '-' + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $stage | Out-Null
foreach ($directory in @('lib', 'assets')) {
    Copy-Item -LiteralPath (Join-Path $projectRoot $directory) -Destination $stage -Recurse
}
$files = @('package.json', 'cordis.yml', 'install.bat', 'uninstall.bat', 'README.md', 'CHANGELOG.md', 'ASSETS_LICENSE.md', 'CONTRIBUTING.md', 'LICENSE')
foreach ($file in $files) {
    Copy-Item -LiteralPath (Join-Path $projectRoot $file) -Destination $stage
}
$docsDestination = Join-Path $stage 'docs'
New-Item -ItemType Directory -Path $docsDestination -Force | Out-Null
Get-ChildItem -LiteralPath (Join-Path $projectRoot 'docs') | Where-Object { $_.Name -ne 'handover' -and $_.Name -notlike '*_REVIEW_IMPLEMENTATION.md' } | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination $docsDestination -Recurse
}
$zip = Join-Path $distRoot ('dsh-whale-pet-v' + $version + '.zip')
Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $zip -Force
$hash = (Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash.ToLowerInvariant()
[IO.File]::WriteAllText($zip + '.sha256', $hash + '  ' + (Split-Path -Leaf $zip) + "`n", [Text.UTF8Encoding]::new($false))
# Delete only the verified staging directory created within this project's dist/.
$resolvedStage = [IO.Path]::GetFullPath($stage)
$resolvedDist = [IO.Path]::GetFullPath($distRoot).TrimEnd('\') + '\'
if (-not $resolvedStage.StartsWith($resolvedDist, [StringComparison]::OrdinalIgnoreCase)) { throw 'Unexpected staging path' }
Remove-Item -LiteralPath $resolvedStage -Recurse -Force
Write-Output ('Release package: ' + $zip)
Write-Output ('SHA256: ' + $hash)
