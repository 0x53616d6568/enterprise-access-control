# SecureApp Implementation Guide

## What's Been Implemented

### 1. ✅ Current Password Change Screen
- **File**: `AccessControl/src/screens/auth/ChangeCurrentPasswordScreen.js`
- **Feature**: New screen for changing password after first login
- **Navigation**: Accessible from Settings → Change Password (ProfileScreen)
- **How it works**: Uses the same `changePassword()` API function that validates the old password

### 2. ✅ Theme Preferences (AppearanceScreen)
- **File**: `AccessControl/src/screens/shared/AppearanceScreen.js`
- **Features**:
  - Dark/Light/System theme options
  - Accent color selection (Blue/Green/Purple/Orange)
  - Loads saved preferences on app startup
  - Saves preferences to backend API
  - Fallback to local storage if API unavailable
- **API Endpoint**: `POST /api/preferences/theme`

### 3. ✅ Notification Preferences (NotificationSettingsScreen)
- **File**: `AccessControl/src/screens/shared/NotificationSettingsScreen.js`
- **Features**:
  - 10 notification types with toggle switches
  - Loads saved preferences on app startup
  - Saves preferences to backend API
  - Syncs across devices when user logs in elsewhere
  - Fallback to local storage if API unavailable
- **API Endpoint**: `POST /api/preferences/notifications`

### 4. ✅ Backend API Endpoints
- **File**: `backend/controllers/preferences.controller.js`
- **File**: `backend/routes/preferences.routes.js`
- **Endpoints**:
  - `GET /api/preferences` - Fetch all user preferences
  - `POST /api/preferences/theme` - Save theme settings
  - `POST /api/preferences/notifications` - Save notification preferences

### 5. ✅ Frontend Service Layer
- **File**: `AccessControl/src/services/preferencesService.js`
- **Functions**:
  - `getPreferences()` - Fetch all preferences
  - `saveThemePreferences(accessToken, theme, accentColor)`
  - `saveNotificationPreferences(accessToken, settings)`
  - `getThemePreferences()` - Get theme only
  - `getNotificationPreferences()` - Get notifications only

---

## Database Setup (REQUIRED)

### Run These SQL Commands

You need to create two new tables in your MySQL database. Execute the SQL from:
**`backend/schema_preferences.sql`**

Or run these commands directly:

```sql
-- Create user_theme_preferences table
CREATE TABLE IF NOT EXISTS user_theme_preferences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  theme ENUM('dark', 'light', 'system') DEFAULT 'dark',
  accent_color ENUM('blue', 'green', 'purple', 'orange') DEFAULT 'blue',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_theme (user_id)
);

CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  access_granted BOOLEAN DEFAULT TRUE,
  access_denied BOOLEAN DEFAULT TRUE,
  face_fail BOOLEAN DEFAULT TRUE,
  req_approved BOOLEAN DEFAULT TRUE,
  req_rejected BOOLEAN DEFAULT TRUE,
  new_request BOOLEAN DEFAULT FALSE,
  visitor_arrived BOOLEAN DEFAULT TRUE,
  visitor_expired BOOLEAN DEFAULT FALSE,
  token_expiry BOOLEAN DEFAULT TRUE,
  security_alert BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_notif (user_id)
);
```

---

## Testing Checklist

- [x] Database tables created successfully
- [x] Backend server starts without errors
- [x] AppearanceScreen loads (should show current theme/accent color)
- [x] Can change theme and save (check database)
- [x] Can change accent color and save
- [x] Theme changes visually update the app
- [x] Accent color changes visually update the app
- [x] NotificationSettingsScreen loads (should show current settings)
- [x] Can toggle notifications and save (fixed - strict boolean validation)
- [x] Settings persist after app restart
- [x] ChangeCurrentPasswordScreen accessible from Settings
- [ ] Can change password with ChangeCurrentPasswordScreen
- [ ] Works on multiple devices (settings sync)

---

## Technical Details

### Theme Settings
- Stored in `user_theme_preferences` table
- Default: Dark mode, Blue accent
- Values: theme ∈ {dark, light, system}, accentColor ∈ {blue, green, purple, orange}

### Notification Settings
10 notification types can be individually controlled:
- **Access events**: access_granted, access_denied, face_fail
- **Requests**: req_approved, req_rejected, new_request
- **Visitors**: visitor_arrived, visitor_expired
- **System**: token_expiry, security_alert

