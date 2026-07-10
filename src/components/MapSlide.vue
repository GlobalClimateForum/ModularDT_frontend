<script lang="ts" setup>
import "maplibre-gl/dist/maplibre-gl.css";
import maplibregl, { Map as MaplibreMap, type StyleSpecification } from "maplibre-gl";
import type { Slide, SlideSection } from '@/services/slide_service';
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { basemaps, type Basemap } from '@/utils/map_utils';

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

// 
function resolveStyle(key: keyof typeof basemaps): string | StyleSpecification {
    const b = basemaps[key];
    return 'style' in b ? b.style : rasterStyle(key);
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
    console.log("Incoming: ", newBasemap) 
    if (newBasemap && newBasemap !== currentBasemap.value) {
        currentBasemap.value = newBasemap;
        if (map) {
            map.setStyle(resolveStyle(newBasemap));
        }
    }
})

</script>

<template>
    <div :style="{ width: slide.width * sectionWidth + 'px', height: slide.height + 'px' }">
        <div ref="mapContainer" style="height: 100%; width: 100%;"></div>
    </div>
</template>

<style scoped>

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