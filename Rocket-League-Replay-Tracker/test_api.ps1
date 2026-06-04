$ErrorActionPreference = "Continue"

# Kill any existing node processes
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Start the server
Write-Output "Starting backend server..."
$outFile = "$env:TEMP\server_out.log"
$errFile = "$env:TEMP\server_err.log"
$proc = Start-Process -FilePath "node" -ArgumentList "server.js" `
  -WorkingDirectory "c:\Users\Connor\code\Rocket-League-Replay-Tracker\backend" `
  -RedirectStandardOutput $outFile `
  -RedirectStandardError $errFile `
  -PassThru -NoNewWindow

Start-Sleep -Seconds 4

# Test endpoint
Write-Output "Testing /api/players..."
$url = "http://localhost:5000/api/players"
Invoke-WebRequest -Uri $url -UseBasicParsing -Method GET | ForEach-Object {
  Write-Output "Status: $($_.StatusCode)"
  Write-Output "Content: $($_.Content)"
}

# Show server logs
Write-Output ""
Write-Output "stdout:"
Get-Content $outFile -ErrorAction SilentlyContinue
Write-Output ""
Write-Output "stderr:"
Get-Content $errFile -ErrorAction SilentlyContinue

# Cleanup
Stop-Process -Id $proc.Id -ErrorAction SilentlyContinue
