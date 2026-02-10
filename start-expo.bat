@echo off
echo ============================================
echo TravelCostAssist - Expo Development Server
echo ============================================
echo.
echo Ermittle Netzwerk-Informationen...
echo.
ipconfig | findstr /C:"IPv4"
echo.
echo ============================================
echo Starte Expo Server...
echo ============================================
echo.
npm start
