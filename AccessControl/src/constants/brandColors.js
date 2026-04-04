// EAC Brand Colors
// Identité visuelle de l'application

export const BRAND_COLORS = {
  // Main brand colors
  primary: {
    dark: '#0D1117',      // Nuit - Dark background
    navy: '#1A3A5C',      // Marine - Primary navy
    blue: '#2D7DD2',      // Bleu - Main brand blue
    sky: '#58A6FF',       // Ciel - Light blue/accent
    light: '#F0F6FC',     // Blanc - Light background
  },

  // Semantic colors
  semantic: {
    success: '#28A745',
    warning: '#FFC107',
    error: '#DC3545',
    info: '#17A2B8',
  },

  // Neutral grays
  neutral: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
};

// Quick access aliases
export const COLORS = {
  PRIMARY_DARK: BRAND_COLORS.primary.dark,
  PRIMARY_NAVY: BRAND_COLORS.primary.navy,
  PRIMARY_BLUE: BRAND_COLORS.primary.blue,
  PRIMARY_SKY: BRAND_COLORS.primary.sky,
  PRIMARY_LIGHT: BRAND_COLORS.primary.light,

  SUCCESS: BRAND_COLORS.semantic.success,
  WARNING: BRAND_COLORS.semantic.warning,
  ERROR: BRAND_COLORS.semantic.error,
  INFO: BRAND_COLORS.semantic.info,

  BACKGROUND_DARK: BRAND_COLORS.primary.dark,
  BACKGROUND_LIGHT: BRAND_COLORS.primary.light,

  TEXT_PRIMARY: BRAND_COLORS.primary.navy,
  TEXT_SECONDARY: BRAND_COLORS.primary.blue,
  TEXT_LIGHT: BRAND_COLORS.primary.light,
};

// Brand tagline
export const BRAND_TAGLINE = "Accès intelligent. Sécurité absolue.";
export const BRAND_NAME = "EAC";
export const BRAND_FULL_NAME = "Enterprise Access Control";
