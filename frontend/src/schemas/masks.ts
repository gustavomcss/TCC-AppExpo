/** What each of the seven characters of a plate may be: three letters, a digit, a letter or digit, two digits. */
const PLATE_SLOTS = [/[A-Z]/, /[A-Z]/, /[A-Z]/, /\d/, /[A-Z0-9]/, /\d/, /\d/];

/**
 * Plate mask, AAA-0A00 (old and Mercosul formats). Uppercases, drops any character that does not
 * fit the next position and adds the hyphen after the third letter, so a plate is at most 8
 * characters (the limit of the `plate` field).
 */
export function formatPlate(text: string): string {
    const chars: string[] = [];

    for (const char of text.toUpperCase()) {
        const slot = PLATE_SLOTS[chars.length];
        if (!slot) {
            break;
        }
        if (slot.test(char)) {
            chars.push(char);
        }
    }

    const plate = chars.join('');
    return plate.length > 3 ? `${plate.slice(0, 3)}-${plate.slice(3)}` : plate;
}

/** What the field shows when the digits typed are all zeros. */
const ZERO_DECIMAL = '0,00';

/**
 * Km and money mask (RB16), like a bank app: the value is always read in cents and grows to the
 * left as digits are typed, so 1 shows 0,01, then 12 shows 0,12, 123 shows 1,23, 1234 shows
 * 12,34, and so on up to 999.999,99 (six integer digits and two decimals, the DECIMAL(8,2) of
 * the server). Digits past that are ignored. The field starts empty, with "0,00" only as the
 * placeholder, so the user always has to type the value. Typing a zero first shows 0,00; deleting
 * from 0,00 clears the field, and deleting from any other value shifts the digits back. `previous`
 * is the text the field held before this change, which tells a deletion from a typed zero.
 */
export function formatDecimalInput(text: string, previous = ''): string {
    if (!/\d/.test(text)) {
        return '';
    }

    const digits = text.replace(/\D/g, '').replace(/^0+/, '').slice(0, 8);

    if (digits === '') {
        return previous === ZERO_DECIMAL && text.length < previous.length ? '' : ZERO_DECIMAL;
    }

    const padded = digits.padStart(3, '0');
    const integer = padded.slice(0, -2).replace(/\B(?=(\d{3})+$)/g, '.');
    return `${integer},${padded.slice(-2)}`;
}

/**
 * Removes leading spaces and makes the first letter of every word uppercase, leaving the rest as
 * typed, so "onix plus" becomes "Onix Plus" and "hb20" becomes "Hb20". A trailing space is kept
 * so the next word can be typed.
 */
export function capitalizeWords(text: string): string {
    return text
        .trimStart()
        .replace(/(^|\s)(\S)/g, (_, space, letter) => space + letter.toUpperCase());
}

/**
 * Formats a km value read from the server for display in the same 000.000,00 shape as the input
 * mask, so every value has the same width: 50 is "000.000,50" and 999999.99 is "999.999,99".
 */
export function formatKm(value: number): string {
    const padded = String(Math.round(value * 100)).padStart(8, '0');
    return `${padded.slice(0, 3)}.${padded.slice(3, 6)},${padded.slice(6)}`;
}

/** Reads a date from the server ("2026-10-22 08:15:00.000Z") as a Date. */
function parseServerDate(value: string): Date {
    return new Date(value.replace(' ', 'T'));
}

/** Formats a date from the server as the user reads it in Brazil: "22/10/26, 08:15". */
export function formatDateTime(value: string): string {
    const date = parseServerDate(value);
    const pad = (number: number) => String(number).padStart(2, '0');

    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${pad(date.getFullYear() % 100)}, ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Formats a date from the server as the user reads it in Brazil, without the time: "22/10/2026". */
export function formatDate(value: string): string {
    const date = parseServerDate(value);
    const pad = (number: number) => String(number).padStart(2, '0');

    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

/** Formats the size of a file the way the user reads it: "1,2 MB" from 1 MB up, "340 KB" below. */
export function formatFileSize(bytes: number): string {
    if (bytes >= 1024 * 1024) {
        return `${(bytes / (1024 * 1024)).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`;
    }

    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
