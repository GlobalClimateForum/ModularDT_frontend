

export interface Layout {
    id: string;
    label: string;
    widths: number[];
    fractions: number[];
}

export const layouts: Layout[] = [
    { id: 'fullscreen', label: 'fullscreen', widths: [1], fractions: [12] },
    { id: 'fiftyfifty', label: '1:1', widths: [0.5, 0.5], fractions: [6, 6] },
    { id: 'golden', label: '3:2', widths: [0.6, 0.4], fractions: [8, 4] },
    { id: 'reversegolden', label: '2:3', widths: [0.4, 0.6], fractions: [4, 8] },
    { id: 'thirds', label: '1|3 each', widths: [1 / 3, 1 / 3, 1 / 3], fractions: [4, 4, 4] },
]


// Helper function to check if two arrays of widths match within a certain tolerance
function matchLayoutWidths( widths: number[], expectedWidths: number[], tolerance = 0.01) : boolean{
    return widths.length === expectedWidths.length && widths.every((w, i) => Math.abs(w - expectedWidths[i]) < tolerance)
}

// Exported function to identify the layout type based on the provided widths
export function identifyLayoutType(widths:number[]) : string {
    const layout = layouts.find(l => matchLayoutWidths(widths, l.widths));
    return layout ? layout.id : 'custom';
}