import { uploadApi } from "./api";


export interface MapLayer {
    id: number;
    name: string;
    file?: File;
    filetype?: 'geojson' | 'gpkg' | undefined;
    path?: string;
    marker?: object;
}

export type Marker = { type: 'icon' | 'emoji'; value: string; category: string };


export function saveMapLayer(layer: Omit<MapLayer, "id">) {
    
    // Create a FormData object to hold the file and other properties
    const form = new FormData();
    
    
    if (layer.file) form.append('file', layer.file);
    form.append('name', layer.name);
    if (layer.filetype) form.append('filetype', layer.filetype);
    console.log(layer.marker); 
    if (layer.marker) form.append('marker', JSON.stringify(layer.marker));
    return uploadApi.post('maps/layers/', form);
}