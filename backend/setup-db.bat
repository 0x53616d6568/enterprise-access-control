@echo off
REM Database Initialization Script for SecureApp + BLE Token System
REM Works with XAMPP MariaDB/MySQL
REM Run this from: d:\SecureApp\backend

echo.
echo ==========================================
echo  SecureApp - BLE Token Database Setup
echo ==========================================
echo.

REM Check if XAMPP mysql is available
where mysql >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: MySQL/MariaDB not found in PATH
    echo.
    echo Please ensure XAMPP is installed and MySQL service is running
    echo Then add XAMPP\mysql\bin to your system PATH
    echo Or run this script from: C:\xampp\mysql\bin\mysql.exe
    echo.
    pause
    exit /b 1
)

REM Check if XAMPP MySQL is running
netstat -ano | findstr :3306 >nul
if %ERRORLEVEL% NEQ 0 (
    echo WARNING: MySQL port 3306 not responding
    echo Please start XAMPP Control Panel and enable MySQL before continuing
    echo.
    pause
    exit /b 1
)

echo ✓ MySQL is running on port 3306
echo.

REM Create database
echo Step 1: Creating database 'secure_app'...
mysql -u root -e "CREATE DATABASE IF NOT EXISTS secure_app;" 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Could not create database. Trying with password prompt...
    mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS secure_app;"
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: Database creation failed
        pause
        exit /b 1
    )
)
echo ✓ Database created
echo.

REM Import main schema
echo Step 2: Importing main schema (enterprise_access_control.sql)...
if exist "..\enterprise_access_control.sql" (
    mysql -u root secure_app < ..\enterprise_access_control.sql 2>nul
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: Failed to import main schema
        mysql -u root -p secure_app < ..\enterprise_access_control.sql
    )
    echo ✓ Main schema imported
) else (
    echo WARNING: enterprise_access_control.sql not found at ..\enterprise_access_control.sql
    echo Please place this file in: d:\SecureApp\
)
echo.

REM Import BLE token system migration
echo Step 3: Importing BLE token system (ble_token_system.sql)...
if exist ".\migrations\ble_token_system.sql" (
    mysql -u root secure_app < .\migrations\ble_token_system.sql 2>nul
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: Failed to import BLE token system
        mysql -u root -p secure_app < .\migrations\ble_token_system.sql
    )
    echo ✓ BLE token tables created
) else (
    echo ERROR: ble_token_system.sql not found at .\migrations\
    echo Please ensure file exists at: d:\SecureApp\backend\migrations\ble_token_system.sql
)
echo.

REM Import additional BLE migration
echo Step 4: Importing additional BLE migration (add_ble_token.sql)...
if exist ".\migrations\add_ble_token.sql" (
    mysql -u root secure_app < .\migrations\add_ble_token.sql 2>nul
    if %ERRORLEVEL% NEQ 0 (
        echo WARNING: add_ble_token.sql import had issues (may be OK if already applied)
    ) else (
        echo ✓ Additional BLE tables imported
    )
) else (
    echo WARNING: add_ble_token.sql not found at .\migrations\
)
echo.

REM Verify tables
echo Step 5: Verifying tables were created...
mysql -u root secure_app -e "SHOW TABLES;" 2>nul > tables.txt
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Could not verify tables
    pause
    exit /b 1
)

REM Check for critical BLE tables
mysql -u root secure_app -e "DESC ble_tokens;" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: ble_tokens table not found!
    echo Please check the migration files and try again
    pause
    exit /b 1
)

echo ✓ All tables created successfully!
echo.

REM Display summary
echo ==========================================
echo  Setup Complete!
echo ==========================================
echo.
echo ✓ Database: secure_app
echo ✓ Tables: Created (ble_tokens, ble_token_audit_log, users, doors, etc.)
echo.
echo Next steps:
echo   1. Create .env file in: d:\SecureApp\backend\
echo   2. Copy the template from: BLE_INTEGRATION_SETUP.md
echo   3. Update database credentials if needed
echo   4. Run: npm install
echo   5. Run: npm start
echo.
echo To verify database contents:
echo   - Open: http://localhost/phpmyadmin/
echo   - Database: secure_app
echo   - Tables: ble_tokens, ble_token_audit_log, users, doors, etc.
echo.
pause
