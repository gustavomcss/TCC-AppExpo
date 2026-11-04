import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import type { ScrollViewProps } from 'react-native';

import { spacing } from '../theme';

/**
 * Scrollable body of a form screen that keeps clear of the keyboard, and keeps the field in focus
 * in sight, whichever field it is, on iOS and Android alike: it is the KeyboardAwareScrollView of
 * react-native-keyboard-controller (whose KeyboardProvider is in App.tsx), so the keyboard is
 * handled natively, with no measuring of ours, and in step with the keyboard animation. The
 * ActionBar below stays where it is and the keyboard covers it (on Android it hides instead), so
 * the main action is not reachable while typing, which also rules out a stray tap on it. Taps on
 * buttons inside still work with the keyboard open.
 */
export function FormScrollView(props: ScrollViewProps) {
    return (
        <KeyboardAwareScrollView
            keyboardShouldPersistTaps="handled"
            bottomOffset={spacing.lg}
            {...props}
        />
    );
}
