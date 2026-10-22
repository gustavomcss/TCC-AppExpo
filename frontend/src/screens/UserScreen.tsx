import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '../components/Avatar';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { useAuth } from '../contexts/AuthContext';
import type { SessionUser } from '../contexts/AuthContext';
import { colors, fontFamily, fontSize, spacing } from '../theme';

/** Role names as the user sees them. */
const ROLE_LABELS: Record<SessionUser['role'], string> = {
    motorista: 'Motorista',
    supervisor: 'Supervisor',
};

/**
 * User tab: who is signed in, and the way out. Photo and password change (the menu of the
 * prototype) come with I-12.
 */
export default function UserScreen() {
    const { user, signOut } = useAuth();
    const name = user?.name || user?.email || '';

    return (
        <View style={styles.screen}>
            <Card>
                <View style={styles.hero}>
                    <Avatar name={name} />
                    <View style={styles.texts}>
                        <View style={styles.identity}>
                            <Text style={styles.name}>{name}</Text>
                            <Text style={styles.email}>{user?.email}</Text>
                        </View>
                        {user && <Badge variant="secondary" label={ROLE_LABELS[user.role]} />}
                    </View>
                </View>
            </Card>

            <Button variant="outline" title="Sair" onPress={signOut} />
        </View>
    );
}

/**
 * Styles of the user screen. The text lines have blank leading above and below the letters, so
 * the gap inside the name and e-mail pair is smaller than the one before the badge, which has a
 * hard edge: that is what makes the three look evenly spaced.
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
});
