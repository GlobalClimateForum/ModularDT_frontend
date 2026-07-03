<script lang="ts" setup>
import "maplibre-gl/dist/maplibre-gl.css";
import maplibregl, { Map as MaplibreMap, type StyleSpecification } from "maplibre-gl";
import type { Slide, SlideSection } from '@/services/slide_service';
import { ref, onMounted, onUnmounted, watch } from 'vue';

const props = defineProps<{
    slide: Slide,
    section: SlideSection,
    sectionWidth: number
    showframe?: boolean
    shadow?: boolean
}>()

const selectedBasemap = ref<keyof typeof basemaps>('carto_light');
const mapContainer = ref<HTMLDivElement | null>(null);
let map: MaplibreMap | null = null;

const basemaps = {
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
    }
} as const;


function rasterStyle(basemapKey: keyof typeof basemaps): StyleSpecification {
    const basemap = basemaps[basemapKey];
    return {
        version: 8,
        sources: {
            basemap: {
                type: "raster",
                tiles: [basemap.url],
                tileSize: 256,
                attribution: basemap.attribution
            }
        },
        layers: [
            {
                id: "basemap",
                type: "raster",
                source: "basemap"
            }
        ]
    };
}

onMounted(() => {
    if (!mapContainer.value) return;

    map = new maplibregl.Map({
        container: mapContainer.value,
        style: rasterStyle(selectedBasemap.value),
        center: [13.350103005033793, 52.51451583081903], // [lng, lat] — reversed vs. Leaflet!
        zoom: 18,
        attributionControl: { compact: false }
    });
});


watch(selectedBasemap, (key) => {
    map?.setStyle(rasterStyle(key));
});

onUnmounted(() => {
    map?.remove();
    map = null;
});
</script>

<template>
    <div :style="{ width: slide.width * sectionWidth + 'px', height: slide.height + 'px' }">
        <div ref="mapContainer" style="height: 100%; width: 100%;"></div>
    </div>
</template>

<style scoped></style>