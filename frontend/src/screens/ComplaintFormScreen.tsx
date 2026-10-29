import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation } from '@react-navigation/native';
import { useMemo, useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { ActionBar } from '../components/ActionBar';
import { Button } from '../components/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/Card';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { FormScrollView } from '../components/FormScrollView';
import { NoticeDialog } from '../components/NoticeDialog';
import { OpenRouteCard } from '../components/OpenRouteCard';
import { PhotoField } from '../components/PhotoField';
import { PhotoSheet } from '../components/PhotoSheet';
import type { PhotoSource } from '../components/PhotoSheet';
import { TextField } from '../components/TextField';
import { useToast } from '../contexts/ToastContext';
import type { RootNavigation } from '../navigation/types';
import { createComplaintSchema } from '../schemas/complaint';
import type { ComplaintInput, ComplaintPhoto, ComplaintValues } from '../schemas/complaint';
import { formatDecimalInput, formatFileSize } from '../schemas/masks';
import { complaintMessageOverrides, createComplaint } from '../services/complaints';
import { CAMERA_DENIED_MESSAGE, pickImage } from '../services/photoPicker';
import type { OpenRoute } from '../services/routes';
import { applyServerError, hasFieldCode, isRuleError } from '../services/serverErrors';
import { colors, spacing } from '../theme';

/** Fields of the form, in the names the server uses, so its field errors can be matched. */
const FIELDS = ['km_complaint', 'photo'] as const;

/** Second line of the photo field: where the picture came from and its size, when known. */
function photoDetail(photo: ComplaintPhoto): string {
    const source = photo.source === 'camera' ? 'Câmera' : 'Galeria';
    return photo.size ? `${source} · ${formatFileSize(photo.size)}` : source;
}

/** Props of ComplaintFormScreen: the open route being reported and what to do when the screen is out of date. */
export type ComplaintFormScreenProps = {
    route: OpenRoute;
    /** Called when the server shows the screen no longer applies (a second complaint, a route no longer open). */
    onChanged: () => void;
};

/**
 * Km complaint form (RF14), the "Denúncia de km" module when the driver has an open route that has
 * no complaint yet. The route summary card shows the vehicle and the departure data, which come
 * from the route and cannot be changed. The form asks for the real km and for a photo of the odometer,
 * taken with the camera or picked from the gallery, both required and validated with Zod before
 * sending; the km must differ from the departure km (RB11). The valid form asks for a confirmation,
 * because a route takes a single complaint and it cannot be edited, and only the confirmed values
 * are sent. The complaint is created `pendente` and does not stop the route from being finalized
 * (RB05). On success it shows a toast and goes back. The server is the guarantee: a km equal to
 * the departure km goes to the field, and a second complaint or a route that is no longer open
 * open a notice and refresh the screen.
 */
export default function ComplaintFormScreen({ route, onChanged }: ComplaintFormScreenProps) {
    const navigation = useNavigation<RootNavigation>();
    const toast = useToast();
    const [failure, setFailure] = useState({ visible: false, title: '', message: '' });
    const [blocked, setBlocked] = useState<{ title: string; message: string } | null>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [confirmed, setConfirmed] = useState<ComplaintValues | null>(null);
    const pendingSource = useRef<PhotoSource | null>(null);
    const schema = useMemo(() => createComplaintSchema(route.kmDeparture), [route.kmDeparture]);
    const {
        control,
        handleSubmit,
        setError,
        setValue,
        formState: { errors },
    } = useForm<ComplaintInput, unknown, ComplaintValues>({
        resolver: zodResolver(schema),
        defaultValues: { km_complaint: '' },
    });

    const photo = useWatch({ control, name: 'photo' });

    /*
     * The form is validated first; the valid values wait for the driver to confirm, and are sent
     * once the dialog is gone (onHidden), because a failure opens another dialog and iOS cannot
     * present one over a Modal that is still on its way out.
     */
    const review = handleSubmit((values) => {
        setConfirmed(values);
        setConfirmOpen(true);
    });

    /*
     * Choosing a source only closes the sheet; the camera or the gallery opens when the sheet is
     * gone (onHidden), because iOS cannot present the picker over a Modal that is still closing:
     * the screen is left frozen behind it. The picture is kept whole, not cropped to a square.
     */
    function choose(source: PhotoSource) {
        pendingSource.current = source;
        setSheetOpen(false);
    }

    async function pickPhoto() {
        const source = pendingSource.current;
        pendingSource.current = null;
        if (!source) {
            return;
        }

        /* Removing brings the required error back at once; the field is empty again. */
        if (source === 'remove') {
            setValue('photo', undefined as unknown as ComplaintPhoto, { shouldValidate: true });
            return;
        }

        const picked = await pickImage(source, true);
        if (picked.status === 'denied') {
            setFailure({
                visible: true,
                title: 'Permissão necessária',
                message: CAMERA_DENIED_MESSAGE,
            });
            return;
        }
        if (picked.status === 'picked') {
            const { uri, fileName, fileSize } = picked.photo;
            setValue(
                'photo',
                {
                    uri,
                    name: fileName ?? uri.split('/').pop() ?? 'foto.jpg',
                    size: fileSize,
                    source,
                },
                { shouldValidate: true },
            );
        }
    }

    async function perform(values: ComplaintValues) {
        setSaving(true);
        try {
            await createComplaint(route.id, values);
            toast.show('success', 'Denúncia registrada.');
            navigation.goBack();
        } catch (error) {
            if (hasFieldCode(error, 'route_current', 'validation_not_unique')) {
                setBlocked({
                    title: 'Denúncia já enviada',
                    message: 'Já existe uma denúncia para esta rota. Só é permitida uma por rota.',
                });
                return;
            }
            if (hasFieldCode(error, 'route_current', 'route_not_open')) {
                setBlocked({
                    title: 'Rota não aberta',
                    message:
                        'A denúncia só pode ser enviada com uma rota aberta. O supervisor pode ter encerrado a rota.',
                });
                return;
            }

            const message = applyServerError(
                error,
                setError,
                FIELDS,
                complaintMessageOverrides(route.kmDeparture),
            );
            if (!message) {
                return;
            }
            setFailure({
                visible: true,
                title: isRuleError(error) ? 'Ação não permitida' : 'Não foi possível salvar',
                message,
            });
        } finally {
            setSaving(false);
        }
    }

    function cancelConfirm() {
        setConfirmed(null);
        setConfirmOpen(false);
    }

    function sendConfirmed() {
        if (confirmed) {
            setConfirmed(null);
            perform(confirmed);
        }
    }

    return (
        <View style={styles.screen}>
            <FormScrollView contentContainerStyle={styles.content}>
                <OpenRouteCard route={route} />

                <Card>
                    <CardHeader>
                        <CardTitle>Divergência de km</CardTitle>
                        <CardDescription>
                            Informe o km real do veículo no hodômetro e anexe uma foto do painel.
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <Controller
                            control={control}
                            name="km_complaint"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <TextField
                                    label="Km informado"
                                    placeholder="0,00"
                                    value={value}
                                    onChangeText={(text) =>
                                        onChange(formatDecimalInput(text, value))
                                    }
                                    onBlur={onBlur}
                                    error={errors.km_complaint?.message}
                                    keyboardType="number-pad"
                                    suffix="km"
                                    editable={!saving}
                                />
                            )}
                        />

                        <Controller
                            control={control}
                            name="photo"
                            render={({ field: { value } }) => (
                                <PhotoField
                                    label="Foto do painel"
                                    value={
                                        value && {
                                            uri: value.uri,
                                            name: value.name,
                                            detail: photoDetail(value),
                                        }
                                    }
                                    error={errors.photo?.message}
                                    onPress={() => setSheetOpen(true)}
                                    disabled={saving}
                                />
                            )}
                        />
                    </CardContent>
                </Card>
            </FormScrollView>

            <ActionBar>
                <Button title="Registrar denúncia" onPress={() => review()} loading={saving} />
            </ActionBar>

            <PhotoSheet
                visible={sheetOpen}
                title={photo ? 'Alterar foto' : 'Adicionar foto'}
                onClose={() => setSheetOpen(false)}
                onPick={choose}
                onHidden={pickPhoto}
                canRemove={Boolean(photo)}
            />
            <ConfirmDialog
                visible={confirmOpen}
                title="Registrar denúncia?"
                message="Confira o km informado e a foto do painel. Cada rota aceita uma só denúncia, e depois de enviada ela não poderá ser alterada."
                confirmLabel="Registrar denúncia"
                destructive={false}
                onConfirm={() => setConfirmOpen(false)}
                onCancel={cancelConfirm}
                onHidden={sendConfirmed}
            />
            <NoticeDialog
                visible={failure.visible}
                title={failure.title}
                message={failure.message}
                onClose={() => setFailure((previous) => ({ ...previous, visible: false }))}
            />
            <NoticeDialog
                visible={blocked !== null}
                title={blocked?.title ?? ''}
                message={blocked?.message ?? ''}
                onClose={() => setBlocked(null)}
                onHidden={onChanged}
            />
        </View>
    );
}

/** Styles of the complaint form: two cards on the same gray background as the other screens. */
const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.muted,
    },
    content: {
        flexGrow: 1,
        padding: spacing.lg,
        gap: spacing.lg,
    },
});
