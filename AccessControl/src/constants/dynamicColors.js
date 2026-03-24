// Dynamic color scheme based on theme and accent color
export const getThemeColors = (theme = 'dark', accentColor = 'blue') => {
  // Ensure theme and accentColor have valid defaults
  const validTheme = ['dark', 'light', 'system'].includes(theme) ? theme : 'dark';
  const validAccentColor = ['blue', 'green', 'purple', 'orange'].includes(accentColor) ? accentColor : 'blue';
  
  // Define accent color variations
  const accentColorMap = {
    blue:   '#2D7DD2',
    green:  '#3D8F3D',
    purple: '#8957E5',
    orange: '#D29922',
  };

  const accentDarkMap = {
    blue:   '#1A3A5C',
    green:  '#1A3A1A',
    purple: '#2B1A4D',
    orange: '#3A2810',
  };

  const accentTextMap = {
    blue:   '#58A6FF',
    green:  '#56D364',
    purple: '#D2A8FF',
    orange: '#FB8500',
  };

  const selectedAccent = accentColorMap[validAccentColor] || accentColorMap.blue;
  const selectedAccentDark = accentDarkMap[validAccentColor] || accentDarkMap.blue;
  const selectedAccentText = accentTextMap[validAccentColor] || accentTextMap.blue;

  if (validTheme === 'light') {
    return {
      // Light Mode Colors
      bg:         '#FFFFFF',
      bgCard:     '#F6F8FA',
      bgInput:    '#EAEEF2',
      bgDeep:     '#F0F5FA',

      // Borders
      border:     '#D0D7DE',
      borderMid:  '#E1E6EB',

      // Text
      textPrimary:   '#0D1117',
      textSecondary: '#57606A',
      textMuted:     '#6E7681',
      textHint:      '#8B949E',

      // Accent
      accent:        selectedAccent,
      accentDark:    selectedAccentDark,
      accentText:    selectedAccentText,

      // Status
      success:       '#1A7F37',
      successBg:     '#DAFBE1',
      successBorder: '#34D399',

      warning:       '#9E6A03',
      warningBg:     '#FFF8C5',
      warningBorder: '#FFD966',

      danger:        '#DA3633',
      dangerBg:      '#FFEBE6',
      dangerBorder:  '#FF7373',

      // Roles
      managerColor:  '#8957E5',
      managerBg:     '#F3E8FF',
      managerBorder: '#D8B4FE',
    };
  }

  // Dark Mode (default)
  return {
    // Backgrounds
    bg:         '#0D1117',
    bgCard:     '#161B22',
    bgInput:    '#161B22',
    bgDeep:     '#0D2137',

    // Borders
    border:     '#21262D',
    borderMid:  '#30363D',

    // Text
    textPrimary:   '#F0F6FC',
    textSecondary: '#8B949E',
    textMuted:     '#6E7681',
    textHint:      '#3D444D',

    // Accent
    accent:        selectedAccent,
    accentDark:    selectedAccentDark,
    accentText:    selectedAccentText,

    // Status
    success:       '#3D8F3D',
    successBg:     '#0D2B0D',
    successBorder: '#1A4D1A',

    warning:       '#D29922',
    warningBg:     '#2B1D00',
    warningBorder: '#4D3800',

    danger:        '#C53030',
    dangerBg:      '#2B0D0D',
    dangerBorder:  '#4D1A1A',

    // Roles
    managerColor:  '#8957E5',
    managerBg:     '#1A0D2B',
    managerBorder: '#3A1A5C',
  };
};

// Get colors based on system theme
export const getSystemThemeColors = (accentColor = 'blue') => {
  // In a real app, you'd use Appearance.getColorScheme() here
  // For now, default to dark
  return getThemeColors('dark', accentColor);
};

export default getThemeColors;
