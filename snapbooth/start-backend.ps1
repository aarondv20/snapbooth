$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -Path (Join-Path $scriptPath "backend")
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
