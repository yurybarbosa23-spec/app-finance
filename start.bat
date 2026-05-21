@echo off
:: Mata todas as instâncias antigas do Node (Frontend, Backend e Bot) para evitar portas presas e conflitos de 409
taskkill /F /IM node.exe 2>NUL

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