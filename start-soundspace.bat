@echo off
title SoundSpace Full Stack Startup
echo.
echo =====================================
echo   🚀 SoundSpace Full Stack Startup
echo =====================================
echo.

REM Start Backend in new window
echo 📡 Starting Backend Server (Port 8800)...
start "SoundSpace Backend" /d "c:\Users\L13\soundspace-project\soundspace-project\server" cmd /c "npm run dev & pause"

REM Wait a moment for backend to start
timeout /t 3 /nobreak >nul

REM Start Frontend in new window  
echo 🎨 Starting Frontend Client (Port 5173)...
start "SoundSpace Frontend" /d "c:\Users\L13\soundspace-project\client" cmd /c "npm run dev & pause"

echo.
echo ✅ Both services are starting...
echo.
echo 📊 Access Points:
echo    Frontend: http://localhost:5173
echo    Backend:  http://localhost:8800
echo    Admin Dashboard: http://localhost:5173 (login with admin credentials)
echo.
echo 👤 Admin Credentials:
echo    Email: realadmin@company.com
echo    Password: SuperSecret123
echo.
echo Press any key to exit this launcher...
pause >nul