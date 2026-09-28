import type { Map as MaplibreMap } from 'maplibre-gl';
import type { Layer } from '@/services/map_service';
import type { Marker } from '@/components/MapMarkerEditor.vue';


const PREFIX = 'userlayer-' // a prefix for user-defined map layers

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

const asHex = (v: string) => (v.startsWith('#') ? v : '#' + v); // Helper to ensure a color string is in hexadecimal format, adding a '#' prefix if necessary.


// Helper to create an ImageData object represneting a emoji, which then can be used as a marker on the map
function emojiMarker(emoji: string, size = 64): ImageData {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.font = `${size * 0.8}px serif`;
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

    const base = import.meta.env.VITE_API_BASE_URL.replace(/\/+$/, '');
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
            const s = marker.type === 'dot' ? marker.style : DEFAULT_MARKER.style;
            map.addLayer({
                id,
                type: 'circle',
                source: id,
                paint: {
                    'circle-radius': s['circle-radius'],
                    'circle-color': asHex(s['circle-color']),
                    'circle-stroke-width': s['circle-stroke-width'],
                    'circle-stroke-color': asHex(s['circle-stroke-color']),
                },
            });
        }
    }
}

// Function to synchronize the map with the provided layers, clearing existing user-defined layers and adding the new ones.
export function syncLayers(map: MaplibreMap, layers: Layer[]) {
    clearUserLayers(map);
    for (const layer of layers) {
        console.log('sync', layer.name, layer.filetype, layer.uploaded, layer.path);
        if (!layer.uploaded || layer.filetype !== 'geojson') continue;
        try {
            addUserLayer(map, normalizeLayer(layer));
        } catch (e) {
            console.error(`Could not render layer "${layer.name}":`, e);
        }
    }
}