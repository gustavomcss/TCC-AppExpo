import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, fontFamily, fontSize, palette, spacing } from '../theme';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';

/**
 * What the app says about personal data (LGPD): one heading and one short paragraph each. The
 * data listed are the ones the app really keeps: the profile (name, e-mail and photo), the
 * records the user makes and the odometer photos of the complaints. Deleting a user with records
 * is refused by the server (RB18), so the text says such a user is deactivated instead.
 */
const SECTIONS: readonly { heading: string; text: string }[] = [
    {
        heading: 'O que o TRACE guarda',
        text: 'Seu nome, seu e-mail e a foto de perfil (opcional); as rotas e os registros que você faz (km, abastecimento, troca de óleo e manutenção); e as fotos de hodômetro das denúncias de km.',
    },
    {
        heading: 'Para que serve',
        text: 'Só para a gestão operacional da frota da sua empresa.',
    },
    {
        heading: 'Quem vê',
        text: 'Você e os supervisores da sua empresa. O app não compartilha os dados com terceiros.',
    },
    {
        heading: 'Por quanto tempo',
        text: 'Enquanto a conta existir. A conta é criada e desativada pelo supervisor.',
    },
    {
        heading: 'Seus direitos',
        text: 'Para corrigir seus dados ou pedir a exclusão, fale com o seu supervisor. Quem tem registros vinculados é desativado em vez de excluído, para manter o histórico da empresa.',
    },
];

/** Props of PrivacySheet: the caller owns `visible` and closes the sheet from `onClose`. */
export type PrivacySheetProps = {
    visible: boolean;
    onClose: () => void;
};

/**
 * Bottom sheet with the privacy notice, opened from the footer of the login screen and from the
 * User tab. It is a notice, not a consent form: users are registered by the supervisor of the
 * company, so there is nothing to accept before using the app.
 */
export function PrivacySheet({ visible, onClose }: PrivacySheetProps) {
    return (
        <BottomSheet visible={visible} title="Privacidade dos dados" onClose={onClose}>
            <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
                {SECTIONS.map(({ heading, text }) => (
                    <View key={heading} style={styles.section}>
                        <Text style={styles.heading}>{heading}</Text>
                        <Text style={styles.text}>{text}</Text>
                    </View>
                ))}
            </ScrollView>
            <View style={styles.action}>
                <Button title="Entendi" onPress={onClose} />
            </View>
        </BottomSheet>
    );
}

/** Styles of PrivacySheet: the text scrolls inside the sheet and the button stays below it. */
const styles = StyleSheet.create({
    scroll: {
        flexShrink: 1,
    },
    content: {
        gap: spacing.lg,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
    },
    section: {
        gap: spacing.xs,
    },
    heading: {
        color: colors.foreground,
        fontFamily: fontFamily.semibold,
        fontSize: fontSize.base,
        lineHeight: 24,
    },
    text: {
        color: palette.g40,
        fontFamily: fontFamily.normal,
        fontSize: fontSize.sm,
        lineHeight: 20,
    },
    action: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
    },
});
