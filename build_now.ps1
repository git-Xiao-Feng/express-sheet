Set-Location D:\xfeng\practice\golang\express-sheet
$env:GOPROXY = 'https://goproxy.cn,https://proxy.golang.org,direct'
$env:GOSUMDB = 'off'

# Kill any old server
Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue | ForEach-Object {
  Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
}
Start-Sleep -Milliseconds 600

# Build
$out = "build_check.log"
"=== go build ===" | Out-File $out
go build -o express-sheet.exe . 2>&1 | Out-File -Append $out
"---EXIT:$LASTEXITCODE---" | Out-File -Append $out
Get-Content $out
