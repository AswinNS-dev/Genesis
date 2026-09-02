$ErrorActionPreference = "Stop"
Set-Location "D:\AI-Powered_Criminal\Genesis"
Write-Host "Checking for updates..."
git pull --ff-only origin main
Write-Host "Update check complete."
