# SecureApp - Developer Setup Guide

**Last Updated**: March 31, 2026 | **Status**: Ready for Development

---

## 📋 Prerequisites

Ensure you have installed:

- **Git** - [Download](https://git-scm.com/download)
- **Node.js** (v16+) - [Download](https://nodejs.org/)
- **XAMPP** - [Download](https://www.apachefriends.org/download.html) (for MySQL database)
- **Expo Go App** - Download from Google Play (Android only)

---

## Part One: Frontend Setup & Running the App

Get the app running on your device first, then connect to the backend database.

### Step 1: Clone Repository

```bash
git clone https://github.com/your-repo/SecureApp.git
cd SecureApp
```

### Step 2: Install Frontend Dependencies

```bash
cd AccessControl
npm install
```

### Step 3: Get Your Computer's IPv4 Address

This is needed for the app to communicate with your backend server.

**Windows - Open Command Prompt and run:**

```bash
ipconfig
```

**Find this section in the output:**

```
Ethernet adapter Ethernet:
   Connection-specific DNS Suffix  . : 
   IPv4 Address. . . . . . . . . . . : 192.168.1.100
   Subnet Mask . . . . . . . . . . . : 255.255.255.0
   Default Gateway . . . . . . . . . : 192.168.1.1
```

**Copy the IPv4 Address** (example: `192.168.1.100`)

### Step 4: Configure Frontend API URL

The frontend uses `AccessControl/src/constants/api.js` to connect to the backend.

**Edit this file:**

```bash
notepad AccessControl\src\constants\api.js
```

**Update the BASE_URL with your IPv4 address (from Step 3):**

```javascript
// Change this to your machine's local IP when testing on a physical device
// To find it: run "ipconfig" in PowerShell and look for IPv4 Address
// e.g. 192.168.1.10
const BASE_URL = 'http://192.168.1.100:3000/api';  // Replace 192.168.1.100 with your IPv4
```

**Example:** If your IPv4 is `192.168.50.25`, use:
```javascript
const BASE_URL = 'http://192.168.50.25:3000/api';
```

**⚠️ Important:** Don't forget `/api` at the end of the URL!

### Step 5: Start the App

```bash
npx expo start
```

You should see:

```
expo start will help you get up and running!

Starting Expo server
Starting Metro bundler
Press 'a' for Android, 'w' for web, 'j' for debugging
```

### Step 6: Load App on Your Device

**Option A - Using Expo Go (Easiest):**
1. Open **Expo Go** app on your Android phone
2. Tap "Scan QR Code"
3. Scan the QR code shown in your terminal
4. App loads automatically!

**Option B - Android Emulator:**
1. Start Android Emulator (from Android Studio)
2. Press `a` in the terminal
3. App builds and loads on emulator

**Option C - Physical Device (USB Cable):**
1. Go to: Settings → Developer Options → USB Debugging (turn ON)
2. Connect phone via USB
3. Press `a` in terminal
4. App builds and loads on device

**You now have the app running!** Continue to Part Two to connect to the database.

---

## Part Two: Backend Setup & Database Connection

Connect your app to the backend server and database.

### Prerequisites for Part Two

- **XAMPP** installed with MySQL running
- Part One completed (app running)

---

### XAMPP Setup (One-Time)

#### Step 0A: Install XAMPP

1. Download XAMPP from [apachefriends.org](https://www.apachefriends.org/download.html)
2. Run the installer
3. When asked which components to install, make sure **MySQL** is checked
4. Install to default location (usually `C:\xampp`)

#### Step 0B: Start XAMPP and MySQL

1. Open **XAMPP Control Panel**
2. Look for the MySQL row
3. Click **Start** next to **MySQL**
4. You should see:
   ```
   MySQL    [Running]  (green highlight)
   Apache   (can stay off - not needed for this project)
   ```

**Keep XAMPP Control Panel open!** MySQL must stay running while developing.

#### Step 0C: Set MySQL Password (Important!)

By default, XAMPP MySQL has **no password**. For security, set one.

**Open Command Prompt and run:**

```bash
cd C:\xampp\mysql\bin
mysql -u root
```

You should see:
```
mysql>
```

**Set a password (choose something you'll remember):**

```sql
ALTER USER 'root'@'localhost' IDENTIFIED BY 'your_password_here';
FLUSH PRIVILEGES;
EXIT;
```

**Example - Setting password as `root123`:**

```sql
ALTER USER 'root'@'localhost' IDENTIFIED BY 'root123';
FLUSH PRIVILEGES;
EXIT;
```

**Test your new password:**

```bash
mysql -u root -p
# When prompted, enter your password
# If successful, you see: mysql>
# Type: EXIT;
```

**⚠️ Write down your password!** You'll need it in `backend/.env`

---

### Step 1: Verify XAMPP MySQL is Running

Before creating the database, make sure XAMPP MySQL is running.

**Open XAMPP Control Panel:**
1. Check that MySQL has a green highlight showing **[Running]**
2. If not running, click **Start** next to MySQL

**Test connection from command prompt:**

```bash
mysql -u root -p
# Enter your password (from XAMPP setup above)
# If successful, you see: mysql>
# Type: EXIT;
```

### Step 2: Create the Database

In a new terminal/command prompt:

```bash
cd backend
mysql -u root -p < schema_preferences.sql
```

When prompted, enter your MySQL password (the one you set in XAMPP setup).

**Verify the database was created:**

```bash
mysql -u root -p
# Enter your MySQL password
# Then type:
USE enterprise_access_control;
SHOW TABLES;
EXIT;
```

You should see multiple tables listed.

---

### Step 4: Backend Configuration

### Navigate to backend folder:

```bash
cd backend
```

### Install backend dependencies:

```bash
npm install
```

### Create `.env` file:

```bash
copy .env.example .env
notepad .env
```

### Configure `.env` with your XAMPP settings:

**⚠️ Use the password you set in XAMPP setup (Step 0C above)**

```env
PORT=3000
NODE_ENV=development

# Database Configuration (from XAMPP)
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=root123
DB_NAME=enterprise_access_control

# JWT Tokens (change these to random strings)
JWT_SECRET=your_random_secret_key_at_least_32_characters
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your_random_refresh_secret_key
JWT_REFRESH_EXPIRES_IN=7d

# Other Configuration
PI_API_KEY=your_pi_api_key
FACE_CONFIDENCE_THRESHOLD=0.65
```

**Example `.env` with XAMPP MySQL password `root123`:**

```env
PORT=3000
NODE_ENV=development

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=root123
DB_NAME=enterprise_access_control

JWT_SECRET=my_super_secret_key_minimum_32_chars_here
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=my_super_secret_refresh_key
JWT_REFRESH_EXPIRES_IN=7d

PI_API_KEY=pi_key_here
FACE_CONFIDENCE_THRESHOLD=0.65
```

### Critical: Understanding DB_PASSWORD with XAMPP

**The `DB_PASSWORD` in `.env` must match your XAMPP MySQL password from Step 0C.**

**Examples:**
- If you set XAMPP password to `root123`: `DB_PASSWORD=root123`
- If you set XAMPP password to `MyPass456`: `DB_PASSWORD=MyPass456`
- If you didn't set a password: `DB_PASSWORD=` (leave blank)

**What happens if DB_PASSWORD is wrong:**
- ❌ Backend crashes on startup
- ❌ Error: `Database connection failed`

**How the backend connects via XAMPP:**

The backend file `backend/config/db.js` reads your `.env` and connects to XAMPP MySQL:

```javascript
const pool = mysql.createPool({
  host:     process.env.DB_HOST,        // 127.0.0.1 (your computer - XAMPP)
  port:     process.env.DB_PORT,        // 3306 (XAMPP default port)
  user:     process.env.DB_USER,        // root (XAMPP default user)
  password: process.env.DB_PASSWORD,    // ⚠️ MUST match XAMPP password from Step 0C
  database: process.env.DB_NAME,        // enterprise_access_control
});
```

**Connection test:**
```bash
# If this works with your password, then DB_PASSWORD is correct:
mysql -u root -p
# Enter the password you set in XAMPP setup
# If connection succeeds → Password is correct ✅
# If connection fails → Password is wrong ❌
```

---

### Step 5: Start the Backend Server

Open a **new terminal** in the backend folder:

```bash
npm run dev
```

**Expected output when successful:**

```
Server running on port 3000 [development]
Database connected successfully
```

**Keep this terminal open!** The backend must stay running while you use the app.

**⚠️ Important:** Make sure XAMPP MySQL is still running in the background (check XAMPP Control Panel).

---

### Step 6: Connect Frontend to Backend

Your app (from Part One) should now automatically connect to the backend because:

1. Frontend `AccessControl/src/constants/api.js` has correct IPv4 address pointing to `http://YOUR_IP:3000/api`
2. Backend is running on port 3000 with XAMPP MySQL connected
3. Database is ready and tables are created

**If the app still doesn't connect:**
1. Press `R` in the Expo terminal to reload the app
2. Verify backend is running and shows "Database connected successfully"
3. Verify XAMPP MySQL is running (green highlight in XAMPP Control Panel)
4. Confirm IPv4 in `AccessControl/src/constants/api.js` matches your computer's actual IP

### Database Connection Failed

**Problem:** Backend shows `Database connection failed` when starting

**Solutions:**
1. Check XAMPP MySQL is running (green highlight in XAMPP Control Panel)
2. Check your `DB_PASSWORD` in `.env` matches the XAMPP password you set:
   ```bash
   mysql -u root -p
   # If this fails, your DB_PASSWORD is wrong
   ```
3. Verify database was created:
   ```bash
   mysql -u root -p
   USE enterprise_access_control;
   SHOW TABLES;
   ```

### Port 3000 Already in Use

**Problem:** `Port 3000 already in use` error

```bash
# Find what's using port 3000
netstat -ano | findstr :3000

# Kill the process (replace PID with the number shown)
taskkill /PID <PID> /F
```

### Dependencies Install Failed

```bash
# Clear npm cache
npm cache clean --force

# Delete and reinstall
rmdir /s node_modules
npm install
```

### App Won't Load from Phone

1. Verify backend is running: `npm run dev`
2. Verify IPv4 in `AccessControl/src/constants/api.js` is correct: `ipconfig`
3. Phone and computer must be on same WiFi
4. Press `R` in Expo terminal to reload app
5. Restart Expo: Stop terminal and run `npx expo start` again

### "Cannot find module" Error

```bash
# Reinstall dependencies
npm install
```

---

## Quick Reference

| Action | Command |
|--------|---------|
| Start XAMPP MySQL | Open XAMPP Control Panel → Click Start next to MySQL |
| Start frontend | `npx expo start` |
| Start backend | `npm run dev` (in backend folder) |
| Get IPv4 address | `ipconfig` |
| Edit API URL | `notepad AccessControl\src\constants\api.js` |
| Test XAMPP MySQL connection | `mysql -u root -p` |
| Create database | `mysql -u root -p < schema_preferences.sql` |
| View MySQL tables | `mysql -u root -p` then `USE enterprise_access_control; SHOW TABLES;` |

---

## Checklist

**Part One - Frontend:**
- [ ] Repository cloned
- [ ] Node.js installed
- [ ] Frontend dependencies installed (`npm install`)
- [ ] IPv4 address found (`ipconfig`)
- [ ] `AccessControl/src/constants/api.js` updated with correct IPv4 and `/api` endpoint
- [ ] App running on phone/emulator (`npx expo start`)

**Part Two - Backend:**
- [ ] XAMPP installed and MySQL running (green highlight)
- [ ] XAMPP MySQL password set and written down
- [ ] Database created (`schema_preferences.sql` imported)
- [ ] Backend dependencies installed (`npm install`)
- [ ] Backend `.env` (in backend folder) configured with correct DB_PASSWORD from XAMPP
- [ ] Backend running (`npm run dev`)
- [ ] XAMPP MySQL still running while backend is active
- [ ] App connecting to backend successfully

---

**You're ready to develop! 🚀**
