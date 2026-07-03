<script lang="ts" setup>
import {ref, onMounted} from 'vue';
import type { Slide, SlideSection } from '@/services/slide_service';
import '@/assets/main.css'

const props = defineProps<{
    slide: Slide | null,
    section: SlideSection,
}>()

</script>

<template>
    <div class="editor-container">

    </div>
</template>

<style scoped>

</style>