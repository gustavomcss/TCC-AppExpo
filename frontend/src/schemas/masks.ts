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

/** The mask with every digit at zero. */
const ZERO_DECIMAL = '000.000,00';

/**
 * Km and money mask, 000.000,00 (RB16). Digits enter from the right, as in a calculator: typing 9
 * shows 000.000,09, another 9 shows 000.000,99 and another one 000.009,99. Always shows the full
 * mask once there is a digit, and ignores digits past 999.999,99. Deleting from a nonzero value
 * shifts the digits back; deleting from 000.000,00 clears the field. `previous` is the text
 * the field held before this change, which tells a deletion from a typed zero.
 */
export function formatDecimalInput(text: string, previous = ''): string {
    if (!/\d/.test(text)) {
        return '';
    }

    const digits = text.replace(/\D/g, '').replace(/^0+/, '').slice(0, 8);

    if (digits === '') {
        return previous === ZERO_DECIMAL && text.length < previous.length ? '' : ZERO_DECIMAL;
    }

    const padded = digits.padStart(8, '0');
    return `${padded.slice(0, 3)}.${padded.slice(3, 6)},${padded.slice(6)}`;
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
