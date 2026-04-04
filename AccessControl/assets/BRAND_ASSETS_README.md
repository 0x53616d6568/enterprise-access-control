# EAC Brand Assets

## Logo Files

### SVG Logos (Scalable)
- **eac-logo-dark.svg** — Full dark theme logo with text version
- **eac-logo-light.svg** — Full light theme logo with text version

### Icon Variants (Optimized for different sizes)
- **eac-icon-64.svg** — 64px size (app cards, large buttons)
- **eac-icon-40.svg** — 40px size (navigation, toolbars)
- **eac-icon-24.svg** — 24px size (small icons, badges)

## Brand Colors

All brand colors are defined in `src/constants/brandColors.js`:

### Primary Colors
- **Dark (#0D1117)** — Nuit - Large backgrounds
- **Navy (#1A3A5C)** — Marine - Primary UI elements
- **Blue (#2D7DD2)** — Bleu - Main brand color
- **Sky (#58A6FF)** — Ciel - Accents and highlights
- **Light (#F0F6FC)** — Blanc - Light backgrounds

### Usage Examples

```javascript
import { BRAND_COLORS, COLORS } from '../constants/brandColors';

// Access brand colors
const backgroundColor = BRAND_COLORS.primary.dark;
const accentColor = BRAND_COLORS.primary.blue;

// Or use quick aliases
const primary = COLORS.PRIMARY_BLUE;
const success = COLORS.SUCCESS;
```

## Integration in Components

### Using SVG Logos
```javascript
import { SvgUri } from 'react-native-svg';

<SvgUri 
  uri={require('../assets/eac-logo-dark.svg')} 
  width={200} 
  height={220} 
/>
```

### Using Brand Colors for Styling
```javascript
import { StyleSheet } from 'react-native';
import { COLORS } from '../constants/brandColors';

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.BACKGROUND_DARK,
    borderColor: COLORS.PRIMARY_BLUE,
  },
  text: {
    color: COLORS.TEXT_PRIMARY,
  },
});
```

### App Header with Logo
```javascript
import { Image } from 'react-native';

<Image
  source={require('../assets/eac-icon-40.svg')}
  style={{ width: 40, height: 46 }}
/>
```

## Design Specifications

- **Aspect Ratio:** Hexagon with integrated door and BLE signal visualization
- **Primary Visual:** Door access system with biometric scanning
- **Tagline:** "Accès intelligent. Sécurité absolue."
- **Application:** Enterprise access control system

## File Locations

```
AccessControl/
├── assets/
│   ├── eac-logo-dark.svg        (Full dark logo)
│   ├── eac-logo-light.svg       (Full light logo)
│   ├── eac-icon-64.svg          (64px icon)
│   ├── eac-icon-40.svg          (40px icon)
│   └── eac-icon-24.svg          (24px icon)
└── src/constants/
    └── brandColors.js           (Color definitions)
```

## Notes

- All SVGs are scalable and maintain crisp quality at any size
- Colors are coordinated for dark and light theme support
- Icons are optimized for small-size rendering (minimal details at 24px)
- Brand colors support accessibility compliance
