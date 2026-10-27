/**
 * Gray scale from black to white in steps of 0x20 (32), the base of every neutral in the app.
 * Names are the hex step, so `gA0` is #A0A0A0.
 */
export const palette = {
    black: '#000000',
    g20: '#202020',
    g40: '#404040',
    g60: '#606060',
    g80: '#808080',
    gA0: '#A0A0A0',
    gC0: '#C0C0C0',
    gE0: '#E0E0E0',
    white: '#FFFFFF',
} as const;

/**
 * Design tokens of the app. Colors follow the ShadCN theme roles (background, primary, muted...)
 * but are taken from the gray scale above, with a color for each kind of notice: red for errors,
 * green for success and blue for warnings. Components read colors
 * and sizes from here and never hard-code them.
 */
export const colors = {
    background: palette.white,
    foreground: palette.g20,
    card: palette.white,
    primary: palette.g20,
    primaryForeground: palette.white,
    secondary: palette.gE0,
    secondaryForeground: palette.g20,
    muted: palette.gE0,
    mutedForeground: palette.g60,
    destructive: '#dc2626',
    destructiveForeground: palette.white,
    success: '#16a34a',
    warning: '#2563eb',
    border: palette.gC0,
    ring: palette.gA0,
} as const;

/** Corner radii: inputs and buttons use `md`, cards use `xl`. */
export const radius = {
    sm: 6,
    md: 8,
    lg: 10,
    xl: 14,
    full: 999,
} as const;

/** Spacing scale in dp, a 4-point grid like Tailwind's. */
export const spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
} as const;

/**
 * Fixed sizes in dp that are not spacing: the button and form control heights (the multiline one
 * is the minimum), icons, the box around a module icon, the avatar and the icon of the tab bar.
 */
export const sizes = {
    button: 40,
    control: 44,
    multilineControl: 88,
    icon: 24,
    tabIcon: 24,
    iconBox: 44,
    avatar: 64,
} as const;

/** Font sizes in dp. */
export const fontSize = {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 24,
} as const;

/**
 * Font families, one per weight because React Native cannot synthesize weights of a custom
 * font. They are loaded in App.tsx; to change the typeface, change these names and the import
 * there.
 */
export const fontFamily = {
    normal: 'Geom_400Regular',
    medium: 'Geom_500Medium',
    semibold: 'Geom_600SemiBold',
    bold: 'Geom_700Bold',
} as const;
