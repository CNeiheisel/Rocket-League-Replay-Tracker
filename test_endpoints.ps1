Start-Sleep -Seconds 2
$urls = @(
  'http://localhost:5000/api/players',
  'http://localhost:5000/api/ballchasing/matches?limit=1'
)

foreach ($url in $urls) {
  Write-Output "=== Testing: $url ==="
  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri $url -ErrorAction Stop
    Write-Output "Status: $($response.StatusCode)"
    $content = $response.Content | ConvertFrom-Json
    Write-Output "Data type: $(if ($content -is [array]) { "Array with $($content.Count) items" } else { "Object" })"
    if ($content -is [array]) {
      if ($content.Count -gt 0) {
        Write-Output "First item: $(ConvertTo-Json $content[0] -Depth 1)"
      } else {
        Write-Output "Array is empty"
      }
    } else {
      Write-Output "Content: $(ConvertTo-Json $content -Depth 1)"
    }
  } catch {
    Write-Output "ERROR: $($_.Exception.Message)"
  }
  Write-Output ""
}
