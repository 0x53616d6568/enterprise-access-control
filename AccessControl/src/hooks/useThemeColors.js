import { useAuth } from '../context/AuthContext';
import { getThemeColors } from '../constants/dynamicColors';

export const useThemeColors = () => {
  const authContext = useAuth();
  const theme = authContext?.theme || 'dark';
  const accentColor = authContext?.accentColor || 'blue';
  return getThemeColors(theme, accentColor);
};

export default useThemeColors;
