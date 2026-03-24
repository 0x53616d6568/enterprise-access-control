# NotificationSettingsScreen Debugging Guide

## What I've Added

I've added **comprehensive console logging** across the entire notification preferences system to track data flow and identify where settings are being lost.

---

## How to Test & Debug

### Step 1: Start Backend with Monitoring
The backend is now running in the background. Open a new PowerShell terminal and check logs:
```powershell
cd d:\SecureApp\backend
npm run dev
```

### Step 2: Test the Flow

**In your React Native app:**
1. Open NotificationSettingsScreen
2. Toggle ONE setting (e.g., `access_granted` from ON to OFF)
3. Click "Save preferences"
4. Wait for success alert
5. Navigate away from the screen
6. Navigate back to NotificationSettingsScreen
7. Check if your toggle is saved or shows as OFF

### Step 3: Check Console Logs

**Look for these log sequences:**

#### \`\`\`On Initial Load:\`\`\`
Frontend logs (Metro bundler terminal):
```
[NotifSetting] useEffect: Loading preferences on mount
[Prefs] Fetching notification preferences from API...
[Prefs] API response: { theme: "dark", accentColor: "blue", notifications: {...} }
[Prefs] Extracted notification prefs: { access_granted: true, ... }
[Prefs] Filtered notification prefs: { access_granted: true, ... }
[NotifSetting] useEffect: Setting state - prev: {...}, prefs: {...}, merged: {...}
```

Backend logs (PowerShell terminal):
```
[Prefs] Getting preferences for user: <USER_ID>
[Prefs] Theme rows: [{theme: "dark", accent_color: "blue"}]
[Prefs] Notification rows: [{access_granted: 1, access_denied: 1, ...}]  ← CRITICAL: Check these values
[Prefs] Returning preferences: { theme: ..., accentColor: ..., notifications: {...} }
```

#### When Saving:
Frontend logs:
```
[NotifSetting] Before save: { access_granted: false, access_denied: true, ... }
[Prefs] Saving notification preferences: { access_granted: false, access_denied: true, ... }
[Prefs] Filtered settings to send: { access_granted: false, access_denied: true, ... }
[Prefs] Save response: { data: { access_granted: false, access_denied: true, ... }, message: "..." }
[Prefs] Caching response data: { access_granted: false, access_denied: true, ... }
Success Alert appears
```

Backend logs:
```
[Prefs] Saving notification preferences for user: <USER_ID>
[Prefs] Received settings: { access_granted: false, access_denied: true, ... }
[Prefs] Existing record found: true/false
[Prefs] Merged settings: { access_granted: false, access_denied: true, ... }
[Prefs] Update result: 1  ← Should be 1 (rows affected)
[Prefs] Returning merged: { access_granted: false, access_denied: true, ... }
```

#### When Reloading After Save:
Frontend logs (useFocusEffect):
```
[NotifSetting] useFocusEffect: Screen focused, reloading preferences
[Prefs] Fetching notification preferences from API...
[Prefs] API response: { theme: ..., accentColor: ..., notifications: { access_granted: false, ... } }
[Prefs] Extracted notification prefs: { access_granted: false, ... }
[NotifSetting] useFocusEffect: Setting state - prev: {...}, prefs: {...}, merged: {...}
```

Backend logs:
```
[Prefs] Getting preferences for user: <USER_ID>
[Prefs] Notification rows: [{access_granted: 0, access_denied: 1, ...}]  ← Should show 0 (false) if saved
```

---

## Possible Issues & Solutions

### Issue 1: Database Not Storing Values
**Symptom:** Backend logs show `[Prefs] Update result: 0` or `Insert result: 0`
- Means the UPDATE/INSERT query didn't affect any rows
- **Solution:** Check that the database table exists and has the correct schema

### Issue 2: Wrong Value Types in Database
**Symptom:** Backend logs show `[Prefs] Notification rows: [{access_granted: null, ...}]`
- Means values are NULL in database (not saved correctly)
- **Solution:** Verify MySQL data types are BOOLEAN or TINYINT(1)

### Issue 3: Frontend Not Sending Correct Values
**Symptom:** Frontend logs show `[Prefs] Filtered settings to send: { access_granted: "false", ... }` (string instead of boolean)
- **Solution:** This is already fixed in the updated code with strict `=== true` checks

### Issue 4: Response Data Not in Correct Structure
**Symptom:** Frontend logs show `[Prefs] Saved response: undefined` or missing `data.data`
- **Solution:** Verify the backend response wrapper is correct (check `utils/response.js`)

### Issue 5: useFocusEffect Not Triggering
**Symptom:** No `[NotifSetting] useFocusEffect:` logs when navigating back
- **Solution:** Ensure `@react-navigation/native` is installed and useFocusEffect is imported correctly

---

## Database Verification

To manually check what's stored in the database:

```sql
USE your_secure_app_database;

-- Check theme preferences
SELECT user_id, theme, accent_color, updated_at FROM user_theme_preferences;

-- Check notification preferences
SELECT user_id, access_granted, access_denied, face_fail, req_approved, 
       req_rejected, new_request, visitor_arrived, visitor_expired, 
       token_expiry, security_alert, updated_at 
FROM user_notification_preferences;

-- Check for specific user
SELECT * FROM user_notification_preferences WHERE user_id = <YOUR_USER_ID>;
```

---

## Complete Data Flow Diagram

```
User UI Change
    ↓
toggle(key) → setSettings({ ...prev, [key]: !prev[key] })
    ↓
User clicks "Save"
    ↓
handleSave():
  - Log: [NotifSetting] Before save: {...}
  - Create settingsToSave with ALL 10 keys
  - Log: [Prefs] Saving notification preferences: {...}
    ↓
saveNotificationPreferences():
  - Log: [Prefs] Filtered settings to send: {...}
  - POST /api/preferences/notifications
    ↓
Backend saveNotificationPreferences():
  - Log: [Prefs] Received settings: {...}
  - Validate boolean types
  - Merge with defaults
  - Log: [Prefs] Merged settings: {...}
  - UPDATE/INSERT in database
  - Log: [Prefs] Update result: X
  - Return merged object
    ↓
Frontend receives response
  - Log: [Prefs] Save response: {...}
  - Cache to local storage
  - Return to screen
    ↓
Alert.alert("Success", ...)
    ↓
User navigates away
    ↓
useFocusEffect triggers (on return)
  - Log: [NotifSetting] useFocusEffect: Screen focused
    ↓
reloadPreferences():
  - Log: [Prefs] Fetching notification preferences from API...
  - GET /api/preferences
    ↓
Backend getUserPreferences():
  - Log: [Prefs] Getting preferences for user: X
  - Query database
  - Log: [Prefs] Notification rows: [...]  ← CRITICAL: Check values here
  - Return to frontend
    ↓
Frontend processes response
  - Log: [Prefs] API response: {...}
  - Log: [Prefs] Extracted notification prefs: {...}
  - Log: [Prefs] Filtered notification prefs: {...}
  - setSettings() with new values
    ↓
Screen re-renders with saved values (or OFF if issue exists)
```

---

## Next Steps

1. **Save ONE setting** (e.g., toggle access_granted OFF)
2. **Monitor logs** in both Metro bundler and PowerShell backend terminal
3. **Share the log output** - The logs will show exactly where the data is being lost
4. **Check database** using the SQL queries above to verify what's actually stored

**Most Common Culprits:**
- Database column types are TEXT or VARCHAR instead of BOOLEAN/TINYINT(1)
- NULL values being stored instead of 0/1
- useFocusEffect not re-fetching data on screen focus
