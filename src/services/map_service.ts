import { uploadApi, api } from "./api";
import { type SlideSection } from "@/services/slide_service";
import { basemaps } from '@/utils/map_utils';
import type { LocationParameter } from '@/services/slide_service';

export interface Layer {
    id: number | null;
    name: string;
    file: File;
    filetype: 'geojson' | 'gpkg' | undefined
    marker?: Marker; // Optional marker property
    path: string; // Path to the uploaded file
    section: SlideSection; // Reference to the SlideSection this layer belongs to
    uploaded: boolean; // Flag to indicate if the layer has been uploaded
    vectorType?: 'point' | 'line' | 'polygon' | 'unknown'; // Optional vector type property
}

export interface MapProperties {
    basemap: keyof typeof basemaps;
    startPosition: [number, number]; // [longitude, latitude]
    startZoom: number; // Zoom level
    layers: Layer[];
    positions: { position: [number, number]; zoom: number; name: string }[];
}

export type Marker =
    | { type: 'dot'; value: string; category: string; rules?:Rule[], style: { mode: 'circle'; 'circle-radius': number; 'circle-color': string; 'circle-stroke-width': number; 'circle-stroke-color': string } }
    | { type: 'emoji'; value: string; category: string; style: { mode: 'symbol'; value: string; 'text-size': number; } }
    | { type: 'html'; value: string; category: string; style: { mode: 'html'; value: string; size: number } };

export type DotStyle = Extract<Marker, { type: 'dot' }>['style']; // Extract the style type from the 'dot' marker type and define it as DotStyle
export type Condition = { property: string; op: '==' | '!=' | '>' | '<' | '>=' | '<='; value: string };
export type Rule = { conditions: Condition[]; style: Partial<DotStyle> };
export type ColorKey = 'circle-color' | 'circle-stroke-color';

export interface MapHandle {
    getCurrentMapPosition: () => { center: [number, number]; zoom: number } | null;
    updateMapPosition: (center: [number, number], zoom: number) => void;
    flyToPosition: (center: [number, number], zoom: number) => void;
    jumpToPosition: (center: [number, number], zoom: number) => void;
}

const mapRegistry = new Map<number, MapHandle>()

export function registerMap(sectionId: number, mapHandle: MapHandle) {
    mapRegistry.set(sectionId, mapHandle);
}

export function unregisterMap(sectionId: number) {
    mapRegistry.delete(sectionId);
}

export function getMap(sectionId: number): MapHandle | undefined {
    return mapRegistry.get(sectionId);
}

export function saveMapLayer(layer: Omit<Layer, "id">, sectionId: number): Promise<any> {
    const form = new FormData();

    const fields: Record<string, string | Blob | undefined> = {
        file: layer.file,
        name: layer.name,
        filetype: layer.filetype,
        marker: layer.marker ? JSON.stringify(layer.marker) : undefined,
        section_id: String(sectionId),
        vectorType: layer.vectorType
    };

    for (const [key, value] of Object.entries(fields)) {
        if (value !== undefined && value !== null) form.append(key, value);
    }

    return uploadApi.post('maps/layers/', form);
}

export function identifyVectorType(file: File): Promise<'point' | 'line' | 'polygon' | 'unknown'> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target?.result as string;
                const geojson = JSON.parse(text);
                if (geojson.type === 'FeatureCollection' && geojson.features.length > 0) {
                    const geometryType = geojson.features[0].geometry.type;

                    switch (geometryType) {
                        case 'Point':
                            resolve('point');
                            break;
                        case 'MultiPoint':
                            resolve('point');
                            break;
                        case 'LineString':
                            resolve('line');
                            break;
                        case 'MultiLineString':
                            resolve('line');
                            break;
                        case 'Polygon':
                            resolve('polygon');
                            break;
                        case 'MultiPolygon':
                            resolve('polygon');
                            break;
                        default:
                            resolve('unknown');
                    }
                } else {
                    resolve('unknown');
                }
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsText(file);
    });
}

export async function localMapLayer() {
    const response = await api.get('maps/layers/');
    const data = response.data;
    console.log("Fetched Existing Layer", data)
    return data.map((layer: any) => ({
        id: layer.id,
        name: layer.path.split('/').pop() ?? layer.name,
        filetype: layer.filetype,
        path: layer.path,
        marker: layer.marker,
        vectorType: layer.vectorType
    }));
}

// --- Marker Previews ------------------------------------------------------
export function dotMarkerPreview(style?: Partial<DotStyle>) {
    if (!style) return {};
    return {
        width: (style['circle-radius'] ?? 0) * 2 + 'px',
        height: (style['circle-radius'] ?? 0) * 2 + 'px',
        backgroundColor: asHexValue(style['circle-color'] ?? ''),
        border: `${style['circle-stroke-width'] ?? 0}px solid ${asHexValue(style['circle-stroke-color'] ?? '')}`,
    };
}

export function asHexValue(value: string) {
    return value.startsWith('#') ? value : '#' + value;
}