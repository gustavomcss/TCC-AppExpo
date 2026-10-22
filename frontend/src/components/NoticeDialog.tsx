import { Modal, StyleSheet, Text, View } from 'react-native';

import { colors, fontFamily, fontSize, radius, spacing } from '../theme';
import { Button } from './Button';

/**
 * Props of NoticeDialog. `message` stays set by the caller while the dialog fades out, so that
 * the text does not vanish before the dialog does: hide it with `visible`.
 */
export type NoticeDialogProps = {
    visible: boolean;
    message: string;
    onClose: () => void;
    title?: string;
};

/**
 * Standard dialog for when something went wrong (RNF03): the backend refused an action by a
 * rule, such as a vehicle that already has an open route, or the save failed. It is a dialog and
 * not an inline alert because it concerns the whole action, so the user reads it and
 * acknowledges it before going on. Everything in it is centered, as it sits in the middle of the
 * screen. The default title is the one of a refused rule.
 */
export function NoticeDialog({
    visible,
    message,
    onClose,
    title = 'Ação não permitida',
}: NoticeDialogProps) {
    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.backdrop}>
                <View accessibilityViewIsModal style={styles.dialog}>
                    <Text accessibilityRole="header" style={styles.title}>
                        {title}
                    </Text>
                    <Text style={styles.message}>{message}</Text>
                    <Button title="Entendi" onPress={onClose} />
                </View>
            </View>
        </Modal>
    );
}

/** Styles of NoticeDialog. */
const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        padding: spacing.xl,
    },
    dialog: {
        width: '100%',
        maxWidth: 400,
        gap: spacing.lg,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.xl,
        backgroundColor: colors.card,
        padding: spacing.xl,
    },
    title: {
        color: colors.destructive,
        fontFamily: fontFamily.semibold,
        fontSize: fontSize.lg,
        textAlign: 'center',
    },
    message: {
        color: colors.mutedForeground,
        fontFamily: fontFamily.normal,
        fontSize: fontSize.sm,
        textAlign: 'center',
    },
});
