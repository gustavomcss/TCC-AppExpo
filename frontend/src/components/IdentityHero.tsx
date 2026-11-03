import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '../theme';
import { Card, CardDescription, CardHeader, CardTitle } from './Card';

/**
 * Props of IdentityHero: what comes first (the photo of a person or the icon of a vehicle), the
 * title, an optional subtitle and the badge that says the situation or the role.
 */
export type IdentityHeroProps = {
    lead: ReactNode;
    title: string;
    subtitle?: string;
    badge?: ReactNode;
};

/**
 * Card that opens the screen of one person or vehicle: the photo or icon (64 dp, 80 dp on the profile) beside the title
 * and the subtitle, which sit together as in the header of every Card, and the badge under them.
 * The profile, the driver detail and the vehicle detail use it, so they keep the same spacing.
 */
export function IdentityHero({ lead, title, subtitle, badge }: IdentityHeroProps) {
    return (
        <Card>
            <View style={styles.hero}>
                {lead}
                <View style={styles.texts}>
                    <CardHeader>
                        <CardTitle>{title}</CardTitle>
                        {subtitle !== undefined && <CardDescription>{subtitle}</CardDescription>}
                    </CardHeader>
                    {badge}
                </View>
            </View>
        </Card>
    );
}

/** Styles of IdentityHero. */
const styles = StyleSheet.create({
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
});
