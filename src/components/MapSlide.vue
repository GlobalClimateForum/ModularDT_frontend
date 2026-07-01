<script lang="ts" setup>
import "leaflet/dist/leaflet.css";
import { LMap, LTileLayer } from "@vue-leaflet/vue-leaflet";
import type { Slide, SlideSection } from '@/services/slide_service';
import { ref } from 'vue';

const props = defineProps<{
    slide: Slide,
    section: SlideSection,
    sectionWidth: number
    showframe?: boolean
    shadow?: boolean
}>()

const selectedBasemap = ref<string>('carto_light');

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
};

</script>


<template>
    <div :style="{ width: slide.width * sectionWidth + 'px', height: slide.height + 'px' }">
        <l-map :zoom="18" :center="[52.51451583081903, 13.350103005033793]" style="height: 100%; width: 100%;">
            <l-tile-layer :url="basemaps.esri.url" :layer-type="base" :name="basemaps[selectedBasemap].name" />
        </l-map>
    </div>
</template>

<style scoped></style>