export interface MermaidThemeConfig {
  theme: string;
  themeVariables?: Record<string, string>;
  isFallback: boolean;
}

const HIGH_CONTRAST_VARS: Record<string, string> = {
  primaryTextColor: '#ffffff',
  primaryColor: '#ffffff',
  lineColor: '#ffffff',
  noteTextColor: '#ffffff',
  noteBkgColor: '#000000',
  textColor: '#ffffff',
  mainBkg: '#000000',
  secondaryColor: '#ffffff',
};

export function resolveMermaidTheme(kind: string | undefined): MermaidThemeConfig {
  switch (kind) {
    case 'light':
      return { theme: 'default', isFallback: false };
    case 'dark':
      return { theme: 'dark', isFallback: false };
    case 'highContrast':
      return { theme: 'dark', themeVariables: HIGH_CONTRAST_VARS, isFallback: false };
    default:
      return { theme: 'dark', isFallback: true };
  }
}
