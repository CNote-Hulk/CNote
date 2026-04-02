@echo off
where node > "%TEMP%\node_location.txt" 2>&1
node --version >> "%TEMP%\node_location.txt" 2>&1
type "%TEMP%\node_location.txt"
