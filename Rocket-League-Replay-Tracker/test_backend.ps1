Start-Sleep -Seconds 3
$url = 'http://localhost:5000/api/ballchasing/matches?limit=1'
try {
  $response = Invoke-WebRequest -UseBasicParsing -Uri $url -ErrorAction Stop
  Write-Output "SUCCESS: Backend responded"
  Write-Output $response.Content
} catch {
  Write-Output "ERROR: $($_.Exception.Message)"
}
