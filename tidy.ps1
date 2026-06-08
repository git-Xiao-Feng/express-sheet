Set-Location D:\xfeng\practice\golang\express-sheet
$env:GOPROXY = 'https://goproxy.cn,https://proxy.golang.org,direct'
$env:GOSUMDB = 'off'
$out = "build.log"
"=== go mod tidy ===" | Out-File $out
go mod tidy 2>&1 | Out-File -Append $out
"=== go vet ===" | Out-File -Append $out
go vet ./... 2>&1 | Out-File -Append $out
"=== go build ===" | Out-File -Append $out
go build -o express-sheet.exe . 2>&1 | Out-File -Append $out
"=== DONE ===" | Out-File -Append $out
"---EXIT:$LASTEXITCODE---" | Out-File -Append $out
Get-Content $out
