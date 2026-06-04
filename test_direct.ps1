$ErrorActionPreference = "Stop"

# Kill any existing node processes
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Start the server
Write-Output "Starting backend server..."
$logFile = "$env:TEMP\server.log"
$proc = Start-Process -FilePath "node" -ArgumentList "server.js" `
  -WorkingDirectory "c:\Users\Connor\code\Rocket-League-Replay-Tracker\backend" `
  -RedirectStandardOutput $logFile `
  -RedirectStandardError $logFile `
  -PassThru -NoNewWindow

Start-Sleep -Seconds 4

# Test endpoint
Write-Output "Testing /api/players..."
$url = "http://localhost:5000/api/players"
try {
  $response = Invoke-WebRequest -Uri $url -UseBasicParsing -Method GET
  Write-Output "✓ Status: $($response.StatusCode)"
  Write-Output "Content: $($response.Content)"
} catch {
  Write-Output "✗ Error occurred"
  Write-Output "Exception: $($_.Exception.Message)"
  if ($_.Exception.InnerException) {
    Write-Output "Inner: $($_.Exception.InnerException.Message)"
  }
  
  # Try to extract response
  try {
    $_.Exception.Response.Content
  } catch {}
}

# Show server logs
Write-Output ""
Write-Output "Server Logs:"
Get-Content $logFile

# Cleanup
Stop-Process -Id $proc.Id -ErrorAction SilentlyContinue
