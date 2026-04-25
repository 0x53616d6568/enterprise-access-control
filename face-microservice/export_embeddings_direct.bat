@echo off
REM Direct Database Export for Face Embeddings
REM Exports embeddings directly from database without hex conversion

echo.
echo ============================================================
echo Direct Database Export
echo ============================================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python is not installed or not in PATH
    pause
    exit /b 1
)

REM Check if mysql-connector-python is installed
python -c "import mysql.connector" >nul 2>&1
if errorlevel 1 (
    echo Warning: mysql-connector-python not found
    echo Installing mysql-connector-python...
    pip install mysql-connector-python python-dotenv
)

REM Run the export script
echo.
echo Running export_embeddings_direct.py...
echo.

python export_embeddings_direct.py

if errorlevel 1 (
    echo.
    echo Error: Export failed
    pause
    exit /b 1
)

echo.
echo Done! Press any key to exit...
pause
exit /b 0
