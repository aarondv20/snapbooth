$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -Path (Join-Path $scriptPath "frontend")
npm run dev
