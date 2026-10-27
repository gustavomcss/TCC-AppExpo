import { useNavigation } from '@react-navigation/native';
import { Camera, ChevronRight, KeyRound } from 'lucide-react-native';
import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '../components/Avatar';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { NoticeDialog } from '../components/NoticeDialog';
import { PhotoSheet } from '../components/PhotoSheet';
import type { PhotoSource } from '../components/PhotoSheet';
import { useAuth } from '../contexts/AuthContext';
import type { SessionUser } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import type { RootNavigation } from '../navigation/types';
import { CAMERA_DENIED_MESSAGE, pickImage } from '../services/photoPicker';
import { removePhoto, updatePhoto } from '../services/profile';
import { isRuleError, parseServerError } from '../services/serverErrors';
import { colors, fontFamily, fontSize, palette, sizes, spacing } from '../theme';

/** Role names as the user sees them. */
const ROLE_LABELS: Record<SessionUser['role'], string> = {
    motorista: 'Motorista',
    supervisor: 'Supervisor',
};

/** Props of MenuRow: its icon and text, and what to show at the end while it is busy or not. */
type MenuRowProps = {
    icon: ReactNode;
    label: string;
    onPress: () => void;
    busy?: boolean;
    disabled?: boolean;
};

/** One 48 dp row of the menu card: icon, text and a chevron, or a spinner while it works. */
function MenuRow({ icon, label, onPress, busy = false, disabled = false }: MenuRowProps) {
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled, busy }}
            disabled={disabled}
            onPress={onPress}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        >
            {icon}
            <Text style={styles.rowLabel}>{label}</Text>
            {busy ? (
                <ActivityIndicator color={palette.g60} />
            ) : (
                <ChevronRight color={palette.g60} size={20} />
            )}
        </Pressable>
    );
}

/**
 * User tab (RF04): photo, name, e-mail and role of the signed-in user, read only except for the
 * photo (RB19), then the menu to change the photo and the password and the way out. The photo
 * comes from the camera or the gallery and goes to the server at once, and can be removed to go
 * back to the initials; the change shows as soon as the session record is refreshed. Changing the
 * password opens its own screen.
 */
