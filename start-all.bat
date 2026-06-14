@echo off
cd /d "C:\Users\NIKILAN\transit-dashboard"
pm2 start start-dev.js --name tn-bustrack-frontend
pm2 start start-backend.js --name tn-bustrack-backend
start /B "" "C:\Users\NIKILAN\AppData\Local\Microsoft\WindowsApps\ngrok.exe" http 3000 --log=stdout

