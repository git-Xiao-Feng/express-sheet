$ErrorActionPreference = 'Stop'
$port = 8080
$base = "http://localhost:$port"
$log = "html_dump.html"

# Download the rendered HTML
$r = Invoke-WebRequest -Uri "$base/" -UseBasicParsing -TimeoutSec 5
$r.Content | Out-File -FilePath $log -Encoding utf8
Write-Host "Saved HTML, length=$($r.Content.Length)"

# Also dump CSS and JS
$r2 = Invoke-WebRequest -Uri "$base/static/style.css" -UseBasicParsing -TimeoutSec 5
$r2.Content | Out-File -FilePath "style_dump.css" -Encoding utf8
Write-Host "Saved CSS, length=$($r2.Content.Length)"

$r3 = Invoke-WebRequest -Uri "$base/static/app.js" -UseBasicParsing -TimeoutSec 5
$r3.Content | Out-File -FilePath "app_dump.js" -Encoding utf8
Write-Host "Saved JS, length=$($r3.Content.Length)"
