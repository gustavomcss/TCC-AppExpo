import { Modal, StyleSheet, Text, View } from 'react-native';

import { colors, fontFamily, fontSize, palette, radius, spacing } from '../theme';
import { Button } from './Button';
import { useHiddenCallback } from './useHiddenCallback';

/**
 * Props of ConfirmDialog. `message` stays set by the caller while the dialog fades out, so that
 * the text does not vanish before the dialog does: hide it with `visible`. While `loading` the
 * confirm button shows it is working and neither button responds. `onHidden` is called once the
 * dialog is gone from the screen, for what must wait for that, such as opening another dialog:
 * iOS cannot present a Modal over one that is still on its way out.
 */
export type ConfirmDialogProps = {
    visible: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => void;
    onCancel: () => void;
    onHidden?: () => void;
    destructive?: boolean;
    loading?: boolean;
};

/**
 * Dialog that asks before an action that cannot be undone (RF03): a title, one sentence on what
 * happens, the confirm action first and "Cancelar" below it. The confirm button is red when the
 * action is destructive, so the color tells the risk, and the dialog never confirms by itself:
 * going back or pressing outside is a cancel. It is centered like NoticeDialog, which is the
 * dialog for when something went wrong.
 */
export function ConfirmDialog({
    visible,
    title,
    message,
    confirmLabel,
    onConfirm,
    onCancel,
    onHidden,
    destructive = true,
    loading = false,
}: ConfirmDialogProps) {
    const onDismiss = useHiddenCallback(visible, onHidden);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={loading ? undefined : onCancel}
            onDismiss={onDismiss}
        >
            <View style={styles.backdrop}>
                <View accessibilityViewIsModal style={styles.dialog}>
                    <View style={styles.header}>
                        <Text accessibilityRole="header" style={styles.title}>
                            {title}
                        </Text>
                        <Text style={styles.message}>{message}</Text>
                    </View>
                    <View style={styles.actions}>
                        <Button
                            variant={destructive ? 'destructive' : 'default'}
                            title={confirmLabel}
                            onPress={onConfirm}
                            loading={loading}
                        />
                        <Button
                            variant="outline"
                            title="Cancelar"
                            onPress={onCancel}
                            disabled={loading}
                        />
                    </View>
                </View>
            </View>
        </Modal>
    );
}

/** Styles of ConfirmDialog: the same box as NoticeDialog, with the actions stacked. */
const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        padding: spacing.xxl,
    },
    dialog: {
        width: '100%',
        maxWidth: 400,
        gap: spacing.lg,
        borderRadius: radius.xl,
        backgroundColor: colors.card,
        padding: spacing.xl,
    },
    header: {
        gap: spacing.sm,
    },
    title: {
        color: colors.foreground,
        fontFamily: fontFamily.semibold,
        fontSize: fontSize.lg,
        textAlign: 'center',
    },
    message: {
        color: palette.g40,
        fontFamily: fontFamily.normal,
        fontSize: fontSize.sm,
        lineHeight: 20,
        textAlign: 'center',
    },
    actions: {
        gap: spacing.sm,
    },
});
