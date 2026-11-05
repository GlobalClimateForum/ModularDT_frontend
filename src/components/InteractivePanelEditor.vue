<script lang="ts" setup>
import '@/assets/main.css'
import { getISlides, type Slide, type SlideSection } from '@/services/slide_service'
import { ref, onMounted, computed } from 'vue'
import { formatDate } from '@/utils/date_utils'
import Select from 'primevue/select';
import SlideView from '@/components/SlideView.vue'
import ParameterList from '@/components/ParameterList.vue'
import { slides } from '@/globals/slides'

const islides = ref<Slide[]>([])
const selectedSlide = ref<Slide | null>(null)
const slide = computed(() => islides.value.find(s => s.id === selectedSlide.value) ?? null)
const parametersFlat = computed(() => {
    let params: Record<string, any> = {}
    if (slide.value) {
        for (const section of slide.value.sections ?? []) {
            if (section.parameters) {
                for (const [key, param] of Object.entries(section.parameters)) {
                    params[key] = param
                }
            }
        }
    }
    return params
})

const emit = defineEmits<{
    (e: 'targetSlideUpdated', value: Slide | null): void
    (e: 'contentUpdated', content: string): void
}>()

function onTargetSlideChange(slideId: number) {
    const slide = islides.value.find(s => s.id === slideId) ?? null
    emit('targetSlideUpdated', slide)
    emit('contentUpdated', JSON.stringify({
        targetSlide: slide?.id ?? null,
        targetSection: slide?.sections?.find(s => s.mode === 'interactive')?.id ?? null
    }))
}

onMounted(async () => {
    await getISlides().then((response) =>
        islides.value = response.data
    )
})


</script>

<template>
    <div class="ipanel-editor">
        <div class="label-container" style="width: 100%;">
            <label>Choose a slide to create a panel for</label>

            <Select v-model="selectedSlide" :options="islides" optionValue="id" placeholder="Interactive Panel for..."
                @change="onTargetSlideChange($event.value)" optionLabel="name" fluid>

                <template #value="slotProps">
                    <div class="islide-option-slidename-selected">
                        {{islides.find(s => s.id === slotProps.value)?.name ?? slotProps.placeholder}}
                    </div>
                </template>

                <template #option="slotProps">

                    <div style="display: flex; flex-direction: row; align-items: center; gap: 1rem;">

                        <div style="width: 100px; height: 60px;
                     display: flex; align-items: center; justify-content: center; ">
                            <SlideView :slide="slotProps.option" :preview="false" :showframe="false"
                                :sections="slotProps.option.sections as SlideSection[]" style="border: 1px solid var(--p-primary-500);
                            border-radius: var(--br-medium);" />
                        </div>

                        <div class="islide-option">
                            <div class="islide-option-slidename">{{ slotProps.option.name }}</div>
                            <div class="islide-option-date">{{ formatDate(slotProps.option.updated_at) }}</div>
                        </div>
                    </div>
                </template>

            </Select>

        </div>

        <ParameterList :parameters="parametersFlat" emptyText="No parameters found for this slide."
            :title="'Section Parameters'" :maxHeight="'100%'" class="ipanel-params" />
    </div>
</template>

<style scoped>
.ipanel-editor {
    display: flex;
    flex-direction: column;
    gap: var(--space-small);
    height: 100%;
    min-height: 0;
}

.ipanel-params {
    flex: 1;
    min-height: 0;
}

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