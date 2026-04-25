"""
MySQL Connection Diagnostic
Check if database is running and accessible
"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = int(os.getenv('DB_PORT', 3306))
DB_USER = os.getenv('DB_USER', 'root')
DB_PASSWORD = os.getenv('DB_PASSWORD', '')
DB_NAME = os.getenv('DB_NAME', 'access_control')

print("\n" + "="*60)
print("🔍 MySQL Connection Diagnostic")
print("="*60 + "\n")

print("Current Settings:")
print(f"  Host: {DB_HOST}")
print(f"  Port: {DB_PORT}")
print(f"  Database: {DB_NAME}")
print(f"  User: {DB_USER}")
print(f"  Password: {'***' if DB_PASSWORD else 'NOT SET'}\n")

# Check if .env file exists
if os.path.exists('.env'):
    print("✅ .env file found")
else:
    print("⚠️  .env file NOT found - using defaults")

print("\n" + "-"*60)
print("Step 1: Check if MySQL is running")
print("-"*60 + "\n")

# Try to connect
try:
    import mysql.connector
    
    print(f"Attempting connection to {DB_HOST}:{DB_PORT}...\n")
    
    # Check if it's a cloud database
    is_cloud = not (DB_HOST == 'localhost' or DB_HOST == '127.0.0.1')
    
    config = {
        'host': DB_HOST,
        'port': DB_PORT,
        'user': DB_USER,
        'password': DB_PASSWORD,
        'database': DB_NAME,
    }
    
    if is_cloud:
        print("🔒 Using SSL for cloud database\n")
        config['ssl_disabled'] = False
        config['autocommit'] = True
    
    connection = mysql.connector.connect(**config)
    
    print("✅ Connection successful!\n")
    
    # Get database info
    cursor = connection.cursor()
    cursor.execute("SELECT VERSION()")
    version = cursor.fetchone()
    print(f"MySQL Version: {version[0]}")
    
    # Check face_embeddings table
    cursor.execute("""
        SELECT COUNT(*) as count FROM face_embeddings
    """)
    count = cursor.fetchone()
    print(f"Face Embeddings in DB: {count[0]}\n")
    
    connection.close()
    
except Exception as e:
    print(f"❌ Connection failed: {e}\n")
    print("=" * 60)
    print("SOLUTIONS:")
    print("=" * 60)
    print("\n1. Start MySQL Server:")
    print("   Windows (CMD as Admin):")
    print("     net start MySQL80")
    print("     (or 'net start MySQL57' depending on your version)")
    print("\n   Or use Services:")
    print("     - Press Win+R, type: services.msc")
    print("     - Find 'MySQL80' or 'MySQL Server'")
    print("     - Right-click → Start")
    print("\n2. Verify connection details in .env file:")
    print("   DB_HOST=localhost")
    print("   DB_PORT=3306")
    print("   DB_USER=root")
    print("   DB_PASSWORD=your_password")
    print("   DB_NAME=access_control")
    print("\n3. Check if MySQL is on a different port:")
    print("   - Look in MySQL config file")
    print("   - Update .env if needed")
    print("\n4. Try connecting directly:")
    print("   mysql -h localhost -u root -p -D access_control")
    print()

print("\n" + "="*60)
print("Next Steps:")
print("="*60)
print("\n1. Make sure MySQL Server is RUNNING")
print("2. After starting, run this again to verify")
print("3. Then run: python export_embeddings_direct.py\n")