export default function UserScreen() {
    const { user, signOut } = useAuth();
    const navigation = useNavigation<RootNavigation>();
    const toast = useToast();
    const [sheetOpen, setSheetOpen] = useState(false);
    const [signOutOpen, setSignOutOpen] = useState(false);
    const leaving = useRef(false);
    const [uploading, setUploading] = useState(false);
    const pendingSource = useRef<PhotoSource | null>(null);
    const [failure, setFailure] = useState({ visible: false, title: '', message: '' });
    const name = user?.name || user?.email || '';

    /* Signing out waits for the dialog to be gone: iOS cannot change screen under a closing Modal. */
    function confirmSignOut() {
        leaving.current = true;
        setSignOutOpen(false);
    }

    function signOutHidden() {
        if (leaving.current) {
            leaving.current = false;
            signOut();
        }
    }

    const fail = (title: string, message: string) => setFailure({ visible: true, title, message });

    /*
     * Choosing an option only closes the sheet; the camera or the gallery opens when the sheet is
     * gone (onHidden), and the removal runs then too, because iOS cannot present the picker over a Modal that is still closing:
     * the screen is left frozen behind it.
     */
    const choose = (source: PhotoSource) => {
        pendingSource.current = source;
        setSheetOpen(false);
    };

    const pickPhoto = async () => {
        const source = pendingSource.current;
        pendingSource.current = null;
        if (!user || !source) {
            return;
        }

        try {
            if (source === 'remove') {
                setUploading(true);
                await removePhoto(user.id);
                toast.show('success', 'Foto removida.');
                return;
            }

            const picked = await pickImage(source);
            if (picked.status === 'denied') {
                fail('Permissão necessária', CAMERA_DENIED_MESSAGE);
                return;
            }
            if (picked.status === 'canceled') {
                return;
            }

            setUploading(true);
            await updatePhoto(user.id, picked.photo);
            toast.show('success', 'Foto atualizada.');
        } catch (error) {
            const { fields, form } = parseServerError(error);
            fail(
                isRuleError(error) ? 'Ação não permitida' : 'Não foi possível salvar',
                fields.photo ?? form ?? 'Não foi possível salvar a foto. Tente novamente.',
            );
        } finally {
            setUploading(false);
        }
    };

    return (
        <View style={styles.screen}>
            <Card>
                <View style={styles.hero}>
                    <Avatar name={name} uri={user?.photoUrl} />
                    <View style={styles.texts}>
                        <View style={styles.identity}>
                            <Text style={styles.name}>{name}</Text>
                            <Text style={styles.email}>{user?.email}</Text>
                        </View>
                        {user && <Badge variant="secondary" label={ROLE_LABELS[user.role]} />}
                    </View>
                </View>
            </Card>

            <Card style={styles.menu}>
                <MenuRow
                    icon={<Camera color={colors.foreground} size={sizes.icon} />}
                    label="Trocar foto"
                    onPress={() => setSheetOpen(true)}
                    busy={uploading}
                    disabled={uploading}
                />
                <View style={styles.separator} />
                <MenuRow
                    icon={<KeyRound color={colors.foreground} size={sizes.icon} />}
                    label="Trocar senha"
                    onPress={() => navigation.navigate('ChangePassword')}
                />
            </Card>

            <Button variant="destructive" title="Sair" onPress={() => setSignOutOpen(true)} />

            <ConfirmDialog
                visible={signOutOpen}
                title="Sair da conta?"
                message="Você precisará entrar de novo para usar o app."
                confirmLabel="Sair"
                onConfirm={confirmSignOut}
                onCancel={() => setSignOutOpen(false)}
                onHidden={signOutHidden}
            />

            <PhotoSheet
                visible={sheetOpen}
                title="Trocar foto"
                onClose={() => setSheetOpen(false)}
                onPick={choose}
                onHidden={pickPhoto}
                canRemove={Boolean(user?.photoUrl)}
            />

            <NoticeDialog
                visible={failure.visible}
                title={failure.title}
                message={failure.message}
                onClose={() => setFailure((previous) => ({ ...previous, visible: false }))}
            />
        </View>
    );
}

/**
 * Styles of the user screen. The text lines have blank leading above and below the letters, so
 * the gap inside the name and e-mail pair is smaller than the one before the badge, which has a
 * hard edge: that is what makes the three look evenly spaced. The menu card has no padding of
 * its own, so the rows reach its edges.
 */
const styles = StyleSheet.create({
    screen: {
        flex: 1,
        gap: spacing.lg,
        backgroundColor: colors.muted,
        padding: spacing.lg,
    },
    hero: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.lg,
    },
    texts: {
        flex: 1,
        gap: spacing.sm,
        alignItems: 'flex-start',
    },
    identity: {
        gap: 2,
    },
    name: {
        color: colors.foreground,
        fontFamily: fontFamily.semibold,
        fontSize: fontSize.lg,
        lineHeight: 24,
        includeFontPadding: false,
    },
    email: {
        color: colors.mutedForeground,
        fontFamily: fontFamily.normal,
        fontSize: fontSize.sm,
        lineHeight: 20,
        includeFontPadding: false,
    },
    menu: {
        gap: 0,
        paddingVertical: 0,
    },
    row: {
        minHeight: 48,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    rowPressed: {
        opacity: 0.6,
    },
    rowLabel: {
        flex: 1,
        color: colors.foreground,
        fontFamily: fontFamily.medium,
        fontSize: fontSize.base,
        lineHeight: 24,
    },
    separator: {
        height: 1,
        backgroundColor: colors.secondary,
    },
});
