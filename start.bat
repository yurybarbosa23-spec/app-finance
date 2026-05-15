@echo off
:: Mata processo na porta 3000 se estiver em uso
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do taskkill /F /PID %%a 2>NUL

:: Inicia Ollama se não estiver rodando
tasklist /FI "IMAGENAME eq ollama.exe" 2>NUL | find /I "ollama.exe" >NUL
if errorlevel 1 (
    start /B ollama serve
)

:: Inicia Bot em background (com cd para carregar o .env corretamente)
start /B cmd /c "cd /d C:\Users\yuria\Desktop\app-finance\backend && node src/telegram/bot.js"

:: Inicia Frontend em background
start /B cmd /c "cd /d C:\Users\yuria\Desktop\app-finance\frontend && npm run dev"

:: Inicia Backend na janela principal
cd /d C:\Users\yuria\Desktop\app-finance\backend && npm run dev