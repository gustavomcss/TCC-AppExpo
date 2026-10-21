import { StyleSheet, View } from 'react-native';

import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/Card';
import { useAuth } from '../contexts/AuthContext';
import type { SessionUser } from '../contexts/AuthContext';
import { colors, spacing } from '../theme';

/** Role names as the user sees them. */
const ROLE_LABELS: Record<SessionUser['role'], string> = {
    motorista: 'Motorista',
    supervisor: 'Supervisor',
};

/** Home screen shown after login. Placeholder until the tab navigation (I-10) replaces it. */
export default function HomeScreen() {
    const { user, signOut } = useAuth();

    return (
        <View style={styles.screen}>
            <Card>
                <CardHeader>
                    <CardTitle>Olá, {user?.name || user?.email}</CardTitle>
                    <CardDescription>{user?.email}</CardDescription>
                </CardHeader>

                <CardContent>
                    {user && <Badge variant="secondary" label={ROLE_LABELS[user.role]} />}
                    <Button variant="outline" title="Sair" onPress={signOut} />
                </CardContent>
            </Card>
        </View>
    );
}

/** Styles of the home screen. */
const styles = StyleSheet.create({
    screen: {
        flex: 1,
        justifyContent: 'center',
        backgroundColor: colors.muted,
        padding: spacing.xl,
    },
});
