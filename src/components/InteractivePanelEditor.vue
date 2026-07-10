<script lang="ts" setup>
import '@/assets/main.css'
import { getISlides, type Slide, type SlideSection } from '@/services/slide_service'
import { ref, onMounted } from 'vue'
import { formatDate } from '@/utils/date_utils'
import Select from 'primevue/select';

const islides = ref<Slide[]>([])
const selectedSlide = ref<Slide | null>(null)

onMounted(async () => {
    await getISlides().then((response) =>
        islides.value = response.data
    )
})


</script>

<template>
    <div class="label-container" style="width: 100%;">
        <label>Available Interactive Slides</label>
        <Select v-model="selectedSlide" :options="islides" optionValue="id" placeholder="Interactive Panel for..."
        >

            <template #value="slotProps">
                <div class="islide-option-slidename-selected">
                    {{islides.find(s => s.id === slotProps.value)?.name ?? slotProps.placeholder}}
                </div>
            </template>

            <template #option="slotProps">
                <div class="islide-option">
                    <div class="islide-option-slidename">{{ slotProps.option.name }}</div>
                    <div class="islide-option-date">{{ formatDate(slotProps.option.updated_at) }}</div>
                </div>
            </template>

        </Select>

    </div>
</template>

<style scoped>
.islide-option {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding: 0.5rem;
}

.islide-option-slidename {
    font-size: var(--fs-medium);
    padding: none;
    margin: none;
    color: var(--p-primary-500);
    font-weight: bold;
}

.islide-option-slidename-selected {
    font-size: var(--fs-medium);
    padding: none;
    margin: none;
    color: var(--p-primary-500);
}

.islide-option-date {
    font-size: var(--fs-small);
    color: var(--p-primary-400);
}
</style>