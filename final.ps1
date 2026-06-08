Set-Location D:\xfeng\practice\golang\express-sheet
$out = "final.log"
"=== final check ===" | Out-File $out

# 1. kill old process
Get-Process -Name 'express-sheet' -ErrorAction SilentlyContinue | ForEach-Object {
  "Killing PID $($_.Id)" | Out-File -Append $out
  Stop-Process -Id $_.Id -Force
}

# 2. check binaries
"--- binaries ---" | Out-File -Append $out
Get-Item express-sheet.exe, verify.exe, verify.pdf, verify_barcode.png, verify_qrcode.png -ErrorAction SilentlyContinue | Select-Object Name, Length, LastWriteTime | Format-Table | Out-String | Out-File -Append $out

# 3. PDF magic & EOF
"--- PDF structure ---" | Out-File -Append $out
$pdfBytes = [System.IO.File]::ReadAllBytes('verify.pdf')
$head = [System.Text.Encoding]::ASCII.GetString($pdfBytes[0..4])
$tail = [System.Text.Encoding]::ASCII.GetString($pdfBytes[($pdfBytes.Length-6)..($pdfBytes.Length-1)])
"head=$head" | Out-File -Append $out
"tail=$tail" | Out-File -Append $out
"size=$($pdfBytes.Length)" | Out-File -Append $out

# 4. PNG magic check
"--- PNG structure ---" | Out-File -Append $out
foreach ($f in 'verify_barcode.png', 'verify_qrcode.png') {
  if (Test-Path $f) {
    $b = [System.IO.File]::ReadAllBytes($f)
    $magic = [System.Text.Encoding]::ASCII.GetString($b[1..3])
    "$f magic=$magic size=$($b.Length)" | Out-File -Append $out
  }
}

# 5. clean up test artifacts (keep verify.pdf as evidence)
"--- cleanup ---" | Out-File -Append $out
Remove-Item verify_barcode.png, verify_qrcode.png, verify.exe -ErrorAction SilentlyContinue
Remove-Item verify.ps1, verify_run.ps1, verify_build.ps1, rebuild.ps1, verify_build.log, verify_run.log, verify.log, rebuild.log -ErrorAction SilentlyContinue
Remove-Item cmd/verify/main.go, cmd/verify/shim.go -ErrorAction SilentlyContinue 2>$null
if (Test-Path cmd) { Remove-Item -Recurse -Force cmd }

"--- final exe ---" | Out-File -Append $out
Get-Item express-sheet.exe | Select-Object Name, Length, LastWriteTime | Format-Table | Out-String | Out-File -Append $out

"=== done ===" | Out-File -Append $out
Get-Content $out
