<script lang="ts" setup>
import "maplibre-gl/dist/maplibre-gl.css";
import maplibregl, { Map as MaplibreMap, type StyleSpecification } from "maplibre-gl";
import type { Slide, SlideSection } from '@/services/slide_service';
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { basemaps, type Basemap } from '@/utils/map_utils';
import type { Layer } from '@/services/map_service';

const props = defineProps<{
    slide: Slide,
    section: SlideSection,
    sectionWidth: number,
    basemap?: keyof typeof basemaps,
    showframe?: boolean,
    shadow?: boolean
}>()

const currentBasemap = ref<keyof typeof basemaps>(props.basemap ?? 'esri');
const mapContainer = ref<HTMLDivElement | null>(null);
let map: MaplibreMap | null = null;


function rasterStyle(basemapKey: keyof typeof basemaps): StyleSpecification {

    const bmap = basemaps[basemapKey];

    // Guard agains the case where the basemap is a vector style instead of a raster tile source
    if (!('url' in bmap)) {
        throw new Error(`Basemap ${basemapKey} does not have a URL for raster tiles.`);
    }

    return {
        version: 8,
        sources: {
            basemap: {
                type: "raster",
                tiles: [bmap.url],
                tileSize: 256,
                attribution: bmap.attribution
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

function resolveStyle(key: keyof typeof basemaps): string | StyleSpecification {
    const b = basemaps[key];
    return 'style' in b ? b.style : rasterStyle(key);
}

async function addLayer(layer: Layer) {
    if (!map || !layer.uploaded) return;
    if (map.getLayer(layer.name)) return;

    if (layer.filetype === 'geojson') {
        const url = `${import.meta.env.VITE_API_BASE_URL}${layer.path}`;

        if (!map.getSource(layer.name)) {
            map.addSource(layer.name, {
                type: 'geojson',
                data: url,
            });
        }

        map.addLayer({
            id: layer.name,
            type: 'circle',
            source: layer.name,
            paint: {
                'circle-radius': 20,
                'circle-color': '#ff0000',
                'circle-stroke-width': 1,
                'circle-stroke-color': '#ffffff',
            },
        });
    }
}
onMounted(() => {
    if (!mapContainer.value) return;

    map = new maplibregl.Map({
        container: mapContainer.value,
        style: resolveStyle(currentBasemap.value),
        center: [13.350103005033793, 52.51451583081903], // [lng, lat] — reversed vs. Leaflet!
        zoom: 18,
        attributionControl: { compact: false }
    });
});

onUnmounted(() => {
    map?.remove();
    map = null;
});

watch(() => props.basemap, (newBasemap) => {
    if (newBasemap && newBasemap !== currentBasemap.value) {
        currentBasemap.value = newBasemap;
        if (map) {
            map.setStyle(resolveStyle(newBasemap));
        }
    }
})

watch(() => props.section.content, (newContent) => {
    if (!map) return;

    JSON.parse(newContent).layers.forEach((layer: Layer) => {
        addLayer(layer);
    });
});


</script>

<template>
    <div :style="{ width: slide.width * sectionWidth + 'px', height: slide.height + 'px' }">
        <div class="debuginfo">
            {{ section.content }}
        </div>
        <div ref="mapContainer" style="height: 100%; width: 100%;"></div>
    </div>
</template>

<style scoped>
.debuginfo {
    position: absolute;
    top: 0;
    left: 0;
    padding: 5px;
    z-index: 1000;
    font-size: 25pt;
    font-style: italic;
    max-width: 500px;
}

.basemap-indicator {
    position: absolute;
    font-size: 100px;
    font-weight: bold;
    color: var(--p-primary-800);
    text-transform: uppercase;
    top: 10px;
    left: 10px;
    background-color: rgba(255, 255, 255, 0.8);
    padding: 15px 15px;
    border-radius: 50px;
    z-index: 1
}
</style>