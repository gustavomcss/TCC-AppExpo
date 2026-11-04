/** One shape of an icon: a path or a circle, with the attributes the Lucide set gives it. */
type IconShape = { tag: 'path'; d: string } | { tag: 'circle'; cx: number; cy: number; r: number };

/**
 * The drawing of each vehicle type, copied from the Lucide icons the app shows on screen
 * (`VEHICLE_TYPE_ICONS`: Motorbike, Car, Van and Truck, 24 x 24), so the PDF has the same icons.
 * It lives here, apart from the components, because the document is built without React Native.
 */
const VEHICLE_ICON_SHAPES: Record<string, readonly IconShape[]> = {
    moto: [
        { tag: 'path', d: 'm18 14-1-3' },
        { tag: 'path', d: 'm3 9 6 2a2 2 0 0 1 2-2h2a2 2 0 0 1 1.99 1.81' },
        {
            tag: 'path',
            d: 'M8 17h3a1 1 0 0 0 1-1 6 6 0 0 1 6-6 1 1 0 0 0 1-1v-.75A5 5 0 0 0 17 5',
        },
        { tag: 'circle', cx: 19, cy: 17, r: 3 },
        { tag: 'circle', cx: 5, cy: 17, r: 3 },
    ],
    carro: [
        {
            tag: 'path',
            d: 'M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2',
        },
        { tag: 'circle', cx: 7, cy: 17, r: 2 },
        { tag: 'path', d: 'M9 17h6' },
        { tag: 'circle', cx: 17, cy: 17, r: 2 },
    ],
    van: [
        {
            tag: 'path',
            d: 'M13 6v5a1 1 0 0 0 1 1h6.102a1 1 0 0 1 .712.298l.898.91a1 1 0 0 1 .288.702V17a1 1 0 0 1-1 1h-3',
        },
        {
            tag: 'path',
            d: 'M5 18H3a1 1 0 0 1-1-1V8a2 2 0 0 1 2-2h12c1.1 0 2.1.8 2.4 1.8l1.176 4.2',
        },
        { tag: 'path', d: 'M9 18h5' },
        { tag: 'circle', cx: 16, cy: 18, r: 2 },
        { tag: 'circle', cx: 7, cy: 18, r: 2 },
    ],
    caminhao: [
        { tag: 'path', d: 'M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2' },
        { tag: 'path', d: 'M15 18H9' },
        {
            tag: 'path',
            d: 'M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14',
        },
        { tag: 'circle', cx: 17, cy: 18, r: 2 },
        { tag: 'circle', cx: 7, cy: 18, r: 2 },
    ],
};

/**
 * Inline SVG of the icon of a vehicle type, drawn in the current text color (`currentColor`) with
 * the same stroke as the Lucide icons on screen. An unknown type has no icon and gives an empty
 * string.
 */
export function vehicleIconSvg(type: string, size: number): string {
    const shapes = VEHICLE_ICON_SHAPES[type];

    if (!shapes) {
        return '';
    }

    const body = shapes
        .map((shape) =>
            shape.tag === 'path'
                ? `<path d="${shape.d}"/>`
                : `<circle cx="${shape.cx}" cy="${shape.cy}" r="${shape.r}"/>`,
        )
        .join('');

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
}
