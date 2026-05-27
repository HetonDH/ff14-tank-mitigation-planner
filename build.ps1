$env:Path = "E:\tools\node-v24.16.0-win-x64;" + $env:Path
Set-Location "E:\ff14-tank-mitigation-planner"
& "E:\tools\node-v24.16.0-win-x64\npm.cmd" run build
