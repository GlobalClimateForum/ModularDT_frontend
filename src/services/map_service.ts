import { uploadApi } from "./api";
import { type SlideSection } from "@/services/slide_service";
import { basemaps } from '@/utils/map_utils';
import type { Marker } from '@/components/MapMarkerEditor.vue';

export interface Layer {
    id: number | null;
    name: string;
    file: File;
    filetype: 'geojson' | 'gpkg' | undefined
    marker?: Marker; // Optional marker property
    path: string; // Path to the uploaded file
    section: SlideSection; // Reference to the SlideSection this layer belongs to
    uploaded: boolean; // Flag to indicate if the layer has been uploaded
}

export interface MapProperties {
    basemap: keyof typeof basemaps;
    startPosition: [number, number]; // [longitude, latitude]
    layers: Layer[];
}

export function saveMapLayer(layer: Omit<Layer, "id">, sectionId: number): Promise<any> {
    
    // Create a FormData object to hold the file and other properties
    const form = new FormData();
    
    if (layer.file) form.append('file', layer.file);
    form.append('name', layer.name);
    if (layer.filetype) form.append('filetype', layer.filetype);
    console.log(layer.marker); 
    if (layer.marker) form.append('marker', JSON.stringify(layer.marker));
    form.append('section_id', sectionId.toString());
    return uploadApi.post('maps/layers/', form);
}