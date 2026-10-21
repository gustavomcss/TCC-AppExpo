import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/Card';
import { useAuth } from '../contexts/AuthContext';
import type { SessionUser } from '../contexts/AuthContext';
import { colors, spacing } from '../theme';
import ExampleFormScreen from './ExampleFormScreen';

/** Role names as the user sees them. */
const ROLE_LABELS: Record<SessionUser['role'], string> = {
    motorista: 'Motorista',
    supervisor: 'Supervisor',
};

/**
 * Home screen shown after login. Placeholder until the tab navigation (I-10) replaces it, and
 * so is the link to the example form (I-08).
 */
export default function HomeScreen() {
    const { user, signOut } = useAuth();
    const [showExample, setShowExample] = useState(false);

    if (showExample) {
        return <ExampleFormScreen onClose={() => setShowExample(false)} />;
    }

    return (
        <View style={styles.screen}>
            <Card>
                <CardHeader>
                    <CardTitle>Olá, {user?.name || user?.email}</CardTitle>
                    <CardDescription>{user?.email}</CardDescription>
                </CardHeader>

                <CardContent>
                    {user && <Badge variant="secondary" label={ROLE_LABELS[user.role]} />}
                    <Button
                        variant="secondary"
                        title="Formulário de exemplo"
                        onPress={() => setShowExample(true)}
                    />
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
