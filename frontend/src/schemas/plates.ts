/** The Mercosul letter that stands for each digit of an old plate, from 0 to 9. */
const MERCOSUL_LETTERS = 'ABCDEFGHIJ';

/**
 * The same plate written in the other format (RB20): the fifth character is a digit in the old
 * format (ABC-1323) and the letter at that position of A..J in the Mercosul one (ABC-1D23).
 * Returns null for a plate that is not AAA-0A00 or whose letter is after J, which has no old
 * equivalent.
 */
export function equivalentPlate(plate: string): string | null {
    const parts = /^([A-Z]{3}-\d)([A-Z0-9])(\d{2})$/.exec(plate);
    if (!parts) {
        return null;
    }

    const [, head, middle, tail] = parts;
    if (/\d/.test(middle)) {
        return `${head}${MERCOSUL_LETTERS[Number(middle)]}${tail}`;
    }

    const digit = MERCOSUL_LETTERS.indexOf(middle);
    return digit < 0 ? null : `${head}${digit}${tail}`;
}
