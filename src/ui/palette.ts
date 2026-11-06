export const light = {
  primary: '#6750A4', onPrimary: '#FFFFFF', primaryContainer: '#EADDFF', onPrimaryContainer: '#21005D',
  secondaryContainer: '#E8DEF8', onSecondaryContainer: '#1D192B',
  tertiaryContainer: '#FFD8E4', onTertiaryContainer: '#31111D',
  surface: '#FEF7FF', surfaceDim: '#DED8E1', surfaceContainerLow: '#F7F2FA',
  surfaceContainer: '#F3EDF7', surfaceContainerHigh: '#ECE6F0', surfaceContainerHighest: '#E6E0E9',
  onSurface: '#1D1B20', onSurfaceVariant: '#49454F', outline: '#79747E', outlineVariant: '#CAC4D0',
  error: '#BA1A1A', errorContainer: '#FFDAD6', onErrorContainer: '#410002', scrim: '#000000',
};

export type Palette = typeof light;

export const dark: Palette = {
  primary: '#D0BCFF', onPrimary: '#381E72', primaryContainer: '#4F378B', onPrimaryContainer: '#EADDFF',
  secondaryContainer: '#4A4458', onSecondaryContainer: '#E8DEF8',
  tertiaryContainer: '#633B48', onTertiaryContainer: '#FFD8E4',
  surface: '#141218', surfaceDim: '#141218', surfaceContainerLow: '#1D1B20',
  surfaceContainer: '#211F26', surfaceContainerHigh: '#2B2930', surfaceContainerHighest: '#36343B',
  onSurface: '#E6E0E9', onSurfaceVariant: '#CAC4D0', outline: '#938F99', outlineVariant: '#49454F',
  error: '#FFB4AB', errorContainer: '#93000A', onErrorContainer: '#FFDAD6', scrim: '#000000',
};

export const libraryAccents = {
  light: {
    artwork: { container: '#C0DCFF', content: '#133D74' },
    featuredEdit: { container: '#ACC4EE', content: '#173863' },
  },
  dark: {
    artwork: { container: '#315789', content: '#ECF4FF' },
    featuredEdit: { container: '#1C3154', content: '#E2EEFF' },
  },
};
