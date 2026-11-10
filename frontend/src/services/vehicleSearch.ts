import { pb } from './pocketbase';

/**
 * Alternatives of a vehicle search: the text must appear in the model or in the plate, found at
 * `vehicle` (the path to the relation). The plate may be typed whole or in part, with or without the
 * hyphen (see `plateSearchTexts`). Shared by the history, the report and the supervisor's lists,
 * which all search the same way.
 */
export function vehicleSearchMatches(vehicle: string, term: string): string[] {
    const matches = [pb.filter(`${vehicle}.model ~ {:term}`, { term })];

    for (const plate of plateSearchTexts(term)) {
        matches.push(pb.filter(`${vehicle}.plate ~ {:plate}`, { plate }));
    }

    return matches;
}

/**
 * The texts a plate search looks for, since the stored plate has its hyphen after the third
 * character (AAA-0A00) and the user types it with or without one, and may type only part of it.
 * The letters and digits typed are looked for as they are (inside either half of the plate) and,
 * when they may cross the hyphen, with the hyphen put in each position it could take: "4a01" finds
 * ZZZ-4A01, "zz4" finds it through "ZZ-4" and "abc1d" finds ABC-1D23.
 */
export function plateSearchTexts(term: string): string[] {
    const code = term.replace(/[^a-z0-9]/gi, '').toUpperCase();

    if (code === '') {
        return [];
    }

    const texts = [code];

    for (let left = 1; left <= 3 && left < code.length; left++) {
        if (code.length - left <= 4) {
            texts.push(`${code.slice(0, left)}-${code.slice(left)}`);
        }
    }

    return texts;
}

/**
 * Server filter of the search box of the supervisor's lists (route closure and complaint review):
 * the text must appear in the model or the plate of the vehicle (see `vehicleSearchMatches`) or in
 * the name of the driver. `vehicle` and `driver` are the paths to those relations. An empty text
 * gives an empty filter. Like the history, the server does not ignore accents here, only case.
 */
export function supervisorSearchFilter(vehicle: string, driver: string, text: string): string {
    const term = text.trim();

    if (term === '') {
        return '';
    }

    const matches = vehicleSearchMatches(vehicle, term);
    matches.push(pb.filter(`${driver}.name ~ {:term}`, { term }));

    return `(${matches.join(' || ')})`;
}
