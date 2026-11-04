import Svg, { Circle, Line, Polygon, Polyline, Rect, Text as SvgText } from 'react-native-svg';

import type { Chart, Shape } from '../services/reportCharts';
import { fontFamily } from '../theme';

/** The font of each weight a chart text asks for. */
const FONTS = {
    400: fontFamily.normal,
    500: fontFamily.medium,
    600: fontFamily.semibold,
} as const;

/** One shape of a chart as an element of react-native-svg. */
function renderShape(shape: Shape, index: number) {
    switch (shape.type) {
        case 'rect':
            return (
                <Rect
                    key={index}
                    x={shape.x}
                    y={shape.y}
                    width={shape.width}
                    height={shape.height}
                    fill={shape.fill}
                />
            );
        case 'line':
            return (
                <Line
                    key={index}
                    x1={shape.x1}
                    y1={shape.y1}
                    x2={shape.x2}
                    y2={shape.y2}
                    stroke={shape.stroke}
                    strokeWidth={1}
                />
            );
        case 'polyline':
            return (
                <Polyline
                    key={index}
                    points={shape.points.map((point) => `${point.x},${point.y}`).join(' ')}
                    fill="none"
                    stroke={shape.stroke}
                    strokeWidth={shape.strokeWidth}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                />
            );
        case 'polygon':
            return (
                <Polygon
                    key={index}
                    points={shape.points.map((point) => `${point.x},${point.y}`).join(' ')}
                    fill={shape.fill}
                />
            );
        case 'circle':
            return <Circle key={index} cx={shape.cx} cy={shape.cy} r={shape.r} fill={shape.fill} />;
        case 'text':
            return (
                <SvgText
                    key={index}
                    x={shape.x}
                    y={shape.y}
                    textAnchor={shape.anchor}
                    fontSize={shape.size}
                    fontFamily={FONTS[shape.weight]}
                    fill={shape.fill}
                >
                    {shape.text}
                </SvgText>
            );
    }
}

/**
 * Draws a chart of the report (RF22) with react-native-svg, from the same shapes the PDF turns
 * into markup (see `chartToSvg`), so the two look alike. It fills the width it is given and
 * keeps the proportion of the drawing.
 */
export function ChartView({ chart }: { chart: Chart }) {
    return (
        <Svg
            style={{ width: '100%', aspectRatio: chart.width / chart.height }}
            viewBox={`0 0 ${chart.width} ${chart.height}`}
        >
            {chart.shapes.map(renderShape)}
        </Svg>
    );
}
