import * as ImagePicker from 'expo-image-picker';

import type { PickedPhoto } from './profile';

/** Options of the pick, shared by the camera and the gallery: a square crop, already compressed. */
const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
};

/** Text for when the camera permission is refused, which only the device settings can undo. */
export const CAMERA_DENIED_MESSAGE =
    'Permita o uso da câmera nas configurações do aparelho para tirar a foto.';

/** What a pick ended in: a picture, the user backing out, or the camera permission refused. */
export type PickResult =
    { status: 'picked'; photo: PickedPhoto } | { status: 'canceled' } | { status: 'denied' };

/**
 * Opens the camera (asking for its permission first) or the gallery and returns what the user
 * chose. It only picks: sending the picture is up to the caller. On iOS the caller must wait for
 * the sheet that asked to be gone before calling this, or the screen is left frozen.
 */
export async function pickImage(source: 'camera' | 'library'): Promise<PickResult> {
    if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
            return { status: 'denied' };
        }
    }

    const result =
        source === 'camera'
            ? await ImagePicker.launchCameraAsync(PICKER_OPTIONS)
            : await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);

    return result.canceled ? { status: 'canceled' } : { status: 'picked', photo: result.assets[0] };
}
