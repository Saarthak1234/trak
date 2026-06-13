# Musync Auto-Installer for Windows (PowerShell)
# This script creates a local bin directory, downloads the compiled Windows binary from GitHub,
# and configures the User PATH variable so you can run 'musync' from anywhere.

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

Write-Host "`n=== Installing Musync for Windows ===" -ForegroundColor Green

$installDir = "$HOME\.musync\bin"
Write-Host "  -> Creating installation directory: $installDir" -ForegroundColor Gray
New-Item -ItemType Directory -Force -Path $installDir | Out-Null

$repo = "Saarthak1234/musync"
$releaseUrl = "https://api.github.com/repos/$repo/releases/latest"
$tag = "v1.0.0"

try {
    Write-Host "  -> Querying latest release tag from GitHub..." -ForegroundColor Gray
    $response = Invoke-RestMethod -Uri $releaseUrl -UseBasicParsing
    if ($response -and $response.tag_name) {
        $tag = $response.tag_name
    }
} catch {
    Write-Host "  [Warning] Failed to fetch latest release tag. Falling back to default: $tag" -ForegroundColor Yellow
}

$binaryUrl = "https://github.com/$repo/releases/download/$tag/musync-windows.exe"
$destPath = "$installDir\musync.exe"

Write-Host "  -> Downloading Musync from $binaryUrl..." -ForegroundColor Gray
Invoke-WebRequest -Uri $binaryUrl -OutFile $destPath

Write-Host "  -> Configuring PATH environment variable..." -ForegroundColor Gray
$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
if ($userPath -notlike "*$installDir*") {
    [Environment]::SetEnvironmentVariable('Path', $userPath + ";$installDir", 'User')
    Write-Host "  -> Successfully added Musync to User PATH!" -ForegroundColor Green
} else {
    Write-Host "  -> Musync is already in your PATH." -ForegroundColor Gray
}

Write-Host "`n[Success] Musync installed successfully!" -ForegroundColor Green
Write-Host "Please close and restart your terminal, then run 'musync' to start!`n" -ForegroundColor White
