<script lang="ts" setup>
import '@/assets/main.css'
import { getISlides, type Slide, type SlideSection } from '@/services/slide_service'
import { ref, onMounted } from 'vue'

const islides = ref<Slide[]>([])

onMounted(async () => {
    const slides = await getISlides()
    islides.value = slides.data.slides
    console.log('islides', islides.value)
})


</script>

<template>
    <div class="label-container">
       <label>Available Interactive Slides</label>
       <div style="color: red; font-size: 12px; font-weight: bold;" v-for="slide in islides" :key="slide.id">
        {{ slide.name }} - {{ slide.id }}
       </div>
    </div>
</template>

<style scoped></style>