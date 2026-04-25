@echo off
REM Hex to NPY Converter
REM Converts hex-encoded embeddings from database to .npy files

echo.
echo ============================================================
echo Hex to NPY Converter
echo ============================================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python is not installed or not in PATH
    pause
    exit /b 1
)

REM Run the converter script
python hex_to_npy.py

if errorlevel 1 (
    echo.
    echo Error: Conversion failed
    pause
    exit /b 1
)

echo.
echo Done! Press any key to exit...
pause
exit /b 0
