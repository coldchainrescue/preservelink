@echo off
echo Creating .env file from env.config.txt...
copy "env.config.txt" ".env" >nul 2>&1
echo .env file created successfully!
echo.
echo Installing dependencies...
call npm install
echo.
echo ======================================
echo   PreserveLink - Setup Complete!
echo   Run: npm run dev
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:3001
echo   Demo Login: hanisahjohaari@gmail.com / demo123
echo ======================================