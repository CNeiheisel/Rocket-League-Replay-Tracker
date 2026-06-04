$ErrorActionPreference = "Continue"

# Start backend server in background and capture output
Write-Output "Starting backend server..."
$proc = Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory "c:\Users\Connor\code\Rocket-League-Replay-Tracker\backend" -PassThru -NoNewWindow -RedirectStandardOutput "$env:TEMP\backend.log" -RedirectStandardError "$env:TEMP\backend_err.log"

Start-Sleep -Seconds 3

# Test the endpoint
Write-Output "Testing /api/players endpoint..."
try {
  $response = Invoke-WebRequest -UseBasicParsing -Uri "http://localhost:5000/api/players" -ErrorAction Stop
  Write-Output "Success: $($response.StatusCode)"
  Write-Output $response.Content
} catch {
  Write-Output "Error: $($_.Exception.Message)"
}

# Show server logs
Write-Output ""
Write-Output "=== Server stdout ==="
Get-Content -Path "$env:TEMP\backend.log" -ErrorAction SilentlyContinue
Write-Output ""
Write-Output "=== Server stderr ==="
Get-Content -Path "$env:TEMP\backend_err.log" -ErrorAction SilentlyContinue

# Cleanup
Stop-Process -Id $proc.Id -ErrorAction SilentlyContinue
