import {
    Geom_400Regular,
    Geom_500Medium,
    Geom_600SemiBold,
    Geom_700Bold,
} from '@expo-google-fonts/geom';
import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';

import type { ReportFontFace } from './reportDocument';

/** The Geom files the app already ships, by the weight the document asks for. */
const SOURCES: readonly { weight: number; module: number }[] = [
    { weight: 400, module: Geom_400Regular },
    { weight: 500, module: Geom_500Medium },
    { weight: 600, module: Geom_600SemiBold },
    { weight: 700, module: Geom_700Bold },
];

/** Read once: the files do not change while the app runs. */
let loaded: Promise<ReportFontFace[]> | null = null;

/**
 * Reads the Geom font files as base64, which is how the PDF carries them: the page is printed by a
 * WebView that cannot reach the files of the app, so the fonts travel inside the HTML. Resolves
 * once and keeps the result; if reading fails, the next call tries again.
 */
export function loadReportFonts(): Promise<ReportFontFace[]> {
    loaded ??= Promise.all(
        SOURCES.map(async ({ weight, module }) => {
            const asset = Asset.fromModule(module);
            await asset.downloadAsync();

            return { weight, base64: await new File(asset.localUri ?? asset.uri).base64() };
        }),
    ).catch((error) => {
        loaded = null;
        throw error;
    });

    return loaded;
}
