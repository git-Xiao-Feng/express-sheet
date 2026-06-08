Set-Location D:\xfeng\practice\golang\express-sheet
$env:GOPROXY = 'https://goproxy.cn,https://proxy.golang.org,direct'
$env:GOSUMDB = 'off'
$out = "build_ui.log"
"=== go build ===" | Out-File $out
go build -o express-sheet.exe . 2>&1 | Out-File -Append $out
"---EXIT:$LASTEXITCODE---" | Out-File -Append $out
Get-Content $out