### Error Handling
- All API calls have fallback to local SecureStore
- If backend is unreachable, preferences load from cache
- Changes are saved to both backend and local storage

### API Response Format
```json
{
  "success": true,
  "data": {
    "theme": "dark",
    "accentColor": "blue",
    "notifications": {
      "access_granted": true,
      "access_denied": true,
      ...
    }
  },
  "message": "Theme preferences saved"
}
```

---

## Files Modified

### Backend
- `server.js` - Added preferences routes
- `controllers/preferences.controller.js` - NEW, improved query to exclude metadata fields
- `routes/preferences.routes.js` - NEW

### Frontend - Core
- `context/AuthContext.js` - Extended with theme state and update methods
- `hooks/useThemeColors.js` - NEW, hook for theme-aware colors
- `constants/dynamicColors.js` - NEW, dynamic color generation
- `constants/api.js` - Added preference endpoints
- `services/preferencesService.js` - NEW, with improved boolean filtering

### Frontend - Screens
- `screens/shared/AppearanceScreen.js` - Now fully functional with theme changes
- `screens/shared/NotificationSettingsScreen.js` - Fixed boolean validation, using theme hook
- `screens/auth/ChangeCurrentPasswordScreen.js` - NEW
- `navigation/AppNavigator.js` - Added ChangeCurrentPassword screen
- `screens/employee/ProfileScreen.js` - Updated navigation

## Bug Fixes (Updated)

### Fixed: "Invalid notification setting: id" Error
**Issue**: When saving notification preferences, the backend was returning all database fields including `id`, `user_id`, `created_at`, `updated_at`. The frontend was trying to re-send these metadata fields, causing validation errors.

**Fixes Applied**:
1. **Backend** (`preferences.controller.js`): Changed notification query from `SELECT *` to explicitly select only the 10 notification preference fields
2. **Frontend Service** (`preferencesService.js`): 
   - `getNotificationPreferences()` now filters to only valid keys
   - `saveNotificationPreferences()` now filters the settings object before sending
3. **Frontend UI** (`NotificationSettingsScreen.js`): 
   - Changed state merge from replace to merge pattern: `setSettings(prev => ({ ...prev, ...prefs }))` instead of `setSettings(prefs)`
   - Added strict boolean conversion: `settingsToSave[key] = settings[key] === true`
   - All field values are explicitly type-cast to boolean before sending

**Result**: Settings now save correctly and persist without being reset to off/undefined

### Added: Theme Support Infrastructure
**Features Implemented**:
1. **AuthContext Extended** - Added theme and accentColor state with update methods:
   - `theme` - stores 'dark', 'light', or 'system'
   - `accentColor` - stores 'blue', 'green', 'purple', or 'orange'
   - `updateTheme()` and `updateAccentColor()` methods
   - Theme preferences loaded on app startup

2. **Dynamic Colors System** (`dynamicColors.js`):
   - `getThemeColors(theme, accentColor)` generates complete color scheme
   - Supports dark and light themes
   - Each theme has appropriate accent color variations
   - All 4 accent colors supported in both dark and light modes

3. **Theme Hook** (`hooks/useThemeColors.js`):
   - `useThemeColors()` hook provides theme-aware colors
   - Automatically uses current theme/accent from AuthContext
   - Can be used in any screen component

### Appearance Screen is Now Functional
- Changes to theme/accent color are immediately saved to backend
- Theme context is updated when preferences are saved
- Screens using `useThemeColors()` hook will update appearance immediately
- All preference changes persist across app restarts
- Light mode and accent color selection now visually change the app

### Notification Settings Screen Theme-Aware
- Now uses `useThemeColors()` hook
- Appearance changes instantly reflect the selected theme from AppearanceScreen
- Boolean type validation ensures all settings save correctly

---

1. **Database Critical**: Tables MUST exist before the app can save preferences. If tables don't exist, the API will return 500 errors.

2. **Backward Compatibility**: The app still falls back to SecureStore if API fails, so previous locally-saved settings won't be lost.

3. **First Time Users**: New users will get default preferences automatically.

4. **ChangeCurrentPasswordScreen**: Works exactly like ChangePasswordScreen but is used after first login. Both use the same `changePassword()` API function.

5. **Notification Preferences**: Are not enforced by the backend notification service yet. Backend still sends all notification types. To fully implement this, update `notificationService.js` to check user preferences before sending.
