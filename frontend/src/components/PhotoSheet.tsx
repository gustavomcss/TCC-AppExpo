import { Camera, Image, Trash2 } from 'lucide-react-native';

import { colors, sizes } from '../theme';
import { BottomSheet, SheetOption } from './BottomSheet';

/** What the user chose: a new picture from the camera or the gallery, or no picture at all. */
export type PhotoSource = 'camera' | 'library' | 'remove';

/**
 * Props of PhotoSheet: it asks for the source and reports the one chosen. The remove option is
 * offered only when `canRemove`, that is, when there is a photo to remove.
 */
export type PhotoSheetProps = {
    visible: boolean;
    title: string;
    onClose: () => void;
    onPick: (source: PhotoSource) => void;
    onHidden?: () => void;
    canRemove?: boolean;
};

/**
 * Sheet that offers the two ways to get a picture, camera or gallery, and to remove the current
 * one (RF04). It only asks: opening
 * the camera or the gallery, and the permission that needs, is up to the caller, who should wait
 * for `onHidden` before doing it.
 */
export function PhotoSheet({
    visible,
    title,
    onClose,
    onPick,
    onHidden,
    canRemove = false,
}: PhotoSheetProps) {
    return (
        <BottomSheet visible={visible} title={title} onClose={onClose} onHidden={onHidden}>
            <SheetOption
                label="Tirar foto"
                icon={<Camera color={colors.foreground} size={sizes.icon} />}
                onPress={() => onPick('camera')}
            />
            <SheetOption
                label="Escolher da galeria"
                icon={<Image color={colors.foreground} size={sizes.icon} />}
                onPress={() => onPick('library')}
            />
            {canRemove && (
                <SheetOption
                    label="Remover foto"
                    destructive
                    icon={<Trash2 color={colors.destructive} size={sizes.icon} />}
                    onPress={() => onPick('remove')}
                />
            )}
        </BottomSheet>
    );
}
