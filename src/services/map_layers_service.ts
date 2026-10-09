import type { Map as MaplibreMap } from 'maplibre-gl';
import { readGeoJSON, type Layer, type DotStyle, type Marker } from '@/services/map_service';
import type { ExpressionSpecification } from 'maplibre-gl';
import { API_BASE_URL } from '@/config'

const PREFIX = 'userlayer-' // a prefix for user-defined map layers

// Types for Layer Properties and PropertyInfo, which are used to describe the properties of a map layer and their types.
export type PropertyType = 'number' | 'string' | 'boolean' | 'mixed' | 'unknown';
export type PropertyInfo = { name: string; type: PropertyType };

// The default marker for user-defined map layers.
export const DEFAULT_MARKER: Extract<Marker, { type: 'dot' }> = {
    type: 'dot',
    value: '',
    category: '',
    style: {
        mode: 'circle',
        'circle-radius': 8,
        'circle-color': '#EF6F6C',
        'circle-stroke-width': 1,
        'circle-stroke-color': '#363946',
    },
};

// Small Helper function to generate a unique key for a given map layer, using a prefix and either the layer's ID or name. 
export function layerKey(layer: Layer): string {
    return `${PREFIX}${layer.id ?? layer.name}`;
}

// Helper function to normalize a map layer by ensuring its path uses forward slashes and providing a default marker if none is specified.
export function normalizeLayer(layer: Layer): Layer {
    return {
        ...layer,
        path: (layer.path ?? '').replace(/\\/g, '/'), // Normalize path to use forward slashes
        marker: layer.marker ?? DEFAULT_MARKER, // Use the default marker if none is provided
    }
}

// Small Helper to ensure a color string is in hexadecimal format, adding a '#' prefix if necessary.
const asHex = (v: string) => (v.startsWith('#') ? v : '#' + v); // Helper to ensure a color string is in hexadecimal format, adding a '#' prefix if necessary.

// Small Helper to generate a URL for a given layer's path, ensuring it is absolute and correctly formatted.
export function layerUrl(path: string): string {
    const API_BASE = API_BASE_URL.replace(/\/+$/, ''); // Get the API base URL from environment variables and remove any trailing slashes
    return /^(blob:|https?:)/.test(path) ? path : `${API_BASE}/${path.replace(/^\//, '')}`;
}

// Helper to create an ImageData object represneting a emoji, which then can be used as a marker on the map
function emojiMarker(emoji: string, size = 64): ImageData {
    const canvas = document.createElement('canvas'); // Init a new canvas element to draw the emoji
    canvas.width = canvas.height = size; // Set the canvas size to the specified size (default is 64x64 pixels)
    const ctx = canvas.getContext('2d'); // Get the 2D rendering context for the canvas
    ctx.font = `${size * 0.8}px serif`; // Set the font size to 80% of the canvas size and use a serif font
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, size / 2, size / 2);
    return ctx.getImageData(0, 0, size, size);
}

// Helper function to clear all user-defined layers from the map.
function clearUserLayers(map: MaplibreMap) {
    const style = map.getStyle();
    // Layers first: a source can't be removed while a layer still uses it.
    for (const l of style.layers ?? []) if (l.id.startsWith(PREFIX)) map.removeLayer(l.id);
    for (const id of Object.keys(style.sources ?? {})) if (id.startsWith(PREFIX)) map.removeSource(id);
    for (const id of map.listImages()) if (id.startsWith(PREFIX)) map.removeImage(id);
}

// Function to add a user-defined layer to the map
function addUserLayer(map: MaplibreMap, layer: Layer) {

    const id = layerKey(layer); // Get the unique key for the layer
    const marker = layer.marker ?? DEFAULT_MARKER; // Use the default marker if none is specified

    const base = API_BASE_URL.replace(/\/+$/, '');
    const path = layer.path.replace(/^\/+/, '');

    map.addSource(id, { type: 'geojson', data: `${base}/${path}` }); // Add new geojson source to the map using the layer's path

    // Handle different marker types
    switch (marker.type) {
        case 'emoji':
            map.addImage(id, emojiMarker(marker.value), { pixelRatio: 2 });
            map.addLayer({
                id,
                type: 'symbol',
                source: id,
                layout: { 'icon-image': id, 'icon-allow-overlap': true },
            });
            break;

        case 'dot':
        default: {
            const m = marker.type === 'dot' ? marker : DEFAULT_MARKER;
            map.addLayer({
                id,
                type: 'circle',
                source: id,
                paint: {
                    'circle-radius': ruleExpr(m, 'circle-radius'),
                    'circle-color': ruleExpr(m, 'circle-color', asHex),
                    'circle-stroke-width': ruleExpr(m, 'circle-stroke-width'),
                    'circle-stroke-color': ruleExpr(m, 'circle-stroke-color', asHex),
                },
            });
        }
    }
}

// Function to synchronize the map with the provided layers, clearing existing user-defined layers and adding the new ones.
export async function syncLayers(map: MaplibreMap, layers: Layer[]) {
    clearUserLayers(map);
    for (const layer of layers) {
        console.log('sync', layer.name, layer.filetype, layer.uploaded, layer.path);
        if (!layer.uploaded || layer.filetype !== 'geojson') continue;
        try {
            await addUserLayer(map, await normalizeLayer(layer));
        } catch (e) {
            console.error(`Could not render layer "${layer.name}":`, e);
        }
    }
}

// Helper function to determine the type of a property value, returning a PropertyType string.
function typeOf(value: unknown): PropertyType | null {
    if (value === null || value === undefined || value === '') return null; // ignore empty values
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'string') return 'string';
    return 'mixed'; // objects/arrays
}

export async function getProperties(source: File | Layer): Promise<PropertyInfo[]> {
    const geojson = await readGeoJSON(source);
    if (geojson?.type !== 'FeatureCollection') return [];

    const types = new Map<string, PropertyType>();
    for (const feature of geojson.features ?? []) {
        for (const [key, value] of Object.entries(feature.properties ?? {})) {
            const t = typeOf(value);
            const current = types.get(key);
            if (t === null) {
                if (!current) types.set(key, 'unknown');
            } else if (!current || current === 'unknown') {
                types.set(key, t);
            } else if (current !== t) {
                types.set(key, 'mixed');
            }
        }
    }

    return [...types].map(([name, type]) => ({ name, type }));
}

// Transform a marker's style into a mapLibre expression, which can be used to style the marker based on its properties and rules.
function ruleExpr<K extends keyof DotStyle>(m: Marker & { type: 'dot' }, key: K, fmt = (v: any) => v): any {
    const cases = (m.rules ?? []).flatMap(r => {
        if (!(key in r.style)) return [];
        const conds = r.conditions
            .filter(c => c.property?.name)
            .map(c => [c.op, ['get', c.property.name], c.value]);
        return conds.length ? [['all', ...conds], fmt(r.style[key])] : [];
    });
    const base = fmt(m.style[key]);
    return cases.length ? ['case', ...cases, base] : base;
}