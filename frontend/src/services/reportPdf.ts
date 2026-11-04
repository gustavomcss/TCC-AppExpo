import fontkit from '@pdf-lib/fontkit';
import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Platform } from 'react-native';

import { buildReportHtml } from './reportDocument';
import type { ReportDocumentInput, ReportFontFace } from './reportDocument';
import { loadReportFonts } from './reportFonts';

/** A4 in points (72 per inch), the size of the page the PDF is printed on. */
const PAGE = { width: 595, height: 842 };

/** Page margin in points, for iOS, which takes it as an option; on Android the document asks for it with `@page`. */
const IOS_MARGIN = 40;

/** Thrown when the device has no way to share a file, so the PDF would be made for nothing. */
export class SharingUnavailableError extends Error {
    constructor() {
        super('sharing_unavailable');
    }
}

/**
 * File name of a report, with the day and the time it was issued: "TRACE-Relatorio-20261103-1835.pdf".
 * No accent, because some apps that receive the file mishandle it.
 */
function fileName(issuedAt: Date): string {
    const pad = (number: number) => String(number).padStart(2, '0');
    const day = `${issuedAt.getFullYear()}${pad(issuedAt.getMonth() + 1)}${pad(issuedAt.getDate())}`;

    return `TRACE-Relatorio-${day}-${pad(issuedAt.getHours())}${pad(issuedAt.getMinutes())}.pdf`;
}

/**
 * Writes "Página N de M" at the foot of every page of a printed PDF, in Geom when it is at hand.
 * The printer of the system cannot do it (it has no footer, and the total of pages is only known
 * once the whole document is printed), so the PDF is opened again and stamped. The footer sits in
 * the bottom margin, under the content. Takes and returns the file as base64.
 */
async function numberPages(base64: string, fonts: readonly ReportFontFace[]): Promise<string> {
    const pdf = await PDFDocument.load(base64);
    const geom = fonts.find((font) => font.weight === 400);

    pdf.registerFontkit(fontkit);
    const font = geom
        ? await pdf.embedFont(geom.base64, { subset: true })
        : await pdf.embedFont(StandardFonts.Helvetica);
    const pages = pdf.getPages();

    pages.forEach((page, index) => {
        const text = `Página ${index + 1} de ${pages.length}`;
        const size = 9;

        page.drawText(text, {
            x: (page.getWidth() - font.widthOfTextAtSize(text, size)) / 2,
            y: 20,
            size,
            font,
            color: rgb(0.376, 0.376, 0.376),
        });
    });

    return pdf.saveAsBase64();
}

/**
 * Gives the printed file a name the user can recognize in the share sheet and in the folder it is
 * saved to, since the printer names it with a random code. If the file cannot be written or
 * moved, the printed one is shared as it is.
 */
async function nameFile(printed: string, numbered: string | null, issuedAt: Date) {
    try {
        const file = new File(Paths.cache, fileName(issuedAt));

        if (numbered === null) {
            await new File(printed).move(file, { overwrite: true });
        } else {
            file.create({ overwrite: true });
            await file.write(numbered, { encoding: 'base64' });
        }

        return file.uri;
    } catch {
        return printed;
    }
}

/**
 * Makes the PDF of the financial report (RF22) and opens the share sheet with it, where the user
 * saves it to the device or sends it to another app. The document is built from the report the
 * screen shows (see `buildReportHtml`), so both have the same numbers, and it carries Geom and the
 * page numbers; if either step fails the PDF is still made, with the system font or without the
 * numbers. It resolves when the sheet is opened; whether the user went through with it is not
 * known. Rejects with `SharingUnavailableError` when the device cannot share files, and with the
 * error of the printer otherwise.
 */
export async function shareReportPdf(input: Omit<ReportDocumentInput, 'fonts'>): Promise<void> {
    if (!(await Sharing.isAvailableAsync())) {
        throw new SharingUnavailableError();
    }

    const fonts = await loadReportFonts().catch(() => []);
    const { uri, base64 } = await Print.printToFileAsync({
        html: buildReportHtml({ ...input, fonts }),
        ...PAGE,
        base64: true,
        margins:
            Platform.OS === 'ios'
                ? { top: IOS_MARGIN, right: IOS_MARGIN, bottom: IOS_MARGIN, left: IOS_MARGIN }
                : undefined,
    });
    const numbered = await numberPages(base64 ?? '', fonts).catch(() => null);

    await Sharing.shareAsync(await nameFile(uri, numbered, input.issuedAt), {
        mimeType: 'application/pdf',
        UTI: 'com.adobe.pdf',
        dialogTitle: 'Relatório financeiro',
    });
}
