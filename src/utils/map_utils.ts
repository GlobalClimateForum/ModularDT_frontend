export interface BaseFields  {
    name: string; 
    attribution: string;
}

export type Basemap = BaseFields & (
    | { url: string; style?: never }
    | { style: string; url?: never }
);

export const basemaps = {
    esri: {
        name: "Esri World Imagery",
        attribution: "Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community",
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
    },
    carto_light: {
        name: "CARTO Light",
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        url: "https://d.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"
    },
    carto_dark: {
        name: "CARTO Dark",
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        url: "https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
    },
    carto_light_nolabels: {
        name: "CARTO Light (no labels)",
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        url: "https://d.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png"
    },
    carto_light_only_labels: {
        name: "CARTO Light (only labels)",
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        url: "https://d.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png"
    },
    carto_dark_nolabels: {
        name: "CARTO Dark (no labels)",
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        url: "https://d.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png"
    },
    carto_dark_only_labels: {
        name: "CARTO Dark (only labels)",
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        url: "https://d.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}.png"
    },
    carto_voyager: {
        name: "CARTO Voyager",
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        url: "https://d.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
    },
    carto_voyager_nolabels: {
        name: "CARTO Voyager (no labels)",
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        url: "https://d.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}.png"
    },
    carto_voyager_only_labels: {
        name: "CARTO Voyager (only labels)",
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        url: "https://d.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}.png"
    },
    carto_voyager_labels_under: {
        name: "CARTO Voyager (labels under)",
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        url: "https://d.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}.png"
    },
    openfreemap_bright: {
        name: "OpenFreemap Bright",
        attribution: 'OpenFreeMap © OpenMapTiles Data from OpenStreetMap',
        style: "https://tiles.openfreemap.org/styles/liberty"
    },
    openfreemap_liberty: {
        name: "OpenFreemap Liberty",
        attribution: 'OpenFreeMap © OpenMapTiles Data from OpenStreetMap',
        style: "https://tiles.openfreemap.org/styles/liberty"
    }, 
    openfreemap_fiord: {
        name: "OpenFreemap Fiord",
        attribution: 'OpenFreeMap © OpenMapTiles Data from OpenStreetMap',
        style: "https://tiles.openfreemap.org/styles/fiord"
    },
    openfreemap_positron: {
        name: "OpenFreemap Positron",
        attribution: 'OpenFreeMap © OpenMapTiles Data from OpenStreetMap',
        style: "https://tiles.openfreemap.org/styles/positron"
    },
    google_satellite: {
        name: "Google Satellite",
        attribution: '&copy; <a href="https://www.google.com/maps">Google Maps</a>',
        url: "https://mt0.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
    },
    versatile_colerful: {
        name: "Versatile Colorful",
        attribution: 'OpenFreeMap © OpenMapTiles Data from OpenStreetMap',
        style: "https://tiles.versatiles.org/assets/styles/colorful/style.json"
    }
} satisfies Record<string, Basemap>;