import { DefaultTheme } from 'react-native-paper';

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#1565C0',
    primaryDark: '#0D47A1',
    primaryLight: '#42A5F5',
    accent: '#FF8F00',
    background: '#F5F7FA',
    surface: '#FFFFFF',
    surfaceVariant: '#E8EDF2',
    text: '#212121',
    textSecondary: '#616161',
    textLight: '#9E9E9E',
    error: '#D32F2F',
    success: '#2E7D32',
    warning: '#F57F17',
    info: '#0288D1',
    border: '#DEE2E6',
    divider: '#E0E0E0',
    cardShadow: '#00000020',
    statusDraft: '#9E9E9E',
    statusSubmitted: '#1565C0',
    statusApproved: '#2E7D32',
    statusRejected: '#D32F2F',
  },
  fonts: {
    ...DefaultTheme.fonts,
  },
  roundness: 8,
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
};

export default theme;
