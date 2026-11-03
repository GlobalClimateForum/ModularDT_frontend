<script lang="ts" setup>
import type { Slide, SlideSection } from '@/services/slide_service';
import SlideView from '@/components/SlideView.vue';

const props = withDefaults(defineProps<{
    slide: Slide | null,
    sections: SlideSection[]
}>(), {
    sections: () => [],
})
</script>

<template>
    <div v-if="props.slide != null" class="presentation_container">
        <SlideView :preview="false" :slide="props.slide" :sections="props.sections">
        </SlideView>
    </div>
    <div v-else class="panel-content">
        No parameters for the slide on Monitor X.
    </div>
</template>


<style scoped>
.presentation_container {
  width: 100%;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  border-radius: var(--br-medium);
  padding: var(--space-large);
  overflow: hidden;
  flex: 1;
  /* Zwingt den Container, den Rest des Panels auszufüllen */
  min-height: 0;
  /* Verhindert das Kollabieren von Flexbox-Kindern */
}

</style>