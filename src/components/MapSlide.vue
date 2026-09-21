<script lang="ts" setup>
import "maplibre-gl/dist/maplibre-gl.css";
import maplibregl, { Map as MaplibreMap, type StyleSpecification } from "maplibre-gl";
import type { Slide, SlideSection } from '@/services/slide_service';
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { basemaps, type Basemap } from '@/utils/map_utils';
import type { Layer } from '@/services/map_service';
import { identifyVectorType } from "@/services/map_service";
import { registerMap, unregisterMap } from "@/services/map_service";
import parameterStore from "@/services/parameter_service"
import { type ParameterChange } from '@/services/parameter_service'

const props = defineProps<{
    slide: Slide,
    section: SlideSection,
    sectionWidth: number,
    basemap?: keyof typeof basemaps,
    showframe?: boolean,
    shadow?: boolean
}>()

const parameterChanges = ref<ParameterChange[]>([])
const currentBasemap = ref<keyof typeof basemaps>(props.basemap ?? 'esri');
const mapContainer = ref<HTMLDivElement | null>(null);
let map: MaplibreMap | null = null;


const asHexValue = (value: string) => {
    if (value.startsWith('#')) {
        return value;
    }
    return '#' + value;
};

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


    if (layer.filetype === 'geojson') {

        if (map.getLayer(layer.name)) {
            map.removeLayer(layer.name);
        };

        const url = `${import.meta.env.VITE_API_BASE_URL}${layer.path}`;

        if (!map.getSource(layer.name)) {
            map.addSource(layer.name, {
                type: 'geojson',
                data: url,
            });
        }

        switch (layer?.marker?.type) {
            case 'dot':
                map.addLayer({
                    id: layer.name,
                    type: 'circle',
                    source: layer.name,
                    paint: {
                        'circle-radius': layer.marker.style['circle-radius'],
                        'circle-color': asHexValue(layer.marker.style['circle-color']),
                        'circle-stroke-width': layer.marker.style['circle-stroke-width'],
                        'circle-stroke-color': asHexValue(layer.marker.style['circle-stroke-color']),
                    },
                });
                break;

            case 'emoji':
                map.addLayer({
                    id: layer.name,
                    type: 'symbol',
                    source: layer.name,
                    layout: {
                        'text-field': layer.marker.value
                    }
                });
                break;
        }
    }
}

function flyToPosition(center: [number, number], zoom: number) {
    if (!map) return;
    map.flyTo({ center, zoom });
}

function jumpToPosition(center: [number, number], zoom: number) {
    if (!map) return;
    map.setCenter(center);
    map.setZoom(zoom);
}

function getCurrentMapPosition(): { center: [number, number], zoom: number } | null {
    if (!map) return null;
    return {
        center: map.getCenter().toArray() as [number, number],
        zoom: map.getZoom()
    };
}

function updateMapPosition(center: [number, number], zoom: number) {
    if (!map) return;
    map.setCenter(center);
    map.setZoom(zoom);
}

function onParameterChange(change: ParameterChange) {
    if (!map) return;
    flyToPosition(change.value.coord, change.value.zoom);
};



onMounted(() => {
    if (!mapContainer.value) return;

    const mapprops = props.section.content ? JSON.parse(props.section.content) : { basemap: currentBasemap.value, startPosition: [13.350103005033793, 52.51451583081903], zoom: 18, layers: [] };

    map = new maplibregl.Map({
        container: mapContainer.value,
        style: resolveStyle(mapprops.basemap) || resolveStyle(currentBasemap.value),
        center: mapprops.startPosition || [13.350103005033793, 52.51451583081903],
        zoom: mapprops.zoom || 18,
        attributionControl: { compact: false }
    });

    map.on('load', () => {
        if (!props.section.content) return;
        JSON.parse(props.section.content).layers.forEach((layer: Layer) => {
            addLayer(layer);
        });
    });

    if (props.section.id) {
        registerMap(props.section.id, { getCurrentMapPosition, updateMapPosition, flyToPosition, jumpToPosition });
    }
});

onMounted(() => {
    stop = parameterStore.subscribe((c) => {
        parameterChanges.value.push(c);
        onParameterChange(c);
    });
})

let stop: (() => void) | undefined

onUnmounted(() => {
    map?.remove();
    map = null;
    if (props.section.id) {
        unregisterMap(props.section.id);
    }
    onUnmounted(() => stop?.())
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

watch(() => props.section.id, (newId, oldId) => {
    if (oldId) {
        unregisterMap(oldId);
    }
    if (newId) {
        registerMap(newId, { getCurrentMapPosition, updateMapPosition, flyToPosition, jumpToPosition });
    }
});

</script>

<template>
    <div :style="{ width: slide.width * sectionWidth + 'px', height: slide.height + 'px' }">
        <div ref="mapContainer" style="height: 100%; width: 100%;"></div>
    </div>
</template>

<style scoped>
.debuginfo {
    position: absolute;
    top: 20px;
    left: 20px;
    padding: 5px;
    z-index: 1000;
    font-size: 25pt;
    font-style: italic;
    max-width: 500px;
    width: 500px;
    font-size: var(--fs-xlarge);
    background-color: rgba(255, 0, 0, 0.5);
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